// WebAudio: synthesised ritual percussion driven by threat, plus one-shot sound effects. No assets.
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
    this.master = this.ctx.createGain(); this.master.gain.value = 0.5; this.master.connect(this.ctx.destination);
    this.drumBus = this.ctx.createGain(); this.drumBus.gain.value = 0.9; this.drumBus.connect(this.master);
    this.sfxBus = this.ctx.createGain(); this.sfxBus.gain.value = 0.8; this.sfxBus.connect(this.master);
    const len = this.ctx.sampleRate * 1.5;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.nextTime = this.ctx.currentTime + 0.1;
    setInterval(() => this.schedule(), 25);
  }
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
  toggleMute() { this.muted = !this.muted; if (this.master) this.master.gain.value = this.muted ? 0 : 0.5; return this.muted; }

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
  sfxCard() { if (!this.ctx || this.muted) return; const t = this.now(); this.tone(60, t, 0.9, { gain: 0.8, sweep: 0.5 }); this.noise(t, 0.3, { gain: 0.2, lp: 600 }); }
}
