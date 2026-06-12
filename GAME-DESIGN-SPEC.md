# GRID DOWN: GET HOME — Final Design Specification

A Game Boy-style top-down survival adventure. Companion game to Grid Down (NyxTools).

---

## 1. Concept

It is 4:17 PM on a Tuesday when the grid fails — and you are 38 miles from home. Walk home east across five regions of slow-rolling collapse: downtown, the rail corridor, a strip-mall town, a held river crossing, and the cold rural last leg. Manage Water, Food, Warmth, Energy, and Health in real time. The dungeon keys are a crowbar, boltcutters, a filter straw, and a flashlight. The monsters are stray dogs, opportunists, a toll crew, and the cold. No zombies. No melodrama. When you reach your porch, the ending card reads: "Their 30 days start now. Play Grid Down."

Pillars (inherited from Grid Down): Tuesday-not-doomsday realism; trade-offs over optimization; tension over difficulty; understated tone. Mechanical signature: **daylight is the real currency** — every meter is a clock, and the nightly choice between a warm visible camp and a cold invisible one is the game.

---

## 2. Presentation

- **Logical resolution:** 160x144. Play area 160x128 (10x8 tiles of 16px) + 16px top HUD strip.
- **Palette (DMG 4-shade green):** `P0 #0f380f` (darkest), `P1 #306230`, `P2 #8bac0f`, `P3 #9bbc0f` (lightest). All art uses indices 0-3.
- **Palette remaps (the GB trick — no new colors):**
  - DAY: `[0,1,2,3]`
  - DUSK / PRE-DAWN: `[0,1,2,2]`
  - NIGHT: `[0,0,1,2]`
  - DARK INTERIOR / UNDERPASS: `[0,0,1,2]` + vision-radius dither mask (outside radius, draw 2x2 checker of P0).
  - CRISIS (2+ conditions active): force one ramp darker than current phase.
- **Tiles:** ~48 unique 8x8 pixel tiles composed into ~40 16x16 metatiles. All pixel data as string-encoded arrays ("0123" chars), decoded to one offscreen atlas canvas at boot. No image files anywhere.
- **Movement:** grid-locked, 1px/frame at 60fps = 16 frames/tile (Link's Awakening cadence). Slowed states: 24 frames/tile. Sneakers loadout: 14 frames/tile.
- **Screen transitions:** Zelda-1 directional scroll-flip, 24 frames, entities frozen. Interior enter/exit: 16-frame palette-step fade.
- **Scaling:** `image-rendering: pixelated`, integer only.
  - Portrait phone: `scale = floor(min(W/160, (H*0.60)/144))`; canvas letterboxed at top; bottom ~40% is the control deck (drawn into the same canvas, hit-tested in input module — one render path, no DOM widgets).
  - Desktop/landscape: `scale = floor(min(W/160, H/144))`, centered, keyboard controls, touch deck hidden.
- **Night vision:** radius 4 tiles (dither outside). Flashlight ON: radius 6. Underpass/cellar: radius 2 without flashlight, 6 with.

---

## 3. Controls

Entire game playable with D-pad + A + B + START. No gestures, no tap-on-world, ever.

**Touch (primary, portrait PWA):**
- **D-pad** (left half of deck): 144 CSS-px cross, floating origin (pad center snaps to first touch, direction read relative to it, follows slides). 8-way touch collapsed to 4-way: axis priority with 1.2x hysteresis (must exceed other axis by 20% to switch) — no diagonal jitter.
- **A** (right, upper): 72px circle — context interact: talk / search / open / pry / cut / drink / read / confirm / sleep prompt. Context priority when facing a tile: NPC > container > door/gate > sign > water > pickup. A "!" cue sprite appears over the player when facing anything interactive (teaches itself).
- **B** (lower-left of A, GB diagonal stagger): 64px circle — use the equipped B-slot item (swing stick/crowbar, throw jerky, drink bottle, bandage, toggle flashlight). Assigned from Start menu, LADX-style.
- **START**: small pill centered below canvas — pause menu.
- Full multi-touch via pointer events (move + press A simultaneously). Hit zones never overlap the playfield.
- **Haptics:** `navigator.vibrate(10)` on A/B, 30 on damage, [30,40,30] on losing a full heart, 50 on item-get. Wrapped in feature check.

**Keyboard:** Arrows/WASD = D-pad; Z or J = A; X or K = B; Enter = START; Esc = START. No mouse.

**No run/jog button in MVP** (Gen-1 shipped walk-only; dogs are balanced around avoidance, not escape).

---

## 4. HUD (160x16 strip, y0-15; play area y16-143)

- **Hearts:** 4 heart glyphs (8x8) at x2,y1 — 8 half-hearts total. Empty/half/full states.
- **Meters:** four bars at y9-14, each = 5x5 icon + 22x4 bar (fill = value/100 * 22px, in P3 on P0 trough):
  - Water icon (drop) x2, bar x9-31
  - Food icon (can) x41, bar x48-70
  - Warmth icon (flame) x80, bar x87-109
  - Energy icon (zzz bolt) x119, bar x126-148
  - Any meter <= 20: its bar blinks at 2 Hz.
- **Right of hearts:** sun/moon phase icon (8x8) at x132,y1; day counter "D1".."D9" (8x8 font) at x144,y1. When a condition is active, the sun/moon slot alternates with the condition icon every 60 frames.
- **Dialogue box:** overlays bottom 48px (y96-143), 1px border, 18 chars x 3 lines, 8x8 font, 1 char per 2 frames, blinking advance arrow, A advances, max 3 boxes per beat.
- **Toasts:** item-get banner slides from HUD, 90 frames ("CROWBAR — Pry boarded doors. Swings hard.").

---

## 5. Time, Day/Night, Weather

- **Timebase:** 1 real second = 2 game minutes. **1 game day = 12 real minutes.**
- **Phases:** DAY 06:00-18:00 (6.0 min, DAY remap) -> DUSK 18:00-20:00 (1.0 min, DUSK remap; NPCs say their dusk line once: "Sky's going gray.") -> NIGHT 20:00-04:00 (4.0 min, NIGHT remap, vision 4) -> PRE-DAWN 04:00-06:00 (1.0 min, DUSK remap).
- **Run start:** Day 1, 16:17 (less than two real minutes of daylight — the first camp decision is the tutorial's climax).
- **Sleep window:** 19:00-04:00, at sleep spots only (Section 12). Sleep skips to 06:00 and saves.
- **Rain:** scripted Day 2, 12:00-20:00. From Day 4 on, 25% chance per day (rolled at dawn, falls 12:00-18:00). Rain = 2-frame dither overlay; doubles outdoor Warmth drain (poncho cancels the rain multiplier only).
- **First Frost (endgame pressure, from Concept B):** Day 4 dawn card: "Frost on the grass." From Day 4 on: night outdoor Warmth drain -12/min (was -8), unheated interior night -4/min (was -3), daytime outdoor Warmth regen +2/min (was +5). Ground tiles get frost dither during dawn phase.
- **Day cap:** at dawn of Day 9 the family evacuates. Arriving Day 9+ = "Empty House" ending (Section 14).

---

## 6. Survival Systems (exact rates; all per REAL minute / [per real second])

Meters 0-100. Start values: Water 70, Food 80, Warmth 100, Energy 80, Hearts 8/8.

**WATER** — moving -6 [-0.10/s]; idle -3 [-0.05/s]. Full lasts ~17 min of walking (~1.4 days). Sources: water bottle +40 (single use); town pump (E5, safe, free, A to drink, +35); creek/river tiles: face water + A: with Filter Straw +35 safe; without: +35 with 35% Gut Illness. At 0: -1 half-heart/45s and Energy drain x1.5.

**FOOD** — awake -3 [-0.05/s]. Full lasts ~33 min (~2.8 days). Granola bar +15; jerky +25; canned food +35 with can opener, +17 if pried with crowbar (spills half — preppers will grin); hot meal (can cooked at a lit fire, 5s hold-A) +45 and +10 Warmth; church soup (18:00 daily at C5) +60. At 0: Energy capped at 30 and -1 half-heart/90s.

**WARMTH** — daytime outdoors +5/min up to 100 (frost: +2); daytime indoors neutral; night outdoors -8/min [-0.133/s] (frost: -12); night unheated interior -3/min (frost: -4); rain x2 outdoor multiplier (poncho negates the multiplier); within 2 tiles of a lit fire +15/min; hoodie (Gym Bag loadout) +2/min offset at night. At <=20: walk slows to 24 frames/tile. At 0: -1 half-heart/30s. Cold is the most lethal system in the game, exactly like real life.

**ENERGY** — awake daytime -3/min [-0.05/s]; awake at night -5/min [-0.083/s] (pushing on costs extra); each weapon swing -2 flat. Only sleep restores it (to 90; car seat to 75). At <=20: walk 24 frames/tile, B-weapon disabled. At 0: collapse — fade out, wake 4 game hours later with Energy 40; if outdoors, lose 1 random consumable and -30 Warmth ("Your pack feels lighter.").

**HEALTH** — 8 half-hearts (GB Zelda display). Damage: dog bite 1 half (+15% Bleeding); human hit 2 halves; hazard tile (glass/wire/trestle gap) 1 half; exposure ticks above. Player i-frames: 60 after any hit; bite knockback 1 tile. Healing: bandage +2 halves (also stops Bleeding); sleep +2 halves IF Food >= 50 AND Water >= 50 after sleep costs; hot meal/stew +1 half. Every fight is a net resource loss even when you win — by design.

**CONDITIONS (cascades, the Grid Down DNA):**
- Thirsty (Water <= 20): Energy drain x1.5.
- Hungry (Food <= 20): Warmth drain x1.5 (no calories to burn).
- Cold (Warmth <= 20): walk 24 frames/tile.
- Exhausted (Energy <= 20): walk 24 frames/tile, no swings.
- Bleeding (15% per dog bite): -1 half-heart per game hour (every 30 real sec) until bandaged. Drip icon.
- Gut Illness (35% per unfiltered drink; onset 6 game hours later): Food and Water drains x2 for 24 game hours; meds cure instantly. "Your stomach turns."
- Injured (<= 2 half-hearts): dog aggro radius 3 -> 5 (they smell blood).
- **Two or more conditions active:** palette forced one ramp darker + low heartbeat SFX every 2s. No flashing alarms. Understated.

---

## 7. World

8x6 screen grid (cols 1-8 west-east, rows A-F north-south). 37 walkable overworld screens + 10 interiors = **47 authored maps**. Home is always east — the map is a line with loops, never an open field.

```
        1             2              3              4              5              6              7              8
  +-------------+--------------+--------------+--------------+--------------+--------------+--------------+--------------+
A |    ----     | RAILYARD N % | RAIL SIDING %|     ----     | WAREHOUSE ROW| TRESTLE WEST%| TRESTLE EAST | PINE HOLLOW  |
B | OFFICE PLAZA| FREIGHT ROW  | SWITCH YARD  | STRIP NORTH  | HARDWARE FRT | RIVERBANK N  | CREEK BEND   | HOLLER FARM  |
C | MAPLE & 3RD | MAIN ST WEST | OVERPASS     | PHARMACY BLK | CHURCH GREEN | TOLL BRIDGE  | COUNTY ROAD  | FARM FIELDS  |
D | GARAGE GATE | MAIN ST EAST | DOG ALLEY    | STRIP SOUTH  | GAS STATION  | RIVERBANK S  | DRY MEADOW   | CHECKPOINT   |
E |    ----     |     ----     | CULVERT PATH | MOTEL COURT  | TOWN SQUARE  | UNDERPASS W  | UNDERPASS E  | MAPLE LANE   |
F |    ----     |     ----     |     ----     |     ----     |     ----     |     ----     |     ----     | HOME STREET  |
  +-------------+--------------+--------------+--------------+--------------+--------------+--------------+--------------+
  ---- = not walkable.   % = behind a boltcutter chain gate.
```

**Regions:** R1 Downtown (B1,C1,D1,B2,C2,D2 — 6 screens). R2 Railside (A2,A3,B3,C3,D3,E3 — 6). R3 Millbrook Strip (B4,C4,D4,E4,A5,B5,C5,D5,E5 — 9). R4 Harlan River (A6,A7,B6,C6,D6,E6 — 6). R5 Cedar Run Rural (B7,C7,D7,E7,A8,B8,C8,D8,E8,F8 — 10).

**The river runs between columns 6 and 7 (rows A-D).** Exactly three crossings:
1. **Trestle** A6->A7 (chain gate on A5|A6 edge: boltcutters; plank-gap fall hazards; no people).
2. **Toll Bridge** C6->C7 (Reyes + one guard; pay 2 items / night sneak / fight).
3. **Underpass** E6->E7 (pitch dark, vision 2 without flashlight; wire hazards; one lurking opportunist).

**Special edges:** B6|B7 and D6|D7 blocked (river). E7|E8 blocked (collapsed sound barrier — all routes funnel through the D8 Checkpoint photo gate). Railyard pocket A2/A3 entered only via chain gates on A2|B2 and A3|B3 (boltcutters). All other adjacent walkable screens connect.

**Landmark rule (from B):** every screen has one memorable silhouette — office tower, jackknifed semi (C3), church steeple, brazier at the bridge, scarecrow (A8), grain silo (C8) — players navigate by memory.

**Interiors (10), each one 10x8 room:** Office Floor (B1, start), Parking Garage (D1, Get-Home Bag), Corner Mart (C2, glass door: smash = noise, or crowbar later), Rail Shed (D3, crowbar toolbox, dog-guarded), Pharmacy (C4, boarded: crowbar; Marta), Hardware Store (B5, back room boarded: crowbar; boltcutters inside), Church (C5, Deacon Ames, sanctuary), Gas Station (D5, flashlight + county map + matches), Holler Farmhouse (B8, dark cellar: flashlight), Your House (F8, ending).

**Screen data format:** each screen = one 80-char string (10x8) of legend chars + an entity/container table `{screenId: [{type, x, y, params}]}`. ~80 bytes/screen raw; ~30KB total maps module.

### Tile Legend (metatile chars used in map strings)

| Char | Tile | Solid | Interaction |
|---|---|---|---|
| `.` | grass | no | — |
| `,` | dirt path | no | — |
| `=` | road asphalt | no | — |
| `-` | sidewalk | no | — |
| `t` | tall grass | no | breaks human LOS (stealth) |
| `T` | tree | yes | — |
| `*` | debris pile | yes | — |
| `~` | water (river/creek) | yes | face + A = drink (straw check) |
| `P` | hand pump | yes | A = drink safe +35 |
| `#` | brick wall | yes | — |
| `W` | wood wall | yes | — |
| `f` | chain-link fence | yes | — |
| `G` | chain gate | yes | A + boltcutters -> open (90 frames) |
| `D` | door | yes | A = enter interior |
| `B` | boarded door | yes | A + crowbar -> `D` (90 frames, pry SFX, noise) |
| `g` | glass storefront | yes | A = smash -> open (NOISE EVENT) |
| `r` | rail track | no | — |
| `R` | trestle plank | no | — |
| `^` | trestle gap | no | step = 1 half-heart + 20-frame stun |
| `h` | glass hazard | no | step = 1 half-heart |
| `w` | wire hazard | no | step = 1 half-heart |
| `c` | car | yes | A = search trunk; some flagged `sleepable` (car-seat camp) |
| `d` | dumpster | yes | A = search |
| `v` | vending machine | yes | A + crowbar = loot (NOISE EVENT) |
| `s` | shelf (interior) | yes | A = search |
| `k` | desk/cabinet | yes | A = search |
| `x` | boxcar door | yes | A = search (railyard pocket) |
| `F` | fire pit / fireplace | yes | A + matches = light (burns until dawn) |
| `E` | bed / cot / pew | yes | A = sleep prompt (19:00-04:00) |
| `S` | sign / bulletin / note | yes | A = read |
| `O` | cache (disturbed earth/woodpile) | yes | A = search (cache table) |
| `I` | interior floor | no | — |
| `+` | exit doorway | no | step = leave interior |

**Noise events** (glass smash, vending pry, toll fight): all dogs on screen go ALERT toward you; screen flagged "noisy" until dawn (+1 camp Visibility if you sleep there).

---

## 8. Items and Gates (22 item defs)

**Pack:** starts 3 slots; Get-Home Bag -> 10 slots. No stacking, 1 item = 1 slot. Key items live in a separate key-item row (Zelda-style, no slots).

**KEY ITEMS / GATES:**
| Item | Location | Gates / use |
|---|---|---|
| Family Photo | Office desk, Day 1, auto-pickup in intro (cannot miss) | Checkpoint D8: guard turns strangers away; show photo to pass. Story payoff at the porch. |
| Get-Home Bag | Parking Garage (D1), your car trunk, tutorial | Inventory 3 -> 10 slots. Contains: stick, poncho, water bottle. |
| Crowbar | Rail Shed (D3 interior), toolbox, guarded by the Dog Alley pack | Pries boarded doors (`B`): Pharmacy, Hardware back room, house doors; pries vending (`v`); best melee; opens cans at +17. |
| Boltcutters | Hardware Store back room (B5, crowbar-gated) | Cuts chain gates (`G`): Railyard pocket A2/A3, Trestle gate A5|A6, fenced caches. The Metroidvania re-opener. |
| Filter Straw | Pharmacy (C4, crowbar-gated) | Safe creek drinking. Soft-gates Region 5, where creeks are the only water. |
| Flashlight | Gas Station (D5) | Toggled on B-slot. Night vision 4 -> 6; Underpass 2 -> 6; farmhouse cellar. Charge 100, -1%/sec while on. |
| Batteries (consumable) | Corner Mart (C2), loot tables | +100 flashlight charge. |
| County Map | Gas Station rack (D5) | Unlocks Start-menu map page (8x6 grid, visited screens lit, blinking player dot, intel marks). |
| Can Opener | Loot (Corner Mart / Pharmacy tables) | Cans +35 instead of +17. Not a gate; a quiet quality-of-life find. |

**TOOLS (slot items):** Stick (3 hits routs a dog; starter weapon), Matches (light `F` fire pits/fireplaces), Bedroll (sleep on any interior floor, warmth-neutral), Board Kit (3 uses; A at a door tile while camping = boarded door, -1 Visibility), Poncho (passive in pack; cancels rain Warmth multiplier).

**CONSUMABLES:** Water Bottle (+40), Granola Bar (+15), Canned Food (+35/+17), Jerky (+25; B-throw = dog distraction), Hot Meal (cooked can, +45 food +10 warmth), Bandage (+2 halves, stops Bleeding), Meds (cures Gut Illness), Batteries.

**QUEST:** Insulin (Pharmacy -> Holler Farm; Section 13).

---

## 9. Scavenging and Loot Economy

- **~90 containers** across the map, 8 archetypes: desk/cabinet, dumpster, car trunk, vending (crowbar), store shelf, boxcar (gated), cache, fridge/kitchen. Distribution: R1 18, R2 14, R3 26, R4 10, R5 16, caches 6.
- **One-time loot**, persisted as a bitset in the save; searched sprites flip to an "opened" frame. Search = 60 frames with rustle SFX + loot toast.
- Loot rolled per run-seed **within archetype tables** (pharmacy shelves always meds-class, never the same items) — route knowledge transfers between runs, autopilot does not.
- **Economy tuning:** total food on the map = ~1.5x what a 6-day run burns; but full-clearing costs days you do not have. Water west of the river = bottles + the town pump; east of the river = creeks only (Filter Straw pacing). You can be thorough or fast; never both.
- **6 hidden caches** (high-value, clue-gated): Boxcar (A2 pocket: bedroll, 2 cans), Warehouse fence (A5: board kit, batteries, can), Third Pew (Church: meds, 2 bars — note found in Pharmacy), Scarecrow woodpile (A8: 2 jerky, matches, poncho — clue from Hollers), Culvert (D7: 2 bottles, bandage — beggar intel), Farm Cellar (flashlight: 3 cans).

---

## 10. NPCs (9 named + 3 generic types)

Dialogue intent: terse, 2-3 boxes max, plain speech, no melodrama. ~2,800 words total.

| NPC | Where | Role / intent |
|---|---|---|
| Dale | Office Floor (B1 int.) | Cold open. "Breakers are fine. There's just nothing coming in." Sends you to your car. |
| Theo (kid w/ dog) | C1 | Teaches dog rules: "Don't run. They only chase if you run." Flavor: adults aren't scared yet. |
| Marta | Pharmacy (C4 int.) | Pharmacist guarding her stock. Gives Filter Straw freely; asks you to carry Insulin to the Hollers on your route. Warns about the bridge. |
| Deacon Ames | Church (C5 int.) | Hub. Soup daily at 18:00 (+60). Two fixed barters (2 cans -> meds; jerky -> bandage). Rumor lines telegraph the toll and the checkpoint: "They're checking faces at Cedar Run. Hope someone's expecting you." Sanctuary: church camp Visibility is always 0. |
| Reyes | Toll Bridge (C6) | Toll leader, tired not theatrical: "Two items. River's the only thing here that's free." Pay/sneak/fight logic in Section 11. |
| Ruth and Earl Holler | Farmhouse (B8 int.) | Insulin payoff: bed, hot stew (+45, +1 half), mark the Pine Hollow cache. Trade through a cracked door before trust. |
| Dee | Checkpoint (D8) | Neighborhood watch, polite, immovable: "Nobody comes through I can't place." Family Photo opens the road. Tone: people protecting, not preying. |
| Sam (spouse) + kid | Home (F8) | Ending scene; greeting lines vary by arrival day and karma. |
| Beggars (generic x2 variants) | Commercial screens, day, Day 2+ | Ask for food. Give = intel (cache mark or warning) + karma. Refuse = 20% becomes a Shadower. |
| Ambient walkers (generic) | Cols 1-2, Days 1-2 only | Wander AI, one-liners. They vanish Day 3 ("the streets empty out") — slow-collapse storytelling, nearly free to build. |

---

## 11. Threats (2 AI archetypes + scripted chokepoints + environment)

All actors use one 5-state machine: **WANDER -> ALERT ("!" bubble, 30-frame freeze — readable, fair) -> CHASE -> ATTACK -> FLEE/RESET.** Movement: greedy step with axis priority + 1-tile sidestep on block. No A*. Max 4 actors per screen. Actors never cross screen edges (leash = home screen); state resets on player re-entry but fed/routed/damage flags persist.

**STRAY DOGS** — 11 placed, finite, no respawns: D2 x1 (lone, telegraphed by Theo), D3 x3 (Dog Alley den, guards the crowbar), A2 x1, B7 x2, A8 x2, C8 x1, E7 x1.
- Aggro radius: 3 tiles day, 5 at night, 5 if player Injured (<= 2 halves).
- ALERT 30 frames (growl SFX) -> CHASE at 1.25x player walk (1 tile/13 frames) -> BITE when adjacent (8-frame lunge, 1 half-heart + 1-tile knockback, 45-frame cooldown, 15% Bleeding).
- Counters: **throw jerky** (B; lands 2 tiles ahead; any dog within 5 tiles paths to it, eats 480 frames, then calm forever — buying safety with calories, the purest trade in the game); **rout** (2 crowbar hits or 3 stick hits -> FLEE off-screen, gone for the run; 40% bite risk if adjacent during your swing cooldown — never killed, only routed: authentic, and sidesteps cruelty); **avoid** (route around, or enter any interior — dogs do not enter).

**OPPORTUNIST (one human AI, three modes — A's design, C's machine):**
- *Beggar* (day, commercial screens, 30% roll on screen entry, max 1, 1-day cooldown per region): approaches to 1 tile, dialogue box. Give food: +karma, intel (marks a cache or warns about a danger screen). Refuse: 20% converts to Shadower.
- *Shadower*: trails at 4 tiles; if adjacent behind you, snatches 1 random slot item and FLEES at 1.1x. One hit: drops it and despawns.
- *Prowler*: night camp event only (Section 12).
Humans hit for 2 halves, and always break and flee at low resolve — desperate people want your stuff, not a fight.

**TOLL CREW (scripted, C6):** Reyes + 1 guard, 4-tile LOS cones.
- *Pay*: surrender any 2 items -> permanent pass ("Reyes chalks an X on the rail.").
- *Sneak* (01:00-05:00): guard sleeps by the brazier (light radius 3); Reyes patrols a 4-tile vertical line. Tall grass + the bridge rail shadow line break LOS. First spot: pushed back to the west bank, warned. Second spot: fight triggers.
- *Fight*: each takes 3 crowbar hits, hits for 2 halves — the worst beating in the game; win and they withdraw for the run; karma flag, beggars stop offering intel.
- Or skip them entirely: trestle (boltcutters) / underpass (flashlight).

**CHECKPOINT (scripted, D8):** friendly gate; Family Photo passes you; without it Dee turns you back (no combat option — these are neighbors, and the game does not let you raid them; tone guardrail).

**ENVIRONMENT (the real killer):** night cold and First Frost, rain, hazard tiles (glass/wire/trestle gaps, 1 half each), dark zones, untreated water. Per the prepper truism: exposure kills before people do.

---

## 12. Camp and Sleep (the OPSEC system — the Grid Down signature)

**Sleep spots:** any `E` tile (beds, cots, the church pew, motel beds on E4), flagged `sleepable` cars (Energy to 75 instead of 90), or Bedroll on any interior floor. Sleeping outdoors requires the bedroll and a fire-pit screen.

**Sleep prompt (19:00-04:00, A at spot):** shows a one-line camp summary before confirming — `SLEEP UNTIL DAWN?  Fire: LIT  Door: OPEN  Visibility: 3` — the trade-off is taught, not hidden.

**Camp Visibility 0-5:** lit fire on screen +2; flashlight left on +1; sleeping outdoors or in a car +1; cooked at this fire tonight +1; noise event on this screen since dusk +1; boarded door -1 (min 0). Church is always 0.

**Sleep resolution:** one roll, `night event chance = 12% x Visibility` (max 60%).
- 60% **Prowler**: wake at 02:00, prowler at the door. Boarded: 30 seconds of handle-rattling (heartbeat SFX), he leaves. Unboarded/outdoors: he enters and takes 1 random slot item unless you step toward him and swing within 10 s — confronted, he flees (25% he swings first, 2 halves).
- 40% **Dogs**: two dogs at the screen edge. Hold still 10 s: they move on. Move: standard dog encounter.
- Warmth keeps draining during events.

**Sleep-skip costs (deterministic — no sleep simulation):** clock jumps to 06:00; Energy -> 90 (car 75); Food -15, Water -20 flat; Warmth: bed/bedroll indoors unchanged, indoors without bedroll -20, outdoors with fire +20, outdoors without fire -50; +2 half-hearts if Food >= 50 and Water >= 50 after costs; Bleeding/Gut tick once. Then **autosave**.

Cold dark camp = safe but bleeds Warmth. Warm bright camp = comfortable but advertised. Re-asked every night. That IS the game.

---

## 13. Story Beats and Quests

- **Day 1, 16:17** — text card ("Tuesday. 4:17 PM."), Office Floor: lights die (tile swap), Dale's two boxes, Family Photo auto-pickup at your desk, exit to Plaza (ambient walkers, normalcy), Garage: Get-Home Bag from your car (slots 3->10, tutorial toasts: move/A/B-assign/Start). Dusk falls almost immediately — first camp decision is the tutorial finale.
- **Days 1-2, Downtown/Railside** — Corner Mart choice (smash glass = loot now + noise lesson). Crowbar behind the Dog Alley pack: feed, rout, or culvert detour. Walkers vanish Day 3.
- **Day 2** — scripted rain 12:00-20:00 (first Warmth crisis). Beggars begin appearing.
- **Region 3** — Pharmacy: Marta, Filter Straw, **Insulin quest** (no hard timer — deliver by Day 4 for full payoff: bed + stew + cache mark; later: thanks + stew). Church hub: soup at 18:00, rumors telegraph the bridge and the checkpoint.
- **Region 4** — the crossing: the run's moral and routing centerpiece (pay / sneak / fight / trestle / underpass).
- **Day 4 dawn** — **First Frost.** Cold rates spike (Section 5). The endgame timer becomes something you feel.
- **Region 5** — the thirst squeeze (Dry Meadow), coldest nights, insulin payoff at Holler Farm, the Checkpoint (photo), Maple Lane, the porch.
- **Day 9 dawn** — family evacuates (Empty House from here on).

---

## 14. Win / Lose / Replay

**WIN:** step onto your porch (F8).
- Arrive by end of Day 4: **"Before the Wave"** (best — you beat the panic).
- Day 5-6: **"Homecoming"**.
- Day 7-8: **"The Long Way"** (strained epilogue).
- Day 9+: **"Empty House"** — note on the table; "Their 30 days started without you." (deliberate hook into Grid Down's Evacuated ending).
- Karma flags (insulin delivered, beggars fed, toll paid vs fought, dogs fed vs routed) swap epilogue lines and the family's greeting. All endings close on the cross-promo card: **"Their 30 days start now. Play Grid Down."**

**LOSE:** Hearts 0. The death card states plainly what killed you ("You stopped being cold around 3 AM."). Permadeath is default; **Second Wind** accessibility toggle (chosen at run start, stamped on the report): respawn at last sleep with -2 halves and -1 random consumable.

**Run length:** 5-6 game days = 60-90 real minutes, in 10-15 minute sleep-save sessions. First win typically 2-3 hours across deaths.

**After-action report:** days, screens crossed, calories eaten, fights taken vs avoided, items given away, dogs fed vs routed, caches found x/6, unfiltered drinks, ending title or cause of death.

**Replayability:** 3 loadouts — *Office EDC* (granola bar + extra bottle, baseline), *Gym Bag* (sneakers 14 frames/tile + hoodie -2/min night drain, no consumables), *Desk Prepper* (2 jerky, bandage, matches, bottle — the prepared-person fantasy, doubles as easy mode and as marketing to the core audience). Three river crossings reshape the midgame; loot shuffles within archetypes per seed; rain variance; post-win **Iron Walk** toggle (+25% all drains, no Second Wind, no beggar intel, report stamp) for the screenshot crowd.

---

## 15. Save System

- localStorage, two keys: `gdgh_run_v1` (run state) and `gdgh_meta_v1` (settings, best report, Iron Walk unlock).
- **Autosave on:** screen transition, sleep, menu close. Save-and-quit resumes exactly.
- Run JSON (~2KB): `{v, seed, loadout, ironWalk, secondWind, day, clock, screen, px, py, facing, meters{w,f,h,e}, hearts, conds[], inv[], bSlot, keys[], containerBits(base64), dogStates{}, npcFlags{}, karma{}, weather, visited[], stats{}}`.
- Death wipes `gdgh_run_v1` (unless Second Wind). Versioned key allows painless migrations.

---

## 16. Audio (WebAudio, zero asset files)

2 pulse oscillators + 1 noise buffer; songs and jingles as note-strings ("E4:8,G4:8,B4:4"); master on/off toggle only (no sliders).
- **13 SFX:** text blip, A-confirm, item-get jingle (4 notes), search rustle, door/pry, glass smash, dog bark, swing thunk, heart loss, low-meter heartbeat, sleep/dawn sting, death sting, ending jingle.
- **3 loops:** Day Amble (sparse, walking pace), Night Drone (low pulse + noise wind), Interior/Safe (soft arpeggio).

---

## 17. MVP Content Inventory (the whole game)

- **Maps:** 37 overworld + 10 interiors = 47 screens, each an 80-char string + entity table.
- **NPCs:** 9 named + 3 generic actor types; ~2,800 words of dialogue.
- **Items:** 22 defs (9 key, 5 tools, 8 consumables incl. quest insulin); 8 container archetypes, ~90 placements, 6 caches.
- **Enemies:** 2 AI archetypes (dog, opportunist-with-modes) + 2 scripted chokepoints (toll, checkpoint) + 4 environmental systems (cold/frost, rain, bad water, hazard tiles/dark).
- **Art:** ~48 unique 8x8 tiles -> ~40 metatiles; player 4-dir x 2 frames (6 unique + flip); dog 4 frames; humanoid base 6 frames + 4 8x8 head variants; 7 static NPC singles; 22 8x8 item icons; 48-glyph 8x8 font. All string-encoded, decoded to one atlas at boot.
- **Audio:** 13 SFX + 3 loops, synthesized.
- **Systems:** 5 meters + 7 conditions, day/night/frost/rain, camp Visibility, 5-state actor machine, screen-flip renderer with palette remaps and vision dither, dialogue boxes, Start menu (Inventory / Map / Status / System), title screen with loadout select, save/autosave, after-action report, service worker, manifest.
- **Code budget (unminified):** engine/loop 14KB, input+haptics 9KB, render 14KB, audio 11KB, survival 8KB, actors 16KB, camp 6KB, save 5KB, tiles 16KB, sprites 28KB, maps 30KB, items/loot 7KB, dialog/beats 22KB, HUD/menus/title 12KB = **~198KB** — inside the 200-300KB envelope with margin.
- **Solo timeline:** 10-12 weeks of evenings/weekends. Ship order: engine + render + input -> one region playable with meters -> all 47 maps -> actors -> camp system -> beats/endings -> audio -> PWA polish.

---

## 18. File / Module Structure

```
products/get-home/
  index.html              shell, <canvas>, inline CSS, module bootstrap
  manifest.webmanifest    portrait, standalone, theme #0f380f
  sw.js                   cache-first app shell, versioned precache list
  icons/icon-192.png, icon-512.png
  src/main.js             boot, fixed-timestep loop, state machine (TITLE/PLAY/MENU/DIALOG/CAMP/ENDING)
  src/input.js            pointer zones, floating D-pad, hysteresis, haptics, keyboard
  src/render.js           atlas build, palette remaps, screen-flip, vision dither, HUD, font/text
  src/audio.js            pulse+noise synth, note-string sequencer, SFX/loop defs
  src/survival.js         meters, conditions, clock, weather/frost
  src/actors.js           5-state machine, dog/human params, toll+checkpoint scripts
  src/camp.js             sleep prompt, Visibility, night events, sleep-skip
  src/save.js             localStorage, autosave triggers, report
  src/data/tiles.js       8x8 pixel strings, metatile defs, legend
  src/data/sprites.js     player/dog/human/NPC/items/font pixel strings
  src/data/maps.js        47 screen strings + entity/container tables + edges
  src/data/items.js       22 item defs, loot tables, cache contents
  src/data/dialog.js      NPC scripts, story beats, ending cards
```
ES modules, no bundler required (optional concat for release). PWABuilder wrap for Google Play is phase 2, after web-PWA validation — matching the Grid Down rollout.

---

## 19. Cut Order and Post-MVP Backlog

**If the schedule slips, cut in this order (pre-agreed, from B's discipline):** 1) E3 Culvert Path + A5 Warehouse Row screens (reroute neighbors); 2) two of the six caches; 3) Gym Bag loadout; 4) rain (keep First Frost); 5) motel sleep alcoves (church/cars suffice). **Never cut:** the three river crossings, the camp Visibility system, the insulin quest, the Family Photo gate.

**Explicitly NOT in MVP:** firearms of any kind; jog/run button; crafting; companion dog; hunting/fishing/snares; open trading economy (church's 2 fixed swaps only); vehicles; procedural generation; NPC schedules; diagonal movement; A* pathfinding; battle screens; GBC color mode; Gamepad API; multiple save slots; cloud saves; localization; cutscene art (text cards only); analytics; volume sliders.

**Post-MVP backlog:** jog button, companion dog, NG+ "Hard Frost", GBC palette toggle — and the sequel seed: Concept B's town-hub game ("Grid Down: First Frost"), set in the family's town with the one-car-battery ending fork, completing a three-game "same Tuesday" universe.

---

## Appendix: Synthesis rationale

PREMISE — taken from A and C (which independently converged on the get-home-bag scenario): the journey structure beats B's town-hub for this brief because it (1) gives a natural completable arc with measurable progress (the owner's win-condition requirement), (2) produces ideal 10-15 minute sleep-save phone sessions, and (3) keeps the authored-map count near 47 instead of B's ~90. C's canon link (this is Day 1-5 of the exact blackout in Grid Down; the run ends where the other game begins) was kept verbatim — it is the strongest single marketing idea across all three pitches.

FROM CONCEPT A (survival spine): the meter rates and timebase (1 day = 12 real min), the cascading low-meter conditions with the understated palette-shift/heartbeat alarm, the camp Visibility/OPSEC system (warm bright camp vs cold invisible camp, re-asked every night — the signature Grid Down carry-over), the 1.5x-scarcity loot economy where daylight is the real currency, the no-firearms ruling, the three starting loadouts + Iron Walk toggle, the "Empty House" day-cap ending that hooks into Grid Down's Evacuated ending, and the "line with loops" world readability rule (home is always east).

FROM CONCEPT B (Zelda structure): the Metroidvania payoff of tools re-opening previously seen screens (boltcutter pockets at the railyard and warehouse row), the landmark-per-screen navigation rule, hidden caches found via notes/intel, tall grass breaking human line-of-sight for the bridge sneak, the church as a zero-Visibility sanctuary hub with a daily 18:00 soup rhythm, the scripted First Frost beat repurposed as endgame pressure (Day 4 dawn), dialogue-box human confrontations instead of combat spam, Dale's substation line ("Breakers are fine. There's just nothing coming in."), and — critically — B's pre-agreed cut-order discipline, adopted wholesale.

FROM CONCEPT C (GB feel + scope): nearly the entire technical layer — exact DMG palette hexes, 8x8 tiles composed into 16x16 metatiles, 16-frames-per-tile LADX movement cadence, 24-frame screen-flip, string-encoded pixel art decoded to one atlas at boot, the portrait control deck with floating-origin D-pad, axis-priority + hysteresis, pointer-event multi-touch and haptics, hearts-based HP (GB Zelda display), the 5-state actor machine, the Family Photo checkpoint gate, the insulin side-quest, the three river crossings, sleep = save = session boundary, walk-only controls (Gen-1 precedent), and the line-item code budget proving the 200-300KB envelope.

REJECTED, AND WHY: B's town-hub with the kid stash quota — a daily auto-deducting quota is chore-management on a phone (violates priority 2) and drives B's 90-map, 3-hour scope (violates priority 3); B's brilliant one-battery ending fork is archived as the sequel hook ("First Frost" is the natural game 3 set in the family's town). C's revolver — cut per A's reasoning: an unarmed office worker is more realistic, sidesteps an entire ammo/combat economy, and the noise-discipline lesson survives via glass-smash/pry noise feeding dogs and camp Visibility. A's 6x-speed sleep simulation — replaced with a deterministic sleep-skip with flat costs (simpler to build, removes a whole simulation mode). A's sprint and B's jog — cut for control purity and touch simplicity; dogs rebalanced around avoidance/food-toss/rout instead of outrunning. A's 62-screen world — trimmed to 47 authored maps. B's .22 questline, snares, crafting recipes, NPC schedules — all out of MVP per the brief's "small polished world" priority.
