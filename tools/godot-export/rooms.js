// ВЫГРУЗКА, session 5: room templates and THE SHOWROOM -> JSON for Godot.
// Evaluates js/rooms.js, js/factory.js (FACTORY_TEMPLATES, MECH_TEMPLATES, MECH_RING) and runs showroomLevel in node, then
// writes output/godot-export/data/rooms.json (every character grid as is, with tags, canon, flags, the legends) and
// showroom.json (the finished level: tiles, props, statues, machines, zones, zone defs, hints). Read-only on js/*.js.
// Run: node tools/godot-export/rooms.js
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const DATA = path.join(ROOT, 'output', 'godot-export', 'data');
fs.mkdirSync(DATA, { recursive: true });

const ctx = { console, Math, Set, Map, Uint8Array, Int16Array, Int32Array, Float32Array, JSON, Object, Array };
vm.createContext(ctx);
const load = (f) => vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', f + '.js'), 'utf8'), ctx, { filename: f });
// prop-pixels is node-requirable and factory-props reads it at load; showroomLevel needs FACTORY_PROPS and CAPES.
['tuning', 'rng', 'rooms', 'gen', 'factory', 'capes', 'prop-pixels', 'factory-props', 'showroom'].forEach(load);
const G = (e) => vm.runInContext(e, ctx);

// A plain-JSON copy: sets and typed arrays become arrays, functions are written as their source text under `<key>Src`.
function plain(v, depth = 0, seen = new Set()) {
  if (v === undefined || typeof v === 'function') return undefined;
  if (v === null || typeof v !== 'object') return typeof v === 'number' && !isFinite(v) ? null : v;
  if (depth > 12 || seen.has(v)) return null;
  if (v instanceof Set) return [...v].map((x) => plain(x, depth + 1, seen));
  if (ArrayBuffer.isView(v)) return Array.from(v);
  if (Array.isArray(v)) return v.map((x) => { const p = plain(x, depth + 1, seen); return p === undefined ? null : p; });
  seen.add(v);
  const o = {};
  for (const k of Object.keys(v)) {
    if (typeof v[k] === 'function') { o[k + 'Src'] = String(v[k]); continue; }
    const p = plain(v[k], depth + 1, seen);
    if (p !== undefined) o[k] = p;
  }
  seen.delete(v);
  return o;
}

// ---- legends: the comment blocks above the tables, verbatim
const src = (f) => fs.readFileSync(path.join(ROOT, 'js', f), 'utf8');
const roomsSrc = src('rooms.js'), facSrc = src('factory.js');
// the contiguous run of // lines that ends right before `marker` (or starts at `marker` when `from` is true)
const blockBefore = (text, marker) => {
  const lines = text.slice(0, text.indexOf(marker)).split('\n'); lines.pop();
  let k = lines.length; while (k > 0 && lines[k - 1].startsWith('//')) k--;
  return lines.slice(k).map((l) => l.replace(/^\/\/ ?/, '')).join('\n');
};
const legend = {
  rooms: blockBefore(roomsSrc, 'const HARD'),
  canon: blockBefore(roomsSrc, 'const ROOM_TEMPLATES'),
  factory: blockBefore(facSrc, 'const FACTORY_TEMPLATES'),
};
// the characters of the main legend, parsed from the header ('#' wall  '.' floor ...)
const chars = {};
for (const line of legend.rooms.split('\n')) {
  for (const piece of line.replace(/^Legend:\s*/, '').split(/\s{2,}(?='.' )/)) { const m = /^'(.)'\s+(.*)$/.exec(piece.trim()); if (m) chars[m[1]] = m[2].trim(); }
}

// ---- templates
const grab = (t, group, extra) => Object.assign({ group }, plain(t), extra || {}, { ground: G('groundOf')(t), width: t.rows[0].length, height: t.rows.length });
const templates = [];
G('ROOM_TEMPLATES').forEach((t, i) => templates.push(grab(t, 'room', { index: i })));
const specials = {};
for (const m of roomsSrc.matchAll(/^const ([A-Z_]+_TEMPLATE) = /gm)) { specials[m[1]] = templates.length; templates.push(grab(G(m[1]), 'special', { const: m[1] })); }
G('FACTORY_TEMPLATES').forEach((t) => templates.push(grab(t, 'factory')));
G('MECH_TEMPLATES').forEach((t) => templates.push(grab(t, 'mech')));
templates.push(grab(G('MECH_RING'), 'mech', { const: 'MECH_RING' }));

const arenaVariants = G('ARENA_VARIANTS').map((v) => { const p = plain(v); p.tpl = v.tpl.name; return p; });
const byGroup = {}; for (const t of templates) byGroup[t.group] = (byGroup[t.group] || 0) + 1;
const roomNames = templates.filter((t) => t.group === 'room').map((t) => t.name);
const rooms = {
  legend: { text: legend, chars },
  counts: { total: templates.length, byGroup, uniqueNames: new Set(templates.map((t) => t.name)).size, duplicateRoomNames: roomNames.length - new Set(roomNames).size },
  templates, specials, arenaVariants, roomLevels: plain(G('ROOM_LEVELS')),
};
fs.writeFileSync(path.join(DATA, 'rooms.json'), JSON.stringify(rooms));

// ---- the showroom
const level = G('(() => showroomLevel(Object.assign({}, SHOWROOM_LEVEL), 1))()');
const keep = ['name', 'canon', 'floor', 'floorAlt', 'wall', 'wallTop', 'fog', 'flook', 'wlook', 'factory', 'snow', 'cave', 'mech', 'artPass', 'palette', 'theme', 'mods'];
const zoneLooks = level.zoneDefs.map((d) => { const o = {}; for (const k of keep) if (d[k] !== undefined) o[k] = plain(d[k]); return o; });
const W = level.W, H = level.H;
const rowsOf = (arr) => { const o = []; for (let y = 0; y < H; y++) o.push(Array.from(arr.subarray(y * W, (y + 1) * W))); return o; };
const out = {
  note: 'showroomLevel(def, 1) run in node. tiles/zones are H rows of W ints; T is the tile enum. spawns is empty by design: the showroom stands statues (figures) and machines, never rolled men.',
  W, H, T: plain(G('T')), TILE: G('TILE'),
  tiles: rowsOf(level.tiles), zones: rowsOf(level.zones),
  start: level.start, exit: level.exit, exitTile: level.exitTile,
  rooms: plain(level.rooms), props: plain(level.props), spawns: plain(level.spawns), statues: plain(level.statues),
  machines: plain(level.machines), oil: plain(level.oil), webs: plain(level.webs), carpets: plain(level.carpets), hints: plain(level.hints),
  controls: plain(level.controls), chasms: plain(level.chasms), gaps: plain(level.gaps), windows: plain(level.windows), grass: plain(level.grass),
  sacrifice: plain(level.sacrifice), zoneLooks, zoneDefs: plain(level.zoneDefs), def: plain(level.def),
};
out.counts = { props: out.props.length, statues: out.statues.length, spawns: out.spawns.length, machines: out.machines.length, rooms: out.rooms.length,
  zones: zoneLooks.length, hints: out.hints.length, carpets: out.carpets.length, oil: out.oil.length, webs: out.webs.length, grass: out.grass.length,
  windows: out.windows.length, gaps: out.gaps.length, chasms: out.chasms.length, propKinds: {} };
for (const p of out.props) out.counts.propKinds[p.kind] = (out.counts.propKinds[p.kind] || 0) + 1;
fs.writeFileSync(path.join(DATA, 'showroom.json'), JSON.stringify(out));
console.log('rooms.json', JSON.stringify(rooms.counts));
console.log('showroom.json', W + 'x' + H, JSON.stringify(Object.assign({}, out.counts, { propKinds: Object.keys(out.counts.propKinds).length + ' kinds' })));
