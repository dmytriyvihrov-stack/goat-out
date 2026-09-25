const { load } = require('./load.js');
const L = load(process.argv[2], { quiet: true, seed: 1 });
L.run(`window.game = new Game(document.getElementById('game'));`);
const g = L.grab('game'), BOONS = L.grab('BOONS'), BOON_SLOTS = L.grab('BOON_SLOTS');
g.boons = []; g.applyBoons();
// Fill greedily until nothing is open: the most boons one goat can hold at once.
let added = true;
while (added) { added = false; for (const b of BOONS) { g.applyBoons(); if (g.boonOpen(b, 7)) { g.boons.push(b); added = true; } } }
g.applyBoons();
console.log('BOON_SLOTS', JSON.stringify(BOON_SLOTS), '-> max held', g.boons.length, 'of', BOONS.length);
const bySkill = {};
for (const b of BOONS) { const k = (b.skill || 'body') + (b.active ? ' active' : ' passive'); (bySkill[k] = bySkill[k] || []).push(b.id + (b.key ? '(key)' : '') + (b.needs ? '(needs ' + b.needs + ')' : '')); }
console.log(bySkill);
