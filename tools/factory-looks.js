// THE FACTORY's looks on one sheet (14 Oct 2026): every floor of `FACTORY_PIXELS.FLOORS` against every wall of
// `FACTORY_PIXELS.WALLS`, each cell a far wall (its cap over its face) with a patch of floor under it, drawn off the same
// bakes the game lays rooms with (`wallCap`, `wallFace`, `seedFloor`), named, and posted to the dev server as a PNG
// (`POST /shot`, tools/shots/factory-looks.png). Load it in the page on a served build and call `FACTORY_LOOKS.sheet()`.
const FACTORY_LOOKS = {
  async sheet(name = 'factory-looks') {
    const F = FACTORY_PIXELS, FL = F.FLOORS, WL = F.WALLS, T = 64, cols = 3, rows = 2, face = PIXEL_ROOMS.wall.faceH;
    const cellW = cols * T + 24, cellH = T + rows * T + 34, pad = 8;
    const c = document.createElement('canvas'); c.width = pad + WL.length * cellW + 90; c.height = pad + FL.length * cellH + 28;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    g.fillStyle = '#141216'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#efe6d0'; g.font = '700 14px sans-serif'; g.textAlign = 'left';
    g.fillText('THE FACTORY · floors down, walls across', pad, 18);
    for (let j = 0; j < WL.length; j++) {
      const def = Object.assign({}, FACTORY_LEVEL, { wlook: WL[j].name }), x0 = pad + 90 + j * cellW;
      g.fillStyle = '#f2aa30'; g.font = '700 12px sans-serif'; g.fillText(WL[j].name, x0, pad + 24);
      for (let i = 0; i < FL.length; i++) {
        const d2 = Object.assign({}, def, { flook: FL[i].name }), y0 = pad + 28 + i * cellH;
        if (j === 0) { g.fillStyle = '#f2aa30'; g.fillText(FL[i].name, pad, y0 + T + 40); }
        const cap = F.wallCap(d2), fc = F.wallFace(face, d2), key = 'sheet@' + FL[i].name;
        F.seedFloor(d2, key);
        const tiles = FLOOR_SHEET.sheets.get(key);
        for (let k = 0; k < cols; k++) {
          if (cap) g.drawImage(cap, (k % 3) * T, 0, T, T, x0 + k * T, y0, T, T);
          if (fc) g.drawImage(fc, k * T, 0, T, face, x0 + k * T, y0 + T - face, T, face);
        }
        for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) if (tiles) g.drawImage(tiles[((r + 1) % 6) * 6 + (k % 6)], x0 + k * T, y0 + T + r * T, T, T);
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x0, y0 + T, cols * T, 5);
      }
    }
    const r = await fetch('/shot?name=' + name, { method: 'POST', body: c.toDataURL('image/png') });
    return r.text();
  },
};
