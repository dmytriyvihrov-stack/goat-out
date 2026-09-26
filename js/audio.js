// WebAudio: a synthesised ritual score driven by threat, plus one-shot sound effects. No assets.

// What the compound hums to itself: a four-bar sag in the bass with a phrygian motif over it.
// Scale degrees index into `scale`; -1 is a rest. Sixteen steps to the bar.
const MUSIC = {
  roots: [55, 55, 48.99, 41.20],                        // A1 A1 G1 E1
  scale: [0, 1, 3, 5, 7, 8, 10],                        // phrygian: the mode the cult sings in
  motif: [0, -1, -1, -1, 3, -1, -1, 2, -1, -1, 1, -1, 0, -1, -1, 4],
};
// The upper floors answer in G minor, with a separate quiet melody and combat reply.
// The enemy voices follow this harmony too; the original/legacy score keeps MUSIC unchanged.
const LATE_MUSIC = {
  roots: [49.00, 43.65, 41.20, 49.00],
  scale: [0, 2, 3, 5, 7, 8, 10],
  idle: [4, -1, -1, -1, -1, -1, 2, -1, -1, -1, 0, -1, -1, -1, 2, -1],
  combat: [0, -1, -1, 2, -1, -1, 4, -1, 3, -1, -1, 2, 0, -1, 4, -1],
};
// The first escape has no confident walking ostinato yet: a semitone-shifted harmony,
// hesitant answers and empty downbeats. All four states still share the room's rhythm grid.
const FIRST_MUSIC = { roots: [55,58.27,49,41.20], scale: MUSIC.scale };
const musicTheme = (scene) => scene.first ? FIRST_MUSIC : scene.late ? LATE_MUSIC : MUSIC;
// The tune the compound hums. Until 1.66 the room score was a drone, a bass note or two a bar and no
// line anybody could hum, under a stone room's wash, and it read as noise. Each theme now has one
// four-bar phrase over its four roots, played by the bone flute (`lead`) whenever the goat is not in
// the two-bar warning: [sixteenth of the 64, semitones above the theme's first root four octaves up,
// length in sixteenths]. The ordinary theme's hook is A-C-Bb-A and every phrase ends on the Phrygian
// fall A-G-F-E over the E; the upper floors answer it in G minor; the first floor's is the same fall
// broken up, with rests and a tritone at the end of it. `bass` is one bar's line over each root:
// [sixteenth, semitones above the root, length, gain] — a folk gallop, not one long note. `toms` are
// the frame drum's answers between the kicks.
const THEME_BED = {
  early: { gain: 0.085, pad: 0.03, toms: [6, 14],
    melody: [[0,0,3],[3,3,2],[5,1,2],[7,0,2],[9,-2,3],[12,0,2],[14,1,2],
      [16,3,2],[18,5,2],[20,7,4],[24,5,2],[26,3,2],[28,1,4],
      [32,5,3],[35,3,1],[36,1,4],[40,0,2],[42,-2,2],[44,1,4],
      [48,0,2],[50,-2,2],[52,-4,2],[54,-5,6],[62,-2,2]],
    bass: [[0,0,3,0.24],[3,0,1.5,0.12],[6,7,2,0.16],[8,0,2.5,0.2],[11,0,1.5,0.12],[14,10,2,0.14]] },
  late: { gain: 0.08, pad: 0.03, toms: [6, 14],
    melody: [[0,7,3],[3,3,1],[4,5,2],[6,2,2],[8,0,4],[12,3,1],[13,2,1],[14,0,2],
      [16,-2,4],[20,2,2],[22,5,2],[24,2,6],[30,0,2],
      [32,3,3],[35,0,1],[36,-3,4],[40,0,2],[42,3,2],[44,2,4],
      [48,0,2],[50,-2,2],[52,0,6],[60,2,2],[62,3,2]],
    bass: [[0,0,3,0.22],[6,0,1.5,0.12],[8,7,2.5,0.16],[12,0,2,0.15],[14,12,1.5,0.1]] },
  first: { gain: 0.065, pad: 0.022, toms: [],
    melody: [[0,7,4],[6,5,1],[7,3,1],[8,1,4],[12,0,3],
      [18,5,3],[21,1,1],[22,3,2],[24,5,5],[30,1,2],
      [32,-2,4],[36,1,2],[38,0,2],[40,-2,6],
      [48,-5,5],[54,-2,2],[56,1,3],[60,0,4]],
    bass: [[0,0,2.5,0.16],[8,0,1.2,0.07],[11,7,1.4,0.09]] },
};
// [sixteenth, semitones above root, octave multiplier, duration in sixteenths].
// These small authored phrases replace the room score briefly; they never fight its harmony.
const MUSIC_CUES = {
  clear: { label: 'LEVEL CLEAR', bars: 2, type: 'triangle', gain: 0.13,
    notes: [[0,0,4,2],[3,3,4,2],[6,7,4,3],[10,12,4,4],[16,7,4,3],[20,12,4,10]],
    chords: [[0,[0,7],2,7],[16,[0,4,7],2,14]] },
  death: { label: 'DEATH', bars: 3, type: 'sine', gain: 0.12,
    notes: [[2,12,4,6],[10,10,4,6],[18,7,4,7],[27,3,4,8],[38,0,4,9]],
    chords: [[0,[0,3],2,15],[18,[-5,2],2,15],[36,[-12,0],2,11]] },
  soul: { label: 'SOUL', bars: 2, type: 'sine', gain: 0.14,
    notes: [[0,0,8,4],[3,7,8,5],[6,12,8,6],[10,19,8,8],[16,12,8,12]],
    chords: [[0,[0,7,14],2,14],[16,[0,7,12],4,14]] },
};
const MUSIC_STAGES = ['idle', 'spotted', 'chase', 'combat'];
// The opening scene has an arc of its own: the meadow is the one bright cue in the game and the
// only phase that leaves the frightened first-level theme for the ordinary one (`updateScene`
// reads this against `phase`), then the truck, the dark and the men closing in climb the same
// idle/spotted/chase/combat ladder a run's own encounters climb, peaking on the blow that takes
// her. `black`/`wake` ease back down since the beat is already over by then.
const INTRO_STAGE = { meadow: 'idle', road: 'spotted', dark: 'chase', cloth: 'chase',
  huddle: 'chase', approach: 'chase', gate: 'chase', grab: 'combat', fade: 'combat',
  black: 'idle', wake: 'idle' };
// The score's answers to what happens (1.70). Until then every headbutt, roll, throw and scream also
// got a woodblock reply a second or two later, on top of the effect itself: a second copy of every
// button, late. What is left answers a situation, not a button: KILL, CLEARED (the room's last man),
// SPOTTED (a fight starting) and HURT (a heart lost, which closes the score's low-pass for a moment).
const MUSIC_EVENTS = { kill: 'KILL', cleared: 'CLEARED', spotted: 'SPOTTED', hurt: 'HURT' };
// Same scale and clock, but different phrasing: suspended warning, running ostinato, hard accents.
const STAGE_MOTIFS = {
  first: {
    idle: [-1,-1,4,-1,-1,-1,-1,3,-1,-1,-1,1,-1,-1,-1,-1],
    spotted: [-1,0,-1,1,-1,-1,0,-1,-1,-1,4,-1,-1,1,-1,-1],
    chase: [-1,0,-1,1,-1,2,-1,-1,4,-1,-1,2,-1,1,-1,-1],
    combat: [0,-1,1,-1,-1,0,4,-1,3,-1,1,-1,-1,0,4,-1],
  },
  early: {
    idle: MUSIC.motif.map(() => -1),
    spotted: [0,-1,-1,-1,-1,-1,1,-1,-1,-1,-1,-1,4,-1,-1,-1],
    chase: [0,-1,-1,2,-1,-1,4,-1,2,-1,-1,1,-1,-1,4,-1],
    combat: [0,-1,0,-1,3,-1,-1,2,4,-1,1,-1,0,-1,4,-1],
  },
  late: {
    idle: LATE_MUSIC.idle,
    spotted: [4,-1,-1,-1,-1,-1,3,-1,-1,-1,-1,-1,2,-1,-1,-1],
    chase: [4,-1,2,-1,-1,-1,0,-1,2,-1,3,-1,-1,-1,2,-1],
    combat: LATE_MUSIC.combat,
  },
};
const musicPitch = (freq) => {
  const midi = Math.round(69 + 12 * Math.log2(freq / 440));
  return { midi, note: ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1), hz: Math.round(freq * 100) / 100 };
};
const MUSIC_TRACKS = {
  pad: 'Open-fifth triangle drone', bass: 'Saw bass line, low-pass closing 700 to 170 Hz', lead: 'Bone flute theme (triangle, vibrato) + plucked saw riff', drums: 'Frame-drum kick / tom (swept sine + skin slap) + rim knock',
  bearer: 'Muffled square ticks', dog: 'Short muffled square ticks', hunter: 'Triangle pluck', seer: 'Soft triangle pluck',
  champion: 'Triangle sub + octave + muffled square edge', butcher: 'Triangle sub + octave + muffled square edge', wraith: 'Sine chime',
  spike: 'Triangle + sine octave', mill: 'Long triangle + sine octave',
  kill: 'Triangle / sine chime', cleared: 'Plucked climb / flute', spotted: 'Frame drum + low pluck',
  clear: 'Rising triangle / major release', death: 'Falling sine / minor lament', soul: 'High sine / open fifths',
};

// Shared registers over a 16-bar clock. Each type below supplies its own ranked onsets, the same
// two bars over and over (1.70): the four answers that shifted them every four bars went, so a
// kind's figure is one you can learn by ear.
const ROOM_MUSIC = {
  bars: 16, stepsPerBar: 16,
  small: { phase: 2, octave: 8, notes: [0, 4, 2, 4, 0, 2], type: 'square', gain: 0.075, length: 0.46, lp: 1500 },
  ranged: { phase: 1, octave: 4, notes: [4, 0, 2, 4, 2, 0], type: 'triangle', gain: 0.13, length: 1.25 },
  large: { phase: 0, octave: 1, notes: [0, 0, 4, 0, 4, 0], type: 'triangle', gain: 0.20, length: 1.75 },
  mystical: { phase: 3, octave: 16, notes: [0, 4, 2, 0, 2, 4], type: 'sine', gain: 0.085, length: 3.0 },
};
const MUSIC_FAMILIES = ['small', 'ranged', 'large', 'mystical'];
// Ranked onsets: enabling another enemy preserves the earlier accents. Related instruments
// share a register, but their rhythms and envelopes remain recognisable in a mixed room.
// Since 1.70 a man is one hit per two bars (a big one two), and a family stops adding at three
// (`layers.maxPerFamily`): six clubmen used to be six ticks and a full room a wall of them on top
// of the tune. The slots past the budget are simply never reached.
const MUSIC_PARTS = {
  bearer: { family: 'small', label: 'BEARER', slots: [2,18,10,26,6,22], length: 0.46 },
  dog: { family: 'small', label: 'HOUND', slots: [7,23,15,31,3,19], length: 0.32 },
  hunter: { family: 'ranged', label: 'HUNTER', slots: [1,17,9,25,5,21,13,29], length: 0.8 },
  seer: { family: 'ranged', label: 'SEER', slots: [4,20,12,28,8,24,0,16], length: 1.6 },
  champion: { family: 'large', label: 'BUTCHER', slots: [0,8,10,16,24,26,4,12,18,20,28,30,6], length: 1.4 },
  butcher: { family: 'large', label: 'OGRE', slots: [4,12,14,20,28,30,0,8,22,24,16,18,2], length: 1.8 },
  wraith: { family: 'mystical', label: 'WRAITH', slots: [3,19,11,27,7,23], length: 3 },
  spike: { family: 'trap', label: 'SPIKES', slots: [5,21,13,29,1,17], length: 0.45 },
  mill: { family: 'trap', label: 'MILLS', slots: [14,30,6,22,10,26,2], length: 1.1 },
};
ROOM_MUSIC.trap = { octave: 2, notes: [4,0,2,4,2,0], type: 'triangle', gain: 0.12 };
// Fire and the milk grass were part of the score until 1.70; they are the room's sound now
// (`GameAudio.updateAmbience`), so the scene is who is here, the stage and the goat's last heart.
const emptyMusicScene = () => ({ ...Object.fromEntries(Object.keys(MUSIC_PARTS).map((k) => [k, 0])),
  combat: false, late: false, first: false, lastHeart: false });
// The most of a kind the room's count can ask for (the lab's buttons run to it too).
const musicCap = (kind) => { const L = TUNING.audio.layers; return kind === 'mill' ? L.maxMills : kind === 'spike' ? L.maxSpikes : L.maxPerFamily; };
function musicHitCount(kind, count) {
  const P = MUSIC_PARTS[kind], budgets = TUNING.audio.layers.hitBudgets;
  const budget = budgets[kind === 'mill' ? 'mill' : P.family] || budgets.small;
  return budget[Math.max(0, Math.min(budget.length - 1, Math.floor(count || 0)))];
}
// A family shares its cap round the kinds in it, one each in turn, so a room of clubmen and hounds
// keeps both figures rather than filling up with whichever was counted first.
function capMusicScene(scene) {
  for (const family of MUSIC_FAMILIES) {
    const kinds = Object.keys(MUSIC_PARTS).filter((k) => MUSIC_PARTS[k].family === family);
    const raw = kinds.map((k) => Math.max(0, Math.floor(scene[k] || 0)));
    kinds.forEach((k) => { scene[k] = 0; });
    let left = TUNING.audio.layers.maxPerFamily;
    for (let rank = 0; left && raw.some((n) => n > rank); rank++) for (let i = 0; i < kinds.length && left; i++) {
      if (raw[i] > rank) { scene[kinds[i]]++; left--; }
    }
  }
  for (const k of ['spike', 'mill']) scene[k] = Math.min(musicCap(k), Math.max(0, Math.floor(scene[k] || 0)));
  return scene;
}

function musicFamily(e) {
  if (e.kind === 'wraith') return 'mystical';
  if (e.kind === 'hunter' || e.kind === 'seer') return 'ranged';
  if (e.kind === 'butcher' || e.kind === 'ratogre' || e.champion) return 'large';
  if (e.kind === 'bearer' || e.kind === 'dog') return 'small';
  return null;
}

// Position, not spawn-room, follows men through doors. Mist counts too: a wraith must not
// switch its instrument off and on every time it becomes intangible.
function roomMusicScene(game) {
  const scene = emptyMusicScene(), g = game.goat, L = TUNING.audio.layers;
  scene.late = game.state !== 'title' && game.levelIndex + 1 >= L.lateFromLevel;
  scene.first = game.state !== 'title' && game.levelIndex === 0;
  if (game.state !== 'play' || !g || g.dead || game.dev.rules) return scene;
  const room = roomAt(game.level, g.x, g.y);
  const near = (x, y, radius) => Math.hypot(x - g.x, y - g.y) <= radius;
  const inRoom = (x, y) => room ? roomAt(game.level, x, y) === room : false;
  // The last heart is heard as well as seen (`juice.heartbeat`): the score goes under water.
  const B = TUNING.juice.heartbeat;
  scene.lastHeart = g.hp <= B.hp && g.maxHp > B.hp;
  for (const e of game.enemies) {
    if (e.dead) continue;
    const family = musicFamily(e);
    if (!family) continue;
    const pursuing = e.aware && e.state !== 'idle' && near(e.x, e.y, L.pursuitRadius)
      && game.sees(g.x, g.y, e.x, e.y);
    if (!inRoom(e.x, e.y) && !pursuing) continue;
    // The rat ogre has no part of his own: he plays the Butcher's, the one heavy voice there is.
    const kind = e.champion && e.kind === 'bearer' ? 'champion' : e.kind === 'ratogre' ? 'butcher' : e.kind;
    scene[kind]++;
    if (e.aware && e.state !== 'idle') scene.combat = true;
  }
  // Traps belong to the whole current room, idle or not.
  for (const p of game.props) {
    if (p.broken || p.dead) continue;
    if ((p.kind === 'mill' || p.kind === 'spike') && inRoom(p.x, p.y)) scene[p.kind]++;
  }
  return capMusicScene(scene);
}

// A floor's bed of sound (`TUNING.audio.ambience.beds`), by its canon; THE TRIP has its own.
function ambienceBed(def) {
  const B = TUNING.audio.ambience.beds;
  return (def && def.shroom ? B.trip : def && def.canon && B[def.canon.id]) || B.stone;
}

function musicPartHit(kind, hit, step) {
  return step % 32 === MUSIC_PARTS[kind].slots[hit];
}

class GameAudio {
  constructor() {
    this.ctx = null; this.muted = false;
    // 0.5 is "as tuned" for both — `setVolumes` is called with whatever the settings panel holds
    // before the context necessarily exists yet (a browser will not open one before a gesture), so
    // `init()` reads these back rather than always starting the two buses at TUNING's own values.
    this.volMusic = 0.5; this.volSfx = 0.5;
    this.intensity = 0; this.hunterAware = false; this.droneUntil = 0;
    this.step = 0; this.nextTime = 0; this.bpm = 118;
    this.layered = true; this.scene = emptyMusicScene(); this.sceneTimer = 0;
    this.voices = Object.fromEntries(Object.entries(MUSIC_PARTS).map(([k, p]) => [k, p.slots.map(() => 0)]));
    this.musicTick = 0; this.musicEvents = []; this.musicNodes = new Set(); this.preview = null;
    this.lab = { playing: false, bed: 'combat', scene: emptyMusicScene(), view: 'mix', bar: 0, track: 'lead', actions: [], cue: null,
      amb: { bed: null, fire: 0 } };
    this.cue = null; this.terminalCue = null; this.firstTheme = false;
    this.stageMix = { idle: 1, spotted: 0, chase: 0, combat: 0 };
    this.resetEncounter();
    this.combatMix = 0; this.heartMix = 0; this.lateTheme = false;
    // The room's own sound (`updateAmbience`): the loops playing, and the clocks of the one-shots.
    this.amb = { beds: {}, fire: null, next: 0, drip: 2, far: 30, grass: 2, bed: null };
  }
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    const A = TUNING.audio;
    // SOUND off in SETTINGS is applied before the first gesture makes the context: start silent then.
    this.master = this.ctx.createGain(); this.master.gain.value = this.muted ? 0 : A.master; this.master.connect(this.ctx.destination);
    // The score and its drums reach the speakers through one low-pass (`scoreTone`), open unless the
    // goat is on his last heart or has just lost one (`setScoreTone`, `hurtDip`).
    this.scoreTone = this.ctx.createBiquadFilter(); this.scoreTone.type = 'lowpass';
    this.scoreTone.frequency.value = A.tone.open; this.scoreTone.Q.value = 0.5; this.scoreTone.connect(this.master);
    this.drumBus = this.ctx.createGain(); this.drumBus.connect(this.scoreTone);
    this.sfxBus = this.ctx.createGain(); this.sfxBus.connect(this.master);
    this.musicBus = this.ctx.createGain(); this.musicBus.connect(this.scoreTone);
    // The rooms' own sound, on the effects slider (`setVolumes`): it is the world, not the score.
    this.ambBus = this.ctx.createGain(); this.ambBus.connect(this.master);
    this.layerBus = this.ctx.createGain(); this.layerBus.gain.value = A.layers.gain; this.layerBus.connect(this.musicBus);
    // One small room under everything (`TUNING.audio.room`): a third of a second, a little of it.
    // Bone dry, every effect was a sound in no place at all; 1.4 s of stone (1.61-1.65) put every
    // blow at the far end of a cathedral. The score goes in a little too.
    const R = A.room, gain = (v) => { const g = this.ctx.createGain(); g.gain.value = v; return g; };
    this.roomIn = this.ctx.createConvolver(); this.roomIn.buffer = Foley.roomImpulse(this.ctx, R.decay, R.damp);
    this.roomOut = gain(R.level); this.roomIn.connect(this.roomOut); this.roomOut.connect(this.master);
    this.sfxRoom = gain(R.sfx); this.sfxBus.connect(this.sfxRoom); this.sfxRoom.connect(this.roomIn);
    this.musicRoom = gain(R.music); this.musicBus.connect(this.musicRoom); this.drumBus.connect(this.musicRoom); this.musicRoom.connect(this.roomIn);
    // A loud effect's extra share of the room (`foley`'s `wet`), kept at the SFX slider's level.
    this.sfxWet = gain(0); this.sfxWet.connect(this.roomIn);
    this.setVolumes(this.volMusic, this.volSfx);
    const len = this.ctx.sampleRate * 1.5;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.nextTime = this.ctx.currentTime + 0.1;
    setInterval(() => this.schedule(), 25);
    // A phone suspends (or on iOS 'interrupts') the context behind a call or a switched app; ask again
    // on the way back rather than waiting for the next tap.
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.resume(); });
    this.warm();
  }
  // Any state short of running or closed: Safari's 'interrupted' was never asked back.
  resume() {
    if (!this.ctx || this.ctx.state === 'running' || this.ctx.state === 'closed') return;
    const p = this.ctx.resume(); if (p && p.catch) p.catch(() => {});
  }
  setLayered(enabled) { this.layered = !!enabled; }
  // The two sliders in SETTINGS. 0.5 reproduces `TUNING.audio`'s own tuned levels exactly, so the
  // scale is `value / 0.5`: the room score and its drums (`musicBus`, `drumBus` — `layerBus` rides
  // on `musicBus` already) against the noise of a fight (`sfxBus` — swings, hits, barks, voice).
  setVolumes(musicVol, sfxVol) {
    this.volMusic = clamp(musicVol == null ? 0.5 : musicVol, 0, 1);
    this.volSfx = clamp(sfxVol == null ? 0.5 : sfxVol, 0, 1);
    if (!this.ctx) return;
    const A = TUNING.audio;
    this.drumBus.gain.value = A.drums * (this.volMusic / 0.5);
    this.musicBus.gain.value = A.music * (this.volMusic / 0.5);
    this.sfxBus.gain.value = A.sfx * (this.volSfx / 0.5);
    if (this.ambBus) this.ambBus.gain.value = A.ambience.gain * (this.volSfx / 0.5);
    if (this.sfxWet) this.sfxWet.gain.value = this.sfxBus.gain.value;
  }
  trackMusicNode(node) {
    if (!this.scoring) return;
    this.musicNodes.add(node); node.onended = () => this.musicNodes.delete(node);
  }
  resetScore() {
    this.cue = null; this.terminalCue = null;
    // Under the stop the two music buses dip to nothing and come back (`audio.cut`), or every note
    // still sounding ends in a click.
    const t = this.ctx ? this.ctx.currentTime : 0, cut = TUNING.audio.cut;
    if (this.ctx && this.musicNodes.size) {
      for (const bus of [this.musicBus, this.drumBus]) {
        const g = bus.gain, v = (bus === this.drumBus ? TUNING.audio.drums : TUNING.audio.music) * (this.volMusic / 0.5);
        g.cancelScheduledValues(t); g.setValueAtTime(v, t); g.linearRampToValueAtTime(0, t + cut); g.setValueAtTime(v, t + cut * 1.2);
      }
    }
    for (const node of this.musicNodes) { try { node.stop(this.ctx ? t + cut : 0); } catch (_) { /* already ended */ } }
    this.musicNodes.clear(); this.musicEvents.length = 0;
    for (const voices of Object.values(this.voices)) voices.fill(0);
    this.combatMix = this.heartMix = 0;
    this.beatScene = null; this.sceneTimer = 0;
    this.stageMix = { idle: 1, spotted: 0, chase: 0, combat: 0 }; this.resetEncounter();
  }
  startMusicCue(kind, levelIndex) {
    if (!MUSIC_CUES[kind] || (!this.layered && !this.preview)) return;
    const scene = levelIndex == null ? this.scene : { first: levelIndex === 0, late: levelIndex + 1 >= TUNING.audio.layers.lateFromLevel };
    const root = musicTheme(scene).roots[this.preview ? 0 : (this.step >> 4) & 3];
    this.resetScore();
    this.cue = { kind, root, start: this.musicTick + (kind === 'death' ? 0 : (4 - this.step % 4) % 4) };
  }
  playCueStep(t, stepLen) {
    const cue = this.cue, phrase = MUSIC_CUES[cue.kind], step = this.musicTick - cue.start;
    if (step < 0) return;
    if (step >= phrase.bars * 16) {
      if (cue.kind !== 'soul' || this.preview) this.terminalCue = cue.kind;
      this.cue = null;
      if (this.preview) this.preview.playing = false;
      return;
    }
    if (this.muted) return;
    this.scoreTrack = cue.kind;
    for (const [at, semitone, octave, length] of phrase.notes) {
      if (at !== step) continue;
      const f = cue.root * octave * Math.pow(2, semitone / 12);
      this.tone(f, t, stepLen * length, { type: phrase.type, gain: phrase.gain, attack: cue.kind === 'death' ? 0.06 : 0.012, bus: this.musicBus });
      if (cue.kind !== 'death') this.tone(f * 2, t, stepLen * length * 0.45, { type: 'sine', gain: phrase.gain * 0.22, bus: this.musicBus });
    }
    for (const [at, chord, octave, length] of phrase.chords) {
      if (at !== step) continue;
      for (const semitone of chord) this.tone(cue.root * octave * Math.pow(2, semitone / 12), t, stepLen * length,
        { type: 'triangle', gain: 0.045, attack: 0.12, bus: this.musicBus });
    }
  }
  resetEncounter() {
    this.encounter = { active: false, spottedUntil: 0, attackUntil: 0, lastThreat: -Infinity };
  }
  encounterStage(threat) {
    const e = this.encounter, L = TUNING.audio.layers, tick = this.musicTick;
    if (threat) {
      if (!e.active) {
        e.active = true; e.spottedUntil = tick + L.spottedBars * 16;
        if (e.attackUntil > tick) e.attackUntil = e.spottedUntil + L.combatHoldBars * 16;
        this.musicEvent('spotted');
      }
      e.lastThreat = tick;
    } else if (tick - e.lastThreat >= L.calmBars * 16) {
      e.active = false; e.attackUntil = 0;
    }
    if (!e.active) return 'idle';
    if (tick < e.spottedUntil) return 'spotted';
    return tick < e.attackUntil ? 'combat' : 'chase';
  }
  musicEvent(kind) {
    // Intent matters even with sound muted. Rolling/running and incidental kills are not attacks,
    // and since 1.70 the buttons are nothing more than that: no reply of their own.
    if (['headbutt','throw','scream'].includes(kind)) this.encounter.attackUntil = Math.max(this.musicTick, this.encounter.spottedUntil) + TUNING.audio.layers.combatHoldBars * 16;
    if (!MUSIC_EVENTS[kind]) return;
    if (kind === 'hurt') { this.hurtDip(); return; }
    // A soul can finish while the goat is already moving again. Do not save up a burst of
    // overdue replies behind its phrase.
    if (this.cue || this.terminalCue) return;
    if ((!this.layered && !this.preview) || this.muted || (this.preview && !this.preview.playing)) return;
    const L = TUNING.audio.layers;
    // On the next eighth (`eventGridSteps`), close enough to be the answer to it: the old one to two
    // seconds late read as a sound of its own. A sting for a fight starting is on the next sixteenth.
    const wait = kind === 'spotted' ? 1 : L.eventGridSteps;
    const due = Math.ceil((this.musicTick + 1) / wait) * wait;
    const old = this.musicEvents.find((e) => e.kind === kind && e.due === due);
    if (old) old.count = Math.min(L.eventStackCap, old.count + 1);
    else if (this.musicEvents.length < L.eventQueueCap) this.musicEvents.push({ kind, due, count: 1 });
    else return;
    if (this.preview) this.rememberLabAction(kind, due, old ? old.count : 1);
  }
  rememberLabAction(kind, due, count = 1) {
    this.lab.actions = this.lab.actions.filter(e => e.tick > due - 256);
    const old = this.lab.actions.find(e => e.kind === kind && e.tick === due);
    if (old) old.count = count;
    else this.lab.actions.push({ kind, due: due % 256, count, tick: due });
    if (this.lab.actions.length > 64) this.lab.actions.shift();
    this.lab.scoreKey = null;
  }
  playMusicEvents(t, stepLen, root, theme, headroom) {
    const due = this.musicEvents.filter((e) => e.due <= this.musicTick);
    this.musicEvents = this.musicEvents.filter((e) => e.due > this.musicTick);
    if (this.muted) return;
    // Crowd kills coalesce into a single chord accent; actions get one short woodblock reply.
    const kills = due.filter((e) => e.kind === 'kill').reduce((n, e) => n + e.count, 0);
    if (kills) {
      this.scoreTrack = 'kill';
      const gain = TUNING.audio.layers.killGain * headroom;
      this.tone(root * 16, t, stepLen * 2, { type: 'triangle', gain, bus: this.layerBus });
      this.tone(root * 16 * Math.pow(2, theme.scale[4] / 12), t + stepLen * 2,
        stepLen * 2, { type: 'sine', gain: gain * 0.65, bus: this.layerBus });
      if (kills > 1) this.noise(t, 0.12, { gain: gain * 0.25, hp: 5000, bus: this.layerBus });
    }
    // A room's last man (JUICE: room-clear sting): up the scale to the octave, after the kill's own
    // accent has spoken, so the room going quiet has a sound of its own.
    if (due.some((e) => e.kind === 'cleared')) {
      this.scoreTrack = 'cleared';
      const gain = TUNING.audio.layers.clearGain * headroom;
      [0, 2, 4, 7].forEach((d, i) => {
        const f = root * 8 * Math.pow(2, (d < theme.scale.length ? theme.scale[d] : 12) / 12);
        this.tone(f, t + stepLen * (4 + i), stepLen * (i === 3 ? 4 : 1.4), { type: 'triangle', gain: gain * (i === 3 ? 1 : 0.8), bus: this.layerBus });
      });
    }
    // A fight starting (`encounterStage`): the frame drum's skin and one low plucked root on the next
    // sixteenth — the moment he is seen, before the two-bar warning's figure comes in.
    if (due.some((e) => e.kind === 'spotted')) {
      this.scoreTrack = 'spotted';
      const gain = TUNING.audio.layers.spottedGain;
      this.tone(110, t, 0.36, { gain: gain * 2.2, sweep: 0.42, bus: this.drumBus });
      this.noise(t, 0.035, { gain: gain * 0.35, lp: 1500, bus: this.drumBus });
      this.tone(root * 2, t, stepLen * 6, { type: 'sawtooth', gain, bus: this.musicBus, attack: 0.004, lp: 1500, lpEnd: 170 });
    }
  }
  labAction(action, game) {
    this.init(); this.resume();
    const lab = this.lab, [key, value] = action.split('=');
    if (lab.cue && (MUSIC_PARTS[key] || ['room','solo','event','heart'].includes(key))) {
      lab.cue = null; this.resetScore();
    }
    if (key === 'play') { lab.playing = !lab.playing; if (lab.playing && lab.cue) this.startMusicCue(lab.cue); }
    else if (key === 'mute') this.toggleMute();
    else if (key === 'clear') { lab.scene = emptyMusicScene(); lab.actions = []; lab.cue = null; this.resetScore(); }
    else if (key === 'room') { lab.scene = roomMusicScene({ ...game, state: game.state === 'paused' ? 'play' : game.state, dev: { ...game.dev, rules: false } }); }
    else if (key === 'bed') { lab.bed = value; lab.playing = true; lab.cue = null; this.resetScore(); }
    else if (key === 'cue' && MUSIC_CUES[value]) {
      lab.cue = value; lab.track = value; lab.bar = 0; lab.playing = true;
      this.scene = { ...lab.scene }; this.startMusicCue(value);
    }
    else if (key === 'view') lab.view = value;
    else if (key === 'bar') lab.bar = Number(value);
    else if (key === 'track') lab.track = value;
    else if (key === 'erase') { lab.actions = []; this.musicEvents.length = 0; }
    else if (key === 'export') this.exportLabScore();
    else if (key === 'theme') { lab.scene.late = value === 'late'; lab.scene.first = value === 'first';
      if (lab.cue && lab.playing) { this.scene = { ...lab.scene }; this.startMusicCue(lab.cue); } }
    else if (key === 'heart') lab.scene.lastHeart = !lab.scene.lastHeart;
    // The room's own sound is auditioned here too: a floor's bed, and a fire at arm's length.
    else if (key === 'amb') lab.amb.bed = value === 'off' ? null : value;
    else if (key === 'fire') lab.amb.fire = Number(value);
    else if (key === 'event') { lab.playing = true; this.musicEvent(value); }
    else if (key === 'solo') {
      const count = lab.scene[value] || 1, { late, first } = lab.scene;
      lab.scene = emptyMusicScene(); lab.scene[value] = count; lab.scene.late = late; lab.scene.first = first;
      this.resetScore(); lab.playing = true;
    } else if (MUSIC_PARTS[key]) { lab.scene[key] = Number(value); lab.playing = true; }
    lab.scoreKey = null;
    if (!lab.playing) this.resetScore();
  }
  getLabScore() {
    const lab = this.lab, key = JSON.stringify([lab.bed, lab.scene, lab.actions, lab.cue]);
    if (lab.scoreKey === key) return lab.score;
    // Render the real arranger without an AudioContext. This is a settled 16-bar snapshot,
    // not an independent drawing of what we think the music might do.
    const a = new GameAudio(), events = [], stepLen = 60 / this.bpm / 4;
    a.preview = { playing: true, bed: lab.bed };
    a.scene = capMusicScene({ ...lab.scene, stage: lab.bed === 'none' ? 'idle' : lab.bed });
    a.lateTheme = a.scene.late;
    a.firstTheme = a.scene.first;
    for (const stage of MUSIC_STAGES) a.stageMix[stage] = stage === a.scene.stage ? 1 : 0;
    a.combatMix = { idle: 0, spotted: 0.35, chase: 0.65, combat: 1 }[a.scene.stage];
    a.heartMix = a.scene.lastHeart ? 1 : 0;
    for (const kind of Object.keys(MUSIC_PARTS)) a.voices[kind] = a.voices[kind].map((_, i) => i < musicHitCount(kind, a.scene[kind]) ? 1 : 0);
    a.musicEvents = lab.actions.map(e => ({ ...e }));
    if (lab.cue) a.cue = { kind: lab.cue, root: musicTheme(a.scene).roots[0], start: 0 };
    const record = (freq, t, dur, options = {}) => {
      if (options.gain < 0.0001) return;
      const { bus, ...synth } = options;
      events.push({ track: a.scoreTrack, step: +(t / stepLen).toFixed(3), duration: +(dur / stepLen).toFixed(3),
        ...(freq ? musicPitch(freq) : { note: 'noise', midi: null }), type: 'sine', attack: 0.002, ...synth });
    };
    a.tone = record;
    a.noise = (t, dur, options) => record(null, t, dur, { type: 'noise', ...options });
    a.bass = (t, freq, dur, gain) => { a.scoreTrack = 'bass'; record(freq, t, dur, { type: 'sawtooth', gain, attack: 0.02, lowpass: [700,170] }); };
    for (let step = 0; step < 256; step++) a.playStep(step, step * stepLen, stepLen);
    lab.scoreKey = key;
    lab.score = { bpm: this.bpm, beatsPerBar: 4, stepsPerBar: 16, bars: 16, theme: lab.scene.first ? '1' : lab.scene.late ? '5+' : '2-4', stage: lab.cue || lab.bed,
      cueBars: lab.cue ? MUSIC_CUES[lab.cue].bars : null,
      noteConvention: 'C4 = MIDI 60. FL Studio octave labels may differ; use MIDI number / Hz.',
      description: 'Settled phrase; event marks are the last auditioned kills / clears / stings, not a repeating gameplay loop. Durations in sixteenth notes; gain before bus gains.',
      buses: { master: TUNING.audio.master, music: TUNING.audio.music, layers: TUNING.audio.layers.gain, drums: TUNING.audio.drums },
      instruments: MUSIC_TRACKS, events };
    return lab.score;
  }
  exportLabScore() {
    const score = this.getLabScore(), blob = new Blob([JSON.stringify(score, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = `goat-out-${score.theme.replace('+','plus')}-${score.stage}-score.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  updateScene(game, dt) {
    const preview = game.dev.rules && game.dev.tab === 'music' ? this.lab : null;
    if (this.preview !== preview) { this.resetScore(); this.preview = preview; }
    this.updateAmbience(game, dt);
    this.heartbeat(game);
    if (preview) {
      this.scene = capMusicScene({ ...preview.scene, combat: preview.bed === 'combat', stage: preview.bed === 'none' ? 'idle' : preview.bed });
      this.setScoreTone(this.scene.lastHeart);
      return;
    }
    const special = this.cue?.kind || this.terminalCue;
    if (special) {
      const allowed = special === 'death' ? ['dead'] : special === 'clear' ? ['clear','win'] : ['play','boon','paused'];
      if (!allowed.includes(game.state) || game.dev.rules) this.resetScore();
    }
    this.sceneTimer -= dt;
    if (game.state !== 'play' || !game.goat || game.goat.dead || game.dev.rules) {
      this.scene = roomMusicScene(game);
      // `roomMusicScene` returns empty (no threat, no room) the moment state is not 'play', so the
      // opening scene otherwise sits flat on 'idle' from the first frame to the last. It has its own
      // beat instead — see `INTRO_STAGE`.
      if (game.state === 'intro' && game.intro) {
        const ph = game.intro.phase;
        this.scene.first = ph !== 'meadow';
        this.scene.stage = INTRO_STAGE[ph] || 'idle';
      }
      this.beatScene = { ...this.scene };
      this.setScoreTone(false);
      this.resetEncounter(); this.musicEvents.length = 0; this.sceneTimer = 0; return;
    }
    if (this.sceneTimer > 0) return;
    this.sceneTimer = TUNING.audio.layers.sampleSeconds;
    this.scene = roomMusicScene(game);
    this.scene.stage = this.encounterStage(this.scene.combat);
    this.setScoreTone(this.scene.lastHeart);
  }
  // The score's low-pass (`TUNING.audio.tone`): shut down to `heart` Hz on the last heart, so the
  // music goes under water while the heart beats over it, and open again once he has milk in him.
  setScoreTone(low) {
    if (!this.scoreTone || this.toneLow === !!low) return;
    this.toneLow = !!low;
    const T = TUNING.audio.tone, f = this.scoreTone.frequency, now = this.ctx.currentTime;
    // A dip in progress (the blow that left him on his last heart) finishes first, then glides on.
    if (now < (this.dipUntil || 0)) { f.setTargetAtTime(low ? T.heart : T.open, this.dipUntil, T.glide); return; }
    f.cancelScheduledValues(now); f.setValueAtTime(f.value, now);
    f.setTargetAtTime(low ? T.heart : T.open, now, T.glide);
  }
  // A heart lost: the score dips under the blow and comes back up over `tone.back` s, to wherever
  // it belongs now (the last heart's low-pass or open).
  hurtDip() {
    if (!this.scoreTone) return;
    const T = TUNING.audio.tone, f = this.scoreTone.frequency, now = this.ctx.currentTime;
    f.cancelScheduledValues(now); f.setValueAtTime(Math.max(T.hurt, f.value), now);
    f.exponentialRampToValueAtTime(T.hurt, now + 0.04);
    f.exponentialRampToValueAtTime(this.toneLow ? T.heart : T.open, now + 0.04 + T.back);
    this.dipUntil = now + 0.04 + T.back;
  }
  // Unmuted, the master comes back to where the last `duck` left it: M during the death's fade used to
  // bring the room back at full.
  toggleMute() { this.muted = !this.muted; if (this.master) { this.master.gain.cancelScheduledValues(0); this.master.gain.value = this.muted ? 0 : TUNING.audio.master * (this.duckLevel == null ? 1 : this.duckLevel); } return this.muted; }
  // Everything sinks to `level` of full volume over `secs`: the world going away as the goat does.
  duck(level, secs) {
    this.duckLevel = level;   // kept while muted too, for `toggleMute`
    if (!this.ctx || this.muted) return;
    const g = this.master.gain, t = this.ctx.currentTime;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(TUNING.audio.master * level, t + secs);
  }

  // ---- synth primitives ----
  // `lp` closes a low-pass over the note: a bare square is a chip beep, a square with its top taken
  // off is a reed or a woodblock, which is what the score's ticks are meant to be.
  // `lpEnd` closes that low-pass to `lpEnd` Hz over the note, which is a plucked string; `vib` is a
  // breath's wobble in the pitch (a fraction of it, at 5 Hz), which is the difference between a flute
  // and a test tone.
  tone(freq, t, dur, { type = 'sine', gain = 0.5, sweep = 0, bus = null, attack = 0.002, lp = 0, lpEnd = 0, vib = 0 } = {}) {
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (sweep) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * sweep), t + dur);
    if (vib) {
      const lfo = this.ctx.createOscillator(), depth = this.ctx.createGain();
      lfo.frequency.value = 5; depth.gain.setValueAtTime(0, t); depth.gain.linearRampToValueAtTime(freq * vib, t + Math.min(dur, 0.25));
      lfo.connect(depth); depth.connect(o.frequency); lfo.start(t); lfo.stop(t + dur + 0.02);
    }
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    if (lp) {
      const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(lp, t); f.Q.value = 0.5;
      if (lpEnd) f.frequency.exponentialRampToValueAtTime(lpEnd, t + dur);
      o.connect(f); f.connect(g);
    }
    else o.connect(g);
    g.connect(bus || this.sfxBus); o.start(t); o.stop(t + dur + 0.02);
    this.trackMusicNode(o);
    return o;
  }
  noise(t, dur, { gain = 0.4, hp = 0, lp = 20000, bus = null, q = 0.7 } = {}) {
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = s;
    if (hp > 0) { const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; f.Q.value = q; node.connect(f); node = f; }
    if (lp < 20000) { const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; f.Q.value = q; node.connect(f); node = f; }
    node.connect(g); g.connect(bus || this.sfxBus); s.start(t); s.stop(t + dur + 0.02);
    this.trackMusicNode(s);
  }

  // ---- drums ----
  // Skins, not a drum machine: a sine swept down is an 808, and the cult beats frame drums. Each hit
  // gets the slap of the hand on the skin as well as its body, a little lower and a little longer.
  kick(t, g = 0.9) {
    this.scoreTrack = 'drums';
    this.tone(120, t, 0.34, { gain: g, sweep: 0.4, bus: this.drumBus });
    this.noise(t, 0.03, { gain: g * 0.14, lp: 1600, bus: this.drumBus });
  }
  tomLo(t, g = 0.6) { this.tone(110, t, 0.35, { gain: g, sweep: 0.6, bus: this.drumBus }); this.noise(t, 0.05, { gain: 0.08, lp: 1200, bus: this.drumBus }); }
  tomHi(t, g = 0.5) {
    this.scoreTrack = 'drums';
    this.tone(180, t, 0.28, { gain: g, sweep: 0.62, bus: this.drumBus });
    this.noise(t, 0.035, { gain: g * 0.18, hp: 400, lp: 2600, bus: this.drumBus });
  }
  hat(t, g = 0.18) { this.scoreTrack = 'drums'; this.noise(t, 0.05, { gain: g, hp: 6000, bus: this.drumBus }); }
  // A stick on the rim of the frame drum: the layered score's off-beat, a knock with a pitch rather
  // than a hiss of noise (the hats were half of why the score read as noise).
  rim(t, g = 0.05) { this.scoreTrack = 'drums'; this.tone(1250, t, 0.05, { type: 'triangle', gain: g, sweep: 0.7, bus: this.drumBus, lp: 3200 }); }
  shaker(t, g = 0.12) { this.noise(t, 0.09, { gain: g, hp: 3500, lp: 9000, bus: this.drumBus }); }
  crash(t, g = 0.35) { this.noise(t, 1.2, { gain: g, hp: 2500, bus: this.drumBus }); }
  // ---- the bed: pad, bass and a bone flute ----
  pad(t, f, dur, gain) {
    this.scoreTrack = 'pad';
    this.tone(f, t, dur, { type: 'triangle', gain, bus: this.musicBus, attack: 0.35 });
    this.tone(f * 1.5, t, dur * 0.9, { type: 'triangle', gain: gain * 0.5, bus: this.musicBus, attack: 0.5 });
  }
  bass(t, f, dur, gain) {
    this.scoreTrack = 'bass';
    const o = this.ctx.createOscillator(), g = this.ctx.createGain(), lp = this.ctx.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t);
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(700, t); lp.frequency.exponentialRampToValueAtTime(170, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(lp); lp.connect(g); g.connect(this.musicBus); o.start(t); o.stop(t + dur + 0.02);
    this.trackMusicNode(o);
  }
  // A bone flute: soft in, a breath of vibrato once the note is held, a thin octave over it.
  lead(t, f, dur, gain) {
    this.scoreTrack = 'lead';
    this.tone(f, t, dur, { type: 'triangle', gain, bus: this.musicBus, attack: 0.025, vib: 0.006 });
    this.tone(f * 2, t, dur * 0.5, { type: 'sine', gain: gain * 0.22, bus: this.musicBus, attack: 0.025 });
  }
  // A plucked string (a saw whose top closes as it rings): the counter-riff under the flute.
  pluck(t, f, dur, gain) {
    this.scoreTrack = 'lead';
    this.tone(f, t, Math.max(dur, 0.18), { type: 'sawtooth', gain, bus: this.musicBus, attack: 0.004, lp: 2400, lpEnd: 280 });
  }
  // Pad and bass play whatever happens; the motif only comes in once somebody knows you are there.
  playBed(s, t, stepLen, lvl) {
    const bar = s % 16, root = MUSIC.roots[(s >> 4) & 3];
    if (bar === 0) this.pad(t, root, stepLen * 16.4, 0.055 + lvl * 0.012);
    if (bar === 0 || bar === 10) this.bass(t, root, stepLen * 3.4, 0.26);
    if (bar === 6) this.bass(t, root * 1.5, stepLen * 2.2, 0.19);
    if (lvl >= 2 && bar === 14) this.bass(t, root * 2, stepLen * 1.6, 0.15);
    if (lvl >= 1) {
      const n = MUSIC.motif[bar];
      if (n >= 0) {
        const f = root * 4 * Math.pow(2, MUSIC.scale[n] / 12);
        this.lead(t, f, stepLen * 2.6, 0.085);
        if (lvl >= 3) this.lead(t + stepLen * 0.5, f * 1.5, stepLen * 1.8, 0.04);
      }
    }
  }
  chant(t, dur) {
    const f = 65 + (this.step % 32 < 16 ? 0 : 8);
    this.tone(f, t, dur, { type: 'sawtooth', gain: 0.06, bus: this.drumBus, attack: 0.05 });
    this.tone(f * 1.5, t, dur, { type: 'triangle', gain: 0.04, bus: this.drumBus, attack: 0.05 });
  }

  schedule() {
    if (!this.ctx || this.ctx.state === 'suspended') return;
    const stepLen = 60 / this.bpm / 4;
    // A background tab may miss minutes. Advance the clock instead of scheduling all those
    // missed notes in the past, which would turn resuming the game into a single huge burst.
    if (this.nextTime < this.ctx.currentTime) {
      const missed = Math.ceil((this.ctx.currentTime - this.nextTime) / stepLen);
      this.step = (this.step + missed) % (ROOM_MUSIC.bars * ROOM_MUSIC.stepsPerBar);
      this.musicTick += missed;
      this.musicEvents = this.musicEvents.filter((e) => e.due >= this.musicTick);
      this.nextTime += missed * stepLen;
    }
    while (this.nextTime < this.ctx.currentTime + 0.12) {
      this.playStep(this.step, this.nextTime, stepLen);
      this.step = (this.step + 1) % (ROOM_MUSIC.bars * ROOM_MUSIC.stepsPerBar);
      this.nextTime += stepLen;
    }
  }
  playStep(s, t, stepLen) {
    this.scoring = true;
    try {
      if (this.preview && !this.preview.playing) return;
      if ((this.layered || this.preview) && this.cue) { this.playCueStep(t, stepLen); return; }
      if ((this.layered || this.preview) && this.terminalCue) return;
      if (this.layered || this.preview) this.playLayeredStep(s, t, stepLen);
      else if (!this.muted) this.playLegacyStep(s % 64, t, stepLen);
    } finally { this.scoring = false; this.musicTick++; }
  }
  playLayeredStep(s, t, stepLen) {
    const L = TUNING.audio.layers, beat = s % 16;
    // Commit additions/removals on the beat, then ease their note envelopes. The shared clock
    // never restarts on a kill, doorway or settings change.
    if (s % 4 === 0) this.beatScene = capMusicScene({ ...this.scene });
    const scene = this.beatScene || this.scene, ease = 1 - Math.exp(-stepLen / L.fadeSeconds);
    if (beat === 0) { this.lateTheme = scene.late; this.firstTheme = scene.first; }
    const theme = musicTheme({ first: this.firstTheme, late: this.lateTheme }), root = theme.roots[(s >> 4) & 3];
    const stage = scene.stage || (scene.combat ? 'combat' : 'idle');
    for (const name of MUSIC_STAGES) this.stageMix[name] += ((stage === name ? 1 : 0) - this.stageMix[name]) * ease;
    this.combatMix += ((stage === 'combat' ? 1 : stage === 'chase' ? 0.65 : stage === 'spotted' ? 0.35 : 0) - this.combatMix) * ease;
    this.heartMix += ((scene.lastHeart ? 1 : 0) - this.heartMix) * ease;
    const combat = this.combatMix;
    // How far into calm the score is, past the first floor: 1 nobody after him, 0 a fight or level one.
    const calm = this.firstTheme ? 0 : this.stageMix.idle, C = L.calm, thin = (k) => 1 - (1 - k) * calm;
    let density = 0;
    for (const kind of Object.keys(MUSIC_PARTS)) {
      this.voices[kind].forEach((v, i, voices) => {
        voices[i] = v + ((i < musicHitCount(kind, scene[kind]) ? 1 : 0) - v) * ease;
        density += voices[i];
      });
    }
    // Muted, the clock and the voices' easing run on, and what fell due is spent rather than kept.
    if (this.muted) { this.playMusicEvents(t, stepLen, root, theme, 1); return; }
    // Keep the original harmonic bed; leave its bus and one-shot effects at their old levels.
    if (!this.preview || this.preview.bed !== 'none') {
      this.playThemeBed(this.firstTheme ? 'first' : this.lateTheme ? 'late' : 'early', s, t, stepLen, thin);
      if (beat === 0 || beat === 8) this.kick(t, ((this.firstTheme ? 0.12 : 0.20) + combat * 0.08) * thin(C.kick));
      for (const name of MUSIC_STAGES) {
        const mix = this.stageMix[name];
        if (mix < 0.01) continue;
        const degree = STAGE_MOTIFS[this.firstTheme ? 'first' : this.lateTheme ? 'late' : 'early'][name][beat];
        // The stage's own figure is a plucked riff an octave under the flute, so the two lines are
        // told apart by their sound and not only by where they sit.
        if (degree >= 0) this.pluck(t, root * 4 * Math.pow(2, theme.scale[degree] / 12),
          stepLen * (name === 'spotted' ? 3.4 : name === 'combat' ? 1.25 : 2), mix * (name === 'combat' ? 0.06 : 0.045) * (name === 'idle' ? thin(C.motif) : 1));
        if (name === 'spotted' && beat === 12) this.tomHi(t, 0.075 * mix);
        if (name === 'chase' && [2,6,10,14].includes(beat)) this.rim(t, 0.05 * mix);
        if (name === 'combat') {
          if ([4,12].includes(beat)) this.tomHi(t, 0.22 * mix);
          if ([6,14].includes(beat)) this.kick(t, 0.17 * mix);
          if ([3,11].includes(beat)) this.rim(t, 0.055 * mix);
        }
      }
    }
    const headroom = 1 / Math.sqrt(Math.max(1, density / L.fullGainVoices));
    for (const kind of Object.keys(MUSIC_PARTS)) {
      const instrument = MUSIC_PARTS[kind], part = ROOM_MUSIC[instrument.family];
      this.scoreTrack = kind;
      this.voices[kind].forEach((v, i) => {
        if (v < 0.005 || !musicPartHit(kind, i, s)) return;
        const degree = part.notes[(i + Math.floor(s / 64)) % part.notes.length];
        const f = root * part.octave * Math.pow(2, theme.scale[degree] / 12);
        const gain = part.gain * v * headroom * (L.exploreMix + (1 - L.exploreMix) * combat) * thin(C.layers);
        this.tone(f, t, stepLen * instrument.length, { type: part.type,
          gain, lp: part.lp || 0,
          bus: this.layerBus, attack: kind === 'wraith' ? 0.06 : kind === 'seer' ? 0.025 : 0.004 });
        if (instrument.family === 'trap') this.tone(f * 2, t, stepLen * 0.3,
          { type: 'sine', gain: gain * 0.35, bus: this.layerBus });
        // Sub bass alone disappears on laptop speakers. Keep its weight, add a pitched body
        // at 82-165 Hz and a quiet square edge at 165-330 Hz, all on the exact same onset.
        if (instrument.family === 'large') {
          this.tone(f * 2, t, stepLen * instrument.length, { type: 'triangle', gain: L.heavyBodyGain * v * headroom, bus: this.layerBus });
          this.tone(f * 4, t, stepLen * 0.75, { type: 'square', gain: L.heavyEdgeGain * v * headroom, bus: this.layerBus, lp: 1100 });
        }
      });
    }
    this.playMusicEvents(t, stepLen, root, theme, headroom);
  }
  // The layered score's bed (`THEME_BED`): an open-fifth drone a bar long, the bass line, the tune
  // and the frame drum's answers. The tune sings whole while nobody knows where he is, drops almost
  // out for the two-bar warning, and comes back under the chase and the fight.
  playThemeBed(key, s, t, stepLen, thin = () => 1) {
    const B = THEME_BED[key], beat = s % 16, pos = s & 63, M = this.stageMix;
    const theme = key === 'first' ? FIRST_MUSIC : key === 'late' ? LATE_MUSIC : MUSIC;
    const root = theme.roots[(s >> 4) & 3], base = theme.roots[0] * 8;
    if (beat === 0) this.pad(t, root * 2, stepLen * 16.4, B.pad);
    for (const [at, semi, length, gain] of B.bass) if (at === beat) this.bass(t, root * Math.pow(2, semi / 12), stepLen * length, gain);
    // On the last heart the tune steps back (`layers.heartSing`) and leaves the room to his heart.
    const C = TUNING.audio.layers.calm;
    const sing = (M.idle * thin(C.tune) + M.spotted * 0.35 + M.chase * 0.8 + M.combat * 0.55) * (1 - (1 - TUNING.audio.layers.heartSing) * this.heartMix);
    if (sing > 0.01) for (const [at, semi, length] of B.melody) {
      if (at === pos) this.lead(t, base * Math.pow(2, semi / 12), stepLen * length * 0.95, B.gain * sing * (at % 16 === 0 ? 1 : 0.85));
    }
    if (B.toms.includes(beat)) this.tomHi(t, 0.045 * thin(C.toms));
  }
  // Preserved original arrangement, including the threat tiers, hunter cue and bell drone.
  // SETTINGS > LAYERED MUSIC off selects this; keep future room-score changes above it.
  playLegacyStep(s, t, stepLen) {
    const lvl = this.intensity;
    const bar = s % 16;
    this.playBed(s, t, stepLen, lvl);
    if (lvl <= 0) {
      if (s % 32 === 0) this.kick(t, 0.5);
      if (s % 32 === 3) this.kick(t, 0.35);
      return;
    }
    if (lvl >= 1) {
      if ([0, 6, 8, 14].includes(bar)) this.tomLo(t);
      if ([4, 12].includes(bar)) this.tomHi(t);
      if (bar === 10) this.tomHi(t, 0.35);
    }
    if (lvl >= 2) {
      if (bar % 4 === 0) this.kick(t, 0.72);
      if (bar % 2 === 1) this.hat(t);
      if (bar === 7 || bar === 15) this.tomHi(t, 0.5);
    }
    // The top of the kit. It used to fill every gap — a hat on every step, four more toms, a crash
    // and the chant — which turned a busy room into a wall of percussion you stopped hearing. What
    // is left is the two toms that answer the backbeat, a quieter crash, and the chant under it all.
    if (lvl >= 3) {
      if ([5, 13].includes(bar)) this.tomLo(t, 0.4);
      if (s % 64 === 0) this.crash(t, 0.15);
      if (bar === 0) this.chant(t, stepLen * 16);
    }
    // A rifle has you. Quiet and sparse on purpose: see the note over TUNING.audio.hunterCue.
    const HC = TUNING.audio.hunterCue;
    if (this.hunterAware && bar % HC.everyBars === 1) this.shaker(t, HC.gain);
    if (this.ctx.currentTime < this.droneUntil && bar % 8 === 0) {
      this.tone(55, t, stepLen * 8, { type: 'triangle', gain: 0.12, bus: this.drumBus, attack: 0.1 });
    }
  }

  // ---- sfx ----
  // Every effect is a Foley recipe (js/foley.js): a small physical model rendered into a buffer a few
  // times over, one take picked each time and nudged in pitch and level (`TUNING.audio.foley`), then
  // heard in the room. 1.66 re-levelled the gains below against a 300 ms loudness window (100 Hz up)
  // after every recipe was shortened: each one sits about 6 dB under where it was and the loudest
  // (the pen, the gong, a blast, a club) further still. `wet` is a thing's extra share of the room,
  // and nothing sends much any more: the effects are meant to be close and dry.
  now() { return this.ctx ? this.ctx.currentTime : 0; }
  // `key` names the bank when one recipe is rendered with different `args` (a bleat's pitch, a fuse's
  // length); `steady` keeps the pitch exact (a chain of kills climbs a scale); `at` delays it.
  foley(name, { gain = 1, rate = 1, wet = 0, pan = 0, at = 0, key = name, args = null, takes = null, steady = false, bus = null } = {}) {
    // Not while the context is suspended: every source started then waits and they all go off
    // together the moment it resumes.
    if (!this.ctx || this.muted || gain <= 0 || this.ctx.state !== 'running') return null;
    const F = TUNING.audio.foley, ctx = this.ctx;
    const buffer = this.take(key, () => Foley.render(name, args), takes == null ? F.takes : takes, Foley.rateOf(name));
    const src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = buffer;
    src.playbackRate.value = rate * (steady ? 1 : 1 + (Math.random() * 2 - 1) * F.pitch);
    g.gain.value = gain * (1 + (Math.random() * 2 - 1) * F.level);
    src.connect(g);
    let out = g;
    if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); g.connect(p); out = p; }
    out.connect(bus || this.sfxBus);
    if (wet > 0 && this.sfxWet) { const w = ctx.createGain(); w.gain.value = wet; out.connect(w); w.connect(this.sfxWet); }
    src.start(this.now() + at);
    return src;
  }
  // A bank of takes per key. Mid-game only an empty bank renders (once, a few milliseconds); the rest
  // of its takes are filled by `warm` between frames. Never the same take twice running.
  take(key, make, want, rate) {
    const bank = this.bank || (this.bank = {});
    const b = bank[key] || (bank[key] = { list: [], want, make, rate, last: -1 });
    if (!b.list.length) b.list.push(this.toBuffer(b.make(), b.rate));
    // A bank first asked for mid-game (a bleat's pitch, a fuse's length) after `warm` finished would
    // otherwise play its one take for the rest of the session.
    if (b.list.length < b.want && !this.warming) this.warm();
    let i = Math.floor(Math.random() * b.list.length);
    if (b.list.length > 1 && i === b.last) i = (i + 1) % b.list.length;
    b.last = i;
    return b.list[i];
  }
  toBuffer(data, rate) {
    const b = this.ctx.createBuffer(1, data.length, rate);
    b.getChannelData(0).set(data);
    return b;
  }
  // Render ahead, one take at a time in idle moments: first one of every plain recipe, then the rest
  // of every bank (including the bleats and fuses asked for so far), until each holds its `want`.
  warm() {
    if (this.warming || !this.ctx) return;
    this.warming = true;
    const F = TUNING.audio.foley, bank = this.bank || (this.bank = {});
    const want = { bell: 2, hoof: 6, groan: TUNING.audio.foley.groan.takes };
    for (const name of Foley.plain) if (!bank[name]) bank[name] = { list: [], want: want[name] || F.takes, make: () => Foley.render(name), rate: Foley.rateOf(name), last: -1 };
    if (!bank.toll) bank.toll = { list: [], want: 2, make: () => Foley.render('bell', { low: true }), rate: Foley.rateOf('bell'), last: -1 };
    // The rooms' loops, one take each, after every effect has its first.
    for (const name of Foley.loops) if (!bank['loop:' + name]) bank['loop:' + name] = { list: [], want: 1, make: () => Foley.loop(name), rate: Foley.loopRate(name), last: -1 };
    const later = () => {
      if (typeof requestIdleCallback === 'function') requestIdleCallback(next, { timeout: 500 });
      else setTimeout(next, F.warmGap * 1000);
    };
    // As many takes as the idle moment has room for, and always at least one.
    const next = (idle) => {
      do {
        const all = Object.values(this.bank);
        const b = all.find((x) => !x.list.length) || all.find((x) => x.list.length < x.want);
        if (!b) { this.warming = false; return; }
        b.list.push(this.toBuffer(b.make(), b.rate));
      } while (idle && !idle.didTimeout && idle.timeRemaining() > 8);
      later();
    };
    later();
  }
  // Where a sound is, as the goat hears it: whole inside `space.near` tiles, falling to `space.floor`
  // of itself at `far`, and swung across the speakers `pan` tiles to either side.
  heard(dx, dy) {
    const S = TUNING.audio.space, u = clamp((Math.hypot(dx, dy) / TILE - S.near) / (S.far - S.near), 0, 1);
    return { vol: 1 - (1 - S.floor) * u, pan: clamp(dx / (S.pan * TILE), -1, 1) };
  }

  // ---- the rooms' own sound (1.70) ----
  // Under the score and the fight: the floor's bed (still air in stone, the cave's hollow, wind
  // through boards; `TUNING.audio.ambience.beds` by canon), the fire nearest him, and now and then
  // something else — a drip in a cave, the cult drumming a long way off while nothing is after him,
  // the milk grass when he is hurt and near it. It used to be the score's job (a crackle a bar, a chime
  // a patch) and it sat on top of the tune; it is the world's now, on the effects slider (`ambBus`),
  // off the music's clock.
  updateAmbience(game, dt) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const A = TUNING.audio.ambience, amb = this.amb, g = game.goat;
    amb.wait = (amb.wait || 0) + dt;
    if (amb.wait < A.every) return;
    const el = amb.wait, now = this.ctx.currentTime, lab = this.preview ? this.lab.amb : null;
    amb.wait = 0;
    const inLevel = !lab && !!(game.level && g && ['play', 'paused', 'boon', 'dead', 'climb'].includes(game.state));
    const bed = lab ? (lab.bed ? { loop: lab.bed, gain: A.lab, drips: 0 } : null) : inLevel ? ambienceBed(game.level.def) : null;
    // The beds: the one the floor asks for comes up, any other goes down and is let go. A loop not yet
    // rendered is left to `warm` (a few idle moments) rather than rendered here, mid-frame.
    const want = bed && bed.gain > 0 ? bed.loop : null;
    if (want && !amb.beds[want] && this.loopReady(want)) amb.beds[want] = this.startLoop(want, false);
    for (const [name, b] of Object.entries(amb.beds)) {
      const to = name === want ? bed.gain : 0;
      if (b.to !== to) { b.to = to; b.g.gain.setTargetAtTime(to, now, A.fade / 3); }
      b.idle = to ? 0 : b.idle + el;
      if (b.idle > A.fade * 2) { b.src.stop(); delete amb.beds[name]; }
    }
    // The fire nearest him: one crackle, as loud as the fire is near and big, from its side.
    const fire = lab ? { level: lab.fire, pan: 0 } : inLevel && game.state !== 'dead' ? this.fireNear(game) : { level: 0, pan: 0 };
    if (fire.level > 0.01 && !amb.fire && this.loopReady('blaze')) amb.fire = this.startLoop('blaze', true);
    if (amb.fire) {
      const f = amb.fire;
      f.g.gain.setTargetAtTime(fire.level * A.fire.gain, now, A.fire.glide);
      if (f.p) f.p.pan.setTargetAtTime(fire.pan, now, A.fire.glide);
      f.idle = fire.level > 0.01 ? 0 : f.idle + el;
      if (f.idle > A.fade * 2) { f.src.stop(); amb.fire = null; }
    }
    if (lab || !inLevel || game.state !== 'play' || g.dead) return;
    const gap = ([a, b]) => a + Math.random() * (b - a), side = () => Math.random() * 1.4 - 0.7;
    // Water in the rock.
    if (bed && bed.drips > 0 && (amb.drip -= el) <= 0) {
      amb.drip = gap(A.drip.gap) / bed.drips;
      this.foley('drip', { bus: this.ambBus, gain: A.drip.gain * (0.35 + 0.65 * Math.random()), pan: side(), wet: A.drip.wet, takes: 5 });
    }
    // The rest of the compound: only while nothing is after him, so it is heard as far away.
    if ((amb.far -= el) <= 0) {
      amb.far = gap(A.far.gap);
      if (!this.encounter.active) this.foley('far', { bus: this.ambBus, gain: A.far.gain, pan: side(), wet: A.far.wet, takes: 2 });
    }
    // The milk grass calls to a goat who needs it.
    if (g.hp < g.maxHp && (amb.grass -= el) <= 0) {
      amb.grass = gap(A.grass.gap);
      let best = null, bd = A.grass.radius * TILE;
      for (const p of game.props) {
        if (p.kind !== 'heal' || p.broken || p.dead) continue;
        const d = Math.hypot(p.x - g.x, p.y - g.y);
        if (d < bd) { bd = d; best = p; }
      }
      if (best) this.foley('sparkle', { bus: this.ambBus, gain: A.grass.gain * (1 - 0.6 * bd / (A.grass.radius * TILE)),
        pan: clamp((best.x - g.x) / (TUNING.audio.space.pan * TILE), -1, 1), takes: 3 });
    }
  }
  loopReady(name) {
    const b = this.bank && this.bank['loop:' + name];
    if (b && b.list.length) return true;
    this.warm();
    return false;
  }
  // A loop from `Foley.loop`, started silent at a random point in it (two floors never open on the
  // same second of wind), for `updateAmbience` to bring up.
  startLoop(name, panned) {
    const buffer = this.take('loop:' + name, () => Foley.loop(name), 1, Foley.loopRate(name));
    const src = this.ctx.createBufferSource(), g = this.ctx.createGain();
    src.buffer = buffer; src.loop = true; g.gain.value = 0; src.connect(g);
    let out = g, p = null;
    if (panned && this.ctx.createStereoPanner) { p = this.ctx.createStereoPanner(); g.connect(p); out = p; }
    out.connect(this.ambBus);
    src.start(this.ctx.currentTime, Math.random() * buffer.duration);
    return { src, g, p, to: -1, idle: 0 };
  }
  // How much fire is near him and from which side: every lit bowl, lamp and lantern, burning tile and
  // burning man inside `fire.radius` tiles, each weighed by its kind and by how near it is.
  fireNear(game) {
    const F = TUNING.audio.ambience.fire, g = game.goat, w = game.world, R = F.radius * TILE;
    let sum = 0, px = 0;
    const feel = (x, y, k) => { const d = Math.hypot(x - g.x, y - g.y); if (d >= R) return; k *= 1 - d / R; sum += k; px += k * (x - g.x); };
    for (const p of game.props) {
      if (p.broken || p.dead || p.held) continue;
      if (p.kind === 'brazier' || p.kind === 'lamp' || p.kind === 'sconce') feel(p.x, p.y, F.lit);
    }
    for (const e of game.enemies) if (!e.dead && e.burning > 0) feel(e.x, e.y, F.man);
    if (g.onFire) feel(g.x, g.y, F.man);
    const r = F.radius, cx = Math.floor(g.x / TILE), cy = Math.floor(g.y / TILE);
    if (w && w.fire) for (let y = Math.max(0, cy - r); y <= Math.min(w.H - 1, cy + r); y++) {
      for (let x = Math.max(0, cx - r); x <= Math.min(w.W - 1, cx + r); x++) if (w.fire[y * w.W + x] > 0) feel((x + 0.5) * TILE, (y + 0.5) * TILE, F.tile);
    }
    return { level: 1 - Math.exp(-sum), pan: sum ? clamp(px / sum / (TUNING.audio.space.pan * TILE), -1, 1) : 0 };
  }
  // His heart on the last heart, in time with the red at the screen's edge (`Renderer.heartbeat`,
  // `juice.heartbeat.bpm`): the lub as the beat turns over, the dub a fifth of a beat on, where the
  // picture's second pulse is. In the Music Lab it follows the LAST HEART switch.
  heartbeat(game) {
    const g = game.goat, B = TUNING.juice.heartbeat, R = game.renderer;
    const on = this.ctx && R && (this.preview ? this.lab.playing && this.lab.scene.lastHeart
      : g && !g.dead && game.state === 'play' && g.hp <= B.hp && g.maxHp > B.hp);
    if (!on) { this.lastBeat = null; return; }
    const n = Math.floor(R.t * B.bpm / 60);
    if (n === this.lastBeat) return;
    const fresh = this.lastBeat == null; this.lastBeat = n;
    if (fresh) return;   // wait for a beat to turn over, not half of one
    const H = TUNING.audio.ambience.heart;
    this.foley('heart', { gain: H.gain, takes: 4 });
    this.foley('heart', { gain: H.gain * H.dub, rate: 1.1, at: 0.2 * 60 / B.bpm, takes: 4 });
  }

  // Head down: hooves scuffing, a snort, the lunge moving air.
  sfxHeadbutt() { this.foley('headbutt', { gain: 0.2 }); }
  // Weight meeting a floor or a wall: a man knocked down, a crate landing, a door taking a shoulder.
  sfxThud() { this.foley('thud', { gain: 0.3 }); }
  // A man broken on stone.
  sfxSplat() { this.foley('splat', { gain: 0.78, wet: 0.04 }); }
  sfxGunshot() { this.foley('gunshot', { gain: 1.1, wet: 0.12 }); }
  sfxPot() { this.foley('pot', { gain: 0.4 }); }
  // BAAAH. The goat's own voice, loud and ragged, and the one sound in the game that is his.
  sfxScream() { this.foley('scream', { gain: 0.26, wet: 0.05 }); }
  // A small frightened bleat, or any sheep's: the same throat, at the pitch, level and length asked.
  sfxBleat(f, gain, dur) {
    const d = dur || 0.28;
    this.foley('bleat', { key: `bleat:${f}:${d}`, takes: 2, gain: (gain || 0.1) * 0.75,
      args: { f: f * 0.62, dur: d, wob: 19 + f * 0.02, depth: 0.09, open: 1.35, breath: 0.14 } });
  }
  // The hen: two clipped 'buk's, or alarmed a run of them and the wings going.
  sfxCluck(alarm) { this.foley('cluck', { key: alarm ? 'cluck!' : 'cluck', args: { alarm: !!alarm }, gain: alarm ? 0.14 : 0.11 }); }
  // Every animal on our side through one door: the hen's cluck, the goose's honk, a crow's caw, and
  // the tortoise, which has no voice at all and knocks its shell on the slats. `hurt` is the cry.
  sfxAnimal(kind, hurt) {
    if (kind === 'chicken') return this.sfxCluck(!!hurt);
    if (kind === 'goose' || kind === 'crow') return this.foley(kind, { key: kind + (hurt ? '!' : ''), args: { hurt: !!hurt }, gain: kind === 'goose' ? 0.11 : 0.08 });
    if (kind === 'horse') return this.foley('horse', { key: 'horse' + (hurt ? '!' : ''), args: { hurt: !!hurt }, gain: 0.1 });
    this.foley('tortoise', { gain: 0.115 });
  }
  // The lorry under them: half a second of diesel knock, called every half second while the road
  // goes past, each faded at its ends so they run on without a seam.
  sfxEngine() { this.foley('engine', { gain: 0.039 }); }
  // A club coming down on a skull, heard from inside the skull.
  sfxClub() { this.foley('club', { gain: 0.82 }); }
  // Something wooden giving way.
  sfxCrack() { this.foley('crack', { gain: 0.26 }); }
  sfxBell() { if (!this.ctx || this.muted) return; this.foley('bell', { gain: 0.78, takes: 2, wet: 0.1 }); this.droneUntil = this.now() + 8; }
  sfxToll() { this.foley('bell', { key: 'toll', args: { low: true }, takes: 2, gain: 0.62, at: 0.15, wet: 0.12 }); }
  // A blow landing on the goat.
  sfxHit() { this.foley('hit', { gain: 0.61 }); }
  // Something catching light.
  sfxFire() { this.foley('fire', { gain: 0.22 }); }
  // A lit fuse: a thin hiss that spits, for as long as it has left to burn.
  sfxFuse(dur) { const d = Math.round((dur || 3) * 10) / 10; this.foley('fuse', { key: 'fuse:' + d, args: { dur: d }, takes: 1, gain: 0.085, steady: true }); }
  sfxSwing() { this.foley('swing', { gain: 0.12 }); }
  // Somebody going over an edge: a man's shout running away downward.
  sfxFall() { this.foley('fall', { gain: 0.2, wet: 0.1 }); }
  sfxRoll() { this.foley('roll', { gain: 0.17 }); }
  // A barrel on its side, a knock a turn, lower and quieter as it slows (`k` 1 → 0).
  sfxStave(k = 1) { this.foley('stave', { gain: 0.036 + 0.088 * k, rate: 0.82 + 0.22 * k }); }
  // A rifle cocked: the one tell a rifle gives, so it is bright and dry and sits above the mix.
  sfxCock(vol = 1) { if (vol <= 0.02) return; this.foley('cock', { gain: 0.45 * vol }); }
  // The hound: a jaw snapping shut, dry and close.
  sfxSnap() { this.foley('snap', { gain: 0.46 }); }
  // The growl: what a hound says as it plants to run at you.
  sfxGrowl() { this.foley('growl', { gain: 0.15 }); }
  // A bark. `where` is `heard(dx, dy)` off the goat when the hound knows where it is; a pack never
  // barks closer together than `foley.barkGap`, so three hounds are a pack and not a drum roll.
  sfxBark(where) {
    if (!this.ctx || this.muted) return;
    const t = this.now(), vol = where ? where.vol : 1;
    if (t - (this.lastBark || -1) < TUNING.audio.foley.barkGap || vol <= 0.02) return;
    this.lastBark = t;
    this.foley('bark', { gain: 0.2 * vol, pan: where ? where.pan : 0, wet: 0.03 });
  }
  // DRAGON BREATH.
  sfxBreath() { this.foley('breath', { gain: 0.42 }); }
  sfxBoom() { this.foley('boom', { gain: 1.1, wet: 0.12 }); }
  sfxCast() { this.foley('cast', { gain: 0.18, wet: 0.05 }); }
  sfxRune() { this.foley('rune', { gain: 0.53, wet: 0.05 }); }
  sfxBlink() { this.foley('blink', { gain: 0.29 }); }
  // A room left behind going dark: a breath drawn in, and the stone settling. Not a clank: nothing
  // was built there, something was put out.
  sfxVeil() { this.foley('veil', { gain: 0.1, wet: 0.05 }); }
  // Steel: a blade leaving a stand, going into a man, or a shield taking a bullet.
  sfxSteel() { this.foley('steel', { gain: 0.2, wet: 0.03 }); }
  // Something with no throat making a sound anyway: a cold swell as it becomes real.
  sfxWraith() { this.foley('wraith', { gain: 0.35, wet: 0.08 }); }
  // The blow: no weight behind it, all cold.
  sfxWraithHit() { this.foley('wraithHit', { gain: 0.53 }); }
  // Caught in the flesh and undone: it goes out rather than down.
  sfxUnmade() { this.foley('unmade', { gain: 0.45, wet: 0.08 }); }
  // A headbutt that the pen holds: a short dry knock of iron in a wooden frame.
  sfxCageHit() { this.foley('cageHit', { gain: 0.38 }); }
  // The pen giving way: the frame cracks, two bars knock loose. Short and dry, not a collapse.
  sfxCage() { this.foley('cage', { gain: 0.53 }); }
  // Stacked kills: the same struck bone, a step higher every time.
  sfxKill(n) { this.foley('kill', { gain: 0.25, rate: Math.pow(1.14, Math.min(8, n)), steady: true }); }
  // A card turning: one big frame drum in the hall.
  sfxCard() { this.foley('card', { gain: 0.56, wet: 0.04 }); }
  // COLD EYE: the world winding down: his heart, twice, and a breath of air falling away.
  sfxSlow() { this.foley('slow', { gain: 0.12 }); }
  // LEAPFROG: hooves off a man's back.
  sfxVault() { this.foley('vault', { gain: 0.27 }); }
  // One hoof on the stone, running (`TUNING.audio.foley.hooves`; `vol` is MOTH WOOL's quiet).
  // Every other step is the other side of him, a hair apart in place and pitch (`foley.hoofSide`).
  sfxHoof(vol = 1) {
    const F = TUNING.audio.foley, S = F.hoofSide, side = (this.hoofSide = -(this.hoofSide || 1));
    this.foley('hoof', { gain: F.hooves * vol, takes: 6, pan: side * S.pan, rate: 1 + side * S.rate });
  }
  // A man's last breath where he fell (`foley.groan`; `where` is `heard(dx, dy)`), a hound's whine
  // for a hound. Only a death calls it: a knockdown is a thud and nothing more, so the two differ.
  sfxGroan(kind, where) {
    if (!this.ctx || this.muted) return;
    const G = TUNING.audio.foley.groan, t = this.now(), vol = where ? where.vol : 1, dog = kind === 'dog';
    if (t - (this.lastGroan || -1) < G.gap || vol <= 0.02) return;
    this.lastGroan = t;
    this.foley('groan', { key: dog ? 'groan:dog' : 'groan', args: { dog }, takes: G.takes, gain: G.gain * vol * (dog ? G.dog : 1),
      rate: G.rate[kind] || 1, pan: where ? where.pan : 0, at: G.delay, wet: G.wet });
  }
}
