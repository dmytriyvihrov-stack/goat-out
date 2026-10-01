// The itch.io half of a deploy (1 Oct 2026: "on deploy, make the zip yourself, post it to itch and
// drop the old version"). Cuts the minified zip with tools/itch-zip.js and hands it to butler, itch's
// own uploader. butler pushes to a channel, and a channel holds one build: the new one replaces the
// old, so there is nothing to delete by hand.
//   node tools/itch-push.js             zip from a clean commit and push it
//   node tools/itch-push.js --dirty     the same from a dirty tree
//   node tools/itch-push.js --dry       zip and print the butler command, push nothing
// Once per machine, by the user (never by a session — the key is theirs):
//   butler from https://itch.io/docs/butler/installing.html, then `butler login` in a terminal.
// The page itself must already exist on itch (Kind of project: HTML), whatever its visibility:
// restricted stays restricted.
'use strict';
const path = require('path'), { execFileSync, spawnSync } = require('child_process');
const { ROOT } = require('./script-lists.js');

// <user>/<game> as in the page's URL (user.itch.io/game), and the channel the browser build lives on.
const TARGET = process.env.ITCH_TARGET || '';
const CHANNEL = 'html5';

if (!/^[\w-]+\/[\w-]+$/.test(TARGET)) { console.error('Set ITCH_TARGET to <user>/<game> (the itch page must exist, Kind: HTML).'); process.exit(1); }
const butler = spawnSync('butler', ['--version'], { encoding: 'utf8' });
const dry = process.argv.includes('--dry');
if (!dry && butler.status !== 0) { console.error('butler is not installed or not on PATH: https://itch.io/docs/butler/installing.html, then `butler login`.'); process.exit(1); }

// The zip, minified; its last line names the file.
const args = [path.join(__dirname, 'itch-zip.js')].concat(process.argv.includes('--dirty') ? ['--dirty'] : []);
const log = execFileSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8' });
const m = log.match(/-> (\S+\.zip)\s*$/);
if (!m || /-plain\.zip$/.test(m[1])) { console.error(log + '\nno minified zip to push'); process.exit(1); }
const zip = path.join(ROOT, m[1]), build = (m[1].match(/doomed-goat-([^-]+)-/) || [])[1] || 'x';
console.log(log.trim().split('\n').pop());

const push = ['push', zip, `${TARGET}:${CHANNEL}`, '--userversion', build];
if (dry) { console.log('butler ' + push.join(' ')); process.exit(0); }
const r = spawnSync('butler', push, { stdio: 'inherit' });
process.exit(r.status || 0);
