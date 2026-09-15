// Browser checks exercise the real renderer, rather than only atlas dimensions.
const { chromium } = require('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),assert=require('assert');
const ROOT=__dirname,base=process.env.GOAT_URL||'http://127.0.0.1:8766';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/assets/painted-expansion-v2/preview.html');await page.waitForFunction(()=>window.previewReady);
 await page.locator('#units').screenshot({path:path.join(ROOT,'characters-preview.png')});await page.screenshot({path:path.join(ROOT,'preview.png'),fullPage:true});
 await page.getByRole('button',{name:'Світле',exact:true}).click();await page.locator('#units').screenshot({path:path.join(ROOT,'characters-light.png')});
 await page.goto(base);await page.waitForFunction(()=>window.game&&game.renderer.painted.ready);
 const setup=await page.evaluate(()=>{game.frame=()=>{};game.startLevel(0,1337,false,false);if(game.intro)game.skipIntro(true);game.state='play';game.card=null;game.dev.god=true;return {loaded:game.renderer.painted.loaded,failed:game.renderer.painted.failed};});assert.deepStrictEqual(setup.failed,[]);
 const results=[];
 for(let li=0;li<7;li++){
  results.push(await page.evaluate(li=>{game.startLevel(li,1337,false,false);if(game.intro)game.skipIntro(true);game.state='play';game.card=null;game.dev.god=true;
   const r=game.level.rooms[Math.min(3,game.level.rooms.length-1)],x=(r.x+r.w/2)*TILE,y=(r.y+r.h/2)*TILE;game.goat.x=x;game.goat.y=y;game.cam.x=x;game.cam.y=y;game.cam.zoom=1.8;game.world.vis.fill(1);game.world.losVis?.fill(1);game.hidden=()=>false;
   for(const room of game.level.rooms)room.seen=true;
   game.renderer.draw(game,0);return {li,prefix:li?'level'+li+'_':'',hasFloor:!!game.renderer.painted.images[(li?'level'+li+'_':'')+'stone0']};},li));
  await page.screenshot({path:path.join(ROOT,'level-'+(li+1)+'.png')});
 }
 assert(results.every(r=>r.hasFloor));
 const checks=await page.evaluate(()=>{
   const art=game.renderer.painted,ctx=game.renderer.ctx,calls=[],draw=art.drawFrame;
   art.drawFrame=function(ctx,image,sx,sy,...rest){calls.push({sx,sy,width:image.naturalWidth});return draw.call(this,ctx,image,sx,sy,...rest);};
   for(const key of ['hunter','brute','butcher','wraith','chicken'])for(let r=0;r<8;r++)art.character(game.renderer,{facing:(r+2)*Math.PI/4,vx:100,vy:0,x:1},key,42);
   art.drawFrame=draw;
   const rows=calls.map(c=>c.sy/128),staticOnly=calls.every(c=>c.sx===0&&c.width===128);
   // Ghost and solid must remain visually different; every octant must select the matching row.
   const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const cx=canvas.getContext('2d'),rr={ctx:cx,t:0};
   const alpha=ghosted=>{cx.clearRect(0,0,128,128);cx.save();cx.translate(64,104);art.character(rr,{facing:Math.PI/2,ghosted},'wraith',100);cx.restore();let sum=0;const d=cx.getImageData(0,0,128,128).data;for(let i=3;i<d.length;i+=4)sum+=d[i];return sum;};
   return {rows,staticOnly,ghostAlpha:alpha(true),solidAlpha:alpha(false),brute:art.characterKey({kind:'bearer',champion:true}),hunter:art.characterKey({kind:'hunter'})};
 });assert(checks.staticOnly);assert(checks.ghostAlpha<checks.solidAlpha*.65);assert.strictEqual(checks.brute,'brute');assert.deepStrictEqual(checks.rows,Array.from({length:40},(_,i)=>i%8));
 // Ordinary generated corridor door, both orientations, and its open state in the live game.
 for(const vertical of [true,false])for(const open of [0,0.6,1]){
  const found=await page.evaluate(({vertical,open})=>{game.startLevel(2,1337,false,false);game.state='play';game.card=null;game.hidden=()=>false;game.world.vis.fill(1);
   const p=game.props.find(p=>p.kind==='door'&&!p.vault&&!p.gate&&!p.stair&&p.vertical===vertical);if(!p)return false;
   p.open=open;for(const room of game.level.rooms)room.seen=true;
   const positions=vertical?[[p.x+48,p.y],[p.x-48,p.y]]:[[p.x,p.y+48],[p.x,p.y-48]],safe=positions.find(([x,y])=>!game.world.isSolid(Math.floor(x/TILE),Math.floor(y/TILE)))||positions[0];
   game.goat.x=safe[0];game.goat.y=safe[1];game.cam.x=p.x;game.cam.y=p.y;game.cam.zoom=3;game.renderer.draw(game,0);return {x:p.x,y:p.y,vertical:p.vertical,open:p.open};},{vertical,open});
  if(found)await page.screenshot({path:path.join(ROOT,'door-'+(vertical?'vertical':'horizontal')+'-'+open+'.png')});results.push({door:found});
 }
 assert(results.some(x=>x.door&&x.door.vertical));assert(results.some(x=>x.door&&!x.door.vertical));
 const propChecks=await page.evaluate(()=>{
   game.startLevel(0,1337,false,false);if(game.intro)game.skipIntro(true);game.state='play';game.card=null;game.dev.god=true;game.hidden=()=>false;game.world.vis.fill(1);for(const r of game.level.rooms)r.seen=true;
   const art=game.renderer.painted,post=game.props.find(p=>p.kind==='cage'&&!p.deco),before=game.world.decal.toDataURL();
   art.brokenPost(game,post);const postDecal=before!==game.world.decal.toDataURL();
   const r=game.level.rooms[0],x=(r.x+r.w/2)*TILE,y=(r.y+r.h/2)*TILE;
   game.goat.x=x;game.goat.y=y;game.cam.x=x;game.cam.y=y;game.cam.zoom=2.5;
   const chicken=new Prop(x+38,y,'chicken'),grass=new Prop(x-42,y+42,'heal');game.props.push(chicken,grass);
   game.renderer.draw(game,0);return {postDecal,cageCount:game.props.filter(p=>p.kind==='cage').length};
 });assert(propChecks.postDecal);await page.screenshot({path:path.join(ROOT,'cage-grass-chicken.png')});
 await page.evaluate(()=>{const door=game.props.find(p=>p.kind==='door'&&!p.gate);if(door){game.renderer.painted.brokenDoor(game,door);}});
 // A readable in-room cast sheet using the actual game render path and level texture layer.
 await page.evaluate(()=>{
   game.startLevel(2,1337,false,false);game.state='play';game.card=null;game.hidden=()=>false;game.world.vis.fill(1);for(const r of game.level.rooms)r.seen=true;
   const r=game.level.rooms.find(r=>r.w>=14&&r.h>=9)||game.level.rooms[3],x=(r.x+r.w/2)*TILE,y=(r.y+r.h/2)*TILE;
   game.cam.x=x;game.cam.y=y;game.cam.zoom=2.7;game.goat.x=x-135;game.goat.y=y+60;game.props=[];
   game.enemies=['hunter','bearer','butcher','wraith'].map((kind,i)=>{const e=new Enemy(x-135+i*90,y-15,kind);e.facing=Math.PI/4;e.solid=true;e.state='idle';e.say=null;if(kind==='bearer'){e.champion=true;e.elite=true;}return e;});
   game.props.push(new Prop(x+30,y+60,'chicken'),new Prop(x+120,y+65,'heal'));game.renderer.draw(game,0);
 });await page.screenshot({path:path.join(ROOT,'cast-in-game.png')});
 await page.goto(base+'/artifact.html');await page.waitForFunction(()=>window.game&&game.renderer.painted.ready);
 const artifact=await page.evaluate(()=>({loaded:game.renderer.painted.loaded,failed:game.renderer.painted.failed}));assert.deepStrictEqual(artifact.failed,[]);
 const indexScripts=fs.readFileSync(path.join(ROOT,'../../index.html'),'utf8').match(/<script src="[^"]+"/g),artifactScripts=fs.readFileSync(path.join(ROOT,'../../artifact.html'),'utf8').match(/<script src="[^"]+"/g);assert.deepStrictEqual(indexScripts,artifactScripts);
 assert.deepStrictEqual(errors,[]);fs.writeFileSync(path.join(ROOT,'browser-validation.json'),JSON.stringify({setup,checks,propChecks,results,artifact,errors},null,2));console.log(JSON.stringify({setup,checks,propChecks,artifact,errors},null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
