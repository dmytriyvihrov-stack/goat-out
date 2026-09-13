// Test harness for driving the game from the browser console (dev only). Load with:
//   const s = document.createElement('script'); s.src = '/tools/harness.js'; document.body.appendChild(s);
window.H = {
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  install() {
    const orig = game.readMoveInput.bind(game);
    game.readMoveInput = function () {
      orig();
      if (H.aimAt) { const dx = H.aimAt.x - game.goat.x, dy = H.aimAt.y - game.goat.y, d = Math.hypot(dx, dy) || 1; game.input.aim = { x: dx / d, y: dy / d }; }
      if (H.walkTo) { const dx = H.walkTo.x - game.goat.x, dy = H.walkTo.y - game.goat.y, d = Math.hypot(dx, dy) || 1; if (d > 6) { game.input.mx = dx / d; game.input.my = dy / d; } else { H.walkTo = null; } }
    };
    H.installed = true;
  },
  async shot(name) { const r = await fetch('/shot?name=' + name, { method: 'POST', body: game.canvas.toDataURL('image/png') }); return r.text(); },
  freeze(except) { for (const e of game.enemies) { e._upd = e._upd || e.update; e.update = e === except ? e._upd : () => {}; } },
  unfreeze() { for (const e of game.enemies) if (e._upd) e.update = e._upd; },
  nearest(kind) { return game.enemies.filter((e) => !e.dead && (!kind || e.kind === kind)).sort((a, b) => Math.hypot(a.x - game.goat.x, a.y - game.goat.y) - Math.hypot(b.x - game.goat.x, b.y - game.goat.y))[0]; },
  tp(x, y) { game.goat.x = x; game.goat.y = y; game.cam.x = x; game.cam.y = y; },
  headbutt() { game.input.lmbPressed = true; },
  async waitFor(fn, timeout = 4000) { const t0 = performance.now(); while (!fn()) { if (performance.now() - t0 > timeout) return false; await H.sleep(16); } return true; },
  // Clicks through the title and drops the opening scene, so the goat is in the pen and playable.
  async startPlay() {
    if (game.state === 'title') game.menuPick(0);
    await H.waitFor(() => game.state === 'intro' || game.state === 'play', 6000);
    if (game.state === 'intro') game.skipIntro(true);
    await H.waitFor(() => game.state === 'play', 6000);
    if (!H.installed) H.install();
    return game.state;
  },
  status() {
    const g = game.goat;
    return { state: game.state, goat: [g.x | 0, g.y | 0, g.state, g.hp, !!g.holding], kills: game.kills,
      near: game.enemies.filter((e) => !e.dead).map((e) => [e.kind, e.state, +(Math.hypot(e.x - g.x, e.y - g.y) / TILE).toFixed(1), e.hp]).sort((a, b) => a[2] - b[2]).slice(0, 5),
      floats: game.floats.map((f) => f.text) };
  },
};
