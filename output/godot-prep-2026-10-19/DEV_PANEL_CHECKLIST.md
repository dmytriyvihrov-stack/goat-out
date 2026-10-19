# Дев-панель перед переездом на Godot 4. Чеклист

19 октября 2026. Сборка 0.036. Что посмотреть и что поменять в дев-панели (и вокруг неё), чтобы порт
прошёл гладко и логика игры переехала целиком, а не частями.

Принцип: логика живёт в `TUNING` (js/tuning.js), в генераторе (js/gen.js, js/rooms.js) и в правилах
(`GEN_RULES`, js/rules.js). Панель это только окно в неё. Значит, перед портом надо (1) убрать из
панели всё, что держит «две правды» (переключатель между старым и новым), (2) отделить то, что
пишет обратно в код, от того, что просто показывает состояние, и (3) записать, во что каждая кнопка
превращается в Godot. Ниже каждый пункт так и устроен: что это, где в коде, что сделать до переезда,
что с ним в Godot.

Обозначения: **РЕШИТЬ** = твой выбор нужен до порта. **ЗАПЕЧЬ** = выбрать одну сторону переключателя
и удалить вторую. **ПЕРЕНОСИМ** = портируется как есть. **В ИНСПЕКТОР** = становится полем Resource
в редакторе Godot. **HEADLESS** = уходит в `godot --headless --script`. **ВЫБРОСИТЬ** = умирает вместе
с браузером.

---

## A. Переключатели с двумя правдами (решить и запечь ДО порта)

Самая важная группа. Каждый такой переключатель это два пути в коде, и в Godot ты перенесёшь либо
один, либо оба. Оба это двойная работа и двойная поддержка.

1. **ART_PASS, вкладка ART** (js/pixel-art.js `ART_PASS`, js/render.js `drawArtTab`, id `art-*`).
   Четырнадцать переключателей, каждый держит «как упаковано» рядом с «как в пассе». Текущие
   значения и статус:
   - `on: false` (цвета уровней из `artPass` вместо своих). **РЕШИТЬ**: по умолчанию выключено, значит
     живут «свои» цвета. Если это и есть выбор, удалить `artPass` с уровней и `ART_PASS.set`.
   - `hunter: 7`, `clubman: 1` (студии `PIXEL_STUDY`: охотник в BROWN + BAND, клубмен SLIM). Выбор сделан.
     **ЗАПЕЧЬ**: выгрузить студию как лист, остальные студии удалить.
   - `floors: true` (пол как бесшовный лист `FLOOR_SHEET` против штампа по тайлам). Выбор сделан, лист.
     **ЗАПЕЧЬ**: удалить ветку штампа.
   - `shield: 0` (три дизайна щита). **РЕШИТЬ**, оставить один.
   - `shaman: 1` (три робы, выбрана SOOT). **ЗАПЕЧЬ**.
   - `ffloor: 0`, `fwall: 0` (пол и стена фабрики, шесть на шесть). В коде прямо написано «выбор не
     сделан, PLATES и IRON». **РЕШИТЬ**. Остальные комбинации удалить или оставить как зоны конкретных
     комнат (`flook` / `wlook` на шаблоне), это другой вопрос: тогда это не переключатель, а данные.
   - `shadows`, `tells`, `hay`, `cave` (все `true`, второй пасс 2 октября). Три недели никто не выключал.
     **ЗАПЕЧЬ** на `true`.
   - `lit: true` (THE LIT PASS, `name@lit` спрайты). **ЗАПЕЧЬ**: оставить только `@lit` версии,
     удалить старые, убрать `pick` по `@pass`.
   - `ink: true`, `grain: true` (ONE STYLE). **ЗАПЕЧЬ**.
   - `smallProps: false` (бомба, хаски, рыба в родном разрешении). **РЕШИТЬ**, скорее удалить.
   - В Godot: ничего из этого. Арт выгружается один раз (см. раздел H).

2. **HORNS (SHORT / BIG / LONG), HORN INFO, HORN TOOL** (первая страница, id `horns`, `hornInfo`,
   `hornTool`; `TUNING.goat.horns`, `HORN_TOOL` в js/game.js, `Renderer.drawHornTool`, ключи
   `HORN_KEY`, `HORN_INFO_KEY`). Рога уже решены как механика: BIG и LONG даёт бог за тридцать душ.
   - **ПЕРЕНОСИМ** сам переключатель рогов как дебаг-состояние (`game.hornKind`).
   - HORN TOOL (слайдеры над игрой, SAVE пишет в tuning.js через `/tuning-edit`) **В ИНСПЕКТОР**:
     три Resource `HornDef`, правишь в редакторе. ZONE (рисунок зоны удара на полу) **ПЕРЕНОСИМ**
     как дебаг-отрисовку, она полезна.
   - HORN INFO (цифры под сердцами) **ПЕРЕНОСИМ** как строку в дебаг-оверлее.

3. **MINIMAP** (id `minimap`, `MINIMAP_KEY`, `drawMinimap`). В коде помечен как тест. **РЕШИТЬ**:
   это фича игрока или дебаг? Если фича, то в SETTINGS, не в панели. Если дебаг, ПЕРЕНОСИМ как
   оверлей.

4. **FACTORY (TEST), SNOW (TEST)** (id `factory`, `snow`, `lvl=factory`, `lvl=snow`; `FACTORY_LEVEL`,
   `SNOW_LEVEL`, `Game.startShowroom(true | 'snow')`). Машинные этажи уже в `LEVELS` (THE FOUNDRY,
   THE ENGINE), снег уже модификатор на THE ROAD. Тест-полы остались рядом.
   - **РЕШИТЬ**: тест-полы живут дальше как «лаборатория» (тогда они часть SHOWROOM и переносятся) или
     снести, а их комнаты держать только в SHOWROOM. Я за первое: 18 комнат фабрики руками не
     повторить.

5. **ALTAR AGAIN (AUTO / ALWAYS / NEVER)** и **END BOSS (MEETING n / AUTO)** (id `altar-again`,
   `end-meet`; `ENDBOSS_KEY`). Это переопределения прогресса браузера. **ПЕРЕНОСИМ** один к одному,
   это ровно то, что нужно дебаг-панели.

6. **CHASE ON/OFF, DARK ON/OFF** (id `chase`, `dark`). Оба кладут модификатор на любой этаж.
   **ПЕРЕНОСИМ**. В Godot у модификаторов должна быть одна точка: `LEVEL_MODS` как список, панель
   включает любой на текущем этаже. Сейчас CHASE идёт через `Chase.forced`, DARK через `dev.dark`,
   два разных пути. Перед портом свести к одному (`level-mod=<name>` уже есть на вкладке LEVEL).

7. **CAMERA ×n** (id `cam-zoom`, `DEV_CAM_STEPS`) и слайдеры **ENEMIES** (`DEV_TUNE`: скорость,
   атака, кулдаун врагов и козла, камера; `TUNE_KEY`). Это множители поверх `TUNING`, базовые числа
   не трогают. **ПЕРЕНОСИМ** как дебаг-слайдеры, они твой главный инструмент настройки на ощупь.
   Перед портом: проверить, что ни один базовый номер не «застрял» в множителе (правило: база одной
   цифрой, множители только для баффов).

8. **SPEECH / TEXT (шрифты, `FONT_PICK`)** (id `font-say`, `font-text`). **РЕШИТЬ** один шрифт на
   реплики и один на текст, и **ВЫБРОСИТЬ** переключатель. В Godot шрифты это `.ttf` ресурсы с MSDF
   импортом, пять семейств тащить незачем.

9. **TEXT EDIT** (id `textedit`, js/text-edit.js, `TEXT_EDITS`, `TEXT_EDIT_KEY`). Сейчас `TEXT_EDITS`
   пуст, `BOON_TEXT` пуст, `BOON_OFF` = ricochet, leapfrog, hocks. **До порта**: убедиться, что в
   localStorage этого браузера нет несохранённых правок (`goat-out-text-edits`,
   `goat-out-boon-edits`), иначе они потеряются. `BOON_OFF` перенести как поле `off` прямо в
   `BOONS`, чтобы не было второго списка. Сам TEXT EDIT **ВЫБРОСИТЬ**: в Godot текст правится в
   ресурсе.

---

## B. Инструменты, которые пишут обратно в код (умирают, данные переезжают)

Всё это ходит через `tools/serve.js`. В Godot нет «сервера, который правит tuning.js», есть
инспектор над Resources. Перед портом важно одно: чтобы ВСЕ числа и тексты лежали в данных, а не в
коде, тогда перенос это конвертер, а не переписывание.

10. **POST /tuning-edit** (`tools/tuning-patch.js`): пишут вкладка TALISMANS (параметры талисманов,
    редкость кликом), вкладка ROOMS (`ROOM_LEVELS`, где какой шаблон может стоять), HORN TOOL SAVE,
    чипы MODS на вкладке LEVEL (`mods` уровня), `persistTuningEdit`. **В ИНСПЕКТОР**. До порта:
    проверить, что всё, что они пишут, лежит в `TUNING` / `ARTIFACTS` / `ROOM_LEVELS` / `LEVELS`, а не
    где-то ещё (так и есть, но проверить `grep persistTuningEdit`).

11. **POST /boon-edit** (`editBoon` в tools/text-patch.js): вкладка BOONS, EDIT NAME / EDIT TEXT /
    DELETE / RESTORE, EXPORT / IMPORT JSON (`boon-export`, `boon-import`). **В ИНСПЕКТОР**: `BoonDef`
    Resource с `name`, `desc`, `off`. Геттеры `desc` (текст, который сам читает числа из `params`)
    это единственное, что инспектор не умеет; в Godot это метод `describe()` на ресурсе, не поле.
    Пометить, у каких бунов `desc` геттер (`grep "get desc()" js/tuning.js`).

12. **POST /text-edit** (TEXT EDIT, см. 9). **ВЫБРОСИТЬ**.

13. **POST /talk-edit, /line-edit** (tools/god-talk.html: `HEAVEN_TALK`, `SHEPHERD_TALK`,
    `DEATH_TIPS`, `BEAST_HELLO`, `BEAST_ANSWER`, `BEAST_CHAT`, реплики мыши). **В ИНСПЕКТОР** или
    лучше в один JSON / CSV диалогов: это уже половина локализации. До порта: ничего, страница читает
    js/heaven.js напрямую, значит данные там и лежат. Собрать их в один объект стоит, сейчас они
    разбросаны по heaven.js, tuning.js, beasts.js.

14. **BOONS tab: MIN LVL / ON GOAT / `stat(p, b)`** (цифры для дев-панели). `stat` это код, не
    данные. В Godot это метод ресурса, который печатает числа в дебаг-оверлей. ПЕРЕНОСИМ как
    метод.

---

## C. Дебаг-состояние (переносим как есть, и это первое, что портировать)

ENGINE.md, совет 4: «панель до второго врага, не после». Список того, что должна уметь панель в
Godot с первого дня. Всё ниже уже есть, переносится один к одному.

15. **GOD** (id `god`, также SETTINGS `god`; `dev.godSpeed`). Плюс в коде GOD выключает учёт прогресса
    (`Heaven.arrived`, `Unlocks`, статистика, `arrived` для грибов). Это правило перенести вместе с
    кнопкой: GOD = ничего не считается.
16. **HEAL, CLEAR NEAR** (`heal`, `clear`).
17. **VISION, HEARING** (`vision`, `hearing`): отрисовка конусов и слуха. Переносится как
    `_draw()` дебаг-слоя.
18. **PLAY LEVEL ▸ список** (`dev-list=levels`, `lvl=<n>`, `lvl=dark`, `lvl=trip`, `lvl=factory`,
    `lvl=snow`): любой этаж с душами, которые забег бы к нему накопил (`startAtLevel`). **Важно**:
    логика «какие души к какому этажу» это `Game.startAtLevel`, не панель. Перенести её, а не
    кнопку.
19. **THIS LEVEL AGAIN (NEW LAYOUT), WIN THIS LEVEL (STAIRS)** (`restart`, `next`; раньше
    `lvl-prev` / `lvl-next` / `lvl-last`, в коде ещё отвечают).
20. **LAST ROOM · SCENE** (`lastroom`, `Game.standAtRoom`): этаж заново, козёл на шаг внутри последней
    комнаты, враги до неё сняты. Нужен для боссов. Переносим.
21. **SHOWROOM** (`showroom`, js/showroom.js). Правило 9 CLAUDE.md: всё новое в тот же день стоит в
    шоуруме. В Godot это одна сцена-уровень, собранная из тех же шаблонов. **Переносим вместе с
    правилом**: у шоурума в Godot должна быть галерея статуй (`showroomStatues`) по `encounters.kinds`
    каждого этажа, иначе правило 9 нечем держать.
22. **HEAVEN, +100 SACR · +5 SOULS, +1 KEY** (`heaven`, `sacrifices`, `addkey`), и вкладка HEAVEN:
    ранги зеркала кнопками, TRY IT HERE (`dive-test`), A BELL AT MY FEET (`bell-drop`), A BOSS WITH A
    BELL (`bell-boss`), BELL +1 / BELLS RESET / ALL (`bells-add`, `bells-reset`, `bells-all`),
    `home-horns`, `home-life`, `home-mirror`, `home-tower`, `mirror-reset`, STAND / SAVED / DARE / WIN
    DARE / FREE / RESET (`devHome`). Это всё правки `Heaven.meta`. **ПЕРЕНОСИМ**: в Godot одна
    дебаг-страница «мета» с теми же кнопками над `user://meta.json`.
23. **SUMMON ENEMY ▸ список + меню «как»** (`dev-list=enemies`, `enemy-spawn=<kind>`,
    `spawn-pick=<i>`: plain / champion / corrupted 1-й, 2-й, 3-й встречи, `DEV_SPAWN_AS`,
    `DEV_SPAWN_POP`, `Game.devSpawnAs`; `wraithdoor`, `vault`). **ПЕРЕНОСИМ**. Проверить, что список
    читает `THREAT` / `spawnKind`, а не свою копию: каждый новый вид сейчас надо добавлять в
    `spawnKind`, `threatKind`, `kindOf`, цепочку `give` в `startLevel`, `enemy-spawn=`, SPAWN row,
    `showroomStatues`, `characterKey`, `PIXEL_UNIT`, `bossKind`, `killedBy`, `Stats.who`, `Motes.count`.
    Это двенадцать мест. **До порта стоит свести к одному реестру** `KINDS` (id → класс, угроза,
    портрет, имя для KILLED_BY, душ за него), и панель, шоурум, статистика читают его. В Godot это
    один `EnemyDef.tres` на вид, и двенадцать мест исчезают сами.
24. **COMPANION ▸ список** (`dev-list=pets`, `coop`, `tortoise`...`fish`) и вкладка ANIMALS
    (`+ BONUS` / `TAKE`, `Game.devBeast`). **ПЕРЕНОСИМ**. Та же мысль: `Beast.KINDS` уже реестр,
    хорошо.
25. **MOUSE, TALISMAN · CAPE, SOUL, PICK A SOUL** (`mouse`, `artifact`, `cape-<id>`, `tal-<id>`,
    `soul`, `soulpick`, `boon-have=<id>`). **ПЕРЕНОСИМ**. PICK A SOUL рисует иконки через
    `Codex.icon`, в Godot иконки это текстуры на `BoonDef`.
26. **PLAYTESTER MODE** (SETTINGS `tester`, `TESTER_IDS`, `TESTER_GIFTS`, `Renderer.testerCols`,
    флаг `T` в статистике). **ПЕРЕНОСИМ** как «короткая панель в релизной сборке за флагом». В
    Godot это `OS.is_debug_build()` плюс настройка.
27. **Чего в панели нет, а ENGINE.md просит добавить**: noclip сквозь стены, телепорт в комнату N
    (сейчас только `H.tp` в tools/harness.js), шаг по одному кадру, `Engine.time_scale` слайдер
    (у нас `timeScale` есть, слайдера нет). Добавить в список Godot-панели с первого дня.

---

## D. Что уходит из игры в headless и в редактор

28. **RULES** (вкладка `rules`, `GEN_RULES`, 82 правила, `checkRules`, `game.ruleMatrix`, REROLL,
    `rules-hidden`, `RULE_HIDE_KEY`). **HEADLESS**: `rules.gd` с теми же 82 `check(level)`, запуск
    `godot --headless --script res://tools/balance.gd`. Это критерий «порт сгенерировал ту же игру»
    (ENGINE.md, конец части 3). **Портировать ДО генератора**, вместе с `rng.js` (mulberry32 бит в
    бит, маска `& 0xFFFFFFFF`). Страницу RULES в игре можно не переносить вовсе, если есть headless
    и вкладка в редакторе.
29. **BALANCE** (`balance`, `bal-seeds`, `ground`, `rises`, `game.balanceReport`, tools/balance.js).
    **HEADLESS**. Лестница сложности 18.8 / 36.0 / ~64 / 86.8 / 100.8 / 109.2 / 152.4 / 166.2 и
    THE DARK 62.5 это число, которое порт должен повторить.
30. **LEVEL** (`levels`, `drawLevelTab`, `roomPlan`, лист комнаты `drawRoomSheet`, MODS чипы).
    В редактор: `EditorPlugin`, который рисует план сгенерированного уровня. Или оставить в игре как
    дебаг-оверлей поверх карты, это проще.
31. **ROOMS** (`roomlist`, `ROOM_LEVELS` галочки). **В ИНСПЕКТОР**: у каждого шаблона поле
    `levels: String` ('1101...'). Уже строка, переносится как есть.
32. **COMBOS, LINKS** (`combos`, `links`, PLAY на паре). Таблицы из `TUNING.combos` / `LINKS` плюс
    кнопка «поставь эту пару». ПЕРЕНОСИМ кнопку в панель, таблицу в инспектор.
33. **Инструменты из tools/, которые гоняют игру** (tools/harness.js, smoke.js, boon-check.js,
    talisman-check.js, hounds.js, escorts.js, perf.js, art-study.js, autoplay-bot.js, bot-lab.js,
    lab-run.js). Это тесты. В Godot: GUT или GdUnit4 для `boon-check` / `talisman-check` (каждая
    душа и талисман делает, что написано на карте), headless-прогон для smoke (каждый этаж до
    лестницы без NaN), профайлер Godot вместо perf.js. Бот (тупая эвристика на синтетических
    клавишах) переносится последним, если вообще.

---

## E. Справочные вкладки (таблицы, читающие TUNING)

34. **STATUS** (`status`): яд, стан, огонь, их реакции. **В ИНСПЕКТОР**, таблица не нужна.
35. **OBJECTS** (`props`): каждый проп с числами. **В ИНСПЕКТОР** (`PropDef.tres`).
36. **MUSIC** (`music`, `music-*`, `audio.labAction`): лаборатория слоёв, `MUSIC_PARTS`,
    `TUNING.audio.layers`. Самая зависимая от WebAudio вкладка. См. раздел H про звук: если подложка
    записывается, а не портируется, вкладка умирает. Если портируется на `AudioStreamPlayer` по
    слоям, нужна заново.
37. **JUICE** (`juice`, `juice-export`, js/juice.js, `JuicePreview`). Единственная вкладка, которая
    уже написана как документ порта: 133 рецепта для Godot 4, по одному на эффект. **До порта**:
    пройти по `JUICE` и проверить, что строка есть у каждого эффекта, добавленного после 23 сентября:
    трёхфазный взрыв (`effects.blast`), метка обидчика (`juice.blame`), белый силуэт и слэш при
    потере сердца (`juice.hurtLook`), треск сердца в HUD, волна рогов и слэш Hades (`horns.wave`,
    `hornSplash`), CHEER (js/cheer.js), сбитый с ног козёл (`goat.knock`), знаки над головой
    клетками (`juice.marks`), витчфайр-кольца огра (js/waves.js), все машины фабрики, следы на снегу.
    `node tools/juice-md.js` потом переписывает JUICE.md, его и брать в Godot как ТЗ на эффекты.
    Живой превью (`JuicePreview`) не переносить.
38. **TALISMANS** (`talismans`): описание каждого, правка параметров (см. 10), редкость кликом.
    **В ИНСПЕКТОР**.
39. **ANIMALS** (`animals`): см. 24.
40. **HEAVEN** (`mirror`): см. 22.
41. **GOAT GRID** (`goats`, js/goat-grid.js, `grid-*`, SCENE mode, SAVE PNG). Инструмент для скриншотов
    и листов. **ВЫБРОСИТЬ** после того, как арт выгружен (раздел H). SCENE mode (кадр руками) в Godot
    это просто сцена в редакторе.
42. **ART** (`art`): см. 1. После запекания вкладка пуста, удалить.

---

## F. Адреса, сохранения, статистика

43. **Хэш-адреса** (`#seed=`, `#trip`, `#dark`, `#showroom`, `#factory`, `#snow`, `#bot`, `#dev`,
    `#aspacked`, `#smallart`, `#lab`, и имена вкладок `#rules` ... `#links`; `Game` constructor, js/game.js
    ~205-240). В Godot: аргументы командной строки (`OS.get_cmdline_user_args()`) или один автолоад
    `DevConfig`. **До порта**: выписать список, половина из них (`#aspacked`, `#smallart`, `#bot`,
    `#lab`) умирает вместе с переключателями.
44. **Девятнадцать ключей localStorage** (`SAVE_KEY` забег, `HEAVEN_KEY` мета, `BEST_KEY`, `SET_KEY`,
    `PEN_KEY`, `LEARN_KEY`, `UNLOCK_KEY`, `STATS_KEY`, `ENDBOSS_KEY`, `HORN_KEY`, `HORN_INFO_KEY`,
    `MINIMAP_KEY`, `RULE_HIDE_KEY`, `DEATH_KEY`, `SEEN_KEY`, `BLESS_KEY`, `SPIRE_KEY`, `TUNE_KEY`,
    `TEXT_EDIT_KEY`, `BOON_EDIT_KEY`). Это и есть «прогресс игрока», разложенный по карманам.
    **До порта**: свести к трём файлам, `run` (забег), `meta` (небеса, анлоки, что он уже видел:
    PEN, LEARN, SEEN, BLESS, ENDBOSS, HORN, DEATH, SPIRE), `settings` (SET, MINIMAP, TUNE, RULE_HIDE).
    В Godot `user://run.json`, `user://meta.json`, `user://settings.json`, Steam Cloud синкает `user://`.
    Сохранить схему и поле `v`: тогда импорт старого прогресса из браузера это один экспорт-кнопка.
45. **RUN STATS и воронка** (js/stats.js, `TUNING.stats.url`, tools/stats-worker, SAVE STATS /
    STATS PAGE в панели, `statsave`, `statview`). Worker остаётся как есть, он не про движок. В
    Godot отправка через `HTTPRequest` с той же схемой отчёта (`end.how`, `rm`, `path`, `seq`),
    tools/stats.html читает как раньше. **ПЕРЕНОСИМ** протокол, кнопки панели не нужны (SAVE STATS
    это экспорт localStorage в файл).
46. **DIP LOG / SAVE DIPS, PHOTO MODE** (js/photo.js). **ВЫБРОСИТЬ**: профайлер Godot и
    `get_viewport().get_texture()` для скриншотов.
47. **ITCH BUILD** (js/release.js, `RELEASE`, tools/itch-zip.js, itch-push.js). **ВЫБРОСИТЬ**: экспорт
    Godot в web (однопоточный, 4.3+) плюс `butler push` тем же tools/itch-push.js с другой папкой.
    Проверить размер: web-экспорт Godot десятки мегабайт против сегодняшних нескольких, артефакт
    claude.ai с лимитом 15 МБ на файл скорее всего не переживёт.
48. **TALK · GOD, ANIMALS, TIPS** (`godtalk`, tools/god-talk.html). См. 13.
49. **Хуки** (tools/hooks/guard.js: запрет публикации с битым скрипт-листом, tools/check-sync.js,
    tools/script-lists.js). Логика «index.html и artifact.html грузят одни и те же скрипты» умирает.
    Остаётся идея: пре-пуш гоняет headless rules + `node --check` аналог (`gdscript` парсер через
    `godot --headless --check-only`). Переписать guard под это.

---

## G. Правила, которые панель держит, и которые надо перенести словами

Это не кнопки, а инварианты, на которых стоит логика. Их легко потерять при переписывании, потому
что они живут в комментариях и в CLAUDE.md, а не в коде.

50. **Правило 2**: все числа в `TUNING`. В Godot: все числа в Resources, ни одного литерала в `.gd`.
    Включить `untyped_declaration = Error` и договориться о `Tuning` автолоаде.
51. **Правило 8**: каждое обещание генератора записано как правило с `check(level)`. 82 штуки сейчас.
    Порт правила = порт обещания. Без них нельзя узнать, тот ли уровень генерирует Godot.
52. **Правило 9**: всё новое в SHOWROOM в день добавления, плюс галерея статуй по этажам.
53. **GOD ничего не считает**: `Heaven.arrived`, `Unlocks.tick`, `Stats`, `noteBest`, воронка, флаг
    `X` в коде забега. Перенести как одно поле `game.counts_progress`, которое читают все.
54. **«Нужно ли тестеру»**: `TESTER_GIFTS` помечают жизнь `T`, LEVELS-прыжок `J`, GOD `X`. Три флага
    в `runCode` и в отчёте. Перенести схему.
55. **Множители, не базы**: `DEV_TUNE` поверх `TUNING`, `mods` поверх `TUNING`, никогда не мутировать
    `TUNING`. В Godot: ресурсы read-only, `duplicate(true)` на экземпляр, `mods` как словарь поверх.
56. **Один RNG на назначение** (`rng.js`, потоки для ковров, барабанов, люстр, стены, бочек, вилки,
    фланга...). Если потоков в Godot будет меньше или они пойдут в другом порядке, тот же seed даст
    другой этаж. Записать порядок потоков в `tryGenerate` до порта (это и есть «сохранить логику»).
57. **Три слоя координат**: симуляция плоская, рендер сжат по Y на `TILT` 0.86, спрайты разжаты.
    Каждое чтение мыши делит на `zoom * TILT`. Панель рисует и в экранных, и в мировых координатах
    (зона рогов, конусы). В Godot: узел-рисовальщик мира с `scale.y = TILT`, панель в `CanvasLayer`.

---

## H. Больше, чем панель, но без этого переезд не гладкий

58. **Спрайты, нарисованные кодом**. Тринадцать файлов `js/*-pixels.js` (ogre, spartan, thrower,
    shaman, warden, flayed, horse, pig, heaven, cape, prop, factory, decal) рисуют вызовами `Grid`,
    а `PIXEL_ART` на лету запекает рога (`hornModel`), походку (`gait`), ноги (`legsOf`), студии,
    снежные шапки, бороду. Godot хочет PNG-листы и `SpriteFrames`. Рендереры уже есть
    (`output/*/render.cjs`, `node -e` поверх `PROP_PIXELS`). **До порта**: один скрипт, который
    выгружает ВСЁ в PNG плюс JSON с рамками кадров и точками (нога, рот `PIXEL_FACE`, шея
    `PIXEL_NECK`, корни рогов). Атласы в `js/*-assets.js` лежат как data URI, их тоже в файлы.
59. **Звук**. Каждый эффект процедурный (js/foley.js), `Foley.render` работает в node. Выгрузить
    каждый ключ в `.wav` (`TUNING.audio.foley.takes` тейков на ключ), подложку записать из JS-сборки.
    Шины (`scoreDuck`, `sfxDuck`, `ambDuck`, `keyBus`) один к одному в Audio Bus Layout.
60. **Шаблоны комнат** (`js/rooms.js`, символьные сетки с легендой, `FACTORY_TEMPLATES` со своей
    легендой). Переносятся как текст, это самое простое. Два парсера (gen.js и factory.js) стоит
    свести к одному до порта или перенести оба, но знать об этом.
61. **Декал-канвас** (`world.decal`, 0.34 масштаба, следы на снегу через `world.dctx`, кровь, пиктограммы).
    `SubViewport` с `render_target_clear_mode = NEVER`. Следы на снегу (js/snow.js `print`, `streak`,
    `wear`) пишут в тот же канвас, значит тоже туда.
62. **Запекание комнат и пещеры** (`drawRoomsBaked`, `CAVE_BAKE`, `warmRooms`, `bakeScale`,
    `adaptRes`). Это обход медленного Canvas 2D. В Godot `TileMapLayer` не нужно запекать, вся
    эта механика (и `CANVAS_STATE`, и `Game.adaptRes`) **ВЫБРОСИТЬ**. Но «ничего анимированного на
    слое тайлов» как правило остаётся.
63. **Google Диск**. Проект лежит в синхронизируемой папке. Godot-репозиторий туда нельзя: кэш
    `.godot/` это тысячи файлов, Диск их ломает. Локальный диск плюс git, `.godot/` в `.gitignore`,
    `.uid` файлы коммитить.
64. **ENGINE.md** (23 сентября, Godot 4.7). Таблица части 3 не знает: небеса и дом животных, машины
    фабрики, снег, Warden / Flayed и удерживаемые сцены, stats worker, запекание, модификаторы,
    шоурум, THE COWARD, THE CARTRIDGE, THE ARM, THE SWEEPER. Обновить до начала, иначе порт идёт по карте месячной давности.

---

## I. Порядок на неделю

1. Решить пункты с пометкой **РЕШИТЬ** (1, 3, 4, 8): полчаса твоих ответов.
2. Запечь переключатели (1, 9) и удалить вторые пути. Прогнать `node --check`, `balance.js --seeds 8`,
   шоурум глазами. Коммит «одна правда».
3. Свести реестры: виды врагов в один `KINDS` (23), ключи localStorage в три файла (44), потоки RNG
   записать (56). Коммит.
4. Выгрузить арт (58) и звук (59) в файлы. Коммит.
5. Обновить ENGINE.md (64) с разделом «панель, разобранная» по этому списку.
6. Только теперь Godot: `rng` → `rules` → `gen` → headless balance до совпадения лестницы →
   панель (раздел C) → первый враг.

Карточка «Prep pass before the Godot port» в этой сессии закрывает шаги 4 и 5. Шаги 1-3 лучше
отдельной сессией после твоих ответов на РЕШИТЬ.
