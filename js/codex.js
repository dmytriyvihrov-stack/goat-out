// THE CODEX (1 Oct 2026, playtest): four screens that tell the player what he has and what he could have.
//
// - THE WORDS: a description drawn through `Codex.line` marks the words of `KEYWORDS` (js/tuning.js) in
//   their colour, and the pointer on one brings up what it means ("like Slay the Spire or Total War").
// - THE GOAT, LARGE: `Codex.portrait` is the build's own goat (`PaintedArt.drawGoat` with a stub game,
//   the GOAT GRID's trick) facing down and right, with whatever look a soul or a talisman would give him,
//   over the soul cards and in the mouse's offer, so a card that changes him shows how.
// - THE BOOK: I (or PAUSE → INVENTORY) opens a page of what the run carries, actives, passives, the
//   talisman, the animals, the mirror's ranks, and what each does (Enter the Gungeon's ammonomicon).
// - HER OFFER: walking up to the mouse opens her shelf as cards, the way a soul's are dealt
//   (`watchShop`); taking one is `Shop.buy` / `Shop.takeMilk`, exactly as a grab on the stool is.
//
// None of it is a verb (pillar 1): I is a page, like Escape; her cards are picked with the keys,
// the mouse or the pad that pick a soul's.
const Codex = {
  // ================================================================ the words
  re: null, kwOf: null,
  build() {
    const forms = []; this.kwOf = new Map();
    for (const k of KEYWORDS) for (const f of k.match) { forms.push(f); this.kwOf.set(f.toLowerCase(), k); }
    forms.sort((a, b) => b.length - a.length);
    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // No lookbehind: Safari before 16.4 cannot parse one, and a throw here took every card with it.
    try { this.re = new RegExp('(^|[^A-Za-z])(' + forms.map(esc).join('|') + ')(?![A-Za-z])', 'gi'); } catch (e) { this.re = /$^/g; }
  },
  segments(text) {
    if (!this.re) this.build();
    const out = []; let at = 0, m;
    this.re.lastIndex = 0;
    while ((m = this.re.exec(text))) {
      if (!m[2]) { this.re.lastIndex++; continue; }
      const start = m.index + m[1].length;
      if (start > at) out.push({ t: text.slice(at, start) });
      out.push({ t: m[2], kw: this.kwOf.get(m[2].toLowerCase()) });
      at = start + m[2].length;
    }
    if (at < text.length) out.push({ t: text.slice(at) });
    return out;
  },
  // One line of a description at (x, y), aligned about x ('left' | 'center' | 'right'), in the font
  // already set: plain words in `color`, the game's own words in theirs with a dotted line under them,
  // each one a box the pointer can rest on (`R.tips`, read by `drawTip` at the end of the frame).
  line(R, text, x, y, align, color) {
    const ctx = R.ctx, segs = this.segments(text), w = ctx.measureText(text).width;
    const fs = parseFloat((/(\d+(?:\.\d+)?)px/.exec(ctx.font) || [0, 12])[1]);
    let cx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    const keep = ctx.textAlign; ctx.textAlign = 'left';
    for (const sg of segs) {
      const sw = ctx.measureText(sg.t).width;
      if (sg.kw) {
        ctx.fillStyle = PALETTE[sg.kw.color] || PALETTE.bone; ctx.fillText(sg.t, cx, y);
        const u = Math.max(1, Math.round(fs / 13));
        for (let dx = 0; dx + u * 2 <= sw + 0.5; dx += u * 3) ctx.fillRect(Math.round(cx + dx), Math.round(y + fs * 0.2), u * 2, u);
        (R.tips || (R.tips = [])).push({ x: cx - 2, y: y - fs * 0.9, w: sw + 4, h: fs * 1.3, kw: sg.kw });
      } else { ctx.fillStyle = color; ctx.fillText(sg.t, cx, y); }
      cx += sw;
    }
    ctx.textAlign = keep;
  },
  // Wrapped lines, each through `line`.
  lines(R, text, x, y, maxW, lh, align, color) {
    const ls = R.wrap(text, maxW);
    ls.forEach((l, k) => this.line(R, l, x, y + k * lh, align, color));
    return ls.length;
  },
  // Last thing drawn: the word under the pointer, explained.
  drawTip(R, game) {
    const tips = R.tips; R.tips = [];
    if (!tips || !tips.length || game.touch.active || padOn(game)) return;
    const m = game.input && game.input.mouse; if (!m) return;
    const hit = tips.find((q) => m.x >= q.x && m.x <= q.x + q.w && m.y >= q.y && m.y <= q.y + q.h); if (!hit) return;
    const ctx = R.ctx, s = R.ts, kw = hit.kw, W = Math.min(270 * s, R.w - 20 * s), pad = 11 * s, col = PALETTE[kw.color] || PALETTE.bone;
    ctx.save(); ctx.textAlign = 'left';
    ctx.font = FONT_PICK.font('text', Math.max(13 * R.s, 13 * s));
    // One fact a line (`\n` in the text), a little air between facts, so it is scanned, not read.
    const lh = Math.max(16, 16.5 * s), gap = lh * 0.3, ls = [];
    kw.text.split('\n').forEach((f, i) => R.wrap(f, W - pad * 2).forEach((l, j) => ls.push({ l, y: (ls.length ? ls[ls.length - 1].y + lh : 0) + (i && !j ? gap : 0) })));
    const H = pad * 2 + 20 * s + (ls.length ? ls[ls.length - 1].y + lh : 0);
    let x = m.x + 16 * s, y = m.y + 20 * s;
    if (x + W > R.w - 8 * s) x = Math.max(8 * s, m.x - W - 12 * s);
    if (y + H > R.h - 8 * s) y = Math.max(8 * s, m.y - H - 12 * s);
    ctx.fillStyle = 'rgba(13,10,12,0.96)'; ctx.fillRect(x, y, W, H);
    ctx.fillStyle = col; ctx.fillRect(x, y, W, 3 * s);
    ctx.strokeStyle = 'rgba(239,230,208,0.28)'; ctx.lineWidth = Math.max(1, s); ctx.strokeRect(x, y, W, H);
    ctx.font = `700 ${Math.max(13 * R.s, 14 * s)}px ${FONT_SC}`; ctx.fillStyle = col; ctx.fillText(kw.title, x + pad, y + pad + 12 * s);
    ctx.font = FONT_PICK.font('text', Math.max(13 * R.s, 13 * s)); ctx.fillStyle = 'rgba(239,230,208,0.88)';
    // A reaction ("+ FIRE: a blast.") names the other word in its own colour.
    ls.forEach((q) => {
      const ty = y + pad + 20 * s + q.y + 0.8 * lh, m2 = /^(\+ ([A-Z]+):)/.exec(q.l), o = m2 && KEYWORDS.find((k) => k.title === m2[2]);
      if (!o) { ctx.fillText(q.l, x + pad, ty); return; }
      ctx.fillStyle = PALETTE[o.color] || PALETTE.bone; ctx.fillText(m2[1], x + pad, ty);
      const wPre = ctx.measureText(m2[1]).width; ctx.fillStyle = 'rgba(239,230,208,0.88)'; ctx.fillText(q.l.slice(m2[1].length), x + pad + wPre, ty);
    });
    ctx.restore();
  },

  // ================================================================ the goat, large
  // What on him a soul can change, and what to call it.
  LOOKS: [['antlers', 'LONG HORNS'], ['bomb', 'THE BOMB HORNS'], ['splash', 'THE VENOM HORNS'], ['screamStun', 'THE BELL AT HIS THROAT'],
    ['breath', 'SMOKE FROM HIS NOSE'], ['spit', 'FROTH AT HIS MOUTH'], ['oracle', 'A THIRD EYE']],
  newLooks(from, to) { return this.LOOKS.filter(([k]) => to && to[k] && !(from && from[k])).map(([, n]) => n); },
  // The goat facing down and right, his feet at (cx, foot), `h` px tall, with `mods` and `artifact`.
  // `key` keeps his breath and steam apart from any other picture of him.
  portrait(R, game, cx, foot, h, mods, artifact, key) {
    if (!PIXEL_ART.ready) return;
    const ctx = R.ctx, S = h / 40;
    const P = this.painters || (this.painters = new Map());
    if (!P.has(key)) P.set(key, Object.assign(Object.create(R.painted), { fx: [] }));
    const g = { x: 0, y: 0, facing: Math.PI / 4, vx: 0, vy: 0, state: 'idle', trail: [], hp: 4, maxHp: 4, invuln: 0, dazed: 0, jitter: null, sqLeft: 0, screaming: 0 };
    const stub = { mods: mods || {}, artifact: artifact || null, goat: g, stairFx: null, intro: null, touch: { active: false }, state: 'portrait' };
    ctx.save(); ctx.translate(Math.round(cx), Math.round(foot)); ctx.scale(S, S * TILT);
    const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    const shade = R.shadow;
    if (typeof GoatGrid !== 'undefined') R.shadow = (sx, sy) => GoatGrid.pixelShadow(ctx, sx, sy);
    try { P.get(key).drawGoat(R, g, stub); } catch (err) { console.error(err); } finally { R.shadow = shade; ctx.imageSmoothingEnabled = sm; }
    ctx.restore();
  },
  // A soft round of light for him to stand in, in hard bands.
  pool(R, cx, cy, r, color, a) {
    const ctx = R.ctx;
    for (const [f, al] of [[1, 0.08], [0.72, 0.1], [0.46, 0.12]]) {
      ctx.globalAlpha = al * a; ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(cx, cy, r * f, r * f * 0.92, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  },
  // What a soul card would make of him: the build with `b` taken (a swap without the one it replaces),
  // `applyBoons`' order, actives first, then passives.
  boonMods(game, b, old) {
    if (!old) { const pm = Object.assign({}, game.mods); b.apply(pm, b.params || {}); return pm; }
    const set = game.boons.filter((o) => o !== old).concat([b]), pm = Object.assign({}, BOON_BASE);
    for (const o of set) if (o.active) o.apply(pm, o.params || {});
    for (const o of set) if (!o.active) o.apply(pm, o.params || {});
    return pm;
  },
  // Over the soul cards: him as he is, or, the pointer on a card that changes how he looks, as he
  // would be, with what changes named under him. Nothing until the soul has begun going into him
  // (`game.boonMorph`, `TUNING.fanfare.morph`): violet cells are pulled in from round him, he stands
  // up out of it as a violet shape that clears to his own colours in hard steps, and a ring of cells
  // goes out from him. After that he stays.
  drawBoonGoat(R, game, cx, foot, gh, hoverI) {
    if (game.boonMorph == null) return;
    const ctx = R.ctx, s = R.ts, M = TUNING.fanfare.morph;
    const mu = clamp(((game.boonT || 0) - game.boonMorph) / M.time, 0, 1), mid = foot - gh * 0.42;
    const P = Math.max(2, Math.round(TUNING.fanfare.px * s));
    const b = hoverI >= 0 && game.boonChoice && game.boonChoice[hoverI];
    let mods = game.mods, fresh = [];
    if (b) { const pm = this.boonMods(game, b, game.boonReplace && game.boonReplace[hoverI]); fresh = this.newLooks(game.mods, pm); if (fresh.length) mods = pm; }
    if (mu < 1) this.drawPull(R, cx, mid, gh, mu, P);
    const alpha = clamp((mu - M.goatIn) / 0.2, 0, 1), h = gh * (M.pop + (1 - M.pop) * Renderer.backOut((mu - M.goatIn) / 0.4));
    const tint = Math.ceil((1 - clamp((mu - M.ring) / (M.clear - M.ring), 0, 1)) * 4) / 4;
    if (alpha > 0 && tint > 0) {
      // the violet he is first: his picture into a canvas of its own, washed over, laid on 1:1
      const W = Math.ceil(gh * 2.4), H = Math.ceil(gh * 1.7), fy = Math.round(H - gh * 0.3);
      const c = this.morphCanvas || (this.morphCanvas = document.createElement('canvas'));
      if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
      const x = c.getContext('2d'); x.clearRect(0, 0, W, H);
      const real = R.ctx; R.ctx = x;
      try { this.portrait(R, game, W / 2, fy, h, mods, game.artifact, 'boon'); } finally { R.ctx = real; }
      x.globalCompositeOperation = 'source-atop'; x.globalAlpha = tint; x.fillStyle = tint > 0.5 ? PALETTE.witchHi : PALETTE.witch; x.fillRect(0, 0, W, H);
      x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
      ctx.save(); ctx.globalAlpha = alpha; ctx.drawImage(c, Math.round(cx - W / 2), Math.round(foot - fy)); ctx.restore();
    } else if (alpha > 0) {
      ctx.save(); ctx.globalAlpha = alpha;
      this.portrait(R, game, cx, foot, h, mods, game.artifact, 'boon');
      ctx.restore();
    }
    if (mu > M.ring && mu < 1) this.drawMorphRing(R, cx, mid, gh, (mu - M.ring) / (1 - M.ring), P);
    if (fresh.length && mu >= M.clear) {
      ctx.save(); ctx.textAlign = 'center'; ctx.font = `700 ${Math.max(12 * R.s, 12.5 * s)}px ${FONT_SC}`;
      const txt = 'HOW HE WILL LOOK · ' + fresh.join(' · ');
      ctx.fillStyle = 'rgba(13,10,12,0.7)'; ctx.fillText(txt, cx + 1, foot + 17 * s + 1);
      ctx.fillStyle = PALETTE.fireHi; ctx.fillText(txt, cx, foot + 17 * s);
      ctx.restore();
    }
  },
  // The soul being drawn into him: `fanfare.morph.cells` cells from a ring round his middle, each
  // starting a little after the last, spiralling in faster the closer they get, a fainter cell a step
  // behind each one. On the grid of `P` HUD px, like the rest of the party.
  drawPull(R, cx, cy, gh, mu, P) {
    const ctx = R.ctx, M = TUNING.fanfare.morph, cols = [PALETTE.witchHi, PALETTE.witch, PALETTE.witchHi, PALETTE.bone];
    const at = (r0, a0, p) => { const e = p * p, r = r0 * (1 - e), a = a0 + e * 1.6; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.8]; };
    ctx.save();
    for (let i = 0; i < M.cells; i++) {
      const h1 = Math.abs((Math.sin(i * 12.9898) * 43758.5453) % 1), h2 = Math.abs((Math.sin(i * 78.233) * 12345.678) % 1), h3 = Math.abs((Math.sin(i * 3.1) * 999.1) % 1);
      const p = clamp((mu - 0.15 * h3) / 0.5, 0, 1); if (p <= 0 || p >= 1) continue;
      const r0 = gh * M.reach * (0.6 + 0.4 * h2), a0 = h1 * Math.PI * 2, sz = P * (i % 4 === 0 ? 2 : 1);
      ctx.fillStyle = cols[i % cols.length];
      for (const [q, al] of [[p - 0.07, 0.35], [p, 1]]) {
        if (q <= 0) continue;
        const [x, y] = at(r0, a0, q);
        ctx.globalAlpha = al * Math.min(1, p * 4);
        ctx.fillRect(Math.round(x / P) * P - sz / 2, Math.round(y / P) * P - sz / 2, sz, sz);
      }
    }
    ctx.restore();
  },
  // The ring that goes out from him as he stands up, `k` 0..1 of the way: cells round an ellipse.
  drawMorphRing(R, cx, cy, gh, k, P) {
    const ctx = R.ctx, r = gh * (0.25 + 0.75 * k), n = Math.max(12, Math.round(r * 2 * Math.PI / (P * 2)));
    ctx.save(); ctx.globalAlpha = 1 - k; ctx.fillStyle = k < 0.4 ? PALETTE.bone : PALETTE.witchHi;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.6;
      ctx.fillRect(Math.round(x / P) * P - P / 2, Math.round(y / P) * P - P / 2, P, P);
    }
    ctx.restore();
  },

  // ================================================================ the book (I)
  open(game) {
    if (game.state === 'play' && (game.shopDlg || game.revive || game.beastTalk || (game.bless && game.bless.on))) return false;
    if (game.state !== 'play' && !(game.state === 'heaven' && game.heaven && !game.heaven.talk && !game.heaven.panel)) return false;
    game.pauseFrom = game.state; game.state = 'paused'; game.pause.index = 0;
    game.menu.panel = 'book'; game.bookFromKey = true; game.book = { i: 0, mx: -1, my: -1 };
    game.audio.sfxCard(); return true;
  },
  close(game) {
    game.menu.panel = null; game.audio.sfxSwing();
    if (game.bookFromKey) { game.bookFromKey = false; game.state = game.pausedIn(); game.clearEdges(); }
  },
  SECTIONS: ['ACTIVE', 'PASSIVE', 'TALISMAN', 'ANIMALS', 'FROM THE MIRROR'],
  entries(game) {
    const out = [];
    // Up in heaven after a death the floor's souls are already lost (the card said so): the book lists what
    // the edge drops him back with, the head of the floor (`restartLevel` restores exactly these).
    const up = !!game.heaven, boons = up && game.levelBoons ? game.levelBoons : game.boons;
    const art = up && game.levelArtifact !== undefined ? game.levelArtifact : game.artifact;
    for (const b of boons) out.push({ sec: b.active ? 'ACTIVE' : 'PASSIVE', kind: 'boon', b });
    if (art && Shop.def(art.id)) out.push({ sec: 'TALISMAN', kind: 'art', art });
    const c = typeof Beast !== 'undefined' ? Beast.counts(game) : {};
    for (const k of ['chicken', 'tortoise', 'goose', 'crow', 'horse', 'pig', 'rabbit', 'husky']) if (c[k]) out.push({ sec: 'ANIMALS', kind: 'beast', k, n: c[k] });
    if (Heaven.meta) for (const u of MIRROR) { const r = Heaven.rank(u.id); if (r) out.push({ sec: 'FROM THE MIRROR', kind: 'mirror', u, r }); }
    out.sort((a, b) => this.SECTIONS.indexOf(a.sec) - this.SECTIONS.indexOf(b.sec));
    return out;
  },
  // What an entry says on the right-hand page.
  about(game, e) {
    if (e.kind === 'boon') {
      const b = e.b, verb = b.skill ? { butt: 'HEADBUTT', grab: 'GRAB', roll: 'ROLL', scream: 'VOICE' }[b.skill] : 'BODY';
      return { name: b.name, tag: (b.active ? 'ACTIVE' : 'PASSIVE') + ' · ' + verb, color: b.active ? PALETTE.blood : PALETTE.ochre, text: b.desc };
    }
    if (e.kind === 'art') {
      const d = Shop.def(e.art.id), t = Shop.tierOf(e.art), rr = rarityOf(e.art.tier);
      return { name: d.name, tag: 'TALISMAN · ' + rr.name, color: rr.color, text: t ? t.desc : '' };
    }
    if (e.kind === 'beast') return { name: 'THE ' + Beast.NAME[e.k] + (e.n > 1 ? ' ×' + e.n : ''), tag: 'ANIMAL · BROUGHT OUT', color: PALETTE.hen || PALETTE.bone, text: Beast.GIVES[e.k]() };
    const u = e.u;
    return { name: u.name + ' ' + 'I'.repeat(e.r), tag: 'FROM THE MIRROR · FOR GOOD', color: '#f7d774', text: u.tell(u.params, e.r) };
  },
  // The picture of an entry in a box `h` px across, centred at (cx, cy).
  icon(R, game, e, cx, cy, h) {
    const ctx = R.ctx;
    if (e.kind === 'boon') {
      ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffffff';
      ctx.font = `${Math.round(h * 0.56)}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`;
      ctx.fillText(e.b.emoji || '•', cx, cy + h * 0.04); ctx.restore();
    } else if (e.kind === 'art') R.artifactIcon(e.art.id, cx, cy, h * 0.3, e.art.tier);
    else if (e.kind === 'beast') {
      ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffffff';
      ctx.font = `${Math.round(h * 0.56)}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`;
      ctx.fillText(Beast.EMOJI[e.k], cx, cy + h * 0.04); ctx.restore();
    } else {
      const sk = HEAVEN_PIXELS.sprites.skull, c = h * 0.5 / sk.w;
      Heaven.skull(ctx, cx - sk.w * c / 2, cy - sk.h * c / 2, c);
    }
  },
  frameColor(e) {
    return e.kind === 'boon' ? (e.b.active ? PALETTE.blood : PALETTE.ochre) : e.kind === 'art' ? rarityOf(e.art.tier).color : e.kind === 'beast' ? PALETTE.bone : '#e0ac3e';
  },
  bookKey(game, code) {
    const B = game.book || (game.book = { i: 0, mx: -1, my: -1 }), n = this.entries(game).length;
    if (code === 'Escape' || code === 'KeyI' || code === 'Backspace') { this.close(game); return; }
    if (!n) return;
    if (code === 'ArrowRight' || code === 'KeyD' || code === 'ArrowDown' || code === 'KeyS') { B.i = (B.i + 1) % n; game.audio.sfxSwing(); }
    if (code === 'ArrowLeft' || code === 'KeyA' || code === 'ArrowUp' || code === 'KeyW') { B.i = (B.i + n - 1) % n; game.audio.sfxSwing(); }
  },
  bookClick(game, p) {
    const B = game.book; if (!B || !B.rects) return;
    if (B.closeRect && p.x >= B.closeRect.x && p.x <= B.closeRect.x + B.closeRect.w && p.y >= B.closeRect.y && p.y <= B.closeRect.y + B.closeRect.h) { this.close(game); return; }
    const i = B.rects.findIndex((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
    if (i >= 0) { B.i = i; game.audio.sfxSwing(); }
  },
  drawBook(R, game) {
    const ctx = R.ctx, s = R.ts, W = R.w, Hh = R.h, B = game.book || (game.book = { i: 0, mx: -1, my: -1 });
    const list = this.entries(game); if (B.i >= list.length) B.i = Math.max(0, list.length - 1);
    // the pointer, once it moves, picks what it is on
    const m = game.input.mouse, moved = m && (m.x !== B.mx || m.y !== B.my); if (m) { B.mx = m.x; B.my = m.y; }
    ctx.save();
    ctx.fillStyle = 'rgba(9,7,9,0.78)'; ctx.fillRect(0, 0, W, Hh);
    const pw = Math.min(W - 32 * s, 1040 * s), ph = Math.min(Hh - 32 * s, 620 * s), x0 = (W - pw) / 2, y0 = (Hh - ph) / 2;
    // the book: two pages and a spine
    ctx.fillStyle = '#3a1d22'; ctx.fillRect(x0 - 8 * s, y0 - 8 * s, pw + 16 * s, ph + 16 * s);
    ctx.fillStyle = '#211519'; ctx.fillRect(x0, y0, pw, ph);
    const half = Math.round(pw * 0.53), lx = x0 + 20 * s, rx = x0 + half + 22 * s, rw = pw - half - 42 * s;
    ctx.fillStyle = 'rgba(239,230,208,0.05)'; ctx.fillRect(x0 + half - 3 * s, y0, 6 * s, ph);
    ctx.fillStyle = PALETTE.ochre; ctx.fillRect(x0, y0, pw, 2 * s); ctx.fillRect(x0, y0 + ph - 2 * s, pw, 2 * s);
    ctx.textAlign = 'left'; ctx.font = `700 ${Math.max(18 * R.s, 22 * s)}px ${FONT_SC}`; ctx.fillStyle = PALETTE.bone;
    ctx.fillText('WHAT HE CARRIES', lx, y0 + 34 * s);
    // the left page: one block a section, a row of boxes in each
    const cell = Math.round(48 * s), gap = Math.round(8 * s), cols = Math.max(1, Math.floor((half - 40 * s + gap) / (cell + gap)));
    let y = y0 + 58 * s; B.rects = [];
    const always = ['ACTIVE', 'PASSIVE', 'TALISMAN', 'ANIMALS'];
    for (const sec of this.SECTIONS) {
      const items = list.filter((e) => e.sec === sec);
      if (!items.length && !always.includes(sec)) continue;
      ctx.font = `700 ${Math.max(12 * R.s, 13 * s)}px ${FONT_SC}`; ctx.fillStyle = PALETTE.ochre; ctx.fillText(sec, lx, y + 12 * s);
      const tw = ctx.measureText(sec).width; ctx.fillStyle = 'rgba(185,135,58,0.3)'; ctx.fillRect(lx + tw + 10 * s, y + 7 * s, half - 50 * s - tw, Math.max(1, s));
      y += 22 * s;
      if (!items.length) {
        ctx.font = FONT_PICK.font('text', Math.max(12 * R.s, 12.5 * s)); ctx.fillStyle = 'rgba(239,230,208,0.35)';
        ctx.fillText(sec === 'TALISMAN' ? 'nothing at his neck yet' : sec === 'ANIMALS' ? 'none brought out yet' : 'no soul here yet', lx + 4 * s, y + 14 * s);
        y += 30 * s; continue;
      }
      items.forEach((e, k) => {
        const i = list.indexOf(e), cx0 = lx + (k % cols) * (cell + gap), cy0 = y + Math.floor(k / cols) * (cell + gap);
        B.rects[i] = { x: cx0, y: cy0, w: cell, h: cell };
        if (moved && m.x >= cx0 && m.x <= cx0 + cell && m.y >= cy0 && m.y <= cy0 + cell) B.i = i;
        const sel = B.i === i, col = this.frameColor(e);
        ctx.fillStyle = sel ? 'rgba(239,230,208,0.12)' : 'rgba(13,10,12,0.55)'; ctx.fillRect(cx0, cy0, cell, cell);
        ctx.strokeStyle = col; ctx.lineWidth = (sel ? 3 : 1.6) * s; ctx.strokeRect(cx0, cy0, cell, cell);
        this.icon(R, game, e, cx0 + cell / 2, cy0 + cell / 2, cell);
        if (e.kind === 'beast' && e.n > 1) { ctx.font = `700 ${Math.max(12 * R.s, 11 * s)}px ${FONT_SC}`; ctx.fillStyle = PALETTE.bone; ctx.textAlign = 'right'; ctx.fillText('×' + e.n, cx0 + cell - 3 * s, cy0 + cell - 4 * s); ctx.textAlign = 'left'; }
      });
      y += Math.ceil(items.length / cols) * (cell + gap) + 10 * s;
    }
    // the right page: the one picked, in full
    const e = list[B.i];
    if (e) {
      const a = this.about(game, e), big = Math.round(96 * s), bx = rx + rw / 2 - big / 2, by = y0 + 26 * s;
      ctx.fillStyle = 'rgba(13,10,12,0.55)'; ctx.fillRect(bx, by, big, big);
      ctx.strokeStyle = a.color; ctx.lineWidth = 2.5 * s; ctx.strokeRect(bx, by, big, big);
      this.icon(R, game, e, bx + big / 2, by + big / 2, big);
      ctx.textAlign = 'center'; ctx.font = `700 ${Math.max(17 * R.s, 20 * s)}px ${FONT_SC}`; ctx.fillStyle = PALETTE.bone;
      ctx.fillText(a.name, rx + rw / 2, by + big + 32 * s);
      ctx.font = `700 ${Math.max(12 * R.s, 12.5 * s)}px ${FONT_SC}`; ctx.fillStyle = a.color; ctx.fillText(a.tag, rx + rw / 2, by + big + 52 * s);
      ctx.font = FONT_PICK.font('text', Math.max(13 * R.s, 15 * s));
      this.lines(R, a.text, rx + rw / 2, by + big + 82 * s, rw - 20 * s, 21 * s, 'center', 'rgba(239,230,208,0.85)');
    } else {
      ctx.textAlign = 'center'; ctx.font = FONT_PICK.font('text', Math.max(13 * R.s, 15 * s)); ctx.fillStyle = 'rgba(239,230,208,0.5)';
      ctx.fillText('Nothing yet. A soul, a mouse or an animal will change that.', rx + rw / 2, y0 + 90 * s);
    }
    // and him, as he stands now, at the foot of the page
    const gh = Math.min(150 * s, ph * 0.28), gx = rx + rw / 2, gf = y0 + ph - 36 * s;
    this.pool(R, gx, gf - gh * 0.3, gh * 0.48, '#efe6d0', 1);
    this.portrait(R, game, gx, gf, gh, game.mods, game.artifact, 'book');
    // the way out
    ctx.textAlign = 'left'; ctx.font = `${Math.max(12 * R.s, 12 * s)}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.5)';
    const hint = game.touch.active ? 'tap a box to read it · tap here to close' : padOn(game) ? 'the stick picks · B closes' : 'point at a box to read it · I or ESC closes';
    ctx.fillText(hint, lx, y0 + ph - 16 * s);
    const hw = ctx.measureText(hint).width; B.closeRect = { x: lx, y: y0 + ph - 32 * s, w: hw, h: 22 * s };
    ctx.restore();
  },

  // ================================================================ a tip after a death
  // What killed him, and a line off `DEATH_TIPS` for it (else off its `any`), never the last one twice.
  deathTip(n) {
    const own = (n.kind && DEATH_TIPS.killer[n.kind]) || [], list = own.length ? own : DEATH_TIPS.any || [];
    if (!list.length && !n.name) return null;
    let text = list.length ? list[(Math.random() * list.length) | 0] : '';
    if (list.length > 1 && text === this.lastTip) text = list[(list.indexOf(text) + 1) % list.length];
    this.lastTip = text;
    return { t: 0, by: n.name, text };
  },
  drawDeathTip(R, game) {
    const T = game.tip; if (!T || game.state !== 'play') return;
    const D = TUNING.deathTip, a = clamp(Math.min(T.t / D.fade, (D.time - T.t) / D.fade), 0, 1); if (a <= 0) return;
    const ctx = R.ctx, s = R.ts, W = Math.min(R.vw - 40 * s, 620 * s), cx = R.vw / 2;
    ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center';
    ctx.font = FONT_PICK.font('text', Math.max(14 * R.s, 16 * s));
    const ls = T.text ? R.wrap(T.text, W - 30 * s) : [], lh = 21 * s;
    const H = 18 * s + (T.by ? 22 * s : 0) + ls.length * lh + 10 * s, y = R.vh - H - (game.touch.active ? 170 * R.s : 74 * s);
    ctx.fillStyle = 'rgba(13,10,12,0.8)'; ctx.fillRect(cx - W / 2, y, W, H);
    ctx.fillStyle = PALETTE.ochre; ctx.fillRect(cx - W / 2, y, W, 2 * s);
    let yy = y + 22 * s;
    if (T.by) { ctx.font = `700 ${Math.max(12 * R.s, 13 * s)}px ${FONT_SC}`; ctx.fillStyle = PALETTE.blood; ctx.fillText('LAST TIME: ' + T.by, cx, yy); yy += 22 * s; }
    ctx.font = FONT_PICK.font('text', Math.max(14 * R.s, 16 * s));
    ls.forEach((l, k) => this.line(R, l, cx, yy + k * lh, 'center', 'rgba(239,230,208,0.9)'));
    ctx.restore();
  },

  // ================================================================ her offer
  shopOffers(game, id) {
    return game.props.filter((p) => p.kind === 'ware' && p.shopId === id && !p.broken && p.ware)
      .sort((a, b) => (a.ware.id === 'milk') - (b.ware.id === 'milk') || a.x - b.x);
  },
  // Once a step of play: up to her (or her shelf) opens it; walked away from, it may open again.
  watchShop(game) {
    if (game.shopDlg || !game.level || game.level.def.heaven) return false;
    const g = game.goat; if (!g || g.dead) return false;
    const D = TUNING.shop.dlg, near = {};
    for (const p of game.props) {
      // not the crow's gift on the stairs (a ware of no shop, `shopId` < 0): that one is a grab
      if ((p.kind !== 'mouse' && p.kind !== 'ware') || p.broken || p.shopId === undefined || p.shopId < 0) continue;
      const d = Math.hypot(p.x - g.x, p.y - g.y);
      near[p.shopId] = Math.min(near[p.shopId] === undefined ? Infinity : near[p.shopId], d);
    }
    game.shopShut = game.shopShut || {};
    for (const id of Object.keys(near)) {
      if (game.shopShut[id]) { if (near[id] > D.out * TILE) delete game.shopShut[id]; continue; }
      if (near[id] > D.r * TILE) continue;
      const offers = this.shopOffers(game, +id);
      if (!offers.length || offers.some((o) => o.locked)) continue;
      const mouse = game.props.find((o) => o.kind === 'mouse' && o.shopId === +id && !o.broken);
      if (mouse && ((mouse.strikes || 0) > 0 || mouse.angry > 0)) continue;   // rude: she is not offering
      game.shopDlg = { id: +id, t: 0, i: 0, rects: [], mx: -1, my: -1, free: offers.some((o) => o.free) };
      g.vx = g.vy = 0; if (g.state === 'windup' || g.state === 'bite') g.state = 'idle';
      game.audio.sfxCard(); game.audio.sfxCluck();
      return true;
    }
    return false;
  },
  closeShop(game) {
    const D = game.shopDlg; if (!D) return;
    game.shopShut = game.shopShut || {}; game.shopShut[D.id] = true;
    game.shopDlg = null; game.audio.sfxSwing(); game.clearEdges();
  },
  take(game, i) {
    const D = game.shopDlg, offers = this.shopOffers(game, D.id), o = offers[i];
    if (!o) { this.closeShop(game); return; }
    Shop.buy(game, o, game.goat);
    // a free shelf (her rat ogre dead) stays up for the next thing; otherwise one take is the deal
    const left = this.shopOffers(game, D.id).filter((w) => !w.chosen);
    if (!(D.free && left.length)) this.closeShop(game); else D.i = 0;
  },
  shopKey(game, code) {
    const D = game.shopDlg; if (!D) return false;
    if (code === 'KeyM' || code === TUNING.photo.key) return false;   // the mute and the camera are no verb, and work over her offer
    const n = this.shopOffers(game, D.id).length;
    if (code === 'Escape' || code === 'KeyE' || code === 'Backspace') { this.closeShop(game); return true; }
    if (D.t < TUNING.shop.dlg.arm) return true;
    if (code === 'Digit1' || code === 'Digit2' || code === 'Digit3') { const i = +code.slice(5) - 1; if (i < n) this.take(game, i); return true; }
    if (code === 'ArrowRight' || code === 'KeyD') { D.i = (D.i + 1) % (n + 1); game.audio.sfxSwing(); return true; }
    if (code === 'ArrowLeft' || code === 'KeyA') { D.i = (D.i + n) % (n + 1); game.audio.sfxSwing(); return true; }
    if (code === 'Enter' || code === 'NumpadEnter' || code === 'Space') { game.input.spacePressed = false; if (D.i >= n) this.closeShop(game); else this.take(game, D.i); return true; }
    return true;   // nothing else gets past her offer: no pause, no scream
  },
  // The floor waits while it is up. A click on a card takes it, on LEAVE or the right button looks away;
  // a pad walks the cards with the stick, A takes, B looks away.
  updateShop(game, dt) {
    const D = game.shopDlg, inp = game.input, g = game.goat;
    D.t += dt; g.vx *= 0.7; g.vy *= 0.7;
    game.updateEffects(dt); game.updateCamera(dt);
    const offers = this.shopOffers(game, D.id), n = offers.length;
    if (!n || offers.some((o) => o.locked)) { this.closeShop(game); return; }
    if (D.t < TUNING.shop.dlg.arm) return;
    if (padOn(game)) {
      const st = game.pad.step;
      if (st === 'right' || st === 'down') { D.i = (D.i + 1) % (n + 1); game.audio.sfxSwing(); }
      if (st === 'left' || st === 'up') { D.i = (D.i + n) % (n + 1); game.audio.sfxSwing(); }
      if (inp.rollPressed) { if (D.i >= n) this.closeShop(game); else this.take(game, D.i); return; }
      if (inp.spacePressed) { this.closeShop(game); return; }
    }
    if (inp.rmbPressed) { this.closeShop(game); return; }
    // A pad's trigger is a headbutt, never a click where the hidden pointer was left.
    if (inp.lmbPressed && !padOn(game)) {
      const p = inp.mouse, i = D.rects.findIndex((r) => r && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
      if (i >= 0) { if (i >= n) this.closeShop(game); else this.take(game, i); }
    }
  },
  drawShop(R, game) {
    const D = game.shopDlg; if (!D) return;
    const ctx = R.ctx, s = R.ts, W = R.w, Hh = R.h, t = R.t;
    const offers = this.shopOffers(game, D.id), n = offers.length; if (!n) return;
    const m = game.input.mouse, moved = m && (m.x !== D.mx || m.y !== D.my) && !game.touch.active && !padOn(game);
    if (m) { D.mx = m.x; D.my = m.y; }
    const vis = clamp(D.t / 0.25, 0, 1);
    ctx.save(); ctx.globalAlpha = vis;
    ctx.fillStyle = 'rgba(13,10,12,0.72)'; ctx.fillRect(0, 0, W, Hh);
    const narrow = R.portrait || W < 820 * s;
    const pw = Math.min(W - 28 * s, 1100 * s), x0 = (W - pw) / 2;
    // what goes where, measured before anything is drawn so the whole of it sits in the middle
    const mouse = game.props.find((o) => o.kind === 'mouse' && o.shopId === D.id && !o.broken);
    const say = mouse ? TUNING.prop.mouse.offer : TUNING.prop.mouse.free, face = mouse ? 70 * s : 0;
    ctx.font = FONT_PICK.font('say', Math.max(15 * R.s, 18 * s));
    const sayL = R.wrap(say, pw - 60 * s - face), ph = 40 * s + sayL.length * 24 * s;
    const gh = narrow ? 0 : Math.min(200 * s, Hh * 0.3), gw = narrow ? 0 : gh * 1.3;
    const cx0 = x0 + gw + (gw ? 18 * s : 0), avail = pw - gw - (gw ? 18 * s : 0), gap = 14 * s;
    const cw = Math.min(260 * s, (avail - gap * (n - 1)) / n), rowW = n * cw + (n - 1) * gap, sx = cx0 + (avail - rowW) / 2;
    const textW = cw - 24 * s;
    ctx.font = FONT_PICK.font('text', Math.max(13 * R.s, 13.5 * s));
    const card = offers.map((o) => {
      const milk = o.ware.id === 'milk', d = milk ? MILK_OFFER : Shop.def(o.ware.id), tier = milk ? null : Shop.tierOf(o.ware);
      const desc = milk ? MILK_OFFER.tiers[0].desc : tier ? tier.desc : '';
      return { o, milk, d, rr: milk ? null : rarityOf(o.ware.tier), desc, lines: R.wrap(desc, textW) };
    });
    const ch = Math.max(...card.map((c) => 118 * s + c.lines.length * 18 * s + 34 * s));
    const body = Math.max(gh + 44 * s, ch + 20 * s + 32 * s + 34 * s), py = Math.max(16 * s, (Hh - (ph + 22 * s + body)) / 2);
    // her words, on a plate at the top, and her beside them
    ctx.fillStyle = 'rgba(22,15,20,0.95)'; ctx.fillRect(x0, py, pw, ph);
    ctx.fillStyle = PALETTE.ochre; ctx.fillRect(x0, py, pw, 3 * s);
    if (mouse) {
      ctx.save(); ctx.translate(x0 + 44 * s, py + ph - 8 * s); const k = 3.2 * s; ctx.scale(k, k);
      const fake = { x: 9, y: 0, phase: 0, wobble: 0, angry: 0, strikes: 0, kind: 'mouse' };
      try { R.drawMouse(fake); } catch (err) { /* no picture of her: the words do */ }
      ctx.restore();
    }
    ctx.font = `700 ${Math.max(13 * R.s, 15 * s)}px ${FONT_SC}`; ctx.fillStyle = PALETTE.hen || PALETTE.ochre; ctx.textAlign = 'left';
    ctx.fillText(mouse ? 'THE MOUSE IN THE WALL' : 'HER SHELF', x0 + 20 * s + face, py + 24 * s);
    ctx.font = FONT_PICK.font('say', Math.max(15 * R.s, 18 * s)); ctx.fillStyle = PALETTE.bone;
    sayL.forEach((l, k) => ctx.fillText(l, x0 + 20 * s + face, py + 50 * s + k * 24 * s));
    // the goat, with whatever the pointer is on hung at his neck
    const top = py + ph + 22 * s;
    const sel = D.i < n ? offers[D.i] : null, tal = sel && sel.ware.id !== 'milk' ? { id: sel.ware.id, tier: sel.ware.tier } : game.artifact;
    if (gh) {
      const gx = x0 + gw / 2, gf = top + gh + 8 * s;
      this.pool(R, gx, gf - gh * 0.36, gh * 0.5, sel && sel.ware.id !== 'milk' ? rarityOf(sel.ware.tier).color : '#efe6d0', 1.3);
      this.portrait(R, game, gx, gf, gh, game.mods, tal, 'shop');
      ctx.textAlign = 'center'; ctx.font = `700 ${Math.max(12 * R.s, 12 * s)}px ${FONT_SC}`;
      ctx.fillStyle = sel && sel.ware.id !== 'milk' ? rarityOf(sel.ware.tier).color : 'rgba(239,230,208,0.55)';
      ctx.fillText(sel && sel.ware.id !== 'milk' ? 'AT YOUR NECK' : 'AS YOU ARE', gx, gf + 26 * s);
    }
    // the cards
    const cy = top + (gh ? Math.max(0, (gh + 34 * s - ch) / 2) : 0);
    D.rects = [];
    card.forEach((c, i) => {
      const x = sx + i * (cw + gap), y = cy, hov = moved && m.x >= x && m.x <= x + cw && m.y >= y && m.y <= y + ch;
      if (hov) D.i = i;
      const on = D.i === i, col = c.milk ? PALETTE.bone : c.rr.color;
      D.rects[i] = { x, y, w: cw, h: ch };
      const pk = clamp((D.t - 0.08 * i) / 0.22, 0, 1); if (pk <= 0) return;
      ctx.save(); ctx.globalAlpha *= pk;
      if (on) { ctx.strokeStyle = 'rgba(239,230,208,0.9)'; ctx.lineWidth = 2 * s; ctx.strokeRect(x - 4 * s, y - 4 * s, cw + 8 * s, ch + 8 * s); }
      ctx.fillStyle = on ? 'rgba(52,36,46,0.97)' : 'rgba(34,24,32,0.94)'; ctx.fillRect(x, y, cw, ch);
      ctx.strokeStyle = col; ctx.lineWidth = (on ? 3 : 2) * s; ctx.strokeRect(x, y, cw, ch);
      ctx.fillStyle = col; ctx.fillRect(x, y, cw, 4 * s);
      // the thing itself, breathing in a little light of its rarity
      const ix = x + cw / 2, iy = y + 40 * s + Math.sin(t * 2.6 + i) * 2 * s;
      if (!c.milk) this.pool(R, ix, iy, 30 * s, col, 1.2);
      R.artifactIcon(c.milk ? 'milk' : c.o.ware.id, ix, iy, 18 * s, c.o.ware.tier);
      ctx.textAlign = 'center'; ctx.font = `700 ${Math.max(14 * R.s, 16 * s)}px ${FONT_SC}`; ctx.fillStyle = PALETTE.bone;
      ctx.fillText(c.d.name, ix, y + 84 * s);
      ctx.font = `700 ${Math.max(12 * R.s, 12 * s)}px ${FONT_SC}`; ctx.fillStyle = col;
      ctx.fillText(c.milk ? `+${TUNING.shop.heals} HEARTS` : c.rr.name, ix, y + 102 * s);
      ctx.font = FONT_PICK.font('text', Math.max(13 * R.s, 13.5 * s));
      c.lines.forEach((l, k) => this.line(R, l, ix, y + 124 * s + k * 18 * s, 'center', 'rgba(239,230,208,0.82)'));
      ctx.font = `700 ${Math.max(12 * R.s, 11.5 * s)}px ${FONT_SC}`;
      const foot = c.o.chosen ? 'YOURS · TAKE IT BACK' : !c.milk && game.artifact ? 'INSTEAD OF ' + ((Shop.def(game.artifact.id) || {}).name || '') : '';
      if (foot) { ctx.fillStyle = PALETTE.witchHi; ctx.fillText(foot, ix, y + ch - 12 * s); }
      if (!game.touch.active && !padOn(game) && i < 3) { ctx.fillStyle = 'rgba(239,230,208,0.4)'; ctx.textAlign = 'left'; ctx.fillText(String(i + 1), x + 8 * s, y + 20 * s); }
      ctx.restore();
    });
    // the way out
    const lw = Math.min(rowW, 240 * s), lh = 32 * s, lx = sx + (rowW - lw) / 2, ly = cy + ch + 20 * s, lon = D.i >= n;
    if (moved && m.x >= lx && m.x <= lx + lw && m.y >= ly && m.y <= ly + lh) D.i = n;
    D.rects[n] = { x: lx, y: ly, w: lw, h: lh };
    ctx.fillStyle = lon ? 'rgba(53,40,74,0.8)' : 'rgba(37,29,48,0.55)'; ctx.fillRect(lx, ly, lw, lh);
    ctx.strokeStyle = lon ? PALETTE.witchHi : 'rgba(125,92,255,0.5)'; ctx.lineWidth = (lon ? 2 : 1.4) * s; ctx.strokeRect(lx, ly, lw, lh);
    ctx.textAlign = 'center'; ctx.font = `700 ${Math.max(12 * R.s, 13 * s)}px ${FONT_SC}`; ctx.fillStyle = lon ? PALETTE.bone : 'rgba(239,230,208,0.7)';
    ctx.fillText('NOT NOW', lx + lw / 2, ly + lh / 2 + 5 * s);
    ctx.font = `${Math.max(12 * R.s, 11.5 * s)}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.45)';
    ctx.fillText(game.touch.active ? 'tap a card to take it' : padOn(game) ? 'A takes · B walks away' : 'click or 1 / 2 / 3 takes · ESC or RMB walks away', W / 2, ly + lh + 22 * s);
    ctx.restore();
  },
};
