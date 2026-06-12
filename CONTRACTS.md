# DATA CONTRACTS — Grid Down: Get Home

Binding format specification for all data files. The engine, validators, and preview
tools all assume EXACTLY these shapes. Read GAME-DESIGN-SPEC.md for content; read this
for format. If spec and contract conflict on format, the contract wins.

## The strict-JSON convention

Every data file contains exactly ONE top-level declaration in this form:

```js
const NAME = /*JSON*/{
  ... strict JSON, no comments, no trailing commas, double quotes only ...
};
```

Nothing else in the file (no helper code, no exports). Tools extract the text between
the first `=` and the last `;` and run it through `JSON.parse`.

| File | Global | Owner |
|---|---|---|
| `js/data-tiles.js` | `TILES` | art-tiles agent |
| `js/data-sprites.js` | `SPRITES` | art-sprites agent |
| `js/data-font.js` | `FONT` | art-font agent |
| `js/data-maps.js` | `MAPS` | maps agent |
| `js/data-dialog.js` | `DIALOG` | dialog agent |
| `js/data-items.js` | `ITEMS` | engine (not yours) |

Write ONLY your own file. Validate with `node tools/validate-data.mjs <yourtarget>`
(targets: `tiles`, `sprites`, `font`, `maps`, `dialog`). Preview art with
`python tools/preview-art.py <target>` then **Read the generated PNG and look at it**.
Iterate until the validator passes AND the art actually looks good.

## Pixel string format

- Palette indices as chars: `'0'` darkest `#0f380f`, `'1'` `#306230`, `'2'` `#8bac0f`,
  `'3'` lightest `#9bbc0f`. `'.'` = transparent (sprites/icons/font only — NOT tiles).
- A 16x16 image = one 256-char string, row-major, top-left first.
- An 8x8 image = one 64-char string.
- No other characters permitted.

## `TILES` (data-tiles.js) — 16x16, opaque, 256 chars each

Required keys (exact spelling). Draw in classic GB top-down perspective (Link's
Awakening look): readable silhouettes, dithering for texture, consistent light from top.

`grass, dirt, road, road_line, sidewalk, tallgrass, tree, debris, water, pump, brick,
brick_window, wood, wood_window, fence, gate, door, boarded, glassdoor, rail, plank,
gap, glasshaz, wire, car_l, car_r, dumpster, vending, shelf, desk, boxcar, firepit,
firepit_lit, bed, sign, cache, floor, floor_rug, doorway, counter`

Notes: `car_l`/`car_r` are the two halves of a 2-tile-wide sedan (side view from
above). `gap` is a missing trestle plank showing river far below. `water` should
read as animated-ish river texture (engine alternates it with a flipped draw).
`glasshaz` = broken glass on pavement. `boarded` = door with planks. `cache` =
disturbed earth / woodpile. Tiles must tile seamlessly against themselves where
natural (grass, road, water, floor).

## `SPRITES` (data-sprites.js) — 16x16 unless noted, '.' transparency

Entity sprites (16x16):
- `player_d0, player_d1, player_u0, player_u1, player_s0, player_s1` — office worker,
  messenger bag, 2-frame walk, facing down/up/side. Side faces LEFT (engine flips for right).
- `dog_0, dog_1` — medium stray dog, side view, 2-frame trot. Faces LEFT.
- `dog_alert` — dog standing tense, ears up, front-ish view.
- `human_d0, human_d1, human_u0, human_u1, human_s0, human_s1` — generic adult walk
  cycle (used for beggar/shadower/prowler/guard/walkers).
- Named NPC standing singles (16x16, front view, distinct silhouettes):
  `npc_dale, npc_theo, npc_marta, npc_ames, npc_reyes, npc_dee, npc_ruth, npc_earl,
  npc_sam, npc_kid`.
- `searched` — small 8x8 "opened/empty" marker (e.g. open lid lines) drawn over
  looted containers. 8x8 = 64 chars.
- `alert_bang` — 8x8 "!" bubble. `zzz` — 8x8 sleep marker.

UI glyphs (8x8, 64 chars): `heart_full, heart_half, heart_empty, icon_sun, icon_moon,
icon_drop, icon_can, icon_flame, icon_bolt, icon_bleed, icon_gut, icon_cold,
icon_arrow` (dialogue advance arrow), `icon_dot` (map player dot).

Item icons (8x8), key = `item_<id>` for every id in this exact list:
`photo, bag, crowbar, boltcutters, straw, flashlight, batteries, map, opener, stick,
matches, bedroll, boards, poncho, bottle, granola, can, jerky, hotmeal, bandage, meds,
insulin`.

## `FONT` (data-font.js) — 8x8 glyphs, chars '0'/'1' (1 = ink)

Glyph set (key = the character itself, as a JSON string key):
`A-Z`, `0-9`, and these exact punctuation keys:
space `" "`, `"."`, `","`, `"!"`, `"?"`, `"'"`, `"\""`, `"-"`, `":"`, `";"`, `"/"`,
`"("`, `")"`, `"+"`, `"%"`, `"<"`, `">"`.
Design: clean 7px-cap-height uppercase sans (Game Boy style, like the LADX font),
glyphs occupy left-top 7x7 of the 8x8 cell, column 8 and row 8 blank for spacing.
ALL game text is uppercase — there are no lowercase glyphs.

## `MAPS` (data-maps.js)

```json
{
  "screens": { "<id>": <screen>, ... },
  "blockedEdges": ["B6|B7", "D6|D7", "E7|E8"]
}
```

Screen ids: overworld = row letter + column, e.g. `"C2"` (rows A-F, cols 1-8) — see
the world grid in GAME-DESIGN-SPEC.md section 7 (37 walkable screens; `----` cells
simply don't exist). Interiors: `INT_OFFICE, INT_GARAGE, INT_MART, INT_RAILSHED,
INT_PHARMACY, INT_HARDWARE, INT_CHURCH, INT_GAS, INT_FARMHOUSE, INT_HOME` (10).

Screen object:
```json
{
  "name": "MAIN ST WEST",            // <= 14 chars, uppercase, shown on map page
  "region": 1,                        // 1-5; interiors use their parent's region
  "rows": ["##########", ...],        // exactly 8 strings of exactly 10 legend chars
  "ents": [ ... ],                    // see below; may be []
  "doors": { "4,0": {"to": "INT_OFFICE", "at": [5,6]} },  // tile "x,y" -> destination
  "dark": false,                      // true: interior darkness (vision radius 2/6)
  "interior": false                   // true for INT_* maps
}
```

Legend chars (tile + behavior — engine owns behavior, you place chars):
```
.  grass        ,  dirt path     =  road         -  sidewalk      t  tall grass
T  tree(solid)  *  debris(solid) ~  water(solid) P  pump(solid)   #  brick wall
W  wood wall    f  fence(solid)  G  chain gate   D  door          B  boarded door
g  glass door   r  rail track    R  trestle plank ^ trestle gap   h  glass hazard
w  wire hazard  c  car(solid)    d  dumpster     v  vending       s  shelf
k  desk/cabinet x  boxcar door   F  fire pit     E  bed/cot/pew   S  sign
O  cache        I  interior floor +  exit doorway L  road line    n  window(brick)
o  window(wood) C  counter       u  rug floor
```
Solids: `T * ~ P # W f G D B g c d v s k x F E S O C n o` (and `L` is walkable road).
`R ^ h w r , . - = t I + u L` are walkable.

Rules:
- Map edges: where the world grid has a walkable neighbor and the edge is not in
  `blockedEdges`, leave walkable openings that ALIGN with the neighbor's openings
  (same row index for east/west edges, same column index for north/south). Where
  there is no neighbor, the border row/col must be fully solid.
- Doors `D`/`B`/`g`/`x` on overworld lead to interiors via `doors`; interiors return
  via `+` tiles, also wired in `doors`. Every door wiring must be bidirectional.
- The THREE river crossings and ALL chain gates / boarded doors must match spec
  section 7 exactly. The river `~` occupies the seam between cols 6 and 7 (rows A-D):
  put water on the eastern edge of col-6 screens and western edge of col-7 screens so
  it reads as one river.
- Container ents must sit on the matching legend char (`table:"vending"` on a `v`
  tile, `"shelf"` on `s`, `"desk"` on `k`, `"boxcar"` on `x`, `"dumpster"` on `d`,
  `"trunk"` on `c`, `"cache"` on `O`, `"fridge"` on `C` or `s`). NPCs/dogs on
  walkable tiles.

Entity objects (in `ents`):
```json
{"t":"dog","x":3,"y":4}
{"t":"npc","id":"theo","x":5,"y":3}            // id must exist in DIALOG.npcs
{"t":"box","x":2,"y":6,"table":"desk"}          // archetypes: desk dumpster trunk
                                                //  vending shelf boxcar fridge cache
{"t":"box","x":7,"y":2,"table":"cache","cache":"third_pew"}  // fixed-content cache
{"t":"sign","x":4,"y":2,"text":"sign_overpass"} // text id must exist in DIALOG.signs
{"t":"sleepcar","x":6,"y":4}                    // marks the car tile at x,y sleepable
{"t":"key","x":5,"y":3,"item":"crowbar"}        // key/tool item pickup on the map
```

Required content (validator enforces):
- Exactly one `{"t":"key","item":...}` each for: `crowbar` (INT_RAILSHED), `boltcutters`
  (INT_HARDWARE back room behind a `B`), `straw` — NO: straw is given by Marta
  (dialog), do not place it. Place: `crowbar`, `boltcutters`, `flashlight` (INT_GAS),
  `map` (INT_GAS), `bag` (INT_GARAGE), `insulin` (INT_PHARMACY).
- 11 dogs at the spec's screens: D2 x1, D3(=Dog Alley overworld) x3, A2 x1, B7 x2,
  A8 x2, C8 x1, E7 x1.
- NPC placements: dale INT_OFFICE, theo C1, marta INT_PHARMACY, ames INT_CHURCH,
  reyes C6, guard C6 (use `{"t":"npc","id":"guard",...}`), dee D8, ruth INT_FARMHOUSE,
  earl INT_FARMHOUSE, sam INT_HOME, kid INT_HOME.
- 6 caches with these exact `cache` ids: `boxcar_cache` (A2 or A3), `warehouse_fence`
  (A5), `third_pew` (INT_CHURCH), `scarecrow` (A8), `culvert` (D7), `farm_cellar`
  (INT_FARMHOUSE).
- ~90 `box` ents total across the world (distribution per spec section 9).
- The START screen is INT_OFFICE; player spawns there (engine handles spawn at desk).
- Pump `P` on E5 (Town Square). Fire pits `F` at reasonable camp spots (motel court,
  riverbanks, Pine Hollow, Holler Farm yard, at least 5 total).
- Sleepable: beds `E` in INT_OFFICE (cot), E4 motel (2 rooms = use 2 E tiles on the
  overworld motel screen or a small interior — your choice: E tiles on E4 are fine),
  INT_CHURCH pew, INT_FARMHOUSE bed, INT_HOME bed; 4+ `sleepcar` ents spread along
  the route (D1 garage area, C3, D5, C7 suggested).

## `DIALOG` (data-dialog.js)

```json
{
  "npcs":   { "<npcId>": [ <entry>, ... ] },
  "signs":  { "<signId>": [ ["LINE1","LINE2"], ... ] },
  "cards":  { "<cardId>": ["LINE1","LINE2","LINE3"] },
  "endings": { "<endingId>": { "title": "HOMECOMING", "lines": [ <box>, ... ] } },
  "toasts": { "<itemId|toastId>": "CROWBAR + PRY BOARDED DOORS." }
}
```

- A **box** = array of 1-3 strings, each **<= 18 chars** (UPPERCASE; only glyphs from
  the FONT set). A dialog **entry** = `{ "if": {...}, "set": {...}, "lines": [box, box, box] }`
  — max 3 boxes per entry.
- `if` condition fields (all optional; all present must hold):
  `{"flag":"insulin_delivered"}`, `{"notFlag":"met_marta"}`, `{"dayMin":2}`,
  `{"dayMax":4}`, `{"item":"crowbar"}`, `{"notItem":"photo"}`, `{"karmaMin":2}`.
  `flag`/`notFlag` may be arrays (AND). Entries are evaluated TOP TO BOTTOM; first
  match plays. Last entry of each npc must have empty/absent `if` (fallback).
- `set` fields: `{"flags":{"met_marta":true}}`, `{"give":"straw"}` (engine grants the
  item + plays item-get), `{"karma":1}` (delta).
- Flag vocabulary (use ONLY these; engine sets the starred ones automatically):
  `met_dale, met_theo, met_marta, met_ames, met_reyes, met_dee, met_ruth, met_sam,
  insulin_have*, insulin_delivered, straw_given, toll_paid*, toll_fought*,
  toll_sneaked*, photo_shown, soup_today*, fed_beggar, gave_food_today,
  frost_started*, rain_today*, day2plus*, crossed_river*, photo_have*, bag_have*`.
- Required npc ids: `dale, theo, marta, ames, reyes, guard, dee, ruth, earl, sam, kid,
  beggar_a, beggar_b, walker_a, walker_b, walker_c, prowler`.
- Required sign ids (place matching `sign` ents exist in maps — coordinate via ids):
  `sign_plaza, sign_overpass, sign_pharmacy, sign_church, sign_motel, sign_gas,
  sign_bridge_w, sign_trestle, sign_underpass, sign_checkpoint, sign_farm,
  note_pharmacy` (the third-pew clue), `note_office`.
- Required card ids: `card_open_1` ("TUESDAY. 4:17 PM." beat), `card_open_2`,
  `card_day` (template — engine substitutes day number for `#`), `card_frost`,
  `card_rain`, `card_death_cold, card_death_dogs, card_death_human, card_death_hunger,
  card_death_thirst` (death cards, understated), `card_collapse` (energy collapse).
- Required ending ids: `before_wave` (<= day 4), `homecoming` (5-6), `long_way` (7-8),
  `empty_house` (9+), plus `promo` (the "THEIR 30 DAYS START NOW." cross-promo box).
- Required toast ids: one per key item/tool (`photo, bag, crowbar, boltcutters, straw,
  flashlight, batteries, map, opener, stick, matches, bedroll, boards, poncho`), plus
  `noise` ("THE SOUND CARRIES."), `gate_cut`, `door_pried`, `glass_smashed`,
  `cache_found`.
- Voice: per spec section 10 — terse, plain, no melodrama, no exclamation-mark abuse.
  Dale's line "BREAKERS ARE FINE. THERE'S JUST NOTHING COMING IN." and Reyes's
  "TWO ITEMS. RIVER'S THE ONLY THING HERE THAT'S FREE." must appear verbatim
  (split across lines as needed).

## `ITEMS` (data-items.js) — engine-owned, for reference only

Item ids used across files: key items `photo bag crowbar boltcutters straw flashlight
map opener`; tools `stick matches bedroll boards poncho`; consumables `bottle granola
can jerky hotmeal bandage meds batteries insulin`.
Loot table archetype names: `desk dumpster trunk vending shelf boxcar fridge cache`.

## Coordinates & sizes

- Screen = 10 cols x 8 rows of 16px tiles. x in 0-9 (west->east), y in 0-7 (north->south).
- `rows[y][x]` is the tile at (x, y).
- Play area renders at y-offset 16px under the HUD; data never cares about pixels.
