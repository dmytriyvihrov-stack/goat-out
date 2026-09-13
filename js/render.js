// Rendering: responsive canvas, tiles, decals, firelight, props, enemies, goat, effects, HUD,
// on-screen touch controls and title cards. Placeholder shapes in the final palette.
const FONT = "'Alegreya', Georgia, 'Times New Roman', serif";
const FONT_SC = "'Alegreya SC', 'Alegreya', Georgia, serif";

// The controls, painted on the floor over the two rooms after the pen. Nothing about the mouse:
// a crosshair on a top-down game explains itself, and the floor has room for what it does not.
const CONTROL_LINES = {
  key: [
    ['WASD — RUN', 'LEFT CLICK — HEADBUTT', 'INTO A WALL KILLS', 'E — ROLL'],
    ['HOLD RIGHT CLICK — CARRY', 'LET GO — THROW', 'SPACE — THEY COME LOOKING'],
  ],
  touch: [
    ['LEFT THUMB — RUN', 'BUTT — HEADBUTT', 'INTO A WALL KILLS', 'ROLL — TUMBLE'],
    ['HOLD GRAB — CARRY', 'LET GO — THROW', 'BAAH — THEY COME LOOKING'],
  ],
};

class Renderer {
  constructor(canvas) {
    this.c = canvas; this.ctx = canvas.getContext('2d');
    this.t = 0; this.dust = []; this.vignette = null; this.vigKey = '';
    this.touchBand = false;
    this.resize();
  }

  configure(touchActive) {
    if (this.touchBand === !!touchActive) return;
    this.touchBand = !!touchActive; this.resize();
  }

  // Fits the backing store to the element, capped so phones stay smooth.
  resize() {
    const c = this.c;
    const cssW = Math.max(320, c.clientWidth || window.innerWidth);
    const cssH = Math.max(240, c.clientHeight || window.innerHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const maxPixels = 2200000;
    let scale = dpr;
    if (cssW * cssH * scale * scale > maxPixels) scale = Math.sqrt(maxPixels / (cssW * cssH));
    const w = Math.round(cssW * scale), h = Math.round(cssH * scale);
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    this.w = w; this.h = h; this.cssW = cssW; this.cssH = cssH; this.s = scale;
    this.ts = scale * clamp(Math.min(cssW, cssH) / 460, 0.62, 1.2);
    this.ctx.imageSmoothingEnabled = false;
    this.portrait = cssH > cssW * 1.12;
    // On a portrait phone the play view is letterboxed and the thumbs get their own deck below it.
    this.bandH = (this.portrait && this.touchBand) ? clamp(h * 0.28, 150 * scale, 250 * scale) : 0;
    this.vw = w; this.vh = h - this.bandH;
    this.vcx = w / 2; this.vcy = this.vh / 2;
    // Tiles across: fewer on a phone so the sprites stay readable, never under 9 tiles tall.
    const phone = Math.min(cssW, cssH) < 520;
    const wantX = phone ? (this.portrait ? 14 : 17) : (cssW < 760 ? 16 : 24);
    this.zoomFit = Math.min(this.vw / (wantX * TILE), this.vh / (9 * TILE * TILT));
    this.vignette = null;
  }

  view(cam) {
    const z = cam.zoom;
    return { w: this.vw / z, h: this.vh / (z * TILT), z };
  }

  draw(game, dt) {
    this.t += dt;
    if (this.c.clientWidth && (Math.abs(this.c.clientWidth - this.cssW) > 1 || Math.abs(this.c.clientHeight - this.cssH) > 1)) this.resize();
    const ctx = this.ctx, w = this.w, h = this.h;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = game.level ? game.level.def.fog : '#0d0a0c';
    ctx.fillRect(0, 0, w, h);
    if (game.world) {
      const cam = game.cam;
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, this.vw, this.vh); ctx.clip();
      const zk = 1 + (game.zoomKick || 0);
      ctx.translate(this.vcx + (game.shakeX + game.kickX) * this.s, this.vcy + (game.shakeY + game.kickY) * this.s);
      ctx.scale(cam.zoom * zk, cam.zoom * zk * TILT);
      ctx.translate(-Math.round(cam.x), -Math.round(cam.y));
      this.drawTiles(game, cam);
      this.drawDecals(game, cam);
      this.drawHints(game);
      this.drawFire(game, cam);
      this.drawLight(game, cam);
      this.drawDust(game, cam, dt);
      this.drawRunes(game);
      this.drawTomes(game);
      for (const p of game.props) if (!p.broken && p.kind !== 'lamp' && !(p.kind === 'cage' && p.y > game.goat.y)) this.drawProp(p);
      for (const e of game.enemies) if (!e.dead && (e.state === 'floored' || e.state === 'stunned')) this.drawEnemy(e, game);
      for (const p of game.props) if (!p.broken && p.kind === 'lamp') this.drawProp(p);
      for (const e of game.enemies) if (!e.dead && e.state !== 'floored' && e.state !== 'stunned' && e !== game.goat.holding) this.drawEnemy(e, game);
      for (const b of game.bullets) this.drawBullet(b);
      if (!game.goat.dead) this.drawGoat(game.goat, game);
      if (game.goat.holding) { const hld = game.goat.holding; if (hld.kind === 'pot') this.drawProp(hld); else this.drawEnemy(hld, game); }
      for (const p of game.props) if (!p.broken && p.kind === 'cage' && p.y > game.goat.y) this.drawProp(p);
      this.drawBreath(game);
      this.drawRings(game);
      this.drawParticles(game);
      this.drawFloatTexts(game);
      ctx.restore();
    }
    this.drawVignette(game);
    this.drawHurt(game);
    this.drawFlash(game);
    this.drawUI(game);
    if (game.touch.active && game.state === 'play') this.drawTouchUI(game);
    this.drawBoonChoice(game);
    this.drawCard(game);
    this.drawDev(game);
  }

  visibleTiles(cam) {
    const v = this.view(cam);
    return {
      x0: Math.floor((cam.x - v.w / 2) / TILE) - 1, y0: Math.floor((cam.y - v.h / 2) / TILE) - 1,
      x1: Math.ceil((cam.x + v.w / 2) / TILE) + 1, y1: Math.ceil((cam.y + v.h / 2) / TILE) + 1,
    };
  }

  drawTiles(game, cam) {
    const ctx = this.ctx, wd = game.world, def = game.level.def;
    const { x0, y0, x1, y1 } = this.visibleTiles(cam);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const t = wd.tileAt(tx, ty), px = tx * TILE, py = ty * TILE;
        if (t === T.WALL) {
          const openN = !wd.isSolid(tx, ty - 1), openS = !wd.isSolid(tx, ty + 1);
          const openW = !wd.isSolid(tx - 1, ty), openE = !wd.isSolid(tx + 1, ty);
          const open = openN || openS || openW || openE
            || !wd.isSolid(tx - 1, ty - 1) || !wd.isSolid(tx + 1, ty - 1) || !wd.isSolid(tx - 1, ty + 1) || !wd.isSolid(tx + 1, ty + 1);
          if (!open) continue;
          ctx.fillStyle = def.wall; ctx.fillRect(px, py, TILE, TILE);
          ctx.fillStyle = def.wallTop;
          if (openN) ctx.fillRect(px, py, TILE, 7);
          if (openW) ctx.fillRect(px, py, 4, TILE);
          if (openE) { ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(px + TILE - 4, py, 4, TILE); }
          if (openS) { ctx.fillStyle = 'rgba(0,0,0,0.38)'; ctx.fillRect(px, py + TILE - 6, TILE, 6); }
          continue;
        }
        ctx.fillStyle = ((tx + ty) & 1) ? def.floor : def.floorAlt; ctx.fillRect(px, py, TILE, TILE);
        // A dark lip under every wall gives the floor some depth.
        if (wd.isSolid(tx, ty - 1)) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(px, py, TILE, 5); }
        if (t === T.HAY) {
          ctx.fillStyle = PALETTE.hay; ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
          ctx.strokeStyle = PALETTE.hayDark; ctx.lineWidth = 2; ctx.beginPath();
          for (let k = 0; k < 4; k++) { const sx = px + 5 + k * 7, sy = py + 5 + ((tx * 3 + ty * 5 + k) % 3) * 6; ctx.moveTo(sx, sy); ctx.lineTo(sx + 5, sy + 12); }
          ctx.stroke();
        } else if (t === T.ASH) {
          ctx.fillStyle = PALETTE.ash; ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
          ctx.fillStyle = '#3a3230'; ctx.fillRect(px + 8, py + 10, 6, 4); ctx.fillRect(px + 18, py + 20, 7, 4);
        } else if (t === T.EXIT) {
          const pulse = 0.55 + 0.25 * Math.sin(this.t * 3.4);
          ctx.fillStyle = PALETTE.bone; ctx.fillRect(px, py, TILE, TILE);
          ctx.fillStyle = `rgba(255,224,138,${pulse * 0.5})`; ctx.fillRect(px - 10, py - 10, TILE + 20, TILE + 20);
        }
      }
    }
  }

  drawDecals(game, cam) {
    const ctx = this.ctx, wd = game.world, v = this.view(cam);
    const sx = cam.x - v.w / 2, sy = cam.y - v.h / 2;
    const cx = clamp(sx, 0, wd.W * TILE), cy = clamp(sy, 0, wd.H * TILE);
    const cw = clamp(sx + v.w, 0, wd.W * TILE) - cx, ch = clamp(sy + v.h, 0, wd.H * TILE) - cy;
    if (cw <= 0 || ch <= 0) return;
    ctx.drawImage(wd.decal, cx * DECAL_SCALE, cy * DECAL_SCALE, cw * DECAL_SCALE, ch * DECAL_SCALE, cx, cy, cw, ch);
  }

  // Words painted on the floor instead of a tutorial box, the way Ape Out does it.
  drawHints(game) {
    const ctx = this.ctx, lv = game.level;
    ctx.save(); ctx.scale(1, 1 / TILT); ctx.textAlign = 'center';
    if (lv.hints) {
      ctx.font = `700 26px ${FONT_SC}`;
      for (const hn of lv.hints) {
        if (Math.abs(hn.x - game.cam.x) > 1100 || Math.abs(hn.y - game.cam.y) > 800) continue;
        ctx.fillStyle = 'rgba(239,230,208,0.15)';
        ctx.fillText(hn.text, hn.x, hn.y * TILT);
      }
    }
    if (lv.controls) {
      const sets = game.touch.active ? CONTROL_LINES.touch : CONTROL_LINES.key;
      ctx.fillStyle = 'rgba(239,230,208,0.19)';
      for (const c of lv.controls) {
        if (Math.abs(c.x - game.cam.x) > 1400) continue;
        const lines = sets[c.part] || [];
        const size = this.fitFloorText(lines, (c.w || 14 * TILE) - 2.6 * TILE, 26);
        const lh = size * 1.4, top = c.y - (lines.length - 1) * lh / 2;
        lines.forEach((l, i) => ctx.fillText(l, c.x, (top + i * lh) * TILT));
      }
    }
    // The pen. After five seconds of standing in it, the floor says which button opens it.
    if (lv.cagePrompt && !game.cageOpen) {
      const C = TUNING.cagePrompt, a = clamp((game.timer - C.delay) / C.fade, 0, 1);
      if (a > 0) {
        const p = lv.cagePrompt, pulse = 0.3 + 0.12 * Math.sin(this.t * 3.2);
        const label = game.touch.active ? 'BUTT — HEADBUTT' : 'LEFT CLICK — HEADBUTT';
        this.fitFloorText([label], 15 * TILE, 27);
        ctx.fillStyle = `rgba(255,224,138,${a * pulse})`;
        ctx.fillText(label, p.x, p.y * TILT);
        ctx.font = `700 19px ${FONT_SC}`;
        ctx.fillStyle = `rgba(239,230,208,${a * (pulse - 0.08)})`;
        ctx.fillText('BREAK OUT', p.x, (p.y + 30) * TILT);
      }
    }
    ctx.textAlign = 'left'; ctx.restore();
  }

  // Sets the font so the widest line fits the space it is painted on, and returns the size used.
  fitFloorText(lines, maxW, size) {
    const ctx = this.ctx;
    ctx.font = `700 ${size}px ${FONT_SC}`;
    let longest = 0;
    for (const l of lines) longest = Math.max(longest, ctx.measureText(l).width);
    if (longest > maxW && longest > 0) {
      size = Math.max(14, size * maxW / longest);
      ctx.font = `700 ${size}px ${FONT_SC}`;
    }
    return size;
  }

  drawFire(game, cam) {
    const ctx = this.ctx, wd = game.world;
    const { x0, y0, x1, y1 } = this.visibleTiles(cam);
    for (let ty = Math.max(0, y0); ty <= Math.min(wd.H - 1, y1); ty++) {
      for (let tx = Math.max(0, x0); tx <= Math.min(wd.W - 1, x1); tx++) {
        const i = ty * wd.W + tx, f = wd.fire[i]; if (f <= 0) continue;
        ctx.save(); ctx.scale(1, 1 / TILT);
        this.flame(tx * TILE + TILE / 2, (ty * TILE + TILE / 2) * TILT, 14 + 4 * Math.sin(this.t * 13 + tx * 7 + ty * 3), tx * 3 + ty, wd.fireKind[i] === 1);
        ctx.restore();
      }
    }
  }

  // Additive pools of light under every flame, so fire reads as a light source.
  drawLight(game, cam) {
    const ctx = this.ctx, wd = game.world;
    const { x0, y0, x1, y1 } = this.visibleTiles(cam);
    const spots = [];
    for (const p of game.props) if (!p.broken && (p.kind === 'brazier' || p.kind === 'lamp')) spots.push([p.x, p.y, 96]);
    for (let ty = Math.max(0, y0); ty <= Math.min(wd.H - 1, y1) && spots.length < 60; ty++) {
      for (let tx = Math.max(0, x0); tx <= Math.min(wd.W - 1, x1) && spots.length < 60; tx++) {
        if (wd.fire[ty * wd.W + tx] > 0) spots.push([tx * TILE + 16, ty * TILE + 16, 80, wd.fireKind[ty * wd.W + tx] === 1]);
      }
    }
    if (!spots.length) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const [x, y, r, witch] of spots) {
      const rr = r * (0.9 + 0.1 * Math.sin(this.t * 9 + x * 0.05));
      const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
      if (witch) { g.addColorStop(0, 'rgba(125,92,255,0.34)'); g.addColorStop(0.5, 'rgba(91,74,138,0.13)'); }
      else { g.addColorStop(0, 'rgba(242,162,51,0.34)'); g.addColorStop(0.5, 'rgba(192,57,43,0.11)'); }
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // Dust drifting toward the exit: the brief's direction cue.
  drawDust(game, cam, dt) {
    const ctx = this.ctx, v = this.view(cam);
    while (this.dust.length < 34) {
      this.dust.push({ x: cam.x + (Math.random() - 0.5) * v.w, y: cam.y + (Math.random() - 0.5) * v.h, s: 0.4 + Math.random() * 1.3, a: 0.05 + Math.random() * 0.12 });
    }
    ctx.fillStyle = PALETTE.bone;
    for (const d of this.dust) {
      d.x += (9 + d.s * 14) * dt; d.y += Math.sin(this.t * 0.7 + d.x * 0.01) * 5 * dt;
      if (d.x > cam.x + v.w / 2 + 20 || Math.abs(d.y - cam.y) > v.h / 2 + 20) { d.x = cam.x - v.w / 2 - 10; d.y = cam.y + (Math.random() - 0.5) * v.h; }
      ctx.globalAlpha = d.a; ctx.fillRect(d.x, d.y, d.s * 1.6, d.s * 1.6);
    }
    ctx.globalAlpha = 1;
  }

  // `witch` draws the Seer's fire: the same shape, cold, and nothing turns it away.
  flame(x, y, size, seed, witch) {
    const ctx = this.ctx, t = this.t * 10 + seed;
    ctx.fillStyle = witch ? PALETTE.witch : PALETTE.fire;
    ctx.beginPath(); ctx.ellipse(x, y - size * 0.2, size * 0.7, size, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = witch ? PALETTE.witchHi : PALETTE.fireHi;
    ctx.beginPath(); ctx.ellipse(x + Math.sin(t) * 3, y - size * 0.1, size * 0.35, size * 0.55 + Math.sin(t * 1.7) * 3, 0, 0, Math.PI * 2); ctx.fill();
  }

  shadow(x, y, rx, ry) {
    const ctx = this.ctx; ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath(); ctx.ellipse(x, y + ry * 0.55, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  }

  drawProp(p) {
    const ctx = this.ctx;
    if (p.kind === 'mill') { this.drawMill(p); return; }
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1, 1 / TILT); ctx.translate(-p.x, -p.y);
    this.drawPropBody(p);
    ctx.restore();
  }

  // The Mill: a ritual grinding wheel. Its arms sweep along the ground, so it stays squashed with it.
  drawMill(p) {
    const ctx = this.ctx, M = TUNING.mill;
    ctx.save(); ctx.translate(p.x, p.y);
    // the worn groove the arms have cut into the floor
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.arc(0, 0, M.armLen * 0.86, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(122,31,24,0.22)'; ctx.lineWidth = 22;
    ctx.beginPath(); ctx.arc(0, 0, M.armLen * 0.62, 0, Math.PI * 2); ctx.stroke();
    ctx.rotate(p.angle);
    for (const dir of [0, Math.PI]) {
      ctx.save(); ctx.rotate(dir);
      ctx.fillStyle = 'rgba(0,0,0,0.32)'; ctx.fillRect(M.innerR - 6, -7 + 6, M.armLen - M.innerR + 10, 16);
      ctx.fillStyle = PALETTE.wood; ctx.fillRect(M.innerR - 6, -8, M.armLen - M.innerR + 10, 16);
      ctx.fillStyle = PALETTE.woodHi; ctx.fillRect(M.innerR - 6, -8, M.armLen - M.innerR + 10, 4);
      ctx.fillStyle = '#6d6a66'; ctx.fillRect(M.armLen - 16, -12, 16, 24);        // iron cap
      ctx.fillStyle = '#8d8a85'; ctx.fillRect(M.armLen - 16, -12, 16, 5);
      ctx.fillStyle = PALETTE.bloodDark; ctx.fillRect(M.armLen - 16, 6, 16, 6);
      ctx.restore();
    }
    ctx.fillStyle = '#4d4741'; ctx.beginPath(); ctx.arc(0, 0, M.hubR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6a635b'; ctx.beginPath(); ctx.arc(0, -3, M.hubR - 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2e2a26'; ctx.beginPath(); ctx.arc(0, -3, 7, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  drawPropBody(p) {
    const ctx = this.ctx;
    if (p.kind === 'brazier') {
      this.shadow(p.x, p.y, p.r * 1.1, p.r * 0.55);
      ctx.fillStyle = PALETTE.brazier; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2a2018'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r - 4, 0, Math.PI * 2); ctx.fill();
      this.flame(p.x, p.y - 6, 12 + 3 * Math.sin(this.t * 11 + p.phase), p.phase * 10);
    } else if (p.kind === 'bell') {
      const ring = p.rung > 0 ? Math.sin(this.t * 40) * 3 : 0;
      this.shadow(p.x, p.y, p.r, p.r * 0.5);
      ctx.fillStyle = PALETTE.cult; ctx.beginPath(); ctx.arc(p.x + ring, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = PALETTE.bone; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x + ring, p.y, p.r - 4, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = PALETTE.bone; ctx.beginPath(); ctx.arc(p.x + ring, p.y, 3, 0, Math.PI * 2); ctx.fill();
    } else if (p.kind === 'door') {
      const tall = p.vertical;
      const wdt = tall ? 13 : 58, hgt = tall ? 58 : 13;
      ctx.save(); ctx.translate(p.x, p.y);
      if (p.open > 0) ctx.rotate((tall ? -1 : 1) * p.open * 1.25);
      this.shadow(0, 0, wdt * 0.6, hgt * 0.4);
      ctx.fillStyle = PALETTE.wood; ctx.fillRect(-wdt / 2, -hgt / 2, wdt, hgt);
      ctx.fillStyle = PALETTE.woodHi; ctx.fillRect(-wdt / 2, -hgt / 2, tall ? 4 : wdt, tall ? hgt : 4);
      ctx.strokeStyle = 'rgba(26,16,22,0.55)'; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let k = -1; k <= 1; k++) { if (tall) { ctx.moveTo(-wdt / 2, k * 16); ctx.lineTo(wdt / 2, k * 16); } else { ctx.moveTo(k * 16, -hgt / 2); ctx.lineTo(k * 16, hgt / 2); } }
      ctx.stroke();
      ctx.fillStyle = PALETTE.ochre; ctx.beginPath(); ctx.arc(0, 0, 3.2, 0, Math.PI * 2); ctx.fill();
      if (p.pressure > 0.15) { ctx.strokeStyle = `rgba(192,57,43,${Math.min(0.8, p.pressure)})`; ctx.lineWidth = 2; ctx.strokeRect(-wdt / 2 - 2, -hgt / 2 - 2, wdt + 4, hgt + 4); }
      ctx.restore();
    } else if (p.kind === 'table') {
      const a = p.flung ? Math.atan2(p.vy, p.vx) : 0;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a);
      this.shadow(0, 0, p.r * 1.05, p.r * 0.6);
      ctx.fillStyle = '#4a3420';
      for (const [lx, ly] of [[-13, -11], [13, -11], [-13, 11], [13, 11]]) { ctx.beginPath(); ctx.arc(lx, ly, 3.4, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = PALETTE.wood; ctx.fillRect(-p.r, -p.r * 0.78, p.r * 2, p.r * 1.56);
      ctx.fillStyle = PALETTE.woodHi; ctx.fillRect(-p.r, -p.r * 0.78, p.r * 2, 5);
      ctx.strokeStyle = 'rgba(26,16,22,0.5)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-6, -p.r * 0.78); ctx.lineTo(-6, p.r * 0.78); ctx.moveTo(7, -p.r * 0.78); ctx.lineTo(7, p.r * 0.78); ctx.stroke();
      ctx.restore();
    } else if (p.kind === 'lamp') {
      this.shadow(p.x, p.y, 7, 4);
      ctx.strokeStyle = '#44342a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(p.x, p.y + 3); ctx.lineTo(p.x, p.y - 14); ctx.stroke();
      ctx.fillStyle = PALETTE.ochre; ctx.beginPath(); ctx.ellipse(p.x, p.y - 17, 6, 7, 0, 0, Math.PI * 2); ctx.fill();
      this.flame(p.x, p.y - 20, 8 + 2 * Math.sin(this.t * 12 + p.phase), p.phase);
    } else if (p.kind === 'cage') {
      const h = TUNING.prop.cage.height;
      // Every headbutt the pen survives leaves the bars further out of true.
      const sgn = ((Math.round(p.x / 7) % 2) ? 1 : -1);
      const lean = (p.hits || 0) * 0.085 * sgn + (p.wobble > 0 ? Math.sin(this.t * 62) * 0.06 : 0);
      this.shadow(p.x, p.y, 5, 3);
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(lean);
      // Bars on the far and near sides carry a rail, so a row of them reads as one fence.
      if (p.axis === 'h') {
        ctx.fillStyle = '#3c3730'; ctx.fillRect(-15, -h + 3, 30, 4);
        ctx.fillStyle = '#6a635b'; ctx.fillRect(-15, -h + 3, 30, 1.5);
      }
      ctx.fillStyle = '#4d4741'; ctx.fillRect(-2.6, -h, 5.2, h);
      ctx.fillStyle = '#7d756a'; ctx.fillRect(-2.6, -h, 1.7, h);
      ctx.restore();
      ctx.fillStyle = '#2e2a26'; ctx.fillRect(p.x - 3.6, p.y - 3.5, 7.2, 4.5);
    } else if (p.kind === 'heal') {
      const bob = Math.sin(this.t * 2.4 + p.phase) * 2;
      const g = ctx.createRadialGradient(p.x, p.y + bob, 0, p.x, p.y + bob, 34);
      g.addColorStop(0, 'rgba(239,230,208,0.25)'); g.addColorStop(1, 'rgba(239,230,208,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y + bob, 34, 0, Math.PI * 2); ctx.fill();
      this.shadow(p.x, p.y + 3, 11, 5);
      ctx.fillStyle = '#6b5340'; ctx.beginPath(); ctx.ellipse(p.x, p.y + bob, 12, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = PALETTE.bone; ctx.beginPath(); ctx.ellipse(p.x, p.y - 1.5 + bob, 9.5, 6.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.ellipse(p.x - 3, p.y - 3 + bob, 3, 2, 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.scale(1, 1 / TILT);
      ctx.font = `700 ${11}px ${FONT_SC}`; ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(239,230,208,${0.45 + 0.25 * Math.sin(this.t * 3)})`;
      ctx.fillText('MILK', p.x, (p.y - 22 + bob) * TILT); ctx.textAlign = 'left'; ctx.restore();
    } else {
      this.shadow(p.x, p.y, p.r, p.r * 0.5);
      ctx.fillStyle = PALETTE.ochre; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = PALETTE.plum; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, p.r - 3, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(239,230,208,0.25)'; ctx.beginPath(); ctx.arc(p.x - 3, p.y - 3, p.r * 0.35, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Everything a man is made of: hood or head, sash, bone mask, and whatever he is holding.
  drawCultist(e, r) {
    const ctx = this.ctx;
    if (e.kind === 'seer') {
      // Tall pointed hood and a long staff: nothing else on the level looks like him.
      ctx.fillStyle = PALETTE.cult;
      ctx.beginPath(); ctx.moveTo(-r * 2.1, 0); ctx.quadraticCurveTo(-r * 0.7, -r * 1.25, r * 0.3, -r * 0.8);
      ctx.lineTo(r * 0.3, r * 0.8); ctx.quadraticCurveTo(-r * 0.7, r * 1.25, -r * 2.1, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#2b2340'; ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2); ctx.fill();
    } else if (e.kind === 'hunter') {
      // Hooded silhouette: a point at the back so he reads differently from a Bearer at a glance.
      ctx.fillStyle = PALETTE.cult;
      ctx.beginPath(); ctx.moveTo(-r * 1.75, 0); ctx.quadraticCurveTo(-r * 0.6, -r * 1.1, r * 0.35, -r * 0.72);
      ctx.lineTo(r * 0.35, r * 0.72); ctx.quadraticCurveTo(-r * 0.6, r * 1.1, -r * 1.75, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = PALETTE.ink; ctx.beginPath(); ctx.arc(0, 0, r * 0.86, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = e.kind === 'butcher' ? PALETTE.plum : PALETTE.ink;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    }
    if (e.kind === 'butcher') {
      ctx.fillStyle = PALETTE.ink; ctx.beginPath(); ctx.arc(-r * 0.15, 0, r * 0.78, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(239,230,208,0.82)';          // butcher's apron
      ctx.beginPath(); ctx.ellipse(r * 0.16, 0, r * 0.52, r * 0.72, 0, 0, Math.PI * 2); ctx.fill();
    }
    // sash
    ctx.strokeStyle = PALETTE.blood; ctx.lineWidth = e.kind === 'butcher' ? 5 : 3;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.62, Math.PI * 0.7, Math.PI * 1.5); ctx.stroke();
    // bone mask
    ctx.fillStyle = PALETTE.bone; ctx.beginPath(); ctx.ellipse(r * 0.5, 0, r * 0.42, r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PALETTE.ink; ctx.fillRect(r * 0.52, -r * 0.3, 3.4, 3.4); ctx.fillRect(r * 0.52, r * 0.1, 3.4, 3.4);
    if (e.kind === 'butcher') {   // horns on the mask
      ctx.strokeStyle = PALETTE.bone; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(r * 0.45, -r * 0.42); ctx.lineTo(r * 0.15, -r * 0.86);
      ctx.moveTo(r * 0.45, r * 0.42); ctx.lineTo(r * 0.15, r * 0.86); ctx.stroke();
    }
    // weapon
    let swing = 0;
    if (e.state === 'windup') swing = -1.3; else if (e.state === 'swing') swing = 1.1 - e.timer * 6; else if (e.state === 'recover') swing = 0.6;
    if (e.flail > 0) swing = Math.sin(this.t * 26) * 1.5;
    if (e.kind === 'bearer') {
      ctx.save(); ctx.rotate(swing); ctx.strokeStyle = PALETTE.ochre; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(r * 0.3, r * 0.6); ctx.lineTo(r + 13, r * 0.6); ctx.stroke(); ctx.restore();
    } else if (e.kind === 'seer') {
      const lit = e.state === 'cast' ? 1 : 0.45;
      ctx.strokeStyle = '#4a3a2c'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-r * 0.2, r * 0.7); ctx.lineTo(r + 14, -r * 0.5); ctx.stroke();
      const gl = ctx.createRadialGradient(r + 14, -r * 0.5, 0, r + 14, -r * 0.5, 13);
      gl.addColorStop(0, `rgba(160,130,240,${0.55 + 0.45 * lit})`); gl.addColorStop(1, 'rgba(91,74,138,0)');
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(r + 14, -r * 0.5, 13, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(214,198,255,${0.7 + 0.3 * lit})`;
      ctx.beginPath(); ctx.arc(r + 14, -r * 0.5, 3.6 + lit * 1.6, 0, Math.PI * 2); ctx.fill();
      if (e.blinkFx > 0) { ctx.globalAlpha = e.blinkFx * 2.5; ctx.fillStyle = PALETTE.cult; ctx.beginPath(); ctx.arc(0, 0, r + 6, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
    } else if (e.kind === 'hunter') {
      ctx.strokeStyle = '#2f2a2e'; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-r * 0.2, r * 0.5); ctx.lineTo(r + 20, r * 0.42); ctx.stroke();
      ctx.strokeStyle = PALETTE.ochre; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-r * 0.2, r * 0.5); ctx.lineTo(r * 0.35, r * 0.48); ctx.stroke();
      if (e.state === 'aim' || e.held) {
        const p = e.state === 'aim' ? 1 - e.timer / TUNING.hunter.aimTime : 0.5;
        ctx.strokeStyle = `rgba(192,57,43,${0.2 + p * 0.65})`; ctx.lineWidth = 1.6;
        ctx.setLineDash([7, 6]); ctx.lineDashOffset = -this.t * 40;
        ctx.beginPath(); ctx.moveTo(r + 20, r * 0.42); ctx.lineTo(r + 20 + 10 * TILE * p, r * 0.42); ctx.stroke();
        ctx.setLineDash([]);
      }
    } else {
      ctx.save(); ctx.rotate(swing * 0.9);
      ctx.strokeStyle = '#c9c2b5'; ctx.lineWidth = 10; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(r * 0.5, r * 0.7); ctx.lineTo(r + 20, r * 0.7); ctx.stroke();
      ctx.strokeStyle = PALETTE.ochre; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(r * 0.15, r * 0.7); ctx.lineTo(r * 0.6, r * 0.7); ctx.stroke(); ctx.restore();
      if (e.state === 'stunned') {
        ctx.fillStyle = PALETTE.fireHi;
        for (let k = 0; k < 3; k++) { const a = this.t * 6 + k * 2.1; ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r * 0.5 - r, 3.2, 0, Math.PI * 2); ctx.fill(); }
      }
    }
  }

  // The hound: low, long and all snout, and the only thing on the level with four legs —
  // which is the whole reason it reads as something else at a glance.
  drawHound(e) {
    const ctx = this.ctx, r = e.r;
    const run = Math.hypot(e.vx, e.vy) > 40 ? Math.sin(this.t * 26) * (r * 0.42) : 0;
    const thrust = e.state === 'windup' ? -0.18 : e.state === 'swing' ? 0.22 : 0;
    // The run in is the one thing about a hound you have to read across a room, and until now it
    // looked exactly like the circling did: he flattens out, streaks, and his eyes come up.
    const charging = e.state === 'dart';
    if (charging) {
      ctx.scale(1.1, 0.9);
      ctx.strokeStyle = 'rgba(239,230,208,0.22)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-r * 1.7, -r * 0.5); ctx.lineTo(-r * 3, -r * 0.5);
      ctx.moveTo(-r * 1.7, r * 0.5); ctx.lineTo(-r * 3, r * 0.5);
      ctx.stroke();
    }
    // a smear of where he was standing when he slipped the headbutt
    if (e.dodgeFx > 0) {
      ctx.globalAlpha = Math.min(0.5, e.dodgeFx * 1.8); ctx.fillStyle = PALETTE.bone;
      ctx.beginPath(); ctx.ellipse(-e.vx * 0.03, -e.vy * 0.03, r * 1.5, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    // Legs, fore and hind out of phase so the gait reads even at this size. They are mid-tone, not
    // black: the floors run from near-black plum to pale sand, and a black dog disappears into half
    // of them. Everything on him is a mid value with a dark edge and a pale mark or two, which is the
    // only combination that reads on both.
    ctx.strokeStyle = '#2a2130'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(r * 0.5, -r * 0.45); ctx.lineTo(r * 0.72 + run, -r * 1.2);
    ctx.moveTo(r * 0.5, r * 0.45); ctx.lineTo(r * 0.72 - run, r * 1.2);
    ctx.moveTo(-r * 0.7, -r * 0.45); ctx.lineTo(-r * 0.95 - run, -r * 1.15);
    ctx.moveTo(-r * 0.7, r * 0.45); ctx.lineTo(-r * 0.95 + run, r * 1.15);
    ctx.stroke();
    ctx.strokeStyle = '#6b5f79'; ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(r * 0.5, -r * 0.45); ctx.lineTo(r * 0.72 + run, -r * 1.2);
    ctx.moveTo(r * 0.5, r * 0.45); ctx.lineTo(r * 0.72 - run, r * 1.2);
    ctx.moveTo(-r * 0.7, -r * 0.45); ctx.lineTo(-r * 0.95 - run, -r * 1.15);
    ctx.moveTo(-r * 0.7, r * 0.45); ctx.lineTo(-r * 0.95 + run, r * 1.15);
    ctx.stroke();
    // tail, low and stiff
    ctx.strokeStyle = '#4a4157'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-r * 1.2, 0);
    ctx.quadraticCurveTo(-r * 2, -r * 0.3, -r * 2.1, -r * 0.95 + Math.sin(this.t * 12) * r * 0.25); ctx.stroke();
    // body: a long barrel rather than a ball, edged in dark so it never melts into the floor
    ctx.fillStyle = '#544a63'; ctx.strokeStyle = 'rgba(13,10,12,0.7)'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.ellipse(-r * 0.15, 0, r * 1.4, r * 0.76, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(20,14,24,0.45)';
    ctx.beginPath(); ctx.ellipse(-r * 0.5, r * 0.24, r * 1, r * 0.46, 0, 0, Math.PI * 2); ctx.fill();
    // a lit spine, the brightest thing on him after the collar
    ctx.fillStyle = 'rgba(186,172,198,0.5)';
    ctx.beginPath(); ctx.ellipse(-r * 0.2, -r * 0.32, r * 1.05, r * 0.24, 0, 0, Math.PI * 2); ctx.fill();
    // the cult's collar
    ctx.strokeStyle = PALETTE.bone; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(r * 0.42, 0, r * 0.6, Math.PI * 0.55, Math.PI * 1.45); ctx.stroke();
    ctx.fillStyle = PALETTE.blood; ctx.beginPath(); ctx.arc(r * 0.5, r * 0.6, 2, 0, Math.PI * 2); ctx.fill();
    // head and snout, thrown forward on the bite and drawn back under the windup
    ctx.save(); ctx.translate(r * (0.95 + thrust), 0);
    ctx.fillStyle = '#33293c'; ctx.strokeStyle = 'rgba(13,10,12,0.7)'; ctx.lineWidth = 1.4;   // ears, pricked back
    ctx.beginPath(); ctx.moveTo(-r * 0.1, -r * 0.4); ctx.lineTo(-r * 0.85, -r * 1.05); ctx.lineTo(-r * 0.12, -r * 0.05); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-r * 0.1, r * 0.4); ctx.lineTo(-r * 0.85, r * 1.05); ctx.lineTo(-r * 0.12, r * 0.05); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#5d5270';
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.66, r * 0.58, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(r * 0.28, -r * 0.32); ctx.lineTo(r * 1.3, -r * 0.17);
    ctx.lineTo(r * 1.3, r * 0.17); ctx.lineTo(r * 0.28, r * 0.32); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(226,216,232,0.55)';                   // a pale blaze down the snout
    ctx.fillRect(r * 0.35, -r * 0.09, r * 0.9, r * 0.18);
    ctx.fillStyle = '#17111a'; ctx.beginPath(); ctx.arc(r * 1.28, 0, 2.1, 0, Math.PI * 2); ctx.fill();   // nose
    ctx.fillStyle = PALETTE.fireHi;                             // eyes: the only light in him
    if (charging) {
      ctx.globalAlpha = 0.32;
      ctx.beginPath(); ctx.arc(r * 0.4, -r * 0.3, 4.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.4, r * 0.3, 4.2, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    const eye = charging ? 2.9 : 2.2;
    ctx.fillRect(r * 0.3, -r * 0.4, eye, eye); ctx.fillRect(r * 0.3, r * 0.2, eye, eye);
    if (e.state === 'windup' || e.state === 'swing') {          // and the teeth, once he means it
      ctx.fillStyle = PALETTE.bone;
      for (let k = 0; k < 3; k++) { ctx.fillRect(r * (0.72 + k * 0.2), -r * 0.36, 1.8, 2.5); ctx.fillRect(r * (0.72 + k * 0.2), r * 0.1, 1.8, 2.5); }
    }
    ctx.restore();
  }

  drawEnemy(e, game) {
    const ctx = this.ctx;
    const lying = e.state === 'floored' || e.state === 'stunned';
    this.drawTelegraph(e);
    this.shadow(e.x, e.y, e.r * (lying ? 1.4 : 1.05), e.r * (lying ? 0.5 : 0.42));
    ctx.save(); ctx.translate(e.x, e.y); ctx.scale(1, 1 / TILT); ctx.translate(0, lying ? 0 : -4);
    if (e.state === 'flung') ctx.rotate(this.t * 14); else ctx.rotate(e.facing);
    if (e.state === 'stagger') ctx.translate(Math.sin(this.t * 60) * 2, 0);
    if (e.dazed > 0) ctx.rotate(Math.sin(this.t * 24) * 0.12);
    if (e.state === 'chargewind') ctx.translate(-4 + Math.sin(this.t * 50) * 3, Math.cos(this.t * 47) * 2);
    const r = e.r;
    if (e.elite) ctx.scale(1.28, 1.28);
    if (lying) ctx.scale(1.35, 0.7);

    if (e.kind === 'dog') this.drawHound(e); else this.drawCultist(e, r);
    if (e.flash > 0) { ctx.globalAlpha = Math.min(0.8, e.flash * 4); ctx.fillStyle = PALETTE.bone; ctx.beginPath(); ctx.arc(0, 0, r + 1, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
    // Stars: he heard the scream and is still hearing it.
    if (e.dazed > 0) {
      ctx.fillStyle = PALETTE.fireHi;
      for (let k = 0; k < 3; k++) {
        const a = this.t * 7 + k * 2.1;
        ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.5 - r - 5, 3, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (e.burning > 0) this.flame(0, -4, 12, e.x, e.witchBurn);
    ctx.restore();

    // A man who is searching rather than hunting shows a mark, so a scream reads as a lure.
    if (e.state === 'investigate' && !e.dead) {
      const bob = Math.sin(this.t * 6 + e.x) * 1.5;
      ctx.save(); ctx.scale(1, 1 / TILT);
      const qy = (e.y - e.r - 13 + bob) * TILT;
      ctx.font = `700 ${e.lured > 0 ? 17 : 14}px ${FONT_SC}`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(13,10,12,0.6)'; ctx.fillText('?', e.x + 1, qy + 1);
      ctx.fillStyle = e.lured > 0 ? PALETTE.fireHi : 'rgba(239,230,208,0.7)';
      ctx.fillText('?', e.x, qy);
      ctx.textAlign = 'left'; ctx.restore();
    }

    // A bark: stamped caps on a dark plate, over his head, gone in under two seconds.
    if (e.say && !e.dead) {
      const a = Math.max(0, Math.min(1, e.say.life / 0.4, (e.say.max - e.say.life) / 0.08));
      ctx.save(); ctx.scale(1, 1 / TILT);
      const by = (e.y - e.r - 21) * TILT;
      ctx.font = `700 ${e.kind === 'butcher' ? 15 : 13}px ${FONT_SC}`;
      ctx.textAlign = 'center';
      const tw = ctx.measureText(e.say.text).width;
      ctx.globalAlpha = a * 0.78; ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(e.x - tw / 2 - 6, by - 12, tw + 12, 16);
      ctx.beginPath(); ctx.moveTo(e.x - 4, by + 4); ctx.lineTo(e.x + 4, by + 4); ctx.lineTo(e.x, by + 9); ctx.fill();
      ctx.globalAlpha = a;
      ctx.fillStyle = e.kind === 'seer' ? PALETTE.witchHi : e.kind === 'butcher' ? PALETTE.blood : PALETTE.bone;
      ctx.fillText(e.say.text, e.x, by);
      ctx.globalAlpha = 1; ctx.textAlign = 'left'; ctx.restore();
    }

    if (e.bombFuse > 0) {
      const p = 1 - e.bombFuse / TUNING.goat.bomb.fuse;
      ctx.strokeStyle = `rgba(242,162,51,${0.5 + 0.5 * Math.sin(this.t * 40)})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 5 + p * 8, 0, Math.PI * 2); ctx.stroke();
    }
    // Health notches over anyone who takes more than one blow — the Butcher, a Seer, an arena elite —
    // so what is left of him reads off his own head instead of off a text popup.
    if (e.maxHp > 1) {
      const max = e.maxHp, wdt = clamp(e.r * 0.5, 6, 9), gap = 3.5, total = max * wdt + (max - 1) * gap;
      const top = e.y - e.r - (e.kind === 'butcher' ? 14 : 11);
      for (let i = 0; i < max; i++) {
        const x = e.x - total / 2 + i * (wdt + gap);
        ctx.fillStyle = 'rgba(13,10,12,0.55)'; ctx.fillRect(x - 1, top - 1, wdt + 2, 6.5);
        ctx.fillStyle = i < e.hp ? PALETTE.blood : 'rgba(239,230,208,0.22)';
        ctx.fillRect(x, top, wdt, 4.5);
      }
    }
  }

  // Enemies wind up slowly and show the ground they are about to cover.
  drawTelegraph(e) {
    if (e.state !== 'windup' && e.state !== 'chargewind') return;
    const ctx = this.ctx, cfg = TUNING[e.kind];
    ctx.save(); ctx.translate(e.x, e.y); ctx.scale(1, 1 / TILT); ctx.rotate(e.facing);
    if (e.state === 'chargewind') {
      const p = 1 - e.timer / cfg.chargeWind, len = cfg.chargeSpeed * cfg.chargeTime * 0.55;
      ctx.fillStyle = `rgba(192,57,43,${0.08 + 0.16 * p})`;
      ctx.fillRect(0, -e.r, len * p, e.r * 2);
      ctx.strokeStyle = `rgba(239,230,208,${0.3 + 0.4 * p})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(len * p, -e.r); ctx.lineTo(len * p, e.r); ctx.stroke();
    } else {
      const p = 1 - e.timer / cfg.windup;
      const reach = cfg.reach + e.r + 10, arc = e.kind === 'butcher' ? cfg.arc : Math.PI * 0.55;
      ctx.fillStyle = `rgba(192,57,43,${0.09 + 0.2 * p})`;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, reach, -arc / 2, arc / 2); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = `rgba(239,230,208,${0.2 + 0.55 * p})`; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, 0, reach, -arc / 2, -arc / 2 + arc * p); ctx.stroke();
    }
    ctx.restore();
  }

  drawBreath(game) {
    const fx = game.breathFx; if (!fx) return;
    const ctx = this.ctx, B = TUNING.goat.breath;
    const p = 1 - fx.life / fx.max, a = Math.atan2(fx.ax, 1) * 0 + Math.atan2(fx.ay, fx.ax);
    ctx.save(); ctx.translate(fx.x, fx.y); ctx.scale(1, 1 / TILT); ctx.rotate(a);
    const reach = B.range * (0.45 + p * 0.75);
    const g = ctx.createRadialGradient(0, 0, 6, 0, 0, reach);
    g.addColorStop(0, `rgba(255,224,138,${0.85 * (1 - p)})`);
    g.addColorStop(0.45, `rgba(242,162,51,${0.55 * (1 - p)})`);
    g.addColorStop(1, 'rgba(192,57,43,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, reach, -B.halfAngle, B.halfAngle); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // The Seer's rune, burning in on the floor where you were standing.
  drawRunes(game) {
    const ctx = this.ctx;
    for (const e of game.enemies) {
      if (e.dead || e.state !== 'cast' || !e.rune) continue;
      const cfg = TUNING.seer, p = 1 - e.timer / cfg.castWind;
      const R = cfg.runeRadius * TILE;
      ctx.save(); ctx.translate(e.rune.x, e.rune.y); ctx.rotate(this.t * 0.7);
      ctx.strokeStyle = `rgba(160,130,240,${0.25 + 0.5 * p})`; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, R * 0.62, 0, Math.PI * 2); ctx.stroke();
      for (let k = 0; k < 6; k++) {
        const a = k / 6 * Math.PI * 2;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * R * 0.62, Math.sin(a) * R * 0.62);
        ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R); ctx.stroke();
      }
      ctx.strokeStyle = `rgba(242,162,51,${0.35 + 0.6 * p})`; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, 0, R * 0.85, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); ctx.stroke();
      ctx.fillStyle = `rgba(242,162,51,${0.10 + 0.3 * p})`;
      ctx.beginPath(); ctx.arc(0, 0, R * p, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  // A dev drawer in the bottom-right: god mode and spawns, for poking at the game.
  drawDev(game) {
    const ctx = this.ctx, s = this.ts, d = game.dev;
    d.rects = [];
    const pad = 8 * s, cw = 62 * s, chH = 22 * s;
    const cx = this.w - pad - cw, cy = this.h - pad - chH;
    let toastY = cy - 10 * s;
    if (d.open) {
      const rows = [
        ['god', d.god ? 'GOD  ON' : 'GOD  OFF'],
        ['bearer', '+ BEARER'], ['hunter', '+ HUNTER'], ['dog', '+ HOUND'], ['seer', '+ SEER'], ['butcher', '+ BUTCHER'],
        ['tome', '+ TOME'], ['heal', 'HEAL'], ['clear', 'CLEAR NEAR'],
        ['restart', 'NEW LEVEL'], ['next', 'SKIP LEVEL'],
      ];
      const rw = 132 * s, rh = 24 * s, gap = 3 * s;
      const px = this.w - pad - rw, py = cy - 6 * s - (rows.length * (rh + gap));
      toastY = py - 30 * s;
      ctx.fillStyle = 'rgba(13,10,12,0.93)'; ctx.fillRect(px, py - 20 * s, rw, rows.length * (rh + gap) + 22 * s);
      ctx.strokeStyle = 'rgba(185,135,58,0.6)'; ctx.lineWidth = 1.5 * s;
      ctx.strokeRect(px, py - 20 * s, rw, rows.length * (rh + gap) + 22 * s);
      ctx.font = `700 ${10 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.ochre; ctx.textAlign = 'left';
      ctx.fillText('DEV MODE', px + 8 * s, py - 7 * s);
      rows.forEach(([id, label], i) => {
        const y = py + i * (rh + gap);
        const on = id === 'god' && d.god;
        ctx.fillStyle = on ? 'rgba(192,57,43,0.5)' : 'rgba(59,34,51,0.75)';
        ctx.fillRect(px + 5 * s, y, rw - 10 * s, rh);
        ctx.strokeStyle = on ? PALETTE.blood : 'rgba(239,230,208,0.2)'; ctx.lineWidth = 1 * s;
        ctx.strokeRect(px + 5 * s, y, rw - 10 * s, rh);
        ctx.font = `700 ${11 * s}px ${FONT_SC}`; ctx.fillStyle = on ? PALETTE.fireHi : PALETTE.bone;
        ctx.textBaseline = 'middle'; ctx.fillText(label, px + 13 * s, y + rh / 2); ctx.textBaseline = 'alphabetic';
        d.rects.push({ x: px + 5 * s, y, w: rw - 10 * s, h: rh, id });
      });
    }
    ctx.fillStyle = d.open ? 'rgba(185,135,58,0.85)' : 'rgba(13,10,12,0.7)';
    ctx.fillRect(cx, cy, cw, chH);
    ctx.strokeStyle = 'rgba(185,135,58,0.75)'; ctx.lineWidth = 1.5 * s; ctx.strokeRect(cx, cy, cw, chH);
    ctx.font = `700 ${11 * s}px ${FONT_SC}`; ctx.fillStyle = d.open ? PALETTE.ink : PALETTE.ochre;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('DEV', cx + cw / 2, cy + chH / 2);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    d.rects.push({ x: cx, y: cy, w: cw, h: chH, id: 'toggle' });

    if (d.god) {
      ctx.font = `700 ${11 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.blood; ctx.textAlign = 'center';
      ctx.fillText('GOD MODE', this.w / 2, 16 * s); ctx.textAlign = 'left';
    }
    if (d.toast) {
      ctx.globalAlpha = Math.min(1, d.toast.life);
      ctx.font = `700 ${13 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.fireHi; ctx.textAlign = 'right';
      ctx.fillText(d.toast.text, this.w - 12 * s, toastY);
      ctx.textAlign = 'left'; ctx.globalAlpha = 1;
    }
  }

  drawBullet(b) {
    const ctx = this.ctx; ctx.strokeStyle = PALETTE.fireHi; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    const l = 13 / (Math.hypot(b.vx, b.vy) || 1);
    ctx.beginPath(); ctx.moveTo(b.x - b.vx * l, b.y - b.vy * l); ctx.lineTo(b.x, b.y); ctx.stroke();
  }

  drawGoat(g, game) {
    const ctx = this.ctx;
    // motion smear
    for (const t of g.trail) {
      ctx.globalAlpha = (t.life / 0.18) * 0.16;
      ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(t.a);
      ctx.fillStyle = PALETTE.bone; ctx.beginPath(); ctx.ellipse(-5, 0.5, 13.5, 8.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    this.shadow(g.x, g.y, 16, 8);
    ctx.save(); ctx.translate(g.x, g.y); ctx.scale(1, 1 / TILT); ctx.translate(0, -5);
    if (g.state === 'roll') ctx.rotate(g.facing + g.rollSpin);
    else ctx.rotate(g.facing);
    let sx = 1, sy = 1;
    if (g.state === 'windup') { sx = 0.82; sy = 1.15; }
    else if (g.state === 'lunge') { sx = 1.3; sy = 0.8; }
    else if (g.state === 'roll') { sx = 0.86; sy = 0.86; }
    else if (g.state === 'rollrecover') { sx = 1.08; sy = 0.9; }
    ctx.scale(sx, sy);
    if (g.invuln > 0 && Math.floor(this.t * 30) % 2 === 0) ctx.globalAlpha = 0.5;
    const dmg = g.maxHp - g.hp;
    // He is drawn a quarter turn toward the camera, and built in three pieces that never merge into
    // one blob: body, then a short dark neck out of the shoulder, then a round head sitting on top of
    // it. The seam down the shoulder and the shadow under the jaw are what make the head legible from
    // straight above — without them a white shape 30 px long is just a shape.
    const step = Math.sin(this.t * 22) * (Math.hypot(g.vx, g.vy) > 40 ? 3.5 : 0);
    const horn = clamp(game.mods ? game.mods.headbuttReach : 1, 1, 1.5);   // Long Horns shows on him
    // far side first: the legs and the ear away from the camera
    ctx.strokeStyle = '#b3a78e'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(3, -4); ctx.lineTo(4.5 + step, -11); ctx.moveTo(-10, -4); ctx.lineTo(-11.5 - step, -11);
    ctx.stroke();
    // near legs, long enough that the hooves clear the body
    ctx.strokeStyle = '#d9cfb6'; ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(3, 4); ctx.lineTo(5.5 - step, 16); ctx.moveTo(-10, 4); ctx.lineTo(-12.5 + step, 16);
    ctx.stroke();
    // body, with a thin dark edge on it. Every piece of him carries that edge: it is the only thing
    // that keeps head, neck and body from reading as one white blob from straight above.
    const edge = 'rgba(26,16,22,0.45)';
    ctx.fillStyle = PALETTE.bone; ctx.strokeStyle = edge; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(-5, 0.5, 13.5, 8.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // everything painted on the coat is clipped to it, so nothing spills past the silhouette
    ctx.save(); ctx.beginPath(); ctx.ellipse(-5, 0.5, 13.5, 8.4, 0, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = 'rgba(150,138,116,0.32)'; ctx.beginPath(); ctx.ellipse(-6, 6, 13, 5, 0, 0, Math.PI * 2); ctx.fill();
    if (dmg < 3) { ctx.fillStyle = PALETTE.ochre; ctx.fillRect(2, -10, 2.6, 22); }   // marigold collar
    ctx.fillStyle = PALETTE.blood;
    for (let k = 0; k < dmg * 2; k++) { ctx.beginPath(); ctx.ellipse(-11 + k * 4.5, (k % 2 ? 4 : -3.5), 4.2, 3, 0.5 * k, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    // neck: a narrow darker band out of the shoulder. It is short on purpose — the gap it leaves
    // between the two big masses is what tells you which end is the head.
    ctx.fillStyle = '#c9bd9d'; ctx.strokeStyle = edge; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(5, -3.5); ctx.quadraticCurveTo(10, -3.5, 12, 1);
    ctx.lineTo(10, 7.5); ctx.quadraticCurveTo(6, 6.5, 4.5, 2); ctx.closePath(); ctx.fill(); ctx.stroke();
    // Horns: a matched pair off the top of the skull, both sweeping back over the body. Long Horns
    // scales the whole curve out from its base, so a horn gets longer instead of bending into
    // something else. The far one goes down before the head does, because it passes behind it.
    const hornPts = (bx, by, cx, cy, ex, ey) => [bx, by,
      bx + (cx - bx) * horn, by + (cy - by) * horn, bx + (ex - bx) * horn, by + (ey - by) * horn];
    const farHorn = hornPts(12.5, -4, 3, -10, -9.5, -9.5);
    ctx.strokeStyle = '#8f6529'; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(farHorn[0], farHorn[1]);
    ctx.quadraticCurveTo(farHorn[2], farHorn[3], farHorn[4], farHorn[5]); ctx.stroke();
    // ears, one to each side of the skull and tucked behind it
    ctx.fillStyle = '#cdc2a7'; ctx.strokeStyle = edge; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(13.5, -6.6, 4.6, 2.5, -0.55, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(12.8, 9.8, 4.4, 2.4, 0.62, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(166,120,116,0.5)';
    ctx.beginPath(); ctx.ellipse(13.4, 9.6, 2.5, 1.2, 0.62, 0, Math.PI * 2); ctx.fill();
    // the head: one round skull with a short muzzle, lighter than the coat and outlined like the rest
    ctx.fillStyle = '#fdf7e7'; ctx.strokeStyle = edge; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(17.5, 3.2, 7.4, 6.4, 0.12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(23.2, 5.2, 4.4, 3.7, 0.24, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e7dcc2';                                                     // the muzzle, a shade duller
    ctx.beginPath(); ctx.ellipse(24, 5.6, 3.1, 2.6, 0.24, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8d7c63'; ctx.beginPath(); ctx.ellipse(26.2, 5.2, 1.4, 1.1, 0, 0, Math.PI * 2); ctx.fill();
    // the beard: a soft tuft hanging straight off the chin. Pointed, it reads as a tusk — and a goat
    // with a tusk is a boar, which is not the animal we are selling.
    ctx.fillStyle = '#e2d7bb'; ctx.strokeStyle = edge; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(20, 8.4); ctx.quadraticCurveTo(22.6, 11, 20.8, 15.2);
    ctx.quadraticCurveTo(19.4, 17.4, 17.8, 14.6); ctx.quadraticCurveTo(16.9, 11.4, 17.2, 8.6);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // the near horn: the same curve, lower and thicker, with ridges along its length
    const nearHorn = hornPts(14.5, 2, 4, -3, -9, -1);
    const hornAt = (t) => { const u = 1 - t; return [
      u * u * nearHorn[0] + 2 * u * t * nearHorn[2] + t * t * nearHorn[4],
      u * u * nearHorn[1] + 2 * u * t * nearHorn[3] + t * t * nearHorn[5]]; };
    ctx.strokeStyle = PALETTE.ochre; ctx.lineWidth = 4.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(nearHorn[0], nearHorn[1]);
    ctx.quadraticCurveTo(nearHorn[2], nearHorn[3], nearHorn[4], nearHorn[5]); ctx.stroke();
    const tip = hornAt(0.72);
    ctx.strokeStyle = '#c79a47'; ctx.lineWidth = 2.4;                       // the last third lightens off
    ctx.beginPath(); ctx.moveTo(tip[0], tip[1]);
    ctx.quadraticCurveTo(nearHorn[2] * 0.15 + nearHorn[4] * 0.85, nearHorn[3] * 0.15 + nearHorn[5] * 0.85, nearHorn[4], nearHorn[5]); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,84,32,0.6)'; ctx.lineWidth = 1.1;
    for (let k = 1; k <= 3; k++) {
      const [rx, ry] = hornAt(k / 4.4);
      ctx.beginPath(); ctx.moveTo(rx - 1.3, ry - 2); ctx.lineTo(rx + 1.3, ry + 2); ctx.stroke();
    }
    // two eyes, with the rectangular pupils a goat actually has
    ctx.fillStyle = '#fbf5e6'; ctx.strokeStyle = edge; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(19, 7.6, 3.1, 2.6, 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(18.2, -1.4, 2.7, 2.2, -0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(17.9, 6.9, 3.6, 2); ctx.fillRect(17.3, -2.1, 3, 1.8);
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(20.4, 6.4, 1.2, 1.2);   // one spark of a highlight
    if (g.screaming > 0) {
      ctx.fillStyle = PALETTE.ink; ctx.beginPath(); ctx.ellipse(25, 7, 2.8, 3.4, 0.45, 0, Math.PI * 2); ctx.fill();
    }
    // tail
    ctx.strokeStyle = PALETTE.bone; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-17.5, 0.5); ctx.lineTo(-23, -3 + Math.sin(this.t * 9) * 2); ctx.stroke();
    if (g.onFire) this.flame(0, -6, 12, 1, g.witchFire);
    ctx.globalAlpha = 1;
    ctx.restore();
    // aim pip: where the headbutt will go
    if (game.touch.active && game.state === 'play') {
      const a = game.input.aim;
      ctx.fillStyle = 'rgba(239,230,208,0.5)';
      ctx.beginPath(); ctx.arc(g.x + a.x * 34, g.y + a.y * 34, 3.4, 0, Math.PI * 2); ctx.fill();
    }
  }

  // The Butcher's tome, lying where he fell.
  drawTomes(game) {
    const ctx = this.ctx;
    for (const tm of game.tomes) {
      const bob = Math.sin(this.t * 2.6 + tm.phase) * 2.5;
      const y = tm.y + bob;
      const halo = ctx.createRadialGradient(tm.x, y, 0, tm.x, y, 46);
      halo.addColorStop(0, 'rgba(255,224,138,0.3)'); halo.addColorStop(1, 'rgba(255,224,138,0)');
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(tm.x, y, 46, 0, Math.PI * 2); ctx.fill();
      this.shadow(tm.x, tm.y + 4, 13, 5);
      ctx.save(); ctx.translate(tm.x, y); ctx.scale(1, 1 / TILT); ctx.rotate(Math.sin(this.t * 1.4 + tm.phase) * 0.12);
      ctx.fillStyle = PALETTE.plum; ctx.fillRect(-11, -13, 22, 26);
      ctx.fillStyle = PALETTE.bone; ctx.fillRect(7, -11, 4, 22);
      ctx.strokeStyle = PALETTE.ochre; ctx.lineWidth = 2;
      ctx.strokeRect(-8.5, -10.5, 17, 21);
      ctx.beginPath(); ctx.moveTo(-4, -4); ctx.lineTo(4, -4); ctx.moveTo(0, -7.5); ctx.lineTo(0, 2); ctx.stroke();
      ctx.restore();
      ctx.save(); ctx.scale(1, 1 / TILT);
      ctx.font = `700 ${11}px ${FONT_SC}`; ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(255,224,138,${0.5 + 0.3 * Math.sin(this.t * 3)})`;
      ctx.fillText('TOME', tm.x, (tm.y - 26 + bob) * TILT); ctx.textAlign = 'left'; ctx.restore();
    }
  }

  // One choice per Butcher. Tap a card, or press its number.
  drawBoonChoice(game) {
    game.boonRects = [];
    if (game.state !== 'boon' || !game.boonChoice) return;
    const ctx = this.ctx, s = this.ts, n = game.boonChoice.length;
    ctx.fillStyle = 'rgba(13,10,12,0.86)'; ctx.fillRect(0, 0, this.w, this.h);
    ctx.textAlign = 'center';
    const stack = this.portrait || this.vw < 760 * s;
    const cw = stack ? Math.min(this.w * 0.88, 440 * s) : Math.min(this.w * 0.29, 280 * s);
    const ch = stack ? 84 * s : 112 * s;
    const gap = 13 * s;
    const blockH = stack ? n * ch + (n - 1) * gap : ch;
    const topY = this.h / 2 - blockH / 2;
    ctx.font = `700 ${13 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.ochre;
    ctx.fillText(game.boonKind === 'SKILL' ? 'THE TOME OFFERS A SKILL' : 'THE TOME OFFERS A BLESSING', this.w / 2, topY - 44 * s);
    ctx.font = `${13 * s}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.55)';
    ctx.fillText(game.touch.active ? 'Tap one. It dies with you.' : 'Press 1, 2 or 3. It dies with you.', this.w / 2, topY - 22 * s);
    const rowW = n * cw + (n - 1) * gap;
    for (let i = 0; i < n; i++) {
      const x = stack ? (this.w - cw) / 2 : (this.w - rowW) / 2 + i * (cw + gap);
      const y = stack ? topY + i * (ch + gap) : topY;
      const b = game.boonChoice[i];
      game.boonRects.push({ x, y, w: cw, h: ch });
      ctx.fillStyle = b.active ? 'rgba(74,36,40,0.92)' : 'rgba(59,34,51,0.9)'; ctx.fillRect(x, y, cw, ch);
      ctx.strokeStyle = b.active ? PALETTE.blood : PALETTE.ochre; ctx.lineWidth = 2 * s; ctx.strokeRect(x, y, cw, ch);
      ctx.fillStyle = b.active ? PALETTE.blood : PALETTE.ochre; ctx.fillRect(x, y, cw, 3 * s);
      ctx.fillStyle = PALETTE.bone; ctx.font = `700 ${16 * s}px ${FONT_SC}`;
      ctx.fillText(b.name, x + cw / 2, y + 30 * s);
      ctx.font = `${12.5 * s}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.75)';
      const lines = this.wrap(b.desc, cw - 24 * s);
      lines.forEach((l, k) => ctx.fillText(l, x + cw / 2, y + 52 * s + k * 16 * s));
      if (!game.touch.active) {
        ctx.fillStyle = PALETTE.ochre; ctx.font = `700 ${12 * s}px ${FONT_SC}`;
        ctx.fillText(String(i + 1), x + 15 * s, y + 19 * s);
      }
    }
    ctx.textAlign = 'left';
  }

  drawRings(game) {
    const ctx = this.ctx;
    for (const r of game.rings) {
      const p = 1 - r.life / r.max;
      ctx.strokeStyle = r.color; ctx.globalAlpha = (1 - p) * 0.35; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r * p, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  drawParticles(game) {
    const ctx = this.ctx;
    for (const p of game.parts) { ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillStyle = p.color; ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); }
    ctx.globalAlpha = 1;
  }

  drawFloatTexts(game) {
    const ctx = this.ctx; ctx.save(); ctx.scale(1, 1 / TILT);
    ctx.font = `700 14px ${FONT_SC}`; ctx.textAlign = 'center';
    for (const f of game.floats) {
      const y = (f.y - (1.2 - f.life) * 24) * TILT;
      ctx.globalAlpha = Math.min(1, f.life);
      ctx.fillStyle = 'rgba(13,10,12,0.55)'; ctx.fillText(f.text, f.x + 1.5, y + 1.5);
      ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, y);
    }
    ctx.globalAlpha = 1; ctx.textAlign = 'left'; ctx.restore();
  }

  // An additive punch of colour over the play view: kills, witchfire, the pen coming apart.
  drawFlash(game) {
    if (!game.flashAmt || game.flashAmt <= 0) return;
    const ctx = this.ctx;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(0.4, game.flashAmt); ctx.fillStyle = game.flashColor;
    ctx.fillRect(0, 0, this.vw, this.vh);
    ctx.restore();
  }

  drawVignette(game) {
    const ctx = this.ctx, key = `${this.vw}x${this.vh}`;
    if (!this.vignette || this.vigKey !== key) {
      const g = ctx.createRadialGradient(this.vcx, this.vcy, Math.min(this.vw, this.vh) * 0.32, this.vcx, this.vcy, Math.max(this.vw, this.vh) * 0.72);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
      this.vignette = g; this.vigKey = key;
    }
    ctx.fillStyle = this.vignette; ctx.fillRect(0, 0, this.vw, this.vh);
    if (this.bandH > 0) {
      ctx.fillStyle = 'rgba(18,13,18,0.96)'; ctx.fillRect(0, this.vh, this.w, this.bandH);
      ctx.fillStyle = 'rgba(239,230,208,0.16)'; ctx.fillRect(0, this.vh, this.w, Math.max(1, 1.5 * this.s));
    }
  }

  // A red arc at the screen edge pointing back at whatever just hit you.
  drawHurt(game) {
    if (!game.hurt || game.hurt.life <= 0) return;
    const ctx = this.ctx, a = game.hurt.angle, p = game.hurt.life / 0.6;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, this.vw, this.vh); ctx.clip();
    ctx.translate(this.vcx, this.vcy); ctx.rotate(a);
    const rad = Math.max(this.vw, this.vh) * 0.62;
    const g = ctx.createRadialGradient(0, 0, rad * 0.45, 0, 0, rad);
    g.addColorStop(0, 'rgba(192,57,43,0)'); g.addColorStop(1, `rgba(192,57,43,${0.5 * p})`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rad, -0.85, 0.85); ctx.lineTo(0, 0); ctx.fill();
    ctx.restore();
  }

  drawUI(game) {
    const ctx = this.ctx; if (!game.world) return;
    const g = game.goat, s = this.ts, top = 8 * s + (this.portrait ? 12 * s : 0);
    ctx.textAlign = 'left';
    ctx.font = `700 ${15 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.bone;
    ctx.fillText(`${game.level.def.sub.toUpperCase()}: ${game.level.def.name}`, 14 * s, top + 14 * s);
    const HEART = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];
    const px = 2.6 * s;
    for (let i = 0; i < g.maxHp; i++) {
      const ox = 14 * s + i * 22 * s, oy = top + 28 * s;
      const on = i < g.hp;
      ctx.fillStyle = on ? PALETTE.blood : 'rgba(239,230,208,0.16)';
      for (let r = 0; r < HEART.length; r++) for (let q = 0; q < HEART[r].length; q++) {
        if (HEART[r][q] !== '#') continue;
        ctx.fillRect(Math.round(ox + q * px), Math.round(oy + r * px), Math.ceil(px), Math.ceil(px));
      }
      if (on) { ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(Math.round(ox + px), Math.round(oy + px), Math.ceil(px), Math.ceil(px)); }
    }
    // Kills that landed on top of each other, while the window is still open.
    if (game.combo >= 2 && game.comboTimer > 0) {
      const a = Math.min(1, game.comboTimer / 0.6);
      ctx.font = `700 ${(15 + Math.min(11, game.combo * 2)) * s}px ${FONT_SC}`;
      ctx.fillStyle = `rgba(192,57,43,${a})`;
      ctx.fillText(`x${game.combo} IN A ROW`, 14 * s, top + 72 * s);
    }

    // The right column reads top down: what your buttons do, then what they have got you.
    ctx.textAlign = 'right';
    const right = this.w - 20 * s;
    const below = this.drawSkills(game, top + 14 * s);   // the rail centres its own text, so re-anchor
    ctx.textAlign = 'right';
    ctx.font = `700 ${15 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.bone;
    ctx.fillText(`${game.kills} SACRIFICED`, right, below + 16 * s);
    ctx.font = `${13 * s}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.7)';
    ctx.fillText(`${game.timer.toFixed(1)}s${game.audio.muted ? '  ·  muted' : ''}`, right, below + 33 * s);
    ctx.font = `${11 * s}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.42)';
    ctx.fillText(`seed ${game.level.seed}`, right, below + 47 * s);
    this.drawBoonList(game, below + 66 * s);
    ctx.textAlign = 'left';

    // exit compass, pinned just inside the bottom of the play view
    if (game.state === 'play' && !g.dead) {
      const dx = game.level.exit.x - g.x, dy = game.level.exit.y - g.y, d = Math.hypot(dx, dy);
      if (d > 6 * TILE) {
        const a = Math.atan2(dy, dx), cx = this.vcx;
        const cy = this.vh - (this.bandH > 0 ? 26 * s : (game.touch.active ? 150 * this.s : 40 * s));
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(a); ctx.fillStyle = 'rgba(255,224,138,0.45)';
        ctx.beginPath(); ctx.moveTo(15 * s, 0); ctx.lineTo(-9 * s, -7.5 * s); ctx.lineTo(-9 * s, 7.5 * s); ctx.closePath(); ctx.fill(); ctx.restore();
      }
    }
  }

  // The skill rail, top right, above the count: the four verbs, whether each one is available, how
  // long until it is, and what the tomes have done to it. Boons show as pips on the button they bend
  // and as names under the score, so a run's build lives in one corner instead of a list of words.
  // Returns the y it finished at, because everything else in that column hangs off the bottom of it.
  drawSkills(game, top) {
    const ctx = this.ctx, s = this.ts, g = game.goat, fire = !!game.mods.breath;
    const R = TUNING.goat.roll;
    const rows = [
      { id: 'butt', name: 'BUTT', cap: 'LMB', cd: 0, max: 0, ready: g.state === 'idle' && !g.holding },
      { id: 'grab', name: g.holding ? 'THROW' : 'GRAB', cap: 'RMB', cd: g.grabCd,
        max: TUNING.goat.grab.cooldown * game.mods.grabCooldown, ready: g.grabCd <= 0 },
      { id: 'roll', name: 'ROLL', cap: 'E', cd: g.rollCd, max: R.cooldown * game.mods.rollCooldown, ready: g.rollCd <= 0 },
      { id: 'scream', name: fire ? 'FIRE' : 'BAAH', cap: 'SPC', cd: g.screamCd, max: game.mods.screamCooldown, ready: g.screamCd <= 0 },
    ];
    const box = 32 * s, gap = 7 * s, right = this.w - 14 * s;
    const x0 = right - rows.length * box - (rows.length - 1) * gap;
    rows.forEach((row, i) => {
      const x = x0 + i * (box + gap), y = top;
      const boons = game.boons.filter((b) => b.skill === row.id);
      const hot = boons.some((b) => b.active);
      ctx.fillStyle = 'rgba(13,10,12,0.5)'; ctx.fillRect(x, y, box, box);
      // The cooldown drains the chip from the top down: one glance says whether the button is there.
      if (row.cd > 0 && row.max > 0) {
        const p = clamp(row.cd / row.max, 0, 1);
        ctx.fillStyle = 'rgba(192,57,43,0.32)'; ctx.fillRect(x, y + box * (1 - p), box, box * p);
      }
      ctx.strokeStyle = row.cd > 0 ? 'rgba(192,57,43,0.8)' : hot ? 'rgba(242,162,51,0.85)'
        : row.ready ? 'rgba(239,230,208,0.42)' : 'rgba(239,230,208,0.16)';
      ctx.lineWidth = 1.6 * s; ctx.strokeRect(x, y, box, box);
      ctx.save(); ctx.translate(x + box / 2, y + box / 2);
      ctx.globalAlpha = row.cd > 0 ? 0.4 : row.ready ? 1 : 0.55;
      this.skillIcon(row.id, box * 0.33, game, fire);
      ctx.globalAlpha = 1; ctx.restore();
      // one pip per tome hanging off this button
      boons.forEach((b, k) => {
        ctx.fillStyle = b.active ? PALETTE.blood : PALETTE.ochre;
        const px = x + 5 * s + k * 7 * s, py = y + box + 4 * s;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + 2.4 * s, py + 2.8 * s);
        ctx.lineTo(px, py + 5.6 * s); ctx.lineTo(px - 2.4 * s, py + 2.8 * s); ctx.closePath(); ctx.fill();
      });
      ctx.textAlign = 'center';
      if (!game.touch.active) {
        ctx.font = `700 ${8 * s}px ${FONT_SC}`; ctx.fillStyle = 'rgba(239,230,208,0.4)';
        ctx.fillText(row.cap, x + box / 2, y - 4 * s);
      }
      ctx.font = `700 ${9 * s}px ${FONT_SC}`;
      ctx.fillStyle = hot ? PALETTE.fireHi : row.cd > 0 ? 'rgba(192,57,43,0.95)' : 'rgba(239,230,208,0.6)';
      ctx.fillText(row.name, x + box / 2, y + box + 18 * s);
    });
    ctx.textAlign = 'left';
    return top + box + 22 * s;
  }

  // The tome names, under the score. The pips on the chips already say which button each one bends;
  // this is the list you read when you are deciding what the run has turned into.
  drawBoonList(game, top) {
    if (!game.boons.length) return;
    const ctx = this.ctx, s = this.ts, right = this.w - 20 * s;
    ctx.textAlign = 'right'; ctx.font = `700 ${10 * s}px ${FONT_SC}`;
    // Actives first, and never more than six lines: on a phone the seventh would sit over the level.
    const ordered = game.boons.slice().sort((a, b) => (a.active ? 0 : 1) - (b.active ? 0 : 1));
    const shown = ordered.slice(0, 6);
    shown.forEach((b, i) => {
      ctx.fillStyle = b.active ? PALETTE.blood : PALETTE.ochre;
      ctx.fillText((b.active ? '◆ ' : '❖ ') + b.name, right, top + i * 13 * s);
    });
    if (ordered.length > shown.length) {
      ctx.fillStyle = 'rgba(239,230,208,0.45)';
      ctx.fillText(`+${ordered.length - shown.length} MORE`, right, top + shown.length * 13 * s);
    }
    ctx.textAlign = 'left';
  }

  // The four verbs as icons, drawn around the origin with a half-size of h. Each one carries what the
  // tomes have added to it, so the rail changes shape over a run instead of only gaining words.
  skillIcon(id, h, game, fire) {
    const ctx = this.ctx, m = game.mods;
    if (id === 'butt') {
      const grow = clamp(m.headbuttReach, 1, 1.5);
      ctx.fillStyle = PALETTE.bone;                                    // the head, seen head on
      ctx.beginPath(); ctx.ellipse(0, h * 0.45, h * 0.42, h * 0.55, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = PALETTE.ochre; ctx.lineWidth = h * 0.3; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-h * 0.34, h * 0.1); ctx.quadraticCurveTo(-h * 1.05 * grow, -h * 0.2, -h * 0.7 * grow, -h * 0.95 * grow);
      ctx.moveTo(h * 0.34, h * 0.1); ctx.quadraticCurveTo(h * 1.05 * grow, -h * 0.2, h * 0.7 * grow, -h * 0.95 * grow);
      ctx.stroke();
      if (m.headbuttRecovery < 1) {                                    // Iron Skull: a plate over the brow
        ctx.strokeStyle = PALETTE.bone; ctx.lineWidth = h * 0.17;
        ctx.beginPath(); ctx.moveTo(-h * 0.4, h * 0.05); ctx.lineTo(h * 0.4, h * 0.05); ctx.stroke();
      }
      if (m.bomb) { ctx.fillStyle = PALETTE.blood; ctx.beginPath(); ctx.arc(h * 0.85, h * 0.75, h * 0.26, 0, Math.PI * 2); ctx.fill(); }
      return;
    }
    if (id === 'grab') {
      ctx.strokeStyle = PALETTE.bone; ctx.lineWidth = h * 0.22; ctx.lineCap = 'round';
      ctx.beginPath();                                                 // a jaw closed round a man
      ctx.arc(0, 0, h * 0.95, Math.PI * 0.68, Math.PI * 1.32);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, h * 0.95, -Math.PI * 0.32, Math.PI * 0.32); ctx.stroke();
      ctx.fillStyle = m.devour ? PALETTE.blood : PALETTE.ochre;
      ctx.beginPath(); ctx.arc(0, 0, h * 0.3, 0, Math.PI * 2); ctx.fill();
      if (m.shieldBullets > 2) {                                       // Strong Jaw: teeth
        ctx.strokeStyle = PALETTE.bone; ctx.lineWidth = h * 0.12;
        ctx.beginPath();
        ctx.moveTo(-h * 0.62, -h * 0.5); ctx.lineTo(-h * 0.38, -h * 0.2);
        ctx.moveTo(h * 0.62, -h * 0.5); ctx.lineTo(h * 0.38, -h * 0.2);
        ctx.moveTo(-h * 0.62, h * 0.5); ctx.lineTo(-h * 0.38, h * 0.2);
        ctx.moveTo(h * 0.62, h * 0.5); ctx.lineTo(h * 0.38, h * 0.2);
        ctx.stroke();
      }
      if (m.livingShield) {
        ctx.strokeStyle = PALETTE.fireHi; ctx.lineWidth = h * 0.14;
        ctx.beginPath(); ctx.arc(0, 0, h * 0.62, 0, Math.PI * 2); ctx.stroke();
      }
      return;
    }
    if (id === 'roll') {
      ctx.strokeStyle = PALETTE.bone; ctx.lineWidth = h * 0.22; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, 0, h * 0.75, Math.PI * 0.25, Math.PI * 1.85); ctx.stroke();
      const a = Math.PI * 1.85, ax = Math.cos(a) * h * 0.75, ay = Math.sin(a) * h * 0.75;
      ctx.fillStyle = PALETTE.bone;                                    // the arrowhead that makes it a tumble
      ctx.beginPath(); ctx.moveTo(ax + h * 0.3, ay); ctx.lineTo(ax - h * 0.1, ay - h * 0.3); ctx.lineTo(ax - h * 0.1, ay + h * 0.3); ctx.closePath(); ctx.fill();
      if (m.rollCooldown < 1) {                                        // Loose Joints: a second turn
        ctx.strokeStyle = PALETTE.ochre; ctx.lineWidth = h * 0.14;
        ctx.beginPath(); ctx.arc(0, 0, h * 0.36, Math.PI * 0.3, Math.PI * 1.7); ctx.stroke();
      }
      return;
    }
    // scream: an open mouth throwing either sound or fire
    ctx.fillStyle = PALETTE.bone;
    ctx.beginPath(); ctx.ellipse(-h * 0.55, 0, h * 0.3, h * 0.42, 0, 0, Math.PI * 2); ctx.fill();
    if (fire) {
      const gl = ctx.createLinearGradient(-h * 0.3, 0, h * 1.1, 0);
      gl.addColorStop(0, PALETTE.fireHi); gl.addColorStop(1, 'rgba(242,162,51,0.15)');
      ctx.fillStyle = gl;
      ctx.beginPath(); ctx.moveTo(-h * 0.3, -h * 0.18); ctx.lineTo(h * 1.05, -h * 0.8);
      ctx.lineTo(h * 1.05, h * 0.8); ctx.lineTo(-h * 0.3, h * 0.18); ctx.closePath(); ctx.fill();
      return;
    }
    ctx.strokeStyle = PALETTE.bone; ctx.lineWidth = h * 0.16;
    const arcs = m.screamRadius > TUNING.goat.scream.radius ? 3 : 2;   // Raw Throat: one ring further
    for (let k = 1; k <= arcs; k++) {
      ctx.beginPath(); ctx.arc(-h * 0.55, 0, h * (0.35 + k * 0.34), -Math.PI * 0.33, Math.PI * 0.33); ctx.stroke();
    }
  }

  drawTouchUI(game) {
    const ctx = this.ctx, t = game.touch;
    // move stick
    if (t.stick) {
      const mv = t.moveVector();
      ctx.strokeStyle = 'rgba(239,230,208,0.28)'; ctx.lineWidth = 2.5 * this.s;
      ctx.beginPath(); ctx.arc(t.stick.ox, t.stick.oy, t.stickR, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(239,230,208,0.3)';
      ctx.beginPath(); ctx.arc(t.stick.ox + mv.x * t.stickR, t.stick.oy + mv.y * t.stickR, 24 * this.s, 0, Math.PI * 2); ctx.fill();
    } else {
      const hm = t.stickHome;
      ctx.strokeStyle = 'rgba(239,230,208,0.14)'; ctx.lineWidth = 2 * this.s;
      ctx.beginPath(); ctx.arc(hm.x, hm.y, t.stickR * 0.8, 0, Math.PI * 2); ctx.stroke();
      ctx.font = `700 ${10 * this.s}px ${FONT_SC}`; ctx.fillStyle = 'rgba(239,230,208,0.32)';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('MOVE', hm.x, hm.y); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    }
    // buttons
    const held = !!game.goat.holding;
    const fire = !!game.mods.breath;
    const labels = { butt: 'BUTT', grab: held ? 'THROW' : 'GRAB', scream: fire ? 'FIRE' : 'BAAH', roll: 'ROLL' };
    const ready = { butt: game.goat.state === 'idle' && !held, grab: held || game.goat.grabCd <= 0,
      scream: game.goat.screamCd <= 0, roll: game.goat.rollCd <= 0 };
    for (const k of ['butt', 'grab', 'scream', 'roll']) {
      const b = t.buttons[k], down = t.pressed[k] !== undefined;
      const hot = k === 'scream' && fire;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.rr, 0, Math.PI * 2);
      ctx.fillStyle = down ? 'rgba(192,57,43,0.5)'
        : hot ? (ready[k] ? 'rgba(192,57,43,0.34)' : 'rgba(192,57,43,0.12)')
        : ready[k] ? 'rgba(239,230,208,0.16)' : 'rgba(239,230,208,0.07)';
      ctx.fill();
      ctx.strokeStyle = down ? 'rgba(239,230,208,0.9)'
        : hot ? (ready[k] ? 'rgba(242,162,51,0.9)' : 'rgba(192,57,43,0.4)')
        : ready[k] ? 'rgba(239,230,208,0.42)' : 'rgba(239,230,208,0.18)';
      ctx.lineWidth = 2.5 * this.s; ctx.stroke();
      ctx.font = `700 ${Math.round(b.r * 0.34) * this.s}px ${FONT_SC}`;
      ctx.fillStyle = ready[k] ? (hot ? PALETTE.fireHi : PALETTE.bone) : 'rgba(239,230,208,0.35)';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(labels[k], b.x, b.y);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    }
    if (game.goat.screamCd > 0) {
      const b = t.buttons.scream, p = 1 - game.goat.screamCd / game.mods.screamCooldown;
      ctx.strokeStyle = fire ? PALETTE.fire : PALETTE.ochre; ctx.lineWidth = 3.5 * this.s;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.rr, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); ctx.stroke();
    }
    if (game.goat.rollCd > 0) {
      const b = t.buttons.roll, p = 1 - game.goat.rollCd / (TUNING.goat.roll.cooldown * game.mods.rollCooldown);
      ctx.strokeStyle = PALETTE.ochre; ctx.lineWidth = 3 * this.s;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.rr, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); ctx.stroke();
    }
    // A throw empties your mouth for a beat, and the ring round GRAB is where you read that beat.
    if (game.goat.grabCd > 0 && !held) {
      const b = t.buttons.grab, p = 1 - game.goat.grabCd / (TUNING.goat.grab.cooldown * game.mods.grabCooldown);
      ctx.strokeStyle = PALETTE.ochre; ctx.lineWidth = 3 * this.s;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.rr, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); ctx.stroke();
    }
  }

  wrap(text, maxW) {
    const ctx = this.ctx;
    if (ctx.measureText(text).width <= maxW) return [text];
    const words = text.split(' '); const out = []; let line = '';
    for (const wd of words) {
      const test = line ? line + ' ' + wd : wd;
      if (ctx.measureText(test).width > maxW && line) { out.push(line); line = wd; } else line = test;
    }
    if (line) out.push(line);
    return out;
  }

  drawCard(game) {
    const card = game.card; if (!card) return;
    const ctx = this.ctx, s = this.ts;
    ctx.fillStyle = `rgba(13,10,12,${card.dim})`; ctx.fillRect(0, 0, this.w, this.h);
    ctx.textAlign = 'center';
    const size = (card.size || 34) * s, small = 15 * s;
    const smallFrom = card.small === true ? card.lines.length - 1 : typeof card.small === 'number' ? card.small : card.lines.length;
    const maxW = this.w * 0.86;
    // measure with wrapping first so the block stays centred
    const rows = [];
    card.lines.forEach((l, i) => {
      const isSmall = i >= smallFrom;
      ctx.font = isSmall ? `${small}px ${FONT}` : `700 ${size}px ${FONT}`;
      const parts = l === '' ? [''] : this.wrap(l, maxW);
      parts.forEach((p) => rows.push({ text: p, small: isSmall, last: i === card.lines.length - 1 }));
    });
    const lh = (i) => (rows[i].small ? small * 1.6 : size * 1.32);
    let total = 0; for (let i = 0; i < rows.length; i++) total += lh(i);
    let y = this.h / 2 - total / 2;
    rows.forEach((r, i) => {
      ctx.font = r.small ? `${small}px ${FONT}` : `700 ${size}px ${FONT}`;
      ctx.fillStyle = r.small ? (r.last ? (card.color || PALETTE.bone) : 'rgba(239,230,208,0.62)') : (card.color || PALETTE.bone);
      y += lh(i);
      ctx.fillText(r.text, this.w / 2, y - lh(i) * 0.28);
    });
    ctx.textAlign = 'left';
  }
}
