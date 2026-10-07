// The three horns held against a man at different places: who is hit, and how hard he is thrown.
const {load}=require('../audit-2026-09-24/sim/load.js'); const path=require('path');
const L=load(path.resolve(__dirname,'../..'),{strict:true});
L.run(`window.game=new Game(document.getElementById('game')); game.frame=()=>{}; game.runJumped=true; game.startLevel(2,11,false,false); game.state='play';`);
console.log(L.run(`(()=>{
  const g=game, G=g.goat, out={};
  for (const kind of ['dagger','big','long']) {
    g.hornKind=kind; g.applyBoons(); out[kind]={};
    for (const [name,ax,ay] of [['front 1.0t',1,0],['front 2.0t',2,0],['front 2.6t',2.6,0],['front 3.2t',3.2,0],['side 1.0t',0,1],['beside 1.2t,.7t',1.2,.7],['diag .6t,.6t',.6,.6],['behind',-1,0],['between horns 2.4t',2.4,0.0]]) {
      g.enemies=[]; G.x=(G.x); const e=new Enemy(G.x+ax*TILE,G.y+ay*TILE,'bearer'); e.aware=true; g.enemies.push(e); g.liveEnemies=[e];
      G.aim={x:1,y:0}; G.lungeId++; G.state='lunge'; e.lastLunge=-1; e.vx=0;e.vy=0; e.state='idle';
      try { G.headbuttHits(g); } catch(err) { out[kind][name]='ERR '+err.message; continue; }
      out[kind][name]= e.lastLunge===G.lungeId ? Math.round(Math.hypot(e.vx,e.vy)) : '-';
    }
  }
  return JSON.stringify(out,null,1);
})()`));
