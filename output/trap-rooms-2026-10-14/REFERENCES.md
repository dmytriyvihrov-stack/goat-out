# Trap rooms: how other games build them (14 Oct 2026)

Gathered by three research agents for the polish of THE FACTORY's machine rooms (js/machines.js, js/factory.js).
Background reading, not a spec. Search quality was uneven: wiki pages and reviews were read, most GDC talks were
login-gated or not found, and some points are paraphrases of snippets (marked *para*). Sources at the foot.

## What the games do

| game | traps | the tell | do they hurt the cult? | what to take |
|---|---|---|---|---|
| Enter the Gungeon | spikes, trapdoors, flame jets, flame pipes, rotating fire, cave-ins, crushers, chandeliers, logs, saws | mostly a plunger, a switch, a marked X, a pinch; little sound | several do (cave-in, crusher, chandelier, log); the crusher fires for enemies too | the player arms many of them himself (a shot), so he chooses the moment |
| The Binding of Isaac | spikes, retractable spikes, pressure plates | the plate itself | spikes hurt walking enemies (small damage) | one plate type a room, then mixed; a plate turns a trap into a puzzle |
| Hades | spike plates, dart traps, explosive urns | a plate, then a short delay | yes, and far harder than they hurt Zagreus | cheap for the player to dodge, expensive for the enemy: luring pays |
| Spelunky 1/2 | arrow traps, crush traps, rolling spikeballs, webs | a zone you can spot ahead of time; 2's crusher pauses before it moves | yes, enemies and thrown things set them off | Derek Yu: let enemies "trigger traps for you"; fairness is "spotted ahead of time" |
| Dead Cells | lava, spikes, flails, logs, plants, barrel dispensers | a shine, a yellow mark, a red aura, short and visual | most do; toxic pools hurt only the player | the telegraph is short and visual; the hazard is aimed at enemies as much as at you |
| Mega Man 2, Metal Man | conveyors (about half the floor), five presses | the press "does exactly what you think it does"; the boss flips the belt on a screen flash | no | one machine first, empty screens between; criticised because it never combines |
| Into the Breach | water, chasms, push mechanics | every attack drawn with arrows before you act | the whole game is pushing them into hazards | the push's side effects matter more than its damage; deaths should feel "your own fault" |
| Katana Zero | lasers, turrets | a switch first, then chained | enemies can be knocked into lasers | taught alone with an off switch, chained later |
| Mark of the Ninja | lights, noise | the reach of a noise drawn as a ring | n/a | show the reach of a threat before it matters; rooms about one screen |
| Ape Out | the walls themselves | n/a | the walls are the kill | criticised for a stretch with too little cover and too many spawns along it |
| Hyper Light Drifter | pits, spike rooms | n/a | n/a | sharpest complaints: instant pit deaths, a dash window too narrow |
| Hotline Miami 2 | n/a | n/a | n/a | wide rooms with scarce cover read worse; a machine room needs more than one approach |

## The rules that held across them

1. Teach one machine alone, then combine. Never introduce and combine in the same room (Isaac, Metal Man, Katana Zero).
2. Every lethal machine shows its next state before it can matter, seen AND heard, and the tell's weight matches the danger.
3. The lane that will close is readable from the doorway, at rest, not only during the warning (Spelunky's "spotted ahead").
4. The trap costs the cult more than the goat (Hades' ratio). That is what makes luring the fun.
5. Let the cult set the traps off and walk into them; the room fights itself (Spelunky, Gungeon's crusher).
6. A timing window at least as long as the crossing needs; never a narrow window on the only path (HLD).
7. Switch a timing gate off once its room is solved; a live gate after the fight is the commonest complaint.
8. Leave cover and more than one approach (Ape Out, Hotline Miami 2).
9. The machine is both obstacle and weapon (Into the Breach, Katana Zero).
10. The kill reads as the machine's: hit-stop, a short shake, a layered sound (build, impact, release), a mark left.

## What shipped from it (14 Oct 2026)

- **Heard as well as seen.** A press's and a ram's warning is a hydraulic build the length of the warning, ending on the
  slam (`Foley.hydraulic`, `sfxHydraulic`); the jaws drawn back vent (`vent`); a burner about to catch hisses with the
  igniter ticking (`gas`, a whole room of them once); a room's machines stopping wind down (`winddown`). All placed by
  `heard` and silent from a room he cannot see.
- **Hazard tape** along both edges of a press's band and a ram's strip while it runs (`Machines.drawTape`,
  `TUNING.machine.tape`): the lane is read from the doorway before it moves. The amber warning goes over it.
- **A lamp on every mount** (`Machines.drawLamp`): green open, amber blinking through the warning, red on the blow,
  amber drawing back, dark once stopped.
- **Juice**: sparks off the seam when the jaws meet, steam off the mounts as they draw back, and the jaws stay red
  with the men they crushed (`m.blood`).
- **The room solved, the machines stop** (`TUNING.machine.stop`, `Machines.halt`): every press, ram and burner of a
  room that had men in it finishes its stroke and stops open and cold once they are all dead; its tape goes, its lamps
  go dark, the room says so once (`winddown`). The belts keep running.
- **One machine first.** THE FACTORY's trap rooms are now THE LESSON (one of each, nobody in it), THE CRUSHER (one
  press) and THE BURNERS (one machine), then THE PRESS GATE (press and belt), THE LINE, then rooms of one idea each:
  THE BELTS (five lanes into fire), THE GRILL (150 burners in a wave), THE HAMMERS (rams down both walls), THE CATWALK.

## Ideas from it, not built

- **A plate press** (Isaac, Hades, Gungeon's crusher): a press that slams only when something stands on its plate, so a
  man walking over it, a crate thrown on it or the goat sets it off. The cult setting off its own trap.
- **The belt that turns** (Metal Man's boss): a belt reversing on an amber flash, its chevrons blinking first.
- **A switch in the room** (Katana Zero, Gungeon's plunger): a lever the goat butts to stop one machine early, or to fire it.
- **THE FEED** (an agent's room idea): a belt carrying men toward a press, the goat at its end shoving the ones that
  step off back on.
- **Burner herding**: men read a glowing grate as a trap and step off it; a row of grates whose only cold lane leads
  them past a press.

## Sources

enterthegungeon.wiki.gg/wiki/Traps · bindingofisaacrebirth.wiki.gg/wiki/Spikes · hades.fandom.com (Tartarus, snippets) ·
spelunky.fandom.com/wiki/Traps · deadcells.wiki.gg/wiki/Hazards · gamedeveloper.com/design/fairness-discovery-spelunky ·
tinysubversions.com/spelunkyGen2 · boristhebrave.com/2019/07/28/dungeon-generation-in-enter-the-gungeon ·
intothebreach.gamepedia.com/Water_Tile · gamedeveloper.com (Road to the IGF: Into the Breach; Ape Out; Super Meat Boy) ·
gamedeveloper.com/design/-i-mark-of-the-ninja-i-s-five-stealth-design-rules · themmnetwork.com/?p=2292 ·
strategywiki.org/wiki/Mega_Man_II/Metal_Man · pcgamer.com/ape-out-review · gamereactor.eu/ape-out-review ·
techraptor.net (Hyper Light Drifter review) · pushsquare.com (Hotline Miami 2 review) · trueachievements.com (Katana Zero).
