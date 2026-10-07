const {load}=require('../audit-2026-09-24/sim/load.js');
const path=require('path');
const L=load(path.resolve(__dirname,'../..'),{strict:true});
L.run(`window.game=new Game(document.getElementById('game')); game.frame=()=>{}; game.runJumped=true; game.startLevel(1,11,false,false); game.state='play';`);
console.log('boot',L.grab('game.state'));
const probe=(name,src)=>{try{console.log(name,JSON.stringify(L.run(src)));}catch(e){console.log(name,e.stack);}};
probe('mobile shop',`(()=>{
  const g=game; g.enemies=[]; g.props=[new Prop(g.goat.x+20,g.goat.y,'mouse',{shopId:17}),new Prop(g.goat.x+30,g.goat.y,'ware',{shopId:17,ware:{id:ARTIFACTS[0].id,tier:1}})];
  g.touch.layout(1280,720,1,720); g.clearEdges(); g.touch.down(1,g.touch.buttons.grab.x,g.touch.buttons.grab.y,g); g.readMoveInput();
  const touch={down:g.input.rmbDown,pressed:!!g.input.rmbPressed,opened:Codex.watchShop(g),dialog:!!g.shopDlg};
  g.input.rmbPressed=true; const mouse={opened:Codex.watchShop(g),dialog:!!g.shopDlg};
  g.shopDlg=null; g.touch.up(1); g.touch.active=false; return {touch,mouse};
})()`);
probe('cape swap cooldown',`(()=>{
  const g=game; g.shopDlg=null; g.props=[]; g.cape={id:CAPES[0].id}; g.applyBoons(); g.goat.itemCd=37;
  const p=new Prop(g.goat.x+20,g.goat.y,'ware',{shopId:-200,ware:{id:CAPES[1].id,cape:true}});g.props.push(p);
  const original=g.cape.id; Shop.buy(g,p,g.goat); const between={id:g.cape.id,cd:g.goat.itemCd}; Shop.buy(g,p,g.goat);
  return {original,before:37,between,after:{id:g.cape.id,cd:g.goat.itemCd},onFloor:p.ware};
})()`);
probe('grab through obstruction',`(()=>{
  const g=game;g.props=[];g.enemies=[];g.goat.aim={x:1,y:0};g.goat.rmbEdgeNow=true;const old=g.sees;g.sees=()=>false;
  const p=new Prop(g.goat.x+30,g.goat.y,'ware',{shopId:-201,ware:{id:CAPES[2].id,cape:true}});g.props.push(p);
  const before=g.cape.id;g.goat.tryGrab(g);const result={lineOfSight:false,before,after:g.cape.id,shouldHaveStayed:before};g.sees=old;return result;
})()`);
probe('short grab click vs held',`(()=>{
  const g=game;g.startLevel(1,11,false,false);g.state='play';g.enemies=[];g.touch.active=false;g.pad.active=false;g.goat.aim={x:1,y:0};g.input.aim={x:1,y:0};g.input.mx=g.input.my=0;
  const p=new Prop(g.goat.x+20,g.goat.y,'ware',{shopId:-201,ware:{id:CAPES[2].id,cape:true}});g.props=[p];
  g.clearEdges();g.input.rmbPressed=true;g.input.rmbDown=false;g.goat.update(1/60,g);const fast={cape:g.cape,edge:g.goat.rmbEdgeNow};
  g.input.rmbDown=true;g.goat.update(1/60,g);return {fast,held:{cape:g.cape,edge:g.goat.rmbEdgeNow}};
})()`);
probe('real wall grab',`(()=>{
  const g=game;g.startLevel(1,11,false,false);g.state='play';g.enemies=[];g.props=[];
  const w=g.world;const tx=Math.floor(g.goat.x/TILE),ty=Math.floor(g.goat.y/TILE);
  for(let y=ty-2;y<=ty+2;y++)for(let x=tx-1;x<=tx+3;x++)w.tiles[y*w.W+x]=T.FLOOR;
  w.tiles[ty*w.W+tx+1]=T.WALL;g.goat.x=(tx+.5)*TILE;g.goat.y=(ty+.5)*TILE;g.goat.aim={x:1,y:0};g.goat.rmbEdgeNow=true;
  const p=new Prop((tx+2.5)*TILE,g.goat.y,'ware',{shopId:-201,ware:{id:CAPES[2].id,cape:true}});g.props=[p];
  const lineOfSight=g.sees(g.goat.x,g.goat.y,p.x,p.y),distance=p.x-g.goat.x,reach=g.goat.r+p.r+TUNING.goat.grab.reach;g.goat.tryGrab(g);
  return {lineOfSight,distance,reach,cape:g.cape,wallStillSolid:w.tiles[ty*w.W+tx+1]===T.WALL};
})()`);
probe('hound returning home corrupts positions',`(()=>{
  const g=game;g.startLevel(1,11,false,false);g.state='play';g.props=[];g.enemies=[];g.timer=10;
  const d=new Enemy(g.goat.x+20,g.goat.y,'dog');d.home.x=d.x-(TUNING.ai.leash+2)*TILE;d.sideT=TUNING.dog.sideHold;d.state='idle';
  const before={sideT:d.sideT,sideAng:String(d.sideAng),x:d.x,vx:d.vx};g.enemies=[d];g.liveEnemies=[d];
  d.idleWander(1/60,g);const after={facing:String(d.facing),vx:String(d.vx),vy:String(d.vy)};
  d.x+=d.vx/60;d.y+=d.vy/60;g.collideEntities(1/60);
  return {before,after,goatX:String(g.goat.x),goatY:String(g.goat.y)};
})()`);
