# Room music and the Music Lab

The layered score uses one 118 BPM clock, a 16-bar phrase (256 sixteenth notes), and compatible
pitches over a shared harmony. Levels 1-4 keep the first Phrygian bed; levels 5+ have a second
progression with separate idle and combat melodies. The original score remains available under
SETTINGS > LAYERED MUSIC off, through the preserved `playLegacyStep` arrangement.

## Enemies and traps

Each type has a fixed, recognisable ranked rhythm. Adding an enemy preserves the existing hits
and enables more, rather than merely making the same part louder. Counts refer to living enemies
physically in the current room, plus aware visible pursuers within eight tiles. Intangible wraiths
still count. Spawn-room IDs do not pin moving enemies to their old room.

| Type | Register / character | Hits per two bars for 1 / 2 / 3 / 4 / 5 / 6 |
|---|---|---|
| Bearer | High, dry square ticks | 1 / 2 / 3 / 4 / 5 / 6 |
| Hound | Same register, shorter offbeat ticks | 1 / 2 / 3 / 4 / 5 / 6 |
| Hunter | Middle, clipped triangle plucks | 2 / 4 / 5 / 6 / 7 / 8 |
| Seer | Same register, shifted rhythm and softer attack | 2 / 4 / 5 / 6 / 7 / 8 |
| Brute / Butcher | Low pulses, different onset sequences | 3 / 5 / 7 / 9 / 11 / 13 |
| Wraith | High sine chimes | 1 / 2 / 3 / 4 / 5 / 6 |
| Spike plate | Low-middle metallic ticks | 1 / 2 / 3 / 4 / 5 / 6 |
| Mill | Same trap instrument, longer rotating pattern | 2 / 3 / 4 / 5 / 6 / 7 |

The original cap of six enemies per family remains. Bearers/hounds, Hunters/Seers and
Brutes/Butchers share their respective caps. Overfull mixed families are allocated round-robin,
so both types remain represented. Each trap type caps at six independently. Intact traps count
throughout the room, including idle spike plates; their instrument does not blink on/off with
individual trap attacks. Each trap hit has a quiet harmonic overtone, not an extra rhythmic hit.

Four phrase sections shift the onset seeds and scale notes while retaining their type identity.
Targets update on quarter notes and note gains ease over 0.3 seconds. The gain budget follows the
actual enabled hits, including the extra heavy/ranged hits. The current pattern sweep finds at
most three simultaneous primary onsets across all legal enemy/trap count combinations. Base,
environment, event accents and sustained tails are also checked together in actual WebAudio.
Mathematical bounds protect timing and headroom; human count recognition still needs listening.

## Room fire, nearby grass and action echoes

Fire now belongs to the **whole current room**, not a radius around the goat. This includes
standing braziers/lamps, burning floor tiles and living burning bodies. Adjacent rooms do not
contribute. Coals give one crackle per bar. Actual burning area adds one, two or three answering
pops at 1, 4 and 10 burning sources. A broad fire adds a low rustle and lifts the base kick slightly.
The crackle gain is stronger than the first version, to remain audible in a fight.

Fire density persists for two bars (about four seconds) after the fire shrinks, goes out or the
player leaves the room, then fades. A short flare between beat boundaries is remembered. Healing
grass within four tiles adds soft harmonic chimes, up to three patches, with a one-bar tail.
Leaving play clears memories. Muting does not freeze their clocks.

Direct game effects still happen immediately. A separate musical response follows a kill, an
actual headbutt, roll, throw or scream (including upgraded screams). Responses wait for the next
half-bar boundary at least eight sixteenths away: about 1-2 seconds. Kills make a bright two-note
chime; player actions give a short lower woodblock response with an action-specific pitch.
These do not alter AI noise, combat timing or game mechanics.

Simultaneous kills merge into a bounded accent; simultaneous actions share one response. The
queue is capped, muted events are discarded, and leaving play clears pending events. A late
browser scheduler discards overdue events instead of bursting them all out at once.

## Tools > MUSIC

Open DEV TOOLS, then TOOLS, then MUSIC, or load `index.html#music` / `http://127.0.0.1:8766/#music`.
The game is paused while the tool is open. The lab runs the same score engine as gameplay.

- Choose 0-6 for every enemy/trap type. Clicking a count starts playback. Mix any types together.
- SOLO keeps just that row (one if it was zero); NO BASE removes the bed for isolated listening.
- IDLE / COMBAT selects the bed; LEVEL 1-4 / LEVEL 5+ selects its theme.
- The right-hand figures show effective count / hits per two bars, after the shared cap.
- On wider screens, a 32-step strip shows the actual onset pattern and moving playhead.
- FIRE selects burning tile count; COALS is the stationary-fixture pulse. FIRE 0 lets the tail finish.
- GRASS selects nearby patches. KILL / BUTT / ROLL / THROW / BAAH auditions delayed musical echoes.
- ROOM copies the paused gameplay room; CLEAR removes the mix; PLAY / STOP controls auditioning.
- STOP cancels queued musical notes. Closing the lab cancels previews and resumes the live score,
  preserving the user's soundtrack setting and game entities. MUTE/UNMUTE controls global sound.

## Implementation and validation

`MUSIC_PARTS` supplies the per-type slots and envelopes; `ROOM_MUSIC` supplies shared registers;
`LATE_MUSIC` supplies the later harmony. `TUNING.audio.layers.hitBudgets` holds count-to-hit curves.
The other tuning values control caps, gain, sensing, memory and event delays.

Run `node tools/audio-check.js` for actual emitted-note counts, pattern separation, all legal
family mixes, sensing, whole-room fire and traps, tails, delayed/bounded events, mute, lab isolation,
legacy selection and scheduler recovery.

With the local server on 8766 and Playwright on Node's module path, run
`node tools/audio-browser-check.js`. It checks settings persistence, actual game playback,
Music Lab click controls, stop/exit cleanup, three screen sizes and offline audio renders of both
themes, including full mixed crowds, traps, fire, grass and stacked event accents. Output and
screenshots are saved under ignored `tools/shots/audio/`.
