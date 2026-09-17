// Optional browser + real WebAudio check. Needs Playwright on NODE_PATH and Chrome installed.
// Start tools/serve.js 8766, then: node tools/audio-browser-check.js
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const output = path.join(__dirname, 'shots', 'audio');
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('http://127.0.0.1:8766');
    await page.waitForFunction(() => window.game && game.menu.rects.length);
    // Use actual menu hit targets, including persisting the switch through a reload.
    const clickMenu = async (i) => {
      const p = await page.evaluate((i) => { const r = game.menu.rects[i]; return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; }, i);
      await page.mouse.click(p.x, p.y);
    };
    await clickMenu(4);
    await page.waitForFunction(() => game.menu.panel === 'settings' && game.menu.rects.length === SETTINGS.length + 1);
    await page.screenshot({ path: path.join(output, 'settings-desktop.png') });
    const musicSetting = await page.evaluate(() => SETTINGS.findIndex(s => s.key === 'layeredMusic'));
    await clickMenu(musicSetting);
    assert.equal(await page.evaluate(() => game.audio.layered), false);
    await page.reload(); await page.waitForFunction(() => window.game && game.menu.rects.length);
    assert.equal(await page.evaluate(() => game.audio.layered), false);
    await clickMenu(4); await page.waitForFunction(() => game.menu.rects.length === SETTINGS.length + 1);
    await clickMenu(musicSetting); assert.equal(await page.evaluate(() => game.audio.layered), true);
    for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
      await page.setViewportSize(viewport);
      await page.waitForFunction(({ width, height }) => game.renderer.w === width && game.renderer.h === height, viewport);
      const bounds = await page.evaluate(() => game.menu.rects.map((r) => ({ ...r })));
      assert(bounds.every((r) => r.y >= 0 && r.y + r.h <= viewport.height && r.x >= 0 && r.x + r.w <= viewport.width));
      await page.screenshot({ path: path.join(output, `settings-${viewport.width}.png`) });
    }
    const stats = await page.evaluate(async () => {
      const render = async (scene, layered, solo = false, volume = 0.5, cue = null) => {
        const sampleRate = 22050, seconds = cue ? 8 : 34;
        const a = new GameAudio(); a.ctx = new OfflineAudioContext(1, sampleRate * seconds, sampleRate);
        a.master = a.ctx.createGain(); a.master.gain.value = TUNING.audio.master; a.master.connect(a.ctx.destination);
        for (const [name, gain] of [['drumBus', TUNING.audio.drums], ['musicBus', TUNING.audio.music], ['sfxBus', TUNING.audio.sfx]]) {
          a[name] = a.ctx.createGain(); a[name].gain.value = gain; a[name].connect(a.master);
        }
        a.layerBus = a.ctx.createGain(); a.layerBus.gain.value = TUNING.audio.layers.gain; a.layerBus.connect(a.musicBus);
        a.noiseBuf = a.ctx.createBuffer(1, sampleRate * 1.5, sampleRate);
        const noise = a.noiseBuf.getChannelData(0); let seed = 17;
        for (let i = 0; i < noise.length; i++) { seed = (1664525 * seed + 1013904223) >>> 0; noise[i] = seed / 2147483648 - 1; }
        a.scene = scene; a.layered = layered; a.intensity = 3; a.hunterAware = true;
        a.setVolumes(volume,0.5);
        if (solo) a.preview = {playing:true,bed:'none'};
        if (cue) { a.preview={playing:true,bed:'none'};a.startMusicCue(cue); }
        const len = 60 / a.bpm / 4;
        for (let s = 0; s < (cue ? 60 : 256); s++) {
          a.step = s;
          if (scene.blaze === 3 && s % 16 === 0) { for (let n = 0; n < 20; n++) a.musicEvent('kill'); for(const kind of ['roll','throw','headbutt','scream']) a.musicEvent(kind); }
          a.playStep(s, 0.05 + s * len, len);
        }
        const buffer = await a.ctx.startRendering(), samples = buffer.getChannelData(0);
        let peak = 0, power = 0, clipped = 0, highPower = 0, previous = 0, filtered = 0;
        const alpha = 1 / (1 + 2 * Math.PI * 150 / sampleRate);
        for (const sample of samples) { peak = Math.max(peak, Math.abs(sample)); power += sample * sample; if (Math.abs(sample) >= 1) clipped++;
          filtered = alpha * (filtered + sample - previous); previous = sample; highPower += filtered * filtered; }
        return { peak, rms: Math.sqrt(power / samples.length), highRms: Math.sqrt(highPower / samples.length), clipped, finite: samples.every(Number.isFinite) };
      };
      const empty = emptyMusicScene();
      const result = {
        empty: await render(empty, true),
        oneSmall: await render({ ...empty, bearer: 1, combat: true }, true),
        threeSmall: await render({ ...empty, bearer: 3, combat: true }, true),
        full: await render({ ...empty, bearer: 3, dog: 3, hunter: 3, seer: 3, champion: 3, butcher: 3, wraith: 6, spike: 6, mill: 6, fire: true, blaze: 3, grass: 3, combat: true }, true),
        lateIdle: await render({ ...empty, late: true, grass: 1 }, true),
        lateCombat: await render({ ...empty, late: true, bearer: 6, hunter: 6, butcher: 6, wraith: 6, spike: 6, mill: 6, fire: true, blaze: 3, grass: 3, combat: true }, true),
        legacy: await render(empty, false),
      };
      for(const late of [false,true])for(const stage of MUSIC_STAGES) result[(late?'late-':'early-')+stage] = await render({...empty,late,stage,champion:2,hunter:2,mill:2},true);
      result.heavySolo = await render({...empty,champion:1,stage:'combat'},true,true);
      result.maxVolume = await render({...empty,champion:3,butcher:3,bearer:3,dog:3,hunter:3,seer:3,wraith:6,spike:6,mill:2,grass:3,fire:true,blaze:3,stage:'combat'},true,false,1);
      for(const stage of MUSIC_STAGES) result['first-'+stage]=await render({...empty,first:true,stage},true);
      for(const first of [true,false])for(const cue of Object.keys(MUSIC_CUES)) result[(first?'first-':'early-')+cue]=await render({...empty,first},true,false,1,cue);
      for(const cue of Object.keys(MUSIC_CUES)) result['late-'+cue]=await render({...empty,late:true},true,false,1,cue);
      return result;
    });
    fs.writeFileSync(path.join(output,'render-stats.json'),JSON.stringify(stats,null,2));
    console.log('Offline renders complete. Peak at maximum volume:',stats.maxVolume.peak);
    for (const [name, s] of Object.entries(stats)) {
      assert(s.finite && s.rms > (name==='heavySolo'?0.004:0.01), name + ' must produce valid audio');
      if (name !== 'legacy') assert.equal(s.clipped, 0, name + ' must leave headroom');
    }
    assert(stats.heavySolo.highRms > 0.004,'a lone heavy stays audible above 150Hz');
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.evaluate(() => { game.startAtLevel(2); game.dev.god = true; });
    await page.waitForFunction(() => game.state === 'play');
    await page.evaluate(() => {
      const e = game.enemies.find((e) => !e.dead && !e.scripted);
      game.goat.x = e.x; game.goat.y = e.y; game.audio.init(); game.audio.resume();
    });
    await page.waitForFunction(() => Object.keys(MUSIC_PARTS).some((k) => game.audio.scene[k] > 0));
    const gameplay = await page.evaluate(() => ({ scene: game.audio.scene, audioState: game.audio.ctx.state }));
    assert.equal(gameplay.audioState, 'running');
    await page.evaluate(()=>game.dropSoul(game.goat.x,game.goat.y));
    await page.waitForFunction(()=>game.state==='boon'&&game.audio.cue?.kind==='soul');
    await page.evaluate(()=>{game.boonArm=0;game.takeBoon(0);});
    await page.waitForFunction(()=>game.state==='play');
    assert.equal(await page.evaluate(()=>game.audio.cue?.kind),'soul');
    await page.waitForFunction(()=>!game.audio.cue);
    assert.equal(await page.evaluate(()=>game.audio.terminalCue),null);
    await page.evaluate(() => { game.state = 'dead'; });
    await page.waitForFunction(() => Object.keys(MUSIC_PARTS).every((k) => game.audio.scene[k] === 0) && !game.audio.scene.fire);
    await page.evaluate(()=>{game.onGoatDied();});
    assert.equal(await page.evaluate(()=>game.audio.cue?.kind),'death');
    await page.evaluate(()=>game.levelCleared());
    assert.equal(await page.evaluate(()=>game.audio.cue?.kind),'clear');
    await page.goto('http://127.0.0.1:8766/?music-lab#music');
    await page.waitForFunction(() => window.game && game.dev.rects.some(r => r.id === 'music-bearer=3'));
    const clickTool = async (id) => {
      await page.waitForFunction(id => game.dev.rects.some(r => r.id === id), id);
      const p = await page.evaluate(id => { const r = game.dev.rects.find(r => r.id === id); return {x:r.x+r.w/2,y:r.y+r.h/2}; }, id);
      await page.mouse.click(p.x,p.y);
    };
    await clickTool('music-theme=first');
    await page.waitForFunction(()=>game.audio.scene.first);
    for(const cue of ['clear','death','soul']) {
      await clickTool('music-cue='+cue);
      assert.equal(await page.evaluate(()=>game.audio.cue?.kind),cue);
      const score=await page.evaluate(()=>game.audio.getLabScore());assert.equal(score.stage,cue);
      assert(score.events.every(e=>e.track===cue));
    }
    await clickTool('music-view=score');await page.screenshot({path:path.join(output,'music-soul-score.png')});
    await clickTool('music-view=mix');await clickTool('music-bed=combat');
    await clickTool('music-bearer=3'); await clickTool('music-dog=2'); await clickTool('music-hunter=2');
    await clickTool('music-fire=10'); await clickTool('music-event=kill');
    await page.waitForFunction(() => game.audio.scene.bearer === 3 && game.audio.scene.dog === 2 && game.audio.scene.blaze === 3);
    assert.equal(await page.evaluate(() => game.audio.lab.playing),true);
    await page.screenshot({path:path.join(output,'music-lab-desktop.png')});
    assert.equal(await page.evaluate(()=>game.dev.rects.some(r=>r.id==='music-mill=3')),false);
    for(const stage of ['idle','spotted','chase','combat']) {
      await clickTool('music-bed='+stage);
      await page.waitForFunction(stage=>game.audio.scene.stage===stage,stage);
    }
    for(const kind of ['headbutt','roll','throw','scream','headbutt','roll']) await clickTool('music-event='+kind);
    assert((await page.evaluate(()=>game.audio.lab.actions.length))>=6);
    await clickTool('music-view=score'); await clickTool('music-track=champion');
    await page.screenshot({path:path.join(output,'music-score-desktop.png')});
    const downloadReady = page.waitForEvent('download'); await clickTool('music-export'); const download = await downloadReady;
    await download.saveAs(path.join(output,'score.json'));
    const score=JSON.parse(fs.readFileSync(path.join(output,'score.json'),'utf8'));
    assert.equal(score.bars,16); assert(score.events.length>0); assert(score.events.every(e=>e.track));
    await clickTool('music-view=mix');
    await clickTool('music-solo=seer'); await clickTool('music-seer=3'); await clickTool('music-bed=none');
    await page.waitForFunction(() => game.audio.scene.seer === 3 && game.audio.scene.bearer === 0);
    for (const viewport of [{width:390,height:844},{width:844,height:390}]) {
      await page.setViewportSize(viewport);
      await page.waitForFunction(v => game.renderer.w === v.width && game.renderer.h === v.height,viewport);
      const bounds=await page.evaluate(()=>game.dev.rects);
      assert(bounds.every(r=>r.x>=0&&r.y>=0&&r.x+r.w<=viewport.width&&r.y+r.h<=viewport.height),'Music Lab fits screen');
      await page.screenshot({path:path.join(output,`music-lab-${viewport.width}.png`)});
      await clickTool('music-view=score');
      await page.waitForFunction(()=>game.dev.rects.some(r=>r.id==='music-track=bass'));
      const scoreBounds=await page.evaluate(()=>game.dev.rects);
      assert(scoreBounds.every(r=>r.x>=0&&r.y>=0&&r.x+r.w<=viewport.width&&r.y+r.h<=viewport.height),'Score fits screen');
      await page.screenshot({path:path.join(output,`music-score-${viewport.width}.png`)});
      await clickTool('music-view=mix');
    }
    await clickTool('music-play');
    assert.equal(await page.evaluate(()=>game.audio.lab.playing),false);
    assert.equal(await page.evaluate(()=>game.audio.musicNodes.size),0,'STOP cancels queued music nodes');
    await clickTool('rules');await page.waitForFunction(()=>game.audio.preview===null);
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(output, 'validation.json'), JSON.stringify({ stats, gameplay, errors }, null, 2));
    console.log(JSON.stringify({ stats, gameplay, errors }, null, 2));
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exitCode = 1; });
