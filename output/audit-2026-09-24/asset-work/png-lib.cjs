// Read-only PNG probe for the asset audit. For every base64 PNG in the given JS files (or a .png on
// disk) it decodes the pixels and re-encodes them in memory, printing what each variant would weigh.
// Nothing is written anywhere except stdout (and --dump <dir> for decoded PNGs, scratch only).
//   node png-probe.cjs <file.js|file.png> [...]
'use strict';
const fs = require('fs'), zlib = require('zlib'), path = require('path');

const CRC = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc = (b) => { let x = 0xffffffff; for (const v of b) x = CRC[(x ^ v) & 255] ^ (x >>> 8); return (x ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const l = Buffer.alloc(4); l.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };

function decode(buf) {
  const chunks = []; let i = 8, ihdr, idat = [], plte = null, trns = null;
  while (i < buf.length) {
    const len = buf.readUInt32BE(i), type = buf.toString('ascii', i + 4, i + 8), data = buf.slice(i + 8, i + 8 + len);
    chunks.push(type + ':' + len);
    if (type === 'IHDR') ihdr = { w: data.readUInt32BE(0), h: data.readUInt32BE(4), depth: data[8], ct: data[9], il: data[12] };
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'PLTE') plte = data;
    else if (type === 'tRNS') trns = data;
    i += 12 + len;
  }
  if (ihdr.depth !== 8 || ihdr.il) throw new Error('unsupported ' + JSON.stringify(ihdr));
  const ch = { 6: 4, 2: 3, 0: 1, 4: 2, 3: 1 }[ihdr.ct];
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const W = ihdr.w, H = ihdr.h, stride = W * ch, out = Buffer.alloc(W * H * 4);
  let prev = Buffer.alloc(stride), p = 0;
  for (let y = 0; y < H; y++) {
    const f = raw[p++], line = Buffer.from(raw.slice(p, p + stride)); p += stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? line[x - ch] : 0, b = prev[x], c = x >= ch ? prev[x - ch] : 0;
      let v = line[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      line[x] = v & 255;
    }
    for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 4;
      if (ch === 4) line.copy(out, o, x * 4, x * 4 + 4);
      else if (ch === 3) { out[o] = line[x * 3]; out[o + 1] = line[x * 3 + 1]; out[o + 2] = line[x * 3 + 2]; out[o + 3] = 255; }
      else if (ihdr.ct === 3) { const k = line[x]; out[o] = plte[k * 3]; out[o + 1] = plte[k * 3 + 1]; out[o + 2] = plte[k * 3 + 2]; out[o + 3] = trns && k < trns.length ? trns[k] : 255; }
      else if (ch === 1) { out[o] = out[o + 1] = out[o + 2] = line[x]; out[o + 3] = 255; }
      else { out[o] = out[o + 1] = out[o + 2] = line[x * 2]; out[o + 3] = line[x * 2 + 1]; }
    }
    prev = line;
  }
  return { W, H, ct: ihdr.ct, px: out, chunks };
}

// Adaptive filtering (min sum of abs per row), zlib level 9. `ch` 4 = RGBA, 3 = RGB, 1 = palette index.
function encode(W, H, rows, ch, ct, extra = []) {
  const stride = W * ch, raw = Buffer.alloc((stride + 1) * H);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < H; y++) {
    const line = rows(y); let best = null, bestSum = Infinity;
    for (let f = 0; f < (ch === 1 ? 1 : 5); f++) {
      const o = Buffer.alloc(stride); let s = 0;
      for (let x = 0; x < stride; x++) {
        const a = x >= ch ? line[x - ch] : 0, b = prev[x], c = x >= ch ? prev[x - ch] : 0;
        let pr = 0;
        if (f === 1) pr = a; else if (f === 2) pr = b; else if (f === 3) pr = (a + b) >> 1;
        else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
        const v = (line[x] - pr) & 255; o[x] = v; s += v < 128 ? v : 256 - v;
      }
      if (s < bestSum) { bestSum = s; best = [f, o]; }
    }
    raw[y * (stride + 1)] = best[0]; best[1].copy(raw, y * (stride + 1) + 1); prev = line;
  }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(W, 0); ih.writeUInt32BE(H, 4); ih[8] = 8; ih[9] = ct;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), ...extra,
    chunk('IDAT', zlib.deflateSync(raw, { level: 9, memLevel: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

function variants(name, buf) {
  const d = decode(buf), { W, H, px } = d, n = W * H;
  let clear = 0, partial = 0; const colors = new Set(), hardColors = new Set();
  for (let i = 0; i < n; i++) {
    const a = px[i * 4 + 3];
    if (a === 0) clear++; else if (a < 255) partial++;
    colors.add(px.readUInt32BE(i * 4));
    if (a >= 128) hardColors.add(px.readUIntBE(i * 4, 3));
  }
  const rowsOf = (P) => (y) => P.slice(y * W * 4, (y + 1) * W * 4);
  const same = encode(W, H, rowsOf(px), 4, 6);
  // hardened: what PIXEL_ART.init does on load (a >= 128 -> 255, else 0), and hidden RGB zeroed
  const hard = Buffer.from(px);
  for (let i = 0; i < n; i++) { if (hard[i * 4 + 3] >= 128) hard[i * 4 + 3] = 255; else hard.writeUInt32BE(0, i * 4); }
  const hardPng = encode(W, H, rowsOf(hard), 4, 6);
  // zeroed only: alpha untouched, RGB of fully clear pixels zeroed (lossless on screen)
  const z = Buffer.from(px); for (let i = 0; i < n; i++) if (z[i * 4 + 3] === 0) z.writeUInt32BE(0, i * 4);
  const zPng = encode(W, H, rowsOf(z), 4, 6);
  let pal = null;
  if (hardColors.size + 1 <= 256) {
    const idx = new Map([[-1, 0]]); const plte = [0, 0, 0]; const ids = Buffer.alloc(n);
    for (let i = 0; i < n; i++) {
      if (hard[i * 4 + 3] === 0) { ids[i] = 0; continue; }
      const c = hard.readUIntBE(i * 4, 3); if (!idx.has(c)) { idx.set(c, idx.size); plte.push(c >> 16, (c >> 8) & 255, c & 255); }
      ids[i] = idx.get(c);
    }
    pal = encode(W, H, (y) => ids.slice(y * W, (y + 1) * W), 1, 3, [chunk('PLTE', Buffer.from(plte)), chunk('tRNS', Buffer.from([0]))]);
  }
  const b64 = (b) => Math.ceil(b.length / 3) * 4;
  return { name, W, H, bytes: buf.length, chunks: d.chunks.filter((c) => !/^(IDAT|IHDR|IEND)/.test(c)).join(' ') || '-',
    clearPct: +(100 * clear / n).toFixed(1), partialPct: +(100 * partial / n).toFixed(1), colors: colors.size, opaqueColorsHardened: hardColors.size,
    reencode: same.length, zeroClear: zPng.length, hardened: hardPng.length, palette: pal ? pal.length : null,
    b64: { now: b64(buf), reencode: b64(same), zeroClear: b64(zPng), hardened: b64(hardPng), palette: pal ? b64(pal) : null } };
}

module.exports={decode,encode};