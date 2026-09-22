# ТЗ: 17 новых талисманов мыши

Составлено 22 сентября 2026 по отметкам в «Талисманах мыши» (https://claude.ai/artifact/BRzVQUemwrvMDEvBv89sX1).
Взято 17 из 25. Не взяты: LODESTONE, RUSTED HINGE, HOLLOW DRUM, HARE'S HEART, MILLSTONE,
HANGMAN'S ROPE, SMOULDERING HOOF, WHISTLE BONE. Три артефакта переделаны по комментариям:
BELLWETHER'S BELL, MIRROR SHARD, PILGRIM'S SANDAL.

Это ТЗ, а не код. В билд ничего не внесено.

---

## Общее для всех

**Где живут.** Каждый — запись в `ARTIFACTS` (`js/tuning.js`) в том же виде, что FIRE AMULET и
BOOMERANG: `id`, `name`, `color`, три `tiers` с `desc` (английский, как весь текст игры) и `params`,
и `apply(m, p)`, который кладёт параметры в `game.mods`. Место использования читает `game.mods.X`,
а не `TUNING` (правило CLAUDE.md про души действует и здесь). Никаких чисел в коде.

**Слот один.** На шее висит один талисман; взяв новый, старый кладёшь на стул (как сейчас).
Q-глагол из этого списка один — STRAW EFFIGY; он делит `Goat.itemCd` с бумерангом и морганием
и существует, только пока надет (`TouchUI.itemReady`).

**Баланс, который держат все.**
1. Защита не бывает «раз на комнату»: заряд копится комнатами или душой.
2. Лечение — только за убийства геометрией и не больше 2 сердец за уровень.
3. Тяжёлые — Мясник, громила (`champion`), носитель души (`e.soul`), крысиный огр — лёгкие эффекты
   (паника, опрокидывание, цепочки) не берут: их проверка `Enemy.unliftable` плюс огр.
4. Всё, что изменил артефакт, видно: на козле, на полу, над врагом или у сердец.
5. Правило 4 CLAUDE.md: никаких отмен и неуязвимостей сверх переката. Парирование MIRROR SHARD —
   это окно в начале удара, промах окна стоит полного удара.

**Магазин.** Пул вырастет с 4 до 21. Мышь выставляет 2 за визит; стоит не ставить на одну полку два
артефакта про удар головой (ECHO HORN, TALLY STICK, MIRROR SHARD) — добавить каждому `tag`
(`butt`, `geo`, `ai`, `run`, `def`, `count`, `q`) и в `stockFor` не брать два одинаковых.

**Инструменты.** Каждый новый видимый эффект — строка в `JUICE` (`js/juice.js`) и
`node tools/juice-md.js`. Генератор уровней ни один артефакт не трогает, так что `GEN_RULES`
не меняются; `node tools/balance.js` всё равно прогнать.

**Порядок работ** (от простого к сложному):
- Этап 1, только хуки и числа: MASON'S MARK, BRASS SPUR, MOTH WOOL, TALLY STICK, BLOOD CUP,
  TALLOW SKIN, SCAPEGOAT.
- Этап 2, новое состояние или проп: DOMINO BONE, CARPENTER'S AWL, HORNED MASK, BUTCHER'S GREASE,
  PILGRIM'S SANDAL, BELLWETHER'S BELL.
- Этап 3, новые механики: MIRROR SHARD, ECHO HORN, GRAVEDIGGER'S SPADE, STRAW EFFIGY.

---

## Геометрия

### MASON'S MARK · `mason`
Стена смертельнее. Сила удара та же — меняется порог, на котором мужик разбивается.

| Ступень | params | В игре |
|---|---|---|
| I | `{ splat: 0.8, props: false, bodies: false }` | *A man breaks on stone at four-fifths the speed he used to.* |
| II | `{ splat: 0.8, props: true, bodies: false }` | *Tables, crates, racks and the gong are stone to him too.* |
| III | `{ splat: 0.75, props: true, bodies: true }` | *So is another man: hit one hard enough and both go down for good.* |

- `apply`: `m.splatMul = p.splat; m.propWall = p.props; m.bodyWall = p.bodies`. `BOON_BASE`: `splatMul: 1`.
- Хуки: flung-ветка `Enemy.update` — `impact > TUNING.physics.splatSpeed * game.mods.splatMul`.
  `propWall`: где отброшенный мужик встречает стол, ящик, стойку или гонг (`collideEntities`) на той же
  скорости — `die('splat')`, ящик ломается. `bodyWall`: `game.flungHits` — порог «оба умирают» падает
  с `physics.splatSpeed` до `splatSpeed * splatMul`.
- Видно: каменная крошка (`PALETTE.ash`, 6 частиц) там, где убийство случилось только благодаря метке.
- Пределы: Мясник и огр как сейчас (сердце, а не смерть).
- Приёмка: мужик, которого раньше удар головой в стену с 3 тайлов оставлял лежать, с I умирает.

### DOMINO BONE · `domino`
Отброшенный передаёт бросок тому, в кого врезался.

| Ступень | params | В игре |
|---|---|---|
| I | `{ links: 1, keep: 0.7 }` | *A man you throw passes the throw on to the man he hits.* |
| II | `{ links: 2, keep: 0.7 }` | *And that one passes it on once more.* |
| III | `{ links: 4, keep: 0.7 }` | *The throw runs down a crowd until it runs out of speed.* |

- Хук: `game.flungHits`, ветка «ниже убойной скорости, оба падают». С артефактом: B получает
  `fling(A.vx * keep, A.vy * keep)` и `chain = A.chain + 1`; A останавливается и падает.
  Цепочка кончается на `chain > links` или скорости ниже `physics.flungFloorSpeed`.
  На убойной скорости всё как сейчас (оба умирают), но с MASON'S MARK III второе тело и дальше
  переносит.
- Тяжёлые цепь гасят: Мясник — `stagger`, остальные тяжёлые — ничего.
- Видно: белая вспышка-кольцо (0.4 тайла) и 3 искры на каждом стыке.
- Приёмка: мужик, отброшенный в троих стоящих в ряд, на III укладывает всех троих.

### ECHO HORN · `echo`
Через мгновение удар головой повторяется призраком на том же месте.

| Ступень | params | В игре |
|---|---|---|
| I | `{ delay: 0.4, power: 0.5, count: 1, spread: 0 }` | *A moment after the horns, a ghost of them lands in the same place, half as hard.* |
| II | `{ delay: 0.4, power: 1, count: 1, spread: 0 }` | *The ghost lands as hard as you did.* |
| III | `{ delay: 0.4, power: 1, count: 2, spread: 0.26 }` | *Two ghosts, the second a beat later and a little wider.* |

- Хук: на старте лунжа (`Goat.update`, где растёт `lungeId`) сохранить `{ x, y, aimX, aimY }` в
  `game.echoes`; через `delay` (и `2 * delay` для второго, повёрнутого на ±`spread` рад) выполнить
  облегчённый `headbuttHits`: только враги, та же дальность и конус, импульс × `power`, те же
  `tryDodge` и `game.reaches`. Не трогает пропы и двери, не ставит бомбу, не считается для TALLY STICK.
- Видно: бледный силуэт козла (альфа 0.35), делает выпад в сохранённой точке.
- Приёмка: мужик, вставший после удара, через 0.4 с получает второй бросок.

### GRAVEDIGGER'S SPADE · `spade`
Трупы остаются телами: каждое убийство добавляет в комнату геометрию.

| Ступень | params | В игре |
|---|---|---|
| I | `{ life: 20, trip: 0.6, grab: false, lethal: false }` | *The dead stay where they fall, and the living trip over them.* |
| II | `{ life: 20, trip: 0.6, grab: true, lethal: false }` | *You can pick a body up and throw it like a crate.* |
| III | `{ life: 25, trip: 0.6, grab: true, lethal: true }` | *A thrown body hits like a live one: it kills.* |

- Хук: `Enemy.die` для причин, где есть тело (`splat`, `headbutt`, `mill`, `club`, `spike`, `blade`,
  `bullet`) — новый проп `corpse` (`r` 11, картинка — `CombatFX.snapshot` убитого, лёжа).
  Не для `fall`, `burn`, `boom`, `devour`, `unmade`.
- Спотыкание: в `collideEntities` мужик, идущий быстрее половины своей скорости, задев труп — `floored`
  на `trip`, не чаще раза на пару «мужик–труп».
- II: `item` у трупа — true; хватается и бросается как ящик, скорость броска ящика, `grabCd` как у ящика.
- III: брошенный труп, попавший в мужика на скорости ≥ `physics.bodyKillSpeed`, убивает его
  (по брошенному-изо-рта правилу), труп остаётся лежать.
- Лимит 6 трупов; старейший превращается в decal (`world.body`). Зажатая комната (`clamp`) их убирает.
- Приёмка: бегущий в погоне мужик падает, наступив на труп.

### BUTCHER'S GREASE · `grease`
Кровь от убийства о стену делает пол скользким.

| Ступень | params | В игре |
|---|---|---|
| I | `{ life: 15, r: 1, drag: 0.5, slip: 0 }` | *Blood off a wall kill greases the floor: a thrown man slides further on it.* |
| II | `{ life: 15, r: 1, drag: 0.5, slip: 0.3 }` | *And a man running across it goes down.* |
| III | `{ life: 20, r: 1.3, drag: 0.15, slip: 0.3 }` | *On grease a thrown man barely slows at all.* |

- Хранение: маска по тайлам, как у яда — `world.grease` (Float32, секунды) и `world.greaseOn`
  (множество живых тайлов), тикает в `Status.update` или рядом.
- Где появляется: `onKill` с `cause === 'splat'` — тайлы в радиусе `r` вокруг убитого.
- Эффекты: flung-ветка — `flungDrag * drag` на жирном тайле. II: мужик в `chase` на жирном тайле с шансом
  `slip` в секунду `floored` на 0.6 с (тяжёлые — нет). Козёл на жире: ускорение и торможение × 0.7,
  не падает.
- Видно: красный блеск поверх пятна (оверлей, альфа по оставшемуся времени).
- Приёмка: на III отброшенный по жиру долетает до следующей стены через всю комнату.

### CARPENTER'S AWL · `awl`
Разбитый ящик разлетается щепой.

| Ступень | params | В игре |
|---|---|---|
| I | `{ r: 1, fling: 0 }` | *A crate that breaks throws splinters: everyone beside it goes down.* |
| II | `{ r: 1.2, fling: 8 }` | *And is thrown clear of it.* |
| III | `{ r: 1.5, fling: 12 }` | *Hard enough to break on a wall.* |

- `fling` в тайлах/с; 12 > `physics.splatSpeed` (11), поэтому III убивает о стену.
- Хук: `Prop.shatter` ящика — по любой причине (брошен, разбит головой, дубиной, ящик-укрытие в зубах).
  I: всех врагов в `r` — `floored`. II/III: `fling` радиально от ящика. Тяжёлые — `stagger` без броска.
  Козла щепа не трогает.
- Видно: `CombatFX.debris` с щепой на 50% больше.
- Приёмка: ящик, брошенный в двоих у стены, на III убивает обоих.

---

## ИИ врагов

### HORNED MASK · `mask`
Свидетели убийства паникуют.

| Ступень | params | В игре |
|---|---|---|
| I | `{ r: 4, flee: 1, drop: false, blind: false }` | *Whoever watches a man die runs from it.* |
| II | `{ r: 4, flee: 1.5, drop: true, blind: false }` | *And drops whatever he was about to do.* |
| III | `{ r: 5, flee: 1.5, drop: true, blind: true }` | *And runs without looking where.* |

- Хук: `onKill` — каждый живой враг в `r` тайлах с линией взгляда на убитого (`world.los`),
  не тяжёлый, не призрак, `panicCd <= 0` → новое состояние `flee` на `flee` с: бежит от точки
  убийства на полной скорости (через `moveToward`, так что I/II обходят ловушки), `panicCd = 4`.
- `drop`: срываются `windup`, `aim` (перезарядка стрелка на полную), `cast` (`rune = null`),
  `slamwind`, собачий `windup`/`dart`.
- `blind`: на время бега `hazardBlind = flee` — бежит в колесо, огонь, яму.
- После `flee` — обратно в `chase`.
- Видно: белый «!» над головой и bark `panic` (он уже есть).
- Приёмка: убийство у колеса на III отправляет свидетеля в колесо.

### STRAW EFFIGY · `effigy` · Q
Q ставит соломенное чучело козла, которое отвлекает на себя.

| Ступень | params | В игре |
|---|---|---|
| I | `{ life: 4, r: 6, cd: 12, shots: false, oops: false }` | *Press Q to set down a straw goat. They go for it instead.* |
| II | `{ life: 4, r: 6, cd: 10, shots: true, oops: false }` | *Rifles waste a round on it, and a round goes where it goes.* |
| III | `{ life: 6, r: 7, cd: 8, shots: true, oops: true }` | *A man who clubs it clubs whoever is beside him too.* |

- Постановка: проп `effigy`, 1.2 тайла перед козлом по прицелу (не в стене и не над ямой, иначе у ног).
  Одна штука за раз; `itemCd = cd`.
- Приманка: раз в 0.5 с чучело шумит `lure`-шумом радиуса `r` — уже работающая механика «идти на звук».
  Кто дошёл до чучела на дистанцию удара — замахивается и бьёт его (обычные `windup`/`swing` по точке
  чучела, `skipGoat`). Удар уничтожает чучело.
- Исключения: если враг видит козла ближе 3 тайлов — идёт на козла. Призрак, огр, Мясник чучело игнорируют.
- II: стрелок в `r` с линией на чучело целится и стреляет в него — пуля может задеть своих
  (friendly fire уже есть).
- III: удар по чучелу идёт через `meleeHit(..., skipGoat)` — соседи падают с `OOPS`.
- Видно: соломенный козёл (упрощённый силуэт козла цвета сена), тает последнюю секунду.
- Приёмка: трое мужиков в погоне на I отворачиваются и идут к чучелу.

---

## Бег и тишина

### BRASS SPUR · `spur`

| Ступень | params | В игре |
|---|---|---|
| I | `{ time: 0.5, keep: 0, throw: 1 }` | *Your run-up builds twice as fast.* |
| II | `{ time: 0.5, keep: 0.5, throw: 1 }` | *A blow takes half of it, not all.* |
| III | `{ time: 0.5, keep: 0.5, throw: 1.6 }` | *At full run the horns throw far harder.* |

- Хуки: разгон в `Goat.update` — `momentum.time * time`. `Goat.damage`: вместо обнуления `runUp`
  оставлять `1 + (runUp - 1) * keep`. `headbuttHits`: при `runUp >= 1 + 0.95 * momentum.max`
  импульс × `throw`.
- Видно: на III смаз козла на полном разгоне окрашен в `PALETTE.fire`.

### MOTH WOOL · `moth`
Тише, чтобы драка не начиналась. На того, кто уже гонится (`aware`), не действует.

| Ступень | params | В игре |
|---|---|---|
| I | `{ step: 0.5, near: 0, still: 0 }` | *Your running is half as loud.* |
| II | `{ step: 0.5, near: 3, still: 0 }` | *Close to a man who has not seen you, it makes no sound at all.* |
| III | `{ step: 0.5, near: 3, still: 1.2, hide: 4 }` | *Stand still a moment and the ones who have not seen you cannot, past four tiles.* |

- Хуки: радиус `noise.footstep` × `step`. II: шаг не шумит вовсе, если ближайший не-`aware` враг ближе `near`
  тайлов. III: `goat.stillT` (секунды без движения); в `canSeeGoat`: `!this.aware && stillT >= still &&
  d > hide * TILE` → false.
- Видно: на III, пока спрятан, шерсть сереет (альфа 0.75).

### BELLWETHER'S BELL · `bell` · переделан по комментарию
Было: стрелки к лестнице и хранилищу. Стало: стрелки плюс **силуэты врагов** сквозь стены и туман.

| Ступень | params | В игре |
|---|---|---|
| I | `{ arrows: true, sil: 0, mimic: false }` | *A thread pulls toward the stairs and the vault.* |
| II | `{ arrows: true, sil: 6, mimic: false }` | *You see the shapes of men through stone, six tiles out.* |
| III | `{ arrows: true, sil: 9, mimic: true }` | *Nine tiles out, and what lies still pretending to be a box twitches.* |

- Стрелки: в коридорах (где `roomAt` пуст) у края экрана — к `level.exitTile` (кость) и к `level.vault`
  (фиолетовая), если хранилище не открыто.
- Силуэты: враги в `sil` тайлах, которых сейчас не видно (`game.hidden` или тайл не в `world.vis`),
  рисуются после `drawShade` плоской заливкой — тем же `drawEnemy` через `ctx.filter`
  (как `enemy.flash`), альфа 0.35. Не заметивший — пепельный, `aware` — красный.
- Правило про туман: предупреждение по-прежнему шириной в дверь *для комнат*, силуэты только в радиусе.
  С THE ORACLE не конфликтует: Оракул открывает тайлы рядом, колокол показывает только людей и дальше.
- III: спрятанный призрак (`state === 'hidden'`) в 4 тайлах подёргивается, у маскировки мерцает контур.
- Приёмка: за колонной стоит мужик — на II виден его силуэт, пока его не видно.

### PILGRIM'S SANDAL · `sandal` · логика переделана по комментарию
Было: быстрее «нормы» времени на комнату — норматив невидим, его не прочитать.
Стало: **ушёл от погони**. Баф даётся за вход в новую комнату, пока тебя кто-то гонит.

| Ступень | params | В игре |
|---|---|---|
| I | `{ speed: 0.2, time: 2.5, reset: false, shake: false }` | *Get into a new room with them on your heels and you run faster for a moment.* |
| II | `{ speed: 0.2, time: 2.5, reset: true, shake: false }` | *And your roll and your voice are ready again.* |
| III | `{ speed: 0.25, time: 3, reset: true, shake: true }` | *And the ones behind you lose you in the doorway.* |

- Триггер: первый вход в комнату за уровень (`room.goatVisited` ставится вместе с `seen`), и в пределах
  10 тайлов позади есть хотя бы один живой `aware` враг не в тумане, из комнаты с меньшим индексом.
  Раз на комнату.
- Эффект: `goat.sandalT = time`, скорость × (1 + `speed`). II: `rollCd` и `screamCd` в 0.
  III: у всех этих преследователей `aware = false`, `target` — точка дверного проёма, `state = 'investigate'`:
  они обыскивают дверь, а не идут за тобой.
- Видно: пыль у проёма, короткий звон, на III — `SHAKEN OFF` над ближайшим.
- Приёмка: удирая через дверь от двоих, на III оба останавливаются у двери.

---

## Защита

### SCAPEGOAT · `scapegoat`
Одна смерть не засчитывается. Артефакт тратится, слот пустеет.

| Ступень | params | В игре |
|---|---|---|
| I | `{ hearts: 1, invuln: 1.5, stun: 0 }` | *The first time you die, something else dies instead. Then it is gone.* |
| II | `{ hearts: 2, invuln: 1.5, stun: 0 }` | *You get up with two hearts.* |
| III | `{ hearts: 2, invuln: 1.5, stun: 1.5, r: 5 }` | *And everything near you reels.* |

- Хук: `Goat.damage`, когда `hp` падает до 0 (не в god-режиме): `hp = hearts`, `invuln`, белый труп козла
  decal и кровь, `SOMEBODY ELSE DIED`, затем `game.artifact = null`, `applyBoons`, `saveRun`.
  III: `daze(stun)` всем в `r` тайлах (у тяжёлых — только срыв замаха, как у огра).
- Падение в яму: воскрешение там, куда `goatFalls` и так возвращает.
- **Важно:** потраченный козёл не должен вернуться при рестарте уровня. `levelArtifact` снимок в начале
  уровня — при трате обнулить и его, иначе следующая настоящая смерть вернёт талисман.
- Приёмка: смерть с SCAPEGOAT — встаёшь, слот пуст; вторая смерть на уровне — обычный рестарт без талисмана.

### TALLOW SKIN · `tallow`
Восковая корка гасит один удар. Заряд копится **новыми комнатами**.

| Ступень | params | В игре |
|---|---|---|
| I | `{ rooms: 5, soul: false }` | *A crust of tallow takes one blow, and grows back over five new rooms.* |
| II | `{ rooms: 4, soul: true }` | *Four rooms, and a soul swallowed mends it at once.* |
| III | `{ rooms: 3, soul: true }` | *Three rooms.* |

- Состояние: `goat.tallow` (есть заряд) и `goat.tallowCount`. Надевая — заряд есть.
- Счёт: `+1` за каждую впервые открытую комнату (`room.goatVisited`, та же отметка, что у сандалии),
  только пока заряда нет. На `rooms` — заряд. Счётчик переходит между уровнями.
- `Goat.damage`: если заряд есть и урон пришёл — заряд тратится, сердце не снимается, обычный `invuln`.
  Гасит всё: удар, пулю, огонь, шипы, колесо, падение (в яму всё равно падаешь, но без сердца).
- II/III: подобранная душа (`game.souls` pickup) заряжает сразу.
- Видно: восковая корка на шерсти, пока заряд есть; на ударе — крошки и глухой звук. У сердец
  `rooms` точек, закрашивается по пройденным комнатам.
- Приёмка: бег туда-сюда между двумя старыми комнатами не заряжает.

### MIRROR SHARD · `mirror` · переделан по комментарию
Было: отражение пуль. Стало: **отражает любой удар**, если попасть в окно в начале своего удара головой.

| Ступень | params | В игре |
|---|---|---|
| I | `{ window: 0.18, club: false, heavy: false }` | *Start the horns as a bullet or a bite arrives and it goes back where it came from.* |
| II | `{ window: 0.2, club: true, heavy: false }` | *Clubs and blades too: the man who swung it is thrown back.* |
| III | `{ window: 0.25, club: true, heavy: true }` | *Everything: the cleaver, the charge, the slam, the rune.* |

- Окно: `goat.parryT = window` в момент начала `windup` удара головой (там же, где `buttTries`).
  Тикает вниз. Отражение не укорачивает восстановление после удара.
- Что отражается и как:
  - Пуля (I+): в `Bullet.update` при попадании в козла — разворот на владельца, скорость × 0.9, пуля
    теперь «своя» и убивает мужика.
  - Укус собаки (I+): собака `fling` назад силой удара головой.
  - Дубина, нож, коса призрака, удар огра (II+): в `game.meleeHit` перед уроном козлу — урон отменён,
    атакующий `fling` вдоль `-facing` с импульсом удара головой × 0.8 (может разбиться о стену). Огр
    не отлетает — `stagger`.
  - Тяжёлое (III): тесак Мясника — `stagger` 0.8 с и −1 сердце; рывок Мясника — `chargeStopped`;
    слэм громилы — оглушение 1 с; руна мага в 6 тайлах — `castRune` загорается под самим магом.
- Видно: белое кольцо и зеркальный блик (`PALETTE.witchHi`) на козле, `PARRIED`, `sfxSteel`,
  hitstop 0.06.
- Промах окна — полный удар, никакой скидки.
- Приёмка: удар головой, начатый за 0.1 с до удара дубиной, на II отбрасывает дубинщика в стену.

---

## Счётчики

### BLOOD CUP · `cup`
Убийства геометрией наполняют чашу, полная чаша — сердце.

| Ступень | params | В игре |
|---|---|---|
| I | `{ need: 12, carry: false }` | *Every man broken on the room fills the cup. Full, it is a heart.* |
| II | `{ need: 10, carry: false }` | *It fills sooner.* |
| III | `{ need: 8, carry: true }` | *Sooner still, and what spills over keeps for the next floor.* |

- Засчитываются причины `onKill`: `splat`, `mill`, `spike`, `fall`, смерть от тела во `flungHits`
  (проверить точные строки причин при реализации). Не засчитываются: огонь, клинок, пуля, бомба,
  `devour`, `unmade`.
- Полная чаша при неполных сердцах — `+1 HEART` и обнуление; при полных — ждёт полной.
  Не больше 2 сердец за уровень. Без `carry` чаша обнуляется на новом уровне.
- Видно: маленькая чаша у сердец, наполняется красным.

### TALLY STICK · `tally`
Каждый N-й попавший удар головой бросает вдвое сильнее.

| Ступень | params | В игре |
|---|---|---|
| I | `{ every: 4, stun: 0 }` | *Every fourth blow that lands throws twice as hard.* |
| II | `{ every: 3, stun: 0 }` | *Every third.* |
| III | `{ every: 3, stun: 1, r: 1 }` | *And stuns everyone beside the man it throws.* |

- Хук: `headbuttHits` — счёт `+1`, если удар задел хотя бы одного врага (пропы, двери, эхо не считаются).
  Когда счёт = `every - 1`, следующий удар заряжен и остаётся заряженным, пока не попадёт.
  Заряженный: импульс × 2; III — `daze(stun)` всем в `r` тайла от цели.
- Видно: засечки на иконке у сердец; рога светятся (`PALETTE.fireHi`), пока удар заряжен.

---

## Приёмка всего набора

- Все 17 записей в `ARTIFACTS`, у каждой три `desc` и `params`, ни одного числа вне `tuning.js`.
- Проверка синтаксиса всех файлов, прогон генератора, `node tools/balance.js` — без ошибок.
- Строки в `JUICE` для каждого нового видимого эффекта, `JUICE.md` перегенерирован.
- В CLAUDE.md — абзац «The talismans» с перечнем хуков (как у FIRE AMULET и BOOMERANG).
- Проверка в браузере каждого через LEVELS + дев-выдачу талисмана: работает на всех трёх ступенях,
  снимается при смене талисмана на стуле.
