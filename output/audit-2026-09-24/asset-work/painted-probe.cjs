// Driven probe: which of PAINTED_ASSETS' images does the game actually draw, with the pixel props on
// (the default) and with `#paintedprops`, and what happens if the pack is gone?
// Loads every script of index.html, in order, into a node vm with a stub DOM whose canvas context
// records every drawImage by the image it was handed. Never writes to the project.
//   node painted-probe.cjs <game dir> [on|off|empty] [--plant]
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const G = process.argv[2], MODE = process.argv[3] || 'on', PLANT = process.argv.includes('--plant');

const log = [];
const pngDims = (src) => {
  const m = /^data:image\/png;base64,(.{0,64})/.exec(src || ''); if (!m) return [0, 0];
  const b = Buffer.from(m[1].slice(0, 32), 'base64'); return [b.readUInt32BE(16), b.readUInt32BE(20)];
};
class FakeCtx {
  constructor(canvas) { this.canvas = canvas; this.imageSmoothingEnabled = true; this.globalAlpha = 1; }
  drawImage(img, ...a) { log.push({ tag: img && img.__tag || (img && img.__canvas ? 'canvas' : '?'), args: a.length }); }
  getTransform() { return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }; }
  createRadialGradient() { return { addColorStop() {} }; }
  createLinearGradient() { return { addColorStop() {} }; }
  createPattern() { return {}; }
  measureText() { return { width: 0 }; }
  getImageData(x, y, w, h) { return { data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h }; }
  createImageData(w, h) { return { data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h }; }
}
const ctxProxy = (canvas) => new Proxy(new FakeCtx(canvas), { get: (t, k) => (k in t ? t[k] : () => {}) });
class FakeCanvas { constructor() { this.width = 1; this.height = 1; this.__canvas = true; this.style = {}; } getContext() { return this._c || (this._c = ctxProxy(this)); } toDataURL() { return ''; } }
const pending = [];
class FakeImage {
  constructor() { this.naturalWidth = 0; this.naturalHeight = 0; this.onload = null; this.onerror = null; }
  set src(v) { this._src = v; const [w, h] = pngDims(v); pending.push(() => { if (w) { this.naturalWidth = this.width = w; this.naturalHeight = this.height = h; this.onload && this.onload(); } else this.onerror && this.onerror(); }); }
  get src() { return this._src; }
}
const sandbox = {
  console, Math, Date, JSON, Map, Set, WeakMap, Promise, Symbol, Proxy, Reflect, Object, Array, Number, String, Boolean, Error, RegExp,
  Uint8Array, Uint8ClampedArray, Int8Array, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array,
  setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {}, requestAnimationFrame: () => 0, performance: { now: () => 0 },
  Image: FakeImage, location: { hash: MODE === 'off' ? '#paintedprops' : '', search: '', href: 'http://x/' },
  navigator: { userAgent: 'node', maxTouchPoints: 0 }, devicePixelRatio: 1, innerWidth: 1280, innerHeight: 720,
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  matchMedia: () => ({ matches: false, addEventListener() {} }), addEventListener() {}, removeEventListener() {},
  AudioContext: undefined, webkitAudioContext: undefined, OffscreenCanvas: undefined,
  document: { createElement: (t) => (t === 'canvas' ? new FakeCanvas() : { style: {}, appendChild() {}, setAttribute() {} }), getElementById: () => new FakeCanvas(),
    addEventListener() {}, body: { appendChild() {} }, head: { appendChild() {} }, fonts: { load: () => Promise.resolve(), ready: Promise.resolve() }, hidden: false },
};
sandbox.window = sandbox; sandbox.globalThis = sandbox; sandbox.self = sandbox;
vm.createContext(sandbox);
const html = fs.readFileSync(path.join(G, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
for (const s of scripts) {
  let code = fs.readFileSync(path.join(G, s), 'utf8');
  if (MODE === 'empty' && s === 'js/painted-assets.js') code = 'const PAINTED_ASSETS = {};';
  try { vm.runInContext(code, sandbox, { filename: s }); } catch (e) { console.log('LOAD FAIL', s, e.message); }
}
const run = (c) => vm.runInContext(c, sandbox);
sandbox.__log = (t) => log.push({ tag: t });
run('{ const o = AltarArt.prototype.drawProp; AltarArt.prototype.drawProp = function (r, p) { __log("AltarArt.drawProp(old L1 primitive)"); return o.call(this, r, p); }; }');
const art = run('new PaintedArt()');
for (const [k, img] of Object.entries(art.images)) img.__tag = 'painted:' + k;
if (PLANT) { // the planted case: a painted image drawn directly must show up in the log
  run('0'); pending.splice(0).forEach((f) => f());
  art.stamp(new FakeCanvas().getContext('2d'), 'altar', 0, 0, 10);
}
pending.splice(0).forEach((f) => f());
run('PIXEL_ART.image && (PIXEL_ART.image.__tag = "pixel-units")');
run('PIXEL_ENV.image && (PIXEL_ENV.image.__tag = "pixel-env")');
console.log('mode', MODE, '| PROP_PIXELS.on =', run('typeof PROP_PIXELS !== "undefined" && PROP_PIXELS.on'), '| painted.ready =', art.ready,
  '| images', Object.keys(art.images).length, '| PIXEL_ART.ready', run('PIXEL_ART.ready'), '| PIXEL_ENV.ready', run('PIXEL_ENV.ready'));

const canvas = new FakeCanvas(), ctx = canvas.getContext('2d'), dctx = new FakeCanvas().getContext('2d');
const T = run('TUNING'), def = run('LEVELS[0]');
const RP = run('Renderer.prototype');
const renderer = new Proxy({ ctx, t: 1.3, game: { world: { dctx }, level: { def, seed: 1 } } }, {
  get: (t, k) => (k in t ? t[k] : (typeof RP[k] === 'function' ? function (...a) { log.push({ tag: 'renderer.' + String(k) }); } : undefined)),
});
const P = (kind, extra = {}) => Object.assign({ kind, x: 100, y: 100, r: (T.prop[kind] && T.prop[kind].r) || 12, vx: 0, vy: 0, phase: 0.3, hits: 0, wobble: 0, spillCd: 0 }, extra);
const cases = [
  ['altar', () => art.drawProp(renderer, P('table', { isAltar: true }))],
  ['lamp', () => art.drawProp(renderer, P('lamp'))],
  ['bell', () => art.drawProp(renderer, P('bell'))],
  ['cage h', () => art.drawProp(renderer, P('cage', { axis: 'h' }))],
  ['weapon sword in stand', () => art.drawProp(renderer, P('weapon', { weapon: 'sword', inStand: true }))],
  ['weapon shield lying', () => art.drawProp(renderer, P('weapon', { weapon: 'shield', inStand: false, uses: 0 }))],
  ['heal big', () => art.drawProp(renderer, P('heal', { big: true, graze: 0 }))],
  ['spike idle', () => art.drawProp(renderer, P('spike', { spikeState: 'idle', spikeT: 0 }))],
  ['spike up', () => art.drawProp(renderer, P('spike', { spikeState: 'up', spikeT: 0 }))],
  ['crate', () => art.drawProp(renderer, P('crate'))],
  ['barrel', () => art.drawProp(renderer, P('barrel', { oilT: -1 }))],
  ['brazier', () => art.drawProp(renderer, P('brazier'))],
  ['table', () => art.drawProp(renderer, P('table'))],
  ['door slab (wood)', () => art.doorSlab(ctx, P('door', { vertical: true }), 13, 58)],
  ['door slab (vault)', () => art.doorSlab(ctx, P('door', { vault: true, vertical: true }), 13, 58)],
  ['broken post', () => art.brokenPost({ world: { dctx } }, P('cage'))],
  ['broken door (iron)', () => art.brokenDoor({ world: { dctx } }, P('door', { iron: true, vertical: true }))],
  ['soul wisp body', () => art.soulWispBody(ctx, 20)],
  ['mill arm', () => art.millArm(ctx, 10, 80)],
  ['mill hub (render.js path)', () => (art.pixelProps ? art.millHub(ctx, 12) : art.ready && art.atlas(ctx, 'mill-hub', 0, 0, 26))],
  ['wall banner (drawTiles stamp)', () => art.stamp(ctx, 'banner', 0, 0, 13, 17, 0.2)],
];
const drawn = {};
for (const [name, fn] of cases) {
  log.length = 0; let ret;
  try { ret = fn(); } catch (e) { ret = 'THREW ' + e.message.slice(0, 60); }
  const tags = [...new Set(log.map((l) => l.tag))];
  for (const t of tags) if (t.startsWith('painted:')) (drawn[t] = drawn[t] || []).push(name);
  console.log(name.padEnd(30), String(ret).padEnd(9), tags.join(', ') || '(nothing drawn)');
}
console.log('\npainted images drawn:', Object.keys(drawn).length ? JSON.stringify(drawn) : 'NONE');
const never = Object.keys(art.images).filter((k) => !drawn['painted:' + k]);
console.log('painted images never drawn by these cases:', never.join(', ') || '-');
