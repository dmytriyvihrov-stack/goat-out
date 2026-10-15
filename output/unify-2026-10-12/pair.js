// ONE STYLE's before / after (12 Oct 2026, `UNIP.flag` is ink or grain): loaded in the page after tools/harness.js, on THE SHOWROOM or any floor.
// `await LITP.pair(name, x, y, w, h, gx, gy, k)`: the goat stood at (gx, gy), the camera held still, the world box
// centred on (x, y), w x h world px, cut out of the frame with `ART_PASS.lit` off and then on, side by side at k:1,
// written to tools/shots/<name>.png by the dev server.
window.UNIP = {
  flag: "ink",
  wait: (ms) => new Promise((r) => setTimeout(r, ms)),
  grab() { const c = document.createElement('canvas'); c.width = game.canvas.width; c.height = game.canvas.height; c.getContext('2d').drawImage(game.canvas, 0, 0); return c; },
  box(x, y, w, h) { const cam = game.cam, z = cam.zoom, R = game.renderer; return [R.vcx + z * (x - w / 2 - Math.round(cam.x)), R.vcy + z * TILT * (y - h / 2 - Math.round(cam.y)), z * w, z * TILT * h]; },
  async pair(name, x, y, w, h, gx, gy, k = 2, label = '') {
    const upd = Game.prototype.updateCamera;
    // the room's fog and the rooms' bake settle a second or two after a jump into a new room
    H.tp(gx ?? x, gy ?? (y + 110)); game.goat.facing = -Math.PI / 2; await this.wait(2600);
    game.updateCamera = () => {};
    try {
      const b = this.box(x, y, w, h).map(Math.round);
      const was = ART_PASS[this.flag];
      ART_PASS[this.flag] = false; if (this.flag === "grain") WARDEN_PIXELS.applyGrain(); await this.wait(500); const A = this.grab();
      ART_PASS[this.flag] = true; if (this.flag === "grain") WARDEN_PIXELS.applyGrain(); await this.wait(500); const B = this.grab();
      ART_PASS[this.flag] = was; if (this.flag === "grain") WARDEN_PIXELS.applyGrain();
      const [sx, sy, cw, ch] = b, pad = 12, top = 34, out = document.createElement('canvas');
      out.width = cw * k * 2 + pad * 3; out.height = ch * k + top + pad;
      const o = out.getContext('2d'); o.imageSmoothingEnabled = false;
      o.fillStyle = '#1b1416'; o.fillRect(0, 0, out.width, out.height);
      o.drawImage(A, sx, sy, cw, ch, pad, top, cw * k, ch * k); o.drawImage(B, sx, sy, cw, ch, pad * 2 + cw * k, top, cw * k, ch * k);
      o.font = '700 16px sans-serif'; o.fillStyle = '#e8dcc0'; o.fillText('BEFORE' + (label ? ' · ' + label : ''), pad, 22);
      o.fillStyle = '#ffe08a'; o.fillText('AFTER · ONE STYLE', pad * 2 + cw * k, 22);
      return (await fetch('/shot?name=' + name, { method: 'POST', body: out.toDataURL('image/png') })).text();
    } finally { delete game.updateCamera; }
  },
};
