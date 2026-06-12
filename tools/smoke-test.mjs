#!/usr/bin/env node
// Playwright smoke test: boots the game in headless Chromium, walks through
// title -> loadout -> intro cards -> gameplay, asserting no console/page errors
// and a non-blank canvas at each stage. Screenshots into tools/preview/.
// Usage: node tools/smoke-test.mjs
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = process.env.GDGH_ROOT || join(dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png' };

const server = createServer((req, res) => {
  let p = req.url.split('?')[0];
  if (p === '/') p = '/index.html';
  const file = join(ROOT, p);
  if (!existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 480, height: 800 } });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

const shot = (name) => page.screenshot({ path: join(ROOT, 'tools', 'preview', name) });
const press = async (key, times = 1, delay = 120) => {
  for (let i = 0; i < times; i++) { await page.keyboard.press(key); await page.waitForTimeout(delay); }
};
const hold = async (key, ms) => {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
  await page.waitForTimeout(80);
};
const canvasColors = () => page.evaluate(() => {
  const c = document.getElementById('screen');
  const ctx = c.getContext('2d');
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  const seen = new Set();
  for (let i = 0; i < d.length; i += 40) seen.add(d[i] + ',' + d[i + 1] + ',' + d[i + 2]);
  return seen.size;
});
const gameMode = () => page.evaluate(() => (typeof Game !== 'undefined' ? Game.mode : null));

let failed = false;
const check = (label, ok) => {
  console.log((ok ? 'PASS ' : 'FAIL ') + label);
  if (!ok) failed = true;
};

try {
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
  await page.waitForTimeout(1500);

  const errEl = await page.evaluate(() => document.getElementById('err').textContent);
  check('no missing-data banner: ' + JSON.stringify(errEl), !errEl);
  check('title screen reached (mode=' + await gameMode() + ')', await gameMode() === 'title');
  check('canvas has art (colors>2)', await canvasColors() > 2);
  await shot('shot-1-title.png');

  // title -> NEW WALK (fresh profile: first option) -> loadout
  await press('z');
  await page.waitForTimeout(300);
  check('loadout screen (mode=' + await gameMode() + ')', await gameMode() === 'loadout');
  await shot('shot-2-loadout.png');

  // pick OFFICE EDC, move to START (rows: 3 loadouts, second wind, start)
  await press('z');               // select edc
  await press('ArrowDown', 4);    // to START
  await press('z');               // start run -> intro card 1
  await page.waitForTimeout(800);
  check('intro card shown (mode=' + await gameMode() + ')', await gameMode() === 'card');
  await shot('shot-3-card.png');

  await press('z', 1, 900);       // card 1 -> card 2 (cards need 30 frames before accepting input)
  await press('z', 1, 900);       // card 2 -> play
  await page.waitForTimeout(600);
  check('gameplay reached (mode=' + await gameMode() + ')', await gameMode() === 'play');
  const screen0 = await page.evaluate(() => Game.st.screen);
  check('spawned in INT_OFFICE (got ' + screen0 + ')', screen0 === 'INT_OFFICE');
  check('photo granted', await page.evaluate(() => Game.st.keys.includes('photo')));
  await shot('shot-4-office.png');

  // walk around for a bit in every direction (held keys — grid movement)
  await hold('ArrowDown', 700);
  await hold('ArrowRight', 700);
  await hold('ArrowUp', 500);
  await hold('ArrowLeft', 500);
  const moved = await page.evaluate(() => Game.st.stats.steps);
  check('player walked (steps=' + moved + ')', moved > 0);

  // open start menu, flip through pages, close
  await press('Enter');
  check('menu opens (mode=' + await gameMode() + ')', await gameMode() === 'menu');
  await shot('shot-5-menu.png');
  await press('ArrowRight', 3, 250);
  await press('Enter');
  check('menu closes (mode=' + await gameMode() + ')', await gameMode() === 'play');

  // talk to Dale if he's adjacent-reachable: just press A a few times wherever we are
  await press('z', 2, 400);
  // whatever happened (dialog or nothing), drain it
  await press('z', 6, 250);

  // survival tick sanity: meters should have moved below start values
  const meters = await page.evaluate(() => Game.st.meters);
  check('survival ticking (water<70: ' + meters.w.toFixed(1) + ')', meters.w < 70);

  // save/load roundtrip
  await page.evaluate(() => Save.saveRun(Game.st));
  const reloaded = await page.evaluate(() => {
    const st = Save.loadRun();
    return st && st.screen === Game.st.screen && st.day === Game.st.day;
  });
  check('save/load roundtrip', !!reloaded);

  await shot('shot-6-final.png');
} catch (e) {
  errors.push('TEST CRASH: ' + e.message);
  failed = true;
}

for (const e of errors) console.log('ERROR ' + e);
check('zero console/page errors', errors.length === 0);

await browser.close();
server.close();
process.exit(failed ? 1 : 0);
