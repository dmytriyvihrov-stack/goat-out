// Patch a scratch copy's tuning.js: pairs of exact [from, to] strings, each must match once.
const fs = require('fs'); const [file, ...pairs] = process.argv.slice(2);
let s = fs.readFileSync(file, 'utf8');
for (let i = 0; i < pairs.length; i += 2) {
  const n = s.split(pairs[i]).length - 1;
  if (n !== 1) { console.error('match count', n, 'for', pairs[i]); process.exit(1); }
  s = s.replace(pairs[i], pairs[i + 1]);
}
fs.writeFileSync(file, s); console.log('patched', file, pairs.length / 2, 'edits');
