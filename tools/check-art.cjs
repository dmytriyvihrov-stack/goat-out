// Run against `node tools/serve.js 8767`; screenshots are kept in the ignored shots directory.
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('assert');
(async()=>{
  const out=path.join(__dirname,'shots');fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.launch({headless:true,channel:'chrome'});
  try {
    const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(process.env.GOAT_URL||'http://127.0.0.1:8767');
    await page.waitForFunction(()=>window.game?.renderer.painted.ready&&CombatFX.sheet?.naturalWidth);
    await page.evaluate(()=>{game.frame=()=>{};game.dev.god=true;});
    const levels=[];
    for(let i=0;i<7;i++) {
      levels.push(await page.evaluate(i=>{
        game.startLevel(i,1337,false,false);game.state='play';game.card=null;game.hidden=()=>false;
        const room=game.level.rooms.find(r=>r.w>=10&&r.h>=7)||game.level.rooms[1];
        game.goat.x=(room.x+room.w/2)*TILE;game.goat.y=(room.y+room.h/2)*TILE;
        game.cam.x=game.goat.x;game.cam.y=game.goat.y;game.cam.zoom=1.8;
        game.world.vis.fill(1);for(const r of game.level.rooms)r.seen=true;
        game.renderer.draw(game,0);
        const art=game.renderer.painted,prefix=i?'level'+i+'_':'';
        const variants=new Set();for(let mask=0;mask<16;mask++)variants.add(art.wallTile(prefix,mask).toDataURL());
        return {level:i+1,variants:variants.size,failed:art.failed};
      },i));
      await page.screenshot({path:path.join(out,'walls-level-'+(i+1)+'.png')});
    }
    const effects=await page.evaluate(()=>{
      game.startLevel(0,1337,false,false);game.state='play';game.card=null;game.hidden=()=>false;
      // An isolated room exercises real death, explosion and break hooks without AI interference.
      const w=game.world,cx=25,cy=35;
      for(let y=cy-10;y<=cy+10;y++)for(let x=cx-14;x<=cx+14;x++)w.tiles[y*w.W+x]=T.FLOOR;
      game.goat.x=cx*TILE;game.goat.y=(cy+4)*TILE;game.enemies=[];game.props=[];
      const make=(kind,x,y)=>new Enemy((cx+x)*TILE,(cy+y)*TILE,kind);
      const a=make('bearer',-6,0);a.die(game,'splat',1,0);
      const b=make('hunter',-2,0);b.die(game,'devour',1,0);
      const c=make('bearer',2,0);c.explode(game);
      const d=make('bearer',6,0);d.witchBurn=true;d.die(game,'burn',0,1);
      const crate=new Prop((cx-4)*TILE,(cy+3)*TILE,'crate');crate.shatter(game);crate.shatter(game);
      const door=new Prop((cx+4)*TILE,(cy+3)*TILE,'door',{vertical:true});
      for(let i=0;i<TUNING.prop.door.hits;i++)door.smash(game,1,0);
      w.ignitePool((cx-2)*TILE,(cy-3)*TILE,1,false);w.ignitePool((cx+2)*TILE,(cy-3)*TILE,1,true);
      const fallBefore=game.fx.air.length;make('bearer',0,0).die(game,'fall',0,0);
      const fallClean=game.fx.air.length===fallBefore;
      game.cam.x=cx*TILE;game.cam.y=cy*TILE;game.cam.zoom=2.4;
      game.world.vis.fill(1);for(const r of game.level.rooms)r.seen=true;
      game.fx.update(0.1);game.renderer.draw(game,0);
      return {air:game.fx.air.length,bursts:game.fx.bursts.length,fallClean,crateBroken:crate.broken,doorBroken:door.broken};
    });
    await page.screenshot({path:path.join(out,'effects-flight.png')});
    const landed=await page.evaluate(()=>{
      for(let i=0;i<150;i++)game.fx.update(1/60);
      game.renderer.draw(game,0);
      return {air:game.fx.air.length,bursts:game.fx.bursts.length,ground:game.fx.ground.length,
        outside:game.fx.ground.some(p=>game.world.isSolid(Math.floor(p.x/TILE),Math.floor(p.y/TILE))||game.world.isPitPx(p.x,p.y))};
    });
    await page.screenshot({path:path.join(out,'effects-settled.png')});
    const variants=await page.evaluate(()=>{
      const x=game.goat.x,y=game.goat.y;
      const iron=new Prop(x,y,'door',{iron:true,vertical:false});
      for(let i=0;i<TUNING.prop.door.ironHits;i++)iron.smash(game,1,0);
      const metal=game.fx.air.filter(p=>p.material==='metal').length;
      const box=new Prop(x+TILE,y,'crate');box.burst(game,true);
      const magic=game.fx.bursts.some(b=>b.witch&&!b.smokeOnly);
      const before=game.fx.air.length;game.goat.die(game);
      const goatDeath=game.goat.dead&&game.fx.air.length>before;
      const c=document.createElement('canvas');c.width=c.height=100;const ctx=c.getContext('2d');
      const frames=[];for(let i=0;i<8;i++){ctx.clearRect(0,0,100,100);CombatFX.frame(ctx,0,i,50,50,100,100);frames.push(c.toDataURL());}
      for(let i=0;i<110;i++)game.world.splat(64+(i%40)*256,64+Math.floor(i/40)*256,0,1,8);
      return {metal,magic,goatDeath,fireFrames:new Set(frames).size,stainTiles:game.world.stains.size};
    });
    const bounded=await page.evaluate(()=>{
      for(let i=0;i<100;i++)game.fx.blood(game.goat.x,game.goat.y,1,0,30);
      const air=game.fx.air.length;game.startLevel(1,1337,false,false);
      return {air,reset:game.fx.air.length+game.fx.ground.length+game.fx.bursts.length===0};
    });
    // Actual wall atlas: every single facing, convex corner, end and four-face pillar, all themes.
    await page.evaluate(()=>{
      const c=document.createElement('canvas');c.width=1440;c.height=860;c.id='review';
      c.style='position:fixed;inset:0;z-index:99;width:1440px;height:860px';document.body.appendChild(c);
      const ctx=c.getContext('2d'),art=game.renderer.painted,masks=[4,8,2,1,6,12,3,9,5,10,7,11,13,14,15];
      ctx.fillStyle='#171317';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#efe6d0';ctx.font='24px Georgia';ctx.fillText('GOAT OUT / FOUR WALL FACINGS + JUNCTIONS',28,42);
      const labels=['TOP','RIGHT','LEFT','BOTTOM','SE','SW','NE','NW','N/S','E/W','END','END','END','END','PILLAR'];
      for(let k=0;k<masks.length;k++){ctx.font='12px sans-serif';ctx.fillText(labels[k],190+k*81,78);}
      for(let li=0;li<7;li++){
        const prefix=li?'level'+li+'_':'',y=110+li*100;
        ctx.fillStyle='#efe6d0';ctx.font='12px Georgia';ctx.fillText(LEVELS[li].name,14,y+38,162);
        for(let k=0;k<masks.length;k++)ctx.drawImage(art.wallTile(prefix,masks[k]),183+k*81,y,66,66);
      }
    });
    await page.locator('#review').screenshot({path:path.join(out,'walls-contact-sheet.png')});
    const scripts=await page.evaluate(async()=>{
      const lists=await Promise.all(['/index.html','/artifact.html'].map(async p=>{
        const html=await (await fetch(p)).text();return [...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);
      }));return JSON.stringify(lists[0])===JSON.stringify(lists[1]);
    });
    await page.setViewportSize({width:390,height:844});
    await page.goto((process.env.GOAT_URL||'http://127.0.0.1:8767')+'/artifact.html');
    await page.waitForFunction(()=>window.game?.renderer.painted.ready&&CombatFX.sheet?.naturalWidth);
    const mobile=await page.evaluate(()=>{
      game.startLevel(1,1337,false,false);game.state='play';game.card=null;game.dev.god=true;
      game.fx.explosion(game.goat.x,game.goat.y,50,true);
      for(let i=0;i<60;i++)game.updateEffects(1/60);
      game.renderer.draw(game,0);return game.renderer.w>0&&game.renderer.h>0&&game.fx.bursts.length===0;
    });
    await page.screenshot({path:path.join(out,'mobile-artifact.png')});
    const report={levels,effects,landed,variants,bounded,scripts,mobile,errors};
    fs.writeFileSync(path.join(out,'art-validation.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
    assert.equal(errors.length,0);assert(levels.every(l=>l.variants===16&&!l.failed.length));
    assert(effects.fallClean&&effects.crateBroken&&effects.doorBroken&&effects.bursts>0);
    assert(landed.air===0&&landed.bursts===0&&landed.ground>0&&!landed.outside);
    assert(bounded.air<=220&&bounded.reset);
    assert(variants.metal>0&&variants.magic&&variants.goatDeath&&variants.fireFrames===8&&variants.stainTiles<=96);
    assert(scripts&&mobile);
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
