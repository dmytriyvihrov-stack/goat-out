// Asset packing only. Art is generated with image_gen; source PNGs remain untouched.
const fs=require('fs'),path=require('path');
const {Img,decode,text}=require('../pixel-claude-2026-09-24/png.cjs');
const {atlasImg}=require('../factory-2026-10-11/lib.cjs');
const ROOT=__dirname,OUT=path.join(ROOT,'native'); fs.mkdirSync(OUT,{recursive:true});
const cache={},assets=[];
function source(id){return cache[id]||(cache[id]=decode(fs.readFileSync(path.join(ROOT,'source',id+'.png'))));}
function bounds(im,r){let [x,y,w,h]=r.map(Math.round),x0=x+w,y0=y+h,x1=-1,y1=-1;
 for(let j=y;j<Math.min(im.h,y+h);j++)for(let i=x;i<Math.min(im.w,x+w);i++)if(im.data[(j*im.w+i)*4+3]>=128){x0=Math.min(x0,i);x1=Math.max(x1,i);y0=Math.min(y0,j);y1=Math.max(y1,j);}
 if(x1<0)throw Error('Empty source');return [x0,y0,x1-x0+1,y1-y0+1];}
function add(id,sheet,region,size,options={}){const im=source(sheet),b=options.texture?region:bounds(im,region);
 const scale=options.scale||Math.min(size[0]/b[2],size[1]/b[3]);
 const w=options.texture?size[0]:Math.max(1,Math.round(b[2]*scale)),h=options.texture?size[1]:Math.max(1,Math.round(b[3]*scale));
 const out=new Img(w,h);out.blit(im,...b,0,0,w,h,false);
 // Pixel renderer uses hard coverage; discard fractional extraction fringe, not any drawn feature.
 for(let i=3;i<out.data.length;i+=4)out.data[i]=out.data[i]>=128?255:0;
 fs.writeFileSync(path.join(OUT,id+'.png'),out.png());
 const item={id,file:'native/'+id+'.png',source:'source/'+sheet+'.png',sourceRect:b,width:w,height:h,pivot:[Math.round(w/2),h-1],worldSize:[+(w*1.35).toFixed(2),+(h*1.35).toFixed(2)],...options.meta};
 assets.push(item);cache[id]=out;return item;}
const W='01-walls';
for(let row=0;row<2;row++)for(let col=0;col<4;col++){
 const xs=[0,645,930,1255,1774],ys=[0,315,625];
 add('wall-'+['brick','iron'][row]+'-'+['straight','outer','inner','door'][col],W,[xs[col],ys[row],xs[col+1]-xs[col],ys[row+1]-ys[row]],[col===0?72:col===3?48:32,40]);}
[[45,35,557,565],[663,35,555,565],[45,650,557,549],[663,650,555,549]].forEach((r,i)=>add('floor-'+['concrete','plates','grate','brick'][i],'02-floors',r,[144,144],{texture:true,meta:{tileSpan:[6,6],seamlessVerified:false,worldSize:[192,192]}}));
for(let row=0;row<2;row++)for(let col=0;col<3;col++){
 const xs=[0,580,1055,1536]; add('press-'+['wide','small'][row]+'-'+['open','closing','closed'][col],'03-presses',[xs[col],row?715:0,xs[col+1]-xs[col],row?309:715],[150,row?48:144],{meta:{jawLengthTiles:row?2:6,state:['open','closing','closed'][col]}});}
for(let col=0;col<3;col++){
 add('belt-right-'+col,'04-conveyor',[col*512,0,512,230],[72,24],{meta:{direction:'right',tileSpan:[3,1]}});
 add('belt-down-'+col,'04-conveyor',[col*512,230,512,475],[24,72],{meta:{direction:'down',tileSpan:[1,3]}});
 add('belt-'+['corner','roller','motor'][col],'04-conveyor',[col*512,705,512,319],[col?48:32,32]);}
for(let col=0;col<3;col++)add('grabber-'+['open','reach','closed'][col],'05-grabber',[col*627,0,627,836],[48,64]);
for(let col=0;col<4;col++)add('burner-'+['off','warning','ignite','fire'][col],'06-floor-burner',[col*522.75,0,522.75,752],[24,48],{scale:24/426,meta:{footprintTiles:[1,1]}});
for(let row=0;row<3;row++)for(let col=0;col<4;col++)add(['lathe','boiler','cabinet'][row]+'-'+['intact','cracked','wreck','parts'][col],'07-breakable-machines',[col*384,row*341.33,384,341.33],[48,44],{scale:[48/350,32/250,28/230][row]});
const robotRegions=[[[85,85,447,410],[550,85,432,420],[1000,85,495,420]],[[60,530,475,430],[552,530,445,430],[1005,530,500,430]]];
for(let row=0;row<2;row++)for(let col=0;col<3;col++)add('robot-'+['saw','claw','hammer'][col]+'-'+['front','back'][row],'10-rough-robots',robotRegions[row][col],[27,27],{scale:27/408,meta:{renderExtent:36,view:['front','back'][row]}});
for(let row=0;row<2;row++)for(let col=0;col<2;col++)add('tracked-'+['torch','wrench'][col]+'-'+['front','back'][row],'11-tracked-human',[col*636.5,row*618,636.5,618],[42,42],{scale:42/580});
add('colossus-standing','13-living-colossus',[0,0,1309,1202],[144,144],{meta:{footprintTiles:[6,5],state:'standing',renderExtent:194.4,notes:'Final organic welded design. Four legs. Static standing/fallen poses, no animation.'}});
const fallen=source('15-colossus-fallen');add('colossus-fallen','15-colossus-fallen',[0,0,fallen.w,fallen.h],[146,146],{meta:{footprintTiles:[6,5],state:'fallen',notes:'Static fallen pose. Scale checked against standing body; not an animation frame.'}});
add('welder-idle','14-welder-flamethrower',[0,0,800,887],[48,48],{scale:42/680,meta:{renderExtent:56.7}});
add('welder-fire','14-welder-flamethrower',[800,0,974,887],[72,48],{scale:42/680,meta:{renderExtent:56.7,notes:'Flame is included in this study frame; FX should be separate for implementation.'}});
// Atlas is deterministic, with two-pixel gutters and recorded rectangles.
const atlas=new Img(1024,1024);let ax=2,ay=2,rh=0;
for(const a of assets){if(ax+a.width+2>atlas.w){ax=2;ay+=rh+2;rh=0;}if(ay+a.height+2>atlas.h)throw Error('Atlas overflow');atlas.blit(cache[a.id],0,0,a.width,a.height,ax,ay,a.width,a.height);a.atlasRect=[ax,ay,a.width,a.height];ax+=a.width+2;rh=Math.max(rh,a.height);}
fs.writeFileSync(path.join(ROOT,'atlas.png'),atlas.png());
fs.writeFileSync(path.join(ROOT,'manifest.json'),JSON.stringify({generator:'built-in image_gen',packing:'crop, nearest-neighbour size conversion, binary alpha; originals preserved',tileWorldPx:32,propWorldPxPerTexel:1.35,atlas:'atlas.png',assets},null,2));
function blit(dst,id,x,y,k=1){const im=cache[id];dst.blit(im,0,0,im.w,im.h,Math.round(x),Math.round(y),Math.round(im.w*k),Math.round(im.h*k));}
// True display-size comparison: actual packed game goat and clubman, same current extents.
const scene=new Img(640,390,'#171516');
for(let y=34;y<358;y+=192)for(let x=16;x<624;x+=192){const floor=cache['floor-concrete'];scene.blit(floor,0,0,144,144,x,y,192,192);}
scene.fill(0,358,640,32,'#171516');scene.fill(624,0,16,390,'#171516');
for(let x=20;x<590;x+=96)blit(scene,'wall-brick-straight',x,28,1.35);
text(scene,'FACTORY / SCALE 1X / TILE 32 PX',18,12,'#d9cfb8',2);
blit(scene,'colossus-standing',350,100,1.35);
blit(scene,'belt-right-0',62,116,1.35);blit(scene,'belt-right-1',157,116,1.35);
blit(scene,'robot-saw-front',94,208,1.35);blit(scene,'robot-claw-front',168,210,1.35);
blit(scene,'welder-idle',244,214,1.35);blit(scene,'burner-fire',555,246,1.35);
blit(scene,'lathe-intact',70,280,1.35);blit(scene,'boiler-intact',194,284,1.35);
for(const [name,face,x,y]of [['goat',1,394,318],['clubman',1,302,319]]){const a=atlasImg(name,face),w=Math.round(a.im.w*a.k),h=Math.round(a.im.h*a.k);scene.blit(a.im,0,0,a.im.w,a.im.h,x-w/2|0,y-h,w,h);}
text(scene,'GOAT AND CLUBMAN FROM CURRENT GAME ATLAS',18,372,'#ac9e89',1);
fs.writeFileSync(path.join(ROOT,'scale-room-1x.png'),scene.png());
const scene2=new Img(1280,780);scene2.blit(scene,0,0,640,390,0,0,1280,780);fs.writeFileSync(path.join(ROOT,'scale-room-2x.png'),scene2.png());
const focus=new Img(1056,672,'#25221f');
text(focus,'FACTORY / NATIVE PIXELS ENLARGED 4X',24,20,'#e7dac1',2);
blit(focus,'colossus-standing',24,68,4);
text(focus,'WELDED LIVING COLOSSUS',24,630,'#d9bf9d',2);
blit(focus,'welder-idle',680,88,4);blit(focus,'welder-fire',652,288,4);
text(focus,'TRACKED WELDER',656,498,'#d9bf9d',2);
blit(focus,'robot-saw-front',654,528,3);blit(focus,'robot-claw-front',784,528,3);blit(focus,'robot-hammer-front',906,528,3);
fs.writeFileSync(path.join(ROOT,'characters-native-4x.png'),focus.png());
console.log(JSON.stringify({count:assets.length,atlasUsedHeight:ay+rh,characters:assets.filter(a=>/^(colossus|welder|robot)/.test(a.id)).map(a=>({id:a.id,size:[a.width,a.height],world:a.worldSize}))},null,2));
