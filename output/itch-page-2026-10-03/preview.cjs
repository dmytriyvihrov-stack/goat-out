// node preview.cjs → preview.png: the headings, the rule and the tile stacked, to look at.
const fs = require('fs'), { Img, decode } = require('../pixel-claude-2026-09-24/png.cjs');
const files = ['hook.png', 'discord.png', 'h-thanks.png', 'h-story.png', 'h-features.png', 'h-allies.png', 'h-playtest.png', 'h-discord.png', 'h-inspired.png', 'divider.png'];
const imgs = files.map((f) => decode(fs.readFileSync(__dirname + '/' + f))), bg = decode(fs.readFileSync(__dirname + '/bg-motifs.png'));
const W = 1100, H = imgs.reduce((a, i) => a + i.h + 16, 16);
const out = new Img(W, Math.max(H, bg.h + 32), '#120d10');
out.blit(bg, 0, 0, bg.w, bg.h, 620, 16, bg.w, bg.h);
let y = 16; for (const i of imgs) { out.blit(i, 0, 0, i.w, i.h, 10, y, i.w, i.h); y += i.h + 16; }
fs.writeFileSync(__dirname + '/preview.png', out.png());
