// Offline asset preparation only. Requires sharp; never writes live game files.
const fs=require('fs'), path=require('path'), sharp=require('sharp');
const ROOT=__dirname, DIRS=['S','SW','W','NW','N','NE','E','SE'];
const manifest={version:1,cellSize:128,directions:DIRS,angleConvention:'atan2(dy,dx), screen Y down; row = (round(angle/(PI/4))+14)%8',units:{},effects:{},doors:{},objects:{}};
const allFrames={}, sources={};
const save=(name,data)=>{fs.mkdirSync(path.dirname(path.join(ROOT,name)),{recursive:true});fs.writeFileSync(path.join(ROOT,name),data)};
async function source(name,rows,cols,opts={}){
  let {data,info}=await sharp(path.join(ROOT,'source',name+'.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const w=info.width,h=info.height, candidate=new Uint8Array(w*h);
  for(let i=0;i<w*h;i++){
    const p=i*4,r=data[p],g=data[p+1],b=data[p+2];
    if(r>160&&b>160&&Math.min(r,b)-g>90){data[p+3]=0;data[p]=data[p+1]=data[p+2]=0;}
    else if(opts.checker){const lo=Math.min(r,g,b),hi=Math.max(r,g,b);candidate[i]=data[p+3]<16||(lo>170&&hi-lo<24)?1:0;}
    if(opts.leftCut&&i%w<opts.leftCut)data[p+3]=0;
  }
  if(opts.checker){
    const seen=new Uint8Array(w*h),q=new Int32Array(w*h);
    for(let i=0;i<w*h;i++)if(candidate[i]&&!seen[i]){
      let head=0,tail=1,border=false;q[0]=i;seen[i]=1;
      while(head<tail){let n=q[head++],x=n%w,y=(n/w)|0;if(x===0||y===0||x===w-1||y===h-1)border=true;
        for(const j of [x>0?n-1:-1,x<w-1?n+1:-1,y>0?n-w:-1,y<h-1?n+w:-1])if(j>=0&&!seen[j]&&candidate[j]){seen[j]=1;q[tail++]=j;}}
      if(border||tail>300)for(let j=0;j<tail;j++)data[q[j]*4+3]=0;
    }
  }
  // Locate row gutters: generated sheets can have uneven outer padding.
  const yp=Array(h).fill(0);for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(data[(y*w+x)*4+3]>100)yp[y]++;
  const splitProjection=(projection,n,start,end)=>{
    const runs=[];let st=-1;for(let i=start;i<=end;i++){const empty=i<end&&projection[i]<=2;if(empty&&st<0)st=i;if(!empty&&st>=0){if(st>start&&i<end&&i-st>=5)runs.push([st,i]);st=-1;}}
    if(runs.length<n-1)return null;
    return [start,...runs.sort((a,b)=>(b[1]-b[0])-(a[1]-a[0])).slice(0,n-1).map(a=>Math.round((a[0]+a[1])/2)).sort((a,b)=>a-b),end];
  };
  let splits=splitProjection(yp,rows,0,h);
  if(!splits){splits=[0];for(let r=1;r<rows;r++){
    const expected=r*h/rows, radius=h/rows*.32;
    let best=Math.round(expected),score=Infinity;
    for(let y=Math.max(splits.at(-1)+10,Math.floor(expected-radius));y<Math.min(h,expected+radius);y++){
      const val=yp[y]*100+Math.abs(y-expected)*.03;if(val<score){score=val;best=y;}}
    splits.push(best);
  }splits.push(h);}
  const cells=[];
  for(let r=0;r<rows;r++){
    cells[r]=[];
    const left=opts.leftCut||0, cw=(w-left)/cols;
    const xp=Array(w).fill(0);for(let y=splits[r];y<splits[r+1];y++)for(let x=left;x<w;x++)if(data[(y*w+x)*4+3]>100)xp[x]++;
    const xc=splitProjection(xp,cols,left,w)||Array.from({length:cols+1},(_,i)=>Math.round(left+i*cw));
    for(let c=0;c<cols;c++){
      const x0=xc[c],x1=xc[c+1], y0=splits[r],y1=splits[r+1];
      let minX=x1,maxX=x0,minY=y1,maxY=y0,count=0;
      for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(data[(y*w+x)*4+3]>80){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);count++}
      if(count<30)throw Error(name+' empty '+r+','+c);
      const width=maxX-minX+1,height=maxY-minY+1;
      const crop=await sharp(data,{raw:{width:w,height:h,channels:4}}).extract({left:minX,top:minY,width,height}).png().toBuffer();
      cells[r][c]={crop,width,height,source:name,box:{x:minX,y:minY,w:width,h:height},localX:minX-x0,localY:minY-y0};
    }
  }
  sources[name]={size:[w,h],rowCuts:splits,cells:cells.map(row=>row.map(c=>c.box))};return cells;
}
async function normalized(row,{height=104,width=112,cell=128,baseline=116,align='center',scale}={}){
  // One scale per full animation row: never resize individual gait frames to fit.
  const minX=Math.min(...row.map(x=>x.localX)),maxX=Math.max(...row.map(x=>x.localX+x.width));
  scale??=Math.min(height/Math.max(...row.map(x=>x.height)),width/(maxX-minX));
  const top=Math.min(...row.map(x=>x.localY));
  const maxBottom=Math.max(...row.map(x=>x.localY+x.height));
  const center=(minX+maxX)/2;
  const minLeft=Math.min(...row.map(x=>x.localX));
  return Promise.all(row.map(async x=>{
    const w=Math.round(x.width*scale),h=Math.round(x.height*scale);
    const left=align==='left'?Math.round(16+(x.localX-minLeft)*scale):Math.round(cell/2+(x.localX-center)*scale);
    const y=Math.round(baseline-(maxBottom-x.localY)*scale);
    if(left<1||y<1||left+w>=cell||y+h>=cell)throw Error('Clipped '+x.source+': '+[left,y,w,h]);
    return sharp({create:{width:cell,height:cell,channels:4,background:'#00000000'}}).composite([{input:await sharp(x.crop).resize(w,h,{kernel:'lanczos3'}).png().toBuffer(),left,top:y}]).png().toBuffer();
  }));
}
async function sheet(file,frames,cols,cell=128){
  const rows=Math.ceil(frames.length/cols),png=await sharp({create:{width:cols*cell,height:rows*cell,channels:4,background:'#00000000'}}).composite(frames.map((input,i)=>({input,left:(i%cols)*cell,top:Math.floor(i/cols)*cell}))).png().toBuffer();save(file,png);return png;
}
async function unit(name,rows,fps){
  let frames=[];for(let r=0;r<8;r++){
    const f=await normalized(rows[r]);frames.push(...f);for(let c=0;c<4;c++)save('units/'+name+'/'+DIRS[r]+'-'+c+'.png',f[c]);
  }
  await sheet('units/'+name+'-walk.png',frames,4);await sheet('units/'+name+'-idle.png',DIRS.map((_,r)=>frames[r*4+1]),1);
  allFrames[name]=frames;manifest.units[name]={file:'units/'+name+'-walk.png',idleFile:'units/'+name+'-idle.png',columns:4,rows:8,frameSize:[128,128],origin:[64,104],fps,loop:true,idleColumn:1,sourceRows:rows.map(r=>r.map(c=>({source:c.source,box:c.box})))};
}
async function main(){
  const sheep=await source(fs.existsSync(path.join(ROOT,'source/sheep-tail-fixed.png'))?'sheep-tail-fixed':'sheep-tail',8,4);
  const original=await source('sheep-original',8,4);sheep[0]=original[0];sheep[7]=original[7];
  await unit('sheep',sheep,8);
  await unit('clubman',await source('clubman',8,4),8);
  const mc=await source('mage-cardinals',4,8,{leftCut:100}), me=await source('mage-extra',4,4),mb=await source('mage-back-diagonals',2,4);
  const select=r=>[r[0],r[2],r[4],r[6]];
  await unit('mage',[select(mc[0]),select(mc[1]),me[0],mb[0],select(mc[3]),mb[1],me[3],select(mc[2])],7);
  const hc=await source('hound-cardinals',4,4,{checker:true}),hd=await source('hound-diagonals',4,4),hp=await source('hound-profiles',2,4);
  await unit('hound',[hc[2],hd[0],hp[1],hd[1],hc[3],hd[2],hp[0],hd[3]],10);
  const fire=await source('fire',3,8);
  for(let r=0;r<3;r++){const name=['brazier','torch','lantern'][r],frames=await normalized(fire[r]);allFrames[name]=frames;for(let i=0;i<8;i++)save('effects/'+name+'/'+i+'.png',frames[i]);await sheet('effects/'+name+'-fire.png',frames,8);manifest.effects[name]={file:'effects/'+name+'-fire.png',frameSize:[128,128],columns:8,rows:1,origin:[64,112],fps:10,loop:true};}
  const doors=await source('doors',4,4);
  for(let r=0;r<4;r++){const name=['wood','iron','vault','soul'][r],frames=await normalized(doors[r],{height:108,width:108,align:'left'});allFrames['door-'+name]=frames;for(let i=0;i<4;i++)save('doors/'+name+'/'+['closed','opening','open','broken'][i]+'.png',frames[i]);await sheet('doors/'+name+'.png',frames,4);manifest.doors[name]={file:'doors/'+name+'.png',frameSize:[128,128],columns:4,states:['closed','opening','open','broken'],origin:[16,112],note:'Sprite-switch states, opening angle is illustrative. Use closed/open for collision; broken is not an animation frame.'};}
  const objects=await source('objects',4,4),names=['cage-bars','cage-broken','mill-hub','mill-arm','spikes-idle','spikes-arming','spikes-up','weapon-stand','sword','shield','healing-grass','soul-wisp','secret-wall','crate-debris','brazier-unlit','worktable'];let objectFrames=[];
  for(let i=0;i<16;i++){
    const c=objects[i>>2][i%4],frame=(await normalized([c],{height:108,width:112}))[0];objectFrames.push(frame);save('objects/'+names[i]+'.png',frame);manifest.objects[names[i]]={file:'objects/'+names[i]+'.png',frameSize:[128,128],origin:[64,112],atlasRect:[i%4*128,(i>>2)*128,128,128]};
  }
  await sheet('objects/atlas.png',objectFrames,4);allFrames.objects=objectFrames;
  save('manifest.json',JSON.stringify(manifest,null,2)+'\n');save('source/crop-map.json',JSON.stringify(sources,null,2)+'\n');
  await previews();await validate();
}
async function previews(){
  const w=1152,h=768, pages=[];
  const labels='<svg width="1152" height="768"><style>text{font-family:Segoe UI,Arial;fill:#dfd3bd;font-size:17px}</style><text x="20" y="32" font-size="25">GOAT OUT / ASSET EXPANSION 01</text>'+DIRS.map((d,i)=>'<text x="'+(185+i*120)+'" y="65">'+d+'</text>').join('')+['SHEEP','CLUBMAN','MAGE','HOUND','FIRE'].map((d,i)=>'<text x="16" y="'+(150+i*124)+'">'+d+'</text>').join('')+'</svg>';
  for(let f=0;f<8;f++){
    const layers=[{input:Buffer.from(labels),left:0,top:0}];
    for(let u=0;u<4;u++)for(let r=0;r<8;r++)layers.push({input:allFrames[['sheep','clubman','mage','hound'][u]][r*4+f%4],left:132+r*120,top:70+u*124});
    for(let r=0;r<3;r++)layers.push({input:allFrames[['brazier','torch','lantern'][r]][f],left:200+r*270,top:580});
    pages.push(await sharp({create:{width:w,height:h,channels:4,background:'#302c30'}}).composite(layers).raw().toBuffer());
  }
  await sharp(pages[0],{raw:{width:w,height:h,channels:4}}).png().toFile(path.join(ROOT,'preview.png'));
  await sharp(Buffer.concat(pages),{raw:{width:w,height:h*8,channels:4,pageHeight:h}}).gif({delay:Array(8).fill(125),loop:0,effort:3}).toFile(path.join(ROOT,'preview.gif'));
}
async function validate(){
  const report={pngFiles:0,frames:0,empty:[],clipped:[],duplicateWalkFrames:[]};
  for(const [name,frames] of Object.entries(allFrames)){for(let i=0;i<frames.length;i++){
    const {data,info}=await sharp(frames[i]).raw().toBuffer({resolveWithObject:true});let count=0,edge=0;
    for(let p=0;p<data.length;p+=4)if(data[p+3]>32){count++;const x=p/4%128,y=Math.floor(p/4/128);if(x===0||x===127||y===0||y===127)edge++;}
    report.frames++;if(!count)report.empty.push([name,i]);if(edge)report.clipped.push([name,i]);
  }if(frames.length===32)for(let r=0;r<8;r++)if(new Set(frames.slice(r*4,r*4+4).map(x=>require('crypto').createHash('sha256').update(x).digest('hex'))).size<4)report.duplicateWalkFrames.push([name,r]);}
  const walk=d=>{for(const f of fs.readdirSync(d,{withFileTypes:true})){if(f.isDirectory()&&f.name!=='source')walk(path.join(d,f.name));else if(f.name.endsWith('.png'))report.pngFiles++;}};walk(ROOT);
  save('validation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}
main().catch(e=>{console.error(e);process.exitCode=1});
