// Hand-authored room templates. Legend:
// '#' wall  '.' floor  'P' pillar  'h' hay  'B' brazier  'o' crate  'b' bell  't' table  'L' lamp post
// 'w' a stand of arms: a sword or a shield to grab and throw
// 'e' bearer spawn  'r' hunter spawn (bearer if level has no hunters)  'X' butcher spawn
// 'R' always a rifle where the level has them  'm' seer spawn  'M' the Mill's hub
// 'O' a drop: a hole in the boards where it sits in the floor, a window where it sits in a wall
// 'S' a spike plate: floor until the goat crosses it, and then teeth
// Rooms are randomly flipped on both axes at generation time.
// A template with a `canon` belongs to the level whose `canon.id` matches it: at least half of that
// level's ordinary rooms are drawn from its canon, and the rest from the mix — the untagged rooms
// here plus the canons of every level before it, so a room never shows an idea the run has not
// reached. `tag: 'trap'` is the one pool that is neither: a trap room is dropped into a level's
// ordinary rooms by count (`levelDef.traps`) rather than drawn as one.
const ROOM_TEMPLATES = [
  { name: 'hall', rows: [
    '################',
    '#..............#',
    '#..hh....PP....#',
    '#..hh.......L..#',
    '#.....e....o...#',
    '#..e....tt...r.#',
    '#....PP.tt.hh..#',
    '#..B.......hh..#',
    '#..............#',
    '################',
  ]},
  { name: 'pillars', canon: 'stone', rows: [
    '##############',
    '#............#',
    '#..P..e...P..#',
    '#......L.....#',
    '#......o.....#',
    '#..P......P..#',
    '#....m....e..#',
    '#..P......P..#',
    '#............#',
    '##############',
  ]},
  { name: 'kitchen', canon: 'fire', rows: [
    '############',
    '#..........#',
    '#.o....B...#',
    '#.tt.......#',
    '#..e.PPP...#',
    '#....PPP.r.#',
    '#.tt.......#',
    '#.B....e...#',
    '#..........#',
    '############',
  ]},
  { name: 'barn', rows: [
    '################',
    '#..............#',
    '#.hhh......hhh.#',
    '#.hhh..e...hhh.#',
    '#.....L...L....#',
    '#...P......P...#',
    '#......r.......#',
    '#.hhh......hhh.#',
    '#.hhh..e...hhh.#',
    '#..............#',
    '################',
  ]},
  { name: 'shrine', canon: 'fire', rows: [
    '##############',
    '#............#',
    '#..B......B..#',
    '#............#',
    '#....PPPP....#',
    '#..e.P..P..r.#',
    '#....P..P....#',
    '#....b.......#',
    '#..B......B..#',
    '#...t....t...#',
    '##############',
  ]},
  { name: 'corridors', canon: 'line', rows: [
    '##################',
    '#................#',
    '#.PPPP..e..PPPP..#',
    '#....L.......L...#',
    '#..o.PPPPPP...m..#',
    '#................#',
    '#.PPPP..e..PPPP..#',
    '#.......h........#',
    '##################',
  ]},
  { name: 'store', rows: [
    '############',
    '#..........#',
    '#.o....tt..#',
    '#......tt..#',
    '#...e..PP..#',
    '#..r...PP..#',
    '#....L.....#',
    '#.hh.....o.#',
    '#.hh...e...#',
    '#..........#',
    '############',
  ]},
  { name: 'cross', canon: 'stone', rows: [
    '################',
    '#..............#',
    '#..e...PP...e..#',
    '#......PP......#',
    '#.PP...tt...PP.#',
    '#.PP...o....PP.#',
    '#......PP......#',
    '#..m...PP...h..#',
    '#...L......L...#',
    '################',
  ]},
  { name: 'tight', rows: [
    '##########',
    '#........#',
    '#..e.....#',
    '#....B...#',
    '#.o...t..#',
    '#.....e..#',
    '#..h.....#',
    '#........#',
    '##########',
  ]},

  // A yard with almost nothing in it. Two braziers, one pillar block, and a great deal of floor:
  // out here a rifle or a mage owns the room and you have to cross it anyway.
  { name: 'yard', canon: 'line', rows: [
    '####################',
    '#..................#',
    '#....B........B....#',
    '#..................#',
    '#........PP........#',
    '#..e.....PP.....r..#',
    '#..................#',
    '#....o........o....#',
    '#..................#',
    '#..e............e..#',
    '####################',
  ]},
  // Livestock pens: three ranks of stub walls with lanes between them. Everything here is a corner,
  // and a man driven into one stops being a man.
  { name: 'pens', canon: 'stone', rows: [
    '##################',
    '#................#',
    '#.PPPP...PPPP....#',
    '#....e......r....#',
    '#.PPPP...PPPP....#',
    '#................#',
    '#..o.........o...#',
    '#.PPPP...PPPP....#',
    '#....e......e....#',
    '#.PPPP...PPPP....#',
    '#................#',
    '##################',
  ]},
  // A long nave under two colonnades, with the bell at the end of it. Sightlines the whole length.
  { name: 'nave', canon: 'line', rows: [
    '######################',
    '#....................#',
    '#..P..P..P..P..P..P..#',
    '#........e...........#',
    '#....b.........t.....#',
    '#...........m........#',
    '#..P..P..P..P..P..P..#',
    '#....e...........e...#',
    '######################',
  ]},
  // Where they cook for the compound. Tight, hot, and full of things that burn.
  { name: 'ovens', canon: 'fire', rows: [
    '##############',
    '#............#',
    '#.B..tt..B...#',
    '#....tt......#',
    '#..e.....o...#',
    '#..PP..PP....#',
    '#..PP..PP.e..#',
    '#...o........#',
    '#.B.......B..#',
    '#....r.......#',
    '##############',
  ]},

  // ---- STONE: THE ALTAR's canon. The wall is the weapon, so every one of these is corners. ----
  // A square of pillars with a walk round it and a way into the middle on every side. Wherever a man
  // is standing there is stone within a lunge of him.
  { name: 'cloister', canon: 'stone', rows: [
    '################',
    '#..............#',
    '#..PPPP..PPPP..#',
    '#..P........P..#',
    '#..P..e..o..P..#',
    '#.....tt.......#',
    '#..P..tt.e..P..#',
    '#..P........P..#',
    '#..PPPP..PPPP..#',
    '#......r.......#',
    '################',
  ]},
  // Stalls: stub walls off both long walls with a lane down the middle. Every stall is a corner
  // with a man in it, and a man backed into a stall has nowhere to be knocked but the stone.
  { name: 'stalls', canon: 'stone', rows: [
    '##################',
    '#..P...P...P...P.#',
    '#..P.e.P...P.o.P.#',
    '#..P...P.r.P...P.#',
    '#................#',
    '#..B...........L.#',
    '#................#',
    '#.P...P...P...P..#',
    '#.P.e.P.o.P.e.P..#',
    '#.P...P...P...P..#',
    '##################',
  ]},

  // ---- FIRE: THE YARD's canon. Something in every room burns, before the mage gets there. ----
  // A loft of straw with a bowl of coals at each end of it. Light one bale and the room is a
  // different room; light it with a man standing in it and it is a smaller room.
  { name: 'hayloft', canon: 'fire', rows: [
    '################',
    '#..............#',
    '#.hhh..B...hhh.#',
    '#.hhh......hhh.#',
    '#....e.......e.#',
    '#......hhh.....#',
    '#..o...hhh..r..#',
    '#..............#',
    '#.hhh......hhh.#',
    '#.hhh..B...hhh.#',
    '#..............#',
    '################',
  ]},
  // The forge: six bowls of coals in two rows, and the anvil between them. Nothing here is straw —
  // the fire is wherever you knock it, and a spilled bowl is a wall for as long as it burns.
  { name: 'forge', canon: 'fire', rows: [
    '################',
    '#..............#',
    '#..e.........r.#',
    '#....B..B..B...#',
    '#..............#',
    '#..tt.PP.....o.#',
    '#..tt.PP.......#',
    '#....B..B..B...#',
    '#..e.........m.#',
    '#..............#',
    '################',
  ]},

  // ---- THE LINE: THE ROAD's canon. Long sightlines, hard cover, and the strip a rifle cannot see. ----
  // A colonnade of pillar blocks down both sides and a clear line down the middle with the rifle at
  // the end of it. The middle is fast and the sides are alive; the room is about which you take.
  { name: 'colonnade', canon: 'line', rows: [
    '######################',
    '#....................#',
    '#..PP...PP...PP...PP.#',
    '#..PP...PP...PP...PP.#',
    '#..e.......o.......R.#',
    '#....................#',
    '#..PP...PP...PP...PP.#',
    '#..PP...PP...PP...PP.#',
    '#.....e.......m......#',
    '######################',
  ]},
  // Lines of stub cover thrown across the room in staggered rows: you cross it in hops, and every
  // hop is a beat the rifle has you and the next stub does not.
  { name: 'trench', canon: 'line', rows: [
    '##################',
    '#................#',
    '#..e.......PPP...#',
    '#................#',
    '#.....PPP........#',
    '#.......o...R....#',
    '#...........PPP..#',
    '#................#',
    '#..PPP...........#',
    '#..........e.....#',
    '#.....m..........#',
    '##################',
  ]},

  // ---- THE THRESHING FLOOR: open ground, its canon, so only that level and the ones after draw them. ----
  // Out here the walls are nearly gone and the structure is furniture: posts, tables, braziers and
  // hay. A headbutt on bare floor still only knocks a man down, so the level is about herding him
  // into something that finishes the job — and about deciding which half of the room is yours.
  // Props in the middle and open ground all round it: the fight happens on your side of the island.
  { name: 'island', canon: 'open', rows: [
    '############################',
    '#..........................#',
    '#..e....................e..#',
    '#..........................#',
    '#.....B..............B.....#',
    '#........tt......tt........#',
    '#........tt..PP..tt........#',
    '#.....o....P.PP.P....o.....#',
    '#........tt..PP..tt........#',
    '#........tt......tt........#',
    '#.....B......r.......B.....#',
    '#..........................#',
    '#..e....................e..#',
    '#..........................#',
    '############################',
  ]},
  // Everything useful is along the two edges. Crossing the middle is fast, open and stupid.
  { name: 'flanks', canon: 'open', rows: [
    '##############################',
    '#............................#',
    '#.PP...B...hh........hh...B..#',
    '#.PP.......hh........hh...PP.#',
    '#...r....................R...#',
    '#............................#',
    '#..........e......e..........#',
    '#.....o..................o...#',
    '#..........e......e..........#',
    '#............................#',
    '#....m...................e...#',
    '#.PP.......hh........hh...PP.#',
    '#.PP...B...hh........hh...B..#',
    '#............................#',
    '##############################',
  ]},
  // A ring of hay: a wall you do not have until you light it, and cannot take back once you have.
  { name: 'hayring', canon: 'open', rows: [
    '############################',
    '#..........................#',
    '#..B....................B..#',
    '#..........................#',
    '#.....hhhhhhhhhhhhhhhh.....#',
    '#.....h..............h.....#',
    '#..e..h....o....o....h..e..#',
    '#.....h...PP....PP...h.....#',
    '#..r..h....o....o....h.....#',
    '#.....h..............h.....#',
    '#.....hhhhhhhhhhhhhhhh.....#',
    '#..........................#',
    '#..B.........e..........B..#',
    '#..........................#',
    '############################',
  ]},
  // Table rows you can shoulder about. The lanes are only where you leave them.
  { name: 'lanes', canon: 'open', rows: [
    '##############################',
    '#............................#',
    '#..tt..tt..tt..tt..tt..tt....#',
    '#..tt..tt..tt..tt..tt..tt....#',
    '#............................#',
    '#......e........r........e...#',
    '#............................#',
    '#..L......................L..#',
    '#............................#',
    '#......e........m........e...#',
    '#............................#',
    '#..tt..tt..tt..tt..tt..tt....#',
    '#..tt..tt..tt..tt..tt..tt....#',
    '#............................#',
    '##############################',
  ]},
  // A field of posts, spread wide. The only hard geometry out here, and the only thing that kills for you.
  { name: 'posts', canon: 'open', rows: [
    '############################',
    '#..........................#',
    '#..P...P...P...P...P...P...#',
    '#..........................#',
    '#..e....................e..#',
    '#..........o....o..........#',
    '#..P...P...........P...P...#',
    '#.....r............m.......#',
    '#..P...P...........P...P...#',
    '#..........o....o..........#',
    '#..e....................e..#',
    '#..........................#',
    '#..P...P...P...P...P...P...#',
    '#..........................#',
    '############################',
  ]},

  // ---- THE FUNNEL: THE BRIDGE's canon. Seven men are one man in a doorway. ----
  // A wall of pillars across the room with one tile of gap in it. Whoever is on the other side comes
  // through one at a time, and one at a time is the only way you were ever going to take seven.
  { name: 'gate', canon: 'funnel', rows: [
    '##################',
    '#................#',
    '#..e.....P...e...#',
    '#........P.......#',
    '#..o.....P....r..#',
    '#................#',
    '#........P.....o.#',
    '#..e.....P.......#',
    '#.....B..P..e....#',
    '#........P.......#',
    '#................#',
    '##################',
  ]},
  // Tables narrowing to a throat of two pillars. The tables can be shoved, so the throat is only as
  // narrow as you have left it — and a table shoved into it with a crowd behind it is a kill.
  { name: 'throat', canon: 'funnel', rows: [
    '####################',
    '#..................#',
    '#..e....tt....e....#',
    '#.......tt.........#',
    '#....tt......tt....#',
    '#....tt.PP...tt....#',
    '#.......PP.......o.#',
    '#..r....tt....e....#',
    '#.......tt.........#',
    '#..o..........m....#',
    '#..................#',
    '####################',
  ]},
  // The walls pinch the middle from both sides. Two halves of a room and four tiles of floor between
  // them, and whichever half you are in, everyone in the other has to come through the pinch.
  { name: 'hourglass', canon: 'funnel', rows: [
    '##################',
    '#................#',
    '#..e..........e..#',
    '#.PP..........PP.#',
    '#.PPPP..o...PPPP.#',
    '#.PPPPP....PPPPP.#',
    '#.PPPP..r...PPPP.#',
    '#.PP..........PP.#',
    '#..e.....B....m..#',
    '#................#',
    '##################',
  ]},
  // Two weirs across the room with their gaps on opposite sides, so a crowd coming for you has to
  // snake, and snakes one man wide. The gap you are standing at is the one they arrive through.
  { name: 'weir', canon: 'funnel', rows: [
    '######################',
    '#....................#',
    '#..e....P......P.....#',
    '#.......P......P..e..#',
    '#..o....P......P.....#',
    '#.......P......P.....#',
    '#..............P...o.#',
    '#.......P............#',
    '#..e....P......P..r..#',
    '#.......P......P.....#',
    '#....................#',
    '######################',
  ]},
  // A chute: two pillar blocks with three tiles of floor between them and a bowl of coals at each
  // lip. The way round the outside is long and the way through is short and lit.
  { name: 'chute', canon: 'funnel', rows: [
    '################',
    '#..............#',
    '#..e.......e...#',
    '#..PPP...PPP...#',
    '#..PPP...PPP...#',
    '#....B...B.....#',
    '#..PPP...PPP...#',
    '#..PPP...PPP.o.#',
    '#......r.......#',
    '#..e.......m...#',
    '#..............#',
    '################',
  ]},

  // ---- THE DROP: the rafters' canon, for the level whose floor is not all there ----
  // 'O' is a drop. In the floor it is a hole in the boards; in a wall run it is a window. Men will
  // not path into either and a thrown one goes through both, so every one of these rooms is built
  // to leave a way across that is worth less than the way round. They are deliberately narrow: the
  // level is about edges, and an edge you can walk a long way round is not an edge.
  { name: 'gantry', canon: 'drop', rows: [
    '######OO#####OO######',
    '#...................#',
    '#..e.............e..#',
    '#...OOOO.....OOOO...#',
    '#...OOOO.....OOOO...#',
    '#...................#',
    '#..B.....o........B.#',
    '#...OOOO.....OOOO...#',
    '#...OOOO.....OOOO...#',
    '#..e......r......e..#',
    '#...................#',
    '######OO#####OO######',
  ]},
  // Fight it along the rail. Everything worth standing on is against the one long wall, and the
  // whole of the other side of the room is not there.
  { name: 'ledge', canon: 'drop', rows: [
    '######################',
    '#....................#',
    '#..tt...B.....B..tt..#',
    '#..tt.............e..#',
    '#....e...o...o.......#',
    '#....................#',
    '#..OOOOOOOOOOOOOOOO..#',
    '#..OOOOOOOOOOOOOOOO..#',
    '#....................#',
    '#...r.........m..e...#',
    '#....................#',
    '######################',
  ]},
  // Joists with the boards off between them. Crossing is two short hops of nerve, and anyone who
  // follows you has to take the long way round the ends.
  { name: 'joists', canon: 'drop', rows: [
    '#######################',
    '#.....................#',
    '#..e...............e..#',
    '#....OOO...OOO...OO...#',
    '#....OOO...OOO...OO...#',
    '#....OOO...OOO...OO...#',
    '#..o......w...........#',
    '#....OOO...OOO...OO...#',
    '#....OOO...OOO...OO...#',
    '#..e.....r.........e..#',
    '#.....................#',
    '#######################',
  ]},
  // The well: one hole in the middle of an otherwise ordinary room, posted round it, so a man
  // shoved off a post has somewhere to go.
  { name: 'wellhole', canon: 'drop', rows: [
    '####OO########OO####',
    '#..................#',
    '#..P............P..#',
    '#......OOOOO.......#',
    '#..e...OOOOO...e...#',
    '#......OOOOO.......#',
    '#..B...OOOOO...B...#',
    '#..P.....r......P..#',
    '#..................#',
    '####OO########OO####',
  ]},
  // All wall and all window. Nothing in here kills for you except what is behind the men.
  { name: 'windowrow', canon: 'drop', rows: [
    '###OO#####OO#####OO###',
    '#....................#',
    '#..e...t....t...t.e..#',
    '#......t....t...t....#',
    '#....................#',
    '#..o..............o..#',
    '#....................#',
    '#..m...t....t...t.e..#',
    '#......t....t...t....#',
    '#..r.................#',
    '#....................#',
    '###OO#####OO#####OO###',
  ]},
  // ---- THE NICHE: THE OSSUARY's canon. A body cannot form inside stone. ----
  // The dead come from the side you are not looking at, and the only thing the ground does for you
  // is refuse them a place to stand. Every room here is stone to put your back to — niches, cells,
  // alcoves — with open floor between that you have to cross with nothing at your back at all.
  // A crypt: a row of niches down each long wall, two tiles wide and one deep. Stand in one and half
  // the room's arcs are gone; the middle of the room has every one of them.
  { name: 'crypt', canon: 'niche', rows: [
    '##################',
    '#.P..P..P..P..P..#',
    '#................#',
    '#..e....L.....e..#',
    '#................#',
    '#....o.......o...#',
    '#................#',
    '#..e....B.....e..#',
    '#................#',
    '#.P..P..P..P..P..#',
    '##################',
  ]},
  // Cells off a lane. Each has one mouth, and inside one there is only one way anything can come.
  { name: 'cells', canon: 'niche', rows: [
    '####################',
    '#....P.....P.....P.#',
    '#.e..P..o..P..e..P.#',
    '#....P.....P.....P.#',
    '#.PPPP..PPPP..PPPP.#',
    '#..................#',
    '#.PPPP..PPPP..PPPP.#',
    '#....P.....P.....P.#',
    '#.e..P..r..P..m..P.#',
    '#....P.....P.....P.#',
    '####################',
  ]},
  // Alcoves cut into the top and bottom walls, and a bare floor between them.
  { name: 'alcoves', canon: 'niche', rows: [
    '##################',
    '#PP..PP..PP..PP..#',
    '#................#',
    '#....e......e....#',
    '#..o.............#',
    '#.......B.....o..#',
    '#................#',
    '#....e......r....#',
    '#................#',
    '#..PP..PP..PP..PP#',
    '##################',
  ]},
  // A catacomb: one chamber with a single mouth in the middle of the room, and stubs either side of
  // it. In the chamber there is exactly one way in; outside it there are all of them.
  { name: 'catacomb', canon: 'niche', rows: [
    '####################',
    '#..................#',
    '#..e..PPPPPPP....e.#',
    '#.....P.....P......#',
    '#..o..P..L..P..o...#',
    '#.....P.....P......#',
    '#..PPPP.....PPPP...#',
    '#..................#',
    '#..e....r....m..e..#',
    '#..................#',
    '####################',
  ]},
  // The charnel: a comb of single pillars along both walls, the slots between them one tile wide.
  // A slot is the narrowest place in the game to stand and the hardest to be come at.
  { name: 'charnel', canon: 'niche', rows: [
    '################',
    '#..............#',
    '#.P.P.P.P.P.P..#',
    '#..............#',
    '#..e..o....e...#',
    '#..............#',
    '#.......B......#',
    '#..............#',
    '#..r......m....#',
    '#..............#',
    '#.P.P.P.P.P.P..#',
    '################',
  ]},

  // ---- TRAP ROOMS: the room is the weapon, tagged 'trap'. ----
  // An ordinary room gives you furniture and asks you to work out what to do with it. These four
  // are built the other way round: the shape is already a kill and what you have to work out is how
  // to be on the right side of it. A level asks for `traps` of them and the generator drops them
  // into ordinary rooms; a template that `needs` a thing the level does not have is never drawn, so
  // no floor grows teeth on a level whose floor does not.
  // Coals and hay, and lanes between them. A headbutt spills a bowl across the lane in front of it
  // and the straw carries it the rest of the way: this is a room you can close a half of.
  { name: 'coalrow', tag: 'trap', rows: [
    '################',
    '#..............#',
    '#.hh.B....B.hh.#',
    '#.hh........hh.#',
    '#....e....e....#',
    '#.B....oo....B.#',
    '#....r....e....#',
    '#.hh........hh.#',
    '#.hh.B....B.hh.#',
    '#..............#',
    '################',
  ]},
  // A wall of straw down the middle with one gap in it, and a bowl of coals at each lip of the gap.
  // Nothing here blocks anybody until you light it, and then the room has one door and you choose
  // which side of it everyone is standing on.
  { name: 'firebreak', tag: 'trap', rows: [
    '##################',
    '#................#',
    '#..e...hh...e....#',
    '#......hh........#',
    '#..o...hB........#',
    '#................#',
    '#................#',
    '#......hB....o...#',
    '#......hh........#',
    '#..r...hh...e....#',
    '#................#',
    '##################',
  ]},
  // Two banks of teeth across the room and a clear lane between them. Only the goat arms a plate,
  // so the room is a question about which way you run: cross a bank and whoever is on your heels
  // crosses it a beat later, when it is no longer floor.
  { name: 'teeth', tag: 'trap', needs: 'spikes', rows: [
    '####################',
    '#..................#',
    '#..e............e..#',
    '#......SSSSSS......#',
    '#..................#',
    '#..P..o......o..P..#',
    '#..................#',
    '#......SSSSSS......#',
    '#..r............e..#',
    '#..................#',
    '####################',
  ]},
  // The same idea turned ninety degrees: three lanes, and the two that divide them bite. Tables in
  // the corners so the lanes are the only quick way through and the plates are on the quick way.
  { name: 'mangle', tag: 'trap', needs: 'spikes', rows: [
    '################',
    '#..............#',
    '#.tt........tt.#',
    '#.tt.S....S.tt.#',
    '#....S....S....#',
    '#..e.S.oo.S..e.#',
    '#....S....S....#',
    '#.tt........tt.#',
    '#.tt...r....tt.#',
    '#..............#',
    '################',
  ]},
];

// One stand of arms in the ring, not two: what the room hands you is one throw, and after that it
// is you and the geometry again.
const ARENA_TEMPLATE = { name: 'arena', rows: [
  '##############',
  '#............#',
  '#..w.........#',
  '#....P..P....#',
  '#.L........L.#',
  '#......X.....#',
  '#............#',
  '#....P..P....#',
  '#..hh....hh..#',
  '#..B......B..#',
  '#............#',
  '##############',
]};

// The Mill: a ritual grinding wheel with a shorter reach now, in a room built tighter around it.
// 'M' is the hub. The room is still taller than the arms are long — there is a lane along the top
// and the bottom that the sweep never reaches — but the whole footprint shrank with the arm, so a
// shorter reach reads as a tighter room rather than as the same floor with less of it dangerous.
// The room the wheel is MET in, on the level that first shows it. Narrow enough that the arm's own
// sweep — the hub plus `mill.armLen`, a shade under three tiles — reaches the top wall and leaves
// exactly one lane of clear floor along the bottom: the way through is a decision about the arm
// rather than a walk round it. The two men stand well past it, out of the sweep, and `millLesson`
// in `gen.js` is what makes one of them careless and the other careful.
const MILL_LESSON_TEMPLATE = { name: 'millroom', noFlipX: true, rows: [
  '##############',
  '#............#',
  '#..........e.#',
  '#............#',
  '#.....M......#',
  '#............#',
  '#..........e.#',
  '#............#',
  '#............#',
  '##############',
]};

const MILL_TEMPLATE = { name: 'mill', rows: [
  '##############',
  '#............#',
  '#.o..........#',
  '#.e........e.#',
  '#............#',
  '#......M.....#',
  '#............#',
  '#.e........e.#',
  '#.hh......hh.#',
  '#.B........B.#',
  '##############',
]};

// The Gallery: long sightlines, hard cover, and rifles standing on their own rather than in a pile.
const GALLERY_TEMPLATE = { name: 'gallery', rows: [
  '####################',
  '#..................#',
  '#...PP...PP...PP...#',
  '#...PP...PP...PP...#',
  '#..R....o.......R..#',
  '#..................#',
  '#...PP...PP...PP...#',
  '#...PP...PP...PP...#',
  '#........R.........#',
  '####################',
]};

// The killbox. Two rifles posted on the far side of a room with almost nothing in it, watching the
// door you have to come in by, and they see you the moment you are through it. There is no route
// that is not in their line: the answers are a shield off the stand by the door, one of the two men
// on your own side carried in front of you, the two pillars if you time them, or going back out.
// It never flips on X — the rifles are the far wall, and the door is the near one.
const KILLBOX_TEMPLATE = { name: 'killbox', noFlipX: true, rows: [
  '######################',
  '#....................#',
  '#....PP..............#',
  '#................R...#',
  '#....................#',
  '#..w.................#',
  '#..e.................#',
  '#..e.................#',
  '#................R...#',
  '#....PP..............#',
  '#......o.............#',
  '#....................#',
  '######################',
]};

// The room the first man of a run stands in. Every other template is drawn from the mix or the
// canon pool and could be anything the level owns, but this one room's whole job is "try the
// headbutt on somebody," and a floor full of pillars and furniture between the door and him argued
// with that. `blockSpot` in `gen.js` stands him a step inside whichever wall the corridor onward
// left him, so the room itself carries nothing to break the line back to whichever wall the goat
// came in by — open floor, and nothing else.
// A long, narrow room built round a single idea: a stand of arms right inside the door, a crate a
// step past it, and whoever the room holds standing well down the far end of it — far enough that
// grabbing the arm and throwing it is the answer that is actually in front of you before anyone
// has closed the distance. `levelDef.ambushAt` forces it the same way `millAt` and the rest of the
// set pieces do; the room otherwise fills off the ordinary threat curve like any other.
// Three tiles of floor and nothing to the sides: a corridor rather than a room, so a blade thrown
// down it cannot miss and a man walking up it cannot go round. `noFlipX` is load-bearing — rooms
// chain left to right, so the door is always in the left wall, and the arm has to be the thing
// just inside it with the men at the far end. Flipped, the men stood in the doorway you walked in
// through and the rack was behind them, which is the opposite of what the room is for.
const AMBUSH_TEMPLATE = { name: 'ambush', noFlipX: true, rows: [
  '################',
  '#..............#',
  '#.w..o....e...e#',
  '#..............#',
  '################',
]};

// The room the first man of the run stands in. Four tiles of floor and no deeper, so wherever he is
// standing there is stone a tile away and every direction a headbutt can throw him ends against it
// — the level's whole idea, on the one man it is safe to learn it on. It was six tiles deep and
// packed with hay: half the swings put him down on open floor where he got back up again, and the
// bales were the loudest thing in a room whose entire point is the man. Two crates on the near half
// instead, against the top and the bottom wall: something for the eye to measure the room by, well
// clear of the line from the door to him and well clear of where `blockSpot` stands him.
const LESSON_TEMPLATE = { name: 'lesson', canon: 'stone', noFlipX: true, rows: [
  '############',
  '#..o.......#',
  '#..........#',
  '#..........#',
  '#..o.......#',
  '############',
]};

// The room you woke up in. The altar stands off to one side, made ready, with the straps and the
// knife and what is left of the goat that went before you. You are in the pen beside it.
// Two tiles wider than it was, so the second cage fits on the right without crowding the way out.
// The two hay tiles on row four are inside the bars: a pen with bedding in it is somewhere animals
// were kept, and a pen with nothing in it is a rectangle of iron. `buildCage` puts the bars at
// `cage.halfW`/`halfH` around the middle of this room, which is what fixes them to these tiles.
const START_TEMPLATE = { name: 'start', rows: [
  '##################',
  '#................#',
  '#.B............B.#',
  '#................#',
  '#......hh........#',
  '#................#',
  '#................#',
  '#................#',
  '#.B............B.#',
  '#................#',
  '##################',
]};

// The Great Hall: one enormous room with two mills, pillar rows, hay, tables and a crowd.
// Running straight through it is a bad idea. Running through it anyway is the point.
const GREAT_HALL_TEMPLATE = { name: 'greathall', rows: [
  '######################################',
  '#....................................#',
  '#..................B...hhhh.......B..#',
  '#...................e..hhhh....e.....#',
  '#....................PP.....PP.......#',
  '#....................PP.....PP.....L.#',
  '#.........M........o.....e......tt...#',
  '#....................e..........tt...#',
  '#.................b..........r.......#',
  '#....e............................e..#',
  '#............L.........m.............#',
  '#...hh........e......................#',
  '#...hh...........B.............e.....#',
  '#.....tt............r................#',
  '#.....tt...............e.............#',
  '#..........PP..............M.........#',
  '#....e.....PP......L.................#',
  '#..B...........hh....e...............#',
  '#........o.....hh.................B..#',
  '#.......e..........r..........e......#',
  '#....................................#',
  '######################################',
]};
