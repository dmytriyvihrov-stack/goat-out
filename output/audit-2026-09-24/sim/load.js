// Headless loader for Goat out: vm-loads the build's own scripts (index.html order) with a universal
// DOM/canvas/audio stub, so the real Game can be constructed and stepped in node. Read-only on the build.
const fs = require('fs'), vm = require('vm'), path = require('path');
function anyStub(name) {
  const fn = function () { return proxy; };
  const store = {};
  const proxy = new Proxy(fn, {
    get(t, k) {
      if (k in store) return store[k];
      if (k === Symbol.toPrimitive) return (hint) => hint === 'number' ? 0 : '';
      if (k === 'then') return undefined;
      if (k === 'length') return 0;
      if (k === 'width' || k === 'height' || k === 'naturalWidth' || k === 'naturalHeight') return 64;
      if (k === 'currentTime' || k === 'sampleRate') return k === 'sampleRate' ? 48000 : 0;
      if (k === 'data') return new Uint8ClampedArray(4 * 64 * 64);
      if (k === 'measureText') return () => ({ width: 10, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 });
      if (k === 'getImageData' || k === 'createImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(4 * (w || 1) * (h || 1)), width: w || 1, height: h || 1 });
      if (k === 'getChannelData') return () => new Float32Array(1024);
      return proxy;
    },
    set(t, k, v) { store[k] = v; return true; },
    apply() { return proxy; },
    construct() { return anyStub(name + '()'); },
  });
  return proxy;
}
function seededMath(seed) {
  const M = Object.create(Math); let a = seed >>> 0;
  M.random = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  for (const k of Object.getOwnPropertyNames(Math)) if (k !== "random") M[k] = Math[k];
  return M;
}
function load(root, opts = {}) {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const files = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
  const listeners = {};
  const ls = new Map();
  const ctx = {
    console: opts.quiet ? { log() {}, warn() {}, error() {}, info() {} } : console,
    Math: opts.seed ? seededMath(opts.seed) : Math, JSON, Date, Uint8Array, Int16Array, Int32Array, Float32Array, Float64Array, Uint8ClampedArray, Uint16Array, Uint32Array, Int8Array,
    Map, Set, WeakMap, Promise, Symbol, Proxy, Reflect, Array, Object, String, Number, Boolean, Error, RegExp, ArrayBuffer, DataView,
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    requestAnimationFrame: () => 0, cancelAnimationFrame() {}, requestIdleCallback: () => 0,
    performance: { now: () => 0 },
    localStorage: { getItem: (k) => (ls.has(k) ? ls.get(k) : null), setItem: (k, v) => ls.set(k, String(v)), removeItem: (k) => ls.delete(k) },
    navigator: { userAgent: 'node', maxTouchPoints: 0, vibrate() {}, getGamepads: () => [] },
    location: { hash: '', search: '', href: 'http://localhost/' },
    Image: function () { return anyStub('img'); },
    AudioContext: function () { return anyStub('audio'); },
    OfflineAudioContext: function () { return anyStub('oaudio'); },
    addEventListener: (t, f) => { (listeners[t] = listeners[t] || []).push(f); },
    removeEventListener() {},
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    devicePixelRatio: 1, innerWidth: 1280, innerHeight: 720,
    atob: (s) => Buffer.from(s, 'base64').toString('binary'), btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
    fetch: () => Promise.resolve(anyStub('fetch')),
    OffscreenCanvas: function () { return anyStub('ocanvas'); },
    Path2D: function () { return anyStub('path'); },
  };
  ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
  ctx.document = anyStub('document');
  vm.createContext(ctx);
  const skip = new Set(opts.skip || []);
  for (const f of files) {
    if (skip.has(f)) continue;
    const src = fs.readFileSync(path.join(root, f), 'utf8');
    try { vm.runInContext(src, ctx, { filename: f }); }
    catch (e) { if (!opts.quiet) console.error('LOAD FAIL', f, e.message); if (opts.strict) throw e; }
  }
  ctx.__listeners = listeners;
  const grab = (n) => vm.runInContext(n, ctx);
  return { ctx, grab, run: (src) => vm.runInContext(src, ctx) };
}
module.exports = { load, anyStub };
