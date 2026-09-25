// Run: node tools/audio-check.js. Real emitted notes and game sensing, without a browser.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ctx = vm.createContext({ console, window: { addEventListener() {} } });
for (const file of ['tuning','rng','rules','audio','game']) vm.runInContext(fs.readFileSync(path.join(__dirname,'..','js',file+'.js'),'utf8'),ctx);
const { GameAudio, Game, TILE, TUNING, MUSIC_PARTS, MUSIC_EVENTS, roomMusicScene, emptyMusicScene, musicHitCount, musicPartHit, capMusicScene, musicCap, ambienceBed, LEVELS } =
  vm.runInContext('({GameAudio,Game,TILE,TUNING,MUSIC_PARTS,MUSIC_EVENTS,roomMusicScene,emptyMusicScene,musicHitCount,musicPartHit,capMusicScene,musicCap,ambienceBed,LEVELS})',ctx);
const plain = x => JSON.parse(JSON.stringify(x));
const empty = plain(emptyMusicScene());
const L = TUNING.audio.layers;
function world() {
  return { state:'play', levelIndex:1, dev:{}, goat:{x:2*TILE,y:2*TILE,hp:4,maxHp:4},
    level:{rooms:[{x:0,y:0,w:12,h:12,index:0},{x:12,y:0,w:12,h:12,index:1}]},
    world:{W:24,H:12,fire:new Float32Array(288)}, enemies:[],props:[],sees:()=>true };
}
const enemy = (kind, extra={}) => ({kind,x:3*TILE,y:3*TILE,state:'idle',...extra});
const fixture = (kind,x=10*TILE,y=10*TILE) => ({kind,x,y});

// ---- who is in the room ----
let g=world(); assert.deepEqual(plain(roomMusicScene(g)),empty);
g.enemies=['bearer','dog','hunter','seer','butcher','wraith'].map(k=>enemy(k));
g.enemies.push(enemy('bearer',{champion:true}),enemy('hunter',{dead:true}),enemy('ratogre'));
let scene=roomMusicScene(g);
for(const k of ['bearer','dog','hunter','seer','champion','wraith']) assert.equal(scene[k],1,k);
assert.equal(scene.butcher,2,'the rat ogre plays the one heavy voice there is');
g.enemies=[enemy('wraith',{ghosted:true,aware:true,state:'drift'})]; assert.equal(roomMusicScene(g).combat,true);
g.enemies=[enemy('hunter',{x:13*TILE,room:0})]; assert.equal(roomMusicScene(g).hunter,0);
g.enemies[0].x=12*TILE; g.goat.x=9*TILE; Object.assign(g.enemies[0],{aware:true,state:'chase'});
assert.equal(roomMusicScene(g).hunter,1);g.sees=()=>false;assert.equal(roomMusicScene(g).hunter,0);
// A family stops at its cap and shares it: a crowd is three hits, never six, and a mixed one keeps both.
for(const [a,b] of [['bearer','dog'],['hunter','seer'],['champion','butcher']]) for(let i=0;i<=12;i++) for(let j=0;j<=12;j++) {
  const c=capMusicScene({...empty,[a]:i,[b]:j}); assert.equal(c[a]+c[b],Math.min(L.maxPerFamily,i+j));
  if(i&&j) assert(c[a]&&c[b],'both types keep their identity at the shared cap');
}
g=world();g.props=[fixture('brazier'),fixture('spike'),fixture('mill'),fixture('mill'),fixture('spike',13*TILE),fixture('heal',6*TILE,2*TILE)];
scene=roomMusicScene(g); assert.equal(scene.spike,1);assert.equal(scene.mill,2);
assert(!('fire' in scene)&&!('grass' in scene),'fire and grass are the room\'s sound now, not the score\'s');
g.props[1].broken=true;assert.equal(roomMusicScene(g).spike,0);
g.props=Array.from({length:6},()=>fixture('spike'));assert.equal(roomMusicScene(g).spike,L.maxSpikes);
// The last heart.
g=world();g.goat.hp=1;assert.equal(roomMusicScene(g).lastHeart,true);
g.goat.hp=2;assert.equal(roomMusicScene(g).lastHeart,false);
g.goat.hp=1;g.goat.maxHp=1;assert.equal(roomMusicScene(g).lastHeart,false,'a one-heart goat is not on his last heart');
for(const state of ['title','intro','dead','climb','boon','clear','card','win']) {g=world();g.state=state;assert.deepEqual(plain(roomMusicScene(g)),empty);}
g=world();for(let i=0;i<7;i++){g.levelIndex=i;assert.equal(roomMusicScene(g).late,i>=4);}

// ---- the enemies' layer: one hit a man, fewer than before ----
function recorder(){
  const a=new GameAudio(),events=[];a.layerBus='layer';a.drumBus='drum';a.musicBus='music';
  for(const name of ['tone','noise','pad','bass','lead','kick','tomHi','pluck','rim'])a[name]=(...args)=>events.push([name,...args]);
  a.hurtDip=()=>events.push(['dip']);
  return {a,events};
}
const expected={bearer:[1,2,3],dog:[1,2,3],hunter:[1,2,3],seer:[1,2,3],wraith:[1,2,3],champion:[2,3,4],butcher:[2,3,4],spike:[1,2],mill:[2,3]};
for(const [k,list]of Object.entries(expected)){list.forEach((n,i)=>assert.equal(musicHitCount(k,i+1),n,k));assert.equal(musicCap(k),list.length,k);}
for(const [kind,part]of Object.entries(MUSIC_PARTS)){
  let previous=new Set();
  for(let n=1;n<=musicCap(kind);n++){
    const {a,events}=recorder();a.scene={...empty,[kind]:n,combat:true};
    for(let s=0;s<256;s++)a.playStep(s,s/8,0.125);
    const hits=events.filter(e=>e[0]==='tone'&&e[4].bus==='layer');
    assert.equal(hits.length,musicHitCount(kind,n)*8*(part.family==='trap'?2:part.family==='large'?3:1),kind+' '+n);
    assert(hits.every(e=>Number.isFinite(e[1])&&Number.isFinite(e[4].gain)));
    const times=new Set(hits.map(e=>e[2]));for(const time of previous)assert(times.has(time),'counts must add accents');previous=times;
    // The same two bars every time: a kind's figure does not move under the phrase any more.
    assert.equal(new Set([...times].map(t=>Math.round(t*8)%32)).size,musicHitCount(kind,n),kind+' '+n+' keeps its places');
  }
}
for(const [a,b]of [['bearer','dog'],['hunter','seer']]){
  for(let n=1;n<=3;n++){
    const mask=k=>Array.from({length:32},(_,s)=>Array.from({length:musicHitCount(k,n)},(_,i)=>musicPartHit(k,i,s)).some(Boolean));
    assert.notDeepEqual(mask(a),mask(b),'same register must have a different rhythm');
  }
}
// Across every legal mixed count, bound primary onsets in each register, then combine maxima.
let onsetMax=0;
for(let s=0;s<32;s++){
  let total=0;
  for(const kinds of [['bearer','dog'],['hunter','seer'],['champion','butcher'],['wraith'],['spike','mill']]){
    let max=0;
    for(let a=0;a<=3;a++)for(let b=0;b<=(kinds.length===1?0:3);b++){
      if(kinds[0]!=='spike'&&a+b>L.maxPerFamily)continue;
      const hits=kinds.reduce((sum,k,i)=>sum+Array.from({length:musicHitCount(k,i?b:a)},(_,j)=>musicPartHit(k,j,s)?1:0).reduce((x,y)=>x+y,0),0);
      max=Math.max(max,hits);
    }
    total+=max;
  }
  onsetMax=Math.max(onsetMax,total);
}
assert(onsetMax<=4,'bounded simultaneous primary onsets: '+onsetMax);
// A crowd is well under what it was. A late room the generator deals (three clubmen, two hounds, a
// rifle and a brute) was ten hits in two bars and is six; a room with every kind and both traps in it
// used to fill every sixteenth there is.
for(const [room,most] of [[{bearer:3,dog:2,hunter:1,champion:1},6],[{bearer:6,dog:6,hunter:6,seer:6,champion:6,butcher:6,wraith:6,spike:6,mill:6},18]]){
  const {a,events}=recorder();a.scene=capMusicScene({...empty,...room,combat:true});
  for(let s=0;s<32;s++)a.playStep(s,s/8,0.125);
  const onsets=new Set(events.filter(e=>e[0]==='tone'&&e[4].bus==='layer').map(e=>e[2]));
  assert(onsets.size<=most,'crowded room: '+onsets.size+' onsets in two bars');
}

// ---- answers to situations, not to buttons ----
const e=recorder();
for(const kind of ['headbutt','roll','throw','scream'])e.a.musicEvent(kind);
assert.equal(e.a.musicEvents.length,0,'the buttons have no musical reply of their own');
e.a.musicEvent('kill');assert(e.a.musicEvents[0].due>=1&&e.a.musicEvents[0].due<=L.eventGridSteps,'a kill is answered on the next eighth');
e.a.playStep(0,0,.125);assert(!e.events.some(x=>x[0]==='tone'));
e.a.playStep(1,1/8,.125);e.a.playStep(2,2/8,.125);assert.equal(e.events.filter(x=>x[0]==='tone').length,2);assert.equal(e.a.musicEvents.length,0);
for(let i=0;i<1000;i++)e.a.musicEvent('kill');assert.equal(e.a.musicEvents.length,1);assert.equal(e.a.musicEvents[0].count,3);
e.a.updateScene({...world(),state:'dead'},.1);assert.equal(e.a.musicEvents.length,0);
e.a.musicEvent('hurt');assert(e.events.some(x=>x[0]==='dip'),'a heart lost dips the score');assert.equal(e.a.musicEvents.length,0);
{
  const {a,events}=recorder();a.musicEvent('cleared');const due=a.musicEvents[0].due;
  for(let s=0;s<=due+8;s++)a.playStep(s,s/8,.125);
  assert.equal(events.filter(x=>x[0]==='tone').length,4,'the room\'s last man: four notes up to the octave');
}
{
  // A fight starting stings once, on the next sixteenth.
  const {a,events}=recorder(),game=world();
  a.musicTick=40;a.updateScene(game,.2);assert.equal(a.musicEvents.length,0);
  game.enemies=[enemy('bearer',{aware:true,state:'chase'})];a.musicTick=44;a.updateScene(game,.2);
  assert.equal(a.scene.stage,'spotted');assert.equal(a.musicEvents.length,1);assert.equal(a.musicEvents[0].kind,'spotted');assert.equal(a.musicEvents[0].due,45);
  a.musicTick=48;a.updateScene(game,.2);assert.equal(a.musicEvents.length,1,'only the start of a fight stings');
  a.musicTick=45;a.playStep(45,45/8,.125);
  assert(events.some(x=>x[0]==='tone'&&x[4].bus==='drum')&&events.some(x=>x[0]==='tone'&&x[4].type==='sawtooth'),'drum skin and a low pluck');
}
{
  // On the last heart the tune steps back.
  const lead=(heart)=>{const {a,events}=recorder();a.scene={...empty,lastHeart:heart};a.heartMix=heart?1:0;
    for(let s=0;s<64;s++)a.playStep(s,s/8,.125);return events.filter(x=>x[0]==='lead').reduce((n,x)=>n+x[4],0);};
  assert(Math.abs(lead(true)/lead(false)-L.heartSing)<0.05,'the tune on the last heart is heartSing of itself');
}
const muted=recorder();muted.a.scene={...empty,bearer:3,combat:true};muted.a.muted=true;muted.a.musicEvent('kill');
for(let s=0;s<80;s++)muted.a.playStep(s,s/8,.125);assert.equal(muted.events.length,0);
const lab=recorder();lab.a.init=lab.a.resume=()=>{};g=world();g.dev={rules:true,tab:'music'};lab.a.updateScene(g,.1);
lab.a.labAction('hunter=3',g);lab.a.labAction('bed=none',g);lab.a.updateScene(g,.1);
for(let s=0;s<32;s++)lab.a.playStep(s,s/8,.125);
assert(lab.events.some(e=>e[0]==='tone'));assert(!lab.events.some(e=>e[0]==='bass'));
lab.a.labAction('solo=dog',g);assert.equal(lab.a.lab.scene.hunter,0);assert.equal(lab.a.lab.scene.dog,1);
lab.a.labAction('amb=cave',g);assert.equal(lab.a.lab.amb.bed,'cave');lab.a.labAction('amb=off',g);assert.equal(lab.a.lab.amb.bed,null);
lab.a.labAction('fire=0.7',g);assert.equal(lab.a.lab.amb.fire,0.7);
lab.a.labAction('heart',g);assert.equal(lab.a.lab.scene.lastHeart,true);
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
assert.equal(capMusicScene({...empty,mill:99}).mill,L.maxMills);
const sheet = new GameAudio(); sheet.lab.scene={...empty,champion:1,mill:2};
sheet.lab.actions=[{kind:'kill',due:8,count:1},{kind:'spotted',due:10,count:1}];
for(const late of [false,true])for(const stage of ['idle','spotted','chase','combat']) {
  sheet.lab.scene.late=late; sheet.lab.bed=stage;
  const score=sheet.getLabScore();
  assert.equal(score.bars,16);assert.equal(score.stage,stage);
  assert(score.events.every(e=>e.track&&e.duration>0&&Number.isFinite(e.step)));
  assert(score.events.every(e=>score.instruments[e.track]),'every track has a name in the export');
  const heavies=score.events.filter(e=>e.track==='champion');
  assert.equal(heavies.length,musicHitCount('champion',1)*8*3);assert(heavies.some(e=>e.hz>=160&&e.type==='square'),'heavy notes have an audible upper body');
  assert(score.events.some(e=>e.track==='kill'));assert(score.events.some(e=>e.track==='spotted'));
  assert(score.events.some(e=>e.track==='bass'));
  assert.equal(sheet.getLabScore(),score,'score rendering is cached between frames');
}
sheet.lab.bed='none';assert(!sheet.getLabScore().events.some(e=>['bass','pad','lead','drums'].includes(e.track)));
const history = new GameAudio(); history.preview=history.lab; history.lab.playing=true;
history.musicEvent('kill');history.musicEvent('kill');history.musicEvent('kill');
assert.equal(history.lab.actions.length,1);assert.equal(history.lab.actions[0].count,3,'score retains the stacked kill accent');
history.musicTick=264;history.musicEvent('kill');
assert.equal(history.lab.actions.length,1,'old phrase marks cannot pile up at the same loop position');
history.musicEvents=Array.from({length:12},(_,i)=>({kind:'kill',due:400+i,count:1}));
const marks=history.lab.actions.length;history.musicEvent('cleared');assert.equal(history.lab.actions.length,marks,'rejected overflow is not drawn as a played note');
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
cancelled.a.musicEvent('kill');assert.equal(cancelled.a.musicEvents.length,0,'cue cannot accumulate overdue replies');
cancelled.a.updateScene(world(),.1);assert.equal(cancelled.a.cue,null,'restart cancels the death cue');
cancelled.a.setLayered(false);cancelled.a.startMusicCue('clear',0);assert.equal(cancelled.a.cue,null,'legacy stays intact');
const silent=recorder();silent.a.muted=true;silent.a.startMusicCue('soul',0);
for(let i=0;i<=32;i++)silent.a.playStep(i,i/8,.125);
assert.equal(silent.events.length,0);assert.equal(silent.a.cue,null,'muting consumes rather than delays narrative phrases');
console.log('PASS: per-type rhythms at one hit a man, capped at '+L.maxPerFamily+' a family; traps, fixed figures, mute, isolated Music Lab, legacy and scheduler. Maximum simultaneous primary onsets: '+onsetMax);
console.log('PASS: kill on the next eighth, cleared, spotted sting, hurt dip, last heart; no replies to buttons; first-floor variants, clear/death/soul phrases and score export.');

// ---- the rooms' own sound ----
{
  const beds=TUNING.audio.ambience.beds;
  for(const def of LEVELS){const b=ambienceBed(def);assert(b&&['air','cave','wind'].includes(b.loop),def.name+' has a bed');assert.equal(b,beds[def.canon.id],def.name);}
  assert.equal(ambienceBed({shroom:true,canon:{id:'hollow'}}),beds.trip);assert.equal(ambienceBed(null),beds.stone);
  // Fire near him: nothing, a bowl beside him, a room alight; from the side it is on.
  const a=new GameAudio(),game=world();game.goat.x=6*TILE;game.goat.y=6*TILE;
  assert.equal(a.fireNear(game).level,0);
  game.props=[fixture('brazier',8*TILE,6*TILE)];let f=a.fireNear(game);assert(f.level>0.1&&f.level<0.4&&f.pan>0,'one bowl to his right');
  game.props[0].broken=true;assert.equal(a.fireNear(game).level,0);
  game.props=[];for(let x=2;x<6;x++)for(let y=4;y<9;y++)game.world.fire[y*24+x]=2;f=a.fireNear(game);assert(f.level>0.6&&f.pan<0,'a blaze to his left');
  game.enemies=[enemy('bearer',{x:6*TILE,y:9*TILE,burning:2})];assert(a.fireNear(game).level>f.level,'a burning man adds to it');
  // His heart: once a beat, lub and dub, in time with the picture's pulse, never off his last heart.
  const h=new GameAudio(),calls=[];h.ctx={currentTime:0,state:'running'};h.foley=(n,o)=>calls.push([n,o]);
  const hg=world();hg.goat.hp=1;hg.renderer={t:0};const B=TUNING.juice.heartbeat,per=60/B.bpm;
  for(let t=0;t<per*4.01;t+=1/60){hg.renderer.t=t;h.heartbeat(hg);}
  assert.equal(calls.length,8,'four beats, lub and dub');assert(calls.every(c=>c[0]==='heart'));
  assert(Math.abs(calls[1][1].at-0.2*per)<1e-9,'the dub sits where the picture\'s second pulse is');
  hg.goat.hp=2;const before=calls.length;for(let t=per*5;t<per*8;t+=1/60){hg.renderer.t=t;h.heartbeat(hg);}assert.equal(calls.length,before);
  console.log('PASS: every floor has a bed, fire is heard from its side and grows with the blaze, the heart beats with the picture.');
}

// The effects: every Foley recipe renders in node, finite, not empty and not silent, and every name
// audio.js asks `foley(` for is a recipe. Without this the whole check passed while no sound effect
// in the game was ever exercised (js/foley.js was not loaded at all).
{
  const fctx = vm.createContext({ console, Math, Float32Array });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'foley.js'), 'utf8'), fctx);
  const F = vm.runInContext('Foley', fctx), names = Object.keys(F.recipes);
  let secs = 0;
  const check = (label, buf) => {
    let peak = 0, nan = 0;
    for (let i = 0; i < buf.length; i++) { const v = buf[i]; if (!Number.isFinite(v)) nan++; else if (Math.abs(v) > peak) peak = Math.abs(v); }
    assert(buf.length > 0, label + ' renders nothing'); assert.equal(nan, 0, label + ' renders non-finite samples'); assert(peak > 1e-4, label + ' is silent');
  };
  for (const n of names) { const buf = F.render(n, {}); check(n, buf); secs += buf.length / F.rateOf(n); }
  // A loop repeats without a seam: its last sample runs on into its first.
  for (const n of F.loops) {
    const buf = F.loop(n); check('loop ' + n, buf);
    let step = 0; for (let i = 1; i < buf.length; i++) step = Math.max(step, Math.abs(buf[i] - buf[i - 1]));
    assert(Math.abs(buf[buf.length - 1] - buf[0]) <= step * 1.5, 'loop ' + n + ' has a seam');
  }
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'audio.js'), 'utf8');
  const asked = new Set([...src.matchAll(/foley\(\s*'([a-zA-Z]+)'/g)].map((m) => m[1]));
  const missing = [...asked].filter((n) => !names.includes(n));
  assert.equal(missing.length, 0, 'audio.js asks for recipes that do not exist: ' + missing.join(', '));
  const loopsAsked = new Set([...src.matchAll(/startLoop\(\s*'([a-zA-Z]+)'/g)].map((m) => m[1]).concat(Object.values(TUNING.audio.ambience.beds).map((b) => b.loop)));
  assert.equal([...loopsAsked].filter((n) => !F.loops.includes(n)).length, 0, 'a bed asks for a loop that does not exist');
  console.log('PASS: ' + names.length + ' foley recipes render (' + secs.toFixed(1) + ' s of tail), ' + F.loops.length + ' loops join without a seam, and all ' + asked.size + ' names audio.js asks for exist.');
}
