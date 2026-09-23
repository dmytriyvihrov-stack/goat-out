// Metadata only: never rewrites generated PNGs. Run after inspect-sources.ps1.
const fs=require('fs'),path=require('path');
const root=__dirname;
const read=n=>JSON.parse(fs.readFileSync(path.join(root,n),'utf8').replace(/^\uFEFF/,''));
const sheets=read('source-inspection.json');
const byId=Object.fromEntries(sheets.map(s=>[s.id,s]));
const directions=['S','SW','W','NW','N','NE','E','SE'];
const labels={goat:'Молодой козлик',clubman:'Дубинщик',mage:'Маг',hound:'Гончая',hunter:'Охотник',brute:'Брут',butcher:'Мясник',wraith:'Призрак',chicken:'Курица',ratogre:'Крысоогр',mouse:'Мышь-торговец',goose:'Гусь',raven:'Ворон',turtle:'Черепашка','sheep-pet':'Овечка без метки'};
const allyIds=['mouse','goose','raven','turtle'];
const gameKinds={goat:'player (legacy art key sheep)',clubman:'bearer',mage:'seer',hound:'dog',hunter:'hunter',brute:'bearer + champion',butcher:'butcher',wraith:'wraith',chicken:'chicken prop',ratogre:'ratogre',mouse:'ally / mouse merchant',goose:'ally concept',raven:'ally concept',turtle:'ally concept','sheep-pet':'future pet skin'};
function frame(sheetId,index,direction,phase=0){
 const s=byId[sheetId],v=s.cells[index];if(!v||v[4]<1000)throw Error('Missing frame '+sheetId+':'+index);
 const [x,y,w,h,pixels,cx,cy,cw,ch]=v;
 if(x<=cx||y<=cy||x+w>=cx+cw||y+h>=cy+ch)throw Error('Frame reaches extraction boundary '+sheetId+':'+index);
 const pad=2,rect=[Math.max(cx,x-pad),Math.max(cy,y-pad),Math.min(cw,w+2*pad),Math.min(ch,h+2*pad)];
 return {file:s.file,direction,phase,sourceCell:index,rect,bodyBounds:[x,y,w,h],sourceAnchor:[w/2+pad,h+pad],opaqueComponentPixels:pixels};
}
const units=[];
for(const id of Object.keys(labels)){
 const sheetId=id==='goat'?'goat-idle':id;
 const idle=(allyIds.includes(id)?['SE']:directions).map((d,i)=>frame(sheetId,i,d));
 const role=id==='goat'?'player':id==='sheep-pet'?'pet-skin':allyIds.includes(id)?'ally':'existing-cast';
 const u={id,label:labels[id],role,gameKind:gameKinds[id],idle,walk:null};
 if(id==='goat'){
  const rows=[['goat-walk-a',0],['goat-walk-a',1],['goat-walk-a',2],['goat-walk-a',3],['goat-walk-b',0],['goat-walk-b',1],['goat-walk-b',2],['goat-walk-b',3]];
  u.walk=directions.map((d,r)=>Array.from({length:4},(_,c)=>frame(rows[r][0],rows[r][1]*4+c,d,c)));
  // Match each direction's walk body extent to its idle extent. One factor per row,
  // never per frame: individual fitting would make the goat pulse in size.
  u.walk.forEach((row,r)=>{const ref=Math.max(...idle[r].rect.slice(2)),max=Math.max(...row.flatMap(f=>f.rect.slice(2)));row.forEach(f=>f.relativeScale=ref/max);});
 }
 u.sourceExtent=Math.max(...idle.flatMap(f=>f.rect.slice(2)));
 units.push(u);
}
const manifest={version:3,date:'2026-09-23',playerId:'goat',status:'generated-sources-with-measured-rectangles; not integrated',directions,angleConvention:'atan2(dy,dx), screen Y down; index=(round(angle/(PI/4))+14)%8',walkFps:8,walkFrames:4,virtualCell:[128,128],suggestedOrigin:[64,104],anchorStatus:'bounds-derived preview anchor; tune visually against game shadows before release',sampling:'nearest-neighbor; imageSmoothingEnabled=false',units};
fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2));
fs.writeFileSync(path.join(root,'manifest.js'),'window.PIXEL_PACK='+JSON.stringify(manifest)+';\n');
const frames=units.flatMap(u=>[...u.idle,...(u.walk?u.walk.flat():[])]);
const validation={sheets:sheets.length,characters:units.length,player:'adolescent goat, revision 3',mainCastIdleFrames:80,petSkinIdleFrames:8,allyIcons:4,idleFrames:units.reduce((n,u)=>n+u.idle.length,0),selectedWalkFrames:32,totalSelectedFrames:frames.length,allCornersTransparent:sheets.every(s=>s.cornerAlpha===0),allFramesInsideMeasuredCells:true,sourcePngsUnmodified:true,excludedAssets:'legacy-sheep contains the superseded sheep player and its marked walk cycles; never use for player or clean pet skin',notes:['All four new single-view animals are ALLIES, not enemies.','Pet sheep has no colored eye marking and is not the main hero.','Alpha edges and palettes are generated, not a guaranteed uniform indexed pixel grid.','Goat revision 3: longer purple bolt on anatomical RIGHT eye, visible S/E/SE; subtle light grey saddle. Weapon hands still need art review.','Walk rows use actual measured boundaries because generated sheets are not perfectly square.','Preview uses measured source rectangles; production atlases not exported.']};
fs.writeFileSync(path.join(root,'validation.json'),JSON.stringify(validation,null,2));
console.log(JSON.stringify(validation,null,2));
