// PHOTO MODE and the FPS DIP LOG. Neither is part of the game: both read the picture the game has
// just drawn and never touch a run.
//
// PHOTO MODE (1 Oct 2026: "when I take screenshots the quality is bad — a photo mode in the settings:
// on a key, or every 3 seconds, so I run about at random and it clicks, and then let me choose what to
// keep"). `settings.photoKey` takes a picture of the canvas at its own size when P is pressed;
// `settings.photoAuto` takes one every `TUNING.photo.every` seconds of play. Pictures are kept in this
// page (`Photo.shots`, at most `photo.keep`) until PAUSE → PHOTOS: a page of thumbnails to choose from,
// the chosen ones saved as PNGs (one file, or a zip of them) through `RELEASE.hand`, which is also how
// the itch zip is saved, so it works framed as an artifact and served alike.
//
// THE DIP LOG (dev drawer, `dev.dips`): a frame that took longer than `photo.dip.ms` writes down where
// it was — level, seed, room, what was alive and how much of everything was in the air — with a small
// picture of the frame; SAVE DIPS writes them to one JSON file.
const Photo = {
  shots: [], ask: false, autoT: 0, n: 0, status: '', scroll: 0, cur: 0, rects: [], busy: false,
  dips: [], dipCd: 0,

  // ---- taking ----
  // Called once a frame, straight after the canvas was drawn (a canvas read later in the task, or
  // in another one, may be blank).
  after(game, dtReal) {
    const C = TUNING.photo, S = game.settings || {};
    const live = game.state !== 'title' && game.state !== 'paused';
    if (S.photoAuto && game.state === 'play') { this.autoT += dtReal; if (this.autoT >= C.every) { this.autoT = 0; this.ask = true; this.byKey = false; } } else this.autoT = 0;
    if (this.ask) {
      this.ask = false;
      if (live && (S.photoKey || S.photoAuto)) this.take(game);
    }
    if (S.photoKey || S.photoAuto) this.hud(game);
  },
  take(game) {
    const C = TUNING.photo, cv = game.canvas;
    if (!cv || !cv.width) return;
    const th = document.createElement('canvas');
    th.width = C.thumbW; th.height = Math.max(1, Math.round(cv.height * C.thumbW / cv.width));
    th.getContext('2d').drawImage(cv, 0, 0, th.width, th.height);
    const d = game.level ? game.level.def : null;
    const shot = { id: ++this.n, at: Date.now(), blob: null, thumb: th, img: null, url: null, sel: false, saved: false,
      label: (d ? (d.showroom ? 'SHOWROOM' : d.shroom ? 'THE TRIP' : d.name) : '') + (game.goatRoom !== undefined && d && !d.heaven ? ' · ROOM ' + game.goatRoom : '') };
    this.shots.push(shot);
    // Over the limit the oldest one nobody chose goes; a page of only chosen ones drops its oldest.
    while (this.shots.length > C.keep) {
      const i = this.shots.findIndex((q) => !q.sel); this.free(this.shots.splice(i < 0 ? 0 : i, 1)[0]);
    }
    cv.toBlob((b) => { shot.blob = b; }, 'image/png');
    if (this.byKey) { game.audio.sfxSwing(); game.flash('#ffffff', 0.12); }
  },
  free(s) { if (s && s.url) { try { URL.revokeObjectURL(s.url); } catch (e) { /* gone */ } } },
  // A little camera in the corner while it is on: drawn after the shot, so it is never in one.
  hud(game) {
    const r = game.renderer, ctx = r.ctx, s = r.hs || r.s || 1, S = game.settings;
    if (game.state === 'title') return;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    const x = r.w - 22 * s, y = r.h - 60 * s;
    const t = S.photoAuto ? 1 - this.autoT / TUNING.photo.every : 0;
    ctx.globalAlpha = 0.75; ctx.fillStyle = '#efe6d0'; ctx.font = `700 ${11 * s}px ${FONT_SC}`; ctx.textAlign = 'right';
    ctx.fillText(`${this.shots.length}`, x - 16 * s, y + 4 * s);
    ctx.beginPath(); ctx.arc(x, y, 7 * s, 0, Math.PI * 2); ctx.strokeStyle = '#efe6d0'; ctx.lineWidth = 2 * s; ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, 3 * s, 0, Math.PI * 2); ctx.fillStyle = S.photoAuto && t < 0.12 ? '#ff5a4a' : '#efe6d0'; ctx.fill();
    ctx.restore();
  },
  onKey(game, code) {
    const S = game.settings;
    if (code !== TUNING.photo.key || !(S.photoKey || S.photoAuto)) return;
    if (game.state === 'title' || game.state === 'paused') return;
    this.ask = true; this.byKey = true;
  },

  // ---- the page of pictures (PAUSE → PHOTOS) ----
  open() { this.scroll = 0; this.cur = 0; this.status = ''; },
  cols(game) { const r = game.renderer; return clamp(Math.floor(Math.min(r.w * 0.94, 1200 * r.ts) / (190 * r.ts)), 2, 6); },
  chosen() { return this.shots.filter((q) => q.sel); },
  key(game, code) {
    const n = this.shots.length, cols = this.cols(game);
    if (!n) return;
    const go = (d) => { this.cur = clamp(this.cur + d, 0, n - 1); this.reveal(cols, game); game.audio.sfxSwing(); };
    if (code === 'ArrowLeft' || code === 'KeyA') go(-1);
    else if (code === 'ArrowRight' || code === 'KeyD') go(1);
    else if (code === 'ArrowUp' || code === 'KeyW') go(-cols);
    else if (code === 'ArrowDown' || code === 'KeyS') go(cols);
    else if (code === 'PageUp') go(-cols * 3);
    else if (code === 'PageDown') go(cols * 3);
    else if (code === 'Space' || code === 'Enter' || code === 'NumpadEnter') { this.shots[this.cur].sel = !this.shots[this.cur].sel; game.audio.sfxCard(); }
  },
  reveal(cols, game) {
    const row = Math.floor(this.cur / cols), vis = this.rowsVisible || 2;
    if (row < this.scroll) this.scroll = row; else if (row >= this.scroll + vis) this.scroll = row - vis + 1;
  },
  wheel(game, dy) { this.scroll = Math.max(0, this.scroll + (dy > 0 ? 1 : -1)); },
  click(game, p) {
    for (const q of this.rects) {
      if (p.x < q.x || p.x > q.x + q.w || p.y < q.y || p.y > q.y + q.h) continue;
      if (q.shot !== undefined) { const sh = this.shots[q.shot]; sh.sel = !sh.sel; this.cur = q.shot; game.audio.sfxCard(); return; }
      game.audio.sfxCard();
      if (q.id === 'back') { game.menu.panel = null; return; }
      if (q.id === 'all') { for (const s of this.shots) s.sel = true; return; }
      if (q.id === 'none') { for (const s of this.shots) s.sel = false; return; }
      if (q.id === 'clear') { for (const s of this.shots) this.free(s); this.shots.length = 0; this.status = 'CLEARED'; return; }
      if (q.id === 'save') { this.save(game); return; }
    }
  },
  async save() {
    if (this.busy) return;
    const list = this.chosen().filter((q) => q.blob);
    if (!list.length) { this.status = this.chosen().length ? 'STILL PACKING, TRY AGAIN' : 'CHOOSE SOME FIRST'; return; }
    this.busy = true; this.status = 'SAVING…';
    try {
      const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
      const name = (q) => `goat-${stamp}-${String(q.id).padStart(3, '0')}.png`;
      if (list.length === 1) await RELEASE.hand(list[0].blob, name(list[0]));
      else {
        const entries = [];
        for (const q of list) entries.push({ name: name(q), data: new Uint8Array(await q.blob.arrayBuffer()) });
        await RELEASE.hand(await RELEASE.zip(entries), `goat-photos-${stamp}.zip`);
      }
      for (const q of list) { q.saved = true; q.sel = false; }
      this.status = `SAVED ${list.length}`;
    } catch (err) { this.status = 'NOT SAVED: ' + String(err && err.message || err).slice(0, 60).toUpperCase(); }
    this.busy = false;
  },
  picture(shot) {
    // The full picture, for the big look at the one under the pointer; the thumb until it has loaded.
    if (shot.blob && !shot.img) {
      shot.img = new Image(); shot.url = URL.createObjectURL(shot.blob); shot.img.src = shot.url;
    }
    return shot.img && shot.img.complete && shot.img.naturalWidth ? shot.img : shot.thumb;
  },
  draw(game, r) {
    const ctx = r.ctx, s = r.ts, w = r.w, h = r.h, cx = w / 2, n = this.shots.length;
    ctx.fillStyle = 'rgba(9,7,9,0.97)'; ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center'; ctx.fillStyle = PALETTE.ochre; ctx.font = `700 ${22 * s}px ${FONT_SC}`;
    ctx.fillText('PHOTOS', cx, 34 * s);
    const chosen = this.chosen().length;
    ctx.font = `${12.5 * s}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.62)';
    ctx.fillText(n ? `${n} taken · ${chosen} chosen · click a picture to choose it, the one under the pointer is shown large` : 'NOTHING YET. TURN PHOTO MODE ON IN SETTINGS, THEN PLAY.', cx, 56 * s);
    this.rects = [];
    const top = 72 * s, bottom = h - 74 * s, gw = Math.min(w * 0.94, 1200 * s), x0 = cx - gw / 2, cols = this.cols(game), cw = gw / cols;
    const asp = n ? this.shots[0].thumb.height / this.shots[0].thumb.width : 9 / 16, ch = (cw - 8 * s) * asp + 22 * s;
    this.rowsVisible = Math.max(1, Math.floor((bottom - top) / ch));
    const rows = Math.ceil(n / cols); this.scroll = clamp(this.scroll, 0, Math.max(0, rows - this.rowsVisible));
    const m = game.input.mouse; let hover = -1;
    for (let k = this.scroll * cols; k < Math.min(n, (this.scroll + this.rowsVisible) * cols); k++) {
      const sh = this.shots[k], col = k % cols, row = Math.floor(k / cols) - this.scroll;
      const x = x0 + col * cw + 4 * s, y = top + row * ch, iw = cw - 8 * s, ih = iw * asp;
      this.rects.push({ x, y, w: iw, h: ih + 18 * s, shot: k });
      ctx.drawImage(sh.thumb, x, y, iw, ih);
      const over = m && m.x >= x && m.x <= x + iw && m.y >= y && m.y <= y + ih;
      if (over) hover = k;
      ctx.lineWidth = (sh.sel ? 4 : k === this.cur ? 2.5 : 1.5) * s;
      ctx.strokeStyle = sh.sel ? PALETTE.fireHi : k === this.cur ? PALETTE.bone : 'rgba(239,230,208,0.22)';
      ctx.strokeRect(x, y, iw, ih);
      if (sh.sel) { ctx.fillStyle = 'rgba(242,162,51,0.16)'; ctx.fillRect(x, y, iw, ih); }
      ctx.textAlign = 'left'; ctx.font = `700 ${10.5 * s}px ${FONT_SC}`; ctx.fillStyle = sh.sel ? PALETTE.fireHi : 'rgba(239,230,208,0.55)';
      ctx.fillText((sh.sel ? '✓ ' : '') + '#' + sh.id + (sh.saved ? ' · SAVED' : '') + ' · ' + sh.label, x + 2 * s, y + ih + 13 * s);
    }
    // buttons
    const btn = [['save', chosen ? `SAVE CHOSEN (${chosen})` : 'SAVE CHOSEN'], ['all', 'CHOOSE ALL'], ['none', 'CHOOSE NONE'], ['clear', 'CLEAR ALL'], ['back', 'BACK']];
    const bw = Math.min(190 * s, (gw - 4 * 10 * s) / 5), by = h - 58 * s, bh = 36 * s, bx = cx - (bw * 5 + 40 * s) / 2;
    btn.forEach(([id, label], i) => {
      const x = bx + i * (bw + 10 * s);
      this.rects.push({ x, y: by, w: bw, h: bh, id });
      const on = id === 'save' && chosen;
      ctx.fillStyle = on ? '#4a2428' : '#190f16'; ctx.fillRect(x, by, bw, bh);
      ctx.strokeStyle = on ? PALETTE.blood : 'rgba(239,230,208,0.25)'; ctx.lineWidth = 2 * s; ctx.strokeRect(x, by, bw, bh);
      ctx.textAlign = 'center'; ctx.fillStyle = PALETTE.bone; ctx.font = `700 ${13 * s}px ${FONT_SC}`;
      ctx.fillText(label, x + bw / 2, by + bh * 0.64);
    });
    if (this.status) { ctx.textAlign = 'center'; ctx.font = `700 ${12 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.fireHi; ctx.fillText(this.status, cx, h - 12 * s); }
    // the large look
    if (hover >= 0) {
      const img = this.picture(this.shots[hover]), iw0 = img.naturalWidth || img.width, ih0 = img.naturalHeight || img.height;
      const k = Math.min(w * 0.7 / iw0, h * 0.72 / ih0), pw = iw0 * k, ph = ih0 * k;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(cx - pw / 2 - 6 * s, h / 2 - ph / 2 - 6 * s, pw + 12 * s, ph + 12 * s);
      ctx.drawImage(img, cx - pw / 2, h / 2 - ph / 2, pw, ph);
      ctx.strokeStyle = PALETTE.ochre; ctx.lineWidth = 2 * s; ctx.strokeRect(cx - pw / 2, h / 2 - ph / 2, pw, ph);
    }
    ctx.textAlign = 'left';
  },

  // ---- the dip log (dev) ----
  // `gap` is the frame's own length in ms, `work` what the game spent on it (update + draw).
  dipCheck(game, gap, work, upd, drw, dtReal) {
    const C = TUNING.photo.dip;
    this.dipCd = Math.max(0, this.dipCd - dtReal);
    if (!game.dev.dips || gap < C.ms || gap > 1000 || this.dipCd > 0 || !game.level || game.state === 'title' || game.state === 'paused') return;
    this.dipCd = C.cooldown;
    const counts = {};
    for (const k of Object.keys(game)) {
      const v = game[k];
      const n = Array.isArray(v) || ArrayBuffer.isView(v) ? (Array.isArray(v) ? v.length : 0) : v instanceof Map || v instanceof Set ? v.size : -1;
      if (n > 0 && k !== 'collideList') counts[k] = n;
    }
    if (game.scatter && game.scatter.bits) counts.scatterBits = game.scatter.bits.length;
    const w = game.world; let fire = 0;
    if (w && w.fire) for (let i = 0; i < w.fire.length; i++) if (w.fire[i] > 0) fire++;
    counts.fireTiles = fire;
    const alive = game.enemies.filter((e) => !e.dead), kinds = {};
    for (const e of alive) kinds[e.kind] = (kinds[e.kind] || 0) + 1;
    const g = game.goat, room = game.level.rooms[game.goatRoom || 0];
    let png = null;
    try {
      const cv = game.canvas, th = document.createElement('canvas');
      th.width = C.shotW; th.height = Math.round(cv.height * C.shotW / cv.width);
      th.getContext('2d').drawImage(cv, 0, 0, th.width, th.height);
      png = th.toDataURL('image/jpeg', 0.72);
    } catch (e) { /* no picture */ }
    let code = null; try { code = game.runCode('dip'); } catch (e) { /* not in a run */ }
    const rec = { at: new Date().toISOString(), gapMs: Math.round(gap), workMs: Math.round(work * 10) / 10, updateMs: Math.round(upd * 10) / 10, drawMs: Math.round(drw * 10) / 10,
      fps: game.fps ? Math.round(game.fps.rate) : null, build: BUILD, state: game.state, level: game.level.def.name, levelIndex: game.levelIndex, seed: game.level.seed,
      room: game.goatRoom, roomName: room && room.tpl ? room.tpl.name : null, roomRole: room ? room.role : null,
      goat: g ? { x: Math.round(g.x), y: Math.round(g.y), state: g.state, hp: g.hp } : null, alive: alive.length, kinds, counts,
      view: { w: game.renderer.w, h: game.renderer.h, s: game.renderer.s }, dev: { god: game.dev.god, dark: game.dev.dark, vision: game.dev.vision, hearing: game.dev.hearing }, runCode: code, picture: png };
    this.dips.push(rec);
    if (this.dips.length > C.keep) this.dips.shift();
    game.devToast(`DIP ${rec.gapMs} MS · ${rec.level} ROOM ${rec.room} · ${this.dips.length} KEPT`, 3);
  },
  async saveDips(game) {
    if (!this.dips.length) { game.devToast('NO DIPS RECORDED YET'); return; }
    try {
      const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
      await RELEASE.hand(new Blob([JSON.stringify(this.dips, null, 1)], { type: 'application/json' }), `goat-dips-${stamp}.json`);
      game.devToast(`SAVED ${this.dips.length} DIPS`);
    } catch (err) { game.devToast('NOT SAVED: ' + String(err && err.message || err).slice(0, 60).toUpperCase(), 5); }
  },
};
