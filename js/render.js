// Rendering: responsive canvas, tiles, decals, firelight, props, enemies, goat, effects, HUD,
// on-screen touch controls and title cards. Level one uses the cached AltarArt environment.
const FONT = "'Alegreya', Georgia, 'Times New Roman', serif";
const FONT_SC = "'Alegreya SC', 'Alegreya', Georgia, serif";

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
    ['WASD, TO MOVE'],
    ['RIGHT CLICK - GRAB', 'RELEASE - THROW'],
    ['LEFT CLICK - HEADBUTT'],
    ['E, ROLL', 'OUT OF THE WAY', 'CLOSE UP IT BREAKS THEIR SWING'],
  ],
  touch: [
    ['LEFT THUMB, TO MOVE'],
    ['GRAB, HOLD TO CARRY', 'RELEASE, THROW'],
    ['BUTT - HEADBUTT'],
    ['ROLL, OUT OF THE WAY', 'CLOSE UP IT BREAKS THEIR SWING'],
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

  // The scale of the top band — hearts, rail, count, clock. It is the UI scale times one number in
  // `TUNING.hud`, so the corner of the screen can be made to read without touching the cards, the
  // menu or the floor text, all of which are sized for their own jobs.
  get hs() { return this.ts * TUNING.hud.scale; }

  draw(game, dt) {
    this.t += dt;
    this.altar = game.level && game.levelIndex === 0 ? this.altarArt : null;
    if (this.c.clientWidth && (Math.abs(this.c.clientWidth - this.cssW) > 1 || Math.abs(this.c.clientHeight - this.cssH) > 1)) this.resize();
    const ctx = this.ctx, w = this.w, h = this.h;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = game.level ? game.level.def.fog : '#0d0a0c';
    ctx.fillRect(0, 0, w, h);
    if (game.world) {
      const cam = game.cam;
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, this.vw, this.vh); ctx.clip();
      this.worldTransform(game);
      this.drawTiles(game, cam);
      this.drawDecals(game, cam);
      game.fx.drawGround(this,game);
      this.drawPits(game, cam);
      this.drawFallers(game);
      this.drawHints(game);
      this.drawFire(game, cam);
      this.drawLight(game, cam);
      this.drawDust(game, cam, dt);
      this.drawUnseen(game);            // ground, fire and firelight above it; everything that stands on it below
      this.drawRunes(game);
      this.drawSouls(game);
      const lit = (o) => !game.hidden(o.x, o.y);
      // Nothing else in the game Y-sorts against the goat — draw order is otherwise fixed, which is
      // fine for a wall-hugging crate or a bowl of coals. A cage bar always needed the exception; a
      // sword or shield lying on the floor is the same problem at the same scale, and drawing it
      // flat underneath him whenever he had walked past it read as the weapon sinking into the floor.
      const inFront = (p) => (p.kind === 'cage' && !p.deco || p.kind === 'weapon' && !p.inStand) && p.y > game.goat.y;
      for (const p of game.props) if (!p.broken && p.kind !== 'lamp' && lit(p) && !inFront(p)) this.drawProp(p);
      for (const e of game.enemies) if (!e.dead && lit(e) && (e.state === 'floored' || e.state === 'stunned')) this.drawEnemy(e, game);
      for (const p of game.props) if (!p.broken && p.kind === 'lamp' && lit(p)) this.drawProp(p);
      for (const e of game.enemies) if (!e.dead && lit(e) && e.state !== 'floored' && e.state !== 'stunned' && e !== game.goat.holding) this.drawEnemy(e, game);
      for (const b of game.bullets) if (lit(b)) this.drawBullet(b);
      if (!game.goat.dead) this.drawGoat(game.goat, game);
      if (game.goat.holding) { const hld = game.goat.holding; if (hld.item) this.drawProp(hld); else this.drawEnemy(hld, game); }
      if (game.intro) this.drawIntroWorld(game);
      for (const p of game.props) if (!p.broken && lit(p) && inFront(p)) this.drawProp(p);
      this.drawBreath(game);
      this.drawRings(game);
      this.drawParticles(game);
      game.fx.draw(this,game);
      this.drawCageThought(game);
      this.drawFloatTexts(game);
      this.drawShade(game, cam);        // last of everything in world space: it covers what it covers
      if (game.state === 'dead') this.drawDeathPath(game);
      if (game.dev.vision || game.dev.hearing) this.drawDevOverlay(game);
      ctx.restore();
    }
    this.drawVignette(game);
    this.drawHurt(game);
    this.drawFlash(game);
    if (game.state === 'climb' && game.stairFx) {
      // the light at the top of the stairs takes the picture
      const p = clamp(game.stairFx.t, 0, 1);
      ctx.fillStyle = `rgba(239,230,208,${0.6 * p * p})`; ctx.fillRect(0, 0, this.vw, this.vh);
    }
    if (game.intro && game.inPrologue()) this.drawPrologue(game);
    if (game.intro) this.drawIntroOverlay(game);
    this.drawUI(game);
    this.drawTitle(game, dt);
    if (game.touch.active && game.state === 'play') this.drawTouchUI(game);
    this.drawBoonChoice(game);
    this.drawCard(game);
    this.drawDev(game);
  }

  // Screen to world: the camera, the tilt, and whatever kick and zoom punch the frame is carrying.
  worldTransform(game) {
    const ctx = this.ctx, cam = game.cam, zk = 1 + (game.zoomKick || 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.translate(this.vcx + (game.shakeX + game.kickX) * this.s, this.vcy + (game.shakeY + game.kickY) * this.s);
    ctx.scale(cam.zoom * zk, cam.zoom * zk * TILT);
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
    if (this.painted.ready && (game.levelIndex === 0 || this.painted.images['level'+game.levelIndex+'_stone0'])) { this.painted.drawTiles(this, game, cam); return; }
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
        ctx.fillStyle = ((tx + ty) & 1) ? def.floor : def.floorAlt; ctx.fillRect(px, py, TILE, TILE);
        // A dark lip under every wall gives the floor some depth.
        if (wd.isSolid(tx, ty - 1)) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(px, py, TILE, 5); }
        if (t === T.HAY) {
          // The painted bale, on every level rather than only the one with the altar in it: a level
          // keeps its own floor and wall colours, but a yellow square with four strokes scratched
          // into it does not read as a thing that burns, and the art for it was already loaded.
          if (this.painted.ready) this.painted.stamp(ctx, 'hay', px + 16, py + 17, 30, 27);
          else {
            ctx.fillStyle = PALETTE.hay; ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
            ctx.strokeStyle = PALETTE.hayDark; ctx.lineWidth = 2; ctx.beginPath();
            for (let k = 0; k < 4; k++) { const sx = px + 5 + k * 7, sy = py + 5 + ((tx * 3 + ty * 5 + k) % 3) * 6; ctx.moveTo(sx, sy); ctx.lineTo(sx + 5, sy + 12); }
            ctx.stroke();
          }
        } else if (t === T.ASH) {
          ctx.fillStyle = PALETTE.ash; ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
          ctx.fillStyle = '#3a3230'; ctx.fillRect(px + 8, py + 10, 6, 4); ctx.fillRect(px + 18, py + 20, 7, 4);
        } else if (t === T.PIT) {
          continue;                       // holes are drawn after the decals, in drawPits
        } else if (t === T.EXIT) {
          this.drawStairs(px, py, tx - game.level.exitTile.x0, true, def);
        } else if (t === T.ENTRY) {
          this.drawStairs(px, py, tx - game.level.entry.x0, false, def);
        }
      }
    }
  }

  // One tile of a flight of stairs, three tiles long. `k` is the tile's place in the flight, left to
  // right. The way out climbs to the right into light; the way in comes up from the dark on the left.
  drawStairs(px, py, k, up, def) {
    const ctx = this.ctx, steps = 4, sw = TILE / steps;
    ctx.fillStyle = def.wall; ctx.fillRect(px, py, TILE, TILE);
    for (let i = 0; i < steps; i++) {
      const n = k * steps + i, f = n / (3 * steps - 1), x = px + i * sw;
      if (up) {
        ctx.fillStyle = def.wallTop; ctx.fillRect(x, py, sw, TILE);
        ctx.fillStyle = `rgba(239,230,208,${0.1 + 0.68 * f * f})`; ctx.fillRect(x, py, sw, TILE);
      } else {
        ctx.fillStyle = `rgba(239,230,208,${0.04 + 0.34 * f})`; ctx.fillRect(x, py, sw, TILE);
        ctx.fillStyle = `rgba(6,4,6,${0.85 * (1 - f) * (1 - f)})`; ctx.fillRect(x, py, sw, TILE);
      }
      // the riser: each step throws a shadow down onto the one below it
      ctx.fillStyle = up ? 'rgba(0,0,0,0.42)' : 'rgba(0,0,0,0.5)'; ctx.fillRect(x, py, 2, TILE);
    }
    if (up && k === 2) {
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
      if (f.e.kind === 'dog') this.drawHound(f.e); else this.drawCultist(f.e, f.e.r);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  // Words painted on the floor instead of a tutorial box, the way Ape Out does it.
  drawHints(game) {
    const ctx = this.ctx, lv = game.level;
    ctx.save(); ctx.scale(1, 1 / TILT); ctx.textAlign = 'center';
    if (lv.hints) {
      for (const hn of lv.hints) {
        if (Math.abs(hn.x - game.cam.x) > 1100 || Math.abs(hn.y - game.cam.y) > 800) continue;
        // A sentence long enough to run off both ends of the room is broken over two lines and then
        // fitted to what is left of the floor. It used to be painted at one size whatever it said,
        // and the longest of them was unreadable at both ends.
        const lines = this.wrapFloor(hn.text), wide = (hn.w || 14 * TILE) - 3.2 * TILE;
        const size = this.fitFloorText(lines, wide, 26), lh = size * 1.34;
        const key = hn.key ? HINT_KEYS[hn.key][game.touch.active ? 1 : 0] : null;
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
      ctx.fillStyle = '#6d6a66'; ctx.fillRect(M.armLen - 16, -12, 16, 24);        // iron cap
      ctx.fillStyle = '#8d8a85'; ctx.fillRect(M.armLen - 16, -12, 16, 5);
      ctx.fillStyle = PALETTE.bloodDark; ctx.fillRect(M.armLen - 16, 6, 16, 6);
      ctx.restore();
    }
    if (this.altar) ctx.drawImage(this.altar.sprite('mill', M.hubR), -48, -64);
    else if (!(this.painted.ready && this.painted.atlas(ctx, 'mill-hub', 0, 0, M.hubR * 2.2, undefined, 0.5))) {
      ctx.fillStyle = '#4d4741'; ctx.beginPath(); ctx.arc(0, 0, M.hubR, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6a635b'; ctx.beginPath(); ctx.arc(0, -3, M.hubR - 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2e2a26'; ctx.beginPath(); ctx.arc(0, -3, 7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  drawPropBody(p) {
    if (this.painted.ready && this.painted.drawProp(this, p)) return;
    const ctx = this.ctx;
    if (p.kind === 'brazier') {
      this.shadow(p.x, p.y, p.r * 1.1, p.r * 0.55);
      ctx.fillStyle = PALETTE.brazier; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2a2018'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r - 4, 0, Math.PI * 2); ctx.fill();
      // Coals knocked out of it: the flame drops and builds back, so the bowl says when it is ready.
      const heat = p.spillCd > 0 ? 0.4 + 0.6 * (1 - p.spillCd / TUNING.prop.brazier.spillCd) : 1;
      this.flame(p.x, p.y - 6, (12 + 3 * Math.sin(this.t * 11 + p.phase)) * heat, p.phase * 10);
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
      if (p.open > 0) ctx.rotate((tall ? -1 : 1) * p.open * 1.25);
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
        ctx.fillText(p.gate ? 'A SOUL OPENS IT' : 'SOUL', p.x, (p.y - 24) * TILT);
        ctx.textAlign = 'left'; ctx.restore();
      }
    } else if (p.kind === 'secret') {
      // This tile is already floor — `carveSecret` cut it that way so what is behind it is real
      // ground rather than a curtain — and the wall is the only lie. Full tile, the room's own wall
      // colour, so nothing under it gives it away before the crack does.
      const h = TILE / 2;
      ctx.fillStyle = p.wallColor; ctx.fillRect(p.x - h, p.y - h, TILE, TILE);
      ctx.fillStyle = p.wallTop; ctx.fillRect(p.x - h, p.y - h, TILE, 6);
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
      this.flame(p.x, p.y - 20, 8 + 2 * Math.sin(this.t * 12 + p.phase), p.phase);
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
      ctx.fillStyle = PALETTE.hen;
      ctx.beginPath(); ctx.ellipse(bx, 1, 7, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = PALETTE.comb; ctx.fillRect(bx - 1.5, -7, 3, 2.5);
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
          ctx.fillRect(p.x - (n * 5 - 2) / 2 + k * 5, p.y - 23, 3.2, 3.2);
        }
      }
    } else if (p.kind === 'heal') {
      const bob = Math.sin(this.t * 2.4 + p.phase) * 2;
      const glow = ctx.createRadialGradient(p.x, p.y + bob, 0, p.x, p.y + bob, 34);
      glow.addColorStop(0, 'rgba(168,189,108,0.22)'); glow.addColorStop(1, 'rgba(168,189,108,0)');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(p.x, p.y + bob, 34, 0, Math.PI * 2); ctx.fill();
      this.shadow(p.x, p.y + 4, 11, 5);
      // A patch of real dirt under it: grass sprouting straight out of the boards read as a decal
      // laid over the floor rather than as ground of its own, so there is a small ring of earth
      // under the blades before anything green is drawn.
      ctx.fillStyle = PALETTE.dirt; ctx.beginPath(); ctx.ellipse(p.x, p.y + 6, 16, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = PALETTE.dirtHi; ctx.beginPath(); ctx.ellipse(p.x, p.y + 4.5, 12.5, 5.4, 0, 0, Math.PI * 2); ctx.fill();
      // Sprouted grass rather than a bowl: a few blades pushed up through the boards, leaning
      // together like something breathes on them. Grazed, not grabbed — see the pickup in game.js.
      for (let k = -3; k <= 3; k++) {
        const lean = Math.sin(this.t * 1.6 + p.phase + k) * 3, bx = p.x + k * 2.6;
        ctx.strokeStyle = k % 2 ? PALETTE.grassHi : PALETTE.grass; ctx.lineWidth = 2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(bx, p.y + 5 + bob);
        ctx.quadraticCurveTo(bx + lean * 0.5, p.y - 4 + bob, bx + lean, p.y - 11 - Math.abs(k) * 0.6 + bob);
        ctx.stroke();
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

  // A rank of iron spikes stood up along an arc of a body: the brute's back, and nobody else's.
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
      // The brute wears what he is: iron spikes stood up along his back and shoulders, so the man
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
    if (e.state === 'windup') swing = -1.3; else if (e.state === 'swing') swing = 1.1 - e.timer * 6; else if (e.state === 'recover') swing = 0.6;
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
        // The brute's club is a post with iron through it, and it is thicker than his arm.
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

  drawEnemy(e, game) {
    const ctx = this.ctx;
    const lying = e.state === 'floored' || e.state === 'stunned';
    this.drawTelegraph(e);
    this.drawAimTelegraph(e);
    // The man with a soul in him. Which boss is carrying one is decided before the level starts and
    // was, until now, something you found out by killing him: two Butchers in a run looked the same
    // and one of them was worth a verb. He glows — a low amber haze that breathes, the colour of the
    // thing he will drop — and his eyes come up red. Neither costs him anything in a fight; both are
    // readable across a room, which is the whole job. `drawCultist` and `drawHound` read `e.soul`
    // for the eyes, and this is the haze under him.
    if (e.soul && !e.dead && !e.ghosted) {
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
    if (!e.ghosted) this.shadow(e.x, e.y, e.r * (lying ? 1.4 : 1.05), e.r * (lying ? 0.5 : 0.42));
    const paintedKey = this.painted.ready && this.painted.characterKey(e);
    // `character()` already anchors each sheet at its own measured foot line (walk-cycle and static
    // "Facing" art sit at different heights in their 128px cell) — nothing needs nudging again here.
    ctx.save(); ctx.translate(e.x, e.y); ctx.scale(1, 1 / TILT);
    if (e.state === 'flung') ctx.rotate(this.t * 14); else if (!paintedKey) ctx.rotate(e.facing);
    if (e.state === 'stagger') ctx.translate(Math.sin(this.t * 60) * 2, 0);
    if (e.dazed > 0) ctx.rotate(Math.sin(this.t * 24) * 0.12);
    if (e.state === 'chargewind') ctx.translate(-4 + Math.sin(this.t * 50) * 3, Math.cos(this.t * 47) * 2);
    const r = e.r;
    if (e.elite) ctx.scale(e.champion ? TUNING.champion.scale : 1.28, e.champion ? TUNING.champion.scale : 1.28);
    if (lying) ctx.scale(1.35, 0.7);

    if (paintedKey) this.painted.character(this,e,paintedKey,e.kind==='butcher'?58:e.kind==='dog'?42:e.kind==='seer'?38:42);
    else if (e.kind === 'dog') this.drawHound(e);
    else if (e.kind === 'wraith') this.drawWraith(e, r);
    else this.drawCultist(e, r);
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
    if (e.maxHp > 1 && !e.ghosted) {
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

  // A hunter's shot is the one thing in the game you cannot see coming without this: the dashed
  // line grows and brightens across `hunter.aimTime` before he fires. It used to live inside
  // `drawCultist` and only a hunter drawn by that primitive fallback ever showed it — once the
  // painted sprite took over his body (`characterKey` returns 'hunter'), the tell silently went
  // dark and a rifle became a hitscan nobody could read. Drawn here, once, for either body.
  drawAimTelegraph(e) {
    if (e.kind !== 'hunter' || (e.state !== 'aim' && !e.held)) return;
    const ctx = this.ctx, r = e.r;
    ctx.save(); ctx.translate(e.x, e.y); ctx.scale(1, 1 / TILT); ctx.rotate(e.facing);
    const p = e.state === 'aim' ? 1 - e.timer / TUNING.hunter.aimTime : 0.5;
    ctx.strokeStyle = `rgba(192,57,43,${0.2 + p * 0.65})`; ctx.lineWidth = 1.6;
    ctx.setLineDash([7, 6]); ctx.lineDashOffset = -this.t * 40;
    ctx.beginPath(); ctx.moveTo(r + 20, r * 0.42); ctx.lineTo(r + 20 + 10 * TILE * p, r * 0.42); ctx.stroke();
    ctx.setLineDash([]);
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

  // The Seer's rune, burning in on the floor where you were standing — or, if you are carrying him,
  // on the floor under his own feet, which is the floor under yours.
  drawRunes(game) {
    const ctx = this.ctx;
    for (const e of game.enemies) {
      if (e.dead || !e.rune || (e.state !== 'cast' && e.state !== 'held')) continue;
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
    // The way in is a word in the corner, not a button. A bordered box down there reads as part of
    // the game and this is not part of the game: it is a door for whoever is building it.
    const pad = 8 * s, label = d.open ? 'close dev' : 'dev tools';
    ctx.font = `700 ${9.5 * s}px ${FONT_SC}`;
    const cw = ctx.measureText(label).width + 16 * s, chH = 17 * s;
    const cx = this.w - pad - cw, cy = this.h - pad - chH;
    let toastY = cy - 10 * s;
    if (d.open) {
      const rows = [
        ['god', d.god ? 'GOD  ON' : 'GOD  OFF'], ['rules', 'LEVEL TOOL'],
        ['vision', d.vision ? 'VISION  ON' : 'VISION  OFF'],
        ['hearing', d.hearing ? 'HEARING  ON' : 'HEARING  OFF'],
        ['bearer', '+ BEARER'], ['hunter', '+ HUNTER'], ['dog', '+ HOUND'], ['seer', '+ SEER'],
        ['wraith', '+ WRAITH'], ['butcher', '+ BUTCHER'],
        ['soul', '+ SOUL'], ['heal', 'HEAL'], ['clear', 'CLEAR NEAR'],
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
        const on = (id === 'god' && d.god) || (id === 'vision' && d.vision) || (id === 'hearing' && d.hearing);
        ctx.fillStyle = on ? 'rgba(192,57,43,0.5)' : 'rgba(59,34,51,0.75)';
        ctx.fillRect(px + 5 * s, y, rw - 10 * s, rh);
        ctx.strokeStyle = on ? PALETTE.blood : 'rgba(239,230,208,0.2)'; ctx.lineWidth = 1 * s;
        ctx.strokeRect(px + 5 * s, y, rw - 10 * s, rh);
        ctx.font = `700 ${11 * s}px ${FONT_SC}`; ctx.fillStyle = on ? PALETTE.fireHi : PALETTE.bone;
        ctx.textBaseline = 'middle'; ctx.fillText(label, px + 13 * s, y + rh / 2); ctx.textBaseline = 'alphabetic';
        d.rects.push({ x: px + 5 * s, y, w: rw - 10 * s, h: rh, id });
      });
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
      ctx.font = `700 ${13 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.fireHi; ctx.textAlign = 'right';
      ctx.fillText(d.toast.text, this.w - 12 * s, toastY);
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

  // Break a line on its spaces to fit a width, in whatever font is set.
  wrap(text, maxW) {
    const ctx = this.ctx, out = [];
    let line = '';
    for (const word of text.split(' ')) {
      const t = line ? line + ' ' + word : word;
      if (line && ctx.measureText(t).width > maxW) { out.push(line); line = word; } else line = t;
    }
    if (line) out.push(line);
    return out;
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
    this.devButton(d, pad, pad, 76 * s, 20 * s, 'RULES', 'tab-rules', d.tab === 'rules');
    this.devButton(d, pad + 80 * s, pad, 76 * s, 20 * s, 'LEVEL', 'tab-levels', d.tab === 'levels');
    this.devButton(d, pad + 160 * s, pad, 76 * s, 20 * s, 'BALANCE', 'tab-balance', d.tab === 'balance');
    this.devButton(d, pad + 240 * s, pad, 76 * s, 20 * s, 'ENEMIES', 'tab-enemies', d.tab === 'enemies');
    this.devButton(d, pad + 320 * s, pad, 76 * s, 20 * s, 'BOONS', 'tab-boons', d.tab === 'boons');
    this.devButton(d, pad + 400 * s, pad, 76 * s, 20 * s, 'OBJECTS', 'tab-props', d.tab === 'props');
    this.devButton(d, W - pad - 64 * s, pad, 64 * s, 20 * s, 'CLOSE', 'rules', false);
    if (d.tab === 'balance') this.drawBalance(game, pad, pad + 30 * s);
    else if (d.tab === 'levels') this.drawLevelTab(game, pad, pad + 30 * s);
    else if (d.tab === 'enemies') this.drawEnemiesTab(game, pad, pad + 30 * s);
    else if (d.tab === 'boons') this.drawBoonsTab(game, pad, pad + 30 * s);
    else if (d.tab === 'props') this.drawPropsTab(game, pad, pad + 30 * s);
    else this.drawRuleTab(game, pad, pad + 30 * s);
    // A room opened from either of the other two covers them: it is the deepest the tool goes.
    if (d.room) this.drawRoomSheet(game, pad);
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
      pen: PALETTE.ash, calm: PALETTE.ash };
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
      pen: PALETTE.ash, calm: PALETTE.ash, arena: PALETTE.witch, mill: PALETTE.witch,
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
  drawEnemiesTab(game, pad, top) {
    const ctx = this.ctx, s = this.ts, d = game.dev, W = this.w, H = this.h;
    const cycle = (tag, cfg) => tag === 'hunter' ? cfg.aimTime + cfg.reload
      : tag === 'seer' ? cfg.castWind + cfg.castCooldown
      : tag === 'wraith' ? TUNING.wraith.manifest + TUNING.wraith.solidAfter + TUNING.wraith.fadeCd
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
      { kind: 'bearer', tag: 'champion', champion: true, label: 'BRUTE',
        cfg: Object.assign({}, TUNING.bearer, { hp: TUNING.champion.hp }), hp: TUNING.champion.hp, boss: TUNING.champion.bossHp,
        edit: [...melee('bearer'), ['HP', ['champion', 'hp']], ['BOSS HP', ['champion', 'bossHp']]],
        note: 'A clubman built twice over: three hits before he stays down, four as an arena boss. Bigger and slower to match.' },
      { kind: 'butcher', tag: 'butcher', label: 'BUTCHER', cfg: TUNING.butcher, hp: TUNING.butcher.hp,
        edit: [...melee('butcher'), ['HP', ['butcher', 'hp']], ['CHARGE AT', ['butcher', 'chargeMin']], ['CHARGE SPD', ['butcher', 'chargeSpeed']]],
        note: `Two hits. Charges after ${TUNING.butcher.chargeMin}s of chasing, bulldozes doors and tables, blunders but keeps swinging on fire.` },
      { kind: 'dog', tag: 'dog', label: 'HOUND', cfg: TUNING.dog, hp: TUNING.dog.hp || 1,
        edit: [...melee('dog'), ['DODGE', ['dog', 'dodge']]],
        note: `Never holds still. Dodges ${Math.round(TUNING.dog.dodge * 100)}% of headbutts, darts in from orbit, one at a time per pack. No grab, no bark.` },
      { kind: 'seer', tag: 'seer', label: 'SEER', cfg: TUNING.seer, hp: TUNING.seer.hp,
        edit: [['SPEED', ['seer', 'speed']], ['DMG', ['seer', 'damage']], ['HP', ['seer', 'hp']],
          ['CAST', ['seer', 'castWind']], ['CAST CD', ['seer', 'castCooldown']], ['BLINK CD', ['seer', 'blinkCooldown']]],
        note: 'Never closes. Blinks away when you get near, paints a rune under himself, near-perfect trap sense.' },
      { kind: 'hunter', tag: 'hunter', label: 'HUNTER', cfg: TUNING.hunter, hp: TUNING.hunter.hp || 1,
        edit: [['SPEED', ['hunter', 'speed']], ['DMG', ['hunter', 'damage']],
          ['AIM', ['hunter', 'aimTime']], ['RELOAD', ['hunter', 'reload']]],
        note: `Keeps ${TUNING.hunter.keepMin}-${TUNING.hunter.keepMax} tiles off, fires on a reload timer. Empties a fixed mag once grabbed, never reloads again.` },
      { kind: 'wraith', tag: 'wraith', label: 'WRAITH', cfg: TUNING.wraith, hp: TUNING.wraith.hp,
        edit: [['SPEED', ['wraith', 'speed']], ['DMG', ['wraith', 'damage']], ['HP', ['wraith', 'hp']],
          ['WINDUP', ['wraith', 'windup']], ['MANIFEST', ['wraith', 'manifest']], ['SOLID', ['wraith', 'solidAfter']], ['FADE', ['wraith', 'fadeCd']]],
        note: 'No body, no collision, until it commits. Drifts to your flank or back, manifests, swings once, fades. Dies only in that window.' },
    ];
    ctx.font = `700 ${11 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.ochre; ctx.textAlign = 'left';
    ctx.fillText('THE BESTIARY', pad, top);
    ctx.font = `400 ${8.5 * s}px ${FONT}`; ctx.fillStyle = PALETTE.ash;
    ctx.fillText('read and edited live off TUNING · the portrait is the same drawEnemy call the game itself uses · click a number to change it', pad + 120 * s, top);

    const rowH = Math.min(84 * s, Math.max(58 * s, (H - top - 24 * s - 150 * s - pad) / KINDS.length));
    const thumb = Math.min(rowH - 6 * s, 52 * s);
    const nameX = pad + thumb + 12 * s, statsX = nameX + 150 * s, statsW = 230 * s, noteX = statsX + statsW + 12 * s;
    let y = top + 18 * s;
    ctx.font = `700 ${7.5 * s}px ${FONT_SC}`; ctx.fillStyle = 'rgba(239,230,208,0.5)';
    [[nameX, 'KIND'], [statsX, 'STATS'], [noteX, 'BEHAVIOUR']].forEach(([cx, label]) => ctx.fillText(label, cx, y));
    y += 10 * s;
    KINDS.forEach((k, i) => {
      const ry = y + i * rowH;
      if (i % 2) { ctx.fillStyle = 'rgba(239,230,208,0.03)'; ctx.fillRect(pad - 4 * s, ry, W - pad * 2 + 8 * s, rowH); }
      const fake = { x: pad + thumb / 2, y: ry + thumb / 2 + 6 * s, r: k.cfg.radius, kind: k.kind,
        champion: !!k.champion, elite: !!k.champion, facing: Math.PI / 2, hp: k.hp, maxHp: k.hp,
        dead: false, ghosted: false, vx: 0, vy: 0, flash: 0, burning: 0, bombFuse: 0, dazed: 0,
        state: 'idle', say: null, soul: false, witchBurn: false };
      ctx.save(); this.drawEnemy(fake, game); ctx.restore();
      ctx.textAlign = 'left';
      ctx.font = `700 ${9.5 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.bone;
      ctx.fillText(k.label, nameX, ry + 12 * s);
      ctx.font = `400 ${7.5 * s}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.45)';
      const lv = levelsFor(k.tag);
      ctx.fillText(`threat ${THREAT[k.tag]} · levels ${lv.length ? lv.join(',') : '-'}`, nameX, ry + 24 * s);
      ctx.fillStyle = 'rgba(239,230,208,0.35)';
      ctx.fillText(`cycle ${cycle(k.tag, k.cfg).toFixed(2)}s`, nameX, ry + 35 * s);
      // Every real knob for this kind, as chips wrapped into the stats column — the same box and the
      // same click BOONS already uses, so the bestiary is not a second kind of editor.
      let px = statsX, py = ry + 2 * s;
      for (const [label, path] of k.edit) {
        let obj = TUNING; for (let j = 0; j < path.length - 1; j++) obj = obj[path[j]];
        const val = obj[path[path.length - 1]];
        ctx.font = `700 ${8 * s}px ${FONT_SC}`;
        const w = ctx.measureText(`${label} ${val}`).width + 10 * s;
        if (px + w > statsX + statsW) { px = statsX; py += 19 * s; }
        this.numChip(d, px, py, label, val, `enemy-edit=${path.join('.')}`);
        px += w + 5 * s;
      }
      ctx.fillStyle = 'rgba(239,230,208,0.62)'; ctx.font = `400 ${7.8 * s}px ${FONT}`;
      const lines = this.wrap(k.note, W - pad - noteX - 6 * s).slice(0, 4);
      lines.forEach((l, li) => ctx.fillText(l, noteX, ry + 12 * s + li * 10 * s));
    });

    // THE GOAT, underneath: the numbers everything above is measured against, and just as editable —
    // every chip here is a real path into `TUNING.goat`, so a change lands exactly where the goat's
    // own `update` reads it from.
    const gy = y + KINDS.length * rowH + 18 * s;
    ctx.font = `700 ${10 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.ochre;
    ctx.fillText('THE GOAT', pad, gy);
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
      const w = ctx.measureText(`${label} ${val}`).width + 10 * s;
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
      { kind: 'lamp', label: 'LAMP POST', make: (x, y) => new Prop(x, y, 'lamp'), hits: ['BODY', 'FIRE'],
        stats: `topples above ${Math.round(P.lamp.knock)}px/s of impact, pours oil ${P.lamp.poolRadius} tiles across`,
        note: 'Not a pillar — a fast body (flung, charging, or falling past it) knocks it over, and it pours a burning pool of oil where it lands. The only way to start a fire in a room with no brazier in it.' },
      { kind: 'crate', label: 'CRATE', make: (x, y) => new Prop(x, y, 'crate'), hits: ['HEADBUTT', 'THROWN', 'FIRE'],
        stats: `floors for ${P.crate.stun}s on a hit, bursts for ${P.crate.burstTime}s if thrown through flame`,
        note: 'The one thing on the floor you pick up and throw. Breaks on a door, table, gong or man; a burning tile makes it burst into a wider, longer fire instead of just breaking. Carried, it blocks one club for free, then it is gone.' },
      { kind: 'weapon', label: 'STAND OF ARMS', make: (x, y) => new Prop(x, y, 'weapon', { weapon: 'sword' }), hits: ['HEADBUTT', 'THROWN', 'BODY'],
        stats: `sword: one throw, kills+sticks · shield: ${P.weapon.uses.shield} men or bullets before it snaps`,
        note: 'Grab it, carry it, let go or press headbutt to throw it — there is no separate swing for a blade the goat cannot wield in his teeth. A sword goes through the first man it finds; a shield knocks a row flat and turns bullets while carried, and a man who swings into it eats the parry.' },
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
      { kind: 'secret', label: 'SECRET WALL', make: (x, y) => new Prop(x, y, 'secret'), hits: ['HEADBUTT'],
        stats: `${P.secret.hits} hits to open, the niche behind it stays lit after`,
        note: 'Ordinary wall until the second blow: blocks sight and bullets like stone right up to the crack. Behind it is always the same pair — a patch of milk and a stand of arms — never a room or a corridor.' },
      { kind: 'heal', label: 'HEAL PATCH', make: (x, y) => new Prop(x, y, 'heal'), hits: ['BODY'],
        stats: `graze ${P.heal.grazeTime}s under ${P.heal.grazeSpeed}px/s for +1 heart`,
        note: 'Grazed, not grabbed: hold still (or nearly) inside it and it pays out once. Running through it on the way past does nothing — the point is that it costs a beat of standing in the open.' },
      { kind: 'bell', label: 'BELL', make: (x, y) => new Prop(x, y, 'bell'), hits: ['HEADBUTT', 'BODY'],
        stats: `${P.bell.buff}s of ×${P.bell.speedMul} speed, ×${P.bell.cooldownMul} faster cooldowns`,
        note: 'Rung, it buys a stretch of speed and quick hands for a noise the whole floor hears at once. A terrible trade in an empty room; the best one you get in a full one.' },
      { kind: 'coop', label: 'COOP & HEN', make: (x, y) => new Prop(x, y, 'coop'), hits: ['HEADBUTT', 'BODY'],
        stats: `${P.coop.hits} hit to open · kicked at ${Math.round(P.chicken.launchSpeed)}px/s · kills once`,
        note: 'The one thing in the compound on your side. Loose, she walks with you; kicked — a headbutt, not a throw, so no seventh button — she homes onto whoever she was aimed at and kills on contact, then comes apart. A miss only costs the walk back to her.' },
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
        : p.kind === 'brazier' ? PALETTE.fire : p.kind === 'spike' ? PALETTE.ash : PALETTE.ochre;
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
        ctx.fillText((sp.champion ? 'brute' : sp.kind) + (sp.boss ? '*' : ''), dx, dy - k * 1.05);
        ctx.textAlign = 'left';
      }
    }
  }

  drawBullet(b) {
    const ctx = this.ctx; ctx.strokeStyle = PALETTE.fireHi; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    const l = 13 / (Math.hypot(b.vx, b.vy) || 1);
    ctx.beginPath(); ctx.moveTo(b.x - b.vx * l, b.y - b.vy * l); ctx.lineTo(b.x, b.y); ctx.stroke();
  }

  drawGoat(g, game) {
    if (this.painted.ready) { this.painted.drawGoat(this,g,game); return; }
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
    if (g.state === 'windup') { sx = 0.82; sy = 1.15; }
    else if (g.state === 'lunge') { sx = 1.3; sy = 0.8; }
    else if (g.state === 'roll') { sx = 0.86; sy = 0.86; }
    else if (g.state === 'rollrecover') { sx = 1.08; sy = 0.9; }
    else if (g.state === 'stunned') { ctx.rotate(0.34); sx = 1.14; sy = 0.76; }   // knocked off his feet
    else if (g.state === 'ko') { ctx.rotate(0.5); sx = 1.15; sy = 0.72; }   // out cold, on his side
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
    ctx.restore();
  }

  // One choice per Butcher. Tap a card, or press its number.
  drawBoonChoice(game) {
    if (game.state !== 'boon' || !game.boonChoice) { game.boonRects = []; return; }
    // The pointer's own card, so a hover reads as pointing at something rather than as nothing at
    // all: `game.boonAt` is the same hit-test the click itself goes through, against last frame's
    // rects — they never move while the choice is up, so the one-frame lag is not felt.
    const hoverI = game.boonDown < 0 ? game.boonAt(game.input.mouse) : -1;
    game.boonRects = [];
    const ctx = this.ctx, s = this.ts, n = game.boonChoice.length, fire = !!game.mods.breath;
    ctx.fillStyle = 'rgba(13,10,12,0.86)'; ctx.fillRect(0, 0, this.w, this.h);
    ctx.textAlign = 'center';
    const stack = this.portrait || this.vw < 760 * s;
    const cw = stack ? Math.min(this.w * 0.88, 440 * s) : Math.min(this.w * 0.29, 280 * s);
    const ch = stack ? 84 * s : 112 * s;
    const gap = 13 * s;
    const blockH = stack ? n * ch + (n - 1) * gap : ch;
    const topY = this.h / 2 - blockH / 2;
    this.soulWisp(this.w / 2, topY - 44 * s, 1.5 * s, 0, 0.9, true);
    const rowW = n * cw + (n - 1) * gap;
    for (let i = 0; i < n; i++) {
      const x = stack ? (this.w - cw) / 2 : (this.w - rowW) / 2 + i * (cw + gap);
      const y = stack ? topY + i * (ch + gap) : topY;
      const b = game.boonChoice[i], hover = i === hoverI;
      game.boonRects.push({ x, y, w: cw, h: ch });
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
      ctx.font = `${12.5 * s}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.75)';
      const lines = this.wrap(b.desc, cw - 24 * s);
      lines.forEach((l, k) => ctx.fillText(l, x + cw / 2, y + 52 * s + k * 16 * s));
      // What it hangs off, drawn the same way the rail draws it, so the card that offers a boon
      // and the chip that later shows it are recognisably the same picture. A boon with no `skill`
      // is body work and gets neither — nothing on the rail changes for it either.
      if (b.skill) {
        ctx.save(); ctx.translate(x + cw - 20 * s, y + 17 * s);
        this.skillIcon(b.skill, 10 * s, game, fire);
        ctx.restore();
        ctx.fillStyle = PALETTE.ochre; ctx.font = `700 ${9 * s}px ${FONT_SC}`;
        ctx.fillText(SKILL_KEYS[b.skill], x + cw - 20 * s, y + 34 * s);
      }
    }
    // The fourth choice: none of the three. Set apart from the cards — no border colour a card
    // uses, no emoji, just the soul's own violet — so it reads as declining rather than as a
    // fourth thing on offer.
    const skipW = stack ? cw : Math.min(rowW, 260 * s), skipH = 30 * s;
    const skipX = (this.w - skipW) / 2;
    const skipY = (stack ? topY + blockH : topY + ch) + 18 * s;
    const skipHover = hoverI === n;
    game.boonRects.push({ x: skipX, y: skipY, w: skipW, h: skipH });
    ctx.fillStyle = skipHover ? 'rgba(53,40,74,0.75)' : 'rgba(37,29,48,0.5)';
    ctx.fillRect(skipX, skipY, skipW, skipH);
    ctx.strokeStyle = skipHover ? PALETTE.witchHi : 'rgba(125,92,255,0.5)';
    ctx.lineWidth = (skipHover ? 2 : 1.4) * s; ctx.strokeRect(skipX, skipY, skipW, skipH);
    ctx.fillStyle = skipHover ? PALETTE.bone : 'rgba(239,230,208,0.65)';
    ctx.font = `700 ${12.5 * s}px ${FONT_SC}`;
    ctx.fillText('RELEASE THE SOUL', skipX + skipW / 2, skipY + skipH / 2 + 4.5 * s);
    ctx.font = `${9.5 * s}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.4)';
    ctx.fillText('none of these · 4', skipX + skipW / 2, skipY + skipH + 13 * s);
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
    for (const p of game.parts) {
      ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillStyle = p.color;
      if(p.color===PALETTE.blood||p.color===PALETTE.bloodDark) {
        ctx.beginPath();ctx.ellipse(p.x,p.y,p.size*0.7,p.size*0.35,Math.atan2(p.vy,p.vx),0,Math.PI*2);ctx.fill();
      } else ctx.fillRect(p.x-p.size/2,p.y-p.size/2,p.size,p.size);
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
    const ctx = this.ctx; if (!game.world || game.state === 'intro') return;
    const g = game.goat, s = this.hs, top = 3 * s + (this.portrait ? 12 * s : 0);
    ctx.textAlign = 'left';
    // The level's name used to stand over the hearts. The card at the head of every level has
    // already said it, the floor of the first room says what the level is about, and a title in the
    // corner of the screen is a thing you read once and then look past for ten minutes.
    const HEART = HEART_GLYPH;
    const px = 2.6 * s;
    for (let i = 0; i < g.maxHp; i++) {
      const ox = 14 * s + i * 22 * s, oy = top + 14 * s;
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
      ctx.fillText(`x${game.combo} IN A ROW`, 14 * s, top + 58 * s);
    }

    // The right column reads top down: what your buttons do, then what they have got you.
    ctx.textAlign = 'right';
    const right = this.w - 20 * s;
    const below = this.drawSkills(game, top + 14 * s);   // the rail centres its own text, so re-anchor
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

  // The skill rail, top right, above the count: the four verbs, whether each one is available, how
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
    const rows = [
      // Headbutt carries no cooldown ring — its recovery is the cost, per CLAUDE.md — but a cost
      // with nothing to see was a button that looked free between swings. `recover` drains the same
      // chip in the opposite direction, in fire rather than blood, since it is a vulnerability window
      // and not a lockout: the button is simply not what threw it a moment ago.
      { id: 'butt', name: 'BUTT', cap: 'LMB', cd: 0, max: 0, ready: g.state === 'idle' && !g.holding,
        recover: g.state === 'recover' && g.recoverMax > 0 ? clamp(g.timer / g.recoverMax, 0, 1) : 0,
        note: game.mods.bomb ? 'Ram him. Whoever you hit blows up a moment later.'
          : 'Ram him. It only knocks him down: walls, fire and other men do the killing.' },
      { id: 'grab', name: g.holding ? 'THROW' : game.mods.grabMen ? 'GRAB' : 'THINGS', cap: 'RMB', cd: g.grabCd,
        max: TUNING.goat.grab.cooldown * game.mods.grabCooldown, ready: g.grabCd <= 0, half: !game.mods.grabMen,
        note: game.mods.grabMen ? 'Press near a box, a blade, a shield or a man to carry it. Let go to throw.'
          : 'Press near a box, a blade or a shield to carry it. Let go to throw. Men are too heavy for now.' },
      { id: 'roll', name: 'ROLL', cap: 'E', cd: g.rollCd,
        max: R.cooldown * game.mods.rollCooldown, ready: g.rollCd <= 0,
        note: game.mods.rollStun > 0 ? 'Dodge. Nothing can hit you, and anyone you roll through is stunned.'
          : 'Dodge. Nothing can hit you mid-roll, but you have to get up after it.' },
      { id: 'scream', name: fire ? 'FIRE' : game.mods.screamStun ? 'BAAH' : 'CALL', cap: 'SPC',
        cd: g.screamCd, max: game.mods.screamCooldown, ready: g.screamCd <= 0,
        half: !fire && !game.mods.screamStun,
        note: fire ? 'Breathe fire the way you are running. Long wait after it.'
          : game.mods.screamStun ? 'A shout. Everyone who hears it is stunned.'
            : 'A shout. It breaks the swing of anyone right on top of you, and walks everyone else to where you shouted.' },
    ];
    this.skillHover = null;
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
          this.skillHover = { row, x, y: y + box + 35 * s, hot, boons };
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
      const bw = right - x0, by = end + 2 * s;
      ctx.fillStyle = 'rgba(13,10,12,0.5)'; ctx.fillRect(x0, by, bw, 4 * s);
      ctx.fillStyle = PALETTE.fireHi; ctx.fillRect(x0, by, bw * gong, 4 * s);
      ctx.textAlign = 'center'; ctx.font = `700 ${8.5 * s}px ${FONT_SC}`; ctx.fillStyle = PALETTE.fireHi;
      ctx.fillText('THE GONG', x0 + bw / 2, by + 14 * s);
      end = by + 24 * s;
    }
    ctx.textAlign = 'left';
    return end;
  }

  // What the chip under the pointer does, in words. The rail says which key throws a verb and the
  // note says what the verb is — so the sentence is there when it is wanted and out of the way the
  // rest of the time, which is the opposite of a caption that lives on the screen for ten minutes.
  // It carries the souls hanging off that button too, because that is where a run's build is felt.
  drawSkillNote(game) {
    const h = this.skillHover; if (!h) return;
    const ctx = this.ctx, s = this.hs;
    const w = Math.min(230 * s, this.w - 28 * s), right = this.w - 14 * s, x = right - w;
    ctx.font = `${11 * s}px ${FONT}`;
    const lines = this.wrap(h.row.note, w - 20 * s);
    const names = h.boons.map((b) => (b.active ? '◆ ' : '❖ ') + (b.emoji ? b.emoji + ' ' : '') + b.name);
    const bh = 26 * s + lines.length * 14 * s + names.length * 13 * s;
    const y = Math.min(h.y, this.vh - bh - 10 * s);
    ctx.fillStyle = 'rgba(13,10,12,0.94)'; ctx.fillRect(x, y, w, bh);
    ctx.strokeStyle = h.hot ? 'rgba(242,162,51,0.7)' : 'rgba(239,230,208,0.22)'; ctx.lineWidth = 1.4 * s;
    ctx.strokeRect(x, y, w, bh);
    ctx.textAlign = 'left';
    ctx.font = `700 ${12 * s}px ${FONT_SC}`; ctx.fillStyle = h.row.half ? 'rgba(239,230,208,0.7)' : PALETTE.bone;
    ctx.fillText(h.row.name, x + 10 * s, y + 15 * s);
    ctx.font = `${11 * s}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.68)';
    lines.forEach((ln, i) => ctx.fillText(ln, x + 10 * s, y + 30 * s + i * 14 * s));
    ctx.font = `700 ${10 * s}px ${FONT_SC}`;
    names.forEach((n, i) => {
      ctx.fillStyle = h.boons[i].active ? PALETTE.blood : PALETTE.ochre;
      ctx.fillText(n, x + 10 * s, y + 32 * s + lines.length * 14 * s + i * 13 * s);
    });
    ctx.textAlign = 'right';
  }

  // The four verbs as icons, drawn around the origin with a half-size of h. Each one carries what the
  // souls have added to it, so the rail changes shape over a run instead of only gaining words.
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
      // What is between the jaws. Out of the pen it is a box — the mouth takes objects and nothing
      // else — and BY THE COLLAR turns it into a head, which is the icon changing into the thing
      // the soul bought. Devour reddens it; a strong jaw puts teeth round it.
      if (!m.grabMen) {
        ctx.fillStyle = PALETTE.ochre;
        ctx.fillRect(-h * 0.3, -h * 0.3, h * 0.6, h * 0.6);
        ctx.strokeStyle = PALETTE.ink; ctx.lineWidth = h * 0.1;
        ctx.beginPath(); ctx.moveTo(-h * 0.3, 0); ctx.lineTo(h * 0.3, 0); ctx.stroke();
      } else {
        ctx.fillStyle = m.devour ? PALETTE.blood : PALETTE.ochre;
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
    const labels = { butt: 'BUTT', grab: held ? 'THROW' : game.mods.grabMen ? 'GRAB' : 'THINGS',
      scream: fire ? 'FIRE' : game.mods.screamStun ? 'BAAH' : 'CALL', roll: 'ROLL' };
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

  // ---------- the first screen ----------
  // The name, a pair of horns round it, and the two ways in. Nothing is explained here: the opening
  // scene carries the story and the floor of level 1 carries the controls.
  drawTitle(game, dt) {
    if (game.state !== 'title') { if (game.menu) game.menu.rects.length = 0; return; }
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
    this.glyphStamp(cx, h * 0.46, Math.min(w, h) * 0.56, CULT_GLYPHS[2], 0.04, PALETTE.ochre);
    this.titleEmbers(step);
    ctx.fillStyle = this.titleVig; ctx.fillRect(0, 0, w, h);

    ctx.textAlign = 'center';
    const spaced = 'letterSpacing' in ctx;
    // The name and its horns are one shape: measure it, then shrink until it fits the screen it got.
    let size = clamp(Math.min(w * 0.155, h * 0.18), 26 * s, 88 * s);
    const measure = () => {
      if (spaced) ctx.letterSpacing = `${(size * 0.09).toFixed(1)}px`;
      ctx.font = `700 ${size}px ${FONT_SC}`;
      return ctx.measureText('GOAT OUT').width;
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

    ctx.fillStyle = 'rgba(122,31,24,0.85)'; ctx.fillText('GOAT OUT', cx + size * 0.04, titleY + size * 0.05);
    ctx.fillStyle = PALETTE.bone; ctx.fillText('GOAT OUT', cx, titleY);
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
      levels: { label: 'LEVELS', note: `(start on any of the ${LEVELS.length}, with the souls it takes)` },
      best: { label: 'BEST', note: cleared ? `(best run ${board.run || 0})` : '(nothing on the board yet)' },
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
      // the switch itself: a bar with a block in one end of it, lit when it is thrown
      const tw = 46 * s, th = 20 * s, tx = x0 + bw - tw - 16 * s, ty = y + rowH / 2 - th / 2;
      ctx.fillStyle = on ? 'rgba(242,162,51,0.45)' : 'rgba(239,230,208,0.1)';
      ctx.fillRect(tx, ty, tw, th);
      ctx.strokeStyle = on ? PALETTE.ochre : 'rgba(239,230,208,0.28)'; ctx.lineWidth = 1.6 * s;
      ctx.strokeRect(tx, ty, tw, th);
      ctx.fillStyle = on ? PALETTE.fireHi : 'rgba(239,230,208,0.4)';
      ctx.fillRect(on ? tx + tw - th + 2 * s : tx + 2 * s, ty + 2 * s, th - 4 * s, th - 4 * s);
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
    const rows = LEVELS.length + 1;
    const rowH = clamp(h * 0.085, 30 * s, 52 * s), gap = 6 * s;
    const bw = clamp(Math.min(w * 0.86, 460 * s), 200 * s, 520 * s), x0 = cx - bw / 2;
    const top = h / 2 - (rows * (rowH + gap)) / 2;
    ctx.textAlign = 'center'; ctx.fillStyle = PALETTE.ochre;
    ctx.font = `700 ${clamp(rowH * 0.42, 15 * s, 24 * s)}px ${FONT_SC}`;
    ctx.fillText('LEVELS', cx, top - 16 * s);
    game.menu.rects.length = 0;
    let souls = 0;
    for (let i = 0; i < rows; i++) {
      const y = top + i * (rowH + gap), last = i === LEVELS.length, sel = game.menu.sub === i;
      game.menu.rects.push({ x: x0, y, w: bw, h: rowH });
      ctx.fillStyle = sel ? '#4a2428' : '#190f16'; ctx.fillRect(x0, y, bw, rowH);
      ctx.strokeStyle = sel ? PALETTE.blood : 'rgba(239,230,208,0.2)'; ctx.lineWidth = 2 * s;
      ctx.strokeRect(x0, y, bw, rowH);
      if (last) {
        ctx.textAlign = 'center'; ctx.fillStyle = PALETTE.bone; ctx.font = `700 ${16 * s}px ${FONT_SC}`;
        ctx.fillText('BACK', cx, y + rowH * 0.62);
        continue;
      }
      const def = LEVELS[i], rec = (board.levels || {})[i];
      ctx.textAlign = 'left';
      ctx.fillStyle = PALETTE.bone; ctx.font = `700 ${15 * s}px ${FONT_SC}`;
      ctx.fillText(`${i + 1}. ${def.name}`, x0 + 16 * s, y + rowH * 0.42);
      ctx.font = `${11 * s}px ${FONT}`; ctx.fillStyle = 'rgba(239,230,208,0.5)';
      const carry = souls ? `${souls} soul${souls === 1 ? '' : 's'}` : 'nothing but a goat';
      ctx.fillText(this.clip(`${def.canon ? def.canon.name.toLowerCase() : 'the compound'} · ${def.rooms} rooms · ${carry}`, bw - 110 * s), x0 + 16 * s, y + rowH * 0.74);
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
    if (card.alpha !== undefined) ctx.globalAlpha = clamp(card.alpha, 0, 1);
    rows.forEach((r, i) => {
      ctx.font = r.small ? `${small}px ${FONT}` : `700 ${size}px ${FONT}`;
      ctx.fillStyle = r.small ? (r.last ? (card.color || PALETTE.bone) : 'rgba(239,230,208,0.62)') : (card.color || PALETTE.bone);
      y += lh(i);
      ctx.fillText(r.text, this.w / 2, y - lh(i) * 0.28);
    });
    ctx.globalAlpha = 1; ctx.textAlign = 'left';
  }
}
