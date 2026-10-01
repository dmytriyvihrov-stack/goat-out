// Dev server: serves the game, accepts POST /shot (a data URL) to save canvas frames for review,
// and POST /tuning-edit (JSON) to write one number the BOONS tab of the in-game tool changed back
// into js/tuning.js itself — see tools/tuning-patch.js for how that lands without disturbing
// anything else in the file.
const http = require('http');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const port = Number(process.argv[2] || 8765);
const shotDir = process.argv[3] || path.join(root, 'tools', 'shots');
const tuningFile = path.join(root, 'js', 'tuning.js');
fs.mkdirSync(shotDir, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.md': 'text/plain' };

http.createServer((req, res) => {
  if (req.method === 'POST' && req.url.startsWith('/shot')) {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const name = (new URL(req.url, 'http://x').searchParams.get('name') || 'shot').replace(/[^a-z0-9_-]/gi, '');
      const b64 = body.replace(/^data:image\/\w+;base64,/, '');
      const file = path.join(shotDir, name + '.png');
      fs.writeFileSync(file, Buffer.from(b64, 'base64'));
      res.writeHead(200, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
      res.end(file);
    });
    return;
  }
  // The GOD TALK page (tools/god-talk.html) writes the god's and the shepherd's lines back into
  // js/heaven.js: each object literal is swapped whole for the one the page sends, nothing else moves.
  if (req.method === 'POST' && req.url.startsWith('/talk-edit')) {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      try {
        const edit = JSON.parse(body), file = path.join(root, 'js', 'heaven.js');
        let src = fs.readFileSync(file, 'utf8');
        for (const name of ['HEAVEN_TALK', 'SHEPHERD_TALK', 'DEATH_TIPS']) {
          if (typeof edit[name] !== 'string') continue;
          const head = `const ${name} = `, a = src.indexOf(head), b = src.indexOf('\n};', a);
          if (a < 0 || b < 0) throw new Error(name + ' not found');
          src = src.slice(0, a) + head + edit[name].trim().replace(/;$/, '') + ';' + src.slice(b + 3);
        }
        fs.writeFileSync(file, src);
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.end(JSON.stringify({ ok: false, error: String(e.message || e) }));
      }
    });
    return;
  }
  if (req.method === 'POST' && req.url.startsWith('/tuning-edit')) {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      try {
        const edit = JSON.parse(body);
        const { applyEdit } = require('./tuning-patch.js');
        const before = fs.readFileSync(tuningFile, 'utf8');
        const after = applyEdit(before, edit);
        fs.writeFileSync(tuningFile, after);
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.end(JSON.stringify({ ok: false, error: String(e.message || e) }));
      }
    });
    return;
  }
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  let file = path.join(root, urlPath === '/' ? 'index.html' : urlPath);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}).listen(port, '127.0.0.1', () => console.log('goat-out dev server on http://127.0.0.1:' + port));
