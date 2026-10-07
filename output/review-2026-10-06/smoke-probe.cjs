const {load}=require('../audit-2026-09-24/sim/load.js');
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../..');
const L=load(root,{strict:true,seed:Number(process.argv[3]||11)});
L.run(`window.game=new Game(document.getElementById('game'));game.frame=()=>{};`);
L.run(fs.readFileSync(path.join(root,'tools/smoke.js'),'utf8'));
console.log(L.run(`(()=>{
 SMOKE.opts.drawEvery=1e9;
 const r=SMOKE.run1('${process.argv[2] || 'L4'}',11),g=game;
 const invalid=[];
 for(const key of ['x','y','vx','vy']){let v=g.goat[key];Object.defineProperty(g.goat,key,{get(){return v},set(n){if(!Number.isFinite(n)&&!invalid.length)invalid.push({key,old:v,value:String(n),state:g.goat.state,stack:new Error().stack,room:g.goatRoom,time:g.timer});v=n},configurable:true})}
 for(let n=0;n<26000 && !invalid.length && !['climb','clear','win'].includes(g.state);n++)r.steps();
 const D=SMOKE.field(g),i=Math.floor(g.goat.y/TILE)*g.world.W+Math.floor(g.goat.x/TILE);
 const end={invalid,state:g.state,goat:{x:g.goat.x,y:g.goat.y,state:g.goat.state},room:g.goatRoom,field:D[i],exits:Array.from(g.world.tiles).filter(t=>t===T.EXIT).length};
 r.finish();return JSON.stringify({result:r,end},null,2);
})()`));
