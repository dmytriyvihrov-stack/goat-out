// The itch.io upload: `index.html` at the root of a zip, flagged as the release (no dev drawer), and
// exactly the scripts it loads, nothing else. The dev drawer's ITCH BUILD button makes the same zip
// from the running page (js/release.js). Zipping the folder instead ships 500-odd files and the
// 175 MB of `tools/shots/`. Refuses a
// dirty tree unless told otherwise (a playtest build is cut from a commit, never from a tree another
// session is editing), names the zip after `BUILD` and the commit, and lists it back from the zip
// itself so what was checked is what will be uploaded.
//   node tools/itch-zip.js            -> dist/doomed-goat-<BUILD>-<commit>.zip
//   node tools/itch-zip.js --dirty    the same from a dirty tree (the name says so)
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib'), { execSync } = require('child_process');
const { ROOT, scriptsOf } = require('./script-lists.js');

const CRC = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (b) => { let x = 0xffffffff; for (const v of b) x = CRC[(x ^ v) & 255] ^ (x >>> 8); return (x ^ 0xffffffff) >>> 0; };

// A plain zip: one deflated entry per file, a central directory, no extras.
function zip(entries) {
  const parts = [], dir = []; let off = 0;
  const dos = new Date(), time = (dos.getHours() << 11) | (dos.getMinutes() << 5) | (dos.getSeconds() >> 1);
  const date = ((dos.getFullYear() - 1980) << 9) | ((dos.getMonth() + 1) << 5) | dos.getDate();
  for (const { name, data } of entries) {
    const nm = Buffer.from(name, 'utf8'), body = zlib.deflateRawSync(data, { level: 9 }), crc = crc32(data);
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6); h.writeUInt16LE(8, 8);
    h.writeUInt16LE(time, 10); h.writeUInt16LE(date, 12); h.writeUInt32LE(crc, 14); h.writeUInt32LE(body.length, 18); h.writeUInt32LE(data.length, 22);
    h.writeUInt16LE(nm.length, 26); h.writeUInt16LE(0, 28);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(8, 10);
    c.writeUInt16LE(time, 12); c.writeUInt16LE(date, 14); c.writeUInt32LE(crc, 16); c.writeUInt32LE(body.length, 20); c.writeUInt32LE(data.length, 24);
    c.writeUInt16LE(nm.length, 28); c.writeUInt32LE(off, 42);
    parts.push(h, nm, body); dir.push(c, nm); off += 30 + nm.length + body.length;
  }
  const cd = Buffer.concat(dir), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16);
  return Buffer.concat([...parts, cd, end]);
}

// Read the central directory back: names, sizes, and every entry inflated and CRC-checked.
function list(buf) {
  const end = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06])), n = buf.readUInt16LE(end + 10);
  let p = buf.readUInt32LE(end + 16); const out = [];
  for (let i = 0; i < n; i++) {
    const csize = buf.readUInt32LE(p + 20), size = buf.readUInt32LE(p + 24), nl = buf.readUInt16LE(p + 28), at = buf.readUInt32LE(p + 42), crc = buf.readUInt32LE(p + 16);
    const name = buf.toString('utf8', p + 46, p + 46 + nl), lnl = buf.readUInt16LE(at + 26), lel = buf.readUInt16LE(at + 28);
    const data = zlib.inflateRawSync(buf.subarray(at + 30 + lnl + lel, at + 30 + lnl + lel + csize));
    if (data.length !== size || crc32(data) !== crc) throw new Error('zip entry ' + name + ' does not read back');
    out.push({ name, size, csize }); p += 46 + nl;
  }
  return out;
}

const dirty = execSync('git status --porcelain', { cwd: ROOT }).toString().trim();
if (dirty && !process.argv.includes('--dirty')) { console.error('The tree is dirty; a playtest build is cut from a commit. --dirty to zip it anyway.\n' + dirty.split('\n').slice(0, 12).join('\n')); process.exit(1); }
const commit = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim();
const build = (fs.readFileSync(path.join(ROOT, 'js', 'tuning.js'), 'utf8').match(/const BUILD = '([^']+)'/) || [, 'x'])[1];
const scripts = scriptsOf('index.html');
for (const s of scripts) if (!fs.existsSync(path.join(ROOT, s))) { console.error('index.html loads a missing script: ' + s); process.exit(1); }
// The itch build is the release: its index.html sets `window.GOAT_RELEASE` ahead of every script, so
// there is no dev drawer in it and GOD MODE is a switch in SETTINGS (js/release.js, whose `flag` this
// reads, so the button in the dev drawer and this script make the same page).
const flag = (fs.readFileSync(path.join(ROOT, 'js', 'release.js'), 'utf8').match(/flag: '([^']+)'/) || [])[1];
const page = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), at = page.indexOf('<script src=');
if (!flag || at < 0) { console.error('no release flag to put in index.html'); process.exit(1); }
const entries = [{ name: 'index.html', data: Buffer.from(page.slice(0, at) + flag + '\n' + page.slice(at), 'utf8') }]
  .concat(scripts.map((s) => ({ name: s, data: fs.readFileSync(path.join(ROOT, s)) })));
const out = path.join(ROOT, 'dist', `doomed-goat-${build}-${commit}${dirty ? '-dirty' : ''}.zip`);
fs.mkdirSync(path.dirname(out), { recursive: true });
const buf = zip(entries); fs.writeFileSync(out, buf);
const back = list(fs.readFileSync(out)), raw = back.reduce((a, e) => a + e.size, 0);
for (const e of back) console.log(`${String(e.size).padStart(9)} ${String(e.csize).padStart(9)}  ${e.name}`);
console.log(`${back.length} files, ${(raw / 1048576).toFixed(2)} MiB unpacked, ${(buf.length / 1048576).toFixed(2)} MiB zipped -> ${path.relative(ROOT, out)}`);
