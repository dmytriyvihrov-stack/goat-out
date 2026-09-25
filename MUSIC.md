# Room music and the Music Lab

The layered score uses one 118 BPM clock, a 16-bar phrase (256 sixteenth notes), and compatible
pitches over a shared harmony. Level 1 has a frightened, lost variation; levels 2-4 keep the
Phrygian walking bed; levels 5+ have a second progression. All three have idle, spotted, chase and
combat arrangements. The original score remains available under
SETTINGS > LAYERED MUSIC off, through the preserved `playLegacyStep` arrangement.

## The tune (1.66)

Until 1.66 the bed was a triangle drone, one or two bass notes a bar and no line anybody could hum,
all sent into a 1.4 s stone reverb, and it read as noise. `THEME_BED` (`js/audio.js`) now gives each
theme one four-bar phrase over its four roots, played by the bone flute (`lead`: triangle with a
5 Hz vibrato that comes in as the note is held, a quiet sine octave over it) and a bass *line*
(a folk gallop of five or six plucked-saw notes a bar, low-pass closing 700 to 170 Hz):

- **Levels 2-4 (A Phrygian, roots A A G E):** the hook is A-C-Bb-A, climbs to E5 in bar two and
  every phrase ends on the Phrygian fall A-G-F-E over the E.
- **Levels 5+ (G minor, roots G F E G):** D-Bb-C-A-G, the answer in the upper register.
- **Level 1 (roots A Bb G E):** the same fall broken up with rests, ending on a tritone (Bb over E).

The tune sings whole at idle, drops to a third for the two-bar warning, and comes back under chase
(0.8) and combat (0.55). The stage figures (`STAGE_MOTIFS`) are now a plucked saw riff an octave
under the flute, so the two lines are told apart by sound. The drone is an open fifth an octave up
(it was the bare root at 55 Hz), the frame drum answers the kicks with two soft toms, and the chase
and combat off-beats are a rim knock instead of a noise hat. The room send is 0.06 into a 0.32 s
room (`TUNING.audio.room`).

## Enemies and traps

Each type has a fixed, recognisable rhythm laid over the tune. Counts refer to living enemies
physically in the current room, plus aware visible pursuers within eight tiles. Intangible wraiths
still count. Spawn-room IDs do not pin moving enemies to their old room.

**1.70 thinned the layer** ("the music itself got better, it was the layers on top"): a man is one
hit per two bars, a big one two, and a family stops adding at three. It was six a family, two hits
for a lone rifle and three for a lone brute, so a crowded room laid a wall of ticks over the melody.
The figures also stopped moving: every type plays the same two bars over and over (the four
"answers" that shifted them every four bars went), so a kind is learnt by ear. Unaware men play at
`exploreMix` 0.45 of themselves (0.6 before), and the whole layer sits at `layers.gain` 0.55 (0.65).

| Type | Register / character | Hits per two bars for 1 / 2 / 3 |
|---|---|---|
| Bearer | High, dry square ticks, low-passed (a reed, not a chip) | 1 / 2 / 3 |
| Hound | Same register, shorter offbeat ticks | 1 / 2 / 3 |
| Hunter | Middle, clipped triangle plucks | 1 / 2 / 3 |
| Seer | Same register, shifted rhythm and softer attack | 1 / 2 / 3 |
| Brute / Ogre (and the rat ogre) | Triangle sub + octave body + short square edge, different onsets | 2 / 3 / 4 |
| Wraith | High sine chimes | 1 / 2 / 3 |
| Spike plate | Low-middle metallic ticks | 1 / 2 (cap two) |
| Mill | Same trap instrument, longer rotating pattern | 2 / 3 (cap two) |

Bearers/hounds, Hunters/Seers and Brutes/Ogres share their family's cap of three, dealt round the
kinds in turn so a mixed room keeps both figures. The slots in `MUSIC_PARTS` are ranked: another man
adds an accent and never moves the ones already playing. Intact traps count throughout the room,
including idle spike plates. Each trap hit has a quiet harmonic overtone, not an extra rhythmic hit.
Across every legal mix no more than two primary onsets fall on one sixteenth (`tools/audio-check.js`),
and a late room the generator deals (three clubmen, two hounds, a rifle, a brute) is six hits in two
bars where it was ten.

The heavy voice retains its 41–82 Hz fundamental but adds triangle at twice the frequency and a
short square at four times it, so a single heavy is heard on small speakers.

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
music, opened by the SPOTTED sting (below). A suspended three-note warning leaves space before the choice. It then becomes **chase**:
an offbeat running melody and light hats. Actual accepted headbutts, throws and screams count as
offensive intent and select **combat**, with shorter stronger lead notes, extra kicks and toms.
Attacks during the warning are remembered for the branch at its end. Rolling and incidental kills
do not turn an escape into a fight. Attacking with no sensed enemy does not start combat.

After two bars without another offensive action, an ongoing threat returns to chase. After a bar
without any sensed threat, the score returns to idle. This grace avoids flapping at doorways.
All changes commit on quarter notes and crossfade over 0.3 seconds without restarting the clock.
The two-bar intro, attack hold and one-bar calm grace are tunable in `TUNING.audio.layers`.
The lab's state buttons hold a selected arrangement so it can be auditioned as long as needed.

## Answers to situations

The score answers what happens, not what the player presses. Until 1.70 every headbutt, roll, throw
and scream also got a woodblock reply a second or two later, on top of its own effect: a second copy
of every button, late. The buttons now only tell the stage machine what he means (a headbutt, throw
or scream is an attack; a roll is not). What is left (`MUSIC_EVENTS`):

- **KILL**: a two-note chime on the next eighth (`layers.eventGridSteps` 2; it waited one to two
  seconds, which read as a sound of its own). A crowd killed at once merges into one accent, at most
  three strong.
- **CLEARED**, the room's last man: four notes up the scale to the octave, half a beat after the kill.
- **SPOTTED**, a fight starting (the stage machine going live): one frame-drum hit and a low plucked
  root on the next sixteenth, then the two-bar warning's own figure.
- **HURT**, a heart lost: the score's low-pass (`scoreTone`, `TUNING.audio.tone`) dips to 380 Hz and
  comes back over 0.9 s. Only the score: the blow's own effect stays sharp.
- **The last heart**: the low-pass stays at 900 Hz, the tune steps back to `layers.heartSing` of
  itself, and his heart is heard (`GameAudio.heartbeat`, Foley's `heart`) in time with the red at
  the screen's edge — lub as the picture's beat turns over, dub a fifth of a beat on.

The queue holds twelve at most, muted events are spent rather than kept, and leaving play clears it.

## The room's own sound

Fire and the milk grass used to be part of the score — a crackle a bar for coals, pops for a blaze, a
chime a patch — and sat on top of the tune. They are the world's now (`GameAudio.updateAmbience`,
`TUNING.audio.ambience`), off the music's clock and on the **effects** slider (`ambBus`):

- **A bed a floor**, by canon (`ambience.beds`): still air in stone (THE ALTAR, THE YARD, THE
  OSSUARY, THE DARK), the cave's hollow ringing on a few low notes of its own (THE CAVE, THE TRIP),
  wind through boards with a whistle over the gusts (THE ROAD, THE THRESHING FLOOR, THE BRIDGE, THE
  RAFTERS — loudest there, with the windows). Loops from `Foley.loop`, rendered once at a low rate
  and crossfaded end into start, faded across a floor change.
- **The nearest fire**: one crackle whose level is every lit bowl, lamp and lantern, burning tile and
  burning man inside seven tiles, weighed by kind and nearness, panned to its side.
- **Now and then**: water dripping in the cave floors, the ossuary and THE DARK; the cult drumming a
  long way off, every 40–90 s, only while nothing is after him; the milk grass, three small glassy
  notes, only when he has a heart to fill and it is within four tiles.

## Tools > MUSIC

Open DEV TOOLS, then TOOLS, then MUSIC, or load `index.html#music` / `http://127.0.0.1:8766/#music`.
The game is paused while the tool is open. The lab runs the same score engine as gameplay.

- Choose 0-3 of each enemy type, 0-2 spike plates and mills. Clicking a count starts playback. Mix types together.
- SOLO keeps just that row (one if it was zero); NO BASE removes the bed for isolated listening.
- IDLE / SPOTTED / CHASE / COMBAT selects the bed; LEVEL 1 / LEVEL 2-4 / LEVEL 5+ selects its theme.
- LEVEL CLEAR / DEATH / SOUL auditions a narrative phrase once. PLAY repeats it; a bed or part
  button returns to the room mix. These phrases also have named tracks in SCORE and JSON EXPORT.
- The right-hand figures show effective count / hits per two bars, after the shared cap.
- On wider screens, a 32-step strip shows the actual onset pattern and moving playhead.
- ROOM plays a floor's bed (OFF / AIR / CAVE / WIND); FIRE a crackle beside him (NONE / NEAR / BLAZE).
  LAST HEART closes the score's low-pass, pulls the tune back and beats his heart.
- KILL / CLEARED / SPOTTED / HURT fire the answers; the queue below the pads shows what is waiting.
- ROOM (top row) copies the paused gameplay room; CLEAR removes the mix; PLAY / STOP controls auditioning.
- STOP cancels queued musical notes. Closing the lab cancels previews and resumes the live score,
  preserving the user's soundtrack setting and game entities. MUTE/UNMUTE controls global sound.

## Score and FL Studio handoff

MIX shows each row's current register root as a scientific note name, MIDI number and oscillator
abbreviation (TRI / SQ / SIN). These are register references; the scale degrees change actual notes.
SCORE shows all nineteen instrument/event tracks across the full sixteen bars, with a moving playhead.
Select a track and a bar to see its instrument, beat positions, exact notes, MIDI numbers and Hz.
Heavy overtones and other harmonics appear as real notes in that inspection.

The score is generated by running the actual arranger without audio, with the selected room/state
settled. It represents a fixed arrangement, not future live enemy changes or the fade into a state.
Selecting a narrative phrase isolates its two/three bars in this view, with the remaining bars at
rest. Lab phrases start from the selected theme's first root for repeatable listening/export;
gameplay phrases use the current bar's root.
Recent pad events (KILL, CLEARED, SPOTTED) are marked at their positions in the phrase (up to 64 from
the last phrase-length window), but are not automatically looped. ERASE removes the marks and pending
answers; CLEAR also empties the room.

EXPORT downloads a JSON score containing every emitted note/noise, its track, onset and duration
in sixteenth notes, waveform, gain, envelopes/filter settings where specified, and bus levels.
For FL Studio, use **118 BPM, 4/4, sixteen steps per bar**. One score step is a sixteenth note;
divide steps and durations by four for beats. C4 here is MIDI 60. FL Studio's octave labels may be
different, so MIDI number and Hz are the unambiguous reference. A triangle/sine/square oscillator
can reproduce most voices; bass uses a saw and a closing 700-to-170 Hz low-pass filter. Drum
sweeps are indicated as end/start frequency ratios. Noise has no pitched MIDI note.
The JSON is a transcription/synthesis reference, not an FL project or a native MIDI import.

## Implementation and validation

`MUSIC_PARTS` supplies the per-type slots and envelopes; `ROOM_MUSIC` supplies shared registers;
`LATE_MUSIC` supplies the later harmony. `TUNING.audio.layers.hitBudgets` holds count-to-hit curves
(`musicCap` is how far a kind's count goes). The other `layers` values control caps, gain, sensing
and event timing; `TUNING.audio.tone` is the score's low-pass, `TUNING.audio.ambience` the room's sound.

Run `node tools/audio-check.js` for actual emitted-note counts, pattern separation, all legal
family mixes, sensing, whole-room traps, the answers (kill, cleared, spotted, hurt, last heart) and
that the buttons have none, mute, lab isolation, legacy selection, state branching, heavy harmonics,
full-score metadata, scheduler recovery, every floor's bed, fire near him, the heartbeat's timing,
and that every Foley recipe and loop renders (a loop without a seam).

With the local server on 8766 and Playwright on Node's module path, run
`node tools/audio-browser-check.js`. It checks settings persistence, actual game playback,
Music Lab click controls, stop/exit cleanup, three screen sizes and offline audio renders of both
themes, including full mixed crowds, traps and stacked event accents. Output and
screenshots are saved under ignored `tools/shots/audio/`.
