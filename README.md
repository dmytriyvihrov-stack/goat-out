# GOAT OUT (prototype, stage 2)

You are the sacrificial goat. The truck fell off the bridge. The cult wants its sacrifice back. Reach the exit.

Concept and design targets: [GOAT_OUT_brief.md](GOAT_OUT_brief.md).

## Run it

- Double-click `index.html` (no build, no dependencies), or
- `node tools/serve.js 8766` and open http://127.0.0.1:8766 (the dev server also accepts saved canvas frames from the test harness).

Click once to start. Audio starts on the first click or key press (browser rule).

## Controls

Phones and tablets get on-screen controls automatically. In portrait the play view is letterboxed and the thumbs get their own deck below it; in landscape the controls overlay the bottom corners.

| Touch | Desktop | Action |
|---|---|---|
| left thumb, anywhere on the left | WASD / arrows | move (momentum, cannot turn on a dime at speed) |
| aim follows where you run, and snaps onto a nearby man | mouse | aim |
| BUTT | left mouse | headbutt: short committed lunge. Into a wall, pillar, brazier or another man = kill. Into open floor = knocked down |
| hold GRAB | right mouse, hold | grab the nearest man (or pot) and hold him in front as a shield. He absorbs 2 bullets, then dies. He breaks free after 3 s |
| release GRAB | right mouse, release | throw. A thrown man kills what he hits and dies on the wall |
| BAAH | space | scream. Everyone within 12 tiles comes to you. 4 s cooldown |
| ROLL | E | clumsy sideways roll |
| tap after death | R | restart the level (new seed) |
| — | M | mute |
| — | N | debug: skip to the next level |

Dragging on the right half of the screen overrides auto-aim with a manual direction.

Three hits and the goat dies. Death regenerates the level with a new seed in under a second. The seed is in the top right corner.

## What is in

- Two levels: The Altar (Bearers only) and The Yard (Bearers, Hunters with travelling bullets and friendly fire, and Seers). Each has a Butcher arena.
- Seer: the cult mage. Never closes in. Paints a rune under your feet that erupts into fire after about a second, and blinks away when you get within three tiles.
- A clumsy sideways roll on E (ROLL on touch): brief mercy frames, then a stagger you have to eat.
- Tomes from the Butcher: three active skills or three passive blessings per drop. Dragon Breath replaces the scream with a cone of fire, Bomb Charge detonates anyone you headbutt, Devour tears a held man open for a chance to heal.
- Dev drawer in the bottom-right corner: god mode, spawn any enemy, drop a tome, heal, clear the room, skip the level.
- Butcher: three headbutts. He cannot be interrupted while swinging, answers a stagger with a quick swing, and charges in a straight line after a visible windup. Charging into a wall stuns him for a free hit.
- Room-chain procedural generation from hand-authored templates (`js/rooms.js`), corridors as kill zones, exit always up-right, flood-fill validation.
- Environment: braziers ignite men, hay spreads fire, pots break on use, a bell that calls the whole level, doors the goat smashes through (and cultists shoulder open), tables that slide and crush men against walls, oil lamps that spill a pool of fire.
- Noise and hearing system: gunshots, splats, pots, bell and scream pull enemies toward the sound.
- Synthesised ritual percussion that escalates with how many enemies are aware of you (`js/audio.js`). No audio assets.
- Persistent blood as paint, hitstop, screen shake, slow motion on death and on the Butcher's last hit, firelight pools, drifting dust, a damage-direction flash, title cards, exit compass.
- Responsive: the canvas fits any screen, the zoom adapts so sprites stay readable, and haptics fire on hits and kills where the device supports them.

## Not in yet (from the brief)

Mirrors, gamepad, pixel art, the Priest, later acts. Enemies are placeholder shapes in the final palette.

## Tuning

Every number lives in `js/tuning.js` (`TUNING`, `LEVELS`, `PALETTE`). Room templates in `js/rooms.js`. Generation in `js/gen.js`. Touch layout and auto-aim in `js/input.js`.

## Test harness

`tools/harness.js` drives the game from the browser console (teleport, aim, headbutt, freeze enemies, save frames to `tools/shots/`). Load it with:

```js
const s = document.createElement('script'); s.src = '/tools/harness.js'; document.body.appendChild(s);
```
