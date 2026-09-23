// The art layer over the primitive renderer: room floors and walls out of the pixel swatches, every
// unit through `character()` (a pixel sprite in a frame of leans, collar and wounds), and the few
// painted props no pixel sprite exists for yet. Collision radii never read any of it.
// `propsAtlas` in js/painted-assets.js — four columns, four rows, 128px cells.
const ATLAS_CELL = {
  'cage-bars': [0, 0], 'cage-broken': [128, 0], 'mill-hub': [256, 0], 'mill-arm': [384, 0],
  'spikes-idle': [0, 128], 'spikes-arming': [128, 128], 'spikes-up': [256, 128], 'weapon-stand': [384, 128],
  sword: [0, 256], shield: [128, 256], 'healing-grass': [256, 256], 'soul-wisp': [384, 256],
  'secret-wall': [0, 384], 'crate-debris': [128, 384], 'brazier-unlit': [256, 384], worktable: [384, 384],
};
// How far below a tile's centre a thing standing on that tile puts its feet: the middle of the tile
// in a camera tilted this little, not its bottom or top edge.
const PROP_FOOT = 3;

class PaintedArt extends AltarArt {
  constructor() {
    super(); this.images = {}; this.loaded = 0; this.failed = [];
    const entries = Object.entries(PAINTED_ASSETS);
    this.ready = false;
    for (const [key, asset] of entries) {
      const image = new Image(); this.images[key] = image;
      image.onload = () => { this.loaded++; this.ready = this.loaded === entries.length; };
      image.onerror = () => { this.failed.push(key); console.error('Art asset failed:', key); };
      image.src = asset.src;
    }
  }

  stamp(ctx, key, x, y, w, h, anchor = 0.5) {
    const image = this.images[key]; if (!image || !image.naturalWidth) return;
    if (h === undefined) h = w * image.naturalHeight / image.naturalWidth;
    const smooth = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(image, x - w / 2, y - h * anchor, w, h);
    ctx.imageSmoothingEnabled = smooth;
  }

  // Crops one cell out of a sprite sheet — the shared primitive under every animated stamp below,
  // used for the expansion pack's walk cycles, fire loops, door states and props atlas.
  drawFrame(ctx, image, sx, sy, sw, sh, x, y, w, h, anchor = 0.5) {
    if (!image || !image.naturalWidth) return false;
    const smooth = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(image, sx, sy, sw, sh, x - w / 2, y - h * anchor, w, h);
    ctx.imageSmoothingEnabled = smooth;
    return true;
  }

  // objects/atlas.png: one 128px cell per named prop. `h` defaults to `w` — every cell is square.
  atlas(ctx, name, x, y, w, h, anchor = 0.5) {
    const cell = ATLAS_CELL[name]; if (!cell) return false;
    return this.drawFrame(ctx, this.images.propsAtlas, cell[0], cell[1], 128, 128, x, y, w, h === undefined ? w : h, anchor);
  }

  // The three lit fixtures each get one 8-frame, 10fps loop: the whole fixture animates in the
  // sheet, so nothing else is drawn under it.
  fire(renderer, key, x, y, w, anchor = 0.875) {
    const col = Math.floor(renderer.t * 10) % 8;
    return this.drawFrame(renderer.ctx, this.images[key], col * 128, 0, 128, 128, x, y, w, w, anchor);
  }

  // The mill arm's source art is one fixed-proportion beam, not a tileable strip, so it is stretched
  // to the tuned arm length rather than repeated. `x` is the inner edge (by the hub), `len` the span
  // out to the iron tip; height is cosmetic only — collision stays on `TUNING.mill`, untouched.
  millArm(ctx, x, len) {
    const image = this.images.propsAtlas; if (!image || !image.naturalWidth) return false;
    const cell = ATLAS_CELL['mill-arm'];
    const smooth = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = true;
    ctx.drawImage(image, cell[0], cell[1], 128, 128, x, -15, len, 30);
    ctx.imageSmoothingEnabled = smooth;
    return true;
  }

  // A pixel swatch multiplied by one of the level's colours, baked once into a canvas of its own:
  // multiplying per tile per frame doubled the cost of every floor.
  swatch(id, tint) {
    this.swatches ||= new Map();
    const key = id + tint; let c = this.swatches.get(key); if (c) return c;
    const f = PIXEL_ENV_ASSETS.items[id]; c = document.createElement('canvas'); c.width = f[2]; c.height = f[3];
    const x = c.getContext('2d'); x.drawImage(PIXEL_ENV.image, f[0], f[1], f[2], f[3], 0, 0, f[2], f[3]);
    x.globalCompositeOperation = 'multiply'; x.fillStyle = PIXEL_ENV.lift(tint, PIXEL_ROOMS.lift); x.fillRect(0, 0, f[2], f[3]);
    this.swatches.set(key, c); return c;
  }
  rooms(def) { return PIXEL_ROOMS[def.canon && def.canon.id] || PIXEL_ROOMS.stone; }
  floorSwatch(def, h, boards) {
    const R = this.rooms(def);
    return this.swatch(boards ? R.boards : R.floor[(h >>> 4) % R.floor.length], (h >>> 9) % 5 ? def.floor : def.floorAlt || def.floor);
  }

  // Bits name the exposed sides, not the room edge: N=1, E=2, S=4, W=8.
  // The camera looks north and down, so a wall shows its brick face on ONE side only: the south
  // one, facing the lens. That is the far wall of a room (and the front of any pillar) — the cap
  // on top, then a coursed face down to the boards. Every other exposed side is only the edge of
  // the cap: the near wall faces away from the lens and the side walls run along its line of sight.
  // Cap and face are the pixel swatches `PIXEL_ROOMS.wall` names, in the level's `wallTop` / `wall`.
  wallTile(def, mask) {
    this.wallTiles ||= new Map();
    const key = def.wall + def.wallTop + mask;
    if (this.wallTiles.has(key)) return this.wallTiles.get(key);
    const tile = document.createElement('canvas'); tile.width = tile.height = 128;
    // A face that turns a corner (floor to its east or west as well) is a pillar or a stub and gets
    // the shorter band: a tall one on every free-standing block read as a slab lying on the boards.
    const pillar = (mask & 4) && (mask & 10), c = tile.getContext('2d'), face = pillar ? 58 : 70, edge = 5;
    const W = PIXEL_ROOMS.wall, top = this.swatch(W.top, def.wallTop), brick = this.swatch(W.face, def.wall);
    c.imageSmoothingEnabled = true;
    c.drawImage(top, 0, 0, 128, 128);
    // the cap's rim where it meets open floor on the three sides that show no face
    c.fillStyle = 'rgba(8,5,10,0.6)';
    if (mask & 1) c.fillRect(0, 0, 128, edge);
    if (mask & 2) c.fillRect(128-edge, 0, edge, 128);
    if (mask & 8) c.fillRect(0, 0, edge, 128);
    c.fillStyle = 'rgba(225,203,180,0.18)';
    if (mask & 1) c.fillRect(0, edge, 128, 3);
    if (mask & 8) c.fillRect(edge, 0, 3, 128);
    // A side wall shows a narrow sliver of its face on the one side that looks into the room: the
    // camera sees it nearly edge on, but without it the side walls read as flat troughs of cap.
    const sideE = mask & 2, sideW = !sideE && (mask & 8);
    if (sideE || sideW) {
      const band = 34, bot = (mask & 4) ? 128 - face : 128, x0 = sideE ? 128 - band : 0;
      c.save(); c.beginPath(); c.rect(x0, 0, band, bot); c.clip();
      c.drawImage(brick, x0 - 47, 0, 128, 128);
      const g = c.createLinearGradient(sideE ? x0 : band, 0, sideE ? 128 : 0, 0);
      g.addColorStop(0, 'rgba(10,7,12,0.02)'); g.addColorStop(1, 'rgba(10,7,12,0.22)');
      c.fillStyle = g; c.fillRect(x0, 0, band, bot);
      c.restore();
      // the lit lip of the cap along the band, and the seam where it meets the boards
      c.fillStyle = 'rgba(225,203,180,0.28)'; c.fillRect(sideE ? x0 - 3 : band, 0, 3, bot);
      c.fillStyle = 'rgba(8,5,10,0.55)'; c.fillRect(sideE ? x0 : band - 3, 0, 3, bot);
      c.fillStyle = 'rgba(8,5,10,0.5)'; c.fillRect(sideE ? 124 : 0, 0, 4, bot);
    }
    if (mask & 4) {
      const top = 128 - face;
      c.save(); c.beginPath(); c.rect(0, top, 128, face); c.clip();
      c.drawImage(brick, 0, top, 128, 128);
      // darker toward the foot, where the floor's own shadow takes it
      const g = c.createLinearGradient(0, top, 0, 128);
      g.addColorStop(0, 'rgba(10,7,12,0.05)'); g.addColorStop(1, 'rgba(10,7,12,0.35)');
      c.fillStyle = g; c.fillRect(0, top, 128, face);
      c.restore();
      // the lit lip of the cap, then the mortar line under it, then the foot
      c.fillStyle = 'rgba(225,203,180,0.28)'; c.fillRect(0, top - 3, 128, 3);
      c.fillStyle = 'rgba(8,5,10,0.55)'; c.fillRect(0, top, 128, 4);
      c.fillStyle = 'rgba(8,5,10,0.5)'; c.fillRect(0, 124, 128, 4);
      // a face that turns a corner shows it: a dark seam where it meets open floor at the side
      c.fillStyle = 'rgba(8,5,10,0.45)';
      if (mask & 2) c.fillRect(128-edge, top, edge, face);
      if (mask & 8) c.fillRect(0, top, edge, face);
    }
    this.wallTiles.set(key,tile); return tile;
  }

  drawWall(ctx, def, x, y, mask) {
    ctx.drawImage(this.wallTile(def,mask),x,y,TILE,TILE);
  }

  drawTiles(renderer, game, cam) {
    this.prepare(game);
    const ctx = renderer.ctx, wd = game.world, b = renderer.visibleTiles(cam), def = game.level.def;
    const smooth = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = true;
    for (let y=b.y0; y<=b.y1; y++) for (let x=b.x0; x<=b.x1; x++) {
      const t=wd.tileAt(x,y), px=x*TILE, py=y*TILE, h=this.hash(x,y,game.level.seed);
      if (t===T.WALL) {
        const n=!wd.isSolid(x,y-1),s=!wd.isSolid(x,y+1),w=!wd.isSolid(x-1,y),e=!wd.isSolid(x+1,y);
        if (!(n||s||w||e||!wd.isSolid(x-1,y-1)||!wd.isSolid(x+1,y-1)||!wd.isSolid(x-1,y+1)||!wd.isSolid(x+1,y+1))) continue;
        // A wall tile with floor on all four sides is a template's `P`, a pillar standing in the room,
        // and it is drawn as one rather than as a cube of the room's wall. It runs up over the tile
        // behind it, which this row-by-row pass has already drawn, so nothing paints over its top.
        if (n&&s&&w&&e) {
          ctx.drawImage(this.floorSwatch(def,h,false),px,py,TILE,TILE);
          renderer.shadow(px+16,py+27,13,5);
          PIXEL_ENV.draw(ctx,'pillar',px+16,py+31,27);
          continue;
        }
        this.drawWall(ctx,def,px,py,(n?1:0)|(e?2:0)|(s?4:0)|(w?8:0));
        if (s&&x%5===1&&h%3!==0&&!w&&!e) this.stamp(ctx,'banner',px+16,py+18,13,17,0.2);
        continue;
      }
      if (t===T.PIT) continue;
      const wood=this.boards[y*wd.W+x];
      ctx.drawImage(this.floorSwatch(def,h,wood),px,py,TILE,TILE);
      ctx.fillStyle=PALETTE.altar.shadow;
      if(wd.isSolid(x,y-1))ctx.fillRect(px,py,32,5);
      if(wd.isSolid(x-1,y))ctx.fillRect(px,py,3,32);
      if(t===T.HAY)PIXEL_ENV.draw(ctx,'hay',px+16,py+29,33);
      else if(t===T.FLOOR&&!wood&&!wd.isSolid(x,y-1))PIXEL_ENV.litter(ctx,'room',x,y);
      else if(t===T.ASH){ctx.fillStyle=PALETTE.altar.ash;ctx.globalAlpha=0.6;ctx.fillRect(px+3,py+5,26,23);ctx.globalAlpha=1;}
      else if(t===T.EXIT)renderer.drawStairs(px,py,x-game.level.exitTile.x0,true,game.level.def);
      else if(t===T.ENTRY)renderer.drawStairs(px,py,x-game.level.entry.x0,false,game.level.def);
      else if(wd.isSolid(x,y-1)&&h%5===0)this.straw(ctx,px+16,py+6,h,false);
    }
    ctx.imageSmoothingEnabled = smooth;
  }

  drawRitual(renderer, game) {
    const ctx=renderer.ctx, wd=game.world, R=game.level.rooms[0];
    // The stone base, candles and the two earlier sacrifices' bones are the procedural layer
    // underneath. Bones, not ghost sheep. The altar itself is a real Prop now — see drawProp — and
    // draws in its own turn through the ordinary prop pass, not here.
    if (wd.ritualArt) ctx.drawImage(wd.ritualArt.canvas, wd.ritualArt.x, wd.ritualArt.y);
    // Room-edge storage is inset into the solid wall band, never an invisible obstacle on a path.
    const yy=(R.y+0.7)*TILE;
    PIXEL_ENV.draw(ctx,'barrel',(R.x+1.4)*TILE,yy+9,22);
    PIXEL_ENV.draw(ctx,'hay',(R.x+2.4)*TILE,yy+14,35);
  }

  drawProp(renderer,p) {
    if(!this.ready)return super.drawProp(renderer,p);
    const ctx=renderer.ctx;
    // The ritual altar: a real, blocking, breakable table tagged only so it keeps its own art
    // instead of the plain procedural table every other one falls back to.
    if(p.kind==='table'&&p.isAltar){
      ctx.save();ctx.translate(p.x,p.y);
      if(p.flung)ctx.rotate(Math.atan2(p.vy,p.vx));
      renderer.shadow(0,8,48,15);
      this.stamp(ctx,'altar',0,0,108,undefined,0.58);
      ctx.restore();return true;
    }
    // Lit fixtures: the whole fixture is an animated loop now, so the old static bowl/post is gone.
    if(p.kind==='brazier'&&p.roast){renderer.drawRoast(p);return true;}
    // The pixel brazier's coals are painted in, so only the flame over them moves; it still drops
    // when the coals are knocked out and builds back, which is how the bowl says when it is ready.
    if(p.kind==='brazier'&&PIXEL_ENV.ready){
      const w=p.r*2.7;
      // Standing in the middle of its tile: the feet on the tile's centre, not on its bottom edge.
      const foot=p.y+PROP_FOOT;
      // A soft pool gathered under the three feet, not the hard disc every body stands on: the bowl
      // is the light in the room, so what is under it is small, and a wide flat ellipse lit orange by
      // its own fire read as a plate the brazier was standing on.
      const sr=w*0.24,sg=ctx.createRadialGradient(p.x,foot-1,0,p.x,foot-1,sr);
      sg.addColorStop(0,'rgba(0,0,0,0.42)');sg.addColorStop(0.6,'rgba(0,0,0,0.2)');sg.addColorStop(1,'rgba(0,0,0,0)');
      ctx.save();ctx.translate(p.x,foot-1);ctx.scale(1,0.34);ctx.translate(-p.x,-(foot-1));
      ctx.fillStyle=sg;ctx.beginPath();ctx.arc(p.x,foot-1,sr,0,Math.PI*2);ctx.fill();ctx.restore();
      const h=PIXEL_ENV.draw(ctx,'brazier',p.x,foot,w);
      const heat=p.spillCd>0?0.4+0.6*(1-p.spillCd/TUNING.prop.brazier.spillCd):1;
      renderer.flame(p.x,foot-h*0.72,(9+2.5*Math.sin(renderer.t*11+p.phase))*heat,p.phase*10);
      return true;
    }
    if(p.kind==='lamp'){
      const w=34;
      // On the middle of its tile: it used to stand ten pixels up, on the tile's top edge. The sprite
      // is anchored at 0.875, so its base sits a shade under the translated origin.
      ctx.save();ctx.translate(p.x,p.y+PROP_FOOT-4);
      renderer.shadow(0,2.5,8,4);
      this.fire(renderer,'lanternFire',0,0,w);
      ctx.restore();return true;
    }
    // The two already-painted, level-agnostic objects: same art, no longer level-one only.
    if(p.kind==='crate'&&PIXEL_ENV.ready){
      const w=p.r*2.7;
      ctx.save();ctx.translate(p.x,p.y-(p.held?6:0));
      if(p.flung)ctx.rotate(Math.atan2(p.vy,p.vx)*0.4);
      renderer.shadow(0,p.r*0.7,w*0.44,6);
      PIXEL_ENV.draw(ctx,'crate',0,p.r*0.9,w);
      ctx.restore();return true;
    }
    // The barrel is the pixel one the ritual room already stands against its wall; a blow rocks it,
    // and one that has taken a blow wears a split stave until the second one opens it.
    if(p.kind==='barrel'&&PIXEL_ENV.ready){
      const w=p.r*2.3;
      ctx.save();ctx.translate(p.x,p.y+PROP_FOOT);
      if(p.wobble>0)ctx.rotate(Math.sin(renderer.t*48)*0.07*p.wobble/0.3);
      renderer.shadow(0,0,w*0.42,5);
      const h=PIXEL_ENV.draw(ctx,'barrel',0,2,w);
      if(p.hits>0){ctx.strokeStyle='rgba(20,12,8,0.85)';ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(-2,-h*0.75);ctx.lineTo(1,-h*0.45);ctx.lineTo(-1,-h*0.18);ctx.stroke();}
      ctx.restore();return true;
    }
    if(p.kind==='bell'){
      const w=p.r*2.7,img=this.images.gong;
      ctx.save();ctx.translate(p.x,p.y);
      if(p.rung>0)ctx.rotate(Math.sin(renderer.t*28)*0.035);
      const h=w*img.naturalHeight/img.naturalWidth;
      renderer.shadow(0,3,w*0.44,Math.min(9,h*0.15));
      this.stamp(ctx,'gong',0,0,w,h,0.68);
      ctx.restore();return true;
    }
    if(p.kind==='table'){
      const a=p.flung?Math.atan2(p.vy,p.vx):0;
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(a);
      renderer.shadow(0,p.r*0.6,p.r*1.05,p.r*0.5);
      const drew=PIXEL_ENV.ready?PIXEL_ENV.draw(ctx,'table',0,p.r*0.75,p.r*2.7):0;
      ctx.restore();
      return drew?true:super.drawProp(renderer,p);
    }
    if(p.kind==='cage'&&this.images.cagePostTight?.naturalWidth){
      const h=TUNING.prop.cage.height,sgn=Math.round(p.x/7)%2?1:-1;
      const lean=(p.hits||0)*0.05*sgn+(p.wobble>0?Math.sin(renderer.t*62)*0.06:0)+(p.gate||0)*1.5;
      renderer.shadow(p.x,p.y,5,3);
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(lean);
      // The connecting rail belongs to the assembled fence; the art contains just one post.
      if(p.axis==='h'){ctx.fillStyle='#3c3730';ctx.fillRect(-15,-h+3,30,4);ctx.fillStyle='#6a635b';ctx.fillRect(-15,-h+3,30,1.5);}
      this.stamp(ctx,'cagePostTight',0,0,7,h,1);ctx.restore();return true;
    }
    if(p.kind==='chicken'&&PIXEL_ART.ready){
      const flying=p.birdState==='flying',stunned=p.birdState==='stunned';
      if(Math.hypot(p.vx||0,p.vy||0)>2)p.artFacing=Math.atan2(p.vy,p.vx);
      const angle=p.artFacing??Math.PI/4;
      renderer.shadow(p.x,p.y,8,3.5);ctx.save();ctx.translate(p.x,p.y);
      if(stunned)ctx.rotate(Math.PI*0.4);
      if(flying){ctx.save();ctx.rotate(angle);ctx.fillStyle='rgba(232,221,200,0.3)';for(let k=1;k<=3;k++)ctx.fillRect(-k*7,-2,4,2);ctx.restore();}
      this.character(renderer,{facing:angle},'chicken',28);ctx.restore();
      if(stunned)renderer.drawStars(p.x,p.y,14,Math.min(1,p.birdT*2));return true;
    }
    if(p.kind==='weapon'){
      if(!this.images.propsAtlas||!this.images.propsAtlas.naturalWidth)return super.drawProp(renderer,p);
      const up=p.inStand;
      if(up){
        const gl=ctx.createRadialGradient(p.x,p.y-12,0,p.x,p.y-12,40);
        const a=0.14+0.05*Math.sin(renderer.t*2.6+p.phase);
        gl.addColorStop(0,`rgba(239,230,208,${a})`);gl.addColorStop(1,'rgba(239,230,208,0)');
        ctx.fillStyle=gl;ctx.beginPath();ctx.arc(p.x,p.y-12,40,0,Math.PI*2);ctx.fill();
        renderer.shadow(p.x,p.y,14,6);
        this.atlas(ctx,'weapon-stand',p.x,p.y,44,undefined,0.78);
      } else renderer.shadow(p.x,p.y,10,5);
      ctx.save();
      ctx.translate(p.x,p.y-(up?24:0));
      ctx.rotate(up?(p.weapon==='sword'?-Math.PI/2:0):p.flung?p.spin:(p.facing||0));
      // One size, whatever it is doing: racked, lying or in his mouth. It used to draw bigger on the
      // stand than anywhere else it is ever seen, which read as the object changing size the moment
      // you took it rather than as the same blade wherever it is.
      this.atlas(ctx,p.weapon,0,0,p.weapon==='sword'?24:22*TUNING.prop.weapon.shieldScale,undefined,0.5);
      ctx.restore();
      // What is left in a shield you are carrying: three studs, one per man or bullet it has in it.
      if(p.weapon==='shield'&&p.held&&p.uses>0){
        const n=TUNING.prop.weapon.uses.shield;
        for(let k=0;k<n;k++){
          ctx.fillStyle=k<p.uses?PALETTE.bone:'rgba(239,230,208,0.22)';
          ctx.fillRect(p.x-(n*5-2)/2+k*5,p.y-30,3.2,3.2);
        }
      }
      return true;
    }
    if(p.kind==='heal'){
      // Only the rarer, bigger patch — the one a secret sometimes gives up — is painted; the
      // ordinary sprout a level's own rhythm hands out has no atlas art of its own yet and falls
      // back to the smaller primitive tuft `Renderer.drawProp` draws.
      if(!p.big||!this.images.propsAtlas||!this.images.propsAtlas.naturalWidth)return super.drawProp(renderer,p);
      // v2's tighter, static 23px patch (brief item F) tested as too quiet to read as a heal spot in
      // a moving crowd — reverted to the original atlas stamp: bigger, with its own shadow and a slow
      // bob, so it still finds the eye the way the wisp or a lamp's firelight does.
      const bob=Math.sin(renderer.t*2.4+p.phase)*2;
      renderer.shadow(p.x,p.y+4,11,5);
      this.atlas(ctx,'healing-grass',p.x,p.y+bob,44,undefined,0.72);
      if(p.graze>0){
        const frac=clamp(p.graze/TUNING.prop.heal.grazeTime,0,1);
        ctx.strokeStyle='rgba(168,189,108,0.85)';ctx.lineWidth=2.4;ctx.lineCap='round';
        ctx.beginPath();ctx.arc(p.x,p.y+bob,17,-Math.PI/2,-Math.PI/2+frac*Math.PI*2);ctx.stroke();
      }
      return true;
    }
    if(p.kind==='spike'){
      if(!this.images.propsAtlas||!this.images.propsAtlas.naturalWidth)return super.drawProp(renderer,p);
      const S=TUNING.prop.spike,r=p.r,state=p.spikeState,arming=state==='armed';
      const shud=arming?Math.sin(renderer.t*70)*1.1*clamp(1-p.spikeT/S.arm,0,1):0;
      // Down still shows teeth (it is retracting, not safe yet); idle and rest share the flat plate.
      const name=state==='up'||state==='down'?'spikes-up':arming?'spikes-arming':'spikes-idle';
      ctx.save();ctx.translate(p.x+shud,p.y);
      // A whole tile, squashed like the floor — see the spike branch in AltarArt/Renderer for why.
      this.atlas(ctx,name,0,0,r*2.2,r*2.2*TILT,0.5);
      ctx.restore();
      return true;
    }
    if(p.kind==='bomb'){
      // No painted asset for this one — a rare find drawn plainly, primitive on purpose: a dark
      // shell and a fuse that shortens and sparks faster the closer it is to going off, which is
      // the whole of how a player who has never seen one before reads "this is about to go off."
      const armed=p.fuseT>=0, pct=armed?clamp(p.fuseT/TUNING.prop.bomb.fuse,0,1):1;
      renderer.shadow(p.x,p.y,p.r*0.9,p.r*0.4);
      ctx.save();ctx.translate(p.x,p.y-(p.held?6:0));
      if(p.flung)ctx.rotate(Math.atan2(p.vy,p.vx)*0.3);
      ctx.fillStyle='#1c1a1e';ctx.beginPath();ctx.arc(0,0,p.r,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#332e33';ctx.beginPath();ctx.arc(-p.r*0.28,-p.r*0.28,p.r*0.4,0,Math.PI*2);ctx.fill();
      const fuseLen=4*pct+2;
      ctx.strokeStyle='#5a4a3a';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(0,-p.r);ctx.lineTo(p.r*0.3,-p.r-fuseLen);ctx.stroke();
      if(armed){
        const spark=0.5+0.5*Math.sin(renderer.t*(20+40*(1-pct)));
        ctx.fillStyle=`rgba(255,180,90,${0.6+0.4*spark})`;
        ctx.beginPath();ctx.arc(p.r*0.3,-p.r-fuseLen,2.2+1.4*spark,0,Math.PI*2);ctx.fill();
      }
      ctx.restore();return true;
    }
    if(p.kind==='secret'){
      // The sealed niche must share the same facing as the surrounding room wall.
      this.drawWall(ctx,renderer.game.level.def,p.x-TILE/2,p.y-TILE/2,p.wallSide==='up'?4:1);
      // The crack tells still have to be drawn: the art carries none, and they're what the blow count
      // reads as (see `Renderer.wallCrack` / CLAUDE.md's "A wall that gives").
      renderer.wallCrack(p.x,p.y,p.hits||0);
      return true;
    }
    return false;
  }

  // The wisp's painted body: `Renderer.soulWisp` keeps its own halo (before) and orbiting sparks
  // (after) procedural — those are what read as motion, and the art has no frames to animate them.
  soulWispBody(ctx, w) {
    return this.atlas(ctx, 'soul-wisp', 0, 0, w, undefined, 0.56);
  }

  characterKey(e) { if(e.kind==='ratogre')return 'ratogre'; return e.kind==='bearer'?(e.champion?'brute':'clubman'):e.kind==='seer'?'mage':e.kind==='dog'?'hound':['hunter','wraith','butcher'].includes(e.kind)?e.kind:null; }

  // The art is a top-down slab at the collision footprint, with no frame or square padding.
  doorSlab(ctx,p,wdt,hgt) {
    const type=p.gate?'Soul':p.vault?'Vault':p.iron?'Iron':'Wood',key='slab'+type+'Closed';
    if(!this.images[key]?.naturalWidth)return false;
    ctx.save();if(!p.vertical)ctx.rotate(Math.PI/2);
    this.stamp(ctx,key,0,0,13,58);ctx.restore();return true;
  }

  brokenPost(game,p) {
    if(!this.images.cageBrokenTight?.naturalWidth)return;
    const ctx=game.world.dctx;ctx.save();ctx.globalAlpha=0.8;
    this.stamp(ctx,'cageBrokenTight',p.x,p.y,22,7,0.5);ctx.restore();
  }

  brokenDoor(game,p) {
    const type=p.gate?'Soul':p.vault?'Vault':p.iron?'Iron':'Wood',image=this.images['slab'+type];
    if(!image?.naturalWidth)return;
    const ctx=game.world.dctx;ctx.save();ctx.translate(p.x,p.y);if(!p.vertical)ctx.rotate(Math.PI/2);
    ctx.globalAlpha=0.75;this.drawFrame(ctx,image,384,0,128,128,0,0,64,64);ctx.restore();
  }

  // Every unit is a pixel sprite now (`PIXEL_ART`); what is left here is the lean of a windup or a
  // swing, the tip of a man on the floor, the wraith's fade and the rat ogre's grow-in.
  character(renderer,e,key,width) {
    const ctx=renderer.ctx, angle=e.facing||0, moving=Math.hypot(e.vx||0,e.vy||0)>30;
    const pixel=PIXEL_ART.unit(key); if(!pixel)return;
    ctx.save();
    if(key==='ratogre'&&e.state==='emerge'){const k=1-Math.max(0,e.timer)/TUNING.ratogre.emerge;ctx.scale(0.4+0.6*k,0.4+0.6*k);ctx.globalAlpha*=0.5+0.5*k;}
    if(key==='wraith'){
      const born=e.state==='manifest'?1-Math.max(0,e.timer)/TUNING.wraith.manifest:(e.ghosted?0:1);
      ctx.globalAlpha*=0.35+born*0.65;const puff=1.12-born*0.12;ctx.scale(puff,puff);
    }
    if(e.state==='windup'||e.state==='chargewind'||e.state==='slamwind'){ctx.translate(Math.cos(angle)*-2,Math.sin(angle)*-2);ctx.rotate(-0.13);}
    if(e.state==='swing'){ctx.translate(Math.cos(angle)*3,Math.sin(angle)*3);ctx.rotate(0.17);}
    if(e.state==='dart'){ctx.scale(1.17,0.85);ctx.strokeStyle=PALETTE.bone;ctx.globalAlpha*=0.45;ctx.beginPath();ctx.moveTo(-width*0.4,5);ctx.lineTo(-width*0.7,5);ctx.stroke();ctx.globalAlpha/=0.45;}
    if(e.state==='floored'||e.state==='stunned')ctx.rotate(0.7);
    PIXEL_ART.draw(ctx,pixel,angle,moving,renderer.t,e.x);
    // His horns as the butt souls have made them, in the same lean as the frame (`drawGoat` sets it).
    if(key==='sheep'&&this.hornMods)PIXEL_ART.horns(ctx,pixel,angle,moving,renderer.t,e.x,this.hornMods);
    ctx.restore();
  }

  // A cord round the neck with the talisman hanging off it, placed off the facing: the neck of the
  // eight-way sheep sits a little way toward the head from the cell's centre, and the pendant hangs
  // toward the camera from there. One drawing per artifact (`Renderer.artifactIcon`), small.
  // A charm knotted into the wool at the back of his neck, not a pendant at his throat: the sheep
  // sheet already paints a bell there (the one he was born with — see `CLAUDE.md`), and stacking a
  // second small ornament on the exact same few pixels buried the talisman under it rather than
  // beside it. `-cx` puts the charm behind him the same way `+cx` is his own nose: opposite
  // whichever of the eight painted facings is on screen, which is the one spot this sprite was
  // actually checked, facing by facing, to be open fur rather than the bell, the face or the tail.
  collar(renderer,g,art) {
    const ctx=renderer.ctx,a=g.facing,cx=Math.cos(a),sy=Math.sin(a);
    // The pixel goat has no bell: the charm hangs at his throat on a cord, per facing (`PIXEL_NECK`).
    if(PIXEL_ART.unit('sheep')){
      // One collar for every talisman, turned with him; only the pendant changes. It is a ring round
      // the neck seen from the camera: an ellipse whose short axis lies along the way he faces
      // (squashed to a band on a side view, opened to a curve under the chin from the front), and
      // only its near half is drawn — the half toward the camera — because the rest is behind his
      // neck. It was one fixed smile of cord at every facing, which lay across the neck like a
      // mouth on the side views. Its front sits on the throat point `PIXEL_NECK` measured.
      const d=(Math.round(a/(Math.PI/4))+14)%8,[nx,ny]=PIXEL_NECK[d],back=d>=3&&d<=5,C=TUNING.goat.collar;
      const col=(ARTIFACTS.find((x)=>x.id===art.id)||{}).color||PALETTE.bone;
      const fa=(d+2)*(Math.PI/4);                    // the facing this frame was drawn at
      // A diagonal frame shows the head nearly side-on, so the ring turns further toward a side view
      // than the world angle says (`C.flat` on the vertical part of the facing).
      let vx=Math.cos(fa),vy=Math.sin(fa)*(Math.abs(Math.cos(fa))>0.1?C.flat:1);
      const vl=Math.hypot(vx,vy)||1;vx/=vl;vy/=vl;
      if(vy<-0.1){vx=-vx;vy=-vy;}                    // the near side of the ring
      // On the two front diagonals the ring rises toward the nape, behind the jaw, and dips at the
      // throat under the chin; turned the plain way it rose toward his face and sat on it like a hook.
      if(d===1||d===7)vx=-vx;
      const R=C.r,r=C.r*C.depth*Math.abs(vy)+C.thin,cx=nx-vx*r,cy=ny-vy*r;
      const rot=Math.atan2(-vx,vy);                  // u = (vy, -vx), so the arc 0..π is the near half
      ctx.save();ctx.lineCap='round';
      ctx.strokeStyle=C.edge;ctx.lineWidth=C.w+1.2;
      ctx.beginPath();ctx.ellipse(cx,cy,R,r,rot,0,Math.PI);ctx.stroke();
      ctx.strokeStyle=C.leather;ctx.lineWidth=C.w;
      ctx.beginPath();ctx.ellipse(cx,cy,R,r,rot,0.08,Math.PI-0.08);ctx.stroke();
      if(back){ctx.fillStyle=col;ctx.fillRect(cx-R*0.55-0.8,cy+r*0.6-0.8,1.6,1.6);ctx.fillRect(cx+R*0.55-0.8,cy+r*0.6-0.8,1.6,1.6);}
      else{
        // The ring the pendant hangs from, then the pendant itself, below the front of the collar.
        ctx.strokeStyle=C.edge;ctx.lineWidth=1;ctx.beginPath();ctx.arc(nx,ny+1.3,1.1,0,Math.PI*2);ctx.stroke();
        renderer.artifactIcon(art.id,nx,ny+C.drop,C.icon,art.tier);
      }
      ctx.restore();return;
    }
    const nx=-cx*7,ny=-6+sy*3;
    ctx.save();
    ctx.strokeStyle='#5a3d24';ctx.lineWidth=1.5;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(nx-3,ny-2);ctx.lineTo(nx+3,ny+2);ctx.moveTo(nx+3,ny-2);ctx.lineTo(nx-3,ny+2);ctx.stroke();
    renderer.artifactIcon(art.id,nx,ny,3.3,art.tier);
    ctx.restore();
  }

  // One blot of blood in his wool per heart he has lost, big enough to count from across a room.
  // They used to be small dark drops about his hooves, which read as something spilt on the floor
  // rather than as him. On the pixel goat they are masked to the sprite itself — painted into a
  // scratch canvas, then cut by the same frame with `destination-in` — so blood is only ever on him.
  wounds(renderer,g,miss) {
    const ctx=renderer.ctx,W=TUNING.goat.wounds,n=Math.min(miss,W.spots.length);
    // Smaller the more he faces the camera (`W.front`): +y is toward it.
    const face=1-(1-W.front)*Math.max(0,Math.sin(g.facing||0));
    const blot=(c,k)=>{const[x,y]=W.spots[k],r=(W.r+k*W.grow)*face;
      c.fillStyle=PALETTE.bloodDark;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.arc(x+r*0.7,y+r*0.35,r*0.6,0,Math.PI*2);c.fill();
      c.fillStyle=PALETTE.blood;c.beginPath();c.arc(x-r*0.2,y-r*0.2,r*0.45,0,Math.PI*2);c.fill();};
    const unit=PIXEL_ART.unit('sheep');
    if(!unit){ctx.save();ctx.globalAlpha*=0.8;for(let k=0;k<n;k++)blot(ctx,k);ctx.restore();return;}
    // 48 world px square round the foot at 2x, which holds the whole goat on every facing.
    const S=2,B=48,ox=24,oy=40;
    const cv=this.woundCanvas||(this.woundCanvas=document.createElement('canvas'));
    if(cv.width!==B*S){cv.width=B*S;cv.height=B*S;}
    const c=cv.getContext('2d');
    c.setTransform(1,0,0,1,0,0);c.globalCompositeOperation='source-over';c.clearRect(0,0,cv.width,cv.height);
    c.setTransform(S,0,0,S,ox*S,oy*S);
    for(let k=0;k<n;k++)blot(c,k);
    c.globalCompositeOperation='destination-in';
    PIXEL_ART.draw(c,unit,g.facing||0,Math.hypot(g.vx||0,g.vy||0)>30,renderer.t,g.x);
    c.globalCompositeOperation='source-over';
    ctx.save();ctx.globalAlpha*=W.alpha;
    // The same lean `character()` gives a windup or a swing, or the blots slide off him mid-blow.
    const a=g.facing||0;
    if(g.state==='windup'){ctx.translate(Math.cos(a)*-2,Math.sin(a)*-2);ctx.rotate(-0.13);}
    if(g.state==='swing'){ctx.translate(Math.cos(a)*3,Math.sin(a)*3);ctx.rotate(0.17);}
    if(g.state==='stunned')ctx.rotate(0.7);
    ctx.drawImage(cv,-ox,-oy,B,B);ctx.restore();
  }

  drawGoat(renderer,g,game) {
    const ctx=renderer.ctx;
    for(const t of g.trail){ctx.save();ctx.globalAlpha=t.life/(t.max||TUNING.goat.trail.life)*0.12;ctx.translate(t.x,t.y);ctx.scale(1,1/TILT);this.character(renderer,{facing:t.a},'sheep',40);ctx.restore();}
    renderer.shadow(g.x,g.y,16,7);
    ctx.save();ctx.translate(g.x,g.y);ctx.scale(1,1/TILT);
    if(g.jitter)ctx.translate(g.jitter.x,g.jitter.y);
    const fx=game.stairFx,climb=fx?clamp(fx.dir>0?fx.t:1-fx.t,0,1):0;
    if(climb>0){ctx.translate(0,-TUNING.stairs.rise*climb);ctx.scale(1-0.22*climb,1-0.22*climb);ctx.globalAlpha=1-climb*0.55;}
    if(g.state==='falling'){const F=TUNING.fall,d=clamp((F.time+F.back-g.timer)/F.time,0,1);ctx.translate(0,d*26);ctx.rotate(d*1.5);ctx.scale(1-0.72*d,1-0.72*d);ctx.globalAlpha=1-d;}
    if(g.state==='roll'){ctx.rotate(g.rollSpin);ctx.scale(0.88,0.88);}
    if(g.state==='windup')ctx.scale(0.85,1.1);
    if(g.state==='lunge')ctx.scale(1.15,0.92);
    if(g.state==='ko'||g.state==='stunned'){ctx.rotate(0.9);ctx.scale(1.1,0.8);}
    // The squash spring (game.squashGoat): a landed blow, a blow taken, the end of a roll.
    if(g.sqLeft){const a=g.sqLeft*Math.cos(TUNING.juice.squash.freq*g.sqT);ctx.scale(1+a,1-a);}
    if(g.invuln>0&&Math.floor(renderer.t*30)%2===0)ctx.globalAlpha*=0.5;
    this.hornMods=game.mods;this.character(renderer,g,'sheep',40);this.hornMods=null;
    // The blood is in his wool; the collar is over it, since a talisman has to read at any health.
    if(g.maxHp-g.hp>0)this.wounds(renderer,g,g.maxHp-g.hp);
    if(game.artifact)this.collar(renderer,g,game.artifact);
    if(g.onFire)renderer.flame(0,-6,12,1,g.witchFire);
    ctx.restore();
    if(g.dazed>0&&!(game.intro&&game.intro.fade>0))renderer.drawStars(g.x,g.y,30,Math.min(1,g.dazed*1.5));
    if(game.touch.active&&game.state==='play'){const a=game.input.aim;ctx.fillStyle=PALETTE.bone;ctx.beginPath();ctx.arc(g.x+a.x*34,g.y+a.y*34,2,0,Math.PI*2);ctx.fill();}
  }
}
