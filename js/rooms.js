// Hand-authored room templates. Legend:
// '#' wall  '.' floor  'P' pillar  'h' hay  'B' brazier  'o' pot  'b' bell  't' table  'L' lamp post
// 'w' a stand of arms: a sword or a shield to grab and throw
// 'e' bearer spawn  'r' hunter spawn (bearer if level has no hunters)  'X' butcher spawn
// 'R' always a rifle where the level has them  'm' seer spawn  'M' the Mill's hub
// 'O' a drop: a hole in the boards where it sits in the floor, a window where it sits in a wall
// 'S' a spike plate: floor until the goat crosses it, and then teeth
// Rooms are randomly flipped on both axes at generation time.
// A template with a `tag` is only drawn by a level whose `pool` matches it; untagged ones are the
// default pool every other level uses.
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
  { name: 'pillars', rows: [
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
  { name: 'kitchen', rows: [
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
  { name: 'shrine', rows: [
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
  { name: 'corridors', rows: [
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
  { name: 'cross', rows: [
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
  { name: 'yard', rows: [
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
  { name: 'pens', rows: [
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
  { name: 'nave', rows: [
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
  { name: 'ovens', rows: [
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

  // ---- THE THRESHING FLOOR: open ground, tagged 'open' so only that level draws from them. ----
  // Out here the walls are nearly gone and the structure is furniture: posts, tables, braziers and
  // hay. A headbutt on bare floor still only knocks a man down, so the level is about herding him
  // into something that finishes the job — and about deciding which half of the room is yours.
  // Props in the middle and open ground all round it: the fight happens on your side of the island.
  { name: 'island', tag: 'open', rows: [
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
  { name: 'flanks', tag: 'open', rows: [
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
  { name: 'hayring', tag: 'open', rows: [
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
  { name: 'lanes', tag: 'open', rows: [
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
  { name: 'posts', tag: 'open', rows: [
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

  // ---- the rafters: the pool for the level whose floor is not all there ----
  // 'O' is a drop. In the floor it is a hole in the boards; in a wall run it is a window. Men will
  // not path into either and a thrown one goes through both, so every one of these rooms is built
  // to leave a way across that is worth less than the way round. They are deliberately narrow: the
  // level is about edges, and an edge you can walk a long way round is not an edge.
  { name: 'gantry', tag: 'high', rows: [
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
  { name: 'ledge', tag: 'high', rows: [
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
  { name: 'joists', tag: 'high', rows: [
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
  { name: 'wellhole', tag: 'high', rows: [
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
  { name: 'windowrow', tag: 'high', rows: [
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

// The Mill: a big open room built around a ritual grinding wheel. 'M' is the hub.
// The room is deliberately taller than the arms are long: there is a lane along the top and the
// bottom that the sweep never reaches, so the room can be crossed by reading it rather than by luck.
const MILL_TEMPLATE = { name: 'mill', rows: [
  '##################',
  '#................#',
  '#..o.............#',
  '#................#',
  '#.e............e.#',
  '#................#',
  '#................#',
  '#.......M........#',
  '#................#',
  '#................#',
  '#.e............e.#',
  '#................#',
  '#..hh........hh..#',
  '#..B..........B..#',
  '#................#',
  '##################',
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

// The room you woke up in. The altar stands off to one side, made ready, with the straps and the
// knife and what is left of the goat that went before you. You are in the pen beside it.
// Two tiles wider than it was, so the second cage fits on the right without crowding the way out.
const START_TEMPLATE = { name: 'start', rows: [
  '##################',
  '#................#',
  '#.B............B.#',
  '#................#',
  '#................#',
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
