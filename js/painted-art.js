// The approved illustrated assets, drawn directly rather than rebuilt from primitive shapes.
// Simulation coordinates and collision radii remain the same; artwork has its own visual bounds.
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
    // The ritual altar: a real, blocking, breakable table tagged only so it keeps its own art
    // instead of the plain procedural table every other one falls back to.
    if(p.kind==='table'&&p.isAltar){
      const ctx=renderer.ctx;
      ctx.save();ctx.translate(p.x,p.y);
      if(p.flung)ctx.rotate(Math.atan2(p.vy,p.vx));
      renderer.shadow(0,8,48,15);
      this.stamp(ctx,'altar',0,0,108,undefined,0.58);
      ctx.restore();return true;
    }
    // The altar is the one big breakable object in the ritual room, not a stand-in for every table —
    // an ordinary table falls back to AltarArt's procedural version rather than reusing its art.
    const keys={crate:'crate',brazier:'brazier',lamp:'lamp',bell:'gong'};
    const key=keys[p.kind]; if(!key)return super.drawProp(renderer,p);
    const ctx=renderer.ctx;
    let w=p.kind==='brazier'?p.r*2.7:p.kind==='lamp'?20:p.kind==='bell'?p.r*2.7:p.r*2.6;
    ctx.save();ctx.translate(p.x,p.y-(p.held?6:0));
    if(p.flung&&p.kind==='crate')ctx.rotate(Math.atan2(p.vy,p.vx)*0.4);
    if(p.kind==='bell'&&p.rung>0)ctx.rotate(Math.sin(renderer.t*28)*0.035);
    const h=w*this.images[key].naturalHeight/this.images[key].naturalWidth;
    renderer.shadow(0,3,w*0.44,Math.min(9,h*0.15));
    this.stamp(ctx,key,0,0,w,h,p.kind==='lamp'?0.85:0.68);
    // Keep the original coals-spill tell even though the bowl is now an image.
    if(p.kind==='brazier'&&p.spillCd>0){ctx.fillStyle='rgba(26,16,22,0.45)';ctx.globalAlpha=p.spillCd/TUNING.prop.brazier.spillCd;ctx.beginPath();ctx.ellipse(0,-h*0.4,w*0.27,h*0.19,0,0,Math.PI*2);ctx.fill();}
    ctx.restore();return true;
  }

  characterKey(e) { return e.kind==='bearer'?'clubman':e.kind==='seer'?'mage':e.kind==='dog'?'hound':null; }

  character(renderer,e,key,width) {
    const ctx=renderer.ctx, angle=e.facing||0, moving=Math.hypot(e.vx||0,e.vy||0)>30;
    const back=Math.sin(angle)<-0.2, name=key+(back?'Back':'Front');
    const legHz=key==='hound'?19:14, step=Math.sin(renderer.t*legHz+(e.x||0)*0.01);
    ctx.save();if(Math.cos(angle)<0)ctx.scale(-1,1);
    // A flat image cannot swing its own legs, so the trot reads through a quicker double-bob and a
    // touch of horizontal shear in time with the footfall — a still photo of four legs is two beats.
    if(moving){
      const stride=Math.sin(renderer.t*legHz*2+(e.x||0)*0.01);
      ctx.translate(stride*0.9,-Math.abs(step)*1.4);
      ctx.rotate(step*0.025);
      ctx.transform(1,0,stride*0.05,1,0,0);
    } else ctx.scale(1,1+Math.sin(renderer.t*3)*0.008);
    if(e.state==='windup'||e.state==='chargewind'){ctx.translate(-2,0);ctx.rotate(-0.13);}
    if(e.state==='swing'){ctx.translate(3,0);ctx.rotate(0.17);}
    if(e.state==='dart'){ctx.scale(1.17,0.85);ctx.strokeStyle=PALETTE.bone;ctx.globalAlpha*=0.45;ctx.beginPath();ctx.moveTo(-width*0.4,5);ctx.lineTo(-width*0.7,5);ctx.stroke();ctx.globalAlpha/=0.45;}
    if(e.state==='floored'||e.state==='stunned')ctx.rotate(0.7);
    this.stamp(ctx,name,0,0,width,undefined,key==='sheep'||key==='hound'?0.52:0.68);
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
