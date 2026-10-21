'use strict';
// ВЫГРУЗКА for session 33 (the HUD): the skill rail's pixel icons (js/skill-icons.js) as data for Godot.
// Writes output/godot-export/data/skill_icons.json: the edge colour, the palette, the ramps and every layer's
// rows exactly as drawn (half layers NOT mirrored here: Godot mirrors them, as SKILL_ICONS.cells does). Which
// layers a verb stacks under which souls is code (SKILL_ICONS.layers) and is ported by hand to res://ui/hud/.
// Run: node tools/godot-export/skill-icons.js
const fs = require('fs'), path = require('path'), vm = require('vm');

const root = path.join(__dirname, '..', '..');
const ctx = { console, module: { exports: {} } };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'js', 'skill-icons.js'), 'utf8') +
  '\n;this.__out = { edge: SKILL_EDGE, pal: SKILL_PAL, ramps: SKILL_RAMPS, art: SKILL_ART, n: SKILL_ICONS.N };', ctx);
const out = ctx.__out;
const dir = path.join(root, 'output', 'godot-export', 'data');
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, 'skill_icons.json');
fs.writeFileSync(file, JSON.stringify(out, null, 1) + '\n');
console.log('wrote', path.relative(root, file), Object.keys(out.art).length, 'layers');
