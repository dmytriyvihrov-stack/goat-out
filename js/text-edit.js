// TEXT EDIT (2 Oct 2026, "a toggle, on and off, to edit any text"): the dev drawer's TEXT EDIT switch.
// While it is on, every string the game draws on the main canvas is written down with the box it
// covers on screen (`fillText` is wrapped below); the pointer outlines the one under it, and a click
// opens it in a small box to rewrite or delete. A click that lands on a dev button still presses it.
//
// Where the edit goes: the dev server (`tools/serve.js`, POST /text-edit) looks for the old text in
// the source, inside a string literal of one of js/*.js, and if it is there exactly once it is
// rewritten in place, so the edit is the code from then on. A text the game builds out of pieces (a
// number in it, a name filled in) is nowhere in the source whole: that one goes into `TEXT_EDITS`
// below, which the server writes back into this file and every build, the itch one too, draws over
// the original. Away from the server an edit is kept in this browser only (`TEXT_EDIT_KEY`).
// A line the renderer wraps is a line here: one wrapped line of a long text is edited on its own.
// Text drawn a letter at a time (a word that waves, a line typing itself out) cannot be picked.
const TEXT_EDITS = {
};
const TEXT_EDIT_KEY = 'goat-out-text-edits';

const TextEdit = {
  on: false,
  map: new Map(),        // drawn string -> what is drawn instead (TEXT_EDITS, then this browser's, then this session's)
  seen: [], seenN: 0,    // this frame's strings and their boxes, in canvas px
  canvas: null, hover: null, pointer: null, box: null, busy: false, game: null,
  src: new Map(),        // drawn string -> what its literal in js/*.js says now, once the server rewrote it there

  load() {
    this.map.clear();
    for (const [k, v] of Object.entries(TEXT_EDITS)) this.map.set(k, v);
    const rel = typeof window !== 'undefined' && window.GOAT_RELEASE;
    if (!rel) { try { const o = JSON.parse(localStorage.getItem(TEXT_EDIT_KEY) || '{}'); for (const [k, v] of Object.entries(o)) this.map.set(k, v); } catch (e) { /* no storage */ } }
  },
  keepLocal(from, to) {
    try { const o = JSON.parse(localStorage.getItem(TEXT_EDIT_KEY) || '{}'); if (to === null) delete o[from]; else o[from] = to; localStorage.setItem(TEXT_EDIT_KEY, JSON.stringify(o)); } catch (e) { /* no storage */ }
  },

  // The frame's list starts empty; at its end the one under the pointer is outlined.
  begin() { this.seenN = 0; },
  end(ctx) {
    if (!this.on) return;
    const p = this.pointer; this.hover = p ? this.at(p.x, p.y) : null;
    const was = this.on; this.on = false;   // what is drawn here is not itself editable
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    const k = Math.max(1, ctx.canvas.width / 1400);
    ctx.font = `700 ${Math.round(13 * k)}px ${typeof FONT_SC !== 'undefined' ? FONT_SC : 'serif'}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const label = 'TEXT EDIT · CLICK A TEXT TO REWRITE IT · OFF IN THE DEV DRAWER';
    const lw = textW(ctx, label) + 20 * k;
    ctx.fillStyle = 'rgba(120,20,30,0.85)'; ctx.fillRect(ctx.canvas.width / 2 - lw / 2, 4 * k, lw, 22 * k);
    ctx.fillStyle = '#ffe9a8'; ctx.fillText(label, ctx.canvas.width / 2, 8 * k);
    const h = this.hover;
    if (h) { ctx.strokeStyle = '#ff3b6b'; ctx.lineWidth = 2 * k; ctx.strokeRect(h.x - 2 * k, h.y - 2 * k, h.w + 4 * k, h.h + 4 * k); }
    ctx.restore(); this.on = was;
  },

  // A string drawn: where it lands on screen, through whatever transform the context holds.
  note(ctx, text, shown, x, y) {
    if (this.seenN >= 3000 || !text.trim()) return;
    const m = xform(ctx);
    const fm = /(\d+(?:\.\d+)?)px/.exec(ctx.font), h = fm ? +fm[1] : 10;
    const w = textW(ctx, shown);
    const al = ctx.textAlign, bl = ctx.textBaseline;
    const x0 = x - (al === 'center' ? w / 2 : al === 'right' || al === 'end' ? w : 0);
    const y0 = y - (bl === 'middle' ? h / 2 : bl === 'top' || bl === 'hanging' ? 0 : bl === 'bottom' || bl === 'ideographic' ? h : h * 0.8);
    let lx = Infinity, ly = Infinity, hx = -Infinity, hy = -Infinity;
    for (const [px, py] of [[x0, y0], [x0 + w, y0], [x0, y0 + h], [x0 + w, y0 + h]]) {
      const sx = m.a * px + m.c * py + m.e, sy = m.b * px + m.d * py + m.f;
      lx = Math.min(lx, sx); ly = Math.min(ly, sy); hx = Math.max(hx, sx); hy = Math.max(hy, sy);
    }
    if (hx < 0 || hy < 0 || lx > this.canvas.width || ly > this.canvas.height) return;
    const r = this.seen[this.seenN] || (this.seen[this.seenN] = {});
    r.x = lx; r.y = ly; r.w = hx - lx; r.h = hy - ly; r.text = text; r.shown = shown;
    this.seenN++;
  },
  // The text under a point: the smallest box that holds it (a word over a panel, not the panel's title).
  at(x, y) {
    let best = null;
    for (let i = 0; i < this.seenN; i++) {
      const r = this.seen[i];
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h && (!best || r.w * r.h <= best.w * best.h)) best = r;
    }
    return best ? { x: best.x, y: best.y, w: best.w, h: best.h, text: best.text, shown: best.shown } : null;
  },

  toggle(game) {
    this.on = !this.on; this.game = game;
    if (!this.on) { this.hover = null; this.close(); }
    return this.on;
  },
  // Hooked once, on the game's canvas, ahead of the game's own pointer handlers.
  hook(game) {
    this.game = game; this.canvas = game.canvas; this.load();
    const c = game.canvas;
    c.addEventListener('pointermove', (e) => { if (this.on) this.pointer = game.canvasPos(e); });
    c.addEventListener('pointerdown', (e) => {
      if (!this.on || this.box) return;
      const p = game.canvasPos(e);
      if (game.dev && game.dev.rects.some((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h)) return;
      const t = this.at(p.x, p.y); if (!t) return;
      // The game never sees this press, so it is told the button is down: otherwise its pointermove
      // read the held button as a new press and the goat headbutted.
      if (e.pointerType === 'mouse') game.mouseButtons = e.buttons;
      e.stopImmediatePropagation(); e.preventDefault();
      this.open(t);
    }, true);
  },

  // The box: the text as it stands, SAVE, DELETE (draws nothing), BACK TO ORIGINAL, CANCEL.
  open(t) {
    const rect = this.canvas.getBoundingClientRect(), k = rect.width / this.canvas.width;
    const was = this.map.has(t.text);
    const btns = [['SAVE', (v, st) => this.save(t.text, v, st)], ['DELETE', (v, st) => this.save(t.text, '', st)]];
    if (was) btns.push(['BACK TO ORIGINAL', (v, st) => this.save(t.text, null, st)]);
    this.panel('TEXT EDIT', was ? 'edited; the original: ' : 'as it is in the game: ', t.text, t.shown,
      { x: rect.left + t.x * k, y: rect.top + (t.y + t.h) * k + 8 }, btns);
  },
  // The one box both editors open (TEXT EDIT and the BOONS tab's souls): a title, what the text was, a
  // textarea, `btns` ([label, fn(value, statusLine)], the first is what Enter presses) and CANCEL.
  // `at` is a point in CSS px; the box is held on the screen.
  panel(title, label, was, value, at, btns) {
    this.close();
    const g = this.game, box = this.box = document.createElement('div');
    box.style.cssText = 'position:fixed;z-index:50;background:#16121c;border:2px solid #e0ac3e;padding:10px;color:#efe6d0;font:14px Alegreya,Georgia,serif;width:min(520px,92vw);box-shadow:0 6px 24px rgba(0,0,0,.6)';
    box.style.left = Math.max(8, Math.min(window.innerWidth - 540, at.x)) + 'px';
    box.style.top = Math.max(8, Math.min(window.innerHeight - 220, at.y)) + 'px';
    box.innerHTML = '<div class="t" style="font:700 12px \'Alegreya SC\',serif;color:#f7d774;margin-bottom:6px"></div>'
      + '<div style="font-size:12px;opacity:.6;margin-bottom:4px"><span class="l"></span><span class="o"></span></div>'
      + '<textarea style="width:100%;min-height:60px;background:#0f0c14;color:#efe6d0;border:1px solid rgba(239,230,208,.2);font:14px/1.4 Consolas,monospace;padding:6px;box-sizing:border-box"></textarea>'
      + '<div class="r" style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap"></div><div class="st" style="font-size:12px;opacity:.7;margin-top:6px"></div>';
    box.querySelector('.t').textContent = title;
    box.querySelector('.l').textContent = label || '';
    box.querySelector('.o').textContent = was || '';
    const ta = box.querySelector('textarea'); ta.value = value;
    const row = box.querySelector('.r'), st = box.querySelector('.st');
    const btn = (label, fn) => { const b = document.createElement('button'); b.textContent = label; b.style.cssText = 'font:700 12px \'Alegreya SC\',serif;background:rgba(247,215,116,.12);color:#efe6d0;border:1px solid #e0ac3e;padding:4px 10px;cursor:pointer'; b.onclick = fn; row.appendChild(b); };
    for (const [l, fn] of btns) btn(l, () => fn(ta.value, st));
    btn('CANCEL', () => this.close());
    ta.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter' && !e.shiftKey && btns.length) { e.preventDefault(); btns[0][1](ta.value, st); }
      if (e.key === 'Escape') this.close();
    });
    box.addEventListener('pointerdown', (e) => e.stopPropagation());
    document.body.appendChild(box); ta.focus(); ta.select();
    if (g && g.keys) g.keys.clear();
    return { ta, st };
  },
  close() { if (this.box) { this.box.remove(); this.box = null; } },

  // `to` null takes the edit back off. Shown at once; then the server puts it in the source.
  async save(from, to, st) {
    if (to === null) this.map.delete(from); else this.map.set(from, to);
    st.textContent = 'saving…';
    // A text already rewritten in the source is edited against what the source says now: asked for by
    // its old words, the server found nothing and parked the edit in TEXT_EDITS under a dead key.
    const cur = this.src.get(from), body = cur !== undefined
      ? { from: cur, to: to === null ? from : to, edits: TEXT_EDITS } : { from, to, edits: this.serverEdits(from, to) };
    let r;
    try { r = await (await fetch('/text-edit', { method: 'POST', body: JSON.stringify(body) })).json(); }
    catch (e) { this.keepLocal(from, to); this.toast('NO DEV SERVER: KEPT IN THIS BROWSER ONLY'); this.close(); return; }
    // The server answered and said no: say why, and keep nothing behind its back.
    if (!r || !r.ok) { st.textContent = 'REFUSED: ' + ((r && r.error) || 'no reason given'); return; }
    this.keepLocal(from, null);
    if (r.where === 'source') { delete TEXT_EDITS[from]; if (to === null) this.src.delete(from); else this.src.set(from, to); }
    else if (to === null) delete TEXT_EDITS[from]; else TEXT_EDITS[from] = to;
    this.toast(r.where === 'source' ? 'REWRITTEN IN ' + r.file : to === null ? 'BACK TO THE ORIGINAL' : 'KEPT IN TEXT_EDITS (js/text-edit.js)');
    this.close();
  },
  // What `TEXT_EDITS` should hold once this edit is in: the file's own entries, this one changed.
  serverEdits(from, to) {
    const o = Object.assign({}, TEXT_EDITS);
    if (to === null) delete o[from]; else o[from] = to;
    return o;
  },
  toast(t) { if (this.game && this.game.devToast) this.game.devToast(t); },
};

// The BOONS tab's EDIT NAME / EDIT TEXT / DELETE (6 Oct 2026: "delete / change text on the tools page;
// he opens index.html, sometimes straight from file://"). Served by tools/serve.js, an edit is written
// into js/tuning.js (POST /boon-edit, tools/text-patch.js `editBoon`: the literal where it stands, else
// `BOON_TEXT`; a delete into `BOON_OFF`). Opened as a file there is no server to write to, so the edit is
// kept in this browser (`BOON_EDIT_KEY`), laid on at every load here, and EXPORT copies it as JSON for
// IMPORT on a served page, which writes it to disk. A deleted soul is `b.off`: never dealt (`Game.boonOpen`,
// `boonSwaps`), still in the deck, so a saved run that holds one still loads.
const BOON_EDIT_KEY = 'goat-out-boon-edits';
const BoonEdit = {
  orig: {},            // id -> { name, desc } as the source had them (desc a property descriptor), before any edit
  noServer: false,     // a write was tried and nobody answered: everything since is this browser's
  fileMode() { return typeof location !== 'undefined' && location.protocol === 'file:'; },
  release() { return typeof window !== 'undefined' && !!window.GOAT_RELEASE; },

  // { text: { id: { name, desc } }, off: { id: true | false } }: this browser's own, off the server
  local() {
    try { const o = JSON.parse(localStorage.getItem(BOON_EDIT_KEY) || '{}'); return { text: o.text || {}, off: o.off || {} }; }
    catch (e) { return { text: {}, off: {} }; }
  },
  keep(o) { try { localStorage.setItem(BOON_EDIT_KEY, JSON.stringify(o)); } catch (e) { /* no storage */ } },
  localCount() { const o = this.local(); return Object.values(o.text).reduce((n, t) => n + Object.keys(t).length, 0) + Object.keys(o.off).length; },

  // Once at load: the source's words noted, then BOON_TEXT, then (never in the itch build) this browser's.
  apply() {
    if (typeof BOONS === 'undefined') return;
    const L = this.release() ? { text: {}, off: {} } : this.local();
    for (const b of BOONS) {
      if (!this.orig[b.id]) this.orig[b.id] = { name: b.name, desc: Object.getOwnPropertyDescriptor(b, 'desc') };
      const t = Object.assign({}, (typeof BOON_TEXT !== 'undefined' && BOON_TEXT[b.id]) || {}, L.text[b.id] || {});
      if (typeof t.name === 'string') this.set(b, 'name', t.name);
      if (typeof t.desc === 'string') this.set(b, 'desc', t.desc);
      b.off = typeof L.off[b.id] === 'boolean' ? L.off[b.id] : typeof BOON_OFF !== 'undefined' && BOON_OFF.includes(b.id);
    }
  },
  // A getter's desc is replaced by a plain value, and handed back whole by `unset`.
  set(b, field, v) {
    if (field === 'name') b.name = v;
    else Object.defineProperty(b, 'desc', { value: v, writable: true, configurable: true, enumerable: true });
  },
  unset(b, field) {
    const o = this.orig[b.id]; if (!o) return;
    if (field === 'name') b.name = o.name;
    else if (o.desc) Object.defineProperty(b, 'desc', o.desc);
  },
  origText(b, field) {
    const o = this.orig[b.id]; if (!o) return String(b[field] || '');
    if (field === 'name') return o.name;
    return o.desc ? String(o.desc.get ? o.desc.get.call(b) : o.desc.value) : '';
  },
  edited(b, field) { return String(b[field] || '') !== this.origText(b, field); },

  // The write to disk: true when the server took it, false when it refused (said why), null when nobody answered.
  async send(body, st) {
    if (this.fileMode() || this.release()) return null;
    let r;
    try { r = await (await fetch('/boon-edit', { method: 'POST', body: JSON.stringify(body) })).json(); }
    catch (e) { this.noServer = true; return null; }
    if (!r || !r.ok) { if (st) st.textContent = 'REFUSED: ' + ((r && r.error) || 'no reason given'); return false; }
    this.noServer = false;
    return r;
  },
  // Kept here when no server took it (and only then, or a served edit and a stale browser copy would fight).
  keepText(b, field, to) {
    const o = this.local(); o.text[b.id] = o.text[b.id] || {};
    if (to === null) delete o.text[b.id][field]; else o.text[b.id][field] = to;
    if (!Object.keys(o.text[b.id]).length) delete o.text[b.id];
    this.keep(o);
  },
  dropLocal(b, field) {
    const o = this.local();
    if (field === 'off') delete o.off[b.id]; else if (o.text[b.id]) { delete o.text[b.id][field]; if (!Object.keys(o.text[b.id]).length) delete o.text[b.id]; }
    this.keep(o);
  },

  // EDIT NAME / EDIT TEXT: the box, at the button the click came from (canvas px).
  edit(game, b, field, cx, cy) {
    TextEdit.game = TextEdit.game || game; TextEdit.canvas = TextEdit.canvas || game.canvas;
    const rect = game.canvas.getBoundingClientRect(), k = rect.width / game.canvas.width;
    const was = this.edited(b, field);
    const btns = [['SAVE', (v, st) => this.saveText(b, field, v.replace(/\s*\n\s*/g, ' ').trim(), st)]];
    if (was) btns.push(['BACK TO ORIGINAL', (v, st) => this.saveText(b, field, null, st)]);
    TextEdit.panel((field === 'name' ? 'SOUL NAME · ' : 'SOUL TEXT · ') + b.id, was ? 'edited; the original: ' : 'as it is in the game: ',
      this.origText(b, field), String(b[field] || ''), { x: rect.left + cx * k, y: rect.top + cy * k + 8 }, btns);
  },
  // `to` null is back to the original. Shown at once; then the disk, or this browser.
  async saveText(b, field, to, st) {
    if (to !== null && !to) { st.textContent = 'EMPTY: to take a soul out of the game use DELETE'; return; }
    if (to === null) this.unset(b, field); else this.set(b, field, to);
    st.textContent = 'saving…';
    const r = await this.send({ op: 'text', id: b.id, field, to: to === null ? this.origText(b, field) : to, restore: to === null }, st);
    if (r === false) return;
    if (r) {
      // `orig` stays the words the page loaded with: BACK TO ORIGINAL writes those back over the literal
      this.dropLocal(b, field);
      TextEdit.toast(r.where === 'source' ? 'REWRITTEN IN js/tuning.js' : 'KEPT IN BOON_TEXT (js/tuning.js)');
    } else { this.keepText(b, field, to); TextEdit.toast('NOT SAVED TO DISK: KEPT IN THIS BROWSER'); }
    TextEdit.close();
  },
  // DELETE / RESTORE: out of the deal, or back in it.
  async setOff(game, b, off) {
    b.off = off;
    const r = await this.send({ op: 'off', id: b.id, off });
    if (r === false) { b.off = !off; TextEdit.game = TextEdit.game || game; TextEdit.toast('REFUSED BY THE SERVER'); return; }
    if (r) this.dropLocal(b, 'off');
    else { const o = this.local(); o.off[b.id] = off; this.keep(o); }
    if (game.devToast) game.devToast((off ? 'DELETED: ' : 'RESTORED: ') + b.name + (r ? ' · js/tuning.js' : ' · THIS BROWSER ONLY'));
  },

  // EXPORT: this browser's edits as JSON, to the clipboard (or a box to copy them out of).
  exportJSON() { const o = this.local(); return JSON.stringify({ text: o.text, off: o.off }); },
  async exportEdits(game) {
    TextEdit.game = TextEdit.game || game;
    const json = this.exportJSON();
    try { await navigator.clipboard.writeText(json); game.devToast('SOUL EDITS COPIED AS JSON'); }
    catch (e) { TextEdit.panel('SOUL EDITS · COPY THIS', 'the clipboard would not take it: select all and copy', '', json, { x: 40, y: 40 }, []); }
  },
  // IMPORT on a served page: pasted JSON (this browser's own edits already filled in) written to disk.
  importEdits(game) {
    TextEdit.game = TextEdit.game || game;
    const mine = this.localCount() ? this.exportJSON() : '';
    TextEdit.panel('IMPORT SOUL EDITS', 'paste the JSON EXPORT copied off a page opened as a file' + (mine ? ' (this browser\'s own are filled in)' : ''), '', mine, { x: 40, y: 40 }, [['WRITE TO DISK', async (v, st) => {
      let o; try { o = JSON.parse(v); } catch (e) { st.textContent = 'NOT JSON'; return; }
      st.textContent = 'writing…';
      const r = await this.send({ op: 'import', text: o.text || {}, off: o.off || {} }, st);
      if (r === false) return;
      if (!r) { st.textContent = 'NO DEV SERVER ANSWERED: run node tools/serve.js and open the game through it'; return; }
      for (const b of BOONS) {
        const t = (o.text || {})[b.id] || {};
        for (const f of ['name', 'desc']) if (typeof t[f] === 'string') this.set(b, f, t[f]);
        if (o.off && typeof o.off[b.id] === 'boolean') b.off = o.off[b.id];
      }
      if (mine) this.keep({ text: {}, off: {} });
      TextEdit.toast('SOUL EDITS WRITTEN TO js/tuning.js'); TextEdit.close();
    }]]);
  },
};
BoonEdit.apply();

// Every string onto a canvas goes through here: an edit is drawn in its place, everywhere, the
// itch build too; and while the switch is on, the main canvas's strings are written down.
(() => {
  if (typeof CanvasRenderingContext2D === 'undefined') return;
  const P = CanvasRenderingContext2D.prototype, of = P.fillText, os = P.strokeText;
  P.fillText = function (t, x, y, mw) {
    let s = t;
    if (TextEdit.map.size) { const r = TextEdit.map.get(String(t)); if (r !== undefined) s = r; }
    if (TextEdit.on && this.canvas === TextEdit.canvas) TextEdit.note(this, String(t), String(s), x, y);
    return mw === undefined ? of.call(this, s, x, y) : of.call(this, s, x, y, mw);
  };
  P.strokeText = function (t, x, y, mw) {
    let s = t;
    if (TextEdit.map.size) { const r = TextEdit.map.get(String(t)); if (r !== undefined) s = r; }
    return mw === undefined ? os.call(this, s, x, y) : os.call(this, s, x, y, mw);
  };
  TextEdit.load();
})();
