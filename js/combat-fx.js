const BAYER4=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5].map(v=>v/16);
// Cosmetic physics only: fragments never enter collision, damage, noise or AI lists.
class CombatFX {
  // What `keepIf` keeps each frame: a piece still in the air, a burst still going.
  static flying = (p) => !p.done;
  static spare = new Map();   // `pieceCanvas` / `release`: canvases of bodies already in the floor, by size
  static burning = (b) => { const F = TUNING.effects; return b.t < (b.blood ? F.bloodLife : (b.life || F.burstLife)); };
  constructor(game) {
    this.game = game; this.air = []; this.ground = []; this.bursts = [];
    if(!CombatFX.warmed){CombatFX.warmed=true;CombatFX.warm();}
  }

  // ---- Pixel fire, blasts, smoke and blood ----
  // The painted sheet this used to be, a photograph of a flame shrunk onto a pixel game, with a red
  // fringe round it, was the one thing on screen from another game (playtest 23 Sep 2026). All of it
  // is now baked once into small canvases at one texel a world pixel (`TUNING.effects.pixel`, the
  // grain the units are drawn at), from a handful of flat colour bands, and drawn with smoothing off.
  static hash(x,y,s) {
    let h=(x*374761393+y*668265263+s*982451653)|0;
    h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;
  }
  // Value noise, periodic over `py` lattice rows so a flame scrolled upward by exactly `py` loops.
  static noise(x,y,s,py=1e9) {
    const xi=Math.floor(x),yi=Math.floor(y),u=x-xi,v=y-yi,a=u*u*(3-2*u),b=v*v*(3-2*v),H=CombatFX.hash;
    const y0=((yi%py)+py)%py,y1=(((yi+1)%py)+py)%py;
    const h00=H(xi,y0,s),h10=H(xi+1,y0,s),h01=H(xi,y1,s),h11=H(xi+1,y1,s);
    return h00+(h10-h00)*a+(h01+(h11-h01)*a-h00-(h10-h00)*a)*b;
  }
  static bayer(x,y) { return BAYER4[(y&3)*4+(x&3)]; }
  // The five heat bands, ember to white-hot: ordinary fire, witchfire (`true` or 'witch'), and the poison's own
  // green for a puddle going off ('venom', 9 Oct 2026: it was drawn as a bomb, and read as one).
  static bands(witch) {
    if(witch==='venom')return ['#2f5a1c','#5c9a2a','#9fd84a','#d6f07a','#f4ffd0'];
    return witch===true||witch==='witch'?['#2a1d5c','#4b35b8','#7d5cff','#bfe6ff','#f6fcff']:['#6e1d14','#c8472a','#f2a233','#ffe08a','#fff8e2'];
  }
  // A cloud's smoke, darkest rim first: lighter than any floor it is over (9 Oct 2026, "the explosion is poorly
  // readable": the old soot was two shades off the plum floor and a bomb read as a black puff). `dust` is a door or a
  // crate breaking, the rest go with the fire's tint.
  static smoke(kind,tint) {
    if(kind==='dust'&&tint!=='witch')return ['#2a2220','#625650','#978a7e','#c2b5a6'];
    return tint==='witch'?['#1a1326','#4a3b6e','#7e6ca8','#b3a3d6']:tint==='venom'?['#1b2a10','#3f5a22','#6f8f3a','#a9c660']:['#241c20','#5a4e50','#8f8280','#bdb0a6'];
  }
  static canvas(w,h) { const c=document.createElement('canvas');c.width=Math.max(1,w);c.height=Math.max(1,h);return c; }
  // A piece's canvas, from the ones bodies already stamped into the floor gave back (`release`), else new.
  // Every kill made five to eight canvases and dropped them once the floor took the body: canvas memory
  // counts against the collector, so a long fight's bodies now go round again instead (`effects.spareCanvases`).
  static pieceCanvas(w,h) {
    const k=w+'x'+h,list=CombatFX.spare.get(k),c=list&&list.pop();
    if(!c)return CombatFX.canvas(w,h);
    const g=c.getContext('2d');g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.globalCompositeOperation='source-over';g.clearRect(0,0,c.width,c.height);
    return c;
  }
  static release(c) {
    if(!c)return;
    const k=c.width+'x'+c.height;let list=CombatFX.spare.get(k);
    if(!list)CombatFX.spare.set(k,list=[]);
    if(list.length<TUNING.effects.spareCanvases)list.push(c);
  }
  // Paint a heat field into ImageData through the bands: a field of 0..1 per cell becomes 1 of 5 flat
  // colours or nothing. `fn(x,y)` returns a colour, or nothing for empty; only cells inside `box`
  // ([x0, y0, x1, y1]) are asked, which is most of the cost of a blast that has not grown yet.
  // `rim`: a colour laid on every empty cell touching a filled one (four ways), so the shape has a one-texel dark
  // outline whatever floor it is drawn over; done on the pixel array before it is put, never read back.
  static paint(w,h,fn,box,rim) {
    const c=CombatFX.canvas(w,h),g=c.getContext('2d'),img=g.createImageData(w,h),d=img.data,cache={};
    const rgb=(hex)=>cache[hex]||(cache[hex]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)));
    const [x0,y0,x1,y1]=box?box.map((v,i)=>Math.max(0,Math.min(i%2?h:w,Math.round(v)))):[0,0,w,h];
    for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
      const col=fn(x,y);if(!col)continue;const v=rgb(col),i=(y*w+x)*4;
      d[i]=v[0];d[i+1]=v[1];d[i+2]=v[2];d[i+3]=255;
    }
    if(rim){
      const v=rgb(rim),edge=[];
      for(let y=Math.max(0,y0-1);y<Math.min(h,y1+1);y++)for(let x=Math.max(0,x0-1);x<Math.min(w,x1+1);x++){
        const i=(y*w+x)*4;if(d[i+3])continue;
        if((x>0&&d[i-1])||(x<w-1&&d[i+7])||(y>0&&d[i-w*4+3])||(y<h-1&&d[i+w*4+3]))edge.push(i);
      }
      for(const i of edge){d[i]=v[0];d[i+1]=v[1];d[i+2]=v[2];d[i+3]=255;}
    }
    g.putImageData(img,0,0);return c;
  }
  // One flame, `frames` long: a teardrop whose heat is eaten from the top by noise scrolling up
  // through it, so tongues form, lick and tear off. Sparks are baked in on the same loop.
  static flameFrames(size,witch) {
    const key=(witch?'w':'f')+size;CombatFX.flames=CombatFX.flames||{};
    if(CombatFX.flames[key])return CombatFX.flames[key];
    const E=TUNING.effects.flame,F=E.frames,B=CombatFX.bands(witch);
    const W=Math.max(5,Math.round(size*E.wide)),Hf=Math.max(7,Math.round(size*E.tall)),H=Math.round(Hf*1.35);
    const sc=1/Math.max(2.2,W*0.2),P=Math.max(2,Math.round(Hf*sc*1.4)),seed=witch?7:3,out=[];
    for(let f=0;f<F;f++) {
      const ph=f/F;
      const cv=CombatFX.paint(W,H,(x,y)=>{
        const v=(H-1-y)/(Hf-1);if(v>1.05)return 0;
        const sway=Math.sin((ph+v*0.7)*Math.PI*2)*0.16*v*(witch?1.5:1);
        const u=(x+0.5-W/2)/(W/2)-sway;
        const r=v<0.2?0.72+0.28*(v/0.2):Math.pow(Math.max(0,(1-v)/0.8),0.7);
        const n=CombatFX.noise(x*sc,y*sc+ph*P,seed,P)*0.7+CombatFX.noise(x*sc*2.3,y*sc*2.3+ph*P*2,seed+1,P*2)*0.3;
        const heat=(1-Math.abs(u)/Math.max(0.05,r))*1.05-n*(0.3+v*0.95)+(1-v)*0.22;
        if(heat<=0.04)return 0;
        return B[heat>0.82?4:heat>0.62?3:heat>0.4?2:heat>0.2?1:0];
      });
      // Sparks: a cell or two climbing off the tip on the same loop as the tongues.
      const g=cv.getContext('2d');
      for(let k=0;k<E.sparks;k++){
        const q=(ph+k/E.sparks)%1,hx=CombatFX.hash(k,size,seed);
        const sx=Math.round(W/2+(hx-0.5)*W*0.7+Math.sin(q*6+k)*W*0.12),sy=Math.round(H-Hf*0.7-q*(H-Hf*0.55));
        if(sy<0||q>0.85)continue;g.fillStyle=B[q<0.45?3:2];g.fillRect(sx,sy,1,q<0.3?2:1);
      }
      out.push(cv);
    }
    return CombatFX.flames[key]={frames:out,W,H};
  }
  // A blast, a puff of dust, or a spray of blood, `r` world px, as a strip of frames.
  // kind 'boom': flash → fireball → smoke that rises, darkens and dithers away.
  // kind 'dust': the same smoke with no fire in it (a door, a crate, a man burnt out).
  // kind 'blood': a splash thrown out in spokes that break into drops.
  // A real blast ('boom') is three phases on the strip (`E.flashTo`, `E.fireTo`; 9 Oct 2026, "the explosion is
  // poorly readable"): the FLASH, a solid pale disc at the radius with rays past it; the FIREBALL, the cloud of puffs
  // in concentric bands, white-hot inside, ember at the rim, cooling from the rim in; then SMOKE, lighter than the
  // floor, rising and dithered away. Every frame wears a one-texel dark rim (`paint`'s `rim`), so the shape is cut
  // out of whatever is behind it. `witch` is a tint: true / 'witch' for witchfire, 'venom' for a puddle going off.
  static burstFrames(kind,r,witch) {
    r=Math.max(6,Math.round(r/2)*2);
    const tint=witch===true||witch==='witch'?'witch':witch==='venom'?'venom':'fire';
    const key=kind+(tint==='fire'?'':tint[0])+r;CombatFX.blasts=CombatFX.blasts||{};
    if(CombatFX.blasts[key])return CombatFX.blasts[key];
    const E=TUNING.effects.blast,F=kind==='blood'?E.bloodFrames:E.frames,D=Math.ceil(r*2.9)|1,c=D/2;
    const B=kind==='blood'?['#3d0d0b',PALETTE.bloodDark,PALETTE.blood,'#e0604a','#e0604a']:CombatFX.bands(tint);
    const smoke=CombatFX.smoke(kind,tint),rim=E.rim&&kind!=='blood'?smoke[0]:null;
    const seed=(r*13+(tint==='witch'?5:tint==='venom'?9:0)+(kind==='dust'?2:0))|0,hash=CombatFX.hash,noise=CombatFX.noise,bayer=CombatFX.bayer;
    // The puffs the cloud is made of: fixed per size, so every frame is the same cloud growing.
    const puffs=[];const np=kind==='blood'?0:10+(r>30?4:0);
    for(let k=0;k<np;k++){const a=k/np*Math.PI*2+hash(k,r,seed)*1.2;
      puffs.push({ca:Math.cos(a),sa:Math.sin(a),d:0.25+hash(k,r,seed+1)*0.6,s:0.3+hash(k,r,seed+2)*0.28,up:hash(k,r,seed+4)});}
    const spokes=[];if(kind==='blood')for(let k=0;k<13;k++){const a=k/13*Math.PI*2+(hash(k,r,9)-0.5)*0.9;
      spokes.push({ca:Math.cos(a),sa:Math.sin(a),l:0.4+hash(k,r,10)*0.7,w:0.7+hash(k,r,11)*0.9});}
    // One frame, built the first time it is asked for: a blast pays for its frames as it plays
    // rather than all at once in the frame it goes off in.
    // Both noise fields a frame reads, made once per size: the coarse one taller by `pad` rows so a
    // frame can read it shifted (the smoke's grain climbs) instead of sampling noise again per cell.
    const pad=20;let NA=null,NB=null;
    const fields=()=>{if(NA)return;NA=new Float32Array(D*(D+pad));NB=new Float32Array(D*D);
      for(let y=0;y<D+pad;y++)for(let x=0;x<D;x++)NA[y*D+x]=noise(x*0.16,(y-pad)*0.16,seed)*0.5;
      for(let y=0;y<D;y++)for(let x=0;x<D;x++)NB[y*D+x]=noise(x*0.4,y*0.4,seed+3)*0.25;};
    const build=(f)=>{
      const q=f/(F-1);fields();
      if(kind==='blood') {
        // Each spoke is a drop with a tail: the head flies out, the tail it drags shortens behind
        // it and breaks off the middle, so the spray reads as wet and thrown, not as a star.
        const core=r*0.4*(1-q)*(1-q),reach=r*1.1*1.2+3;
        const sp=spokes.map(s=>{const hd=r*s.l*(0.3+0.9*Math.sqrt(q));return {...s,hd,tl:hd*(0.35+0.45*q),head:Math.max(0.7,r*0.075*s.w*(1-q*0.4))};});
        const ext=Math.max(core*1.2,...sp.map(s=>s.hd+s.head+2));
        return CombatFX.paint(D,D,(x,y)=>{
          const dx=x+0.5-c,dy=y+0.5-c,d=Math.sqrt(dx*dx+dy*dy);if(d>reach)return 0;
          if(d<core*1.2&&d<core*(0.8+NB[y*D+x]*1.6))return B[d<core*0.45&&q<0.3?3:d>core*0.8?1:2];
          for(const s of sp){
            const along=dx*s.ca+dy*s.sa;if(along<s.tl-1||along>s.hd+2)continue;
            const across=Math.abs(-dx*s.sa+dy*s.ca),k=(along-s.tl)/Math.max(1,s.hd-s.tl),wid=0.5+k*0.6*s.head,ah=along-s.hd;
            if(ah*ah+across*across<s.head*s.head)return B[q>0.6?1:2];
            if(across<wid&&along<s.hd){ if(q>0.45&&bayer(x,y)<(q-0.45)*2)return 0;return B[k>0.6?2:1]; }
          }
          return 0;
        },[c-ext,c-ext,c+ext,c+ext]);
      }
      const boom=kind==='boom';
      // THE FLASH: a solid disc of the two hottest bands, a dark rim, and rays thrown past it; the second frame
      // is already the whole radius, so the first thing seen is the size of the thing.
      if(boom&&q<E.flashTo){
        const k=q/E.flashTo,rf=r*(0.6+0.42*k),rays=8,ext=r*1.5+3;
        const cv=CombatFX.paint(D,D,(x,y)=>{
          const dx=x+0.5-c,dy=y+0.5-c,d=Math.sqrt(dx*dx+dy*dy);
          if(d<rf)return B[d<rf-2.5?4:3];
          if(d>ext)return 0;
          // a ray: a wedge of cells each `2π/rays` round, thinning to one cell at its tip
          const a=Math.atan2(dy,dx),s=((a/(Math.PI*2)*rays+0.5)%1+1)%1,wedge=Math.abs(s-0.5)*2,L=rf+(ext-rf)*(0.55+0.45*(1-k));
          if(d<L&&wedge<0.12*(1-(d-rf)/(L-rf)))return B[d<rf+(L-rf)*0.4?4:3];
          return 0;
        },[c-ext-1,c-ext-1,c+ext+1,c+ext+1],rim);
        return cv;
      }
      const grow=Math.sqrt(Math.min(1,q*2.4)),R=r*(0.38+0.7*grow+0.18*q),lift=r*0.4*q*q;
      // how much fire is left in the cloud: all of it at the flash's end, none past `fireTo`
      const heat=boom?Math.max(0,Math.min(1,(E.fireTo-q)/(E.fireTo-E.flashTo))):0;
      const gone=q>E.fade?(q-E.fade)/(1-E.fade):0,spread=1+q*0.45,r0=R*0.62;
      const pf=puffs.map(p=>({x:c+p.ca*p.d*R*0.75*spread,y:c+p.sa*p.d*R*0.6*spread-lift*(0.5+p.up),ir:1/(p.s*R*(1-gone*0.4))}));
      // Which puff a cell belongs to and how deep in it: the deepest wins, and where in that puff
      // it sits (its own top-left is the lit side) is what shades the smoke.
      let lx=0,ly=0;
      // Nearest by squared distance, one square root at the end: this runs for every cell of every frame.
      const ir0=1/r0,np2=pf.length;
      const dens=(x,y)=>{
        const cx=x+0.5,cy=y+0.5;let ox=(cx-c)*ir0,oy=(cy-c+lift)*ir0,best=ox*ox+oy*oy;lx=ox;ly=oy;
        for(let k=0;k<np2;k++){const p=pf[k];ox=(cx-p.x)*p.ir;oy=(cy-p.y)*p.ir;const d2=ox*ox+oy*oy;if(d2<best){best=d2;lx=ox;ly=oy;}}
        return 1-Math.sqrt(best);};
      let bx0=c-r0,by0=c-lift-r0,bx1=c+r0,by1=c-lift+r0;
      for(const p of pf){const e=1.13/p.ir;bx0=Math.min(bx0,p.x-e);by0=Math.min(by0,p.y-e);bx1=Math.max(bx1,p.x+e);by1=Math.max(by1,p.y+e);}
      const shift=pad-Math.round(q*3/0.16);
      const cv=CombatFX.paint(D,D,(x,y)=>{
        const dn=dens(x,y);if(dn<=-0.12)return 0;   // no noise can bring a cell this far out back in
        const n=NA[(y+shift)*D+x]+NB[y*D+x];
        const m=dn-n*0.4+0.12;if(m<=0)return 0;
        if(gone>0&&bayer(x,y)<gone*1.15)return 0;
        // THE FIREBALL: bands by depth into the cloud (`m`, 0 at its edge), white-hot at the heart and ember at the
        // rim, the whole scale sliding down as the heat goes, so the fire shrinks to a yellow core inside the smoke
        // and then is gone. Noise only roughens the band edges, it never chews the body to a mush.
        if(heat>0){const v=m*(0.8+0.9*heat)+heat*0.95-n*0.3;
          if(v>1.35)return B[4];if(v>1.05)return B[3];if(v>0.75)return B[2];if(v>0.45)return B[1];if(v>0.22)return B[0];}
        // Smoke: each puff lit on its upper left, a rim of the darkest at the edge of the cloud.
        // Tones are ordered-dithered into each other, so a puff is round rather than cut from facets.
        if(m<0.07)return smoke[0];
        const lit=-(lx*0.55+ly*0.75)+(n-0.4)*0.9+(bayer(x,y)-0.5)*0.55-q*0.35;
        return smoke[lit>0.3?3:lit>-0.25?2:1];
      },[bx0-1,by0-1,bx1+1,by1+1],rim);
      return cv;
    };
    const frames=new Array(F).fill(null);
    return CombatFX.blasts[key]={D,n:F,frames,frame:(i)=>frames[i]||(frames[i]=build(i))};
  }
  // A filled disc as cells on the world grid (current fillStyle): a drop, a dot of blood.
  static cellDisc(c,x,y,r) {
    const px=TUNING.effects.pixel,x0=Math.round(x/px)*px,y0=Math.round(y/px)*px,n=Math.max(0,Math.round(r/px-0.5));
    if(!n){c.fillRect(x0,y0,px,px);return;}
    c.beginPath();for(let j=-n;j<=n;j++){const w=Math.round(Math.sqrt(Math.max(0,(n+0.5)*(n+0.5)-j*j)-0.25));c.rect(x0-w*px,y0+j*px,(w*2+1)*px,px);}c.fill();
  }
  // A ring drawn as cells on the world grid, not a stroke: the same shape as `ctx.arc`, in pixels.
  static pixelRing(c,x,y,r,width,color) {
    if(r<=0.5)return;const cell=TUNING.effects.pixel,wd=Math.max(1,Math.round(width/cell))*cell,n=Math.max(12,Math.ceil(Math.PI*2*r/cell));
    c.fillStyle=color;c.beginPath();
    for(let i=0;i<n;i++){const a=i/n*Math.PI*2;c.rect(Math.round((x+Math.cos(a)*r)/cell)*cell-wd/2,Math.round((y+Math.sin(a)*r)/cell)*cell-wd/2,wd,wd);}
    c.fill();
  }
  // `pixelRing` only as far round as `frac` (0..1), clockwise from the top: a meter drawn in cells.
  static pixelArc(c,x,y,r,width,color,frac) {
    if(r<=0.5||frac<=0)return;const cell=TUNING.effects.pixel,wd=Math.max(1,Math.round(width/cell))*cell,n=Math.max(12,Math.ceil(Math.PI*2*r/cell)),m=Math.ceil(n*Math.min(1,frac));
    c.fillStyle=color;c.beginPath();
    for(let i=0;i<m;i++){const a=-Math.PI/2+i/n*Math.PI*2;c.rect(Math.round((x+Math.cos(a)*r)/cell)*cell-wd/2,Math.round((y+Math.sin(a)*r)/cell)*cell-wd/2,wd,wd);}
    c.fill();
  }
  // Prebakes the sizes a level actually asks for, one a tick, so the first bomb of a run does not
  // pay for its own frames in the middle of the frame it goes off in.
  static warm() {
    const E=TUNING.effects,P=TUNING.prop.bomb,G=TUNING.goat.bomb,k=E.bloodScale,jobs=[];
    // The radii `draw` asks for, scaled the way it scales them.
    const booms=[P.blastR,G.radius*G.fxScale],dusts=[[17,false],[23,false],[19,false],[19,true],[35,true]];
    const venomR=TUNING.status.blast.radius*TILE*0.8;   // a puddle going off (`Status.blast`), the green set
    const sets=[...booms.map(r=>['boom',r*E.blast.scale,false]),['boom',venomR*E.blast.scale,'venom'],...booms.map(r=>['soot',r*E.blast.soot*E.blast.dustScale,false]),
      ['soot',venomR*E.blast.soot*E.blast.dustScale,'venom'],...dusts.map(([r,w])=>['dust',r*E.blast.dustScale,w]),['blood',30*k,false],['blood',46*k,false]];
    // What the first floor meets first goes first: a kill's spray, then the flames.
    sets.sort((a,b)=>(b[0]==='blood')-(a[0]==='blood'));
    const late=[];
    for(const [kind,r,w] of sets){const set=CombatFX.burstFrames(kind,r,w);for(let i=0;i<set.n;i++)(kind==='blood'?jobs:late).push(()=>set.frame(i));}
    // Every size a flame is asked for (a knocked bowl's embers at 3 to a burning tile's 18 and a
    // bomb's 20), witchfire as well: its sets were baked the first time a keeper or a mage lit one,
    // 5–14 ms each in the middle of the fight (26 Sep 2026).
    for(let s=3;s<=20;s+=1)for(const w of [false,true])jobs.push(()=>CombatFX.flameFrames(s,w));
    jobs.push(...late);
    let i=0;const step=()=>{if(i>=jobs.length)return;try{jobs[i++]();}catch(e){i=jobs.length;}setTimeout(step,16);};
    setTimeout(step,300);
  }

  snapshot(e) {
    const art = this.game.renderer.painted;
    if (!PIXEL_ART.ready) return null;
    // One scratch canvas for every death: the pieces are cut out of it at once and it is never kept.
    const canvas = CombatFX.snap || (CombatFX.snap = CombatFX.canvas(96,96));
    const c = canvas.getContext('2d'); c.setTransform(1,0,0,1,0,0); c.globalCompositeOperation = 'source-over'; c.clearRect(0,0,96,96); c.translate(48,74);
    // The same key `drawEnemy` uses, kept in one place: a dying butcher or elite bearer used to
    // tear into plain clubman gore because this snapshot kept its own, shorter map that never
    // learned about `brute` or `butcher` at all.
    const key = art.characterKey(e) || 'sheep';
    art.character({ctx:c,t:0},{facing:e.facing||0},key,80);
    return canvas;
  }

  // The whole body at a set facing, duller than the living (`corpse.dark`, charred if burnt), and
  // its silhouette, which is the shadow it lies on.
  // Baked once per look and handed out as copies (8 Oct 2026): the grey pass reads the pixels back, a GPU
  // sync that cost every kill 10-36 ms, on the very frame a kill should land clean. A copy is a drawImage.
  // The copies are piece canvases as before, so `release` still takes them back; the masters never go round.
  corpseSprite(e,facing,burnt) {
    const art=this.game.renderer.painted,C=TUNING.effects.corpse,key=art.characterKey(e)||'sheep';
    const look=[key,facing,!!burnt,C.dark,C.grey,ART_PASS.on,ART_PASS.hunter,ART_PASS.clubman,ART_PASS.shield,ART_PASS.shaman].join('|');
    const cache=CombatFX.corpses||(CombatFX.corpses=new Map());
    let m=cache.get(look);
    if(!m){ m=CombatFX.bakeCorpse(art,key,facing,burnt); if(PIXEL_ART.ready) cache.set(look,m); }
    const image=CombatFX.pieceCanvas(96,96),shade=CombatFX.pieceCanvas(96,96);
    image.getContext('2d').drawImage(m.image,0,0);shade.getContext('2d').drawImage(m.shade,0,0);
    return {image,shade};
  }
  static bakeCorpse(art,key,facing,burnt) {
    const image=CombatFX.canvas(96,96),c=image.getContext('2d');
    // Feet at 64, not 74: the body turns about the canvas centre, and at full size a man hung off
    // his feet rolled over a good way off the spot he died on.
    c.translate(48,64);art.character({ctx:c,t:0},{facing},key,80);
    c.setTransform(1,0,0,1,0,0);c.globalCompositeOperation='source-atop';
    c.fillStyle=burnt?'rgba(19,13,16,0.8)':`rgba(24,12,16,${TUNING.effects.corpse.dark})`;c.fillRect(0,0,96,96);
    // Greyed toward ash (`corpse.grey`, 2 Oct 2026 playtest: a dead man and a floored one read alike),
    // once a death, so a body on the floor never reads as a man about to get up.
    const G=TUNING.effects.corpse.grey;
    if(G>0&&!burnt){c.setTransform(1,0,0,1,0,0);const d=c.getImageData(0,0,96,96),a=d.data;
      for(let i=0;i<a.length;i+=4){if(!a[i+3])continue;const l=0.3*a[i]+0.59*a[i+1]+0.11*a[i+2];a[i]+=(l-a[i])*G;a[i+1]+=(l-a[i+1])*G;a[i+2]+=(l*1.06-a[i+2])*G;}
      c.putImageData(d,0,0);}
    const shade=CombatFX.canvas(96,96),s=shade.getContext('2d');s.drawImage(image,0,0);
    s.globalCompositeOperation='source-in';s.fillStyle='#0b0709';s.fillRect(0,0,96,96);
    return {image,shade};
  }

  // What seeps out from under a body: cells, a darker rim, a glint near the middle. The edge is
  // off noise fixed to the spot, so a growing pool keeps its shape and only gets bigger. Cells on
  // stone are skipped, blood runs on the floor, not up a wall.
  static pool(c,x,y,r,seed,w) { CombatFX.fillPool(c,CombatFX.poolPaths(x,y,r,seed,w)); }
  static poolPaths(x,y,r,seed,w) {
    const px=TUNING.effects.pixel,x0=Math.round(x/px)*px,y0=Math.round(y/px)*px,span=Math.ceil(r*1.45/px)*px;
    const rim=new Path2D(),mid=new Path2D(),hi=new Path2D();
    for(let oy=-span;oy<=span;oy+=px)for(let ox=-span;ox<=span;ox+=px){
      const d=hyp(ox/1.3,oy)/r,lim=0.78+CombatFX.noise((x0+ox)*0.16,(y0+oy)*0.16,seed)*0.44;
      if(d>=lim||(w&&w.isSolid(Math.floor((x0+ox)/TILE),Math.floor((y0+oy)/TILE))))continue;
      (d>lim-0.13?rim:d<0.4&&CombatFX.bayer(ox/px,oy/px)<0.14?hi:mid).rect(x0+ox,y0+oy,px,px);
    }
    return {rim,mid,hi};
  }
  static fillPool(c,{rim,mid,hi}) {
    const [cr,cm,ch]=TUNING.effects.corpse.colors;c.fillStyle=cr;c.fill(rim);c.fillStyle=cm;c.fill(mid);c.fillStyle=ch;c.fill(hi);
  }
  poolR(p) { const C=TUNING.effects.corpse,k=clamp(((p.lay||0)-C.delay)/C.time,0,1); return p.pool*(1-(1-k)*(1-k)); }
  // A pool that has finished spreading goes into the floor for good.
  stampPool(p) {
    if(!p.pool||p.pooled)return;p.pooled=true;p.poolAt=null;
    const w=this.game.world,r=p.pool;
    w.paintStain(p.x,p.y,r*2,(c)=>CombatFX.pool(c,p.x,p.y,r,p.seed,w));
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
    // `size` is the 96-px canvas the snapshot and the corpse are drawn into, at world scale: the pixel
    // sprite is already his living size there. Squeezed to 40 (a leftover of the painted sheets,
    // drawn at 80) every body lay at under half the man it was (playtest, 24 Sep 2026).
    const sprite=this.snapshot(e), big=e.kind==='butcher', size=96;
    const torn=cause==='boom'||cause==='roll';
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
      // Head, torso and limbs retain the actual victim's coat and facing. Each piece is its own small
      // canvas with the cut in blood: the pixels of him along the crop's edges, and only those. It was
      // a bar laid straight across the top of the whole crop box, most of which is empty air, so a
      // blast left long red sticks crossing the floor (26 Sep 2026: "strange stripes").
      const cut=TUNING.effects.goreCut;
      for (const crop of [[20,0,56,35],[15,35,33,30],[48,35,33,30],[15,65,33,31],[48,65,33,31]]) {
        const pc=CombatFX.pieceCanvas(crop[2],crop[3]),g=pc.getContext('2d');
        g.drawImage(sprite,crop[0],crop[1],crop[2],crop[3],0,0,crop[2],crop[3]);
        g.globalCompositeOperation='source-atop';g.fillStyle=PALETTE.bloodDark;
        g.fillRect(0,0,crop[2],cut);g.fillRect(0,crop[3]-cut,crop[2],cut);g.fillRect(0,0,cut,crop[3]);g.fillRect(crop[2]-cut,0,cut,crop[3]);
        this.fragment(e.x,e.y,pc,[0,0,crop[2],crop[3]],size*crop[2]/96,size*crop[3]/96,dx,dy,'gore');
      }
    } else if (!e.corpsed && !e.hung) {   // a body the spade kept is a prop in the room, and one on the antlers hangs on the wall
      // He goes down in profile and ends on his side, a quarter turn, head the way the blow sent
      // him (`effects.corpse`): a man left standing at a random tilt read as a cut-out.
      const C=TUNING.effects.corpse,side=Math.abs(dx)>0.2?Math.sign(dx):(Math.random()<0.5?-1:1);
      const body=this.corpseSprite(e,Math.random()<0.5?Math.PI:0,cause==='burn');   // face up or face down
      this.fragment(e.x,e.y,body.image,[0,0,96,96],size,size,dx,dy,cause==='burn'?'char':'body',
        {vx:dx*20+(e.vx||0)*C.carry,vy:dy*20+(e.vy||0)*C.carry,vz:95,spin:2.5*side,angle:(e.facing||0)+0.8,
          shade:body.shade,rest:side*Math.PI/2+(Math.random()-0.5)*2*C.lie,
          pool:cause==='burn'?0:(big?C.big:C.pool),seed:(Math.random()*1e6)|0,
          key:this.game.renderer.painted.characterKey(e)});   // who he was, for the thrower's fist (`Thrower.bodyProp`)
      if(cause==='burn') this.explosion(e.x,e.y,19,!!e.witchBurn,true);
    }
  }

  blood(x,y,dx,dy,count) {
    const d=hyp(dx,dy)||1;
    for(let i=0;i<count;i++) {
      const a=Math.atan2(dy,dx)+(Math.random()-0.5)*2.8;
      const s=TUNING.effects.bloodSpeed*(0.35+Math.random());
      this.add({x,y,vx:Math.cos(a)*s+dx/d*20,vy:Math.sin(a)*s+dy/d*20,z:8,
        vz:45+Math.random()*110,width:1.5+Math.random()*3,height:2,angle:a,spin:0,
        age:0,bounces:0,material:'blood'});
    }
  }

  debris(p,dx=0,dy=0) {
    // Splinters are cut out of the pixel crate itself, so what flies off is the box that broke.
    const metal=!!p.iron, f=PIXEL_ENV_ASSETS.items[PIXEL_ENV_ID[p.kind==='barrel'?'barrel':'crate']], img=PIXEL_ENV.ready?PIXEL_ENV.image:null;
    const count=p.kind==='door'?TUNING.effects.doorPieces:TUNING.effects.cratePieces;
    const speed=hyp(dx,dy); if(speed){dx/=speed;dy/=speed;}
    for(let i=0;i<count;i++) {
      const plank=i<Math.ceil(count*0.6);
      this.fragment(p.x,p.y,img,[f[0]+f[2]*(0.15+(i%3)*0.24),f[1]+f[3]*(0.15+(i%4)*0.17),f[2]*0.18,f[3]*0.4],
        plank?4+Math.random()*3:3,plank?11+Math.random()*10:5,
        dx||Math.cos(i*2.4),dy||Math.sin(i*2.4),metal?'metal':'wood',
        {image:null,color:metal?'#555761':i%2?'#a57949':'#755034'});
    }
    this.explosion(p.x,p.y,p.kind==='door'?23:17,false,true);
  }

  // `life` overrides the shared `burstLife` for this one burst, Bomb Charge asks for a smaller,
  // quicker flash than a door or a crate breaking so the fight behind it stays readable.
  // `harm`: the radius the blast actually reaches (hearts, the fling), laid on the floor as the stamp the frame it
  // goes off (`draw`); the cloud itself is `r`, which a caller draws smaller than the harm on purpose (BOMB CHARGE).
  // `witch` is the tint: true for witchfire, 'venom' for a puddle going off.
  explosion(x,y,r,witch=false,smokeOnly=false,life,harm) {
    if(this.bursts.length>=TUNING.effects.maxBursts)this.bursts.shift();
    this.bursts.push({x,y,r,witch,smokeOnly,t:0,seed:Math.random()*6.28,life,harm});
    if(smokeOnly)return;
    // What makes a blast weigh something without shaking the picture (shakes are the goat's alone):
    // embers that outrun the cloud, a beat of light on the screen and the lens, charred chunks thrown up
    // that come down and bounce, and a column of smoke that goes on rising after the fireball has burnt out.
    const g=this.game,E=TUNING.effects.blast,n=Math.round(E.embers*Math.min(1.4,r/40)),venom=witch==='venom';
    const hi=venom?PALETTE.venomHi:witch?PALETTE.witchHi:PALETTE.fireHi,lo=venom?PALETTE.venom:witch?PALETTE.witch:PALETTE.fire;
    for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=r*(3.5+Math.random()*5.5);
      g.parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:0.14+Math.random()*0.3,color:i%3?hi:lo,size:i%4?1:2,streak:true});}
    const soot=CombatFX.smoke('boom',venom?'venom':witch?'witch':'fire'),nd=Math.round(E.debris*Math.min(1.4,r/40));
    for(let i=0;i<nd;i++){const a=Math.random()*Math.PI*2;
      this.fragment(x,y,null,[0,0,0,0],2+Math.random()*2,2+Math.random()*3,Math.cos(a),Math.sin(a),'char',{color:i%3?soot[1]:soot[0],z:3,vz:TUNING.effects.lift*(0.9+Math.random()*0.8)});}
    g.flash(hi,E.flash);g.zoomPunch(E.punch);
    if(this.bursts.length>=TUNING.effects.maxBursts)this.bursts.shift();
    this.bursts.push({x,y:y-r*0.35,r:r*E.soot,witch,smokeOnly:true,soot:true,t:-E.sootAfter,life:E.sootLife});
  }

  settle(p) {
    const w=this.game.world;
    if(!w||w.isSolid(Math.floor(p.x/TILE),Math.floor(p.y/TILE))||w.isPitPx(p.x,p.y))return;
    p.z=0;
    if(p.material==='blood') { w.dot(p.x,p.y,p.width*0.8,PALETTE.bloodDark); return; }
    if(p.material==='gore')w.splat(p.x,p.y,0,0,5);
    if(p.rest!==undefined) {   // a body: it slides on, rolls onto its side, and bleeds (`corpse`)
      const C=TUNING.effects.corpse;p.vx*=C.keep;p.vy*=C.keep;p.lay=0;p.from=p.angle;p.slid=0;
      p.rest=p.angle+angleDiff(p.angle,p.rest);
      p.twitch=Array.from({length:C.twitches},()=>C.settle+Math.random()*(C.twitchBy-C.settle)).sort((a,b)=>a-b);
    }
    this.ground.push(p);
    if(this.ground.length>TUNING.effects.maxGround) {
      const old=this.ground.shift(); this.stampPool(old); old.angle=old.rest??old.angle; this.drawPiece(w.dctx,old,false);
      CombatFX.release(old.image); CombatFX.release(old.shade); old.image=old.shade=null;   // in the floor now: its canvases go round again
    }
  }

  // Bodies on the floor: the slide, the turn onto the side, a twitch or two, the pool spreading.
  updateGround(dt) {
    const C=TUNING.effects.corpse,w=this.game.world;
    for(const p of this.ground) {
      if(p.lay===undefined||p.still)continue;
      p.lay+=dt;
      const sp=hyp(p.vx,p.vy);
      if(sp>1) {
        const nx=p.x+p.vx*dt,ny=p.y+p.vy*dt;
        if(w.isSolid(Math.floor(nx/TILE),Math.floor(p.y/TILE))||w.isPitPx(nx,p.y))p.vx=0;else p.x=nx;
        if(w.isSolid(Math.floor(p.x/TILE),Math.floor(ny/TILE))||w.isPitPx(p.x,ny))p.vy=0;else p.y=ny;
        const k=Math.max(0,sp-C.friction*dt)/sp;p.vx*=k;p.vy*=k;
        p.slid+=sp*dt;if(p.pool&&p.slid>=C.smear){p.slid=0;w.dot(p.x,p.y,1.2,PALETTE.bloodDark);}
      } else {p.vx=p.vy=0;}
      const s=clamp(p.lay/C.settle,0,1);p.angle=p.from+(p.rest-p.from)*(1-(1-s)*(1-s));
      p.jerk=p.twitch.some(t=>p.lay>=t&&p.lay<t+0.07)?1:0;
      if(p.lay>=C.delay+C.time&&p.lay>=C.twitchBy+0.1){this.stampPool(p);p.angle=p.rest;p.jerk=0;p.still=true;}
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
    keepIf(this.air,CombatFX.flying);
    this.updateGround(dt);
    for(const b of this.bursts)b.t+=dt;
    keepIf(this.bursts,CombatFX.burning);
  }

  drawPiece(c,p,airborne) {
    c.save();c.translate(p.x,p.y);
    if(airborne&&p.material!=='blood') {
      c.fillStyle='rgba(9,5,10,0.24)';c.beginPath();c.ellipse(0,2,Math.min(p.width*0.45,15),2.5,0,0,Math.PI*2);c.fill();
    }
    // A body on the floor lies on its own silhouette, a pixel toward the camera: contact, not a halo.
    if(!airborne&&p.shade){c.save();c.translate(0,1.5);c.rotate(p.angle);c.globalAlpha*=TUNING.effects.corpse.shade;c.imageSmoothingEnabled=false;
      c.drawImage(p.shade,p.crop[0],p.crop[1],p.crop[2],p.crop[3],-p.width/2,-p.height/2,p.width,p.height);c.restore();}
    c.translate(0,-(p.z||0));c.rotate(p.angle+(p.jerk?0.06:0));
    if(p.jerk)c.scale(1.04,0.95);
    if(p.image) {
      // Solid: a body at nine-tenths let the floor show through it and read as a ghost.
      c.globalAlpha*=p.material==='char'?0.85:p.material==='body'?1:0.95;c.imageSmoothingEnabled=false;
      c.drawImage(p.image,p.crop[0],p.crop[1],p.crop[2],p.crop[3],-p.width/2,-p.height/2,p.width,p.height);   // a gore piece carries its own cut (`death`)
    } else if(p.material==='blood') {
      // A drop is a cell or two along its flight, not a smooth lozenge.
      c.rotate(-p.angle);const px=TUNING.effects.pixel,n=Math.max(1,Math.round(p.width/px));
      c.fillStyle=PALETTE.bloodDark;c.fillRect(-px,-px,(n+1)*px,2*px);c.fillStyle=PALETTE.blood;c.fillRect(-px/2,-px/2,n*px,px);
    } else {
      // A splinter is a slab of cells with a lit edge and, on a long one, a nail: no vector wedges.
      const px=TUNING.effects.pixel,w=Math.max(px,Math.round(p.width/px)*px),h=Math.max(px,Math.round(p.height/px)*px);
      c.fillStyle=p.color;c.fillRect(-w/2,-h/2,w,h);
      // a charred chunk out of a blast has no lit grain: its edge is only a shade lighter than itself
      c.fillStyle=p.material==='metal'?'#a3a6ae':p.material==='brass'?PALETTE.fireHi:p.material==='char'?'#6b5f5e':'#c49860';c.fillRect(-w/2,-h/2,px,h);
      if(h>12){c.fillStyle='#29232a';c.fillRect(0,-h/2+4,px,px);}
    }
    c.restore();
  }

  drawGround(renderer,game) {
    const c=renderer.ctx,w=game.world;
    // Pools still spreading are drawn live, under every body; a finished one is in the stains. Its cells
    // are worked out again only when it has grown a whole pixel (or the body moved): noise per cell
    // per pool per frame was a millisecond a body on a floor full of them.
    for(const p of this.ground)if(p.pool&&!p.pooled&&p.lay!==undefined&&!game.hidden(p.x,p.y)){
      const r=Math.round(this.poolR(p));if(r<1)continue;
      const k=p.poolAt;if(!k||k.r!==r||k.x!==p.x||k.y!==p.y)p.poolAt={r,x:p.x,y:p.y,paths:CombatFX.poolPaths(p.x,p.y,r,p.seed,w)};
      CombatFX.fillPool(c,p.poolAt.paths);
    }
    for(const p of this.ground)if(!game.hidden(p.x,p.y))this.drawPiece(c,p,false);
  }

  draw(renderer,game) {
    const c=renderer.ctx;
    for(const p of this.air)if(!game.hidden(p.x,p.y))this.drawPiece(c,p,true);
    const E=TUNING.effects;
    for(const b of this.bursts) {
      if(b.t<0||game.hidden(b.x,b.y))continue;
      const duration=b.blood?E.bloodLife:(b.life||E.burstLife);
      const progress=Math.min(0.999,b.t/duration);
      const kind=b.blood?'blood':b.soot?'soot':b.smokeOnly?'dust':'boom';
      const set=CombatFX.burstFrames(kind,b.r*(kind==='boom'?E.blast.scale:kind==='blood'?1:E.blast.dustScale),b.witch);
      const q=kind==='dust'||kind==='soot'?0.3+progress*0.7:progress;
      const im=set.frame(Math.min(set.n-1,Math.floor(q*set.n)));
      const venom=b.witch==='venom',hi=venom?PALETTE.venomHi:b.witch?PALETTE.witchHi:PALETTE.fireHi,lo=venom?PALETTE.venom:b.witch?PALETTE.witch:PALETTE.fire;
      // A blast lights the room for an instant: the one smooth thing, because light is.
      if(kind==='boom'&&progress<E.blast.lightFor) {
        const a=1-progress/E.blast.lightFor,R=b.r*E.blast.light;c.save();c.globalCompositeOperation='lighter';
        const gl=c.createRadialGradient(b.x,b.y,0,b.x,b.y,R);
        gl.addColorStop(0,venom?`rgba(170,230,90,${0.45*a})`:b.witch?`rgba(125,92,255,${0.5*a})`:`rgba(255,170,70,${0.5*a})`);gl.addColorStop(1,'rgba(0,0,0,0)');
        c.fillStyle=gl;c.fillRect(b.x-R,b.y-R,R*2,R*2);c.restore();
      }
      // THE STAMP (`blast.stamp`): the harm radius on the floor the frame it goes off, a disc of cells in the fire's
      // own colour, ordered-dithered away over its short life, so where the blast reached is read at once and the
      // cloud that follows is known to be its picture, not its reach.
      if(kind==='boom'&&b.harm&&progress<E.blast.stamp.time) {
        const S=E.blast.stamp,p=progress/S.time,cell=E.pixel*2,n=Math.round(b.harm/cell),bayer=CombatFX.bayer;
        c.save();c.globalAlpha=S.alpha*(1-p*0.6);c.fillStyle=lo;c.beginPath();
        const ox=Math.round(b.x/cell)*cell,oy=Math.round(b.y/cell)*cell;
        for(let j=-n;j<=n;j++){const w=Math.sqrt(Math.max(0,n*n-j*j));for(let i=-w;i<=w;i++)if(bayer(i,j)>=p*1.25)c.rect(ox+i*cell,oy+j*cell,cell,cell);}
        c.fill();c.restore();
      }
      // The shock on the floor: a pixel ring racing out ahead of the cloud to the harm's edge, the hot band with
      // the darker one a step inside it.
      if(kind==='boom'&&progress<E.blast.ringFor) {
        const p=progress/E.blast.ringFor,R=(b.harm||b.r)*(0.45+p*E.blast.ringOut),W=E.blast.ringW*(1-p)+1;c.save();c.globalAlpha=1-p*p;
        CombatFX.pixelRing(c,b.x,b.y,R,W,hi);CombatFX.pixelRing(c,b.x,b.y,R-W-1,Math.max(1,W*0.6),lo);c.restore();
      }
      c.save();c.imageSmoothingEnabled=false;c.translate(b.x,b.y);c.scale(1,1/TILT);
      const px=E.pixel,s=set.D*px,dustA=kind==='dust'||kind==='soot'?E.blast.dustAlpha:1;
      if(dustA<1)c.globalAlpha=dustA;
      c.drawImage(im,Math.round(-s/2),Math.round(-s/2-(kind==='blood'?0:b.r*0.12)),s,s);
      c.restore();
    }
  }

  // The one flame every burning thing in the game draws: a floor tile, a brazier, a lamp, a man.
  static flame(renderer,x,y,size,seed,witch) {
    const c=renderer.ctx;
    // Sizes come in whole pixels, so a bigger flame is a bigger baked set rather than a stretched
    // one: a stretched pixel is the thing this replaced.
    const E=TUNING.effects,set=CombatFX.flameFrames(Math.max(3,Math.round(size*E.flame.scale)),witch);
    const n=set.frames.length,frame=((Math.floor(renderer.t*E.fireFps+seed*2.7)%n)+n)%n,px=E.pixel;
    const smooth=c.imageSmoothingEnabled;c.imageSmoothingEnabled=false;
    c.drawImage(set.frames[frame],Math.round(x-set.W*px/2),Math.round(y+2-set.H*px),set.W*px,set.H*px);
    c.imageSmoothingEnabled=smooth;
  }
}
