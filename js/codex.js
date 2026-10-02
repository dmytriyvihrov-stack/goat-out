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
    const ctx = R.ctx, segs = this.segments(text), w = textW(ctx, text);
    const fs = parseFloat((/(\d+(?:\.\d+)?)px/.exec(ctx.font) || [0, 12])[1]);
    let cx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    const keep = ctx.textAlign; ctx.textAlign = 'left';
    for (const sg of segs) {
      const sw = textW(ctx, sg.t);
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
      const wPre = textW(ctx, m2[1]); ctx.fillStyle = 'rgba(239,230,208,0.88)'; ctx.fillText(q.l.slice(m2[1].length), x + pad + wPre, ty);
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
    // Over the soul's cards too (2 Oct 2026: "I has to work while choosing a soul, to look quickly"):
    // closed, `pausedIn` hands the cards back exactly as they were.
    if (game.state !== 'play' && game.state !== 'boon' && !(game.state === 'heaven' && game.heaven && !game.heaven.talk && !game.heaven.panel)) return false;
    game.pauseFrom = game.state; game.state = 'paused'; game.pause.index = 0;
    game.menu.panel = 'book'; game.bookFromKey = true; game.book = { i: 0, mx: -1, my: -1 };
    game.audio.sfxCard(); return true;
  },
  close(game) {
    game.menu.panel = null; game.audio.sfxSwing();
    if (game.bookFromKey) { game.bookFromKey = false; game.state = game.pausedIn(); game.clearEdges(); }
  },
  SECTIONS: ['SOULS', 'TALISMAN', 'ANIMALS', 'FROM THE MIRROR'],
  // The souls in the order the book lays them (by verb, the active one first), so the arrow keys walk
  // the page the way it reads.
  VERB_ORDER: ['butt', 'grab', 'roll', 'scream', undefined],
  entries(game) {
    const out = [];
    // Up in heaven after a death the floor's souls are already lost (the card said so): the book lists what
    // the edge drops him back with, the head of the floor (`restartLevel` restores exactly these).
    const up = !!game.heaven, boons = up && game.levelBoons ? game.levelBoons : game.boons;
    const art = up && game.levelArtifact !== undefined ? game.levelArtifact : game.artifact;
    const vi = (b) => this.VERB_ORDER.indexOf(b.skill || undefined);
    for (const b of boons.slice().sort((a, c) => vi(a) - vi(c) || !!c.active - !!a.active)) out.push({ sec: 'SOULS', kind: 'boon', b });
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
  // The picture of an entry, centred at (cx, cy) in a box `h` px across: the very picture the game
  // offered it with (2 Oct 2026, playtest: "show exactly what the card and the shelf showed"). A soul
  // on a verb is that verb's chip as its soul card draws it (`Renderer.skillIcon` over `BOON_BASE` with
  // that soul alone, so each soul shows its own mark rather than the whole build); a body soul's card
  // has only its glyph, so the glyph; a talisman is the mouse's card (`artifactIcon` in a pool of its
  // rarity); an animal is the one its terms are said beside (`Beast.portrait`); the mirror, heaven's skull.
  icon(R, game, e, cx, cy, h) {
    const ctx = R.ctx;
    if (e.kind === 'boon') {
      const b = e.b;
      if (b.skill) {
        const pm = Object.assign({}, BOON_BASE); b.apply(pm, b.params || {});
        ctx.save(); ctx.translate(Math.round(cx), Math.round(cy)); R.skillIcon(b.skill, h * 0.3, game, !!pm.breath, pm); ctx.restore();
      } else {
        ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = PALETTE.bone;
        ctx.font = `${Math.round(h * 0.48)}px ${FONT}`; ctx.fillText(b.emoji || '•', cx, cy + h * 0.03); ctx.restore();
      }
    } else if (e.kind === 'art') { this.pool(R, cx, cy, h * 0.5, rarityOf(e.art.tier).color, 1.2); R.artifactIcon(e.art.id, cx, cy, h * 0.3, e.art.tier); }
    else if (e.kind === 'beast') {
      // feet on the box's floor; the horse is drawn a size down, he is half again as long as the rest
      const k = h * (e.k === 'horse' ? 0.62 : 0.78) / 52;
      ctx.save(); ctx.translate(Math.round(cx), Math.round(cy + h * 0.34)); Beast.portrait(R, ctx, e.k, k); ctx.restore();
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
    const on = (r) => r && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
    if (on(B.closeRect) || on(B.xRect)) { this.close(game); return; }
    const i = B.rects.findIndex((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
    if (i >= 0) { B.i = i; game.audio.sfxSwing(); }
  },
  // The book itself (2 Oct 2026, playtest: "the goat on the left, his build on the right, laid out as a
  // book, like Enter the Gungeon's ammonomicon"): a leather cover with brass corners, two pages and a
  // spine, a ribbon out of the foot, all in hard cells of `P` HUD px like the rest of the party.
  drawCover(R, x0, y0, pw, ph, P, cut) {
    const ctx = R.ctx, half = Math.round(pw / 2 / P) * P, cv = 4 * P;
    if (cut) return this.drawCoverStacked(R, x0, y0, pw, ph, P, cut);
    // the cover, its corners cut in steps, a stitch line round it
    ctx.fillStyle = PALETTE.ink; ctx.fillRect(x0 - cv - P, y0 - cv + P, pw + 2 * cv + 2 * P, ph + 2 * cv - 2 * P); ctx.fillRect(x0 - cv + P, y0 - cv - P, pw + 2 * cv - 2 * P, ph + 2 * cv + 2 * P);
    ctx.fillStyle = PALETTE.plum; ctx.fillRect(x0 - cv, y0 - cv + P, pw + 2 * cv, ph + 2 * cv - 2 * P); ctx.fillRect(x0 - cv + P, y0 - cv, pw + 2 * cv - 2 * P, ph + 2 * cv);
    ctx.fillStyle = 'rgba(239,230,208,0.07)'; ctx.fillRect(x0 - cv + P, y0 - cv, pw + 2 * cv - 2 * P, P);
    ctx.fillStyle = 'rgba(26,16,22,0.45)'; ctx.fillRect(x0 - cv + P, y0 + ph + cv - P, pw + 2 * cv - 2 * P, P);
    ctx.fillStyle = 'rgba(185,135,58,0.45)';
    const st = Math.max(1, Math.round(P / 2));
    for (let x = x0 - cv + 3 * P; x < x0 + pw + cv - 3 * P; x += 3 * P) { ctx.fillRect(x, y0 - cv + 2 * P, 2 * P, st); ctx.fillRect(x, y0 + ph + cv - 2 * P - st, 2 * P, st); }
    // the block of leaves under each page, a few edges stepped out at the foot and the outer side
    for (let k = 3; k >= 1; k--) {
      ctx.fillStyle = k % 2 ? PALETTE.dirtHi : PALETTE.wood;
      ctx.fillRect(x0 - k * P, y0 + k * P, half - P, ph);
      ctx.fillRect(x0 + half + P + k * P, y0 + k * P, pw - half - P, ph);
    }
    // the pages, a printed rule inset round each, and the gutter darkening in hard bands toward the spine
    // a step lighter than the floor's earth (2 Oct 2026: "the page a little lighter")
    ctx.fillStyle = PALETTE.dirtHi; ctx.fillRect(x0, y0, half - P, ph); ctx.fillRect(x0 + half + P, y0, pw - half - P, ph);
    ctx.fillStyle = 'rgba(239,230,208,0.05)'; ctx.fillRect(x0, y0, half - P, P); ctx.fillRect(x0 + half + P, y0, pw - half - P, P);
    const rule = (x, w) => { ctx.fillStyle = 'rgba(185,135,58,0.28)'; ctx.fillRect(x, y0 + 3 * P, w, Math.max(1, P / 3)); ctx.fillRect(x, y0 + ph - 3 * P, w, Math.max(1, P / 3)); };
    rule(x0 + 3 * P, half - 7 * P); rule(x0 + half + 4 * P, pw - half - 7 * P);
    for (let k = 0; k < 4; k++) {
      ctx.fillStyle = `rgba(26,16,22,${0.1 + k * 0.08})`;
      ctx.fillRect(x0 + half - P - (4 - k) * P, y0, P, ph); ctx.fillRect(x0 + half + P + (3 - k) * P, y0, P, ph);
    }
    // the spine
    ctx.fillStyle = PALETTE.ink; ctx.fillRect(x0 + half - P, y0 - cv, 2 * P, ph + 2 * cv);
    // brass corners, a stepped triangle on each outer corner, lit on its top edge
    const n = 6;
    for (const [cx, cy, sx, sy] of [[x0 - cv, y0 - cv, 1, 1], [x0 + pw + cv, y0 - cv, -1, 1], [x0 - cv, y0 + ph + cv, 1, -1], [x0 + pw + cv, y0 + ph + cv, -1, -1]]) {
      for (let i = 0; i < n; i++) {
        const w = (n - i) * P, x = sx > 0 ? cx : cx - w, y = sy > 0 ? cy + i * P : cy - (i + 1) * P;
        ctx.fillStyle = PALETTE.ink; ctx.fillRect(x - (sx > 0 ? 0 : P), y, w + P, P);
        ctx.fillStyle = i === 0 ? PALETTE.fireHi : i < 2 ? PALETTE.hay : PALETTE.ochre; ctx.fillRect(x + (sx > 0 ? 0 : 0), y, w - P, P);
      }
    }
    // the ribbon, out of the foot of the left page by the spine (the skill rail sits in the right-hand corner), its end cut in a V
    const rx = x0 + half - 12 * P, rtop = y0 + ph - 6 * P, rlen = 15 * P, rw = 3 * P;
    ctx.fillStyle = PALETTE.ink; ctx.fillRect(rx - P, rtop, rw + 2 * P, rlen);
    ctx.fillStyle = PALETTE.bloodDark; ctx.fillRect(rx, rtop, rw, rlen - P);
    ctx.fillStyle = PALETTE.blood; ctx.fillRect(rx, rtop, P, rlen - P);
    ctx.fillStyle = PALETTE.ink; ctx.fillRect(rx + P, rtop + rlen - 2 * P, P, 2 * P);
    ctx.fillStyle = PALETTE.ink; ctx.fillRect(rx - P, rtop - P, rw + 2 * P, P);
  },
  // The same book turned for a phone held upright (2 Oct 2026): side by side, a 375 px screen left each
  // page 150 px and every word ran over the next, so the pages lie one over the other, the spine across
  // at `cut` px from the top. Same leather, stitches, corners and ribbon.
  drawCoverStacked(R, x0, y0, pw, ph, P, cut) {
    const ctx = R.ctx, cv = 4 * P, bh = ph - cut - P;
    ctx.fillStyle = PALETTE.ink; ctx.fillRect(x0 - cv - P, y0 - cv + P, pw + 2 * cv + 2 * P, ph + 2 * cv - 2 * P); ctx.fillRect(x0 - cv + P, y0 - cv - P, pw + 2 * cv - 2 * P, ph + 2 * cv + 2 * P);
    ctx.fillStyle = PALETTE.plum; ctx.fillRect(x0 - cv, y0 - cv + P, pw + 2 * cv, ph + 2 * cv - 2 * P); ctx.fillRect(x0 - cv + P, y0 - cv, pw + 2 * cv - 2 * P, ph + 2 * cv);
    ctx.fillStyle = 'rgba(185,135,58,0.45)';
    const st = Math.max(1, Math.round(P / 2));
    for (let y = y0 - cv + 3 * P; y < y0 + ph + cv - 3 * P; y += 3 * P) { ctx.fillRect(x0 - cv + 2 * P, y, st, 2 * P); ctx.fillRect(x0 + pw + cv - 2 * P - st, y, st, 2 * P); }
    for (let k = 3; k >= 1; k--) {
      ctx.fillStyle = k % 2 ? PALETTE.dirtHi : PALETTE.wood;
      ctx.fillRect(x0 + k * P, y0 - k * P, pw, cut - P); ctx.fillRect(x0 + k * P, y0 + cut + P + k * P, pw, bh);
    }
    ctx.fillStyle = PALETTE.dirtHi; ctx.fillRect(x0, y0, pw, cut - P); ctx.fillRect(x0, y0 + cut + P, pw, bh);
    ctx.fillStyle = 'rgba(185,135,58,0.28)'; ctx.fillRect(x0 + 3 * P, y0 + 3 * P, pw - 6 * P, Math.max(1, P / 3)); ctx.fillRect(x0 + 3 * P, y0 + ph - 3 * P, pw - 6 * P, Math.max(1, P / 3));
    for (let k = 0; k < 4; k++) {
      ctx.fillStyle = `rgba(26,16,22,${0.1 + k * 0.08})`;
      ctx.fillRect(x0, y0 + cut - P - (4 - k) * P, pw, P); ctx.fillRect(x0, y0 + cut + P + (3 - k) * P, pw, P);
    }
    ctx.fillStyle = PALETTE.ink; ctx.fillRect(x0 - cv, y0 + cut - P, pw + 2 * cv, 2 * P);
    const n = 6;
    for (const [cx, cy, sx, sy] of [[x0 - cv, y0 - cv, 1, 1], [x0 + pw + cv, y0 - cv, -1, 1], [x0 - cv, y0 + ph + cv, 1, -1], [x0 + pw + cv, y0 + ph + cv, -1, -1]]) {
      for (let i = 0; i < n; i++) {
        const w = (n - i) * P, x = sx > 0 ? cx : cx - w, y = sy > 0 ? cy + i * P : cy - (i + 1) * P;
        ctx.fillStyle = PALETTE.ink; ctx.fillRect(x - (sx > 0 ? 0 : P), y, w + P, P);
        ctx.fillStyle = i === 0 ? PALETTE.fireHi : i < 2 ? PALETTE.hay : PALETTE.ochre; ctx.fillRect(x, y, w - P, P);
      }
    }
    const rx = x0 + 12 * P, rtop = y0 + ph - 6 * P, rlen = 15 * P, rw = 3 * P;
    ctx.fillStyle = PALETTE.ink; ctx.fillRect(rx - P, rtop - P, rw + 2 * P, rlen + P);
    ctx.fillStyle = PALETTE.bloodDark; ctx.fillRect(rx, rtop, rw, rlen - P);
    ctx.fillStyle = PALETTE.blood; ctx.fillRect(rx, rtop, P, rlen - P);
    ctx.fillStyle = PALETTE.ink; ctx.fillRect(rx + P, rtop + rlen - 2 * P, P, 2 * P);
  },
  // A tile of the right page: the card's own face at a size, its colour round it, lit when picked.
  tile(R, game, e, x, y, c, sel, s) {
    const ctx = R.ctx, col = this.frameColor(e), boon = e.kind === 'boon', t = Math.max(2, Math.round((sel ? 3 : 2) * s));
    if (sel) { ctx.fillStyle = 'rgba(239,230,208,0.9)'; const o = Math.round(4 * s), w = Math.max(2, Math.round(2 * s)); ctx.fillRect(x - o, y - o, c + 2 * o, w); ctx.fillRect(x - o, y + c + o - w, c + 2 * o, w); ctx.fillRect(x - o, y - o, w, c + 2 * o); ctx.fillRect(x + c + o - w, y - o, w, c + 2 * o); }
    // the fills the soul card and the mouse's card use, so a tile reads as that card
    ctx.fillStyle = boon ? (e.b.active ? (sel ? 'rgba(97,47,52,0.95)' : 'rgba(74,36,40,0.92)') : (sel ? 'rgba(76,45,66,0.95)' : 'rgba(59,34,51,0.9)')) : (sel ? 'rgba(52,36,46,0.97)' : 'rgba(34,24,32,0.94)');
    ctx.fillRect(x, y, c, c);
    ctx.fillStyle = col; ctx.fillRect(x, y, c, t); ctx.fillRect(x, y + c - t, c, t); ctx.fillRect(x, y, t, c); ctx.fillRect(x + c - t, y, t, c);
    ctx.save(); ctx.beginPath(); ctx.rect(x + t, y + t, c - 2 * t, c - 2 * t); ctx.clip();
    this.icon(R, game, e, x + c / 2, y + c / 2, c);
    ctx.restore();
    if (e.kind === 'beast' && e.n > 1) { ctx.font = `700 ${Math.max(12 * R.s, 12 * s)}px ${FONT_SC}`; ctx.fillStyle = PALETTE.bone; ctx.textAlign = 'right'; ctx.fillText('×' + e.n, x + c - 4 * s, y + c - 5 * s); ctx.textAlign = 'left'; }
    if (e.kind === 'mirror') { ctx.font = `700 ${Math.max(12 * R.s, 12 * s)}px ${FONT_SC}`; ctx.fillStyle = '#f7d774'; ctx.textAlign = 'right'; ctx.fillText('I'.repeat(e.r), x + c - 4 * s, y + c - 5 * s); ctx.textAlign = 'left'; }
  },
  drawBook(R, game) {
    const ctx = R.ctx, s0 = R.ts, W = R.w, Hh = R.h, B = game.book || (game.book = { i: 0, mx: -1, my: -1 });
    const list = this.entries(game); if (B.i >= list.length) B.i = Math.max(0, list.length - 1);
    // the pointer, once it moves, picks what it is on
    const m = game.input.mouse, moved = m && (m.x !== B.mx || m.y !== B.my); if (m) { B.mx = m.x; B.my = m.y; }
    ctx.save();
    ctx.fillStyle = 'rgba(9,7,9,0.82)'; ctx.fillRect(0, 0, W, Hh);
    const P = Math.max(2, Math.round(3 * s0)), q = (v) => Math.round(v / P) * P;
    // A screen taller than wide (a phone upright) stacks the pages, his over his build (`drawCoverStacked`).
    const stack = W < Hh * 0.9;
    const pw = q(Math.min(W - (stack ? 40 : 96) * s0, 1060 * s0)), ph = q(stack ? Hh - 150 * s0 : Math.min(Hh - 112 * s0, 620 * s0)), x0 = q((W - pw) / 2), y0 = q((Hh - ph) / 2);
    // what is inside is laid out for a book 1060 x 620 HUD px and drawn smaller on a screen too short or narrow for that
    const s = stack ? s0 : Math.min(s0, ph / 620, pw / 1060), cut = stack ? q(ph * 0.38) : 0;
    this.drawCover(R, x0, y0, pw, ph, P, cut);
    const half = q(pw / 2), LY = y0, LH = stack ? cut : ph, RY = y0 + cut, RH = ph - cut, RX = stack ? x0 : x0 + half;
    const lx = x0 + 30 * s, lw = (stack ? pw : half) - 60 * s, rx = RX + 30 * s, rw = (stack ? pw : pw - half) - 60 * s, lc = x0 + (stack ? pw : half) / 2;
    const head = (txt, x, y, w, align) => {
      ctx.textAlign = align; ctx.font = `700 ${Math.max(18 * R.s, 22 * s)}px ${FONT_SC}`; ctx.fillStyle = PALETTE.bone; ctx.fillText(txt, x, y);
      ctx.fillStyle = 'rgba(185,135,58,0.55)'; const yy = Math.round(y + 10 * s), x1 = align === 'center' ? x - w / 2 : x;
      ctx.fillRect(Math.round(x1), yy, Math.round(w), Math.max(1, Math.round(s)));
      ctx.fillStyle = PALETTE.ochre; const d = Math.max(2, Math.round(3 * s)), mx = Math.round(x1 + w / 2);
      ctx.fillRect(mx - d, yy - d + 1, 2 * d, 2 * d);
    };

    // ---- the left page: him, as he stands now
    head('THE GOAT', lc, LY + 44 * s, Math.min(lw, 260 * s), 'center');
    const g = game.goat, li = game.levelIndex | 0;
    const gh = Math.min(LH * (stack ? 0.34 : 0.5), lw * 0.62, 330 * s), gf = LY + 64 * s + gh * 1.18;
    this.pool(R, lc, gf - gh * 0.3, gh * 0.6, PALETTE.bone, 1.2);
    this.portrait(R, game, lc, gf, gh, game.mods, game.heaven && game.levelArtifact !== undefined ? game.levelArtifact : game.artifact, 'book');
    let ly = gf + 40 * s;
    ctx.textAlign = 'center'; ctx.font = `700 ${Math.max(13 * R.s, 15 * s)}px ${FONT_SC}`; ctx.fillStyle = PALETTE.ochre;
    ctx.fillText(game.heaven ? 'THE PASTURE ABOVE' : `LEVEL ${li + 1} · ${Painting.floorName(game, li)}`, lc, ly);
    // His hearts as the play HUD draws them (2 Oct 2026, "pictures, not words"): `HEART_GLYPH` in cells,
    // full in blood with the HUD's glint, lost ones faint, THE MIRROR's light hearts after his own.
    if (g && g.maxHp) {
      const HG = HEART_GLYPH, hpx = Math.max(2, Math.round(3 * s)), step = (HG[0].length + 2) * hpx;
      const n = g.maxHp + (g.light || 0), per = Math.max(1, Math.floor((lw + 2 * hpx) / step));
      const rows = Math.ceil(n / per), hh = HG.length * hpx;
      for (let i = 0; i < n; i++) {
        const row = Math.floor(i / per), inRow = Math.min(per, n - row * per);
        const ox = Math.round(lc - (inRow * step - 2 * hpx) / 2 + (i % per) * step), oy = Math.round(ly + 10 * s + row * (hh + 2 * hpx));
        const light = i >= g.maxHp, full = light || i < g.hp;
        ctx.fillStyle = light ? '#fff4c2' : full ? PALETTE.blood : 'rgba(239,230,208,0.16)';
        for (let r = 0; r < HG.length; r++) for (let c = 0; c < HG[r].length; c++) if (HG[r][c] === '#') ctx.fillRect(ox + c * hpx, oy + r * hpx, hpx, hpx);
        if (full && !light) { ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(ox + hpx, oy + hpx, hpx, hpx); }
      }
      ly += 4 * s + rows * (hh + 2 * hpx);   // the next line's baseline sits 20 px under this: about the old text line's height
    }
    // what the souls and the talisman have done to how he looks, named the way the soul card names it
    const looks = this.LOOKS.filter(([k]) => game.mods && game.mods[k]).map(([, nm]) => nm);
    if (looks.length) {
      ctx.font = `700 ${Math.max(12 * R.s, 12.5 * s)}px ${FONT_SC}`; ctx.fillStyle = PALETTE.fireHi;
      R.wrap(looks.join(' · '), lw).forEach((l) => { ly += 20 * s; ctx.fillText(l, lc, ly); });
    }
    // the way out, at the foot of his page
    ctx.font = `${Math.max(12 * R.s, 12.5 * s)}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.5)';
    const hint = game.touch.active ? 'tap a picture to read it · tap here to close' : padOn(game) ? 'the stick turns the page · B closes' : `point at a picture to read it · ${KEY_FACE.KeyI} or ESC closes`;
    const hy = LY + LH - 22 * s; ctx.fillText(hint, lc, hy);
    const hw = textW(ctx, hint); B.closeRect = { x: lc - hw / 2, y: hy - 16 * s, w: hw, h: 22 * s };
    // A cross in the book's top right corner (2 Oct 2026, "a clear × at the top right"): an ink plate on
    // the page with a brass rim, the X in cells of `xc` px, lit under the pointer; a click or a tap is I / ESC.
    {
      const xc = Math.max(2, Math.round(3 * s)), xs = 11 * xc, xx = Math.round(x0 + pw - 12 * s - xs), xy = Math.round(y0 + 12 * s);
      const hot = m && !padOn(game) && m.x >= xx && m.x <= xx + xs && m.y >= xy && m.y <= xy + xs;
      B.xRect = { x: xx - 4 * s, y: xy - 4 * s, w: xs + 8 * s, h: xs + 8 * s };   // a little wider than it looks, for a finger
      ctx.fillStyle = hot ? PALETTE.fireHi : PALETTE.ochre; ctx.fillRect(xx, xy, xs, xs);
      ctx.fillStyle = hot ? 'rgba(74,36,40,0.97)' : PALETTE.ink; ctx.fillRect(xx + xc, xy + xc, xs - 2 * xc, xs - 2 * xc);
      ctx.fillStyle = hot ? PALETTE.fireHi : PALETTE.bone;
      for (let i = 3; i <= 7; i++) { ctx.fillRect(xx + i * xc, xy + i * xc, xc, xc); ctx.fillRect(xx + (10 - i) * xc, xy + i * xc, xc, xc); }
      // thickened a cell to the right on each stroke, so it reads at a glance and stays on the grid
      for (let i = 3; i <= 6; i++) { ctx.fillRect(xx + (i + 1) * xc, xy + i * xc, xc, xc); ctx.fillRect(xx + (9 - i) * xc, xy + i * xc, xc, xc); }
    }

    // ---- the right page: his build, a tile a thing, and the one picked read out at the foot
    head('WHAT HE CARRIES', rx, RY + 44 * s, rw, 'left');
    const cell = Math.round(48 * s), gap = Math.round(10 * s);
    B.rects = [];
    const lay = (items, x, y, w, c = cell, gp = gap) => {
      const n = Math.max(1, Math.floor((w + gp) / (c + gp)));
      items.forEach((e, k) => {
        const i = list.indexOf(e), tx = x + (k % n) * (c + gp), ty = y + Math.floor(k / n) * (c + gp);
        B.rects[i] = { x: tx, y: ty, w: c, h: c };
        if (moved && m.x >= tx && m.x <= tx + c && m.y >= ty && m.y <= ty + c) B.i = i;
        this.tile(R, game, e, tx, ty, c, B.i === i, s);
      });
      return Math.max(1, Math.ceil(items.length / n)) * (c + gp) - gp;
    };
    const label = (txt, x, y) => { ctx.textAlign = 'left'; ctx.font = `700 ${Math.max(12 * R.s, 13 * s)}px ${FONT_SC}`; ctx.fillStyle = PALETTE.ochre; ctx.fillText(txt, x, y); return textW(ctx, txt); };
    const none = (txt, x, y) => { ctx.textAlign = 'left'; ctx.font = FONT_PICK.font('text', Math.max(12 * R.s, 13 * s)); ctx.fillStyle = 'rgba(239,230,208,0.4)'; ctx.fillText(txt, x, y + cell / 2 + 5 * s); return cell; };
    const of = (sec) => list.filter((e) => e.sec === sec);
    let y = RY + 76 * s;
    // The souls by the part of him they change (2 Oct 2026: "by the skills", then "a gradation by
    // upgrades, tied to a part of the body"): HORNS the headbutt, TEETH the grab, LEGS the roll, THROAT
    // the BAAH, BODY the rest. A row is the part's chip (the verb as the rail draws it over the whole
    // build) and its slots in order, I the active, II and III the passives (`BOON_SLOTS`), an empty slot
    // drawn empty so the row reads as how far that part has grown; a `key` soul (BY THE COLLAR) takes no
    // slot and stands after them. The body has `BOON_SLOTS.general` slots. Two parts a line where it fits.
    const souls = list.filter((e) => e.kind === 'boon'), K = keysOf(game), fire = !!(game.mods && game.mods.breath);
    const VERBS = this.VERB_ORDER.filter(Boolean);
    const onVerb = (id) => souls.filter((e) => (e.b.skill || 'body') === id);
    const keyed = (id) => onVerb(id).filter((e) => e.b.key);
    const slotsOf = (id) => id === 'body' ? BOON_SLOTS.general : BOON_SLOTS.active + BOON_SLOTS.passive;
    const wide = Math.max(...VERBS.map((id) => slotsOf(id) + keyed(id).length));   // tiles after the chip, the widest part
    const narrow = rw < 2 * ((wide + 1) * cell + wide * gap + 8 * s) + 16 * s, vg = narrow ? Math.round(5 * s) : gap, cg = narrow ? Math.round(5 * s) : Math.round(8 * s), colG = narrow ? Math.round(10 * s) : Math.round(16 * s);
    const small = Math.round(26 * s), fitC = Math.floor((rw - colG - 2 * cg - 2 * (wide - 1) * vg) / (2 * (wide + 1)));
    const vc = Math.min(cell, fitC), two = vc >= small, colW = two ? (rw - colG) / 2 : rw, cell2 = two ? vc : Math.min(cell, Math.floor((rw - cg - (wide - 1) * vg) / (wide + 1)));
    const PART = { butt: 'HORNS', grab: 'TEETH', roll: 'LEGS', scream: 'THROAT', body: 'BODY' };
    const partH = Math.round(Math.max(12 * R.s, 12 * s) + 6 * s);
    const chip = (x, yy, id) => {
      const cell = cell2;
      ctx.fillStyle = 'rgba(13,10,12,0.55)'; ctx.fillRect(x, yy, cell, cell);
      ctx.fillStyle = 'rgba(239,230,208,0.42)'; const t = Math.max(1, Math.round(1.5 * s));
      ctx.fillRect(x, yy, cell, t); ctx.fillRect(x, yy + cell - t, cell, t); ctx.fillRect(x, yy, t, cell); ctx.fillRect(x + cell - t, yy, t, cell);
      if (id === 'body') {   // the HUD's heart in ochre cells is the body
        ctx.fillStyle = PALETTE.ochre;
        const HG = HEART_GLYPH, hp = Math.max(1, Math.floor(cell * 0.55 / HG[0].length)), hx = Math.round(x + (cell - HG[0].length * hp) / 2), hy = Math.round(yy + (cell - HG.length * hp) / 2);
        for (let r = 0; r < HG.length; r++) for (let c = 0; c < HG[r].length; c++) if (HG[r][c] === '#') ctx.fillRect(hx + c * hp, hy + r * hp, hp, hp);
      } else { ctx.save(); ctx.translate(Math.round(x + cell / 2), Math.round(yy + cell / 2)); R.skillIcon(id, cell * 0.36, game, fire); ctx.restore(); }
    };
    // a slot nobody has filled: a faint frame of cells and its step, I, II, III
    const empty = (x, yy, c, k) => {
      const t = Math.max(1, Math.round(1.5 * s)), d = Math.max(2, Math.round(4 * s));
      ctx.fillStyle = 'rgba(13,10,12,0.22)'; ctx.fillRect(x, yy, c, c);
      ctx.fillStyle = 'rgba(239,230,208,0.22)';
      for (let p = 0; p < c; p += 2 * d) { const w = Math.min(d, c - p); ctx.fillRect(x + p, yy, w, t); ctx.fillRect(x + p, yy + c - t, w, t); ctx.fillRect(x, yy + p, t, w); ctx.fillRect(x + c - t, yy + p, t, w); }
      ctx.textAlign = 'center'; ctx.font = `700 ${Math.max(12 * R.s, Math.min(14 * s, c * 0.32))}px ${FONT_SC}`; ctx.fillStyle = 'rgba(239,230,208,0.3)';
      ctx.fillText(['I', 'II', 'III', 'IV', 'V', 'VI'][k] || String(k + 1), x + c / 2, yy + c / 2 + 5 * s); ctx.textAlign = 'left';
    };
    const put = (e, tx, ty, c) => {
      const i = list.indexOf(e);
      B.rects[i] = { x: tx, y: ty, w: c, h: c };
      if (moved && m.x >= tx && m.x <= tx + c && m.y >= ty && m.y <= ty + c) B.i = i;
      this.tile(R, game, e, tx, ty, c, B.i === i, s);
    };
    // one part: its name and key above, the chip, the slots filled in step order, then any key soul
    const partRow = (x, yy, w, id) => {
      const cell = cell2, all = onVerb(id), keys = all.filter((e) => e.b.key);
      const ranked = id === 'body' ? all : all.filter((e) => !e.b.key && e.b.active).concat(all.filter((e) => !e.b.key && !e.b.active));
      ctx.textAlign = 'left'; ctx.font = `700 ${Math.max(12 * R.s, 12 * s)}px ${FONT_SC}`; ctx.fillStyle = PALETTE.ochre;
      const nm = PART[id] + (id !== 'body' && !game.touch.active ? '  ·  ' + K[id] : '');
      ctx.fillText(nm, x, yy + partH - 6 * s);
      const ty = yy + partH;
      chip(x, ty, id);
      let tx = x + cell + cg;
      const n = Math.max(slotsOf(id), ranked.length);
      for (let k = 0; k < n; k++, tx += cell + vg) { if (ranked[k]) put(ranked[k], tx, ty, cell); else empty(tx, ty, cell, k); }
      for (const e of keys) { put(e, tx, ty, cell); tx += cell + vg; }
      return partH + cell;
    };
    label('SOULS', rx, y); y += 10 * s;
    for (let i = 0; i < VERBS.length; i += two ? 2 : 1) {
      let h = partRow(rx, y, colW, VERBS[i]);
      if (two && VERBS[i + 1]) h = Math.max(h, partRow(rx + colW + colG, y, colW, VERBS[i + 1]));
      y += h + (narrow ? vg : 8 * s);
    }
    y += partRow(rx, y, rw, 'body') + 20 * s;
    // the talisman and the animals share a band: one thing at his neck, a few at most brought out
    const tw = Math.max(cell, label('TALISMAN', rx, y)), ax = rx + tw + 34 * s;
    label('ANIMALS', ax, y); y += 10 * s;
    const ti = of('TALISMAN'), bi = of('ANIMALS');
    const th = ti.length ? lay(ti, rx, y, cell) : none('none yet', rx + 2 * s, y);
    const bh = bi.length ? lay(bi, ax, y, rx + rw - ax) : none('none brought out yet', ax + 2 * s, y);
    y += Math.max(th, bh) + 20 * s;
    const mi = of('FROM THE MIRROR');
    if (mi.length) { label('FROM THE MIRROR', rx, y); y += 10 * s; y += lay(mi, rx, y, rw) + 20 * s; }

    // the one picked, in full: its picture large, its name and kind, and what it does
    const e = list[B.i];
    const dy = Math.max(y + 2 * s, RY + RH - 196 * s);
    ctx.fillStyle = 'rgba(185,135,58,0.4)'; ctx.fillRect(Math.round(rx), Math.round(dy), Math.round(rw), Math.max(1, Math.round(s)));
    if (e) {
      const a = this.about(game, e), big = Math.round(84 * s), by = dy + 18 * s;
      this.tile(R, game, e, rx, by, big, false, s);
      const nx = rx + big + 18 * s;
      ctx.textAlign = 'left'; ctx.font = `700 ${Math.max(17 * R.s, 20 * s)}px ${FONT_SC}`; ctx.fillStyle = PALETTE.bone;
      // a soul is named the way its card names it: its glyph in front of the name
      ctx.fillText((e.kind === 'boon' && e.b.skill && e.b.emoji ? e.b.emoji + ' ' : '') + a.name, nx, by + 30 * s);
      ctx.font = `700 ${Math.max(12 * R.s, 12.5 * s)}px ${FONT_SC}`; ctx.fillStyle = a.color;
      ctx.fillText(a.tag + (e.kind === 'boon' && e.b.skill && !game.touch.active ? ' · ' + keysOf(game)[e.b.skill] : ''), nx, by + 52 * s);
      ctx.font = FONT_PICK.font('text', Math.max(13 * R.s, 15 * s));
      this.lines(R, a.text, rx, by + big + 30 * s, rw, 21 * s, 'left', 'rgba(239,230,208,0.88)');
    } else {
      ctx.textAlign = 'left'; ctx.font = FONT_PICK.font('text', Math.max(13 * R.s, 15 * s)); ctx.fillStyle = 'rgba(239,230,208,0.5)';
      R.wrap('Nothing yet. A soul, the mouse or an animal will change that.', rw).forEach((l, k) => ctx.fillText(l, rx, dy + 40 * s + k * 21 * s));
    }
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
      // Up to her, not to a stool: her wares stay with her (`Shop.shelved`).
      // Once she has turned and her rat ogre is down, the free shelf is on its stools: up to one of them.
      const her = p.kind === 'mouse' || (p.kind === 'ware' && !Shop.mouseOf(game, p));
      if (!her || p.broken || p.shopId === undefined || p.shopId < 0) continue;
      const d = hyp(p.x - g.x, p.y - g.y);
      near[p.shopId] = Math.min(near[p.shopId] === undefined ? Infinity : near[p.shopId], d);
    }
    game.shopShut = game.shopShut || {};
    for (const id of Object.keys(near)) {
      if (game.shopShut[id]) { if (near[id] > D.out * TILE) delete game.shopShut[id]; continue; }
      if (near[id] > D.r * TILE) continue;
      const offers = this.shopOffers(game, +id);
      if (!offers.length || offers.some((o) => o.locked)) continue;
      const mouse = game.props.find((o) => o.kind === 'mouse' && o.shopId === +id && !o.broken);
      // Rude: she is not offering while she is still saying so. Never for good off a strike: her wares
      // are with her (`Shop.shelved`), so one bump of the head used to leave the shop shut for the floor.
      if (mouse && (mouse.angry > 0 || (mouse.say && mouse.say.strike))) continue;
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
    const descW = cw - 24 * s;
    ctx.font = FONT_PICK.font('text', Math.max(13 * R.s, 13.5 * s));
    const card = offers.map((o) => {
      const milk = o.ware.id === 'milk', d = milk ? MILK_OFFER : Shop.def(o.ware.id), tier = milk ? null : Shop.tierOf(o.ware);
      const desc = milk ? MILK_OFFER.tiers[0].desc : tier ? tier.desc : '';
      return { o, milk, d, rr: milk ? null : rarityOf(o.ware.tier), desc, lines: R.wrap(desc, descW) };
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
      ctx.fillText(c.d.name, ix, y + 84 * s, cw - 10 * s);   // squeezed, not spilled, on a phone's narrow card
      ctx.font = `700 ${Math.max(12 * R.s, 12 * s)}px ${FONT_SC}`; ctx.fillStyle = col;
      ctx.fillText(c.milk ? `+${TUNING.shop.heals} HEARTS` : c.rr.name, ix, y + 102 * s);
      ctx.font = FONT_PICK.font('text', Math.max(13 * R.s, 13.5 * s));
      c.lines.forEach((l, k) => this.line(R, l, ix, y + 124 * s + k * 18 * s, 'center', 'rgba(239,230,208,0.82)'));
      ctx.font = `700 ${Math.max(12 * R.s, 11.5 * s)}px ${FONT_SC}`;
      const foot = c.o.chosen ? 'YOURS · TAKE IT BACK' : !c.milk && game.artifact ? 'INSTEAD OF ' + ((Shop.def(game.artifact.id) || {}).name || '') : '';
      if (foot) { ctx.fillStyle = PALETTE.witchHi; ctx.fillText(foot, ix, y + ch - 12 * s, cw - 10 * s); }
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
