// Load after tools/harness.js in a dev page. Actual drawProp calls and actual floor swatches.
window.SMALL_ART_REVIEW = async () => {
  await H.startPlay();
  const R = game.renderer, oldCtx = R.ctx, oldT = R.t, before = ART_PASS.smallProps;
  const canvas = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });
  const save = async (cv, name) => fetch('/shot?name=small-art-' + name, { method: 'POST', body: cv.toDataURL() });
  const text = (ctx, s, x, y, size = 18) => { ctx.font = size + 'px sans-serif'; ctx.fillStyle = '#e6dcc0'; ctx.fillText(s, x, y); };
  const names = { bomb: 'Бомба', husky: 'Хаски', fish: 'Аквариум' };
  const kinds = Object.keys(names), defs = [LEVELS[0], LEVELS[2], LEVELS[5]];
  const props = kinds.map(kind => { const p = new Prop(80, 67, kind); Object.assign(p, { face: 1, phase: 0, bob: 0, vx: 0, vy: 0, singing: 0, fuseT: -1 }); return p; });
  const firstDrawMs = {};
  const patch = (def, pass, kind, all = false) => {
    const cv = canvas(160, 96), x = cv.getContext('2d'); ART_PASS.smallProps = pass;
    for (let j = 0; j < 3; j++) for (let i = 0; i < 5; i++) x.drawImage(R.painted.floorSwatch(def, 0, false, i, j), i * 32, j * 32, 32, 32);
    R.ctx = x; R.t = 0; x.save(); x.scale(1, TILT);
    const cast = all ? [new Prop(24, 36, 'crate'), new Prop(136, 38, 'barrel'), ...props] : [props[kinds.indexOf(kind)]];
    cast.forEach((p, i) => {
      const oldX = p.x, oldY = p.y;
      if (all && i >= 2) { p.x = 42 + (i - 2) * 40; p.y = 85; }
      const t0 = performance.now(); R.drawProp(p);
      const key = p.kind + (pass ? '-study' : '-original');
      if (!(key in firstDrawMs)) firstDrawMs[key] = +(performance.now() - t0).toFixed(2);
      p.x = oldX; p.y = oldY;
    });
    x.restore(); R.ctx = oldCtx; R.t = oldT; return cv;
  };
  try {
    for (const kind of kinds) {
      const cv = canvas(1016, 510), x = cv.getContext('2d'); x.fillStyle = '#19171d'; x.fillRect(0, 0, cv.width, cv.height);
      text(x, names[kind] + ' · родной спрайт на 5 × 3 тайлах игры', 20, 30, 22);
      for (let side = 0; side < 2; side++) {
        const X = 20 + side * 504, p = patch(defs[0], !!side, kind);
        text(x, side ? 'СТАЛО · новый вариант' : 'БЫЛО · оригинал', X, 64);
        x.imageSmoothingEnabled = false; x.drawImage(p, X, 82, 480, 288);
        text(x, 'Увеличение ×3 без сглаживания', X, 397, 15);
        x.drawImage(p, X, 412); text(x, '×1', X + 175, 454, 16);
      }
      await save(cv, kind);
    }
    const context = canvas(1016, 1100), x = context.getContext('2d'); x.fillStyle = '#19171d'; x.fillRect(0, 0, context.width, context.height);
    text(x, 'Все три вместе · реальные тайлы + прежние ящик и бочка', 20, 30, 22);
    defs.forEach((def, row) => {
      const Y = 60 + row * 344; text(x, def.name, 20, Y, 17);
      for (let side = 0; side < 2; side++) { const X = 20 + side * 504; text(x, side ? 'СТАЛО' : 'БЫЛО', X, Y + 24, 15); x.imageSmoothingEnabled = false; x.drawImage(patch(def, !!side, 'bomb', true), X, Y + 34, 480, 288); }
    });
    await save(context, 'context');
    // One frozen playable room, captured twice in the same JS turn (no simulation between shots).
    const room = game.level.rooms.find(r => r.w >= 7 && r.h >= 6) || game.level.rooms[0];
    const cx = (room.x + room.w / 2) * TILE, cy = (room.y + room.h / 2) * TILE;
    H.tp(cx, cy); game.cageOpen = true; game.dev.god = true;
    game.enemies = []; game.props = game.props.filter(p => Math.hypot(p.x - cx, p.y - cy) > TILE * 5);
    kinds.forEach((kind, i) => { const p = new Prop(cx + (i - 1) * 50, cy - 32, kind); Object.assign(p, { face: 1, phase: 0, bob: 0, vx: 0, vy: 0, singing: 0, fuseT: -1 }); game.props.push(p); });
    game.props.push(new Prop(cx - 85, cy + 30, 'crate'), new Prop(cx + 90, cy + 25, 'barrel'));
    game.cam.zoom = game.cam.targetZoom || 2; game.autoPause = false;
    R.t = 0; ART_PASS.smallProps = false; R.draw(game, 0);
    const a = canvas(game.canvas.width, game.canvas.height); a.getContext('2d').drawImage(game.canvas, 0, 0);
    ART_PASS.smallProps = true; R.t = 0; R.draw(game, 0);
    const b = canvas(game.canvas.width, game.canvas.height); b.getContext('2d').drawImage(game.canvas, 0, 0);
    await save(a, 'game-before'); await save(b, 'game-after');
    const pair = canvas(1000, 350), px = pair.getContext('2d'); px.fillStyle = '#19171d'; px.fillRect(0, 0, 1000, 350);
    [a, b].forEach((im, i) => { text(px, i ? 'СТАЛО · кадр игры ×1' : 'БЫЛО · тот же кадр ×1', 10 + i * 500, 26); px.drawImage(im, im.width / 2 - 240, im.height / 2 - 170, 480, 300, 10 + i * 500, 42, 480, 300); });
    await save(pair, 'game-pair');
    const frameNames = Object.keys(PROP_PIXELS.sprites).filter(n => n.endsWith('@small'));
    for (const name of frameNames) {
      const g = PROP_PIXELS.sprites[name], cv = canvas(g.w, g.h), ctx = cv.getContext('2d');
      for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (g.get(x, y)) { ctx.fillStyle = g.get(x, y); ctx.fillRect(x, y, 1, 1); }
      await save(cv, 'sprite-' + name.replace('@small', ''));
    }
    // Average sprite/floor contrast is diagnostic, not a substitute for silhouette inspection.
    const lin = n => (n /= 255) <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4;
    const lum = a => .2126 * lin(a[0]) + .7152 * lin(a[1]) + .0722 * lin(a[2]);
    const lab = a => { const [r,g,b] = a.map(lin), l = Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b), m = Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b), s = Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b); return [.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s]; };
    const mean = rows => rows.reduce((a,b) => a.map((v,i) => v + b[i] / rows.length), [0,0,0]);
    const rgb = c => [1,3,5].map(i => parseInt(c.slice(i,i+2),16));
    const averages = ['bomb','husky-stand','fish-0'].map(n => mean(PROP_PIXELS.sprites[n+'@small'].p.filter(Boolean).map(rgb)));
    const contrast = LEVELS.map(def => {
      const cv = canvas(32,32), ctx = cv.getContext('2d'); ctx.drawImage(R.painted.floorSwatch(def,0,false,0,0),0,0,32,32);
      const data = ctx.getImageData(0,0,32,32).data, rows=[]; for(let i=0;i<data.length;i+=4) rows.push([data[i],data[i+1],data[i+2]]);
      const floor = mean(rows), f = lum(floor), fl = lab(floor);
      return { floor:def.name, sprites:averages.map((a,i) => ({name:kinds[i], ratio:+((Math.max(lum(a),f)+.05)/(Math.min(lum(a),f)+.05)).toFixed(2), OKLab:+(Math.hypot(...lab(a).map((v,j)=>v-fl[j]))*100).toFixed(1)})) };
    });
    const info = { state: game.state, firstDrawMs, contrast, floors: defs.map(d => d.name), frames: frameNames.map(n => {
      const g = PROP_PIXELS.sprites[n]; return { name: n, width: g.w, height: g.h, colours: new Set(g.p.filter(Boolean)).size };
    }) };
    return info;
  } finally { R.ctx = oldCtx; R.t = oldT; ART_PASS.smallProps = before; }
};
