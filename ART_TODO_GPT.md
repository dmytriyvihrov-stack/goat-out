# GOAT OUT — что ещё в старом стиле: бриф на перерисовку в пиксель

Для генерации в GPT (image_gen). Состояние на 23.09.2026, билд 1.53.

Персонажи, полы, стены и основная мебель (ящик, бочка, сено, стол, колонна, жаровня, валуны, грибы, кристаллы) уже в
Pixel 2.5. Ниже всё, что ещё нарисовано старыми «живописными» спрайтами или вообще примитивами кодом, и потому выпадает
из стиля. Отсортировано по тому, **что игрок видит в первые 30 минут**, потому что это увидят плейтестеры.

Промпты на английском в том же формате, что и в прошлых проходах (`output/pixel-environment-2026-09-23/prompts.json`,
`output/pixel-mid-2026-09-23/prompts.json`), чтобы стиль совпал.

---

## Общее для всех листов

**Референсы, прикладывать к каждому запросу:**
- `output/pixel-mid-2026-09-23/source/goat-idle-r3.png`: плотность пикселя, палитра, ракурс.
- `output/pixel-environment-2026-09-23/source/room-props.png`: ящик, бочка, стол, жаровня. Новые предметы должны
  стоять рядом с ними как один набор.

**Стиль (уже вшит в каждый промпт ниже):**
- Top-down с лёгким наклоном: верх предмета хорошо виден, передняя грань узкая. Оси по горизонтали и вертикали
  экрана, **не изометрия ромбом**.
- Крупные квадратные пиксели: рисовать примерно в размере «в игре» (колонка ниже) в логических пикселях, потом
  увеличить nearest-neighbor. Без мягких градиентов, без живописи, 4–6 приглушённых цветов на предмет.
- Палитра как у уже сделанных: тёплое дерево, бежевый известняк, тусклое серое железо, пыльная охра. Акцент
  только там, где он работает на смысл (фиолетовая душа, зелёная трава лечения, огонь).
- Настоящий прозрачный фон (не нарисованная шахматка), широкие прозрачные промежутки между ячейками, точная сетка.
- Без запечённых теней: тень рисует игра. Без текста, подписей, рамок, UI.

**Как отдать (чтобы я мог подключить без ручной работы):** как в прошлые разы, папка
`output/pixel-leftovers-<дата>/` с `source/*.png`, `manifest.json` с измеренными rect каждой ячейки,
`prompts.json` и коротким `HANDOFF_CLAUDE.md`. Режу по rect из манифеста, не по ровной сетке.

---

## Приоритет 1: видно на первом уровне

### Лист A. Двери (4 × 2)

Двери стоят на каждом уровне между комнатами, это самое заметное старое в игре. В игре дверь — тонкая плита поперёк
проёма в два тайла: **58 × 13 px**. Рисуется сверху, вертикально; горизонтальную игра получает поворотом.
Разбитая дверь остаётся на полу пятном щепок/обломков, **64 × 64 px**.

| # | Что | Смысл в игре |
|---|---|---|
| 1 | Деревянная дверь | Ломается с одного удара. Простые доски, одна поперечина. |
| 2 | Железная дверь | 3 удара. Доски, окованные железными полосами и заклёпками. |
| 3 | Дверь сейфа | 4 удара, за ней душа. Тяжёлая, тёмная, с фиолетовым знаком души по центру. |
| 4 | Врата души | Без здоровья, открываются только душой. Не дерево: решётка или камень с фиолетовым свечением. |
| 5–8 | То же, разбитое | Обломки на полу, узнаваемые по материалу (щепки / гнутое железо / тёмные плиты / потухшие фиолетовые осколки). |

```
Use reference images ONLY for chunky pixel-art density, palette and camera; do not draw the goat or any character. Asset: GOAT OUT DOOR sprite sheet, EXACT 4 columns 2 rows, 8 isolated sprites, one per cell, wide fully transparent gutters. Camera: straight top-down onto a door lying in a doorway, seen from above: each door is a LONG THIN VERTICAL SLAB about 1:4.5 (width:height), like a plank barrier across a corridor seen from the ceiling. Authored at roughly 13x58 logical pixels, then nearest-neighbor enlarged: clearly chunky square pixels, hard edges, no smooth shading, 4-6 muted colors each. Row 1, closed doors, left to right: (1) plain wooden plank door, 3 vertical planks and one cross brace, warm worn wood; (2) iron-bound door, same planks with dark iron bands and rivets, heavier; (3) vault door, thick dark oak and iron with a small glowing VIOLET soul sigil in the center, the most solid of the four; (4) soul gate, not wood: a slab of dark stone or close iron bars with faint VIOLET glow seeping through the seams. Row 2, the SAME four doors BROKEN, lying flat on the floor as debris in a roughly square footprint: (5) scattered wooden splinters and two broken plank halves; (6) bent iron bands with splintered planks; (7) heavy dark shattered slabs with the dimmed sigil cracked in two; (8) fallen stone shards or bars with a few faint dying violet sparks. Muted rustic palette matching the reference crates: warm wood, tarnished grey iron, dark slate; violet only on 3,4,7,8. No text, no labels, no UI, no frames, no floor under the objects, no baked cast shadows. Genuine transparent alpha background, no fake checkerboard.
```

### Лист B. Оружие и бомба (4 × 1)

Урок в комнате-засаде (4-я комната первого уровня): мечи на стойке, их хватают и бросают. Меч и щит одного
размера везде: на стойке, на полу и во рту у козла.

| # | Что | В игре |
|---|---|---|
| 1 | Меч | ~24 px в длину. Простой крестьянский клинок, читается как меч с одного взгляда. |
| 2 | Щит | ~22–26 px. Круглый деревянный щит с железным умбоном. |
| 3 | Стойка для оружия, пустая | ~44 px в ширину. Деревянная стойка; меч и щит кладутся на неё кодом. |
| 4 | Бомба | ~22 px. Тёмный чугунный шар с коротким фитилём. Искру рисует игра. |

```
Use reference images ONLY for chunky pixel-art density, palette and camera; do not draw any character. Asset: GOAT OUT WEAPONS sprite sheet, EXACT 4 columns 1 row, 4 isolated sprites, one per cell, wide transparent gutters. Top-down camera with slight tilt, tops visible, axes horizontal/vertical, NOT isometric. Authored at roughly 24-44 logical pixels then nearest-neighbor enlarged, chunky square pixels, 4-6 muted colors each, no smooth shading. Left to right: (1) a simple peasant SWORD lying flat, blade pointing RIGHT, horizontal, grey steel blade, dark leather grip, small crossguard, readable as a sword at tiny size; (2) a round wooden SHIELD seen from above, planks with an iron rim and a central iron boss, slightly worn; (3) an EMPTY wooden WEAPON RACK / stand of arms, a low rustic frame with two uprights and pegs, top visible, nothing on it; (4) a small round black iron BOMB with a short unlit rope fuse sticking up, one dull highlight. Palette matching the reference crates and table: warm wood, tarnished steel, dark iron. No text, no labels, no UI, no floor, no baked cast shadows. Genuine transparent alpha background.
```

### Лист C. Колесо, клетка, алтарь (4 × 2)

Всё, что стоит в первой комнате (ритуал, загон) и в уроке с колесом.

| # | Что | В игре |
|---|---|---|
| 1 | Ступица колеса | ~57 px. Толстая деревянная ось с железом, сверху. Крутится кодом. |
| 2 | Лопасть колеса | Длинная балка, растягивается кодом до ~66 px. Горизонтальная, ось слева. |
| 3 | Столб клетки | 7 × 30 px, вертикальный. Из таких собирается загон. |
| 4 | Сломанный столб | 22 × 7 px, лежит на полу. |
| 5–6 | Ритуальный алтарь | **108 px** в ширину, самый большой предмет первой комнаты. Каменный стол с резьбой, свечи, тёмные пятна. Рисовать на две ячейки. |
| 7 | Знамя культа на стене | 13 × 17 px, висит на кирпичной стене. Тёмная ткань с простым символом культа. |
| 8 | Гонг на раме | ~38 px. В него бьют — даёт бафф. Рама из дерева, бронзовый диск. |

```
Use reference images ONLY for chunky pixel-art density, palette and camera; do not draw any character. Asset: GOAT OUT RITUAL AND MACHINE sprite sheet, EXACT 4 columns 2 rows, isolated sprites, wide transparent gutters. Top-down camera with slight tilt, tops visible, shallow front faces, axes horizontal/vertical, NOT isometric. Chunky square pixels, nearest-neighbor enlarged, 4-6 muted colors each, no smooth shading. Row 1: (1) MILL HUB seen from above, a thick round wooden axle block with iron straps and a central iron pin, roughly circular, authored ~48 logical px; (2) MILL ARM, one long straight heavy wooden beam with iron bands, HORIZONTAL, spanning the full cell width, the inner end on the LEFT flat and plain, the outer end on the right slightly worn, authored ~64x12 logical px; (3) one single vertical wooden CAGE POST, thin tall rough pole with a rope lashing near the top, authored ~7x30 logical px, standing; (4) the SAME cage post BROKEN and lying flat on the floor, splintered in two, horizontal, ~22x7 logical px. Row 2: (5+6) one wide RITUAL ALTAR spanning TWO cells, a low long slab of pale carved limestone on two stone legs, top clearly visible, a few melted candles and dark old stains on top, grim folk-cult mood but not gory, authored ~100 logical px wide; (7) a small CULT BANNER hanging flat against a wall, dark red-brown cloth with a simple pale horned-circle symbol, ragged bottom edge, ~13x17 logical px; (8) a GONG: a round dull-bronze disc hanging in a simple wooden frame, top of the frame visible, ~38 logical px wide. Muted palette: warm wood, pale limestone, dark iron, dull bronze, dark red cloth. No text, no labels, no UI, no floor, no baked cast shadows. Genuine transparent alpha background.
```

### Лист D. Фонарь, 8 кадров огня (8 × 1)

Фонарь на столбе, ~34 px в высоту. Весь предмет анимирован петлёй из 8 кадров (10 кадров в секунду): от кадра к
кадру меняется только пламя, столб стоит неподвижно.

```
Use reference images ONLY for chunky pixel-art density, palette and camera. Asset: GOAT OUT LANTERN animation strip, EXACT 8 columns 1 row, 8 frames of ONE looping animation. Subject: a small iron LANTERN on a short wooden post, standing, top-down with slight tilt, ~20x34 logical pixels, nearest-neighbor enlarged, chunky square pixels, 4-6 muted colors plus flame colors. The post and lantern body are IDENTICAL and in the SAME position in every frame; ONLY the small amber flame inside changes, flickering in a seamless loop (frame 8 flows back into frame 1). Warm dull amber and yellow flame, no bloom, no glow halo, no light cast on the ground. No text, no UI, no floor, no baked shadow. Genuine transparent alpha background.
```

### Лист E. Душа и лечение (4 × 1)

| # | Что | В игре |
|---|---|---|
| 1 | Душа (тело) | ~26 px. Фиолетовый огонёк-сгусток. Ореол и искры вокруг рисует игра, их не надо. |
| 2 | Большая трава лечения | ~44 px. Редкая, +2 сердца. Густой пучок сочной зелёной травы. |
| 3 | Обычная трава лечения | ~24 px. Частая, +1 сердце. Тот же пучок, меньше и скромнее. Сейчас рисуется кодом. |
| 4 | Ведро молока | Высотой с козла, ~40 px. Деревянное ведро с двумя обручами, до краёв молока. Сейчас рисуется кодом. |

```
Use reference images ONLY for chunky pixel-art density, palette and camera. Asset: GOAT OUT PICKUPS sprite sheet, EXACT 4 columns 1 row, 4 isolated sprites, wide transparent gutters. Top-down with slight tilt, chunky square pixels, nearest-neighbor enlarged, 4-6 colors each, no smooth shading. Left to right: (1) a SOUL WISP body, a small teardrop flame-like wisp of VIOLET and pale lilac light, a hint of a tiny face-less core, no halo and no sparks around it, ~24 logical px; (2) a BIG HEALING GRASS patch, a lush dense tuft of fresh bright green grass blades with a few lighter tips, clearly more alive than the muted floor, ~40 logical px wide; (3) a SMALL HEALING GRASS sprout, the same grass but a modest small tuft, ~22 logical px; (4) a tall wooden MILK PAIL, staves narrower at the bottom, two grey iron hoops, filled to the brim with white milk visible on top, ~24x40 logical px. Green and violet are the only saturated colors; everything else matches the muted rustic reference. No text, no UI, no floor, no baked shadows. Genuine transparent alpha background.
```

---

## Приоритет 2: второй уровень и дальше

### Лист F. Ловушки и пещера (4 × 2)

| # | Что | В игре |
|---|---|---|
| 1–3 | Решётка-ловушка: покой / взводится / шипы вверх | Целый тайл на полу, 32 × 28 px. С третьего уровня. Покой — плоская железная решётка; «взводится» — те же прорези, из которых едва видны кончики; «вверх» — торчат шипы. |
| 4 | Каменный зуб у стены пещеры | ~24 px. Острый каменный шип, растёт из пола у стены, у основания старая кровь. Сейчас кодом. |
| 5 | Жаровня с вертелом | ~36 px. Та же жаровня, что уже в пиксель-арте, плюс вертел с тушкой над углями. Одна на уровень. Сейчас кодом. |
| 6 | Курятник | 2 тайла, ~52 × 32 px. Решётчатый ящик из реек с тёмным нутром; зверя внутри рисует игра. Сейчас кодом. |
| 7 | Нора мыши | Дыра у основания кирпичной стены, ~2 тайла. Тёмная арка, немного соломы. Сейчас кодом. |
| 8 | Табурет для товара | ~20 px. Маленький деревянный табурет, на нём лежит талисман на продажу. Сейчас кодом. |

```
Use reference images ONLY for chunky pixel-art density, palette and camera; no characters, no animals. Asset: GOAT OUT TRAPS AND SHOP sprite sheet, EXACT 4 columns 2 rows, 8 isolated sprites, wide transparent gutters. Top-down with slight tilt, tops visible, axes horizontal/vertical, NOT isometric, chunky square pixels, nearest-neighbor enlarged, 4-6 muted colors each. Row 1: (1) a FLOOR SPIKE GRATING, one flat square iron grate plate set into the floor with a grid of dark slots, completely flat, ~32x28 logical px; (2) the SAME grate ARMING, identical plate with tiny steel tips just visible in the slots; (3) the SAME grate with SHARP STEEL SPIKES fully UP out of every slot, clearly dangerous; (4) a CAVE STONE SPIKE, a single cluster of sharp grey rock teeth jutting up from the floor, a small old dark-red stain at its foot, ~24 logical px. Row 2: (5) a round iron BRAZIER with glowing coals and a simple wooden SPIT across it holding a small roasting carcass, matching the reference brazier, ~36 logical px; (6) a wide low slatted wooden COOP crate, gaps between the slats showing a DARK EMPTY interior, a small latch, ~52x32 logical px; (7) a MOUSE BURROW: a small dark arched hole at the base of a brick wall, a few straw bits at its mouth, only the hole and a little wall around it, ~48x28 logical px; (8) a tiny low wooden three-legged STOOL, empty, top visible, ~20 logical px. Muted rustic palette like the reference; steel grey on the spikes, one small dark-red stain on (4), warm ember orange only on the coals. No text, no labels, no UI, no floor under the objects, no baked shadows. Genuine transparent alpha background.
```

---

## Не для GPT (делаю я, кодом)

- **Знаки культа на полу и стене** уже сгенерированы (`output/pixel-ominous-decals-2026-09-23`), их осталось только
  подключить.
- **Лестница** на выходе и входе сейчас рисуется градиентом по тайлу. Когда поставлю новые двери, посмотрю, выпадает
  ли она из стиля; если да, закажу отдельно.
- **Огонь, кровь и эффекты** — отдельный пак (`js/combat-assets.js`), уже в игре.

## Порядок, если делать не всё сразу

A (двери) → B (оружие) → C (колесо, клетка, алтарь) → E (душа, трава) → D (фонарь) → F. Первые четыре покрывают почти
всё, что плейтестер видит за первые 30 минут.
