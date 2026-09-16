// Run: node tools/audio-check.js. Real emitted notes and game sensing, without a browser.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ctx = vm.createContext({ console, window: { addEventListener() {} } });
for (const file of ['tuning','rng','rules','audio','game']) vm.runInContext(fs.readFileSync(path.join(__dirname,'..','js',file+'.js'),'utf8'),ctx);
const { GameAudio, Game, TILE, MUSIC_PARTS, ROOM_MUSIC, roomMusicScene, emptyMusicScene, musicHitCount, musicPartHit, capMusicScene } = vm.runInContext('({GameAudio,Game,TILE,MUSIC_PARTS,ROOM_MUSIC,roomMusicScene,emptyMusicScene,musicHitCount,musicPartHit,capMusicScene})',ctx);
const plain = x => JSON.parse(JSON.stringify(x));
const empty = plain(emptyMusicScene());
function world() {
  return { state:'play', levelIndex:0, dev:{}, goat:{x:2*TILE,y:2*TILE},
    level:{rooms:[{x:0,y:0,w:12,h:12,index:0},{x:12,y:0,w:12,h:12,index:1}]},
    world:{W:24,H:12,fire:new Float32Array(288)}, enemies:[],props:[],sees:()=>true };
}
const enemy = (kind, extra={}) => ({kind,x:3*TILE,y:3*TILE,state:'idle',...extra});
const fixture = (kind,x=10*TILE,y=10*TILE) => ({kind,x,y});
let g=world(); assert.deepEqual(plain(roomMusicScene(g)),empty);
g.enemies=Object.keys(MUSIC_PARTS).filter(k=>!['spike','mill','champion'].includes(k)).map(k=>enemy(k));
g.enemies.push(enemy('bearer',{champion:true}),enemy('hunter',{dead:true}));
let scene=roomMusicScene(g);
for(const k of ['bearer','dog','hunter','seer','champion','butcher','wraith']) assert.equal(scene[k],1,k);
g.enemies=[enemy('wraith',{ghosted:true,aware:true,state:'drift'})]; assert.equal(roomMusicScene(g).combat,true);
g.enemies=[enemy('hunter',{x:13*TILE,room:0})]; assert.equal(roomMusicScene(g).hunter,0);
g.enemies[0].x=12*TILE; g.goat.x=9*TILE; Object.assign(g.enemies[0],{aware:true,state:'chase'});
assert.equal(roomMusicScene(g).hunter,1);g.sees=()=>false;assert.equal(roomMusicScene(g).hunter,0);
for(const [a,b] of [['bearer','dog'],['hunter','seer'],['champion','butcher']]) for(let i=0;i<=12;i++) for(let j=0;j<=12;j++) {
  const c=capMusicScene({...empty,[a]:i,[b]:j}); assert.equal(c[a]+c[b],Math.min(6,i+j));
  if(i&&j) assert(c[a]&&c[b],'both types keep their identity at the shared cap');
}
g=world();g.props=[fixture('brazier'),fixture('spike'),fixture('mill'),fixture('mill'),fixture('spike',13*TILE)];
scene=roomMusicScene(g); assert.equal(scene.fire,true,'coals count across the room');assert.equal(scene.blaze,0);assert.equal(scene.spike,1);assert.equal(scene.mill,2);
g.props[1].broken=true;assert.equal(roomMusicScene(g).spike,0);
g.world.fire[10*24+10]=2; assert.equal(roomMusicScene(g).blaze,1,'distant room fire counts');
g.world.fire.fill(0);g.world.fire[10*24+13]=2;assert.equal(roomMusicScene(g).blaze,0,'adjacent room fire is excluded');
for(const [n,tier] of [[1,1],[4,2],[10,3],[20,3]]) {
  g.world.fire.fill(0);for(let i=0;i<n;i++)g.world.fire[(7+Math.floor(i/5))*24+6+i%5]=2;
  assert.equal(roomMusicScene(g).fireTiles,n);assert.equal(roomMusicScene(g).blaze,tier);
}
g=world();g.props=[fixture('heal',6*TILE,2*TILE)];assert.equal(roomMusicScene(g).grass,1);g.props[0].broken=true;assert.equal(roomMusicScene(g).grass,0);
for(const state of ['title','intro','dead','climb','boon','clear','card','win']) {g.state=state;assert.deepEqual(plain(roomMusicScene(g)),empty);}
g=world();for(let i=0;i<7;i++){g.levelIndex=i;assert.equal(roomMusicScene(g).late,i>=4);}
function recorder(){
  const a=new GameAudio(),events=[];a.layerBus='layer';
  for(const name of ['tone','noise','pad','bass','lead','kick','tomHi'])a[name]=(...args)=>events.push([name,...args]);
  return {a,events};
}
const expected={bearer:[1,2,3],dog:[1,2,3],hunter:[2,4,5],seer:[2,4,5],champion:[3,5,7],butcher:[3,5,7]};
for(const [k,list]of Object.entries(expected))list.forEach((n,i)=>assert.equal(musicHitCount(k,i+1),n));
for(const [kind,part]of Object.entries(MUSIC_PARTS)){
  let previous=new Set();
  for(let n=1;n<=6;n++){
    const {a,events}=recorder();a.scene={...empty,[kind]:n,combat:true};
    for(let s=0;s<256;s++)a.playStep(s,s/8,0.125);
    const hits=events.filter(e=>e[0]==='tone'&&e[4].bus==='layer');
    assert.equal(hits.length,musicHitCount(kind,n)*8*(part.family==='trap'?2:1),kind+' '+n);
    assert(hits.every(e=>Number.isFinite(e[1])&&Number.isFinite(e[4].gain)));
    const times=new Set(hits.map(e=>e[2]));for(const time of previous)assert(times.has(time),'counts must add accents');previous=times;
  }
}
for(const [a,b]of [['bearer','dog'],['hunter','seer']]){
  assert.equal(ROOM_MUSIC[MUSIC_PARTS[a].family].octave,ROOM_MUSIC[MUSIC_PARTS[b].family].octave);
  for(let n=1;n<=6;n++){
    const mask=k=>Array.from({length:32},(_,s)=>Array.from({length:musicHitCount(k,n)},(_,i)=>musicPartHit(k,i,s)).some(Boolean));
    assert.notDeepEqual(mask(a),mask(b),'same register must have a different rhythm');
  }
}
// Across every legal mixed count, bound primary onsets in each register, then combine maxima.
let onsetMax=0;
for(let s=0;s<256;s++){
  let total=0;
  for(const kinds of [['bearer','dog'],['hunter','seer'],['champion','butcher'],['wraith'],['spike','mill']]){
    let max=0;
    for(let a=0;a<=6;a++)for(let b=0;b<=(kinds.length===1?0:6);b++){
      if(kinds[0]!=='spike'&&a+b>6)continue;
      const hits=kinds.reduce((sum,k,i)=>sum+Array.from({length:musicHitCount(k,i?b:a)},(_,j)=>musicPartHit(k,j,s)?1:0).reduce((x,y)=>x+y,0),0);
      max=Math.max(max,hits);
    }
    total+=max;
  }
  onsetMax=Math.max(onsetMax,total);
}
assert(onsetMax<=5,'bounded simultaneous primary onsets');
const r=recorder();r.a.scene={...empty,blaze:3,fire:true};r.a.playStep(0,0,.125);r.a.scene={...empty};
for(let s=1;s<=20;s++)r.a.playStep(s,s/8,.125);assert.equal(r.a.ambience.blaze.value,3);
for(let s=21;s<70;s++)r.a.playStep(s,s/8,.125);assert.equal(r.a.ambience.blaze.value,0);assert(r.a.blazeMix<.001);
const e=recorder();e.a.musicEvent('kill');assert(e.a.musicEvents[0].due>=8&&e.a.musicEvents[0].due<=16);
for(let s=0;s<8;s++)e.a.playStep(s,s/8,.125);assert(!e.events.some(x=>x[0]==='tone'));
e.a.playStep(8,1,.125);assert.equal(e.events.filter(x=>x[0]==='tone').length,2);assert.equal(e.a.musicEvents.length,0);
for(let i=0;i<1000;i++)e.a.musicEvent('kill');assert.equal(e.a.musicEvents.length,1);assert.equal(e.a.musicEvents[0].count,3);
e.a.updateScene({...world(),state:'dead'},.1);assert.equal(e.a.musicEvents.length,0);
const muted=recorder();muted.a.scene={...empty,blaze:3,fire:true};muted.a.playStep(0,0,.125);muted.a.muted=true;muted.a.scene={...empty};const before=muted.events.length;
for(let s=1;s<80;s++)muted.a.playStep(s,s/8,.125);assert.equal(muted.events.length,before);assert.equal(muted.a.ambience.blaze.value,0);
const lab=recorder();lab.a.init=lab.a.resume=()=>{};g=world();g.dev={rules:true,tab:'music'};lab.a.updateScene(g,.1);
lab.a.labAction('hunter=3',g);lab.a.labAction('bed=none',g);lab.a.updateScene(g,.1);
for(let s=0;s<32;s++)lab.a.playStep(s,s/8,.125);
assert(lab.events.some(e=>e[0]==='tone'));assert(!lab.events.some(e=>e[0]==='bass'));
lab.a.labAction('solo=dog',g);assert.equal(lab.a.lab.scene.hunter,0);assert.equal(lab.a.lab.scene.dog,1);
lab.a.labAction('play',g);assert.equal(lab.a.lab.playing,false);
g.dev.tab='rules';lab.a.updateScene(g,.1);assert.equal(lab.a.preview,null);assert.equal(lab.a.musicEvents.length,0);
const scheduler=new GameAudio();let scheduled=0;scheduler.playStep=()=>scheduled++;scheduler.ctx={currentTime:300,state:'running'};scheduler.schedule();assert(scheduled<=2);
let legacy=false;scheduler.setLayered(false);scheduler.playStep=GameAudio.prototype.playStep;scheduler.playLegacyStep=()=>legacy=true;scheduler.playStep(0,0,.125);assert(legacy);
assert.equal(Game.prototype.loadSettings.call({}).layeredMusic,true);
console.log('PASS: per-type rhythms and exact weighted counts, shared caps, whole-room fire/traps, tails, delayed/bounded events, mute, isolated Music Lab, legacy and scheduler. Maximum simultaneous primary onsets: '+onsetMax);
