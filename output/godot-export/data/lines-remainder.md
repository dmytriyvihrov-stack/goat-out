# Lines not in lines.json (session 4 remainder)

Every `fillText(<string literal>, ...)` in js/*.js with a capitalised literal that is not a value in `data/lines.json`: UI labels, menu rows, prologue and card text, floor words built in code. Found by `node tools/godot-export/lines.js` + a regex scan (single-line calls only; strings built from pieces, `${}` templates and helpers such as `say()` or `wrapFloor()` are not seen and are for the sessions that port each screen).

Total: 120 literals in 11 files.

| File | Count |
|---|---|
| js/beasts.js | 1 |
| js/codex.js | 4 |
| js/endboss.js | 2 |
| js/heaven-home.js | 1 |
| js/heaven.js | 10 |
| js/input.js | 2 |
| js/painting.js | 5 |
| js/photo.js | 1 |
| js/render.js | 89 |
| js/sacrifice.js | 1 |
| js/talismans.js | 4 |


## js/beasts.js

- beasts.js:1377 `${K.i + 1} / ${K.lines.length}`

## js/codex.js

- codex.js:691 `HEADBUTT TO DESTROY`
- codex.js:883 `I · OPEN STATS`
- codex.js:1069 `UNLOCKS`
- codex.js:1071 `${this.found()} OF ${all.length} FOUND`

## js/endboss.js

- endboss.js:947 `BAAH ENDS THE SUPPER`
- endboss.js:954 `${game.tapWord} TO SKIP`

## js/heaven-home.js

- heaven-home.js:430 `${poured} / ${P}`

## js/heaven.js

- heaven.js:1428 `THE OVERLOOK`
- heaven.js:1429 `THE OVERLOOK`
- heaven.js:2798 `THE PASTURE ABOVE`
- heaven.js:2799 `THE PASTURE ABOVE`
- heaven.js:2809 `+${H.tally} ${H.tally === 1 ? 'SACRIFICE' : 'SACRIFICES'} FOR THE GOD`
- heaven.js:2886 `THE GOAT ABOVE`
- heaven.js:2900 `${K.i + 1} / ${K.lines.length}`
- heaven.js:3035 `MAX`
- heaven.js:3101 `LOOK AWAY`
- heaven.js:3171 `v${BUILD}`

## js/input.js

- input.js:368 `CONTROLS`
- input.js:370 `Click a row, then press the key or mouse button you want. ESC cancels.`

## js/painting.js

- painting.js:206 `LEVEL ${m.level}${m.dark ? ' · THE DARK' : m.trip ? ' · THE TRIP' : ''}`
- painting.js:333 `${(QUESTS[kind] || {}).name || kind.toUpperCase()} IS WON`
- painting.js:508 `RUN CODE  ${card.code}`
- painting.js:578 `LEVEL ${m.level}${m.canon ? ' · ' + m.canon : ''}${m.dark ? ' · THE DARK' : m.trip ? ' · THE TRIP' : ''} · ${m.kills} sacrificed in ${m.time.toFixed(1)}s`
- painting.js:580 `DOOMED GOAT · seed ${m.seed}`

## js/photo.js

- photo.js:134 `PHOTOS`

## js/render.js

- render.js:2053 `FEWER OF THEM. A LAMP OR TWO TO A ROOM.`
- render.js:2067 `AGAIN. AND AGAIN.`
- render.js:2249 `NO WAY BACK`
- render.js:5011 `WALK`
- render.js:5012 `FIGHT`
- render.js:5047 `PICK A SOUL  · CLICK: ON HIM / OFF HIM`
- render.js:5093 `GOD MODE`
- render.js:5254 `DEATHS  ${st.burst} BURST · ${st.bleed} BLED  (burst: 2 hearts < ${TUNING.dev.burstGap}s)`
- render.js:5256 `SOMETHING NEW  ${dry}s AGO${hungry ? '  · DRY: THE UNSEEN COMES FIRST' : `
- render.js:5273 `GOD MODE`
- render.js:5335 `ROOMS, WHERE EACH MAY STAND`
- render.js:5337 `dim tick: where the generator deals it by itself · bright: set here (saved to js/tuning.js ROOM_LEVELS) · RESET gives it back`
- render.js:5372 `COMBOS, A MAN AND A ROOM, OR MEN TOGETHER`
- render.js:5374 `${Math.round(CB.chance * 100)}% of floors deal one, only of men met on earlier floors · PLAY lays it on its floor (this one if it may) and stands him at its door`
- render.js:5397 `LINKS, WHAT MEN DO BESIDE EACH OTHER`
- render.js:5399 `PLAY sets the pair up beside him on the floor (GOD on is kinder) · the numbers are TUNING.links`
- render.js:5404 `${L.name}  ·  ${L.men.join(' + ')}`
- render.js:5415 `THE MIRROR, WHAT HEAVEN SELLS`
- render.js:5417 `${M.sacrifices} sacrifices · ${M.souls || 0} souls in the heap · a rank button sets it now, free · saved in this browser`
- render.js:5432 `TRY IT HERE`
- render.js:5472 `HORN TOOL · `
- render.js:5530 `${(R / TILE).toFixed(2)} TILES`
- render.js:5681 `PIXEL ART CHECKLIST`
- render.js:5758 `THE JUICE`
- render.js:5851 `PAGE ${page + 1} / ${pages.length}`
- render.js:5962 `WHAT THE GENERATOR PROMISES`
- render.js:5964 `every rule against every level · one sample each, seed ${d.sampleSeed} · fire holds, blood broken, ash not this level`
- render.js:6028 `DIFFICULTY`
- render.js:6052 `HOLLOW TOP = OPEN GROUND (little to fight with)`
- render.js:6071 `total ${lv.total.toFixed(0)}`
- render.js:6072 `worst room ${lv.plainPeak.toFixed(1)}`
- render.js:6078 `ground ${lv.ground.early.toFixed(2)}→${lv.ground.late.toFixed(2)}`
- render.js:6124 `ALL BALANCE RULES HOLD`
- render.js:6125 `${rep.fails.length} RULE FAILURES`
- render.js:6150 `${def.sub.toUpperCase()}, ${def.name}`
- render.js:6162 `CANON: ${def.canon.name}`
- render.js:6190 `MODS`
- render.js:6204 `THE WORDS EACH FLOOR OPENS ON`
- render.js:6248 `ROOMS: CLICK ONE TO OPEN IT`
- render.js:6278 `${r.index} ${r.role.toUpperCase()}`
- render.js:6295 `SCRIPTED`
- render.js:6325 `×${v.toFixed(2)}`
- render.js:6416 `THE BESTIARY`
- render.js:6418 `read and edited live off TUNING · the portrait is the same drawEnemy call the game itself uses · click a number to change it`
- render.js:6476 `threat ${THREAT[k.tag] === undefined ? '-' : THREAT[k.tag]} · levels ${lv.length ? lv.join(',') : '-'}`
- render.js:6478 `cycle ${cycle(k.tag, k.cfg).toFixed(2)}s`
- render.js:6523 `with a soul: ${k.hp + S.hp} hearts (+${S.hp}) · knocked ${Math.round(S.flingMul * 100)}% as far · never carried${traits.length ? ' · ' + traits.join(', ') : ' · no traits yet'}`
- render.js:6546 `THE GOAT`
- render.js:6595 `THE UPGRADES`
- render.js:6726 `(no params of its own: its numbers are TUNING's, in the line above)`
- render.js:6779 `STATUSES AND REACTIONS`
- render.js:6781 `read and edited live off TUNING.status · click a number to change it · js/status.js is the code`
- render.js:6808 `WHERE TWO MEET`
- render.js:6839 `${NAMES[a]} + ${NAMES[b]}, ${R.name}`
- render.js:6849 `WHERE IT COMES FROM`
- render.js:6864 `the hold time of VENOM JAW and SUPERHOT, and the SPIT cooldown, are the boons' own params on the BOONS tab`
- render.js:6955 `THE FIXTURES`
- render.js:6957 `every prop kind, read live off TUNING · badges are what can reach it, the note is what happens when it does`
- render.js:7017 `THE ANIMALS`
- render.js:7020 `this run's deal (seed ${(game.runSeed >>> 0).toString(36)}${game.beastEarly ? ', level 2 cleared before' : ''}): ${dealt} · never one kind twice`
- render.js:7046 `floors ${floors.join(', ') || '-'}${DARK_LEVEL.beasts && DARK_LEVEL.beasts.includes(k) ? ', THE DARK' : ''}`
- render.js:7070 `${LEVELS[li].name} · ROOM ${r.index} · ${r.role.toUpperCase()} · ${r.name}`
- render.js:7431 `GET BACK ${TUNING.shop.heals} HEARTS`
- render.js:8080 `${game.tapWord} TO SKIP`
- render.js:8102 `${game.tapWord} TO SKIP`
- render.js:8779 `INSTEAD OF `
- render.js:8799 `BODY`
- render.js:8885 `RELEASE THE SOUL`
- render.js:9325 `HORNS: ${HN.name}  ·  ${HN.note}`
- render.js:9327 `WINDUP ${sayN(H.windup * M.headbuttWindup)}s · RECOVERY ${sayN(H.recovery * M.headbuttRecovery)}s · REACH ${M.headbuttReach >= 1 ? '+' : '-'}${sayN(Math.abs(M.headbuttReach - 1))} TILES · LUNGE x${sayN(HN.lunge)} ·${HN.rows ? 'TWO ROWS, TIPS x' + sayN(HN.tipMul) + ' SHAFTS x' + sayN(HN.shaftMul) : 'ARC ' + Math.round(Math.acos(HN.cone) * 360 / Math.PI) + '°'}`
- render.js:9395 `${game.timer.toFixed(1)}s`
- render.js:9405 `LEGS TIED · `
- render.js:9420 `${seedTxt} · v${BUILD}`
- render.js:9427 `v${BUILD}`
- render.js:9602 `THE GONG`
- render.js:9821 `MOVE`
- render.js:10082 `PAUSED`
- render.js:10115 `SETTINGS`
- render.js:10128 `BACK`
- render.js:10205 `LEVELS`
- render.js:10217 `BACK`
- render.js:10225 `${D.darkOf + 1}. \u{1F56F} ${D.name}`
- render.js:10239 `\u{1F344} THE TRIP`
- render.js:10251 `${li + 1}. ${asTrip ? 'THE TRIP' : def.name}`
- render.js:10260 `☠ ${endName} · MEETING ${EndBoss.meetFor(game, li)}`
- render.js:10283 `BEST`
- render.js:10307 `WHOLE RUN`
- render.js:10312 `${game.tapWord.toLowerCase()} to go back`
- render.js:10523 `RUN CODE  ${card.code}`

## js/sacrifice.js

- sacrifice.js:178 `INTO THE DARK`

## js/talismans.js

- talismans.js:733 `THE TALISMANS`
- talismans.js:735 `${ARTIFACTS.length} on the mouse's shelves, up to ${TUNING.talisman.slots} worn · WEAR puts one at his neck · click a number to change it · click the rarity to step COMMON, RARE, EPIC · click the shelf line to rewrite it · the ${CAPES.length} capes below`
- talismans.js:740 `WHAT IT SAYS ON THE SHELF · WHAT IT DOES IN FULL · ITS NUMBERS`
- talismans.js:780 `THE CAPES · ONE ON HIS BACK · Q`
