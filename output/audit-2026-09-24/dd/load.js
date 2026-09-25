// Loads Goat out's data scripts into a vm context the way tools/balance.js does. Read-only.
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = 'C:/Users/USER/Google Диск/Clod code/Goat out';
function load(files) {
  const ctx = { console, Math, Uint8Array, Int16Array, Int32Array, Float32Array, Uint8ClampedArray, Map, Set, JSON, Object, Array, String, Number, Date };
  vm.createContext(ctx);
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
  return (name) => vm.runInContext(name, ctx);
}
module.exports = { load, root };
