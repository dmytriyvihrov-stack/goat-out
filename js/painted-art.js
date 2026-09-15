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
    const entries = [...Object.entries(PAINTED_ASSETS), ...Object.entries(PAINTED_ASSETS_V1)];
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

  // The secret wall has to read as *that level's own wall* until it cracks (see CLAUDE.md's "A wall
  // that gives") — the delivered art is one fixed stone colour, so it is tinted to `p.wallColor` and
  // cached per colour rather than drawn raw.
  secretWallTinted(color) {
    this.secretTint || (this.secretTint = new Map());
    if (this.secretTint.has(color)) return this.secretTint.get(color);
    const image = this.images.propsAtlas, cell = ATLAS_CELL['secret-wall'];
    const c = document.createElement('canvas'); c.width = 128; c.height = 128;
    const cx = c.getContext('2d');
    cx.drawImage(image, cell[0], cell[1], 128, 128, 0, 0, 128, 128);
    cx.globalCompositeOperation = 'source-atop';
    cx.fillStyle = color; cx.globalAlpha = 0.6;
    cx.fillRect(0, 0, 128, 128);
    this.secretTint.set(color, c);
    return c;
  }

  drawTiles(renderer, game, cam) {
    if (!this.ready) return super.drawTiles(renderer, game, cam);
    this.prepare(game);
    const ctx = renderer.ctx, wd = game.world, b = renderer.visibleTiles(cam);
    for (let y=b.y0; y<=b.y1; y++) for (let x=b.x0; x<=b.x1; x++) {
      const t=wd.tileAt(x,y), px=x*TILE, py=y*TILE, h=this.hash(x,y,game.level.seed);
      if (t===T.WALL) {
        const n=!wd.isSolid(x,y-1),s=!wd.isSolid(x,y+1),w=!wd.isSolid(x-1,y),e=!wd.isSolid(x+1,y);
        if (!(n||s||w||e||!wd.isSolid(x-1,y-1)||!wd.isSolid(x+1,y-1)||!wd.isSolid(x-1,y+1)||!wd.isSolid(x+1,y+1))) continue;
        // The brick face is the dominant texture on every visible wall tile, coping capping only its
        // top band — not just the row that happens to border floor to the south, as the reference art has
        // brick coursing running the full height of every wall, top and sides alike.
        this.stamp(ctx,'wallFace',px+16,py+16,32,32);
        this.stamp(ctx,'wallTop',px+16,py+10,32,20);
        if (s&&x%5===1&&h%3!==0&&!w&&!e) this.stamp(ctx,'banner',px+16,py+14,17,23,0.2);
        continue;
      }
      if (t===T.PIT) continue;
      this.stamp(ctx,this.boards[y*wd.W+x]?'boards'+(h%2):'stone'+(h%4),px+16,py+16,32,32);
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
      renderer.shadow(0,4,w*0.4,9);
      if(!this.fire(renderer,'brazierFire',0,0,w))this.stamp(ctx,'brazier',0,0,p.r*2.7);
      // Keep the coals-spill tell even though the bowl is now an animated sprite.
      if(p.spillCd>0){ctx.fillStyle='rgba(26,16,22,0.45)';ctx.globalAlpha=p.spillCd/TUNING.prop.brazier.spillCd;ctx.beginPath();ctx.ellipse(0,-w*0.16,w*0.27,w*0.14,0,0,Math.PI*2);ctx.fill();}
      ctx.restore();return true;
    }
    if(p.kind==='lamp'){
      const w=34;
      ctx.save();ctx.translate(p.x,p.y-10);
      renderer.shadow(0,24,7,4);
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
    // The cage stays fully procedural: `cage-bars`/`cage-broken` in the atlas are a whole three-post
    // fence panel, not a single post, and this game's pen is built from one `Prop` per bar — stamping
    // the panel on every bar would triple-draw posts. See the new brief in ART_HANDOFF.md.
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
      this.atlas(ctx,p.weapon,0,0,up?(p.weapon==='sword'?46:32):(p.weapon==='sword'?24:22),undefined,0.5);
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
      if(!this.images.propsAtlas||!this.images.propsAtlas.naturalWidth)return super.drawProp(renderer,p);
      const h=TILE/2, top=p.y-TILE*0.12;
      // A wall stands in the wall row, not the floor row: anchored a shade above the tile's own
      // centre (0.62, against the stamp's usual 0.5) so it sits with the rest of the wall course
      // rather than reading as flush with the ground the niche's own floor is drawn on.
      this.drawFrame(ctx,this.secretWallTinted(p.wallColor),0,0,128,128,p.x,top,TILE,TILE,0.62);
      // The crack tells still have to be drawn: the art carries none, and they're what the blow count
      // reads as (see AltarArt.drawProp / CLAUDE.md's "A wall that gives"). Drawn off the same raised
      // centre as the stamp above, so the crack sits on the stone and not on the boards in front of it.
      ctx.strokeStyle='rgba(10,8,10,0.55)';ctx.lineWidth=1.5;
      ctx.beginPath();
      ctx.moveTo(p.x-h*0.5,top-h*0.6);ctx.lineTo(p.x-h*0.1,top);
      ctx.lineTo(p.x-h*0.4,top+h*0.4);ctx.lineTo(p.x+h*0.3,top+h*0.7);
      ctx.stroke();
      if((p.hits||0)>0){
        ctx.strokeStyle='rgba(10,8,10,0.7)';ctx.lineWidth=2;
        ctx.beginPath();ctx.moveTo(p.x+h*0.5,top-h*0.5);ctx.lineTo(p.x-h*0.2,top+h*0.5);ctx.stroke();
      }
      return true;
    }
    return false;
  }

  // The wisp's painted body: `Renderer.soulWisp` keeps its own halo (before) and orbiting sparks
  // (after) procedural — those are what read as motion, and the art has no frames to animate them.
  soulWispBody(ctx, w) {
    return this.atlas(ctx, 'soul-wisp', 0, 0, w, undefined, 0.56);
  }

  characterKey(e) { return e.kind==='bearer'?'clubman':e.kind==='seer'?'mage':e.kind==='dog'?'hound':null; }

  character(renderer,e,key,width) {
    const ctx=renderer.ctx, angle=e.facing||0, moving=Math.hypot(e.vx||0,e.vy||0)>30;
    const sheet=this.images[key+'Walk'];
    ctx.save();
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
      const col=moving?Math.floor(renderer.t*(WALK_FPS[key]||8)+(e.x||0)*0.05)%4:1;
      this.drawFrame(ctx,sheet,col*128,row*128,128,128,0,0,width,width,0.8125);
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
    if(e.champion)renderer.spikeRing(e.r*0.9,Math.PI,Math.PI*2,5,6,PALETTE.altar.ironHi);
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
