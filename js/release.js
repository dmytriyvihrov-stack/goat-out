// THE ITCH BUILD. `RELEASE.on` is true in the build that goes to itch.io: its index.html sets
// `window.GOAT_RELEASE` before the first script (`RELEASE.flag`), and the game then has no dev drawer
// and none of the tool's addresses (`#rules`, `#trip`, `#dark`, `#showroom`, `#dev`); GOD MODE is a
// switch in SETTINGS instead, for anybody who only wants to look round.
// `RELEASE.build(game)` is the dev drawer's ITCH BUILD button (26 Sep 2026: "a button in dev mode
// that makes the current version for itch, without dev mode"): the page zips itself — index.html
// with the flag in it and exactly the scripts it loads, nothing else — and hands the zip over as a
// download. `node tools/itch-zip.js` writes the same zip from a commit on the command line.
const RELEASE = {
  on: typeof window !== 'undefined' && !!window.GOAT_RELEASE,
  flag: '<script>window.GOAT_RELEASE = true;</script>',
  busy: false,

  // The page with the flag in it, ahead of every script so `tuning.js` onward all see it.
  flagged(html) {
    const at = html.indexOf('<script src=');
    return at < 0 ? null : html.slice(0, at) + RELEASE.flag + '\n' + html.slice(at);
  },
  // Every script this page loaded, in order, as index.html names them.
  scripts() {
    return [...document.querySelectorAll('script[src]')].map((s) => s.getAttribute('src'))
      .filter((s) => /^js\/[\w.-]+\.js$/.test(s));
  },
  // index.html off the server beside the page (the dev server); anywhere else — the published
  // artifact, whose `index.html` is artifact.html's own head, with no charset or viewport in it —
  // the same page written out here: keep it in step with index.html. Its script tags are always the
  // ones this page loaded, never the file's own, so an older list can never reach the zip.
  async page(scripts) {
    const tags = scripts.map((s) => `<script src="${s}"></script>\n`).join('');
    try {
      const r = await fetch('index.html', { cache: 'no-store' });
      if (r.ok) {
        const t = await r.text(), a = t.indexOf('<script src='), b = t.lastIndexOf('</script>');
        if (a > 0 && b > a && t.includes('<canvas id="game"') && t.includes('<meta name="viewport"') && t.includes('<meta charset'))
          return t.slice(0, a) + tags + t.slice(b + 9).replace(/^\r?\n/, '');
      }
    } catch (err) { /* no server beside the page */ }
    return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>DOOMED GOAT</title>\n'
      + '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">\n'
      + '<meta name="theme-color" content="#0d0a0c">\n<meta name="mobile-web-app-capable" content="yes">\n'
      + '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n'
      + '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
      + '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alegreya:wght@400;700&family=Alegreya+SC:wght@700&display=swap">\n'
      + '<style>\n  :root { color-scheme: dark; --ink: #0d0a0c; --bone: #efe6d0; --dim: #8c8078; --blood: #c0392b; }\n'
      + '  html, body { margin: 0; padding: 0; height: 100%; width: 100%; background: var(--ink); color: var(--bone);\n'
      + "    font-family: 'Alegreya', Georgia, 'Times New Roman', serif; overflow: hidden; overscroll-behavior: none;\n"
      + '    -webkit-user-select: none; user-select: none; -webkit-tap-highlight-color: transparent; }\n'
      + '  #game { position: fixed; inset: 0; width: 100%; height: 100%; display: block; background: var(--ink);\n'
      + '    touch-action: none; cursor: crosshair; }\n  #game:focus-visible { outline: none; }\n</style>\n</head>\n<body>\n'
      + '<canvas id="game" aria-label="Doomed Goat, a top-down escape game"></canvas>\n'
      + tags + '</body>\n</html>\n';
  },

  // A plain zip: one entry per file, deflated where the browser can (`CompressionStream`), stored
  // where it cannot, a central directory, no extras.
  crcTable: null,
  crc32(b) {
    const T = RELEASE.crcTable || (RELEASE.crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; }));
    let x = 0xffffffff; for (let i = 0; i < b.length; i++) x = T[(x ^ b[i]) & 255] ^ (x >>> 8);
    return (x ^ 0xffffffff) >>> 0;
  },
  async deflate(data) {
    if (typeof CompressionStream === 'undefined') return null;
    try { return new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer()); }
    catch (err) { return null; }
  },
  async zip(entries) {
    const parts = [], dir = [], d = new Date(), enc = new TextEncoder(); let off = 0;
    const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    for (const { name, data } of entries) {
      const nm = enc.encode(name), packed = await RELEASE.deflate(data), body = packed || data, method = packed ? 8 : 0, crc = RELEASE.crc32(data);
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, method, true);
      h.setUint16(10, time, true); h.setUint16(12, date, true); h.setUint32(14, crc, true); h.setUint32(18, body.length, true);
      h.setUint32(22, data.length, true); h.setUint16(26, nm.length, true);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, method, true);
      c.setUint16(12, time, true); c.setUint16(14, date, true); c.setUint32(16, crc, true); c.setUint32(20, body.length, true);
      c.setUint32(24, data.length, true); c.setUint16(28, nm.length, true); c.setUint32(42, off, true);
      parts.push(h, nm, body); dir.push(c, nm); off += 30 + nm.length + body.length;
    }
    const size = dir.reduce((a, p) => a + p.byteLength, 0), end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, entries.length, true); end.setUint16(10, entries.length, true);
    end.setUint32(12, size, true); end.setUint32(16, off, true);
    return new Blob([...parts, ...dir, end], { type: 'application/zip' });
  },

  // Where the zip goes. Framed as an artifact, the page cannot download anything itself: the viewer's
  // `downloads` asks the person and saves it (asked for now, on the press, if `Painting` has not
  // already been handed it). Anywhere else, a plain link clicked for them.
  async hand(blob, name) {
    const framed = typeof window.claude !== 'undefined' && window.claude && window.claude.use;
    if (framed) {
      let dl = typeof Painting !== 'undefined' ? Painting.dl : null;
      if (!dl) { try { dl = await window.claude.use('downloads'); } catch (err) { dl = null; } }
      if (!dl) throw new Error('this view cannot save files');
      try { await dl.save({ filename: name, data: blob }); }
      catch (err) { throw new Error(err && err.code === 'declined' ? 'the save was declined' : (err && (err.code || err.message)) || 'the save failed'); }
      return;
    }
    const a = document.createElement('a'), url = URL.createObjectURL(blob);
    a.href = url; a.download = name; a.style.display = 'none'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  },

  // The button. Says how it went in the drawer's toast, long enough to read; never throws into the frame.
  async build(game) {
    if (RELEASE.busy) return;
    RELEASE.busy = true;
    const say = (t, life = 6) => game.devToast(t, life);
    try {
      // Opened as a file off the disk, a page may not read its own scripts, so there is nothing to
      // pack: it has to be served (the dev server, or the published artifact).
      if (location.protocol === 'file:') throw new Error('opened as a file: run node tools/serve.js, or use the published page');
      say('ITCH BUILD: PACKING…', 30);
      const scripts = RELEASE.scripts(), html = RELEASE.flagged(await RELEASE.page(scripts));
      if (!html || !scripts.includes('js/game.js')) throw new Error('no page to pack');
      const enc = new TextEncoder(), entries = [{ name: 'index.html', data: enc.encode(html) }];
      for (const s of scripts) {
        const r = await fetch(s, { cache: 'no-store' });
        if (!r.ok) throw new Error(s + ' did not load (' + r.status + ')');
        entries.push({ name: s, data: new Uint8Array(await r.arrayBuffer()) });
      }
      const blob = await RELEASE.zip(entries), name = `doomed-goat-${BUILD}-itch.zip`;
      await RELEASE.hand(blob, name);
      say(`ITCH BUILD SAVED: ${name}, ${entries.length} FILES, ${(blob.size / 1048576).toFixed(1)} MB`);
    } catch (err) {
      say('ITCH BUILD FAILED: ' + String(err && err.message || err).slice(0, 80).toUpperCase(), 8);
    } finally { RELEASE.busy = false; }
  },
};
