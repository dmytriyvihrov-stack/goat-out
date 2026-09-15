const { chromium } = require('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ headless:true, executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const page = await browser.newPage({ viewport:{width:1280,height:800} });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:8766', {waitUntil:'domcontentloaded'});
    await page.waitForFunction(() => window.game);
    const results = await page.evaluate(() => {
      const assert = (v, msg) => { if (!v) throw Error(msg); };
      game.startLevel(0,1337,false,false); game.state='play'; game.card=null; game.renderer.draw(game,0);
      const r=game.renderer, x=game.goat.x, y=game.goat.y;
      const kinds=['crate','table','brazier','lamp','bell','cage','door','heal','spike','weapon','mill'];
      let rendered=0;
      for (const kind of kinds) for (const variant of [0,1,2]) {
        const p=new Prop(x,y,kind,{vertical:variant===1,iron:variant>0,gate:variant===2,axis:'h'});
        p.held=variant===1; p.flung=variant===2; p.vx=30; p.vy=10; p.hits=variant;
        p.open=variant/2; p.spillCd=variant; p.rung=variant; p.wobble=variant/10;
        p.spikeState=['idle','armed','up'][variant]; p.spikeT=0.1;
        const before=JSON.stringify(p), transform=r.ctx.getTransform().toString();
        r.drawProp(p);
        assert(JSON.stringify(p)===before,`${kind} renderer mutated object`);
        assert(r.ctx.getTransform().toString()===transform,`${kind} leaked canvas transform`);
        rendered++;
      }
      const crate=new Prop(x+64,y,'crate'); crate.headbutt(game,1,0); r.drawProp(crate);
      assert(crate.flung && crate.vx>0,'crate no longer flings');
      const door=new Prop(x+64,y,'door',{vertical:true}); door.headbutt(game,1,0); r.drawProp(door);
      assert(door.broken || door.open>0,'wood door no longer opens/breaks');
      const brazier=game.props.find(p=>p.kind==='brazier'); brazier.headbutt(game,1,0); r.drawProp(brazier);
      assert(brazier.spillCd>0 && game.world.fire.some(f=>f>0),'brazier spill lost fire');
      const cage=game.props.find(p=>p.kind==='cage'&&!p.deco); game.goat.lungeId++;
      cage.headbutt(game,1,0); r.drawProp(cage); assert(cage.hits>0||cage.broken,'cage lost hit feedback');
      const tiles=game.world.tiles.slice(), props=game.props.length;
      r.altar.drawTiles(r,game,game.cam);
      assert(props===game.props.length && tiles.every((v,i)=>v===game.world.tiles[i]),'art changed collision world');
      return {renderedStates:rendered,crate:'flung',door:'broken/open',brazier:'spilled fire',cage:'hit registered',collisionWorld:'unchanged'};
    });
    await page.evaluate(() => { game.startLevel(0,1337,false,false); game.state='play'; game.card=null; game.dev.god=false; });
    await page.waitForTimeout(180);
    await page.screenshot({path:path.join(__dirname,'level-one-preview.png')});
    await page.setViewportSize({width:390,height:844});
    await page.waitForTimeout(180);
    await page.screenshot({path:path.join(__dirname,'level-one-mobile.png')});
    console.log(JSON.stringify({results,errors},null,2));
    if(errors.length) process.exitCode=1;
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
