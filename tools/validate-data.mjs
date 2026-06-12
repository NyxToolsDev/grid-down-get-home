#!/usr/bin/env node
// Data validator for Grid Down: Get Home.
// Usage: node tools/validate-data.mjs <tiles|sprites|font|maps|dialog|all>
// Exit 0 = pass (warnings allowed). Exit 1 = errors.

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const warns = [];
const err = (m) => errors.push(m);
const warn = (m) => warns.push(m);

function loadData(file) {
  const p = join(ROOT, 'js', file);
  if (!existsSync(p)) return null;
  const src = readFileSync(p, 'utf8');
  const eq = src.indexOf('=');
  const semi = src.lastIndexOf(';');
  if (eq < 0 || semi < eq) { err(`${file}: not in "const X = ...;" form`); return null; }
  try {
    return JSON.parse(src.slice(eq + 1, semi).replace(/^\s*\/\*JSON\*\//, ''));
  } catch (e) {
    err(`${file}: JSON parse failed — ${e.message}`);
    return null;
  }
}

// ---------- ground truth ----------
const WORLD = {
  A: [2, 3, 5, 6, 7, 8],
  B: [1, 2, 3, 4, 5, 6, 7, 8],
  C: [1, 2, 3, 4, 5, 6, 7, 8],
  D: [1, 2, 3, 4, 5, 6, 7, 8],
  E: [3, 4, 5, 6, 7, 8],
  F: [8],
};
const OVERWORLD_IDS = Object.entries(WORLD).flatMap(([r, cs]) => cs.map((c) => r + c));
const INTERIORS = ['INT_OFFICE','INT_GARAGE','INT_MART','INT_RAILSHED','INT_PHARMACY',
  'INT_HARDWARE','INT_CHURCH','INT_GAS','INT_FARMHOUSE','INT_HOME'];
const OPTIONAL_INTERIORS = ['INT_CELLAR'];
const DOOR_LINKS = { INT_OFFICE:'B1', INT_GARAGE:'D1', INT_MART:'C2', INT_RAILSHED:'D3',
  INT_PHARMACY:'C4', INT_HARDWARE:'B5', INT_CHURCH:'C5', INT_GAS:'D5',
  INT_FARMHOUSE:'B8', INT_HOME:'F8' };
const BLOCKED_EDGES = ['B6|B7', 'D6|D7', 'E7|E8'];

const LEGEND_CHARS = '.,=-tT*~P#WfGDBgrR^hwcdvskxFEISO+LnoCu';
const SOLID = new Set('T*~P#WfGDBgcdvskxFESOCno');
const WALKABLE = new Set('.,=-tR^hwrI+Lu');
const GATE_PASS = new Set('GDBgx'); // passable via tool/door mechanics

const TILE_KEYS = ['grass','dirt','road','road_line','sidewalk','tallgrass','tree','debris',
  'water','pump','brick','brick_window','wood','wood_window','fence','gate','door','boarded',
  'glassdoor','rail','plank','gap','glasshaz','wire','car_l','car_r','dumpster','vending',
  'shelf','desk','boxcar','firepit','firepit_lit','bed','sign','cache','floor','floor_rug',
  'doorway','counter'];

const SPRITE_16 = ['player_d0','player_d1','player_u0','player_u1','player_s0','player_s1',
  'dog_0','dog_1','dog_alert','human_d0','human_d1','human_u0','human_u1','human_s0','human_s1',
  'npc_dale','npc_theo','npc_marta','npc_ames','npc_reyes','npc_dee','npc_ruth','npc_earl',
  'npc_sam','npc_kid'];
const SPRITE_8 = ['searched','alert_bang','zzz','heart_full','heart_half','heart_empty',
  'icon_sun','icon_moon','icon_drop','icon_can','icon_flame','icon_bolt','icon_bleed',
  'icon_gut','icon_cold','icon_arrow','icon_dot'];
const ITEM_IDS = ['photo','bag','crowbar','boltcutters','straw','flashlight','batteries','map',
  'opener','stick','matches','bedroll','boards','poncho','bottle','granola','can','jerky',
  'hotmeal','bandage','meds','insulin'];

const FONT_GLYPHS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', ' ', '.', ',', '!', '?',
  "'", '"', '-', ':', ';', '/', '(', ')', '+', '%', '<', '>'];

const NPC_IDS = ['dale','theo','marta','ames','reyes','guard','dee','ruth','earl','sam','kid',
  'beggar_a','beggar_b','walker_a','walker_b','walker_c','prowler'];
const SIGN_IDS = ['sign_plaza','sign_overpass','sign_pharmacy','sign_church','sign_motel',
  'sign_gas','sign_bridge_w','sign_trestle','sign_underpass','sign_checkpoint','sign_farm',
  'note_pharmacy','note_office'];
const CARD_IDS = ['card_open_1','card_open_2','card_day','card_frost','card_rain',
  'card_death_cold','card_death_dogs','card_death_human','card_death_hunger',
  'card_death_thirst','card_collapse'];
const ENDING_IDS = ['before_wave','homecoming','long_way','empty_house','promo'];
const TOAST_IDS = ['photo','bag','crowbar','boltcutters','straw','flashlight','batteries',
  'map','opener','stick','matches','bedroll','boards','poncho','noise','gate_cut',
  'door_pried','glass_smashed','cache_found'];
const FLAGS = ['met_dale','met_theo','met_marta','met_ames','met_reyes','met_dee','met_ruth',
  'met_sam','insulin_have','insulin_delivered','straw_given','toll_paid','toll_fought',
  'toll_sneaked','photo_shown','soup_today','fed_beggar','gave_food_today','frost_started',
  'rain_today','day2plus','crossed_river','photo_have','bag_have'];
const CACHE_IDS = ['boxcar_cache','warehouse_fence','third_pew','scarecrow','culvert','farm_cellar'];
const BOX_TABLES = ['desk','dumpster','trunk','vending','shelf','boxcar','fridge','cache'];
const TABLE_TILE = { desk:'k', dumpster:'d', trunk:'c', vending:'v', shelf:'s', boxcar:'x',
  cache:'O', fridge:'Cs' };

// ---------- pixel checks ----------
function checkPixels(name, str, size, allowed, where) {
  if (typeof str !== 'string') { err(`${where}.${name}: not a string`); return; }
  if (str.length !== size * size) { err(`${where}.${name}: length ${str.length}, want ${size * size}`); return; }
  for (const ch of str) if (!allowed.includes(ch)) { err(`${where}.${name}: bad char "${ch}"`); return; }
}

function vTiles() {
  const T = loadData('data-tiles.js'); if (!T) return;
  for (const k of TILE_KEYS) {
    if (!(k in T)) { err(`TILES missing "${k}"`); continue; }
    checkPixels(k, T[k], 16, '0123', 'TILES');
  }
  for (const k of Object.keys(T)) if (!TILE_KEYS.includes(k)) warn(`TILES extra key "${k}"`);
}

function vSprites() {
  const S = loadData('data-sprites.js'); if (!S) return;
  for (const k of SPRITE_16) { if (!(k in S)) { err(`SPRITES missing "${k}"`); continue; } checkPixels(k, S[k], 16, '0123.', 'SPRITES'); }
  for (const k of SPRITE_8) { if (!(k in S)) { err(`SPRITES missing "${k}"`); continue; } checkPixels(k, S[k], 8, '0123.', 'SPRITES'); }
  for (const id of ITEM_IDS) { const k = `item_${id}`; if (!(k in S)) { err(`SPRITES missing "${k}"`); continue; } checkPixels(k, S[k], 8, '0123.', 'SPRITES'); }
}

function vFont() {
  const F = loadData('data-font.js'); if (!F) return;
  for (const g of FONT_GLYPHS) {
    if (!(g in F)) { err(`FONT missing glyph "${g}"`); continue; }
    checkPixels(JSON.stringify(g), F[g], 8, '01', 'FONT');
  }
}

// ---------- maps ----------
function neighbors(id) {
  // returns {dir: neighborId} for overworld ids
  const row = id[0], col = +id.slice(1);
  const rows = 'ABCDEF';
  const out = {};
  const tryId = (r, c) => (WORLD[r] && WORLD[r].includes(c) ? r + c : null);
  out.N = tryId(rows[rows.indexOf(row) - 1], col);
  out.S = tryId(rows[rows.indexOf(row) + 1], col);
  out.W = tryId(row, col - 1);
  out.E = tryId(row, col + 1);
  return out;
}
const edgeKey = (a, b) => [a, b].sort().join('|');

function vMaps() {
  const M = loadData('data-maps.js'); if (!M) return null;
  const D = loadData('data-dialog.js'); // optional cross-check
  if (!M.screens) { err('MAPS.screens missing'); return null; }
  const S = M.screens;
  for (const id of OVERWORLD_IDS) if (!S[id]) err(`MAPS missing overworld screen ${id}`);
  for (const id of INTERIORS) if (!S[id]) err(`MAPS missing interior ${id}`);
  for (const id of Object.keys(S)) {
    if (!OVERWORLD_IDS.includes(id) && !INTERIORS.includes(id) && !OPTIONAL_INTERIORS.includes(id))
      err(`MAPS unknown screen id ${id}`);
  }
  if (JSON.stringify((M.blockedEdges || []).slice().sort()) !== JSON.stringify(BLOCKED_EDGES.slice().sort()))
    err(`MAPS.blockedEdges must be exactly ${JSON.stringify(BLOCKED_EDGES)}`);

  // per-screen structure
  for (const [id, sc] of Object.entries(S)) {
    if (!sc.rows || sc.rows.length !== 8 || sc.rows.some((r) => typeof r !== 'string' || r.length !== 10)) {
      err(`${id}: rows must be 8 strings of 10 chars`); continue;
    }
    for (let y = 0; y < 8; y++) for (let x = 0; x < 10; x++) {
      const ch = sc.rows[y][x];
      if (!LEGEND_CHARS.includes(ch)) err(`${id}: illegal char "${ch}" at ${x},${y}`);
    }
    if (typeof sc.name !== 'string' || sc.name.length > 14) err(`${id}: bad name`);
    if (!(sc.region >= 1 && sc.region <= 5)) err(`${id}: bad region`);
    for (const e of sc.ents || []) {
      if (!(e.x >= 0 && e.x <= 9 && e.y >= 0 && e.y <= 7)) { err(`${id}: ent out of bounds ${JSON.stringify(e)}`); continue; }
      const ch = sc.rows[e.y][e.x];
      if (e.t === 'box') {
        if (!BOX_TABLES.includes(e.table)) err(`${id}: bad box table "${e.table}"`);
        else if (!TABLE_TILE[e.table].includes(ch)) err(`${id}: box(${e.table}) at ${e.x},${e.y} sits on "${ch}"`);
        if (e.cache && !CACHE_IDS.includes(e.cache)) err(`${id}: unknown cache id ${e.cache}`);
      } else if (e.t === 'npc' || e.t === 'dog') {
        if (!WALKABLE.has(ch)) err(`${id}: ${e.t} at ${e.x},${e.y} on solid "${ch}"`);
        if (e.t === 'npc' && D && D.npcs && !D.npcs[e.id]) err(`${id}: npc "${e.id}" has no dialog`);
        if (e.t === 'npc' && !NPC_IDS.includes(e.id)) err(`${id}: unknown npc id "${e.id}"`);
      } else if (e.t === 'sign') {
        if (!'S'.includes(ch)) err(`${id}: sign ent at ${e.x},${e.y} not on S tile`);
        if (D && D.signs && !D.signs[e.text]) err(`${id}: sign text "${e.text}" missing in dialog`);
      } else if (e.t === 'sleepcar') {
        if (ch !== 'c') err(`${id}: sleepcar at ${e.x},${e.y} not on car tile`);
      } else if (e.t === 'key') {
        if (!ITEM_IDS.includes(e.item)) err(`${id}: unknown key item ${e.item}`);
      } else err(`${id}: unknown ent type "${e.t}"`);
    }
    // doors sanity
    for (const [pos, d] of Object.entries(sc.doors || {})) {
      const [x, y] = pos.split(',').map(Number);
      if (!(x >= 0 && x <= 9 && y >= 0 && y <= 7)) { err(`${id}: door pos ${pos} out of bounds`); continue; }
      const ch = sc.rows[y][x];
      if (!'DBgx+'.includes(ch)) err(`${id}: door at ${pos} on non-door char "${ch}"`);
      if (!S[d.to]) err(`${id}: door to unknown screen ${d.to}`);
      if (!d.at || d.at.length !== 2) err(`${id}: door ${pos} missing "at"`);
    }
  }

  // border + edge alignment
  for (const id of OVERWORLD_IDS) {
    const sc = S[id]; if (!sc || !sc.rows) continue;
    const nb = neighbors(id);
    const open = (ch) => WALKABLE.has(ch) || GATE_PASS.has(ch);
    const sides = {
      N: { cells: [...Array(10)].map((_, x) => sc.rows[0][x]) },
      S: { cells: [...Array(10)].map((_, x) => sc.rows[7][x]) },
      W: { cells: [...Array(8)].map((_, y) => sc.rows[y][0]) },
      E: { cells: [...Array(8)].map((_, y) => sc.rows[y][9]) },
    };
    for (const [dir, info] of Object.entries(sides)) {
      const n = nb[dir];
      if (!n) {
        info.cells.forEach((ch, i) => { if (open(ch) && ch !== '~') warn(`${id}: ${dir} border open at index ${i} ("${ch}") with no neighbor`); });
        continue;
      }
      const blocked = BLOCKED_EDGES.includes(edgeKey(id, n));
      const nsc = S[n]; if (!nsc || !nsc.rows) continue;
      const otherCells = dir === 'N' ? [...Array(10)].map((_, x) => nsc.rows[7][x])
        : dir === 'S' ? [...Array(10)].map((_, x) => nsc.rows[0][x])
        : dir === 'W' ? [...Array(8)].map((_, y) => nsc.rows[y][9])
        : [...Array(8)].map((_, y) => nsc.rows[y][0]);
      const aligned = info.cells.filter((ch, i) => open(ch) && open(otherCells[i])).length;
      if (blocked && aligned > 0) warn(`${id}|${n}: blocked edge has ${aligned} aligned openings`);
      if (!blocked && aligned === 0) err(`${id}|${n}: adjacent screens with NO aligned opening`);
    }
  }

  // door link ground truth + bidirectionality
  const allDoors = [];
  for (const [id, sc] of Object.entries(S)) for (const [pos, d] of Object.entries(sc.doors || {}))
    allDoors.push({ from: id, pos, to: d.to, at: d.at });
  for (const [intr, ow] of Object.entries(DOOR_LINKS)) {
    if (!allDoors.some((d) => d.from === ow && d.to === intr)) err(`no door ${ow} -> ${intr}`);
    if (!allDoors.some((d) => d.from === intr && d.to === ow)) err(`no exit ${intr} -> ${ow}`);
  }

  // required content
  const ents = (t) => Object.entries(S).flatMap(([id, sc]) => (sc.ents || []).filter((e) => e.t === t).map((e) => ({ ...e, screen: id })));
  const keys = ents('key');
  for (const [item, where] of [['crowbar','INT_RAILSHED'],['boltcutters','INT_HARDWARE'],
    ['flashlight','INT_GAS'],['map','INT_GAS'],['bag','INT_GARAGE'],['insulin','INT_PHARMACY']]) {
    const found = keys.filter((k) => k.item === item);
    if (found.length !== 1) err(`key item ${item}: found ${found.length}, want exactly 1`);
    else if (found[0].screen !== where) err(`key item ${item} in ${found[0].screen}, want ${where}`);
  }
  const dogs = ents('dog');
  const dogPlan = { D2: 1, D3: 3, A2: 1, B7: 2, A8: 2, C8: 1, E7: 1 };
  for (const [scr, n] of Object.entries(dogPlan)) {
    const have = dogs.filter((d) => d.screen === scr).length;
    if (have !== n) err(`dogs on ${scr}: ${have}, want ${n}`);
  }
  if (dogs.length !== 11) err(`total dogs ${dogs.length}, want 11`);
  const npcPlan = { dale:'INT_OFFICE', theo:'C1', marta:'INT_PHARMACY', ames:'INT_CHURCH',
    reyes:'C6', guard:'C6', dee:'D8', ruth:'INT_FARMHOUSE', earl:'INT_FARMHOUSE',
    sam:'INT_HOME', kid:'INT_HOME' };
  const npcs = ents('npc');
  for (const [id, scr] of Object.entries(npcPlan)) {
    const found = npcs.filter((n) => n.id === id);
    if (!found.length) err(`npc ${id} not placed`);
    else if (found[0].screen !== scr) err(`npc ${id} on ${found[0].screen}, want ${scr}`);
  }
  const caches = ents('box').filter((b) => b.table === 'cache');
  for (const cid of CACHE_IDS) if (!caches.some((c) => c.cache === cid)) err(`cache ${cid} not placed`);
  const boxes = ents('box');
  if (boxes.length < 70) err(`only ${boxes.length} containers, want ~90 (>=70)`);
  else if (boxes.length < 85 || boxes.length > 110) warn(`${boxes.length} containers (target ~90)`);
  if (!(S.E5 && S.E5.rows.some((r) => r.includes('P')))) err('no pump on E5');
  const fires = Object.values(S).filter((sc) => sc.rows && sc.rows.some((r) => r.includes('F'))).length;
  if (fires < 5) err(`fire pits on ${fires} screens, want >= 5`);
  const sleepcars = ents('sleepcar');
  if (sleepcars.length < 4) err(`only ${sleepcars.length} sleepcars, want >= 4`);
  for (const sid of ['INT_OFFICE','INT_CHURCH','INT_FARMHOUSE','INT_HOME','E4'])
    if (!(S[sid] && S[sid].rows.some((r) => r.includes('E')))) err(`no bed/cot (E) on ${sid}`);

  // progression BFS
  bfsProgression(S, M);
  return M;
}

function bfsProgression(S, M) {
  const blocked = new Set(BLOCKED_EDGES);
  const walkOK = (ch, tools) => WALKABLE.has(ch) || (ch === 'G' && tools.has('boltcutters'));

  function explore(tools) {
    const seen = new Set();
    const startSc = 'INT_OFFICE';
    if (!S[startSc]) return seen;
    // find a walkable start tile (any I tile)
    let start = null;
    for (let y = 0; y < 8 && !start; y++) for (let x = 0; x < 10 && !start; x++)
      if (WALKABLE.has(S[startSc].rows[y][x])) start = [startSc, x, y];
    if (!start) return seen;
    const q = [start];
    seen.add(start.join(':'));
    while (q.length) {
      const [id, x, y] = q.shift();
      const sc = S[id];
      const push = (nid, nx, ny) => {
        const k = `${nid}:${nx}:${ny}`;
        if (!seen.has(k)) { seen.add(k); q.push([nid, nx, ny]); }
      };
      for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx <= 9 && ny >= 0 && ny <= 7) {
          const ch = sc.rows[ny][nx];
          if (walkOK(ch, tools)) push(id, nx, ny);
          // door adjacency: D always, B with crowbar, g always (smash), x never (container)
          const dk = `${nx},${ny}`;
          const door = (sc.doors || {})[dk];
          if (door && S[door.to]) {
            const pass = ch === 'D' || ch === '+' || ch === 'g' || (ch === 'B' && tools.has('crowbar'));
            if (pass) push(door.to, door.at[0], door.at[1]);
          }
        } else if (!sc.interior && !id.startsWith('INT')) {
          // screen edge crossing
          const nb = neighbors(id);
          const dir = dx === 1 ? 'E' : dx === -1 ? 'W' : dy === 1 ? 'S' : 'N';
          const n = nb[dir];
          if (!n || blocked.has(edgeKey(id, n)) || !S[n]) continue;
          const ex = dx === 1 ? 0 : dx === -1 ? 9 : x;
          const ey = dy === 1 ? 0 : dy === -1 ? 7 : y;
          const ch = S[n].rows[ey][ex];
          if (walkOK(ch, tools)) push(n, ex, ey);
        }
      }
      // exit doorway tiles ('+') also traverse when stood on
      const here = sc.rows[y][x];
      if (here === '+') {
        const door = (sc.doors || {})[`${x},${y}`];
        if (door && S[door.to]) push(door.to, door.at[0], door.at[1]);
      }
    }
    return seen;
  }

  const reachScreen = (seen, id) => [...seen].some((k) => k.startsWith(id + ':'));
  const reachEnt = (seen, screen, x, y) =>
    [[0,1],[0,-1],[1,0],[-1,0],[0,0]].some(([dx,dy]) => seen.has(`${screen}:${x+dx}:${y+dy}`));

  const entPos = (pred) => {
    for (const [id, sc] of Object.entries(S)) for (const e of sc.ents || [])
      if (pred(e)) return [id, e.x, e.y];
    return null;
  };

  const p0 = explore(new Set());
  const crow = entPos((e) => e.t === 'key' && e.item === 'crowbar');
  if (crow && !reachEnt(p0, ...crow)) err('PROGRESSION: crowbar unreachable with no tools');
  if (!reachScreen(p0, 'INT_GARAGE')) err('PROGRESSION: garage (bag) unreachable at start');

  const p1 = explore(new Set(['crowbar']));
  const bolt = entPos((e) => e.t === 'key' && e.item === 'boltcutters');
  if (bolt && !reachEnt(p1, ...bolt)) err('PROGRESSION: boltcutters unreachable with crowbar');
  const ins = entPos((e) => e.t === 'key' && e.item === 'insulin');
  if (ins && !reachEnt(p1, ...ins)) err('PROGRESSION: insulin unreachable with crowbar');
  if (!reachScreen(p1, 'INT_GAS')) err('PROGRESSION: gas station unreachable with crowbar');

  const p2 = explore(new Set(['crowbar', 'boltcutters']));
  if (!reachScreen(p2, 'INT_HOME')) err('PROGRESSION: HOME unreachable with all tools');
  if (!reachScreen(p2, 'F8')) err('PROGRESSION: F8 unreachable with all tools');
  // EVERY entity must be adjacency-reachable with all tools — a screen edge
  // being touched is not enough (catches sealed-off pockets/rows)
  for (const [id, sc] of Object.entries(S)) for (const e of sc.ents || [])
    if (!reachEnt(p2, id, e.x, e.y))
      err(`PROGRESSION: ent ${e.t}${e.cache ? ':' + e.cache : e.id ? ':' + e.id : e.item ? ':' + e.item : ''} at ${id}(${e.x},${e.y}) unreachable with all tools`);
  // crossing sanity: trestle route must NOT be open without boltcutters
  if (reachScreen(p1, 'A7') && !reachScreen(p1, 'A6'))
    warn('A7 reachable without A6 — check trestle layout');
  // all overworld screens reachable with all tools
  for (const id of OVERWORLD_IDS) if (!reachScreen(p2, id)) err(`PROGRESSION: screen ${id} unreachable with all tools`);
}

// ---------- dialog ----------
function vDialog() {
  const D = loadData('data-dialog.js'); if (!D) return;
  const F = loadData('data-font.js');
  const glyphs = new Set(F ? Object.keys(F) : FONT_GLYPHS);
  const checkLine = (where, line) => {
    if (typeof line !== 'string') { err(`${where}: line not a string`); return; }
    if (line.length > 18) err(`${where}: line ${JSON.stringify(line)} is ${line.length} chars (max 18)`);
    for (const ch of line) if (!glyphs.has(ch)) err(`${where}: char "${ch}" not in font`);
  };
  const checkBox = (where, box) => {
    if (!Array.isArray(box) || box.length < 1 || box.length > 3) { err(`${where}: box must be 1-3 lines`); return; }
    box.forEach((l) => checkLine(where, l));
  };
  for (const id of NPC_IDS) {
    const entries = (D.npcs || {})[id];
    if (!entries) { err(`DIALOG.npcs missing "${id}"`); continue; }
    if (!Array.isArray(entries) || !entries.length) { err(`DIALOG.npcs.${id}: empty`); continue; }
    entries.forEach((en, i) => {
      const w = `npcs.${id}[${i}]`;
      if (!en.lines || !en.lines.length || en.lines.length > 3) err(`${w}: 1-3 boxes required`);
      else en.lines.forEach((b) => checkBox(w, b));
      for (const f of [].concat(en.if?.flag ?? [], en.if?.notFlag ?? []))
        if (!FLAGS.includes(f)) warn(`${w}: unknown flag "${f}"`);
      if (en.set?.give && !ITEM_IDS.includes(en.set.give)) err(`${w}: gives unknown item ${en.set.give}`);
    });
    const last = entries[entries.length - 1];
    if (last.if && Object.keys(last.if).length) err(`npcs.${id}: last entry must be unconditional fallback`);
  }
  for (const id of Object.keys(D.npcs || {})) if (!NPC_IDS.includes(id)) warn(`DIALOG extra npc "${id}"`);
  for (const id of SIGN_IDS) {
    const boxes = (D.signs || {})[id];
    if (!boxes) { err(`DIALOG.signs missing "${id}"`); continue; }
    boxes.forEach((b) => checkBox(`signs.${id}`, b));
  }
  for (const id of CARD_IDS) {
    const c = (D.cards || {})[id];
    if (!c) { err(`DIALOG.cards missing "${id}"`); continue; }
    checkBox(`cards.${id}`, c);
  }
  for (const id of ENDING_IDS) {
    const e = (D.endings || {})[id];
    if (!e) { err(`DIALOG.endings missing "${id}"`); continue; }
    if (id !== 'promo' && (!e.title || e.title.length > 18)) err(`endings.${id}: bad title`);
    (e.lines || []).forEach((b) => checkBox(`endings.${id}`, b));
  }
  for (const id of TOAST_IDS) {
    const t = (D.toasts || {})[id];
    if (typeof t !== 'string') { err(`DIALOG.toasts missing "${id}"`); continue; }
    if (t.length > 36) err(`toasts.${id}: ${t.length} chars (max 36)`);
    for (const ch of t) if (!glyphs.has(ch)) err(`toasts.${id}: char "${ch}" not in font`);
  }
  const all = JSON.stringify(D);
  if (!all.includes('NOTHING COMING IN')) err('Dale verbatim line missing');
  if (!all.includes('ONLY THING') || !all.includes('FREE')) err('Reyes verbatim line missing');
}

// ---------- run ----------
const target = process.argv[2] || 'all';
const run = { tiles: vTiles, sprites: vSprites, font: vFont, maps: vMaps, dialog: vDialog };
if (target === 'all') Object.values(run).forEach((f) => f());
else if (run[target]) run[target]();
else { console.error(`unknown target ${target}`); process.exit(2); }

warns.forEach((w) => console.log(`WARN  ${w}`));
errors.forEach((e) => console.log(`ERROR ${e}`));
console.log(`\n${target}: ${errors.length} errors, ${warns.length} warnings`);
process.exit(errors.length ? 1 : 0);
