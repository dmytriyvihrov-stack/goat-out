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
const MUSIC_ACTIONS = { headbutt: { label: 'BUTT', degree: 0 }, roll: { label: 'ROLL', degree: 2 },
  throw: { label: 'THROW', degree: 4 }, scream: { label: 'BAAH', degree: 5 } };
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
  pad: 'Triangle drone + fifth', bass: 'Low-pass saw bass', lead: 'Triangle flute + sine octave', drums: 'Sine kick / tom + noise hat',
  bearer: 'Square ticks', dog: 'Short square ticks', hunter: 'Triangle pluck', seer: 'Soft triangle pluck',
  champion: 'Triangle sub + octave + square edge', butcher: 'Triangle sub + octave + square edge', wraith: 'Sine chime',
  spike: 'Triangle + sine octave', mill: 'Long triangle + sine octave', fire: 'Filtered noise crackles', grass: 'Sine + triangle octave',
  kill: 'Triangle / sine chime', headbutt: 'Square woodblock', roll: 'Square woodblock', throw: 'Square woodblock', scream: 'Square woodblock',
  clear: 'Rising triangle / major release', death: 'Falling sine / minor lament', soul: 'High sine / open fifths',
};

// Shared registers over a 16-bar clock. Each type below supplies its own ranked onsets;
// four answers turn the two-bar seeds into a phrase without random competing harmony.
const ROOM_MUSIC = {
  bars: 16, stepsPerBar: 16,
  answers: [0, 8, 0, 16],
  small: { phase: 2, octave: 8, notes: [0, 4, 2, 4, 0, 2], type: 'square', gain: 0.065, length: 0.46 },
  ranged: { phase: 1, octave: 4, notes: [4, 0, 2, 4, 2, 0], type: 'triangle', gain: 0.13, length: 1.25 },
  large: { phase: 0, octave: 1, notes: [0, 0, 4, 0, 4, 0], type: 'triangle', gain: 0.20, length: 1.75 },
  mystical: { phase: 3, octave: 16, notes: [0, 4, 2, 0, 2, 4], type: 'sine', gain: 0.085, length: 3.0 },
};
const MUSIC_FAMILIES = ['small', 'ranged', 'large', 'mystical'];
// Ranked onsets: enabling another enemy preserves the earlier accents. Related instruments
// share a register, but their rhythms and envelopes remain recognisable in a mixed room.
const MUSIC_PARTS = {
  bearer: { family: 'small', label: 'BEARER', slots: [2,18,10,26,6,22], length: 0.46 },
  dog: { family: 'small', label: 'HOUND', slots: [7,23,15,31,3,19], length: 0.32 },
  hunter: { family: 'ranged', label: 'HUNTER', slots: [1,17,9,25,5,21,13,29], length: 0.8 },
  seer: { family: 'ranged', label: 'SEER', slots: [4,20,12,28,8,24,0,16], length: 1.6 },
  champion: { family: 'large', label: 'BRUTE', slots: [0,8,10,16,24,26,4,12,18,20,28,30,6], length: 1.4 },
  butcher: { family: 'large', label: 'BUTCHER', slots: [4,12,14,20,28,30,0,8,22,24,16,18,2], length: 1.8 },
  wraith: { family: 'mystical', label: 'WRAITH', slots: [3,19,11,27,7,23], length: 3 },
  spike: { family: 'trap', label: 'SPIKES', slots: [5,21,13,29,1,17], length: 0.45 },
  mill: { family: 'trap', label: 'MILLS', slots: [14,30,6,22,10,26,2], length: 1.1 },
};
ROOM_MUSIC.trap = { octave: 2, notes: [4,0,2,4,2,0], type: 'triangle', gain: 0.12 };
const emptyMusicScene = () => ({ ...Object.fromEntries(Object.keys(MUSIC_PARTS).map((k) => [k, 0])),
  fire: false, blaze: 0, fireTiles: 0, grass: 0, combat: false, late: false, first: false });
function musicHitCount(kind, count) {
  const P = MUSIC_PARTS[kind], budgets = TUNING.audio.layers.hitBudgets;
  const budget = budgets[kind === 'mill' ? 'mill' : P.family] || budgets.small;
  return budget[Math.max(0, Math.min(budget.length - 1, Math.floor(count || 0)))];
}
function capMusicScene(scene) {
  for (const family of MUSIC_FAMILIES) {
    const kinds = Object.keys(MUSIC_PARTS).filter((k) => MUSIC_PARTS[k].family === family);
    const raw = kinds.map((k) => Math.max(0, Math.floor(scene[k] || 0)));
    kinds.forEach((k) => { scene[k] = 0; });
    let left = TUNING.audio.layers.maxPerFamily;
    for (let rank = 0; rank < 6 && left; rank++) for (let i = 0; i < kinds.length && left; i++) {
      if (raw[i] > rank) { scene[kinds[i]]++; left--; }
    }
  }
  for (const k of ['spike', 'mill']) scene[k] = Math.min(k === 'mill' ? TUNING.audio.layers.maxMills : 6, Math.max(0, Math.floor(scene[k] || 0)));
  return scene;
}

function musicFamily(e) {
  if (e.kind === 'wraith') return 'mystical';
  if (e.kind === 'hunter' || e.kind === 'seer') return 'ranged';
  if (e.kind === 'butcher' || e.champion) return 'large';
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
  let burning = g.onFire ? 1 : 0;
  for (const e of game.enemies) {
    if (e.dead) continue;
    if (e.burning > 0 && inRoom(e.x, e.y)) burning++;
    const family = musicFamily(e);
    if (!family) continue;
    const pursuing = e.aware && e.state !== 'idle' && near(e.x, e.y, L.pursuitRadius)
      && game.sees(g.x, g.y, e.x, e.y);
    if (!inRoom(e.x, e.y) && !pursuing) continue;
    const kind = e.champion && e.kind === 'bearer' ? 'champion' : e.kind;
    scene[kind]++;
    if (e.aware && e.state !== 'idle') scene.combat = true;
  }
  // Fixtures, traps and burning area belong to the whole current room. Grass stays a nearby cue.
  for (const p of game.props) {
    if (p.broken || p.dead) continue;
    if ((p.kind === 'brazier' || p.kind === 'lamp') && inRoom(p.x, p.y)) scene.fire = true;
    if ((p.kind === 'mill' || p.kind === 'spike') && inRoom(p.x, p.y)) scene[p.kind]++;
    if (p.kind === 'heal' && near(p.x, p.y, L.grassRadius)) scene.grass = Math.min(L.grassVoices, scene.grass + 1);
  }
  const w = game.world;
  for (let y = room ? Math.max(0, room.y) : 0; room && y < Math.min(w.H, room.y + room.h); y++) {
    for (let x = Math.max(0, room.x); x < Math.min(w.W, room.x + room.w); x++) {
      if (w.fire[y * w.W + x] <= 0) continue;
      scene.fireTiles++; burning++;
    }
  }
  scene.blaze = L.blazeThresholds.filter((n) => burning >= n).length;
  scene.fire = scene.fire || burning > 0;
  return capMusicScene(scene);
}

function musicPartHit(kind, hit, step) {
  return step % 32 === (MUSIC_PARTS[kind].slots[hit] + ROOM_MUSIC.answers[Math.floor(step / 64) % 4]) % 32;
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
    this.lab = { playing: false, bed: 'combat', scene: emptyMusicScene(), view: 'mix', bar: 0, track: 'lead', actions: [], cue: null };
    this.cue = null; this.terminalCue = null; this.firstTheme = false;
    this.stageMix = { idle: 1, spotted: 0, chase: 0, combat: 0 };
    this.resetEncounter();
    this.combatMix = 0; this.fireMix = 0; this.blazeMix = 0; this.grassMix = 0; this.lateTheme = false;
    this.resetAmbience();
  }
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    const A = TUNING.audio;
    this.master = this.ctx.createGain(); this.master.gain.value = A.master; this.master.connect(this.ctx.destination);
    this.drumBus = this.ctx.createGain(); this.drumBus.connect(this.master);
    this.sfxBus = this.ctx.createGain(); this.sfxBus.connect(this.master);
    this.musicBus = this.ctx.createGain(); this.musicBus.connect(this.master);
    this.layerBus = this.ctx.createGain(); this.layerBus.gain.value = A.layers.gain; this.layerBus.connect(this.musicBus);
    this.setVolumes(this.volMusic, this.volSfx);
    const len = this.ctx.sampleRate * 1.5;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.nextTime = this.ctx.currentTime + 0.1;
    setInterval(() => this.schedule(), 25);
  }
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
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
  }
  trackMusicNode(node) {
    if (!this.scoring) return;
    this.musicNodes.add(node); node.onended = () => this.musicNodes.delete(node);
  }
  resetScore() {
    this.cue = null; this.terminalCue = null;
    for (const node of this.musicNodes) { try { node.stop(); } catch (_) { /* already ended */ } }
    this.musicNodes.clear(); this.musicEvents.length = 0; this.resetAmbience();
    for (const voices of Object.values(this.voices)) voices.fill(0);
    this.combatMix = this.fireMix = this.blazeMix = this.grassMix = 0;
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
    // Intent matters even with sound muted. Rolling/running and incidental kills are not attacks.
    if (['headbutt','throw','scream'].includes(kind)) this.encounter.attackUntil = Math.max(this.musicTick, this.encounter.spottedUntil) + TUNING.audio.layers.combatHoldBars * 16;
    // A soul can finish while the goat is already moving again. Do not save up a burst of
    // overdue action replies behind its phrase; offensive intent still reaches the state machine.
    if (this.cue || this.terminalCue) return;
    if ((!this.layered && !this.preview) || this.muted || (this.preview && !this.preview.playing)) return;
    const L = TUNING.audio.layers;
    let due = Math.ceil((this.musicTick + L.eventDelaySteps) / L.eventGridSteps) * L.eventGridSteps;
    if (MUSIC_ACTIONS[kind]) {
      // Each accepted gesture gets an eighth-note slot; a fast mixed burst becomes a short fill.
      // Limit the horizon as well as queue size, so frantic clicks cannot leave minutes of replies.
      const end = due + 16;
      while (this.musicEvents.some(e => e.due === due && MUSIC_ACTIONS[e.kind]) && due < end) due += 2;
      if (due >= end || this.musicEvents.length >= L.eventQueueCap) return;
      this.musicEvents.push({ kind, due, count: 1 });
      if (this.preview) this.rememberLabAction(kind, due);
      return;
    }
    if (kind !== 'kill') return;
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
    for (const action of due.filter(e => MUSIC_ACTIONS[e.kind])) {
      this.scoreTrack = action.kind;
      const degree = MUSIC_ACTIONS[action.kind].degree;
      this.tone(root * 2 * Math.pow(2, theme.scale[degree] / 12), t + stepLen,
        stepLen * 0.8, { type: 'square', gain: TUNING.audio.layers.actionGain * headroom, sweep: 0.8, bus: this.layerBus });
    }
  }
  labAction(action, game) {
    this.init(); this.resume();
    const lab = this.lab, [key, value] = action.split('=');
    if (lab.cue && (MUSIC_PARTS[key] || ['room','solo','event','fire','coals','grass'].includes(key))) {
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
    else if (key === 'fire') { lab.scene.fireTiles = Number(value); lab.scene.blaze = TUNING.audio.layers.blazeThresholds.filter((n) => Number(value) >= n).length; lab.scene.fire = Number(value) > 0; }
    else if (key === 'coals') lab.scene.fire = !lab.scene.fire;
    else if (key === 'grass') lab.scene.grass = Number(value);
    else if (key === 'event') { lab.playing = true; this.musicEvent(value); }
    else if (key === 'solo') {
      const count = lab.scene[value] || 1, { late, first } = lab.scene;
      lab.scene = emptyMusicScene(); lab.scene[value] = count; lab.scene.late = late; lab.scene.first = first;
      this.resetScore(); lab.playing = true;
    } else if (MUSIC_PARTS[key]) { lab.scene[key] = Number(value); lab.playing = true; }
    lab.scoreKey = null;
    if (!lab.playing) this.resetScore();
  }
  resetAmbience() {
    this.ambience = { blaze: { value: 0, left: 0, pending: 0 }, grass: { value: 0, left: 0, pending: 0 } };
  }
  ambientLevel(key, current, holdSteps) {
    const memory = this.ambience[key], value = Math.max(current, memory.pending);
    memory.pending = 0;
    if (value >= memory.value || memory.left <= 0) {
      memory.value = value; memory.left = value > 0 ? holdSteps : 0;
    } else memory.left--;
    return memory.value;
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
    a.fireMix = a.scene.fire || a.scene.blaze ? 1 : 0; a.blazeMix = a.scene.blaze; a.grassMix = a.scene.grass;
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
    a.bass = (t, freq, dur, gain) => { a.scoreTrack = 'bass'; record(freq, t, dur, { type: 'sawtooth', gain, attack: 0.02, lowpass: [430,150] }); };
    for (let step = 0; step < 256; step++) a.playStep(step, step * stepLen, stepLen);
    lab.scoreKey = key;
    lab.score = { bpm: this.bpm, beatsPerBar: 4, stepsPerBar: 16, bars: 16, theme: lab.scene.first ? '1' : lab.scene.late ? '5+' : '2-4', stage: lab.cue || lab.bed,
      cueBars: lab.cue ? MUSIC_CUES[lab.cue].bars : null,
      noteConvention: 'C4 = MIDI 60. FL Studio octave labels may differ; use MIDI number / Hz.',
      description: 'Settled phrase; action marks are the last auditioned gestures, not a repeating gameplay loop. Durations in sixteenth notes; gain before bus gains.',
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
    if (preview) {
      this.scene = capMusicScene({ ...preview.scene, combat: preview.bed === 'combat', stage: preview.bed === 'none' ? 'idle' : preview.bed });
      return;
    }
    const special = this.cue?.kind || this.terminalCue;
    if (special) {
      const allowed = special === 'death' ? ['dead'] : special === 'clear' ? ['clear','win'] : ['play','boon','paused'];
      if (!allowed.includes(game.state) || game.dev.rules) this.resetScore();
    }
    this.sceneTimer -= dt;
    if (game.state !== 'play' || !game.goat || game.goat.dead || game.dev.rules) {
      this.scene = roomMusicScene(game); this.beatScene = { ...this.scene };
      this.resetAmbience(); this.resetEncounter(); this.musicEvents.length = 0; this.sceneTimer = 0; return;
    }
    if (this.sceneTimer > 0) return;
    this.sceneTimer = TUNING.audio.layers.sampleSeconds;
    this.scene = roomMusicScene(game);
    this.scene.stage = this.encounterStage(this.scene.combat);
    // Remember a brief flare or a grazed patch even if it disappears before the next beat.
    for (const key of ['blaze', 'grass']) this.ambience[key].pending = Math.max(this.ambience[key].pending, this.scene[key]);
  }
  toggleMute() { this.muted = !this.muted; if (this.master) { this.master.gain.cancelScheduledValues(0); this.master.gain.value = this.muted ? 0 : TUNING.audio.master; } return this.muted; }
  // Everything sinks to `level` of full volume over `secs`: the world going away as the goat does.
  duck(level, secs) {
    if (!this.ctx || this.muted) return;
    const g = this.master.gain, t = this.ctx.currentTime;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(TUNING.audio.master * level, t + secs);
  }

  // ---- synth primitives ----
  tone(freq, t, dur, { type = 'sine', gain = 0.5, sweep = 0, bus = null, attack = 0.002 } = {}) {
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (sweep) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * sweep), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus || this.sfxBus); o.start(t); o.stop(t + dur + 0.02);
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
  kick(t, g = 0.9) { this.scoreTrack = 'drums'; this.tone(140, t, 0.28, { gain: g, sweep: 0.25, bus: this.drumBus }); }
  tomLo(t, g = 0.6) { this.tone(110, t, 0.35, { gain: g, sweep: 0.6, bus: this.drumBus }); this.noise(t, 0.05, { gain: 0.08, lp: 1200, bus: this.drumBus }); }
  tomHi(t, g = 0.5) { this.scoreTrack = 'drums'; this.tone(190, t, 0.25, { gain: g, sweep: 0.6, bus: this.drumBus }); }
  hat(t, g = 0.18) { this.scoreTrack = 'drums'; this.noise(t, 0.05, { gain: g, hp: 6000, bus: this.drumBus }); }
  shaker(t, g = 0.12) { this.noise(t, 0.09, { gain: g, hp: 3500, lp: 9000, bus: this.drumBus }); }
  crash(t, g = 0.35) { this.noise(t, 1.2, { gain: g, hp: 2500, bus: this.drumBus }); }
  gong(t, g = 0.5) {
    [92, 138, 207, 311].forEach((f, i) => this.tone(f, t, 2.2 - i * 0.3, { gain: g / (i + 1.5), bus: this.drumBus }));
    this.noise(t, 0.4, { gain: 0.15, hp: 1500, bus: this.drumBus });
  }
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
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(430, t); lp.frequency.exponentialRampToValueAtTime(150, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(lp); lp.connect(g); g.connect(this.musicBus); o.start(t); o.stop(t + dur + 0.02);
    this.trackMusicNode(o);
  }
  lead(t, f, dur, gain) {
    this.scoreTrack = 'lead';
    this.tone(f, t, dur, { type: 'triangle', gain, bus: this.musicBus, attack: 0.012 });
    this.tone(f * 2, t, dur * 0.5, { type: 'sine', gain: gain * 0.28, bus: this.musicBus, attack: 0.012 });
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
      if (missed > TUNING.audio.layers.blazeTailBars * 16) this.resetAmbience();
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
    const blaze = this.ambientLevel('blaze', scene.blaze, L.blazeTailBars * ROOM_MUSIC.stepsPerBar);
    const grass = this.ambientLevel('grass', scene.grass, L.grassTailBars * ROOM_MUSIC.stepsPerBar);
    const stage = scene.stage || (scene.combat ? 'combat' : 'idle');
    for (const name of MUSIC_STAGES) this.stageMix[name] += ((stage === name ? 1 : 0) - this.stageMix[name]) * ease;
    this.combatMix += ((stage === 'combat' ? 1 : stage === 'chase' ? 0.65 : stage === 'spotted' ? 0.35 : 0) - this.combatMix) * ease;
    this.fireMix += ((scene.fire || blaze > 0 ? 1 : 0) - this.fireMix) * ease;
    this.blazeMix += (blaze - this.blazeMix) * ease;
    this.grassMix += (grass - this.grassMix) * ease;
    const combat = this.combatMix;
    let density = 0;
    for (const kind of Object.keys(MUSIC_PARTS)) {
      this.voices[kind].forEach((v, i, voices) => {
        voices[i] = v + ((i < musicHitCount(kind, scene[kind]) ? 1 : 0) - v) * ease;
        density += voices[i];
      });
    }
    // Silence does not freeze the ambient memory: an extinguished fire should not return
    // when M is pressed again several bars later.
    if (this.muted) { this.playMusicEvents(t, stepLen, root, theme, 1); return; }
    // Keep the original harmonic bed; leave its bus and one-shot effects at their old levels.
    if (!this.preview || this.preview.bed !== 'none') {
      if (this.firstTheme) this.playFirstBed(s, t, stepLen);
      else if (this.lateTheme) this.playLateBed(s, t, stepLen);
      else this.playBed(s, t, stepLen, 0);
      if (beat === 0 || beat === 8) this.kick(t, (this.firstTheme ? 0.12 : 0.20) + combat * 0.08 + this.blazeMix * 0.018);
      for (const name of MUSIC_STAGES) {
        const mix = this.stageMix[name];
        if (mix < 0.01) continue;
        const degree = STAGE_MOTIFS[this.firstTheme ? 'first' : this.lateTheme ? 'late' : 'early'][name][beat];
        if (degree >= 0) this.lead(t, root * 4 * Math.pow(2, theme.scale[degree] / 12),
          stepLen * (name === 'spotted' ? 3.4 : name === 'combat' ? 1.25 : 2), mix * (name === 'combat' ? 0.065 : 0.043));
        if (name === 'spotted' && beat === 12) this.tomHi(t, 0.075 * mix);
        if (name === 'chase' && [2,6,10,14].includes(beat)) this.hat(t, 0.035 * mix);
        if (name === 'combat') {
          if ([4,12].includes(beat)) this.tomHi(t, 0.22 * mix);
          if ([6,14].includes(beat)) this.kick(t, 0.17 * mix);
          if ([3,11].includes(beat)) this.hat(t, 0.04 * mix);
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
        const gain = part.gain * v * headroom * (L.exploreMix + (1 - L.exploreMix) * combat);
        this.tone(f, t, stepLen * instrument.length, { type: part.type,
          gain,
          bus: this.layerBus, attack: kind === 'wraith' ? 0.06 : kind === 'seer' ? 0.025 : 0.004 });
        if (instrument.family === 'trap') this.tone(f * 2, t, stepLen * 0.3,
          { type: 'sine', gain: gain * 0.35, bus: this.layerBus });
        // Sub bass alone disappears on laptop speakers. Keep its weight, add a pitched body
        // at 82-165 Hz and a quiet square edge at 165-330 Hz, all on the exact same onset.
        if (instrument.family === 'large') {
          this.tone(f * 2, t, stepLen * instrument.length, { type: 'triangle', gain: L.heavyBodyGain * v * headroom, bus: this.layerBus });
          this.tone(f * 4, t, stepLen * 0.75, { type: 'square', gain: L.heavyEdgeGain * v * headroom, bus: this.layerBus });
        }
      });
    }
    this.playMusicEvents(t, stepLen, root, theme, headroom);
    this.scoreTrack = 'fire';
    // A lamp/coals gives one dry tick per bar. Burning area adds up to three answering pops,
    // and a broad flame gets a little low rustle; no permanent hiss over the enemy rhythm.
    if (this.fireMix > 0.005 && beat === 7) this.fireTick(t, L.fireGain * this.fireMix * headroom);
    [11, 3, 15].forEach((slot, i) => {
      const amount = Math.max(0, Math.min(1, this.blazeMix - i));
      if (beat !== slot || amount < 0.005) return;
      this.fireTick(t, L.fireGain * amount * headroom * 0.8);
      if (i === 2) this.noise(t, stepLen * 1.8, { gain: L.fireGain * amount * headroom * 0.5, hp: 400, lp: 2400, bus: this.layerBus });
    });
    this.scoreTrack = 'grass';
    [6, 14, 10].forEach((slot, i) => {
      const amount = Math.max(0, Math.min(1, this.grassMix - i));
      if (beat !== slot || amount < 0.005) return;
      const f = root * 8 * Math.pow(2, theme.scale[[4, 2, 0][i]] / 12);
      this.tone(f, t, stepLen * 2.8, { type: 'sine', gain: L.grassGain * amount * headroom, bus: this.layerBus, attack: 0.025 });
      this.tone(f * 2, t, stepLen * 1.1, { type: 'triangle', gain: L.grassGain * amount * headroom * 0.2, bus: this.layerBus, attack: 0.012 });
    });
  }
  fireTick(t, gain) {
    this.noise(t, 0.035, { gain, hp: 1200, lp: 5500, bus: this.layerBus });
    this.noise(t + 0.025, 0.09, { gain: gain * 0.35, hp: 650, lp: 3000, bus: this.layerBus });
  }
  playFirstBed(s, t, stepLen) {
    const beat = s % 16, bar = (s >> 4) & 3, root = FIRST_MUSIC.roots[bar];
    if (beat === 0) this.pad(t, root * 2, stepLen * 12, 0.032);
    if (beat === 0) this.bass(t, root, stepLen * 2.3, 0.17);
    if (beat === 11 && bar % 2 === 0) this.bass(t, root * 1.5, stepLen * 1.4, 0.10);
  }
  playLateBed(s, t, stepLen) {
    const beat = s % 16, root = LATE_MUSIC.roots[(s >> 4) & 3];
    if (beat === 0) this.pad(t, root, stepLen * 16.4, 0.055);
    if (beat === 0 || beat === 8) this.bass(t, root, stepLen * 3.2, 0.23);
    if (beat === 12) this.bass(t, root * 1.5, stepLen * 2.2, 0.16);
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
  now() { return this.ctx ? this.ctx.currentTime : 0; }
  sfxHeadbutt() { if (!this.ctx || this.muted) return; const t = this.now(); this.noise(t, 0.12, { gain: 0.25, hp: 400, lp: 3000 }); }
  sfxThud() { if (!this.ctx || this.muted) return; const t = this.now(); this.tone(90, t, 0.15, { gain: 0.5, sweep: 0.5 }); this.noise(t, 0.08, { gain: 0.2, lp: 800 }); }
  sfxSplat() {
    if (!this.ctx || this.muted) return; const t = this.now();
    this.tone(70, t, 0.25, { gain: 0.8, sweep: 0.3 }); this.noise(t, 0.25, { gain: 0.5, lp: 1800 }); this.crash(t, 0.25);
  }
  sfxGunshot() { if (!this.ctx || this.muted) return; const t = this.now(); this.noise(t, 0.18, { gain: 0.7, hp: 300 }); this.tone(120, t, 0.1, { gain: 0.5, sweep: 0.3 }); }
  sfxPot() { if (!this.ctx || this.muted) return; const t = this.now(); this.noise(t, 0.2, { gain: 0.45, hp: 2000 }); this.tone(900, t, 0.12, { gain: 0.2, sweep: 0.4, type: 'triangle' }); }
  // An animal, not a siren. A goat's voice is a buzzy sawtooth put through two vowel formants and
  // shaken hard — the shake is the whole character of it, and it is why the old sweep-and-vibrato
  // screech read as a synth. `f` is the pitch it starts at, `wob` how fast the throat shakes, and
  // `open` how far the mouth opens over the call, which is what turns a 'bèh' into a 'baaah'.
  bleatVoice(t, { f = 300, dur = 0.5, gain = 0.3, wob = 24, depth = 0.11, open = 1.5, breath = 0.1 } = {}) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(f, t);
    o.frequency.linearRampToValueAtTime(f * 1.06, t + dur * 0.18);   // it goes up before it gives out
    o.frequency.exponentialRampToValueAtTime(Math.max(40, f * 0.72), t + dur);
    // The throat, shaking. Deep enough to hear as a bleat rather than as vibrato on a note.
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.type = 'triangle'; lfo.frequency.setValueAtTime(wob, t);
    lfo.frequency.linearRampToValueAtTime(wob * 0.7, t + dur);
    lg.gain.value = f * depth; lfo.connect(lg); lg.connect(o.frequency);
    lfo.start(t); lfo.stop(t + dur + 0.05);
    // Two formants: the first opens as the jaw does, the second holds and gives it the nasal edge.
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(gain, t + 0.035);
    env.gain.setValueAtTime(gain, t + dur * 0.55);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.Q.value = 4.5;
    f1.frequency.setValueAtTime(560, t); f1.frequency.linearRampToValueAtTime(560 * open, t + dur * 0.6);
    const f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.Q.value = 6; f2.frequency.value = 1750;
    const g2 = ctx.createGain(); g2.gain.value = 0.5;
    o.connect(f1); f1.connect(env);
    o.connect(f2); f2.connect(g2); g2.connect(env);
    env.connect(this.sfxBus);
    o.start(t); o.stop(t + dur + 0.05);
    // The air in it, at the front of the call.
    if (breath > 0) this.noise(t, Math.min(0.12, dur * 0.3), { gain: gain * breath, hp: 1200, lp: 5200 });
    return o;
  }
  // BAAAH. The goat's own voice, loud and ragged, and the one sound in the game that is his.
  sfxScream() {
    if (!this.ctx || this.muted) return; const t = this.now();
    this.bleatVoice(t, { f: 330, dur: 0.62, gain: 0.34, wob: 26, depth: 0.13, open: 1.8, breath: 0.22 });
    // A second throat a fifth under it, quieter and later: one goat, with weight behind him.
    this.bleatVoice(t + 0.02, { f: 218, dur: 0.5, gain: 0.16, wob: 21, depth: 0.1, open: 1.6, breath: 0 });
  }
  // A small frightened bleat: the same throat, quieter, shorter, and shaking harder.
  sfxBleat(f, gain, dur) {
    if (!this.ctx || this.muted) return; const t = this.now();
    const d = dur || 0.28;
    this.bleatVoice(t, { f: f * 0.62, dur: d, gain: (gain || 0.1) * 1.5, wob: 19 + f * 0.02, depth: 0.09, open: 1.35, breath: 0.14 });
  }
  // The hen. The same throat as the goat, pitched right up and cut short: two clipped notes, the
  // second higher and quieter, which is what a cluck is. Everything with a voice in this game goes
  // through `bleatVoice` — a bird built out of `tone` would be a beep with feathers drawn on it.
  sfxCluck(alarm) {
    if (!this.ctx || this.muted) return; const t = this.now();
    const f = alarm ? 980 : 760;
    this.bleatVoice(t, { f, dur: 0.1, gain: 0.16, wob: 42, depth: 0.16, open: 1.2, breath: 0.3 });
    this.bleatVoice(t + 0.1, { f: f * 1.22, dur: 0.08, gain: 0.11, wob: 48, depth: 0.14, open: 1.1, breath: 0.2 });
    // The wings, at the front of it: a bird makes as much noise with those as with her throat.
    this.noise(t, 0.1, { gain: alarm ? 0.16 : 0.1, hp: 900, lp: 4200 });
  }
  // The truck under them. Half a second of low rumble, called every half second while the road
  // goes past, so it runs on without a loop: a fixed pitch is a hum and a hum is a motor.
  sfxEngine() {
    if (!this.ctx || this.muted) return; const t = this.now();
    this.noise(t, 0.6, { gain: 0.11, lp: 140 });
    this.tone(46, t, 0.6, { type: 'triangle', gain: 0.09, attack: 0.05 });
  }
  // A club coming down on a skull, heard from inside the skull.
  sfxClub() {
    if (!this.ctx || this.muted) return; const t = this.now();
    this.noise(t, 0.16, { gain: 0.6, lp: 900 });
    this.tone(120, t, 0.32, { gain: 0.9, sweep: 0.3 });
    this.tone(48, t + 0.02, 0.9, { type: 'triangle', gain: 0.5, sweep: 0.6, attack: 0.01 });
  }
  // Something small giving way.
  sfxCrack() {
    if (!this.ctx || this.muted) return; const t = this.now();
    this.tone(880, t, 0.22, { type: 'triangle', gain: 0.12, sweep: 0.3 });
    this.noise(t, 0.06, { gain: 0.12, hp: 2500 });
  }
  sfxBell() { if (!this.ctx || this.muted) return; const t = this.now(); this.gong(t, 0.8); this.droneUntil = t + 8; }
  sfxToll() { if (!this.ctx || this.muted) return; const t = this.now() + 0.15; this.gong(t, 0.6); }
  sfxHit() { if (!this.ctx || this.muted) return; const t = this.now(); this.tone(180, t, 0.2, { gain: 0.5, sweep: 0.4, type: 'square' }); this.noise(t, 0.1, { gain: 0.2 }); }
  sfxFire() { if (!this.ctx || this.muted) return; const t = this.now(); this.noise(t, 0.35, { gain: 0.25, hp: 900, lp: 5000 }); }
  sfxSwing() { if (!this.ctx || this.muted) return; const t = this.now(); this.noise(t, 0.1, { gain: 0.15, hp: 800, lp: 4000 }); }
  // Somebody going over an edge: a shout that runs away downward, and the air after it. The pitch
  // falls the whole way rather than stopping, because what sells a hole is that the sound keeps going.
  sfxFall() {
    if (!this.ctx || this.muted) return;
    const t = this.now();
    this.tone(430, t, 0.8, { gain: 0.3, sweep: 0.13, type: 'sawtooth' });
    this.tone(214, t, 0.8, { gain: 0.16, sweep: 0.13, type: 'square' });
    this.noise(t + 0.06, 0.62, { gain: 0.15, hp: 180, lp: 2400 });
  }
  sfxRoll() { if (!this.ctx || this.muted) return; const t = this.now(); this.noise(t, 0.22, { gain: 0.3, hp: 260, lp: 2200 }); this.tone(160, t, 0.18, { gain: 0.25, sweep: 0.45, type: 'triangle' }); }
  // The hound: a jaw snapping shut, dry and close.
  sfxSnap() {
    if (!this.ctx || this.muted) return; const t = this.now();
    this.noise(t, 0.05, { gain: 0.35, hp: 1800, lp: 9000 });
    this.tone(320, t, 0.07, { gain: 0.3, sweep: 0.3, type: 'square' });
  }
  // A growl instead of a bark: the hounds are the only thing in the compound that does not shout.
  sfxGrowl() {
    if (!this.ctx || this.muted) return; const t = this.now();
    const o = this.tone(96, t, 0.45, { type: 'sawtooth', gain: 0.22, sweep: 0.8 });
    const lfo = this.ctx.createOscillator(); const lg = this.ctx.createGain();
    lfo.frequency.value = 34; lg.gain.value = 26; lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + 0.5);
    this.noise(t, 0.4, { gain: 0.12, hp: 120, lp: 900 });
  }
  sfxBreath() {
    if (!this.ctx || this.muted) return; const t = this.now();
    this.noise(t, 0.55, { gain: 0.55, hp: 220, lp: 3600 });
    this.tone(80, t, 0.5, { gain: 0.4, sweep: 2.4, type: 'sawtooth' });
    this.tone(300, t, 0.4, { gain: 0.14, sweep: 0.4, type: 'square' });
  }
  sfxBoom() {
    if (!this.ctx || this.muted) return; const t = this.now();
    this.tone(58, t, 0.7, { gain: 1.0, sweep: 0.25 });
    this.noise(t, 0.5, { gain: 0.7, lp: 2400 });
    this.crash(t, 0.4);
  }
  sfxCast() {
    if (!this.ctx || this.muted) return; const t = this.now();
    this.tone(220, t, 0.9, { type: 'triangle', gain: 0.18, sweep: 2.2, attack: 0.06 });
    this.tone(330, t, 0.9, { type: 'sine', gain: 0.1, sweep: 2.0, attack: 0.1 });
  }
  sfxRune() {
    if (!this.ctx || this.muted) return; const t = this.now();
    this.tone(110, t, 0.5, { gain: 0.6, sweep: 0.35, type: 'sawtooth' });
    this.noise(t, 0.4, { gain: 0.35, hp: 700, lp: 4200 });
  }
  sfxBlink() {
    if (!this.ctx || this.muted) return; const t = this.now();
    this.tone(660, t, 0.22, { type: 'triangle', gain: 0.22, sweep: 0.25 });
    this.noise(t, 0.14, { gain: 0.18, hp: 3000 });
  }
  // Steel: a blade leaving a stand, going into a man, or a shield taking a bullet.
  sfxSteel() {
    if (!this.ctx || this.muted) return; const t = this.now();
    this.tone(1180, t, 0.22, { type: 'triangle', gain: 0.16, sweep: 0.5 });
    this.tone(1760, t + 0.008, 0.16, { type: 'sine', gain: 0.1, sweep: 0.6 });
    this.noise(t, 0.09, { gain: 0.18, hp: 3200 });
  }

  // Something with no throat making a sound anyway: a cold swell as it becomes real.
  sfxWraith() {
    if (!this.ctx || this.muted) return; const t = this.now();
    this.tone(150, t, 0.5, { type: 'sine', gain: 0.3, sweep: 0.45, attack: 0.12 });
    this.tone(226, t + 0.03, 0.45, { type: 'sine', gain: 0.18, sweep: 0.5, attack: 0.14 });
    this.noise(t, 0.5, { gain: 0.16, hp: 1600, lp: 5200 });
  }
  // The blow: no weight behind it, all cold.
  sfxWraithHit() {
    if (!this.ctx || this.muted) return; const t = this.now();
    this.noise(t, 0.22, { gain: 0.35, hp: 2400 });
    this.tone(320, t, 0.24, { type: 'sine', gain: 0.22, sweep: 2.2 });
  }
  // Caught in the flesh and undone: it goes out rather than down.
  sfxUnmade() {
    if (!this.ctx || this.muted) return; const t = this.now();
    this.tone(880, t, 0.55, { type: 'sine', gain: 0.28, sweep: 0.16 });
    this.tone(1320, t + 0.02, 0.4, { type: 'triangle', gain: 0.14, sweep: 0.2 });
    this.noise(t, 0.45, { gain: 0.3, hp: 2000 });
  }

  // A headbutt that the pen holds: one bar rings and the frame shifts.
  sfxCageHit() {
    if (!this.ctx || this.muted) return; const t = this.now();
    this.tone(620, t, 0.28, { type: 'square', gain: 0.2, sweep: 0.6 });
    this.tone(930, t + 0.01, 0.2, { type: 'triangle', gain: 0.12, sweep: 0.7 });
    this.noise(t, 0.12, { gain: 0.25, hp: 2200 });
    this.tone(80, t, 0.2, { gain: 0.5, sweep: 0.4 });
  }

  // The pen coming apart: iron, and a lot of it.
  sfxCage() {
    if (!this.ctx || this.muted) return; const t = this.now();
    this.noise(t, 0.5, { gain: 0.5, hp: 1700 });
    [740, 1100, 1480].forEach((f, i) => this.tone(f, t + i * 0.012, 0.5 - i * 0.1, { type: 'square', gain: 0.16, sweep: 0.75 }));
    this.tone(70, t, 0.45, { gain: 0.85, sweep: 0.35 });
    this.crash(t, 0.3);
  }
  // Stacked kills: the same stab, a little higher every time.
  sfxKill(n) {
    if (!this.ctx || this.muted) return; const t = this.now();
    const f = 300 * Math.pow(1.14, Math.min(8, n));
    this.tone(f, t, 0.18, { type: 'square', gain: 0.22, sweep: 1.6 });
    this.tone(f * 1.5, t + 0.03, 0.14, { type: 'triangle', gain: 0.14, sweep: 1.5 });
  }
  sfxCard() { if (!this.ctx || this.muted) return; const t = this.now(); this.tone(60, t, 0.9, { gain: 0.8, sweep: 0.5 }); this.noise(t, 0.3, { gain: 0.2, lp: 600 }); }
}
