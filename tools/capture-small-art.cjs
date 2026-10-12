// A single owned headless browser; reuse the project's server + H harness, no bot or dependencies.
const fs = require('fs'), path = require('path'), os = require('os'), { spawn } = require('child_process');
const root = path.resolve(__dirname, '..'), out = path.join(root, 'output', 'small-art-2026-10-12');
fs.mkdirSync(out, { recursive: true });
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'goat-small-art-'));
const port = 8773, sleep = ms => new Promise(r => setTimeout(r, ms));
const server = spawn(process.execPath, ['tools/serve.js', String(port), out], { cwd: root, windowsHide: true, stdio: 'ignore' });
const browser = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new', '--no-first-run', '--no-default-browser-check', '--mute-audio', '--remote-debugging-port=0',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--window-size=1280,800',
  '--user-data-dir=' + profile, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
let ws; const errors = [];
(async () => {
  const active = path.join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 100 && !fs.existsSync(active); i++) await sleep(200);
  const debug = fs.readFileSync(active, 'utf8').split('\n')[0];
  const tabs = await (await fetch('http://127.0.0.1:' + debug + '/json')).json();
  ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r, { once: true }));
  let id = 0; const pending = new Map();
  ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(m.error) : p.resolve(m.result); } else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails); });
  const call = (method, params = {}) => new Promise((resolve, reject) => { const key = ++id; pending.set(key, { resolve, reject }); ws.send(JSON.stringify({ id: key, method, params })); });
  const evaluate = async expression => { const r = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
  await call('Runtime.enable'); await call('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await call('Page.navigate', { url: 'http://127.0.0.1:' + port + '/#smallart' });
  for (let i = 0; i < 100; i++) { if (await evaluate('!!window.game?.renderer && typeof PIXEL_ART !== "undefined" && PIXEL_ART.ready && PIXEL_ENV.ready')) break; await sleep(200); }
  await evaluate(`(async () => {for(const src of ['/tools/harness.js','/tools/small-art-review.js']) await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.body.append(s);});})()`);
  const result = await evaluate('SMALL_ART_REVIEW()');
  result.errors = errors; fs.writeFileSync(path.join(out, 'validation.json'), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result));
  await call('Browser.close');
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => { if(ws) ws.close(); browser.kill(); server.kill(); });
