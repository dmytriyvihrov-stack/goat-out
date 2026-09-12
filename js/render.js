// Rendering: responsive canvas, tiles, decals, firelight, props, enemies, goat, effects, HUD,
// on-screen touch controls and title cards. Placeholder shapes in the final palette.
const FONT = "'Alegreya', Georgia, 'Times New Roman', serif";
const FONT_SC = "'Alegreya SC', 'Alegreya', Georgia, serif";

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
      ctx.translate(this.vcx + game.shakeX * this.s, this.vcy + game.shakeY * this.s);
      ctx.scale(cam.zoom, cam.zoom * TILT);
      ctx.translate(-Math.round(cam.x), -Math.round(cam.y));
      this.drawTiles(game, cam);
      this.drawDecals(game, cam);
      this.drawHints(game);
      this.drawFire(game, cam);
      this.drawLight(game, cam);
      this.drawDust(game, cam, dt);
      this.drawRunes(game);
      this.drawTomes(game);
      for (const p of game.props) if (!p.broken && p.kind !== 'lamp') this.drawProp(p);
      for (const e of game.enemies) if (!e.dead && (e.state === 'floored' || e.state === 'stunned')) this.drawEnemy(e, game);
      for (const p of game.props) if (!p.broken && p.kind === 'lamp') this.drawProp(p);
      for (const e of game.enemies) if (!e.dead && e.state !== 'floored' && e.state !== 'stunned' && e !== game.goat.holding) this.drawEnemy(e, game);
      for (const b of game.bullets) this.drawBullet(b);
      if (!game.goat.dead) this.drawGoat(game.goat, game);
      if (game.goat.holding) { const hld = game.goat.holding; if (hld.kind === 'pot') this.drawProp(hld); else this.drawEnemy(hld, game); }
      this.drawBreath(game);
      this.drawRings(game);
      this.drawParticles(game);
      this.drawFloatTexts(game);
      ctx.restore();
    }
    this.drawVignette(game);
    this.drawHurt(game);
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
    if (lv.controls && Math.abs(lv.controls.x - game.cam.x) < 1400) {
      const touch = game.touch.active;
      const lines = touch
        ? ['LEFT THUMB — RUN', 'BUTT — HEADBUTT THEM INTO WALLS', 'HOLD GRAB — CARRY · LET GO — THROW', 'ROLL — TUMBLE CLEAR', 'BAAH — SCREAM, THEY COME LOOKING']
        : ['WASD — RUN', 'MOUSE — AIM', 'LEFT CLICK — HEADBUTT THEM INTO WALLS', 'HOLD RIGHT CLICK — CARRY · LET GO — THROW', 'E — ROLL', 'SPACE — SCREAM, THEY COME LOOKING'];
      const lh = 40, top = lv.controls.y - (lines.length - 1) * lh / 2;
      ctx.font = `700 30px ${FONT_SC}`;
      lines.forEach((l, i) => {
        ctx.fillStyle = 'rgba(239,230,208,0.19)';
        ctx.fillText(l, lv.controls.x, (top + i * lh) * TILT);
      });
    }
    ctx.textAlign = 'left'; ctx.restore();
  }

  drawFire(game, cam) {
    const ctx = this.ctx, wd = game.world;
    const { x0, y0, x1, y1 } = this.visibleTiles(cam);
    for (let ty = Math.max(0, y0); ty <= Math.min(wd.H - 1, y1); ty++) {
      for (let tx = Math.max(0, x0); tx <= Math.min(wd.W - 1, x1); tx++) {
        const f = wd.fire[ty * wd.W + tx]; if (f <= 0) continue;
        ctx.save(); ctx.scale(1, 1 / TILT);
        this.flame(tx * TILE + TILE / 2, (ty * TILE + TILE / 2) * TILT, 14 + 4 * Math.sin(this.t * 13 + tx * 7 + ty * 3), tx * 3 + ty);
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
        if (wd.fire[ty * wd.W + tx] > 0) spots.push([tx * TILE + 16, ty * TILE + 16, 80]);
      }
    }
    if (!spots.length) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const [x, y, r] of spots) {
      const rr = r * (0.9 + 0.1 * Math.sin(this.t * 9 + x * 0.05));
      const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
      g.addColorStop(0, 'rgba(242,162,51,0.34)'); g.addColorStop(0.5, 'rgba(192,57,43,0.11)'); g.addColorStop(1, 'rgba(0,0,0,0)');
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

  flame(x, y, size, seed) {
    const ctx = this.ctx, t = this.t * 10 + seed;
    ctx.fillStyle = PALETTE.fire; ctx.beginPath(); ctx.ellipse(x, y - size * 0.2, size * 0.7, size, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PALETTE.fireHi; ctx.beginPath(); ctx.ellipse(x + Math.sin(t) * 3, y - size * 0.1, size * 0.35, size * 0.55 + Math.sin(t * 1.7) * 3, 0, 0, Math.PI * 2); ctx.fill();
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

  drawEnemy(e, game) {
    const ctx = this.ctx;
    const lying = e.state === 'floored' || e.state === 'stunned';
    this.drawTelegraph(e);
    this.shadow(e.x, e.y, e.r * (lying ? 1.4 : 1.05), e.r * (lying ? 0.5 : 0.42));
    ctx.save(); ctx.translate(e.x, e.y); ctx.scale(1, 1 / TILT); ctx.translate(0, lying ? 0 : -4);
    if (e.state === 'flung') ctx.rotate(this.t * 14); else ctx.rotate(e.facing);
    if (e.state === 'stagger') ctx.translate(Math.sin(this.t * 60) * 2, 0);
    if (e.state === 'chargewind') ctx.translate(-4 + Math.sin(this.t * 50) * 3, Math.cos(this.t * 47) * 2);
    const r = e.r;
    if (e.elite) ctx.scale(1.28, 1.28);
    if (lying) ctx.scale(1.35, 0.7);

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
    if (e.flash > 0) { ctx.globalAlpha = Math.min(0.8, e.flash * 4); ctx.fillStyle = PALETTE.bone; ctx.beginPath(); ctx.arc(0, 0, r + 1, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
    if (e.burning > 0) this.flame(0, -4, 12, e.x);
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

    if (e.bombFuse > 0) {
      const p = 1 - e.bombFuse / TUNING.goat.bomb.fuse;
      ctx.strokeStyle = `rgba(242,162,51,${0.5 + 0.5 * Math.sin(this.t * 40)})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 5 + p * 8, 0, Math.PI * 2); ctx.stroke();
    }
    // Butcher health notches, so his hits are readable without a text popup.
    if (e.kind === 'butcher') {
      const max = TUNING.butcher.hp, wdt = 9, gap = 4, total = max * wdt + (max - 1) * gap;
      for (let i = 0; i < max; i++) {
        ctx.fillStyle = i < e.hp ? PALETTE.blood : 'rgba(239,230,208,0.22)';
        ctx.fillRect(e.x - total / 2 + i * (wdt + gap), e.y - e.r - 14, wdt, 4.5);
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
        ['bearer', '+ BEARER'], ['hunter', '+ HUNTER'], ['seer', '+ SEER'], ['butcher', '+ BUTCHER'],
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
      ctx.fillStyle = PALETTE.bone; ctx.beginPath(); ctx.ellipse(-2, 0, 15, 9, 0, 0, Math.PI * 2); ctx.fill();
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
    // legs first, so they sit under the body
    ctx.strokeStyle = '#d9cfb6'; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
    const step = Math.sin(this.t * 22) * (Math.hypot(g.vx, g.vy) > 40 ? 3.5 : 0);
    ctx.beginPath();
    ctx.moveTo(5, -7); ctx.lineTo(6 + step, -12.5); ctx.moveTo(5, 7); ctx.lineTo(6 - step, 12.5);
    ctx.moveTo(-9, -7); ctx.lineTo(-10 - step, -12.5); ctx.moveTo(-9, 7); ctx.lineTo(-10 + step, 12.5);
    ctx.stroke();
    // ears, behind the head
    ctx.fillStyle = '#cfc4aa';
    ctx.beginPath(); ctx.ellipse(9.5, -7, 3.8, 2.2, -0.65, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(9.5, 7, 3.8, 2.2, 0.65, 0, Math.PI * 2); ctx.fill();
    // body
    ctx.fillStyle = PALETTE.bone; ctx.beginPath(); ctx.ellipse(-2, 0, 15, 10, 0, 0, Math.PI * 2); ctx.fill();
    // everything painted on the coat is clipped to it, so nothing spills past the silhouette
    ctx.save(); ctx.beginPath(); ctx.ellipse(-2, 0, 15, 10, 0, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = 'rgba(150,138,116,0.3)'; ctx.beginPath(); ctx.ellipse(-3, 5.5, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
    if (dmg < 3) { ctx.fillStyle = PALETTE.ochre; ctx.fillRect(6, -11, 2.6, 22); }   // marigold collar
    ctx.fillStyle = PALETTE.blood;
    for (let k = 0; k < dmg * 2; k++) { ctx.beginPath(); ctx.ellipse(-8 + k * 4.5, (k % 2 ? 4 : -4), 4.4, 3.2, 0.5 * k, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    // head, seen from three-quarters so the snout and beard read
    ctx.fillStyle = PALETTE.bone; ctx.beginPath(); ctx.ellipse(13, 0, 7.8, 6.1, 0, 0, Math.PI * 2); ctx.fill();
    // muzzle
    ctx.fillStyle = '#e4dac2'; ctx.beginPath(); ctx.ellipse(19.2, 0.6, 4.8, 4.2, 0.05, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#a9977c'; ctx.beginPath(); ctx.ellipse(22.6, 0.6, 1.9, 1.7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PALETTE.ink; ctx.fillRect(22.3, -0.6, 1.3, 1); ctx.fillRect(22.3, 1.2, 1.3, 1);
    // the beard: the single most goat thing about him
    ctx.fillStyle = '#dcd1b5';
    ctx.beginPath(); ctx.moveTo(18.6, 3.8); ctx.quadraticCurveTo(18.2, 10.4, 16.2, 12.2);
    ctx.quadraticCurveTo(18.6, 8.6, 16.8, 4.2); ctx.closePath(); ctx.fill();
    // horns sweeping back over the skull, ridged
    ctx.strokeStyle = PALETTE.ochre; ctx.lineWidth = 3.1; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(15, -3.4); ctx.quadraticCurveTo(9, -11.5, 0.5, -10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(15, 3.4); ctx.quadraticCurveTo(9, 11.5, 0.5, 10); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,84,32,0.55)'; ctx.lineWidth = 1;
    for (let k = 1; k <= 3; k++) {
      const tt = k / 4;
      const hx = 15 + (9 - 15) * 2 * tt * (1 - tt) + (0.5 - 15) * tt * tt;
      const hy1 = -3.4 + (-11.5 + 3.4) * 2 * tt * (1 - tt) + (-10 + 3.4) * tt * tt;
      ctx.beginPath(); ctx.moveTo(hx - 1.4, hy1 - 1.4); ctx.lineTo(hx + 1.4, hy1 + 1.4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hx - 1.4, -hy1 - 1.4); ctx.lineTo(hx + 1.4, -hy1 + 1.4); ctx.stroke();
    }
    // rectangular pupils, of course
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(13.5, -5.2, 3.4, 2.1); ctx.fillRect(13.5, 3.1, 3.4, 2.1);
    if (g.screaming > 0) {
      ctx.fillStyle = PALETTE.ink; ctx.beginPath(); ctx.ellipse(21.4, 1.4, 3.2, 4.2, 0, 0, Math.PI * 2); ctx.fill();
    }
    // tail
    ctx.strokeStyle = PALETTE.bone; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(-20, -3 + Math.sin(this.t * 9) * 2); ctx.stroke();
    if (g.onFire) this.flame(0, -6, 12, 1);
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
    const fire = !!game.mods.breath;
    const cd = 1 - g.screamCd / game.mods.screamCooldown;
    ctx.fillStyle = 'rgba(239,230,208,0.2)'; ctx.fillRect(14 * s, top + 50 * s, 58 * s, 5 * s);
    ctx.fillStyle = cd >= 1 ? (fire ? PALETTE.fire : PALETTE.bone) : (fire ? PALETTE.blood : PALETTE.ochre);
    ctx.fillRect(14 * s, top + 50 * s, 58 * s * cd, 5 * s);
    ctx.font = `700 ${11 * s}px ${FONT_SC}`; ctx.fillStyle = fire ? PALETTE.fire : 'rgba(239,230,208,0.55)';
    ctx.fillText(fire ? 'BREATH' : 'SCREAM', 78 * s, top + 56 * s);
    const rcd = 1 - g.rollCd / (TUNING.goat.roll.cooldown * game.mods.rollCooldown);
    ctx.fillStyle = 'rgba(239,230,208,0.2)'; ctx.fillRect(14 * s, top + 61 * s, 58 * s, 3 * s);
    ctx.fillStyle = rcd >= 1 ? 'rgba(239,230,208,0.8)' : PALETTE.ochre; ctx.fillRect(14 * s, top + 61 * s, 58 * s * rcd, 3 * s);
    ctx.font = `${10 * s}px ${FONT_SC}`; ctx.fillStyle = 'rgba(239,230,208,0.4)';
    ctx.fillText('ROLL', 78 * s, top + 66 * s);

    if (game.boons.length) {
      ctx.font = `700 ${10.5 * s}px ${FONT_SC}`;
      game.boons.forEach((b, i) => {
        ctx.fillStyle = b.active ? PALETTE.blood : PALETTE.ochre;
        ctx.fillText((b.active ? '◆ ' : '❖ ') + b.name, 14 * s, top + 84 * s + i * 14 * s);
      });
    }
    ctx.textAlign = 'right';
    const right = this.w - 20 * s;
    ctx.font = `${11 * s}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.45)';
    ctx.fillText(`seed ${game.level.seed}`, right, top + 12 * s);
    ctx.font = `700 ${15 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.bone;
    ctx.fillText(`${game.kills} SACRIFICED`, right, top + 32 * s);
    ctx.font = `${13 * s}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.7)';
    ctx.fillText(`${game.timer.toFixed(1)}s${game.audio.muted ? '  ·  muted' : ''}`, right, top + 50 * s);
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
    const ready = { butt: game.goat.state === 'idle' && !held, grab: true, scream: game.goat.screamCd <= 0, roll: game.goat.rollCd <= 0 };
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
