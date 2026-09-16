# Room music

Levels **1–4** keep the original Phrygian pad and bass, with a quiet exploration arrangement
and a simpler combat arrangement. Levels **5 onward** have a new G-minor progression, a quiet
plucked melody and a separate, more active combat reply that crossfades with it. Enemy and grass
notes follow the selected harmony. Theme changes occur on a bar boundary, and death does not
switch a late level back to the early theme.

Everything shares 118 BPM and a **16-bar phrase**: 256 sixteenth notes in 4/4,
about 32.5 seconds. This means sixteen actual bars, not a sixteen-step sequencer loop.

| Family | Game enemies | Sound |
|---|---|---|
| Small | Ordinary Bearers and hounds | Short high square-wave ticks |
| Ranged | Hunters and Seers, including elite mages | Mid-register triangle plucks |
| Large | Champion Bearers and Butchers | Low triangle pairs, with a quieter eighth-note reply |
| Mystical | Wraiths, including their intangible phase | Soft high sine chimes |
| Fire | Intact braziers and lamps within four tiles | One dry crackle per bar |
| Blaze | Burning tiles, living burning enemies and the burning goat within four tiles | More crackles as the burning area grows, with a two-bar tail |
| Grass | Uneaten healing patches within four tiles | A soft harmonic chime, up to three notes per bar, with a one-bar tail |

Each family has six additive voice patterns. One enemy enables the first, three enable the first
three, and six or more enable all six. Extra enemies never add voices or volume. A voice hits once
per two-bar seed, or twice for a large enemy. Four four-bar sections vary its timing and scale notes
across the full phrase. Each extra ranged enemy adds eight distinct plucks per full phrase: one
gives eight, three give twenty-four, six give forty-eight. The first voices stay in place as more
join, so listening can reveal the count, up to the cap. Magicians and Hunters share this count.
Family counts define a room's arrangement; rooms with the same composition intentionally share it.
There is no random retuning on entry and no dependence on enemy array order.

All living enemies physically in the goat's current room contribute, even before they notice him.
A nearby aware pursuer also contributes outside that room if there is a clear line to the goat,
up to eight tiles. Spawn-room IDs do not pin a moving enemy's instrument to the wrong room.
The combat bed enters when one of those enemies is aware and active. Wraiths stay in the count
when intangible, so their attacks do not repeatedly start and stop their part.

Counts are sampled every 0.1 seconds and committed on quarter-note boundaries. Voice levels ease
over 0.3 seconds; notes already sounding finish their envelopes. Leaving play (death, menus,
upgrades, stairs or intro) clears the target layers. The transport keeps running across changes.
When a browser tab wakes late, the scheduler skips missed steps instead of playing them all at once.

The four enemy families' primary hits occupy different sixteenths within each beat. Within a family,
every voice has its own slot. The large enemies' quieter replies can meet the high small-enemy ticks,
but stay in a separate register; no two counted bass voices land together. Shared gain compensation
also accounts for the extra bass hits. The original sound effects remain on their existing buses.

A nearby lamp or brazier adds one crackle per bar regardless of how many fixtures stand nearby.
Active burning area adds one, two or three answering crackles at thresholds of 1, 4 and 10 sources
(burning tiles and living burning bodies). A large blaze adds a short low rustle too. This density
is remembered for two bars after the fire disappears, shrinks or falls out of range, then fades.
Short flares between beat boundaries are retained. Grass gets a gentler one-bar memory, including
when the goat eats it. Leaving play clears both memories, so a previous room's fire cannot linger
into a restart. At 118 BPM a bar is about 2.03 seconds.

## Returning to the original score

Open **SETTINGS → LAYERED MUSIC** and switch it **off**. The choice is saved in this browser;
switch it on again to restore the room score. Existing saves default to the new arrangement.

The original music is retained in `GameAudio.playLegacyStep` in `js/audio.js`, with its unchanged
`MUSIC`, `playBed`, drum voices, threat thresholds, hunter shaker and bell drone. It runs on its
original four-bar cycle. This is a working fallback, not just a description or an audio reference.
Keep that method and its original helpers when expanding the layered score.

## Tuning and checks

- `TUNING.audio.layers` in `js/tuning.js`: category cap, sensing radii, sampling, fades and mix.
- `ROOM_MUSIC` and `LATE_MUSIC` in `js/audio.js`: voice slots, melodies, harmony and note envelopes.
- `node tools/audio-check.js`: classification, caps, sensing, fire boundaries, interlocking patterns,
  actual emitted notes for counts 1–6, heavy pairs, both idle/combat themes, fire extent and tails,
  grass, fades, game-state exits, muted playback, scheduler recovery and fallback selection.
- `node tools/audio-browser-check.js`: optional Playwright/Chrome check, with the game served at
  port 8766. Verifies the real menu, persistence, desktop and mobile layouts, live gameplay and
  offline WebAudio renders of quiet, sparse, full and original arrangements. Playwright must be
  resolvable by Node (for example through `NODE_PATH`). Results go to ignored `tools/shots/audio/`.

Future sound libraries can replace the four synth voices without changing counting or transport.
The first version deliberately keeps the sounds simple; listening in actual play remains how the
musical balance should be judged, beyond the automated timing and clipping checks.
