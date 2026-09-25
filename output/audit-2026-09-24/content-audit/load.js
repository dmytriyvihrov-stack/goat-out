// Loads Goat out's scripts into a vm the way tools/balance.js does. READ-ONLY on the project.
// ROOT env var can point at a different copy (e.g. a HEAD export) for baseline diffs.
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = process.env.ROOT || 'C:/Users/USER/Google Диск/Clod code/Goat out';
function load(extra = []) {
  const ctx = { console, Math, Uint8Array, Int16Array, Int32Array, Float32Array, Uint16Array, Float64Array, Map, Set, JSON, Date,
    window: {}, document: { createElement: () => ({ getContext: () => ({}) }) }, localStorage: { getItem: () => null, setItem() {} },
    Image: function () {}, performance: { now: () => 0 }, navigator: {} };
  vm.createContext(ctx);
  const loaded = [], failed = [];
  for (const f of ['js/tuning.js', 'js/rng.js', 'js/rooms.js', 'js/gen.js', 'js/rules.js', ...extra]) {
    try { vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }); loaded.push(f); }
    catch (e) { failed.push(f + ': ' + e.message); }
  }
  const grab = (name) => { try { return vm.runInContext(name, ctx); } catch (e) { return undefined; } };
  return { ctx, grab, loaded, failed, ROOT };
}
module.exports = { load };
