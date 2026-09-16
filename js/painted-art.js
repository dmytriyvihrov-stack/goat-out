// The approved illustrated assets, drawn directly rather than rebuilt from primitive shapes.
// Simulation coordinates and collision radii remain the same; artwork has its own visual bounds.
// assets/painted-expansion-v1/objects/atlas.png — four columns, four rows, 128px cells (manifest.json).
const ATLAS_CELL = {
  'cage-bars': [0, 0], 'cage-broken': [128, 0], 'mill-hub': [256, 0], 'mill-arm': [384, 0],
  'spikes-idle': [0, 128], 'spikes-arming': [128, 128], 'spikes-up': [256, 128], 'weapon-stand': [384, 128],
  sword: [0, 256], shield: [128, 256], 'healing-grass': [256, 256], 'soul-wisp': [384, 256],
  'secret-wall': [0, 384], 'crate-debris': [128, 384], 'brazier-unlit': [256, 384], worktable: [384, 384],
};
const WALK_FPS = { sheep: 8, clubman: 8, mage: 7, hound: 10 };

class PaintedArt extends AltarArt {
  constructor() {
    super(); this.images = {}; this.loaded = 0; this.failed = [];
    const entries = Object.entries({...PAINTED_ASSETS, ...PAINTED_ASSETS_V1, ...PAINTED_ASSETS_V2});
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
  // sheet, so nothing else is drawn under it (see ART_HANDOFF in assets/painted-expansion-v1).
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

  // Bits name the exposed faces, not the room edge: N=1, E=2, S=4, W=8.
  // Build each junction once; rotating the face keeps the courses parallel to its wall.
  wallTile(prefix, mask) {
    this.wallTiles ||= new Map();
    const key = prefix + mask;
    if (this.wallTiles.has(key)) return this.wallTiles.get(key);
    const tile = document.createElement('canvas'); tile.width = tile.height = 128;
    const c = tile.getContext('2d'), lip = 40;
    const left = mask & 8 ? lip : 0, right = mask & 2 ? 128-lip : 128;
    const top = mask & 1 ? lip : 0, bottom = mask & 4 ? 128-lip : 128;
    this.stamp(c, prefix+'wallTop', 64, 64, 128, 128);
    const faces = [
      // N's shade used to be 0.27, nearly as dark as the mortar line it sits next to: on the wall
      // closest to camera (the near/bottom wall of a room) the whole coursed face washed into one
      // flat dark band and read as bare rock. Brought down to keep the same darker-than-S
      // direction without crushing the brick reading it is the only visible face for.
      {bit:1, a:Math.PI, points:[[0,0],[128,0],[right,top],[left,top]], shade:0.1},
      {bit:2, a:-Math.PI/2, points:[[128,0],[128,128],[right,bottom],[right,top]], shade:0.06},
      {bit:4, a:0, points:[[128,128],[0,128],[left,bottom],[right,bottom]], shade:0},
      {bit:8, a:Math.PI/2, points:[[0,128],[0,0],[left,top],[left,bottom]], shade:0.08},
    ];
    for (const f of faces) if (mask & f.bit) {
      c.save(); c.beginPath(); f.points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y)); c.closePath(); c.clip();
      c.translate(64,64); c.rotate(f.a);
      this.stamp(c,prefix+'wallFace',0,44,128,40);
      c.fillStyle=`rgba(10,7,12,${f.shade})`; c.fillRect(-64,24,128,40);
      c.fillStyle='rgba(8,5,10,0.55)'; c.fillRect(-64,60,128,4);
      c.fillStyle='rgba(225,203,180,0.22)'; c.fillRect(-64,24,128,3);
      c.restore();
    }
    this.wallTiles.set(key,tile); return tile;
  }

  drawWall(ctx, prefix, x, y, mask) {
    ctx.drawImage(this.wallTile(prefix,mask),x,y,TILE,TILE);
  }

  drawTiles(renderer, game, cam) {
    if (!this.ready) return super.drawTiles(renderer, game, cam);
    this.prepare(game);
    const ctx = renderer.ctx, wd = game.world, b = renderer.visibleTiles(cam);
    const prefix = game.levelIndex ? 'level'+game.levelIndex+'_' : '';
    this.prefix = prefix;   // read back by the secret-wall prop, which has to match this exactly
    for (let y=b.y0; y<=b.y1; y++) for (let x=b.x0; x<=b.x1; x++) {
      const t=wd.tileAt(x,y), px=x*TILE, py=y*TILE, h=this.hash(x,y,game.level.seed);
      if (t===T.WALL) {
        const n=!wd.isSolid(x,y-1),s=!wd.isSolid(x,y+1),w=!wd.isSolid(x-1,y),e=!wd.isSolid(x+1,y);
        if (!(n||s||w||e||!wd.isSolid(x-1,y-1)||!wd.isSolid(x+1,y-1)||!wd.isSolid(x-1,y+1)||!wd.isSolid(x+1,y+1))) continue;
        this.drawWall(ctx,prefix,px,py,(n?1:0)|(e?2:0)|(s?4:0)|(w?8:0));
        if (s&&x%5===1&&h%3!==0&&!w&&!e) this.stamp(ctx,'banner',px+16,py+18,13,17,0.2);
        continue;
      }
      if (t===T.PIT) continue;
      this.stamp(ctx,prefix+(this.boards[y*wd.W+x]?'boards'+(h%2):'stone'+(h%4)),px+16,py+16,32,32);
      ctx.fillStyle=PALETTE.altar.shadow;
      if(wd.isSolid(x,y-1))ctx.fillRect(px,py,32,5);
      if(wd.isSolid(x-1,y))ctx.fillRect(px,py,3,32);
      if(t===T.HAY)this.stamp(ctx,'hay',px+16,py+17,30,27);
      else if(t===T.ASH){ctx.fillStyle=PALETTE.altar.ash;ctx.globalAlpha=0.6;ctx.fillRect(px+3,py+5,26,23);ctx.globalAlpha=1;}
      else if(t===T.EXIT)renderer.drawStairs(px,py,x-game.level.exitTile.x0,true,game.level.def);
      else if(t===T.ENTRY)renderer.drawStairs(px,py,x-game.level.entry.x0,false,game.level.def);
      else if(wd.isSolid(x,y-1)&&h%5===0)this.straw(ctx,px+16,py+6,h,false);
    }
  }

  drawRitual(renderer, game) {
    const ctx=renderer.ctx, wd=game.world, R=game.level.rooms[0];
    // The stone base, candles and the two earlier sacrifices' bones are the procedural layer
    // underneath. Bones, not ghost sheep. The altar itself is a real Prop now — see drawProp — and
    // draws in its own turn through the ordinary prop pass, not here.
    if (wd.ritualArt) ctx.drawImage(wd.ritualArt.canvas, wd.ritualArt.x, wd.ritualArt.y);
    // Room-edge storage is inset into the solid wall band, never an invisible obstacle on a path.
    const yy=(R.y+0.7)*TILE;
    this.stamp(ctx,'barrel',(R.x+1.4)*TILE,yy,25,undefined,0.6);
    this.stamp(ctx,'hay',(R.x+2.4)*TILE,yy+4,35,25);
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
    if(p.kind==='brazier'){
      const w=p.r*2.9;
      ctx.save();ctx.translate(p.x,p.y);
      renderer.shadow(0,-4,w*0.36,7.5);
      if(!this.fire(renderer,'brazierFire',0,0,w))this.stamp(ctx,'brazier',0,0,p.r*2.7);
      // Keep the coals-spill tell even though the bowl is now an animated sprite.
      if(p.spillCd>0){ctx.fillStyle='rgba(26,16,22,0.45)';ctx.globalAlpha=p.spillCd/TUNING.prop.brazier.spillCd;ctx.beginPath();ctx.ellipse(0,-w*0.16,w*0.27,w*0.14,0,0,Math.PI*2);ctx.fill();}
      ctx.restore();return true;
    }
    if(p.kind==='lamp'){
      const w=34;
      ctx.save();ctx.translate(p.x,p.y-10);
      // Under the foot of the post, not a body's length below it. The sprite is anchored at 0.875,
      // so its own base sits a shade under the translated origin — the shadow was drawn twenty-odd
      // pixels lower than that, and a lamp with its shadow that far off is a lamp hanging in the air.
      renderer.shadow(0,-1.5,8,4);
      if(!this.fire(renderer,'lanternFire',0,0,w))this.stamp(ctx,'lamp',0,10,20);
      ctx.restore();return true;
    }
    // The two already-painted, level-agnostic objects: same art, no longer level-one only.
    const keys={crate:'crate',bell:'gong'};
    const key=keys[p.kind];
    if(key){
      const w=p.kind==='crate'?p.r*2.6:p.r*2.7;
      ctx.save();ctx.translate(p.x,p.y-(p.held?6:0));
      if(p.flung&&p.kind==='crate')ctx.rotate(Math.atan2(p.vy,p.vx)*0.4);
      if(p.kind==='bell'&&p.rung>0)ctx.rotate(Math.sin(renderer.t*28)*0.035);
      const h=w*this.images[key].naturalHeight/this.images[key].naturalWidth;
      renderer.shadow(0,3,w*0.44,Math.min(9,h*0.15));
      this.stamp(ctx,key,0,0,w,h,0.68);
      ctx.restore();return true;
    }
    if(p.kind==='table'){
      const a=p.flung?Math.atan2(p.vy,p.vx):0;
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(a);
      renderer.shadow(0,p.r*0.6,p.r*1.05,p.r*0.5);
      const drew=this.atlas(ctx,'worktable',0,0,p.r*2.6,undefined,0.62);
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
    if(p.kind==='chicken'&&this.images.chickenFacing?.naturalWidth){
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
      this.atlas(ctx,p.weapon,0,0,p.weapon==='sword'?24:22,undefined,0.5);
      ctx.restore();
      // What is left in a shield you are carrying: three studs, one per man or bullet it has in it.
      if(p.weapon==='shield'&&p.held&&p.uses>0){
        const n=TUNING.prop.weapon.uses.shield;
        for(let k=0;k<n;k++){
          ctx.fillStyle=k<p.uses?PALETTE.bone:'rgba(239,230,208,0.22)';
          ctx.fillRect(p.x-(n*5-2)/2+k*5,p.y-23,3.2,3.2);
        }
      }
      return true;
    }
    if(p.kind==='heal'){
      if(!this.images.propsAtlas||!this.images.propsAtlas.naturalWidth)return super.drawProp(renderer,p);
      // v2's tighter, static 23px patch (brief item F) tested as too quiet to read as a heal spot in
      // a moving crowd — reverted to the original atlas stamp: bigger, with its own shadow and a slow
      // bob, so a bowl of milk still finds the eye the way the wisp or a lamp's firelight does.
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
    if(p.kind==='secret'){
      const key=(this.prefix||'')+'wallFace';
      if(!this.images[key]?.naturalWidth)return super.drawProp(renderer,p);
      // The sealed niche must share the same facing as the surrounding room wall.
      this.drawWall(ctx,this.prefix||'',p.x-TILE/2,p.y-TILE/2,p.wallSide==='up'?4:1);
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

  characterKey(e) { return e.kind==='bearer'?(e.champion?'brute':'clubman'):e.kind==='seer'?'mage':e.kind==='dog'?'hound':['hunter','wraith','butcher'].includes(e.kind)?e.kind:null; }

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

  character(renderer,e,key,width) {
    const ctx=renderer.ctx, angle=e.facing||0, moving=Math.hypot(e.vx||0,e.vy||0)>30;
    const facingSheet=this.images[key+'Facing'],sheet=facingSheet||this.images[key+'Walk'];
    ctx.save();
    if(key==='wraith'){
      const born=e.state==='manifest'?1-Math.max(0,e.timer)/TUNING.wraith.manifest:(e.ghosted?0:1);
      ctx.globalAlpha*=0.35+born*0.65;const puff=1.12-born*0.12;ctx.scale(puff,puff);
    }
    if(sheet&&sheet.naturalWidth){
      // Eight drawn facings rather than a mirrored front/back pair: row picks the facing, column
      // the walk frame. `angle` is already atan2(dy,dx) in screen space, the sheet's own convention
      // (assets/painted-expansion-v1/manifest.json). Windup/swing lean along the real facing now,
      // in place of the old screen-space nudge that only ever worked because of the left/right mirror.
      if(e.state==='windup'||e.state==='chargewind'){ctx.translate(Math.cos(angle)*-2,Math.sin(angle)*-2);ctx.rotate(-0.13);}
      if(e.state==='swing'){ctx.translate(Math.cos(angle)*3,Math.sin(angle)*3);ctx.rotate(0.17);}
      if(e.state==='dart'){ctx.scale(1.17,0.85);ctx.strokeStyle=PALETTE.bone;ctx.globalAlpha*=0.45;ctx.beginPath();ctx.moveTo(-width*0.4,5);ctx.lineTo(-width*0.7,5);ctx.stroke();ctx.globalAlpha/=0.45;}
      if(e.state==='floored'||e.state==='stunned')ctx.rotate(0.7);
      const row=(Math.round(angle/(Math.PI/4))+14)%8;
      const col=facingSheet?0:moving?Math.floor(renderer.t*(WALK_FPS[key]||8)+(e.x||0)*0.05)%4:1;
      // Where the feet actually sit in the cell, measured off the art rather than guessed: the
      // walk-cycle sheets (v1) draw the body nearly the full 128px tall, feet close to the bottom
      // edge; the newer static "Facing" sheets (v2) sit smaller and more centred in the same cell.
      // One shared anchor read the walk-cycle characters as floating well clear of their own shadow.
      this.drawFrame(ctx,sheet,col*128,row*128,128,128,0,0,width,width,facingSheet?0.81:0.89);
    } else {
      // Fallback to the original front/back pair if an expansion sheet failed to load.
      const back=Math.sin(angle)<-0.2, name=key+(back?'Back':'Front');
      const legHz=key==='hound'?19:14, step=Math.sin(renderer.t*legHz+(e.x||0)*0.01);
      if(Math.cos(angle)<0)ctx.scale(-1,1);
      if(moving){
        const stride=Math.sin(renderer.t*legHz*2+(e.x||0)*0.01);
        ctx.translate(stride*0.9,-Math.abs(step)*1.4);ctx.rotate(step*0.025);ctx.transform(1,0,stride*0.05,1,0,0);
      } else ctx.scale(1,1+Math.sin(renderer.t*3)*0.008);
      if(e.state==='windup'||e.state==='chargewind'){ctx.translate(-2,0);ctx.rotate(-0.13);}
      if(e.state==='swing'){ctx.translate(3,0);ctx.rotate(0.17);}
      if(e.state==='dart'){ctx.scale(1.17,0.85);ctx.strokeStyle=PALETTE.bone;ctx.globalAlpha*=0.45;ctx.beginPath();ctx.moveTo(-width*0.4,5);ctx.lineTo(-width*0.7,5);ctx.stroke();ctx.globalAlpha/=0.45;}
      if(e.state==='floored'||e.state==='stunned')ctx.rotate(0.7);
      this.stamp(ctx,name,0,0,width,undefined,key==='sheep'||key==='hound'?0.52:0.68);
    }
    // Spikes are reserved for a future distinct enemy; this brute is the plain heavy clubman.
    ctx.restore();
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
    if(g.invuln>0&&Math.floor(renderer.t*30)%2===0)ctx.globalAlpha*=0.5;
    this.character(renderer,g,'sheep',40);
    if(g.maxHp-g.hp>0){ctx.fillStyle=PALETTE.bloodDark;ctx.globalAlpha*=0.6;for(let k=0;k<g.maxHp-g.hp;k++){ctx.beginPath();ctx.ellipse(-9+k*5,-4+(k%2)*6,2.8,1.8,0.3,0,Math.PI*2);ctx.fill();}}
    if(g.onFire)renderer.flame(0,-6,12,1,g.witchFire);
    ctx.restore();
    if(g.dazed>0&&!(game.intro&&game.intro.fade>0))renderer.drawStars(g.x,g.y,30,Math.min(1,g.dazed*1.5));
    if(game.touch.active&&game.state==='play'){const a=game.input.aim;ctx.fillStyle=PALETTE.bone;ctx.beginPath();ctx.arc(g.x+a.x*34,g.y+a.y*34,2,0,Math.PI*2);ctx.fill();}
  }
}
