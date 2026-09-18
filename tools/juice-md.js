// Writes JUICE.md from js/juice.js, the same list the JUICE tab of the level tool draws.
// node tools/juice-md.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..'), ctx = { console, Math };
vm.createContext(ctx);
for (const f of ['js/tuning.js', 'js/juice.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
fs.writeFileSync(path.join(root, 'JUICE.md'), vm.runInContext('juiceMarkdown()', ctx));
console.log('JUICE.md written:', vm.runInContext('JUICE.length', ctx), 'effects');
