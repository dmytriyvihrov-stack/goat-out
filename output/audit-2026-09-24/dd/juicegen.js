// Renders JUICE.md the way tools/juice-md.js does, but into the scratch folder, and diffs it with the project's JUICE.md.
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = 'C:/Users/USER/Google Диск/Clod code/Goat out';
const ctx = { console, Math }; vm.createContext(ctx);
for (const f of ['js/tuning.js', 'js/juice.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const out = vm.runInContext('juiceMarkdown()', ctx);
fs.writeFileSync(path.join(__dirname, 'JUICE.regen.md'), out);
const cur = fs.readFileSync(path.join(root, 'JUICE.md'), 'utf8').replace(/\r\n/g, '\n');
console.log('effects', vm.runInContext('JUICE.length', ctx), 'identical', cur === out.replace(/\r\n/g, '\n'));
