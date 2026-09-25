const { load } = require('./load.js');
const g = load(['js/tuning.js', 'js/rng.js', 'js/rooms.js', 'js/gen.js', 'js/rules.js']);
const LEVELS = g('LEVELS'), TUNING = g('TUNING'), BOONS = g('BOONS'), ARTIFACTS = g('ARTIFACTS');
console.log('BUILD', g('BUILD'));
console.log('LEVELS', LEVELS.length);
let sum = 0, sumNet = 0;
for (const [i, d] of LEVELS.entries()) {
  const shop = TUNING.shop.levels.includes(i) || TUNING.shop.levels.includes(d.name);
  sum += d.souls || 0; sumNet += (d.souls || 0) - (shop ? 1 : 0);
  console.log(i + 1, d.name, 'rooms', d.rooms, 'souls', d.souls, 'shop', shop, 'arenas', JSON.stringify((d.arenas || []).map(a => a.boss)), 'gates', JSON.stringify(d.gates), 'hint', JSON.stringify(d.hint));
}
console.log('shop.levels', JSON.stringify(TUNING.shop.levels));
console.log('souls sum raw', sum, 'net of mouse', sumNet);
console.log('BOONS', BOONS.length, BOONS.map(b => `${b.id}:${b.name}:${b.kind || b.type || ''}`).join(' | '));
console.log('ARTIFACTS', ARTIFACTS.length, ARTIFACTS.map(a => a.id + ':' + a.name).join(' | '));
console.log('TUNING.soul', JSON.stringify(TUNING.soul));
console.log('goat.hp', TUNING.goat.hp);
console.log('PALETTE keys', Object.keys(g('PALETTE')).length);
console.log('MENU', JSON.stringify(g('MENU')), 'SETTINGS', JSON.stringify(g('SETTINGS')));
console.log('BOON_SLOTS', JSON.stringify(g('BOON_SLOTS')));
