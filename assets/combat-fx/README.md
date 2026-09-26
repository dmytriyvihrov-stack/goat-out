# Combat effects — 16 September 2026

**Retired 23 Sep 2026 (1.56).** Nothing loads this sheet any more: `js/combat-fx.js` bakes its fire,
blasts, smoke and blood as pixel frames at start, and `js/combat-assets.js` was deleted. The sheet and its packer
(`tools/pack-combat-art.cjs`) were deleted on 25 Sep 2026 and live in git history (1.73 and before).

`effects.png` was generated with the built-in imagegen tool, then copied into this
project without removing its alpha. Actual dimensions: 1774 × 887. Eight columns,
four rows; source rectangles use fractional dimensions to avoid accumulating crop drift.

Rows: ordinary flame loop, witchfire loop, explosion one-shot, blood burst one-shot.
`js/combat-fx.js` consumes these frames. `js/combat-assets.js` embeds the PNG so both
HTML entry points work with the existing artifact packaging. Regenerate the declaration
with `node tools/pack-combat-art.cjs` after replacing the PNG.

Walls reuse the approved textures in `PaintedArt.wallTile`, with exposed-face bits
N=1, E=2, S=4, W=8. A room's upper wall exposes S; its lower wall exposes N;
its left wall exposes E; its right wall exposes W. The cap stays on the solid side.
Body fragments reuse the actual victim's existing painted sprite. Debris physics,
blood droplets and ground marks are cosmetic and do not change collision or damage.

## Final generation prompt

Create a production game VFX sprite sheet as a single 2048x1024 PNG with true transparent background. Strict exact grid of 8 equal columns and 4 equal rows, 256x256 pixels per cell, NO TEXT, NO labels, NO grid lines, NO scenery. Every sprite is entirely inside its cell with at least 20 pixels transparent padding. Painterly dark fantasy indie game style, illustrated hand painted gouache texture, crisp outlined silhouettes and warm muted shading, matches a cute grim medieval cult dungeon top-down game with tiny hand-painted sprites. Row 1: eight sequential animation frames of an ordinary orange/gold flame loop, no brazier no wood no fuel, anchored at bottom center of each cell at y=225 within cell, lively tongues of red orange flame, warm yellow ivory inner core, small sparks, soft subtle glow. Row 2: eight sequential animation frames of a magical violet flame loop with icy pale cyan-white core, same exact bottom center anchor and scale, curling wisps and arcane sparks. Row 3: eight sequential frames of one explosion: first compact bright flash, expanding orange fireball, billowing fire, smoky fireball, dark brown smoke dispersing into sparks at the end. Explosion is centered in each cell, grows from small to large then fades, every frame fully contained. Row 4: eight sequential frames of stylized fictional game blood splash burst, dark carmine crimson liquid with small droplets, nonrealistic illustrated ink splash, first compact then expanding outward and disappearing; center fixed in each cell. Transparent gutters, clean alpha edges, consistency frame to frame essential. All 32 cells present, 8 columns exactly, 4 rows exactly. This is game art assets, not a presentation. No characters, no props, no panels, no checkerboard pattern drawn.
