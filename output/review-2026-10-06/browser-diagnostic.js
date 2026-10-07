window.addEventListener('load',()=>{
  const box=document.createElement('pre');box.id='review-results';box.style='position:fixed;top:0;left:0;z-index:999;color:white;background:#111d;max-height:40vh;overflow:auto;font:12px monospace;pointer-events:none';document.body.appendChild(box);
  game.autoPause=false;game.menu.panel=null;SMOKE.opts.maxT=100;
  const original=SMOKE.start;const failures=[];
  SMOKE.start=function(which,seed){
    original(which,seed);
    const g=game;let reported=false;
    for(const entity of [g.goat,...g.enemies])for(const key of ['x','y','vx','vy','r']){let v=entity[key];Object.defineProperty(entity,key,{get(){return v},set(n){
      if(!Number.isFinite(n)&&!reported){reported=true;failures.push({which,seed,kind:entity.kind,shaman:!!entity.shaman,thrower:!!entity.thrower,key,old:v,value:String(n),state:entity.state,stack:new Error().stack,room:g.goatRoom,time:g.timer});}
      v=n;
    },configurable:true});}
  };
  SMOKE.run(['L4','L5','L6'],[11,22],'diagnostic');
  const ticker=setInterval(()=>{box.textContent=JSON.stringify(failures,null,2)+'\n'+SMOKE.report('diagnostic');if(SMOKE.res.diagnostic.done){clearInterval(ticker);game.frame=()=>{};}},1000);
});
