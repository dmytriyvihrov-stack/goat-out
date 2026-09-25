// Claude Code hook, PreToolUse on Bash and on Artifact (wired in `.claude/settings.json`).
//
// The game goes live two ways: a push to main and a publish of `artifact.html`. Both have shipped a
// live page that broke while the local one worked, and nothing checked either at the moment it
// happened. This refuses the call (exit 2, the reason on stderr, which Claude reads) when:
//   - a publish of artifact.html goes to any URL but the game's own (it would make a second artifact),
//   - a publish leaves a script artifact.html loads out of the `files` map (the live page keeps the
//     stale copy, since files left out of a republish are kept),
//   - a publish declares `capabilities` without `downloads` (SAVE THE PICTURE hides itself),
//   - a publish or a push carries a file that does not parse, or script lists that have drifted.
// A push that carries generator changes gets a reminder to run `node tools/balance.js`, not a refusal:
// it takes minutes, and a hook that costs minutes on every push gets switched off.
//
// ⚠ A guard that is itself broken must never wedge a session, so any error inside it lets the call
// through. A push that is refused over another session's half-done file can say so and go:
// put `# prepush-ok: <why>` in the command.
//
// Try it without Claude:  echo '{"tool_name":"Bash","tool_input":{"command":"git push"}}' | node tools/hooks/guard.js

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execSync } = require('child_process');
const { ROOT, ARTIFACT_URL, scriptsOf, jsOnDisk } = require('../script-lists');

const GEN_FILES = ['js/gen.js', 'js/rooms.js', 'js/rules.js', 'js/tuning.js'];

// Compiles without running. The game's files are browser scripts; the tools are CommonJS, so they get
// the module wrapper node would give them (a top-level `return` is legal there).
function parseFailures(files) {
  const out = [];
  for (const f of files) {
    let src;
    try { src = fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch (e) { out.push(`${f}: cannot be read`); continue; }
    const code = f.startsWith('js/') ? src : `(function (exports, require, module, __filename, __dirname) {${src}\n})`;
    try { new vm.Script(code, { filename: f }); } catch (e) {
      const where = (String(e.stack).split('\n')[0] || '').trim();
      out.push(`${f} does not parse: ${e.message}${where && where !== e.message ? ` (${where})` : ''}`);
    }
  }
  return out;
}

function listFailures() {
  const local = scriptsOf('index.html'), art = scriptsOf('artifact.html'), onDisk = jsOnDisk();
  const out = [];
  if (local.join() !== art.join()) out.push('index.html and artifact.html load different script lists');
  const listed = new Set([...local, ...art]);
  for (const f of onDisk) if (!listed.has(f)) out.push(`${f} is in js/ but in no script list (it goes in both HTML files AND the publish files map)`);
  for (const f of listed) if (!onDisk.includes(f)) out.push(`${f} is loaded but not on disk`);
  return out;
}

const toolFiles = () => fs.readdirSync(path.join(ROOT, 'tools'))
  .filter(f => /\.(c?js)$/.test(f)).map(f => `tools/${f}`);

function checkPublish(input) {
  if (input.action && input.action !== 'publish') return null;
  if (input.asset || !input.file_path) return null;
  const base = input.root ? path.resolve(input.cwd || ROOT, input.root) : (input.cwd || ROOT);
  const page = path.resolve(base, input.file_path);
  if (path.basename(page) !== 'artifact.html' || path.dirname(page).toLowerCase() !== ROOT.toLowerCase()) return null;

  const out = [];
  const url = String(input.url || '').replace(/\/+$/, '');
  if (url !== ARTIFACT_URL) out.push(url
    ? `url is ${url}, not the game's own ${ARTIFACT_URL}`
    : `no url: this would publish a SECOND artifact. The game lives at ${ARTIFACT_URL}`);

  const loaded = scriptsOf('artifact.html');
  const files = input.files;
  const published = new Map();
  if (Array.isArray(files)) for (const e of files) published.set(e && e.path, e);
  else if (files && typeof files === 'object') for (const k of Object.keys(files)) published.set(k, files[k]);
  const left = loaded.filter(f => !published.has(f) || published.get(f) === null);
  if (left.length) out.push(`the files map leaves out ${left.length} of the ${loaded.length} scripts artifact.html loads: ${left.join(', ')}. ` +
    'Files left out of a republish keep their OLD copy on the live page; pass every file in js/, path to path.');

  if (input.capabilities && typeof input.capabilities === 'object' && Object.keys(input.capabilities).length && !input.capabilities.downloads)
    out.push('capabilities replaces the stored declaration whole and this one has no downloads: SAVE THE PICTURE would hide itself. Add downloads: true, or omit capabilities.');

  out.push(...listFailures(), ...parseFailures(jsOnDisk()));
  return out;
}

function checkPush(command) {
  // `git push`, `git -C dir push`, `git -c k=v push`; never `git stash push`.
  if (!/\bgit(\s+(-C\s+("[^"]*"|'[^']*'|\S+)|-c\s+\S+|--[\w-]+(=\S+)?))*\s+push\b/.test(command)) return null;
  if (/#\s*prepush-ok\b/.test(command)) return [];
  return [...listFailures(), ...parseFailures([...jsOnDisk(), ...toolFiles()])];
}

function generatorReminder() {
  try {
    const changed = execSync(`git diff --name-only origin/main -- ${GEN_FILES.join(' ')}`, { cwd: ROOT, encoding: 'utf8', timeout: 8000, stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (!changed) return null;
    return `This push carries changes to ${changed.split('\n').join(', ')}. If they touch who spawns where, which rooms go where or LEVELS, ` +
      'CLAUDE.md asks for `node tools/balance.js` (about 2.5 minutes) before it goes live. Run it now unless it already ran on this state.';
  } catch (e) { return null; }
}

function main() {
  let input;
  try { input = JSON.parse(fs.readFileSync(0, 'utf8')); } catch (e) { return 0; }
  const tool = input.tool_name, args = input.tool_input || {};

  let failures = null, reminder = null;
  if (tool === 'Artifact') failures = checkPublish(Object.assign({ cwd: input.cwd }, args));
  else if (tool === 'Bash') {
    failures = checkPush(String(args.command || ''));
    if (failures && !failures.length) reminder = generatorReminder();
  }
  if (!failures) return 0;

  if (failures.length) {
    const what = tool === 'Artifact' ? 'this publish of artifact.html' : 'this push';
    process.stderr.write(`Goat out's guard (tools/hooks/guard.js) refused ${what}:\n` +
      failures.map(f => `  - ${f}`).join('\n') + '\n' +
      (tool === 'Bash' ? 'Fix these, or, if they belong to another session\'s unfinished work and not to this push, add `# prepush-ok: <why>` to the command.\n' : ''));
    return 2;
  }
  if (reminder) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: reminder } }));
  return 0;
}

let code = 0;
try { code = main(); } catch (e) { code = 0; }
process.exitCode = code;
