// Writes game.html (the game with the test lab on top) and files.json (the publish `files` map) off artifact.html's own
// script list, so the lab never drifts from the build. Run from anywhere: node output/test-lab-2026-10-16/build.js
const fs = require('fs'), path = require('path');
const here = __dirname, root = path.resolve(here, '../..');
const html = fs.readFileSync(path.join(root, 'artifact.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
const head = html.slice(0, html.indexOf('<script src='));
// Served off the disk the page sits two folders under the project (output/test-lab-…/game.html); published, next to js/.
// A supporting page gets no skeleton from the publish: its own doctype, charset and viewport.
const page = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n' + head + `<script>
(function () {
  const B = location.pathname.indexOf('/output/') >= 0 ? '../../' : '';
  const L = ${JSON.stringify(scripts)};
  for (const s of L) document.write('<script src="' + B + s + '"><\\/script>');
  document.write('<script src="testlab.js"><\\/script>');
})();
</script>
`;
fs.writeFileSync(path.join(here, 'game.html'), page);
const files = { 'game.html': 'output/test-lab-2026-10-16/game.html', 'testlab.js': 'output/test-lab-2026-10-16/testlab.js' };
for (const s of scripts) files[s] = s;
fs.writeFileSync(path.join(here, 'files.json'), JSON.stringify(files, null, 1));
console.log('game.html with', scripts.length, 'scripts; files.json', Object.keys(files).length, 'entries');
