// THE FACTORY's art (12 Oct 2026, output/factory-art-2026-10-12): the native PNGs the art session cut, packed into one small
// atlas as a data URI in `js/factory-assets.js`. The saw robot (front and back), the tracked welder (idle, firing with the
// baked flame cut off at the nozzle, and the old torch pair for the up and down views), the automaton's body cut off the
// chosen variant A (`automaton-options/native/d-corner-cage.png`: the frame, the meat and the four hip joints; the legs are
// drawn by js/factory-pixels.js so they can step, swing out and fold), and two floors. Run from the project root:
//   node tools/pack-factory.js
// Never edit js/factory-assets.js by hand.
const fs = require('fs'), path = require('path');
const { decode, encode } = require('./png-harden.js');
const root = path.join(__dirname, '..'), art = path.join(root, 'output', 'factory-art-2026-10-12');
const native = (f) => path.join(art, 'native', f + '.png');

const read = (file) => decode(fs.readFileSync(file));
// a rectangle out of a decoded PNG, with an optional per-pixel keep test
const cut = (img, x0, y0, w, h, keep) => {
  const px = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx = x0 + x, sy = y0 + y, o = (sy * img.W + sx) * 4, d = (y * w + x) * 4;
    if (sx < 0 || sy < 0 || sx >= img.W || sy >= img.H) continue;
    if (keep && !keep(sx, sy)) continue;
    px[d] = img.px[o]; px[d + 1] = img.px[o + 1]; px[d + 2] = img.px[o + 2]; px[d + 3] = img.px[o + 3] >= 128 ? 255 : 0;
  }
  return { W: w, H: h, px };
};
const whole = (name) => { const i = read(native(name)); return cut(i, 0, 0, i.W, i.H); };

const items = {};
items['saw-front'] = whole('robot-saw-front');
items['saw-back'] = whole('robot-saw-back');
items['welder-idle'] = whole('welder-idle');
// the firing pose with the painted flame taken off past the nozzle (the real fire is laid on the floor by the game)
{ const i = read(native('welder-fire')); items['welder-fire'] = cut(i, 0, 0, 33, i.H); }
items['torch-front'] = whole('tracked-torch-front');
items['torch-back'] = whole('tracked-torch-back');
// The automaton's body: the box, the meat and the four hips, measured on the 160-frame (see the ASCII map in the
// session of 12 Oct 2026): the thighs below the two back hips are cut away (x < 50 under row 59, x > 116 under row 58),
// and nothing under row 67.
{
  const i = read(path.join(art, 'automaton-options', 'native', 'd-corner-cage.png'));
  items['automaton-body'] = cut(i, 36, 13, 94, 55, (x, y) => !(y > 59 && x < 50) && !(y > 58 && x > 116));
}
items['floor-plates'] = whole('floor-plates');
items['floor-grate'] = whole('floor-grate');
// THE FACTORY's traps (13 Oct 2026, js/machines.js). A press cut into its parts off the open frame, the left half only
// (the right is drawn mirrored): the mount on the wall, one column of the rod (stretched to any length), the jaw with its
// face on its right edge. Measured on the ASCII maps of that day: small (48 tall) mount 0-14, rod at col 22, jaw 32-56;
// wide (144 tall) mount 0-13, both rods at col 20, jaw 28-53.
{ const s = read(native('press-small-open')); items['press-s-mount'] = cut(s, 0, 0, 15, s.H); items['press-s-rod'] = cut(s, 22, 0, 1, s.H); items['press-s-jaw'] = cut(s, 32, 0, 25, s.H); }
{ const w = read(native('press-wide-open')); items['press-w-mount'] = cut(w, 0, 0, 14, w.H); items['press-w-rod'] = cut(w, 20, 0, 1, w.H); items['press-w-jaw'] = cut(w, 28, 0, 26, w.H); }
// the belt whole, one frame each way: js/machines.js scrolls its middle at the belt's own speed and keeps its two ends
items['belt-h'] = whole('belt-right-0');
items['belt-v'] = whole('belt-down-0');
for (const k of ['off', 'warning', 'ignite', 'fire']) items['burner-' + k] = whole('burner-' + k);
// 13 Oct 2026 playtest ("the walls in the factory's own look, and something else instead of the columns"): the iron wall
// whole (js/painted-art.js cuts its riveted band into the cap and the brick-and-pipe rows into the face), and the
// boiler and the cabinet, which stand where a stone pillar would (and the cabinet is the bomb machine, js/machines.js).
items['wall-iron'] = whole('wall-iron-straight');
items['cabinet'] = whole('cabinet-intact');
// 14 Oct 2026 (his ask: "four more kinds of wall and floor to choose from"): the pack's other two floors and its brick
// wall (the grate was packed, unused), and the belt's corner. The pack's lathe, boiler and cabinet states and the grabber
// were packed that morning and taken out again the same day ("the objects are over-detailed, more in our pixel style"):
// the furniture is hand-drawn in js/factory-props.js now; the cabinet stays for THE BOMB MACHINE.
items['floor-concrete'] = whole('floor-concrete');
items['floor-brick'] = whole('floor-brick');
items['wall-brick'] = whole('wall-brick-straight');
items['belt-corner'] = whole('belt-corner');

// shelf packing, two texels of gap, 512 wide at most
const GAP = 2, MAXW = 512;
let x = GAP, y = GAP, rowH = 0, W = 0; const at = {};
for (const [name, it] of Object.entries(items)) {
  if (x + it.W + GAP > MAXW) { x = GAP; y += rowH + GAP; rowH = 0; }
  at[name] = [x, y, it.W, it.H]; x += it.W + GAP; rowH = Math.max(rowH, it.H); W = Math.max(W, x);
}
const H = y + rowH + GAP;
const px = Buffer.alloc(W * H * 4);
for (const [name, it] of Object.entries(items)) {
  const [ax, ay] = at[name];
  for (let j = 0; j < it.H; j++) for (let i = 0; i < it.W; i++) {
    const s = (j * it.W + i) * 4, d = ((ay + j) * W + ax + i) * 4;
    px[d] = it.px[s]; px[d + 1] = it.px[s + 1]; px[d + 2] = it.px[s + 2]; px[d + 3] = it.px[s + 3];
  }
}
const png = encode(W, H, px);
const out = '// Generated by tools/pack-factory.js from output/factory-art-2026-10-12. Do not edit by hand.\n'
  + '// Each item is [x, y, w, h] in atlas texels; a unit stands on the bottom row of its box.\n'
  + 'const FACTORY_ASSETS = ' + JSON.stringify({ items: at, src: 'data:image/png;base64,' + png.toString('base64') }) + ';\n';
fs.writeFileSync(path.join(root, 'js', 'factory-assets.js'), out);
console.log('js/factory-assets.js', W + 'x' + H, Object.keys(items).length + ' items', (out.length / 1024).toFixed(1) + ' KB');
for (const [name, r] of Object.entries(at)) console.log(' ', name, r.join(','));
