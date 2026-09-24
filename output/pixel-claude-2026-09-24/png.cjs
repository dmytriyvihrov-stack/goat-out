// Minimal PNG read/write on node's zlib: 8-bit RGB/RGBA, non-interlaced. Enough for the atlases the
// PowerShell packers write and for the sheets this folder renders.
const zlib = require('zlib');

const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = buf => { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function encode(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; rgba.copy ? rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4) : raw.set(rgba.subarray(y * w * 4, (y + 1) * w * 4), y * (w * 4 + 1) + 1); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

function decode(buf) {
  let p = 8, w, h, ct, idat = [], plte = null, trns = null;
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; if (d[8] !== 8 || d[12]) throw new Error('unsupported png'); }
    else if (type === 'PLTE') plte = d; else if (type === 'tRNS') trns = d; else if (type === 'IDAT') idat.push(d);
    p += 12 + len;
  }
  const bpp = { 6: 4, 2: 3, 3: 1, 0: 1, 4: 2 }[ct], raw = zlib.inflateSync(Buffer.concat(idat)), stride = w * bpp;
  const out = Buffer.alloc(w * h * 4), cur = Buffer.alloc(stride); let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      let v = row[i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      cur[i] = v & 255;
    }
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4, s = x * bpp;
      if (ct === 6) cur.copy(out, o, s, s + 4);
      else if (ct === 2) { out[o] = cur[s]; out[o + 1] = cur[s + 1]; out[o + 2] = cur[s + 2]; out[o + 3] = 255; }
      else if (ct === 3) { const k = cur[s]; out[o] = plte[k * 3]; out[o + 1] = plte[k * 3 + 1]; out[o + 2] = plte[k * 3 + 2]; out[o + 3] = trns && k < trns.length ? trns[k] : 255; }
      else if (ct === 0) { out[o] = out[o + 1] = out[o + 2] = cur[s]; out[o + 3] = 255; }
      else { out[o] = out[o + 1] = out[o + 2] = cur[s]; out[o + 3] = cur[s + 1]; }
    }
    prev = Buffer.from(cur);
  }
  return { w, h, data: out };
}

// A plain RGBA canvas with the few operations the sheet needs: fill, alpha blit, scaled blits.
class Img {
  constructor(w, h, bg) { this.w = w; this.h = h; this.data = Buffer.alloc(w * h * 4); if (bg) this.fill(0, 0, w, h, bg); }
  static hex(c) { const n = parseInt(c.slice(1), 16); return c.length > 7 ? [n >>> 24 & 255, n >>> 16 & 255, n >>> 8 & 255, n & 255] : [n >> 16 & 255, n >> 8 & 255, n & 255, 255]; }
  put(x, y, r, g, b, a) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || !a) return;
    const o = (y * this.w + x) * 4, d = this.data, k = a / 255;
    d[o] = d[o] * (1 - k) + r * k; d[o + 1] = d[o + 1] * (1 - k) + g * k; d[o + 2] = d[o + 2] * (1 - k) + b * k; d[o + 3] = Math.max(d[o + 3], a);
  }
  fill(x, y, w, h, c) { const [r, g, b, a] = Img.hex(c); for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.put(i, j, r, g, b, a); }
  // src: {w,h,data} RGBA; dst rect scaled nearest (smooth=false) or box-filtered (smooth=true)
  blit(src, sx, sy, sw, sh, dx, dy, dw, dh, smooth = false, alpha = 1) {
    for (let j = 0; j < dh; j++) for (let i = 0; i < dw; i++) {
      let r = 0, g = 0, b = 0, a = 0;
      if (!smooth) {
        const x = sx + Math.floor((i + 0.5) * sw / dw), y = sy + Math.floor((j + 0.5) * sh / dh), o = (y * src.w + x) * 4;
        r = src.data[o]; g = src.data[o + 1]; b = src.data[o + 2]; a = src.data[o + 3];
      } else {
        const x0 = sx + i * sw / dw, x1 = sx + (i + 1) * sw / dw, y0 = sy + j * sh / dh, y1 = sy + (j + 1) * sh / dh; let n = 0;
        for (let y = Math.floor(y0); y < Math.ceil(y1); y++) for (let x = Math.floor(x0); x < Math.ceil(x1); x++) {
          const o = (y * src.w + x) * 4, aa = src.data[o + 3]; r += src.data[o] * aa; g += src.data[o + 1] * aa; b += src.data[o + 2] * aa; a += aa; n++;
        }
        if (a) { r /= a; g /= a; b /= a; } a /= n;
      }
      this.put(dx + i, dy + j, r, g, b, a * alpha);
    }
  }
  png() { return encode(this.w, this.h, this.data); }
}

// 3x5 capitals and digits for the sheet's labels.
const GLYPH = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100',
  G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100', Q: '010101101110011', R: '110101110101101',
  S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111', 0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
  4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001110',
  ' ': '000000000000000', '-': '000000111000000', '/': '001001010100100', '.': '000000000000010', '·': '000000010000000',
};
function text(img, s, x, y, c, k = 2) {
  const [r, g, b] = Img.hex(c);
  for (const ch of s.toUpperCase()) {
    const gl = GLYPH[ch] || GLYPH[' '];
    for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (gl[j * 3 + i] === '1') for (let v = 0; v < k; v++) for (let u = 0; u < k; u++) img.put(x + i * k + u, y + j * k + v, r, g, b, 255);
    x += 4 * k;
  }
}

module.exports = { encode, decode, Img, text };
