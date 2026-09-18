# Room music and the Music Lab

The layered score uses one 118 BPM clock, a 16-bar phrase (256 sixteenth notes), and compatible
pitches over a shared harmony. Level 1 has a frightened, lost variation; levels 2-4 keep the
Phrygian walking bed; levels 5+ have a second progression. All three have idle, spotted, chase and
combat arrangements. The original score remains available under
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
| Brute / Butcher | Triangle sub + octave body + short square edge, different onsets | 3 / 5 / 7 / 9 / 11 / 13 |
| Wraith | High sine chimes | 1 / 2 / 3 / 4 / 5 / 6 |
| Spike plate | Low-middle metallic ticks | 1 / 2 / 3 / 4 / 5 / 6 |
| Mill | Same trap instrument, longer rotating pattern; at most two | 3 / 6 / — / — / — / — |

The original cap of six enemies per family remains. Bearers/hounds, Hunters/Seers and
Brutes/Butchers share their respective caps. Overfull mixed families are allocated round-robin,
so both types remain represented. Spike plates cap at six; Mills cap at two, including the lab.
One Mill already gets three accents, two get six. Intact traps count
throughout the room, including idle spike plates; their instrument does not blink on/off with
individual trap attacks. Each trap hit has a quiet harmonic overtone, not an extra rhythmic hit.

Four phrase sections shift the onset seeds and scale notes while retaining their type identity.
Targets update on quarter notes and note gains ease over 0.3 seconds. The gain budget follows the
actual enabled hits, including the extra heavy/ranged hits. The current pattern sweep finds at
most three simultaneous primary onsets across all legal enemy/trap count combinations. Base,
environment, event accents and sustained tails are also checked together in actual WebAudio.
Mathematical bounds protect timing and headroom; human count recognition still needs listening.

The heavy voice retains its 41–82 Hz fundamental but adds triangle at twice the frequency and a
short square at four times it. A single heavy therefore has audible mid-bass harmonics on smaller
speakers; these are the same rhythmic hit, not extra count information. Global volume settings
and the original score keep their existing controls.

## The first escape and narrative phrases

Level 1 uses `FIRST_MUSIC`: the roots shift A–Bb–G–E, with the same Phrygian degrees as the enemy
voices. Its bass is sparse, its pad is thinner and higher, and the melody leaves empty downbeats
and replies in anxious semitones. Separate idle/spotted/chase/combat motifs keep that uncertainty
even as the rhythm becomes urgent. Level 2 restores the established walking bed.

**The opening scene has its own arc.** `roomMusicScene` returns an empty scene the instant
`game.state !== 'play'`, which otherwise left the whole prologue and the pen sitting flat on
`idle`. `INTRO_STAGE` (`js/audio.js`) maps `game.intro.phase` onto the same idle/spotted/chase/
combat ladder a run's own encounters climb — the meadow stays idle and is the one phase that
borrows the ordinary theme instead of `FIRST_MUSIC` (nothing has gone wrong yet), the truck is
spotted, the dark is chase, and the men closing in and taking her hold chase through to combat on
the blow itself. `black`/`wake` ease back to idle since the beat is over by then.

Three one-shot phrases use the same clock and music volume:

- **LEVEL CLEAR, 2 bars:** a rising triangle line with a final major-third release.
- **DEATH, 3 bars:** a slower descending sine lament with low minor harmony, then silence on the
  death screen. Restarting/leaving the screen cancels the phrase immediately.
- **SOUL, 2 bars:** high sine chimes over open fifths and a suspended ninth; the room score resumes
  afterwards, including when the player has already chosen a boon and started moving.

Clear/death replace the room score; soul briefly does the same so the new harmony has room.
Existing immediate sound effects remain. Death starts at the next scheduled step; clear/soul
start on the next quarter-note boundary (at most half a second). A new narrative event replaces
the previous one. They survive their clear/dead/boon screens, but cannot leak into a new run or
title screen. Muting consumes their clocks; actions during a phrase cannot accumulate a burst
of overdue replies. The legacy soundtrack keeps its original behavior.

## Detection, chase and combat

In every theme, an aware enemy in the sensed room/pursuit area begins **two bars of spotted**
music. A suspended three-note warning leaves space before the choice. It then becomes **chase**:
an offbeat running melody and light hats. Actual accepted headbutts, throws and screams count as
offensive intent and select **combat**, with shorter stronger lead notes, extra kicks and toms.
Attacks during the warning are remembered for the branch at its end. Rolling and incidental kills
do not turn an escape into a fight. Attacking with no sensed enemy does not start combat.

After two bars without another offensive action, an ongoing threat returns to chase. After a bar
without any sensed threat, the score returns to idle. This grace avoids flapping at doorways.
All changes commit on quarter notes and crossfade over 0.3 seconds without restarting the clock.
The two-bar intro, attack hold and one-bar calm grace are tunable in `TUNING.audio.layers`.
The lab's state buttons hold a selected arrangement so it can be auditioned as long as needed.

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

Simultaneous kills merge into a bounded accent. Different and repeated player gestures each get
their own eighth-note response slot, forming a short fill rather than discarding all but the first
action. A burst can occupy at most a further bar after the next response boundary; surplus clicks
are ignored instead of creating a long backlog. The queue is capped at twelve entries, muted events
are discarded, and leaving play clears pending events. Muting does not change combat intent. A late
browser scheduler discards overdue events instead of bursting them all out at once.

## Tools > MUSIC

Open DEV TOOLS, then TOOLS, then MUSIC, or load `index.html#music` / `http://127.0.0.1:8766/#music`.
The game is paused while the tool is open. The lab runs the same score engine as gameplay.

- Choose 0-6 for enemies and spike plates, 0-2 for Mills. Clicking a count starts playback. Mix types together.
- SOLO keeps just that row (one if it was zero); NO BASE removes the bed for isolated listening.
- IDLE / SPOTTED / CHASE / COMBAT selects the bed; LEVEL 1 / LEVEL 2-4 / LEVEL 5+ selects its theme.
- LEVEL CLEAR / DEATH / SOUL auditions a narrative phrase once. PLAY repeats it; a bed or part
  button returns to the room mix. These phrases also have named tracks in SCORE and JSON EXPORT.
- The right-hand figures show effective count / hits per two bars, after the shared cap.
- On wider screens, a 32-step strip shows the actual onset pattern and moving playhead.
- FIRE selects burning tile count; COALS is the stationary-fixture pulse. FIRE 0 lets the tail finish.
- GRASS selects nearby patches. Repeatedly tap KILL / BUTT / ROLL / THROW / BAAH to mix delayed
  musical echoes. The queue below the pads shows which gestures are waiting to sound.
- ROOM copies the paused gameplay room; CLEAR removes the mix; PLAY / STOP controls auditioning.
- STOP cancels queued musical notes. Closing the lab cancels previews and resumes the live score,
  preserving the user's soundtrack setting and game entities. MUTE/UNMUTE controls global sound.

## Score and FL Studio handoff

MIX shows each row's current register root as a scientific note name, MIDI number and oscillator
abbreviation (TRI / SQ / SIN). These are register references; the scale degrees change actual notes.
SCORE shows all twenty-three instrument/event tracks across the full sixteen bars, with a moving playhead.
Select a track and a bar to see its instrument, beat positions, exact notes, MIDI numbers and Hz.
Heavy overtones and other harmonics appear as real notes in that inspection.

The score is generated by running the actual arranger without audio, with the selected room/state
settled. It represents a fixed arrangement, not future live enemy changes or the fade into a state.
Selecting a narrative phrase isolates its two/three bars in this view, with the remaining bars at
rest. Lab phrases start from the selected theme's first root for repeatable listening/export;
gameplay phrases use the current bar's root.
Recent accepted action-pad gestures are marked at their positions in the phrase (up to 64 from the
last phrase-length window), but are
not automatically looped. ERASE removes action marks and pending replies; CLEAR also empties the room.

EXPORT downloads a JSON score containing every emitted note/noise, its track, onset and duration
in sixteenth notes, waveform, gain, envelopes/filter settings where specified, and bus levels.
For FL Studio, use **118 BPM, 4/4, sixteen steps per bar**. One score step is a sixteenth note;
divide steps and durations by four for beats. C4 here is MIDI 60. FL Studio's octave labels may be
different, so MIDI number and Hz are the unambiguous reference. A triangle/sine/square oscillator
can reproduce most voices; bass uses a saw and a closing 430-to-150 Hz low-pass filter. Drum and
woodblock sweeps are indicated as end/start frequency ratios. Noise has no pitched MIDI note.
The JSON is a transcription/synthesis reference, not an FL project or a native MIDI import.

## Implementation and validation

`MUSIC_PARTS` supplies the per-type slots and envelopes; `ROOM_MUSIC` supplies shared registers;
`LATE_MUSIC` supplies the later harmony. `TUNING.audio.layers.hitBudgets` holds count-to-hit curves.
The other tuning values control caps, gain, sensing, memory and event delays.

Run `node tools/audio-check.js` for actual emitted-note counts, pattern separation, all legal
family mixes, sensing, whole-room fire and traps, tails, delayed/bounded events, mute, lab isolation,
legacy selection, state branching, repeated gestures, heavy harmonics, full-score metadata and scheduler recovery.

With the local server on 8766 and Playwright on Node's module path, run
`node tools/audio-browser-check.js`. It checks settings persistence, actual game playback,
Music Lab click controls, stop/exit cleanup, three screen sizes and offline audio renders of both
themes, including full mixed crowds, traps, fire, grass and stacked event accents. Output and
screenshots are saved under ignored `tools/shots/audio/`.
