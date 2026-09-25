// Claude Code hooks around a context compaction (wired in `.claude/settings.json`).
//
//   node tools/hooks/compact.js save      PreCompact: keeps the user's own words from this session
//   node tools/hooks/compact.js restore   SessionStart, matcher "compact": hands them back
//
// Why: the summary a compaction writes paraphrases, and in this project the user's wording IS the
// evidence (BACKLOG.md keeps it verbatim for that reason). A numbered list of asks that comes back as
// "the user asked for several audio fixes" has lost the thing a session is checked against. So before
// compacting, the user's messages are copied out of the transcript as they were typed, and after it
// they are put back in front of Claude together with the tree's state, which is read fresh.
//
// Files live in `.claude/session-state/` (gitignored), one per session, and are pruned after a week.
// Anything that goes wrong here stays silent and exits 0: this is a convenience, never a gate.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const DIR = path.join(ROOT, '.claude', 'session-state');
const KEEP = 12, EACH = 2500, TOTAL = 12000, WEEK = 7 * 24 * 3600 * 1000;

const stateFile = (id) => path.join(DIR, `${String(id || 'unknown').replace(/[^\w-]/g, '')}.md`);

// A user's typed message, or null for tool results, commands, notifications and earlier summaries.
function userText(entry) {
  if (!entry || entry.type !== 'user' || entry.isMeta || entry.isCompactSummary) return null;
  const m = entry.message;
  if (!m || m.role !== 'user') return null;
  let text = typeof m.content === 'string' ? m.content
    : Array.isArray(m.content) ? m.content.filter(b => b && b.type === 'text').map(b => b.text).join('\n') : '';
  text = text.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '').trim();
  // What the harness writes in the user's seat: slash-command echoes, `!` shell output, background
  // task notices, interruptions.
  if (!text || /^(<command-|<local-command|<bash-|<task-notification>|<user-prompt-submit-hook>|Caveat:|\[SYSTEM NOTIFICATION|\[Request interrupted)/.test(text)) return null;
  return text;
}

function save(input) {
  const lines = fs.readFileSync(input.transcript_path, 'utf8').split('\n');
  const asks = [];
  for (const line of lines) {
    if (!line) continue;
    let e; try { e = JSON.parse(line); } catch (err) { continue; }
    const t = userText(e);
    if (t) asks.push({ at: e.timestamp || '', text: t.length > EACH ? t.slice(0, EACH) + ' [...cut]' : t });
  }
  let kept = asks.slice(-KEEP), size = kept.reduce((n, a) => n + a.text.length, 0);
  while (kept.length > 1 && size > TOTAL) { size -= kept[0].text.length; kept = kept.slice(1); }
  if (!kept.length) return;
  fs.mkdirSync(DIR, { recursive: true });
  const body = [`# The user's words before a compaction (${input.trigger || 'auto'}, ${new Date().toISOString()})`,
    `${asks.length} message(s) this session; the last ${kept.length}, oldest first, exactly as typed.`, '',
    ...kept.map((a, i) => `## ${i + 1}${a.at ? ` (${a.at})` : ''}\n\n${a.text}\n`)].join('\n');
  fs.writeFileSync(stateFile(input.session_id), body, 'utf8');
  for (const f of fs.readdirSync(DIR)) {
    const p = path.join(DIR, f);
    try { if (Date.now() - fs.statSync(p).mtimeMs > WEEK) fs.unlinkSync(p); } catch (err) { /* another session's file, busy */ }
  }
}

function git(cmd) {
  try { return execSync(`git ${cmd}`, { cwd: ROOT, encoding: 'utf8', timeout: 5000, stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch (e) { return ''; }
}

function restore(input) {
  let file = stateFile(input.session_id);
  if (!fs.existsSync(file) && fs.existsSync(DIR)) {
    // A compaction that changed the session id: take the newest file written in the last ten minutes.
    const recent = fs.readdirSync(DIR).map(f => path.join(DIR, f))
      .map(p => ({ p, t: fs.statSync(p).mtimeMs })).filter(x => Date.now() - x.t < 10 * 60 * 1000).sort((a, b) => b.t - a.t)[0];
    if (recent) file = recent.p;
  }
  const words = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';

  const dirty = git('status --porcelain').split('\n').filter(Boolean);
  const [ahead, behind] = (git('rev-list --left-right --count HEAD...origin/main') || '0 0').split(/\s+/).map(Number);
  const tree = [
    '# The tree right now (read after the compaction, not remembered)',
    `branch ${git('rev-parse --abbrev-ref HEAD') || '?'}, ${ahead || 0} ahead / ${behind || 0} behind origin/main (last fetch)`,
    `last commits:\n${git('log --oneline -3').split('\n').map(l => '  ' + l).join('\n')}`,
    dirty.length ? `${dirty.length} uncommitted path(s), and some may be another session's:\n${dirty.slice(0, 20).map(l => '  ' + l).join('\n')}${dirty.length > 20 ? '\n  ...' : ''}` : 'working tree clean',
    '',
    'Standing reminders: BACKLOG.md before inventing work; every number in js/tuning.js; "deploy" means merge into main, push, and publish artifact.html to its one URL, then `node tools/check-sync.js`.',
  ].join('\n');

  const context = (words ? words + '\n' : '') + tree;
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: context } }));
}

try {
  const input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
  if (process.argv[2] === 'save') save(input);
  else if (process.argv[2] === 'restore') restore(input);
} catch (e) { /* silent by design */ }
process.exitCode = 0;
