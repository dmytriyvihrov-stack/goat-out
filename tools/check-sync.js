// Checks that the three copies of the game agree: the working tree, origin/main,
// and the published artifact. Local things are checked outright; the artifact is
// checked by size against the listing Claude gets from `action: "list_files"`
// (paste it into a file and pass --artifact <file>), or printed for eyeballing.
//
//   node tools/check-sync.js
//   node tools/check-sync.js --artifact listing.txt
//
// Exits non-zero if anything is out of step.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const ARTIFACT_URL = 'https://claude.ai/code/artifact/098e742b-e742-4ce7-8499-a303fa5db021';
let failed = 0;

const git = (cmd) => execSync(`git ${cmd}`, { cwd: ROOT, encoding: 'utf8' }).trim();
const ok = (m) => console.log(`  ok    ${m}`);
const bad = (m, hint) => { failed++; console.log(`  FAIL  ${m}`); if (hint) console.log(`        ${hint}`); };
const head = (m) => console.log(`\n${m}`);

// --- the working tree ------------------------------------------------------
head('working tree');
const dirty = git('status --porcelain');
dirty ? bad('uncommitted changes', dirty.split('\n').join('\n        ')) : ok('clean');

const branch = git('rev-parse --abbrev-ref HEAD');
branch === 'main' ? ok('on main') : bad(`on ${branch}, not main`, 'a deploy means merging this into main and pushing it');

// --- local main vs origin/main --------------------------------------------
head('main vs origin/main');
try { execSync('git fetch --quiet origin', { cwd: ROOT }); } catch (e) { console.log('  note  could not fetch; using the last known remote state'); }
const [ahead, behind] = git('rev-list --left-right --count main...origin/main').split(/\s+/).map(Number);
if (!ahead && !behind) ok(`identical (${git('rev-parse --short main')})`);
else bad(`main is ${ahead} ahead, ${behind} behind origin/main`, ahead ? 'push it: git push origin main' : 'pull it: git pull --ff-only');

// --- every branch folded into main ----------------------------------------
head('branches');
const unmerged = git('branch -r --no-merged main').split('\n').map(s => s.trim()).filter(s => s && !s.includes('->'));
if (!unmerged.length) ok('every remote branch is merged into main');
else for (const b of unmerged) {
  const [a, be] = git(`rev-list --left-right --count main...${b}`).split(/\s+/).map(Number);
  bad(`${b} is not in main (${be} commit${be === 1 ? '' : 's'} it has, ${a} it lacks)`,
      `git log --oneline main..${b}  — then merge it or delete the branch`);
}

// --- the two HTML files ----------------------------------------------------
head('index.html vs artifact.html');
const scripts = (file) => (fs.readFileSync(path.join(ROOT, file), 'utf8')
  .match(/<script src="([^"]+)"><\/script>/g) || []).map(s => s.match(/src="([^"]+)"/)[1]);
const local = scripts('index.html'), art = scripts('artifact.html');
local.join() === art.join()
  ? ok(`the same ${local.length} scripts, in the same order`)
  : bad('script lists differ', `index.html: ${local.join(' ')}\n        artifact.html: ${art.join(' ')}`);

const onDisk = fs.readdirSync(path.join(ROOT, 'js')).filter(f => f.endsWith('.js')).map(f => `js/${f}`).sort();
const listed = [...new Set([...local, ...art])].sort();
const missing = onDisk.filter(f => !listed.includes(f));
const phantom = listed.filter(f => !onDisk.includes(f));
if (!missing.length && !phantom.length) ok(`all ${onDisk.length} files in js/ are loaded`);
if (missing.length) bad(`in js/ but in no script list: ${missing.join(', ')}`, 'a new file goes in both HTML files AND the publish files map');
if (phantom.length) bad(`loaded but not on disk: ${phantom.join(', ')}`);

// --- the published artifact ------------------------------------------------
head('published artifact');
const mine = new Map();
mine.set('index.html', null); // the page is wrapped on publish, so its size is not comparable
for (const f of onDisk) mine.set(f, fs.statSync(path.join(ROOT, f)).size);

const arg = process.argv.indexOf('--artifact');
if (arg === -1) {
  console.log('  note  no listing given. Ask Claude for action "list_files" on');
  console.log(`        ${ARTIFACT_URL}`);
  console.log('        and compare these byte counts, or save it and pass --artifact <file>:');
  for (const [f, n] of mine) if (n !== null) console.log(`          ${f.padEnd(16)} ${n}`);
} else {
  const before = failed;
  const text = fs.readFileSync(process.argv[arg + 1], 'utf8');
  const published = new Map();
  for (const m of text.matchAll(/"([^"]+)"\s+\S+\s+(\d+) bytes/g)) published.set(m[1], Number(m[2]));
  if (!published.size) bad('no "<path>  <type>  <n> bytes" lines found in that file');
  for (const [f, n] of mine) {
    if (n === null) continue;
    if (!published.has(f)) bad(`${f} is not published`, 'it is missing from the publish files map');
    else if (published.get(f) !== n) bad(`${f} differs: ${n} bytes here, ${published.get(f)} published`, 'republish the artifact');
  }
  for (const f of published.keys()) if (f !== 'index.html' && !mine.has(f)) bad(`${f} is published but gone from js/`, 'remove it with a null files entry');
  if (failed === before) ok(`all ${published.size - 1} scripts match the published build byte for byte`);
}

console.log(failed ? `\n${failed} thing${failed === 1 ? '' : 's'} out of step.` : '\nlocal, main and the artifact are one build.');
process.exit(failed ? 1 : 0);
