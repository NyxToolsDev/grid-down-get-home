# Grid Down: Get Home — Next Steps

## Ship checklist (local)

- [ ] Playtest a full run start-to-porch on desktop (keyboard)
- [ ] Playtest on phone (touch deck, portrait, PWA install)
- [ ] Balance pass: can a first-time player reach the river by Day 3?
- [ ] Lighthouse PWA audit (installability, offline)

## Publish

1. Create GitHub repo `NyxToolsDev/grid-down-get-home`, push, enable GitHub Pages
2. itch.io: zip the folder (exclude `tools/`, `*.md`), upload as HTML game
   - Viewport 480x680 (portrait), mobile friendly checked
   - Tags: `survival`, `game-boy`, `retro`, `pixel-art`, `pwa`, `offline`, `adventure`
   - Cross-link with the Grid Down page both directions
3. Google Play (same path as Grid Down): PWABuilder -> Android AAB -> Play Console
4. Amazon Appstore: submit hosted URL as web app

## Store copy (draft)

> The power grid failed at 4:17 PM on a Tuesday. You are 38 miles from home.
>
> GRID DOWN: GET HOME is a Game Boy-style survival adventure. Walk east through a
> collapsing county: scavenge supplies, manage water, food, warmth, and rest, route
> around stray dog packs, and decide every night between a warm fire someone might
> see and a cold sleep nobody will. Find the crowbar. Find the boltcutters. Cross
> the river. Get home before the first frost — and before Day 9.
>
> No zombies. No microtransactions. Works offline. The prequel to GRID DOWN —
> when you reach the porch, their 30 days start.

## Post-MVP backlog (from design spec)

- Jog button, companion dog, NG+ "Hard Frost", GBC palette toggle
- Sequel seed: "Grid Down: First Frost" (town-hub game, one-car-battery ending fork)

## Cross-promo

- Add a "GET HOME — the prequel" link/card to Grid Down's ending screens + itch page
- Reddit: r/WebGames, r/itchio, r/IndieGaming, r/Gameboy (pixel-art angle), r/survivalgames
- Dev.to article: "I built a Game Boy game in vanilla JS — no assets, every sprite is a string"
