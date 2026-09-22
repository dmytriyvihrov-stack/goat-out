// Cosmetic physics only: fragments never enter collision, damage, noise or AI lists.
class CombatFX {
  constructor(game) {
    this.game = game; this.air = []; this.ground = []; this.bursts = [];
    if(!CombatFX.sheet) {CombatFX.sheet=new Image();CombatFX.sheet.src=COMBAT_ASSETS.sheet;}
  }

  static frame(c,row,col,x,y,width,height,anchor=0.5,witch=false) {
    const im=CombatFX.sheet;if(!im?.naturalWidth)return false;
    const sw=im.naturalWidth/8,sh=im.naturalHeight/4;
    c.save();c.imageSmoothingEnabled=true;
    if(witch)c.filter='hue-rotate(225deg)';
    c.drawImage(im,col*sw,row*sh,sw,sh,x-width/2,y-height*anchor,width,height);
    c.restore();return true;
  }

  snapshot(e) {
    const art = this.game.renderer.painted;
    if (!art.ready) return null;
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 96;
    const c = canvas.getContext('2d'); c.translate(48,74);
    // The same key `drawEnemy` uses, kept in one place: a dying butcher or elite bearer used to
    // tear into plain clubman gore because this snapshot kept its own, shorter map that never
    // learned about `brute` or `butcher` at all.
    const key = art.characterKey(e) || 'sheep';
    art.character({ctx:c,t:0},{facing:e.facing||0},key,80);
    return canvas;
  }

  add(p) {
    const F = TUNING.effects;
    if (this.air.length >= F.maxAir) this.settle(this.air.shift());
    this.air.push(p);
  }

  fragment(x,y,image,crop,width,height,dx,dy,material,options={}) {
    const F=TUNING.effects, a=Math.atan2(dy,dx)+(Math.random()-0.5)*2.5;
    const speed=F.fragmentSpeed*(0.4+Math.random());
    this.add({x,y,image,crop,width,height,material,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,
      z:5,vz:F.lift*(0.7+Math.random()*0.6),angle:Math.random()*Math.PI*2,
      spin:(Math.random()-0.5)*13,age:0,bounces:0,...options});
  }

  death(e,cause,dx,dy) {
    if (cause==='fall') return;
    if (e.kind==='wraith') { this.explosion(e.x,e.y,35,true,true); return; }
    const sprite=this.snapshot(e), big=e.kind==='butcher', size=big?53:e.kind==='dog'?37:40;
    const torn=cause==='boom'||cause==='devour'||cause==='roll';
    if(cause!=='burn') {
      const k=TUNING.effects.bloodScale;
      this.blood(e.x,e.y,dx,dy,Math.round((big?18:11)*k));
      if(this.bursts.length>=TUNING.effects.maxBursts)this.bursts.shift();
      this.bursts.push({x:e.x,y:e.y,r:(big?46:30)*k,t:0,blood:true});
    }
    if (!sprite) return;
    if(cause==='burn') {
      const c=sprite.getContext('2d');c.setTransform(1,0,0,1,0,0);c.globalCompositeOperation='source-atop';
      c.fillStyle='rgba(19,13,16,0.8)';c.fillRect(0,0,96,96);
    }
    if (torn) {
      // Head, torso and limbs retain the actual victim's coat and facing.
      for (const crop of [[20,0,56,35],[15,35,33,30],[48,35,33,30],[15,65,33,31],[48,65,33,31]]) {
        this.fragment(e.x,e.y,sprite,crop,size*crop[2]/96,size*crop[3]/96,dx,dy,'gore');
      }
    } else {
      this.fragment(e.x,e.y,sprite,[0,0,96,96],size,size,dx,dy,cause==='burn'?'char':'body',
        {vx:dx*20,vy:dy*20,vz:95,spin:2.5,angle:(e.facing||0)+0.8});
      if(cause==='burn') this.explosion(e.x,e.y,19,!!e.witchBurn,true);
    }
  }

  blood(x,y,dx,dy,count) {
    const d=Math.hypot(dx,dy)||1;
    for(let i=0;i<count;i++) {
      const a=Math.atan2(dy,dx)+(Math.random()-0.5)*2.8;
      const s=TUNING.effects.bloodSpeed*(0.35+Math.random());
      this.add({x,y,vx:Math.cos(a)*s+dx/d*20,vy:Math.sin(a)*s+dy/d*20,z:8,
        vz:45+Math.random()*110,width:1.5+Math.random()*3,height:2,angle:a,spin:0,
        age:0,bounces:0,material:'blood'});
    }
  }

  debris(p,dx=0,dy=0) {
    const art=this.game.renderer.painted, metal=!!p.iron;
    const count=p.kind==='door'?TUNING.effects.doorPieces:TUNING.effects.cratePieces;
    const speed=Math.hypot(dx,dy); if(speed){dx/=speed;dy/=speed;}
    for(let i=0;i<count;i++) {
      const plank=i<Math.ceil(count*0.6);
      this.fragment(p.x,p.y,art.images.crate,[18+(i%3)*27,20+(i%4)*20,20,50],
        plank?4+Math.random()*3:3,plank?11+Math.random()*10:5,
        dx||Math.cos(i*2.4),dy||Math.sin(i*2.4),metal?'metal':'wood',
        {image:null,color:metal?'#555761':i%2?'#a57949':'#755034'});
    }
    this.explosion(p.x,p.y,p.kind==='door'?23:17,false,true);
  }

  // `life` overrides the shared `burstLife` for this one burst — Bomb Charge asks for a smaller,
  // quicker flash than a door or a crate breaking so the fight behind it stays readable.
  explosion(x,y,r,witch=false,smokeOnly=false,life) {
    if(this.bursts.length>=TUNING.effects.maxBursts)this.bursts.shift();
    this.bursts.push({x,y,r,witch,smokeOnly,t:0,seed:Math.random()*6.28,life});
  }

  settle(p) {
    const w=this.game.world;
    if(!w||w.isSolid(Math.floor(p.x/TILE),Math.floor(p.y/TILE))||w.isPitPx(p.x,p.y))return;
    p.z=0;
    if(p.material==='blood') { w.dot(p.x,p.y,p.width*0.8,PALETTE.bloodDark); return; }
    if(p.material==='gore')w.splat(p.x,p.y,0,0,5);
    this.ground.push(p);
    if(this.ground.length>TUNING.effects.maxGround) {
      const old=this.ground.shift(); this.drawPiece(w.dctx,old,false);
    }
  }

  update(dt) {
    const F=TUNING.effects, w=this.game.world;
    for(const p of this.air) {
      p.age+=dt; const nx=p.x+p.vx*dt,ny=p.y+p.vy*dt;
      if(w.isSolid(Math.floor(nx/TILE),Math.floor(p.y/TILE)))p.vx*=-0.3;else p.x=nx;
      if(w.isSolid(Math.floor(p.x/TILE),Math.floor(ny/TILE)))p.vy*=-0.3;else p.y=ny;
      const drag=Math.exp(-F.drag*dt);p.vx*=drag;p.vy*=drag;
      p.vz-=F.gravity*dt;p.z+=p.vz*dt;p.angle+=p.spin*dt;
      if(p.z<=0) {
        p.z=0;
        if(p.material!=='blood'&&p.bounces<1&&Math.abs(p.vz)>65) {
          p.vz=-p.vz*0.26;p.bounces++;p.spin*=0.4;p.vx*=0.6;p.vy*=0.6;
        } else {this.settle(p);p.done=true;}
      }
      if(p.age>F.maxFlight&&!p.done){this.settle(p);p.done=true;}
    }
    this.air=this.air.filter(p=>!p.done);
    for(const b of this.bursts)b.t+=dt;
    this.bursts=this.bursts.filter(b=>b.t<(b.blood?F.bloodLife:(b.life||F.burstLife)));
  }

  drawPiece(c,p,airborne) {
    c.save();c.translate(p.x,p.y);
    if(airborne&&p.material!=='blood') {
      c.fillStyle='rgba(9,5,10,0.24)';c.beginPath();c.ellipse(0,2,p.width*0.45,2.5,0,0,Math.PI*2);c.fill();
    }
    c.translate(0,-(p.z||0));c.rotate(p.angle);
    if(p.image) {
      c.globalAlpha*=p.material==='char'?0.65:0.88;
      c.drawImage(p.image,...p.crop,-p.width/2,-p.height/2,p.width,p.height);
      if(p.material==='gore'){c.fillStyle=PALETTE.bloodDark;c.fillRect(-p.width/2,-p.height/2,p.width,2);}
    } else if(p.material==='blood') {
      c.fillStyle=PALETTE.blood;c.beginPath();c.ellipse(0,0,p.width*1.6,p.width*0.6,0,0,Math.PI*2);c.fill();
    } else {
      c.fillStyle=p.color;c.beginPath();c.moveTo(-p.width/2,-p.height/2);c.lineTo(p.width/2,-p.height/2+3);
      c.lineTo(p.width/2-1,p.height/2);c.lineTo(0,p.height/2-2);c.lineTo(-p.width/2,p.height/2);c.closePath();c.fill();
      c.strokeStyle=p.material==='metal'?'#a3a6ae':'#c49860';c.lineWidth=0.8;
      c.beginPath();c.moveTo(-p.width/2+1,-p.height/2+2);c.lineTo(-p.width/2+1,p.height/2-2);c.stroke();
      if(p.height>12){c.fillStyle='#29232a';c.fillRect(0,-p.height/2+4,1.5,1.5);}
    }
    c.restore();
  }

  drawGround(renderer,game) {
    for(const p of this.ground)if(!game.hidden(p.x,p.y))this.drawPiece(renderer.ctx,p,false);
  }

  draw(renderer,game) {
    const c=renderer.ctx;
    for(const p of this.air)if(!game.hidden(p.x,p.y))this.drawPiece(c,p,true);
    for(const b of this.bursts) {
      if(game.hidden(b.x,b.y))continue;
      const duration=b.blood?TUNING.effects.bloodLife:(b.life||TUNING.effects.burstLife);
      const progress=Math.min(0.999,b.t/duration);
      const col=b.smokeOnly?6+Math.floor(progress*2):Math.floor(progress*8);
      c.save();c.globalAlpha=b.smokeOnly?(1-progress)*0.65:1;
      if(b.smokeOnly&&!b.witch)c.filter='grayscale(1)';
      const painted=CombatFX.frame(c,b.blood?3:2,col,b.x,b.y,b.r*2.5,b.r*2.5,0.5,b.witch);
      c.restore();if(painted)continue;
      const q=b.t/duration,r=b.r*(0.35+Math.sqrt(q)*0.9);
      c.save();c.translate(b.x,b.y);
      for(let i=0;i<7;i++) {
        const a=i*Math.PI*2/7+b.seed,spread=r*(0.25+q*0.6);
        c.globalAlpha=(1-q)*(b.smokeOnly?0.3:0.65);
        c.fillStyle=b.witch?'#5b487d':'#49403c';c.beginPath();
        c.ellipse(Math.cos(a)*spread,Math.sin(a)*spread-q*15,r*0.44,r*0.36,0,0,Math.PI*2);c.fill();
      }
      if(!b.smokeOnly&&q<0.55) {
        c.globalCompositeOperation='lighter';c.globalAlpha=1-q/0.55;
        c.fillStyle=b.witch?PALETTE.witch:PALETTE.fire;
        c.beginPath();for(let i=0;i<24;i++){const a=i*Math.PI/12,rr=r*(i%2?0.64:1.14);i?c.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):c.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);}c.closePath();c.fill();
        c.fillStyle=b.witch?PALETTE.witchHi:PALETTE.fireHi;c.beginPath();c.arc(0,0,r*0.43,0,Math.PI*2);c.fill();
        c.strokeStyle=b.witch?PALETTE.witchHi:PALETTE.fireHi;c.lineWidth=2*(1-q);
        c.beginPath();c.ellipse(0,0,r*1.32,r*0.83,0,0,Math.PI*2);c.stroke();
      }
      c.restore();
    }
  }

  // Curved tongues, a bright core and drifting sparks share one animation on every level.
  static flame(renderer,x,y,size,seed,witch) {
    const c=renderer.ctx,t=renderer.t*7+seed;
    const frame=((Math.floor(renderer.t*TUNING.effects.fireFps+seed)%8)+8)%8;
    if(CombatFX.frame(c,witch?1:0,frame,x,y+3,size*2.7,size*2.7,0.97))return;
    c.save();c.translate(x,y);
    const glow=c.createRadialGradient(0,-size*0.4,0,0,-size*0.4,size*1.4);
    glow.addColorStop(0,witch?'rgba(125,92,255,0.28)':'rgba(255,127,34,0.24)');glow.addColorStop(1,'rgba(0,0,0,0)');
    c.fillStyle=glow;c.fillRect(-size*1.4,-size*1.8,size*2.8,size*2.8);
    for(let layer=0;layer<3;layer++) {
      c.fillStyle=witch?['#51409b','#9875f5','#daf4ff'][layer]:['#be4928','#f5a535','#fff0a5'][layer];
      for(let k=0;k<3;k++) {
        const xx=(k-1)*size*0.4,sw=size*(0.38-layer*0.085);
        const h=size*(1.45-layer*0.33)*(0.83+0.18*Math.sin(t+k*2.7+layer));
        const sway=Math.sin(t*1.3+k*2)*size*0.23*(witch?1.5:1);
        c.beginPath();c.moveTo(xx-sw,2);
        c.bezierCurveTo(xx-sw*1.4,-h*0.35,xx+sway-sw,-h*0.65,xx+sway,-h);
        c.bezierCurveTo(xx+sway+sw*0.1,-h*0.55,xx+sw*1.2,-h*0.3,xx+sw,2);c.closePath();c.fill();
      }
    }
    for(let k=0;k<4;k++) {
      const q=((renderer.t*(witch?0.65:0.9)+seed*0.13+k/4)%1+1)%1;
      c.globalAlpha=(1-q)*0.85;c.fillStyle=witch?PALETTE.witchHi:PALETTE.fireHi;
      c.fillRect(Math.sin(seed+k*3+q*4)*size*0.75,-size*(0.6+q*2.1),1.3,witch?2.5:1.6);
    }
    c.restore();
  }
}
