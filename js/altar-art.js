// Level one's environment. Small cached canvases keep the pixel grid independent of camera zoom.
// This layer never creates a Prop or consumes the simulation RNG: ornament cannot change a run.
class AltarArt {
  constructor() {
    this.tiles = new Map(); this.sprites = new Map(); this.level = null;
  }

  hash(x, y, salt = 0) {
    let n = Math.imul(x + salt * 37, 374761393) ^ Math.imul(y + 11, 668265263);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return (n ^ (n >>> 16)) >>> 0;
  }

  canvas(w, h, paint) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false; paint(ctx);
    return c;
  }

  rect(ctx, color, x, y, w, h) {
    ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  prepare(game) {
    if (this.level === game.level) return;
    this.level = game.level;
    const { W, H, rooms } = game.level;
    this.boards = new Uint8Array(W * H);
    // The side rooms feel like work/storage spaces; the pen and arenas retain bare ritual stone.
    for (const room of rooms) {
      if (room.index === 0 || room.role === 'arena' || room.role === 'mill' || room.index % 4 !== 0) continue;
      for (let y = room.y + 1; y < room.y + room.h - 1; y++)
        for (let x = room.x + 1; x < room.x + room.w - 1; x++) this.boards[y * W + x] = 1;
    }
    // Every sheet this floor draws is painted now, as the level starts, rather than the first time
    // the camera meets a store room's boards or a wall's face mid-run (`FLOOR_SHEET`, a 0.1–0.7 s
    // hitch in the smoke run). The cave draws its own floor and needs none.
    const def = game.level.def;
    if (typeof ART_PASS !== 'undefined' && ART_PASS.floors && this.floorSwatch && !game.world.round) {
      this.floorSwatch(def, 0, false, 0, 0);
      if (this.boards.some((b) => b)) this.floorSwatch(def, 0, true, 0, 0);
      const Wl = PIXEL_ROOMS.wall;
      FLOOR_SHEET.faceStrip(this.swatch(Wl.face, def.wall), 'face' + def.wall, Wl.faceH, 0);
    }
  }

  tile(kind, variant) {
    const key = kind + variant;
    if (this.tiles.has(key)) return this.tiles.get(key);
    const P = PALETTE.altar;
    const c = this.canvas(TILE, TILE, (ctx) => {
      const r = (color, x, y, w, h) => this.rect(ctx, color, x, y, w, h);
      if (kind === 'wood') {
        r(P.woodDark, 0, 0, 32, 32);
        for (let y = 0; y < 32; y += 8) {
          r(P.boards[(variant + y / 8) % P.boards.length], 0, y + 1, 32, 6);
          r(P.woodLight, 1, y + 1, 29, 1);
          const joint = (variant * 7 + y * 3) % 29;
          r(P.woodDark, joint, y, 1, 8);
          r(P.woodGrain, (joint + 7) % 20, y + 4, 10, 1);
          r(P.iron, joint + 2, y + 3, 1, 1);
        }
      } else {
        r(P.mortar, 0, 0, 32, 32);
        r(P.stones[variant % P.stones.length], 1, 1, 30, 29);
        r(P.stoneLight, 3, 1, 26, 1); r(P.stoneEdge, 1, 3, 1, 25);
        r(P.stoneShade, 3, 29, 27, 1); r(P.stoneShade, 30, 4, 1, 24);
        r(P.mortar, 1, 1, 2, 2); r(P.mortar, 29, 28, 2, 2);
        // Quiet clusters, not per-pixel noise; most of the slab stays a single readable color.
        for (let k = 0; k < 7; k++) {
          const h = this.hash(variant, k, 4), x = 4 + h % 23, y = 4 + (h >>> 9) % 22;
          r(k % 3 ? P.stoneFleck : P.stoneShade, x, y, 1 + (h >>> 17) % 3, 1);
        }
        if (variant % 5 === 0) {
          for (let k = 0; k < 5; k++) r(P.crack, 18 - k, 2 + k * 2, 1, 3);
          r(P.stoneLight, 14, 11, 1, 3);
        }
      }
    });
    this.tiles.set(key, c); return c;
  }

  drawTiles(renderer, game, cam) {
    this.prepare(game);
    const ctx = renderer.ctx, wd = game.world, P = PALETTE.altar;
    const { x0, y0, x1, y1 } = renderer.visibleTiles(cam);
    const r = (color, x, y, w, h) => this.rect(ctx, color, x, y, w, h);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const t = wd.tileAt(x, y), px = x * TILE, py = y * TILE, hash = this.hash(x, y, game.level.seed);
      if (t === T.WALL) {
        const n = !wd.isSolid(x, y - 1), s = !wd.isSolid(x, y + 1);
        const w = !wd.isSolid(x - 1, y), e = !wd.isSolid(x + 1, y);
        if (!(n || s || w || e || !wd.isSolid(x - 1, y - 1) || !wd.isSolid(x + 1, y - 1)
          || !wd.isSolid(x - 1, y + 1) || !wd.isSolid(x + 1, y + 1))) continue;
        r(P.outline, px, py, 32, 32);
        r(P.wallBody, px + 1, py + 1, 30, 30);
        for (let row = 0; row < 2; row++) {
          const yy = py + 2 + row * 13, split = row ? 9 + hash % 10 : 31;
          r(P.wallFaces[(hash + row) % 3], px + 2, yy, 28, 11);
          r(P.wallLight, px + 3, yy, 26, 1);
          r(P.wallShade, px + 2, yy + 10, 28, 1);
          r(P.outline, px + split, yy, 1, 11);
          r(P.wallWear, px + 5 + (hash >>> (row * 5)) % 19, yy + 3, 3, 1);
        }
        if (n) r(P.wallLight, px + 2, py + 1, 28, 2);
        if (w) r(P.wallLight, px + 1, py + 3, 2, 24);
        if (e) r(P.wallShade, px + 28, py + 2, 3, 29);
        if (s) {
          r(P.wallShade, px + 1, py + 26, 30, 5); r(P.outline, px + 2, py + 31, 28, 1);
          if (!n && !w && !e && x % 4 === 1 && hash % 3 !== 0) this.banner(ctx, px + 16, py + 5);
        }
        continue;
      }
      if (t === T.PIT) continue;
      const wood = this.boards[y * wd.W + x];
      ctx.drawImage(this.tile(wood ? 'wood' : 'stone', hash % 16), px, py);
      if (wd.isSolid(x, y - 1)) { r(P.shadow, px, py, 32, 5); r(P.deepShadow, px, py, 32, 2); }
      if (wd.isSolid(x - 1, y)) r(P.shadow, px, py + 2, 3, 30);
      if (t === T.HAY) this.straw(ctx, px + 16, py + 16, hash, true);
      else if (t === T.ASH) {
        r(P.ash, px + 4, py + 6, 24, 19);
        for (let k = 0; k < 9; k++) r(P.coal, px + 6 + (hash >>> k) % 20, py + 7 + (hash >>> (k + 3)) % 17, 2, 1);
      } else if (t === T.EXIT) renderer.drawStairs(px, py, x - game.level.exitTile.x0, true, game.level.def);
      else if (t === T.ENTRY) renderer.drawStairs(px, py, x - game.level.entry.x0, false, game.level.def);
      else if (wd.isSolid(x, y - 1) && hash % 4 === 0) {
        // Only tiny floor litter by a wall: no fake crates, food or other apparent interactables.
        if (hash % 3) this.straw(ctx, px + 16, py + 7, hash, false);
        else { r(P.stoneShade, px + 7, py + 5, 5, 3); r(P.stoneEdge, px + 7, py + 5, 4, 1); r(P.stoneShade, px + 22, py + 9, 3, 2); }
      }
    }
  }

  straw(ctx, x, y, seed, full) {
    const P = PALETTE.altar, count = full ? 36 : 7;
    for (let k = 0; k < count; k++) {
      const h = this.hash(seed, k), xx = x - 12 + h % 24, yy = y - (full ? 12 : 3) + (h >>> 8) % (full ? 24 : 7);
      this.rect(ctx, P.straw[k % 3], xx, yy, 2 + (h >>> 16) % 5, 1);
      if (full && k % 2) this.rect(ctx, P.straw[k % 3], xx + 2, yy - 2, 1, 4);
    }
  }

  banner(ctx, x, y) {
    const P = PALETTE.altar, r = (color, xx, yy, w, h) => this.rect(ctx, color, x + xx, y + yy, w, h);
    r(P.outline, -10, -1, 20, 3); r(P.ironHi, -9, -1, 18, 1);
    r(P.clothDark, -8, 2, 16, 22); r(P.cloth, -6, 2, 11, 20);
    r(P.clothHi, -6, 3, 2, 16); r(P.clothDark, 1, 3, 2, 19);
    r(P.cloth, -5, 21, 3, 5); r(P.clothDark, 4, 21, 3, 3);
    r(P.glyph, -1, 7, 2, 9); r(P.glyph, -4, 9, 8, 2);
    r(P.glyph, -4, 7, 1, 2); r(P.glyph, 3, 7, 1, 2);
  }

  sprite(kind, radius) {
    const key = kind + ':' + radius;
    if (this.sprites.has(key)) return this.sprites.get(key);
    const P = PALETTE.altar;
    const c = this.canvas(96, 96, (ctx) => {
      ctx.translate(48, 64);
      const r = (color, x, y, w, h) => this.rect(ctx, color, x, y, w, h);
      const rr = Math.round(radius);
      if (kind === 'crate') {
        r(P.shadow, -rr, rr - 1, rr * 2 + 3, 5);
        r(P.outline, -rr - 1, -rr, rr * 2 + 2, rr * 2);
        r(P.woodDark, -rr, -rr + 1, rr * 2, rr * 2 - 2);
        for (let x = -rr + 2; x < rr - 1; x += 5) {
          r(P.wood, x, -rr + 2, 4, rr * 2 - 5); r(P.woodGrain, x + 1, -rr + 5, 1, rr);
        }
        r(P.woodHi, -rr, -rr, rr * 2, 3); r(P.wood, -rr, rr - 5, rr * 2, 3);
        r(P.woodHi, -rr, -rr + 3, 2, rr * 2 - 6); r(P.iron, -rr, -1, rr * 2, 3);
        for (const x of [-rr + 2, rr - 3]) { r(P.ironHi, x, 0, 1, 1); r(P.ironHi, x, -rr + 1, 1, 1); }
      } else if (kind === 'table') {
        r(P.shadow, -rr, 9, rr * 2 + 5, 13);
        for (const x of [-rr + 3, rr - 6]) { r(P.outline, x, 8, 5, 11); r(P.wood, x + 1, 9, 2, 8); }
        r(P.outline, -rr - 1, -16, rr * 2 + 2, 30); r(P.woodDark, -rr, -15, rr * 2, 27);
        for (let y = -14; y < 10; y += 6) {
          r(P.wood, -rr + 1, y, rr * 2 - 2, 5); r(P.woodHi, -rr + 2, y, rr * 2 - 4, 1);
          r(P.woodGrain, -rr + 5 + (y + 14) % 7, y + 3, rr, 1);
        }
        r(P.woodHi, -rr, -16, rr * 2, 2); r(P.iron, -rr + 2, -12, 2, 2); r(P.iron, rr - 4, -12, 2, 2);
        // A faded cloth strip is part of the tabletop and moves with a thrown table.
        r(P.clothDark, -4, -15, 10, 29); r(P.cloth, -3, -14, 7, 27);
        r(P.glyph, 0, -7, 1, 9); r(P.glyph, -2, -4, 5, 1);
      } else if (kind === 'brazier') {
        r(P.shadow, -rr, 5, rr * 2 + 3, 9);
        for (const x of [-rr + 2, rr - 5]) { r(P.outline, x, 2, 4, 9); r(P.ironHi, x + 1, 3, 1, 5); }
        r(P.outline, -rr + 3, -rr + 1, rr * 2 - 6, rr * 2);
        r(P.outline, -rr, -rr + 5, rr * 2, rr * 2 - 8);
        r(P.iron, -rr + 2, -rr + 5, rr * 2 - 4, rr * 2 - 10);
        r(P.ironHi, -rr + 4, -rr + 2, rr * 2 - 8, 2);
        r(P.coal, -rr + 4, -rr + 5, rr * 2 - 8, rr + 1);
        for (let x = -rr + 5; x < rr - 4; x += 4) r(P.ember, x, -2 + (x & 2), 3, 2);
        r(P.ironHi, -rr + 4, rr - 5, rr * 2 - 8, 2);
      } else if (kind === 'lamp') {
        r(P.shadow, -6, 1, 15, 5); r(P.outline, -5, -2, 10, 5); r(P.iron, -3, -17, 5, 19);
        r(P.ironHi, -3, -17, 1, 17); r(P.outline, -7, -28, 14, 14);
        r(P.woodHi, -5, -27, 10, 11); r(P.coal, -3, -26, 6, 9);
        r(P.ironHi, -6, -16, 12, 2); r(P.iron, -6, -29, 12, 2);
      } else if (kind === 'mill') {
        // A stone wheel with an iron axle, rasterized once on the world-pixel grid.
        for (let y = -rr; y <= rr; y++) for (let x = -rr; x <= rr; x++) {
          const d = Math.hypot(x, y);
          if (d > rr) continue;
          let color = d > rr - 2 ? P.outline : d > rr - 5 ? (y < 0 ? P.stoneLight : P.stoneShade)
            : P.stones[this.hash(Math.floor(x / 5), Math.floor(y / 4)) % 4];
          if (d < 7) color = P.iron; if (d < 4) color = P.outline;
          if (d > 10 && d < rr - 5 && ((x === 0 && y < 0) || (y === 0 && x > 0))) color = P.crack;
          r(color, x, y, 1, 1);
        }
        r(P.ironHi, -2, -4, 4, 1);
      } else if (kind === 'bell') {
        r(P.shadow, -rr, 5, rr * 2 + 3, 9);
        for (const x of [-rr, rr - 2]) { r(P.outline, x - 1, -rr - 8, 5, rr * 2 + 13); r(P.wood, x, -rr - 7, 2, rr * 2 + 10); }
        r(P.woodHi, -rr, -rr - 8, rr * 2, 3); r(P.iron, -1, -rr - 5, 2, 5);
        r(P.outline, -rr + 3, -rr, rr * 2 - 6, rr * 2); r(P.outline, -rr, -rr + 4, rr * 2, rr * 2 - 8);
        r(P.bronzeDark, -rr + 2, -rr + 4, rr * 2 - 4, rr * 2 - 8);
        r(P.bronze, -rr + 4, -rr + 2, rr * 2 - 8, rr * 2 - 4);
        r(P.bronzeHi, -rr + 4, -rr + 3, rr * 2 - 8, 2); r(P.bronzeDark, -4, -4, 9, 9);
        r(P.bronzeHi, -2, -3, 5, 4); r(P.bronzeDark, -rr + 4, rr - 4, rr * 2 - 8, 2);
      }
    });
    this.sprites.set(key, c); return c;
  }

  drawProp(renderer, p) {
    if (p.kind === 'cage') {
      const ctx = renderer.ctx, P = PALETTE.altar, h = TUNING.prop.cage.height;
      const sgn = Math.round(p.x / 7) % 2 ? 1 : -1;
      const lean = (p.hits || 0) * 0.05 * sgn + (p.wobble > 0 ? Math.sin(renderer.t * 62) * 0.06 : 0) + (p.gate || 0) * 1.5;
      ctx.save(); ctx.translate(Math.round(p.x), Math.round(p.y)); ctx.rotate(lean);
      const r = (c, x, y, w, hh) => this.rect(ctx, c, x, y, w, hh);
      if (p.axis === 'h') { r(P.outline, -15, -h + 2, 30, 5); r(P.iron, -15, -h + 3, 30, 3); r(P.ironHi, -15, -h + 3, 30, 1); }
      r(P.outline, -3, -h, 6, h); r(P.iron, -2, -h + 1, 4, h - 1); r(P.ironHi, -2, -h + 1, 1, h - 1);
      r(P.woodDark, -3, -h + 7, 6, 3); r(P.ironHi, -2, -h + 7, 1, 1);
      ctx.restore(); this.rect(ctx, P.outline, p.x - 4, p.y - 2, 8, 5);
      this.rect(ctx, P.iron, p.x - 3, p.y - 2, 6, 2); return true;
    }
    if (!['crate', 'table', 'brazier', 'lamp', 'bell'].includes(p.kind)) return false;
    const ctx = renderer.ctx;
    ctx.save(); ctx.translate(Math.round(p.x), Math.round(p.y - (p.held ? 4 : 0)));
    if (p.flung && (p.kind === 'crate' || p.kind === 'table')) ctx.rotate(Math.atan2(p.vy, p.vx) * (p.kind === 'crate' ? 0.4 : 1));
    if (p.kind === 'bell' && p.rung > 0) ctx.translate(Math.round(Math.sin(renderer.t * 40) * 2), 0);
    ctx.drawImage(this.sprite(p.kind, p.r), -48, -64); ctx.restore();
    if (p.kind === 'brazier') {
      const heat = p.spillCd > 0 ? 0.4 + 0.6 * (1 - p.spillCd / TUNING.prop.brazier.spillCd) : 1;
      this.flame(ctx, p.x, p.y - 6, (12 + 2 * Math.sin(renderer.t * 11 + p.phase)) * heat, renderer.t, p.phase, false);
    } else if (p.kind === 'lamp') this.flame(ctx, p.x, p.y - 22, 7, renderer.t, p.phase, false);
    return true;
  }

  flame(ctx, x, y, size, time, seed, witch) {
    const P = PALETTE.altar, step = Math.floor(time * 9 + seed), h = Math.max(3, Math.round(size * 1.5));
    const r = (c, xx, yy, w, hh) => this.rect(ctx, c, x + xx, y + yy, w, hh);
    const outer = witch ? PALETTE.witch : P.ember, mid = witch ? PALETTE.cult : PALETTE.fire;
    r(outer, -5, -h + 4, 10, h); r(outer, -7, -5, 14, 6);
    r(mid, -4, -h + 2, 7, h); r(mid, -6, -4, 11, 5);
    r(mid, (step % 3) - 2, -h - 3, 3, 7);
    r(witch ? PALETTE.witchHi : PALETTE.fireHi, -2, -Math.round(h * 0.55), 4, Math.round(h * 0.65));
    r(witch ? PALETTE.witchHi : PALETTE.bone, -1, -2, 2, 3);
    if (step % 3 === 0) r(mid, 4, -h - 5, 1, 2);
  }

  doorDetail(ctx, p, w, h) {
    const P = PALETTE.altar;
    const r = (c, x, y, ww, hh) => this.rect(ctx, c, x, y, ww, hh);
    // Called within the original door transform, so opening, hit notches and soul seals still work.
    for (let k = -22; k <= 22; k += 7) {
      if (p.vertical) r(p.iron ? P.ironHi : P.woodGrain, -w / 2 + 2, k, w - 4, 1);
      else r(p.iron ? P.ironHi : P.woodGrain, k, -h / 2 + 2, 1, h - 4);
    }
    for (const k of [-20, 20]) {
      if (p.vertical) { r(P.iron, -w / 2, k, w, 4); r(P.ironHi, -w / 2 + 2, k + 1, 1, 1); }
      else { r(P.iron, k, -h / 2, 4, h); r(P.ironHi, k + 1, -h / 2 + 2, 1, 1); }
    }
  }

  makeRitual(level) {
    const room = level.rooms[0], ox = room.x * TILE, oy = room.y * TILE;
    const sx = level.start.x - ox, sy = level.start.y - oy, P = PALETTE.altar;
    const canvas = this.canvas(room.w * TILE, room.h * TILE, ctx => {
      const r = (c, x, y, w, h) => this.rect(ctx, c, x, y, w, h);
      const C = TUNING.prop.cage;
      for (let k = 0; k < 12; k++) this.straw(ctx, sx - C.halfW * TILE + 16 + (k % 4) * 28,
        sy - C.halfH * TILE + 14 + Math.floor(k / 4) * 24, k * 7, false);
      const ax = sx - 4 * TILE, ay = sy - 0.2 * TILE;
      // A low stone altar with a worn red runner, straps and three guttered candles.
      r(P.shadow, ax - 48, ay + 15, 101, 15);
      r(P.outline, ax - 48, ay - 26, 96, 51); r(P.wallShade, ax - 45, ay + 14, 90, 12);
      r(P.stoneShade, ax - 47, ay - 24, 94, 44); r(P.stoneLight, ax - 46, ay - 24, 92, 3);
      r(P.stones[2], ax - 44, ay - 20, 88, 34); r(P.stoneEdge, ax - 44, ay - 19, 2, 31);
      r(P.crack, ax + 28, ay - 20, 1, 8); r(P.crack, ax + 26, ay - 13, 2, 1);
      r(P.clothDark, ax - 11, ay - 25, 23, 50); r(P.cloth, ax - 9, ay - 24, 18, 47);
      r(P.clothHi, ax - 8, ay - 21, 2, 41); r(P.glyph, ax - 1, ay - 9, 2, 19);
      r(P.glyph, ax - 7, ay - 6, 14, 2); r(P.glyph, ax - 7, ay - 11, 2, 5); r(P.glyph, ax + 5, ay - 11, 2, 5);
      for (const dx of [-30, 29]) {
        r(P.woodDark, ax + dx, ay - 20, 4, 34); r(P.woodHi, ax + dx + 1, ay - 7, 3, 3);
      }
      for (const [dx, dy, h] of [[-38, -16, 10], [-29, -17, 7], [36, -16, 13]]) {
        r(P.outline, ax + dx - 3, ay + dy + 2, 7, 3);
        r(P.glyph, ax + dx - 2, ay + dy - h, 5, h + 3);
        r(PALETTE.bone, ax + dx - 2, ay + dy - h, 2, h); r(P.ember, ax + dx - 1, ay + dy - h - 5, 3, 5);
        r(PALETTE.fireHi, ax + dx, ay + dy - h - 6, 1, 5);
      }
      // A compact bone pile and old stains, clearly scenery rather than another living animal.
      const bx = sx - 4.9 * TILE, by = sy + 1.7 * TILE;
      r(P.clothDark, bx - 22, by - 9, 55, 20); r(P.clothDark, bx - 16, by - 13, 37, 28);
      r(P.glyph, bx - 9, by - 1, 36, 3);
      for (let k = 0; k < 6; k++) { r(PALETTE.bone, bx - 4 + k * 5, by - 9, 2, 16); r(P.glyph, bx - 3 + k * 5, by - 6, 2, 12); }
      r(P.glyph, bx - 20, by - 6, 12, 9); r(PALETTE.bone, bx - 20, by - 6, 10, 3);
      r(P.outline, bx - 16, by - 3, 3, 3); r(P.glyph, bx - 24, by - 3, 6, 5);
      r(P.glyph, bx - 16, by - 12, 2, 7); r(P.glyph, bx - 14, by - 13, 5, 2);
      const dx = sx - 4 * TILE, dy = sy - 2.1 * TILE;
      r(P.clothDark, dx - 24, dy - 5, 51, 14);
      r(P.wood, dx - 20, dy, 12, 4); r(P.ironHi, dx - 9, dy - 4, 18, 11); r(PALETTE.bone, dx - 9, dy - 4, 18, 1);
      r(P.wood, dx + 14, dy + 8, 7, 3); r(P.ironHi, dx + 21, dy + 8, 15, 2);
      // The second pen still contains the previous sacrifice.
      const D = TUNING.prop.deadCage, cx = sx + D.dx * TILE, cy = sy + D.dy * TILE;
      r(P.clothDark, cx - 20, cy - 4, 42, 17);
      for (const x of [-12, -5, 5, 12]) r(P.woodDark, cx + x, cy + 1, 2, 13);
      r(P.glyph, cx - 17, cy - 8, 31, 14); r(PALETTE.bone, cx - 16, cy - 8, 28, 5);
      r(P.stoneShade, cx + 13, cy - 11, 10, 9); r(P.outline, cx + 19, cy - 8, 2, 2);
      for (let k = 0; k < 5; k++) r(PALETTE.bone, cx - 15 + k * 6, cy - 10, 4, 3);
    });
    return { canvas, x: ox, y: oy };
  }
}
