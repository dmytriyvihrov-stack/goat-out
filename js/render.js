// Rendering: responsive canvas, tiles, decals, firelight, props, enemies, goat, effects, HUD,
// on-screen touch controls and title cards. Level one uses the cached AltarArt environment.
const FONT = "'Alegreya', Georgia, 'Times New Roman', serif";
const FONT_SC = "'Alegreya SC', 'Alegreya', Georgia, serif";

// How big a square of cave the renderer marches and keeps at a time (`caveRockPath`). Small
// enough that walking into fresh rock costs one chunk, big enough that a screen is a dozen of them.
const CAVE_CHUNK = 16;
// The cave's baked ground (`Renderer.drawCaveBaked`): tiles a bitmap, bitmaps painted a frame, and
// the pixels all of them may hold between them before the least recently seen go.
const CAVE_BAKE = 8, CAVE_BAKE_MAX = 6, CAVE_BAKE_PX = 24e6;

// The controls, painted on the floor. Nothing about the mouse: a crosshair on a top-down game
// explains itself, and the floor has room for what it does not. Every block lies in the room that
// hands you the thing it is about, and none of them lies in an empty one:
//   0  the pen, under the bars, over the prompt that says which button opens them
//   1  the ambush room — a blade inside the door, a crate a step past it, the men down the far end
//   2  the floor the first man of the run is standing on. One line: he can be hit. What a wall does
//      to him is the whole of level one and it is learned by doing it, not by reading it here.
//   3  the roll, in the first crowded room past the lesson — see `rollCandidates` in `gen.js`.
const CONTROL_LINES = {
  key: [
    ['WASD - MOVE'],
    ['RIGHT CLICK - GRAB', 'RELEASE - THROW'],
    ['LEFT CLICK - HEADBUTT'],
    ['E - ROLL'],
  ],
  touch: [
    ['LEFT THUMB - MOVE'],
    ['GRAB - HOLD TO CARRY', 'RELEASE - THROW'],
    ['BUTT - HEADBUTT'],
    ['ROLL'],
  ],
};

// The key that throws each skill, read by the soul card so a new boon shows what activates it
// next to what it does, not just a name to remember. Kept in step with the `cap` on each row of
// `drawSkills`.
const SKILL_KEYS = { butt: 'LMB', grab: 'RMB', roll: 'E', scream: 'SPC' };

// A level's hint says what the room is about; this says which button it is about. `hintKey` on a
// level definition picks one, and the keyboard or the touch wording follows what is in the player's
// hands, the way the floor controls do.
const HINT_KEYS = {
  butt: ['LEFT CLICK - HEADBUTT', 'BUTT'],
  grab: ['HOLD RIGHT CLICK, CARRY', 'HOLD GRAB, CARRY'],
  roll: ['E, ROLL', 'ROLL'],
  scream: ['SPACE, BAAH', 'BAAH'],
};

// How far under the boards what you see through a hole is, as a share of the camera's own movement.
// 1 would be the floor you are standing on and 0 would be infinitely far away, so the smaller the
// number the deeper it reads. It is the whole trick: from directly above, a hole and a pillar are
// both a dark square, and the only thing that separates them is that the ground under a hole is a
// long way down and therefore slides against the lip of the hole as you run past it.
const DEPTH = { below: 0.42, night: 0.1 };

// A stable value in 0..1 for one cell of the far layer. The landscape has to be the same landscape
// every frame — generated from the cell rather than from `Math.random` — or it boils.
function farHash(i, j) {
  const v = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

// The pixel heart: the HUD hearts, and the one that hangs between the two of them in the pen.
const HEART_GLYPH = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];

class Renderer {
  constructor(canvas) {
    this.c = canvas; this.ctx = canvas.getContext('2d');
    this.t = 0; this.dust = []; this.vignette = null; this.vigKey = '';
    this.touchBand = false;
    this.painted = new PaintedArt(); this.altarArt = this.painted; this.altar = null;
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
  // A plate written over the world (a ware's note, an animal's terms) moved in by as little as it
  // takes to sit whole inside the picture and under the row of hearts: hung over its thing as it
  // was, a note over a stool by the top wall ran off the screen (playtest, 25 Sep 2026). Takes and
  // returns the box's top-left in the flattened space those plates draw in (y × TILT, after
  // `scale(1, 1 / TILT)`).
  // `ax`, `ay` (flattened too) is what the plate belongs to: one over something off the picture stays
  // off it, or every bark from the next room would be pinned to the edge of this one.
  keepInView(x, y, w, h, ax, ay) {
    const cam = this.game.cam, z = cam.zoom, m = 10 / z;
    const hw = this.vw / (2 * z), hh = this.vh / (2 * z), cy = cam.y * TILT;
    if (ax !== undefined && (Math.abs(ax - cam.x) > hw || Math.abs(ay - cy) > hh)) return { x, y };
    const top = cy - hh + 36 * this.hs / z;
    return { x: clamp(x, cam.x - hw + m, Math.max(cam.x - hw + m, cam.x + hw - m - w)),
      y: clamp(y, top, Math.max(top, cy + hh - m - h)) };
  }

  // The scale of the top band — hearts, rail, count, clock. It is the UI scale times one number in
  // `TUNING.hud`, so the corner of the screen can be made to read without touching the cards, the
  // menu or the floor text, all of which are sized for their own jobs.
  get hs() { return this.ts * TUNING.hud.scale; }

  draw(game, dt) {
    this.t += dt; this.game = game;   // the shelf reads the goat off it mid-draw
    this.altar = game.level && game.levelIndex === 0 ? this.altarArt : null;
    if (this.c.clientWidth && (Math.abs(this.c.clientWidth - this.cssW) > 1 || Math.abs(this.c.clientHeight - this.cssH) > 1)) this.resize();
    const ctx = this.ctx, w = this.w, h = this.h;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = game.level ? game.level.def.fog : '#0d0a0c';
    ctx.fillRect(0, 0, w, h);
    // The picture of the floor covers the whole screen: nothing behind it is worth a frame.
    if (game.world && !(game.card && game.card.painting && game.painting)) {
      const cam = game.cam;
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, this.vw, this.vh); ctx.clip();
      this.worldTransform(game);
      this.drawTiles(game, cam);
      this.drawDecals(game, cam);
      game.fx.drawGround(this,game);
      this.drawPits(game, cam);
      this.drawFallers(game);
      const dark = Dark.on(game);
      if (!dark) this.drawHints(game);   // in THE DARK the floor words go on over it (below)
      this.drawFire(game, cam);
      this.drawPoison(game, cam);
      this.drawLight(game, cam);
      this.drawCatching(game, cam);     // after the light: the burning tile next door washed it out
      this.drawDust(game, cam, dt);
      this.drawUnseen(game);            // ground, fire and firelight above it; everything that stands on it below
      this.drawRunes(game);
      this.drawBombFuse(game);
      Talisman.drawGround(this, game);   // grease, echoes, the straw goat
      this.drawDashPaths(game);
      this.drawGuide(game);
      this.drawSouls(game);
      this.drawPuffs(game);
      const lit = (o) => !game.hidden(o.x, o.y);
      // Props do not Y-sort against the goat (the men do, below) — their draw order is fixed, which is
      // fine for a wall-hugging crate or a bowl of coals. A cage bar always needed the exception; a
      // sword or shield lying on the floor is the same problem at the same scale, and drawing it
      // flat underneath him whenever he had walked past it read as the weapon sinking into the floor.
      const inFront = (p) => (p.kind === 'cage' && !p.deco || p.kind === 'weapon' && !p.inStand) && p.y > game.goat.y;
      // What he carries is drawn with him, in his teeth (`drawCarried`), and nowhere else.
      const carried = (p) => p === game.goat.holding;
      for (const p of game.props) if (!p.broken && p.kind !== 'lamp' && lit(p) && !inFront(p) && !carried(p)) this.drawProp(p);
      // A man out of the goat's sight is not drawn at all, only the line of a rifle aimed at him.
      const seen = (e) => lit(e) && game.inSight(e);
      for (const e of game.enemies) if (!e.dead && lit(e) && !seen(e) && e.state === 'aim') this.drawAimTelegraph(e);
      for (const e of game.enemies) if (!e.dead && seen(e) && (e.state === 'floored' || e.state === 'stunned')) this.drawEnemy(e, game);
      for (const p of game.props) if (!p.broken && p.kind === 'lamp' && lit(p)) this.drawProp(p);
      // Everyone on his feet and the goat, in order of where their feet are, so a man a step south of
      // the goat stands in front of him. The goat used to go on last, over the hood of whoever was
      // in front of him, and every body over the bark of the man behind it. What a man lays on the
      // floor (a windup's strip, the rifle's line, a soul's haze) goes down first, under all of
      // them; what hangs over a head (`overheads`) goes on after, over all of them.
      const g = game.goat, hld = g.holding;
      const standing = game.enemies.filter((e) => !e.dead && seen(e) && e.state !== 'floored' && e.state !== 'stunned' && e !== hld);
      for (const e of standing) this.drawEnemyGround(e, game);
      if (hld && !hld.item) this.drawEnemyGround(hld, game);
      // In the air over a man's back (LEAPFROG) he is over everyone.
      const foot = (o) => (o === g && g.leap ? Infinity : o.y);
      const cast = standing.concat([g]).sort((a, b) => foot(a) - foot(b));
      this.groundDone = true; this.overheads = [];
      try {
        for (const o of cast) {
          if (o !== g) { this.drawEnemy(o, game); continue; }
          const behind = hld && hld.item && this.carryBehind(g);
          if (behind) this.drawCarried(g, hld);
          if (!g.dead) this.drawGoat(g, game);
          if (hld) { if (hld.item) { if (!behind) this.drawCarried(g, hld); } else { this.drawEnemy(hld, game); this.drawHoldCharge(game); } }
        }
      } finally { this.groundDone = false; }
      for (const b of game.bullets) if (lit(b)) this.drawBullet(b);
      this.drawFlares(game);
      for (const b of game.globs) this.drawGlob(b);
      this.drawBoomerang(game);
      if (game.intro) this.drawIntroWorld(game);
      for (const p of game.props) if (!p.broken && lit(p) && inFront(p) && !carried(p)) this.drawProp(p);
      // Nearest the camera first, so a plate that has to step aside is the one behind.
      const heads = this.overheads.sort((a, b) => b.e.y - a.e.y), plates = []; this.overheads = null;
      for (const h of heads) { ctx.globalAlpha = h.a; this.drawOverhead(h.e, plates); }
      ctx.globalAlpha = 1;
      this.drawGrass(game, cam);
      this.drawBreath(game);
      this.drawRings(game);
      this.drawParticles(game);
      game.fx.draw(this,game);
      // THE DARK: over the world, under the floor words and the fog. The words were under it too, and
      // the one line that says what this floor is ("THE LAMPS ARE OUT") sat in 98% black.
      if (dark) { Dark.draw(this, game, cam); this.drawHints(game); }
      this.drawCageThought(game);
      this.drawFloatTexts(game);
      this.drawShade(game, cam);        // last of everything in world space: it covers what it covers
      this.drawNote();                  // ...but not the note over the ware he is standing at
      Talisman.drawWorld(this, game);    // the bell's shapes through stone, the panic
      this.drawStrays(game);            // an escort out of the picture, pointed at from its edge
      if (game.state === 'dead') this.drawDeathPath(game);
      if (game.dev.vision || game.dev.hearing) this.drawDevOverlay(game);
      ctx.restore();
      if (game.level && game.level.def.shroom) this.drawTrip(game);
    }
    this.drawVignette(game);
    this.drawHurt(game);
    this.drawHurtVignette(game);
    this.drawFlash(game);
    if (game.state === 'climb' && game.stairFx) {
      // the light at the top of the stairs takes the picture
      const p = clamp(game.stairFx.t, 0, 1);
      ctx.fillStyle = `rgba(239,230,208,${0.6 * p * p})`; ctx.fillRect(0, 0, this.vw, this.vh);
    }
    if (game.intro && game.inPrologue()) this.drawPrologue(game);
    if (game.intro) this.drawIntroOverlay(game);
    this.drawUI(game);
    if (game.state === 'paused') this.drawPause(game);
    this.drawTitle(game, dt);
    if (game.touch.active && game.state === 'play') this.drawTouchUI(game);
    this.drawBoonChoice(game);
    this.drawCard(game);
    this.drawDev(game);
  }

  // THE TRIP over the whole picture: a wash of colour whose hue walks slowly round the wheel and is
  // laid on in soft light, so the floor goes violet, then teal, then rose under you; and spores
  // drifting up the screen on a parallax of their own. None of it touches what anything is.
  drawTrip(game) {
    const ctx = this.ctx, t = this.t, w = this.vw, h = this.vh;
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    const a = t * 0.25, hue = (t * 14) % 360;
    const g = ctx.createLinearGradient(w * (0.5 + 0.5 * Math.cos(a)), h * (0.5 + 0.5 * Math.sin(a)), w * (0.5 - 0.5 * Math.cos(a)), h * (0.5 - 0.5 * Math.sin(a)));
    g.addColorStop(0, `hsla(${hue},85%,55%,0.55)`);
    g.addColorStop(0.5, `hsla(${(hue + 120) % 360},85%,50%,0.4)`);
    g.addColorStop(1, `hsla(${(hue + 240) % 360},85%,55%,0.55)`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    const cx = game.cam.x * 0.35, cy = game.cam.y * 0.35;
    for (let k = 0; k < 46; k++) {
      const hx = farHash(k * 7 + 1, 3), hy = farHash(k * 3, 11), hs = farHash(k, 29);
      const x = (((hx * w * 1.3 - cx + Math.sin(t * 0.7 + k) * 20) % w) + w) % w;
      const y = (((hy * h - cy - t * (12 + hs * 26)) % h) + h) % h;
      const r = (1.2 + hs * 2.6) * (this.s || 1);
      ctx.fillStyle = `hsla(${(hue + k * 37) % 360},90%,70%,${0.18 + 0.25 * (0.5 + 0.5 * Math.sin(t * 2 + k))})`;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    if (game.tripBanner > 0) this.drawTripBanner(game.tripBanner);
  }
  // The line across the screen as the trip begins: each letter on its own slow wave and its own hue,
  // because a caption set straight would be the one thing on this floor that is not wrong.
  drawTripBanner(left) {
    const B = TUNING.shroom.banner, ctx = this.ctx, t = this.t, s = this.ts || 1;
    const a = Math.min(1, (B.time - left) / B.fade, left / B.fade);
    const size = Math.min(44 * s, this.vw / (B.text.length * 0.62));
    ctx.save();
    ctx.globalAlpha = clamp(a, 0, 1);
    ctx.font = `700 ${size}px ${FONT_SC}`; ctx.textBaseline = 'middle';
    const w = ctx.measureText(B.text).width;
    let x = (this.vw - w) / 2;
    // under the level card, which comes up over the same first seconds
    const y = this.vh * 0.74;
    for (let i = 0; i < B.text.length; i++) {
      const ch = B.text[i], cw = ctx.measureText(ch).width, dy = Math.sin(t * 3 + i * 0.45) * size * 0.18;
      ctx.fillStyle = 'rgba(10,4,16,0.6)'; ctx.fillText(ch, x + 3, y + dy + 3);
      ctx.fillStyle = `hsl(${(t * 60 + i * 18) % 360},90%,72%)`; ctx.fillText(ch, x, y + dy);
      x += cw;
    }
    ctx.restore();
  }

  // Screen to world: the camera, the tilt, and whatever kick and zoom punch the frame is carrying.
  // On THE TRIP the lens also breathes and leans (`TUNING.shroom.cam`): slow, out of step with
  // itself on the two axes, and never a shake — a shake in this game means a lost heart and nothing
  // else. It is a render term like the zoom punch rather than anything the simulation knows about,
  // so nothing it does can be walked into or killed by; the pointer-to-world conversion reads
  // `cam.zoom` alone, the same as it already does through a shake.
  worldTransform(game) {
    const ctx = this.ctx, cam = game.cam, zk = 1 + (game.zoomKick || 0), t = this.t;
    const trip = game.level && game.level.def.shroom ? TUNING.shroom.cam : null;
    const tz = trip ? 1 + Math.sin(t * trip.rate) * trip.zoom : 1;
    const lx = trip ? Math.sin(t * trip.swayRate) * trip.sway : 0;
    const ly = trip ? Math.cos(t * trip.swayRate * 0.73) * trip.sway * 0.6 : 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.translate(this.vcx + (game.shakeX + game.kickX + lx) * this.s, this.vcy + (game.shakeY + game.kickY + ly) * this.s);
    ctx.scale(cam.zoom * zk * tz, cam.zoom * zk * tz * TILT);
    ctx.translate(-Math.round(cam.x), -Math.round(cam.y));
  }

  visibleTiles(cam) {
    const v = this.view(cam);
    return {
      x0: Math.floor((cam.x - v.w / 2) / TILE) - 1, y0: Math.floor((cam.y - v.h / 2) / TILE) - 1,
      x1: Math.ceil((cam.x + v.w / 2) / TILE) + 1, y1: Math.ceil((cam.y + v.h / 2) / TILE) + 1,
    };
  }

  drawTiles(game, cam) {
    if (game.world.round) { this.drawCaveTiles(game, cam); return; }
    if (PIXEL_ENV.ready) { this.painted.drawTiles(this, game, cam); return; }
    if (this.altar) { this.altar.drawTiles(this, game, cam); return; }
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
          // No cap on a room's bottom wall: what faces you there is the inside of it, and a pale
          // band along that edge reads as a stripe painted on the floor. Same call as the painted
          // walls make — see `drawTiles` in `painted-art.js`.
          if (openW) ctx.fillRect(px, py, 4, TILE);
          if (openE) { ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(px + TILE - 4, py, 4, TILE); }
          if (openS) { ctx.fillStyle = 'rgba(0,0,0,0.38)'; ctx.fillRect(px, py + TILE - 6, TILE, 6); }
          continue;
        }
        // A dark lip under every wall gives the floor some depth.
        if (this.drawFloorTile(game, tx, ty, t) && wd.isSolid(tx, ty - 1)) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(px, py, TILE, 5); }
      }
    }
  }

  // One tile of whatever is not stone: boards, straw, ash, the two flights of stairs. Shared by the
  // compound's square walls and the cave's round ones. Returns false for a hole, which is drawn later
  // with the pits and gets no lip.
  drawFloorTile(game, tx, ty, t) {
    const ctx = this.ctx, def = game.level.def, px = tx * TILE, py = ty * TILE;
    if (t === T.PIT) return false;
    // The cave's floor is the pixel pass's swatches; the square-walled levels draw theirs in `PaintedArt.drawTiles`.
    if (game.world.round && PIXEL_ENV.ready) PIXEL_ENV.floor(ctx, def.shroom ? 'trip' : 'cave', tx, ty, def.floor);
    else { ctx.fillStyle = ((tx + ty) & 1) ? def.floor : def.floorAlt; ctx.fillRect(px, py, TILE, TILE); }
    if (t === T.HAY && PIXEL_ENV.ready) PIXEL_ENV.draw(ctx, 'hay', px + 16, py + 29, 33);
    else if (t === T.HAY) {
      // Only before the pixel atlas has loaded: a yellow square with four strokes in it.
      {
        ctx.fillStyle = PALETTE.hay; ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
        ctx.strokeStyle = PALETTE.hayDark; ctx.lineWidth = 2; ctx.beginPath();
        for (let k = 0; k < 4; k++) { const sx = px + 5 + k * 7, sy = py + 5 + ((tx * 3 + ty * 5 + k) % 3) * 6; ctx.moveTo(sx, sy); ctx.lineTo(sx + 5, sy + 12); }
        ctx.stroke();
      }
    } else if (t === T.ASH) {
      this.painted.ashTile(ctx, px, py, (tx * 73856093 ^ ty * 19349663) >>> 0);
    } else if (t === T.EXIT) {
      this.drawStairs(px, py, tx - game.level.exitTile.x0, true, def, Renderer.forkRow(game.level, ty));
    } else if (t === T.ENTRY) {
      this.drawStairs(px, py, tx - game.level.entry.x0, false, def);
    }
    return true;
  }

  // THE CAVE. The rock is one shape rather than a grid of squares: every wall tile next to the floor
  // is added to a single path with its outside corners rounded to `world.round`, and every inside
  // corner of the floor gets the fillet that fills it — the same shape `World.collideRound` pushes
  // bodies out of, so what you see is what you slide along. It is filled three times: a shadow a few
  // pixels down onto the floor, the rock's face in `wall`, and its top in `wallTop` lifted off every
  // edge that faces the camera, which leaves the face showing as a band along the bottom of the rock.
  // An unbroken secret wall is rock here too, and its prop draws only the crack.
  // The cave cut through the middle of its tiles (`World.marchCell`, the same shape the collision
  // pushes against). The floor goes down under every tile that touches the open, stone included,
  // since the march leaves the corners of a lone stone bare; then the rock is one path, filled as a
  // shadow, as its face and — clipped to itself and lifted — as its top, the way the round cave is.
  drawCaveMid(game, cam) {
    const wd = game.world, W = wd.W;
    const { x0, y0, x1, y1 } = this.visibleTiles(cam);
    const secret = new Set();
    for (const p of game.props) if (p.kind === 'secret' && !p.broken) secret.add(Math.floor(p.y / TILE) * W + Math.floor(p.x / TILE));
    const solid = (tx, ty) => wd.isSolid(tx, ty) || secret.has(ty * W + tx);
    this.drawCaveBaked(game, cam, x0, y0, x1, y1, secret, solid);
  }

  // THE CAVE, baked. Everything `drawCaveRegion` paints is the same every frame — the floor, its
  // litter and mushrooms, the rock and what grows on it — so it is painted once into a bitmap per
  // `CAVE_BAKE` tiles and the frame is a handful of `drawImage`s. Painting it live was every tile's
  // floor, every mushroom's cap and every stalactite's curve sixty times a second, and pulled back to
  // the whole level (the death screen) it was thousands of them: THE TRIP ran at a few frames a
  // second there (playtest, 23 Sep 2026). A chunk is painted from a region two tiles wider than
  // itself and clipped to its own box, so nothing that spills across a seam — a spire, the rock's
  // drop shadow — is lost at it. It is rebaked when anything under it changes (`caveBakeSig`), at a
  // resolution picked off the zoom, and at most `CAVE_BAKE_MAX` a frame, a flat floor standing in for
  // one not painted yet. What moves — the glow round each mushroom — is stamped live over it, and
  // not at all once the camera is pulled back far enough that nobody could see it breathe.
  drawCaveBaked(game, cam, x0, y0, x1, y1, secret, solid) {
    const ctx = this.ctx, wd = game.world, def = game.level.def, K = CAVE_BAKE;
    const z = cam.zoom, B = z > 2 ? 3 : z > 1 ? 2 : z > 0.5 ? 1 : z > 0.25 ? 0.5 : 0.25;
    if (!this.bake || this.bake.world !== wd) this.bake = { world: wd, map: new Map(), px: 0, tick: 0 };
    const bk = this.bake; bk.tick++;
    let budget = CAVE_BAKE_MAX;
    const glow = z > 0.9 && def.shroom, glows = [];
    const c0 = Math.floor(x0 / K), c1 = Math.floor(x1 / K), r0 = Math.floor(y0 / K), r1 = Math.floor(y1 / K);
    for (let cj = r0; cj <= r1; cj++) for (let ci = c0; ci <= c1; ci++) {
      const key = cj * 65536 + ci;
      let e = bk.map.get(key);
      // Pulled far back there are hundreds of chunks and none of them is being looked at closely: a
      // tenth of them are asked whether they have changed each frame rather than all of them.
      const sig = e && e.B === B && B <= 0.5 && (bk.tick + ci + cj) % 10 ? e.sig : this.caveBakeSig(wd, ci * K, cj * K, secret);
      if (!e || e.sig !== sig || e.B !== B) {
        if (budget > 0) { budget--; e = this.bakeCaveChunk(game, ci, cj, B, sig, secret, solid, e); bk.map.set(key, e); }
        else if (!e || e.sig !== sig) {
          // not painted yet: the floor's own colour, so it reads as ground rather than a hole
          ctx.fillStyle = def.floor; ctx.fillRect(ci * K * TILE, cj * K * TILE, K * TILE, K * TILE);
          continue;
        }
      }
      e.used = bk.tick;
      if (e.cv) { ctx.imageSmoothingEnabled = true; ctx.drawImage(e.cv, 0, 0, e.cv.width, e.cv.height, ci * K * TILE, cj * K * TILE, K * TILE, K * TILE); ctx.imageSmoothingEnabled = false; }
      if (glow && e.glows) glows.push(e.glows);
    }
    if (glows.length) {
      const t = this.t;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.imageSmoothingEnabled = true;
      for (const q of glows) for (let i = 0; i < q.length; i += 5) {
        ctx.globalAlpha = Math.min(1, q[i + 4] * (0.75 + 0.25 * Math.sin(t * 2.3 + q[i + 1] * 0.04 + q[i + 2] * 0.02)));
        ctx.drawImage(this.glowSprite(q[i]), q[i + 1], q[i + 2], q[i + 3], q[i + 3]);
      }
      ctx.restore(); ctx.imageSmoothingEnabled = false;
    }
    // Keep the bitmaps to a budget of pixels, dropping whatever has gone longest unseen.
    if (bk.px > CAVE_BAKE_PX) {
      const old = [...bk.map.entries()].filter(([, e]) => e.used !== bk.tick).sort((a, b) => a[1].used - b[1].used);
      for (const [k, e] of old) { if (bk.px <= CAVE_BAKE_PX * 0.8) break; bk.px -= e.px || 0; bk.map.delete(k); }
    }
  }
  // What a chunk is painted from, as one number: its tiles and grass two tiles round, the rock's own
  // epoch and which secret walls still stand. Any change and the bitmap is stale.
  caveBakeSig(wd, i0, j0, secret) {
    const W = wd.W; let h = (wd.caveEpoch || 0) * 7919 + 17;
    for (let j = j0 - 2; j < j0 + CAVE_BAKE + 2; j++) {
      if (j < 0 || j >= wd.H) continue;
      for (let i = i0 - 2; i < i0 + CAVE_BAKE + 2; i++) {
        if (i < 0 || i >= W) continue;
        const k = j * W + i;
        h = (Math.imul(h, 31) + wd.tiles[k] * 3 + (wd.grass[k] ? 1 : 0) + (secret.has(k) ? 11 : 0)) | 0;
      }
    }
    return h;
  }
  bakeCaveChunk(game, ci, cj, B, sig, secret, solid, prev) {
    const K = CAVE_BAKE, bk = this.bake, S = K * TILE, size = Math.max(1, Math.round(S * B));
    let cv = prev && prev.cv && prev.cv.width === size ? prev.cv : null;
    if (!cv) { cv = document.createElement('canvas'); cv.width = cv.height = size; }
    if (prev && prev.px) bk.px -= prev.px;
    const cx = cv.getContext('2d'), real = this.ctx;
    cx.setTransform(1, 0, 0, 1, 0, 0); cx.clearRect(0, 0, size, size);
    cx.imageSmoothingEnabled = false;
    cx.setTransform(B, 0, 0, B, -ci * S * B, -cj * S * B);
    const ox = ci * S, oy = cj * S;
    this.ctx = cx; this.baking = true; this.glowQ = game.level.def.shroom ? [] : null;
    try {
      this.drawCaveRegion(game, ci * K - 2, cj * K - 2, ci * K + K + 1, cj * K + K + 1, secret, solid);
    } finally { this.ctx = real; this.baking = false; }
    const q = this.glowQ || []; this.glowQ = null;
    const glows = [];
    for (let i = 0; i < q.length; i += 5) {
      const mx = q[i + 1] + q[i + 3] / 2, my = q[i + 2] + q[i + 3] / 2;
      if (mx >= ox && mx < ox + S && my >= oy && my < oy + S) glows.push(q[i], q[i + 1], q[i + 2], q[i + 3], q[i + 4]);
    }
    bk.px += size * size;
    return { cv, B, sig, glows, px: size * size, used: bk.tick };
  }

  // One region of the cave, painted into whatever `this.ctx` is — the chunk being baked.
  drawCaveRegion(game, x0, y0, x1, y1, secret, solid) {
    const ctx = this.ctx, wd = game.world, def = game.level.def, W = wd.W;
    const LIFT = 7, edge = [];
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const s = solid(tx, ty);
      let open = !s;
      if (s) for (let dy = -1; dy <= 1 && !open; dy++) for (let dx = -1; dx <= 1; dx++) if (!solid(tx + dx, ty + dy)) { open = true; break; }
      if (!open) continue;
      if (s) edge.push(tx, ty);
      this.drawFloorTile(game, tx, ty, s ? T.FLOOR : wd.tileAt(tx, ty));
      if (!s && wd.grass[ty * W + tx]) {
        const h = farHash(tx, ty), px = tx * TILE, py = ty * TILE;
        ctx.fillStyle = def.grassDark || '#223618';
        ctx.beginPath(); ctx.ellipse(px + 16, py + 17, 17 + h * 3, 15, h * 2, 0, Math.PI * 2); ctx.fill();
      } else if (!s && PIXEL_ENV.ready && wd.tiles[ty * W + tx] === T.FLOOR) PIXEL_ENV.litter(ctx, 'cave', tx, ty);
    }
    if (def.shroom) this.drawFloorShrooms(game, x0, y0, x1, y1, solid);
    const base = this.caveRockPath(wd, x0, y0, x1, y1, secret);
    ctx.save(); ctx.translate(0, 6); ctx.fillStyle = 'rgba(0,0,0,0.34)'; ctx.fill(base); ctx.restore();
    ctx.fillStyle = def.wall; ctx.fill(base);
    ctx.save(); ctx.clip(base); ctx.translate(0, -LIFT);
    ctx.fillStyle = def.wallTop; ctx.fill(base);
    ctx.clip(base);
    for (let j = 0; j < edge.length; j += 2) {
      const tx = edge[j], ty = edge[j + 1];
      for (let k = 0; k < 3; k++) {
        const h1 = farHash(tx * 3 + k, ty), h2 = farHash(tx, ty * 5 + k), h3 = farHash(tx + k * 11, ty - k);
        ctx.fillStyle = h3 < 0.5 ? 'rgba(0,0,0,0.13)' : 'rgba(255,240,210,0.07)';
        ctx.beginPath(); ctx.ellipse(tx * TILE + 4 + h1 * 24, ty * TILE + 4 + h2 * 22, 2 + h3 * 3, 1.4 + h3 * 2, h1 * 3, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
    this.drawCaveDecor(game, edge, solid, LIFT);
  }

  // The rock as one path, cut into chunks of `CAVE_CHUNK` tiles and kept between frames. Marching
  // the window and pushing two thousand points into a fresh Path2D every frame was, measured, the
  // single most expensive thing in the cave — more than every body and every prop on the floor put
  // together. The shape only changes when a wall does, and `World.caveDirty` is what says so.
  caveRockPath(wd, x0, y0, x1, y1, secret) {
    const K = CAVE_CHUNK, epoch = wd.caveEpoch || 0;
    if (!this.caveCache || this.caveCache.epoch !== epoch || this.caveCache.world !== wd) {
      this.caveCache = { epoch, world: wd, chunks: new Map() };
    }
    const chunks = this.caveCache.chunks, out = new Path2D();
    const c0 = Math.floor((x0 - 1) / K), c1 = Math.floor(x1 / K);
    const r0 = Math.floor((y0 - 1) / K), r1 = Math.floor(y1 / K);
    for (let cj = r0; cj <= r1; cj++) for (let ci = c0; ci <= c1; ci++) {
      const key = cj * 65536 + ci;
      let p = chunks.get(key);
      if (p === undefined) { p = this.caveChunkPath(wd, ci * K, cj * K, secret); chunks.set(key, p); }
      if (p) out.addPath(p);
    }
    return out;
  }
  // One chunk of it. A cell every one of whose corners is deep rock — out past `cave.band` from any
  // open floor — is skipped outright: that is the inside of the hill, and drawing it was showing a
  // huge piece of the level that has nothing in it and cannot be walked into.
  caveChunkPath(wd, i0, j0, secret) {
    const K = CAVE_CHUNK, polys = [];
    for (let j = j0; j < j0 + K; j++) for (let i = i0; i < i0 + K; i++) {
      if (!wd.caveNearAt(i, j) && !wd.caveNearAt(i + 1, j) && !wd.caveNearAt(i, j + 1) && !wd.caveNearAt(i + 1, j + 1)) continue;
      wd.marchCell(i, j, secret, polys, null);
    }
    if (!polys.length) return null;
    const p = new Path2D();
    for (const pts of polys) {
      p.moveTo(pts[0], pts[1]);
      for (let k = 2; k < pts.length; k += 2) p.lineTo(pts[k], pts[k + 1]);
      p.closePath();
    }
    return p;
  }

  // What grows on the rock. In any cave: stone spires that RISE at the foot of the rock's own face,
  // spires standing up off its top, and seams of gems along the face — the band of rock the camera
  // can actually see. All of it sits on stone tiles only — nothing here stands on floor you can walk
  // on, so none of it can be mistaken for something in the way — and all of it is off a hash of the
  // tile, so it is the same rock every frame. On the trip the rock is furred with mushrooms too.
  //
  // Two things changed after the 22 Sep 2026 playtest. The spires used to HANG: triangles pointing
  // down out of the face onto the floor, which from directly above reads as teeth stuck to a wall
  // rather than as anything a cave does. They are rooted on the floor at the foot of the cliff now
  // and go up, over the face and past the top of the rock, which is what a stone spire looks like
  // from any angle. And the gems used to be scattered anywhere on the tile, top surface included:
  // the top of a rock is the part of the cave you are not looking at, so a seam drawn there is a
  // seam nobody sees. They are on the visible face and nowhere else.
  drawCaveDecor(game, edge, solid, LIFT) {
    const ctx = this.ctx, t = this.t, def = game.level.def, trip = !!def.shroom;
    const LK = trip ? TUNING.cave.look.trip : TUNING.cave.look.cave;
    const GEMS = ['#b06cff', '#4fe0b0', '#ff5a7a', '#5ab4ff', '#ffd25a'];
    const SH = ['#e86ad8', '#6af0e0', '#b8ff5a', '#ff9a4a', '#a98bff'];
    for (let j = 0; j < edge.length; j += 2) {
      const tx = edge[j], ty = edge[j + 1], px = tx * TILE, py = ty * TILE;
      const h = farHash(tx * 13 + 5, ty * 17 + 3), h2 = farHash(tx * 5 - 9, ty * 11 + 1), h3 = farHash(tx + 31, ty * 3 - 7);
      const southOpen = !solid(tx, ty + 1), northOpen = !solid(tx, ty - 1);
      // Dripstone on the far wall of the room — what hangs from a cave's ceiling, which from here
      // is the rock above the floor. It used to be the same shape as the stone teeth below: a row
      // of even, needle-pointed triangles all along the top of every room, which reads as a mouth
      // rather than as a cave. Stalactites are grown, not broken: blunt tips, fluted sides, banded
      // where the water left its rings, and wildly uneven in length — a couple of long ones and a
      // lot of short stubs. Fewer of them, too, so what is left is a feature and not a fringe.
      if (southOpen && h < LK.drips) {
        const n = 1 + Math.floor(h2 * 2), base = py + TILE;
        for (let k = 0; k < n; k++) {
          const hk = farHash(tx + k, ty - k);
          const x = px + 6 + ((k + 0.5) / n) * (TILE - 12) + (h3 - 0.5) * 7;
          // squared, so most of them are stubs and the long one is worth looking at
          const len = 9 + hk * hk * 32, w = 1.7 + h2 * 1.7 + len * 0.03;
          this.dripstone(x, base, len, w, def, hk);
          if (!trip && !this.baking && farHash(tx - k, ty + 9) < 0.3) {
            // a bead of water running down it, now and then
            const drip = (t * 0.6 + h3 * 7) % 1;
            ctx.fillStyle = `rgba(170,200,230,${0.5 * (1 - drip)})`;
            ctx.beginPath(); ctx.arc(x, base - len * (1 - drip) + 2, 1.4, 0, Math.PI * 2); ctx.fill();
          }
        }
      }
      // stalagmites: spires standing up off the top of the rock behind the room's edge
      // Not the pixel stalagmites: that sprite is the stone teeth that kill (`drawSpire`), and rock
      // decoration wearing it would be a hazard drawn where there is none.
      if (northOpen && h2 > 1 - LK.spires) {
        const n = 1 + Math.floor(h3 * 2);
        for (let k = 0; k < n; k++) {
          const x = px + 8 + farHash(tx * 3 + k, ty) * (TILE - 16), y = py + 12 - LIFT + k * 5, len = 14 + farHash(tx, ty + k) * 14, w = 4 + h * 3;
          ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x + 3, y + 1, w * 1.1, w * 0.45, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = def.wallTop; ctx.beginPath(); ctx.moveTo(x - w, y); ctx.quadraticCurveTo(x - w * 0.3, y - len * 0.5, x, y - len); ctx.quadraticCurveTo(x + w * 0.3, y - len * 0.5, x + w, y); ctx.closePath(); ctx.fill();
          ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.moveTo(x, y - len); ctx.quadraticCurveTo(x + w * 0.3, y - len * 0.5, x + w, y); ctx.lineTo(x + w * 0.2, y); ctx.closePath(); ctx.fill();
        }
      }
      // A seam of gems, and only along the face: the band of rock at the bottom of the tile is the
      // part of it the camera is looking at, and a seam on the top surface — the part you are looking
      // over rather than at — was paint nobody ever saw. Faceted, each catching the light on its own
      // beat. The count is down with the room it has left to stand in.
      if (southOpen && h3 < LK.crystals && PIXEL_ENV.ready) {
        PIXEL_ENV.draw(ctx, 'crystals', px + 8 + h * 16, py + TILE + 1, 11 + h2 * 5);
      } else if (southOpen && h3 < LK.crystals) {
        const n = 1 + Math.floor(h * 2);
        for (let k = 0; k < n; k++) {
          const gx = px + 6 + farHash(tx * 7 + k, ty - 3) * (TILE - 12);
          const gy = py + TILE - LIFT + 1 + farHash(tx, ty * 7 + k) * (LIFT - 1);
          const c = GEMS[Math.floor(farHash(tx + k * 3, ty + 2) * GEMS.length)], sz = 2.2 + farHash(tx - k, ty) * 2.4;
          this.gem(gx, gy, sz, c, farHash(tx + k, ty - k));
        }
      }
      // Small crystals among the mushrooms on top of the rock (`gems` of the edges): a stone in the
      // seam's own colours with, as often as not, a smaller one leaning on it — a little cluster
      // rather than a lone speck — and a little of its own light, like the caps beside it.
      if (farHash(tx * 17 + 3, ty * 29 - 11) < LK.gems) {
        const gx = px + 6 + farHash(tx * 5, ty + 13) * (TILE - 12), gy = py + 7 - LIFT + farHash(tx + 19, ty * 11) * (TILE - 10);
        const c = GEMS[Math.floor(farHash(tx - 5, ty + 7) * GEMS.length)], sz = 2.2 + farHash(tx, ty * 9) * 1.6;
        if (this.glowQ) { const R0 = sz * 5; this.glowQ.push(c, gx - R0, gy - R0, R0 * 2, 0.6); }
        if (h3 > 0.5) {
          const side = farHash(tx + 3, ty - 3) < 0.5 ? -1 : 1, c2 = GEMS[Math.floor(farHash(tx + 9, ty - 1) * GEMS.length)];
          this.gem(gx + side * sz * 1.3, gy + sz * 0.45, sz * 0.62, c2, farHash(tx - 1, ty + 3));
        }
        this.gem(gx, gy, sz, c, farHash(tx, ty + 3));
      }
      // the trip: the rock is furred with mushrooms along the edges that face the room, `fur` of them
      if (trip && farHash(tx * 23 - 1, ty * 19 + 7) < LK.fur) {
        const n = 1 + Math.floor(h2 * 3);
        for (let k = 0; k < n; k++) {
          const mx = px + 4 + farHash(tx * 11 + k, ty + 5) * (TILE - 8), my = py + 8 - LIFT + farHash(tx - 7, ty * 13 + k) * (TILE - 8);
          const c = SH[Math.floor(farHash(tx + k, ty * 3) * SH.length)], cap = 2.5 + farHash(tx * 2 + k, ty) * 4.5;
          this.shroom(mx, my, cap, c, 0.5 + 0.5 * Math.sin(t * 1.7 + (tx + k) * 0.9 + ty), k === 0);
        }
      }
    }
  }
  // One faceted crystal of `c` at (gx, gy), `sz` across the middle: a dark rim, the stone, a pale
  // face catching the light, and now and then a glint (`seed` sets its beat; never while baking).
  gem(gx, gy, sz, c, seed) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.moveTo(gx, gy - sz * 1.3); ctx.lineTo(gx + sz, gy); ctx.lineTo(gx, gy + sz * 1.3); ctx.lineTo(gx - sz, gy); ctx.closePath(); ctx.fill();
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(gx, gy - sz); ctx.lineTo(gx + sz * 0.8, gy); ctx.lineTo(gx, gy + sz); ctx.lineTo(gx - sz * 0.8, gy); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.moveTo(gx, gy - sz); ctx.lineTo(gx + sz * 0.8, gy); ctx.lineTo(gx, gy); ctx.closePath(); ctx.fill();
    const tw = Math.pow(Math.max(0, Math.sin(this.t * 2.2 + seed * 40)), 12);
    if (tw > 0.05 && !this.baking) {
      ctx.strokeStyle = `rgba(255,255,255,${tw * 0.9})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(gx - sz * 2, gy - sz * 0.2); ctx.lineTo(gx + sz * 2, gy - sz * 0.2); ctx.moveTo(gx, gy - sz * 2.2); ctx.lineTo(gx, gy + sz * 1.8); ctx.stroke();
    }
  }
  // One stalactite, rooted at (x, base) and reaching `len` up the face of the rock. Everything about
  // the shape is the opposite of the stone teeth on the floor below: the sides pull in on a curve
  // instead of a straight taper, so the thing has a waist; the tip is an arc rather than a point;
  // and two or three faint rings across it say it was laid down a drip at a time. The pale side is
  // wet rock catching the light, not a highlight on a blade.
  dripstone(x, base, len, w, def, h) {
    const ctx = this.ctx;
    // Nothing in a cave grows straight up. The lean is the whole difference between a row of these
    // and a row of fence posts, and it costs one number.
    const lean = (h - 0.5) * len * 0.26;
    const tipX = x + lean, tipY = base - len, tipR = Math.max(0.9, w * 0.26);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(x + 2, base, w * 1.35, w * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    // Sides that pull in on a curve and a tip that is an arc: a drip's shape, not a blade's.
    ctx.beginPath();
    ctx.moveTo(x - w, base);
    ctx.bezierCurveTo(x - w * 0.92, base - len * 0.42, tipX - w * 0.44, base - len * 0.74, tipX - tipR, tipY + tipR * 1.7);
    ctx.quadraticCurveTo(tipX, tipY, tipX + tipR, tipY + tipR * 1.7);
    ctx.bezierCurveTo(tipX + w * 0.44, base - len * 0.74, x + w * 0.92, base - len * 0.42, x + w, base);
    ctx.closePath();
    ctx.save(); ctx.clip();
    // Lit from the left down its whole length rather than capped at the top: a band across the top
    // of one of these turns it into a lighthouse, and a column is shaded along it, not across it.
    ctx.fillStyle = def.wallTop; ctx.fillRect(x - w - 2, tipY - 2, w * 2 + 4 + Math.abs(lean), len + 4);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x + w * 0.12, tipY - 2, w * 2 + Math.abs(lean), len + 4);
    ctx.fillStyle = 'rgba(255,246,226,0.3)'; ctx.fillRect(x - w - 2, tipY - 2, w * 0.7, len + 4);
    ctx.restore();
    // and the wet tip catches it
    ctx.fillStyle = 'rgba(255,250,235,0.35)';
    ctx.beginPath(); ctx.arc(tipX, tipY + tipR * 1.1, tipR * 0.8, 0, Math.PI * 2); ctx.fill();
  }
  // One mushroom standing on the ground at (x, y): a pale stalk, a cap of `c`, spots, and a glow
  // round it that breathes with `pulse` (0..1).
  shroom(x, y, cap, c, pulse, glow = true) {
    const ctx = this.ctx, stalk = cap * 1.1;
    if (glow) {
      // A glow is a sprite stamped at an alpha, not a gradient built fresh: the trip has a few hundred
      // of these on screen, and a new radial gradient plus a save/restore each was most of why the
      // level ran at half the frame rate of the cave it replaces.
      // Inside a `glowQ` pass they are queued and stamped together by `flushGlows`: switching the
      // blend mode twice per mushroom broke every batch the GPU could have made of them.
      const R0 = cap * 4, a = (0.28 + 0.2 * pulse) / 0.48;
      if (this.glowQ) this.glowQ.push(c, x - R0, y - stalk - R0, R0 * 2, a);
      else {
        const op = ctx.globalCompositeOperation, ga = ctx.globalAlpha, sm = ctx.imageSmoothingEnabled;
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = ga * a; ctx.imageSmoothingEnabled = true;
        ctx.drawImage(this.glowSprite(c), x - R0, y - stalk - R0, R0 * 2, R0 * 2);
        ctx.globalCompositeOperation = op; ctx.globalAlpha = ga; ctx.imageSmoothingEnabled = sm;
      }
    }
    ctx.fillStyle = '#e8dcc8'; ctx.fillRect(x - cap * 0.22, y - stalk, cap * 0.44, stalk);
    ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y - stalk, cap, cap * 0.62, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x - cap, y - stalk - 0.5, cap * 2, 1.2);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.arc(x - cap * 0.4, y - stalk - cap * 0.3, cap * 0.16, 0, Math.PI * 2); ctx.arc(x + cap * 0.3, y - stalk - cap * 0.4, cap * 0.12, 0, Math.PI * 2); ctx.fill();
  }
  flushGlows() {
    const q = this.glowQ, ctx = this.ctx; this.glowQ = null;
    if (!q || !q.length) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.imageSmoothingEnabled = true;
    for (let i = 0; i < q.length; i += 5) { ctx.globalAlpha = q[i + 4]; ctx.drawImage(this.glowSprite(q[i]), q[i + 1], q[i + 2], q[i + 3], q[i + 3]); }
    ctx.restore(); ctx.imageSmoothingEnabled = false;
  }
  // A soft disc of `c`, 0.48 alpha at the middle and nothing at the edge, drawn once per colour.
  glowSprite(c) {
    const cache = this.glowCache || (this.glowCache = {});
    if (cache[c]) return cache[c];
    const S = 64, cv = document.createElement('canvas'); cv.width = cv.height = S;
    const g2 = cv.getContext('2d'), g = g2.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, this.alpha(c, 0.48)); g.addColorStop(1, this.alpha(c, 0));
    g2.fillStyle = g; g2.fillRect(0, 0, S, S);
    return (cache[c] = cv);
  }
  // '#rrggbb' at alpha `a`.
  alpha(c, a) {
    const n = parseInt(c.slice(1), 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
  }
  // The trip's floor: a little ring of glowing caps on some tiles, which is most of the light there is.
  // Never on a tile something was put down on, and never on the stairs.
  // `look.trip.floor` of the tiles get one, and they are the rock's own mushrooms — the same caps,
  // colours, sizes and glow as `drawCaveDecor`'s fur. They were the painted magenta clump, which is
  // also the big mushroom you can break (`drawBigShroom`), so the floor was full of little copies of
  // the one thing on it that matters (24 Sep 2026).
  drawFloorShrooms(game, x0, y0, x1, y1, solid) {
    const wd = game.world, W = wd.W, t = this.t;
    const SH = ['#e86ad8', '#6af0e0', '#b8ff5a', '#ff9a4a', '#a98bff'];
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (solid(tx, ty) || wd.tiles[ty * W + tx] !== T.FLOOR) continue;
      if (farHash(tx * 19 + 7, ty * 23 + 1) > TUNING.cave.look.trip.floor) continue;
      const n = 1 + Math.floor(farHash(tx, ty + 40) * 3);
      for (let k = 0; k < n; k++) {
        const x = tx * TILE + 6 + farHash(tx * 3 + k, ty) * (TILE - 12), y = ty * TILE + 12 + farHash(tx, ty * 3 + k) * (TILE - 14);
        const c = SH[Math.floor(farHash(tx + k, ty * 3 + 1) * SH.length)], cap = 2.5 + farHash(tx * 2 + k, ty + 3) * 4.5;
        this.shroom(x, y, cap, c, 0.5 + 0.5 * Math.sin(t * 1.7 + (tx + k) * 0.9 + ty), k === 0);
      }
    }
  }
  // THE TRIP's boulder: a cap as tall as a man on a thick stalk. It is the same boulder in every other
  // respect — it blocks, it kills a thrown body, it takes `rock.hits` blows — and a crack runs across
  // the cap once it has taken the first.
  drawBigShroom(p) {
    const ctx = this.ctx, t = this.t;
    const wob = p.wobble > 0 ? Math.sin(t * 60) * 2 * p.wobble / 0.3 : 0;
    const x = p.x + wob, y = p.y + 6, r = p.r * 1.25;
    const COL = ['#c9408f', '#3fa7a0', '#8a4fd6', '#d9772e'], c = COL[Math.floor(farHash(p.x, p.y) * COL.length)];
    const breathe = 1 + 0.03 * Math.sin(t * 1.6 + p.x * 0.05);
    this.shadow(x, y, r * 1.1, r * 0.45);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y - r * 1.3, 0, x, y - r * 1.3, r * 2.6);
    g.addColorStop(0, this.alpha(c, 0.22)); g.addColorStop(1, this.alpha(c, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - r * 1.3, r * 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    if (PIXEL_ENV.ready) {
      const h = PIXEL_ENV.draw(ctx, 'shrooms', x, y, r * 3.1 * breathe);
      if (p.hits) {
        ctx.strokeStyle = 'rgba(20,0,20,0.75)'; ctx.lineWidth = 1.8; ctx.beginPath();
        ctx.moveTo(x - r * 0.9, y - h * 0.85); ctx.lineTo(x - 3, y - h * 0.7); ctx.lineTo(x + 2, y - h * 0.9); ctx.lineTo(x + r * 0.6, y - h * 0.75); ctx.stroke();
      }
      return;
    }
    ctx.fillStyle = '#e6d9c2'; ctx.beginPath();
    ctx.moveTo(x - r * 0.32, y); ctx.quadraticCurveTo(x - r * 0.22, y - r * 0.8, x - r * 0.26, y - r * 1.2);
    ctx.lineTo(x + r * 0.26, y - r * 1.2); ctx.quadraticCurveTo(x + r * 0.22, y - r * 0.8, x + r * 0.32, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(x + r * 0.05, y - r * 1.2, r * 0.2, r * 1.2);
    const cy = y - r * 1.2, cw = r * 1.15 * breathe, ch = r * 0.8 * breathe;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(x, cy + 2, cw, ch * 0.28, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, cy, cw, ch, 0, Math.PI, 0); ctx.quadraticCurveTo(x, cy + ch * 0.35, x - cw, cy); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.ellipse(x - cw * 0.3, cy - ch * 0.55, cw * 0.4, ch * 0.22, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,248,230,0.85)';
    for (let k = 0; k < 6; k++) {
      const a = Math.PI + (k + 0.5) / 6 * Math.PI, rr = 0.35 + farHash(p.x + k, p.y) * 0.45;
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * cw * rr, cy + Math.sin(a) * ch * rr * 0.9, 1.5 + farHash(p.x, p.y + k) * 2.2, 0, Math.PI * 2); ctx.fill();
    }
    if (p.hits) {
      ctx.strokeStyle = 'rgba(20,0,20,0.7)'; ctx.lineWidth = 1.8; ctx.beginPath();
      ctx.moveTo(x - cw * 0.6, cy - ch * 0.5); ctx.lineTo(x - 2, cy - ch * 0.2); ctx.lineTo(x + 3, cy - ch * 0.6); ctx.lineTo(x + cw * 0.5, cy - ch * 0.1); ctx.stroke();
    }
  }
  // The tuft on an ordinary floor: three small pale caps, meant to be walked past. The one thing about
  // them that is not quite floor is a slow shimmer, and only up close.
  drawShroomTuft(p) {
    const g = this.game && this.game.goat;
    const near = g ? clamp(1 - Math.hypot(g.x - p.x, g.y - p.y) / (4 * TILE), 0, 1) : 0;
    const pulse = 0.5 + 0.5 * Math.sin(this.t * 1.3 + p.x);
    this.shroom(p.x - 5, p.y + 4, 3.4, '#cdb8a0', pulse, near > 0.2);
    this.shroom(p.x + 4, p.y + 6, 2.6, '#c4a98f', pulse, false);
    this.shroom(p.x + 1, p.y - 2, 2.2, '#d6c3ad', pulse, false);
    if (near > 0) {
      const ctx = this.ctx;
      ctx.fillStyle = `rgba(191,230,255,${0.25 * near * pulse})`;
      for (let k = 0; k < 3; k++) { const a = this.t * 0.8 + k * 2.1; ctx.beginPath(); ctx.arc(p.x + Math.cos(a) * 9, p.y - 6 + Math.sin(a * 1.3) * 5, 1.2, 0, Math.PI * 2); ctx.fill(); }
    }
    // The same ring milk draws while it is being grazed, in the trip's own violet.
    if (p.graze > 0) {
      const ctx = this.ctx, frac = clamp(p.graze / TUNING.shroom.eatTime, 0, 1);
      ctx.strokeStyle = PALETTE.witchHi; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(p.x, p.y + 2, 13, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); ctx.stroke();
    }
  }
  drawCaveTiles(game, cam) {
    if (game.world.caveF) { this.drawCaveMid(game, cam); return; }
    const ctx = this.ctx, wd = game.world, def = game.level.def, R = wd.round, W = wd.W;
    const { x0, y0, x1, y1 } = this.visibleTiles(cam);
    const secret = new Set();
    for (const p of game.props) if (p.kind === 'secret' && !p.broken) secret.add(Math.floor(p.y / TILE) * W + Math.floor(p.x / TILE));
    const solid = (tx, ty) => wd.isSolid(tx, ty) || secret.has(ty * W + tx);
    const LIFT = 7;
    const base = new Path2D(), top = new Path2D(), edge = [];
    // A rectangle with each corner rounded by its own radius, clockwise.
    const rrect = (path, x, y, w, h, nw, ne, se, sw) => {
      path.moveTo(x + nw, y);
      path.lineTo(x + w - ne, y); if (ne) path.arc(x + w - ne, y + ne, ne, -Math.PI / 2, 0);
      path.lineTo(x + w, y + h - se); if (se) path.arc(x + w - se, y + h - se, se, 0, Math.PI / 2);
      path.lineTo(x + sw, y + h); if (sw) path.arc(x + sw, y + h - sw, sw, Math.PI / 2, Math.PI);
      path.lineTo(x, y + nw); if (nw) path.arc(x + nw, y + nw, nw, Math.PI, Math.PI * 1.5);
      path.closePath();
    };
    // The fillet in one corner of a floor tile: the corner square less the quarter circle.
    const fillet = (path, cx, cy, sx, sy, dy) => {
      const ox = cx + sx * R, oy = cy + sy * R + dy;       // the circle's centre
      path.moveTo(cx, cy + dy);
      path.lineTo(ox, cy + dy);
      const a0 = sy > 0 ? -Math.PI / 2 : Math.PI / 2, a1 = sx > 0 ? Math.PI : 0;
      path.arc(ox, oy, R, a0, a1, (sx < 0) === (sy < 0));
      path.closePath();
    };
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const px = tx * TILE, py = ty * TILE;
        if (!solid(tx, ty)) {
          const t = wd.tileAt(tx, ty);
          this.drawFloorTile(game, tx, ty, t);
          // the grass lies on the floor as a dark mat under the blades that stand over everything
          if (wd.grass[ty * W + tx]) {
            const h = farHash(tx, ty);
            ctx.fillStyle = def.grassDark || '#223618';
            ctx.beginPath(); ctx.ellipse(px + 16, py + 17, 17 + h * 3, 15, h * 2, 0, Math.PI * 2); ctx.fill();
          } else if (t === T.FLOOR && PIXEL_ENV.ready) PIXEL_ENV.litter(ctx, 'cave', tx, ty);
          for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
            if (!solid(tx + sx, ty) || !solid(tx, ty + sy)) continue;
            const cx = sx < 0 ? px : px + TILE, cy = sy < 0 ? py : py + TILE;
            fillet(base, cx, cy, -sx, -sy, 0);
            fillet(top, cx, cy, -sx, -sy, sy < 0 ? -LIFT : 0);
          }
          continue;
        }
        const oN = !solid(tx, ty - 1), oS = !solid(tx, ty + 1), oW = !solid(tx - 1, ty), oE = !solid(tx + 1, ty);
        if (!(oN || oS || oW || oE || !solid(tx - 1, ty - 1) || !solid(tx + 1, ty - 1) || !solid(tx - 1, ty + 1) || !solid(tx + 1, ty + 1))) continue;
        const nw = oN && oW ? R : 0, ne = oN && oE ? R : 0, se = oS && oE ? R : 0, sw = oS && oW ? R : 0;
        rrect(base, px, py, TILE, TILE, nw, ne, se, sw); edge.push(tx, ty);
        const lift = oS ? LIFT : 0;
        rrect(top, px, py, TILE, TILE - lift, nw, ne, Math.min(se, TILE - lift - ne), Math.min(sw, TILE - lift - nw));
      }
    }
    ctx.save(); ctx.translate(0, 6); ctx.fillStyle = 'rgba(0,0,0,0.34)'; ctx.fill(base); ctx.restore();
    ctx.fillStyle = def.wall; ctx.fill(base);
    ctx.fillStyle = def.wallTop; ctx.fill(top);
    // Grain on the top of the rock: a few flecks a tile off a hash of the tile, so it holds still.
    ctx.save(); ctx.clip(top);
    for (let j = 0; j < edge.length; j += 2) {
      const tx = edge[j], ty = edge[j + 1];
      for (let k = 0; k < 3; k++) {
        const h1 = farHash(tx * 3 + k, ty), h2 = farHash(tx, ty * 5 + k), h3 = farHash(tx + k * 11, ty - k);
        ctx.fillStyle = h3 < 0.5 ? 'rgba(0,0,0,0.13)' : 'rgba(255,240,210,0.07)';
        ctx.beginPath(); ctx.ellipse(tx * TILE + 4 + h1 * 24, ty * TILE + 4 + h2 * 22, 2 + h3 * 3, 1.4 + h3 * 2, h1 * 3, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
    this.drawCaveDecor(game, edge, solid, LIFT);
    this.flushGlows();
  }

  // Tall grass, over everything that stands in it. Each tile is a handful of blades rooted at fixed
  // spots off a hash, swaying, and parted by any body within a stride of them — laid right down under
  // the goat so he is never lost in it himself. What it covers of a man is the lower half of him.
  drawGrass(game, cam) {
    const wd = game.world; if (!game.level.grass || !game.level.grass.length) return;
    const ctx = this.ctx, def = game.level.def, W = wd.W, G = TUNING.grass;
    const { x0, y0, x1, y1 } = this.visibleTiles(cam);
    // Only the bodies on screen can part anything on screen: a late floor has eighty men in it, and
    // every tile of grass was filtering all of them.
    const bodies = [], bx0 = x0 * TILE - TILE, bx1 = (x1 + 1) * TILE + TILE, by0 = y0 * TILE - TILE, by1 = (y1 + 1) * TILE + TILE;
    const onView = (o) => o.x > bx0 && o.x < bx1 && o.y > by0 && o.y < by1;
    if (!game.goat.dead) bodies.push({ x: game.goat.x, y: game.goat.y, goat: true });
    for (const e of game.enemies) if (!e.dead && !e.ghosted && onView(e)) bodies.push({ x: e.x, y: e.y });
    const dark = def.grassColor || '#3d5a2a', hi = def.grassHi || '#6f8f45';
    // Every blade goes into one of two paths and each path is filled once. It was a fill a blade —
    // seven a tile, several hundred a frame on a cave floor — and that was the cave's slowness: each
    // fill is its own trip through the rasteriser, however small the blade.
    const pDark = new Path2D(), pHi = new Path2D();
    for (let ty = Math.max(0, y0); ty <= Math.min(wd.H - 1, y1); ty++) for (let tx = Math.max(0, x0); tx <= Math.min(W - 1, x1); tx++) {
      if (!wd.grass[ty * W + tx]) continue;
      const cx = (tx + 0.5) * TILE, cy = (ty + 0.5) * TILE;
      if (game.hidden(cx, cy)) continue;
      // Alight, a tile of grass burns down where it stands: the blades char from the root up and
      // shorten, and every one of them carries its own flame at the tip until there is nothing left.
      const fire = wd.fire[ty * W + tx];
      if (fire > 0) { this.drawBurningGrass(tx, ty, fire / G.burn, wd.fireKind[ty * W + tx] === 1); continue; }
      const near = bodies.filter((b) => Math.abs(b.x - cx) < TILE * 1.2 && Math.abs(b.y - cy) < TILE * 1.2);
      for (let k = 0; k < 7; k++) {
        const h1 = farHash(tx * 7 + k, ty * 3), h2 = farHash(tx - k * 5, ty * 7 + k);
        const bx = tx * TILE + 2 + h1 * 28, by = ty * TILE + 6 + h2 * 26;
        let len = 17 + farHash(tx + k, ty - k) * 9;
        let lean = Math.sin(this.t * G.sway + h1 * 6.3 + tx * 0.7) * 0.18 + (h2 - 0.5) * 0.3;
        for (const b of near) {
          const dx = bx - b.x, dy = by - b.y, d = Math.hypot(dx, dy);
          const reach = b.goat ? 22 : 16;
          if (d > reach) continue;
          const f = 1 - d / reach;
          lean += Math.sign(dx || 1) * f * 0.9;
          len *= 1 - f * (b.goat ? 0.6 : 0.3);
        }
        const tipX = bx + Math.sin(lean) * len, tipY = by - Math.cos(lean) * len;
        const P = k % 3 === 0 ? pHi : pDark;
        P.moveTo(bx - 3, by); P.quadraticCurveTo(bx + (tipX - bx) * 0.4 - 1, by - len * 0.5, tipX, tipY);
        P.quadraticCurveTo(bx + (tipX - bx) * 0.4 + 1, by - len * 0.5, bx + 3, by); P.closePath();
      }
    }
    ctx.fillStyle = dark; ctx.fill(pDark);
    ctx.fillStyle = hi; ctx.fill(pHi);
  }

  drawBurningGrass(tx, ty, left, witch) {
    const ctx = this.ctx, burnt = 1 - clamp(left, 0, 1);
    for (let k = 0; k < 7; k++) {
      const h1 = farHash(tx * 7 + k, ty * 3), h2 = farHash(tx - k * 5, ty * 7 + k);
      const bx = tx * TILE + 2 + h1 * 28, by = ty * TILE + 6 + h2 * 26;
      const len = (17 + farHash(tx + k, ty - k) * 9) * (1 - burnt * 0.85);
      if (len < 2) continue;
      const lean = Math.sin(this.t * 7 + h1 * 9) * 0.22 + (h2 - 0.5) * 0.3;
      const tipX = bx + Math.sin(lean) * len, tipY = by - Math.cos(lean) * len;
      ctx.fillStyle = burnt > 0.45 || k % 2 ? '#1e1712' : '#4a3a1c';
      ctx.beginPath(); ctx.moveTo(bx - 2.5, by); ctx.quadraticCurveTo(bx + (tipX - bx) * 0.4, by - len * 0.5, tipX, tipY);
      ctx.quadraticCurveTo(bx + (tipX - bx) * 0.4 + 1, by - len * 0.5, bx + 2.5, by); ctx.closePath(); ctx.fill();
      // The flame on each blade is the same baked pixel flame as a burning floor, smaller, and it
      // shrinks a size at a time as the blade burns down.
      ctx.save(); ctx.scale(1, 1 / TILT);
      this.flame(tipX, (tipY + 2) * TILT, Math.round((5 + h1 * 3) * (1 - burnt * 0.5)), tx * 5 + k * 3 + ty, witch);
      ctx.restore();
    }
  }

  // A boulder: a lump of rock off a hash of where it stands, so every one is its own shape and holds
  // it. A crack across it after the first blow, the way the secret wall says it has been hit.
  drawRock(p) {
    const ctx = this.ctx, def = this.game && this.game.level ? this.game.level.def : {};
    const wob = p.wobble > 0 ? Math.sin(this.t * 60) * 2 * p.wobble / 0.3 : 0;
    const x = p.x + wob, y = p.y, r = p.r;
    this.shadow(x, y + 4, r * 1.15, r * 0.55);
    if (PIXEL_ENV.ready) {
      PIXEL_ENV.draw(ctx, 'boulder', x, y + r * 0.7, r * 2.5);
      if (p.hits) {
        ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 1.8; ctx.beginPath();
        ctx.moveTo(x - r * 0.6, y - 12); ctx.lineTo(x - 2, y - 5); ctx.lineTo(x + 3, y - 9); ctx.lineTo(x + r * 0.7, y); ctx.stroke();
      }
      return;
    }
    const pts = [];
    for (let k = 0; k < 9; k++) {
      const a = k / 9 * Math.PI * 2, f = 0.84 + farHash(p.x + k, p.y - k) * 0.24;
      pts.push([x + Math.cos(a) * r * f, y - 4 + Math.sin(a) * r * f * 0.92]);
    }
    const shape = () => { ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath(); };
    shape(); ctx.fillStyle = def.wall || '#3b3731'; ctx.fill();
    ctx.save(); shape(); ctx.clip();
    ctx.fillStyle = def.wallTop || '#5f584b'; ctx.beginPath(); ctx.ellipse(x - 2, y - 8, r * 0.95, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,210,0.13)'; ctx.beginPath(); ctx.ellipse(x - 5, y - 12, r * 0.45, r * 0.3, -0.4, 0, Math.PI * 2); ctx.fill();
    if (p.hits) {
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1.6; ctx.beginPath();
      ctx.moveTo(x - r * 0.6, y - 12); ctx.lineTo(x - 2, y - 5); ctx.lineTo(x + 3, y - 9); ctx.lineTo(x + r * 0.7, y); ctx.stroke();
    }
    ctx.restore();
    shape(); ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 1.4; ctx.stroke();
  }

  // One tile of a flight of stairs, three tiles long. `k` is the tile's place in the flight, left to
  // right. The way out climbs to the right into light; the way in comes up from the dark on the left.
  // Whether tile row `ty` is THE FORK's dark flight.
  static forkRow(L, ty) { const f = L && L.forkTile; return !!f && ty >= f.y0 && ty <= f.y0 + 1; }
  // `cold` is THE FORK's second flight (`level.forkTile`): the same steps, going up into black
  // instead of into the light, with a cold edge on each tread and nothing warm at the top.
  drawStairs(px, py, k, up, def, cold) {
    const ctx = this.ctx, steps = 4, sw = TILE / steps;
    ctx.fillStyle = def.wall; ctx.fillRect(px, py, TILE, TILE);
    for (let i = 0; i < steps; i++) {
      const n = k * steps + i, f = n / (3 * steps - 1), x = px + i * sw;
      if (up && cold) {
        ctx.fillStyle = def.wallTop; ctx.fillRect(x, py, sw, TILE);
        ctx.fillStyle = `rgba(5,4,10,${0.3 + 0.68 * f})`; ctx.fillRect(x, py, sw, TILE);
        ctx.fillStyle = `rgba(150,158,210,${0.26 * (1 - f)})`; ctx.fillRect(x + 2, py, 1, TILE);
      } else if (up) {
        ctx.fillStyle = def.wallTop; ctx.fillRect(x, py, sw, TILE);
        ctx.fillStyle = `rgba(239,230,208,${0.1 + 0.68 * f * f})`; ctx.fillRect(x, py, sw, TILE);
      } else {
        ctx.fillStyle = `rgba(239,230,208,${0.04 + 0.34 * f})`; ctx.fillRect(x, py, sw, TILE);
        ctx.fillStyle = `rgba(6,4,6,${0.85 * (1 - f) * (1 - f)})`; ctx.fillRect(x, py, sw, TILE);
      }
      // the riser: each step throws a shadow down onto the one below it
      ctx.fillStyle = up ? 'rgba(0,0,0,0.42)' : 'rgba(0,0,0,0.5)'; ctx.fillRect(x, py, 2, TILE);
    }
    if (up && k === 2 && !cold) {
      const pulse = 0.55 + 0.25 * Math.sin(this.t * 3.4);
      ctx.fillStyle = `rgba(255,224,138,${pulse * 0.45})`; ctx.fillRect(px + TILE * 0.5, py - 8, TILE * 0.7, TILE + 16);
    }
  }

  drawDecals(game, cam) {
    const ctx = this.ctx, wd = game.world, v = this.view(cam);
    if (this.altar && this.painted.ready) this.painted.drawRitual(this,game);
    else if (this.altar && wd.ritualArt) {
      const a = wd.ritualArt;
      if (Math.abs(cam.x - (a.x + a.canvas.width / 2)) < (v.w + a.canvas.width) / 2
        && Math.abs(cam.y - (a.y + a.canvas.height / 2)) < (v.h + a.canvas.height) / 2) ctx.drawImage(a.canvas, a.x, a.y);
    }
    const sx = cam.x - v.w / 2, sy = cam.y - v.h / 2;
    const cx = clamp(sx, 0, wd.W * TILE), cy = clamp(sy, 0, wd.H * TILE);
    const cw = clamp(sx + v.w, 0, wd.W * TILE) - cx, ch = clamp(sy + v.h, 0, wd.H * TILE) - cy;
    if (cw <= 0 || ch <= 0) return;
    ctx.drawImage(wd.decal, cx * DECAL_SCALE, cy * DECAL_SCALE, cw * DECAL_SCALE, ch * DECAL_SCALE, cx, cy, cw, ch);
    ctx.save();ctx.imageSmoothingEnabled=true;
    const size=TUNING.effects.stainTile;
    for(const p of wd.stains.values())if(p.x+size>=cx&&p.x<=cx+cw&&p.y+size>=cy&&p.y<=cy+ch)ctx.drawImage(p.canvas,p.x,p.y);
    ctx.restore();
  }

  // The drops. Drawn after the decals so that no amount of blood ever ends up lying across a hole,
  // and with a lit lip on the side you are looking at: a hole the eye reads as a hole is the whole
  // of the level's safety rail.
  drawPits(game, cam) {
    const ctx = this.ctx, wd = game.world, def = game.level.def;
    const { x0, y0, x1, y1 } = this.visibleTiles(cam);
    // A window is a slot the generator cut through a wall and wrote down: what is behind it is
    // outside. Everything else is a hole in the floor, and what is under it is the compound. It used
    // to be guessed from the tiles around it, which never once answered yes because the generator
    // was not making any windows at all.
    const marked = game.level.windows, holes = [], windows = [];
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (wd.tileAt(tx, ty) !== T.PIT) continue;
        (marked && marked.has(ty * wd.W + tx) ? windows : holes).push([tx, ty]);
      }
    }
    if (!holes.length && !windows.length) return;
    // The ground first, through every hole of a kind at once: one clip and one pass rather than one
    // of each per tile. A flat black square was the whole of this, and a flat black square is what a
    // pillar looks like from above — which is exactly the two things people were mixing up.
    this.throughHoles(holes, cam, false);
    this.throughHoles(windows, cam, true);
    for (const [tx, ty] of holes) {
      const px = tx * TILE, py = ty * TILE;
      // the boards break off over the edge, and the near lip catches the light off the floor
      if (wd.tileAt(tx, ty - 1) !== T.PIT) {
        ctx.fillStyle = def.wallTop; ctx.fillRect(px, py, TILE, 5);
        this.rimShade(px, py + 5, TILE, 13, 'v', 1);
      }
      if (wd.tileAt(tx, ty + 1) !== T.PIT) {
        ctx.fillStyle = 'rgba(239,230,208,0.11)'; ctx.fillRect(px, py + TILE - 4, TILE, 4);
        this.rimShade(px, py + TILE - 13, TILE, 9, 'v', -1);
      }
      if (wd.tileAt(tx - 1, ty) !== T.PIT) this.rimShade(px, py, 11, TILE, 'h', 1);
      if (wd.tileAt(tx + 1, ty) !== T.PIT) this.rimShade(px + TILE - 11, py, 11, TILE, 'h', -1);
    }
    for (const [tx, ty] of windows) {
      const px = tx * TILE, py = ty * TILE;
      // the stone reveal above and the sill below: a window is a thing cut through something thick
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(px, py, TILE, 5);
      ctx.fillStyle = 'rgba(239,230,208,0.18)'; ctx.fillRect(px, py + TILE - 4, TILE, 4);
    }
  }

  // What is behind a set of holes, painted once through all of them. `k` in `DEPTH` is how much of
  // the camera's movement the far layer takes: everything here is laid out in a space that is then
  // shifted by the part of the camera the far layer does NOT follow, so it lags behind the lip.
  throughHoles(cells, cam, night) {
    if (!cells.length) return;
    const ctx = this.ctx;
    let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
    ctx.save(); ctx.beginPath();
    for (const [tx, ty] of cells) {
      const px = tx * TILE, py = ty * TILE;
      ctx.rect(px, py, TILE, TILE);
      if (px < bx0) bx0 = px; if (py < by0) by0 = py;
      if (px + TILE > bx1) bx1 = px + TILE; if (py + TILE > by1) by1 = py + TILE;
    }
    ctx.clip();
    ctx.fillStyle = night ? '#0b1224' : '#0a0910';
    ctx.fillRect(bx0, by0, bx1 - bx0, by1 - by0);
    const k = night ? DEPTH.night : DEPTH.below;
    const ox = cam.x * (1 - k), oy = cam.y * (1 - k), cell = night ? 32 : 72;
    const i0 = Math.floor((bx0 - ox) / cell) - 1, i1 = Math.ceil((bx1 - ox) / cell);
    const j0 = Math.floor((by0 - oy) / cell) - 1, j1 = Math.ceil((by1 - oy) / cell);
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const h = farHash(i, j), h2 = farHash(i + 91, j - 17), h3 = farHash(i - 43, j + 7);
        const x = ox + i * cell + h * cell * 0.6, y = oy + j * cell + h2 * cell * 0.6;
        if (night) {
          // stars, and now and then something burning a very long way off
          if (h3 > 0.4) { ctx.fillStyle = `rgba(206,222,255,${0.16 + h * 0.42})`; ctx.fillRect(x, y, 1.6, 1.6); }
          if (h3 < 0.035) {
            const gl = ctx.createRadialGradient(x, y, 0, x, y, 26);
            gl.addColorStop(0, 'rgba(242,162,51,0.30)'); gl.addColorStop(1, 'rgba(242,162,51,0)');
            ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, 26, 0, Math.PI * 2); ctx.fill();
          }
        } else {
          // The hall a long way down: roof ridges, the slabs between them, and the odd torch still
          // burning on one. Long and thin with a lit upper edge, because a roof seen from directly
          // above is a bar of light with a bar of shadow under it and almost nothing else.
          if (h > 0.34) {
            const rw = cell * (0.45 + h2 * 0.55), rh = cell * (0.16 + h3 * 0.2);
            ctx.fillStyle = `rgba(96,84,74,${0.3 + h2 * 0.3})`; ctx.fillRect(x, y, rw, rh);
            ctx.fillStyle = `rgba(168,150,128,${0.16 + h3 * 0.2})`; ctx.fillRect(x, y, rw, 2.4);
            ctx.fillStyle = 'rgba(4,3,6,0.5)'; ctx.fillRect(x, y + rh, rw, 3);
          }
          // rubble on the ground between them, so it is not two shapes and a void
          if (h2 > 0.5) { ctx.fillStyle = `rgba(70,62,56,${0.2 + h * 0.2})`; ctx.fillRect(x + cell * 0.1, y + cell * 0.62, 3 + h * 5, 2.4); }
          if (h3 > 0.8) {
            const gl = ctx.createRadialGradient(x, y, 0, x, y, 40);
            gl.addColorStop(0, 'rgba(242,162,51,0.42)'); gl.addColorStop(1, 'rgba(242,162,51,0)');
            ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, 40, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255,224,138,0.65)'; ctx.fillRect(x - 1.2, y - 1.2, 2.8, 2.8);
          }
        }
      }
    }
    // The air between here and there. Without it the far layer reads as a picture stuck to the floor
    // rather than as something a long way under it.
    ctx.fillStyle = night ? 'rgba(14,22,38,0.3)' : 'rgba(10,8,12,0.26)';
    ctx.fillRect(bx0, by0, bx1 - bx0, by1 - by0);
    ctx.restore();
  }

  // The shadow the lip of a hole throws down its own inside wall. `dir` is which way it fades: 1
  // away from the near edge, -1 toward it. A hard band read as a border drawn round a black square,
  // which is the thing that made a hole look like a tile rather than an absence of one.
  rimShade(x, y, w, h, axis, dir) {
    const ctx = this.ctx;
    const g = axis === 'v' ? ctx.createLinearGradient(0, dir > 0 ? y : y + h, 0, dir > 0 ? y + h : y)
      : ctx.createLinearGradient(dir > 0 ? x : x + w, 0, dir > 0 ? x + w : x, 0);
    g.addColorStop(0, 'rgba(0,0,0,0.72)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  }

  // Somebody going down. He turns over as he goes, gets smaller, and the dark takes him. It is the
  // one death in the game with nothing left on the floor afterwards, so the fall has to be the whole
  // of it — before this he simply stopped existing, which reads as a bug and not as a drop.
  drawFallers(game) {
    const ctx = this.ctx;
    for (const f of game.fallers) {
      const k = clamp(f.t / f.life, 0, 1), sc = 1 - 0.8 * k;
      ctx.save();
      ctx.globalAlpha = 1 - k * k;
      ctx.translate(f.x + f.dx * k, f.y + f.dy * k + k * 14);
      ctx.scale(1, 1 / TILT); ctx.rotate(f.spin * k); ctx.scale(sc, sc);
      const key = PIXEL_ART.ready && this.painted.characterKey(f.e);
      if (key) this.painted.character(this, f.e, key, 42);
      else if (f.e.kind === 'dog') this.drawHound(f.e); else this.drawCultist(f.e, f.e.r);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  // Words painted on the floor instead of a tutorial box, the way Ape Out does it.
  drawHints(game) {
    const ctx = this.ctx, lv = game.level;
    ctx.save(); ctx.scale(1, 1 / TILT); ctx.textAlign = 'center';
    // Never wider than the view either: a phone held upright sees about fourteen tiles, and a line
    // fitted to a wider room ran off both sides of it and could never be read whole.
    const viewW = this.view(game.cam).w - 2 * TILE;
    if (lv.hints) {
      for (const hn of lv.hints) {
        if (Math.abs(hn.x - game.cam.x) > 1100 || Math.abs(hn.y - game.cam.y) > 800) continue;
        // A sentence long enough to run off both ends of the room is broken over two lines and then
        // fitted to what is left of the floor. It used to be painted at one size whatever it said,
        // and the longest of them was unreadable at both ends.
        const lines = this.wrapFloor(hn.text), wide = Math.min(viewW, (hn.w || 14 * TILE) - 3.2 * TILE);
        const size = this.fitFloorText(lines, wide, 26), lh = size * 1.34;
        // The key line under a hint ("E, ROLL") went on 25 Sep 2026: the sentence already says what to
        // do, and a button named under it read as a second, unrelated instruction.
        const key = null;
        const block = (lines.length - 1) * lh + (key ? lh * 0.95 : 0);
        let y = hn.y - block / 2;
        ctx.fillStyle = 'rgba(239,230,208,0.15)';
        for (const l of lines) { ctx.fillText(l, hn.x, y * TILT); y += lh; }
        // The button the line is about, under it and warmer, so a hint about a verb says which verb.
        if (key) {
          this.fitFloorText([key], wide, size * 0.66);
          ctx.fillStyle = 'rgba(255,224,138,0.17)';
          ctx.fillText(key, hn.x, (y - lh * 0.12) * TILT);
        }
      }
    }
    if (lv.controls) {
      const sets = game.touch.active ? CONTROL_LINES.touch : CONTROL_LINES.key;
      ctx.fillStyle = 'rgba(239,230,208,0.19)';
      for (const c of lv.controls) {
        // Block 0 (WASD) waits on the cage: while it is shut the only line worth reading is the
        // headbutt prompt below, and painting both at once said two things at the one moment the
        // player is meant to be trying just the one.
        if (c.part === 0 && lv.cagePrompt && !game.cageOpen) continue;
        if (Math.abs(c.x - game.cam.x) > 1400) continue;
        const lines = sets[c.part] || [];
        const size = this.fitFloorText(lines, Math.min(viewW, (c.w || 14 * TILE) - 2.6 * TILE), 26);
        const lh = size * 1.4;
        if (c.fy === undefined) c.fy = this.clearFloorRow(game, c, lines, lh);
        const top = c.fy - (lines.length - 1) * lh / 2;
        lines.forEach((l, i) => ctx.fillText(l, c.x, (top + i * lh) * TILT));
      }
    }
    // The mouse's room says on its floor which button takes one of hers, for as long as the offer
    // stands — a stool with a thing on it reads as a display, not as a choice you are being handed.
    for (const m of game.props) {
      if (m.kind !== 'mouse' || m.broken) continue;
      const room = lv.rooms[m.shopId]; if (!room || !room.seen) continue;
      if (!game.props.some((q) => q.kind === 'ware' && !q.broken && q.shopId === m.shopId && !q.locked && !q.chosen)) continue;
      const cx = (room.x + room.w / 2) * TILE, cy = (room.y + room.h / 2) * TILE;
      if (Math.abs(cx - game.cam.x) > 1400) continue;
      const label = game.touch.active ? 'GRAB - CHOOSE THE ARTIFACT' : 'RIGHT BUTTON - CHOOSE THE ARTIFACT';
      this.fitFloorText([label], room.w * TILE - 2.6 * TILE, 24);
      ctx.fillStyle = 'rgba(255,224,138,0.2)';
      ctx.fillText(label, cx, cy * TILT);
    }
    // THE FORK: the floor in front of each flight says where it goes — the floor it climbs to, and
    // under it what that floor is — so the one choice of road in a run is read, not found out on
    // the card.
    const fk = lv.forkTile, last = lv.rooms[lv.rooms.length - 1];
    if (fk && last && last.seen && Math.abs(fk.x0 * TILE - game.cam.x) < 1400) {
      // Mushrooms eaten on this floor make the lit flight THE TRIP, and it says so.
      const next = levelIndexOf(lv.def) + 1, tripped = game.tripAt === next && next === game.levelIndex + 1;
      const x = (fk.x0 - 1.5) * TILE, wide = Math.min(8, last.w - 3) * TILE, litName = tripped ? 'THE TRIP' : LEVELS[next].name;
      ctx.textAlign = 'right';
      const size = this.fitFloorText([litName], wide, 22);
      ctx.fillStyle = 'rgba(255,224,138,0.22)';
      ctx.fillText(litName, x, (lv.exitTile.y0 + 1.2) * TILE * TILT);
      ctx.fillStyle = 'rgba(170,178,230,0.32)';
      ctx.fillText(DARK_LEVEL.name, x, (fk.y0 + 1.2) * TILE * TILT);
      ctx.font = `700 ${Math.round(size * 0.62)}px ${FONT_SC}`; ctx.fillStyle = 'rgba(255,224,138,0.16)';
      ctx.fillText(tripped ? 'EVERYTHING THE OTHER WAY ROUND' : 'THE LAMPS ARE LIT', x, (lv.exitTile.y0 + 1.2) * TILE * TILT + size * 0.95);
      ctx.fillStyle = 'rgba(170,178,230,0.24)';
      ctx.fillText('FEWER OF THEM. A LAMP TO A ROOM.', x, (fk.y0 + 1.2) * TILE * TILT + size * 0.95);
      ctx.textAlign = 'center';
    }
    // The pen. After five seconds of standing in it, the floor says which button opens it.
    if (lv.cagePrompt && !game.cageOpen) {
      const C = TUNING.cagePrompt, a = clamp((game.timer - C.delay) / C.fade, 0, 1);
      if (a > 0) {
        const p = lv.cagePrompt, pulse = 0.3 + 0.12 * Math.sin(this.t * 3.2);
        const label = game.touch.active ? 'BUTT - HEADBUTT' : 'LEFT CLICK - HEADBUTT';
        this.fitFloorText([label], 15 * TILE, 27);
        ctx.fillStyle = `rgba(255,224,138,${a * pulse})`;
        ctx.fillText(label, p.x, p.y * TILT);
        ctx.font = `700 19px ${FONT_SC}`;
        ctx.fillStyle = `rgba(239,230,208,${a * (pulse - 0.08)})`;
        ctx.fillText('AGAIN. AND AGAIN.', p.x, (p.y + 30) * TILT);
      }
    }
    ctx.textAlign = 'left'; ctx.restore();
  }

  // One line of floor text becomes two if it is long, broken at the full stop it already has or, with
  // none, at the space nearest the middle. Shrinking to fit alone left the longest hints at a size
  // nobody reads while running.
  wrapFloor(text) {
    if (text.length <= 28) return [text];
    const stop = text.indexOf('. ');
    if (stop > 6 && stop < text.length - 8) return [text.slice(0, stop + 1), text.slice(stop + 2)];
    const mid = text.length / 2;
    let cut = -1;
    for (let i = 0; i < text.length; i++) {
      if (text[i] !== ' ') continue;
      if (cut < 0 || Math.abs(i - mid) < Math.abs(cut - mid)) cut = i;
    }
    return cut > 0 ? [text.slice(0, cut), text.slice(cut + 1)] : [text];
  }

  // Sets the font so the widest line fits the space it is painted on, and returns the size used.
  // Where a block of floor words goes: the room's middle unless furniture or stone stands on it.
  // A table dealt onto the middle row sat on E - ROLL and hid it (playtest, 24 Sep 2026), so the
  // block slides up or down by half tiles to the nearest band nothing stands in. Asked once, on
  // the first frame the block is drawn, with the font `fitFloorText` just set; a crate thrown onto
  // it later does not move the words.
  clearFloorRow(game, c, lines, lh) {
    const ctx = this.ctx, world = game.world;
    let tw = 0; for (const l of lines) tw = Math.max(tw, ctx.measureText(l).width);
    const half = tw / 2 + TILE * 0.3, bandH = (lines.length * lh) / 2 + TILE * 0.35;
    const cost = (y) => {
      let n = 0;
      for (const p of game.props) {
        if (p.broken || p.item && p.kind !== 'crate') continue;
        const r = p.kind === 'table' ? TILE : TILE * 0.5;
        if (Math.abs(p.x - c.x) < half + r && Math.abs(p.y - y) < bandH + r) n += 1;
      }
      for (let x = c.x - half; x <= c.x + half; x += TILE / 2)
        for (const yy of [y - bandH * 0.6, y, y + bandH * 0.6])
          if (world.isSolid(Math.floor(x / TILE), Math.floor(yy / TILE))) n += 2;
      return n;
    };
    let best = c.y, bestN = cost(c.y);
    for (let k = 1; k <= 6 && bestN > 0; k++) for (const y of [c.y - k * TILE / 2, c.y + k * TILE / 2]) {
      const n = cost(y); if (n < bestN) { best = y; bestN = n; }
    }
    return best;
  }

  fitFloorText(lines, maxW, size) {
    const ctx = this.ctx;
    ctx.font = `700 ${size}px ${FONT_SC}`;
    let longest = 0;
    for (const l of lines) longest = Math.max(longest, ctx.measureText(l).width);
    if (longest > maxW && longest > 0) {
      size = Math.max(11, size * maxW / longest);
      ctx.font = `700 ${size}px ${FONT_SC}`;
    }
    return size;
  }

  // The fire's next step, before it takes it: fuel beside a burning tile smoulders, a few ember
  // cells waking in it and rising as the neighbour's spread fills, so a hay line reads as a fuse
  // rather than as floor. Draw-only; the spread itself is `World.updateFire`.
  drawCatching(game, cam) {
    const ctx = this.ctx, wd = game.world, W = wd.W, C = TUNING.fire.catch, c = C.cell;
    const { x0, y0, x1, y1 } = this.visibleTiles(cam);
    const fuel = (n) => wd.fire[n] <= 0 && (wd.tiles[n] === T.HAY || wd.grass[n] === 1);
    const heat = new Map();
    for (let ty = Math.max(1, y0 - 1); ty <= Math.min(wd.H - 2, y1 + 1); ty++) {
      for (let tx = Math.max(1, x0 - 1); tx <= Math.min(W - 2, x1 + 1); tx++) {
        const i = ty * W + tx; if (wd.fire[i] <= 0) continue;
        const grass = wd.grass[i] === 1; if (!grass && wd.tiles[i] !== T.HAY) continue;
        const p = clamp(wd.spread[i] / (grass ? TUNING.grass.spread : TUNING.fire.spread), 0, 1);
        for (const n of [i + 1, i - 1, i + W, i - W]) if (fuel(n) && !(heat.get(n) >= p)) heat.set(n, p);
      }
    }
    if (!heat.size) return;
    ctx.save(); ctx.scale(1, 1 / TILT);
    for (const [n, p] of heat) {
      const tx = n % W, ty = (n / W) | 0, h = Math.imul(tx, 73856093) ^ Math.imul(ty, 19349663);
      // The foot of the bale going red, cell by cell, each on its own slow pulse.
      const fy = Math.round(((ty + 1) * TILE - c * 2) * TILT / c) * c;
      for (let x = tx * TILE + c; x < (tx + 1) * TILE - c; x += c) {
        const q = 0.5 + 0.5 * Math.sin(this.t * 5 + ((Math.imul(h, x) >>> 5) % 628) / 100);
        // Dark, not orange: fire colours vanish on yellow straw, char does not.
        ctx.globalAlpha = C.base * p * (0.5 + 0.5 * q);
        ctx.fillStyle = q > 0.75 ? PALETTE.altar.ember : PALETTE.altar.coal;
        ctx.fillRect(Math.round(x / c) * c, fy - (q > 0.6 ? c : 0), c, c);
      }
      for (let k = 0; k < C.embers; k++) {
        // More of them wake the nearer it is: the first at once, the last just before it goes.
        if (p < k / C.embers * 0.85) break;
        const hk = (Math.imul(h + k, 2654435761) >>> 0);
        const ph = (this.t * C.flicker + (hk % 97) / 97) % 1;
        const ex = tx * TILE + 4 + (hk % (TILE - 8)), ey = (ty * TILE + 8 + ((hk >>> 9) % (TILE - 12))) * TILT - ph * C.rise;
        ctx.globalAlpha = (1 - ph) * (C.glow + (1 - C.glow) * p);
        ctx.fillStyle = ph < 0.5 ? PALETTE.fireHi : PALETTE.fire;
        ctx.fillRect(Math.round(ex / c) * c, Math.round(ey / c) * c, c, c);
      }
    }
    ctx.globalAlpha = 1; ctx.restore();
  }

  drawFire(game, cam) {
    const ctx = this.ctx, wd = game.world;
    const { x0, y0, x1, y1 } = this.visibleTiles(cam);
    for (let ty = Math.max(0, y0); ty <= Math.min(wd.H - 1, y1); ty++) {
      for (let tx = Math.max(0, x0); tx <= Math.min(wd.W - 1, x1); tx++) {
        const i = ty * wd.W + tx, f = wd.fire[i]; if (f <= 0) continue;
        ctx.save(); ctx.scale(1, 1 / TILT);
        this.flame(tx * TILE + TILE / 2, (ty * TILE + TILE / 2) * TILT, 14 + ((tx * 7 + ty * 3) % 5), tx * 3 + ty, wd.fireKind[i] === 1);
        ctx.restore();
      }
    }
  }

  // Poison on the floor: a sour green film per tile with a slow bubble in it, fading as it dries.
  // Walked from the world's own set of poisoned tiles rather than the whole grid.
  drawPoison(game, cam) {
    const ctx = this.ctx, wd = game.world; if (!wd.poisonOn.size) return;
    const { x0, y0, x1, y1 } = this.visibleTiles(cam), full = TUNING.status.poison.pool;
    for (const i of wd.poisonOn) {
      const tx = i % wd.W, ty = (i / wd.W) | 0;
      if (tx < x0 || tx > x1 || ty < y0 || ty > y1) continue;
      const a = clamp(wd.poison[i] / Math.min(1.2, full), 0, 1), x = tx * TILE, y = ty * TILE;
      ctx.globalAlpha = 0.42 * a; ctx.fillStyle = PALETTE.venomDark; ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
      ctx.globalAlpha = 0.5 * a; ctx.fillStyle = PALETTE.venom;
      ctx.beginPath(); ctx.ellipse(x + TILE / 2, y + TILE / 2, TILE * 0.44, TILE * 0.36, 0, 0, Math.PI * 2); ctx.fill();
      const ph = (this.t * 0.9 + (tx * 7 + ty * 13) * 0.137) % 1;
      ctx.globalAlpha = a * (1 - ph) * 0.8; ctx.strokeStyle = PALETTE.venomHi; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(x + 8 + (tx * 11 + ty * 5) % 16, y + 8 + (tx * 3 + ty * 17) % 16, 1.5 + ph * 3.5, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  // VENOM SPIT in the air.
  drawGlob(b) {
    const ctx = this.ctx, wob = Math.sin(this.t * 30) * 1.2;
    ctx.save(); ctx.scale(1, 1 / TILT);
    const y = b.y * TILT;
    ctx.fillStyle = PALETTE.venomDark; ctx.beginPath(); ctx.arc(b.x, y, 7.5 + wob, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PALETTE.venom; ctx.beginPath(); ctx.arc(b.x, y, 6 + wob, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PALETTE.venomHi; ctx.beginPath(); ctx.arc(b.x - 2, y - 2.5, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // A carried thing is drawn in his teeth rather than at the hold point (`grab.holdDist` out along
  // his aim, which swung round him on its own circle while the sprite turned in eighths): at the
  // mouth of the facing the frame is drawn at, a little ahead of the muzzle, turned with the head,
  // and behind him on the three views of his back. Only the picture moves; x, y and facing go back.
  carryBehind(g) { const d = (Math.round(g.facing / (Math.PI / 4)) + 14) % 8; return d >= 3 && d <= 5; }
  drawCarried(g, h) {
    const C = TUNING.goat.carry, d = (Math.round(g.facing / (Math.PI / 4)) + 14) % 8, fa = (d + 2) * Math.PI / 4;
    const F = PIXEL_FACE[d], m = F.mouth || F.nose[0], lead = C.lead + h.r * C.reach;
    const x = h.x, y = h.y, f = h.facing;
    h.x = g.x + m[0] + Math.cos(fa) * lead;
    h.y = g.y + m[1] / TILT + Math.sin(fa) * lead + (C.lift[h.kind] || 0);
    h.facing = fa;
    try { this.drawProp(h); this.drawHoldCharge(this.game); } finally { h.x = x; h.y = y; h.facing = f; }
  }
  // VENOM JAW / FIREBRAND: a ring closing round whatever is in his mouth, and once it is shut the
  // thing pulses, green for poison and fire-yellow for fire. The two seconds have to be seen.
  drawHoldCharge(game) {
    const g = game.goat, h = g.holding, p = Status.holdCharge(game, g); if (!h || p <= 0) return;
    const ctx = this.ctx, col = game.mods.brandHold ? PALETTE.fireHi : PALETTE.venomHi, r = (h.r || 12) + 7;
    ctx.save(); ctx.translate(h.x, h.y);
    ctx.lineWidth = 2.4; ctx.strokeStyle = 'rgba(13,10,12,0.5)';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = col; ctx.globalAlpha = p >= 1 ? 0.6 + 0.4 * Math.sin(this.t * 18) : 0.85;
    ctx.beginPath(); ctx.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p); ctx.stroke();
    if (p >= 1) { ctx.globalAlpha = 0.18 + 0.12 * Math.sin(this.t * 18); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
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
    CombatFX.flame(this,x,y,size,seed,witch);
  }

  // The fissure in a wall that gives. It was one four-point zigzag drawn straight down the middle of
  // the tile, which reads as a bolt of lightning painted on the stonework rather than as damage: a
  // crack is a hairline that wanders, forks, and ends where it runs out of energy. Drawn from the
  // tile's own position so it is the same crack every frame, dark with a chipped highlight under it,
  // and the blow count widens it and adds a fork — `hits` is what the player is reading.
  wallCrack(x, y, hits) {
    const ctx = this.ctx, h = TILE / 2;
    const seed = Math.abs(Math.floor(x * 0.31 + y * 0.17));
    // One fissure: a walk across the stone from `(sx, sy)` that staggers as it goes. Plenty of short
    // steps rather than a few long ones — a crack is a line that never manages to be straight.
    const fork = (sx, sy, dx, dy, steps, w, light) => {
      ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(x + sx, y + sy);
      // The jitter is an offset from the line, not a step added to the last point: accumulated, a
      // crack wandered clean off the tile it was supposed to be in.
      for (let k = 1; k <= steps; k++) {
        const wob = ((seed * 31 + k * k * 17 + k * 59) % 9 - 4) * 0.42;
        ctx.lineTo(x + sx + dx * k / steps + wob, y + sy + dy * k / steps + wob * 0.3);
      }
      ctx.stroke();
      // The mortar lip on one side of the gap, a pixel over, so the line has a thickness to it
      // without being drawn thick.
      if (!light) return;
      ctx.strokeStyle = 'rgba(236,226,206,0.13)'; ctx.lineWidth = 1;
      ctx.stroke();
    };
    const open = hits > 0;
    ctx.save(); ctx.translate(1, 1);
    ctx.strokeStyle = open ? 'rgba(6,5,7,0.85)' : 'rgba(6,5,7,0.52)';
    fork(-h * 0.16, -h * 0.78, h * 0.22, h * 1.5, 11, open ? 1.7 : 1.1, true);
    ctx.strokeStyle = open ? 'rgba(6,5,7,0.7)' : 'rgba(6,5,7,0.4)';
    fork(-h * 0.06, -h * 0.2, -h * 0.44, h * 0.3, 4, open ? 1.2 : 0.9);
    if (open) {
      fork(h * 0.06, h * 0.26, h * 0.5, h * 0.22, 4, 1.2);
      // Stone knocked out of it. Three chips off the seed, so they sit still.
      ctx.fillStyle = 'rgba(6,5,7,0.45)';
      for (let k = 0; k < 3; k++) {
        const t = (seed + k * 53) % 9;
        ctx.fillRect(x - h * 0.34 + (t % 3) * 5, y - h * 0.46 + ((t / 3) | 0) * 8, 2, 2);
      }
    }
    ctx.restore();
  }

  // Centred a hair above the foot point rather than hung below it: every sprite stands with its
  // lowest pixel on (x, y), and a shadow pushed half its own height down from there left the front
  // feet on its middle and the back ones above it, so everything read as hovering over its own
  // shadow (playtest, 23 Sep 2026). Now the front feet sit in the lower half and the back ones in it.
  shadow(x, y, rx, ry) {
    if (this.silPass) return;   // THE DARK's silhouettes are the body alone
    const ctx = this.ctx; ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath(); ctx.ellipse(x, y - ry * 0.15, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  }

  // The roast: a campfire in a ring of stones, two forked sticks, and a crocodile turning on the
  // spit between them. The fire keeps its stitched hatching; the animal is drawn plain and dark,
  // as the real thing, charred. It turns: the spit's rotation is a vertical scale through zero, so
  // half the time he is belly up with his legs in the air.
  drawRoast(p) {
    const ctx = this.ctx, t = this.t, B = TUNING.prop.brazier;
    const heat = p.spillCd > 0 ? 0.35 + 0.65 * (1 - p.spillCd / B.spillCd) : 1;
    const hatch = (path, color, angle, gap = 2.2) => {
      ctx.save(); path(); ctx.clip();
      ctx.strokeStyle = color; ctx.lineWidth = 0.7; ctx.globalAlpha *= 0.55;
      const c = Math.cos(angle), s = Math.sin(angle);
      ctx.beginPath();
      for (let k = -60; k <= 60; k += gap) { ctx.moveTo(-c * 60 - s * k, -s * 60 + c * k); ctx.lineTo(c * 60 - s * k, s * 60 + c * k); }
      ctx.stroke(); ctx.restore();
    };
    ctx.save(); ctx.translate(p.x, p.y + 6);
    this.shadow(0, 4, 38, 10);
    // the ring of stones, back half first so the flames stand inside it
    const stone = (a, front) => {
      const x = Math.cos(a) * 15, y = Math.sin(a) * 6 + 2;
      if ((y > 2) !== front) return;
      ctx.fillStyle = '#6b3f22'; ctx.beginPath(); ctx.ellipse(x, y, 4.2, 3, a * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8c5a30'; ctx.beginPath(); ctx.ellipse(x - 0.8, y - 0.8, 2.4, 1.5, a * 0.3, 0, Math.PI * 2); ctx.fill();
    };
    for (let k = 0; k < 9; k++) stone(k / 9 * Math.PI * 2, false);
    // the fire: tongues red at the tips and yellow at the root, each with its own flicker
    const tongue = (x, h, w, col, ph) => {
      const hh = h * heat * (0.85 + 0.15 * Math.sin(t * 13 + ph));
      const lean = Math.sin(t * 7 + ph) * 2.5;
      const path = () => { ctx.beginPath(); ctx.moveTo(x - w, 2); ctx.quadraticCurveTo(x - w * 0.9, -hh * 0.5, x + lean, -hh);
        ctx.quadraticCurveTo(x + w * 0.9, -hh * 0.5, x + w, 2); ctx.closePath(); };
      ctx.fillStyle = col; path(); ctx.fill();
      hatch(path, '#fff2b0', -1.35, 2);
    };
    tongue(-6, 16, 6, '#c8321a', 0); tongue(6, 15, 6, '#c8321a', 2); tongue(0, 22, 8, '#e8661e', 1);
    tongue(-2, 15, 6, PALETTE.fire, 3); tongue(2, 10, 4.5, PALETTE.fireHi, 4);
    for (let k = 0; k < 4; k++) {           // flecks lifting off it
      const ph = (t * 0.9 + k * 0.27 + p.phase) % 1;
      ctx.globalAlpha = (1 - ph) * heat; ctx.fillStyle = k % 2 ? '#c8321a' : PALETTE.fire;
      ctx.fillRect(Math.sin(k * 3.1 + t * 2) * 12, -8 - ph * 26, 1.8, 2.8);
    }
    ctx.globalAlpha = 1;
    for (let k = 0; k < 9; k++) stone(k / 9 * Math.PI * 2, true);
    // the two forked sticks, a stitched brown with a lighter thread down one side
    const stick = (x, dir) => {
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#4a2a16'; ctx.lineWidth = 4.6;
      ctx.beginPath(); ctx.moveTo(x + dir * 3, 10); ctx.lineTo(x, -30); ctx.moveTo(x, -26); ctx.lineTo(x - dir * 5, -35);
      ctx.moveTo(x + dir * 1.5, -16); ctx.lineTo(x + dir * 4, -21); ctx.stroke();
      ctx.strokeStyle = '#7a4a28'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(x + dir * 3 - 1, 8); ctx.lineTo(x - 1, -29); ctx.stroke();
    };
    stick(-45, -1);
    // the spit: pale cord, run through him and resting in both forks
    const turn = Math.cos(t * B.roastTurn + p.phase);
    ctx.strokeStyle = '#d9c078'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-50, -29); ctx.lineTo(50, -29); ctx.stroke();
    ctx.strokeStyle = '#f2dea0'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-50, -30); ctx.lineTo(50, -30); ctx.stroke();
    // the crocodile, facing right; `turn` is the spit's rotation seen side-on. Drawn as the animal
    // rather than as a logo: a long flat snout, a straight tapering tail with the double crest on it,
    // rows of armour down the back, legs hanging limp, and the hide dark and charred where the fire
    // has had it. It was a bright green cartoon with a white border, which read as a shirt badge.
    ctx.save(); ctx.translate(0, -29); ctx.scale(1, turn >= 0 ? Math.max(0.18, turn) : Math.min(-0.18, turn));
    const body = () => {
      ctx.beginPath();
      ctx.moveTo(-48, -0.5);                                                 // the tip of the tail
      ctx.quadraticCurveTo(-32, -3.5, -17, -6);                              // top of the tail
      ctx.quadraticCurveTo(-4, -9, 9, -7.2);                                 // the back
      ctx.quadraticCurveTo(15, -6.6, 18.5, -6.2);                            // the neck
      ctx.quadraticCurveTo(22, -8.6, 25.5, -6.6);                            // the brow over the eye
      ctx.lineTo(41, -3.4); ctx.quadraticCurveTo(44.5, -2.6, 44, -0.6);      // long flat snout, blunt tip
      ctx.lineTo(27, 1.8);                                                   // under the lower jaw
      ctx.quadraticCurveTo(20, 3.6, 14, 4.2);                                // the throat
      ctx.quadraticCurveTo(-2, 8.5, -17, 4.2);                               // the belly, sagging
      ctx.quadraticCurveTo(-32, 2, -48, 0.8);                                // under the tail
      ctx.closePath();
    };
    // legs first, so the body sits over their tops: short, bent at the joint, hanging limp
    const leg = (lx, ly, back) => {
      const kx = lx + (back ? -3 : 2.5), ky = ly + 4.5, fx = kx + (back ? 1 : 3), fy = ky + 3.5;
      ctx.strokeStyle = '#262617'; ctx.lineWidth = back ? 4.2 : 3.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
      ctx.strokeStyle = '#1a1a10'; ctx.lineWidth = 0.9;
      ctx.beginPath(); for (const k of [-1.3, 0, 1.3]) { ctx.moveTo(fx, fy); ctx.lineTo(fx + 1.8, fy + 1.4 + k); } ctx.stroke();
    };
    leg(-14, 4, true); leg(-8, 5.5, true); leg(9, 5, false); leg(14, 4, false);
    // the hide: dark olive on the back fading to a dull cream belly, then the fire's own browning
    const hide = ctx.createLinearGradient(0, -9, 0, 7);
    hide.addColorStop(0, '#2c2f1c'); hide.addColorStop(0.45, '#4a4a2c'); hide.addColorStop(0.8, '#7d7048'); hide.addColorStop(1, '#8d7a4c');
    ctx.fillStyle = hide; body(); ctx.fill();
    ctx.save(); body(); ctx.clip();
    // the armour: offset rows of small plates over the back and tail, belly scales as a grid below
    ctx.fillStyle = 'rgba(12,12,6,0.55)';
    for (let row = 0; row < 3; row++) {
      for (let x = -46 + (row % 2) * 1.6; x < 17; x += 3.2) {
        const top = x < -17 ? -3.5 + (x + 48) / 31 * -2.5 : -6 - Math.sin((x + 17) / 34 * Math.PI) * 2.6;
        ctx.fillRect(x, top + 0.4 + row * 2.1, 2.2, 1.4);
      }
    }
    ctx.strokeStyle = 'rgba(40,32,16,0.45)'; ctx.lineWidth = 0.5; ctx.beginPath();
    for (let x = -30; x < 16; x += 2.4) { ctx.moveTo(x, 1); ctx.lineTo(x, 9); }
    for (let y = 1.8; y < 9; y += 1.8) { ctx.moveTo(-30, y); ctx.lineTo(16, y); }
    ctx.stroke();
    // char: blackened patches where the flames reach, and a fat sheen on the belly while it is lit
    ctx.fillStyle = 'rgba(10,6,4,0.6)';
    for (const [cx, cy, rx, ry] of [[-6, 5, 9, 3.2], [8, 4, 5, 2.4], [-24, 2.6, 6, 2], [-38, 1, 4, 1.4], [32, 0.5, 5, 1.6]]) {
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 0.35 * heat; ctx.fillStyle = '#d0741e';
    ctx.beginPath(); ctx.ellipse(-4, 7, 20, 2.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
    // the double crest along the tail, and the dark outline round the whole animal
    ctx.fillStyle = '#1d1e12';
    for (let x = -44; x < -18; x += 3) {
      const y = -1.2 + (x + 48) / 31 * -4.6;
      ctx.beginPath(); ctx.moveTo(x - 1.3, y + 0.8); ctx.lineTo(x, y - 1.6); ctx.lineTo(x + 1.3, y + 0.8); ctx.fill();
    }
    ctx.strokeStyle = '#141409'; ctx.lineWidth = 0.9; ctx.lineJoin = 'round'; body(); ctx.stroke();
    // the jaw line, closed, with a few teeth showing the way a crocodile's always do
    ctx.strokeStyle = '#151208'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(24.5, -1.2); ctx.quadraticCurveTo(33, -0.4, 43.5, -1.4); ctx.stroke();
    ctx.fillStyle = '#cfc4a0';
    for (const x of [30, 33.5, 37, 40]) { ctx.beginPath(); ctx.moveTo(x, -0.9); ctx.lineTo(x + 0.5, 0.7); ctx.lineTo(x + 1, -0.9); ctx.fill(); }
    // the eye under its ridge, shut and filmed over, and the nostril on the end of the snout
    ctx.fillStyle = '#3a3a24'; ctx.beginPath(); ctx.ellipse(22.3, -7.3, 2.2, 1.3, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#9a9468'; ctx.beginPath(); ctx.ellipse(22.5, -7.1, 1.1, 0.6, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#111108'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(21.4, -7.3); ctx.lineTo(23.6, -6.9); ctx.stroke();
    ctx.fillStyle = '#141409'; ctx.beginPath(); ctx.ellipse(42.2, -2.9, 0.9, 0.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    stick(45, 1);
    ctx.restore();
  }


  // Which way a door swings open: +1 folds its free end toward +x (a slab standing across a
  // corridor that runs left and right) or +y (one lying across a corridor that runs up and down).
  // Into the corridor rather than the room, which is the side with stone close in beside the frame.
  // Asked of the tiles once and kept on the door.
  doorSwing(p) {
    if (p.swing) return p.swing;
    const w = this.game && this.game.world; if (!w) return 1;
    const tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE);
    let a = 0, b = 0;
    for (let k = -2; k <= 1; k++) {
      if (p.vertical) { a += w.isSolid(tx - 2, ty + k) ? 1 : 0; b += w.isSolid(tx + 2, ty + k) ? 1 : 0; }
      else { a += w.isSolid(tx + k, ty - 2) ? 1 : 0; b += w.isSolid(tx + k, ty + 2) ? 1 : 0; }
    }
    return (p.swing = b >= a ? 1 : -1);
  }

  drawProp(p) {
    const ctx = this.ctx;
    if (p.corpse) { Talisman.drawCorpse(this, p); return; }   // GRAVEDIGGER'S SPADE
    if (p.kind === 'mill') { this.drawMill(p); return; }
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1, 1 / TILT); ctx.translate(-p.x, -p.y);
    this.drawPropBody(p);
    ctx.restore();
  }

  // THE ESCORTS (js/beasts.js). Three animals drawn the way everything else in this game is drawn:
  // a handful of shapes that have to read across a room at a glance and say what the thing does.
  //
  // The tortoise is a dome first and an animal second — it is cover as much as it is company, so the
  // shell is most of the drawing and the head and legs come and go. Pulled in (`tuckT`) it is nothing
  // but shell, which is the state in which it blocks and stops rounds; out, four stubby legs and a
  // small head say it is walking again and can be picked up.
  drawTortoise(p) {
    // On its back after a block (`coolT`): drawn upside down, and the ring under it is ash, not bone.
    const ctx = this.ctx, r = p.r, cool = p.coolT > 0 && !p.flying, tucked = (p.tuckT > 0 || cool) && !p.flying;
    const lift = p.held ? 5 : 0, spin = p.flying ? this.t * 6 : 0;
    const walk = tucked || p.held || p.flying ? 0 : Math.sin(p.bob * 2) * 1.4;
    if (PIXEL_ART.ready) {
      // Pixel pass: one drawing of her, so pulled in is squat and a shade darker, and walking bobs.
      ctx.save(); ctx.translate(p.x, p.y + r * 0.5 - lift);
      this.shadow(0, lift, r * 0.95, r * 0.48);
      ctx.rotate(spin * 0.12); ctx.translate(0, -Math.abs(walk) * 0.6); ctx.scale(1, 1 / TILT);
      if (tucked) { ctx.scale(1.04, 0.88); ctx.filter = 'brightness(0.78)'; }
      if (cool) { ctx.translate(0, -r * 0.8); ctx.scale(1, -1); ctx.translate(0, r * 0.8); ctx.filter = 'brightness(0.6)'; }
      PIXEL_ART.icon(ctx, 'turtle', (p.face || 1) < 0);
      ctx.restore();
    } else {
    ctx.save(); ctx.translate(p.x, p.y - lift);
    this.shadow(0, r * 0.5 + lift, r * 0.95, r * 0.48);
    ctx.rotate(spin * 0.12 + (cool ? Math.PI : 0));
    // legs and head, only when it is out
    if (!tucked) {
      ctx.fillStyle = '#7d6a4a';
      for (const [lx, ly] of [[-r * 0.66, r * 0.34], [r * 0.66, r * 0.34], [-r * 0.72, -r * 0.16], [r * 0.72, -r * 0.16]]) {
        ctx.beginPath(); ctx.ellipse(lx, ly + walk * (lx > 0 ? 1 : -1), 3.4, 2.6, 0, 0, Math.PI * 2); ctx.fill();
      }
      // the head, out in front of whichever way it is going
      const hx = Math.abs(p.vx) > 4 ? Math.sign(p.vx) * r * 0.9 : 0, hy = Math.abs(p.vx) > 4 ? r * 0.1 : r * 0.72;
      ctx.beginPath(); ctx.ellipse(hx, hy, 4.2, 3.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = PALETTE.ink;
      ctx.beginPath(); ctx.arc(hx + (hx ? Math.sign(hx) * 1.4 : 1.4), hy - 0.8, 0.9, 0, Math.PI * 2); ctx.fill();
    }
    // the shell: a dome, a rim, and the scutes on it
    ctx.fillStyle = '#2e2419';
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.86, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5c4a2a';
    ctx.beginPath(); ctx.ellipse(0, -0.6, r - 1.6, r * 0.86 - 1.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7a6434';
    ctx.beginPath(); ctx.ellipse(-r * 0.18, -r * 0.24, r * 0.58, r * 0.46, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(26,16,22,0.55)'; ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI / 2 + (k / 5) * Math.PI * 2;
      ctx.moveTo(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.26);
      ctx.lineTo(Math.cos(a) * (r - 2), Math.sin(a) * (r * 0.86 - 2));
    }
    ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.32, r * 0.28, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    }
    // Pulled in, it says so: a thin ring on the ground is the tell that it is cover right now and
    // not a thing you can pick up, and it fades as the tuck runs out.
    if (cool) {
      // How long it stays over, as the ring filling back in.
      const f = 1 - p.coolT / TUNING.prop.tortoise.cool;
      ctx.strokeStyle = 'rgba(120,110,100,0.5)'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.ellipse(p.x, p.y + r * 0.45, r * 1.35, r * 0.6, 0, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2); ctx.stroke();
    } else if (tucked) {
      const a = Math.min(1, p.tuckT / TUNING.prop.tortoise.tuck);
      ctx.strokeStyle = `rgba(239,230,208,${0.1 + 0.14 * a})`; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.ellipse(p.x, p.y + r * 0.45, r * 1.35, r * 0.6, 0, 0, Math.PI * 2); ctx.stroke();
    }
  }

  // An escort that has gone out of the picture is shown at the edge of it, on the line from the
  // middle of the screen to where it is: its own sprite, small, on a dark pip, with a point of cells
  // toward it, and a beat brighter when it calls (`Beast.tick`). Without it a crow three rooms back
  // was something a player learned about at the stairs. World space, drawn over the fog.
  drawStrays(game) {
    if (game.state !== 'play' || !PIXEL_ART.ready) return;
    const ctx = this.ctx, cam = game.cam, v = this.view(cam), B = TUNING.beast, m = B.strayEdge * TILE;
    const hw = v.w / 2, hh = v.h / 2, ICON = { chicken: 'chicken', tortoise: 'turtle', goose: 'goose', crow: 'raven' };
    for (const p of game.props) {
      if (!Beast.animal(p) || p.held) continue;
      const dx = p.x - cam.x, dy = p.y - cam.y;
      if (Math.abs(dx) < hw && Math.abs(dy) < hh) continue;
      const k = Math.min((hw - m) / Math.max(1, Math.abs(dx)), (hh - m) / Math.max(1, Math.abs(dy)));
      const x = Math.round(cam.x + dx * k), y = Math.round(cam.y + dy * k);
      const called = Math.max(0, 1 - (game.timer - (p.calledAt ?? -9)) / 0.6);
      ctx.save(); ctx.translate(x, y); ctx.scale(1, 1 / TILT);
      ctx.globalAlpha = 0.72 + 0.28 * called;
      ctx.fillStyle = 'rgba(13,10,12,0.72)'; CombatFX.cellDisc(ctx, 0, 0, 15 + called * 2);
      // The point: three rows of cells stepping out toward it, off the rim of the pip.
      const sl = Math.hypot(dx, dy * TILT) || 1, ux = dx / sl, uy = dy * TILT / sl;
      // Red when one more room walls it in (`p.behind`, from `Beast.tick`).
      ctx.fillStyle = p.behind >= 1 ? PALETTE.blood : called > 0 ? PALETTE.fireHi : PALETTE.hen;
      for (let s = 0; s < 3; s++) for (let w = -(2 - s); w <= 2 - s; w++) {
        const r = 17 + s * 2;
        ctx.fillRect(Math.round(ux * r - uy * w * 2) - 1, Math.round(uy * r + ux * w * 2) - 1, 2, 2);
      }
      ctx.translate(0, 8); ctx.scale(B.strayPip, B.strayPip);
      if (p.kind === 'horse') { ctx.scale(0.5, 0.5); this.horseSprite(ctx, dx < 0 ? Math.PI : 0, false, 'idle'); }
      else PIXEL_ART.icon(ctx, ICON[p.kind], dx < 0);
      ctx.restore();
    }
  }

  // The goose: bone-white like the hen so the two read as the same side of the fight, but tall — the
  // neck is the whole silhouette and the whole of what it says about itself. It is up and open when
  // the honk is fresh, down and forward when it is walking.
  drawGoose(p) {
    const ctx = this.ctx, r = p.r, C = TUNING.prop.goose;
    const honk = Math.max(0, 1 - (C.honkGap - (p.honkT || 0)) / 0.45);   // 1 just after a honk
    const face = p.face || 1;   // kept from its last step (`Beast.step`), so stopping is not a turn to the right
    const bob = Math.sin(p.bob * 2.2) * 1.2;
    ctx.save(); ctx.translate(p.x, p.y);
    this.shadow(0, r * 0.55, r * 0.9, r * 0.42);
    if (PIXEL_ART.ready) {
      // Pixel pass: the honk is a stretch up, the arcs below still say what it was.
      ctx.translate(0, r * 0.55 + bob * 0.5); ctx.scale(1 / (1 + honk * 0.08), 1 / TILT * (1 + honk * 0.12));
      PIXEL_ART.icon(ctx, 'goose', face < 0);
    } else {
    ctx.scale(face, 1);
    ctx.fillStyle = '#c8a24a';                              // the feet
    ctx.fillRect(-3, r * 0.3 + bob, 3, 3.4); ctx.fillRect(2, r * 0.3 + bob, 3, 3.4);
    ctx.fillStyle = PALETTE.henShade;                        // the body, shaded under
    ctx.beginPath(); ctx.ellipse(-1, bob, r * 0.9, r * 0.66, 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PALETTE.hen;
    ctx.beginPath(); ctx.ellipse(-1.5, bob - 1.4, r * 0.82, r * 0.56, 0.1, 0, Math.PI * 2); ctx.fill();
    // the neck: an S when it is walking, straight up and out when it has just shouted
    const hh = -r * (1.5 + 0.55 * honk) + bob, hx = r * (0.5 + 0.45 * honk);
    ctx.strokeStyle = PALETTE.hen; ctx.lineWidth = 4.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, bob - r * 0.3);
    ctx.quadraticCurveTo(r * 0.1 - honk * r * 0.4, hh * 0.55, hx * 0.72, hh);
    ctx.stroke();
    ctx.fillStyle = PALETTE.hen;
    ctx.beginPath(); ctx.ellipse(hx * 0.72, hh, 4.2, 3.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PALETTE.beak;                            // the bill, open when it honks
    ctx.beginPath(); ctx.moveTo(hx * 0.72 + 2, hh - 1.6 - honk * 1.4);
    ctx.lineTo(hx * 0.72 + 8 + honk * 2, hh - 0.4);
    ctx.lineTo(hx * 0.72 + 2, hh + 1.6 + honk * 1.4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = PALETTE.ink;
    ctx.beginPath(); ctx.arc(hx * 0.72 + 1.4, hh - 1.2, 1, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    // What a honk is, seen: two arcs off the bill, the way the goat's own call is drawn as a ring.
    if (honk > 0.05) {
      ctx.strokeStyle = `rgba(239,230,208,${0.5 * honk})`; ctx.lineWidth = 1.6;
      for (const k of [1, 1.7]) {
        ctx.beginPath();
        ctx.arc(p.x + face * r * 1.1, p.y - r * 1.6, 5 * k, -0.9, 0.9); ctx.stroke();
      }
    }
  }

  // The horse (js/horse-pixels.js): its own hand-built pixel body, the way the ogre has one, turned
  // to where it runs, and to the goat when it stands. Rearing at a door is its `kick` pose.
  drawHorse(p) {
    const ctx = this.ctx, r = p.r, moving = Math.hypot(p.vx || 0, p.vy || 0) > 12;
    if (moving) p.heading = Math.atan2(p.vy, p.vx);
    else if (p.face && (p.heading === undefined || Math.cos(p.heading) * p.face < 0)) p.heading = p.face > 0 ? 0 : Math.PI;
    ctx.save(); ctx.translate(p.x, p.y);
    this.shadow(0, r * 0.45, 24, 8);   // the sprite's size, not the body's (`TUNING.prop.horse.r`)
    ctx.translate(0, r * 0.45); ctx.scale(1, 1 / TILT);
    this.horseSprite(ctx, p.heading || 0, moving, p.rear > 0 ? 'kick' : 'idle', p.phase || 0);
    ctx.restore();
  }
  // Only the sprite, at the origin (its feet): the coop, the pip at the screen's edge and the dev
  // tabs draw it too. A placeholder of cells until the file is there, never a smooth shape.
  horseSprite(ctx, angle, moving, pose, phase) {
    if (typeof HORSE_PIXELS !== 'undefined' && HORSE_PIXELS.draw) { HORSE_PIXELS.draw(ctx, angle, moving, this.t + (phase || 0), pose); return; }
    ctx.fillStyle = '#7a4a2a'; ctx.fillRect(-24, -30, 40, 16); ctx.fillRect(12, -44, 10, 18);
    ctx.fillStyle = '#3a2416'; for (const x of [-22, -14, 4, 12]) ctx.fillRect(x, -14, 4, 14);
  }

  // The crow: near-black with a cold blue sheen on it, so it reads against plum and timber without
  // being another pale animal. A wing out and a hop when it is travelling, head down when it is on
  // a body — which is the one thing it is ever doing, and the whole of what it asks of the player.
  drawCrow(p) {
    const ctx = this.ctx, r = p.r;
    const moving = Math.hypot(p.vx || 0, p.vy || 0) > 8;
    const face = p.face || 1;   // kept from its last step (`Beast.step`), so stopping is not a turn to the right
    const hop = moving ? Math.abs(Math.sin(p.bob * 4)) * 4 : 0;
    const peck = p.feeding ? Math.max(0, Math.sin(p.bob * 3)) * 3 : 0;
    ctx.save(); ctx.translate(p.x, p.y - hop);
    this.shadow(0, r * 0.5 + hop, r * 0.8, r * 0.36);
    if (PIXEL_ART.ready) {
      // Pixel pass: a hop is the lift above, feeding is a dip forward onto the body.
      ctx.translate(0, r * 0.5); ctx.scale(1, 1 / TILT); ctx.rotate(face * peck * 0.06);
      PIXEL_ART.icon(ctx, 'raven', face < 0);
      ctx.restore(); return;
    }
    ctx.scale(face, 1);
    ctx.fillStyle = '#3a3a46';                               // the legs
    ctx.fillRect(-2.4, r * 0.28, 1.8, 3.4); ctx.fillRect(1.4, r * 0.28, 1.8, 3.4);
    ctx.fillStyle = '#12111a';                               // the tail and the body
    ctx.beginPath(); ctx.moveTo(-r * 1.25, -r * 0.1);
    ctx.lineTo(-r * 0.4, -r * 0.5); ctx.lineTo(-r * 0.4, r * 0.3); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.82, r * 0.6, 0.12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#232233';                               // the wing, out when it is travelling
    ctx.save(); ctx.rotate(moving ? -0.5 - Math.sin(p.bob * 4) * 0.35 : -0.12);
    ctx.beginPath(); ctx.ellipse(-r * 0.15, -r * 0.1, r * 0.66, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    const hy = -r * 0.62 + peck;                             // the head, down on a body
    ctx.fillStyle = '#12111a';
    ctx.beginPath(); ctx.ellipse(r * 0.42, hy, 4, 3.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6b6a78';                               // the beak
    ctx.beginPath(); ctx.moveTo(r * 0.42 + 2, hy - 1.4);
    ctx.lineTo(r * 0.42 + 9, hy + 0.2); ctx.lineTo(r * 0.42 + 2, hy + 1.6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = PALETTE.fireHi;                          // one bright eye is the whole face
    ctx.beginPath(); ctx.arc(r * 0.42 + 1.2, hy - 1, 1.1, 0, Math.PI * 2); ctx.fill();
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
      // The source beam is a fixed-proportion prop, so it is stretched to the tuned arm length
      // rather than tiled; the extra level-one-only grain/stud detail below it is dropped in favour,
      // since the art already carries its own grain and bands.
      if (!(this.painted.ready && this.painted.millArm(ctx, M.innerR - 6, M.armLen - M.innerR + 10))) {
        ctx.fillStyle = 'rgba(0,0,0,0.32)'; ctx.fillRect(M.innerR - 6, -7 + 6, M.armLen - M.innerR + 10, 16);
        ctx.fillStyle = PALETTE.wood; ctx.fillRect(M.innerR - 6, -8, M.armLen - M.innerR + 10, 16);
        ctx.fillStyle = PALETTE.woodHi; ctx.fillRect(M.innerR - 6, -8, M.armLen - M.innerR + 10, 4);
        if (this.altar) {
          const P = PALETTE.altar;
          ctx.fillStyle = P.woodDark; ctx.fillRect(M.innerR - 6, 5, M.armLen - M.innerR + 10, 2);
          for (let x = M.innerR; x < M.armLen - 18; x += 19) {
            ctx.fillStyle = P.woodGrain; ctx.fillRect(x, -1, 12, 1);
            ctx.fillStyle = P.iron; ctx.fillRect(x, -8, 3, 16);
            ctx.fillStyle = P.ironHi; ctx.fillRect(x + 1, -6, 1, 2);
          }
        }
      }
      // The pixel arm (js/prop-pixels.js) carries its own iron head; only the old beams need one added.
      if (!this.painted.pixelProps) {
        ctx.fillStyle = '#6d6a66'; ctx.fillRect(M.armLen - 16, -12, 16, 24);        // iron cap
        ctx.fillStyle = '#8d8a85'; ctx.fillRect(M.armLen - 16, -12, 16, 5);
        ctx.fillStyle = PALETTE.bloodDark; ctx.fillRect(M.armLen - 16, 6, 16, 6);
      }
      ctx.restore();
    }
    if (this.painted.pixelProps) this.painted.millHub(ctx, M.hubR);
    else if (this.altar) ctx.drawImage(this.altar.sprite('mill', M.hubR), -48, -64);
    else if (!(this.painted.ready && this.painted.atlas(ctx, 'mill-hub', 0, 0, M.hubR * 2.2, undefined, 0.5))) {
      ctx.fillStyle = '#4d4741'; ctx.beginPath(); ctx.arc(0, 0, M.hubR, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6a635b'; ctx.beginPath(); ctx.arc(0, -3, M.hubR - 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2e2a26'; ctx.beginPath(); ctx.arc(0, -3, 7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // The cave's stone teeth: three spikes of rock standing up out of the floor at the foot of a wall,
  // the tallest in the middle, wet at the tips. It is drawn in the room's own rock colours because it
  // IS the room's rock — nothing about it is a warning sign painted on the ground — and what has to
  // read from across the room is the shape: narrow, tall, pointed, and the light running along the
  // edge of each point. The glint is the only thing here that moves, and it is on `cave.spikes.glint`.
  drawSpire(p) {
    const ctx = this.ctx, def = this.game && this.game.level ? this.game.level.def : null;
    const face = (def && def.wall) || '#5a544c', top = (def && def.wallTop) || '#8d8a85';
    const G = TUNING.cave.spikes.glint, r = p.r;
    // Old blood round the foot of them. It is the one thing here that is not rock, and it is what
    // says the rock kills before anybody has to find out: a stone spike drawn in the room's own
    // stone colours is honest and very nearly invisible, and this is read across a room.
    ctx.fillStyle = 'rgba(74,20,16,0.45)';
    ctx.beginPath(); ctx.ellipse(p.x + 1, p.y + 3, r * 1.15, r * 0.5, 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(122,31,24,0.3)';
    ctx.beginPath(); ctx.ellipse(p.x - r * 0.5, p.y + 5, r * 0.4, r * 0.2, -0.3, 0, Math.PI * 2); ctx.fill();
    this.shadow(p.x, p.y + 2, r * 0.95, r * 0.42);
    if (PIXEL_ENV.ready) { PIXEL_ENV.draw(ctx, 'stalagmites', p.x, p.y + 4, r * 2.4); return; }
    // back two first, then the tall one in front of them, so the group reads as one thing
    const teeth = [[-r * 0.55, r * 0.62, 0.72], [r * 0.58, r * 0.55, 0.66], [r * 0.04, r * 0.78, 1]];
    for (let k = 0; k < teeth.length; k++) {
      const [ox, w, hMul] = teeth[k], x = p.x + ox, base = p.y + (k === 2 ? 3 : 0), len = r * 2.15 * hMul;
      ctx.fillStyle = face; ctx.beginPath();
      ctx.moveTo(x - w / 2, base);
      ctx.quadraticCurveTo(x - w * 0.22, base - len * 0.55, x, base - len);
      ctx.quadraticCurveTo(x + w * 0.22, base - len * 0.55, x + w / 2, base);
      ctx.closePath(); ctx.fill();
      // the lit side, and the point in the rock's top colour so the tip is the brightest thing on it
      ctx.fillStyle = 'rgba(255,240,210,0.16)'; ctx.beginPath();
      ctx.moveTo(x - w / 2, base); ctx.quadraticCurveTo(x - w * 0.22, base - len * 0.55, x, base - len);
      ctx.lineTo(x - w * 0.06, base); ctx.closePath(); ctx.fill();
      ctx.fillStyle = top; ctx.beginPath();
      ctx.moveTo(x - w * 0.2, base - len * 0.74); ctx.lineTo(x, base - len); ctx.lineTo(x + w * 0.2, base - len * 0.74);
      ctx.closePath(); ctx.fill();
      const tw = Math.pow(Math.max(0, Math.sin(this.t * 1.6 + k * 2.1 + p.x * 0.05)), 8);
      if (tw > 0.04) {
        ctx.fillStyle = `rgba(255,255,255,${tw * G})`;
        ctx.beginPath(); ctx.arc(x, base - len + 1, 1.5, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  // The mouse's pail, standing where she set it down: a bucket as tall as the goat, staved, hooped
  // twice, brimming and slopping over the lip, with a pip on the band for every heart still in it.
  // It is deliberately enormous. The offer used to be three bowls of milk with the words THREE BOWLS
  // OF MILK written under them, and the 22 Sep 2026 note was that the caption should be a bucket
  // instead — a thing that size, full of that, needs nothing said about it.
  drawPail(p) {
    const ctx = this.ctx, t = this.t, R = p.r * 1.7, H = R * 2.2;
    const y0 = p.y + 4, wob = Math.sin(t * 1.4 + p.x * 0.03) * 0.8;
    this.shadow(p.x, p.y + 4, R * 1.05, R * 0.45);
    // the staves, narrower at the foot
    ctx.fillStyle = '#6b4a2c'; ctx.beginPath();
    ctx.moveTo(p.x - R * 0.72, y0); ctx.lineTo(p.x - R, y0 - H);
    ctx.lineTo(p.x + R, y0 - H); ctx.lineTo(p.x + R * 0.72, y0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath(); ctx.moveTo(p.x + R * 0.28, y0 - H); ctx.lineTo(p.x + R, y0 - H);
    ctx.lineTo(p.x + R * 0.72, y0); ctx.lineTo(p.x + R * 0.2, y0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,210,0.1)'; ctx.fillRect(p.x - R * 0.82, y0 - H * 0.9, R * 0.22, H * 0.8);
    // two iron hoops, and a pip on the upper one for every drink left in it
    for (const f of [0.28, 0.76]) {
      ctx.fillStyle = '#8d8a85';
      ctx.fillRect(p.x - R * (0.72 + 0.28 * f), y0 - H * f - 2, R * 2 * (0.72 + 0.28 * f), 3.4);
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillRect(p.x - R * (0.72 + 0.28 * f), y0 - H * f - 2, R * 2 * (0.72 + 0.28 * f), 1.2);
    }
    // the milk, brimming and slopping with the wobble
    const top = y0 - H;
    ctx.fillStyle = '#efe6d0'; ctx.beginPath(); ctx.ellipse(p.x, top + wob, R * 0.96, R * 0.34, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.ellipse(p.x - R * 0.3, top - R * 0.06 + wob, R * 0.28, R * 0.1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(239,230,208,0.85)';
    ctx.beginPath(); ctx.moveTo(p.x + R * 0.5, top + wob); ctx.quadraticCurveTo(p.x + R * 0.92, top + H * 0.3, p.x + R * 0.66, top + H * 0.34);
    ctx.quadraticCurveTo(p.x + R * 0.62, top + H * 0.1, p.x + R * 0.5, top + wob); ctx.fill();
    ctx.save(); ctx.scale(1, 1 / TILT);
    ctx.fillStyle = PALETTE.bone;
    for (let k = 0; k < p.pail; k++) {
      const px = p.x - (p.pail * 5 - 2) / 2 + k * 5;
      ctx.beginPath(); ctx.arc(px, (y0 - H * 0.76) * TILT, 1.7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    if (p.graze > 0) {
      const frac = clamp(p.graze / TUNING.prop.heal.grazeTime, 0, 1);
      ctx.strokeStyle = 'rgba(239,230,208,0.85)'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(p.x, p.y, R * 1.05, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); ctx.stroke();
    }
  }

  drawPropBody(p) {
    if (p.kind === 'heal' && p.pail) { this.drawPail(p); return; }
    if (p.kind === 'spire') { this.drawSpire(p); return; }
    if (p.kind === 'rock') { if (this.game && this.game.level && this.game.level.def.shroom) this.drawBigShroom(p); else this.drawRock(p); return; }
    if (p.kind === 'shrooms') { this.drawShroomTuft(p); return; }
    if (p.kind === 'sconce') { if (this.painted.sconce) this.painted.sconce(this.ctx, p, this.t); return; }
    // In the cave the rock under a secret wall is drawn with the rest of the rock (`drawCaveTiles`):
    // a square patch of wall in a round cave would give it away. Only the crack is its own.
    if (p.kind === 'secret' && this.game && this.game.world && this.game.world.round) { this.wallCrack(p.x, p.y, p.hits || 0); return; }
    if (this.painted.ready && this.painted.drawProp(this, p)) return;
    const ctx = this.ctx;
    if (p.kind === 'brazier' && p.roast) this.drawRoast(p);
    else if (p.kind === 'brazier') {
      this.shadow(p.x, p.y, p.r * 1.1, p.r * 0.55);
      ctx.fillStyle = PALETTE.brazier; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2a2018'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r - 4, 0, Math.PI * 2); ctx.fill();
      // Coals knocked out of it: the flame drops and builds back, so the bowl says when it is ready.
      const heat = p.spillCd > 0 ? 0.4 + 0.6 * (1 - p.spillCd / TUNING.prop.brazier.spillCd) : 1;
      this.flame(p.x, p.y - 6, (12 + (p.phase * 3 % 3)) * heat, p.phase * 10);
    } else if (p.kind === 'bell') {
      const ring = p.rung > 0 ? Math.sin(this.t * 40) * 3 : 0;
      this.shadow(p.x, p.y, p.r, p.r * 0.5);
      ctx.fillStyle = PALETTE.cult; ctx.beginPath(); ctx.arc(p.x + ring, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = PALETTE.bone; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x + ring, p.y, p.r - 4, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = PALETTE.bone; ctx.beginPath(); ctx.arc(p.x + ring, p.y, 3, 0, Math.PI * 2); ctx.fill();
    } else if (p.kind === 'door') {
      const tall = p.vertical;
      const wdt = tall ? 13 : 58, hgt = tall ? 58 : 13;
      // The replacement art has the same 13x58 footprint as this slab. Keep the existing swing,
      // hit marks, pressure tell and soul wording above it: artwork must not hide its state.
      // The soul door carries the soul's own halo. An iron door in a corridor and the one with a
      // soul behind it used to be the same grey slab, which is why nobody went to the second one.
      if (p.vault || p.gate) {
        const violet = p.gate;
        const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 56);
        halo.addColorStop(0, violet ? `rgba(125,92,255,${0.2 + 0.1 * Math.sin(this.t * 2.4)})`
          : `rgba(255,224,138,${0.14 + 0.08 * Math.sin(this.t * 2.4)})`);
        halo.addColorStop(1, violet ? 'rgba(125,92,255,0)' : 'rgba(255,224,138,0)');
        ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(p.x, p.y, 56, 0, Math.PI * 2); ctx.fill();
      }
      ctx.save(); ctx.translate(p.x, p.y);
      // Open, it swings on its hinge — one end, against the jamb — and folds back along the wall of
      // the corridor it opens into. Turned about its own middle, a door standing open (the clock door
      // before it shuts, one a man shouldered) lay across the doorway like a beam, half in the stone
      // and half through the goat (playtest, 25 Sep 2026).
      if (p.open > 0) {
        const s = this.doorSwing(p), h = (tall ? hgt : wdt) / 2, a = s * Math.min(1, p.open) * Math.PI / 2;
        if (tall) { ctx.translate(0, -h); ctx.rotate(-a); ctx.translate(0, h); }
        else { ctx.translate(-h, 0); ctx.rotate(a); ctx.translate(h, 0); }
      }
      this.shadow(0, 0, wdt * 0.6, hgt * 0.4);
      // Planks, unless it is the vault's: iron is darker, banded across, studded, and carries a
      // notch for every blow it has already taken, so four hits is a count and not a wall.
      const paintedSlab=this.painted.ready&&this.painted.doorSlab(ctx,p,wdt,hgt);
      if(!paintedSlab){
        ctx.fillStyle = p.iron ? '#3a3a40' : PALETTE.wood; ctx.fillRect(-wdt / 2, -hgt / 2, wdt, hgt);
        ctx.fillStyle = p.iron ? '#5d5f68' : PALETTE.woodHi; ctx.fillRect(-wdt / 2, -hgt / 2, tall ? 4 : wdt, tall ? hgt : 4);
        if (this.altar) this.altar.doorDetail(ctx, p, wdt, hgt);
      }
      ctx.strokeStyle = p.iron ? 'rgba(10,10,14,0.7)' : 'rgba(26,16,22,0.55)'; ctx.lineWidth = p.iron ? 3 : 2;
      ctx.beginPath();
      for (let k = -1; k <= 1; k++) { if (tall) { ctx.moveTo(-wdt / 2, k * 16); ctx.lineTo(wdt / 2, k * 16); } else { ctx.moveTo(k * 16, -hgt / 2); ctx.lineTo(k * 16, hgt / 2); } }
      ctx.stroke();
      if (p.iron) {
        ctx.fillStyle = '#8a8d96';
        for (let k = -1; k <= 1; k += 2) for (let j = -1; j <= 1; j += 2) {
          ctx.beginPath(); ctx.arc(k * (tall ? 3.5 : 22), j * (tall ? 22 : 3.5), 1.9, 0, Math.PI * 2); ctx.fill();
        }
        // what it has left in it, scored across the face
        ctx.strokeStyle = PALETTE.fireHi; ctx.lineWidth = 2;
        for (let k = 0; k < (p.hits || 0); k++) {
          const o = (k - 1) * 9;
          ctx.beginPath();
          if (tall) { ctx.moveTo(-wdt / 2, o); ctx.lineTo(wdt / 2, o + 4); } else { ctx.moveTo(o, -hgt / 2); ctx.lineTo(o + 4, hgt / 2); }
          ctx.stroke();
        }
      }
      if (p.vault || p.gate) {
        // The wisp itself, painted small on the face: the door says what is behind it — or what
        // opens it — in the language of the thing itself, which is the only wording nobody has to
        // be taught. The gate's is violet and breathing; the vault's is the same shape, quieter.
        const a = p.gate ? 0.75 + 0.25 * Math.sin(this.t * 4) : 0.6;
        ctx.save(); ctx.rotate(tall ? Math.PI / 2 : 0); ctx.globalAlpha = a;
        ctx.fillStyle = PALETTE.witch; ctx.beginPath();
        ctx.moveTo(0, -7); ctx.bezierCurveTo(4, -2, 4.4, 3.4, 0, 5.4);
        ctx.bezierCurveTo(-4.4, 3.4, -4, -2, 0, -7); ctx.fill();
        ctx.fillStyle = PALETTE.witchHi; ctx.beginPath();
        ctx.moveTo(0, -3.6); ctx.bezierCurveTo(2, -1, 2.2, 1.8, 0, 3);
        ctx.bezierCurveTo(-2.2, 1.8, -2, -1, 0, -3.6); ctx.fill();
        ctx.restore(); ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = p.iron ? '#c9ccd4' : PALETTE.ochre;
        ctx.beginPath(); ctx.arc(0, 0, p.iron ? 4 : 3.2, 0, Math.PI * 2); ctx.fill();
      }
      if (p.pressure > 0.15) { ctx.strokeStyle = `rgba(192,57,43,${Math.min(0.8, p.pressure)})`; ctx.lineWidth = 2; ctx.strokeRect(-wdt / 2 - 2, -hgt / 2 - 2, wdt + 4, hgt + 4); }
      ctx.restore();
      // ...and a word over the top of it. The vault says what is behind it; the gate says what it
      // wants, which is the only instruction in the game that is also a reward.
      if (p.vault || p.gate) {
        ctx.save(); ctx.scale(1, 1 / TILT);
        ctx.font = `700 ${11}px ${FONT_SC}`; ctx.textAlign = 'center';
        ctx.fillStyle = p.gate ? `rgba(191,230,255,${0.55 + 0.3 * Math.sin(this.t * 3)})`
          : `rgba(255,224,138,${0.45 + 0.3 * Math.sin(this.t * 2.4)})`;
        ctx.fillText(p.gate ? (p.shopGate ? 'TAKE ONE OF HERS' : 'A SOUL OPENS IT') : 'SOUL', p.x, (p.y - 24) * TILT);
        ctx.textAlign = 'left'; ctx.restore();
      }
    } else if (p.kind === 'clamp') {
      this.drawClamp(p);
    } else if (p.kind === 'mouse') {
      this.drawMouse(p);
    } else if (p.kind === 'ware') {
      this.drawWare(p);
    } else if (p.kind === 'secret') {
      // This tile is already floor — `carveSecret` cut it that way so what is behind it is real
      // ground rather than a curtain — and the wall is the only lie. Full tile, the room's own wall
      // colour, so nothing under it gives it away before the crack does.
      const h = TILE / 2;
      ctx.fillStyle = p.wallColor; ctx.fillRect(p.x - h, p.y - h, TILE, TILE);
      // The level's wallTop as it is now, not as it was when the wall was cut: `ART_PASS` can change it.
      const def = this.game && this.game.level && this.game.level.def;
      ctx.fillStyle = (def && def.wallTop) || p.wallTop; ctx.fillRect(p.x - h, p.y - h, TILE, 6);
      // A hairline until it takes a blow, and a gap with chips out of it after — what "IT CRACKS"
      // said, on the wall itself.
      this.wallCrack(p.x, p.y, p.hits || 0);
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
      this.flame(p.x, p.y - 20, 8 + (p.phase * 2 % 2), p.phase);
    } else if (p.kind === 'spike') {
      // Not a thing standing in the room: a tile of the floor that is not floor. Iron grating laid
      // into the boards, with dark slots in it that the teeth come up through — so a stretch of them
      // reads as a piece of ground with an opinion rather than as furniture somebody left out.
      const S = TUNING.prop.spike, r = p.r;
      const state = p.spikeState, arming = state === 'armed';
      const out = state === 'up' ? clamp((S.up - p.spikeT) * 9, 0, 1)
        : state === 'down' ? clamp(p.spikeT / S.down, 0, 1) : 0;
      const shud = arming ? Math.sin(this.t * 70) * 1.1 * clamp(1 - p.spikeT / S.arm, 0, 1) : 0;
      const w = r, d = r * TILT;                                      // a whole tile, squashed like the floor
      ctx.save(); ctx.translate(p.x + shud, p.y);
      // the frame, sunk a little into the boards
      ctx.fillStyle = 'rgba(0,0,0,0.42)'; ctx.fillRect(-w, -d, w * 2, d * 2);
      // A touch lighter than before: the fog shade dims everything under it last of all, and a
      // grate this dark to begin with read as a floor stain rather than iron by the time a whole
      // band of them ran off into the part of the room he had not lit yet.
      ctx.fillStyle = arming ? '#4a4038' : '#453e35'; ctx.fillRect(-w + 1.5, -d + 1.5, w * 2 - 3, d * 2 - 3);
      // four slots across it: this is where the teeth live, and they are visible empty
      const slots = 4, sw = (w * 2 - 7) / slots;
      for (let k = 0; k < slots; k++) {
        const sx = -w + 3.5 + k * sw;
        ctx.fillStyle = '#0e0a0c'; ctx.fillRect(sx, -d + 3.5, sw * 0.55, d * 2 - 7);
        ctx.fillStyle = arming ? `rgba(255,224,138,${0.22 + 0.18 * Math.sin(this.t * 26 + k)})` : 'rgba(239,230,208,0.16)';
        ctx.fillRect(sx, -d + 3.5, sw * 0.55, 1.4);
      }
      // the rail along the near lip, so the grate has a thickness — brighter metal against the dark
      // frame is what keeps reading as iron rather than shadow the further it sits from the goat.
      ctx.fillStyle = arming ? PALETTE.ochre : '#948a7d'; ctx.fillRect(-w + 1.5, d - 3, w * 2 - 3, 1.6);
      if (out > 0) {
        const hgt = 22 * out;
        for (const [fill, half, lean] of [['#8d8a85', 3.6, 0], ['#d7d2c8', 1.2, -0.9]]) {
          ctx.fillStyle = fill;
          for (let k = 0; k < slots; k++) {
            const bx = -w + 3.5 + k * sw + sw * 0.27;
            ctx.beginPath(); ctx.moveTo(bx - half, d - 2);
            ctx.lineTo(bx + lean, d - 2 - hgt); ctx.lineTo(bx + half * 0.3, d - 2); ctx.closePath(); ctx.fill();
          }
        }
      }
      ctx.restore();
    } else if (p.kind === 'crate') {
      // A small wooden box, and that is the whole drawing: an outline, a face, a lit top edge and one
      // band across it. It was bigger and had planks, bands and a stud on it, which is detail spent
      // saying nothing — a box has to read as *liftable* from across a room and nothing else, and
      // four shapes do that better than nine. It is the only thing on this floor you can pick up.
      const r = p.r;
      const lift = p.held ? 4 : 0, spin = p.flung ? Math.atan2(p.vy, p.vx) * 0.4 : 0;
      ctx.save(); ctx.translate(p.x, p.y - lift); ctx.rotate(spin);
      this.shadow(0, r * 0.5 + lift, r * 0.9, r * 0.5);
      ctx.fillStyle = '#3f2b18'; ctx.fillRect(-r, -r * 0.85, r * 2, r * 1.7);
      ctx.fillStyle = PALETTE.wood; ctx.fillRect(-r + 1.5, -r * 0.85 + 1.5, r * 2 - 3, r * 1.7 - 3);
      ctx.fillStyle = PALETTE.woodHi; ctx.fillRect(-r + 1.5, -r * 0.85 + 1.5, r * 2 - 3, 2.4);
      ctx.fillStyle = '#4a443c'; ctx.fillRect(-r + 1.5, -1.2, r * 2 - 3, 2.4);
      ctx.restore();
    } else if (p.kind === 'coop') {
      // Two tiles of slatted crate. The slats are the whole of it: a solid box is a crate and gets
      // picked up, and this is a thing you have to open. The gaps read as gaps because there is a
      // dark interior painted behind them and something pale moving about in it.
      const r = p.r, w = r * 2, h = r * 1.25;
      const shake = p.wobble > 0 ? Math.sin(this.t * 55) * p.wobble * 4 : 0;
      ctx.save(); ctx.translate(p.x + shake, p.y);
      this.shadow(0, h * 0.5, r * 0.95, r * 0.45);
      ctx.fillStyle = '#231710'; ctx.fillRect(-r, -h * 0.5, w, h);             // the dark inside
      // The bird in there, shifting about. She is the reason to break it, so she has to be visible.
      const bx = Math.sin(this.t * 1.3 + p.phase) * r * 0.35;
      if (!p.holds || p.holds === 'chicken') {
        ctx.fillStyle = PALETTE.hen;
        ctx.beginPath(); ctx.ellipse(bx, 1, 7, 6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = PALETTE.comb; ctx.fillRect(bx - 1.5, -7, 3, 2.5);
      } else {
        // Any other animal is drawn by its own drawer, small, pacing behind the slats — a stand-in
        // object rather than the real prop, which does not exist until the coop is broken.
        ctx.save(); ctx.beginPath(); ctx.rect(-r, -h * 0.5, w, h); ctx.clip();
        ctx.translate(bx, 2); ctx.scale(0.8, 0.8);
        const pet = { x: 0, y: 0, kind: p.holds, r: TUNING.prop[p.holds].r, vx: Math.cos(this.t * 1.3 + p.phase) * 20, vy: 0,
          bob: this.t * 2 + p.phase, phase: p.phase, tuckT: 0, honkT: 0 };
        if (p.holds === 'tortoise') this.drawTortoise(pet);
        else if (p.holds === 'goose') this.drawGoose(pet);
        else if (p.holds === 'crow') this.drawCrow(pet);
        else if (p.holds === 'horse') { ctx.scale(0.62, 0.62); this.horseSprite(ctx, Math.cos(this.t * 1.3 + p.phase) > 0 ? 0 : Math.PI, true, 'idle'); }
        ctx.restore();
      }
      // The slats over her, and the frame round them.
      ctx.fillStyle = PALETTE.wood;
      for (let k = 0; k <= 5; k++) ctx.fillRect(-r + 2 + k * ((w - 4) / 5) - 1.3, -h * 0.5, 2.6, h);
      ctx.fillStyle = PALETTE.woodHi;
      ctx.fillRect(-r, -h * 0.5, w, 3); ctx.fillRect(-r, h * 0.5 - 3, w, 3);
      ctx.strokeStyle = '#231710'; ctx.lineWidth = 2; ctx.strokeRect(-r, -h * 0.5, w, h);
      // One blow in: the frame is starting to come apart, so the second is worth trying.
      if ((p.hits || 0) > 0) {
        ctx.strokeStyle = 'rgba(20,14,10,0.8)'; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.moveTo(-r * 0.5, -h * 0.5); ctx.lineTo(r * 0.1, h * 0.5); ctx.stroke();
      }
      ctx.restore();
    } else if (p.kind === 'chicken') {
      this.drawHen(p);
    } else if (p.kind === 'tortoise') {
      this.drawTortoise(p);
    } else if (p.kind === 'goose') {
      this.drawGoose(p);
    } else if (p.kind === 'crow') {
      this.drawCrow(p);
    } else if (p.kind === 'horse') {
      this.drawHorse(p);
    } else if (p.kind === 'cage') {
      const h = TUNING.prop.cage.height;
      // Every headbutt the pen survives leaves the bars further out of true.
      const sgn = ((Math.round(p.x / 7) % 2) ? 1 : -1);
      // A bar the opening scene has laid flat lies over to the right, out of the way of the door.
      // Seven blows bend it a long way without laying it flat, so the last one still has somewhere to go.
      const lean = (p.hits || 0) * 0.05 * sgn + (p.wobble > 0 ? Math.sin(this.t * 62) * 0.06 : 0) + (p.gate || 0) * 1.5;
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
    } else if (p.kind === 'weapon') {
      const up = p.inStand;
      if (up) {
        // The stand: two crossed legs and a rail. A faint glow, because a room full of bodies and
        // braziers will otherwise swallow a sword-sized object entirely.
        const gl = ctx.createRadialGradient(p.x, p.y - 12, 0, p.x, p.y - 12, 40);
        const a = 0.14 + 0.05 * Math.sin(this.t * 2.6 + p.phase);
        gl.addColorStop(0, `rgba(239,230,208,${a})`); gl.addColorStop(1, 'rgba(239,230,208,0)');
        ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(p.x, p.y - 12, 40, 0, Math.PI * 2); ctx.fill();
        this.shadow(p.x, p.y, 14, 6);
        ctx.strokeStyle = PALETTE.wood; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x - 11, p.y + 3); ctx.lineTo(p.x + 7, p.y - 20);
        ctx.moveTo(p.x + 11, p.y + 3); ctx.lineTo(p.x - 7, p.y - 20);
        ctx.stroke();
        ctx.strokeStyle = PALETTE.woodHi; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(p.x - 12, p.y - 11); ctx.lineTo(p.x + 12, p.y - 11); ctx.stroke();
      } else this.shadow(p.x, p.y, 10, 5);
      ctx.save();
      ctx.translate(p.x, p.y - (up ? 24 : 0));
      ctx.rotate(up ? (p.weapon === 'sword' ? -Math.PI / 2 : 0) : p.flung ? p.spin : (p.facing || 0));
      if (p.weapon === 'sword') {
        ctx.fillStyle = '#2a2622'; ctx.fillRect(-13, -1.8, 37, 4.4);       // the blade's own shadow
        ctx.fillStyle = '#b9b2a4'; ctx.fillRect(-4, -2.4, 26, 4.8);
        ctx.fillStyle = '#e8e2d2'; ctx.fillRect(-4, -2.4, 26, 1.8);
        ctx.beginPath(); ctx.moveTo(22, -2.4); ctx.lineTo(27, 0); ctx.lineTo(22, 2.4); ctx.closePath(); ctx.fill();
        ctx.fillStyle = PALETTE.wood; ctx.fillRect(-12, -2.8, 8, 5.6);     // grip
        ctx.fillStyle = PALETTE.ochre; ctx.fillRect(-5.5, -7, 3.2, 14);    // crossguard
        ctx.beginPath(); ctx.arc(-13, 0, 2.8, 0, Math.PI * 2); ctx.fill(); // pommel
      } else {
        const k = TUNING.prop.weapon.shieldScale; ctx.scale(k, k);
        ctx.fillStyle = '#2a2622'; ctx.beginPath(); ctx.ellipse(1, 1.5, 12, 13.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = PALETTE.wood; ctx.beginPath(); ctx.ellipse(0, 0, 12, 13.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#8d8a85'; ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.ellipse(0, 0, 10, 11.5, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = PALETTE.cult; ctx.fillRect(-1.8, -11, 3.6, 22);
        ctx.fillStyle = '#9d968c'; ctx.beginPath(); ctx.arc(0, 0, 4.4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(239,230,208,0.35)'; ctx.beginPath(); ctx.arc(-1.4, -1.4, 1.8, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      // What is left in a shield you are carrying: three studs, one per man or bullet it has in it.
      if (p.weapon === 'shield' && p.held && p.uses > 0) {
        const n = TUNING.prop.weapon.uses.shield;
        for (let k = 0; k < n; k++) {
          ctx.fillStyle = k < p.uses ? PALETTE.bone : 'rgba(239,230,208,0.22)';
          ctx.fillRect(p.x - (n * 5 - 2) / 2 + k * 5, p.y - 30, 3.2, 3.2);
        }
      }
    } else if (p.kind === 'heal') {
      const bob = Math.sin(this.t * 2.4 + p.phase) * 2;
      const glow = ctx.createRadialGradient(p.x, p.y + bob, 0, p.x, p.y + bob, 34);
      glow.addColorStop(0, 'rgba(168,189,108,0.22)'); glow.addColorStop(1, 'rgba(168,189,108,0)');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(p.x, p.y + bob, 34, 0, Math.PI * 2); ctx.fill();
      this.shadow(p.x, p.y + 4, 11, 5);
      if (p.big) {
        // The rare one, worth twice the milk: a patch of real dirt under it, since grass sprouting
        // straight out of the boards read as a decal laid over the floor rather than ground of its
        // own, then a few blades pushed up through it leaning together like something breathes on
        // them. Grazed, not grabbed — see the pickup in game.js.
        ctx.fillStyle = PALETTE.dirt; ctx.beginPath(); ctx.ellipse(p.x, p.y + 6, 16, 7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = PALETTE.dirtHi; ctx.beginPath(); ctx.ellipse(p.x, p.y + 4.5, 12.5, 5.4, 0, 0, Math.PI * 2); ctx.fill();
        for (let k = -3; k <= 3; k++) {
          const lean = Math.sin(this.t * 1.6 + p.phase + k) * 3, bx = p.x + k * 2.6;
          ctx.strokeStyle = k % 2 ? PALETTE.grassHi : PALETTE.grass; ctx.lineWidth = 2; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(bx, p.y + 5 + bob);
          ctx.quadraticCurveTo(bx + lean * 0.5, p.y - 4 + bob, bx + lean, p.y - 11 - Math.abs(k) * 0.6 + bob);
          ctx.stroke();
        }
      } else {
        // The ordinary one, a smaller sprout of the same grass rather than a bowl: a wooden bowl
        // standing on boards read as a piece of dressing furniture rather than as something that
        // heals, and the game already has one prop that IS a bowl (a lamp's oil dish). Same plant,
        // fewer blades and no dirt patch of its own, so the rare find two rooms later still reads
        // as more of it rather than as an unrelated thing.
        for (let k = -2; k <= 2; k++) {
          const lean = Math.sin(this.t * 1.6 + p.phase + k) * 2.2, bx = p.x + k * 2.2;
          ctx.strokeStyle = k % 2 ? PALETTE.grassHi : PALETTE.grass; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(bx, p.y + 5 + bob);
          ctx.quadraticCurveTo(bx + lean * 0.5, p.y - 2 + bob, bx + lean, p.y - 7 - Math.abs(k) * 0.5 + bob);
          ctx.stroke();
        }
      }
      if (p.graze > 0) {
        const frac = clamp(p.graze / TUNING.prop.heal.grazeTime, 0, 1);
        ctx.strokeStyle = 'rgba(168,189,108,0.85)'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(p.x, p.y + bob, 17, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); ctx.stroke();
      }
    }
    // There is no fallback branch any more. The one that was here drew an ochre disc for the pot,
    // and a disc on a floor of boards reads as a plate rather than as a thing you lift.
  }

  // The hen, in her three states. She has to read as an ally at a glance and as a projectile at a
  // glance, and those are two different silhouettes: walking she is upright and round with her head
  // up, flying she is stretched out along her own velocity with her wings back. The counter-squash
  // is the usual one — she stands on a tilted floor like everything else that stands.
  drawHen(p) {
    const ctx = this.ctx;
    const flying = p.birdState === 'flying', stunned = p.birdState === 'stunned';
    const a = flying ? Math.atan2(p.vy, p.vx) : 0;
    const bob = flying ? 0 : Math.sin(p.bob) * 1.6;
    this.shadow(p.x, p.y + 6, flying ? 6 : 8, flying ? 3 : 4.5);
    // World space is already squashed on Y here, so the translate is plain world coordinates and
    // the counter-scale after it is what stands her upright — the same pair every creature uses.
    ctx.save(); ctx.translate(p.x, p.y + bob); ctx.scale(1, 1 / TILT);
    if (flying) ctx.rotate(a);
    if (stunned) ctx.rotate(Math.PI * 0.4);           // over on her side, legs out
    // Feathers trailing off her while she is in the air: the only thing that says how fast she is.
    if (flying) {
      ctx.fillStyle = 'rgba(232,221,200,0.30)';
      for (let k = 1; k <= 3; k++) {
        ctx.beginPath(); ctx.ellipse(-k * 9, Math.sin(p.flap + k) * 2.5, 5 - k * 0.9, 3.4 - k * 0.7, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
    // The wings. Back and beating when she is flying, folded at her sides when she is not.
    const beat = Math.sin(p.flap) * (flying ? 5 : 1.6);
    ctx.fillStyle = PALETTE.henShade;
    ctx.beginPath(); ctx.ellipse(flying ? -3 : 0, -3 - beat, flying ? 7 : 5, 3.2, flying ? -0.5 : 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(flying ? -3 : 0, 3 + beat, flying ? 7 : 5, 3.2, flying ? 0.5 : 0, 0, Math.PI * 2); ctx.fill();
    // The body, stretched along the line of flight or round and sitting up.
    ctx.fillStyle = PALETTE.hen;
    ctx.beginPath(); ctx.ellipse(0, 0, flying ? 10 : 7.5, flying ? 5.5 : 7, 0, 0, Math.PI * 2); ctx.fill();
    // The tail, at the back of her whichever way she is pointing.
    ctx.fillStyle = PALETTE.henShade;
    ctx.beginPath(); ctx.moveTo(flying ? -9 : -6, flying ? 0 : -1);
    ctx.lineTo(flying ? -16 : -12, -6); ctx.lineTo(flying ? -14 : -10, 2); ctx.closePath(); ctx.fill();
    // The head, and the two warm marks that make her findable across a room.
    const hx = flying ? 9 : 5.5, hy = flying ? 0 : -6;
    ctx.fillStyle = PALETTE.hen; ctx.beginPath(); ctx.arc(hx, hy, 4.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PALETTE.comb;
    ctx.beginPath(); ctx.ellipse(hx - 0.5, hy - 4.4, 2.6, 1.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PALETTE.beak;
    ctx.beginPath(); ctx.moveTo(hx + 3.4, hy - 0.6); ctx.lineTo(hx + 7.4, hy + 0.4); ctx.lineTo(hx + 3.4, hy + 1.8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = PALETTE.ink; ctx.beginPath(); ctx.arc(hx + 1.4, hy - 0.8, 0.9, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // Stars over her while she picks herself up, the same as anything else that has been floored.
    if (stunned) this.drawStars(p.x, p.y, 14, Math.min(1, p.birdT * 2));
  }

  // A rank of iron spikes stood up along an arc of a body: the butcher's back, and nobody else's.
  spikeRing(r, from, to, n, len, color) {
    const ctx = this.ctx; ctx.fillStyle = color;
    for (let k = 0; k < n; k++) {
      const a = from + (to - from) * (n === 1 ? 0.5 : k / (n - 1));
      const c = Math.cos(a), s = Math.sin(a), w = len * 0.36;
      ctx.beginPath();
      ctx.moveTo(c * r - s * w, s * r + c * w);
      ctx.lineTo(c * (r + len), s * (r + len));
      ctx.lineTo(c * r + s * w, s * r - c * w);
      ctx.closePath(); ctx.fill();
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
      // The butcher wears what he is: iron spikes stood up along his back and shoulders, so the man
      // who takes three blows never has the same outline as the man who takes one.
      if (e.champion) this.spikeRing(r * 0.94, Math.PI * 0.42, Math.PI * 1.58, TUNING.champion.spikes, r * 0.46, '#8d8a85');
      ctx.fillStyle = e.kind === 'butcher' ? PALETTE.plum : e.champion ? '#3a2f38' : PALETTE.ink;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      if (e.champion) {
        ctx.strokeStyle = '#6d6a66'; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.arc(0, 0, r * 0.97, 0, Math.PI * 2); ctx.stroke();
      }
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
    // The slits in the mask are two dark squares, unless there is a soul in him: then they are lit,
    // and they are the close-range half of the tell the haze under him is the far-range half of.
    if (e.soul) {
      ctx.fillStyle = `rgba(192,57,43,${0.5 + 0.35 * Math.sin(this.t * 5)})`;
      ctx.beginPath(); ctx.arc(r * 0.54 + 1.7, -r * 0.3 + 1.7, 4.6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.54 + 1.7, r * 0.1 + 1.7, 4.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = PALETTE.blood;
    } else ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(r * 0.52, -r * 0.3, 3.4, 3.4); ctx.fillRect(r * 0.52, r * 0.1, 3.4, 3.4);
    if (e.kind === 'butcher') {   // horns on the mask
      ctx.strokeStyle = PALETTE.bone; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(r * 0.45, -r * 0.42); ctx.lineTo(r * 0.15, -r * 0.86);
      ctx.moveTo(r * 0.45, r * 0.42); ctx.lineTo(r * 0.15, r * 0.86); ctx.stroke();
    }
    // weapon
    let swing = 0;
    if (e.state === 'windup' || e.state === 'slamwind') swing = -1.3; else if (e.state === 'swing') swing = 1.1 - e.timer * 6; else if (e.state === 'recover') swing = 0.6;
    if (e.flail > 0) swing = Math.sin(this.t * 26) * 1.5;
    if (e.kind === 'bearer' && e.knife) {
      // The one who comes for her carries the boning knife from beside the altar, not a club.
      ctx.save(); ctx.translate(r * 0.35, r * 0.62); ctx.rotate(swing * 0.5);
      ctx.fillStyle = '#4a3420'; ctx.fillRect(-3, -2.6, 9, 5.2);
      ctx.fillStyle = '#c9c2b5';
      ctx.beginPath(); ctx.moveTo(6, -2.6); ctx.lineTo(19, -3); ctx.lineTo(25, 0); ctx.lineTo(19, 2.4); ctx.lineTo(6, 2.2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = PALETTE.bloodDark; ctx.fillRect(12, -0.5, 11, 2.2);
      ctx.restore();
    } else if (e.kind === 'bearer') {
      ctx.save(); ctx.rotate(swing); ctx.lineCap = 'round';
      if (e.champion) {
        // The butcher's club is a post with iron through it, and it is thicker than his arm.
        ctx.strokeStyle = '#6b4a2c'; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.moveTo(r * 0.3, r * 0.6); ctx.lineTo(r + 17, r * 0.6); ctx.stroke();
        ctx.fillStyle = '#9d968c';
        for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(r + 4 + k * 6, r * 0.6, 2.4, 0, Math.PI * 2); ctx.fill(); }
      } else {
        ctx.strokeStyle = PALETTE.ochre; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(r * 0.3, r * 0.6); ctx.lineTo(r + 13, r * 0.6); ctx.stroke();
      }
      ctx.restore();
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
      // The aim tell itself moved to `drawAimTelegraph`, called for every hunter whether the
      // painted sprite or this primitive body drew him.
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
  // The wraith. As mist it is a pale hooded shape with a streaming tail, a soft rim and no shadow
  // under it; the instant it commits it gathers in, hardens — dark edge, dark hood, a shadow — and
  // that hardening is the only warning the goat gets. It has to be legible as mist or the level is
  // unfair: you cannot choose which way to face if you cannot see what is circling you.
  drawWraith(e, r) {
    const ctx = this.ctx;
    const born = e.state === 'manifest' ? 1 - Math.max(0, e.timer) / TUNING.wraith.manifest : (e.ghosted ? 0 : 1);
    const wave = Math.sin(this.t * 2.2 + e.driftPhase);
    const a = 0.55 + born * 0.42;
    const puff = 1.16 - born * 0.16;   // it billows while it drifts and draws itself in to strike
    ctx.save();
    ctx.globalAlpha = a;
    if (born < 1) {
      const gl = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 2.6);
      gl.addColorStop(0, 'rgba(125,92,255,0.3)'); gl.addColorStop(1, 'rgba(125,92,255,0)');
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, 0, r * 2.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.scale(puff, puff);
    // the shroud: a hood at the front, and the rest of it trailing away behind and wavering
    const tail = -r * (2.3 + wave * 0.22);
    const grad = ctx.createLinearGradient(tail, 0, r, 0);
    grad.addColorStop(0, 'rgba(107,80,190,0.04)');
    grad.addColorStop(0.45, born > 0.5 ? '#5b44b4' : 'rgba(143,116,240,0.62)');
    grad.addColorStop(1, born > 0.5 ? '#b9a6ff' : '#d8ecff');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(tail, wave * 3);
    ctx.quadraticCurveTo(-r * 0.7, -r * (1.25 + wave * 0.12), r * 0.42, -r * 0.86);
    ctx.quadraticCurveTo(r * 0.98, 0, r * 0.42, r * 0.86);
    ctx.quadraticCurveTo(-r * 0.7, r * (1.25 - wave * 0.12), tail, wave * 3);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = born > 0.15 ? 'rgba(28,20,56,0.85)' : 'rgba(216,236,255,0.45)';
    ctx.lineWidth = born > 0.15 ? 1.7 : 1.1; ctx.stroke();
    // the dark under the hood, and the two cold points that are not eyes
    ctx.fillStyle = born > 0.15 ? '#191230' : 'rgba(44,32,88,0.5)';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.74, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = born > 0.6 ? PALETTE.witchHi : 'rgba(191,230,255,0.7)';
    ctx.beginPath(); ctx.ellipse(r * 0.32, -r * 0.3, 2.5, 2, -0.25, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(r * 0.32, r * 0.3, 2.5, 2, 0.25, 0, Math.PI * 2); ctx.fill();
    // the arm it is bringing down, and the one it has just brought down
    if (e.state === 'windup' || e.state === 'swing') {
      const sw = e.state === 'swing' ? 0.9 : -0.5 - 0.5 * (1 - e.timer / TUNING.wraith.windup);
      ctx.save(); ctx.rotate(sw);
      ctx.strokeStyle = PALETTE.witchHi; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(r * 0.3, 0); ctx.lineTo(r * 1.8, 0); ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    // A ring thrown on the ground the moment it becomes real. The tell has to carry across the room
    // the goat is not looking at.
    if (e.state === 'manifest') {
      ctx.save(); ctx.globalAlpha = 0.85 * (1 - born);
      ctx.strokeStyle = PALETTE.witchHi; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, r + 34 * born, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }

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
    ctx.fillStyle = e.soul ? PALETTE.blood : PALETTE.fireHi;    // eyes: the only light in him
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

  // A man lying in the grass who has not got up yet is half there: faded, and the blades drawn
  // over him afterwards take the rest.
  lurking(e, game) {
    return e.lurk && !e.aware && game.world.grass[Math.floor(e.y / TILE) * game.world.W + Math.floor(e.x / TILE)];
  }

  drawEnemy(e, game) {
    const ctx = this.ctx;
    if (!e.grassDraw && this.lurking(e, game)) {
      e.grassDraw = true; ctx.save(); ctx.globalAlpha *= TUNING.grass.lurkAlpha;
      this.drawEnemy(e, game);
      ctx.restore(); e.grassDraw = false; return;
    }
    // A hidden wraith is whatever it is pretending to be, drawn exactly as the real one is.
    if (e.state === 'hidden') { if (e.disguise) this.drawProp(e.disguise); return; }
    const lying = e.state === 'floored' || e.state === 'stunned';
    // The world pass has laid everyone's floor marks already, under every body (`groundDone`).
    if (!this.groundDone) this.drawEnemyGround(e, game, true);
    if (!e.ghosted) this.shadow(e.x, e.y, e.r * (lying ? 1.4 : 1.05), e.r * (lying ? 0.5 : 0.42));
    this.drawEnemyBody(e, game, lying);
  }

  // What a man lays on the floor rather than stands in: his windup's strip, the rifle's line, the
  // ogre's landing mark, a soul's haze. Off for THE DARK's silhouette pass, which draws them again
  // over the dark itself (`Dark.readable`). `inside` is the call from `drawEnemy`, already faded.
  drawEnemyGround(e, game, inside) {
    if (this.silPass || e.state === 'hidden') return;
    const ctx = this.ctx;
    ctx.save();
    if (!inside && this.lurking(e, game)) ctx.globalAlpha *= TUNING.grass.lurkAlpha;
    this.drawTelegraph(e); this.drawAimTelegraph(e); this.drawHopMark(e);
    // The man with a soul in him. Which boss is carrying one is decided before the level starts and
    // was, until now, something you found out by killing him: two Butchers in a run looked the same
    // and one of them was worth a verb. He glows — a low amber haze that breathes, the colour of the
    // thing he will drop — and his eyes come up red. Neither costs him anything in a fight; both are
    // readable across a room, which is the whole job. `drawCultist` and `drawHound` read `e.soul`
    // for the eyes, and this is the haze under him.
    if (e.soul && !e.dead && !e.ghosted && !this.silPass) {
      const pulse = 0.5 + 0.5 * Math.sin(this.t * 2.6 + e.x * 0.01);
      const R = e.r * 3.1;
      const halo = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, R);
      halo.addColorStop(0, `rgba(255,224,138,${0.3 + 0.16 * pulse})`);
      halo.addColorStop(0.45, `rgba(242,162,51,${0.15 + 0.08 * pulse})`);
      halo.addColorStop(1, 'rgba(242,162,51,0)');
      ctx.fillStyle = halo; ctx.beginPath(); ctx.ellipse(e.x, e.y, R, R * TILT, 0, 0, Math.PI * 2); ctx.fill();
      // and a thin ring at his feet, which is what survives being seen across a lit room
      ctx.strokeStyle = `rgba(255,224,138,${0.3 + 0.25 * pulse})`; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.ellipse(e.x, e.y + e.r * 0.5, e.r * 1.25, e.r * 1.25 * TILT, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  // How far into a telegraph he is, 0..1, eased by `windupTint.curve`. Every windup counts its
  // `timer` down from whatever it was given (slowed by COLD EYE and the like), so the full length is
  // read off the timer the frame the state began — or began again with a fresh timer — rather than
  // asked of every kind's own TUNING key. Render only: `windState` / `windFull` are the picture's.
  windupGlow(e) {
    const W = TUNING.juice.windupTint;
    if (!W || !(W.max > 0) || e.dead || e.held || e.ghosted || !W.states.includes(e.state)) { e.windState = null; return 0; }
    if (e.windState !== e.state || e.timer > e.windFull) { e.windState = e.state; e.windFull = Math.max(1e-3, e.timer); }
    return Math.pow(clamp(1 - e.timer / e.windFull, 0, 1), W.curve);
  }

  drawEnemyBody(e, game, lying) {
    const ctx = this.ctx;
    const paintedKey = PIXEL_ART.ready && this.painted.characterKey(e);
    // `character()` already anchors each sheet at its own measured foot line (walk-cycle and static
    // "Facing" art sit at different heights in their 128px cell) — nothing needs nudging again here.
    ctx.save(); ctx.translate(e.x, e.y); ctx.scale(1, 1 / TILT);
    if (e.state === 'flung') ctx.rotate(this.t * 14); else if (!paintedKey) ctx.rotate(e.facing);
    if (e.state === 'stagger') ctx.translate(Math.sin(this.t * 60) * 2, 0);
    // The rat ogre's and the Butcher's leap: up off the floor over his own shadow, and a crouch before it.
    if (e.state === 'hop' && e.hopZ) ctx.translate(0, -e.hopZ);
    if (e.state === 'hopwind') ctx.scale(1.1, 0.86);
    if (e.dazed > 0) ctx.rotate(Math.sin(this.t * 24) * 0.12);
    if (e.state === 'chargewind') ctx.translate(-4 + Math.sin(this.t * 50) * 3, Math.cos(this.t * 47) * 2);
    const r = e.r;
    const sc = this.bodyScale(e); if (sc !== 1) ctx.scale(sc, sc);
    if (lying) ctx.scale(1.35, 0.7);

    const body = () => {
      if (paintedKey) this.painted.character(this,e,paintedKey,e.kind==='butcher'?58:e.kind==='dog'?42:e.kind==='seer'?38:42);
      else if (e.kind === 'dog') this.drawHound(e);
      else if (e.kind === 'wraith') this.drawWraith(e, r);
      else if (e.kind === 'ratogre') this.drawRatOgre(e, r);
      else this.drawCultist(e, r);
    };
    // A boss's outline goes down first, under him: the dark `back` line one px further out, then
    // the yellow. Not in THE DARK's silhouette pass, which cuts him to a flat shape anyway.
    if (Renderer.isBoss(e) && !e.dead && !this.silPass) {
      const L = TUNING.boss.outline;
      ctx.save(); ctx.globalAlpha *= L.alpha;
      if (L.back) this.bossOutline(body, L.px * 2, L.back);
      this.bossOutline(body, L.px, L.color);
      ctx.restore();
    }
    body();
    // The windup tint: the same body again as a warm pale silhouette, rising toward the blow
    // (`TUNING.juice.windupTint`). Masked to his own pixels by the filter, so no glow leaves him.
    // Not in THE DARK's silhouette pass, which flattens him anyway.
    const wind = this.silPass ? 0 : this.windupGlow(e);
    if (wind > 0) {
      const W = TUNING.juice.windupTint;
      ctx.save(); ctx.globalAlpha *= wind * W.max; ctx.filter = `brightness(0) invert(1) sepia(1) saturate(${W.warm})`;
      body(); ctx.restore();
    }
    // The hit flash: the same body again, burnt to a white silhouette. It used to be a disc laid
    // over him, which read as a light going off near him rather than as him being struck.
    if (e.flash > 0) {
      ctx.save(); ctx.globalAlpha = Math.min(0.9, e.flash * 10); ctx.filter = 'brightness(0) invert(1)';
      body(); ctx.restore();
    }
    // Shock: poison and stun at once, one mark for both — a green-and-gold spiral over his head,
    // turning, in place of the stars and the bubbles, so the pair reads as one state.
    if (e.shock > 0) {
      // Half the size it was: at 16 px across it covered the man it was a label on.
      ctx.save(); ctx.translate(0, -r - 9); ctx.rotate(this.t * 6);
      ctx.lineWidth = 1.8; ctx.lineCap = 'round';
      for (let k = 0; k < 2; k++) {
        ctx.strokeStyle = k ? PALETTE.venomHi : PALETTE.fireHi;
        ctx.beginPath();
        for (let a = 0; a < Math.PI * 3.2; a += 0.3) {
          const rr = 1 + a * 0.8, aa = a + k * Math.PI;
          if (a === 0) ctx.moveTo(Math.cos(aa) * rr, Math.sin(aa) * rr * 0.6); else ctx.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr * 0.6);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
    // Stars: he heard the scream and is still hearing it.
    else if (e.dazed > 0) {
      ctx.fillStyle = PALETTE.fireHi;
      for (let k = 0; k < 3; k++) {
        const a = this.t * 7 + k * 2.1;
        ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.5 - r - 5, 3, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Poisoned: a green film over the eyes and bubbles coming off him. Blind and slow reads at once.
    if (e.poison > 0 && !(e.shock > 0)) {
      const a = Math.min(1, e.poison * 1.5);
      ctx.globalAlpha = 0.55 * a; ctx.fillStyle = PALETTE.venom;
      ctx.beginPath(); ctx.ellipse(0, -r * 0.35, r * 0.8, r * 0.28, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = PALETTE.venomHi;
      for (let k = 0; k < 3; k++) {
        const ph = (this.t * 0.8 + k / 3) % 1;
        ctx.globalAlpha = a * (1 - ph);
        ctx.beginPath(); ctx.arc(Math.sin(k * 2.4 + this.t * 2) * r * 0.6, -r - 2 - ph * 16, 2 + ph * 1.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    if (e.burning > 0) this.flame(0, -4, 12, e.x, e.witchBurn);
    ctx.restore();
    if (this.silPass) return;
    if (this.overheads) this.overheads.push({ e, a: ctx.globalAlpha }); else this.drawOverhead(e);
  }

  // What hangs over a man's head: the search mark, his bark, a bomb's fuse, his notches. Its own
  // method so THE DARK can lay it back over the dark (`Dark.readable`) — a shout is heard, not seen.
  // `placed` is the plates already drawn this frame: two men a step apart shouting at once had their
  // words printed over each other, and a later plate steps up clear of an earlier one.
  drawOverhead(e, placed) {
    const ctx = this.ctx;
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
    // Small on purpose: what a man shouts is colour, not information the fight turns on, and at the
    // old size two of them in a room covered more of it than the men did. It sits over his head and
    // over his notches, never across his face.
    const head = this.spriteHead(e), notched = e.maxHp > 1 && !e.ghosted;
    if (e.say && !e.dead) {
      const a = Math.max(0, Math.min(1, e.say.life / 0.4, (e.say.max - e.say.life) / 0.08));
      ctx.save(); ctx.scale(1, 1 / TILT);
      let by = e.y * TILT - head - (notched ? 14 : 7);
      ctx.font = `700 ${e.kind === 'butcher' ? 11 : 9.5}px ${FONT_SC}`;
      ctx.textAlign = 'center';
      const tw = ctx.measureText(e.say.text).width;
      // Where the world pass put it (`sayLift`) is where THE DARK lays it again.
      if (placed) {
        const hits = (p) => Math.abs(p.x - e.x) < (p.w + tw + 8) / 2 + 1 && Math.abs(p.y - by) < 13;
        let lift = 0;
        for (let k = 0; k < 4 && placed.some(hits); k++) { by -= 13; lift += 13; }
        placed.push({ x: e.x, y: by, w: tw + 8 }); e.sayLift = lift;
      } else by -= e.sayLift || 0;
      ctx.globalAlpha = a * 0.7; ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(e.x - tw / 2 - 4, by - 9, tw + 8, 12);
      ctx.beginPath(); ctx.moveTo(e.x - 3, by + 3); ctx.lineTo(e.x + 3, by + 3); ctx.lineTo(e.x, by + 6); ctx.fill();
      ctx.globalAlpha = a;
      ctx.fillStyle = e.kind === 'seer' ? PALETTE.witchHi : e.kind === 'butcher' ? PALETTE.blood : PALETTE.bone;
      ctx.fillText(e.say.text, e.x, by);
      ctx.globalAlpha = 1; ctx.textAlign = 'left'; ctx.restore();
    }

    if (e.bombFuse > 0) {
      const p = 1 - e.bombFuse / TUNING.goat.bomb.fuse;
      ctx.strokeStyle = `rgba(255,224,138,${0.5 + 0.5 * Math.sin(this.t * 40)})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 5 + p * 8, 0, Math.PI * 2); ctx.stroke();
    }
    // Health notches over anyone who takes more than one blow — a boss (the outline) and the rat ogre —
    // so what is left of him reads off his own head instead of off a text popup.
    // Measured off the top of the sprite he is actually drawn as: `e.r` is his footprint, and off
    // that the notches landed across a pixel mage's eyes.
    if (notched) {
      const max = e.maxHp, wdt = clamp(e.r * 0.5, 6, 9), gap = 3.5, total = max * wdt + (max - 1) * gap;
      const top = e.y - (head + 6) / TILT;
      for (let i = 0; i < max; i++) {
        const x = e.x - total / 2 + i * (wdt + gap);
        ctx.fillStyle = 'rgba(13,10,12,0.55)'; ctx.fillRect(x - 1, top - 1, wdt + 2, 6.5);
        ctx.fillStyle = i < e.hp ? PALETTE.blood : 'rgba(239,230,208,0.22)';
        ctx.fillRect(x, top, wdt, 4.5);
      }
    }
  }

  // How far above his foot the top of his sprite stands, in screen px: the pixel unit's own extent
  // where he has one, otherwise what the old painted bodies came to off his footprint.
  spriteHead(e) {
    const key = this.painted.characterKey(e), u = key && PIXEL_ART.unit(key);
    return (u ? PIXEL_EXTENT[u] : e.r * 2.3) * this.bodyScale(e) + (e.state === 'hop' && e.hopZ ? e.hopZ : 0);
  }
  // How much bigger than his sheet a man is drawn: his kind's own fit to its sheet (the butcher on
  // the old Butcher's 48 px sheet, the ogre on his own), times `boss.scale` for a boss — one rule
  // for every kind (`TUNING.boss`). Static, so THE DARK's eyes (js/dark.js) sit on the same head.
  static bodyScaleOf(e) {
    const kind = e.kind === 'butcher' ? TUNING.butcher.scale : e.champion ? TUNING.champion.scale : 1;
    return kind * (Renderer.isBoss(e) ? TUNING.boss.scale : 1);
  }
  bodyScale(e) { return Renderer.bodyScaleOf(e); }
  // Who wears the outline: a boss, of any kind. The rat ogre is the mouse's, not a boss, and his
  // `boss` flag is cleared where she calls him (`Shop.spawnOgre`), so this is the flag alone.
  static isBoss(e) { return !!e.boss && e.kind !== 'ratogre'; }

  // The boss's outline (`TUNING.boss.outline`): his own body drawn again as a flat silhouette `px`
  // out on each of eight sides, behind him — a hard ring of pixels round the sprite, never a glow.
  // Flat colour with no filter: the body is drawn far off the canvas and only its shadow lands
  // where he stands, and a canvas shadow is one exact colour, blur 0, offset in device px (which is
  // why each side's offset is pushed through the transform by hand).
  bossOutline(body, px, color) {
    const ctx = this.ctx, m = ctx.getTransform(), OFF = 20000;
    ctx.save();
    ctx.shadowColor = color; ctx.shadowBlur = 0; ctx.shadowOffsetX = OFF; ctx.shadowOffsetY = 0;
    for (let i = 0; i < 8; i++) {
      const ox = Math.round(Math.cos(i * Math.PI / 4)) * px, oy = Math.round(Math.sin(i * Math.PI / 4)) * px;
      ctx.setTransform(m.a, m.b, m.c, m.d, m.e + m.a * ox + m.c * oy - OFF, m.f + m.b * ox + m.d * oy);
      body();
    }
    ctx.restore();
  }

  // Enemies wind up slowly and show the ground they are about to cover.
  drawTelegraph(e) {
    if (e.state === 'slamwind') { this.drawSlamRing(e); return; }
    if (e.kind === 'dog' || (e.state !== 'windup' && e.state !== 'chargewind')) return;
    const ctx = this.ctx, cfg = TUNING[e.kind];
    if (ART_PASS.on) { this.drawTelegraphCells(e, cfg); return; }
    ctx.save(); ctx.translate(e.x, e.y); ctx.scale(1, 1 / TILT); ctx.rotate(e.facing);
    if (e.state === 'chargewind') {
      // The strip is the butcher's run as he will actually make it: to where he is aiming
      // (`Enemy.leadAim`, where the goat is going) and `over` past it.
      const C = TUNING.champion.charge, g = e.chargeAim || this.game.goat, run = Math.hypot(g.x - e.x, g.y - e.y) + C.over * TILE;
      const p = clamp(1 - e.timer / C.wind, 0, 1), len = Math.min(C.speed * C.time, run);
      // As wide as the run lands (`charge.hit` past his body), so the strip is the lane to get out of.
      const w = e.r + C.hit;
      ctx.fillStyle = `rgba(192,57,43,${0.08 + 0.16 * p})`;
      ctx.fillRect(0, -w, len * p, w * 2);
      ctx.strokeStyle = `rgba(239,230,208,${0.3 + 0.4 * p})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(len * p, -w); ctx.lineTo(len * p, w); ctx.stroke();
    } else {
      const p = 1 - e.timer / (e.atk ? e.atk('windup') : cfg.windup);
      const reach = (e.atk ? e.atk('reach') : cfg.reach) + e.r + 10, arc = e.kind === 'ratogre' ? cfg.arc : Math.PI * 0.55;
      ctx.fillStyle = `rgba(192,57,43,${0.09 + 0.2 * p})`;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, reach, -arc / 2, arc / 2); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = `rgba(239,230,208,${0.2 + 0.55 * p})`; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, 0, reach, -arc / 2, -arc / 2 + arc * p); ctx.stroke();
    }
    ctx.restore();
  }

  // The art pass's windups (`ART_PASS`): the same ground as `drawTelegraph`, laid as cells of the effect
  // grid in amber — the colour a floor never has and a cultist never wears, where blood red sat on
  // red robes and on red blood. Cells are counted off the man, unrotated, so they stay square on screen.
  drawTelegraphCells(e, cfg) {
    const ctx = this.ctx, px = TUNING.effects.pixel * 2, f = e.facing;
    const ux = Math.cos(f), uy = Math.sin(f);
    const fill = (test, n, color) => {
      ctx.fillStyle = color; ctx.beginPath();
      for (let j = -n; j <= n; j++) for (let i = -n; i <= n; i++) if (test((i + 0.5) * px, (j + 0.5) * px)) ctx.rect(i * px, j * px, px, px);
      ctx.fill();
    };
    ctx.save(); ctx.translate(e.x, e.y); ctx.scale(1, 1 / TILT);
    if (e.state === 'chargewind') {
      const C = TUNING.champion.charge, g = e.chargeAim || this.game.goat, run = Math.hypot(g.x - e.x, g.y - e.y) + C.over * TILE;
      const p = clamp(1 - e.timer / C.wind, 0, 1), len = Math.min(C.speed * C.time, run) * p, n = Math.ceil((len + e.r + C.hit) / px);
      const along = (x, y) => x * ux + y * uy, across = (x, y) => Math.abs(-x * uy + y * ux), w = e.r + C.hit;
      fill((x, y) => along(x, y) >= 0 && along(x, y) <= len && across(x, y) <= w, n, `rgba(242,170,48,${0.12 + 0.2 * p})`);
      fill((x, y) => along(x, y) > len - px && along(x, y) <= len && across(x, y) <= w, n, `rgba(255,224,138,${0.45 + 0.45 * p})`);
    } else {
      const p = 1 - e.timer / (e.atk ? e.atk('windup') : cfg.windup);
      const reach = (e.atk ? e.atk('reach') : cfg.reach) + e.r + 10, arc = e.kind === 'ratogre' ? cfg.arc : Math.PI * 0.55, n = Math.ceil(reach / px);
      const inArc = (x, y) => Math.abs(angleDiff(Math.atan2(y, x), f)) <= arc / 2;
      fill((x, y) => Math.hypot(x, y) <= reach && inArc(x, y), n, `rgba(242,170,48,${0.1 + 0.22 * p})`);
      // the rim fills round from one side as the blow comes, as the stroke did
      fill((x, y) => { const d = Math.hypot(x, y); if (d > reach || d < reach - px * 1.2 || !inArc(x, y)) return false;
        const a = angleDiff(f - arc / 2, Math.atan2(y, x)); return a >= 0 && a <= arc * p; }, n, `rgba(255,224,138,${0.35 + 0.6 * p})`);
    }
    ctx.restore();
  }

  // The Butcher's slam: the ring on the floor it will fill, filling in as he raises his fists.
  drawSlamRing(e) {
    const ctx = this.ctx, SL = TUNING.butcher.slam, R = SL.range * TILE, p = clamp(1 - e.timer / SL.wind, 0, 1);
    ctx.save(); ctx.translate(e.x, e.y);
    ctx.fillStyle = `rgba(192,57,43,${0.07 + 0.2 * p})`;
    ctx.beginPath(); ctx.arc(0, 0, R * p, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgba(239,230,208,${0.3 + 0.5 * p})`; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  // The hound's line: where the run goes, in red on the floor, brightening across the charge and
  // shortening behind him as he runs it. Drawn under everything that stands, with the runes.
  // The running trail from the goat to what opens the soul gate he just butted (`game.guide`): a
  // line of violet chevrons on the floor flowing toward it, thinning out at both ends, the whole
  // thing fading over its last second. The Hades way of saying "that, over there".
  drawGuide(game) {
    const G = game.guide; if (!G) return;
    const C = TUNING.soul.guide, g = game.goat, dx = G.ref.x - g.x, dy = G.ref.y - g.y, d = Math.hypot(dx, dy);
    if (d < C.gap * 1.5) return;
    const ux = dx / d, uy = dy / d, fade = Math.min(1, G.t) * Math.min(1, (C.time - G.t) * 4);
    const ctx = this.ctx, S = C.size, off = (this.t * C.speed) % C.gap;
    ctx.save(); ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let s = off + C.gap * 0.8; s < d - C.gap * 0.6; s += C.gap) {
      const a = fade * Math.min(1, s / (C.gap * 2)) * Math.min(1, (d - s) / (C.gap * 2));
      const x = g.x + ux * s, y = g.y + uy * s;
      ctx.strokeStyle = `rgba(20,10,30,${0.5 * a})`;
      for (const [w, col] of [[4, ctx.strokeStyle], [2.2, PALETTE.witchHi]]) {
        ctx.lineWidth = w; ctx.strokeStyle = col; ctx.globalAlpha = col === PALETTE.witchHi ? a : 1;
        ctx.beginPath();
        ctx.moveTo(x - ux * S - uy * S, y - uy * S + ux * S); ctx.lineTo(x, y); ctx.lineTo(x - ux * S + uy * S, y - uy * S - ux * S);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  drawDashPaths(game) {
    const ctx = this.ctx;
    for (const e of game.enemies) {
      if (e.dead || e.kind !== 'dog' || !e.dashPath || e.dashPath.length < 2 || game.hidden(e.x, e.y)) continue;
      if (e.state !== 'windup' && e.state !== 'dart') continue;
      const p = e.state === 'dart' ? 1 : clamp(1 - e.timer / TUNING.dog.windup, 0, 1), pts = e.dashPath;
      if (ART_PASS.on) { this.drawDashCells(e, pts, p); continue; }
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = `rgba(192,57,43,${0.18 + 0.3 * p})`; ctx.lineWidth = e.r * 1.6;
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (const q of pts) ctx.lineTo(q.x, q.y); ctx.stroke();
      ctx.strokeStyle = `rgba(232,80,60,${0.4 + 0.5 * p})`; ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]); ctx.lineDashOffset = -this.t * 60;
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (const q of pts) ctx.lineTo(q.x, q.y); ctx.stroke();
      ctx.setLineDash([]);
      // an arrowhead at the far end, so the line has a direction
      const a = pts[pts.length - 1], b = pts[pts.length - 2], ang = Math.atan2(a.y - b.y, a.x - b.x), h = 9;
      ctx.fillStyle = `rgba(232,80,60,${0.5 + 0.5 * p})`;
      ctx.beginPath(); ctx.moveTo(a.x + Math.cos(ang) * h, a.y + Math.sin(ang) * h);
      ctx.lineTo(a.x + Math.cos(ang + 2.4) * h, a.y + Math.sin(ang + 2.4) * h);
      ctx.lineTo(a.x + Math.cos(ang - 2.4) * h, a.y + Math.sin(ang - 2.4) * h); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }

  // The hound's run under the art pass: its band as amber cells on the world grid, the dashes marching
  // along its middle as lit cells, and a head of cells at the far end so the line still has a direction.
  drawDashCells(e, pts, p) {
    const ctx = this.ctx, px = TUNING.effects.pixel * 2, band = new Set(), mid = [], wr = Math.max(1, Math.round(e.r * 0.8 / px));
    let run = 0;
    for (let s = 1; s < pts.length; s++) {
      const a = pts[s - 1], b = pts[s], L = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.ceil(L / px));
      for (let k = 0; k < n; k++) {
        const x = a.x + (b.x - a.x) * k / n, y = a.y + (b.y - a.y) * k / n, cx = Math.round(x / px), cy = Math.round(y / px);
        for (let j = -wr; j <= wr; j++) for (let i = -wr; i <= wr; i++) if (i * i + j * j <= wr * wr + 0.5) band.add((cx + i) + ',' + (cy + j));
        mid.push([cx, cy, run]); run += L / n;
      }
    }
    const cells = (list, color) => { ctx.fillStyle = color; ctx.beginPath(); for (const c of list) { const [i, j] = typeof c === 'string' ? c.split(',').map(Number) : c; ctx.rect(i * px - px / 2, j * px - px / 2, px, px); } ctx.fill(); };
    cells(band, `rgba(242,170,48,${0.12 + 0.2 * p})`);
    const off = this.t * 60;
    cells(mid.filter((m) => ((m[2] + off) % 14) < 8), `rgba(255,224,138,${0.4 + 0.5 * p})`);
    const a = pts[pts.length - 1], b = pts[pts.length - 2], ang = Math.atan2(a.y - b.y, a.x - b.x), head = [];
    for (let r = 0; r < 4; r++) for (let w = -r; w <= r; w++) {
      const d = 3 - r;
      head.push([Math.round((a.x + Math.cos(ang) * d * px - Math.sin(ang) * w * px) / px), Math.round((a.y + Math.sin(ang) * d * px + Math.cos(ang) * w * px) / px)]);
    }
    cells(head, `rgba(255,224,138,${0.5 + 0.5 * p})`);
  }

  // A hunter's shot is the one thing in the game you cannot see coming without this: the dashed
  // line grows and brightens across `hunter.aimTime` before he fires. It used to live inside
  // `drawCultist` and only a hunter drawn by that primitive fallback ever showed it — once the
  // painted sprite took over his body (`characterKey` returns 'hunter'), the tell silently went
  // dark and a rifle became a hitscan nobody could read. Drawn here, once, for either body.
  // Where the rat ogre or the Butcher is coming down: a ring on the floor from the moment he
  // crouches, filling as he nears it. It is his windup, drawn where it lands rather than on him.
  drawHopMark(e) {
    if ((e.kind !== 'ratogre' && e.kind !== 'butcher') || (e.state !== 'hopwind' && e.state !== 'hop') || !e.hopTo) return;
    const H = e.kind === 'butcher' ? TUNING.butcher.leap : TUNING.ratogre.hop, ctx = this.ctx, R = H.radius * TILE;
    const p = e.state === 'hopwind' ? 0.25 * (1 - e.timer / H.wind) : 0.25 + 0.75 * (1 - e.timer / H.air);
    ctx.save();
    ctx.strokeStyle = `rgba(192,57,43,${0.35 + 0.5 * p})`; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(e.hopTo.x, e.hopTo.y, R, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = `rgba(192,57,43,${0.08 + 0.2 * p})`;
    ctx.beginPath(); ctx.arc(e.hopTo.x, e.hopTo.y, R * clamp(p, 0, 1), 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  drawAimTelegraph(e) {
    if (e.kind !== 'hunter' || (e.state !== 'aim' && !e.held)) return;
    const ctx = this.ctx, r = e.r;
    // In world space and not counter-squashed like a sprite: the line lies on the floor, so it has
    // to be squashed the way the floor is or it points past the goat on every diagonal.
    ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.facing);
    const p = e.state === 'aim' ? 1 - e.timer / TUNING.hunter.aimTime : 0.5;
    // The line comes out of the man himself, down the line the round will actually take (the bullet
    // leaves from his centre line, not from the hand the rifle is drawn in), and it reaches the goat
    // from the first frame of the aim: what grows is how sure it is, not how long. It used to start a
    // tile out in front of him and crawl outward, so it read as a thing floating in the room rather
    // than as a man pointing a rifle.
    const g = this.game && this.game.goat;
    const reach = g ? Math.min(Math.hypot(g.x - e.x, g.y - e.y), TUNING.hunter.sight * TILE * 1.6) : 10 * TILE;
    ctx.strokeStyle = `rgba(192,57,43,${0.25 + p * 0.65})`; ctx.lineWidth = 1.2 + p * 1.2;
    ctx.setLineDash([7, 6]); ctx.lineDashOffset = -this.t * 40;
    ctx.beginPath(); ctx.moveTo(r * 0.7, 0); ctx.lineTo(reach, 0); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = `rgba(192,57,43,${0.3 + p * 0.6})`;
    ctx.beginPath(); ctx.arc(reach, 0, 2 + p * 2.5, 0, Math.PI * 2); ctx.fill();
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

  // A lit bomb's fuse, as the ring it will reach laid on the floor in cells: the unburnt part a
  // faint amber track, the burnt part a yellow rim (the windups' colour) closing round from the top,
  // whole on the frame it goes off. Read off `fuseT` against the fuse it was given, clamped.
  drawBombFuse(game) {
    const ctx = this.ctx, B = TUNING.prop.bomb, R = B.ring, c = R.cell;
    for (const p of game.props) {
      if (p.kind !== 'bomb' || p.broken || !(p.fuseT >= 0) || game.hidden(p.x, p.y)) continue;
      const f = clamp(1 - p.fuseT / B.fuse, 0, 1), r = B.blastR, n = Math.max(24, Math.ceil(Math.PI * 2 * r / c));
      const shut = Math.ceil(f * n), cx = Math.round(p.x / c) * c, cy = Math.round(p.y / c) * c;
      const lay = (from, to, color) => {
        ctx.fillStyle = color; ctx.beginPath();
        for (let i = from; i < to; i++) {
          const a = -Math.PI / 2 + i / n * Math.PI * 2;
          ctx.rect(cx + Math.round(Math.cos(a) * r / c) * c - c / 2, cy + Math.round(Math.sin(a) * r / c) * c - c / 2, c, c);
        }
        ctx.fill();
      };
      lay(shut, n, `rgba(242,170,48,${R.track})`);
      const hot = f > 0.8 ? 0.75 + 0.25 * Math.sin(this.t * R.blink) : 1;
      ctx.globalAlpha = R.rim * hot; lay(0, shut, PALETTE.fireHi); ctx.globalAlpha = 1;
    }
  }

  // The Seer's rune, burning in on the floor where you were standing — or, if you are carrying him,
  // on the floor under his own feet, which is the floor under yours.
  drawRunes(game) {
    const ctx = this.ctx;
    for (const e of game.enemies) {
      if (e.dead || !e.rune || (e.state !== 'cast' && e.state !== 'held')) continue;
      // How far into the cast he is. It is measured against the windup he was actually given —
      // `castWind * mods.enemySlow`, which is 1.1 of it by default and 1.4 in EASY MODE — and not
      // against the raw TUNING number. Against the raw one this starts NEGATIVE (a tenth under
      // zero, four tenths on easy) for the first fraction of every rune, and the filled disc below
      // is `arc(0, 0, R * p)`: a negative radius, which Canvas throws IndexSizeError on. That
      // exception came out of the middle of `draw`, so every frame at the start of every cast threw
      // the whole rest of the picture away — the floor, the men, the goat, the HUD. Clamped as well
      // as measured properly, because a render path may not depend on a timer never overrunning.
      const cfg = TUNING.seer, wind = cfg.castWind * (game.mods.enemySlow || 1);
      const p = clamp(1 - e.timer / wind, 0, 1);
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

  // Two read-only overlays for the dev drawer, drawn in world space so they sit against the room
  // they are answering for. VISION is what `canSeeGoat` actually asks each man for — his sight
  // radius and his cone, or the wide blind-spot-free arc a watchful post gets — so a spot that
  // reads as safe on screen can be checked against what the AI is actually allowed to see. HEARING
  // answers a different question, and it is not per-man: every noise in the game carries a fixed
  // radius set by what made it (`TUNING.noise`), so the two rings are centred on the goat and show
  // what a footstep and a fight reach right now, wherever he is standing.
  drawDevOverlay(game) {
    const ctx = this.ctx, d = game.dev;
    if (d.vision) {
      for (const e of game.enemies) {
        if (e.dead || e.ghosted || e.held) continue;
        const cfg = e.cfg;
        if (!cfg || !cfg.sight) continue;
        const sight = (e.watchful ? cfg.sight + (cfg.watchSight || 0) : cfg.sight) * TILE;
        const cone = e.watchful ? Math.PI * 2 : (cfg.cone || Math.PI * 2);
        ctx.fillStyle = e.aware ? 'rgba(192,57,43,0.16)' : 'rgba(239,230,208,0.11)';
        ctx.beginPath(); ctx.moveTo(e.x, e.y);
        ctx.arc(e.x, e.y, sight, e.facing - cone / 2, e.facing + cone / 2);
        ctx.closePath(); ctx.fill();
      }
    }
    if (d.hearing) {
      const g = game.goat;
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(185,135,58,0.55)';
      ctx.beginPath(); ctx.arc(g.x, g.y, TUNING.noise.footstep * TILE, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(192,57,43,0.6)';
      ctx.beginPath(); ctx.arc(g.x, g.y, TUNING.noise.headbutt * TILE, 0, Math.PI * 2); ctx.stroke();
      ctx.font = `700 10px ${FONT_SC}`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(239,230,208,0.75)'; ctx.fillText('WALK', g.x, g.y - TUNING.noise.footstep * TILE - 4);
      ctx.fillStyle = 'rgba(255,150,130,0.85)'; ctx.fillText('FIGHT', g.x, g.y - TUNING.noise.headbutt * TILE - 4);
      ctx.textAlign = 'left';
    }
  }

  // A dev drawer in the bottom-right: god mode and spawns, for poking at the game.
  drawDev(game) {
    const ctx = this.ctx, s = this.ts, d = game.dev;
    d.rects = [];
    if (d.rules) { this.drawTool(game); return; }
    if (d.hidden) return;   // served from itch without `#dev` (`Game` constructor)
    // In a fight on touch the corner is under the stick's thumb: a brush of it opened the drawer.
    // It is still there on the pause screen, and the open drawer keeps its close.
    if (game.touch.active && game.state === 'play' && !d.open) return;
    // The way in is a word in the corner, not a button. A bordered box down there reads as part of
    // the game and this is not part of the game: it is a door for whoever is building it.
    const pad = 8 * s, label = d.open ? 'close dev' : 'dev tools';
    ctx.font = `700 ${9.5 * s}px ${FONT_SC}`;
    const cw = ctx.measureText(label).width + 16 * s, chH = 17 * s;
    // Bottom left, over the seed and the build: the bottom-right corner is the skill rail's now.
    const cx = pad, cy = this.h - 38 * this.hs - chH;
    let toastY = cy - 10 * s;
    if (d.open) {
      // Two columns: the switches and the level on the left, and everything that can be dropped at
      // his feet under SPAWN on the right. One column of twenty-three rows ran off the top of a
      // laptop screen.
      const cols = [
        { head: 'DEV MODE', rows: [
          ['god', d.god ? 'GOD  ON' : 'GOD  OFF'], ['rules', 'TOOLS'],
          ['vision', d.vision ? 'VISION  ON' : 'VISION  OFF'],
          ['hearing', d.hearing ? 'HEARING  ON' : 'HEARING  OFF'],
          ['dark', d.dark ? 'DARK  ON' : 'DARK  OFF'],
          ['heal', 'HEAL'], ['clear', 'CLEAR NEAR'],
          ['restart', 'NEW LEVEL'], ['next', 'SKIP LEVEL'],
        ] },
        { head: 'SPAWN', rows: [
          ['bearer', 'BEARER'], ['hunter', 'HUNTER'], ['dog', 'HOUND'], ['seer', 'SEER'],
          ['wraith', 'WRAITH'], ['butcher', 'OGRE'], ['ratogre', 'RAT OGRE'],
          ['mouse', 'MOUSE'], ['artifact', 'ARTIFACT'], ['soul', 'SOUL'],
          ['coop', 'HEN'], ['tortoise', 'TORTOISE'], ['goose', 'GOOSE'], ['crow', 'CROW'], ['horse', 'HORSE'],
        ] },
      ];
      const rw = 132 * s, rh = 24 * s, gap = 3 * s, n = Math.max(...cols.map((c) => c.rows.length));
      const boxW = rw * cols.length + 6 * s, boxH = n * (rh + gap) + 38 * s;
      const px0 = pad, py = cy - 22 * s - (n * (rh + gap));
      toastY = py - 30 * s;
      ctx.fillStyle = 'rgba(13,10,12,0.93)'; ctx.fillRect(px0, py - 20 * s, boxW, boxH);
      ctx.strokeStyle = 'rgba(185,135,58,0.6)'; ctx.lineWidth = 1.5 * s;
      ctx.strokeRect(px0, py - 20 * s, boxW, boxH);
      cols.forEach((col, ci) => {
        const px = px0 + 3 * s + ci * rw;
        ctx.font = `700 ${10 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.ochre; ctx.textAlign = 'left';
        ctx.fillText(col.head, px + 8 * s, py - 7 * s);
        col.rows.forEach(([id, label], i) => {
          const y = py + i * (rh + gap);
          const on = (id === 'god' && d.god) || (id === 'vision' && d.vision) || (id === 'hearing' && d.hearing);
          ctx.fillStyle = on ? 'rgba(192,57,43,0.5)' : 'rgba(59,34,51,0.75)';
          ctx.fillRect(px + 5 * s, y, rw - 10 * s, rh);
          ctx.strokeStyle = on ? PALETTE.blood : 'rgba(239,230,208,0.2)'; ctx.lineWidth = 1 * s;
          ctx.strokeRect(px + 5 * s, y, rw - 10 * s, rh);
          ctx.font = `700 ${11 * s}px ${FONT_SC}`; ctx.fillStyle = on ? PALETTE.fireHi : PALETTE.bone;
          ctx.textBaseline = 'middle'; ctx.fillText(label, px + 13 * s, y + rh / 2); ctx.textBaseline = 'alphabetic';
          d.rects.push({ x: px + 5 * s, y, w: rw - 10 * s, h: rh, id });
        });
      });
      // Burst or bleed, over every death this browser has had: which lever the deaths point at.
      const st = game.deathStats();
      ctx.font = `700 ${10 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.ochre; ctx.textAlign = 'left';
      ctx.fillText(`DEATHS  ${st.burst} BURST · ${st.bleed} BLED  (burst: 2 hearts < ${TUNING.dev.burstGap}s)`, px0 + 11 * s, py + n * (rh + gap) + 9 * s);
    }
    ctx.font = `700 ${9.5 * s}px ${FONT_SC}`;
    ctx.fillStyle = d.open ? PALETTE.fireHi : 'rgba(185,135,58,0.55)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, cx + cw / 2, cy + chH / 2);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    d.rects.push({ x: cx, y: cy, w: cw, h: chH, id: 'toggle' });

    if (d.god) {
      ctx.font = `700 ${11 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.blood; ctx.textAlign = 'center';
      ctx.fillText('GOD MODE', this.w / 2, 16 * s); ctx.textAlign = 'left';
    }
    if (d.toast) {
      ctx.globalAlpha = Math.min(1, d.toast.life);
      ctx.font = `700 ${13 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.fireHi; ctx.textAlign = 'left';
      ctx.fillText(d.toast.text, pad + 4 * s, toastY);
      ctx.textAlign = 'left'; ctx.globalAlpha = 1;
    }
  }

  // A button in the drawer's own style, and its rect.
  devButton(d, x, y, w, h, label, id, on) {
    const ctx = this.ctx, s = this.ts;
    ctx.fillStyle = on ? 'rgba(185,135,58,0.55)' : 'rgba(59,34,51,0.75)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = on ? PALETTE.ochre : 'rgba(239,230,208,0.2)'; ctx.lineWidth = 1 * s;
    ctx.strokeRect(x, y, w, h);
    ctx.font = `700 ${10 * s}px ${FONT_SC}`; ctx.fillStyle = on ? PALETTE.fireHi : PALETTE.bone;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    d.rects.push({ x, y, w, h, id });
  }

  // One editable number, the same small box the BOONS tab always edited its params in — reused by
  // the ENEMIES tab (and THE GOAT underneath it) so every dial in the tool looks and clicks the same
  // way instead of each page inventing its own widget. `id` is what `Game.devAction` reads to know
  // which TUNING leaf to write; returns the width drawn, for callers laying out several in a row.
  numChip(d, x, y, label, value, id) {
    const ctx = this.ctx, s = this.ts;
    // Display only: a raw TUNING float (`CULT_PACE` multiplied through) prints as
    // 190.344960000000001, which is unreadable and is never what anyone meant to type. The prompt
    // this chip opens still reads the real value straight off TUNING, so nothing here can round away
    // precision that matters — it only keeps the chip itself legible.
    const shown = typeof value === 'number' && !Number.isInteger(value) ? Math.round(value * 100) / 100 : value;
    const text = `${label} ${shown}`;
    ctx.font = `700 ${8 * s}px ${FONT_SC}`;
    const w = ctx.measureText(text).width + 10 * s;
    ctx.fillStyle = 'rgba(185,135,58,0.22)'; ctx.fillRect(x, y, w, 16 * s);
    ctx.strokeStyle = 'rgba(242,162,51,0.5)'; ctx.lineWidth = 1 * s; ctx.strokeRect(x, y, w, 16 * s);
    ctx.fillStyle = PALETTE.fireHi; ctx.textAlign = 'center';
    ctx.fillText(text, x + w / 2, y + 11.5 * s);
    ctx.textAlign = 'left';
    d.rects.push({ x, y, w, h: 16 * s, id });
    return w;
  }

  // Cut a line to a width with an ellipsis, in whatever font is set.
  clip(text, maxW) {
    const ctx = this.ctx;
    if (ctx.measureText(text).width <= maxW) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
    return t + '…';
  }

  // The RULES page of the dev drawer: what the generator promises, held against a level. The left
  // column is every rule in GEN_RULES with its answer painted beside it — fire for a rule that holds,
  // blood for one that does not, ash for one with nothing to say about this level — and the right
  // column is the level: its canon, its definition read out, and the rooms it actually built, with
  // the canon rooms lit. The level in play is checked as it stands; any other level is a sample the
  // drawer generates for the page and can reroll, so every level's rules can be read without
  // playing up to it. Nothing here is a number: everything it shows comes off LEVELS, the templates
  // and the level itself, so the page cannot disagree with the game.
  // The tool. Two halves behind one pair of tabs: the generation rules held against one level, and
  // the difficulty curve of all seven. They were a page in the game and a script in a terminal, and
  // keeping them apart meant reading one of them with the other one's numbers in your head.
  drawTool(game) {
    const ctx = this.ctx, s = this.ts, d = game.dev, W = this.w, H = this.h;
    const pad = 14 * s;
    ctx.fillStyle = 'rgba(13,10,12,0.965)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    const tabs = [['rules','RULES'], ['levels','LEVEL'], ['balance','BALANCE'], ['enemies','ENEMIES'], ['boons','BOONS'], ['status','STATUS'], ['props','OBJECTS'], ['music','MUSIC'], ['juice','JUICE'], ['talismans','TALISMANS'], ['animals','ANIMALS'], ['goats','GOAT GRID'], ['art','ART']];
    const cols = Math.max(1, Math.floor((W - pad * 2 - 72 * s) / (80 * s)));
    tabs.forEach(([id, label], i) => this.devButton(d, pad + i % cols * 80 * s,
      pad + Math.floor(i / cols) * 24 * s, 76 * s, 20 * s, label, 'tab-' + id, d.tab === id));
    const top = pad + Math.ceil(tabs.length / cols) * 24 * s + 6 * s;
    this.devButton(d, W - pad - 64 * s, pad, 64 * s, 20 * s, 'CLOSE', 'rules', false);
    if (d.tab === 'balance') this.drawBalance(game, pad, top);
    else if (d.tab === 'levels') this.drawLevelTab(game, pad, top);
    else if (d.tab === 'enemies') this.drawEnemiesTab(game, pad, top);
    else if (d.tab === 'boons') this.drawBoonsTab(game, pad, top);
    else if (d.tab === 'status') this.drawStatusTab(game, pad, top);
    else if (d.tab === 'props') this.drawPropsTab(game, pad, top);
    else if (d.tab === 'animals') this.drawAnimalsTab(game, pad, top);
    else if (d.tab === 'music') this.drawMusicTab(game, pad, top);
    else if (d.tab === 'juice') this.drawJuiceTab(game, pad, top);
    else if (d.tab === 'talismans') Talisman.drawToolTab(this, game, pad, top);
    else if (d.tab === 'goats') GoatGrid.drawToolTab(this, game, pad, top);
    else if (d.tab === 'art') this.drawArtTab(game, pad, top);
    else this.drawRuleTab(game, pad, top);
    // A room opened from either of the other two covers them: it is the deepest the tool goes.
    if (d.room) this.drawRoomSheet(game, pad);
  }

  // THE ART tab: pixel-art theory held against this project's own conventions, as a checklist rather
  // than a wall of prose — palette discipline, outline weight, dimming whatever is not the thing to
  // look at, how a unit is shaded, and how a level's canon owns its own tint. Every line names the
  // project's own mechanism where one already exists (PALETTE, PIXEL_ROOMS, fog.shade, Dark's
  // silhouette pass) so this reads as "is the art honouring what the engine already does" rather than
  // generic advice. A tick is a mark for whoever is doing the pass this session only — `dev.artChecked`
  // is never saved, on purpose: this is a working checklist, not a record of who did what.
  drawArtTab(game, pad, top) {
    const ctx = this.ctx, s = this.ts, d = game.dev, W = this.w, H = this.h;
    const ART_CHECKLIST = [
      { section: 'PALETTE', items: [
        { id: 'pal-src', text: 'Every colour in a sprite comes off a ramp — PALETTE, a sprite file\'s own ramps (`P` in prop-pixels.js, `RAMP` in pixel-art.js) or a canon multiply — never a one-off hex picked by eye.' },
        { id: 'pal-steps', text: '3–5 values per material: shadow, base, light, maybe one highlight. More steps than that and it stops reading at goat-sprite size.' },
        { id: 'pal-hue', text: 'Shade by shifting hue, not just value — darker leans toward ink/plum, lighter leans toward ochre/fireHi. A flat black-to-white ramp on one hue reads plastic, not painted.' },
        { id: 'pal-meaning', text: 'One colour, one meaning: blood red is damage, fire orange is heat, venom green is poison, witch violet is witchfire. Never spend a hazard colour on plain decoration.' },
      ] },
      { section: 'OUTLINE', items: [
        { id: 'out-weight', text: 'Outer silhouette: 1px, unbroken, dark but not pure black — tint it toward ink so it sits in the same light as the fill instead of cutting a hole in it.' },
        { id: 'out-inner', text: 'Inner seams — limb joins, where one prop part meets another — are lighter than the outer line, so the whole silhouette still reads before any internal detail does.' },
        { id: 'out-afford', text: 'Floor and background swatches (`PIXEL_FLOORS`, wall tops) carry no outline at all. An outline is reserved for anything with a hitbox, so its presence alone tells you it can be touched.' },
      ] },
      { section: 'DIM THE INACTIVE', items: [
        { id: 'dim-value', text: 'An idle, unlit or unarmed state reads through value and saturation dropping, never a new hue — an unlit lamp is a dimmer lamp, not a grey one.' },
        { id: 'dim-bg', text: 'Background swatches stay lower-contrast and lower-saturation than characters and props by construction — the same job `fog.shade` and Dark\'s silhouette pass already do at runtime; a loud hand-painted floor fights both.' },
        { id: 'dim-focus', text: 'Before adding detail anywhere, name the one thing in that room the eye should land on first. Everything else earns less contrast, never more detail, to make room for it.' },
      ] },
      { section: 'CHARACTER SHADING', items: [
        { id: 'char-flat', text: 'No smooth gradients, ever — a shade change is a hard-edged band or a dither pattern: pixels on the grid, same as every overlay `PIXEL_ART.face` puts on the goat.' },
        { id: 'char-spec', text: 'A highlight is 1–2px, placed by hand, never a filled patch — it is a mark that says "here is the light", not a light source rendered in.' },
        { id: 'char-rim', text: 'Rim light, if used at all, goes only on the edge that separates a silhouette from the background behind it. It is a readability tool for that edge, not a style pass over the whole body.' },
        { id: 'char-count', text: 'Count the colours actually on screen for one unit at its drawn size, not in the source grid — a hand-authored sprite hides extra values a packed atlas would have forced flat.' },
      ] },
      { section: 'LEVEL / CANON PALETTE', items: [
        { id: 'canon-key', text: 'A canon owns exactly one tint key (`PIXEL_ROOMS` floor / floorAlt / wallTop / wall) — every floor and prop swatch in its rooms multiplies through that key, nothing hand-recoloured room by room.' },
        { id: 'canon-distinct', text: 'Two canons a single run visits back to back should read apart from the floor colour alone — check `LEVELS` entries side by side, not only each canon in isolation.' },
        { id: 'canon-hazard', text: 'A canon tint must never wash out the hazard palette — fire, witchfire, venom and blood stay their own colour no matter which room\'s multiply they sit inside.' },
      ] },
    ];
    d.artChecked = d.artChecked || {};
    ctx.font = `700 ${11 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.ochre; ctx.textAlign = 'left';
    ctx.fillText('PIXEL ART CHECKLIST', pad, top + 10 * s);
    ctx.font = `400 ${8.5 * s}px ${FONT}`; ctx.fillStyle = PALETTE.ash;
    ctx.fillText('pixel-art theory held against this project\'s own mechanisms · click a line to tick it off for this session', pad + 178 * s, top + 10 * s);
    this.devButton(d, W - pad - 70 * s, top, 70 * s, 18 * s, 'RESET', 'art-reset', false);
    // The looks under comparison (`ART_PASS`): the pass as a whole, and a study for each of the two
    // cultists. Nothing packed is replaced; every one switches back.
    const H2 = PIXEL_STUDY.hunter[ART_PASS.hunter], C2 = PIXEL_STUDY.clubman[ART_PASS.clubman];
    this.devButton(d, pad, top + 18 * s, 130 * s, 18 * s, ART_PASS.on ? 'ART PASS: ON' : 'ART PASS: OFF', 'art-pass', ART_PASS.on);
    this.devButton(d, pad + 136 * s, top + 18 * s, 190 * s, 18 * s, 'HUNTER: ' + H2.name, 'art-hunter', ART_PASS.hunter > 0);
    this.devButton(d, pad + 332 * s, top + 18 * s, 190 * s, 18 * s, 'CLUBMAN: ' + C2.name, 'art-clubman', ART_PASS.clubman > 0);
    this.devButton(d, pad + 528 * s, top + 18 * s, 150 * s, 18 * s, ART_PASS.floors ? 'FLOORS: SHEETS' : 'FLOORS: AS PACKED', 'art-floors', ART_PASS.floors);
    ctx.font = `400 ${7.8 * s}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.6)'; ctx.textAlign = 'left';
    ctx.fillText(this.clip('hunter — ' + H2.rule, W - pad * 2), pad, top + 48 * s);
    ctx.fillText(this.clip('clubman — ' + C2.rule, W - pad * 2), pad, top + 58 * s);

    const colGap = 24 * s, colW = (W - pad * 2 - colGap) / 2;
    const cols = [[], []];
    ART_CHECKLIST.forEach((sec, i) => cols[i % 2].push(sec));
    const wrapAt = colW - 24 * s;

    cols.forEach((sections, ci) => {
      const x = pad + ci * (colW + colGap);
      let y = top + 76 * s;
      sections.forEach((sec) => {
        ctx.font = `700 ${9.5 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.fireHi; ctx.textAlign = 'left';
        ctx.fillText(sec.section, x, y);
        y += 13 * s;
        sec.items.forEach((it) => {
          const checked = !!d.artChecked[it.id];
          ctx.font = `400 ${8 * s}px ${FONT}`;
          const lines = this.wrap(it.text, wrapAt);
          const rowH = Math.max(13 * s, lines.length * 10 * s + 3 * s);
          ctx.font = `700 ${9 * s}px ${FONT}`; ctx.fillStyle = checked ? PALETTE.venomHi : PALETTE.bone;
          ctx.fillText(checked ? '☑' : '☐', x, y);
          ctx.font = `400 ${8 * s}px ${FONT}`; ctx.fillStyle = checked ? 'rgba(239,230,208,0.38)' : 'rgba(239,230,208,0.78)';
          lines.forEach((l, li) => ctx.fillText(l, x + 15 * s, y + li * 10 * s));
          d.rects.push({ x, y: y - 9 * s, w: colW, h: rowH, id: 'art-check=' + it.id });
          y += rowH + 3 * s;
        });
        y += 9 * s;
      });
    });
  }

  // THE JUICE tab: `JUICE` (js/juice.js) as a table — every piece of game feel, whether it is in the
  // game, new, or still in the backlog, with its trigger, its look, its size read live off TUNING
  // and how to build it in Godot 4. Filter chips along the top, pages when it does not fit, a click
  // on a row opens it out to its full text, and EXPORT hands the same table over as Markdown.
  drawJuiceTab(game, pad, top) {
    const ctx = this.ctx, s = this.ts, d = game.dev, W = this.w, H = this.h;
    const filter = d.juiceFilter || 'all';
    const rows = JUICE.filter((j) => filter === 'all' || j.status === filter);
    const count = (st) => JUICE.filter((j) => j.status === st).length;
    ctx.font = `700 ${11 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.ochre; ctx.textAlign = 'left';
    ctx.fillText('THE JUICE', pad, top + 10 * s);
    ctx.font = `400 ${8.5 * s}px ${FONT}`; ctx.fillStyle = PALETTE.ash;
    ctx.fillText(`${JUICE.length} effects · ${count('in')} in game · ${count('new')} new · ${count('backlog')} backlog · sizes read live off TUNING · click a row to open it`, pad + 90 * s, top + 10 * s);
    [['all', 'ALL'], ['in', 'IN GAME'], ['new', 'NEW'], ['backlog', 'BACKLOG']].forEach(([id, label], i) =>
      this.devButton(d, pad + i * 74 * s, top + 18 * s, 70 * s, 18 * s, label, 'juice-filter=' + id, filter === id));
    this.devButton(d, W - pad - 90 * s, top + 18 * s, 90 * s, 18 * s, 'EXPORT .MD', 'juice-export', false);

    const cols = [['EFFECT', 0.15], ['TRIGGER', 0.17], ['HOW IT LOOKS', 0.22], ['SIZE · TIME', 0.13], ['GODOT 4', 0.33]];
    const tableW = W - pad * 2, gap = 8 * s, font = 8.8 * s, lineH = 11 * s;
    let x = pad; const colX = cols.map(([, f]) => { const at = x; x += tableW * f; return at; });
    const y0 = top + 44 * s;
    ctx.font = `700 ${9 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.ochre;
    cols.forEach(([label], i) => ctx.fillText(label, colX[i], y0 + 9 * s));
    ctx.fillStyle = 'rgba(239,230,208,0.15)'; ctx.fillRect(pad, y0 + 13 * s, tableW, s);

    ctx.font = `400 ${font}px ${FONT}`;
    const wrap = (text, w, max) => {
      const words = String(text).split(' '), lines = [];
      let line = '';
      for (const word of words) {
        const next = line ? line + ' ' + word : word;
        if (ctx.measureText(next).width > w && line) { lines.push(line); line = word; } else line = next;
      }
      if (line) lines.push(line);
      if (lines.length > max) { lines.length = max; lines[max - 1] = lines[max - 1].replace(/\s*\S*$/, '') + ' …'; }
      return lines;
    };
    const cellsOf = (j, max) => [j.trigger, j.look, j.size(), j.godot].map((t, i) => wrap(t, tableW * cols[i + 1][1] - gap, max));
    // Pages are cut by height, so a page break always falls between rows: walk the list once and
    // start a new page whenever the next row would run off the bottom of the screen.
    const bottom = H - pad - 22 * s, pages = [[]];
    let h = 0;
    rows.forEach((j, i) => {
      const open = d.juiceSel === j.name;
      const rh = Math.max(34 * s, Math.max(...cellsOf(j, open ? 99 : 3).map((c) => c.length)) * lineH + 10 * s);
      if (h + rh > bottom - y0 - 18 * s && pages[pages.length - 1].length) { pages.push([]); h = 0; }
      pages[pages.length - 1].push([j, rh]); h += rh;
    });
    const page = clamp(d.juicePage || 0, 0, pages.length - 1);
    d.juicePage = page;
    const tint = { in: [PALETTE.bone, 'rgba(239,230,208,0.12)'], new: [PALETTE.fireHi, 'rgba(242,162,51,0.28)'], backlog: [PALETTE.ash, 'rgba(120,110,100,0.18)'] };
    const word = { in: 'IN GAME', new: 'NEW', backlog: 'BACKLOG' };
    let y = y0 + 18 * s;
    pages[page].forEach(([j, rh], i) => {
      const open = d.juiceSel === j.name;
      if (open) { ctx.fillStyle = 'rgba(185,135,58,0.12)'; ctx.fillRect(pad - 4 * s, y, tableW + 8 * s, rh); }
      else if (i % 2) { ctx.fillStyle = 'rgba(239,230,208,0.03)'; ctx.fillRect(pad - 4 * s, y, tableW + 8 * s, rh); }
      d.rects.push({ x: pad - 4 * s, y, w: tableW + 8 * s, h: rh, id: 'juice-row=' + j.name });
      ctx.font = `700 ${10 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.bone;
      const nameLines = wrap(j.name.toUpperCase(), tableW * cols[0][1] - gap, 2);
      nameLines.forEach((l, k) => ctx.fillText(l, colX[0], y + 12 * s + k * lineH));
      const [fg, bg] = tint[j.status];
      ctx.font = `700 ${7.5 * s}px ${FONT_SC}`;
      const chip = word[j.status] + ' · ' + j.cat, cw = ctx.measureText(chip).width + 8 * s, cy = y + 12 * s + nameLines.length * lineH - 6 * s;
      ctx.fillStyle = bg; ctx.fillRect(colX[0], cy, cw, 11 * s);
      ctx.fillStyle = fg; ctx.fillText(chip, colX[0] + 4 * s, cy + 8.5 * s);
      ctx.font = `400 ${font}px ${FONT}`;
      cellsOf(j, open ? 99 : 3).forEach((lines, c) => {
        ctx.fillStyle = c === 3 ? '#b9d7c0' : c === 2 ? PALETTE.fireHi : PALETTE.bone;
        lines.forEach((l, k) => ctx.fillText(l, colX[c + 1], y + 12 * s + k * lineH));
      });
      if (open) {
        ctx.fillStyle = PALETTE.ash; ctx.font = `400 ${8 * s}px ${FONT}`;
        ctx.fillText(`source: ${JUICE_SRC[j.src]}${j.code ? '   ·   code: ' + j.code : ''}`, colX[1], y + rh - 3 * s);
      }
      y += rh;
    });
    if (pages.length > 1) {
      const by = H - pad - 18 * s;
      this.devButton(d, pad, by, 60 * s, 18 * s, '‹ PREV', 'juice-page=-1', false);
      this.devButton(d, pad + 66 * s, by, 60 * s, 18 * s, 'NEXT ›', 'juice-page=1', false);
      ctx.font = `700 ${9 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.ash; ctx.textAlign = 'left';
      ctx.fillText(`PAGE ${page + 1} / ${pages.length}`, pad + 136 * s, by + 12.5 * s);
    }
  }

  drawMusicTab(game, pad, top) {
    const ctx = this.ctx, d = game.dev, audio = game.audio, lab = audio.lab;
    const width = this.w - pad * 2, s = Math.min(this.ts, (this.h - top - pad) / 545, width / 350);
    const effective = capMusicScene({ ...lab.scene });
    const text = (value, x, y, color = PALETTE.bone, size = 11) => {
      ctx.font = '700 ' + size * s + 'px ' + FONT_SC; ctx.fillStyle = color;
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillText(value, x, y);
    };
    const button = (x, y, w, label, id, on = false, h = 21 * s) => {
      const old = this.ts; this.ts = s;
      this.devButton(d, x, y, w, h, label, 'music-' + id, on); this.ts = old;
    };
    text('MUSIC / 118 BPM / 4:4 / ' + (lab.cue ? MUSIC_CUES[lab.cue].label + (lab.playing ? ' / PLAYING' : ' / READY') : lab.playing ? 'BAR ' + (1 + Math.floor(audio.step / 16)) : 'STOPPED'), pad, top + 11 * s, PALETTE.ochre);
    [[lab.playing ? 'STOP' : 'PLAY','play'], ['CLEAR','clear'], ['ROOM','room'], [audio.muted ? 'UNMUTE' : 'MUTE','mute']]
      .forEach(([label,id], i) => button(pad + i * 76 * s, top + 20 * s, 70 * s, label, id));
    [['NO BASE','none'], ['IDLE','idle'], ['SPOTTED','spotted'], ['CHASE','chase'], ['COMBAT','combat']]
      .forEach(([label,id], i) => button(pad + i * 69 * s, top + 47 * s, 65 * s, label, 'bed=' + id, lab.bed === id));
    button(pad, top + 73 * s, 45 * s, 'LEVEL 1', 'theme=first', lab.scene.first);
    button(pad + 51 * s, top + 73 * s, 52 * s, 'LEVEL 2-4', 'theme=early', !lab.scene.first && !lab.scene.late);
    button(pad + 109 * s, top + 73 * s, 52 * s, 'LEVEL 5+', 'theme=late', lab.scene.late);
    button(pad + 170 * s, top + 73 * s, 48 * s, 'MIX', 'view=mix', lab.view === 'mix');
    button(pad + 224 * s, top + 73 * s, 55 * s, 'SCORE', 'view=score', lab.view === 'score');
    button(pad + 285 * s, top + 73 * s, 55 * s, 'EXPORT', 'export');
    Object.entries(MUSIC_CUES).forEach(([id, cue], i) => button(pad + i * 115 * s, top + 99 * s, 109 * s,
      cue.label + ' / ' + cue.bars + 'B', 'cue=' + id, lab.cue === id));
    if (lab.view === 'score') {
      this.drawMusicScore(game, pad, top + 129 * s, s, text, button);
      return;
    }
    const theme = musicTheme(lab.scene), root = theme.roots[(audio.step >> 4) & 3];
    Object.entries(MUSIC_PARTS).forEach(([kind, part], row) => {
      const y = top + (130 + row * 29) * s, hits = musicHitCount(kind, effective[kind]);
      const family = ROOM_MUSIC[part.family], pitch = musicPitch(root * family.octave);
      text(part.label, pad, y + 10 * s);
      text(pitch.note + ' / ' + pitch.midi + ' ' + (part.family === 'large' ? 'TRI+SQ' : family.type.slice(0,3).toUpperCase()), pad, y + 22 * s, PALETTE.ash, 8);
      const max = musicCap(kind);
      for (let n = 0; n <= max; n++) button(pad + (77 + n * 25) * s, y, 22 * s,
        String(n), kind + '=' + n, lab.scene[kind] === n);
      button(pad + 256 * s, y, 38 * s, 'SOLO', 'solo=' + kind);
      text(effective[kind] + ' / ' + hits, pad + 303 * s, y + 14 * s, PALETTE.ochre);
      const start = pad + 355 * s, cell = Math.min(11 * s, (width - 360 * s) / 32);
      if (cell >= 4 * s) for (let step = 0; step < 32; step++) {
        const active = Array.from({ length: hits }, (_, i) => musicPartHit(kind, i, step + Math.floor(audio.step / 64) * 64)).some(Boolean);
        ctx.fillStyle = active ? PALETTE.ochre : 'rgba(239,230,208,0.09)';
        ctx.fillRect(start + cell * step, y + 5 * s, cell - s, 10 * s);
        if (lab.playing && step === audio.step % 32) { ctx.strokeStyle = PALETTE.fireHi; ctx.strokeRect(start + cell * step, y + 3 * s, cell - s, 14 * s); }
      }
      if (width > 970 * s) text(MUSIC_TRACKS[kind], pad + 726 * s, y + 14 * s, PALETTE.ash, 9);
    });
    // The room's own sound (not the score, but auditioned here): a floor's bed and a fire beside him.
    let y = top + 398 * s;
    text('ROOM', pad, y + 14 * s);
    [['OFF','off'], ['AIR','air'], ['CAVE','cave'], ['WIND','wind']].forEach(([label, id], i) =>
      button(pad + (50 + i * 44) * s, y, 40 * s, label, 'amb=' + id, (lab.amb.bed || 'off') === id));
    y += 26 * s; text('FIRE', pad, y + 14 * s);
    [0, 0.3, 0.7].forEach((n, i) => button(pad + (50 + i * 44) * s, y, 40 * s, ['NONE','NEAR','BLAZE'][i], 'fire=' + n, lab.amb.fire === n));
    button(pad + 186 * s, y, 84 * s, 'LAST HEART', 'heart', lab.scene.lastHeart);
    this.drawMusicPads(game, pad, top + 454 * s, s, text, button);
    text('Count / hits per 2 bars. Note = register root / MIDI.', pad, top + 508 * s, PALETTE.ash, 10);
    text('SCORE: all 16 bars, instruments, exact notes. EXPORT: JSON.', pad, top + 521 * s, PALETTE.ash, 10);
  }

  drawMusicPads(game, pad, y, s, text, button) {
    const audio = game.audio;
    Object.entries(MUSIC_EVENTS).forEach(([id, label], i) => button(pad + i * 68 * s, y, 63 * s, label, 'event=' + id, false, 28 * s));
    const queue = audio.musicEvents.map(e => MUSIC_EVENTS[e.kind]).join(' > ');
    text('QUEUE ' + audio.musicEvents.length + ': ' + queue.slice(0,42), pad, y + 41 * s, PALETTE.ochre, 9);
  }

  drawMusicScore(game, pad, top, s, text, button) {
    const ctx = this.ctx, audio = game.audio, lab = audio.lab, score = audio.getLabScore();
    const tracks = Object.keys(MUSIC_TRACKS), x = pad + 76 * s, width = this.w - pad - x;
    const barWidth = width / 16, stepWidth = width / 256;
    for (let bar = 0; bar < 16; bar++) button(x + bar * barWidth, top, barWidth - s, String(bar + 1), 'bar=' + bar, lab.bar === bar, 17 * s);
    tracks.forEach((track, row) => {
      const y = top + (22 + row * 12) * s;
      button(pad, y, 71 * s, (MUSIC_PARTS[track]?.label || track).toUpperCase(), 'track=' + track, lab.track === track, 12 * s);
      ctx.fillStyle = 'rgba(239,230,208,0.07)'; ctx.fillRect(x, y, width, 10 * s);
      ctx.fillStyle = 'rgba(185,135,58,0.15)'; ctx.fillRect(x + lab.bar * barWidth, y, barWidth, 10 * s);
      for (const event of score.events) {
        if (event.track !== track || event.step >= 256) continue;
        ctx.fillStyle = track === lab.track ? PALETTE.fireHi : PALETTE.ochre;
        ctx.fillRect(x + event.step * stepWidth, y + 2 * s, Math.min(width - event.step * stepWidth, Math.max(s, Math.min(event.duration,4) * stepWidth)), 6 * s);
      }
    });
    if (lab.playing) { ctx.fillStyle = PALETTE.fireHi; const playhead = audio.cue ? Math.max(0, audio.musicTick - audio.cue.start) : audio.step; ctx.fillRect(x + playhead * stepWidth, top + 21 * s, s, tracks.length * 12 * s); }
    const y = top + 310 * s;
    text(lab.track.toUpperCase() + ': ' + MUSIC_TRACKS[lab.track], pad, y, PALETTE.ochre, 10);
    const notes = score.events.filter(e => e.track === lab.track && Math.floor(e.step / 16) === lab.bar);
    text('BAR ' + (lab.bar + 1) + ' / C4 = MIDI 60 / ' + (notes.length ? notes.length + ' NOTES' : 'REST'), pad, y + 15 * s, PALETTE.ash, 9);
    // Exact pitches and positions of the selected bar; the export includes every harmonic/tail.
    const lines = notes.slice(0,6).map(e => ((e.step % 16) / 4 + 1).toFixed(2) + ': ' + e.note + (e.midi == null ? '' : ' / ' + e.midi + ' / ' + e.hz + 'Hz'));
    for (let i = 0; i < 2; i++) text(lines.slice(i * 3, i * 3 + 3).join('   ').slice(0, Math.floor((this.w - pad * 2) / (5 * s))), pad, y + (29 + i * 13) * s, PALETTE.bone, 9);
    this.drawMusicPads(game, pad, top + 366 * s, s, text, button);
    button(this.w - pad - 58 * s, top + 396 * s, 58 * s, 'ERASE', 'erase', false, 15 * s);
  }

  // The rules that hold everywhere, as a matrix: one row a rule, one column a level, one mark per
  // answer. The rules used to live down the side of the level page, where they were checked against
  // one level at a time and took half the screen doing it — but a rule is a promise about the whole
  // generator, and what you want to see is the row: six levels keeping it and one not.
  drawRuleTab(game, pad, top) {
    const ctx = this.ctx, s = this.ts, W = this.w, H = this.h, d = game.dev;
    const m = game.ruleMatrix();
    ctx.font = `700 ${11 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.ochre;
    ctx.fillText('WHAT THE GENERATOR PROMISES', pad, top);
    ctx.font = `400 ${8.5 * s}px ${FONT}`; ctx.fillStyle = PALETTE.ash;
    ctx.fillText(`every rule against every level · one sample each, seed ${d.sampleSeed} · fire holds, blood broken, ash not this level`,
      pad + 210 * s, top);
    this.devButton(d, W - pad - 70 * s, top + 5 * s, 70 * s, 18 * s, 'REROLL', 'rules-roll', false);
    // the level columns, named down the right of the text
    const colW = Math.min(64 * s, (W - pad * 2) * 0.38 / LEVELS.length);
    const gridX = W - pad - LEVELS.length * colW;
    const textW = gridX - pad - 12 * s;
    let y = top + 24 * s;
    ctx.font = `700 ${8 * s}px ${FONT_SC}`; ctx.fillStyle = 'rgba(239,230,208,0.55)';
    LEVELS.forEach((lv, i) => {
      ctx.save(); ctx.translate(gridX + i * colW + colW / 2, y);
      ctx.textAlign = 'center'; ctx.fillText(String(i + 1), 0, 0);
      ctx.restore();
    });
    ctx.textAlign = 'left';
    y += 8 * s;
    const rowH = Math.min(30 * s, (H - y - pad - 30 * s) / m.rows.length);
    const tint = (ok) => (ok === true ? PALETTE.fireHi : ok === false ? PALETTE.blood : 'rgba(90,82,80,0.5)');
    m.rows.forEach((row, ri) => {
      const ry = y + ri * rowH;
      if (ri % 2) { ctx.fillStyle = 'rgba(239,230,208,0.03)'; ctx.fillRect(pad - 4 * s, ry - 2 * s, W - pad * 2 + 8 * s, rowH); }
      ctx.font = `400 ${Math.min(11, rowH * 0.42) * s}px ${FONT}`;
      const broken = row.cells.some((c) => c.ok === false);
      ctx.fillStyle = broken ? PALETTE.bone : 'rgba(239,230,208,0.8)';
      ctx.fillText(this.clip(row.rule.text, textW), pad, ry + rowH * 0.62);
      row.cells.forEach((c, i) => {
        const cx = gridX + i * colW + colW / 2, cy = ry + rowH * 0.52;
        const r = Math.min(5 * s, rowH * 0.2);
        ctx.fillStyle = tint(c.ok);
        if (c.ok === null) { ctx.fillRect(cx - r * 0.7, cy - 1 * s, r * 1.4, 2 * s); }
        else { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); }
      });
      // the first level that breaks it says why, under the rule
      const bad = row.cells.find((c) => c.ok === false);
      if (bad && bad.why) {
        ctx.font = `400 ${Math.min(9, rowH * 0.33) * s}px ${FONT}`; ctx.fillStyle = PALETTE.blood;
        ctx.fillText(this.clip(bad.why, textW), pad + 10 * s, ry + rowH * 0.95);
      }
    });
    const broken = m.rows.filter((r) => r.cells.some((c) => c.ok === false)).length;
    ctx.font = `700 ${10 * s}px ${FONT_SC}`;
    ctx.fillStyle = broken ? PALETTE.blood : PALETTE.fireHi;
    ctx.fillText(broken ? `${broken} RULES BROKEN ON THIS SEED` : 'EVERY RULE HOLDS ON EVERY LEVEL', pad, H - pad - 4 * s);
  }

  // The curve, level by level and room by room, averaged over `dev.balanceSeeds` seeds: the same
  // thing `node tools/balance.js` prints. A level is a row of bars — one bar a room, its height its
  // threat, its colour its role — so the shape of a level and the shape of the whole game are one
  // picture. Under them, whatever rule is broken, or the line saying none is.
  drawBalance(game, pad, top) {
    const ctx = this.ctx, s = this.ts, d = game.dev, W = this.w, H = this.h;
    const rep = game.balanceReport();
    ctx.font = `700 ${11 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.ochre;
    ctx.fillText('DIFFICULTY', pad, top);
    this.devButton(d, pad + 74 * s, top - 12 * s, 66 * s, 17 * s, 'SEEDS ' + rep.seeds, 'bal-seeds', false);
    ctx.font = `400 ${8.5 * s}px ${FONT}`; ctx.fillStyle = PALETTE.ash;
    ctx.fillText(this.clip('a bar is a room at its real width and place in the world · height is threat · click one to open it',
      W - pad * 2 - 150 * s), pad + 150 * s, top);
    const roleTint = { canon: PALETTE.ochre, mix: 'rgba(239,230,208,0.5)', trap: PALETTE.blood,
      pen: PALETTE.ash, calm: PALETTE.ash, rest: PALETTE.witchHi };
    // A colour legend, not just a sentence about one: `roleTint` (plus `PALETTE.witch`, the
    // fallback for every set-piece role) is the same map the bars below are painted from, so this
    // row can never say a colour the bars themselves do not use.
    let ly = top + 15 * s;
    ctx.font = `700 ${7.5 * s}px ${FONT_SC}`;
    const legend = [['CANON', roleTint.canon], ['MIX', roleTint.mix], ['TRAP', roleTint.trap], ['SET PIECE', PALETTE.witch]];
    let lx = pad;
    legend.forEach(([label, color]) => {
      ctx.fillStyle = color; ctx.fillRect(lx, ly - 7 * s, 8 * s, 8 * s);
      ctx.fillStyle = 'rgba(239,230,208,0.65)'; ctx.fillText(label, lx + 11 * s, ly);
      lx += 11 * s + ctx.measureText(label).width + 14 * s;
    });
    // The ground overlay is not a colour, it is an absence, so it gets its own small sample rather
    // than a swatch: a short bar with the same dark cap knocked into its top that a real one gets.
    ctx.fillStyle = roleTint.mix; ctx.fillRect(lx, ly - 7 * s, 8 * s, 8 * s);
    ctx.fillStyle = 'rgba(9,7,10,0.62)'; ctx.fillRect(lx, ly - 7 * s, 8 * s, 3.5 * s);
    ctx.fillStyle = 'rgba(239,230,208,0.65)';
    ctx.fillText('HOLLOW TOP = OPEN GROUND (little to fight with)', lx + 11 * s, ly);
    let y = top + 30 * s;
    const failH = 14 * s * (rep.fails.length + 1) + 32 * s;
    const rowH = Math.max(34 * s, (H - y - pad - failH) / rep.levels.length);
    const nameW = 150 * s, statW = 128 * s;
    const plotX = pad + nameW + statW, plotW = W - pad - plotX;
    const peak = Math.max(...rep.levels.map((l) => l.peak)) || 1;
    for (const lv of rep.levels) {
      const h = rowH - 4 * s;
      // Everything in a row hangs off the line the bars stand on, so a level's name is level with
      // its own ground. Reading it off the top of the row put every name against the row below it.
      const base = y + h;
      ctx.fillStyle = 'rgba(239,230,208,0.08)'; ctx.fillRect(pad, base, W - pad * 2, 1 * s);
      ctx.font = `700 ${10.5 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.bone;
      ctx.fillText(`${lv.li + 1} ${lv.def.name}`, pad, base - 14 * s);
      ctx.font = `400 ${8.5 * s}px ${FONT}`; ctx.fillStyle = PALETTE.ash;
      ctx.fillText(lv.def.canon ? lv.def.canon.name.toLowerCase() : '-', pad, base - 3 * s);
      // the two numbers that decide whether a level is in the right place in the run
      ctx.font = `400 ${9 * s}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.75)';
      ctx.fillText(`total ${lv.total.toFixed(0)}`, pad + nameW, base - 14 * s);
      ctx.fillText(`worst room ${lv.plainPeak.toFixed(1)}`, pad + nameW, base - 3 * s);
      // The second axis as a number: what the floor under the fighting does from one end of the
      // level to the other. Blood if it runs the wrong way, which is what `GEN_RULES.ground` fails on.
      if (lv.ground) {
        ctx.font = `400 ${8 * s}px ${FONT}`;
        ctx.fillStyle = lv.ground.late > lv.ground.early ? 'rgba(239,230,208,0.5)' : PALETTE.blood;
        ctx.fillText(`ground ${lv.ground.early.toFixed(2)}→${lv.ground.late.toFixed(2)}`, pad + nameW, base - 25 * s);
      }
      // the level's own bar of total, against the hardest level, so the run's shape is one glance
      ctx.fillStyle = 'rgba(239,230,208,0.1)'; ctx.fillRect(pad + nameW, base + 4 * s, statW - 14 * s, 3 * s);
      ctx.fillStyle = PALETTE.fire;
      ctx.fillRect(pad + nameW, base + 4 * s, (statW - 14 * s) * lv.total / rep.max, 3 * s);
      // and the rooms
      // The rooms, laid out where they actually are: a bar starts at the room's own x in the world
      // and is as wide as the room is, so the axis is the level's ground rather than a room count.
      // That answers the size question — the threshing floor is visibly a wider level made of wider
      // rooms, and a level running out of world would show as one running off the end. Height is
      // still threat, the count of men rides on the bar, and clicking one opens that room.
      const WORLD = 420;
      lv.rooms.forEach((r, i) => {
        const g = r.sample && r.sample.room;
        const bx = plotX + (g ? g.x / WORLD : i / lv.rooms.length) * plotW;
        const bw = Math.max(2 * s, (g ? g.w / WORLD : 1 / lv.rooms.length) * plotW - 1 * s);
        const bh = Math.max(1 * s, (r.threat / peak) * (h - 14 * s));
        ctx.fillStyle = roleTint[r.role] || PALETTE.witch;
        ctx.fillRect(bx, y + h - bh, bw, bh);
        // The second axis rides on the same bar, and it is drawn as absence rather than as more
        // paint: the top `ground` of the bar is knocked back toward the page, so a tall bar that is
        // mostly hollow is a crowd standing on floor with nothing in it to kill them with, and a
        // tall solid one is the same crowd among pillars. Height is what the room costs; the hollow
        // part is how little of it the room hands back. An added pale cap was invisible on the pale
        // bars the mix rooms already use.
        const gh = bh * clamp(r.ground || 0, 0, 1);
        if (gh > 0.5 * s) {
          ctx.fillStyle = 'rgba(9,7,10,0.62)';
          ctx.fillRect(bx, y + h - bh, bw, gh);
          ctx.fillStyle = 'rgba(239,230,208,0.22)';
          ctx.fillRect(bx, y + h - bh + gh, bw, 1 * s);
        }
        if (r.sample && r.sample.men.length && bw > 15 * s) {
          ctx.font = `700 ${7 * s}px ${FONT_SC}`; ctx.fillStyle = 'rgba(13,10,12,0.8)'; ctx.textAlign = 'center';
          ctx.fillText('×' + r.sample.men.length, bx + bw / 2, y + h - 3 * s);
          ctx.textAlign = 'left';
        }
        ctx.font = `400 ${6.5 * s}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.3)';
        ctx.fillText(String(r.index), bx, y + h + 7 * s);
        d.rects.push({ x: bx, y, w: Math.max(bw, 6 * s), h, id: `room=${lv.li},${i}` });
      });
      y += rowH;
    }
    y = H - pad - failH + 10 * s;
    ctx.font = `700 ${10 * s}px ${FONT_SC}`;
    if (!rep.fails.length) { ctx.fillStyle = PALETTE.fireHi; ctx.fillText('ALL BALANCE RULES HOLD', pad, y); return; }
    ctx.fillStyle = PALETTE.blood; ctx.fillText(`${rep.fails.length} RULE FAILURES`, pad, y);
    ctx.font = `400 ${9 * s}px ${FONT}`;
    rep.fails.slice(0, 12).forEach((f, i) => { ctx.fillText(this.clip(f, W - pad * 2), pad, y + 14 * s * (i + 1)); });
  }

  // One level, on the whole screen. It used to share the page with the rules, which took half of it
  // to say things that are true of every level; the rules have a tab of their own now and what is
  // left here is this level and nothing else — its idea, its numbers, the rules that are about it in
  // particular, and every room it built, big enough to read. A room opens when you click it.
  drawLevelTab(game, pad, headTop) {
    const ctx = this.ctx, s = this.ts, d = game.dev, W = this.w, H = this.h;
    const page = game.rulesPage(), def = page.def, L = page.level;
    // one tab per level; the one in play carries a mark
    let tx = pad;
    const ty = headTop - 8 * s, th = 18 * s;
    LEVELS.forEach((lv, i) => {
      const label = `${i + 1} ${lv.name}${game.level && game.levelIndex === i ? ' •' : ''}`;
      ctx.font = `700 ${10 * s}px ${FONT_SC}`;
      const w = ctx.measureText(label).width + 14 * s;
      this.devButton(d, tx, ty, w, th, label, 'rules-L' + i, page.index === i);
      tx += w + 4 * s;
    });
    let y = ty + th + 18 * s;
    const full = W - pad * 2;
    ctx.font = `700 ${13 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.ochre;
    ctx.fillText(`${def.sub.toUpperCase()}, ${def.name}`, pad, y);
    ctx.font = `400 ${9 * s}px ${FONT}`; ctx.fillStyle = PALETTE.ash;
    ctx.fillText(page.live ? 'the level in play' : `a sample, seed ${page.seed}`, pad + 260 * s, y);
    this.devButton(d, W - pad - 70 * s, y - 13 * s, 70 * s, 18 * s, 'REROLL', 'rules-roll', false);
    // Opening a level as a picture is most of what the page is for, but sometimes the picture raises
    // a question only walking it answers. PLAY drops the goat straight into this level — this seed if
    // it is the one in play, a fresh one otherwise, the same door LEVELS on the title screen uses — so
    // inspecting a room and standing in it are one tool rather than two.
    this.devButton(d, W - pad - 152 * s, y - 13 * s, 76 * s, 18 * s, 'PLAY LEVEL', 'rules-play', false);
    y += 16 * s;
    if (def.canon) {
      ctx.font = `700 ${11 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.fireHi;
      ctx.fillText(`CANON: ${def.canon.name}`, pad, y);
      ctx.font = `400 ${10 * s}px ${FONT}`; ctx.fillStyle = PALETTE.bone;
      ctx.fillText(this.clip(def.canon.idea, full - 150 * s), pad + 150 * s, y);
      y += 14 * s;
    }
    // HINT / THEME / DECOR: free text on the level definition, painted on the floor (HINT only) or
    // read nowhere else in the game — this page is the only place to see them and to change them.
    // Each line is a click target: `game.devAction` prompts for the new text and, off the dev
    // server, writes it straight back into js/tuning.js the same way a BOONS number is edited.
    ctx.font = `400 ${7.3 * s}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.35)';
    ctx.fillText('click a line below to edit it — saved to js/tuning.js if the dev server is running', pad, y);
    y += 10 * s;
    const editRow = (label, field) => {
      const has = !!def[field];
      ctx.font = `700 ${8.5 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.ochre;
      ctx.fillText(label, pad, y);
      ctx.font = `400 ${8.8 * s}px ${FONT}`; ctx.fillStyle = has ? 'rgba(239,230,208,0.85)' : 'rgba(239,230,208,0.32)';
      ctx.fillText(has ? this.clip(def[field], full - 56 * s) : '(none — click to add)', pad + 56 * s, y);
      d.rects.push({ x: pad, y: y - 9 * s, w: full, h: 11 * s, id: `level-edit=${def.name}.${field}` });
      y += 12 * s;
    };
    editRow('HINT', 'hint');
    editRow('THEME', 'theme');
    editRow('DECOR', 'decor');
    // Every floor's first words side by side (25 Sep 2026: the words a floor opens on, read and
    // edited in one place rather than a tab at a time). Each line edits that level's HINT.
    y += 4 * s;
    ctx.font = `700 ${8.5 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.ochre;
    ctx.fillText('THE WORDS EACH FLOOR OPENS ON', pad, y); y += 11 * s;
    LEVELS.forEach((lv, i) => {
      ctx.font = `400 ${8.2 * s}px ${FONT}`; ctx.fillStyle = lv === def ? PALETTE.fireHi : 'rgba(239,230,208,0.7)';
      ctx.fillText(this.clip(`${i + 1} ${lv.name} — ${lv.hint || '(none — click to add)'}`, full), pad, y);
      d.rects.push({ x: pad, y: y - 9 * s, w: full, h: 10 * s, id: `level-edit=${lv.name}.hint` });
      y += 10 * s;
    });
    y += 4 * s;
    ctx.font = `400 ${8.8 * s}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.7)';
    for (const f of levelFacts(def)) { ctx.fillText(this.clip(f, full), pad, y); y += 11 * s; }

    // What this level in particular is held to: only the rules that have something to say about it —
    // the whole matrix lives on the RULES tab, but the rules unique to one level (the sentry's room,
    // the wheel's own lesson, a soul gate) are exactly the level's own scripted promises, and reading
    // them off a column of dots there meant knowing the matrix by heart first. Named here instead, as
    // chips carrying the rule's own id, so a level's scripted behaviour is legible on the level itself.
    y += 8 * s;
    const results = checkRules(L).filter((r) => r.ok !== null);
    const broken = results.filter((r) => r.ok === false);
    ctx.font = `700 ${9.5 * s}px ${FONT_SC}`;
    ctx.fillStyle = broken.length ? PALETTE.blood : PALETTE.fireHi;
    ctx.fillText(broken.length ? `${broken.length} OF ${results.length} RULES BROKEN HERE` : `ALL ${results.length} RULES THAT APPLY HOLD HERE`, pad, y);
    y += 12 * s;
    let cx2 = pad;
    ctx.font = `700 ${7.6 * s}px ${FONT_SC}`;
    for (const r of results) {
      const w = ctx.measureText(r.rule.id).width + 10 * s;
      if (cx2 + w > pad + full) { cx2 = pad; y += 13 * s; }
      ctx.fillStyle = r.ok ? 'rgba(133,209,151,0.16)' : 'rgba(192,57,43,0.22)';
      ctx.fillRect(cx2, y - 9 * s, w, 12 * s);
      ctx.fillStyle = r.ok ? PALETTE.fireHi : PALETTE.blood;
      ctx.fillText(r.rule.id, cx2 + 5 * s, y);
      cx2 += w + 4 * s;
    }
    if (broken.length) {
      ctx.font = `400 ${9 * s}px ${FONT}`; ctx.fillStyle = PALETTE.blood;
      y += 15 * s;
      for (const r of broken.slice(0, 2)) { ctx.fillText(this.clip(`${r.rule.id}: ${r.why}`, full), pad + 10 * s, y); y += 11 * s; }
    }

    // The rooms, as plans. This is what the tab is for, so it gets everything that is left.
    y += 16 * s;
    const rooms = roomsOf(L);
    ctx.font = `700 ${10 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.ochre;
    ctx.fillText('ROOMS: CLICK ONE TO OPEN IT', pad, y);
    const ord = rooms.filter((r) => ORDINARY.has(r.role)), cn = ord.filter((r) => r.role === 'canon').length;
    const canonRule = results.find((r) => r.rule.id === 'canon');
    ctx.fillStyle = canonRule ? (canonRule.ok ? PALETTE.fireHi : PALETTE.blood) : PALETTE.ash;
    ctx.fillText(def.canon
      ? `CANON ${cn} OF ${ord.length} ORDINARY, ${Math.round(100 * cn / Math.max(1, ord.length))}%, NEEDS ${Math.round(CANON.share * 100)}%`
      : 'NO CANON ON THIS LEVEL', pad + 300 * s, y);
    y += 8 * s;
    const cols = Math.min(this.w < 1100 * s ? 4 : 6, rooms.length);
    const rowsN = Math.ceil(rooms.length / cols);
    const cellW = (full - (cols - 1) * 6 * s) / cols;
    const cellH = clamp((H - y - pad) / rowsN - 7 * s, 50 * s, cellW * 1.5);
    this.roomTiles(game, rooms, L, page.index, pad, y, cellW, cellH, cols, 6 * s);
  }

  // A grid of room plans, each one a button that opens the room sheet. It is the shape the tool
  // thinks in: index, role, men, plan, size and name.
  roomTiles(game, rooms, L, li, x0, y0, cellW, cellH, cols, gap) {
    const ctx = this.ctx, s = this.ts, d = game.dev;
    const roleTint = { canon: PALETTE.ochre, mix: 'rgba(239,230,208,0.45)', trap: PALETTE.blood,
      pen: PALETTE.ash, calm: PALETTE.ash, rest: PALETTE.witchHi, arena: PALETTE.witch, mill: PALETTE.witch,
      hall: PALETTE.witch, gallery: PALETTE.witch, killbox: PALETTE.witch };
    rooms.forEach((r, i) => {
      const cx = x0 + (i % cols) * (cellW + gap), cy = y0 + Math.floor(i / cols) * (cellH + gap);
      const tone = roleTint[r.role] || PALETTE.bone;
      ctx.fillStyle = r.role === 'canon' ? 'rgba(185,135,58,0.14)' : 'rgba(239,230,208,0.04)';
      ctx.fillRect(cx, cy, cellW, cellH);
      ctx.strokeStyle = r.role === 'canon' ? PALETTE.ochre : 'rgba(239,230,208,0.16)';
      ctx.lineWidth = 1 * s; ctx.strokeRect(cx, cy, cellW, cellH);
      ctx.font = `700 ${7.5 * s}px ${FONT_SC}`; ctx.textAlign = 'left';
      ctx.fillStyle = tone; ctx.fillText(`${r.index} ${r.role.toUpperCase()}`, cx + 3 * s, cy + 9 * s);
      ctx.textAlign = 'right'; ctx.fillStyle = r.men.length ? PALETTE.blood : PALETTE.ash;
      ctx.fillText(r.men.length ? '×' + r.men.length : '-', cx + cellW - 3 * s, cy + 9 * s);
      ctx.textAlign = 'left';
      this.roomPlan(L, r, cx + 2 * s, cy + 12 * s, cellW - 4 * s, cellH - 24 * s);
      ctx.font = `400 ${7 * s}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.6)';
      const foot = r.cell && r.cell.intro ? 'meets ' + r.cell.intro : `${r.room.w}×${r.room.h}  ${r.name}`;
      ctx.fillText(this.clip(foot, cellW - 6 * s), cx + 3 * s, cy + cellH - 4 * s);
      // A canon or mix room forced to one hand-authored template — the sentry's four tiles, the
      // ambush corridor — reads as an ordinary room right up until you notice it never changes
      // shape. `r.drawn` is false for exactly those, so the tag is off the same data the ROOMS page
      // and BALANCE's hollow bars already read, not a second guess about which rooms are special.
      if (!r.drawn && ORDINARY.has(r.role)) {
        ctx.font = `700 ${6.4 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.fireHi; ctx.textAlign = 'right';
        ctx.fillText('SCRIPTED', cx + cellW - 3 * s, cy + cellH - 4 * s);
        ctx.textAlign = 'left';
      }
      d.rects.push({ x: cx, y: cy, w: cellW, h: cellH, id: `room=${li},${i}` });
    });
  }

  // THE BESTIARY: every kind that can stand in front of the goat, read live off TUNING so the page
  // cannot say something the game does not. The portrait in each row is not a separate drawing —
  // it is `drawEnemy` itself, called against a stand-in enemy object the way the game calls it
  // against a real one every frame, so a change to a sprite shows up here for free. `edit` on a
  // KINDS entry is every real knob `apply`/`update` actually reads for that kind, each an
  // `[LABEL, [path...]]` pair into TUNING; it is drawn with the same `numChip` BOONS edits its own
  // params in and clicking one goes through `enemy-edit=` in `Game.devAction`, which is nothing more
  // than `persistTuningEdit` under a different root — one editor, one write-through, for every dial
  // in the tool. A stat with no real field behind it (a bearer's own hp, defaulted to 1 in `Enemy`
  // rather than written anywhere) is left as plain text: showing a knob that turns nothing would be
  // lying about what the number does, same as BOONS never lists a param `apply` does not read.
  // The ENEMIES tab's six sliders (`DEV_TUNE`, `game.dev.tune`): a label and its × over a log track
  // (0.3..5) with a mark at 1. The rect pushed is the track itself, so `Game.devSlide` reads the
  // press straight off it; a double press on one, or ALL ×1, puts it back.
  drawTuneSliders(game, x0, y0, W0) {
    const ctx = this.ctx, s = this.ts, d = game.dev, T = d.tune, [lo, hi] = DEV_TUNE_RANGE;
    const gap = 14 * s, resetW = 64 * s, n = DEV_TUNE.length;
    const sw = (W0 - resetW - gap * n) / n;
    const pos = (v) => Math.log(v / lo) / Math.log(hi / lo);
    DEV_TUNE.forEach(([key, label, hint], i) => {
      const x = x0 + i * (sw + gap), v = T[key], off = v !== 1;
      ctx.font = `700 ${7.8 * s}px ${FONT_SC}`; ctx.fillStyle = off ? PALETTE.fireHi : PALETTE.bone;
      ctx.textAlign = 'left'; ctx.fillText(label, x, y0 + 8 * s);
      ctx.textAlign = 'right'; ctx.fillText(`×${v.toFixed(2)}`, x + sw, y0 + 8 * s);
      const ty = y0 + 15 * s, th = 4 * s, one = x + pos(1) * sw, kx = x + pos(v) * sw;
      ctx.fillStyle = 'rgba(239,230,208,0.14)'; ctx.fillRect(x, ty, sw, th);
      ctx.fillStyle = off ? 'rgba(242,162,51,0.6)' : 'rgba(239,230,208,0.3)';
      ctx.fillRect(Math.min(one, kx), ty, Math.abs(kx - one), th);
      ctx.fillStyle = 'rgba(239,230,208,0.55)'; ctx.fillRect(one - 0.5 * s, ty - 3 * s, 1 * s, th + 6 * s);
      ctx.fillStyle = off ? PALETTE.fireHi : PALETTE.bone; ctx.fillRect(kx - 3 * s, ty - 4 * s, 6 * s, th + 8 * s);
      ctx.textAlign = 'left'; ctx.font = `400 ${7 * s}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.42)';
      ctx.fillText(this.clip(`${hint} · double-click = 1`, sw), x, ty + th + 11 * s);
      d.rects.push({ x, y: ty - 8 * s, w: sw, h: th + 16 * s, id: 'tune=' + key, tune: key });
    });
    this.devButton(d, x0 + W0 - resetW, y0 + 3 * s, resetW, 18 * s, 'ALL ×1', 'tune-reset', DEV_TUNE.some(([k]) => T[k] !== 1));
  }

  drawEnemiesTab(game, pad, top) {
    const ctx = this.ctx, s = this.ts, d = game.dev, W = this.w, H = this.h;
    const cycle = (tag, cfg) => tag === 'hunter' ? cfg.aimTime + cfg.reload
      : tag === 'seer' ? cfg.castWind + cfg.castCooldown
      : tag === 'wraith' ? TUNING.wraith.manifest + TUNING.wraith.solidAfter + TUNING.wraith.fadeCd
      : tag === 'butcher' ? cfg.slam.wind + cfg.slam.recover
      : (cfg.windup || 0) + (cfg.swing || 0) + (cfg.recover || 0);
    const levelsFor = (tag) => LEVELS.map((lv, i) => (lv.encounters.kinds.includes(tag)
      || (lv.encounters.introduce || []).some(([k]) => k === tag)
      || (lv.arenas || []).some((a) => a.boss === tag)) ? i + 1 : 0).filter(Boolean);
    const melee = (key) => [['SPEED', [key, 'speed']], ['DMG', [key, 'damage']],
      ['WINDUP', [key, 'windup']], ['SWING', [key, 'swing']], ['RECOVER', [key, 'recover']]];
    const KINDS = [
      { kind: 'bearer', tag: 'bearer', label: 'CLUBMAN', cfg: TUNING.bearer, hp: TUNING.bearer.hp || 1,
        edit: melee('bearer'),
        note: 'Cone plus line of sight. Reads you, winds up, swings once. The wall behind you kills, not his club.' },
      { kind: 'bearer', tag: 'champion', champion: true, label: 'BUTCHER',
        cfg: Object.assign({}, TUNING.bearer, TUNING.champion), hp: 1,
        edit: [['REACH', ['champion', 'reach']], ['WINDUP', ['champion', 'windup']], ['CHARGE HIT', ['champion', 'charge', 'hit']],
          ['KNOCK', ['champion', 'flingMul']], ['CHARGE AT', ['champion', 'charge', 'min']], ['CHARGE SPD', ['champion', 'charge', 'speed']],
          ['CHARGE CD', ['champion', 'charge', 'cooldown']], ['STUN', ['champion', 'charge', 'stun']], ['RAGE', ['champion', 'rage', 'speed']]],
        immune: ['blunder'],
        note: `A clubman with a cleaver and a charge: one hit, like anyone without the outline. Never carried; a headbutt moves him ${Math.round(TUNING.champion.flingMul * 100)}% as far. Seen ${TUNING.champion.charge.min}+ tiles off with a clear run he plants for ${TUNING.champion.charge.wind}s and charges where you are going; into stone he stands stunned ${TUNING.champion.charge.stun}s. On fire he comes on faster instead of running.` },
      // One row for the rule every kind shares (`TUNING.boss`) and the soul only a boss carries.
      { kind: 'bearer', tag: 'boss', boss: true, label: 'BOSS',
        cfg: TUNING.bearer, hp: TUNING.boss.hp,
        edit: [['HP', ['boss', 'hp']], ['SIZE', ['boss', 'scale']], ['LINE', ['boss', 'outline', 'px']],
          ['SOUL HP +', ['soulBearer', 'hp']], ['SOUL KNOCK', ['soulBearer', 'flingMul']]],
        note: `One rule for every kind: without the yellow outline a man dies to one killing blow. The man an arena is built round wears it, stands ${Math.round((TUNING.boss.scale - 1) * 100)}% bigger and takes ${TUNING.boss.hp} (the ogre his own ${TUNING.butcher.hp}); a boss Seer blinks clear after each. Only a boss ever carries a soul: lit amber, eyes red, ${TUNING.soulBearer.hp} more heart${TUNING.soulBearer.hp === 1 ? '' : 's'}, never carried, and a headbutt moves him ${Math.round(TUNING.soulBearer.flingMul * 100)}% as far.` },
      { kind: 'butcher', tag: 'butcher', label: 'OGRE', cfg: TUNING.butcher, hp: TUNING.butcher.hp,
        edit: [['SPEED', ['butcher', 'speed']], ['HP', ['butcher', 'hp']], ['LEAP AT', ['butcher', 'leap', 'min']], ['LEAP MAX', ['butcher', 'leap', 'max']],
          ['CROUCH', ['butcher', 'leap', 'wind']], ['AIR', ['butcher', 'leap', 'air']], ['LANDED', ['butcher', 'leap', 'land']], ['LEAP R', ['butcher', 'leap', 'radius']],
          ['LEAP CD', ['butcher', 'leap', 'cd']], ['SLAM AT', ['butcher', 'slam', 'near']], ['SLAM R', ['butcher', 'slam', 'range']], ['SLAM WIND', ['butcher', 'slam', 'wind']],
          ['SLAM REC', ['butcher', 'slam', 'recover']], ['SIZE', ['butcher', 'scale']], ['RAGE SPD', ['butcher', 'rage', 'speed']], ['RAGE TEMPO', ['butcher', 'rage', 'tempo']]],
        immune: ['blunder'],
        note: `Four hits, never thrown by anything, and the bare horns take none of them: blades, fire, bombs, thrown bodies. Seen ${TUNING.butcher.leap.min}-${TUNING.butcher.leap.max} tiles off he crouches ${TUNING.butcher.leap.wind}s and leaps onto where you stood — over men and holes — and the landing is a ${TUNING.butcher.leap.radius}-tile ring. Within ${TUNING.butcher.slam.near} tiles his fists hit the floor: a ${TUNING.butcher.slam.range}-tile ring after ${TUNING.butcher.slam.wind}s. Both leave him on his knees (${TUNING.butcher.leap.land}s, ${TUNING.butcher.slam.recover}s); his own men in a ring are left standing. Alight he comes at you ${TUNING.butcher.rage.speed}x as fast.` },
      { kind: 'dog', tag: 'dog', label: 'HOUND', cfg: TUNING.dog, hp: TUNING.dog.hp || 1,
        edit: [['SPEED', ['dog', 'speed']], ['DMG', ['dog', 'damage']], ['CHARGE', ['dog', 'windup']], ['RUN AT', ['dog', 'dashRange']],
          ['RUN SPD', ['dog', 'dashSpeed']], ['RUN TIME', ['dog', 'dashTime']], ['TURN', ['dog', 'dashTurn']], ['BEND', ['dog', 'dashSkew']], ['DODGE', ['dog', 'dodge']]],
        immune: ['blunder'],
        note: `Circles, then inside ${TUNING.dog.dashRange} tiles plants for ${TUNING.dog.windup}s with its run drawn on the floor in red — bent, homing — and runs it barking, biting what is in front. Dodges ${Math.round(TUNING.dog.dodge * 100)}% of headbutts outside the run. One at a time per pack.` },
      { kind: 'seer', tag: 'seer', label: 'SEER', cfg: TUNING.seer, hp: TUNING.seer.hp,
        edit: [['SPEED', ['seer', 'speed']], ['DMG', ['seer', 'damage']], ['HP', ['seer', 'hp']],
          ['CAST', ['seer', 'castWind']], ['CAST CD', ['seer', 'castCooldown']], ['BLINK CD', ['seer', 'blinkCooldown']]],
        note: 'Never closes. Blinks away when you get near, paints a rune under himself, near-perfect trap sense. One hit; a boss Seer blinks clear after each of his.' },
      { kind: 'hunter', tag: 'hunter', label: 'HUNTER', cfg: TUNING.hunter, hp: TUNING.hunter.hp || 1,
        edit: [['SPEED', ['hunter', 'speed']], ['DMG', ['hunter', 'damage']],
          ['AIM', ['hunter', 'aimTime']], ['RELOAD', ['hunter', 'reload']],
          ['WILD INSIDE', ['hunter', 'wildNear']], ['WILD', ['hunter', 'wildChance']], ['COCK HEARD', ['hunter', 'cockHear']]],
        sound: 'cock',
        note: `Keeps ${TUNING.hunter.keepMin}-${TUNING.hunter.keepMax} tiles off, fires on a reload timer. Cocks the rifle as he starts to aim — that click is the tell. Inside ${TUNING.hunter.wildNear} tiles ${Math.round(TUNING.hunter.wildChance * 100)}% of his shots go wild. Empties a fixed mag once grabbed, never reloads again.` },
      { kind: 'wraith', tag: 'wraith', label: 'WRAITH', cfg: TUNING.wraith, hp: TUNING.wraith.hp,
        edit: [['SPEED', ['wraith', 'speed']], ['DMG', ['wraith', 'damage']], ['HP', ['wraith', 'hp']],
          ['WINDUP', ['wraith', 'windup']], ['MANIFEST', ['wraith', 'manifest']], ['SOLID', ['wraith', 'solidAfter']], ['FADE', ['wraith', 'fadeCd']], ['HIDE', ['wraith', 'hide', 'start']], ['HIDE AGAIN', ['wraith', 'hide', 'again']], ['SPRING R', ['wraith', 'hide', 'springR']]],
        immune: ['fire', 'stun', 'grab'],
        note: 'Can lie in a room as a box or a bowl of milk; headbutt or reach near it, or step on it, and it strikes from any side. No body, no collision, until it commits. Drifts to your flank or back, manifests, swings once, fades. Dies only in that window. Dead already: an ordinary flame, a scream and BY THE COLLAR all find nothing to take hold of — witchfire still burns it.' },
    ];
    ctx.font = `700 ${11 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.ochre; ctx.textAlign = 'left';
    ctx.fillText('THE BESTIARY', pad, top);
    ctx.font = `400 ${8.5 * s}px ${FONT}`; ctx.fillStyle = PALETTE.ash;
    ctx.fillText('read and edited live off TUNING · the portrait is the same drawEnemy call the game itself uses · click a number to change it', pad + 120 * s, top);

    // How fast each kind moves, read off TUNING the way the step moves him (`this.speed = cfg.speed`,
    // a butcher is a clubman's legs, idle is × `ai.wanderSpeed`, alight × `rage.speed`), in px/s,
    // tiles/s and against the goat: his bare walk (`goat.speed`) and the top of a full run-up
    // (× 1 + `momentum.max`). Nothing typed here, so a retune of any pace shows up at once.
    // Both sides × their SPEED slider (`game.dev.tune`), the way the step moves them; the ogre's leap
    // is a timed arc and does not take it.
    const es = d.tune.enemySpeed, gs = d.tune.goatSpeed;
    const walk = TUNING.goat.speed * gs, topSp = walk * (1 + TUNING.goat.momentum.max);
    const idle = (v) => ['IDLE', v * TUNING.ai.wanderSpeed];
    const paceOf = (tag) => paceRaw(tag).map(([l, v]) => [l, l === 'LEAP ≤' ? v : v * es]);
    const paceRaw = (tag) => {
      const B = TUNING.bearer, C = TUNING.champion, O = TUNING.butcher, D = TUNING.dog;
      if (tag === 'bearer' || tag === 'boss') return [['CHASE', B.speed], idle(B.speed)];
      if (tag === 'champion') return [['CHASE', B.speed], ['CHARGE', C.charge.speed], ['ALIGHT', B.speed * C.rage.speed], idle(B.speed)];
      if (tag === 'butcher') return [['CHASE', O.speed], ['LEAP ≤', O.leap.max * TILE / O.leap.air], ['ALIGHT', O.speed * O.rage.speed], idle(O.speed)];
      if (tag === 'dog') return [['CHASE', D.speed], ['RUN', D.dashSpeed], idle(D.speed)];
      if (tag === 'wraith') return [['DRIFT', TUNING.wraith.speed]];
      return [['MOVE', TUNING[tag].speed], idle(TUNING[tag].speed)];
    };
    const paceLine = (label, v) => `${label} ${Math.round(v)} px/s · ${(v / TILE).toFixed(1)} t/s · ×${(v / walk).toFixed(2)}`;

    // THE SLIDERS, above the table: six live multipliers for trying combinations (`DEV_TUNE`).
    const band = 36 * s;
    this.drawTuneSliders(game, pad, top + 8 * s, W - pad * 2);
    const rowH = Math.min(84 * s, Math.max(58 * s, (H - top - band - 24 * s - 150 * s - pad) / KINDS.length));
    const thumb = Math.min(rowH - 6 * s, 52 * s);
    // 340 wide: at 230 the OGRE's sixteen chips wrapped to six rows and spilled over the HOUND's.
    const nameX = pad + thumb + 12 * s, statsX = nameX + 150 * s, statsW = 340 * s,
      speedX = statsX + statsW + 12 * s, speedW = 150 * s, noteX = speedX + speedW + 10 * s;
    let y = top + band + 18 * s;
    ctx.font = `700 ${7.5 * s}px ${FONT_SC}`; ctx.fillStyle = 'rgba(239,230,208,0.5)';
    [[nameX, 'KIND'], [statsX, 'STATS'], [speedX, 'SPEED  (× = of goat walk)'], [noteX, 'BEHAVIOUR']].forEach(([cx, label]) => ctx.fillText(label, cx, y));
    y += 10 * s;
    KINDS.forEach((k, i) => {
      const ry = y + i * rowH;
      if (i % 2) { ctx.fillStyle = 'rgba(239,230,208,0.03)'; ctx.fillRect(pad - 4 * s, ry, W - pad * 2 + 8 * s, rowH); }
      const fake = { x: pad + thumb / 2, y: ry + thumb / 2 + 6 * s, r: k.cfg.radius, kind: k.kind,
        champion: !!k.champion, boss: !!k.boss, elite: !!k.boss, facing: Math.PI / 2, hp: k.hp, maxHp: k.hp,
        dead: false, ghosted: false, vx: 0, vy: 0, flash: 0, burning: 0, bombFuse: 0, dazed: 0,
        state: 'idle', say: null, soul: !!k.soul, witchBurn: false };
      ctx.save(); this.drawEnemy(fake, game); ctx.restore();
      ctx.textAlign = 'left';
      ctx.font = `700 ${9.5 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.bone;
      ctx.fillText(k.label, nameX, ry + 12 * s);
      ctx.font = `400 ${7.5 * s}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.45)';
      const lv = levelsFor(k.tag);
      ctx.fillText(`threat ${THREAT[k.tag] === undefined ? '-' : THREAT[k.tag]} · levels ${lv.length ? lv.join(',') : '-'}`, nameX, ry + 24 * s);
      ctx.fillStyle = 'rgba(239,230,208,0.35)';
      ctx.fillText(`cycle ${cycle(k.tag, k.cfg).toFixed(2)}s`, nameX, ry + 35 * s);
      // Every real knob for this kind, as chips wrapped into the stats column — the same box and the
      // same click BOONS already uses, so the bestiary is not a second kind of editor.
      let px = statsX, py = ry + 2 * s;
      for (const [label, path] of k.edit) {
        let obj = TUNING; for (let j = 0; j < path.length - 1; j++) obj = obj[path[j]];
        const val = obj[path[path.length - 1]];
        ctx.font = `700 ${8 * s}px ${FONT_SC}`;
        const shown = typeof val === 'number' && !Number.isInteger(val) ? Math.round(val * 100) / 100 : val;
        const w = ctx.measureText(`${label} ${shown}`).width + 10 * s;
        if (px + w > statsX + statsW) { px = statsX; py += 19 * s; }
        this.numChip(d, px, py, label, val, `enemy-edit=${path.join('.')}`);
        px += w + 5 * s;
      }
      // A kind with a sound of its own gets a button to hear it, off the same call the game makes.
      if (k.sound) this.devButton(d, nameX, ry + 40 * s, 58 * s, 13 * s, 'HEAR ' + k.sound.toUpperCase(), `enemy-sound=${k.sound}`, false);
      // Immunity checkboxes: `TUNING.<kind>.immune.<flag>`, on where the flag is true. A kind with
      // none of these listed has no immune object at all and nothing to click — fire, stun, a grab
      // and the burning-blunder all read the same as every other man's.
      if (k.immune) {
        let fx = nameX;
        for (const flag of k.immune) {
          const on = !!(k.cfg.immune && k.cfg.immune[flag]);
          const label = flag.toUpperCase();
          ctx.font = `700 ${7.5 * s}px ${FONT_SC}`;
          const fw = ctx.measureText(label).width + 10 * s;
          this.devButton(d, fx, ry + 40 * s, fw, 13 * s, label, `enemy-flag=${k.tag}.immune.${flag}`, on);
          fx += fw + 4 * s;
        }
      }
      // SPEED: the pace he hunts you at first and brightest, what that is against the goat's walk
      // and his top after a run-up, then each other gait he has (a burst, alight, idling).
      const [main, ...more] = paceOf(k.tag);
      ctx.font = `700 ${7.8 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.bone;
      ctx.fillText(this.clip(`${main[0]} ${Math.round(main[1])} px/s · ${(main[1] / TILE).toFixed(1)} t/s`, speedW), speedX, ry + 12 * s);
      ctx.font = `400 ${7.5 * s}px ${FONT}`; ctx.fillStyle = PALETTE.fireHi;
      ctx.fillText(this.clip(`goat ×${(main[1] / walk).toFixed(2)} walk · ×${(main[1] / topSp).toFixed(2)} top`, speedW), speedX, ry + 22 * s);
      ctx.fillStyle = 'rgba(239,230,208,0.5)';
      more.slice(0, Math.max(0, Math.floor((rowH - 26 * s) / (9.5 * s)))).forEach(([label, v], mi) =>
        ctx.fillText(this.clip(paceLine(label, v), speedW), speedX, ry + 32 * s + mi * 9.5 * s));
      ctx.fillStyle = 'rgba(239,230,208,0.62)'; ctx.font = `400 ${7.8 * s}px ${FONT}`;
      const lines = this.wrap(k.note, W - pad - noteX - 6 * s).slice(0, 5);
      lines.forEach((l, li) => ctx.fillText(l, noteX, ry + 12 * s + li * 10 * s));
    });

    // THE GOAT, underneath: the numbers everything above is measured against, and just as editable —
    // every chip here is a real path into `TUNING.goat`, so a change lands exactly where the goat's
    // own `update` reads it from.
    const gy = y + KINDS.length * rowH + 18 * s;
    ctx.font = `700 ${10 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.ochre;
    ctx.fillText('THE GOAT', pad, gy);
    // The yardstick every × above is taken against, in the same units.
    const gPace = (label, v) => `${label} ${Math.round(v)} px/s · ${(v / TILE).toFixed(1)} t/s`;
    ctx.font = `400 ${8 * s}px ${FONT}`; ctx.fillStyle = PALETTE.fireHi;
    ctx.fillText(this.clip([gPace('WALK', walk), gPace(`TOP (after ${TUNING.goat.momentum.time}s run-up)`, topSp),
      gPace('ROLL', TUNING.goat.roll.speed * gs), `1 tile = ${TILE} px`].join('     '), W - pad * 2 - 90 * s), pad + 80 * s, gy);
    const goatEdit = [
      ['SPEED', ['goat', 'speed']], ['HP', ['goat', 'hp']],
      ['RUN-UP MAX', ['goat', 'momentum', 'max']], ['RUN-UP AFTER', ['goat', 'momentum', 'time']],
      ['BUTT WINDUP', ['goat', 'headbutt', 'windup']], ['BUTT RECOVER', ['goat', 'headbutt', 'recovery']],
      ['GRAB HOLD', ['goat', 'grab', 'holdTime']], ['GRAB CD', ['goat', 'grab', 'cooldown']],
      ['ROLL TIME', ['goat', 'roll', 'duration']], ['ROLL CD', ['goat', 'roll', 'cooldown']],
      ['SCREAM CD', ['goat', 'scream', 'cooldown']],
    ];
    let gx = pad, gyy = gy + 8 * s;
    for (const [label, path] of goatEdit) {
      let obj = TUNING; for (let j = 0; j < path.length - 1; j++) obj = obj[path[j]];
      const val = obj[path[path.length - 1]];
      ctx.font = `700 ${8 * s}px ${FONT_SC}`;
      // Measured as numChip prints it (rounded), or a raw PACE float leaves a gap after the chip.
      const shownG = typeof val === 'number' && !Number.isInteger(val) ? Math.round(val * 100) / 100 : val;
      const w = ctx.measureText(`${label} ${shownG}`).width + 10 * s;
      if (gx + w > W - pad) { gx = pad; gyy += 19 * s; }
      this.numChip(d, gx, gyy, label, val, `enemy-edit=${path.join('.')}`);
      gx += w + 5 * s;
    }
  }

  // THE UPGRADES: every boon in BOONS, off the same table the game deals cards from. Click a number
  // to change it — `params` is the only place a boon's `apply` reads a multiplier from, so nothing
  // here can show a knob the game does not actually turn. It takes effect at once (`applyBoons`
  // re-reads `params` off the live BOONS entries) and is asked to land in js/tuning.js itself
  // through the dev server (`tools/tuning-patch.js`); off the server the edit stays session-only.
  // MIN LVL is the dev tool's own gate on a card ever being dealt — 0 (ANY) until somebody sets one.
  drawBoonsTab(game, pad, top) {
    const ctx = this.ctx, s = this.ts, W = this.w, H = this.h, d = game.dev;
    ctx.font = `700 ${11 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.ochre; ctx.textAlign = 'left';
    ctx.fillText('THE UPGRADES', pad, top);
    ctx.font = `400 ${8.5 * s}px ${FONT}`; ctx.fillStyle = PALETTE.ash;
    ctx.fillText('click a number to change it: takes effect now, saved to js/tuning.js if the dev server is running', pad + 120 * s, top);

    const rowH = Math.min(48 * s, Math.max(36 * s, (H - top - 24 * s - pad) / BOONS.length));
    const iconW = 30 * s, nameX = pad + iconW + 10 * s, nameW = Math.min(230 * s, W * 0.28),
      levelX = nameX + nameW + 8 * s, paramsX = levelX + 62 * s;
    let y = top + 20 * s;
    BOONS.forEach((b, i) => {
      const ry = y + i * rowH;
      if (i % 2) { ctx.fillStyle = 'rgba(239,230,208,0.03)'; ctx.fillRect(pad - 4 * s, ry, W - pad * 2 + 8 * s, rowH); }
      ctx.textAlign = 'center'; ctx.font = `${Math.min(22, rowH * 0.46) * s}px ${FONT}`;
      ctx.fillText(b.emoji || '•', pad + iconW / 2, ry + rowH / 2 + 6 * s);
      ctx.textAlign = 'left';
      ctx.font = `700 ${9.5 * s}px ${FONT_SC}`; ctx.fillStyle = b.active ? PALETTE.blood : PALETTE.ochre;
      ctx.fillText(b.name, nameX, ry + 13 * s);
      ctx.font = `400 ${7.8 * s}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.55)';
      ctx.fillText(this.clip(b.desc, nameW), nameX, ry + 24 * s);
      ctx.font = `400 ${7.2 * s}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.38)';
      const tags = [b.skill ? b.skill.toUpperCase() : 'BODY WORK', b.needs ? 'needs ' + b.needs : null].filter(Boolean).join(' · ');
      ctx.fillText(tags, nameX, ry + rowH - 5 * s);
      // The marks: who this one is read with (both ways round, so a pair shows on both rows) and who
      // it quietly helps. Violet for a synergy, the dim ochre for an addition.
      const nameOf = (id) => (BOONS.find((o) => o.id === id) || { name: id }).name;
      const withIds = [...new Set([...(b.synergy || []), ...BOONS.filter((o) => (o.synergy || []).includes(b.id)).map((o) => o.id)])];
      let mx = nameX + ctx.measureText(tags).width + 10 * s;
      ctx.font = `700 ${7 * s}px ${FONT_SC}`;
      // Both stop short of MIN LVL: the params column wraps down into this row.
      const markEnd = levelX - 6 * s;
      if (withIds.length && mx < markEnd) {
        const t = this.clip('WITH ' + withIds.map(nameOf).join(', '), markEnd - mx);
        ctx.fillStyle = PALETTE.witchHi; ctx.fillText(t, mx, ry + rowH - 5 * s);
        mx += ctx.measureText(t).width + 10 * s;
      }
      if (b.addition && b.addition.length && mx < markEnd - 30 * s) {
        ctx.fillStyle = 'rgba(242,162,51,0.75)';
        ctx.fillText(this.clip('ADDS TO ' + b.addition.map(nameOf).join(', '), markEnd - mx), mx, ry + rowH - 5 * s);
      }

      // MIN LVL: the dev tool's own gate, edited the same way a param is
      const lvlLabel = (b.minLevel || 0) > 0 ? 'L' + (b.minLevel + 1) + '+' : 'ANY';
      ctx.font = `700 ${8 * s}px ${FONT_SC}`; ctx.fillStyle = 'rgba(239,230,208,0.55)';
      ctx.fillText('MIN LVL', levelX, ry + 13 * s);
      ctx.fillStyle = 'rgba(185,135,58,0.22)'; ctx.fillRect(levelX, ry + 16 * s, 46 * s, 16 * s);
      ctx.strokeStyle = 'rgba(242,162,51,0.5)'; ctx.lineWidth = 1 * s; ctx.strokeRect(levelX, ry + 16 * s, 46 * s, 16 * s);
      ctx.fillStyle = PALETTE.fireHi; ctx.textAlign = 'center';
      ctx.fillText(lvlLabel, levelX + 23 * s, ry + 27.5 * s);
      ctx.textAlign = 'left';
      d.rects.push({ x: levelX, y: ry + 16 * s, w: 46 * s, h: 16 * s, id: `boon-edit=${b.id}.minLevel` });

      // every numeric knob `apply` actually reads — none at all for a boon that only flips a flag
      let px = paramsX, py = ry + rowH / 2 - 9 * s;
      const entries = Object.entries(b.params || {});
      if (!entries.length) {
        ctx.font = `400 ${7.5 * s}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.28)';
        ctx.fillText('(flag only, nothing numeric to turn)', paramsX, ry + rowH / 2 + 3 * s);
      }
      entries.forEach(([key, val]) => {
        ctx.font = `700 ${8 * s}px ${FONT_SC}`;
        const w = ctx.measureText(`${key} ${val}`).width + 10 * s;
        if (px + w > W - pad) { px = paramsX; py += 20 * s; }
        this.numChip(d, px, py, key, val, `boon-edit=${b.id}.params.${key}`);
        px += w + 6 * s;
      });
    });
  }

  // STATUS: the three things that can be wrong with a man, the three reactions where two of them
  // meet, and the goat's own poison, all off `TUNING.status` (and the few older numbers stun and
  // fire already had). Every number is a chip and a click edits it through `enemy-edit=`, which is
  // a plain path into TUNING — one editor for the whole tool. The matrix in the middle is the
  // picture to remember: a cell is what happens when the row meets the column, in either order.
  drawStatusTab(game, pad, top) {
    const ctx = this.ctx, s = this.ts, W = this.w, d = game.dev;
    const chips = (list, x, y, maxX) => {
      let px = x, py = y;
      for (const [label, path] of list) {
        let obj = TUNING; for (let j = 0; j < path.length - 1; j++) obj = obj[path[j]];
        const val = obj[path[path.length - 1]];
        const shown = typeof val === 'number' && !Number.isInteger(val) ? Math.round(val * 100) / 100 : val;
        ctx.font = `700 ${8 * s}px ${FONT_SC}`;
        const w = ctx.measureText(`${label} ${shown}`).width + 10 * s;
        if (px + w > maxX) { px = x; py += 19 * s; }
        this.numChip(d, px, py, label, val, `enemy-edit=${path.join('.')}`);
        px += w + 5 * s;
      }
      return py + 19 * s;
    };
    const icon = (id, x, y, r) => {
      if (id === 'poison') {
        ctx.fillStyle = PALETTE.venom;
        ctx.beginPath(); ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x + r * 0.9, y + r * 0.2, x, y + r * 0.8);
        ctx.quadraticCurveTo(x - r * 0.9, y + r * 0.2, x, y - r); ctx.fill();
        ctx.fillStyle = PALETTE.venomHi; ctx.beginPath(); ctx.arc(x - r * 0.2, y + r * 0.15, r * 0.18, 0, Math.PI * 2); ctx.fill();
      } else if (id === 'stun') {
        ctx.fillStyle = PALETTE.fireHi;
        for (let k = 0; k < 3; k++) { const a = this.t * 3 + k * 2.1; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.35, r * 0.22, 0, Math.PI * 2); ctx.fill(); }
      } else this.flame(x, y + r * 0.5, r * 1.1, 3, false);
    };
    const NAMES = { poison: 'POISON', stun: 'STUN', fire: 'FIRE' };
    const COL = { poison: PALETTE.venomHi, stun: PALETTE.fireHi, fire: PALETTE.fire };
    ctx.textAlign = 'left';
    ctx.font = `700 ${11 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.ochre;
    ctx.fillText('STATUSES AND REACTIONS', pad, top);
    ctx.font = `400 ${8.5 * s}px ${FONT}`; ctx.fillStyle = PALETTE.ash;
    ctx.fillText('read and edited live off TUNING.status · click a number to change it · js/status.js is the code', pad + 190 * s, top);

    // ---- the three statuses ----
    const ROWS = [
      { id: 'poison', edit: [['TIME', ['status', 'poison', 'time']], ['STRIDE', ['status', 'poison', 'moveMul']],
          ['TEMPO', ['status', 'poison', 'tempo']], ['PUDDLE', ['status', 'poison', 'pool']]],
        note: 'Blind: a rifle cannot aim and a mage cannot paint, held or standing. Slow: STRIDE of his speed, and his own clock (windup, swing, recovery, reload) runs at TEMPO. Comes from the goat\'s poison souls and from any puddle. The goat himself never has it.' },
      { id: 'stun', edit: [['BAAH', ['goat', 'scream', 'stun']], ['PARRY', ['goat', 'scream', 'balkStun']], ['CRATE', ['prop', 'crate', 'stun']]],
        note: 'The stars (Enemy.dazed): THE FULL THROAT, the bare BAAH breaking a swing, DEAD WEIGHT, a crate in the face. He stands there and does nothing until it passes.' },
      { id: 'fire', edit: [['BURNS', ['fire', 'burnRunTime']], ['POOL', ['fire', 'pool']], ['WITCH', ['fire', 'witch']]],
        note: 'Alight, he blunders with no AI and dies when it burns out: one hit, so a two-heart man gets up once. The Butcher loses a heart a tick instead.' },
    ];
    const noteX = pad + 250 * s, rowH = 54 * s;
    let y = top + 16 * s;
    ROWS.forEach((r, i) => {
      if (i % 2) { ctx.fillStyle = 'rgba(239,230,208,0.03)'; ctx.fillRect(pad - 4 * s, y - 4 * s, W - pad * 2 + 8 * s, rowH); }
      icon(r.id, pad + 14 * s, y + 18 * s, 11 * s);
      ctx.font = `700 ${10 * s}px ${FONT_SC}`; ctx.fillStyle = COL[r.id]; ctx.textAlign = 'left';
      ctx.fillText(NAMES[r.id], pad + 34 * s, y + 12 * s);
      chips(r.edit, pad + 34 * s, y + 18 * s, noteX - 8 * s);
      ctx.font = `400 ${7.8 * s}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.62)';
      this.wrap(r.note, W - pad - noteX).slice(0, 4).forEach((l, k) => ctx.fillText(l, noteX, y + 10 * s + k * 10.5 * s));
      y += rowH;
    });

    // ---- the matrix ----
    y += 10 * s;
    ctx.font = `700 ${10 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.ochre; ctx.fillText('WHERE TWO MEET', pad, y);
    const REACT = {
      'poison|fire': { name: 'IT GOES OFF', edit: [['RADIUS', ['status', 'blast', 'radius']], ['HIT INSIDE', ['status', 'blast', 'hitR']],
          ['THROW', ['status', 'blast', 'impulse']], ['GOAT SHOVE', ['status', 'blast', 'goatPush']]],
        note: 'A poisoned man catches, a burning man is poisoned, or a flame reaches a puddle. A hit on everyone inside HIT INSIDE tiles, a throw out to RADIUS, the goat shoved and never hurt; the puddle round it burns off.' },
      'poison|stun': { name: 'SHOCK', edit: [['STUN s', ['status', 'sting', 'stun']], ['POISON s', ['status', 'sting', 'poison']]],
        note: 'A poisoned man is stunned, or a stunned one poisoned. No hit: he is in shock, frozen for STUN s and blind for POISON s, one spiral over his head for both.' },
      'stun|fire': { name: 'SCALD', edit: [['HITS', ['status', 'scald', 'damage']]],
        note: 'A stunned man catches, or a burning one is stunned. The stun is spent and the fire that has him does that many hits instead of one.' },
    };
    const ids = ['poison', 'stun', 'fire'], cw = Math.min(118 * s, (W - pad * 2) * 0.13), chH = 30 * s;
    const mx = pad, my = y + 10 * s;
    ids.forEach((id, k) => {
      const hx = mx + cw * (k + 1), vy = my + chH * (k + 1);
      icon(id, hx + 14 * s, my + 13 * s, 7 * s); icon(id, mx + 12 * s, vy + 14 * s, 7 * s);
      ctx.font = `700 ${8.5 * s}px ${FONT_SC}`; ctx.fillStyle = COL[id];
      ctx.fillText(NAMES[id], hx + 26 * s, my + 17 * s); ctx.fillText(NAMES[id], mx + 24 * s, vy + 18 * s);
    });
    ids.forEach((a, i) => ids.forEach((b, j) => {
      const cx = mx + cw * (j + 1), cy = my + chH * (i + 1);
      const key = REACT[a + '|' + b] ? a + '|' + b : REACT[b + '|' + a] ? b + '|' + a : null;
      ctx.fillStyle = key ? 'rgba(185,135,58,0.14)' : 'rgba(239,230,208,0.03)'; ctx.fillRect(cx + 2 * s, cy + 2 * s, cw - 4 * s, chH - 4 * s);
      ctx.font = `700 ${8.5 * s}px ${FONT_SC}`; ctx.fillStyle = key ? PALETTE.fireHi : 'rgba(239,230,208,0.2)';
      ctx.textAlign = 'center'; ctx.fillText(key ? REACT[key].name : '—', cx + cw / 2, cy + chH / 2 + 3 * s); ctx.textAlign = 'left';
    }));
    // what each reaction does, beside the matrix
    const lx = mx + cw * 4 + 18 * s;
    let ly = my + 4 * s;
    for (const key of Object.keys(REACT)) {
      const R = REACT[key], [a, b] = key.split('|');
      ctx.font = `700 ${9.5 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.bone;
      ctx.fillText(`${NAMES[a]} + ${NAMES[b]} — ${R.name}`, lx, ly + 9 * s);
      const after = chips(R.edit, lx, ly + 14 * s, W - pad);
      ctx.font = `400 ${7.8 * s}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.6)';
      const lines = this.wrap(R.note, W - pad - lx).slice(0, 3);
      lines.forEach((l, k) => ctx.fillText(l, lx, after + 6 * s + k * 10.5 * s));
      ly = after + 12 * s + lines.length * 10.5 * s;
    }

    // ---- the goat's poison ----
    y = Math.max(my + chH * 4 + 16 * s, ly + 6 * s);
    ctx.font = `700 ${10 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.ochre; ctx.fillText('WHERE IT COMES FROM', pad, y);
    const SRC = [
      ['💦 SPLASH (butt)', [['REACH', ['status', 'splash', 'range']], ['BEHIND PAST', ['status', 'splash', 'back']]]],
      ['🐍 VENOM JAW (grab)', [['PUDDLE HALF', ['status', 'jaw', 'half']], ['TOUCH', ['status', 'jaw', 'touch']]]],
      ['☄️ FIREBRAND (grab)', [['BURNS', ['status', 'brand', 'burn']], ['GAP', ['status', 'brand', 'gap']]]],
      ['🦠 SOUR TUMBLE (roll)', [['PUDDLE HALF', ['status', 'tumble', 'half']]]],
      ['🫧 VENOM SPIT (scream)', [['SPEED', ['status', 'spit', 'speed']], ['RANGE', ['status', 'spit', 'range']], ['PUDDLE HALF', ['status', 'spit', 'half']]]],
    ];
    let sy = y + 8 * s;
    for (const [name, list] of SRC) {
      ctx.font = `700 ${8.5 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.bone; ctx.textAlign = 'left';
      ctx.fillText(name, pad, sy + 11 * s);
      sy = chips(list, pad + 170 * s, sy, W - pad);
    }
    ctx.font = `400 ${7.8 * s}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.45)';
    ctx.fillText('the hold time of VENOM JAW and FIREBRAND, and the SPIT cooldown, are the boons\' own params on the BOONS tab', pad, sy + 8 * s);
  }

  // THE FIXTURES: every kind of Prop that stands in a room, read live off TUNING the way the
  // bestiary reads enemies. The thumbnail is a real `Prop`, drawn with the game's own `drawProp` —
  // a brazier or a stand of arms shown here is the same call the game makes against it, so a change
  // to a sprite shows up here for free. `hits` on an entry is every way something in the game meets
  // this prop — a headbutt, something thrown at it, fire, a body arriving — as badges rather than
  // buried in the prose: the note still says what happens, the badges say who can make it happen.
  drawPropsTab(game, pad, top) {
    const ctx = this.ctx, s = this.ts, W = this.w, H = this.h, P = TUNING.prop;
    const FIXTURES = [
      { kind: 'brazier', label: 'BRAZIER', make: (x, y) => new Prop(x, y, 'brazier'), hits: ['HEADBUTT', 'BODY', 'THROWN', 'FIRE'],
        stats: `spill ${P.brazier.spill} tiles, alight ${P.brazier.spillTime}s, refills in ${P.brazier.spillCd}s`,
        note: 'A headbutt, or a body arriving fast enough, knocks a pool of coals out its far side. A crate or a weapon that reaches it goes up too, and a man already burning lights the next one he touches once KINDLING is taken.' },
      { kind: 'brazier', label: 'THE ROAST', make: (x, y) => new Prop(x, y, 'brazier', { roast: true }), hits: ['HEADBUTT', 'BODY', 'THROWN', 'FIRE'],
        stats: `${Math.round(P.brazier.roast * 100)}% of braziers, one a level at most · turns every ${(Math.PI * 2 / P.brazier.roastTurn).toFixed(1)}s`,
        note: 'A brazier in every way that matters — lights, spills, burns — drawn as a campfire with a crocodile turning on a spit over it. Which ones roast is picked off the tile, so no seed changes for it.' },
      { kind: 'lamp', label: 'LAMP POST', make: (x, y) => new Prop(x, y, 'lamp'), hits: ['BODY', 'FIRE'],
        stats: `topples above ${Math.round(P.lamp.knock)}px/s of impact, pours oil ${P.lamp.poolRadius} tiles across`,
        note: 'Not a pillar — a fast body (flung, charging, or falling past it) knocks it over, and it pours a burning pool of oil where it lands. The only way to start a fire in a room with no brazier in it.' },
      { kind: 'crate', label: 'CRATE', make: (x, y) => new Prop(x, y, 'crate'), hits: ['HEADBUTT', 'THROWN', 'FIRE'],
        stats: `floors for ${P.crate.stun}s on a hit, catches if thrown through flame and leaves one tile burning ${P.crate.burstTime}s`,
        note: 'The one thing on the floor you pick up and throw. Breaks on a door, table, gong or man; a burning tile makes it burst into a wider, longer fire instead of just breaking. Carried, it blocks one club for free, then it is gone.' },
      { kind: 'barrel', label: 'BARREL', make: (x, y) => new Prop(x, y, 'barrel'), hits: ['HEADBUTT', 'BODY', 'FIRE'],
        stats: `rolls at ${(P.barrel.roll / TILE).toFixed(0)} tiles/s, bowls men at x${P.barrel.fling} keeping ${Math.round(P.barrel.keep * 100)}% each, breaks above ${(P.barrel.breakSpeed / TILE).toFixed(0)} tiles/s · lit, goes up ${P.barrel.burst} tiles wide ${P.barrel.fuse}s later`,
        note: 'Too heavy to lift. A headbutt tips it over and it rolls on down the line, bowling every man it meets into whatever is behind him; the barrel kills nobody, the wall does. Flame under it or a burning man against it lights the oil, and it goes up wherever it has rolled to.' },
      { kind: 'weapon', label: 'STAND OF ARMS', make: (x, y) => new Prop(x, y, 'weapon', { weapon: 'sword' }), hits: ['HEADBUTT', 'THROWN', 'BODY'],
        stats: `sword: ${P.weapon.uses.sword} cuts or walls, ${Math.round(P.weapon.swordShare * 100)}% of loose stands · shield: ${P.weapon.uses.shield} men or bullets before it snaps`,
        note: `Grab it, carry it, let go or press headbutt to throw it. A sword cuts whoever its blade touches, thrown or still in the teeth, and is gone after ${P.weapon.uses.sword === 1 ? 'one cut or wall' : P.weapon.uses.sword + ' cuts or walls'}; a shield knocks a row flat and turns bullets and every blow from its side while carried, and a man who swings into it eats the parry.` },
      { kind: 'table', label: 'TABLE', make: (x, y) => new Prop(x, y, 'table'), hits: ['HEADBUTT', 'BODY'],
        stats: `pushes at ${Math.round(P.table.pushSpeed)}px/s, kills above ${Math.round(P.table.killSpeed)}px/s`,
        note: 'Shoved or charged, it stops anything smaller and turns bullets. Above killSpeed — mostly a Butcher’s charge — it kills whoever it hits and can take a door off its hinges on the way through.' },
      { kind: 'door', label: 'DOOR', make: (x, y) => new Prop(x, y, 'door', { iron: true }), hits: ['HEADBUTT', 'BODY'],
        stats: `plank 1 hit · iron ${P.door.ironHits} · vault ${P.door.vaultHits} · stairs ${P.door.stairHits} · clock shuts in ${P.door.clockFor}s`,
        note: 'Iron refuses to be shouldered open: it is broken or it stays shut, so every blow on one is noise with whatever heard the first already coming. A table above killSpeed, or a Butcher’s charge, smashes through instead of counting blows.' },
      { kind: 'mill', label: 'THE MILL', make: (x, y) => new Prop(x, y, 'mill'), hits: ['BODY'],
        stats: `arm ${(TUNING.mill.armLen / TILE).toFixed(1)} tiles, ${TUNING.mill.damage} dmg, ${TUNING.mill.hitCooldown}s between passes`,
        note: 'A sweeping arm that does not care whose side you are on. Trap sense is what lets a man dodge it or ride it into a wall — it only ever knocks down, so what it kills against is whatever the room put behind him.' },
      { kind: 'spike', label: 'SPIKE GRATE', make: (x, y) => new Prop(x, y, 'spike'), hits: ['BODY'],
        stats: `arms ${P.spike.arm}s after a step, up ${P.spike.up}s, laid ${P.spike.run[0]}–${P.spike.run[1]} tiles at a time`,
        note: 'Floor, not furniture: crossing a plate arms it and the teeth come up a beat later, behind whoever tripped it. Anything alive trips one but a wraith in mist; trap sense is what lets a man in a crowd walk round it instead.' },
      { kind: 'spire', label: 'STONE TEETH', make: (x, y) => new Prop(x, y, 'spire'), hits: ['BODY'],
        stats: `${Math.round(TUNING.cave.spikes.chance * 100)}% of the cave's ordinary rooms, ${TUNING.cave.spikes.perRoom} at most · ${TUNING.cave.spikes.damage} heart`,
        note: 'Rock standing up at the foot of a cave wall, and the one thing growing on the rock that is real. It never arms and never rests: anything that touches it pays. A man dies on it, the goat pays a heart, and everyone with eyes steers round it — so it is a thing to throw men into, on the wall that was already the weapon. Never on the trip.' },
      { kind: 'secret', label: 'SECRET WALL', make: (x, y) => new Prop(x, y, 'secret'), hits: ['HEADBUTT'],
        stats: `${P.secret.hits} hits to open, the niche behind it stays lit after`,
        note: 'Ordinary wall until the second blow: blocks sight and bullets like stone right up to the crack. Behind it is always a stand of arms, and — secret.healChance of the time — the rarer patch of grass, never a room or a corridor.' },
      { kind: 'heal', label: 'GRASS', make: (x, y) => new Prop(x, y, 'heal'), hits: ['BODY'],
        stats: `graze ${P.heal.grazeTime}s under ${P.heal.grazeSpeed}px/s for +1 heart`,
        note: 'Grazed, not grabbed: hold still (or nearly) inside it and it pays out once. Running through it on the way past does nothing — the point is that it costs a beat of standing in the open. What a level hands out on its own rhythm, every few rooms.' },
      { kind: 'heal', label: 'GRASS PATCH', make: (x, y) => new Prop(x, y, 'heal', { big: true }), hits: ['BODY'],
        stats: `graze ${P.heal.grazeTime}s under ${P.heal.grazeSpeed}px/s for +2 hearts`,
        note: 'The rare one: worth twice the milk, and only ever behind a secret wall — never on the level’s own rhythm.' },
      { kind: 'bell', label: 'BELL', make: (x, y) => new Prop(x, y, 'bell'), hits: ['HEADBUTT', 'BODY'],
        stats: `${P.bell.buff}s of ×${P.bell.speedMul} speed, ×${P.bell.cooldownMul} faster cooldowns`,
        note: 'Rung, it buys a stretch of speed and quick hands for a noise the whole floor hears at once. A terrible trade in an empty room; the best one you get in a full one.' },
      { kind: 'coop', label: 'COOP & HEN', make: (x, y) => new Prop(x, y, 'coop'), hits: ['HEADBUTT', 'BODY'],
        stats: `${P.coop.hits} hit to open · kicked at ${Math.round(P.chicken.launchSpeed)}px/s · kills once · +${P.chicken.saveHearts} heart if she reaches the stairs`,
        note: 'The one thing in the compound on your side. Loose, she follows you round walls and steps round fire, teeth and drops; walk past her coop and it breaks on its own as it leaves the screen. Kicked, she homes onto a man and kills on contact. Bring her to the stairs for a heart for the rest of the run.' },
      { kind: 'tortoise', label: 'TORTOISE', make: (x, y) => new Prop(x, y, 'tortoise'), hits: ['THROWN', 'BODY'],
        stats: `walks at ${P.tortoise.speed}px/s · thrown at ${P.tortoise.throwSpeed}px/s, floors a man ${P.crate.stun}s · a shell for ${P.tortoise.tuck}s where it lands · +${P.tortoise.saveShield} use on every shield if it reaches the stairs`,
        note: 'Slower than a walk and it never catches up: the one escort you advance by picking it up and throwing it forward. Where it lands it pulls its head in and is a piece of the room — solid, and rounds stop on it — and cannot be picked up again until it comes out.' },
      { kind: 'goose', label: 'GOOSE', make: (x, y) => new Prop(x, y, 'goose'), hits: [],
        stats: `runs ahead at ${P.goose.speed}px/s (×${P.goose.hurry} when overtaken), waits ${P.goose.lead} tiles ahead ·honks at anyone inside ${P.goose.seeR}, every ${P.goose.honkGap}s · breaks a swing for ${P.goose.balkStun}s at any range`,
        note: 'It does not follow and it does not wait: it runs for the stairs on its own, room after room — and it honks at every man it sees, which is a noise, so the room turns and comes for YOU. The same honk breaks a blow a man has already committed to, at any range at all. A permanent alarm you have to live with. At the stairs: the voice carries further and comes back sooner.' },
      { kind: 'crow', label: 'CROW', make: (x, y) => new Prop(x, y, 'crow'), hits: [],
        stats: `answers a body inside ${P.crow.markR} tiles for ${P.crow.markFor}s · follows the goat at ${Math.round(P.crow.slack * 100)}% of its own pace · a tier ${P.crow.giftTier} talisman if it reaches the stairs`,
        note: 'It follows corpses, not you: every room with nothing dead in it, it falls behind. The one escort that argues with run, don\'t fight, and that is the price of what it carries out — a tier III talisman standing on the next floor\'s stairs, free.' },
      { kind: 'horse', label: 'HORSE', make: (x, y) => new Prop(x, y, 'horse'), hits: [],
        stats: `gallops for the stairs at ${Math.round(P.horse.speed)}px/s and never waits · kicks a shut door in ${P.horse.kickWind}s · bowls a man aside at ${Math.round(P.horse.bowl)}px/s, dazed ${P.horse.daze}s · ${P.horse.hp} wounds · ×${P.horse.saveSpeed} stride for the run if it reaches the stairs`,
        note: 'It races you. Out of the coop it says so and runs for the last room on its own, kicking every door in its way down and bowling the men in it aside without killing them — the cult hardly minds it. Only a soul gate or a sealed arena holds it, and there it waits for you. At the stairs it tells you who won.' },
      { kind: 'cage', label: 'THE PEN', make: (x, y) => new Prop(x, y, 'cage'), hits: ['HEADBUTT'],
        stats: `${P.cage.hits} hits the first time a browser ever does it, ${P.cage.againHits} every time after`,
        note: 'The one object that is a lesson rather than a fixture: what it costs the first time is remembered (`penBroken`), so a run that has already learned the verb only pays the toll.' },
    ];
    ctx.font = `700 ${11 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.ochre; ctx.textAlign = 'left';
    ctx.fillText('THE FIXTURES', pad, top);
    ctx.font = `400 ${8.5 * s}px ${FONT}`; ctx.fillStyle = PALETTE.ash;
    ctx.fillText('every prop kind, read live off TUNING · badges are what can reach it, the note is what happens when it does', pad + 140 * s, top);

    const hitTint = {
      HEADBUTT: { fg: PALETTE.ochre, bg: 'rgba(185,135,58,0.2)' },
      THROWN: { fg: PALETTE.fireHi, bg: 'rgba(255,224,138,0.18)' },
      FIRE: { fg: PALETTE.fire, bg: 'rgba(242,162,51,0.2)' },
      BODY: { fg: PALETTE.blood, bg: 'rgba(192,57,43,0.2)' },
    };
    const rowH = Math.max(46 * s, (H - top - 24 * s - pad) / FIXTURES.length);
    const thumb = Math.min(rowH - 4 * s, 48 * s);
    const nameX = pad + thumb + 12 * s, noteX = nameX + 200 * s;
    let y = top + 16 * s;
    FIXTURES.forEach((f, i) => {
      const ry = y + i * rowH;
      if (i % 2) { ctx.fillStyle = 'rgba(239,230,208,0.03)'; ctx.fillRect(pad - 4 * s, ry, W - pad * 2 + 8 * s, rowH); }
      // The thumbnail is a real Prop at the row's own centre, clipped to the cell: a stand of arms
      // reads at a glance and a wheel is not asked to fit inside one — its arms simply run off the
      // edge of the box the way they would run off the edge of a small window onto the room.
      ctx.save();
      ctx.beginPath(); ctx.rect(pad, ry, thumb, rowH); ctx.clip();
      const fake = f.make(pad + thumb / 2, ry + rowH / 2);
      this.drawProp(fake);
      ctx.restore();
      ctx.textAlign = 'left';
      ctx.font = `700 ${9.5 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.bone;
      ctx.fillText(f.label, nameX, ry + rowH / 2 - 12 * s);
      // What can reach it: a small badge per interaction, coloured by kind so the same colour always
      // means the same verb across every row — never a second guess about which prop does what.
      let bx = nameX;
      ctx.font = `700 ${6.2 * s}px ${FONT_SC}`;
      for (const hit of f.hits) {
        const tint = hitTint[hit];
        const w = ctx.measureText(hit).width + 8 * s;
        ctx.fillStyle = tint.bg; ctx.fillRect(bx, ry + rowH / 2 - 4 * s, w, 11 * s);
        ctx.fillStyle = tint.fg; ctx.textAlign = 'center';
        ctx.fillText(hit, bx + w / 2, ry + rowH / 2 + 4 * s);
        ctx.textAlign = 'left';
        bx += w + 3 * s;
      }
      ctx.font = `400 ${7.6 * s}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.5)';
      const statLines = this.wrap(f.stats, noteX - nameX - 8 * s).slice(0, 3);
      statLines.forEach((l, li) => ctx.fillText(l, nameX, ry + rowH / 2 + 16 * s + li * 9 * s));
      ctx.fillStyle = 'rgba(239,230,208,0.62)'; ctx.font = `400 ${7.8 * s}px ${FONT}`;
      const lines = this.wrap(f.note, W - pad - noteX - 6 * s).slice(0, 4);
      const noteTop = ry + rowH / 2 - (lines.length - 1) * 5 * s;
      lines.forEach((l, li) => ctx.fillText(l, noteX, noteTop + li * 10 * s));
    });
  }

  // THE ANIMALS: every escort on one page — its picture, which floors may hold it, where this run
  // dealt it, how it behaves, what it pays at the stairs, and every line it can say. All of it read
  // off `Beast` and TUNING, so what the page says is what the game does.
  drawAnimalsTab(game, pad, top) {
    const ctx = this.ctx, s = this.ts, W = this.w, H = this.h;
    const kinds = ['chicken', 'tortoise', 'goose', 'crow', 'horse'];
    const plan = game.beastPlanFor ? game.beastPlanFor() : [];
    ctx.textAlign = 'left';
    ctx.font = `700 ${11 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.ochre;
    ctx.fillText('THE ANIMALS', pad, top);
    ctx.font = `400 ${8.5 * s}px ${FONT}`; ctx.fillStyle = PALETTE.ash;
    const dealt = plan.map((k, i) => (k ? `L${i + 1} ${Beast.NAME[k]}` : null)).filter(Boolean).join(' · ') || 'none';
    ctx.fillText(`this run's deal (seed ${(game.runSeed >>> 0).toString(36)}${game.beastEarly ? ', level 2 cleared before' : ''}): ${dealt} · never one kind twice`, pad + 120 * s, top);
    const rowH = Math.max(58 * s, (H - top - 24 * s - pad) / kinds.length), thumb = Math.min(rowH - 6 * s, 64 * s);
    const nameX = pad + thumb + 14 * s, howX = nameX + 190 * s, sayX = howX + Math.max(220 * s, (W - howX - pad) * 0.55);
    kinds.forEach((k, i) => {
      const ry = top + 14 * s + i * rowH, A = Beast.ABOUT[k];
      if (i % 2) { ctx.fillStyle = 'rgba(239,230,208,0.03)'; ctx.fillRect(pad - 4 * s, ry, W - pad * 2 + 8 * s, rowH); }
      ctx.save(); ctx.beginPath(); ctx.rect(pad, ry, thumb, rowH); ctx.clip();
      ctx.translate(pad + thumb / 2, ry + rowH * 0.62); ctx.scale(s * 1.4, s * 1.4);
      const fake = new Prop(0, 0, k); fake.bob = this.t * 3; fake.phase = 0;
      if (k === 'horse') { ctx.scale(0.8, 0.8); this.horseSprite(ctx, 0, Math.sin(this.t) > 0, 'idle'); }
      else this.drawProp(fake);
      ctx.restore();
      ctx.font = `700 ${9.5 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.bone;
      ctx.fillText(Beast.NAME[k], nameX, ry + 16 * s);
      ctx.font = `400 ${7.6 * s}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.55)';
      const floors = LEVELS.map((L, li) => ((L.beasts || []).includes(k) ? li + 1 : 0)).filter(Boolean);
      const here = plan.indexOf(k);
      ctx.fillText(`floors ${floors.join(', ') || '-'}${DARK_LEVEL.beasts && DARK_LEVEL.beasts.includes(k) ? ', THE DARK' : ''}`, nameX, ry + 30 * s);
      ctx.fillStyle = here >= 0 ? PALETTE.fireHi : 'rgba(239,230,208,0.35)';
      ctx.fillText(here >= 0 ? `this run: level ${here + 1}` : 'not dealt this run', nameX, ry + 41 * s);
      ctx.fillStyle = PALETTE.hen;
      this.wrap('AT THE STAIRS: ' + A.pays(), howX - nameX - 8 * s).slice(0, 2).forEach((l, li) => ctx.fillText(l, nameX, ry + 52 * s + li * 9 * s));
      ctx.fillStyle = 'rgba(239,230,208,0.68)'; ctx.font = `400 ${7.8 * s}px ${FONT}`;
      this.wrap(A.how, sayX - howX - 10 * s).slice(0, 5).forEach((l, li) => ctx.fillText(l, howX, ry + 14 * s + li * 10 * s));
      ctx.font = `700 ${7.4 * s}px ${FONT_SC}`;
      Beast.lines(k).slice(0, 6).forEach((l, li) => { ctx.fillStyle = li ? PALETTE.hen : PALETTE.bone; ctx.fillText('"' + l + '"', sayX, ry + 14 * s + li * 10 * s); });
    });
  }

  // One room, as deep as the tool goes: the plan at whatever size the screen allows, what the tiles
  // under it are, everything standing in it and everyone standing on it. This is what going deeper
  // means — the strip of plans is a map of a level, and this is one square of it opened up.
  drawRoomSheet(game, pad) {
    const ctx = this.ctx, s = this.ts, d = game.dev, W = this.w, H = this.h;
    const li = clamp(d.room.li, 0, LEVELS.length - 1);
    const L = game.levelSample(li), rooms = roomsOf(L);
    const r = rooms[clamp(d.room.index, 0, rooms.length - 1)];
    if (!r) { d.room = null; return; }
    ctx.fillStyle = '#09070a'; ctx.fillRect(0, 0, W, H);   // opaque: the tab under it must not show through
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.font = `700 ${14 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.ochre;
    ctx.fillText(`${LEVELS[li].name} · ROOM ${r.index} · ${r.role.toUpperCase()} · ${r.name}`, pad, pad + 14 * s);
    this.devButton(d, W - pad - 64 * s, pad, 64 * s, 20 * s, 'BACK', 'room-close', false);
    const top = pad + 30 * s;
    // the plan on the left, as big as it will go; the facts on the right
    const colR = Math.min(300 * s, W * 0.3), planW = W - pad * 2 - colR - 16 * s;
    const planH = H - top - pad;
    this.roomPlan(L, r, pad, top, planW, planH, true);
    let x = pad + planW + 16 * s, y = top + 12 * s;
    const line = (t, c, size) => {
      ctx.font = `400 ${(size || 10) * s}px ${FONT}`; ctx.fillStyle = c || 'rgba(239,230,208,0.8)';
      ctx.fillText(this.clip(t, colR), x, y); y += (size || 10) * 1.35 * s;
    };
    const head = (t) => { y += 8 * s; ctx.font = `700 ${10 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.ochre; ctx.fillText(t, x, y); y += 13 * s; };
    head('THE FLOOR');
    line(`${r.room.w} × ${r.room.h} tiles, at ${r.room.x},${r.room.y}`);
    line(`template ${r.name}${r.room.tpl.canon ? ' · canon ' + r.room.tpl.canon : ''}`);
    // what the tiles actually are, counted: the quickest read there is of a room's shape
    const count = {};
    for (let ty = 0; ty < r.room.h; ty++) {
      for (let tx = 0; tx < r.room.w; tx++) {
        const t = L.tiles[(r.room.y + ty) * L.W + (r.room.x + tx)];
        const k = t === T.WALL ? 'stone' : t === T.PIT ? 'drop' : t === T.HAY ? 'hay'
          : t === T.EXIT || t === T.ENTRY ? 'stairs' : 'floor';
        count[k] = (count[k] || 0) + 1;
      }
    }
    line(Object.entries(count).map(([k, n]) => `${n} ${k}`).join(' · '), 'rgba(239,230,208,0.6)', 9);
    // How much of this room is a weapon, and whether the draw is the reason it is here at all.
    line(`open ground ${r.ground.toFixed(2)}, ${Math.round(r.ground * 100)}% of the floor has nothing solid within a step`,
      r.ground > 0.5 ? PALETTE.blood : 'rgba(239,230,208,0.6)', 9);
    line(r.drawn ? 'the draw chose this shape, off the ground order' : 'scripted: a set piece, a teaching room or a trap',
      PALETTE.ash, 9);
    head(`MEN ${r.men.length}`);
    if (!r.spawns.length) line('nobody', PALETTE.ash);
    const byKind = {};
    for (const sp of r.spawns) {
      const k = (sp.champion ? 'champion' : sp.kind)
        + (sp.boss ? ' (boss)' : sp.sentry ? ' (sentry)' : sp.alert ? ' (posted)' : sp.lone ? ' (lone post)' : '');
      byKind[k] = (byKind[k] || 0) + 1;
    }
    for (const [k, n] of Object.entries(byKind)) line(`${n} × ${k}`, k.includes('boss') ? PALETTE.fireHi : PALETTE.blood);
    line(`threat ${r.threat.toFixed(1)} · pressure ${r.pressure.toFixed(1)} (threat against the ground it is on)`,
      'rgba(239,230,208,0.6)', 9);
    if (r.cell && r.cell.intro) line(`introduces ${r.cell.intro}`, PALETTE.fireHi, 9);
    head('WHAT IS STANDING IN IT');
    const props = {};
    for (const p of L.props) {
      if (p.x < r.room.x * TILE || p.x >= (r.room.x + r.room.w) * TILE) continue;
      if (p.y < r.room.y * TILE || p.y >= (r.room.y + r.room.h) * TILE) continue;
      const k = p.kind === 'door' ? (p.gate ? 'soul gate' : p.vault ? 'soul door' : p.stair ? 'stair door' : p.iron ? 'iron door' : 'door')
        : p.kind === 'weapon' ? p.weapon : p.kind;
      props[k] = (props[k] || 0) + 1;
    }
    const keys = Object.keys(props);
    if (!keys.length) line('nothing', PALETTE.ash);
    for (const k of keys) line(`${props[k]} × ${k}`, PALETTE.ochre);
    head('LEGEND');
    line('red dots are men, pale one a boss', 'rgba(239,230,208,0.55)', 9);
    line('ochre squares props, green is grass', 'rgba(239,230,208,0.55)', 9);
    line('black is a drop, gold the stairs', 'rgba(239,230,208,0.55)', 9);
  }

  // One room's floor plan, fitted into a box: stone, floor, hay and holes off the tile grid, then a
  // dot for every prop and a dot for every man. It is drawn from the generated level rather than
  // from the template, so what it shows is what was actually built — corridors cut through it, the
  // grating laid into it, the vault's door hung in its wall.
  // `big` is the opened room: the same plan with a grid over the tiles, names against the men and a
  // ruler along two sides, because at that size the picture can afford to say what it is made of.
  roomPlan(L, room, bx, by, bw, bh, big) {
    const ctx = this.ctx, s = this.ts;
    const k = Math.min(bw / room.room.w, bh / room.room.h);
    const ox = bx + (bw - room.room.w * k) / 2, oy = by + (bh - room.room.h * k) / 2;
    const R = room.room, px = Math.max(1, k);
    for (let ty = 0; ty < R.h; ty++) {
      for (let tx = 0; tx < R.w; tx++) {
        const t = L.tiles[(R.y + ty) * L.W + (R.x + tx)];
        const c = t === T.WALL ? '#241c22' : t === T.PIT ? '#05060a' : t === T.HAY ? PALETTE.hayDark
          : t === T.EXIT || t === T.ENTRY ? PALETTE.ochre : '#4b4048';
        ctx.fillStyle = c;
        ctx.fillRect(ox + tx * k, oy + ty * k, px, px);
      }
    }
    if (big && k > 7) {
      // one line a tile, so the size of the room is countable rather than only comparable
      ctx.strokeStyle = 'rgba(239,230,208,0.06)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let tx = 0; tx <= R.w; tx++) { ctx.moveTo(ox + tx * k, oy); ctx.lineTo(ox + tx * k, oy + R.h * k); }
      for (let ty = 0; ty <= R.h; ty++) { ctx.moveTo(ox, oy + ty * k); ctx.lineTo(ox + R.w * k, oy + ty * k); }
      ctx.stroke();
      ctx.font = `400 ${7 * s}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.35)'; ctx.textAlign = 'center';
      for (let tx = 0; tx < R.w; tx += 5) ctx.fillText(String(tx), ox + (tx + 0.5) * k, oy - 3 * s);
      ctx.textAlign = 'right';
      for (let ty = 0; ty < R.h; ty += 5) ctx.fillText(String(ty), ox - 3 * s, oy + (ty + 0.7) * k);
      ctx.textAlign = 'left';
    }
    const inRoom = (o) => o.x >= R.x * TILE && o.x < (R.x + R.w) * TILE && o.y >= R.y * TILE && o.y < (R.y + R.h) * TILE;
    const at = (o) => [ox + (o.x / TILE - R.x) * k, oy + (o.y / TILE - R.y) * k];
    for (const p of L.props) {
      if (!inRoom(p)) continue;
      const [dx, dy] = at(p);
      ctx.fillStyle = p.kind === 'heal' ? PALETTE.grassHi : p.kind === 'door' ? (p.gate || p.vault ? PALETTE.witch : PALETTE.wood)
        : p.kind === 'brazier' ? PALETTE.fire : p.kind === 'spike' || p.kind === 'spire' ? PALETTE.ash : PALETTE.ochre;
      const w = Math.max(1.4, k * 0.7);
      ctx.fillRect(dx - w / 2, dy - w / 2, w, w);
    }
    for (const sp of room.spawns) {
      const [dx, dy] = at(sp);
      ctx.fillStyle = sp.boss ? PALETTE.fireHi : PALETTE.blood;
      ctx.beginPath(); ctx.arc(dx, dy, Math.max(1.3, k * (sp.boss ? 0.8 : 0.6)), 0, Math.PI * 2); ctx.fill();
      if (big && k > 9) {
        ctx.font = `700 ${7.5 * s}px ${FONT_SC}`; ctx.fillStyle = 'rgba(239,230,208,0.85)';
        ctx.textAlign = 'center';
        ctx.fillText((sp.champion ? 'butcher' : sp.kind) + (sp.boss ? '*' : ''), dx, dy - k * 1.05);
        ctx.textAlign = 'left';
      }
    }
  }

  // The mouse in the wall. Small, grey, sat up on her haunches with her paws together, ears up,
  // one bead of an eye and a tail curling out behind her — a trader, not a threat, until she has
  // been hit twice, when the eye goes red and she shakes. What she says is a bubble over her head
  // in the same plate the cult's barks use, so a line from her reads as a line from anybody.
  // The burrow itself: a low, dirt-rimmed hole cut into the base of the wall, flush with the floor
  // and squashed to it the way a spike plate or a crack is (this is a hole, not a doorway a body
  // stands in). `p.gap` is the wall tile it opens through — one row from where she actually sits.
  drawBurrow(p) {
    const ctx = this.ctx, gx = p.gap.x, gy = p.gap.y, w = 13, h = 8 * TILT;
    ctx.fillStyle = PALETTE.dirt;
    ctx.beginPath(); ctx.ellipse(gx, gy, w + 5, h + 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PALETTE.dirtHi;
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2;
      ctx.beginPath(); ctx.ellipse(gx + Math.cos(a) * (w + 2), gy + Math.sin(a) * (h + 1.5), 3, 2, a, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#0b0810';
    ctx.beginPath(); ctx.ellipse(gx, gy, w, h, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(70,53,36,0.7)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.ellipse(gx, gy, w, h, 0, 0, Math.PI * 2); ctx.stroke();
    // a claw-scratch at the rim, and a wisp of straw dragged in for bedding
    ctx.strokeStyle = 'rgba(20,15,12,0.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(gx - w * 0.6, gy - h * 0.5); ctx.lineTo(gx - w * 0.3, gy - h * 0.9); ctx.stroke();
    ctx.strokeStyle = PALETTE.hayDark; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(gx + w * 0.5, gy + h * 0.6); ctx.lineTo(gx + w * 0.9, gy + h * 0.3); ctx.stroke();
  }

  drawMouse(p) {
    const ctx = this.ctx, M = TUNING.prop.mouse, t = this.t;
    const bob = Math.sin(t * 3.2 + p.phase) * 0.8, shake = p.wobble > 0 ? Math.sin(t * 60) * 1.6 : 0;
    const angry = (p.angry || 0) > 0 || (p.strikes || 0) >= 2;
    if (p.gap && !p.dead) this.drawBurrow(p);
    // She sits to one side of her own hole rather than blocking it — a real mousehole shows the
    // dark opening itself, with whatever lives there peeking out beside it, not centred over it.
    const sx = p.x - 9, sy = p.y;
    this.shadow(sx, sy + 2, 8, 3.5);
    ctx.save(); ctx.translate(sx + shake, sy - 4 + bob);
    if (PIXEL_ART.ready) {
      // Pixel pass: the trader herself; angry is a red cast over her rather than two beads going red.
      ctx.translate(0, 6); ctx.scale(1, 1 / TILT);
      if (angry) ctx.filter = 'sepia(1) saturate(4) hue-rotate(-40deg)';
      // She watches him: turned to whichever side of her he is on, re-decided with a tile of slack so
      // she does not flicker while he stands in front of her. The sprite is drawn facing right.
      const g = this.game && this.game.goat;
      if (g) { if (g.x < sx - 12) p.faceLeft = true; else if (g.x > sx + 12) p.faceLeft = false; }
      // And up: there is one drawing of her, three-quarters to the front, so with him above her she
      // leans back on her heels toward him, nose up, rather than staring on past him at the floor.
      if (g) {
        const dx = g.x - sx, dy = g.y - sy, d = Math.hypot(dx, dy) || 1;
        const want = clamp(-dy / d, 0, 1) * M.lookUp;
        p.lean = lerp(p.lean || 0, want, 0.12);
        ctx.rotate(p.faceLeft ? p.lean : -p.lean);
      }
      PIXEL_ART.icon(ctx, 'mouse', !!p.faceLeft);
      ctx.filter = 'none';
    } else {
    // Faces the room: a top-wall hole looks down, a bottom-wall hole looks up.
    const down = p.wallSide !== 'down';
    const edge = 'rgba(26,16,22,0.55)';
    // tail
    ctx.strokeStyle = '#c99a9a'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-5, 4); ctx.quadraticCurveTo(-14, 6 + Math.sin(t * 2) * 2, -12, -2 + Math.cos(t * 1.7) * 2); ctx.stroke();
    // body
    ctx.fillStyle = '#8c8a86'; ctx.strokeStyle = edge; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(0, 2, 7, 6.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#b3b0aa'; ctx.beginPath(); ctx.ellipse(0.5, 4, 4.2, 3.6, 0, 0, Math.PI * 2); ctx.fill();   // belly
    // head, with the ears on top of it
    const hy = down ? -4 : -5;
    ctx.fillStyle = '#9a9894'; ctx.strokeStyle = edge;
    for (const ex of [-4.6, 4.6]) {
      ctx.beginPath(); ctx.arc(ex, hy - 5, 3.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#d9a0a6'; ctx.beginPath(); ctx.arc(ex, hy - 5, 1.9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#9a9894';
    }
    ctx.beginPath(); ctx.ellipse(0, hy, 5.6, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // snout, nose, whiskers
    ctx.fillStyle = '#b3b0aa'; ctx.beginPath(); ctx.ellipse(0, hy + 2.4, 2.8, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d98a94'; ctx.beginPath(); ctx.arc(0, hy + 3.4, 1.1, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(239,230,208,0.7)'; ctx.lineWidth = 0.8;
    for (const s of [-1, 1]) for (const k of [-1, 0, 1]) { ctx.beginPath(); ctx.moveTo(s * 2, hy + 2.6 + k * 0.6); ctx.lineTo(s * 7.5, hy + 1.6 + k * 1.6); ctx.stroke(); }
    // eyes: two beads, red once she has been asked and not listened to
    ctx.fillStyle = angry ? PALETTE.blood : PALETTE.ink;
    ctx.beginPath(); ctx.arc(-2.2, hy - 0.6, 1.1, 0, Math.PI * 2); ctx.arc(2.2, hy - 0.6, 1.1, 0, Math.PI * 2); ctx.fill();
    if (angry) { ctx.strokeStyle = PALETTE.ink; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-4, hy - 3); ctx.lineTo(-1, hy - 1.6); ctx.moveTo(4, hy - 3); ctx.lineTo(1, hy - 1.6); ctx.stroke(); }
    // paws held together in front: the trader's pose
    ctx.fillStyle = '#b3b0aa'; ctx.strokeStyle = edge; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(-2, 4.6, 1.7, 1.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(2, 4.6, 1.7, 1.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
    // A small lamp glow on her, so the hole reads as a lit stall across the room.
    const gl = ctx.createRadialGradient(sx, sy - 6, 0, sx, sy - 6, 34);
    gl.addColorStop(0, `rgba(255,224,138,${0.1 + 0.04 * Math.sin(t * 2.2)})`); gl.addColorStop(1, 'rgba(255,224,138,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(sx, sy - 6, 34, 0, Math.PI * 2); ctx.fill();
    if (p.say) {
      const a = Math.max(0, Math.min(1, p.say.life / 0.4, (p.say.max - p.say.life) / 0.08));
      ctx.save(); ctx.scale(1, 1 / TILT);
      const by = (sy - 24) * TILT;
      ctx.font = `700 12px ${FONT_SC}`; ctx.textAlign = 'center';
      const tw = ctx.measureText(p.say.text).width;
      ctx.globalAlpha = a * 0.78; ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(sx - tw / 2 - 6, by - 11, tw + 12, 15);
      ctx.beginPath(); ctx.moveTo(sx - 4, by + 4); ctx.lineTo(sx + 4, by + 4); ctx.lineTo(sx, by + 8); ctx.fill();
      ctx.globalAlpha = a; ctx.fillStyle = p.say.angry ? PALETTE.blood : PALETTE.bone;
      ctx.fillText(p.say.text, sx, by);
      ctx.globalAlpha = 1; ctx.textAlign = 'left'; ctx.restore();
    }
  }

  // The clamp bolted over the mouth of a room left behind (`game.updateClamps`): a dark iron plate
  // the width of the mouth, two bands across it and a rivet at each end, driven down into place over
  // `clamp.slam`. The stone under it is what actually shuts the room; this is what says it was shut
  // on purpose rather than never having been open.
  drawClamp(p) {
    const ctx = this.ctx, k = p.slam / TUNING.clamp.slam, long = p.span * TILE;
    const w = p.vertical ? 18 : long + 6, h = p.vertical ? long * TILT + 6 : 18;
    const drop = k * k * 26;
    ctx.save(); ctx.translate(p.x, p.y - drop); ctx.globalAlpha = 1 - k * 0.6;
    ctx.fillStyle = 'rgba(10,8,10,0.55)'; ctx.fillRect(-w / 2 + 2, -h / 2 + 3, w, h);
    ctx.fillStyle = '#2c2c32'; ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = '#4c4e57'; ctx.fillRect(-w / 2, -h / 2, w, 3);
    ctx.fillStyle = '#17171b';
    for (const f of [-0.28, 0.28]) {
      if (p.vertical) ctx.fillRect(-w / 2, f * h - 2, w, 4); else ctx.fillRect(f * w - 2, -h / 2, 4, h);
    }
    ctx.fillStyle = '#9a9ca6';
    for (const f of [-0.42, 0, 0.42]) {
      const rx = p.vertical ? 0 : f * w, ry = p.vertical ? f * h : 0;
      ctx.beginPath(); ctx.arc(rx, ry, 2.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(8,6,8,0.8)'; ctx.lineWidth = 2; ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.restore(); ctx.globalAlpha = 1;
  }

  // A ware on her shelf: a stool with the talisman hanging over it and a word under it. She takes
  // nothing for it — TAKE, and the gate says it is one of hers — dark and barred while the ogre is
  // out, and the old talisman put back on the stool says YOURS, since reaching for it is a swap.
  // Two stools sit a tile apart: anything longer than a word under each ran into its neighbour.
  drawWare(p) {
    const ctx = this.ctx, t = this.t, w = p.ware; if (!w) return;
    const milk = w.id === 'milk';
    const def = milk ? MILK_OFFER : ARTIFACTS.find((a) => a.id === w.id); if (!def) return;
    const game = this.game;
    const bob = Math.sin(t * 2.6 + p.phase) * 1.4;
    // Her third offer is not a talisman on a stool, it is a bucket. Drawn here rather than through
    // `artifactIcon` because the whole point of it is the size: a pail up to the goat's shoulder, brimming,
    // standing on the boards on its own. It used to be the bowl icon with THREE BOWLS OF MILK written
    // under it, and a caption is exactly what a thing this obvious should not need.
    if (milk) { this.drawMilkOffer(p, ctx); return; }
    this.shadow(p.x, p.y + 3, 9, 4);
    // the stool
    if (!this.painted.pixelProps) {
      ctx.fillStyle = '#4a3420'; ctx.fillRect(p.x - 7, p.y - 2, 14, 7);
      ctx.fillStyle = PALETTE.woodHi; ctx.fillRect(p.x - 7, p.y - 2, 14, 2);
      ctx.fillStyle = '#3a2a1a'; ctx.fillRect(p.x - 6, p.y + 5, 2.4, 4); ctx.fillRect(p.x + 3.6, p.y + 5, 2.4, 4);
    } else this.painted.stool(ctx, p);
    const locked = p.locked, dim = locked ? 0.35 : 1;
    // the talisman, hung a little above and breathing
    ctx.save(); ctx.globalAlpha = dim;
    if (!locked) {
      const gl = ctx.createRadialGradient(p.x, p.y - 12 + bob, 0, p.x, p.y - 12 + bob, 22);
      gl.addColorStop(0, this.tint(def.color, 0.26));
      gl.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(p.x, p.y - 12 + bob, 22, 0, Math.PI * 2); ctx.fill();
    }
    this.artifactIcon(w.id, p.x, p.y - 12 + bob, 9, w.tier);
    ctx.restore();
    // tier pips under the stool's lip, then the word
    ctx.save(); ctx.scale(1, 1 / TILT);
    const ty = (p.y + 15) * TILT;
    ctx.fillStyle = 'rgba(239,230,208,0.75)';
    if (!milk) for (let k = 0; k < w.tier; k++) ctx.fillRect(p.x - (w.tier * 4 - 1) / 2 + k * 4, ty - 8, 2.6, 2.6);
    ctx.font = `700 10px ${FONT_SC}`; ctx.textAlign = 'center';
    const label = locked ? 'HIS' : p.chosen ? 'YOURS' : 'TAKE';
    ctx.fillStyle = 'rgba(13,10,12,0.7)'; ctx.fillText(label, p.x + 1, ty + 1);
    ctx.fillStyle = locked ? PALETTE.blood : p.chosen ? 'rgba(239,230,208,0.6)' : PALETTE.fireHi;
    ctx.fillText(label, p.x, ty);
    ctx.textAlign = 'left'; ctx.restore();
    // What it does, read off the thing itself rather than off a HUD tooltip: nobody stops running
    // to hover a corner of the screen, but a line hanging over the ware as you walk up to it is
    // read on the way past. On approach, not on the pointer — the touch player gets it too.
    // Only the nearest one: two stools a tile apart both in reach put two boxes over each other.
    this.wareNote(p, def, `${def.name} ${'I'.repeat(w.tier)}`, def.tiers[w.tier - 1].desc);
  }
  // The note over the nearest ware: its name and one or two plain lines of what that tier does
  // (`tell`). It used to be a sentence of what the thing was for over a rule and a line of the
  // tier's numbers ("0.18s WINDOW ON THE HORNS"): a story and a pile of timings (25 Sep 2026).
  // Kept for `drawNote`, which puts it up after the fog: drawn with the stool, the shade over the
  // wall behind the shelf dimmed the half of it that stood over the stone.
  wareNote(p, def, title, desc) {
    const game = this.game, g = game && game.goat;
    if (!g || p.locked || Math.hypot(g.x - p.x, g.y - p.y) >= TUNING.prop.ware.readR + p.r || this.nearestWare(game) !== p) return;
    this.note = [p, def, title, desc];
  }
  drawNote() {
    const n = this.note; if (!n) return;
    this.note = null;
    const [p, def, title, desc] = n, ctx = this.ctx;
    ctx.save(); ctx.scale(1, 1 / TILT);
    const bw = 206, pad = 10;
    ctx.font = `12px ${FONT}`;
    const dl = this.wrap(desc, bw - pad * 2);
    const bh = 22 + dl.length * 15 + 4;
    // High enough to clear her pail, which stands between the two stools and draws after them. Kept
    // inside the picture (`keepInView`); pushed down onto the shelf itself, it goes under it instead.
    let box = this.keepInView(p.x - bw / 2, (p.y - 46) * TILT - bh, bw, bh);
    if (box.y + bh > (p.y - 24) * TILT) box = this.keepInView(p.x - bw / 2, (p.y + 26) * TILT, bw, bh);
    const by = box.y, cx = box.x + bw / 2;
    ctx.globalAlpha = 0.9; ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(box.x, by, bw, bh);
    ctx.strokeStyle = this.tint(def.color, 0.65); ctx.lineWidth = 1.3;
    ctx.strokeRect(box.x, by, bw, bh);
    ctx.globalAlpha = 1; ctx.textAlign = 'center';
    ctx.font = `700 12px ${FONT_SC}`; ctx.fillStyle = def.color; ctx.fillText(title, cx, by + 16);
    let y = by + 32;
    ctx.font = `12px ${FONT}`; ctx.fillStyle = PALETTE.bone;
    for (const ln of dl) { ctx.fillText(ln, cx, y); y += 15; }
    ctx.textAlign = 'left'; ctx.restore();
  }
  // The ware the goat is nearest, once a frame, so only one note hangs over the shelf at a time.
  nearestWare(game) {
    if (this.wareAt === this.t) return this.wareNear;
    const g = game.goat; let best = null, bd = Infinity;
    for (const q of game.props) {
      if (q.kind !== 'ware' || q.broken || q.locked || !q.ware) continue;
      const d = Math.hypot(g.x - q.x, g.y - q.y); if (d < bd) { bd = d; best = q; }
    }
    this.wareAt = this.t; this.wareNear = best;
    return best;
  }
  // The pail on her shelf, and the one word on it. It reads out its own worth in hearts rather than
  // in a sentence — it is the same literal line every ware carries now, it is just short enough to
  // live under the TAKE.
  drawMilkOffer(p, ctx) {
    const t = this.t, R = 12, H = 28, y0 = p.y + 5, top = y0 - H;
    const wob = Math.sin(t * 1.5 + p.x * 0.03) * 0.9;
    this.shadow(p.x, p.y + 4, R * 1.1, R * 0.5);
    ctx.save(); ctx.globalAlpha = p.locked ? 0.35 : 1;
    const gl = ctx.createRadialGradient(p.x, top, 0, p.x, top, 20);
    gl.addColorStop(0, 'rgba(239,230,208,0.22)'); gl.addColorStop(1, 'rgba(0,0,0,0)');
    if (!p.locked) { ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(p.x, top, 20, 0, Math.PI * 2); ctx.fill(); }
    if (this.painted.pixelProps) { this.painted.pail(ctx, p.x, y0, R); ctx.restore(); }
    else {
    ctx.fillStyle = '#6b4a2c'; ctx.beginPath();
    ctx.moveTo(p.x - R * 0.72, y0); ctx.lineTo(p.x - R, top); ctx.lineTo(p.x + R, top); ctx.lineTo(p.x + R * 0.72, y0);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath();
    ctx.moveTo(p.x + R * 0.28, top); ctx.lineTo(p.x + R, top); ctx.lineTo(p.x + R * 0.72, y0); ctx.lineTo(p.x + R * 0.2, y0);
    ctx.closePath(); ctx.fill();
    for (const f of [0.3, 0.8]) {
      const w = R * (0.72 + 0.28 * f);
      ctx.fillStyle = '#8d8a85'; ctx.fillRect(p.x - w, y0 - H * f - 2, w * 2, 3.2);
      ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(p.x - w, y0 - H * f - 2, w * 2, 1.2);
    }
    ctx.fillStyle = '#efe6d0'; ctx.beginPath(); ctx.ellipse(p.x, top + wob, R * 0.96, R * 0.34, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.ellipse(p.x - R * 0.3, top - 1 + wob, R * 0.28, R * 0.1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(239,230,208,0.85)'; ctx.beginPath();
    ctx.moveTo(p.x + R * 0.5, top + wob); ctx.quadraticCurveTo(p.x + R * 0.95, top + H * 0.34, p.x + R * 0.66, top + H * 0.38);
    ctx.quadraticCurveTo(p.x + R * 0.6, top + H * 0.12, p.x + R * 0.5, top + wob); ctx.fill();
    ctx.restore();
    }
    ctx.save(); ctx.scale(1, 1 / TILT);
    const ty = (p.y + 15) * TILT;
    ctx.font = `700 10px ${FONT_SC}`; ctx.textAlign = 'center';
    const label = p.locked ? 'HIS' : 'TAKE';
    ctx.fillStyle = 'rgba(13,10,12,0.7)'; ctx.fillText(label, p.x + 1, ty + 1);
    ctx.fillStyle = p.locked ? PALETTE.blood : PALETTE.fireHi; ctx.fillText(label, p.x, ty);
    ctx.font = `700 9px ${FONT_SC}`; ctx.fillStyle = 'rgba(239,230,208,0.8)';
    ctx.fillText(`+${TUNING.shop.heals} HEARTS`, p.x, ty + 12);
    ctx.textAlign = 'left'; ctx.restore();
    this.wareNote(p, MILK_OFFER, MILK_OFFER.name, MILK_OFFER.tiers[0].desc);
  }

  // A hex colour with an alpha on it, for the glow under a ware.
  tint(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  // The talisman itself, drawn at `h` half-size. One drawing per artifact, the same one on the
  // shelf, in the corner of the screen and at his neck, so it is learnt once. The tier is what the
  // pips say; the drawing does not change with it.
  artifactIcon(id, x, y, h, tier) {
    const ctx = this.ctx, edge = 'rgba(26,16,22,0.7)';
    ctx.save(); ctx.translate(x, y); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (id === 'milk') {
      // a wooden bowl brimming white, seen a little from above
      ctx.fillStyle = '#6b4a2c'; ctx.strokeStyle = edge; ctx.lineWidth = h * 0.14;
      ctx.beginPath(); ctx.moveTo(-h, -h * 0.1); ctx.quadraticCurveTo(0, h * 1.2, h, -h * 0.1); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#efe6d0'; ctx.beginPath(); ctx.ellipse(0, -h * 0.12, h * 0.92, h * 0.3, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.ellipse(-h * 0.3, -h * 0.2, h * 0.25, h * 0.08, 0, 0, Math.PI * 2); ctx.fill();
    } else if (id === 'firecharm') {
      // an amber disc on a cord, with a flame cut into it
      ctx.strokeStyle = '#6b4a2c'; ctx.lineWidth = h * 0.16;
      ctx.beginPath(); ctx.moveTo(-h * 0.35, -h); ctx.quadraticCurveTo(0, -h * 1.35, h * 0.35, -h); ctx.stroke();
      ctx.fillStyle = '#b9873a'; ctx.strokeStyle = edge; ctx.lineWidth = h * 0.14;
      ctx.beginPath(); ctx.arc(0, 0, h * 0.85, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = PALETTE.fire;
      ctx.beginPath(); ctx.moveTo(0, -h * 0.62); ctx.quadraticCurveTo(h * 0.55, -h * 0.1, 0, h * 0.5);
      ctx.quadraticCurveTo(-h * 0.55, -h * 0.1, 0, -h * 0.62); ctx.fill();
      ctx.fillStyle = PALETTE.fireHi;
      ctx.beginPath(); ctx.moveTo(0, -h * 0.25); ctx.quadraticCurveTo(h * 0.25, 0.05 * h, 0, h * 0.35);
      ctx.quadraticCurveTo(-h * 0.25, 0.05 * h, 0, -h * 0.25); ctx.fill();
    } else if (id === 'clover') {
      // four leaves on a stem
      ctx.strokeStyle = '#4e5e30'; ctx.lineWidth = h * 0.16;
      ctx.beginPath(); ctx.moveTo(0, h * 0.2); ctx.quadraticCurveTo(h * 0.25, h * 0.6, h * 0.1, h * 1.05); ctx.stroke();
      for (const [lx, ly] of [[0, -h * 0.5], [h * 0.5, 0], [0, h * 0.42], [-h * 0.5, 0]]) {
        ctx.fillStyle = PALETTE.grass; ctx.strokeStyle = edge; ctx.lineWidth = h * 0.1;
        ctx.beginPath(); ctx.ellipse(lx * 0.9, ly * 0.9 - h * 0.05, h * 0.42, h * 0.36, Math.atan2(ly, lx), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = PALETTE.grassHi; ctx.beginPath(); ctx.ellipse(lx * 0.75, ly * 0.75 - h * 0.1, h * 0.16, h * 0.13, 0, 0, Math.PI * 2); ctx.fill();
      }
    } else if (id === 'boomerang') {
      // two arms of a bent stick, bone with an ochre edge
      ctx.rotate(-0.5);
      ctx.strokeStyle = edge; ctx.lineWidth = h * 0.62;
      ctx.beginPath(); ctx.moveTo(-h * 0.9, h * 0.35); ctx.lineTo(0, -h * 0.55); ctx.lineTo(h * 0.9, h * 0.35); ctx.stroke();
      ctx.strokeStyle = PALETTE.bone; ctx.lineWidth = h * 0.42;
      ctx.beginPath(); ctx.moveTo(-h * 0.9, h * 0.35); ctx.lineTo(0, -h * 0.55); ctx.lineTo(h * 0.9, h * 0.35); ctx.stroke();
      ctx.strokeStyle = PALETTE.ochre; ctx.lineWidth = h * 0.14;
      ctx.beginPath(); ctx.moveTo(-h * 0.7, h * 0.2); ctx.lineTo(-h * 0.35, -h * 0.15); ctx.moveTo(h * 0.7, h * 0.2); ctx.lineTo(h * 0.35, -h * 0.15); ctx.stroke();
    } else if (id === 'symbols') {
      // a violet sigil: a ring, a triangle in it, three points
      ctx.strokeStyle = PALETTE.witch; ctx.lineWidth = h * 0.16;
      ctx.beginPath(); ctx.arc(0, 0, h * 0.85, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = PALETTE.witchHi; ctx.lineWidth = h * 0.12;
      ctx.beginPath(); ctx.moveTo(0, -h * 0.6); ctx.lineTo(h * 0.52, h * 0.3); ctx.lineTo(-h * 0.52, h * 0.3); ctx.closePath(); ctx.stroke();
      ctx.fillStyle = PALETTE.witchHi;
      for (const [px, py] of [[0, -h * 0.6], [h * 0.52, h * 0.3], [-h * 0.52, h * 0.3]]) { ctx.beginPath(); ctx.arc(px, py, h * 0.14, 0, Math.PI * 2); ctx.fill(); }
      ctx.beginPath(); ctx.arc(0, 0, h * 0.12, 0, Math.PI * 2); ctx.fill();
    } else Talisman.icon(ctx, id, h);   // the seventeen in js/talismans.js
    ctx.restore();
  }

  // The slot right of the hearts: the talisman he wears, its tier, and for the boomerang the wait
  // until it is back in the holster. Empty, it is a faint cord with nothing on it — a slot that
  // exists before there is anything to put in it is how a player finds out there is a shop.
  // The saved animals as a row of emoji (`Beast.EMOJI`), in the order they came out. Returns whether
  // it drew anything, so what sits under it can make room.
  drawSaved(game, x, y, s) {
    const b = game.beasts; if (!b) return false;
    const list = [];
    for (const k of ['chicken', 'tortoise', 'goose', 'crow', 'horse']) for (let i = 0; i < (b[k] || 0); i++) list.push(k);
    if (!list.length) return false;
    const ctx = this.ctx;
    ctx.save(); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.globalAlpha = 1; ctx.filter = 'none'; ctx.fillStyle = '#ffffff';
    ctx.font = `${19 * s}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`;
    list.forEach((k, i) => ctx.fillText(Beast.EMOJI[k], x + i * 24 * s, y));
    ctx.restore();
    return true;
  }

  drawArtifactChip(game, x, y, box) {
    const ctx = this.ctx, s = this.hs, art = game.artifact, m = game.input.mouse, g = game.goat;
    const def = art ? ARTIFACTS.find((a) => a.id === art.id) : null, tier = art ? Shop.tierOf(art) : null;
    // Only the two verb artifacts have a button, and it does not exist until one of them is worn:
    // this is the one place a player learns Q is there at all.
    const isItem = art && (art.id === 'boomerang' || art.id === 'symbols' || art.id === 'effigy');
    // No frame: the charm stands in the row of hearts as one more thing he carries, not in a box.
    const cx = x + box / 2, cy = y + box / 2;
    if (def) {
      this.artifactIcon(art.id, cx, cy - 1 * s, box * 0.36, art.tier);
      ctx.fillStyle = 'rgba(239,230,208,0.8)';
      const pw = 3 * s, gap = 2 * s, tot = art.tier * pw + (art.tier - 1) * gap;
      for (let k = 0; k < art.tier; k++) ctx.fillRect(Math.round(cx - tot / 2 + k * (pw + gap)), Math.round(y + box - 5 * s), pw, 2.2 * s);
      // Q's own wait, as a strip draining under the chip the way the gong's does under the rail —
      // one clock for both verb artifacts, since only one is ever worn at once.
      if (isItem && g.itemCdMax > 0 && g.itemCd > 0) {
        const frac = game.boom.fly ? 1 : g.itemCd / g.itemCdMax;
        ctx.fillStyle = 'rgba(13,10,12,0.7)'; ctx.fillRect(x, y + box + 2 * s, box, 3 * s);
        ctx.fillStyle = game.boom.fly ? PALETTE.fireHi : PALETTE.ochre; ctx.fillRect(x, y + box + 2 * s, box * (1 - frac), 3 * s);
      }
    } else {
      // the empty cord
      ctx.strokeStyle = 'rgba(239,230,208,0.22)'; ctx.lineWidth = 1.4 * s;
      ctx.beginPath(); ctx.moveTo(cx - box * 0.28, cy - box * 0.1); ctx.quadraticCurveTo(cx, cy + box * 0.32, cx + box * 0.28, cy - box * 0.1); ctx.stroke();
    }
    // The key, under the chip, exactly the way the rail prints one under each of the four verbs —
    // and only once there is a fifth verb to name at all.
    if (isItem && !game.touch.active) {
      ctx.font = `700 ${10 * s}px ${FONT_SC}`; ctx.textAlign = 'center';
      ctx.fillStyle = g.itemCd > 0 ? 'rgba(192,57,43,0.95)' : 'rgba(239,230,208,0.55)';
      ctx.fillText('Q', cx, y + box + 9 * s);
      ctx.textAlign = 'left';
    }
    if (!game.touch.active && m.x >= x && m.x <= x + box && m.y >= y && m.y <= y + box) {
      const noteY = y + box + (isItem ? 22 : 12) * s;
      this.skillHover = def
        ? { row: { name: `${def.name} ${'I'.repeat(art.tier)}`, note: tier.desc }, x, left: x, y: noteY, hot: false, boons: [] }
        : { row: { name: 'NOTHING AT HIS NECK', note: 'A talisman goes here, one at a time. A mouse in a wall offers two for nothing: grab the one you want.', half: true }, x, left: x, y: noteY, hot: false, boons: [] };
    }
    if (def) Talisman.drawHud(this, game, x, y, box);   // the crust, the cup, the notches, the bell's thread
  }

  // The boomerang in the air: the same bent stick as the icon, spinning, with a short smear behind it.
  drawBoomerang(game) {
    const f = game.boom && game.boom.fly; if (!f) return;
    const ctx = this.ctx;
    ctx.save(); ctx.translate(f.x, f.y); ctx.scale(1, 1 / TILT);
    ctx.globalAlpha = 0.25; ctx.strokeStyle = PALETTE.bone; ctx.lineWidth = 3;
    const l = Math.hypot(f.vx, f.vy) || 1;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-f.vx / l * 22, -f.vy / l * 22); ctx.stroke();
    ctx.globalAlpha = 1; ctx.rotate(f.spin);
    this.artifactIcon('boomerang', 0, 0, 8, 1);
    ctx.restore();
    this.shadow(f.x, f.y + 10, 7, 3);
  }

  // The rat ogre: what the mouse in the wall becomes. Twice a man's width, hunched, grey-brown and
  // matted, a rat's head on it — long snout, round ears, whiskers, red eyes, two teeth — and a
  // naked pink tail longer than he is. Nothing else in the compound is an animal that walks on
  // two legs, which is the point: he is the one thing here that is not the cult's and not yours.
  drawRatOgre(e, r) {
    const ctx = this.ctx, t = this.t, edge = 'rgba(26,16,22,0.6)';
    const emerging = e.state === 'emerge' ? 1 - Math.max(0, e.timer) / TUNING.ratogre.emerge : 1;
    ctx.save();
    if (emerging < 1) { ctx.scale(0.4 + 0.6 * emerging, 0.4 + 0.6 * emerging); ctx.globalAlpha *= 0.5 + 0.5 * emerging; }
    const step = Math.hypot(e.vx, e.vy) > 30 ? Math.sin(t * 13 + e.x * 0.02) : 0;
    // tail: long, naked, sweeping behind him
    ctx.strokeStyle = '#c98f98'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-r * 0.8, 0);
    ctx.quadraticCurveTo(-r * 1.7, r * 0.5 + Math.sin(t * 2.3) * r * 0.4, -r * 2.4, Math.cos(t * 1.9) * r * 0.5); ctx.stroke();
    // hind feet
    ctx.fillStyle = '#5a4a44'; ctx.strokeStyle = edge; ctx.lineWidth = 1.4;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(-r * 0.3 + step * s * 3, s * r * 0.72, r * 0.3, r * 0.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    // body: hunched, wider at the shoulder
    ctx.fillStyle = '#5e524c'; ctx.strokeStyle = edge; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.ellipse(-r * 0.15, 0, r * 0.95, r * 0.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // matted fur: a few dark strokes along the back
    ctx.strokeStyle = 'rgba(26,16,22,0.35)'; ctx.lineWidth = 1.6;
    for (let k = 0; k < 6; k++) { const a = -1.1 + k * 0.45; ctx.beginPath(); ctx.moveTo(-r * 0.2 + Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.45); ctx.lineTo(-r * 0.2 + Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.7); ctx.stroke(); }
    // shoulders and the two clawed forearms, reaching forward
    ctx.fillStyle = '#6a5c55'; ctx.strokeStyle = edge; ctx.lineWidth = 1.5;
    for (const s of [-1, 1]) {
      const reach = e.state === 'swing' ? r * 0.55 : e.state === 'windup' ? -r * 0.2 : r * 0.2;
      ctx.beginPath(); ctx.ellipse(r * 0.35 + reach * 0.5, s * r * 0.62, r * 0.42, r * 0.22, s * 0.35, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#d9d2c4'; ctx.lineWidth = 1.6;
      for (const k of [-1, 0, 1]) { ctx.beginPath(); ctx.moveTo(r * 0.7 + reach * 0.5, s * r * 0.62 + k * 3); ctx.lineTo(r * 0.88 + reach * 0.5, s * r * 0.62 + k * 4); ctx.stroke(); }
      ctx.strokeStyle = edge; ctx.lineWidth = 1.5;
    }
    // head: forward of the body, a long snout
    ctx.fillStyle = '#6f635c'; ctx.strokeStyle = edge; ctx.lineWidth = 1.7;
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.arc(r * 0.55, s * r * 0.5, r * 0.26, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#c98f98'; ctx.beginPath(); ctx.arc(r * 0.55, s * r * 0.5, r * 0.14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6f635c';
    }
    ctx.beginPath(); ctx.ellipse(r * 0.7, 0, r * 0.5, r * 0.42, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(r * 0.9, -r * 0.3); ctx.quadraticCurveTo(r * 1.5, -r * 0.08, r * 1.55, 0);
    ctx.quadraticCurveTo(r * 1.5, r * 0.08, r * 0.9, r * 0.3); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#d98a94'; ctx.beginPath(); ctx.arc(r * 1.5, 0, r * 0.08, 0, Math.PI * 2); ctx.fill();
    // teeth
    ctx.fillStyle = PALETTE.bone;
    ctx.fillRect(r * 1.28, -r * 0.09, r * 0.14, r * 0.07); ctx.fillRect(r * 1.28, r * 0.02, r * 0.14, r * 0.07);
    // whiskers
    ctx.strokeStyle = 'rgba(239,230,208,0.55)'; ctx.lineWidth = 1;
    for (const s of [-1, 1]) for (const k of [-1, 0, 1]) { ctx.beginPath(); ctx.moveTo(r * 1.25, s * r * 0.12); ctx.lineTo(r * 1.45 + k * 2, s * (r * 0.45 + k * r * 0.1)); ctx.stroke(); }
    // eyes: red, always
    ctx.fillStyle = PALETTE.blood;
    ctx.beginPath(); ctx.arc(r * 0.8, -r * 0.2, r * 0.09, 0, Math.PI * 2); ctx.arc(r * 0.8, r * 0.2, r * 0.09, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.arc(r * 0.82, -r * 0.22, r * 0.03, 0, Math.PI * 2); ctx.arc(r * 0.82, r * 0.18, r * 0.03, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  drawBullet(b) {
    const ctx = this.ctx; ctx.strokeStyle = PALETTE.fireHi; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    const l = 13 / (Math.hypot(b.vx, b.vy) || 1);
    ctx.beginPath(); ctx.moveTo(b.x - b.vx * l, b.y - b.vy * l); ctx.lineTo(b.x, b.y); ctx.stroke();
  }

  drawGoat(g, game) {
    if (PIXEL_ART.ready) { this.painted.drawGoat(this,g,game); return; }
    const ctx = this.ctx;
    // motion smear
    for (const t of g.trail) {
      // `max` is what this ghost was born with, which is what the soul lengthened: divide by it and
      // a long smear fades over its whole length rather than snapping on at the far end.
      ctx.globalAlpha = (t.life / (t.max || TUNING.goat.trail.life)) * 0.16;
      ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(t.a);
      ctx.fillStyle = PALETTE.bone; ctx.beginPath(); ctx.ellipse(-5, 0.5, 13.5, 8.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    // On the stairs he rises, shrinks and thins out: leaving up the flight, or arriving up one.
    const fx = game.stairFx, climb = fx ? clamp(fx.dir > 0 ? fx.t : 1 - fx.t, 0, 1) : 0;
    this.shadow(g.x, g.y, 16 * (1 - climb * 0.35), 8 * (1 - climb * 0.35));
    ctx.save(); ctx.translate(g.x, g.y); ctx.scale(1, 1 / TILT); ctx.translate(0, -5);
    if (g.jitter) ctx.translate(g.jitter.x, g.jitter.y);
    if (climb > 0) { ctx.translate(0, -TUNING.stairs.rise * climb); ctx.scale(1 - 0.22 * climb, 1 - 0.22 * climb); ctx.globalAlpha = 1 - climb * 0.55; }
    // Down a hole: he drops out of the frame turning over, and the dark takes him. `back` is the beat
    // he is out of sight for before he is put back on the boards, which is where this stops drawing.
    if (g.state === 'falling') {
      const F = TUNING.fall, dropped = clamp((F.time + F.back - g.timer) / F.time, 0, 1);
      ctx.translate(0, dropped * 26); ctx.rotate(dropped * 1.5);
      ctx.scale(1 - 0.72 * dropped, 1 - 0.72 * dropped);
      ctx.globalAlpha = 1 - dropped;
    }
    if (g.state === 'roll') ctx.rotate(g.facing + g.rollSpin);
    else ctx.rotate(g.facing);
    // The sprite is built for a goat facing right with its near side down. Facing left it is mirrored
    // rather than turned over, so the head stays a head and the horns stay on top.
    if (Math.cos(g.facing) < 0) ctx.scale(1, -1);
    if (g.dazed > 0 && g.state !== 'ko') ctx.rotate(Math.sin(this.t * 24) * 0.1);
    let sx = 1, sy = 1;
    if (g.state === 'windup' || g.state === 'bite') { sx = 0.82; sy = 1.15; }
    else if (g.state === 'lunge') { sx = 1.3; sy = 0.8; }
    else if (g.state === 'roll') { sx = 0.86; sy = 0.86; }
    else if (g.state === 'rollrecover') { sx = 1.08; sy = 0.9; }
    else if (g.state === 'stunned') { ctx.rotate(0.34); sx = 1.14; sy = 0.76; }   // knocked off his feet
    else if (g.state === 'ko') { ctx.rotate(0.5); sx = 1.15; sy = 0.72; }   // out cold, on his side
    ctx.scale(sx, sy);
    if (g.sqLeft) { const a = g.sqLeft * Math.cos(TUNING.juice.squash.freq * g.sqT); ctx.scale(1 + a, 1 - a); }
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
    // The talisman on a cord round the neck, hanging off the near side. The painted goat gets the
    // same thing from `PaintedArt.collar`; this is the primitive fallback's own.
    if (game.artifact) {
      ctx.strokeStyle = '#6b4a2c'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(4, -9); ctx.quadraticCurveTo(9, 2, 6, 10); ctx.stroke();
      this.artifactIcon(game.artifact.id, 6.5, 10, 3.2, game.artifact.tier);
    }
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
    // two eyes, with the rectangular pupils a goat actually has — shut when he has been clubbed
    if (g.state === 'ko') {
      ctx.strokeStyle = PALETTE.ink; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(17.2, 7.4); ctx.lineTo(20.8, 7.8);
      ctx.moveTo(16.8, -1.6); ctx.lineTo(19.6, -1.2); ctx.stroke();
    } else {
      ctx.fillStyle = '#fbf5e6'; ctx.strokeStyle = edge; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(19, 7.6, 3.1, 2.6, 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(18.2, -1.4, 2.7, 2.2, -0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(17.9, 6.9, 3.6, 2); ctx.fillRect(17.3, -2.1, 3, 1.8);
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(20.4, 6.4, 1.2, 1.2);   // one spark of a highlight
    }
    if (g.screaming > 0) {
      ctx.fillStyle = PALETTE.ink; ctx.beginPath(); ctx.ellipse(25, 7, 2.8, 3.4, 0.45, 0, Math.PI * 2); ctx.fill();
    }
    // tail
    ctx.strokeStyle = PALETTE.bone; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-17.5, 0.5); ctx.lineTo(-23, -3 + Math.sin(this.t * 9) * 2); ctx.stroke();
    if (g.onFire) this.flame(0, -6, 12, 1, g.witchFire);
    ctx.globalAlpha = 1;
    ctx.restore();
    // Stars: the club is still ringing in his skull.
    if (g.dazed > 0 && !(game.intro && game.intro.fade > 0)) this.drawStars(g.x, g.y, 30, Math.min(1, g.dazed * 1.5));
    // aim pip: where the headbutt will go
    if (game.touch.active && game.state === 'play') {
      const a = game.input.aim;
      ctx.fillStyle = 'rgba(239,230,208,0.5)';
      ctx.beginPath(); ctx.arc(g.x + a.x * 34, g.y + a.y * 34, 3.4, 0, Math.PI * 2); ctx.fill();
    }
  }

  // A tapered horn: thick at the base, curving through a control point to a point, with a few growth
  // ridges across it. Shared by the goat's two horns.
  horn(bx, by, cx, cy, tx, ty, w, color, ridge) {
    const ctx = this.ctx, dx = tx - bx, dy = ty - by, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
    ctx.fillStyle = color; ctx.beginPath();
    ctx.moveTo(bx + nx * w, by + ny * w);
    ctx.quadraticCurveTo(cx + nx * w * 0.55, cy + ny * w * 0.55, tx, ty);
    ctx.quadraticCurveTo(cx - nx * w * 0.55, cy - ny * w * 0.55, bx - nx * w, by - ny * w);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = ridge; ctx.lineWidth = 1; ctx.lineCap = 'butt';
    for (let k = 1; k <= 3; k++) {
      const s = k / 4.6, u = 1 - s, hx = u * u * bx + 2 * u * s * cx + s * s * tx, hy = u * u * by + 2 * u * s * cy + s * s * ty, ww = w * u * 0.9;
      ctx.beginPath(); ctx.moveTo(hx + nx * ww, hy + ny * ww); ctx.lineTo(hx - nx * ww, hy - ny * ww); ctx.stroke();
    }
  }

  // Stars over a head, orbiting upright in the counter-tilted frame.
  drawStars(x, y, above, alpha) {
    const ctx = this.ctx;
    ctx.save(); ctx.translate(x, y); ctx.scale(1, 1 / TILT); ctx.globalAlpha = clamp(alpha, 0, 1);
    ctx.fillStyle = PALETTE.fireHi;
    for (let k = 0; k < 3; k++) {
      const a = this.t * 6.5 + k * 2.1;
      ctx.beginPath(); ctx.arc(Math.cos(a) * 15, Math.sin(a) * 6 - above, 3.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // His wife. Wool where he has a coat, a dark face where his is pale, no horns and no beard, and
  // the same marigold collar: the two of them read as a pair, and as two different animals.
  drawSheep(s) {
    const ctx = this.ctx;
    this.shadow(s.x, s.y, 15, 7.5);
    if (PIXEL_ART.ready) {
      // She is the pixel pass's pet sheep. There is no walk cycle for her, so a stride is a bob.
      ctx.save(); ctx.translate(s.x, s.y); ctx.scale(1, 1 / TILT);
      if (s.jitter) ctx.translate(s.jitter.x, s.jitter.y);
      if (s.kick || Math.hypot(s.vx || 0, s.vy || 0) > 40) ctx.translate(0, -Math.abs(Math.sin(this.t * 11)) * 1.6);
      if (s.bleating > 0) ctx.scale(1.04, 0.96);
      PIXEL_ART.draw(ctx, 'sheep-pet', s.facing || 0, false, this.t, s.x);
      ctx.restore(); return;
    }
    ctx.save(); ctx.translate(s.x, s.y); ctx.scale(1, 1 / TILT); ctx.translate(0, -5);
    if (s.jitter) ctx.translate(s.jitter.x, s.jitter.y);
    ctx.rotate(s.facing);
    if (Math.cos(s.facing) < 0) ctx.scale(1, -1);
    ctx.scale(0.94, 0.94);
    const step = s.kick !== undefined && s.kick !== 0 ? s.kick : (Math.hypot(s.vx || 0, s.vy || 0) > 40 ? Math.sin(this.t * 22) * 3.5 : 0);
    // far legs and the far ear
    ctx.strokeStyle = '#3a322f'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(3, -4); ctx.lineTo(4.5 + step, -11); ctx.moveTo(-8, -4); ctx.lineTo(-9.5 - step, -11); ctx.stroke();
    ctx.fillStyle = '#4a3f3a'; ctx.beginPath(); ctx.ellipse(9, -6.5, 4.6, 2.3, -0.5, 0, Math.PI * 2); ctx.fill();
    // near legs
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(3, 4); ctx.lineTo(5 - step, 15); ctx.moveTo(-8, 4); ctx.lineTo(-10 + step, 15); ctx.stroke();
    // the fleece: a ring of bumps over the body
    ctx.fillStyle = PALETTE.bone;
    for (let i = 0; i < 11; i++) { const a = i / 11 * Math.PI * 2; ctx.beginPath(); ctx.arc(-3 + Math.cos(a) * 12, 0.5 + Math.sin(a) * 6.6, 5, 0, Math.PI * 2); ctx.fill(); }
    ctx.beginPath(); ctx.ellipse(-3, 0.5, 13.5, 7.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(150,138,116,0.3)'; ctx.beginPath(); ctx.ellipse(-4, 6, 12, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PALETTE.ochre; ctx.fillRect(4.6, -8.5, 2.4, 17);
    ctx.fillStyle = PALETTE.bone; ctx.beginPath(); ctx.arc(-17, 1, 3.6, 0, Math.PI * 2); ctx.fill();   // tail
    // the head: dark, small and low, with wool on the crown
    ctx.fillStyle = '#4a3f3a';
    ctx.beginPath(); ctx.moveTo(5, -1); ctx.quadraticCurveTo(13, 0, 17, 4.5); ctx.quadraticCurveTo(20, 7.5, 16.5, 10.5);
    ctx.quadraticCurveTo(11, 14, 6, 10); ctx.quadraticCurveTo(3.5, 7.5, 5, -1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = PALETTE.bone;
    ctx.beginPath(); ctx.arc(7.5, 0.5, 4.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(11.2, 1.6, 3.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4a3f3a'; ctx.beginPath(); ctx.ellipse(8.5, 11.5, 4.6, 2.3, 0.8, 0, Math.PI * 2); ctx.fill();   // near ear
    // the eye, with the same rectangular pupil he has
    ctx.fillStyle = '#fbf5e6'; ctx.beginPath(); ctx.ellipse(12.5, 5.6, 2.9, 2.3, 0.25, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PALETTE.ink; ctx.fillRect(11.4, 5, 3.4, 1.8);
    if (s.bleating > 0) { ctx.fillStyle = PALETTE.ink; ctx.beginPath(); ctx.ellipse(17.2, 8.8, 2.2, 2.8, 0.45, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }

  // The heart between the two of them, and the two halves of it after.
  drawHeart(h) {
    const ctx = this.ctx, cell = 2.3, G = HEART_GLYPH;
    ctx.save(); ctx.translate(h.x, h.y); ctx.scale(1, 1 / TILT);
    const half = (c0, c1, ox, oy, rot, alpha) => {
      ctx.save(); ctx.translate(ox, oy); ctx.rotate(rot); ctx.globalAlpha = clamp(alpha, 0, 1);
      ctx.fillStyle = PALETTE.blood;
      for (let r = 0; r < G.length; r++) for (let q = c0; q <= c1; q++) {
        if (G[r][q] === '#') ctx.fillRect((q - 3.5) * cell, (r - 3) * cell, cell + 0.15, cell + 0.15);
      }
      if (c0 === 0) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect((1 - 3.5) * cell, (1 - 3) * cell, cell, cell); }
      ctx.restore();
    };
    if (!h.broken) { const p = h.pulse || 1; ctx.scale(p, p); half(0, 6, 0, 0, 0, h.alpha === undefined ? 1 : h.alpha); }
    else {
      const t = h.broken, fall = t * t * 26;
      half(0, 3, -4 - t * 9, fall, -0.5 * t, 1 - t);
      half(3, 6, 4 + t * 9, fall + 3, 0.5 * t, 1 - t);
    }
    ctx.restore();
  }

  // The opening scene's own actors: his wife, and the heart. The two men are ordinary enemies.
  drawIntroWorld(game) {
    const it = game.intro;
    if (it.sheep && !it.sheep.gone) this.drawSheep(it.sheep);
    if (it.heart && (!it.heart.broken || it.heart.broken < 1)) this.drawHeart(it.heart);
  }

  // Over the picture: the fade to black, the stars that stay lit in the dark, a bleat from a long way
  // off, and a line about skipping it.
  drawIntroOverlay(game) {
    const it = game.intro, ctx = this.ctx, s = this.ts;
    if (it.fade > 0) { ctx.fillStyle = `rgba(13,10,12,${clamp(it.fade, 0, 1)})`; ctx.fillRect(0, 0, this.w, this.h); }
    if (it.starsA > 0 && it.fade > 0) {
      ctx.save(); this.worldTransform(game); this.drawStars(game.goat.x, game.goat.y, 30, it.starsA); ctx.restore();
    }
    if (it.echo > 0) {
      ctx.save(); ctx.globalAlpha = Math.min(1, it.echo, (1.6 - it.echo) * 3) * 0.55;
      ctx.font = `700 ${13 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.bone; ctx.textAlign = 'right';
      ctx.fillText('beeh...', this.w * 0.9, this.vh * 0.47); ctx.restore();
    }
    // Only once it has been watched through. The first run sits and watches. The prologue keeps its
    // own clock, so the line comes up on it the same way it does on the pen.
    const clock = it.pro ? it.pro.t : it.t;
    if (game.introSeen && clock > TUNING.intro.skipAfter + 0.7 && it.phase !== 'black' && it.phase !== 'wake') {
      ctx.save(); ctx.globalAlpha = 0.4 * (1 - it.fade); ctx.font = `700 ${11 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.bone; ctx.textAlign = 'left';
      ctx.fillText(`${game.tapWord} TO SKIP`, 14 * s, this.vh - 14 * s); ctx.restore();
    }
  }

  // The three screens before the pen, and the sacking coming off it. Flat scenes in screen space:
  // a sky, a ground, and the two of them drawn with the same `drawGoat` / `drawSheep` the pen uses,
  // inside a transform that squashes Y by TILT so their own counter-squash stands them up. Nothing
  // here is simulated — the positions come from `updatePrologue` — and everything is deliberately
  // plain: a fence is two rails and some posts, a truck is three boxes and two circles. It is the
  // first version, drawn to be replaced, and what it has to carry is the shape of the story rather
  // than the finish.
  drawPrologue(game) {
    const it = game.intro, pr = it.pro, ctx = this.ctx, P = TUNING.intro.prologue;
    const w = this.vw, h = this.vh, cx = this.vcx, cy = this.vcy, k = this.zoomFit * P.zoom, ph = it.phase, s = this.ts;
    if (!pr) return;
    const scene = () => { ctx.translate(cx, cy); ctx.scale(k, k * TILT); };
    // Screen position of a scene point, for the words that float over the animals.
    const over = (o, lift) => ({ x: cx + o.x * k, y: cy + o.y * k * TILT - lift * k });
    const word = (txt, x, y, alpha, size) => {
      ctx.save(); ctx.globalAlpha = clamp(alpha, 0, 1); ctx.font = `700 ${size * s}px ${FONT_SC}`;
      ctx.fillStyle = PALETTE.bone; ctx.textAlign = 'center'; ctx.fillText(txt, x, y); ctx.restore();
    };

    if (ph === 'meadow') {
      // The one bright screen in the game. Sky, a low sun, a hill, and a field.
      const sky = ctx.createLinearGradient(0, 0, 0, h * 0.5);
      sky.addColorStop(0, '#6f8a99'); sky.addColorStop(1, '#c9b98a');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h * 0.5);
      ctx.fillStyle = 'rgba(255,224,138,0.85)'; ctx.beginPath(); ctx.arc(w * 0.78, h * 0.3, 26 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5f7a3e'; ctx.beginPath(); ctx.moveTo(0, h * 0.5);
      ctx.quadraticCurveTo(w * 0.3, h * 0.38, w * 0.55, h * 0.46); ctx.quadraticCurveTo(w * 0.8, h * 0.52, w, h * 0.44);
      ctx.lineTo(w, h * 0.5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = PALETTE.grass; ctx.fillRect(0, h * 0.5, w, h * 0.5);
      // grass, scattered the same way every frame
      ctx.strokeStyle = PALETTE.grassHi; ctx.lineWidth = 1.6 * s; ctx.lineCap = 'round';
      for (let i = 0; i < 90; i++) {
        const gx = ((i * 137.5) % w), gy = h * 0.5 + ((i * 89.3) % (h * 0.5)), sway = Math.sin(this.t * 1.4 + i) * 1.5 * s;
        ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx - 3 * s + sway, gy - 7 * s); ctx.moveTo(gx, gy); ctx.lineTo(gx + 3 * s + sway, gy - 8 * s); ctx.stroke();
      }
      ctx.save(); scene();
      // the fence: back rails first, then the two of them, then the front rails
      const fx0 = -160, fx1 = 160, fy0 = -62, fy1 = 62;
      const rail = (x0, y0, x1, y1) => { ctx.strokeStyle = PALETTE.woodHi; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); };
      const post = (x, y) => { ctx.fillStyle = PALETTE.wood; ctx.fillRect(x - 2.6, y - 22, 5.2, 24); ctx.fillStyle = PALETTE.woodHi; ctx.fillRect(x - 2.6, y - 22, 5.2, 3); };
      for (const yy of [-12, -3]) { rail(fx0, fy0 + yy, fx1, fy0 + yy); }
      for (let x = fx0; x <= fx1; x += 32) post(x, fy0);
      for (const yy of [-12, -3]) { rail(fx0, fy0 + yy, fx0, fy1 + yy); rail(fx1, fy0 + yy, fx1, fy1 + yy); }
      for (let y = fy0 + 32; y < fy1; y += 32) { post(fx0, y); post(fx1, y); }
      // them, back to front
      const actors = [pr.goat, pr.ewe].sort((a, b) => a.y - b.y);
      for (const o of actors) o === pr.goat ? this.drawGoat(o, game) : this.drawSheep(o);
      if (pr.heart) { ctx.save(); ctx.globalAlpha = pr.heart.a; this.drawHeart(pr.heart); ctx.restore(); }
      for (const yy of [-12, -3]) rail(fx0, fy1 + yy, fx1, fy1 + yy);
      for (let x = fx0; x <= fx1; x += 32) post(x, fy1);
      ctx.restore();
      // A black screen and three words before anything else in the game has shown itself: nothing
      // else opens on black, so this is the one place a player has to be told what they are looking
      // at is a memory rather than the game starting somewhere strange. Held, then bleeds away as
      // the field itself fades up through it.
      if (pr.sceneT < P.titleCard) {
        const tp = pr.sceneT / P.titleCard, veil = 1 - clamp((tp - 0.55) / 0.45, 0, 1);
        ctx.fillStyle = `rgba(9,7,8,${veil})`; ctx.fillRect(0, 0, w, h);
        const textA = 1 - clamp((tp - 0.4) / 0.3, 0, 1);
        word('SOME TIME AGO', cx, cy, Math.min(clamp(tp / 0.12, 0, 1), textA), 15);
      }
    } else if (ph === 'road') {
      // Night, a moon, and a road going past under a truck that stays where it is.
      const sky = ctx.createLinearGradient(0, 0, 0, h * 0.55);
      sky.addColorStop(0, '#171420'); sky.addColorStop(1, '#2b2434');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h * 0.55);
      ctx.fillStyle = 'rgba(239,230,208,0.8)'; ctx.beginPath(); ctx.arc(w * 0.2, h * 0.2, 18 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1c1719'; ctx.fillRect(0, h * 0.55, w, h * 0.45);
      const ry0 = h * 0.6, ry1 = h * 0.86;
      ctx.fillStyle = '#3a3538'; ctx.fillRect(0, ry0, w, ry1 - ry0);
      ctx.fillStyle = '#4a4448'; ctx.fillRect(0, ry0, w, 3 * s); ctx.fillRect(0, ry1 - 3 * s, w, 3 * s);
      // the centre line, and the ground going past with it
      const period = 90 * s, off = (pr.t * P.roadSpeed * s) % period;
      ctx.fillStyle = 'rgba(239,230,208,0.55)';
      for (let x = -off; x < w + period; x += period) ctx.fillRect(x, (ry0 + ry1) / 2 - 2 * s, period * 0.5, 4 * s);
      ctx.strokeStyle = 'rgba(239,230,208,0.12)'; ctx.lineWidth = 1.5 * s;
      for (let i = 0; i < 14; i++) {
        const lx = ((i * 173 - pr.t * P.roadSpeed * 1.3 * s) % (w + 200)) + (i % 2 ? 0 : 100), ly = h * 0.56 + (i * 41) % (h * 0.04);
        ctx.beginPath(); ctx.moveTo(((lx % (w + 200)) + w + 200) % (w + 200) - 100, ly); ctx.lineTo(((lx % (w + 200)) + w + 200) % (w + 200) - 100 + 40 * s, ly); ctx.stroke();
      }
      ctx.save(); scene(); ctx.translate(0, 44 + (pr.jolt || 0) * 0.5);   // wheels on the asphalt, not the verge
      // the truck: a flatbed, a cab, two wheels, and a cage on the back
      ctx.fillStyle = '#2a2224'; ctx.fillRect(-118, 8, 214, 12);                   // bed
      ctx.fillStyle = '#3b2f33'; ctx.fillRect(96, -34, 52, 54); ctx.fillStyle = '#6f8a99'; ctx.fillRect(104, -28, 34, 22);   // cab, window
      ctx.fillStyle = PALETTE.fireHi; ctx.fillRect(146, -4, 5, 8);                // headlamp
      const wheel = (x) => {
        ctx.save(); ctx.translate(x, 26); ctx.rotate(pr.t * P.roadSpeed / 16);
        ctx.fillStyle = '#141013'; ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#4a4448'; ctx.lineWidth = 3;
        for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 13, Math.sin(a) * 13); ctx.stroke(); }
        ctx.fillStyle = '#4a4448'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      };
      wheel(-76); wheel(64);
      // the cage, back bars, then them, then the front bars
      const bar = (x, y0, y1) => { ctx.fillStyle = '#7a7377'; ctx.fillRect(x - 1.6, y0, 3.2, y1 - y0); };
      ctx.fillStyle = 'rgba(20,16,19,0.5)'; ctx.fillRect(-104, -56, 168, 64);
      for (let x = -104; x <= 64; x += 21) if (x < -40 || x > 30) bar(x, -56, 8);
      ctx.fillStyle = '#5a5257'; ctx.fillRect(-106, -58, 172, 4);
      for (const o of [pr.goat, pr.ewe]) o === pr.goat ? this.drawGoat(o, game) : this.drawSheep(o);
      for (let x = -104; x <= 64; x += 21) bar(x, -56, 8);
      ctx.restore();
    } else if (ph === 'dark') {
      ctx.fillStyle = '#0d0a0c'; ctx.fillRect(0, 0, w, h);
    } else if (ph === 'cloth') {
      // The pen is under this. Sacking, dropping off it from the top down, with a sway in it.
      const p = clamp(pr.sceneT / P.cloth, 0, 1), e = p * p, drop = e * h * 1.2, sway = Math.sin(p * 7) * 14 * s * (1 - p);
      // The sacking covers the view and slides down off it, so the pen comes out from the top edge.
      ctx.save(); ctx.translate(sway, drop);
      ctx.fillStyle = '#2a2119'; ctx.fillRect(-40 * s, 0, w + 80 * s, h * 1.05);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
      for (let y = 0; y < h; y += 9 * s) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y + 4 * s); ctx.stroke(); }
      ctx.restore();
      ctx.fillStyle = `rgba(13,10,12,${(1 - p) * 0.6})`; ctx.fillRect(0, 0, w, h);
    }
    // The words. Over whoever said it in the field and on the road; in the dark they are all there is,
    // and they come from the two sides of the screen the two of them were last on.
    if (pr.last) {
      const L = pr.last, a = Math.min(1, L.life * 3), size = ph === 'dark' ? 22 : 13;
      if (ph === 'dark') word(L.word, L.who === 'goat' ? w * 0.36 : w * 0.64, cy + (1 - L.life) * 12 * s, a, size);
      else if (ph !== 'cloth') { const o = over(L.who === 'goat' ? pr.goat : pr.ewe, ph === 'road' ? 62 : 34); word(L.word, o.x, o.y, a, size); }
    }
    if (ph !== 'cloth') this.drawVignette(game);
  }

  // A corrupted soul, hanging where the man it was in fell. It was a book, which asked the player to
  // believe that a goat reads; it is a wisp now — a violet flame with nothing burning under it, a
  // pale core, and a ring of sparks going round it the wrong way. Violet is the game's colour for
  // things that are not supposed to exist (witchfire, the Seer's runes, the wraith), and the whole
  // point of the thing is that swallowing it is not a good idea and you are going to do it anyway.
  // `flat` is for the cards and the menu, which are drawn in screen space and must not be given the
  // counter-squash the world needs.
  // An ease that overshoots and settles back: a thing that springs into place.
  static backOut(p) { const c = 1.70158, q = clamp(p, 0, 1) - 1; return 1 + (c + 1) * q * q * q + c * q * q; }

  // The party a soul gets (`TUNING.fanfare`, 1.66): "you made it, and now you are stronger". A flash,
  // a wheel of gold and violet rays turning behind the soul, the soul popping in, A SOUL bouncing up
  // over it and a burst of confetti falling through it. The rays and the confetti are cells on a grid
  // of `fanfare.px` HUD px, the rays drawn one texel a cell into a small canvas and blown up
  // unsmoothed, so it is pixels like every other effect; the flash is light, the one exception.
  drawSoulFanfare(game, cx, cy, s) {
    const F = TUNING.fanfare, ctx = this.ctx, t = game.boonT === undefined ? 9 : game.boonT;
    const P = Math.max(2, Math.round(F.px * s)), B = Renderer.backOut;
    if (t < F.flash) { ctx.fillStyle = `rgba(236,226,255,${0.55 * (1 - t / F.flash)})`; ctx.fillRect(0, 0, this.w, this.h); }
    const R = Math.ceil(Math.min(this.w, this.h) * 0.6 / P), c = this.fanCanvas || (this.fanCanvas = document.createElement('canvas'));
    if (c.width !== R * 2) c.width = c.height = R * 2;
    const x = c.getContext('2d'); x.clearRect(0, 0, R * 2, R * 2);
    // Loud while the soul lands, then settling to a glow the cards can be read over. Each ray is
    // laid three times, shorter and brighter toward the middle, so it fades out in hard steps and
    // never reaches the edge of its canvas.
    const grow = Math.min(1.05, B(t / (F.intro * 0.9))), turn = t * F.spin * Math.PI * 2;
    const loud = lerp(1, F.settle, clamp((t - F.intro) / 0.8, 0, 1));
    for (let k = 0; k < F.rays; k++) {
      const a = turn + k / F.rays * Math.PI * 2, w = Math.PI / F.rays * 0.5, gold = k % 2 === 0;
      for (const f of [0.9, 0.62, 0.38]) {
        x.fillStyle = gold ? `rgba(255,214,110,${0.1 * loud})` : `rgba(174,130,236,${0.09 * loud})`;
        x.beginPath(); x.moveTo(R, R); x.arc(R, R, R * f * grow, a - w, a + w); x.closePath(); x.fill();
      }
    }
    // the ring of light round the soul itself, in three hard steps
    for (const [f, a] of [[0.3, 0.12], [0.21, 0.18], [0.13, 0.26]]) {
      x.fillStyle = `rgba(255,236,190,${a * (0.5 + 0.5 * loud)})`; x.beginPath(); x.arc(R, R, R * f * grow, 0, Math.PI * 2); x.fill();
    }
    const smooth = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    ctx.drawImage(c, Math.round(cx - R * P), Math.round(cy - R * P), R * 2 * P, R * 2 * P);
    ctx.imageSmoothingEnabled = smooth;
    // the confetti: one burst up and out of the soul, falling back through the picture and winking out
    const cols = [PALETTE.fireHi, PALETTE.witchHi, PALETTE.bone, PALETTE.ochre, '#ae82ec', '#e0463c'];
    const g = 520 * s, tau = t - 0.04;
    if (tau > 0 && tau < 2.2) for (let i = 0; i < F.sparks; i++) {
      const h1 = (Math.sin(i * 12.9898) * 43758.5453) % 1, h2 = (Math.sin(i * 78.233) * 12345.678) % 1, h3 = Math.abs((Math.sin(i * 3.1) * 999.1) % 1);
      const a = -Math.PI / 2 + h1 * 1.5, v = (230 + Math.abs(h2) * 300) * s, life = 1.3 + h3 * 0.9;
      if (tau > life || (Math.floor(tau * 14) + i) % 6 === 0) continue;
      const px = cx + Math.cos(a) * v * tau * 0.8, py = cy + Math.sin(a) * v * tau + 0.5 * g * tau * tau;
      const sz = P * (i % 3 === 0 ? 2 : 1);
      ctx.globalAlpha = clamp((life - tau) / 0.4, 0, 1);
      ctx.fillStyle = cols[i % cols.length];
      ctx.fillRect(Math.round(px / P) * P, Math.round(py / P) * P, sz, sz);
    }
    ctx.globalAlpha = 1;
    // the soul, springing in and then breathing
    this.soulWisp(cx, cy, 2.4 * s * (0.3 + 0.7 * B(t / 0.35)) * (1 + 0.05 * Math.sin(t * 5)), t * 2, 1, true);
    // A CORRUPTED SOUL, bouncing up over it — squeezed to the screen's width on a narrow one
    const tp = B((t - 0.1) / 0.32);
    if (tp > 0) {
      const ty = Math.max(30 * s, cy - 52 * s), word = 'A CORRUPTED SOUL';
      ctx.save(); ctx.translate(cx, ty);
      ctx.textAlign = 'center'; ctx.font = `700 ${30 * s}px ${FONT_SC}`;
      const fit = Math.min(1, (this.w * 0.92) / (ctx.measureText(word).width + 12 * s));
      ctx.scale(tp * fit, tp * fit);
      ctx.lineWidth = 6 * s; ctx.strokeStyle = '#2a1244'; ctx.lineJoin = 'round'; ctx.strokeText(word, 0, 0);
      ctx.fillStyle = PALETTE.fireHi; ctx.fillText(word, 0, 0);
      ctx.restore();
    }
  }

  soulWisp(x, y, scale, phase, alpha, flat) {
    const ctx = this.ctx, k = scale;
    const flick = 0.85 + 0.15 * Math.sin(this.t * 9 + phase * 3);
    ctx.save(); ctx.translate(x, y); if (!flat) ctx.scale(1, 1 / TILT);
    ctx.globalAlpha *= alpha === undefined ? 1 : alpha;
    // the haze it sits in
    const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, 34 * k);
    halo.addColorStop(0, `rgba(125,92,255,${0.36 * flick})`);
    halo.addColorStop(0.55, `rgba(125,92,255,${0.12 * flick})`);
    halo.addColorStop(1, 'rgba(125,92,255,0)');
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(0, 0, 34 * k, 0, Math.PI * 2); ctx.fill();
    if (!(this.painted.ready && this.painted.soulWispBody(ctx, 26 * k * flick))) {
      // the body of it: a teardrop of flame, wider at the bottom, drawn upward
      ctx.fillStyle = PALETTE.witch; ctx.beginPath();
      ctx.moveTo(0, -15 * k * flick);
      ctx.bezierCurveTo(7.5 * k, -5 * k, 8.5 * k, 6 * k, 0, 10 * k);
      ctx.bezierCurveTo(-8.5 * k, 6 * k, -7.5 * k, -5 * k, 0, -15 * k * flick);
      ctx.fill();
      ctx.fillStyle = PALETTE.witchHi; ctx.beginPath();
      ctx.moveTo(0, -8 * k * flick);
      ctx.bezierCurveTo(4 * k, -2 * k, 4.4 * k, 4 * k, 0, 6.4 * k);
      ctx.bezierCurveTo(-4.4 * k, 4 * k, -4 * k, -2 * k, 0, -8 * k * flick);
      ctx.fill();
      // and the two cold points in it, which is the only part of the man that is left
      ctx.fillStyle = PALETTE.blood;
      ctx.fillRect(-3 * k, -1.4 * k, 1.8 * k, 2.6 * k); ctx.fillRect(1.2 * k, -1.4 * k, 1.8 * k, 2.6 * k);
    }
    // sparks, going round it against the turn of everything else in the game
    for (let i = 0; i < 5; i++) {
      const a = -this.t * 1.7 + phase + i * (Math.PI * 2 / 5);
      const rr = (13 + 3 * Math.sin(this.t * 2.2 + i)) * k;
      ctx.globalAlpha *= 1; ctx.fillStyle = i % 2 ? PALETTE.witchHi : PALETTE.witch;
      ctx.beginPath(); ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr * 0.7 - 2 * k, 1.5 * k, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  drawSouls(game) {
    const ctx = this.ctx;
    for (const tm of game.souls) {
      if (game.hidden(tm.x, tm.y)) continue;
      const bob = Math.sin(this.t * 2.6 + tm.phase) * 2.5;
      this.shadow(tm.x, tm.y + 6, 9, 4);
      this.soulWisp(tm.x, tm.y + bob, 1, tm.phase);
      ctx.save(); ctx.scale(1, 1 / TILT);
      ctx.font = `700 ${11}px ${FONT_SC}`; ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(191,230,255,${0.5 + 0.3 * Math.sin(this.t * 3)})`;
      ctx.fillText('SOUL', tm.x, (tm.y - 30 + bob) * TILT); ctx.textAlign = 'left'; ctx.restore();
    }
  }

  // The rooms nobody has walked into, painted out. It goes down after the floor, the blood and the
  // holes and before anything standing on them, and everything that stands on them is filtered by
  // `game.hidden` in the draw order above — so an unopened room is a wall-coloured rectangle with a
  // doorway in it, and the doorway is the only thing the room tells you about itself.
  // The moving half of the fog. `world.vis` is one byte a tile — set by the shadowcast in `World`
  // from wherever the goat is standing — and this paints everything outside it down. The mask is
  // built at one pixel a tile on a small offscreen canvas and blown up over the world with
  // smoothing on, so the edge of a partition's shadow is a gradient and not a staircase of squares.
  // It goes on after everything else in world space, so a man standing behind a pillar is as dark
  // as the floor he is standing on: nothing is culled, it is simply not lit.
  drawShade(game, cam) {
    const wd = game.world;
    // A dead goat's vision froze with him: without this the pull-back would drag his own small sight
    // circle out across the whole level, blotting out every room but the one he died in. `drawUnseen`
    // already carries the seen/unseen split the death screen actually wants, room by room.
    if (!wd || !wd.visBox || game.state === 'intro' || game.state === 'dead') return;
    const { x0, y0, x1, y1 } = this.visibleTiles(cam);
    const nx = x1 - x0 + 1, ny = y1 - y0 + 1, R = TUNING.fog.res;
    if (nx < 1 || ny < 1) return;
    if (!this.shade || this.shade.width < nx * R || this.shade.height < ny * R) {
      this.shade = document.createElement('canvas');
      this.shade.width = Math.max(nx * R, 128 * R); this.shade.height = Math.max(ny * R, 96 * R);
      this.shadeCtx = this.shade.getContext('2d');
    }
    const sc = this.shadeCtx;
    sc.clearRect(0, 0, nx * R, ny * R);
    sc.fillStyle = game.level.def.fog;
    // One run of dark tiles at a time: a row of a room is usually all one thing or the other.
    for (let ty = y0; ty <= y1; ty++) {
      let run = -1;
      for (let tx = x0; tx <= x1; tx++) {
        const dark = !wd.seesTile(tx, ty);
        if (dark && run < 0) run = tx;
        else if (!dark && run >= 0) { sc.fillRect((run - x0) * R, (ty - y0) * R, (tx - run) * R, R); run = -1; }
      }
      if (run >= 0) sc.fillRect((run - x0) * R, (ty - y0) * R, (x1 + 1 - run) * R, R);
    }
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = TUNING.fog.shade;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.shade, 0, 0, nx * R, ny * R, x0 * TILE, y0 * TILE, nx * TILE, ny * TILE);
    ctx.restore();
    ctx.imageSmoothingEnabled = false;
  }

  drawUnseen(game) {
    const ctx = this.ctx, def = game.level.def;
    ctx.fillStyle = def.fog;
    // The death screen wants the opposite of what play does: a room nobody opened is still part of
    // the level and the point of showing it is that it was there, so it is only lightly tinted
    // rather than painted out solid — a corridor between two rooms is never hidden at all (see
    // CLAUDE.md), and a heavy fill here left every unopened room unreadable next to the ones the run
    // actually walked through, which is the opposite of what a recap of the level is for. In play
    // the same rectangle stays the flat wall it always was: the fog is there to keep a room unseen,
    // not to be looked at.
    ctx.globalAlpha = game.state === 'dead' ? TUNING.deathCam.fogAlpha : 1;
    for (const r of game.level.rooms) {
      if (r.seen) continue;
      ctx.fillRect(r.x * TILE, r.y * TILE, r.w * TILE, r.h * TILE);
    }
    ctx.globalAlpha = 1;
    // Rooms left behind (`game.updateClamps`): not fog but darkness, faded in over `clamp.slam`,
    // and the veil hanging in the mouth that put them out. The death recap tints them the way it
    // tints a room nobody opened, since the recap is the one place the whole level is the point.
    const dead = game.state === 'dead';
    for (const r of game.level.rooms) {
      if (!r.clamped) continue;
      const k = clamp((game.timer - (r.clampAt || 0)) / (TUNING.clamp.slam * 3), 0, 1);
      ctx.globalAlpha = (dead ? TUNING.deathCam.fogAlpha : 1) * k;
      ctx.fillStyle = '#050308';
      ctx.fillRect(r.x * TILE, r.y * TILE, r.w * TILE, r.h * TILE);
      ctx.globalAlpha = 1;
      if (r.exitMouth && !dead) this.drawVeil(r.exitMouth, k);
    }
  }

  // The veil across the mouth of a room left behind: a curtain of dark that breathes, with a few
  // violet threads drifting down it, fading out into the corridor on the near side. It sits over the
  // stone `updateClamps` put back, so the wall under it is never seen — what shuts the room is magic,
  // and it looks like nothing you could put your head through.
  drawVeil(m, k) {
    const ctx = this.ctx, t = this.t, long = m.span * TILE;
    const w = m.vertical ? TILE * 2 : long + TILE * 0.6, h = m.vertical ? long + TILE * 0.6 : TILE * 2;
    ctx.save(); ctx.translate(m.x, m.y); ctx.globalAlpha = k;
    const g = m.vertical ? ctx.createLinearGradient(-w / 2, 0, w / 2, 0) : ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    g.addColorStop(0, 'rgba(5,3,8,0)'); g.addColorStop(0.3, 'rgba(5,3,8,0.97)');
    g.addColorStop(0.7, 'rgba(5,3,8,0.97)'); g.addColorStop(1, 'rgba(5,3,8,0)');
    ctx.fillStyle = g; ctx.fillRect(-w / 2, -h / 2, w, h);
    // a faint cold glow on the face of it, breathing, so it reads as something put there
    ctx.fillStyle = `rgba(125,92,255,${0.07 + 0.05 * Math.sin(t * 1.7)})`;
    ctx.fillRect(m.vertical ? -6 : -long / 2, m.vertical ? -long / 2 : -6, m.vertical ? 12 : long, m.vertical ? long : 12);
    // threads: wavering strands running the length of the veil, each at its own depth and phase
    ctx.lineWidth = 1.4; ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const off = (i - 1.5) * 5, ph = t * (0.7 + i * 0.23) + i * 1.9;
      ctx.strokeStyle = `rgba(125,92,255,${0.18 + 0.2 * Math.sin(ph * 1.3) ** 2})`;
      ctx.beginPath();
      for (let s = 0; s <= 12; s++) {
        const along = (s / 12 - 0.5) * long, across = off + Math.sin(ph + s * 0.9) * 2.5;
        const x = m.vertical ? across : along, y = m.vertical ? along : across;
        if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // a few motes rising off it
    ctx.fillStyle = 'rgba(191,230,255,0.5)';
    for (let i = 0; i < m.span * 2; i++) {
      const a = (t * 0.35 + i * 0.37) % 1, f = ((i * 0.618) % 1) - 0.5;
      const x = m.vertical ? Math.sin(t + i) * 6 : f * long, y = m.vertical ? f * long : Math.sin(t + i) * 6;
      ctx.globalAlpha = k * (1 - a) * 0.6;
      ctx.beginPath(); ctx.arc(x, y - a * 14, 1.1, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore(); ctx.globalAlpha = 1;
  }

  // The death screen's own mark on the map: a plain line along `game.pathTrail`, a dot where the run
  // began and a small cross where it ended. `lineWidth` is a screen-pixel width divided back out of
  // the camera zoom, since we are inside `worldTransform` here and a world-space width would go from
  // a thread to a rope over the length of the pull-back.
  drawDeathPath(game) {
    const trail = game.pathTrail;
    if (!trail || trail.length < 2) return;
    const ctx = this.ctx, z = game.cam.zoom;
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = PALETTE.blood; ctx.globalAlpha = 0.8;
    ctx.lineWidth = TUNING.deathCam.lineWidth / z;
    ctx.beginPath(); ctx.moveTo(trail[0].x, trail[0].y);
    for (let i = 1; i < trail.length; i++) ctx.lineTo(trail[i].x, trail[i].y);
    ctx.stroke();
    const start = trail[0], end = trail[trail.length - 1], dot = 4 / z, x = 6 / z;
    ctx.fillStyle = PALETTE.bone; ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.arc(start.x, start.y, dot, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = PALETTE.bone; ctx.lineWidth = TUNING.deathCam.lineWidth / z;
    ctx.beginPath();
    ctx.moveTo(end.x - x, end.y - x); ctx.lineTo(end.x + x, end.y + x);
    ctx.moveTo(end.x - x, end.y + x); ctx.lineTo(end.x + x, end.y - x);
    ctx.stroke();
    // A small skull wherever a man went down, so the map says what the run did as well as where.
    const k = TUNING.deathCam.skull / z;
    for (const m of game.killMarks || []) this.skullMark(m.x, m.y, k);
    ctx.restore();
  }
  // A skull `k` world units across, drawn upright on the tilted floor: a round cranium, a jaw, two
  // eye sockets and a nose. Bone on a dark rim so it holds on a pale floor and a dark one alike.
  skullMark(x, y, k) {
    const ctx = this.ctx;
    ctx.save(); ctx.translate(x, y); ctx.scale(1, 1 / TILT); ctx.globalAlpha = 0.92;
    ctx.fillStyle = PALETTE.ink;
    ctx.beginPath(); ctx.arc(0, -k * 0.12, k * 0.62, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(-k * 0.42, k * 0.1, k * 0.84, k * 0.52);
    ctx.fillStyle = PALETTE.bone;
    ctx.beginPath(); ctx.arc(0, -k * 0.12, k * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(-k * 0.3, k * 0.12, k * 0.6, k * 0.4);
    ctx.fillStyle = PALETTE.ink;
    ctx.beginPath(); ctx.arc(-k * 0.2, -k * 0.1, k * 0.14, 0, Math.PI * 2); ctx.arc(k * 0.2, -k * 0.1, k * 0.14, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(-k * 0.04, k * 0.1, k * 0.08, k * 0.12);
    ctx.restore();
  }

  // One choice per Butcher. Tap a card, or press its number.
  drawBoonChoice(game) {
    if (game.state !== 'boon' || !game.boonChoice) { game.boonRects = []; return; }
    // The pointer's own card, so a hover reads as pointing at something rather than as nothing at
    // all: `game.boonAt` is the same hit-test the click itself goes through, against last frame's
    // rects — they never move while the choice is up, so the one-frame lag is not felt.
    // Not on touch: a lifted finger leaves the pointer where it was, and that card stayed lit.
    const hoverI = game.boonDown < 0 && !game.touch.active ? game.boonAt(game.input.mouse) : -1;
    game.boonRects = [];
    const ctx = this.ctx, s = this.ts, n = game.boonChoice.length, fire = !!game.mods.breath;
    const F = TUNING.fanfare, bt = game.boonT === undefined ? 9 : game.boonT;
    ctx.fillStyle = `rgba(13,10,12,${0.86 * Math.min(1, bt / 0.2)})`; ctx.fillRect(0, 0, this.w, this.h);
    ctx.textAlign = 'center';
    const stack = this.portrait || this.vw < 760 * s;
    const cw = stack ? Math.min(this.w * 0.88, 440 * s) : Math.min(this.w * 0.29, 280 * s);
    // What each card says, wrapped before anything is drawn: one or two short lines of what the soul
    // does, and nothing else (25 Sep 2026: the numbers line under it was "windup speed, what the
    // hell?" — it lives in the dev drawer now). Every card of the three is as tall as the wordiest
    // one, so they still read as a row of equals; the minimum height keeps a one-liner a card.
    const descFont = `${13.5 * s}px ${FONT}`, textW = cw - 24 * s;
    const texts = game.boonChoice.map((b) => { ctx.font = descFont; return { desc: this.wrap(b.desc, textW) }; });
    const tall = Math.max(...texts.map((t) => 54 + t.desc.length * 17));
    const ch = Math.max(stack ? 84 : 112, tall + 12) * s;
    const gap = 13 * s;
    const blockH = stack ? n * ch + (n - 1) * gap : ch;
    const topY = this.h / 2 - blockH / 2;
    this.drawSoulFanfare(game, this.w / 2, topY - 44 * s, s);
    const rowW = n * cw + (n - 1) * gap;
    for (let i = 0; i < n; i++) {
      const x = stack ? (this.w - cw) / 2 : (this.w - rowW) / 2 + i * (cw + gap);
      const y = stack ? topY + i * (ch + gap) : topY;
      const b = game.boonChoice[i], hover = i === hoverI;
      game.boonRects.push({ x, y, w: cw, h: ch });
      // Each card springs in after the soul, a beat after the one before it (`fanfare.stagger`).
      const pk = clamp((bt - F.intro - i * F.stagger) / F.pop, 0, 1);
      if (pk <= 0) continue;
      ctx.save(); ctx.globalAlpha *= Math.min(1, pk * 2);
      const pz = 0.55 + 0.45 * Renderer.backOut(pk);
      ctx.translate(x + cw / 2, y + ch / 2); ctx.scale(pz, pz); ctx.translate(-(x + cw / 2), -(y + ch / 2));
      // A ring outside the card's own border, plain and bright regardless of active/passive, so the
      // pointer clearly has hold of one of the three rather than nothing changing at all.
      if (hover) { ctx.strokeStyle = 'rgba(239,230,208,0.9)'; ctx.lineWidth = 2 * s; ctx.strokeRect(x - 4 * s, y - 4 * s, cw + 8 * s, ch + 8 * s); }
      ctx.fillStyle = b.active ? (hover ? 'rgba(97,47,52,0.95)' : 'rgba(74,36,40,0.92)') : (hover ? 'rgba(76,45,66,0.95)' : 'rgba(59,34,51,0.9)');
      ctx.fillRect(x, y, cw, ch);
      ctx.strokeStyle = b.active ? PALETTE.blood : PALETTE.ochre; ctx.lineWidth = (hover ? 3 : 2) * s; ctx.strokeRect(x, y, cw, ch);
      ctx.fillStyle = b.active ? PALETTE.blood : PALETTE.ochre; ctx.fillRect(x, y, cw, 3 * s);
      ctx.fillStyle = PALETTE.bone; ctx.font = `700 ${16 * s}px ${FONT_SC}`;
      ctx.fillText(b.name, x + cw / 2, y + 30 * s);
      // The glyph that stands for the boon everywhere it is named, bigger here than anywhere
      // else — this is the one place a player is deciding, so it is the one place it earns the size.
      if (b.emoji) {
        const half = ctx.measureText(b.name).width / 2;
        ctx.font = `${20 * s}px ${FONT}`; ctx.textAlign = 'right';
        ctx.fillText(b.emoji, x + cw / 2 - half - 8 * s, y + 32 * s);
        ctx.textAlign = 'center';
      }
      ctx.font = descFont; ctx.fillStyle = 'rgba(239,230,208,0.75)';
      const tx = texts[i];
      tx.desc.forEach((l, k) => ctx.fillText(l, x + cw / 2, y + 54 * s + k * 17 * s));
      // What it hangs off, drawn the same way the rail draws it, so the card that offers a boon
      // and the chip that later shows it are recognisably the same picture. A boon with no `skill`
      // is body work and gets neither — nothing on the rail changes for it either.
      if (b.skill) {
        ctx.save(); ctx.translate(x + cw - 20 * s, y + 17 * s);
        // Drawn as the verb will look once this soul is on it, so the card shows what it buys.
        const pm = Object.assign({}, game.mods); b.apply(pm, b.params || {});
        this.skillIcon(b.skill, 9 * s, game, fire, pm);
        ctx.restore();
        // A key name means nothing to a thumb: on touch the picture of the verb is the whole caption.
        if (!game.touch.active) {
          ctx.fillStyle = PALETTE.ochre; ctx.font = `700 ${9 * s}px ${FONT_SC}`;
          ctx.fillText(SKILL_KEYS[b.skill], x + cw - 20 * s, y + 34 * s);
        }
      } else {
        ctx.fillStyle = PALETTE.ochre; ctx.font = `700 ${9 * s}px ${FONT_SC}`;
        ctx.fillText('BODY', x + cw - 20 * s, y + 20 * s);
      }
      ctx.restore();
    }
    // The fourth choice: none of the three. Set apart from the cards — no border colour a card
    // uses, no emoji, just the soul's own violet — so it reads as declining rather than as a
    // fourth thing on offer.
    const skipW = stack ? cw : Math.min(rowW, 260 * s), skipH = 30 * s;
    const skipX = (this.w - skipW) / 2;
    const skipY = (stack ? topY + blockH : topY + ch) + 18 * s;
    const skipHover = hoverI === n;
    game.boonRects.push({ x: skipX, y: skipY, w: skipW, h: skipH });
    // Declining arrives last, once all three cards are in.
    ctx.save(); ctx.globalAlpha *= clamp((bt - F.intro - n * F.stagger - F.pop) / 0.25, 0, 1);
    ctx.fillStyle = skipHover ? 'rgba(53,40,74,0.75)' : 'rgba(37,29,48,0.5)';
    ctx.fillRect(skipX, skipY, skipW, skipH);
    ctx.strokeStyle = skipHover ? PALETTE.witchHi : 'rgba(125,92,255,0.5)';
    ctx.lineWidth = (skipHover ? 2 : 1.4) * s; ctx.strokeRect(skipX, skipY, skipW, skipH);
    ctx.fillStyle = skipHover ? PALETTE.bone : 'rgba(239,230,208,0.65)';
    ctx.font = `700 ${12.5 * s}px ${FONT_SC}`;
    ctx.fillText('RELEASE THE SOUL', skipX + skipW / 2, skipY + skipH / 2 + 4.5 * s);
    ctx.restore();
    ctx.textAlign = 'left';
  }

  drawRings(game) {
    const ctx = this.ctx;
    // Cells on the world grid rather than a stroked arc: a smooth ring over pixel art reads as UI.
    for (const r of game.rings) {
      const p = 1 - r.life / r.max;
      ctx.globalAlpha = (1 - p) * (r.width > 3 ? 0.7 : 0.35);
      CombatFX.pixelRing(ctx, r.x, r.y, r.r * p, (r.width || 3) * (1 - p * 0.6), r.color);
    }
    ctx.globalAlpha = 1;
  }

  // Hoof dust: soft discs that swell and thin out. Drawn on the ground, under everything standing.
  drawPuffs(game) {
    const ctx = this.ctx, D = TUNING.juice.dust;
    ctx.fillStyle = PALETTE.bone;
    for (const p of game.puffs) {
      const k = 1 - p.life / p.max;
      ctx.globalAlpha = 0.22 * Math.min(1, p.life / p.max * 2);
      ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r + D.grow * k, (p.r + D.grow * k) * TILT, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // A rifle's muzzle flash: a beat of fire along the shot, then nothing.
  drawFlares(game) {
    const ctx = this.ctx, M = TUNING.juice.muzzle;
    for (const f of game.flares) {
      const k = f.life / M.life, L = M.size * (0.6 + 0.4 * k);
      // Cells laid along the shot, not a vector star: a tapering tongue, its hot core, and a short
      // cross-flare where the powder leaves the barrel.
      const px = TUNING.effects.pixel, ca = Math.cos(f.a), sa = Math.sin(f.a);
      const cell = (u, v, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round((f.x + ca * u - sa * v) / px) * px - px, Math.round((f.y + sa * u + ca * v) / px) * px - px, px * 2, px * 2); };
      ctx.globalAlpha = Math.min(1, k * 1.5);
      for (let u = 0; u < L; u += px * 1.5) { const w = Math.round(4 * (1 - u / L)); for (let v = -w; v <= w; v += px * 1.5) cell(u, v, Math.abs(v) < w * 0.45 && u < L * 0.65 ? PALETTE.fireHi : PALETTE.fire); }
      for (let v = -L * 0.35; v <= L * 0.35; v += px * 1.5) cell(L * 0.2, v, PALETTE.fireHi);
    }
    ctx.globalAlpha = 1;
  }

  drawParticles(game) {
    const ctx = this.ctx;
    // Every bit is whole world pixels on the grid the sprites are drawn at.
    const px = TUNING.effects.pixel;
    for (const p of game.parts) {
      ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillStyle = p.color;
      const s = Math.max(px, Math.round(p.size / px) * px), x = Math.round(p.x / px) * px, y = Math.round(p.y / px) * px;
      if (p.streak) {
        // A spark is a run of cells along its own flight, not a square: fast things read as streaks.
        const tx = -p.vx * 0.03, ty = -p.vy * 0.03, n = Math.max(1, Math.round(Math.hypot(tx, ty) / px));
        for (let k = 0; k <= n; k++) ctx.fillRect(Math.round((x + tx * k / n) / px) * px - s / 2, Math.round((y + ty * k / n) / px) * px - s / 2, s, s);
      } else ctx.fillRect(x - s / 2, y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
  }

  // The moment the pen gives, before the room needs looking at: a small comic-panel thought over
  // his head with her in it, in miniature — the same shape the sheep is built from — and gone in a
  // couple of seconds. It says what the three flat prologue screens already carry the weight of:
  // who this run is actually for, at the one moment control has just come back and there is
  // otherwise nothing on screen asking to be looked at.
  drawCageThought(game) {
    if (game.cageThought <= 0 || game.goat.dead) return;
    const dur = TUNING.cageThought, left = game.cageThought;
    const a = clamp(Math.min((dur - left) / 0.4, left / 0.7), 0, 1);
    if (a <= 0) return;
    const ctx = this.ctx, g = game.goat, bob = Math.sin(this.t * 3) * 1.5;
    ctx.save(); ctx.translate(g.x, g.y); ctx.scale(1, 1 / TILT);
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(239,230,208,0.9)'; ctx.strokeStyle = 'rgba(13,10,12,0.55)'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.arc(6, -28, 3.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(13, -37, 4.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // The panel itself is grass, not a dark thought-cloud: the same colour the healing patches use,
    // which is the one place the game already draws a meadow. A black bubble read as an ominous
    // thing rather than as a memory.
    const bx = 32, by = -58 + bob, bw = 42, bh = 29;
    ctx.beginPath(); ctx.ellipse(bx, by, bw / 2, bh / 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(239,230,208,0.94)'; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = PALETTE.grass; ctx.fillRect(bx - bw / 2, by, bw, bh / 2 + 2);
    ctx.fillStyle = PALETTE.grassHi;
    for (let i = -bw / 2; i < bw / 2; i += 3.4) {
      ctx.beginPath(); ctx.moveTo(bx + i, by + 1); ctx.lineTo(bx + i + 1, by - 4); ctx.lineTo(bx + i + 2, by + 1); ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(13,10,12,0.55)'; ctx.lineWidth = 1.5; ctx.stroke();
    // Her, not a stand-in shape: the same drawing `drawSheep` does for the real one, at a third the
    // size, so what he is picturing is recognisably her rather than a generic woolly blob.
    ctx.save(); ctx.translate(bx - 3, by + 3); ctx.scale(0.42, 0.42);
    ctx.strokeStyle = '#3a322f'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(3, -4); ctx.lineTo(4.5, -11); ctx.moveTo(-8, -4); ctx.lineTo(-9.5, -11); ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(3, 4); ctx.lineTo(5, 15); ctx.moveTo(-8, 4); ctx.lineTo(-10, 15); ctx.stroke();
    ctx.fillStyle = PALETTE.bone;
    for (let i = 0; i < 11; i++) {
      const ang = i / 11 * Math.PI * 2;
      ctx.beginPath(); ctx.arc(-3 + Math.cos(ang) * 12, 0.5 + Math.sin(ang) * 6.6, 5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.beginPath(); ctx.ellipse(-3, 0.5, 13.5, 7.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-17, 1, 3.6, 0, Math.PI * 2); ctx.fill();   // tail
    ctx.fillStyle = '#4a3f3a';
    ctx.beginPath(); ctx.moveTo(5, -1); ctx.quadraticCurveTo(13, 0, 17, 4.5); ctx.quadraticCurveTo(20, 7.5, 16.5, 10.5);
    ctx.quadraticCurveTo(11, 14, 6, 10); ctx.quadraticCurveTo(3.5, 7.5, 5, -1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = PALETTE.bone;
    ctx.beginPath(); ctx.arc(7.5, 0.5, 4.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(11.2, 1.6, 3.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4a3f3a'; ctx.beginPath(); ctx.ellipse(8.5, 11.5, 4.6, 2.3, 0.8, 0, Math.PI * 2); ctx.fill();   // ear
    ctx.fillStyle = '#fbf5e6'; ctx.beginPath(); ctx.ellipse(12.5, 5.6, 2.9, 2.3, 0.25, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PALETTE.ink; ctx.fillRect(11.4, 5, 3.4, 1.8);
    ctx.restore();
    ctx.restore(); ctx.globalAlpha = 1;
  }

  drawFloatTexts(game) {
    const ctx = this.ctx; ctx.save(); ctx.scale(1, 1 / TILT);
    ctx.font = `700 14px ${FONT_SC}`; ctx.textAlign = 'center';
    for (const f of game.floats) {
      // An animal's terms (`Beast.speak`) ride over its head and do not drift up and away: the goose
      // and the horse are off the moment they have spoken, and a line left hanging where they were
      // was a line nobody read. On a dark plate, so it reads over any floor.
      if (f.on) {
        const w = ctx.measureText(f.text).width + 10;
        const box = this.keepInView(f.on.x - w / 2, (f.on.y - 44 - (f.n - 1 - f.row) * 18) * TILT - 13, w, 17, f.on.x, f.on.y * TILT);
        const x = box.x + w / 2, y = box.y + 13;
        ctx.globalAlpha = Math.min(1, f.life * 2);
        ctx.fillStyle = 'rgba(13,10,12,0.62)'; ctx.fillRect(Math.round(box.x), Math.round(box.y), Math.round(w), 17);
        ctx.fillStyle = f.color; ctx.fillText(f.text, x, y);
        continue;
      }
      const w = ctx.measureText(f.text).width;
      const box = this.keepInView(f.x - w / 2, (f.y - (1.2 - f.life) * 24) * TILT - 12, w, 16, f.x, f.y * TILT);
      const x = box.x + w / 2, y = box.y + 12;
      ctx.globalAlpha = Math.min(1, f.life);
      ctx.fillStyle = 'rgba(13,10,12,0.55)'; ctx.fillText(f.text, x + 1.5, y + 1.5);
      ctx.fillStyle = f.color; ctx.fillText(f.text, x, y);
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

  // The plain half of a hit taken: every corner reddens, not just the one the arc points from, so a
  // hit landing is never a thing you have to notice — it is a thing you cannot miss.
  drawHurtVignette(game) {
    this.drawHeartbeat(game);
    if (!game.hurtVignette || game.hurtVignette.life <= 0) return;
    const V = TUNING.juice.hurtVignette, ctx = this.ctx, p = clamp(game.hurtVignette.life / V.life, 0, 1);
    const g = ctx.createRadialGradient(this.vcx, this.vcy, Math.min(this.vw, this.vh) * 0.3, this.vcx, this.vcy, Math.max(this.vw, this.vh) * 0.72);
    g.addColorStop(0, 'rgba(192,57,43,0)'); g.addColorStop(1, `rgba(192,57,43,${V.alpha * p})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, this.vw, this.vh);
  }

  // On the last heart the edges of the picture beat: two quick pulses and a rest, like a pulse
  // rather than a siren. It says "one more and you are gone" without a word or a number.
  heartbeat() {
    const B = TUNING.juice.heartbeat, ph = (this.t * B.bpm / 60) % 1;
    return Math.max(0, Math.sin(Math.min(1, ph / 0.14) * Math.PI)) + 0.6 * Math.max(0, Math.sin(clamp((ph - 0.2) / 0.14, 0, 1) * Math.PI));
  }
  drawHeartbeat(game) {
    const g = game.goat, B = TUNING.juice.heartbeat;
    if (!g || g.dead || game.state !== 'play' || g.hp > B.hp || g.maxHp <= B.hp) return;
    const ctx = this.ctx, a = B.alpha * this.heartbeat();
    if (a <= 0.005) return;
    const grad = ctx.createRadialGradient(this.vcx, this.vcy, Math.min(this.vw, this.vh) * 0.35, this.vcx, this.vcy, Math.max(this.vw, this.vh) * 0.7);
    grad.addColorStop(0, 'rgba(192,57,43,0)'); grad.addColorStop(1, `rgba(192,57,43,${a})`);
    ctx.fillStyle = grad; ctx.fillRect(0, 0, this.vw, this.vh);
  }

  drawUI(game) {
    const ctx = this.ctx; if (!game.world || game.state === 'intro') return;
    const g = game.goat, s = this.hs, top = 3 * s + (this.portrait ? 12 * s : 0);
    ctx.textAlign = 'left';
    // The level's name used to stand over the hearts. The card at the head of every level has
    // already said it, the floor of the first room says what the level is about, and a title in the
    // corner of the screen is a thing you read once and then look past for ten minutes.
    const HEART = HEART_GLYPH;
    const px = 2.6 * s;
    for (let i = 0; i < g.maxHp; i++) {
      const on = i < g.hp;
      // The last heart standing throbs with the vignette, from its own centre.
      const beat = on && g.hp <= TUNING.juice.heartbeat.hp && game.state === 'play' ? 1 + TUNING.juice.heartbeat.throb * this.heartbeat() : 1;
      const px = 2.6 * s * beat;
      const ox = 14 * s + i * 22 * s - (px - 2.6 * s) * HEART[0].length / 2, oy = top + 14 * s - (px - 2.6 * s) * HEART.length / 2;
      ctx.fillStyle = on ? PALETTE.blood : 'rgba(239,230,208,0.16)';
      for (let r = 0; r < HEART.length; r++) for (let q = 0; q < HEART[r].length; q++) {
        if (HEART[r][q] !== '#') continue;
        ctx.fillRect(Math.round(ox + q * px), Math.round(oy + r * px), Math.ceil(px), Math.ceil(px));
      }
      if (on) { ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(Math.round(ox + px), Math.round(oy + px), Math.ceil(px), Math.ceil(px)); }
    }
    // Everyone brought out to the stairs this run, one animal each, under the hearts: what an escort
    // is worth is a number buried in `mods`, and a row of the animals themselves is the way to see
    // that the run is carrying them.
    const saved = this.drawSaved(game, 14 * s, top + 46 * s, s);
    // Kills that landed on top of each other, while the window is still open.
    if (game.combo >= 2 && game.comboTimer > 0) {
      const a = Math.min(1, game.comboTimer / 0.6);
      ctx.font = `700 ${(15 + Math.min(11, game.combo * 2)) * s}px ${FONT_SC}`;
      ctx.fillStyle = `rgba(192,57,43,${a})`;
      ctx.fillText(`x${game.combo} IN A ROW`, 14 * s, top + (saved ? 80 : 58) * s);
    }

    // The rail sits in the bottom-right corner, where a glance down at a cooldown does not cost the
    // top of the room (playtest, 24 Sep 2026: "up there is awkward to watch"). On a touch screen the
    // bottom corners belong to the thumbs, so it stays at the top there.
    ctx.textAlign = 'right';
    const right = this.w - 20 * s;
    this.railLow = !game.touch.active && !this.portrait;
    const railTop = this.railLow ? this.h - 12 * s - 32 * s - 31 * s : top + 14 * s;
    const railEnd = this.drawSkills(game, railTop);   // the rail centres its own text, so re-anchor
    const below = this.railLow ? top + 4 * s : railEnd;
    // The talisman, right of the hearts: one slot, and the shop is the only thing that fills it.
    // After the rail, because the rail clears the hover it shares with this.
    // Centred on the row of hearts, a gap past the last one.
    this.drawArtifactChip(game, 14 * s + g.maxHp * 22 * s + 6 * s, top + 14 * s + HEART.length * 1.3 * s - 13 * s, 26 * s);
    ctx.textAlign = 'right';
    ctx.font = `700 ${11 * s}px ${FONT_SC}`; ctx.fillStyle = 'rgba(239,230,208,0.82)';
    ctx.fillText(`${game.kills} SACRIFICED`, right, below + 13 * s);
    // The clock is a setting and it is off by default. A number climbing in the corner of a game
    // about running turns the run into the number, and the run is timed whether it is shown or not:
    // the card at the end of a level says what it took, which is where a time is worth reading.
    let line = below + 13 * s;
    if (game.settings.timer) {
      ctx.font = `${13 * s}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.7)';
      ctx.fillText(`${game.timer.toFixed(1)}s`, right, line + 17 * s); line += 17 * s;
    }
    if (game.audio.muted) {
      ctx.font = `${11 * s}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.42)';
      ctx.fillText('muted', right, line + 15 * s); line += 15 * s;
    }
    ctx.textAlign = 'left';
    this.drawSkillNote(game);

    // The seed, bottom-left — out of the way of the corner everything else reports through — and
    // the build under it, so a report of something odd can name the version it happened on.
    // The run's seed is the one worth reading out: the level's own is derived from it, so this is
    // the whole run in five characters and `#seed=` takes it back. In base 36 because a player is
    // going to have to type or paste it, and nine digits is not something anybody passes on.
    ctx.textAlign = 'left'; ctx.font = `${11 * s}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.42)';
    ctx.fillText(`seed ${(game.runSeed >>> 0).toString(36)}`, 14 * s, this.h - 23 * s);
    ctx.font = `${9.5 * s}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.3)';
    ctx.fillText(`v${BUILD}`, 14 * s, this.h - 12 * s);
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

  // The skill rail, bottom right (top right on a touch screen): the four verbs, whether each one is available, how
  // long until it is, and what the souls have done to it. Boons show as pips on the button they bend
  // and as names under the score, so a run's build lives in one corner instead of a list of words.
  // Returns the y it finished at, because everything else in that column hangs off the bottom of it.
  drawSkills(game, top) {
    const ctx = this.ctx, s = this.hs, g = game.goat, fire = !!game.mods.breath;
    const R = TUNING.goat.roll;
    // Two of the four buttons start half-shut and the souls open them, so the rail has to say which
    // half you have got: GRAB carries THINGS until BY THE COLLAR, and BAAH is a CALL until it is a
    // blow or a fire. What is written under a chip is the key that throws it — the word for the verb
    // and what it does are on the note the pointer brings up, because a caption you have read a
    // hundred times is a caption that has stopped saying anything, and the key never stops.
    // One line each, and the line says what the button does — not what it means. It is read while a
    // room is walking toward you, so it is a caption and not a paragraph.
    // On THE TRIP every verb is on another key (`game.tripInput`), and the caption says which.
    const trip = !!(game.level && game.level.def.shroom);
    // Each note also carries `stat`, the verb in numbers as it stands now — every soul and talisman
    // already folded into `game.mods` — shown only while the dev drawer is open (`drawSkillNote`).
    // The `note` is the player's: a line or two, no numbers (25 Sep 2026).
    const M = game.mods, H = TUNING.goat.headbutt, G = TUNING.goat.grab, V = TUNING.goat.scream;
    const rows = [
      // Headbutt carries no cooldown ring — its recovery is the cost, per CLAUDE.md — but a cost
      // with nothing to see was a button that looked free between swings. `recover` drains the same
      // chip in the opposite direction, in fire rather than blood, since it is a vulnerability window
      // and not a lockout: the button is simply not what threw it a moment ago.
      { id: 'butt', name: 'BUTT', cap: trip ? 'RMB' : 'LMB', cd: 0, max: 0, ready: g.state === 'idle' && !g.holding,
        recover: g.state === 'recover' && g.recoverMax > 0 ? clamp(g.timer / g.recoverMax, 0, 1) : 0,
        note: (game.mods.bomb ? 'Ram him. If he dies against something right after, he explodes.'
          : game.mods.antlers ? 'Ram him further and harder. A wall, a fire or another man finishes him.'
          : 'Ram him. He flies: a wall, a fire or another man finishes him.')
          + (game.mods.splash ? ' It poisons whoever is behind you.' : ''),
        stat: `REACH ${sayN(H.reach * M.headbuttReach / TILE)} TILES · RECOVERY ${sayN(H.recovery * M.headbuttRecovery)}s`
          + (M.bomb ? ` · ${sayN(TUNING.goat.bomb.fuse)}s FUSE` : '') },
      { id: 'grab', name: g.holding ? 'THROW' : game.mods.grabMen ? 'GRAB' : 'THINGS', cap: trip ? 'LMB' : 'RMB', cd: g.grabCd,
        max: g.grabCdMax || TUNING.goat.grab.cooldown * game.mods.grabCooldown, ready: g.grabCd <= 0, half: !game.mods.grabMen,
        // COLD EYE's moment, draining the chip the way a headbutt's recovery drains its own.
        recover: M.coldEye && game.aimSlow > 0 ? clamp(game.aimSlow / M.coldEye.time, 0, 1) : 0,
        note: (game.mods.grabMen ? 'Carry a box, a blade, a shield or a man. Let go to throw.'
          : 'Carry a box, a blade or a shield. Let go to throw. Men are too heavy for now.')
          + (game.mods.brandHold ? ' Held a moment, it sets the floor it flies over alight.'
            : game.mods.venomHold ? ' Held a moment, it spreads poison wherever it goes.' : '')
          + (M.coldEye ? ' Picking up slows time.' : ''),
        stat: `REACH ${sayN(G.reach / TILE)} TILES · ${sayN(G.cooldown * M.grabCooldown)}s BEFORE THE NEXT`
          + (M.grabMen ? ` · A MAN: ${sayN(G.bite)}s TO LIFT, ${sayPct(G.speedMul)} SPEED, STOPS ${M.shieldBullets} BULLETS, WORKS LOOSE IN ~${sayN(M.holdTime)}s, ${sayN(G.cooldown * M.grabCooldown * G.manCd)}s BEFORE THE NEXT` : '')
          + (M.coldEye ? ` · TIME AT ${sayPct(M.coldEye.scale)} FOR ${sayN(M.coldEye.time)}s, EVERY ${sayN(M.coldEye.every)}s` : '') },
      { id: 'roll', name: M.leapfrog ? 'LEAP' : 'ROLL', cap: trip ? 'SPC' : 'E', cd: g.rollCd,
        max: g.rollCdMax || R.cooldown * game.mods.rollCooldown, ready: g.rollCd <= 0,
        note: (game.mods.rollStun > 0 ? 'Dodge. Everyone you tumble through is knocked out.'
          : M.leapfrog ? 'Dodge. Roll at a man to vault over him.'
          : 'Dodge. Nothing can hit you mid-roll.')
          + (game.mods.venomRoll ? ' You leave a puddle of poison.' : ''),
        stat: `${sayN(R.speed * R.duration * M.rollDistance / TILE)} TILES · UNTOUCHABLE ${sayN(R.invuln)}s · ${sayN(R.cooldown * M.rollCooldown)}s COOLDOWN`
          + (M.rollStun > 0 ? ` · DAZES ${sayN(M.rollStun)}s` : '')
          + (M.leapfrog ? ` · LEAP: A MAN UP TO ${sayN(M.leapfrog.reach)} TILES AHEAD, ${sayN(R.cooldown * M.rollCooldown * M.leapfrog.cooldownMul)}s COOLDOWN` : '') },
      { id: 'scream', name: game.mods.spit ? 'SPIT' : fire ? 'FIRE' : game.mods.screamStun ? 'BAAH' : 'CALL', cap: trip ? 'E' : 'SPC',
        cd: g.screamCd, max: game.mods.screamCooldown, ready: g.screamCd <= 0,
        half: !fire && !game.mods.screamStun && !game.mods.spit,
        note: game.mods.spit ? 'Spit a glob of poison where you point.'
          : fire ? 'Breathe fire the way you are running.'
          : game.mods.screamStun ? 'Stun everyone near you, even mid-swing.'
            : 'A shout. It breaks the swing of anyone on top of you and calls the rest to you.',
        stat: (M.spit ? `FLIES UP TO ${sayN(TUNING.status.spit.range)} TILES`
          : fire ? `CONE ${sayN(TUNING.goat.breath.range / TILE)} TILES`
          : M.screamStun ? `DAZES WITHIN ${sayN(M.screamRadius)} TILES FOR ${sayN(V.stun)}s`
          : `BREAKS SWINGS WITHIN ${sayN(V.balk)} TILES · CALLS MEN FROM ${sayN(M.screamCall)} TILES`)
          + ` · ${sayN(M.screamCooldown)}s COOLDOWN` },
    ];
    this.skillHover = null;
    const box = 32 * s, gap = 7 * s, right = this.w - 14 * s;
    const x0 = right - rows.length * box - (rows.length - 1) * gap;
    this.drawBodySouls(game, x0 - gap - box, top, box);
    rows.forEach((row, i) => {
      const x = x0 + i * (box + gap), y = top;
      const boons = game.boons.filter((b) => b.skill === row.id);
      const hot = boons.some((b) => b.active);
      ctx.fillStyle = 'rgba(13,10,12,0.5)'; ctx.fillRect(x, y, box, box);
      // The cooldown drains the chip from the top down: one glance says whether the button is there.
      if (row.cd > 0 && row.max > 0) {
        const p = clamp(row.cd / row.max, 0, 1);
        ctx.fillStyle = 'rgba(192,57,43,0.32)'; ctx.fillRect(x, y + box * (1 - p), box, box * p);
      } else if (row.recover > 0) {
        ctx.fillStyle = 'rgba(242,162,51,0.38)'; ctx.fillRect(x, y + box * (1 - row.recover), box, box * row.recover);
      }
      ctx.strokeStyle = row.cd > 0 ? 'rgba(192,57,43,0.8)' : row.recover > 0 ? 'rgba(242,162,51,0.85)'
        : hot ? 'rgba(242,162,51,0.85)' : row.ready ? 'rgba(239,230,208,0.42)' : 'rgba(239,230,208,0.16)';
      ctx.lineWidth = 1.6 * s; ctx.strokeRect(x, y, box, box);
      ctx.save(); ctx.translate(x + box / 2, y + box / 2);
      ctx.globalAlpha = row.locked ? 0.2 : row.half ? 0.62 : row.cd > 0 ? 0.4 : row.ready ? 1 : 0.55;
      this.skillIcon(row.id, box * 0.33, game, fire);
      ctx.globalAlpha = 1; ctx.restore();
      // one small glyph per soul hanging off this button, the same emoji that names it everywhere
      // else — a diamond pip only ever said "something is here", the emoji says what.
      boons.forEach((b, k) => {
        const px = x + 6 * s + k * 9 * s, py = y + box + 12 * s;
        if (b.emoji) { ctx.textAlign = 'center'; ctx.font = `${9 * s}px ${FONT}`; ctx.fillText(b.emoji, px, py); ctx.textAlign = 'left'; }
        else {
          ctx.fillStyle = b.active ? PALETTE.blood : PALETTE.ochre;
          ctx.beginPath(); ctx.moveTo(px, py - 8 * s); ctx.lineTo(px + 2.4 * s, py - 5.2 * s);
          ctx.lineTo(px, py - 2.4 * s); ctx.lineTo(px - 2.4 * s, py - 5.2 * s); ctx.closePath(); ctx.fill();
        }
      });
      ctx.textAlign = 'center';
      // What is written under the chip is the key, not the verb. The verb and what it does now are
      // on the note, which comes up when the pointer is on the chip.
      if (!game.touch.active) {
        const m = game.input.mouse;
        if (m.x >= x - 3 * s && m.x <= x + box + 3 * s && m.y >= y - 3 * s && m.y <= y + box + 31 * s) {
          this.skillHover = { row, x, y: y + box + 35 * s, above: this.railLow ? y - 8 * s : undefined, hot, boons };
        }
        ctx.font = `700 ${10 * s}px ${FONT_SC}`;
        ctx.fillStyle = hot ? PALETTE.fireHi : row.half ? 'rgba(239,230,208,0.38)'
          : row.cd > 0 ? 'rgba(192,57,43,0.95)' : 'rgba(239,230,208,0.55)';
        // A little clear of the box itself: flush under it read as part of the icon rather than a
        // caption of its own.
        ctx.fillText(row.cap, x + box / 2, y + box + 27 * s);
      }
    });
    // The gong, while it is still in him: a strip under the rail that drains with it, so four
    // cooldowns coming back faster than they should has something on screen saying why.
    let end = top + box + 31 * s;
    const gong = clamp(g.gong / TUNING.prop.bell.buff, 0, 1);
    if (gong > 0) {
      // Over the rail when it sits at the bottom of the screen, under it when it hangs from the top.
      const bw = right - x0, by = this.railLow ? top - 10 * s : end + 2 * s;
      ctx.fillStyle = 'rgba(13,10,12,0.5)'; ctx.fillRect(x0, by, bw, 4 * s);
      ctx.fillStyle = PALETTE.fireHi; ctx.fillRect(x0, by, bw * gong, 4 * s);
      ctx.textAlign = 'center'; ctx.font = `700 ${8.5 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.fireHi;
      ctx.fillText('THE GONG', x0 + bw / 2, this.railLow ? by - 5 * s : by + 14 * s);
      if (!this.railLow) end = by + 24 * s;
    }
    ctx.textAlign = 'left';
    return end;
  }

  // The souls that belong to no button — THE ORACLE, SURE HOOVES, THICK HIDE and the rest — in a
  // square of four just left of the rail, one cell a slot. An empty cell is drawn too: the square
  // says how many a build can hold (`BOON_SLOTS.general`) as well as what is in it. The pointer on
  // a cell brings up the same note a verb's chip does.
  drawBodySouls(game, x, y, box) {
    const ctx = this.ctx, s = this.hs, n = BOON_SLOTS.general, cols = 2, gap = 2 * s;
    const cell = (box - gap * (cols - 1)) / cols;
    const body = game.boons.filter((b) => !b.skill);
    const m = game.input.mouse;
    for (let i = 0; i < n; i++) {
      const cx = x + (i % cols) * (cell + gap), cy = y + Math.floor(i / cols) * (cell + gap), b = body[i];
      ctx.fillStyle = 'rgba(13,10,12,0.5)'; ctx.fillRect(cx, cy, cell, cell);
      ctx.strokeStyle = b ? 'rgba(185,135,58,0.85)' : 'rgba(239,230,208,0.14)'; ctx.lineWidth = 1.2 * s;
      ctx.strokeRect(cx, cy, cell, cell);
      if (!b) continue;
      ctx.textAlign = 'center'; ctx.font = `${cell * 0.76}px ${FONT}`; ctx.fillStyle = PALETTE.bone;
      ctx.fillText(b.emoji || '•', cx + cell / 2, cy + cell * 0.8);
      if (!game.touch.active && m.x >= cx && m.x <= cx + cell && m.y >= cy && m.y <= cy + cell)
        this.skillHover = { row: { name: b.name, note: b.desc, stat: this.boonStat(b) }, x: cx, y: y + box + 35 * s, above: this.railLow ? y - 8 * s : undefined, hot: false, boons: [] };
    }
    ctx.textAlign = 'left';
  }

  // What the chip under the pointer does, in words. The rail says which key throws a verb and the
  // note says what the verb is — so the sentence is there when it is wanted and out of the way the
  // rest of the time, which is the opposite of a caption that lives on the screen for ten minutes.
  // It carries the souls hanging off that button too, because that is where a run's build is felt.
  drawSkillNote(game) {
    const h = this.skillHover; if (!h) return;
    const ctx = this.ctx, s = this.hs;
    const w = Math.min(230 * s, this.w - 28 * s), right = this.w - 14 * s;
    // Under the rail by default; the talisman's chip, on the left, asks for it under itself.
    const x = h.left !== undefined ? Math.min(h.left, right - w) : right - w;
    ctx.font = `${11 * s}px ${FONT}`;
    const lines = this.wrap(h.row.note, w - 20 * s);
    // The numbers under the sentence (what the verb does now, every soul on it counted in) are the
    // dev drawer's, not the player's: shown only while it is open (25 Sep 2026, "no exact numbers").
    ctx.font = `700 ${9 * s}px ${FONT_SC}`;
    const stat = h.row.stat && game.dev && game.dev.open ? this.wrapFacts(h.row.stat, w - 20 * s) : [];
    const statH = stat.length ? 4 * s + stat.length * 12 * s : 0;
    const names = h.boons.map((b) => (b.active ? '◆ ' : '❖ ') + (b.emoji ? b.emoji + ' ' : '') + b.name);
    const bh = 26 * s + lines.length * 14 * s + statH + names.length * 13 * s;
    // A rail at the bottom of the screen opens its note upward, off the chip it is about.
    const y = h.above !== undefined ? Math.max(10 * s, h.above - bh) : Math.min(h.y, this.vh - bh - 10 * s);
    ctx.fillStyle = 'rgba(13,10,12,0.94)'; ctx.fillRect(x, y, w, bh);
    ctx.strokeStyle = h.hot ? 'rgba(242,162,51,0.7)' : 'rgba(239,230,208,0.22)'; ctx.lineWidth = 1.4 * s;
    ctx.strokeRect(x, y, w, bh);
    ctx.textAlign = 'left';
    ctx.font = `700 ${12 * s}px ${FONT_SC}`; ctx.fillStyle = h.row.half ? 'rgba(239,230,208,0.7)' : PALETTE.bone;
    ctx.fillText(h.row.name, x + 10 * s, y + 15 * s);
    ctx.font = `${11 * s}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.68)';
    lines.forEach((ln, i) => ctx.fillText(ln, x + 10 * s, y + 30 * s + i * 14 * s));
    if (stat.length) {
      ctx.font = `700 ${9 * s}px ${FONT_SC}`; ctx.fillStyle = 'rgba(242,162,51,0.85)';
      stat.forEach((ln, i) => ctx.fillText(ln, x + 10 * s, y + 32 * s + lines.length * 14 * s + i * 12 * s));
    }
    ctx.font = `700 ${10 * s}px ${FONT_SC}`;
    names.forEach((n, i) => {
      ctx.fillStyle = h.boons[i].active ? PALETTE.blood : PALETTE.ochre;
      ctx.fillText(n, x + 10 * s, y + 32 * s + lines.length * 14 * s + statH + i * 13 * s);
    });
    ctx.textAlign = 'right';
  }

  // The four verbs as icons, drawn around the origin with a half-size of h. Each one carries what the
  // souls have added to it, so the rail changes shape over a run instead of only gaining words.
  skillIcon(id, h, game, fire, mods) {
    // The verb as a pixel picture of the goat doing it, redrawn by the active soul on that button
    // (`js/skill-icons.js`); `mods` previews a build (a boon card). The strokes below are only the
    // fallback for a verb it does not draw.
    if (typeof SKILL_ICONS !== 'undefined' && SKILL_ICONS.draw(this.ctx, id, h, mods || game.mods, mods ? !!mods.breath : fire)) return;
    this.skillIconBase(id, h, game, fire);
    // The poison souls and the firebrand add a mark in the corner of the verb they ride on: a green
    // drop for poison, a yellow flame for fire. The spit draws its own glob instead.
    const m = game.mods, ctx = this.ctx;
    const venom = id === 'butt' ? m.splash : id === 'grab' ? m.venomHold > 0 : id === 'roll' ? m.venomRoll : false;
    if (venom) {
      ctx.fillStyle = PALETTE.venom;
      ctx.beginPath(); ctx.moveTo(h * 0.95, h * 0.35); ctx.quadraticCurveTo(h * 1.35, h * 0.85, h * 0.95, h * 1.05);
      ctx.quadraticCurveTo(h * 0.55, h * 0.85, h * 0.95, h * 0.35); ctx.fill();
    }
    if (id === 'grab' && m.brandHold > 0) {                           // Firebrand: a tongue of flame
      ctx.fillStyle = PALETTE.fireHi;
      ctx.beginPath(); ctx.moveTo(h * 0.95, h * 0.2); ctx.quadraticCurveTo(h * 1.3, h * 0.7, h * 0.95, h * 1.08);
      ctx.quadraticCurveTo(h * 0.6, h * 0.7, h * 0.95, h * 0.2); ctx.fill();
      ctx.fillStyle = PALETTE.fire;
      ctx.beginPath(); ctx.arc(h * 0.95, h * 0.82, h * 0.14, 0, Math.PI * 2); ctx.fill();
    }
    if (id === 'grab' && m.coldEye) {                                 // Cold Eye: a small hourglass up top
      ctx.fillStyle = PALETTE.bone;
      ctx.beginPath(); ctx.moveTo(h * 0.7, -h * 1.1); ctx.lineTo(h * 1.2, -h * 1.1); ctx.lineTo(h * 0.95, -h * 0.8); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(h * 0.7, -h * 0.5); ctx.lineTo(h * 1.2, -h * 0.5); ctx.lineTo(h * 0.95, -h * 0.8); ctx.closePath(); ctx.fill();
    }
  }
  skillIconBase(id, h, game, fire) {
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
      if (m.antlers) {                                                 // Long Horns: a tine off each beam
        ctx.lineWidth = h * 0.2;
        ctx.beginPath();
        for (const s of [-1, 1]) {
          ctx.moveTo(s * h * 0.78 * grow, -h * 0.3 * grow); ctx.lineTo(s * h * 0.3 * grow, -h * 0.72 * grow);
          ctx.moveTo(s * h * 0.72 * grow, -h * 0.9 * grow); ctx.lineTo(s * h * 0.35 * grow, -h * 1.25 * grow);
        }
        ctx.stroke();
      }
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
      // What is between the jaws. Out of the pen it is a box — the mouth takes objects and nothing
      // else — and BY THE COLLAR turns it into a head, which is the icon changing into the thing
      // the soul bought. A strong jaw puts teeth round it.
      if (!m.grabMen) {
        ctx.fillStyle = PALETTE.ochre;
        ctx.fillRect(-h * 0.3, -h * 0.3, h * 0.6, h * 0.6);
        ctx.strokeStyle = PALETTE.ink; ctx.lineWidth = h * 0.1;
        ctx.beginPath(); ctx.moveTo(-h * 0.3, 0); ctx.lineTo(h * 0.3, 0); ctx.stroke();
      } else {
        ctx.fillStyle = PALETTE.ochre;
        ctx.beginPath(); ctx.arc(0, 0, h * 0.3, 0, Math.PI * 2); ctx.fill();
      }
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
    if (id === 'roll' && m.leapfrog) {                                // Leapfrog: an arc over a standing man
      ctx.fillStyle = PALETTE.ochre; ctx.fillRect(-h * 0.14, h * 0.05, h * 0.28, h * 0.8);
      ctx.beginPath(); ctx.arc(0, -h * 0.12, h * 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = PALETTE.bone; ctx.lineWidth = h * 0.2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-h * 0.95, h * 0.8); ctx.quadraticCurveTo(0, -h * 1.5, h * 0.75, h * 0.55); ctx.stroke();
      ctx.fillStyle = PALETTE.bone;
      ctx.beginPath(); ctx.moveTo(h * 0.87, h * 0.95); ctx.lineTo(h * 0.47, h * 0.6); ctx.lineTo(h * 1.0, h * 0.4); ctx.closePath(); ctx.fill();
      if (m.rollCooldown < 1) { ctx.strokeStyle = PALETTE.ochre; ctx.lineWidth = h * 0.12; ctx.beginPath(); ctx.moveTo(-h * 1.05, h * 1.05); ctx.lineTo(h * 1.05, h * 1.05); ctx.stroke(); }
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
      if (m.rollStun > 0) {                                            // Dead Weight: stars off the turn
        ctx.fillStyle = PALETTE.fireHi;
        for (let k = 0; k < 3; k++) {
          const a = Math.PI * (0.15 + k * 0.62), rr = h * 1.15;
          ctx.beginPath(); ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr, h * 0.17, 0, Math.PI * 2); ctx.fill();
        }
      }
      return;
    }
    // scream: an open mouth throwing either sound or fire
    ctx.fillStyle = PALETTE.bone;
    ctx.beginPath(); ctx.ellipse(-h * 0.55, 0, h * 0.3, h * 0.42, 0, 0, Math.PI * 2); ctx.fill();
    if (m.spit) {                                                      // Venom Spit: a glob on its way
      ctx.fillStyle = PALETTE.venom; ctx.beginPath(); ctx.arc(h * 0.45, 0, h * 0.42, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = PALETTE.venomHi; ctx.beginPath(); ctx.arc(h * 0.33, -h * 0.13, h * 0.13, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(143,179,58,0.55)';
      ctx.beginPath(); ctx.arc(h * 1.05, -h * 0.35, h * 0.14, 0, Math.PI * 2); ctx.arc(h * 1.1, h * 0.3, h * 0.1, 0, Math.PI * 2); ctx.fill();
      return;
    }
    if (fire) {
      const gl = ctx.createLinearGradient(-h * 0.3, 0, h * 1.1, 0);
      gl.addColorStop(0, PALETTE.fireHi); gl.addColorStop(1, 'rgba(242,162,51,0.15)');
      ctx.fillStyle = gl;
      ctx.beginPath(); ctx.moveTo(-h * 0.3, -h * 0.18); ctx.lineTo(h * 1.05, -h * 0.8);
      ctx.lineTo(h * 1.05, h * 0.8); ctx.lineTo(-h * 0.3, h * 0.18); ctx.closePath(); ctx.fill();
      return;
    }
    // The rings the voice goes out in. Bone once it is a blow; thin and open while it is still only
    // a noise, because a call and a stun are the same button and have to be told apart at a glance.
    ctx.strokeStyle = m.screamStun ? PALETTE.bone : 'rgba(239,230,208,0.45)';
    ctx.lineWidth = m.screamStun ? h * 0.16 : h * 0.1;
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
    const g = game.goat, itemOn = t.itemReady;
    const labels = { butt: 'BUTT', grab: held ? 'THROW' : game.mods.grabMen ? 'GRAB' : 'THINGS',
      scream: fire ? 'FIRE' : game.mods.screamStun ? 'BAAH' : 'CALL', roll: 'ROLL',
      item: game.mods.boomerang ? 'THROW' : 'BLINK' };
    const ready = { butt: game.goat.state === 'idle' && !held, grab: held || game.goat.grabCd <= 0,
      scream: game.goat.screamCd <= 0, roll: game.goat.rollCd <= 0, item: g.itemCd <= 0 };
    // The fifth key is drawn last of the five and only once the shop has put something on it —
    // undrawn and untouchable before that, per `TouchUI.hitButton`.
    for (const k of itemOn ? ['butt', 'grab', 'scream', 'roll', 'item'] : ['butt', 'grab', 'scream', 'roll']) {
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
      const b = t.buttons.grab, p = 1 - game.goat.grabCd / (game.goat.grabCdMax || TUNING.goat.grab.cooldown * game.mods.grabCooldown);
      ctx.strokeStyle = PALETTE.ochre; ctx.lineWidth = 3 * this.s;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.rr, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); ctx.stroke();
    }
    if (itemOn && g.itemCd > 0 && g.itemCdMax > 0) {
      const b = t.buttons.item, p = 1 - g.itemCd / g.itemCdMax;
      ctx.strokeStyle = PALETTE.ochre; ctx.lineWidth = 3 * this.s;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.rr, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); ctx.stroke();
    }
  }

  // Break a line on its spaces to fit a width, in whatever font is set.
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
  // A numbers line (`BOONS[].stat`, a rail note's `stat`) is facts joined by ' · '. Break it between
  // facts where it can, so "COOLDOWN 1.35 → 0.61s" is never split across two lines, and only wrap
  // inside a fact that is wider than the line on its own.
  wrapFacts(text, maxW) {
    const ctx = this.ctx, out = [];
    let line = '';
    for (const fact of text.split(' · ')) {
      const test = line ? line + ' · ' + fact : fact;
      if (ctx.measureText(test).width <= maxW) { line = test; continue; }
      if (line) out.push(line);
      if (ctx.measureText(fact).width <= maxW) { line = fact; continue; }
      const parts = this.wrap(fact, maxW);
      line = parts.pop(); out.push(...parts);
    }
    if (line) out.push(line);
    return out;
  }
  // A soul's numbers, read off its params now (`BOONS[].stat`), or nothing for one that has none.
  boonStat(b) { return b.stat ? b.stat(b.params || {}, b) : ''; }

  // ---------- the first screen ----------
  // The name, a pair of horns round it, and the two ways in. Nothing is explained here: the opening
  // scene carries the story and the floor of level 1 carries the controls.
  drawTitle(game, dt) {
    // Cleared here so stale click zones do not linger once the title is gone — except while paused,
    // where `drawPause` (called earlier in the same `draw()`) may have just filled `menu.rects` with
    // its own settings panel and this would wipe it before a click ever got to read it.
    if (game.state !== 'title') { if (game.menu && game.state !== 'paused') game.menu.rects.length = 0; return; }
    const ctx = this.ctx, s = this.ts, w = this.w, h = this.h, cx = w / 2;
    const step = Math.min(dt || 0, 0.05);
    // The menu owns the whole canvas: it paints over the vignette and the empty thumb deck under it.
    ctx.fillStyle = '#0d0a0c'; ctx.fillRect(0, 0, w, h);
    const key = `${w}x${h}`;
    if (this.titleKey !== key) {
      // a fire somewhere below the frame, and the dark closing in at the edges
      const glow = ctx.createRadialGradient(cx, h * 1.02, 0, cx, h * 1.02, h * 0.95);
      glow.addColorStop(0, 'rgba(192,57,43,0.34)'); glow.addColorStop(0.45, 'rgba(122,31,24,0.13)'); glow.addColorStop(1, 'rgba(13,10,12,0)');
      const vig = ctx.createRadialGradient(cx, h * 0.44, Math.min(w, h) * 0.18, cx, h * 0.44, Math.max(w, h) * 0.7);
      vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,0.62)');
      this.titleGlow = glow; this.titleVig = vig; this.titleKey = key;
    }
    // the fire breathes a little
    ctx.globalAlpha = 0.86 + 0.14 * Math.sin(this.t * 1.7) * Math.sin(this.t * 0.9 + 1.3);
    ctx.fillStyle = this.titleGlow; ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
    this.glyphStamp(cx, h * 0.46, Math.min(w, h) * 0.56, CULT_GLYPHS[2], 0.05, PALETTE.blood);
    this.titleEmbers(step);
    ctx.fillStyle = this.titleVig; ctx.fillRect(0, 0, w, h);

    ctx.textAlign = 'center';
    const spaced = 'letterSpacing' in ctx;
    // The name and its horns are one shape: measure it, then shrink until it fits the screen it got.
    let size = clamp(Math.min(w * 0.155, h * 0.18), 26 * s, 88 * s);
    const measure = () => {
      if (spaced) ctx.letterSpacing = `${(size * 0.09).toFixed(1)}px`;
      ctx.font = `700 ${size}px ${FONT_SC}`;
      return ctx.measureText('DOOMED GOAT').width;
    };
    let tw = measure();
    if (tw + size * 2.2 > w * 0.92) { size *= (w * 0.92) / (tw + size * 2.2); tw = measure(); }
    const bw = clamp(Math.min(w * 0.76, 330 * s), 170 * s, 400 * s);
    // The rows are sized to the screen they were given. The block used to be measured as two rows
    // however many there were, so five of them ran off the bottom of the window and took SETTINGS
    // with them — and a row you cannot see is a row that does not work. They are smaller as well:
    // a menu of five is a list to read down, not five slabs stacked up the height of the screen.
    const n = MENU.length, lead = 40 * s, above = size * 1.2, below = size * 0.3;
    let bh = 46 * s, gap = 10 * s;
    const rowsH = () => n * bh + (n - 1) * gap;
    const room = h - (above + below + lead) - 20 * s;
    if (rowsH() > room) { const k = Math.max(0.45, room / rowsH()); bh *= k; gap *= k; }
    const block = above + below + lead + rowsH();
    const top = clamp(h * 0.47 - block / 2, 10 * s, Math.max(10 * s, h - block - 10 * s));
    const titleY = top + above, btnTop = top + above + below + lead;

    ctx.fillStyle = 'rgba(122,31,24,0.85)'; ctx.fillText('DOOMED GOAT', cx + size * 0.04, titleY + size * 0.05);
    ctx.fillStyle = PALETTE.bone; ctx.fillText('DOOMED GOAT', cx, titleY);
    if (spaced) ctx.letterSpacing = '0px';
    this.titleHorns(cx, titleY, tw / 2 + size * 0.16, size);

    game.menu.rects.length = 0;
    const run = game.save, def = run ? LEVELS[run.level] : null;
    const souls = run && run.boons ? run.boons.length : 0;
    const board = game.best || { levels: {}, run: 0 };
    const cleared = Object.keys(board.levels || {}).length;
    // One row per id in MENU, which is where the order of this screen lives.
    const rowFor = {
      new: { label: 'NEW GAME' },
      continue: { label: 'CONTINUE', locked: !run,
        note: def ? `(${def.sub.toLowerCase()} · ${def.name.toLowerCase()}${souls ? ` · ${souls} soul${souls === 1 ? '' : 's'}` : ''})` : '(nothing to come back to)' },
      levels: { label: 'LEVELS', note: `(any of the ${LEVELS.length} with its souls — straight, tripping or dark)` },
      // "best run 0" read as a run scored nothing; until one is finished the board is levels only
      best: { label: 'BEST', note: board.run ? `(best run ${board.run})` : cleared ? `(${cleared} level${cleared === 1 ? '' : 's'} on the board)` : '(nothing on the board yet)' },
      settings: { label: 'SETTINGS', note: `(clock ${game.settings.timer ? 'on' : 'off'} · sound ${game.settings.sound ? 'on' : 'off'} · easy ${game.settings.easy ? 'on' : 'off'})` },
    };
    const items = MENU.map((id) => rowFor[id]);
    for (let i = 0; i < items.length; i++) {
      const it = items[i], sel = game.menu.index === i;
      // a locked CONTINUE shakes its head when it is pressed
      const shake = sel && it.locked && game.menu.shake > 0 ? Math.sin(game.menu.shake * 70) * game.menu.shake * 26 * s : 0;
      const x = cx - bw / 2 + shake, y = btnTop + i * (bh + gap);
      game.menu.rects.push({ x: cx - bw / 2, y, w: bw, h: bh });
      ctx.globalAlpha = it.locked ? 0.42 : 1;
      ctx.fillStyle = sel ? '#4a2428' : '#190f16';
      ctx.fillRect(x, y, bw, bh);
      ctx.fillStyle = sel && !it.locked ? PALETTE.blood : PALETTE.ochre;
      ctx.fillRect(x, y, bw, 3 * s);
      ctx.strokeStyle = sel ? (it.locked ? 'rgba(239,230,208,0.3)' : PALETTE.blood) : 'rgba(239,230,208,0.2)';
      ctx.lineWidth = 2 * s; ctx.strokeRect(x, y, bw, bh);
      // the mark of what is chosen: a horn tip pointing into it, breathing
      if (sel) {
        const pulse = 0.55 + 0.45 * Math.sin(this.t * 3.4);
        ctx.globalAlpha *= pulse; ctx.fillStyle = it.locked ? PALETTE.bone : PALETTE.blood;
        ctx.beginPath(); ctx.moveTo(x + 13 * s, y + bh / 2 - 7 * s); ctx.lineTo(x + 22 * s, y + bh / 2); ctx.lineTo(x + 13 * s, y + bh / 2 + 7 * s);
        ctx.closePath(); ctx.fill();
        ctx.globalAlpha = it.locked ? 0.42 : 1;
      }
      // The text follows the row rather than the other way round, so a short window shrinks the
      // whole menu instead of overflowing every row in it.
      ctx.fillStyle = PALETTE.bone; ctx.font = `700 ${Math.min(19 * s, bh * 0.4)}px ${FONT_SC}`;
      if (spaced) ctx.letterSpacing = `${(2 * s).toFixed(1)}px`;
      ctx.fillText(it.label, cx, y + (it.note ? bh * 0.46 : bh * 0.62));
      if (spaced) ctx.letterSpacing = '0px';
      if (it.note) {
        ctx.font = `${Math.min(12.5 * s, bh * 0.26)}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.55)';
        ctx.fillText(this.clip(it.note, bw - 20 * s), cx, y + bh * 0.78);
      }
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = 'left';
    if (game.menu.panel === 'best') this.drawBoard(game, board);
    if (game.menu.panel === 'settings') this.drawSettings(game);
    if (game.menu.panel === 'levels') this.drawLevelPick(game, board);
  }

  // Escape mid-level. The world behind it is drawn exactly as `draw` always draws it — nothing
  // about pausing skips a line of that — so this is only ever the panel on top of it, dimmer than
  // the settings panel's own near-black because there is a frozen room worth still being able to
  // read behind it. Its own settings sub-panel is `drawSettings` itself: `game.menu.panel` is what
  // that function reads and it does not care whether the title or the pause overlay opened it.
  drawPause(game) {
    if (game.menu.panel === 'settings') { this.drawSettings(game); return; }
    const ctx = this.ctx, s = this.ts, w = this.w, h = this.h, cx = w / 2;
    ctx.fillStyle = 'rgba(9,7,9,0.72)'; ctx.fillRect(0, 0, w, h);
    const rows = PAUSE_MENU.length;
    const rowH = clamp(h * 0.1, 40 * s, 66 * s), gap = 10 * s;
    const bw = clamp(Math.min(w * 0.86, 420 * s), 200 * s, 480 * s), x0 = cx - bw / 2;
    const top = h / 2 - (rows * (rowH + gap)) / 2;
    ctx.textAlign = 'center'; ctx.fillStyle = PALETTE.ochre;
    ctx.font = `700 ${clamp(rowH * 0.46, 16 * s, 28 * s)}px ${FONT_SC}`;
    ctx.fillText('PAUSED', cx, top - 24 * s);
    game.pause.rects.length = 0;
    for (let i = 0; i < rows; i++) {
      const y = top + i * (rowH + gap), sel = game.pause.index === i;
      game.pause.rects.push({ x: x0, y, w: bw, h: rowH });
      ctx.fillStyle = sel ? '#4a2428' : '#190f16'; ctx.fillRect(x0, y, bw, rowH);
      ctx.strokeStyle = sel ? PALETTE.blood : 'rgba(239,230,208,0.2)'; ctx.lineWidth = 2 * s;
      ctx.strokeRect(x0, y, bw, rowH);
      ctx.fillStyle = PALETTE.bone; ctx.font = `700 ${16 * s}px ${FONT_SC}`;
      ctx.fillText(PAUSE_MENU[i].name, cx, y + rowH * 0.62);
    }
    ctx.textAlign = 'left';
  }

  // The switches. It covers the menu the way the board does, but it does not leave when it is
  // touched: a click on a row throws that row, and only the last row is the way out. `menu.rects` is
  // refilled with the rows while it is up, so `menuAt` and `menuPick` need to know nothing about it.
  drawSettings(game) {
    const ctx = this.ctx, s = this.ts, w = this.w, h = this.h, cx = w / 2;
    ctx.fillStyle = 'rgba(9,7,9,0.985)'; ctx.fillRect(0, 0, w, h);
    const rows = SETTINGS.length + 1;
    const rowH = clamp(h * 0.1, 40 * s, 66 * s), gap = 10 * s;
    const bw = clamp(Math.min(w * 0.86, 460 * s), 200 * s, 520 * s), x0 = cx - bw / 2;
    const top = h / 2 - (rows * (rowH + gap)) / 2;
    ctx.textAlign = 'center'; ctx.fillStyle = PALETTE.ochre;
    ctx.font = `700 ${clamp(rowH * 0.42, 15 * s, 26 * s)}px ${FONT_SC}`;
    ctx.fillText('SETTINGS', cx, top - 22 * s);
    game.menu.rects.length = 0;
    for (let i = 0; i < rows; i++) {
      const y = top + i * (rowH + gap), last = i === SETTINGS.length;
      const sel = game.menu.sub === i;
      game.menu.rects.push({ x: x0, y, w: bw, h: rowH });
      ctx.fillStyle = sel ? '#4a2428' : '#190f16'; ctx.fillRect(x0, y, bw, rowH);
      ctx.strokeStyle = sel ? PALETTE.blood : 'rgba(239,230,208,0.2)'; ctx.lineWidth = 2 * s;
      ctx.strokeRect(x0, y, bw, rowH);
      if (last) {
        ctx.fillStyle = PALETTE.bone; ctx.font = `700 ${16 * s}px ${FONT_SC}`;
        ctx.fillText('BACK', cx, y + rowH * 0.62);
        continue;
      }
      const it = SETTINGS[i], on = !!game.settings[it.key];
      ctx.textAlign = 'left';
      ctx.fillStyle = PALETTE.bone; ctx.font = `700 ${15 * s}px ${FONT_SC}`;
      ctx.fillText(it.name, x0 + 16 * s, y + rowH * 0.42);
      ctx.font = `${11.5 * s}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.5)';
      ctx.fillText(this.clip(it.note, bw - 110 * s), x0 + 16 * s, y + rowH * 0.74);
      if (it.type === 'slider') {
        // A bar with a lit fill up to the value and a knob at the edge of it — the value itself
        // never printed as a number, the same way nothing else in this panel prints one.
        const v = clamp(game.settings[it.key] ?? 0.5, 0, 1);
        const sw = 92 * s, sh = 8 * s, sx = x0 + bw - sw - 16 * s, sy = y + rowH / 2 - sh / 2;
        game.menu.rects[i].sliderX = sx; game.menu.rects[i].sliderW = sw;
        ctx.fillStyle = 'rgba(239,230,208,0.12)'; ctx.fillRect(sx, sy, sw, sh);
        ctx.fillStyle = 'rgba(242,162,51,0.55)'; ctx.fillRect(sx, sy, sw * v, sh);
        ctx.strokeStyle = 'rgba(239,230,208,0.28)'; ctx.lineWidth = 1.4 * s;
        ctx.strokeRect(sx, sy, sw, sh);
        const kr = 6 * s;
        ctx.fillStyle = PALETTE.fireHi; ctx.beginPath(); ctx.arc(sx + sw * v, sy + sh / 2, kr, 0, Math.PI * 2); ctx.fill();
      } else {
        // the switch itself: a bar with a block in one end of it, lit when it is thrown
        const tw = 46 * s, th = 20 * s, tx = x0 + bw - tw - 16 * s, ty = y + rowH / 2 - th / 2;
        ctx.fillStyle = on ? 'rgba(242,162,51,0.45)' : 'rgba(239,230,208,0.1)';
        ctx.fillRect(tx, ty, tw, th);
        ctx.strokeStyle = on ? PALETTE.ochre : 'rgba(239,230,208,0.28)'; ctx.lineWidth = 1.6 * s;
        ctx.strokeRect(tx, ty, tw, th);
        ctx.fillStyle = on ? PALETTE.fireHi : 'rgba(239,230,208,0.4)';
        ctx.fillRect(on ? tx + tw - th + 2 * s : tx + 2 * s, ty + 2 * s, th - 4 * s, th - 4 * s);
      }
      ctx.textAlign = 'center';
    }
    ctx.textAlign = 'left';
  }

  // The level sheet. Every floor of the game, its canon and what it is about, and a row is a way
  // straight onto it — with the souls a run would have banked getting there, dealt at random. It is
  // built like the switches: while it is up it owns `menu.rects` entirely, and only BACK leaves.
  drawLevelPick(game, board) {
    const ctx = this.ctx, s = this.ts, w = this.w, h = this.h, cx = w / 2;
    ctx.fillStyle = 'rgba(9,7,9,0.985)'; ctx.fillRect(0, 0, w, h);
    // Two rows more than there are floors: the mushroom toggle and THE DARK at the top, then every
    // level, then BACK.
    const rows = LEVELS.length + LEVEL_TOGGLES + 1, gap = 5 * s;
    // never taller than leaves the title its line above the first row
    const rowH = Math.max(24 * s, Math.min(clamp(h * 0.078, 28 * s, 50 * s), (h - 70 * s) / rows - gap));
    const bw = clamp(Math.min(w * 0.86, 460 * s), 200 * s, 520 * s), x0 = cx - bw / 2;
    const top = h / 2 - (rows * (rowH + gap)) / 2;
    ctx.textAlign = 'center'; ctx.fillStyle = PALETTE.ochre;
    ctx.font = `700 ${clamp(rowH * 0.42, 15 * s, 24 * s)}px ${FONT_SC}`;
    ctx.fillText('LEVELS', cx, top - 16 * s);
    game.menu.rects.length = 0;
    let souls = 0;
    const trip = !!game.menu.tripPick;
    for (let i = 0; i < rows; i++) {
      const y = top + i * (rowH + gap), toggle = i < LEVEL_TOGGLES, last = i === rows - 1, sel = game.menu.sub === i;
      game.menu.rects.push({ x: x0, y, w: bw, h: rowH });
      ctx.fillStyle = sel ? '#4a2428' : '#190f16'; ctx.fillRect(x0, y, bw, rowH);
      ctx.strokeStyle = sel ? PALETTE.blood : 'rgba(239,230,208,0.2)'; ctx.lineWidth = 2 * s;
      ctx.strokeRect(x0, y, bw, rowH);
      if (last) {
        ctx.textAlign = 'center'; ctx.fillStyle = PALETTE.bone; ctx.font = `700 ${16 * s}px ${FONT_SC}`;
        ctx.fillText('BACK', cx, y + rowH * 0.62);
        continue;
      }
      if (toggle && i === 1) {
        // THE DARK, a floor of its own: the fork's other flight, played in its place in the run.
        const D = DARK_LEVEL, rec = (board.levels || {}).dark;
        let carry = 0; for (let k = 0; k < D.darkOf; k++) carry += LEVELS[k].souls || 0;
        ctx.textAlign = 'left'; ctx.fillStyle = PALETTE.bone; ctx.font = `700 ${15 * s}px ${FONT_SC}`;
        ctx.fillText(`${D.darkOf + 1}. \u{1F56F} ${D.name}`, x0 + 16 * s, y + rowH * 0.42);
        ctx.font = `${11 * s}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.5)';
        ctx.fillText(this.clip(`${D.canon.name.toLowerCase()} · the fork's other flight · ${D.rooms} rooms · ${carry} souls`, bw - 110 * s), x0 + 16 * s, y + rowH * 0.74);
        ctx.textAlign = 'right'; ctx.fillStyle = rec ? PALETTE.fireHi : 'rgba(239,230,208,0.25)';
        ctx.font = `${12 * s}px ${FONT}`;
        ctx.fillText(rec ? String(rec.score) : '-', x0 + bw - 16 * s, y + rowH * 0.58);
        ctx.textAlign = 'left';
        continue;
      }
      if (toggle) {
        // The one switch (`Game.menuPick`): THE TRIP, on whichever floor below is picked.
        const on = trip;
        ctx.textAlign = 'left'; ctx.fillStyle = on ? PALETTE.fireHi : PALETTE.bone;
        ctx.font = `700 ${15 * s}px ${FONT_SC}`;
        ctx.fillText('\u{1F344} THE TRIP', x0 + 16 * s, y + rowH * 0.42);
        ctx.font = `${11 * s}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.5)';
        ctx.fillText(this.clip('every key the other way round, on whichever floor below', bw - 90 * s), x0 + 16 * s, y + rowH * 0.74);
        ctx.textAlign = 'right'; ctx.fillStyle = on ? PALETTE.fireHi : 'rgba(239,230,208,0.4)';
        ctx.font = `700 ${13 * s}px ${FONT_SC}`;
        ctx.fillText(on ? 'ON' : 'OFF', x0 + bw - 16 * s, y + rowH * 0.58);
        ctx.textAlign = 'left';
        continue;
      }
      const li = i - LEVEL_TOGGLES, def = LEVELS[li], rec = (board.levels || {})[li], asTrip = trip && li > 0;
      ctx.textAlign = 'left';
      ctx.fillStyle = PALETTE.bone; ctx.font = `700 ${15 * s}px ${FONT_SC}`;
      ctx.fillText(`${li + 1}. ${asTrip ? 'THE TRIP' : def.name}`, x0 + 16 * s, y + rowH * 0.42);
      ctx.font = `${11 * s}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.5)';
      const carry = souls ? `${souls} soul${souls === 1 ? '' : 's'}` : 'nothing but a goat';
      const sub = asTrip ? `in place of ${def.name.toLowerCase()} · ${def.rooms} rooms · ${carry}`
        : `${def.canon ? def.canon.name.toLowerCase() : 'the compound'} · ${def.rooms} rooms · ${carry}${li === TUNING.dark.fork.at ? ' · ends on the fork' : ''}`;
      ctx.fillText(this.clip(sub, bw - 110 * s), x0 + 16 * s, y + rowH * 0.74);
      ctx.textAlign = 'right';
      ctx.fillStyle = rec ? PALETTE.fireHi : 'rgba(239,230,208,0.25)';
      ctx.font = `${12 * s}px ${FONT}`;
      ctx.fillText(rec ? String(rec.score) : '-', x0 + bw - 16 * s, y + rowH * 0.58);
      souls += def.souls || 0;
    }
    ctx.textAlign = 'left';
  }

  // The record sheet: what every level has been cleared in, and what a whole run has been worth.
  // It covers the menu rather than replacing the screen, and anything at all puts it away.
  drawBoard(game, board) {
    const ctx = this.ctx, s = this.ts, w = this.w, h = this.h, cx = w / 2;
    ctx.fillStyle = 'rgba(9,7,9,0.985)'; ctx.fillRect(0, 0, w, h);
    const rowH = clamp(h * 0.072, 20 * s, 40 * s);
    const top = h / 2 - (LEVELS.length + 3) * rowH / 2;
    const bw = clamp(Math.min(w * 0.86, 460 * s), 200 * s, 520 * s), x0 = cx - bw / 2;
    ctx.textAlign = 'center'; ctx.fillStyle = PALETTE.bone;
    ctx.font = `700 ${clamp(rowH * 0.82, 16 * s, 30 * s)}px ${FONT_SC}`;
    ctx.fillText('BEST', cx, top);
    ctx.font = `${clamp(rowH * 0.44, 10 * s, 15 * s)}px ${FONT}`;
    ctx.fillStyle = 'rgba(239,230,208,0.5)';
    ctx.textAlign = 'left'; ctx.fillText('level', x0, top + rowH * 0.9);
    ctx.textAlign = 'right'; ctx.fillText('score', x0 + bw * 0.74, top + rowH * 0.9);
    ctx.fillText('time', x0 + bw, top + rowH * 0.9);
    for (let i = 0; i < LEVELS.length; i++) {
      const y = top + rowH * (1.6 + i), rec = (board.levels || {})[i];
      ctx.font = `${clamp(rowH * 0.5, 11 * s, 17 * s)}px ${FONT}`;
      ctx.globalAlpha = rec ? 1 : 0.34;
      ctx.textAlign = 'left'; ctx.fillStyle = PALETTE.bone;
      ctx.fillText(LEVELS[i].name.toLowerCase(), x0, y);
      ctx.textAlign = 'right';
      ctx.fillStyle = rec ? PALETTE.fireHi : PALETTE.bone;
      ctx.fillText(rec ? String(rec.score) : '-', x0 + bw * 0.74, y);
      ctx.fillStyle = PALETTE.bone;
      ctx.fillText(rec ? `${rec.time.toFixed(1)}s` : '-', x0 + bw, y);
      ctx.globalAlpha = 1;
    }
    const by = top + rowH * (1.9 + LEVELS.length);
    ctx.strokeStyle = 'rgba(239,230,208,0.18)'; ctx.lineWidth = 1 * s;
    ctx.beginPath(); ctx.moveTo(x0, by - rowH * 0.5); ctx.lineTo(x0 + bw, by - rowH * 0.5); ctx.stroke();
    ctx.textAlign = 'left'; ctx.fillStyle = PALETTE.bone;
    ctx.font = `700 ${clamp(rowH * 0.52, 11 * s, 18 * s)}px ${FONT_SC}`;
    ctx.fillText('WHOLE RUN', x0, by + rowH * 0.15);
    ctx.textAlign = 'right'; ctx.fillStyle = board.run ? PALETTE.fireHi : PALETTE.bone;
    ctx.fillText(board.run ? String(board.run) : '-', x0 + bw * 0.74, by + rowH * 0.15);
    ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(239,230,208,0.45)';
    ctx.font = `${clamp(rowH * 0.42, 10 * s, 14 * s)}px ${FONT}`;
    ctx.fillText(`${game.tapWord.toLowerCase()} to go back`, cx, by + rowH * 1.5);
    ctx.textAlign = 'left';
    // Nothing behind the sheet is clickable while it is up.
    game.menu.rects.length = 0;
    game.menu.rects.push({ x: 0, y: 0, w, h });
  }

  // A pair of horns rising out of the name, drawn with the same tapered curve the goat wears.
  titleHorns(cx, y, out, size) {
    const bone = 'rgba(239,230,208,0.72)', ridge = 'rgba(26,16,22,0.4)';
    for (const d of [-1, 1]) {
      const bx = cx + d * out;
      this.horn(bx, y + size * 0.02, bx + d * size * 0.2, y - size * 0.74, bx + d * size * 0.78, y - size * 0.94, size * 0.19, bone, ridge);
    }
  }

  // The cult's sign, stamped huge and nearly out behind the name. Whole pixels, like the floor ones.
  glyphStamp(cx, cy, size, glyph, alpha, color) {
    const ctx = this.ctx, n = glyph.length, cell = size / n;
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < glyph[r].length; c++) {
        if (glyph[r][c] !== '#') continue;
        ctx.fillRect(Math.round(cx - size / 2 + c * cell), Math.round(cy - size / 2 + r * cell), Math.ceil(cell), Math.ceil(cell));
      }
    }
    ctx.restore();
  }

  // Embers off that fire, drifting up through the name.
  titleEmbers(dt) {
    const ctx = this.ctx, s = this.ts, w = this.w, h = this.h;
    if (!this.embers) this.embers = [];
    while (this.embers.length < 36) this.embers.push({ x: Math.random() * w, y: h * Math.random(), v: (12 + Math.random() * 30) * s, r: (1 + Math.random() * 1.8) * s, p: Math.random() * 6.28, a: 0.12 + Math.random() * 0.42 });
    for (const e of this.embers) {
      e.y -= e.v * dt; e.p += dt * 1.7;
      if (e.y < -8 * s) { e.y = h + 8 * s; e.x = Math.random() * w; }
      ctx.globalAlpha = e.a * (0.45 + 0.55 * Math.sin(e.p));
      ctx.fillStyle = e.a > 0.4 ? PALETTE.fireHi : PALETTE.fire;
      ctx.fillRect(e.x + Math.sin(e.p) * 7 * s, e.y, e.r, e.r);
    }
    ctx.globalAlpha = 1;
  }

  drawCard(game) {
    const card = game.card; if (!card) return;
    if (card.painting) { Painting.draw(this, game, card); return; }
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
    // The death card's killer stands on a plate of his own over the KILLED BY line (`card.killer`).
    const plate = card.killer && card.killer !== 'fall' ? Math.round(Math.min(96 * s, this.h * 0.2)) : 0, plateGap = plate ? 12 * s : 0;
    let total = plate + plateGap; for (let i = 0; i < rows.length; i++) total += lh(i);
    let y = this.h / 2 - total / 2, placed = false;
    if (card.alpha !== undefined) ctx.globalAlpha = clamp(card.alpha, 0, 1);
    rows.forEach((r, i) => {
      if (plate && r.last && !placed) { placed = true; this.drawKiller(card.killer, this.w / 2, y + plateGap * 0.6, plate); y += plate + plateGap; ctx.textAlign = 'center'; }
      ctx.font = r.small ? `${small}px ${FONT}` : `700 ${size}px ${FONT}`;
      ctx.fillStyle = r.small ? (r.last ? (card.color || PALETTE.bone) : 'rgba(239,230,208,0.62)') : (card.color || PALETTE.bone);
      y += lh(i);
      ctx.fillText(r.text, this.w / 2, y - lh(i) * 0.28);
    });
    // The run code sits at the foot of the card, quiet, for whoever is asked to paste it.
    if (card.code) {
      ctx.font = `${11 * s}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.42)';
      ctx.fillText(`RUN CODE  ${card.code}`, this.w / 2, this.h - 18 * s);
    }
    // How to leave it, as a button (`card.go`), once a press would be taken: under the words, and
    // never down on the run code.
    if (card.go && (game.state === 'win' || game.stateTimer <= 0)) {
      const a = game.state === 'win' ? 1 : clamp(-game.stateTimer / 0.4, 0, 1);
      ctx.save(); ctx.globalAlpha *= a;
      this.goButton(game, card.go, this.w / 2, Math.min(y + 18 * s, this.h - (card.code ? 36 : 18) * s - 38 * s));
      ctx.restore();
    }
    ctx.globalAlpha = 1; ctx.textAlign = 'left';
  }

  // The one primary button of a card: the way on, framed and lit, with the key that also presses it.
  // Anywhere on the card takes the press (only SAVE on the clear card is its own), so the frame is the
  // thing to aim at rather than the only place that works. Returns its rect.
  goButton(game, label, cx, top) {
    const ctx = this.ctx, s = this.ts, touch = game.touch && game.touch.active;
    const bh = 36 * s, lf = `700 ${18 * s}px ${FONT_SC}`, kf = `700 ${10 * s}px ${FONT_SC}`;
    ctx.font = lf; const lw = ctx.measureText(label).width;
    ctx.font = kf; const key = touch ? '' : 'SPACE', kw = key ? ctx.measureText(key).width + 12 * s : 0;
    const tri = 9 * s, bw = Math.round(lw + tri + 12 * s + (kw ? kw + 12 * s : 0) + 40 * s), bx = Math.round(cx - bw / 2), by = Math.round(top);
    const over = game.input.mouse && !touch && game.input.mouse.x >= bx && game.input.mouse.x <= bx + bw && game.input.mouse.y >= by && game.input.mouse.y <= by + bh;
    const pulse = 0.5 + 0.5 * Math.sin(this.t * 4);
    ctx.save(); ctx.textAlign = 'center';
    ctx.fillStyle = over ? 'rgba(242,162,51,0.34)' : `rgba(242,162,51,${0.16 + 0.06 * pulse})`; ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = PALETTE.fireHi; ctx.lineWidth = (over ? 3 : 2) * s; ctx.strokeRect(bx, by, bw, bh);
    let x = bx + 20 * s;
    ctx.font = lf; ctx.fillStyle = over ? '#fff6e0' : PALETTE.bone; ctx.textAlign = 'left';
    ctx.fillText(label, x, by + bh / 2 + 6.5 * s); x += lw + 12 * s;
    // the arrow, a stepped wedge of cells rather than a font glyph the face may not carry
    const c = Math.max(1, Math.round(1.5 * s)), cy = by + bh / 2;
    ctx.fillStyle = PALETTE.fireHi;
    for (let k = 0; k < 6; k++) ctx.fillRect(Math.round(x + k * c), Math.round(cy - (6 - k) * c), c, (6 - k) * 2 * c);
    x += tri + 12 * s;
    if (key) {
      const kh = 18 * s, ky = by + (bh - kh) / 2;
      ctx.strokeStyle = 'rgba(239,230,208,0.5)'; ctx.lineWidth = Math.max(1, s); ctx.strokeRect(Math.round(x) + 0.5, Math.round(ky) + 0.5, Math.round(kw), Math.round(kh));
      ctx.font = kf; ctx.fillStyle = 'rgba(239,230,208,0.75)'; ctx.textAlign = 'center';
      ctx.fillText(key, x + kw / 2, ky + kh / 2 + 3.5 * s);
    }
    ctx.restore();
    return { x: bx, y: by, w: bw, h: bh };
  }

  // What took the last heart, on a dark plate `size` square with its top centre at (cx, top): a man
  // is his own sprite off the atlas facing the camera, the room is the prop or flame that did it.
  // Nothing here may throw into the card, so a picture it cannot find is simply not drawn.
  drawKiller(by, cx, top, size) {
    const ctx = this.ctx, s = this.ts, x0 = Math.round(cx - size / 2), y0 = Math.round(top);
    ctx.save();
    try {
      ctx.fillStyle = 'rgba(13,10,12,0.88)'; ctx.fillRect(x0, y0, size, size);
      ctx.strokeStyle = PALETTE.blood; ctx.lineWidth = 2 * s; ctx.strokeRect(x0, y0, size, size);
      ctx.beginPath(); ctx.rect(x0 + 2, y0 + 2, size - 4, size - 4); ctx.clip();
      ctx.imageSmoothingEnabled = false;
      const foot = y0 + size * 0.88, room = size * 0.78;
      // a grid sprite off js/prop-pixels.js, whole cells, stood on the plate's floor
      const grid = (name) => {
        const g = typeof PROP_PIXELS !== 'undefined' && PROP_PIXELS.sprites && PROP_PIXELS.sprites[name]; if (!g) return;
        const c = Math.max(1, Math.floor(Math.min(room / g.w, room / g.h))), gx = Math.round(cx - g.w * c / 2), gy = Math.round(foot - g.h * c);
        for (let j = 0; j < g.h; j++) for (let i = 0; i < g.w; i++) { const v = g.get(i, j); if (v) { ctx.fillStyle = v; ctx.fillRect(gx + i * c, gy + j * c, c, c); } }
      };
      const man = (e) => {
        const key = this.painted.characterKey(e), id = key && PIXEL_ART.unit(key); if (!id) return;
        const k = room / (PIXEL_EXTENT[id] || 40);
        ctx.translate(cx, foot); ctx.scale(k, k);
        this.painted.character(this, { facing: Math.PI / 4, state: 'idle', x: 0, vx: 0, vy: 0 }, key, 42);
      };
      if (by && typeof by === 'object') man(by);
      else if (by === 'fire' || by === 'witchfire') {
        // a small flame in big cells, so it reads as the game's own fire and not a speck of it
        const set = CombatFX.flameFrames(8, by === 'witchfire'), n = set.frames.length, f = set.frames[Math.floor(this.t * TUNING.effects.fireFps) % n];
        const c = Math.max(1, Math.floor(Math.min(room / set.W, room / set.H)));
        ctx.drawImage(f, Math.round(cx - set.W * c / 2), Math.round(foot - set.H * c), set.W * c, set.H * c);
      } else if (by === 'rifle') man({ kind: 'hunter' });
      else grid({ bomb: 'bomb', mill: 'mill-hub', spike: 'spikes-up', spire: 'spire' }[by]);
    } catch (err) { /* no picture rather than no frame */ }
    ctx.restore();
  }
}
