// WebAudio: a synthesised ritual score driven by threat, plus one-shot sound effects. No assets.

// What the compound hums to itself: a four-bar sag in the bass with a phrygian motif over it.
// Scale degrees index into `scale`; -1 is a rest. Sixteen steps to the bar.
const MUSIC = {
  roots: [55, 55, 48.99, 41.20],                        // A1 A1 G1 E1
  scale: [0, 1, 3, 5, 7, 8, 10],                        // phrygian: the mode the cult sings in
  motif: [0, -1, -1, -1, 3, -1, -1, 2, -1, -1, 1, -1, 0, -1, -1, 4],
};
class GameAudio {
  constructor() {
    this.ctx = null; this.muted = false;
    this.intensity = 0; this.hunterAware = false; this.droneUntil = 0;
    this.step = 0; this.nextTime = 0; this.bpm = 118;
  }
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    const A = TUNING.audio;
    this.master = this.ctx.createGain(); this.master.gain.value = A.master; this.master.connect(this.ctx.destination);
    this.drumBus = this.ctx.createGain(); this.drumBus.gain.value = A.drums; this.drumBus.connect(this.master);
    this.sfxBus = this.ctx.createGain(); this.sfxBus.gain.value = A.sfx; this.sfxBus.connect(this.master);
    this.musicBus = this.ctx.createGain(); this.musicBus.gain.value = A.music; this.musicBus.connect(this.master);
    const len = this.ctx.sampleRate * 1.5;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.nextTime = this.ctx.currentTime + 0.1;
    setInterval(() => this.schedule(), 25);
  }
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
  toggleMute() { this.muted = !this.muted; if (this.master) this.master.gain.value = this.muted ? 0 : TUNING.audio.master; return this.muted; }

  // ---- synth primitives ----
  tone(freq, t, dur, { type = 'sine', gain = 0.5, sweep = 0, bus = null, attack = 0.002 } = {}) {
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (sweep) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * sweep), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus || this.sfxBus); o.start(t); o.stop(t + dur + 0.02);
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
  }

  // ---- drums ----
  kick(t, g = 0.9) { this.tone(140, t, 0.28, { gain: g, sweep: 0.25, bus: this.drumBus }); }
  tomLo(t, g = 0.6) { this.tone(110, t, 0.35, { gain: g, sweep: 0.6, bus: this.drumBus }); this.noise(t, 0.05, { gain: 0.08, lp: 1200, bus: this.drumBus }); }
  tomHi(t, g = 0.5) { this.tone(190, t, 0.25, { gain: g, sweep: 0.6, bus: this.drumBus }); }
  hat(t, g = 0.18) { this.noise(t, 0.05, { gain: g, hp: 6000, bus: this.drumBus }); }
  shaker(t, g = 0.12) { this.noise(t, 0.09, { gain: g, hp: 3500, lp: 9000, bus: this.drumBus }); }
  crash(t, g = 0.35) { this.noise(t, 1.2, { gain: g, hp: 2500, bus: this.drumBus }); }
  gong(t, g = 0.5) {
    [92, 138, 207, 311].forEach((f, i) => this.tone(f, t, 2.2 - i * 0.3, { gain: g / (i + 1.5), bus: this.drumBus }));
    this.noise(t, 0.4, { gain: 0.15, hp: 1500, bus: this.drumBus });
  }
  // ---- the bed: pad, bass and a bone flute ----
  pad(t, f, dur, gain) {
    this.tone(f, t, dur, { type: 'triangle', gain, bus: this.musicBus, attack: 0.35 });
    this.tone(f * 1.5, t, dur * 0.9, { type: 'triangle', gain: gain * 0.5, bus: this.musicBus, attack: 0.5 });
  }
  bass(t, f, dur, gain) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain(), lp = this.ctx.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t);
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(430, t); lp.frequency.exponentialRampToValueAtTime(150, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(lp); lp.connect(g); g.connect(this.musicBus); o.start(t); o.stop(t + dur + 0.02);
  }
  lead(t, f, dur, gain) {
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
    if (!this.ctx) return;
    const stepLen = 60 / this.bpm / 4;
    while (this.nextTime < this.ctx.currentTime + 0.12) {
      this.playStep(this.step, this.nextTime, stepLen);
      this.step = (this.step + 1) % 64;
      this.nextTime += stepLen;
    }
  }
  playStep(s, t, stepLen) {
    if (this.muted) return;
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
      if (bar % 4 === 0) this.kick(t, 0.8);
      if (bar % 2 === 1) this.hat(t);
      if (bar === 7 || bar === 15) this.tomHi(t, 0.5);
    }
    if (lvl >= 3) {
      if (bar % 2 === 0) this.hat(t, 0.14);
      if ([2, 5, 11, 13].includes(bar)) this.tomLo(t, 0.45);
      if (s % 64 === 0) this.crash(t, 0.2);
      if (bar === 0) this.chant(t, stepLen * 16);
    }
    if (this.hunterAware && bar % 2 === 1) this.shaker(t);
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
  sfxScream() {
    if (!this.ctx || this.muted) return; const t = this.now();
    const o = this.tone(520, t, 0.55, { type: 'sawtooth', gain: 0.35, sweep: 0.55 });
    const lfo = this.ctx.createOscillator(); const lg = this.ctx.createGain();
    lfo.frequency.value = 22; lg.gain.value = 40; lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + 0.6);
  }
  sfxBell() { if (!this.ctx || this.muted) return; const t = this.now(); this.gong(t, 0.8); this.droneUntil = t + 8; }
  sfxToll() { if (!this.ctx || this.muted) return; const t = this.now() + 0.15; this.gong(t, 0.6); }
  sfxHit() { if (!this.ctx || this.muted) return; const t = this.now(); this.tone(180, t, 0.2, { gain: 0.5, sweep: 0.4, type: 'square' }); this.noise(t, 0.1, { gain: 0.2 }); }
  sfxFire() { if (!this.ctx || this.muted) return; const t = this.now(); this.noise(t, 0.35, { gain: 0.25, hp: 900, lp: 5000 }); }
  sfxSwing() { if (!this.ctx || this.muted) return; const t = this.now(); this.noise(t, 0.1, { gain: 0.15, hp: 800, lp: 4000 }); }
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
