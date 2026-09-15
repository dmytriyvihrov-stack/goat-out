const { chromium } = require('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const path = require('path');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:8766', { waitUntil: 'load' });
  await page.waitForFunction(() => window.game);
  await page.evaluate(() => {
    game.startLevel(0, 1337, false, false); if (game.intro) game.skipIntro(true);
    game.state = 'play'; game.card = null; game.dev.god = true;
    for (const e of game.enemies) e.update = () => {};
  });
  await page.waitForTimeout(250);
  const info = await page.evaluate(() => ({ state: game.state, firstArt: !!game.renderer.altar,
    rooms: game.level.rooms.map(r => ({ index:r.index, x:r.x, y:r.y, w:r.w, h:r.h, role:r.role })),
    props: [...new Set(game.props.map(p => p.kind))] }));
  for (const index of [0, 4, 5, 9]) {
    await page.evaluate((i) => {
      const r = game.level.rooms.find(r => r.index === i); if (!r) return;
      const x = (r.x + r.w / 2) * TILE, y = (r.y + r.h / 2) * TILE;
      game.goat.x = x; game.goat.y = y; game.cam.x = x; game.cam.y = y;
      game.goat.vx = game.goat.vy = 0; game.camLead.x = game.camLead.y = 0;
      game.card = null;
    }, index);
    await page.waitForTimeout(180);
    await page.screenshot({ path: path.join(__dirname, `level-one-room-${index}.png`) });
  }
  const transitions = await page.evaluate(() => {
    const out = [];
    for (const li of [1, 0, 2, 0]) {
      game.startLevel(li, 2718, false, false); if (game.intro) game.skipIntro(true);
      game.renderer.draw(game, 0);
      out.push([li, !!game.renderer.altar, game.renderer.altarArt.tiles.size, game.renderer.altarArt.sprites.size]);
    }
    return out;
  });
  const frames = await page.evaluate(() => {
    const t = performance.now(); for (let i = 0; i < 100; i++) game.renderer.draw(game, 0);
    return (performance.now() - t) / 100;
  });
  await page.goto('http://127.0.0.1:8766/artifact.html', { waitUntil: 'load' });
  await page.waitForFunction(() => window.game);
  const artifact = await page.evaluate(() => { game.startLevel(0, 1337, false, false); game.renderer.draw(game, 0); return !!game.renderer.altar; });
  console.log(JSON.stringify({ info, transitions, averageDrawMs: frames, artifact, errors }, null, 2));
  await browser.close(); if (errors.length) process.exitCode = 1;
})().catch(e => { console.error(e); process.exitCode = 1; });
