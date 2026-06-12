# Grid Down: Get Home

A Game Boy-style survival adventure for the browser and Android. Companion game to
[Grid Down](https://github.com/NyxToolsDev/grid-down-game).

**It is 4:17 PM on a Tuesday when the grid fails — and you are 38 miles from home.**

Walk east across five regions of slow-rolling collapse: downtown, the rail corridor,
a strip-mall town, a held river crossing, and the cold rural last leg. Manage water,
food, warmth, and energy in real time. Your dungeon keys are a crowbar, boltcutters,
a filter straw, and a flashlight. The monsters are stray dogs, desperate people, and
the cold. No zombies. No melodrama.

When you reach your porch, their 30 days start. Play Grid Down.

## Features

- Authentic Game Boy presentation: 160x144, 4-shade green palette, chiptune audio
- Zelda-style tile exploration: 47 screens, item-gated routes, hidden caches
- Real survival systems: 1 game day = 12 real minutes; cold kills before people do
- Three river crossings — pay the toll, sneak at night, or find another way
- The camp decision every night: a warm visible fire, or a cold invisible sleep
- Touch controls (floating D-pad + A/B), keyboard on desktop
- Works offline, installs as an app (PWA). No ads, no tracking, no server.
- 60-90 minute runs in 10-15 minute sleep-save sessions; three loadouts; Iron Walk mode

## Play

Serve the folder with any static file server and open it in a browser:

```sh
npx serve .
# or
python -m http.server 8080
```

On a phone: open the hosted URL, then "Add to Home Screen" to install.

## Tech

Plain HTML5 canvas + vanilla JavaScript. No frameworks, no build step, no external
assets — every sprite, map, and sound is defined in code. ~200KB unminified.

| Path | What |
|---|---|
| `index.html` | shell, CSS, touch deck |
| `js/main.js` | game loop, modes, interactions |
| `js/render.js` | palette-ramped atlas renderer |
| `js/survival.js` | meters, clock, conditions |
| `js/actors.js` | dog/human AI, scripted encounters |
| `js/camp.js` | sleep, visibility, night events |
| `js/data-*.js` | tiles, sprites, font, maps, dialogue, items |
| `tools/` | data validators and art preview generators |

## License

(c) NyxTools. All rights reserved.
