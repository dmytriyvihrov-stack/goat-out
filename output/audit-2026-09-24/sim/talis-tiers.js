// Every talisman tier's params side by side, from the build's own ARTIFACTS (read-only).
const { load } = require('./load.js');
const L = load(process.argv[2], { quiet: true, seed: 1 });
const A = L.grab('ARTIFACTS');
for (const a of A) {
  const keys = [...new Set(a.tiers.flatMap((t) => Object.keys(t.params || {})))];
  const row = keys.map((k) => `${k}:${a.tiers.map((t) => JSON.stringify((t.params || {})[k])).join('/')}`);
  console.log(a.id.padEnd(10), a.tag || '-', '|', row.join('  '));
}
