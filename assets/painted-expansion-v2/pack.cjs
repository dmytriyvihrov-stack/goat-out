// Reproducible mechanical sprite extraction; the drawings are generated source PNGs.
const fs = require('fs'), path = require('path');
let sharp; try { sharp = require('sharp'); } catch { sharp = require('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp'); }
const ROOT = __dirname, DIRS = ['S','SW','W','NW','N','NE','E','SE'];
const manifest = { version: 2, cellSize: 128, directions: DIRS, origin: [64,104], units: {}, tiles: {}, doors: {}, objects: {}, crops: {} };
const embedded = {}, checks = [];
function save(rel, data) { const file=path.join(ROOT,rel); fs.mkdirSync(path.dirname(file),{recursive:true}); fs.writeFileSync(file,data); }
function embed(key, rel, png) { embedded[key]={width:png.readUInt32BE(16),height:png.readUInt32BE(20),src:'data:image/png;base64,'+png.toString('base64')}; save(rel,png); }
async function rawSource(name) {
  const {data,info}=await sharp(path.join(ROOT,'source',name+'.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const w=info.width,h=info.height; let transparent=0;
  for(let x=0;x<w;x++) if(data[x*4+3]<20)transparent++;
  // Keep native alpha intact. For the generator's baked neutral checkerboard, flood only matte
  // connected to the canvas boundary, retaining enclosed pale cloth/skin/metal highlights.
  if(transparent<w*.8){
    const seen=new Uint8Array(w*h),q=new Int32Array(w*h);let head=0,tail=0;
    const candidate=i=>{const p=i*4,lo=Math.min(data[p],data[p+1],data[p+2]),hi=Math.max(data[p],data[p+1],data[p+2]);return data[p+3]<20||(lo>165&&hi-lo<26);};
    const seed=i=>{if(!seen[i]&&candidate(i)){seen[i]=1;q[tail++]=i;}};
    for(let x=0;x<w;x++){seed(x);seed((h-1)*w+x);}for(let y=0;y<h;y++){seed(y*w);seed(y*w+w-1);}
    while(head<tail){const i=q[head++],x=i%w,y=(i/w)|0;data[i*4+3]=0;if(x)seed(i-1);if(x<w-1)seed(i+1);if(y)seed(i-w);if(y<h-1)seed(i+w);}
    // Enclosed checker holes contain both neutral squares, unlike warm cloth highlights.
    for(let i=0;i<w*h;i++)if(!seen[i]&&candidate(i)){
      let hd=0,tl=1,white=0,gray=0;q[0]=i;seen[i]=1;
      while(hd<tl){const j=q[hd++],p=j*4,lo=Math.min(data[p],data[p+1],data[p+2]),hi=Math.max(data[p],data[p+1],data[p+2]);if(hi-lo<9){if(lo>238)white++;if(lo<215)gray++;}const x=j%w,y=(j/w)|0;
        for(const k of [x?j-1:-1,x<w-1?j+1:-1,y?j-w:-1,y<h-1?j+w:-1])if(k>=0&&!seen[k]&&candidate(k)){seen[k]=1;q[tl++]=k;}}
      if(tl>60&&white>tl*.15&&gray>tl*.15)for(let k=0;k<tl;k++)data[q[k]*4+3]=0;
    }
  }
  return {data,w,h};
}
function cuts(projection,n){const out=[0],size=projection.length;for(let k=1;k<n;k++){const at=size*k/n,r=size/n*.32;let best=Math.round(at),score=Infinity;
  for(let i=Math.max(out.at(-1)+1,Math.floor(at-r));i<Math.min(size,at+r);i++){const cost=projection[i]*100+Math.abs(i-at)*.01;if(cost<score){score=cost;best=i;}}out.push(best);}out.push(size);return out;}
async function cells(name,rows,cols){
  const {data,w,h}=await rawSource(name),yp=new Uint32Array(h);for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(data[(y*w+x)*4+3]>96)yp[y]++;
  const ys=cuts(yp,rows),out=[];manifest.crops[name]=[];
  for(let r=0;r<rows;r++){const xp=new Uint32Array(w);for(let y=ys[r];y<ys[r+1];y++)for(let x=0;x<w;x++)if(data[(y*w+x)*4+3]>96)xp[x]++;
    const xs=cuts(xp,cols);
    for(let c=0;c<cols;c++){let x0=xs[c+1],y0=ys[r+1],x1=xs[c],y1=ys[r],count=0;
      for(let y=ys[r];y<ys[r+1];y++)for(let x=xs[c];x<xs[c+1];x++)if(data[(y*w+x)*4+3]>96){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);count++;}
      if(count<25)throw Error('Empty '+name+' '+r+','+c);
      const box={left:x0,top:y0,width:x1-x0+1,height:y1-y0+1};
      const png=await sharp(data,{raw:{width:w,height:h,channels:4}}).extract(box).png().toBuffer();
      let sum=0,num=0;for(let y=Math.round(y0+box.height*.88);y<=y1;y++)for(let x=x0;x<=x1;x++)if(data[(y*w+x)*4+3]>96){sum+=x-x0;num++;}
      const cell={png,...box,footX:num?sum/num:box.width/2};out.push(cell);manifest.crops[name].push(box);
    }
  }return out;
}
// Character frames default to a taller maxH than the original 96: at 96 (75% of the 128 cell) the
// packed units read squat and small next to the clubman's walk-sheet art, which fills more like 80%
// of its own cell — reported as "torn from the ground" and "different sets, different size." 102
// keeps a 2px safety margin under the baseline=104 ceiling (any higher and a tall pose's hat brim
// risks a hairline crop at the canvas edge) while landing on the clubman's own fill fraction.
async function frame(c,{maxH=102,maxW=116,baseline=104,feet=true}={}){
  const scale=Math.min(maxH/c.height,maxW/c.width),w=Math.max(1,Math.round(c.width*scale)),h=Math.max(1,Math.round(c.height*scale));
  const left=Math.max(2,Math.min(126-w,Math.round(64-(feet?c.footX:c.width/2)*scale))),top=baseline-h;
  const png=await sharp({create:{width:128,height:128,channels:4,background:'#00000000'}}).composite([{input:await sharp(c.png).resize(w,h,{kernel:'nearest'}).png().toBuffer(),left,top}]).png().toBuffer();
  const {data}=await sharp(png).raw().toBuffer({resolveWithObject:true});let count=0,edges=0;for(let y=0;y<128;y++)for(let x=0;x<128;x++)if(data[(y*128+x)*4+3]>32){count++;if(!x||!y||x===127||y===127)edges++;}if(count<20||edges)throw Error('Invalid frame');
  checks.push({opaquePixels:count,edgePixels:edges});return png;
}
async function sheet(frames,cols){return sharp({create:{width:cols*128,height:Math.ceil(frames.length/cols)*128,channels:4,background:'#00000000'}}).composite(frames.map((input,i)=>({input,left:i%cols*128,top:Math.floor(i/cols)*128}))).png().toBuffer();}
async function main(){
  const sw=await cells('southwest',1,4),rightHand=await cells('right-hand',2,3);let swIndex=0;
  for(const key of ['hunter','brute','butcher','wraith','chicken']){
    const source=await cells(key,2,4);
    if(key==='wraith'){[source[1],source[7]]=[source[7],source[1]];}else source[1]=sw[swIndex++];
    const flip=key==='brute'||key==='butcher',mirrorRows=[0,7,6,5,4,3,2,1];
    const frames=[];for(let i=0;i<8;i++){
      const c=source[flip?mirrorRows[i]:i];
      let corrected=flip?{...c,png:await sharp(c.png).flop().png().toBuffer(),footX:c.width-1-c.footX}:c;
      // Individual generation poses can swap the arm independently. Use the verified right-hand
      // profile/back diagonal/front diagonal corrections instead of blindly flipping those views.
      if(flip&&[2,3,7].includes(i))corrected=rightHand[(key==='butcher'?3:0)+[2,3,7].indexOf(i)];
      if(key==='brute'&&i===4)corrected=source[4];
      const png=await frame(corrected);save('units/'+key+'/'+DIRS[i]+'.png',png);frames.push(png);
    }
    const png=await sheet(frames,1);embed(key+'Facing','units/'+key+'-facing.png',png);
    manifest.units[key]={file:'units/'+key+'-facing.png',columns:1,rows:8,frameSize:[128,128],origin:[64,104],animation:false};
  }
  // User correction: right-handed clubman. Mirroring swaps the compass rows as well as pixels.
  const oldClub=path.join(ROOT,'../painted-expansion-v1/units/clubman-walk.png'),clubFrames=[];
  for(const row of [0,7,6,5,4,3,2,1])for(let col=0;col<4;col++){
    const crop=sharp(oldClub).extract({left:col*128,top:row*128,width:128,height:128});
    clubFrames.push(await (row===4?crop:crop.flop()).png().toBuffer());
  }
  embed('clubmanWalk','units/clubman-walk.png',await sheet(clubFrames,4));
  manifest.units.clubman={file:'units/clubman-walk.png',columns:4,rows:8,frameSize:[128,128],origin:[64,104],animation:true,note:'Existing walk art mirrored and compass rows swapped to carry the club in the right hand.'};
  const props=await cells('props-corrections',1,3);
  for(let i=0;i<3;i++){const name=['cagePost','cageBroken','healingGrass'][i],rel='objects/'+name+'.png';const f=await frame(props[i],{maxH:i===2?55:104,maxW:112,baseline:112,feet:false});embed(name,rel,f);
    // Tight versions preserve the slender post's proportions at its small gameplay footprint.
    const tight=await sharp(props[i].png).resize({width:128,height:128,fit:'inside',kernel:'nearest'}).png().toBuffer();embed(name+'Tight','objects/'+name+'-tight.png',tight);manifest.objects[name]={file:rel,origin:[64,112]};}
  const dc=await cells('doors-corrections',4,4);
  for(let r=0;r<4;r++){const name=['wood','iron','vault','soul'][r],frames=[];for(let c=0;c<4;c++){const f=await frame(dc[r*4+c],{maxH:116,maxW:116,baseline:122,feet:false});save('doors/'+name+'/'+['closed','opening','open','broken'][c]+'.png',f);frames.push(f);}
    const png=await sheet(frames,4);embed('slab'+name[0].toUpperCase()+name.slice(1),'doors/'+name+'.png',png);
    const closed=await sharp(dc[r*4].png).resize(26,116,{fit:'fill',kernel:'nearest'}).png().toBuffer();embed('slab'+name[0].toUpperCase()+name.slice(1)+'Closed','doors/'+name+'-closed-tight.png',closed);
    manifest.doors[name]={file:'doors/'+name+'.png',states:['closed','opening','open','broken'],runtimeClosed:'doors/'+name+'-closed-tight.png',runtimeSize:[13,58],note:'Runtime rotates the tight closed slab continuously with the existing open amount; generated states are retained for inspection.'};
  }
  const names=['stone0','stone1','stone2','stone3','wallTop','wallFace','boards0','boards1'];
  for(const [i,name]of ['yard','road','threshing','bridge','rafters','ossuary'].entries()){
    const file=path.join(ROOT,'source','tiles-'+name+'.png'),meta=await sharp(file).metadata();manifest.tiles[i+1]={name,keys:[]};
    for(let c=0;c<8;c++){const x=c%4,y=c>>2,left=Math.round(x*meta.width/4),top=Math.round(y*meta.height/2),width=Math.round((x+1)*meta.width/4)-left,height=Math.round((y+1)*meta.height/2)-top;
      const png=await sharp(file).extract({left,top,width,height}).resize(128,128,{kernel:'nearest'}).removeAlpha().png().toBuffer(),key='level'+(i+1)+'_'+names[c];embed(key,'tiles/'+name+'/'+names[c]+'.png',png);manifest.tiles[i+1].keys.push(key);}
  }
  save('manifest.json',JSON.stringify(manifest,null,2)+'\n');save('validation.json',JSON.stringify({frames:checks.length,allNonempty:true,allTransparentEdges:true,checks},null,2)+'\n');
  fs.writeFileSync(path.join(ROOT,'../../js/painted-assets-v2.js'),'// Generated by assets/painted-expansion-v2/pack.cjs. Embedded for offline builds.\nconst PAINTED_ASSETS_V2 = '+JSON.stringify(embedded)+';\n');
  console.log('Packed '+Object.keys(embedded).length+' assets, '+checks.length+' checked frames.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
