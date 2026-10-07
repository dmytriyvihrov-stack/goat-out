// Every ware on a real shop floor must still be graspable from the floor in front of it (B4's line check must not cut a shop off).
const {load}=require('../audit-2026-09-24/sim/load.js'); const path=require('path');
const L=load(path.resolve(__dirname,'../..'),{strict:true});
L.run(`window.game=new Game(document.getElementById('game')); game.frame=()=>{}; game.runJumped=true;`);
console.log(L.run(`(()=>{
  const g=game; let shops=0, wares=0, bad=[];
  for (const li of TUNING.shop.levels) for (let s=1;s<=12;s++) {
    g.startLevel(li, s*977, false, false); g.state='play'; g.enemies=[];
    for (const p of g.props) { if (p.kind!=='ware'||p.broken||(p.ware.cape&&p.shopId<0)) continue; wares++;
      // a goat standing on any open floor tile within reach, facing the ware: does some tile pass both reach and sight?
      let ok=false; const R=TUNING.goat.grab.reach+p.r+g.goat.r;
      for (let a=0;a<24&&!ok;a++) for (const d of [R*0.5,R*0.8,R*0.95]) {
        const x=p.x+Math.cos(a/24*6.283)*d, y=p.y+Math.sin(a/24*6.283)*d;
        if (g.world.isSolid(Math.floor(x/TILE),Math.floor(y/TILE))) continue;
        if (g.sees(x,y,p.x,p.y)) { ok=true; break; } }
      if (!ok) bad.push([li,s,p.x|0,p.y|0]); }
  }
  return JSON.stringify({wares,bad});
})()`));
