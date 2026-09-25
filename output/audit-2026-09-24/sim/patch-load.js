const fs = require('fs'); let s = fs.readFileSync('load.js', 'utf8');
if (!s.includes('seededMath')) {
  s = s.replace('Math, JSON,', 'Math: opts.seed ? seededMath(opts.seed) : Math, JSON,');
  s = s.replace('function load(root, opts = {}) {', `function seededMath(seed) {
  const M = {}; for (const k of Object.getOwnPropertyNames(Math)) M[k] = Math[k];
  let a = seed >>> 0;
  M.random = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return M;
}
function load(root, opts = {}) {`);
  fs.writeFileSync('load.js', s);
}
