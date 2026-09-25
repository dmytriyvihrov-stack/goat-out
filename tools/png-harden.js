// The last step of both pixel packers: the embedded atlas PNG, re-encoded smaller and nothing on
// screen changed. `System.Drawing` writes PNG with no say over compression, and the unit packer's
// bicubic downscale leaves about half the atlas at alpha 250–254, which `PIXEL_ART.init` snaps to 0
// or 255 on every load anyway. So here, once, at pack time:
//   js/pixel-assets.js      alpha hardened the way `PIXEL_ART.init` does it (>= 128 is 255, else 0),
//                           and the colour of every clear pixel zeroed;
//   js/pixel-env-assets.js  its alpha is already hard (`EnvClean`), so only clear pixels' colour;
// then both re-encoded with adaptive row filters at zlib level 9. Measured on 24 Sep 2026: the unit
// atlas 2.80 MB → 1.82 MB, the environment atlas 0.55 MB → 0.37 MB, the build 18% lighter.
// Lossy palettes are never an option: `PIXEL_ART.hornsOf` finds the horns by exact colour.
//   node tools/png-harden.js            both files, in place
//   node tools/png-harden.js --check    report only, write nothing
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');

const CRC = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc = (b) => { let x = 0xffffffff; for (const v of b) x = CRC[(x ^ v) & 255] ^ (x >>> 8); return (x ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const l = Buffer.alloc(4); l.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
const paeth = (a, b, c) => { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };

// 8-bit RGBA or RGB, not interlaced: what both packers write. Anything else is refused, not guessed.
function decode(buf) {
  let i = 8, ihdr = null; const idat = [];
  while (i < buf.length) {
    const len = buf.readUInt32BE(i), type = buf.toString('ascii', i + 4, i + 8), data = buf.subarray(i + 8, i + 8 + len);
    if (type === 'IHDR') ihdr = { w: data.readUInt32BE(0), h: data.readUInt32BE(4), depth: data[8], ct: data[9], il: data[12] };
    else if (type === 'IDAT') idat.push(data);
    i += 12 + len;
  }
  if (!ihdr || ihdr.depth !== 8 || ihdr.il || (ihdr.ct !== 6 && ihdr.ct !== 2)) throw new Error('unsupported PNG ' + JSON.stringify(ihdr));
  const ch = ihdr.ct === 6 ? 4 : 3, W = ihdr.w, H = ihdr.h, stride = W * ch, raw = zlib.inflateSync(Buffer.concat(idat));
  const out = Buffer.alloc(W * H * 4);
  let prev = Buffer.alloc(stride), p = 0;
  for (let y = 0; y < H; y++) {
    const f = raw[p++], line = Buffer.from(raw.subarray(p, p + stride)); p += stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? line[x - ch] : 0, b = prev[x], c = x >= ch ? prev[x - ch] : 0;
      line[x] = (line[x] + (f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : f === 4 ? paeth(a, b, c) : 0)) & 255;
    }
    for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 4;
      out[o] = line[x * ch]; out[o + 1] = line[x * ch + 1]; out[o + 2] = line[x * ch + 2]; out[o + 3] = ch === 4 ? line[x * 4 + 3] : 255;
    }
    prev = line;
  }
  return { W, H, px: out };
}

// Each row gets whichever of the five filters leaves the smallest sum of magnitudes.
function encode(W, H, px) {
  const stride = W * 4, raw = Buffer.alloc((stride + 1) * H), o = Buffer.alloc(stride);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < H; y++) {
    const line = px.subarray(y * stride, (y + 1) * stride);
    let bestF = 0, bestSum = Infinity, best = null;
    for (let f = 0; f < 5; f++) {
      let s = 0;
      for (let x = 0; x < stride; x++) {
        const a = x >= 4 ? line[x - 4] : 0, b = prev[x], c = x >= 4 ? prev[x - 4] : 0;
        const v = (line[x] - (f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : f === 4 ? paeth(a, b, c) : 0)) & 255;
        o[x] = v; s += v < 128 ? v : 256 - v;
      }
      if (s < bestSum) { bestSum = s; bestF = f; best = Buffer.from(o); }
    }
    raw[y * (stride + 1)] = bestF; best.copy(raw, y * (stride + 1) + 1); prev = line;
  }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(W, 0); ih.writeUInt32BE(H, 4); ih[8] = 8; ih[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9, memLevel: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

function harden(file, hardAlpha, check) {
  const src = fs.readFileSync(file, 'utf8'), key = '"src":"data:image/png;base64,';
  const at = src.indexOf(key); if (at < 0) throw new Error(file + ': no embedded PNG');
  const from = at + key.length, to = src.indexOf('"', from), before = Buffer.from(src.slice(from, to), 'base64');
  const { W, H, px } = decode(before), n = W * H;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    if (hardAlpha) px[o + 3] = px[o + 3] >= 128 ? 255 : 0;
    if (px[o + 3] === 0) px[o] = px[o + 1] = px[o + 2] = 0;
  }
  const after = encode(W, H, px);
  // Proof, not faith: the new file decodes to exactly the pixels meant, or nothing is written.
  const back = decode(after).px;
  if (!back.equals(px)) throw new Error(file + ': re-encoded atlas does not decode to the same pixels');
  const b64 = after.toString('base64');
  console.log(`${path.basename(file)}: ${W}x${H}, ${before.length} -> ${after.length} bytes (${Math.round(100 * after.length / before.length)}%)${check ? ', not written' : ''}`);
  if (!check && after.length < before.length) fs.writeFileSync(file, src.slice(0, from) + b64 + src.slice(to));
}

const check = process.argv.includes('--check'), root = path.join(__dirname, '..');
harden(path.join(root, 'js', 'pixel-assets.js'), true, check);
harden(path.join(root, 'js', 'pixel-env-assets.js'), false, check);
