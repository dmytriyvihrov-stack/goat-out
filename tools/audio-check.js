// Run: node tools/audio-check.js. Real emitted notes and game sensing, without a browser.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ctx = vm.createContext({ console, window: { addEventListener() {} } });
for (const file of ['tuning','rng','rules','audio','game']) vm.runInContext(fs.readFileSync(path.join(__dirname,'..','js',file+'.js'),'utf8'),ctx);
const { GameAudio, Game, TILE, MUSIC_PARTS, ROOM_MUSIC, roomMusicScene, emptyMusicScene, musicHitCount, musicPartHit, capMusicScene } = vm.runInContext('({GameAudio,Game,TILE,MUSIC_PARTS,ROOM_MUSIC,roomMusicScene,emptyMusicScene,musicHitCount,musicPartHit,capMusicScene})',ctx);
const plain = x => JSON.parse(JSON.stringify(x));
const empty = plain(emptyMusicScene());
function world() {
  return { state:'play', levelIndex:1, dev:{}, goat:{x:2*TILE,y:2*TILE},
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
    assert.equal(hits.length,musicHitCount(kind,n)*8*(part.family==='trap'?2:part.family==='large'?3:1),kind+' '+n);
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
// A two-bar warning must branch on the goat's intent, not simply on enemy awareness.
for (const levelIndex of [0,4]) {
  const a = new GameAudio(), game = world(); game.levelIndex = levelIndex;
  const update = (tick) => { a.musicTick = tick; a.updateScene(game,.2); return a.scene.stage; };
  assert.equal(update(0),'idle');
  game.enemies = [enemy('bearer',{aware:true,state:'chase'})];
  assert.equal(update(4),'spotted'); assert.equal(update(35),'spotted'); assert.equal(update(36),'chase');
  a.musicEvent('roll'); assert.equal(update(40),'chase');
  a.musicEvent('headbutt'); assert.equal(update(44),'combat');
  assert.equal(update(72),'chase','quiet attack intent expires');
  a.muted = true; a.musicEvent('throw'); assert.equal(update(76),'combat','mute does not change the state machine');
  game.enemies = []; assert.equal(update(80),'combat'); assert.equal(update(92),'idle');
  a.musicEvent('headbutt'); assert.equal(update(96),'idle','attacking an empty room is not a fight');
  game.enemies = [enemy('bearer',{aware:true,state:'chase'})]; assert.equal(update(100),'spotted');
  a.musicEvent('headbutt');
  assert.equal(update(132),'combat','opening attack survives the detection phrase');
  assert.equal(a.scene.late, levelIndex >= 4);
}
assert.equal(capMusicScene({...empty,mill:99}).mill,2);
assert.deepEqual([1,2,6].map(n=>musicHitCount('mill',n)),[3,6,6]);
const actions = recorder();
for(const kind of ['headbutt','roll','throw','scream','headbutt','throw'])actions.a.musicEvent(kind);
assert.equal(actions.a.musicEvents.length,6);
assert.equal(new Set(actions.a.musicEvents.map(e=>e.due)).size,6,'mixed and repeated actions get separate slots');
for(let s=0;s<40;s++)actions.a.playStep(s,s/8,.125);
assert.equal(actions.events.filter(e=>e[0]==='tone').length,6,'no accepted gesture is silently discarded');
for(let n=0;n<1000;n++)actions.a.musicEvent(['roll','throw'][n%2]);
assert(actions.a.musicEvents.length<=12);assert(Math.max(...actions.a.musicEvents.map(e=>e.due))-actions.a.musicTick<32);
const sheet = new GameAudio(); sheet.lab.scene={...empty,champion:1,mill:2,fire:true,grass:1};
sheet.lab.actions=[{kind:'roll',due:8,count:1},{kind:'throw',due:10,count:1}];
for(const late of [false,true])for(const stage of ['idle','spotted','chase','combat']) {
  sheet.lab.scene.late=late; sheet.lab.bed=stage;
  const score=sheet.getLabScore();
  assert.equal(score.bars,16);assert.equal(score.stage,stage);
  assert(score.events.every(e=>e.track&&e.duration>0&&Number.isFinite(e.step)));
  const heavies=score.events.filter(e=>e.track==='champion');
  assert.equal(heavies.length,3*8*3);assert(heavies.some(e=>e.hz>=160&&e.type==='square'),'heavy notes have an audible upper body');
  assert(score.events.some(e=>e.track==='roll'));assert(score.events.some(e=>e.track==='throw'));
  assert(score.events.some(e=>e.track==='bass'));
  assert.equal(sheet.getLabScore(),score,'score rendering is cached between frames');
}
sheet.lab.bed='none';assert(!sheet.getLabScore().events.some(e=>['bass','pad','lead','drums'].includes(e.track)));
const history = new GameAudio(); history.preview=history.lab; history.lab.playing=true;
history.musicEvent('kill');history.musicEvent('kill');history.musicEvent('kill');
assert.equal(history.lab.actions.length,1);assert.equal(history.lab.actions[0].count,3,'score retains the stacked kill accent');
history.musicTick=264;history.musicEvent('roll');
assert.equal(history.lab.actions.length,1,'old phrase marks cannot pile up at the same loop position');
history.musicEvents=Array.from({length:12},(_,i)=>({kind:'roll',due:400+i,count:1}));
const marks=history.lab.actions.length;history.musicEvent('kill');assert.equal(history.lab.actions.length,marks,'rejected overflow is not drawn as a played note');
// First-floor harmony/state melodies and short, lifecycle-safe narrative phrases.
for(let i=0;i<7;i++){const game=world();game.levelIndex=i;assert.equal(roomMusicScene(game).first,i===0);}
const firstScore=new GameAudio();firstScore.lab.scene.first=true;
for(const stage of ['idle','spotted','chase','combat']) {
  firstScore.lab.bed=stage;const first=firstScore.getLabScore();assert.equal(first.theme,'1');
  assert(first.events.some(e=>e.track==='lead'));
  firstScore.lab.scene.first=false;const ordinary=firstScore.getLabScore();
  assert.notDeepEqual(plain(first.events.filter(e=>e.track==='lead')),plain(ordinary.events.filter(e=>e.track==='lead')));
  firstScore.lab.scene.first=true;
}
for(const kind of ['clear','death','soul']) {
  const {a,events}=recorder();a.scene={...empty,first:true};a.startMusicCue(kind,0);
  const game=world();game.levelIndex=0;game.state={clear:'clear',death:'dead',soul:'boon'}[kind];
  a.updateScene(game,.1);assert.equal(a.cue.kind,kind,'non-play state preserves its phrase');
  for(let i=0;i<=48;i++)a.playStep(i,i/8,.125);
  assert(events.some(e=>e[0]==='tone'));assert.equal(a.cue,null);
  if(kind!=='soul') {assert.equal(a.terminalCue,kind);const n=events.length;a.playStep(49,49/8,.125);assert.equal(events.length,n,'terminal screen does not restart ordinary music');}
  game.state='title';a.updateScene(game,.1);assert.equal(a.terminalCue,null);
  firstScore.lab.cue=kind;const score=firstScore.getLabScore();
  assert.equal(score.stage,kind);assert(score.events.every(e=>e.track===kind),'cue export is isolated');
  assert(score.events.every(e=>e.step+e.duration<=score.cueBars*16),'phrase tails fit their bars');
}
const cancelled=recorder();cancelled.a.startMusicCue('soul',0);cancelled.a.startMusicCue('death',0);assert.equal(cancelled.a.cue.kind,'death');
cancelled.a.musicEvent('headbutt');assert.equal(cancelled.a.musicEvents.length,0,'cue cannot accumulate overdue action bursts');
cancelled.a.updateScene(world(),.1);assert.equal(cancelled.a.cue,null,'restart cancels the death cue');
cancelled.a.setLayered(false);cancelled.a.startMusicCue('clear',0);assert.equal(cancelled.a.cue,null,'legacy stays intact');
const silent=recorder();silent.a.muted=true;silent.a.startMusicCue('soul',0);
for(let i=0;i<=32;i++)silent.a.playStep(i,i/8,.125);
assert.equal(silent.events.length,0);assert.equal(silent.a.cue,null,'muting consumes rather than delays narrative phrases');
console.log('PASS: per-type rhythms and exact weighted counts, shared caps, whole-room fire/traps, tails, delayed/bounded events, mute, isolated Music Lab, legacy and scheduler. Maximum simultaneous primary onsets: '+onsetMax);
console.log('PASS: first-floor variants, clear/death/soul phrases, game-state lifecycle and score export.');
console.log('PASS: idle / spotted / chase / combat on both themes, repeated gestures, audible heavy harmonics, two-mill limit and full score.');

// The effects: every Foley recipe renders in node, finite, not empty and not silent, and every name
// audio.js asks `foley(` for is a recipe. Without this the whole check passed while no sound effect
// in the game was ever exercised (js/foley.js was not loaded at all).
{
  const fctx = vm.createContext({ console, Math, Float32Array });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'foley.js'), 'utf8'), fctx);
  const F = vm.runInContext('Foley', fctx), names = Object.keys(F.recipes);
  let secs = 0;
  for (const n of names) {
    const buf = F.render(n, {});
    let peak = 0, nan = 0;
    for (let i = 0; i < buf.length; i++) { const v = buf[i]; if (!Number.isFinite(v)) nan++; else if (Math.abs(v) > peak) peak = Math.abs(v); }
    assert(buf.length > 0, n + ' renders nothing'); assert.equal(nan, 0, n + ' renders non-finite samples'); assert(peak > 1e-4, n + ' is silent');
    secs += buf.length / F.rateOf(n);
  }
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'audio.js'), 'utf8');
  const asked = new Set([...src.matchAll(/foley\(\s*'([a-zA-Z]+)'/g)].map((m) => m[1]));
  const missing = [...asked].filter((n) => !names.includes(n));
  assert.equal(missing.length, 0, 'audio.js asks for recipes that do not exist: ' + missing.join(', '));
  console.log('PASS: ' + names.length + ' foley recipes render (' + secs.toFixed(1) + ' s of tail), and all ' + asked.size + ' names audio.js asks for exist.');
}
