# BACKLOG — asked for, not built

`CONCEPT.md` is what the game is. This file is what the last person to play it said afterwards, kept in
his order and written out far enough that a session can take any line off it and build the thing without
asking him again. Nothing here is in the build. An item leaves this file when it ships — the reasoning
then goes to `CHANGELOG.md` — or when it is decided against, and the reason goes in its place.

Batches are dated. Tags: **bug**, something is wrong; **feel**, it works and does not read; **number**,
it works and the number is wrong; **system**, it does not exist yet.

---

## 14 September 2026 — a long sitting with 1.3

**Where this batch went: all of it shipped in 1.4 except two.** The soul barrier was asked for and
parked the same day (below, with the reason), and the endless roll against a wall did not reproduce —
pressed against a wall with the key mashed the cooldown holds, three rolls in three seconds, exactly as
on open floor. Everything else is in the build; `CHANGELOG.md` carries what each one turned into. The
entries stay here because the reasoning behind them is worth keeping.

### Kept, and worth protecting

**The wraith goes through the walls.** Called out unprompted as the best thing in the build. It is the
one enemy whose rule the ground does not cover, and the cost of that rule — that it can only become a
body behind you, and cannot form inside stone — is what makes it readable. Anything that later wants to
give mist a wall to respect is arguing with this line.

### bug — a thrown man ends up inside the wall

Hold a man, walk up to a wall, throw: he finishes in the stone instead of dying against it. The cause is
the hold and not the throw. `Goat.update` puts the held man at `goat + aim * (holdDist + r * 0.4)` every
frame and never asks the world whether that point is floor (`js/entities.js`, the grab/hold/throw block).
Face a wall from close and he is already standing inside it before you let go, so the throw starts inside
it. Fix at the hold: sweep the hold point back toward the goat until it is on floor, and let the throw
keep starting from wherever the man actually is. A throw that has a wall in it is supposed to be the best
throw in the game — this is the one place it silently is not.

### bug — an endless roll against a wall — not reproduced, 14 Sep 2026

Pressed up against a wall, the roll is said to come back with no cooldown. **Measured and it does not.**
Driven from the harness with `rollPressed` set every frame for three seconds, hard against a wall and
then on open floor: three rolls both times, `rollCd` 1.05 s at the end of each, against a 1.35 s
cooldown. `rollCd` is written in exactly one place and nothing clears it.

So it is something the measurement did not have: a tome (LOOSE JOINTS takes the cooldown to 0.61 s), the
gong on top of it (another ×1.5 off every cooldown as it ticks, so 0.4 s — which is fast enough to read
as endless), or a different meaning of *pressed against a wall*. Worth asking him which, before
changing a number that is behaving.

### number — the door between rooms should take three blows, not one

He called it the wooden section between levels: the door in a corridor. `Prop.smash` breaks it on the
first hit and floors whoever waited behind it. Three blows instead. The door is the one thing in a
corridor that can hold you still, and holding you still in a corridor for two more beats is worth more
than the shortcut is. The men who shoulder doors open from their side are unaffected — that is
`openPressure` and a different clock.

### number — the second cage should break too, and faster

The small shut cage across the first room is scenery: `deco` bars that wobble when hit and never open.
Make them break — fewer blows than the pen's seven, and no stun on the way. The pen teaches the verb the
hard way; a second cage that gives in quickly is the reward for having learned it, and it is the only
thing in that room the goat can do for the sheep in it. It needs its own `hits` under
`TUNING.prop.deadCage` and its own break path: `deco` also keeps those bars out of the gate and out of
the in-front-of-the-goat draw pass, so the flag stays and `breakCage` learns about a second cage rather
than losing its exclusion.

### feel — the speed tome has to look fast

SURE HOOVES multiplies top speed by 1.18 and nothing on the screen changes, so the best passive in the
game reads as nothing at all. The smear is already there and already spent: `Goat.trail` keeps seven
ghosts at one every 0.028 s while he is over 55% of top speed, and `drawGoat` draws them. Hang its count,
its rate and its opacity off `game.mods.speed`, so the tome lengthens the smear rather than only the
number. It is body work with no button, which means the trail is the whole of its feedback.

### feel — the hound's bite is too quick to read

`TUNING.dog.windup` is 0.3 s and the bite lands before the eye has the tell. Slow the windup and leave
everything else alone: the dart is what you are supposed to read, and the bite should be the beat after
it rather than part of it. Watch what it does to the pack — `packBusy` already lets one hound commit at
a time, so a longer windup makes a ring of three noticeably kinder. `tools/balance.js` will not catch
that, because it counts threat and not timing, so `THREAT.dog` may want to come down with it.

### feel — the camera swings too hard when the run changes direction

Enough of a swing to make him queasy. `updateCamera` leads the camera `camera.lead` (2.4 tiles) toward
the aim at `camera.lerp` 7. On a mouse the aim flips the instant the pointer crosses the goat, so the
lead point teleports across him and the whole picture follows it. Damp the lead itself — carry a second,
slower-lerped lead vector rather than reading `input.aim` raw — or scale the lead by run speed so a turn
on the spot moves the camera nothing. The pull-back at speed is not the problem and should survive.

### system — spike floors, from level 3

Prince of Persia: spikes that come up out of the floor, in ordinary parts of the map and in rooms that
have men in them, and specifically **where you have already walked** — the trap is behind you rather
than in front of you. Men read them and walk round them while they are up, and a man can sometimes still
be baited onto them. That last clause is the feature: it is another way for the room to do the killing.
The AI half is mostly built — `hazardAt` already answers what will kill whoever stands at a point,
`avoidHazard` already handles both walking into it and standing in it, and the once-per-encounter
`trapSense` roll already produces the one man in a crowd who blunders in anyway. A spike tile joins that
list. Open: whether they are on a cycle like the Mill, or armed by the goat's own path.

### system — a new sixth level, and the floor opens

**A new level, and it goes in at six.** It reads as being up high: windows in the walls and holes in the
floor, men thrown out through both, and the goat able to go through them too. Falling is not death — you
come back at the point you went in and it costs a heart, the same price the Mill charges. That price is
what makes a hole something you can use rather than something you edge around, and it is the first thing
in the building that kills men without touching the ground.

**THE OSSUARY moves to seven and stays the finale.** Settled 14 Sep 2026: the drop goes in ahead of it
rather than behind it, so the last ground is still the one enemy the rest of the game does not prepare
you for. The run becomes seven levels long.

What it costs to build: a `LEVELS` entry between THE BRIDGE and THE OSSUARY, its own room pool (holes
want hand-authored rooms), a tile kind the flow field and `collideCircle` treat as a wall for men and as
a fall for the goat, a throw that carries a man over the edge, and `tools/balance.js` agreeing it is
harder than THE BRIDGE and easier than what now follows it — inserting a level in the middle of the
curve is the part most likely to fail, and it fails loudly, which is the point of that script. `met` is
computed in `LEVELS` order, so the new level inherits everything the first five introduced and must
introduce nothing the Ossuary was relying on being new. `CONCEPT.md` then says seven levels, and its
table gains a row.

The level has to say plainly that the floor can open before it asks you to use that, which is a
rendering problem as much as a design one.

### system — fire jumps once between men

A man who is alight sets fire to the first man he touches, and that man sets fire to nobody. One hop,
never a chain. Burning men already blunder — fire takes the wheel and they walk through whatever is in
front of them — so the contact happens on its own; what is missing is the pass and the stop. A man lit by
a man carries a flag that `ignite` refuses to pass on again. A whole room going up in one brazier is the
thing this is deliberately not.

### ~~system — the soul barrier, from level 3~~ — parked, 14 Sep 2026

Asked for: a barrier that only opens if you took 80% of the souls in the rooms behind it. **Decided
against the same day.** Gating the way out makes some levels no fun to run through, which is the same
objection pillar 1 makes — *skipping a room is valid and sometimes correct*. A gate that counts bodies
turns every run into a clearing job.

Kept here so it is not re-proposed. If something like it ever comes back, it comes back on a door that
guards something optional — a tome, a bowl, a shortcut — and never on the exit.

### system — a score at the end of every level, and a total at the end of the run

Settled: **both.** Each level ends on its own score, and the run ends on the sum of them. The level-clear
card already carries the raw material — `N sacrificed in X s` — and becomes a score card; the win card
stops being `totalKills` and deaths and becomes the run's total.

What a score is made of is time and kills, and **the weighting is the whole design of it**: a score that
pays for bodies argues with *run, don't fight*, because the best run becomes the one that clears every
room. Time has to be the axis and kills the multiplier, so that going faster is never the wrong thing and
killing on the way is what makes a fast run a good one. A proposal to argue with: time scores against a
par for the level, kills raise the multiplier, and a clean fast run beats a slow massacre.

### system — BEST, on the title screen

A third thing on the menu next to NEW GAME and CONTINUE, holding the best score and the best time for
each level. `drawTitle` refills `menu.rects` every frame and `menuAt` / `menuPick` are the only ways in,
so a third entry is cheap; the page behind it is a table of levels against two numbers, drawn by the same
hand as the title and leaving the same way.

It needs a record of its own in `localStorage` beside `SAVE_KEY` — per level, the best score and the best
time — written at `levelCleared` and wrapped like every other storage call, so a browser that refuses
storage shows a BEST with nothing in it rather than breaking the menu. A level never played shows a dash.
Deciding needed: whether NEW GAME wipes it along with the run (it should not — a record survives the
runs that set it).

---

## 14 September 2026, later — while 1.4 was being built

Sent one at a time while the work was going on. All of it shipped in 1.4.

### bug — a man in your mouth was safe from everything

Two of them, and they were the same hole: the branch that runs a held man sits above every other state
in `Enemy.update` and returned before anything else could touch him. So **a mage standing in his own
witchfire did not burn**, and neither did anyone else you carried through a fire. The branch ends with
the fire check now, and whatever catches comes straight out of the mouth — which is the counter to
carrying a mage at all.

### bug — the held mage's fire followed the goat

The rune was dragged along under him every frame, so it went off under the goat wherever the goat had
run to. It is planted where he started painting it now. Keep moving and you leave a trail of it behind
you; stand still and you are standing in it. That is the difference between a mage being a death
sentence and a mage being a thing to be handled.

### feel — enemies had no back

Inside two and a half tiles a man saw you wherever you stood, which took away the one thing his cone was
for. The cone holds at every range now, and what gives you away behind a man is noise — which the noise
system already turns him toward. Stealth is never the plan and is always available.

### bug — clubs came through walls

`meleeHit` asked only for reach and an arc. It asks `game.reaches` now: line of sight plus every
blocking prop against the segment. The goat's horns are held to it too — a man behind a table is behind
it, both ways round.

### bug — a carried shield did not stop anything (with a screenshot of it not stopping anything)

It was a disc the size of the shield, hung 26 px in front of the goat, so almost everything aimed at him
went past its edge. It is an arc across his front now — `weapon.coverR` / `coverArc` — every turn spends
a charge, and a club that lands on it staggers the man who swung. His back is still his back.

### system — a death costs one tome, not the run

Asked for as "минус один том, как было в начале уровня". `startLevel` snapshots what he walked in with
and `restartLevel` returns that list minus its newest entry, so a tome picked up in the level that
killed you goes with it. The death card names what went.
