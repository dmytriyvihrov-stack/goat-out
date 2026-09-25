const { load } = require('./load.js');
const g = load(['js/tuning.js']);
const T = g('TUNING');
const show = (o, d = 0, pre = '') => { for (const [k, v] of Object.entries(o)) { if (v && typeof v === 'object' && !Array.isArray(v) && d < 1) { console.log(pre + k + ': {' + Object.keys(v).join(', ') + '}'); } else console.log(pre + k + ': ' + JSON.stringify(v).slice(0, 200)); } };
console.log(Object.keys(T).join(', '));
for (const k of (process.argv[2] || '').split(',').filter(Boolean)) { console.log('== ' + k); const v = k.split('.').reduce((o, p) => o[p], T); show(v, 0, '  '); }
