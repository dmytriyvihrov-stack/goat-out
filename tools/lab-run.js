// THE BOT LAB on its own (10 Oct 2026, his ask: "make it start and keep at it by itself, not tied to the session").
// A supervisor with no dependencies: it brings up tools/serve.js on its own port, opens the game in a Chrome of its
// own (headless, a profile of its own, timers never throttled) at `#lab=<hand>`, and watches the heartbeat
// tools/bot-lab.js posts (tools/lab/beat.json): stale for `--stale` minutes, or the browser gone, and the browser is
// started again; every `--recycle` minutes it is started fresh between runs. Runs land in tools/lab/runs.jsonl;
// the report is http://127.0.0.1:<port>/tools/bot-lab.html.
//   node tools/lab-run.js                     start (rotate the three hands), runs until stopped
//   node tools/lab-run.js --level weak --show a hand of its own, a visible window
//   node tools/lab-run.js stop | status
// tools/lab.cmd is the same for a double click. Its own log is tools/lab/lab.log.
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'tools', 'lab');
fs.mkdirSync(dir, { recursive: true });
const pidFile = path.join(dir, 'supervisor.pid'), beatFile = path.join(dir, 'beat.json'), logFile = path.join(dir, 'lab.log');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : d; };
const flag = (k) => process.argv.includes('--' + k);
const port = Number(arg('port', 8790));
const level = arg('level', 'rotate');
const staleMin = Number(arg('stale', 5));
const recycleMin = Number(arg('recycle', 180));
// `--browsers n` (default 1; three was too heavy beside other work, 10 Oct 2026): that many browsers at once, each a lane with a profile and a heartbeat of its own; with
// `--level rotate` the lanes take the hands in turn (strong, medium, weak), so every hand is always being played.
const lanesN = Math.max(1, Number(arg('browsers', 1)));
const HANDS = ['strong', 'medium', 'weak'];
const handOf = (lane) => level === 'rotate' && lanesN > 1 ? HANDS[(lane - 1) % 3] : level;
// The browser profile is kept off the synced project folder: a Chrome profile is thousands of small files.
const profileRoot = arg('profile', path.join(process.env.LOCALAPPDATA || os.tmpdir(), 'goat-out-lab'));

const log = (m) => { const line = `${new Date().toISOString()} ${m}`; console.log(line); try { fs.appendFileSync(logFile, line + '\n'); } catch (e) { } };
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return false; } };
const killTree = (pid) => { if (!pid) return; try { if (process.platform === 'win32') execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' }); else process.kill(-pid, 'SIGKILL'); } catch (e) { } };

const cmd = process.argv[2];
if (cmd === 'stop' || cmd === 'status') {
  let st = null; try { st = JSON.parse(fs.readFileSync(pidFile, 'utf8')); } catch (e) { }
  const beats = fs.readdirSync(dir).filter((n) => /^beat(-\d+)?\.json$/.test(n)).map((n) => { try { return JSON.parse(fs.readFileSync(path.join(dir, n), 'utf8')); } catch (e) { return null; } }).filter(Boolean);
  const runs = fs.existsSync(path.join(dir, 'runs.jsonl')) ? fs.readFileSync(path.join(dir, 'runs.jsonl'), 'utf8').split('\n').filter(Boolean).length : 0;
  if (cmd === 'status') {
    console.log(st && alive(st.pid) ? `running (supervisor ${st.pid}, port ${st.port}, hand ${st.level})` : 'not running');
    console.log(`runs written: ${runs}`);
    for (const b of beats) console.log(`  lane ${b.lane || 0} ${b.hand || '-'}: ${b.at} ${b.state} floor ${b.floor} room ${b.room != null ? b.room + 1 : '-'}/${b.rooms || '-'} hearts ${b.hp != null ? b.hp : '-'} run ${b.run || '-'}`);
    if (st) console.log(`report: http://127.0.0.1:${st.port}/tools/bot-lab.html`);
    process.exit(0);
  }
  if (!st) { console.log('not running'); process.exit(0); }
  killTree(st.pid); for (const c of [].concat(st.chrome || [])) killTree(c); killTree(st.server);
  if (process.platform === 'win32') try { execSync(`powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*goat-out-lab*' -or $_.CommandLine -like '*serve.js ${st.port}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"`, { stdio: 'ignore' }); } catch (e) { }
  try { fs.unlinkSync(pidFile); } catch (e) { }
  console.log('stopped'); process.exit(0);
}

// one supervisor at a time
try { const st = JSON.parse(fs.readFileSync(pidFile, 'utf8')); if (st.pid !== process.pid && alive(st.pid)) { console.log(`already running (pid ${st.pid}); "node tools/lab-run.js stop" first`); process.exit(1); } } catch (e) { }

function findChrome() {
  const L = process.env.LOCALAPPDATA || '', PF = process.env.ProgramFiles || 'C:\\Program Files', PF86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
  const list = [arg('chrome'), path.join(PF, 'Google/Chrome/Application/chrome.exe'), path.join(PF86, 'Google/Chrome/Application/chrome.exe'), path.join(L, 'Google/Chrome/Application/chrome.exe'),
    path.join(PF86, 'Microsoft/Edge/Application/msedge.exe'), path.join(PF, 'Microsoft/Edge/Application/msedge.exe'),
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
  return list.find((p) => p && fs.existsSync(p));
}
const chromePath = findChrome();
if (!chromePath) { log('no Chrome or Edge found; pass --chrome <path>'); process.exit(1); }

const up = () => new Promise((res) => { const r = http.get({ host: '127.0.0.1', port, path: '/lab/beat', timeout: 8000 }, (x) => { x.resume(); res(x.statusCode === 200); }); r.on('error', () => res(false)); r.on('timeout', () => { r.destroy(); res(false); }); });

const S = { server: null, lanes: [] };
for (let i = 1; i <= lanesN; i++) S.lanes.push({ lane: i, hand: handOf(i), chrome: null, at: 0, recycleDue: false });
const writePid = () => fs.writeFileSync(pidFile, JSON.stringify({ pid: process.pid, port, level, lanes: lanesN, server: S.server && S.server.pid, chrome: S.lanes.map((l) => l.chrome && l.chrome.pid).filter(Boolean), at: new Date().toISOString() }));

async function ensureServer() {
  // its own server still running is answer enough: three busy browsers can keep it past the probe's timeout
  if ((S.server && S.server.exitCode === null) || await up()) return;
  S.server = spawn(process.execPath, [path.join(root, 'tools', 'serve.js'), String(port)], { cwd: root, stdio: 'ignore', windowsHide: true });
  S.server.on('exit', (c) => { log(`server exited (${c})`); S.server = null; });
  for (let i = 0; i < 20 && !(await up()); i++) await new Promise((r) => setTimeout(r, 250));
  log(`server on http://127.0.0.1:${port}`); writePid();
}
function startChrome(L) {
  const profile = path.join(profileRoot, 'profile-' + L.lane);
  fs.mkdirSync(profile, { recursive: true });
  const args = [`--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--mute-audio', '--autoplay-policy=no-user-gesture-required',
    // the reason a hidden tab crawled: none of its timers may be slowed
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-features=CalculateNativeWinOcclusion,IntensiveWakeUpThrottling',
    '--window-size=1280,800', ...(flag('show') ? [] : ['--headless=new']),
    `http://127.0.0.1:${port}/#lab=${L.hand}&lane=${L.lane}`];
  L.chrome = spawn(chromePath, args, { stdio: 'ignore', windowsHide: !flag('show') });
  L.at = Date.now(); L.recycleDue = false;
  const me = L.chrome; L.chrome.on('exit', (c) => { log(`lane ${L.lane}: browser exited (${c})`); if (L.chrome === me) L.chrome = null; });
  log(`lane ${L.lane}: browser started (${path.basename(chromePath)}${flag('show') ? ', visible' : ', headless'}), hand ${L.hand}`); writePid();
}
function stopChrome(L, why) { if (!L.chrome) return; log(`lane ${L.lane}: restarting the browser: ${why}`); killTree(L.chrome.pid); L.chrome = null; }

// One watch at a time: a slow one overlapping the next started a second server and a second browser on a profile
// already in use (Chrome's exit 21), and the lanes killed each other in turn.
let watching = false;
async function watch() {
  if (watching) return; watching = true;
  try {
    await ensureServer();
    for (const L of S.lanes) {
      // one browser started a watch, so a machine already busy is not handed three cold starts at once
      if (!L.chrome) { startChrome(L); break; }
      const age = (Date.now() - L.at) / 60000;
      let beat = null; try { beat = JSON.parse(fs.readFileSync(path.join(dir, `beat-${L.lane}.json`), 'utf8')); } catch (e) { }
      const beatAt = beat ? Date.parse(beat.at) : 0, beatAge = beat ? (Date.now() - beatAt) / 60000 : Infinity;
      // a page that never spoke, or stopped speaking: started again (two minutes' grace to load)
      if (age > 3 && (beatAge > staleMin || beatAt < L.at - 1000)) { stopChrome(L, `no heartbeat for ${beatAge === Infinity ? 'ever' : beatAge.toFixed(1) + ' min'}`); startChrome(L); continue; }
      // fresh every `recycle` minutes, but never in the middle of a floor
      if (recycleMin > 0 && age > recycleMin) L.recycleDue = true;
      if (L.recycleDue && beat && beat.state !== 'play' && beat.state !== 'boon') { stopChrome(L, `recycle after ${Math.round(age)} min`); startChrome(L); }
    }
  } catch (e) { log('watch: ' + (e.message || e)); }
  watching = false;
}

process.on('SIGINT', () => { for (const L of S.lanes) killTree(L.chrome && L.chrome.pid); if (S.server) killTree(S.server.pid); try { fs.unlinkSync(pidFile); } catch (e) { } process.exit(0); });
log(`supervisor ${process.pid} up: port ${port}, ${lanesN} browser(s), hands ${S.lanes.map((l) => l.hand).join(' / ')}, profiles under ${profileRoot}`);
writePid(); watch(); setInterval(watch, 20000);
