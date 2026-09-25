// Foley: every sound effect in the game as a small physical model rendered into a buffer. No assets,
// and no oscillator straight to the speakers any more — a square wave reads as a beep however it is
// shaped, and the same call making the same sound every time is the other half of why the effects
// read as a chip. A struck thing is its ringing modes, a throat is a buzz through the formants of its
// mouth, air is shaped noise. `GameAudio.foley` renders a few takes of a recipe the first times it is
// asked for, plays one of them nudged in pitch and level, and hears it in one small dry room
// (`Foley.roomImpulse`). Render only: nothing here touches the simulation or its seeded RNG.
// Pure JS over Float32Arrays, so `node` can render any recipe to a file without a browser.

const Foley = (() => {
  const TAU = Math.PI * 2, LOW_CUT = 85;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const rint = (a, b) => Math.floor(rnd(a, b + 1));
  const len = (sr, sec) => Math.max(1, Math.ceil(sr * sec));
  const buf = (sr, sec) => new Float32Array(len(sr, sec));
  // A strike: up in `a` seconds, then down by e every `d`.
  const hit = (t, a, d) => (t < a ? t / a : Math.exp(-(t - a) / d));
  // A swell that peaks `p` of the way through `d` seconds and is shut again at the end.
  const swell = (t, d, p = 0.5, k = 2) => {
    const u = t / d;
    return u <= 0 || u >= 1 ? 0 : u < p ? Math.pow(u / p, k) : Math.pow((1 - u) / (1 - p), k);
  };

  function env(x, sr, fn) { for (let i = 0; i < x.length; i++) x[i] *= fn(i / sr); return x; }
  function add(dst, src, sr, at = 0, gain = 1) {
    const s0 = Math.max(0, Math.floor(at * sr)), n = Math.min(src.length, dst.length - s0);
    for (let i = 0; i < n; i++) dst[s0 + i] += src[i] * gain;
    return dst;
  }
  function peakOf(x) { let p = 0; for (let i = 0; i < x.length; i++) p = Math.max(p, Math.abs(x[i])); return p; }
  function normalize(x, to = 1) { const p = peakOf(x); if (p > 0) for (let i = 0; i < x.length; i++) x[i] *= to / p; return x; }
  // What every take goes through last: a few milliseconds of fade at each end (a mode cut off by the
  // end of its buffer is a click), then a common peak so a recipe's `gain` in `audio.js` means level.
  // A high-pass at `LOW_CUT` comes first: the sub under a thud or a blast is what made every effect
  // sound big and far away (1.66, "too much space"), and a laptop never played it anyway.
  function finish(x, sr, to = 0.9) {
    filter(x, sr, 'hp', LOW_CUT, 0.707);
    const inN = Math.min(x.length, Math.ceil(sr * 0.0015)), outN = Math.min(x.length, Math.ceil(sr * 0.02));
    for (let i = 0; i < inN; i++) x[i] *= i / inN;
    for (let i = 0; i < outN; i++) x[x.length - 1 - i] *= i / outN;
    return normalize(x, to);
  }

  function white(n) { const x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = Math.random() * 2 - 1; return x; }
  // Equal energy an octave, which is what most of the world's noise is (Kellet's economy filter).
  function pink(n) {
    const x = new Float32Array(n); let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.0990460; b1 = 0.96300 * b1 + w * 0.2965164; b2 = 0.57000 * b2 + w * 1.0526913;
      x[i] = (b0 + b1 + b2 + w * 0.1848) * 0.25;
    }
    return x;
  }
  // A random walk: the rumble under a blast or a lorry.
  function brown(n) {
    const x = new Float32Array(n); let v = 0;
    for (let i = 0; i < n; i++) { v = (v + 0.02 * (Math.random() * 2 - 1)) / 1.02; x[i] = v * 4; }
    return x;
  }

  // An RBJ biquad run in place. `f` (and `q`) may be functions of time for a sweep; the coefficients
  // are re-read every 32 samples, which is cheap and inaudible. 'bp' peaks at 0 dB.
  function filter(x, sr, type, f, q = 0.707, db = 0) {
    let b0 = 0, b1 = 0, b2 = 0, a1 = 0, a2 = 0, x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    const fOf = typeof f === 'function' ? f : null, qOf = typeof q === 'function' ? q : null;
    const set = (t) => {
      const fc = Math.min(sr * 0.45, Math.max(20, fOf ? fOf(t) : f)), Q = Math.max(0.1, qOf ? qOf(t) : q);
      const w = TAU * fc / sr, c = Math.cos(w), al = Math.sin(w) / (2 * Q);
      let B0, B1, B2, A0 = 1 + al, A1 = -2 * c, A2 = 1 - al;
      if (type === 'lp') { B1 = 1 - c; B0 = B2 = B1 / 2; }
      else if (type === 'hp') { B1 = -(1 + c); B0 = B2 = (1 + c) / 2; }
      else if (type === 'bp') { B0 = al; B1 = 0; B2 = -al; }
      else { const A = Math.pow(10, db / 40); B0 = 1 + al * A; B1 = A1; B2 = 1 - al * A; A0 = 1 + al / A; A2 = 1 - al / A; }
      b0 = B0 / A0; b1 = B1 / A0; b2 = B2 / A0; a1 = A1 / A0; a2 = A2 / A0;
    };
    const sweep = fOf || qOf;
    set(0);
    for (let i = 0; i < x.length; i++) {
      if (sweep && (i & 31) === 0) set(i / sr);
      const x0 = x[i], y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
      x2 = x1; x1 = x0; y2 = y1; y1 = y0; x[i] = y0;
    }
    return x;
  }
  const noiseBand = (n, sr, type, f, q, kind = pink) => filter(kind(n), sr, type, f, q);

  // A struck body ringing: each mode is [ratio to `f0`, seconds to fall by e, level]. `bend` starts
  // every mode that much sharp and lets it settle over `bendT` — a skin or a body hit hard goes up in
  // pitch at the strike and falls back, which is most of what makes a thump sound heavy.
  function modes(x, sr, f0, list, { at = 0, gain = 1, spread = 0.01, bend = 0, bendT = 0.03 } = {}) {
    const s0 = Math.max(0, Math.floor(at * sr));
    for (const [ratio, decay, level] of list) {
      const f = f0 * ratio * (1 + rnd(-spread, spread));
      if (f * (1 + bend) >= sr * 0.45) continue;
      const k = Math.exp(-1 / (decay * sr)), n = Math.min(x.length - s0, Math.ceil(decay * sr * 6));
      let a = level * gain;
      if (bend) {
        const bk = Math.exp(-1 / (bendT * sr)); let ph = 0, b = bend;
        for (let i = 0; i < n; i++) { ph += TAU * f * (1 + b) / sr; b *= bk; x[s0 + i] += a * Math.sin(ph); a *= k; }
      } else {
        // A steady mode is a rotation, not a sine per sample: two multiplies, which is what makes a
        // bell's four seconds of twenty partials cheap enough to render mid-game.
        const w = TAU * f / sr, c2 = 2 * Math.cos(w); let y1 = 0, y2 = -Math.sin(w);
        for (let i = 0; i < n; i++) { const y = c2 * y1 - y2; y2 = y1; y1 = y; x[s0 + i] += a * y; a *= k; }
      }
    }
    return x;
  }
  // The tick at the front of every hit: a millisecond of noise through a band.
  function click(x, sr, at, f, level = 1, width = 0.0012, q = 1.1) {
    const c = white(len(sr, width * 8));
    env(c, sr, (t) => Math.exp(-t / width)); filter(c, sr, 'bp', f, q);
    return add(x, c, sr, at, level * 3);
  }
  // Many small ticks thinning out: splinters, grit, sparks in a fire.
  function crackle(x, sr, at, d, count, lo, hi, level, thin = 1.6) {
    for (let k = 0; k < count; k++) {
      const u = Math.pow(Math.random(), thin);
      click(x, sr, at + u * d, rnd(lo, hi), level * rnd(0.25, 1) * (1 - 0.75 * u), rnd(0.0003, 0.0009));
    }
    return x;
  }
  // A small hard thing ringing once: a shard, a pebble, a ring of iron.
  function ping(x, sr, at, f, decay, level) {
    modes(x, sr, f, [[1, decay, 1], [2.76, decay * 0.5, 0.4], [5.4, decay * 0.25, 0.2]], { at, gain: level });
    return click(x, sr, at, Math.min(9000, f * 1.6), level * 0.25, 0.0005);
  }
  // Air moved fast past the ear: noise through a band that opens as it passes and closes again.
  function whoosh(x, sr, at, d, lo, hi, level = 1, p = 0.45, q = 1.1) {
    const w = pink(len(sr, d));
    filter(w, sr, 'bp', (t) => lo + (hi - lo) * swell(t, d, p, 1), q);
    env(w, sr, (t) => swell(t, d, p, 2));
    return add(x, w, sr, at, level);
  }
  // A held low note that rises and falls, for the swells under the uncanny things.
  function drone(x, sr, at, d, f, level, p = 0.4) {
    const s0 = Math.floor(at * sr), n = Math.min(x.length - s0, len(sr, d)); let ph = 0;
    for (let i = 0; i < n; i++) { ph += TAU * f / sr; x[s0 + i] += level * swell(i / sr, d, p, 2) * Math.sin(ph); }
    return x;
  }
  // A hoof on stone: horn on rock, and the weight of the leg a beat under it.
  function hoof(x, sr, at, level = 1) {
    click(x, sr, at, rnd(2400, 3600), level * 0.7, 0.0006);
    modes(x, sr, rnd(950, 1350), [[1, 0.011, 0.55], [2.3, 0.006, 0.3]], { at, gain: level });
    return modes(x, sr, rnd(150, 210), [[1, 0.022, 0.4]], { at, gain: level });
  }

  // A throat: a buzz at `f(t)` Hz through the formants of a mouth, `[[hz or hz(t), q, level], ...]`.
  // `jit` wanders the pitch from one cycle to the next and `shim` the level (the difference between
  // a voice and a reed); `rough` knocks every other cycle down (the rasp in a bark, the rattle in a
  // caw); `trem` { hz, amp, pitch } shakes level and pitch together (the whole of a goat); `breath`
  // is air through the same mouth and `buzz` how much throat there is at all (0 is a whisper);
  // `tilt` darkens the buzz, `body` adds the chest under the mouth, `drive` pushes it into a rasp.
  function voice(sr, dur, o) {
    const n = len(sr, dur), src = new Float32Array(n);
    const buzz = o.buzz == null ? 1 : o.buzz, breath = o.breath || 0, jit = o.jit || 0, shim = o.shim || 0, rough = o.rough || 0;
    const tr = o.trem, tiltK = 1 - Math.exp(-TAU * (o.tilt || 4000) / sr);
    let ph = Math.random(), amp = 1, walk = 0, cyc = 0, lp = 0, trPh = Math.random() * TAU, trWalk = 0, fBase = 0, trS = 0;
    for (let i = 0; i < n; i++) {
      // The contour and the shake move slowly next to the buzz: read them every eighth sample.
      if ((i & 7) === 0) {
        fBase = o.f(i / sr);
        if (tr) { trPh += 8 * TAU * tr.hz * (1 + trWalk) / sr; trS = Math.sin(trPh); }
      }
      let f = fBase * (1 + walk), a = amp;
      if (tr) { f *= 1 + tr.pitch * trS; a *= 1 - tr.amp * (0.5 - 0.5 * trS); }
      const dp = Math.min(0.45, Math.max(1e-4, f / sr));
      ph += dp;
      if (ph >= 1) {
        ph -= 1; cyc++;
        amp = (1 + rnd(-shim, shim)) * (rough && (cyc & 1) ? 1 - rough : 1);
        walk = walk * 0.6 + rnd(-jit, jit);
        if (tr) trWalk = trWalk * 0.8 + rnd(-0.12, 0.12);
      }
      // A saw with its corner rounded off (polyBLEP), so the buzz does not alias into a whistle.
      let s = 2 * ph - 1;
      if (ph < dp) { const u = ph / dp; s -= u + u - u * u - 1; }
      else if (ph > 1 - dp) { const u = (ph - 1) / dp; s -= u * u + u + u + 1; }
      lp += tiltK * (s - lp);
      // Air: loudest while the folds are open, and there on its own in a whisper.
      const air = breath ? (Math.random() * 2 - 1) * breath * (buzz ? 0.55 + 0.45 * (1 - 4 * Math.min(ph, 1 - ph)) : 1) : 0;
      src[i] = (-lp * buzz + air) * (buzz ? a : 1);
    }
    const out = new Float32Array(n);
    for (const [f, q, level] of o.formants) add(out, filter(src.slice(), sr, 'bp', f, q), sr, 0, level);
    if (o.body) add(out, filter(src.slice(), sr, 'lp', o.bodyF || 380, 0.7), sr, 0, o.body);
    if (o.env) env(out, sr, o.env);
    normalize(out, 1);
    const drive = o.drive || 1;
    if (drive > 1) { const k = Math.tanh(drive); for (let i = 0; i < n; i++) out[i] = Math.tanh(out[i] * drive) / k; }
    return out;
  }

  // The goat's throat, and every sheep's: a buzz shaken hard (`wob` times a second, `depth` of its
  // pitch) through a mouth that opens over the call (`open`). The shake is the whole character, and
  // the opening is what turns a 'beh' into a 'baaah'. It goes up before it gives out.
  function bleat(sr, { f = 300, dur = 0.5, wob = 24, depth = 0.11, open = 1.5, breath = 0.12, rough = 0.08, drive = 1.8 } = {}) {
    const up = dur * 0.18;
    return voice(sr, dur, {
      f: (t) => (t < up ? f * (1 + 0.06 * t / up) : f * 1.06 * Math.pow(0.68, (t - up) / (dur - up))),
      trem: { hz: wob, amp: 0.62, pitch: depth * 0.45 }, jit: 0.014, shim: 0.1, rough, breath, tilt: 3600,
      formants: [[(t) => 500 * (1 + (open - 1) * Math.min(1, t / (dur * 0.55))), 4, 1], [1750, 6, 0.55], [2650, 8, 0.3], [300, 3, 0.3]],
      body: 0.2,
      env: (t) => (t < 0.03 ? t / 0.03 : t < dur * 0.5 ? 1 : Math.exp(-(t - dur * 0.5) / (dur * 0.17))),
      drive,
    });
  }

  // A hound's bark: the chest fires as the jaw drops, so the pitch jumps and the vowel opens at
  // once, then both fall away. Rough, breathy, and over in a fifth of a second.
  function barkOnce(sr, big, len0) {
    const d = len0 + 0.06, open = 0.028;
    return voice(sr, d, {
      f: (t) => { const u = t / len0; return 250 * big * (u < 0.14 ? 0.8 + 3.4 * u : Math.max(0.55, 1.28 - 0.62 * (u - 0.14) / 0.86)); },
      jit: 0.05, shim: 0.28, rough: 0.35, breath: 0.5, tilt: 3200,
      formants: [[(t) => 420 + 480 * Math.min(1, t / open), 3.2, 1], [(t) => 1050 + 550 * Math.min(1, t / open), 4.5, 0.7], [2750, 6, 0.35], [290, 2.5, 0.45]],
      body: 0.3, bodyF: 320,
      env: (t) => (t < 0.005 ? t / 0.005 : Math.exp(-(t - 0.005) / (len0 * 0.42))),
      drive: 2.6,
    });
  }

  // ---- the recipes. Each is (sampleRate, args) → Float32Array; `finish` levels them afterwards. ----
  const R = {
    // Weight meeting a floor or a wall: a low body that drops as it gives, the boards knocking under
    // it, the slap of cloth and flesh, a little grit.
    thud(sr) {
      const x = buf(sr, 0.22);
      modes(x, sr, rnd(90, 115), [[1, 0.04, 0.8], [1.52, 0.025, 0.4], [2.31, 0.016, 0.25]], { bend: 0.4, bendT: 0.015 });
      modes(x, sr, rnd(170, 230), [[1, 0.03, 0.4], [2.1, 0.02, 0.25], [3.4, 0.012, 0.15]]);
      const slap = noiseBand(x.length, sr, 'lp', rnd(1000, 1600), 0.8);
      add(x, env(slap, sr, (t) => hit(t, 0.0015, 0.014)), sr, 0, 1.3);
      const grit = noiseBand(x.length, sr, 'bp', rnd(2600, 3600), 0.9, white);
      return add(x, env(grit, sr, (t) => hit(t, 0.001, 0.01)), sr, 0, 0.35);
    },
    // A man broken on stone: the body, heavier than a thud; bone going in the first moment; and the
    // wet of it, a handful of narrow squelches falling fast.
    splat(sr) {
      const x = buf(sr, 0.36);
      modes(x, sr, rnd(85, 105), [[1, 0.06, 0.8], [1.6, 0.035, 0.45], [2.4, 0.02, 0.3]], { bend: 0.5, bendT: 0.02 });
      for (let k = 0, n = rint(2, 3); k < n; k++) click(x, sr, rnd(0, 0.03), rnd(2200, 4800), rnd(0.35, 0.8), 0.0007);
      for (let k = 0; k < 4; k++) {
        const at = rnd(0.005, 0.12), d = rnd(0.03, 0.06), f0 = rnd(500, 1300), s = pink(len(sr, d));
        filter(s, sr, 'bp', (t) => f0 * (1 - 0.6 * t / d), rnd(4, 7));
        add(x, env(s, sr, (t) => hit(t, 0.003, d * 0.3)), sr, at, rnd(0.8, 1.4) * (1 - at * 4));
      }
      const slap = noiseBand(x.length, sr, 'lp', 1500, 0.8);
      return add(x, env(slap, sr, (t) => hit(t, 0.001, 0.025)), sr, 0, 1.2);
    },
    // A blow landing on the goat: a meaty thump, a crunch in the middle, a crack of something hard.
    hit(sr) {
      const x = buf(sr, 0.24);
      modes(x, sr, rnd(90, 110), [[1, 0.045, 0.8], [1.7, 0.025, 0.4]], { bend: 0.5, bendT: 0.015 });
      const crunch = noiseBand(x.length, sr, 'bp', rnd(900, 1400), 0.7);
      add(x, env(crunch, sr, (t) => hit(t, 0.001, 0.028)), sr, 0, 1.6);
      return click(x, sr, 0.003, rnd(2500, 3500), 0.6, 0.0008);
    },
    // A club on the skull: the knock of the head, the wood of the club, the crunch between them. The
    // ringing in the ears it used to leave went in 1.66 — a second of whine under every blow.
    club(sr) {
      const x = buf(sr, 0.32);
      modes(x, sr, rnd(85, 100), [[1, 0.06, 0.9], [1.6, 0.03, 0.4]], { bend: 0.6, bendT: 0.02 });
      modes(x, sr, rnd(250, 320), [[1, 0.04, 0.45], [2.6, 0.022, 0.3], [4.1, 0.013, 0.18]]);
      const crunch = noiseBand(x.length, sr, 'lp', 1100, 0.8);
      return add(x, env(crunch, sr, (t) => hit(t, 0.001, 0.035)), sr, 0, 1.4);
    },
    // Swung through the air: a club, a blade, a body going past.
    swing(sr) {
      const x = buf(sr, 0.32), d = rnd(0.2, 0.29);
      whoosh(x, sr, 0, d, rnd(250, 350), rnd(1300, 2000), 1, rnd(0.4, 0.55), 1.1);
      return whoosh(x, sr, 0, d, 90, rnd(350, 500), 0.7, 0.5, 0.8);
    },
    // The goat putting his head down: hooves scuffing the stone, a snort, the lunge moving air.
    headbutt(sr) {
      const x = buf(sr, 0.32);
      hoof(x, sr, 0, 0.8); hoof(x, sr, rnd(0.025, 0.04), 0.6);
      const scuff = noiseBand(len(sr, 0.06), sr, 'bp', 3000, 0.8, white);
      add(x, env(scuff, sr, (t) => hit(t, 0.002, 0.015)), sr, 0.005, 0.6);
      const snort = noiseBand(len(sr, 0.14), sr, 'bp', rnd(1100, 1600), 1.3, white);
      filter(snort, sr, 'lp', 3500, 0.7);
      add(x, env(snort, sr, (t) => hit(t, 0.008, 0.045)), sr, 0.012, 1.4);
      return whoosh(x, sr, 0.02, 0.22, 120, 700, 0.8, 0.35, 0.8);
    },
    // Steel: a blade leaving a stand or going into a man, a shield taking a ball, iron on iron. It rings
    // as a thin plate does, inharmonic, each partial doubled a hair apart so it shimmers, with the
    // scrape of the contact over the front.
    steel(sr) {
      const x = buf(sr, 0.42), f0 = rnd(760, 1150);
      const P = [[1, 0.09, 0.6], [2.43, 0.075, 0.5], [3.97, 0.06, 0.36], [5.62, 0.045, 0.3], [7.35, 0.03, 0.2], [9.4, 0.02, 0.12]];
      modes(x, sr, f0, P, { spread: 0.012 });
      modes(x, sr, f0 * 1.005, P.map(([r, d, l]) => [r, d, l * 0.5]), { spread: 0.012 });
      click(x, sr, 0, 5200, 1, 0.0006);
      const scrape = noiseBand(len(sr, 0.12), sr, 'bp', rnd(5000, 7000), 1.5, white);
      return add(x, env(scrape, sr, (t) => hit(t, 0.001, 0.03)), sr, 0, 0.5);
    },
    // Something wooden giving way: a first hard crack, splinters after it, the wood's own short knock.
    crack(sr) {
      const x = buf(sr, 0.4);
      click(x, sr, 0, rnd(1800, 2600), 1.2, 0.0009);
      crackle(x, sr, 0.004, rnd(0.08, 0.16), rint(5, 9), 1400, 4800, 0.7, 1.4);
      modes(x, sr, rnd(260, 400), [[1, 0.03, 0.5], [2.3, 0.02, 0.4], [3.9, 0.012, 0.3], [6.1, 0.008, 0.2]]);
      const tear = noiseBand(len(sr, 0.14), sr, 'bp', 2300, 0.8, white);
      return add(x, env(tear, sr, (t) => hit(t, 0.004, 0.035) * (0.4 + 0.6 * Math.random())), sr, 0, 0.35);
    },
    // A clay pot: the knock of it going, then shards — many small bright rings, thinning out.
    pot(sr) {
      const x = buf(sr, 0.4);
      modes(x, sr, rnd(520, 720), [[1, 0.028, 0.6], [1.9, 0.024, 0.5], [3.1, 0.018, 0.4], [4.4, 0.013, 0.3]]);
      click(x, sr, 0, 3500, 1, 0.0008);
      for (let k = 0; k < 12; k++) {
        const at = 0.008 + Math.pow(Math.random(), 1.8) * 0.26;
        ping(x, sr, at, rnd(1800, 6500), rnd(0.01, 0.03), rnd(0.12, 0.45) * (1 - at * 2));
      }
      const shatter = noiseBand(x.length, sr, 'hp', 2500, 0.7, white);
      return add(x, env(shatter, sr, (t) => hit(t, 0.001, 0.05)), sr, 0, 0.35);
    },
    // A head against a bar of the pen: a short dry knock of iron held in a wooden frame, the skull
    // under it. Damped, not rung: it was a free bar singing for a second and a half, and heard seven
    // times over at the start of every run it was the strangest thing in the game (1.66).
    cageHit(sr) {
      const x = buf(sr, 0.22), f0 = rnd(330, 420);
      modes(x, sr, f0, [[1, 0.05, 0.7], [2.756, 0.032, 0.5], [5.404, 0.018, 0.3], [8.933, 0.01, 0.15]], { spread: 0.006 });
      modes(x, sr, rnd(95, 115), [[1, 0.035, 0.7]], { bend: 0.3 });
      return click(x, sr, 0, 3200, 0.8, 0.0008);
    },
    // The pen giving way: the wood of the frame cracking, two bars knocking loose, a thump as it goes
    // over. Under half a second, dry — a crack, not a collapse.
    cage(sr) {
      const x = buf(sr, 0.42);
      click(x, sr, 0, rnd(1800, 2500), 1.2, 0.0009);
      crackle(x, sr, 0.004, 0.07, 6, 1400, 4200, 0.6, 1.4);
      modes(x, sr, rnd(240, 320), [[1, 0.03, 0.5], [2.3, 0.02, 0.35], [3.9, 0.012, 0.25]]);
      const BAR = [[1, 0.055, 0.6], [2.756, 0.035, 0.45], [5.404, 0.02, 0.25]];
      modes(x, sr, rnd(330, 420), BAR, { at: rnd(0.02, 0.04), gain: 0.7, spread: 0.01 });
      modes(x, sr, rnd(280, 360), BAR, { at: rnd(0.08, 0.12), gain: 0.45, spread: 0.01 });
      return modes(x, sr, rnd(95, 115), [[1, 0.045, 0.8], [1.6, 0.025, 0.3]], { at: rnd(0.1, 0.14), bend: 0.3 });
    },
    // A bronze bell struck: the partials of a cast bell (hum, prime, the minor-third tierce that makes
    // a bell a bell, quint, nominal and the bright ones over it), each doubled a hair apart so the
    // note beats as it dies, with the clapper's knock at the front. `low` is the toll.
    bell(sr, { low } = {}) {
      // Damped hard (1.66): the gong used to ring 3.6 s and the toll 5, through a stone hall.
      const f = low ? rnd(122, 132) : rnd(248, 268), d = low ? 2 : 1.3, k = low ? 0.26 : 0.17, x = buf(sr, d);
      const P = [[0.5, 1.6, 0.45], [1, 1.1, 0.5], [1.2, 1.0, 0.55], [1.5, 0.55, 0.22], [2, 0.7, 0.6], [2.5, 0.4, 0.28],
        [2.67, 0.32, 0.2], [3, 0.3, 0.2], [4, 0.2, 0.14], [5.33, 0.12, 0.08]].map(([r, dd, l]) => [r, dd * k, l]);
      modes(x, sr, f, P, { spread: 0.002 });
      modes(x, sr, f * 1.0035, P.map(([r, dd, l]) => [r, dd, l * 0.6]), { spread: 0.002 });
      click(x, sr, 0, 3200, 0.5, 0.001);
      return modes(x, sr, rnd(700, 900), [[1, 0.015, 0.3], [2.4, 0.008, 0.2]]);
    },
    // A blast: the crack of it, the shove of air, a roar closing down as it spends itself, and the
    // stones and grit coming back down.
    boom(sr) {
      const d = 0.85, x = buf(sr, d), n = x.length;
      const crack = white(len(sr, 0.05)); add(x, env(crack, sr, (t) => hit(t, 0.0004, 0.006)), sr, 0, 1);
      modes(x, sr, rnd(70, 82), [[1, 0.12, 1.1], [1.5, 0.06, 0.4]], { bend: 1.2, bendT: 0.03 });
      const roar = brown(n); filter(roar, sr, 'lp', (t) => 300 + 2600 * Math.exp(-t / 0.12), 0.7);
      add(x, env(roar, sr, (t) => hit(t, 0.003, 0.15)), sr, 0, 2);
      const hiss = noiseBand(n, sr, 'hp', 1500, 0.7, white); add(x, env(hiss, sr, (t) => hit(t, 0.002, 0.06)), sr, 0, 0.35);
      for (let k = 0; k < 10; k++) {
        const at = 0.1 + Math.pow(Math.random(), 1.4) * 0.6;
        ping(x, sr, at, rnd(300, 1300), rnd(0.01, 0.025), rnd(0.05, 0.2) * (1 - at / d));
      }
      return x;
    },
    // A rifle: the shock of the report (the whole spectrum at once, for a hundredth of a second), the
    // barrel's breath under it, and a short slap back off the nearest wall.
    gunshot(sr) {
      const x = buf(sr, 0.42), n = x.length, s = Math.max(1, Math.round(sr * 0.0006));
      for (let i = 0; i < s; i++) { x[i] += 1.4; x[s + i] -= 1.1; }
      const blast = noiseBand(len(sr, 0.1), sr, 'hp', 700, 0.7, white);
      add(x, env(blast, sr, (t) => hit(t, 0.0003, 0.011)), sr, 0, 1.3);
      const body = noiseBand(len(sr, 0.25), sr, 'lp', 900, 0.8);
      add(x, env(body, sr, (t) => hit(t, 0.001, 0.04)), sr, 0, 2);
      modes(x, sr, rnd(100, 120), [[1, 0.04, 0.7]], { bend: 1.2, bendT: 0.01 });
      const tail = noiseBand(n, sr, 'lp', 1500, 0.7);
      return add(x, env(tail, sr, (t) => (t < 0.02 ? 0 : Math.exp(-(t - 0.02) / 0.07))), sr, 0, 0.3);
    },
    // A rifle cocked: back — a click and the bolt sliding — and home, the heavier clack. The one tell
    // a rifle gives, so it is bright and dry.
    cock(sr) {
      const x = buf(sr, 0.28);
      click(x, sr, 0, rnd(3000, 3800), 0.8, 0.0005);
      modes(x, sr, rnd(2500, 3200), [[1, 0.012, 0.5], [1.7, 0.009, 0.4], [2.9, 0.005, 0.3]]);
      const slide = noiseBand(len(sr, 0.09), sr, 'bp', 3600, 2, white);
      add(x, env(slide, sr, (t) => swell(t, 0.09, 0.4, 1)), sr, 0.012, 0.35);
      click(x, sr, 0.11, rnd(2000, 2600), 1.1, 0.0006);
      modes(x, sr, rnd(1500, 2000), [[1, 0.018, 0.6], [2.2, 0.01, 0.4], [3.6, 0.006, 0.25]], { at: 0.11 });
      return modes(x, sr, rnd(800, 1000), [[1, 0.02, 0.3]], { at: 0.11 });
    },
    // Something catching: a 'fwoomp' of air drawn in and thrown out, a low rumble, then crackling.
    fire(sr) {
      const d = 0.5, x = buf(sr, d), n = x.length;
      const roar = pink(n); filter(roar, sr, 'lp', (t) => 400 + 2600 * (t < 0.06 ? t / 0.06 : 0.35 + 0.65 * Math.exp(-(t - 0.06) / 0.1)), 0.9);
      add(x, env(roar, sr, (t) => hit(t, 0.025, 0.12)), sr, 0, 1.6);
      const low = noiseBand(n, sr, 'lp', 260, 0.7, brown); add(x, env(low, sr, (t) => hit(t, 0.03, 0.1)), sr, 0, 0.7);
      return crackle(x, sr, 0.03, 0.42, 10, 2200, 5500, 0.6, 1.3);
    },
    // A fuse burning down: a thin hiss that spits, for as long as it has left.
    fuse(sr, { dur = 3 } = {}) {
      const x = noiseBand(len(sr, dur), sr, 'hp', 2800, 0.7, white), n = x.length;
      filter(x, sr, 'lp', 9000, 0.7);
      let level = 0.7, target = 0.7;
      for (let i = 0; i < n; i++) {
        if (i % Math.ceil(sr * 0.006) === 0) target = rnd(0.3, 1);
        level += (target - level) * 0.004; x[i] *= level;
      }
      crackle(x, sr, 0, dur, Math.floor(dur * 12), 2500, 6000, 0.5, 1);
      return env(x, sr, (t) => Math.min(1, t / 0.02, (dur - t) / 0.1));
    },
    // The goat going over: a soft thump or two of his body, fur and dust on stone, his hooves again.
    roll(sr) {
      const x = buf(sr, 0.46);
      modes(x, sr, rnd(85, 110), [[1, 0.05, 0.8], [1.8, 0.03, 0.3]], { at: 0.02, bend: 0.4 });
      modes(x, sr, rnd(95, 120), [[1, 0.04, 0.55]], { at: rnd(0.14, 0.2), bend: 0.3 });
      const fur = noiseBand(len(sr, 0.36), sr, 'bp', 1800, 0.6);
      let g = 1; for (let i = 0; i < fur.length; i++) { if (i % 300 === 0) g = rnd(0.45, 1); fur[i] *= g; }
      add(x, env(fur, sr, (t) => swell(t, 0.36, 0.3, 1)), sr, 0, 1.1);
      return hoof(x, sr, rnd(0.3, 0.36), 0.8);
    },
    // A barrel over on its staves: the air inside rings under the wood as it knocks.
    stave(sr) {
      const x = buf(sr, 0.35);
      modes(x, sr, rnd(118, 150), [[1, 0.09, 0.8], [2.2, 0.05, 0.5], [3.3, 0.035, 0.35], [4.9, 0.02, 0.2]]);
      click(x, sr, 0, 1800, 0.5, 0.001);
      const grit = noiseBand(len(sr, 0.05), sr, 'bp', 2500, 0.8, white);
      return add(x, env(grit, sr, (t) => hit(t, 0.001, 0.01)), sr, 0, 0.25);
    },
    // LEAPFROG: hooves off a man's back — a short hollow knock of his back and the hoof on it.
    vault(sr) {
      const x = buf(sr, 0.25);
      modes(x, sr, rnd(120, 150), [[1, 0.04, 0.8], [2.1, 0.02, 0.3]], { bend: 0.4 });
      const cloth = noiseBand(len(sr, 0.06), sr, 'lp', 1400, 0.8);
      add(x, env(cloth, sr, (t) => hit(t, 0.001, 0.015)), sr, 0, 0.8);
      return hoof(x, sr, 0.004, 0.9);
    },
    // DRAGON BREATH: the goat breathing out and the flame coming with it.
    breath(sr) {
      const d = 0.6, x = buf(sr, d), n = x.length;
      add(x, voice(sr, 0.4, { f: () => 200, buzz: 0, breath: 1, formants: [[700, 3, 1], [1200, 4, 0.6], [2600, 6, 0.3]],
        env: (t) => hit(t, 0.03, 0.1) }), sr, 0, 0.5);
      const roar = pink(n); filter(roar, sr, 'lp', (t) => 600 + 2900 * swell(t, d, 0.15, 1), 0.8);
      add(x, env(roar, sr, (t) => hit(t, 0.04, 0.16)), sr, 0, 1.7);
      const low = noiseBand(n, sr, 'lp', 260, 0.7, brown); add(x, env(low, sr, (t) => hit(t, 0.05, 0.12)), sr, 0, 0.6);
      return crackle(x, sr, 0.05, 0.5, 10, 2000, 5000, 0.5, 1.2);
    },
    // A seer casting: a low chant under his breath that rises a fifth, and the air going with it.
    cast(sr) {
      const d = 0.7, x = buf(sr, d);
      add(x, voice(sr, d, { f: (t) => 98 * Math.pow(1.5, Math.min(1, t / (d * 0.8))), jit: 0.01, shim: 0.06, breath: 0.35, tilt: 1800,
        formants: [[(t) => 320 + 380 * t / d, 5, 1], [(t) => 870 + 300 * t / d, 7, 0.5], [2400, 9, 0.25]], body: 0.3,
        env: (t) => swell(t, d, 0.65, 1.2), drive: 1.3 }), sr, 0, 1);
      return whoosh(x, sr, 0.05, d * 0.9, 300, 3200, 0.7, 0.75, 0.9);
    },
    // A rune going up: the ground giving fire, a deep thump and a roar, crackling.
    rune(sr) {
      const d = 0.6, x = buf(sr, d), n = x.length;
      modes(x, sr, rnd(80, 92), [[1, 0.08, 1], [1.5, 0.04, 0.4]], { bend: 0.8, bendT: 0.03 });
      const roar = pink(n); filter(roar, sr, 'lp', (t) => 400 + 2800 * (t < 0.05 ? t / 0.05 : Math.exp(-(t - 0.05) / 0.14)), 0.9);
      add(x, env(roar, sr, (t) => hit(t, 0.01, 0.14)), sr, 0, 1.8);
      return crackle(x, sr, 0.03, 0.5, 12, 2500, 6500, 0.6, 1.3);
    },
    // A seer gone: air rushing into where he was — a swell cut off short — and the pop of it closing.
    blink(sr) {
      const x = buf(sr, 0.36), g = 0.12;
      const rush = pink(len(sr, g)); filter(rush, sr, 'bp', (t) => 600 + 3600 * t / g, 1.3);
      add(x, env(rush, sr, (t) => Math.pow(t / g, 3)), sr, 0, 1.6);
      modes(x, sr, rnd(170, 200), [[1, 0.03, 0.8]], { at: g, bend: 0.8 });
      click(x, sr, g, 2500, 0.8, 0.0008);
      const after = noiseBand(len(sr, 0.2), sr, 'hp', 2200, 0.7, white);
      return add(x, env(after, sr, (t) => hit(t, 0.001, 0.05)), sr, g, 0.3);
    },
    // Something with no throat making a sound anyway: a whisper through a mouth that is opening, a
    // cold swell under it, and the air going thin over it.
    wraith(sr) {
      const d = 0.8, x = buf(sr, d);
      add(x, voice(sr, d, { f: () => 150, buzz: 0, breath: 1,
        formants: [[(t) => 320 + 420 * t / d, 7, 1], [(t) => 900 + 600 * t / d, 9, 0.7], [2500, 11, 0.4]],
        env: (t) => swell(t, d, 0.45, 1.5) }), sr, 0, 1);
      drone(x, sr, 0, d, rnd(110, 124), 0.12, 0.45);
      for (const f of [2210, 2290, 2420, 2560]) drone(x, sr, 0.05, d - 0.05, f * rnd(0.98, 1.02), 0.025, 0.5);
      return x;
    },
    // Its blow: no weight behind it, all cold — a thin cut of air and a hiss of breath.
    wraithHit(sr) {
      const x = buf(sr, 0.35);
      whoosh(x, sr, 0, 0.2, 1500, 5200, 1, 0.3, 1.4);
      const ice = noiseBand(len(sr, 0.3), sr, 'hp', 4200, 0.7, white);
      add(x, env(ice, sr, (t) => hit(t, 0.004, 0.06)), sr, 0.02, 0.5);
      return add(x, voice(sr, 0.25, { f: () => 150, buzz: 0, breath: 1, formants: [[800, 6, 1], [2200, 8, 0.5]],
        env: (t) => hit(t, 0.02, 0.06) }), sr, 0.01, 0.4);
    },
    // Caught in the flesh and undone: a whispered cry falling away, the thin air over it going out.
    unmade(sr) {
      const d = 0.8, x = buf(sr, d);
      add(x, voice(sr, d, { f: () => 150, buzz: 0, breath: 1,
        formants: [[(t) => 800 - 450 * t / d, 7, 1], [(t) => 1400 - 500 * t / d, 9, 0.7], [2600, 11, 0.35]],
        env: (t) => hit(t, 0.02, 0.28) }), sr, 0, 1);
      for (const f of [2600, 2750, 3100]) {
        const s0 = x.length, v = new Float32Array(s0); let ph = 0;
        for (let i = 0; i < s0; i++) { const t = i / sr; ph += TAU * f * (1 + 0.5 * t) / sr; v[i] = Math.sin(ph) * swell(t, d, 0.2, 1.5); }
        add(x, v, sr, 0, 0.05);
      }
      return x;
    },
    // A room left behind going dark: a slow breath drawn in, cut off, and the stone settling.
    veil(sr) {
      const d = 0.6, x = buf(sr, d);
      const inhale = noiseBand(x.length, sr, 'lp', 700, 0.7); filter(inhale, sr, 'hp', 150, 0.7);
      add(x, env(inhale, sr, (t) => swell(t, d * 0.8, 0.8, 2)), sr, 0, 1.4);
      return crackle(x, sr, d * 0.78, 0.1, 4, 600, 1600, 0.25, 1);
    },
    // COLD EYE: the world winding down — his own heart, twice, and a breath of air falling away.
    slow(sr) {
      const x = buf(sr, 0.6);
      modes(x, sr, rnd(95, 105), [[1, 0.05, 1], [1.7, 0.025, 0.3]], { bend: 0.3 });
      modes(x, sr, rnd(88, 96), [[1, 0.045, 0.7], [1.7, 0.025, 0.2]], { at: 0.22, bend: 0.3 });
      const air = pink(x.length); filter(air, sr, 'bp', (t) => 2200 * Math.pow(0.15, t / 0.6), 1);
      return add(x, env(air, sr, (t) => swell(t, 0.6, 0.15, 1.5)), sr, 0, 0.5);
    },
    // A card: a frame drum struck once, close — its skin's modes, bent down at the strike, choked.
    card(sr) {
      const x = buf(sr, 0.38), f0 = rnd(92, 102);
      modes(x, sr, f0, [[1, 0.1, 1], [1.59, 0.065, 0.5], [2.14, 0.05, 0.35], [2.3, 0.045, 0.3], [2.65, 0.035, 0.22], [2.92, 0.03, 0.18], [3.16, 0.025, 0.14]],
        { bend: 0.3, bendT: 0.03, spread: 0.008 });
      const skin = noiseBand(len(sr, 0.1), sr, 'lp', 1100, 0.8);
      return add(x, env(skin, sr, (t) => hit(t, 0.001, 0.018)), sr, 0, 0.8);
    },
    // A kill in a chain: a struck bone bar, one step higher each time (`GameAudio.sfxKill` sets the rate).
    kill(sr) {
      const x = buf(sr, 0.36);
      modes(x, sr, 300, [[1, 0.075, 1], [3.93, 0.03, 0.4], [9.54, 0.012, 0.2]], { spread: 0.004 });
      return click(x, sr, 0, 2400, 0.4, 0.0008);
    },
    // The lorry under them: a slow diesel knock, never quite even, and the body rattling on the road.
    // Half a second of it at a time, faded at both ends so back-to-back calls run on without a seam.
    engine(sr) {
      const d = 0.62, x = buf(sr, d), rate = rnd(24, 28);
      for (let t = 0; t < d; t += (1 / rate) * rnd(0.88, 1.12)) modes(x, sr, rnd(66, 80), [[1, 0.025, rnd(0.7, 1)], [2.3, 0.012, 0.35]], { at: t });
      filter(x, sr, 'lp', 420, 0.7);
      const rattle = noiseBand(x.length, sr, 'bp', 900, 0.8);
      add(x, env(rattle, sr, (t) => 0.5 + 0.5 * Math.sin(TAU * rate * t)), sr, 0, 0.25);
      add(x, noiseBand(x.length, sr, 'lp', 120, 0.7, brown), sr, 0, 0.8);
      return env(x, sr, (t) => Math.min(1, t / 0.08, (d - t) / 0.08));
    },
    // Somebody going over an edge: a man's shout running away downward and going dark as it goes,
    // and the air after it. What sells a hole is that the sound keeps going.
    fall(sr) {
      const d = 1.1, x = buf(sr, d);
      const v = voice(sr, d, { f: (t) => rnd(0.98, 1.02) * 205 * Math.pow(0.42, t / d), jit: 0.025, shim: 0.12, rough: 0.12, breath: 0.25, tilt: 2600,
        formants: [[(t) => 760 - 200 * t / d, 5, 1], [1150, 6, 0.55], [2500, 8, 0.3]], body: 0.2,
        env: (t) => (t < 0.03 ? t / 0.03 : Math.pow(1 - t / d, 1.4)), drive: 1.6 });
      filter(v, sr, 'lp', (t) => 5000 * Math.pow(0.12, t / d), 0.7);
      add(x, v, sr, 0, 1);
      return whoosh(x, sr, 0.06, d - 0.06, 300, 1100, 0.3, 0.4, 0.6);
    },
    // BAAAH: the goat's own voice, loud and ragged — two throats a fifth apart, one goat with weight.
    scream(sr) {
      const x = buf(sr, 0.72);
      add(x, bleat(sr, { f: 330, dur: 0.64, wob: 26, depth: 0.13, open: 1.8, breath: 0.22, rough: 0.12, drive: 2.2 }), sr, 0, 1);
      return add(x, bleat(sr, { f: 218, dur: 0.52, wob: 21, depth: 0.1, open: 1.6, breath: 0.1, rough: 0.1, drive: 1.8 }), sr, 0.02, 0.45);
    },
    // Any small bleat: the same throat at the pitch, shake and length it is asked for.
    bleat(sr, a) { return bleat(sr, a); },
    // A hen: short hard 'buk's with a catch in them; alarmed, a run of them ending in a long 'ba-GAWK'.
    // The wings make as much noise as the throat.
    cluck(sr, { alarm } = {}) {
      const base = alarm ? rnd(500, 560) : rnd(400, 460), x = buf(sr, alarm ? 0.5 : 0.28);
      const notes = alarm ? [[0, 0.06, 1], [0.09, 0.06, 1.05], [0.19, 0.22, 1.3]] : [[0, 0.07, 1], [0.1, 0.06, 1.15]];
      for (const [at, d, m] of notes) {
        add(x, voice(sr, d, { f: (t) => base * m * (1 + 0.3 * Math.sin(Math.PI * t / d)), jit: 0.04, shim: 0.2, rough: 0.25, breath: 0.35, tilt: 4000,
          formants: [[950, 4, 1], [2100, 6, 0.6], [3300, 8, 0.3]], env: (t) => hit(t, 0.004, d * 0.4), drive: 2 }), sr, at, 1);
      }
      const wings = noiseBand(len(sr, 0.3), sr, 'bp', 1500, 0.6);
      return add(x, env(wings, sr, (t) => swell(t, 0.3, 0.3, 1) * (0.5 + 0.5 * Math.sin(TAU * 17 * t))), sr, 0, alarm ? 0.6 : 0.3);
    },
    // A goose: a nasal, brassy honk, twice.
    goose(sr, { hurt } = {}) {
      const x = buf(sr, 0.42), f = hurt ? rnd(420, 460) : rnd(340, 380);
      for (const [at, m] of [[0, 1], [0.18, 1.08]]) {
        add(x, voice(sr, 0.16, { f: (t) => f * m * (1 + 0.05 * Math.sin(Math.PI * t / 0.16)), jit: 0.02, shim: 0.1, rough: 0.15, breath: 0.15, tilt: 5000,
          formants: [[1150, 6, 1], [2600, 8, 0.8], [3600, 10, 0.4], [600, 4, 0.35]], env: (t) => hit(t, 0.012, 0.07), drive: 3 }), sr, at, m === 1 ? 1 : 0.8);
      }
      return x;
    },
    // A crow: 'kaaw', harsh and noisy, rattling in the throat and falling at the end.
    crow(sr, { hurt } = {}) {
      const d = 0.28, f = hurt ? rnd(620, 680) : rnd(500, 560);
      return voice(sr, d, { f: (t) => f * (1 - 0.2 * t / d), jit: 0.06, shim: 0.3, rough: 0.45, breath: 0.5, tilt: 4000,
        formants: [[1300, 4, 1], [2300, 6, 0.6], [3400, 8, 0.25]], env: (t) => hit(t, 0.02, d * 0.35), drive: 2.5 });
    },
    // A horse: the whinny, a bright cry that climbs, shakes on a fast tremble and falls away into
    // the chest; hurt, it is higher and shorter.
    horse(sr, { hurt } = {}) {
      const d = hurt ? 0.5 : 0.85, f = hurt ? rnd(760, 820) : rnd(600, 660);
      return voice(sr, d, { f: (t) => f * (1 + 0.35 * Math.sin(Math.PI * Math.min(1, t / (d * 0.3)) * 0.5) - 0.55 * Math.max(0, t / d - 0.3)) * (1 + 0.07 * Math.sin(2 * Math.PI * 13 * t)),
        jit: 0.03, shim: 0.2, rough: 0.25, breath: 0.35, tilt: 4200,
        formants: [[850, 5, 1], [1700, 7, 0.55], [2900, 9, 0.3]], env: (t) => hit(t, 0.03, d * 0.5), drive: 2 });
    },
    // The tortoise has no voice: it knocks its shell on the slats, twice.
    tortoise(sr) {
      const x = buf(sr, 0.3);
      for (const [at, g] of [[0, 1], [0.14, 0.8]]) {
        modes(x, sr, rnd(380, 450), [[1, 0.025, 1], [2.2, 0.018, 0.6], [3.7, 0.01, 0.3]], { at, gain: g });
        modes(x, sr, rnd(100, 120), [[1, 0.03, 0.4]], { at, gain: g });
        click(x, sr, at, 2000, 0.4 * g, 0.0008);
      }
      return x;
    },
    // A hound: one bark, or two close together ('wuf-wuf'), the second a little lower.
    bark(sr) {
      const big = rnd(0.85, 1.15), l1 = rnd(0.13, 0.19), two = Math.random() < 0.35, x = buf(sr, two ? 0.5 : 0.3);
      add(x, barkOnce(sr, big, l1), sr, 0, 1);
      if (two) add(x, barkOnce(sr, big * 0.94, l1 * 0.9), sr, l1 + rnd(0.07, 0.11), 0.8);
      return x;
    },
    // The growl as he plants: a throat run too slow to sing, so the cycles come out as separate knocks.
    growl(sr) {
      const d = rnd(0.5, 0.65);
      return voice(sr, d, { f: (t) => 88 * (1 + 0.08 * Math.sin(TAU * 2.2 * t)), jit: 0.08, shim: 0.45, rough: 0.5, breath: 0.35, tilt: 1600,
        trem: { hz: 27, amp: 0.5, pitch: 0.04 }, formants: [[420, 3, 1], [1050, 4, 0.6], [2300, 6, 0.25]], body: 0.4,
        env: (t) => Math.min(1, t / 0.08, (d - t) / 0.12), drive: 2.2 });
    },
    // A jaw snapping shut: two hard clacks close together, tooth on tooth, and the breath he bit with.
    snap(sr) {
      const x = buf(sr, 0.22);
      click(x, sr, 0, rnd(2200, 3200), 1, 0.0008);
      modes(x, sr, rnd(1300, 1700), [[1, 0.01, 0.5], [2.4, 0.006, 0.3]]);
      click(x, sr, rnd(0.012, 0.02), rnd(1800, 2600), 0.6, 0.0008);
      const huff = noiseBand(len(sr, 0.15), sr, 'bp', 900, 0.7, white);
      return add(x, env(huff, sr, (t) => hit(t, 0.004, 0.045)), sr, 0, 0.5);
    },
    // One of the goat's hooves, running. A goat's hoof is cloven — two toes — so it lands as two
    // hard ticks a few milliseconds apart (horn on stone, small and bright), the hollow knock of the
    // hoof wall under them, only a little of the leg's weight, and a grain of grit scuffed. A tap,
    // not a click and not a thud (24 Sep 2026: "quieter, and like a real clop"). The shared `hoof`
    // above stays what the headbutt, the roll and LEAPFROG land with.
    hoof(sr) {
      const x = buf(sr, 0.07), toe = rnd(0.0025, 0.006), f = rnd(1500, 2100);
      for (const [at, g] of [[0, 1], [toe, rnd(0.45, 0.75)]]) {
        click(x, sr, at, rnd(3800, 5200), 0.5 * g, 0.00035, 1.4);
        modes(x, sr, f * (at ? rnd(0.9, 1.1) : 1), [[1, 0.0045, 0.55], [1.83, 0.003, 0.3], [2.9, 0.002, 0.15]], { at, gain: g });
      }
      modes(x, sr, rnd(620, 820), [[1, 0.012, 0.42], [1.6, 0.007, 0.18]], { at: 0.0008 });
      modes(x, sr, rnd(190, 240), [[1, 0.01, 0.14]], { at: 0.001 });
      const grit = noiseBand(len(sr, 0.03), sr, 'hp', 3000, 0.7, white);
      return add(x, env(grit, sr, (t) => hit(t, 0.001, 0.006)), sr, toe * 0.5, 0.05);
    },
    // A man dying: a short low 'uhh' let out as he goes, falling in pitch and closing toward an 'm'
    // as the breath runs out — the last air, not a shout, so a kill is heard apart from a knockdown
    // before the blood says so. `dog` is a hound's: a short whine that drops away.
    groan(sr, { dog } = {}) {
      if (dog) {
        const d = rnd(0.2, 0.28), f = rnd(680, 820), up = d * 0.2;
        return voice(sr, d, { f: (t) => f * (t < up ? 1 + 0.18 * t / up : 1.18 * Math.pow(0.55, (t - up) / (d - up))),
          jit: 0.02, shim: 0.12, rough: 0.1, breath: 0.4, tilt: 4000, formants: [[1100, 4, 1], [2400, 6, 0.45], [600, 3, 0.3]],
          body: 0.1, env: (t) => (t < 0.015 ? t / 0.015 : Math.exp(-(t - 0.015) / (d * 0.4))), drive: 1.4 });
      }
      const d = rnd(0.36, 0.52), f0 = rnd(100, 128), a = 0.05;
      return voice(sr, d, { f: (t) => f0 * (t < a ? 1 + 0.08 * t / a : 1.08 * Math.pow(0.7, (t - a) / (d - a))),
        jit: 0.03, shim: 0.18, rough: 0.22, breath: 0.45, tilt: 1800,
        formants: [[(t) => 620 - 240 * t / d, 4, 1], [(t) => 1150 - 260 * t / d, 5, 0.5], [2500, 7, 0.16]], body: 0.35, bodyF: 300,
        env: (t) => (t < a ? t / a : t < d * 0.35 ? 1 : Math.exp(-(t - d * 0.35) / (d * 0.22))), drive: 1.3 });
    },
    // His heart on the last heart: one soft thump under the ribs, a little body over it so a laptop
    // plays it at all. `GameAudio.heartbeat` calls it twice a beat, in time with the red at the edge.
    heart(sr) {
      const x = buf(sr, 0.3);
      modes(x, sr, rnd(56, 62), [[1, 0.07, 1], [2.1, 0.04, 0.5], [3.3, 0.025, 0.22]], { bend: 0.25, bendT: 0.02 });
      const th = noiseBand(x.length, sr, 'lp', 320, 0.7);
      return add(x, env(th, sr, (t) => hit(t, 0.004, 0.018)), sr, 0, 0.9);
    },
    // A drop off the roof of a cave: the water's bubble ringing up in pitch as it closes (that rise is
    // what a drip is), and the smallest splash.
    drip(sr) {
      const x = buf(sr, 0.16), f0 = rnd(750, 1500), n = x.length; let ph = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr; ph += TAU * f0 * (1 + 0.7 * (1 - Math.exp(-t / 0.018))) / sr;
        x[i] += Math.sin(ph) * hit(t, 0.0015, 0.03);
      }
      const sp = noiseBand(len(sr, 0.03), sr, 'hp', 3200, 0.7, white);
      return add(x, env(sp, sr, (t) => hit(t, 0.0008, 0.006)), sr, 0, 0.25);
    },
    // The milk grass, heard only when he is hurt and near it: three small glassy notes, high and soft.
    sparkle(sr) {
      const x = buf(sr, 0.9), base = rnd(1900, 2300);
      [0, rnd(0.07, 0.11), rnd(0.16, 0.24)].forEach((at, i) =>
        modes(x, sr, base * [1, 1.335, 1.5][i], [[1, 0.28, 1], [2.76, 0.09, 0.25]], { at, gain: [1, 0.75, 0.6][i] }));
      return x;
    },
    // The cult somewhere else in the compound: a frame drum beaten a long way off, through walls, so
    // only its low half arrives. Now and then, never under a fight (`TUNING.audio.ambience.far`).
    far(sr) {
      const beats = [[0, 1], [0.42, 0.55], [0.84, 0.8], [1.68, 1], [2.1, 0.55], [2.52, 0.8], [2.94, 0.6]];
      const x = buf(sr, 3.8), f0 = rnd(70, 80);
      for (const [at, g] of beats) {
        modes(x, sr, f0, [[1, 0.3, 1], [1.59, 0.14, 0.4], [2.14, 0.08, 0.25]], { at: at * rnd(0.98, 1.02), gain: g, bend: 0.1 });
        const slap = noiseBand(len(sr, 0.05), sr, 'lp', 700, 0.7);
        add(x, env(slap, sr, (t) => hit(t, 0.001, 0.015)), sr, at, 0.8 * g);
      }
      return filter(filter(x, sr, 'lp', 520, 0.7), sr, 'lp', 700, 0.5);
    },
  };

  // ---- the rooms' own sound (1.70): loops `GameAudio.updateAmbience` holds under everything ----
  // Each is rendered once, some seconds long, and crossfaded end into start (`loop`) so it repeats
  // without a seam; its level and which one plays are the floor's (`TUNING.audio.ambience.beds`).
  const AMB = {
    // Still air in stone: a low rumble that swells and settles, and the faint ring of the room in it.
    air(sr) {
      const d = 7, n = len(sr, d), x = filter(brown(n), sr, 'lp', 300, 0.6);
      add(x, filter(pink(n), sr, 'bp', 230, 1.1), sr, 0, 0.45);
      return env(x, sr, (t) => 0.72 + 0.2 * Math.sin(TAU * t * 2 / d) + 0.08 * Math.sin(TAU * t * 5 / d + 1));
    },
    // A cave: the same air in a hollow that rings at a few low notes of its own.
    cave(sr) {
      const d = 7, n = len(sr, d), x = filter(brown(n), sr, 'lp', 240, 0.6);
      for (const [f, q, g] of [[140, 7, 0.55], [262, 8, 0.4], [415, 9, 0.22]]) add(x, filter(pink(n), sr, 'bp', f, q), sr, 0, g * 2.4);
      return env(x, sr, (t) => 0.7 + 0.22 * Math.sin(TAU * t * 3 / d) + 0.08 * Math.sin(TAU * t * 7 / d + 2));
    },
    // Wind through boards and windows: a band of air that opens and closes with the gusts, and a thin
    // whistle over the strongest of them.
    wind(sr) {
      const d = 9, n = len(sr, d), gust = (t) => 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.sin(TAU * t * 3 / d - 1.2), 2);
      const x = filter(pink(n), sr, 'bp', (t) => 420 + 380 * gust(t) + 90 * Math.sin(TAU * t * 7 / d), 0.9);
      env(x, sr, gust);
      const wh = filter(white(n), sr, 'bp', (t) => 980 + 260 * Math.sin(TAU * t * 2 / d), 28);
      add(x, env(wh, sr, (t) => Math.pow(gust(t), 3)), sr, 0, 0.9);
      return add(x, filter(brown(n), sr, 'lp', 200, 0.6), sr, 0, 0.35);
    },
    // A fire: the low roar of it, never quite steady, a hiss of flame over that, and the crackle —
    // small ticks all the time and a proper pop now and then.
    blaze(sr) {
      const d = 3.2, n = len(sr, d), x = filter(brown(n), sr, 'lp', 260, 0.7);
      let lvl = 1, to = 1;
      for (let i = 0; i < n; i++) { if (i % Math.ceil(sr * 0.05) === 0) to = rnd(0.6, 1.2); lvl += (to - lvl) * 0.0008; x[i] *= lvl; }
      add(x, filter(pink(n), sr, 'bp', 1100, 0.5), sr, 0, 0.25);
      crackle(x, sr, 0, d, Math.round(d * 45), 1800, 6500, 0.35, 1);
      for (let k = 0; k < Math.round(d * 3); k++) {
        const at = rnd(0, d - 0.05);
        click(x, sr, at, rnd(900, 1600), rnd(0.5, 1), 0.0012, 0.9);
        modes(x, sr, rnd(380, 700), [[1, 0.012, 0.35]], { at });
      }
      return x;
    },
  };
  // Crossfade the last `fade` seconds of a take into its first ones, so the buffer loops seamlessly:
  // the loop point then joins what was continuous sound in the take.
  function loopify(x, sr, fade) {
    const m = len(sr, fade), n = x.length - m, out = x.slice(0, n);
    for (let i = 0; i < m; i++) { const u = i / m; out[i] = x[i] * Math.sqrt(u) + x[n + i] * Math.sqrt(1 - u); }
    return out;
  }
  // Rendered low: a room tone has nothing above a kilohertz or two, and a loop is seconds long, so
  // at the effects' own rate it cost a fifth of a second of main thread on a slow laptop.
  const LOOP_RATE = { air: 8000, cave: 8000, wind: 11025, blaze: 24000 };
  function loop(name) {
    const sr = LOOP_RATE[name], x = AMB[name](sr);
    filter(x, sr, 'hp', 45, 0.707);
    return normalize(loopify(x, sr, 0.8), 0.9);
  }

  // The room everything is heard in: small and close, a cell rather than a hall (1.66 took it from
  // 1.4 s to a third of a second — the effects read as far away and huge). Two channels of noise dying away over `decay`
  // seconds and darker as they die (stone holds the low end longest, `damp` how much), with the
  // nearest walls as a few distinct early reflections in front.
  function roomImpulse(ctx, decay, damp) {
    const sr = ctx.sampleRate, n = len(sr, decay), ir = ctx.createBuffer(2, n, sr), pre = 0.006;
    for (let c = 0; c < 2; c++) {
      const x = white(n);
      filter(x, sr, 'lp', (t) => 600 + 7000 * Math.exp(-t * damp * 4), 0.7);
      env(x, sr, (t) => (t < pre ? 0 : Math.exp(-6.9 * (t - pre) / decay)));
      for (const [at, level] of [[0.011, 0.5], [0.019, 0.38], [0.027, 0.3], [0.041, 0.22], [0.058, 0.15]]) {
        const i = Math.floor((at + c * 0.0031 * (level * 3)) * sr);
        if (i < n) x[i] += level * (Math.random() < 0.5 ? -1.6 : 1.6);
      }
      ir.getChannelData(c).set(x);
    }
    return ir;
  }

  // Everything that needs no arguments, for `GameAudio.warm` to render ahead of the first use.
  const plain = Object.keys(R).filter((k) => !['bleat', 'fuse'].includes(k));
  // The rate each recipe is rendered at; the context resamples on playback. Nothing here needs the
  // top octave of a 48 kHz buffer, and the low, long ones (a blast, a lorry, a throat) have nothing
  // above 12 kHz at all, so they render at half the cost of the rest.
  const LOW = new Set(['boom', 'engine', 'fall', 'scream', 'bleat', 'growl', 'wraith', 'unmade', 'veil', 'card', 'club', 'slow', 'cast', 'rune', 'bell', 'thud', 'roll', 'groan', 'heart', 'far']);
  // `far` arrives through walls with nothing above 700 Hz left in it.
  const rateOf = (name) => (name === 'far' ? 12000 : LOW.has(name) ? 24000 : 32000);
  const loopRate = (name) => LOOP_RATE[name];
  return { recipes: R, render: (name, args) => finish(R[name](rateOf(name), args || {}), rateOf(name)), rateOf, roomImpulse, plain,
    loops: Object.keys(AMB), loop, loopRate };
})();
