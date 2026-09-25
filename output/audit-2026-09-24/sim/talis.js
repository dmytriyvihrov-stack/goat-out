const B = String.fromCharCode(92);
// The talismans as the build holds them: every tier's params, whether each param moves one way
// across the tiers, whether the tier's own sentence (`desc`, the getter onto `say`) and the code
// that pays it (`apply` + js/talismans.js + the rest of js/) ever read it.
const fs = require('fs'), path = require('path');
const { load } = require('./load.js');
const root = process.argv[2];
const L = load(root, { quiet: true, seed: 1 });
const ARTIFACTS = L.grab('ARTIFACTS'), TUNING = L.grab('TUNING');
const code = ['talismans.js', 'shop.js', 'entities.js', 'enemies.js', 'game.js', 'gen.js', 'status.js', 'beasts.js', 'world.js', 'render.js']
  .map((f) => fs.readFileSync(path.join(root, 'js', f), 'utf8')).join('\n');
console.log('ARTIFACTS', ARTIFACTS.length, 'shop.levels', JSON.stringify(TUNING.shop.levels), 'crow.giftTier', TUNING.prop.crow.giftTier);
for (const a of ARTIFACTS) {
  const keys = [...new Set(a.tiers.flatMap((t) => Object.keys(t.params || {})))];
  const saySrc = String(a.say), applySrc = String(a.apply || '');
  const notes = [];
  for (const k of keys) {
    const vals = a.tiers.map((t) => (t.params || {})[k]);
    const nums = vals.filter((v) => typeof v === 'number');
    let dir = 0, mono = true;
    for (let i = 1; i < nums.length; i++) { const d = Math.sign(nums[i] - nums[i - 1]); if (d && dir && d !== dir) mono = false; if (d) dir = d; }
    const w = (x) => new RegExp(x); const inSay = w("p"+B+"." + k + B+"b").test(saySrc) || w(B+"b" + k + B+"b").test(saySrc);
    const paid = w(B+"." + k + B+"b").test(applySrc) || w(B+"." + k + B+"b").test(code);
    if (!mono) notes.push(`${k} not monotonic ${JSON.stringify(vals)}`);
    if (!inSay) notes.push(`${k} ${JSON.stringify(vals)} never said`);
    if (!paid) notes.push(`${k} never read by code`);
  }
  const descs = a.tiers.map((t, i) => { try { return t.desc; } catch (e) { return 'ERR ' + e.message; } });
  console.log(`- ${a.id} (${a.name}): params ${keys.join(',') || '-'}${notes.length ? '\n    ' + notes.join('\n    ') : ''}`);
  if (process.argv[3] === 'desc') descs.forEach((d, i) => console.log(`    ${'I'.repeat(i + 1)}: ${d}`));
}
