const {load}=require('../audit-2026-09-24/sim/load.js'); const path=require('path');
const L=load(path.resolve(__dirname,'../..'),{strict:true});
L.run(`window.game=new Game(document.getElementById('game')); game.frame=()=>{}; game.runJumped=true;`);
console.log(L.run(`(()=>{ const g=game; g.startLevel(1,4*977,false,false); g.state='play';
 const p=g.props.find(p=>p.kind==='ware'&&Math.abs(p.x-976)<2&&Math.abs(p.y-1904)<2); const tx=Math.floor(p.x/TILE),ty=Math.floor(p.y/TILE);
 let out=[JSON.stringify({id:p.ware.id,shelved:Shop.shelved(g,p),r:p.r, tile:g.world.tiles[ty*g.world.W+tx]})];
 for(let y=ty-3;y<=ty+3;y++){let r='';for(let x=tx-4;x<=tx+4;x++){const t=g.world.isSolid(x,y)?'#':'.';r+=(x===tx&&y===ty)?'W':t;}out.push(r);} return out.join(' | '); })()`));
