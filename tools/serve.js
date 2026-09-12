// Dev server: serves the game and accepts POST /shot (a data URL) to save canvas frames for review.
const http = require('http');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const port = Number(process.argv[2] || 8765);
const shotDir = process.argv[3] || path.join(root, 'tools', 'shots');
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
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  let file = path.join(root, urlPath === '/' ? 'index.html' : urlPath);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}).listen(port, '127.0.0.1', () => console.log('goat-out dev server on http://127.0.0.1:' + port));
