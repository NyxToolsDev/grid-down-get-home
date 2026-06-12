// Grid Down: Get Home — boot, fixed-timestep loop, mode state machine,
// player control, interactions, scripted encounters, HUD, menus, endings.
const Game = {
  mode: 'boot',
  st: null,
  meta: null,
  actors: [],
  frame: 0,
  fps: 60,

  // transient ui state
  dialogQ: [], dialogLine: 0, dialogChars: 0, dialogAfter: null,
  choice: null,            // {prompt, options:[{label,cb}], idx}
  card: null,              // {lines, after}
  toastQ: [], toastT: 0,
  trans: null,             // transition state
  menu: null,              // start menu state
  title: null,
  busy: null,              // {t,total,then}
  swingT: 0, iframes: 0, stunT: 0,
  heartbeatT: 0,
  ending: null, report: null, deathCause: null,
  campAsk: null, nightEvent: null,
  moving: null,            // {dir, t, frames, fx, fy}
  walkFrame: 0,
  scale: 1,

  DIRS: { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] },

  // ---------------------------------------------------------------- boot
  init() {
    // top-level const doesn't land on window — probe the lexical globals
    const missing = [];
    try { TILES; } catch (e) { missing.push('TILES'); }
    try { SPRITES; } catch (e) { missing.push('SPRITES'); }
    try { FONT; } catch (e) { missing.push('FONT'); }
    try { MAPS; } catch (e) { missing.push('MAPS'); }
    try { DIALOG; } catch (e) { missing.push('DIALOG'); }
    try { ITEMS; } catch (e) { missing.push('ITEMS'); }
    if (missing.length) {
      document.getElementById('err').textContent = 'MISSING DATA: ' + missing.join(', ');
      return;
    }
    this.meta = Save.loadMeta();
    GAudio.enabled = this.meta.sound;
    R.init(document.getElementById('screen'));
    Input.init();
    this.layout();
    window.addEventListener('resize', () => this.layout());
    this.openTitle();
    let last = performance.now(), acc = 0;
    const loop = (now) => {
      acc += Math.min(100, now - last);
      last = now;
      while (acc >= 1000 / this.fps) {
        acc -= 1000 / this.fps;
        this.update();
        Input.endFrame();
        this.frame++;
      }
      this.draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  },

  layout() {
    const touch = matchMedia('(pointer: coarse)').matches;
    const deck = document.getElementById('deck');
    const availH = touch ? window.innerHeight * 0.58 : window.innerHeight - 16;
    const scale = Math.max(1, Math.floor(Math.min(window.innerWidth / R.W, availH / R.H)));
    this.scale = scale;
    const c = document.getElementById('screen');
    c.style.width = (R.W * scale) + 'px';
    c.style.height = (R.H * scale) + 'px';
    if (deck) deck.style.display = touch ? 'flex' : 'none';
  },

  rngState: 1,
  rng() {
    // mulberry32
    this.rngState |= 0; this.rngState = (this.rngState + 0x6D2B79F5) | 0;
    let t = Math.imul(this.rngState ^ (this.rngState >>> 15), 1 | this.rngState);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  },
  hashRng(s) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return () => {
      h = (h + 0x6D2B79F5) | 0;
      let t = Math.imul(h ^ (h >>> 15), 1 | h);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },

  // ---------------------------------------------------------------- run state
  newRun(loadoutId, secondWind, ironWalk) {
    const lo = ITEMS.loadouts[loadoutId];
    const st = {
      v: 1, seed: (Math.random() * 0xffffffff) >>> 0,
      loadout: loadoutId, secondWind, ironWalk,
      day: 1, clock: 977, gameSec: 0,
      screen: 'INT_OFFICE', px: 4, py: 4, facing: 'down',
      meters: { w: 70, f: 80, h: 100, e: 80 }, hearts: 8,
      bleeding: false, gutOnsetAt: 0, gutUntil: 0, dmgT: {},
      inv: (lo.items || []).slice(), invMax: 3, bSlot: null, keys: [],
      ponchoWorn: false, hoodie: !!lo.hoodie, sneakers: !!lo.speed,
      flags: {}, karma: 0, visited: [], opened: {}, takenKeys: {}, tileOv: {},
      dogStates: {}, fires: {}, noisyScreens: {}, intel: [], boarded: {},
      boardsLeft: 0, flashOn: false, flashCharge: 100,
      cookedTonight: false, boardedTonight: false,
      rainToday: false, tollWarned: false,
      stats: { steps: 0, fights: 0, given: 0, dogsFed: 0, dogsRouted: 0, caches: 0, badDrinks: 0 },
      lastSleep: null,
    };
    this.rngState = st.seed;
    this.st = st;
    this.deathCause = null;
    this.showCard(DIALOG.cards.card_open_1, () => {
      this.showCard(DIALOG.cards.card_open_2, () => {
        this.grantKey('photo');
        this.enterScreen('INT_OFFICE', 4, 4, true);
        this.mode = 'play';
      });
    });
  },

  // ---------------------------------------------------------------- helpers
  sc() { return MAPS.screens[this.st.screen]; },

  tileChar(screenId, x, y) {
    if (x < 0 || x > 9 || y < 0 || y > 7) return '#';
    const ov = this.st && this.st.tileOv[screenId + ':' + x + ',' + y];
    if (ov) return ov;
    const sc = MAPS.screens[screenId];
    let ch = sc.rows[y][x];
    if (this.st && this.st.boarded[screenId + ':' + x + ',' + y]) ch = 'B';
    return ch;
  },

  legendAt(x, y) { return LEGEND[this.tileChar(this.st.screen, x, y)] || LEGEND['#']; },

  walkableFor(x, y, isActor) {
    if (x < 0 || x > 9 || y < 0 || y > 7) return false;
    const ch = this.tileChar(this.st.screen, x, y);
    const L = LEGEND[ch] || LEGEND['#'];
    if (L.solid) return false;
    if (isActor && (ch === '+' || L.hazard)) return false;
    return true;
  },

  entAt(x, y, type) {
    const sc = this.sc();
    return (sc.ents || []).find((e, i) => {
      e._idx = i;
      return e.x === x && e.y === y && (!type || e.t === type);
    });
  },

  hasKey(id) { return this.st.keys.indexOf(id) >= 0; },
  hasInv(id) { return this.st.inv.indexOf(id) >= 0; },
  invCount(id) { return this.st.inv.filter((i) => i === id).length; },

  grantKey(id) {
    if (this.hasKey(id)) return;
    this.st.keys.push(id);
    if (id === 'photo') this.st.flags.photo_have = true;
    if (id === 'insulin') this.st.flags.insulin_have = true;
    this.toast((DIALOG.toasts[id] || ITEMS.defs[id].name));
    GAudio.sfx('item');
    Input.vibrate(50);
  },

  grantItem(id) {
    if (ITEMS.defs[id].kind === 'key' || ITEMS.defs[id].kind === 'quest') { this.grantKey(id); return true; }
    if (this.st.inv.length >= this.st.invMax) { this.toast('PACK FULL.'); return false; }
    if (id === 'boards') { this.st.boardsLeft += 3; }
    this.st.inv.push(id);
    this.toast(DIALOG.toasts[id] || ITEMS.defs[id].name);
    GAudio.sfx('item');
    Input.vibrate(50);
    return true;
  },

  removeInv(id) {
    const i = this.st.inv.indexOf(id);
    if (i >= 0) this.st.inv.splice(i, 1);
    if (this.st.bSlot === id && !this.hasInv(id) && !this.hasKey(id)) this.st.bSlot = null;
  },

  // ---------------------------------------------------------------- screens
  enterScreen(id, x, y, noTrans) {
    const st = this.st;
    st.screen = id; st.px = x; st.py = y;
    this.moving = null;
    if (st.visited.indexOf(id) < 0) st.visited.push(id);
    st.flags.day2plus = st.day >= 2;
    const col = +id.slice(1) || 0;
    if (!id.startsWith('INT') && col >= 7) st.flags.crossed_river = true;
    this.actors = Actors.spawnForScreen(st, id, this.gameApi());
    if (id === 'INT_HOME' && st.day >= 9) this.actors = [];
    this.spawnDynamic(id);
    this.applyPersistentScripts(id);
    Save.saveRun(st);
    if (id === 'INT_HOME') this.checkHome();
  },

  spawnDynamic(id) {
    const st = this.st;
    if (id.startsWith('INT')) return;
    const col = +id.slice(1);
    const phase = Survival.phase(st.clock);
    // ambient walkers: downtown, days 1-2, daytime
    if (col <= 2 && st.day <= 2 && phase === 'day') {
      const n = 1 + Math.floor(this.rng() * 2);
      const ids = ['walker_a', 'walker_b', 'walker_c'];
      for (let i = 0; i < n; i++) {
        const pos = this.freeTile();
        if (pos) {
          const a = Actors.make('npc', pos[0], pos[1], { id: ids[Math.floor(this.rng() * 3)] });
          a.wanderer = true;
          this.actors.push(a);
        }
      }
    }
    // beggar roll: commercial screens (regions 1,3), day 2+, daytime, 30%
    const sc = MAPS.screens[id];
    st.beggarCool = st.beggarCool || {};
    if ((sc.region === 1 || sc.region === 3) && st.day >= 2 && phase === 'day'
      && (st.beggarCool[sc.region] || 0) < st.day && this.rng() < 0.3) {
      const pos = this.freeTile();
      if (pos) {
        st.beggarCool[sc.region] = st.day;
        const a = Actors.make('beggar', pos[0], pos[1], { id: this.rng() < 0.5 ? 'beggar_a' : 'beggar_b' });
        this.actors.push(a);
      }
    }
  },

  applyPersistentScripts(id) {
    const st = this.st;
    if (id === 'D8' && st.flags.photo_shown) {
      const dee = this.actors.find((a) => a.id === 'dee');
      if (dee) this.moveAside(dee);
    }
    if (id === 'C6' && (st.flags.toll_paid || st.flags.toll_fought)) {
      this.openTollGate();
    }
  },

  moveAside(a) {
    for (const d of ['up', 'down', 'left', 'right']) {
      const [dx, dy] = this.DIRS[d];
      if (this.walkableFor(a.x + dx, a.y + dy, true)) {
        a.x += dx; a.y += dy; a.px = a.x * 16; a.py = a.y * 16;
        return;
      }
    }
  },

  openTollGate() {
    const sc = MAPS.screens.C6;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 10; x++) {
      if (sc.rows[y][x] === 'G') this.st.tileOv['C6:' + x + ',' + y] = '=';
    }
  },

  freeTile() {
    for (let tries = 0; tries < 30; tries++) {
      const x = 1 + Math.floor(this.rng() * 8);
      const y = 1 + Math.floor(this.rng() * 6);
      if (this.walkableFor(x, y, true)
        && !(x === this.st.px && y === this.st.py)
        && !this.actors.some((a) => a.x === x && a.y === y)) return [x, y];
    }
    return null;
  },

  // ---------------------------------------------------------------- update
  update() {
    switch (this.mode) {
      case 'title': this.updateTitle(); break;
      case 'loadout': this.updateLoadout(); break;
      case 'play': this.updatePlay(); break;
      case 'dialog': this.updateDialog(); break;
      case 'choice': this.updateChoice(); break;
      case 'card': this.updateCard(); break;
      case 'menu': this.updateMenu(); break;
      case 'transition': this.updateTransition(); break;
      case 'ending': this.updateEnding(); break;
      case 'dead': this.updateDead(); break;
      case 'report': this.updateReport(); break;
      default: break;
    }
    if (this.toastT > 0) this.toastT--;
    else if (this.toastQ.length) { this.toastQ.shift(); if (this.toastQ.length) this.toastT = 90; }
  },

  // ---------------------------------------------------------------- title
  openTitle() {
    this.mode = 'title';
    this.title = { idx: 0 };
    GAudio.setLoop(null);
  },

  titleOptions() {
    const opts = [];
    if (Save.loadRun()) opts.push('CONTINUE');
    opts.push('NEW WALK');
    opts.push('SOUND: ' + (this.meta.sound ? 'ON' : 'OFF'));
    return opts;
  },

  updateTitle() {
    const opts = this.titleOptions();
    if (Input.pressed('up')) { this.title.idx = (this.title.idx + opts.length - 1) % opts.length; GAudio.sfx('blip'); }
    if (Input.pressed('down')) { this.title.idx = (this.title.idx + 1) % opts.length; GAudio.sfx('blip'); }
    if (Input.pressed('a') || Input.pressed('start')) {
      const sel = opts[this.title.idx];
      GAudio.sfx('confirm');
      if (sel === 'CONTINUE') {
        const st = Save.loadRun();
        if (st) {
          this.st = st;
          this.rngState = st.seed ^ (st.day * 7919);
          this.mode = 'play';
          this.enterScreen(st.screen, st.px, st.py, true); // may override to 'ending'
        }
      } else if (sel === 'NEW WALK') {
        this.mode = 'loadout';
        this.title = { idx: 0, sw: true, iron: false };
      } else {
        this.meta.sound = !this.meta.sound;
        GAudio.setEnabled(this.meta.sound);
        Save.saveMeta(this.meta);
      }
    }
  },

  updateLoadout() {
    const t = this.title;
    const rows = 3 + 1 + (this.meta.won ? 1 : 0) + 1; // loadouts, second wind, iron?, start
    if (Input.pressed('up')) { t.idx = (t.idx + rows - 1) % rows; GAudio.sfx('blip'); }
    if (Input.pressed('down')) { t.idx = (t.idx + 1) % rows; GAudio.sfx('blip'); }
    if (Input.pressed('b')) { this.openTitle(); return; }
    if (Input.pressed('a')) {
      GAudio.sfx('confirm');
      if (t.idx < 3) {
        t.pick = ['edc', 'gym', 'prepper'][t.idx];
      } else if (t.idx === 3) {
        t.sw = !t.sw;
      } else if (this.meta.won && t.idx === 4) {
        t.iron = !t.iron;
      } else {
        if (Save.loadRun()) Save.clearRun();
        this.newRun(t.pick || 'edc', t.sw, t.iron);
      }
    }
  },

  // ---------------------------------------------------------------- play
  updatePlay() {
    const st = this.st;
    if (st.hearts <= 0) { this.die(); return; }

    // busy action (searching, prying, cutting)
    if (this.busy) {
      this.busy.t++;
      if (this.busy.t >= this.busy.total) {
        const fn = this.busy.then;
        this.busy = null;
        fn();
      }
      return;
    }

    const env = this.envNow();
    const events = Survival.tick(st, 1 / this.fps, env);
    for (const ev of events) this.onSurvivalEvent(ev);
    if (st.hearts <= 0) { this.die(); return; }

    // rain window
    const inWindow = st.day === 2 ? (st.clock >= 720 && st.clock < 1200) : (st.clock >= 720 && st.clock < 1080);
    st.raining = !!(st.rainToday && inWindow && !this.sc().interior);

    // flashlight drain
    if (st.flashOn) {
      st.flashCharge = Math.max(0, st.flashCharge - (1 / this.fps));
      if (st.flashCharge <= 0 && st.flashOn) { st.flashOn = false; this.toast('FLASHLIGHT DEAD.'); }
    }

    // heartbeat alarm at 2+ conditions
    if (Survival.conditions(st).length >= 2) {
      this.heartbeatT++;
      if (this.heartbeatT >= 120) { this.heartbeatT = 0; GAudio.sfx('heartbeat'); }
    }

    if (this.iframes > 0) this.iframes--;
    if (this.stunT > 0) { this.stunT--; return; }
    if (this.swingT > 0) this.swingT--;

    // movement
    if (this.moving) {
      const m = this.moving;
      m.t++;
      if (m.t >= m.frames) {
        st.px = m.fx; st.py = m.fy;
        this.moving = null;
        st.stats.steps++;
        this.onArrive();
      }
    } else {
      const dir = Input.dir();
      if (dir) this.tryMove(dir);
    }

    // interact / B-use
    if (Input.pressed('a')) this.interact();
    if (Input.pressed('b')) this.useB();
    if (Input.pressed('start')) { this.openMenu(); return; }

    // actors
    this.actors = Actors.update(this.actors, st, this.gameApi());

    // scripted checks
    this.tollCheck();
    this.checkpointCheck();

    // music
    const sc = this.sc();
    const phase = Survival.phase(st.clock);
    const safe = ['INT_CHURCH', 'INT_FARMHOUSE', 'INT_HOME', 'INT_OFFICE'].indexOf(st.screen) >= 0;
    GAudio.setLoop(safe ? 'safe' : (phase === 'day' ? 'day' : 'night'));

    // night camp event resolution
    if (this.nightEvent) this.updateNightEvent();
  },

  envNow() {
    const st = this.st;
    const sc = this.sc();
    let nearFire = false;
    for (const k of Object.keys(st.fires)) {
      const [scr, pos] = k.split(':');
      if (scr !== st.screen) continue;
      const [fx, fy] = pos.split(',').map(Number);
      if (Math.abs(fx - st.px) <= 2 && Math.abs(fy - st.py) <= 2) nearFire = true;
    }
    return {
      moving: !!this.moving,
      outdoors: !sc.interior,
      nearFire,
      darkInterior: !!sc.dark,
    };
  },

  onSurvivalEvent(ev) {
    const st = this.st;
    if (ev.type === 'damage') {
      this.deathCause = ev.cause;
      GAudio.sfx('hurt');
      Input.vibrate(30);
    } else if (ev.type === 'collapse') {
      this.collapse();
    } else if (ev.type === 'dawn') {
      // daily rolls
      st.rainToday = st.day === 2 ? true : (st.day >= 4 ? this.rng() < 0.25 : false);
      if (st.rainToday) st.flags.rain_today = true; else st.flags.rain_today = false;
      if (st.day === 4) this.showCard(DIALOG.cards.card_frost, null);
      else if (st.day === 2 && st.rainToday) this.showCard(DIALOG.cards.card_rain, null);
      else this.showCard(this.dayCard(), null);
    } else if (ev.type === 'gutOnset') {
      this.toast('YOUR STOMACH TURNS.');
      GAudio.sfx('hurt');
    }
  },

  dayCard() {
    return (DIALOG.cards.card_day || ['DAY %']).map((l) => l.replace('%', String(this.st.day)));
  },

  collapse() {
    const st = this.st;
    st.meters.e = 40;
    st.clock += 240;
    if (st.clock >= 1440) { st.clock -= 1440; st.day++; }
    if (!this.sc().interior) {
      st.meters.h = Math.max(0, st.meters.h - 30);
      if (st.inv.length) {
        st.inv.splice(Math.floor(this.rng() * st.inv.length), 1);
        this.toast('YOUR PACK FEELS LIGHTER.');
      }
    }
    this.showCard(DIALOG.cards.card_collapse, null);
  },

  tryMove(dir) {
    const st = this.st;
    st.facing = dir;
    const [dx, dy] = this.DIRS[dir];
    const nx = st.px + dx, ny = st.py + dy;
    // screen edge?
    if (nx < 0 || nx > 9 || ny < 0 || ny > 7) {
      this.tryScreenCross(dir, nx, ny);
      return;
    }
    if (!this.walkableFor(nx, ny, false)) return;
    if (this.actors.some((a) => !a.gone && a.kind !== 'jerky'
      && ((a.moveDir ? (a.tx === nx && a.ty === ny) : (a.x === nx && a.y === ny))))) return;
    this.moving = { dir, t: 0, frames: Survival.walkSpeed(st), fx: nx, fy: ny };
    this.walkFrame++;
  },

  tryScreenCross(dir, nx, ny) {
    const st = this.st;
    if (this.nightEvent) return; // no fleeing the camp mid-event
    if (st.screen.startsWith('INT')) return;
    const row = st.screen[0], col = +st.screen.slice(1);
    const rows = 'ABCDEF';
    let to = null;
    if (dir === 'up') to = rows[rows.indexOf(row) - 1] + col;
    if (dir === 'down') to = rows[rows.indexOf(row) + 1] + col;
    if (dir === 'left') to = row + (col - 1);
    if (dir === 'right') to = row + (col + 1);
    if (!to || !MAPS.screens[to]) return;
    const ek = [st.screen, to].sort().join('|');
    if (MAPS.blockedEdges.indexOf(ek) >= 0) return;
    const ex = dir === 'right' ? 0 : dir === 'left' ? 9 : st.px;
    const ey = dir === 'down' ? 0 : dir === 'up' ? 7 : st.py;
    const ch = this.tileChar(to, ex, ey);
    const L = LEGEND[ch] || LEGEND['#'];
    if (L.solid) return;
    this.startScroll(dir, to, ex, ey);
  },

  startScroll(dir, to, ex, ey) {
    this.trans = { kind: 'scroll', dir, from: this.st.screen, to, ex, ey, t: 0 };
    this.mode = 'transition';
  },

  startFade(to, ex, ey) {
    this.trans = { kind: 'fade', to, ex, ey, t: 0 };
    this.mode = 'transition';
  },

  updateTransition() {
    const tr = this.trans;
    tr.t++;
    if ((tr.kind === 'scroll' && tr.t >= 24) || (tr.kind === 'fade' && tr.t >= 32)) {
      this.trans = null;
      this.mode = 'play';
      // AFTER mode is set: enterScreen may legitimately override it (ending)
      this.enterScreen(tr.to, tr.ex, tr.ey, true);
    }
  },

  onArrive() {
    const st = this.st;
    const ch = this.tileChar(st.screen, st.px, st.py);
    const L = LEGEND[ch] || {};
    if (L.hazard && this.iframes <= 0) {
      st.hearts = Math.max(0, st.hearts - 1);
      this.deathCause = 'hazard';
      this.iframes = 60;
      this.stunT = 20;
      GAudio.sfx('hurt');
      Input.vibrate(30);
    }
    if (L.exit) {
      if (this.nightEvent) return; // stay for the night event
      const d = (this.sc().doors || {})[st.px + ',' + st.py];
      if (d) this.startFade(d.to, d.at[0], d.at[1]);
      return;
    }
    // key item pickup (walk-over)
    const sc = this.sc();
    (sc.ents || []).forEach((e, i) => {
      const tk = st.screen + ':' + i;
      if (e.t === 'key' && e.x === st.px && e.y === st.py && !st.takenKeys[tk]) {
        st.takenKeys[tk] = 1;
        this.grantKey(e.item);
        if (e.item === 'bag') {
          st.invMax = 10;
          st.ponchoWorn = true;
          this.grantItem('stick');
          this.grantItem('bottle');
          st.flags.bag_have = true;
        }
      }
    });
  },

  // ---------------------------------------------------------------- interact
  facingTile() {
    const [dx, dy] = this.DIRS[this.st.facing];
    return [this.st.px + dx, this.st.py + dy];
  },

  interactTarget() {
    const [tx, ty] = this.facingTile();
    const actor = this.actors.find((a) => !a.gone && a.kind !== 'jerky' && a.x === tx && a.y === ty && !a.moveDir);
    if (actor && (actor.kind === 'npc' || actor.kind === 'beggar')) return { kind: 'npc', actor };
    const sc = this.sc();
    let boxEnt = null, signEnt = null;
    (sc.ents || []).forEach((e, i) => {
      if (e.x === tx && e.y === ty) {
        if (e.t === 'box') { e._idx = i; boxEnt = e; }
        if (e.t === 'sign') signEnt = e;
        if (e.t === 'sleepcar') boxEnt = boxEnt; // handled by tile below
      }
    });
    const ch = this.tileChar(this.st.screen, tx, ty);
    if (boxEnt && !this.st.opened[this.st.screen + ':' + tx + ',' + ty]) return { kind: 'box', ent: boxEnt, tx, ty, ch };
    if (signEnt) return { kind: 'sign', ent: signEnt };
    const L = LEGEND[ch] || {};
    if (L.door || L.glass || L.boarded || ch === 'x') return { kind: 'door', ch, tx, ty };
    if (L.gate) return { kind: 'gate', tx, ty };
    if (L.pump) return { kind: 'pump' };
    if (L.water) return { kind: 'water' };
    if (L.fire) return { kind: 'fire', tx, ty };
    if (L.sleep) return { kind: 'sleep', spot: 'bed' };
    if (ch === 'c') {
      const slp = (sc.ents || []).find((e) => e.t === 'sleepcar' && e.x === tx && e.y === ty);
      if (slp) return { kind: 'sleep', spot: 'car' };
      return null;
    }
    return null;
  },

  interact() {
    const st = this.st;
    const t = this.interactTarget();
    if (!t) {
      // bedroll camp: interior floor, or outdoors beside a lit fire
      if (this.hasInv('bedroll') && Camp.canSleep(st)) {
        const here = this.tileChar(st.screen, st.px, st.py);
        const fireLit = Object.keys(st.fires).some((k) => k.indexOf(st.screen + ':') === 0);
        if (this.sc().interior && (here === 'I' || here === 'u')) this.sleepPrompt('bedroll');
        else if (!this.sc().interior && fireLit) this.sleepPrompt('out');
      }
      return;
    }
    switch (t.kind) {
      case 'npc': this.talkTo(t.actor); break;
      case 'box': this.searchBox(t); break;
      case 'sign': this.readSign(t.ent); break;
      case 'door': this.openDoor(t); break;
      case 'gate': this.cutGate(t); break;
      case 'pump':
        st.meters.w = Math.min(100, st.meters.w + 35);
        GAudio.sfx('drink');
        this.toast('COLD AND CLEAN.');
        break;
      case 'water': this.drinkWild(); break;
      case 'fire': this.fireAction(t); break;
      case 'sleep': this.sleepPrompt(t.spot); break;
      default: break;
    }
  },

  talkTo(a) {
    const st = this.st;
    a.facing = Actors.faceToward(a, st.px, st.py);
    if (a.kind === 'beggar') { this.beggarAsks(a, true); return; }
    if (a.hostile) return;
    const id = a.id;
    this.runNpcDialog(id, () => this.npcExtras(id, a));
  },

  runNpcDialog(id, after) {
    const entries = DIALOG.npcs[id] || [];
    const e = entries.find((en) => this.condOk(en.if));
    this.st.flags['met_' + id] = true; // set AFTER entry selection so notFlag met_X self-gates work
    if (!e) { if (after) after(); return; }
    this.startDialog(e.lines.slice(), () => {
      if (e.set) this.applySet(e.set);
      if (after) after();
    });
  },

  condOk(c) {
    if (!c) return true;
    const st = this.st;
    const flags = [].concat(c.flag || []);
    if (flags.some((f) => !st.flags[f])) return false;
    const nflags = [].concat(c.notFlag || []);
    if (nflags.some((f) => st.flags[f])) return false;
    if (c.dayMin && st.day < c.dayMin) return false;
    if (c.dayMax && st.day > c.dayMax) return false;
    if (c.item && !(this.hasKey(c.item) || this.hasInv(c.item))) return false;
    if (c.notItem && (this.hasKey(c.notItem) || this.hasInv(c.notItem))) return false;
    if (c.karmaMin && st.karma < c.karmaMin) return false;
    return true;
  },

  applySet(s) {
    const st = this.st;
    if (s.flags) Object.assign(st.flags, s.flags);
    if (s.give) this.grantItem(s.give);
    if (s.karma) st.karma += s.karma;
  },

  npcExtras(id, a) {
    const st = this.st;
    if (id === 'ames') {
      const opts = [];
      if (st.clock >= 1080 && st.clock < 1140 && !st.flags.soup_today) {
        opts.push({ label: 'HAVE SOUP', cb: () => { st.meters.f = Math.min(100, st.meters.f + 60); st.flags.soup_today = true; GAudio.sfx('eat'); this.toast('WARM. REAL.'); } });
      }
      if (this.invCount('can') >= 2) opts.push({ label: '2 CANS FOR MEDS', cb: () => { this.removeInv('can'); this.removeInv('can'); this.grantItem('meds'); } });
      if (this.invCount('jerky') >= 1) opts.push({ label: 'JERKY FOR BANDAGE', cb: () => { this.removeInv('jerky'); this.grantItem('bandage'); } });
      if (opts.length) {
        opts.push({ label: 'NEVER MIND', cb: null });
        this.openChoice(null, opts);
      }
    } else if ((id === 'ruth' || id === 'earl') && st.flags.insulin_delivered && this.hasKey('insulin')) {
      // the dialog entry flips insulin_delivered (+1 karma); engine pays out
      st.keys.splice(st.keys.indexOf('insulin'), 1);
      st.karma += 1;
      st.meters.f = Math.min(100, st.meters.f + 45);
      st.hearts = Math.min(8, st.hearts + 1);
      if (st.intel.indexOf('A8') < 0) st.intel.push('A8');
      this.toast('HOT STEW. A MAP MARK.');
      GAudio.sfx('item');
    } else if (id === 'dee') {
      // the dialog data sets photo_shown when the player carries the photo
      if (st.flags.photo_shown && !a.movedAside) {
        a.movedAside = true;
        this.moveAside(a);
        GAudio.sfx('confirm');
      }
    } else if (id === 'reyes' && !st.flags.toll_paid && !st.flags.toll_fought && !st.flags.toll_sneaked) {
      this.tollChoice();
    }
  },

  tollChoice() {
    const st = this.st;
    const opts = [];
    if (st.inv.length >= 2) {
      opts.push({ label: 'PAY 2 ITEMS', cb: () => {
        const a = st.inv.pop(); const b = st.inv.pop();
        st.flags.toll_paid = true;
        this.openTollGate();
        this.toast('GAVE ' + ITEMS.defs[a].name + ', ' + ITEMS.defs[b].name + '.');
        GAudio.sfx('confirm');
      } });
    }
    opts.push({ label: 'TURN BACK', cb: null });
    this.openChoice('THE TOLL.', opts);
  },

  searchBox(t) {
    const st = this.st;
    const key = st.screen + ':' + t.tx + ',' + t.ty;
    if (t.ch === 'v' && !this.hasKey('crowbar')) { this.toast('NEED THE CROWBAR.'); GAudio.sfx('deny'); return; }
    this.startBusy(60, () => {
      GAudio.sfx('rustle');
      if (t.ent.cache) {
        const items = ITEMS.caches[t.ent.cache] || [];
        st.cacheTaken = st.cacheTaken || {};
        let i = st.cacheTaken[t.ent.cache] || 0;
        while (i < items.length && this.grantItem(items[i])) i++;
        st.cacheTaken[t.ent.cache] = i;
        if (i >= items.length) {
          st.opened[key] = 1;
          st.stats.caches++;
          this.toast(DIALOG.toasts.cache_found || 'A CACHE.');
        }
        return;
      }
      if (t.ch === 'v') {
        this.noise();
        this.toast(DIALOG.toasts.noise || 'THE SOUND CARRIES.');
      }
      st.opened[key] = 1;
      let table = t.ent.table;
      if (st.screen === 'INT_PHARMACY' && table === 'shelf') table = 'shelf_med';
      const roll = this.hashRng(st.seed + key)();
      const tab = ITEMS.tables[table] || [[100, null]];
      const total = tab.reduce((s, e) => s + e[0], 0);
      let acc = 0, found = null;
      for (const [w, id] of tab) { acc += w; if (roll * total < acc) { found = id; break; } }
      if (found) this.grantItem(found);
      else this.toast('NOTHING USEFUL.');
    });
  },

  readSign(ent) {
    const boxes = DIALOG.signs[ent.text];
    if (boxes) this.startDialog(boxes.slice(), null);
  },

  openDoor(t) {
    const st = this.st;
    const key = st.screen + ':' + t.tx + ',' + t.ty;
    const d = (this.sc().doors || {})[t.tx + ',' + t.ty];
    if (t.ch === 'B') {
      if (st.boarded[key]) { // player-boarded: un-board
        delete st.boarded[key];
        st.boardedTonight = false;
        this.toast('PULLED THE BOARDS.');
        return;
      }
      if (!this.hasKey('crowbar')) { this.toast('BOARDED SHUT.'); GAudio.sfx('deny'); return; }
      this.startBusy(90, () => {
        st.tileOv[key] = 'D';
        this.noise();
        GAudio.sfx('pry');
        this.toast(DIALOG.toasts.door_pried || 'PRIED OPEN.');
      });
      return;
    }
    if (t.ch === 'g') {
      this.startBusy(45, () => {
        st.tileOv[key] = 'D';
        this.noise();
        GAudio.sfx('glass');
        this.toast(DIALOG.toasts.glass_smashed || 'GLASS EVERYWHERE.');
      });
      return;
    }
    if (t.ch === 'x') {
      const opened = this.st.opened[this.st.screen + ':' + t.tx + ',' + t.ty];
      this.toast(opened ? 'NOTHING LEFT.' : 'SEALED.');
      return;
    }
    if (d) {
      GAudio.sfx('door');
      // two-sided interior doors carry at2; pick the side away from the player
      let dest = d.at;
      if (d.at2) {
        const da = Math.abs(d.at[0] - this.st.px) + Math.abs(d.at[1] - this.st.py);
        const db = Math.abs(d.at2[0] - this.st.px) + Math.abs(d.at2[1] - this.st.py);
        dest = db > da ? d.at2 : d.at;
      }
      this.startFade(d.to, dest[0], dest[1]);
    }
  },

  cutGate(t) {
    const st = this.st;
    if (st.screen === 'C6') { this.toast("THEY'RE WATCHING."); GAudio.sfx('deny'); return; }
    if (!this.hasKey('boltcutters')) { this.toast('CHAINED.'); GAudio.sfx('deny'); return; }
    this.startBusy(90, () => {
      st.tileOv[st.screen + ':' + t.tx + ',' + t.ty] = ',';
      GAudio.sfx('cut');
      this.toast(DIALOG.toasts.gate_cut || 'THE CHAIN DROPS.');
    });
  },

  drinkWild() {
    const st = this.st;
    if (this.hasKey('straw')) {
      st.meters.w = Math.min(100, st.meters.w + 35);
      GAudio.sfx('drink');
      this.toast('FILTERED. SAFE.');
      return;
    }
    this.openChoice('DRINK UNFILTERED?', [
      { label: 'DRINK', cb: () => {
        st.meters.w = Math.min(100, st.meters.w + 35);
        st.stats.badDrinks++;
        GAudio.sfx('drink');
        if (this.rng() < 0.35) st.gutOnsetAt = st.gameSec + 180;
        this.toast('IT TASTES OFF.');
      } },
      { label: 'NO', cb: null },
    ]);
  },

  fireAction(t) {
    const st = this.st;
    const key = st.screen + ':' + t.tx + ',' + t.ty;
    if (!st.fires[key]) {
      if (!Survival.hasItem(st, 'matches')) { this.toast('NEED MATCHES.'); GAudio.sfx('deny'); return; }
      st.fires[key] = 1;
      GAudio.sfx('fire');
      this.toast('THE FIRE TAKES.');
      return;
    }
    if (this.invCount('can') >= 1) {
      this.openChoice('COOK A CAN?', [
        { label: 'COOK', cb: () => {
          this.removeInv('can');
          st.cookedTonight = true;
          if (this.st.inv.length < this.st.invMax) this.st.inv.push('hotmeal');
          else { // eat it now
            st.meters.f = Math.min(100, st.meters.f + 45);
            st.meters.h = Math.min(100, st.meters.h + 10);
            st.hearts = Math.min(8, st.hearts + 1);
          }
          GAudio.sfx('eat');
          this.toast('SMELLS LIKE HOME.');
        } },
        { label: 'LEAVE IT', cb: null },
      ]);
    }
  },

  // ---------------------------------------------------------------- B button
  useB() {
    const st = this.st;
    const id = st.bSlot;
    if (!id) { this.toast('NOTHING EQUIPPED.'); return; }
    const def = ITEMS.defs[id];
    if (def.weapon) { this.swing(def); return; }
    if (def.light) {
      if (st.flashCharge <= 0) { this.toast('DEAD BATTERIES.'); GAudio.sfx('deny'); return; }
      st.flashOn = !st.flashOn;
      GAudio.sfx('blip');
      return;
    }
    if (id === 'jerky') { this.throwJerky(); return; }
    if (id === 'bottle') { this.consume(id); return; }
    if (id === 'bandage') { this.consume(id); return; }
    if (id === 'boards') { this.boardDoor(); return; }
  },

  swing(def) {
    const st = this.st;
    if (this.swingT > 0) return;
    if (!Survival.swingAllowed(st)) { this.toast('TOO TIRED.'); GAudio.sfx('deny'); return; }
    this.swingT = 8;
    st.meters.e = Math.max(0, st.meters.e - 2);
    GAudio.sfx('swing');
    const [tx, ty] = this.facingTile();
    const target = this.actors.find((a) => !a.gone && a.x === tx && a.y === ty && (a.kind === 'dog' || (a.kind === 'npc' && (a.hostile || a.id === 'reyes' || a.id === 'guard')) || a.kind === 'shadower' || a.kind === 'prowler'));
    if (!target) return;
    GAudio.sfx('thunk');
    Input.vibrate(20);
    if (target.kind === 'npc' && !target.hostile && (target.id === 'reyes' || target.id === 'guard')) {
      this.startTollFight();
    }
    if (target.kind === 'shadower' && target.stolen) {
      this.grantItem(target.stolen);
      target.stolen = null;
    }
    st.stats.fights++;
    const routed = Actors.hit(target, def.weapon, st, this.gameApi());
    if (target.kind === 'dog') {
      if (routed) { st.stats.dogsRouted++; }
      else if (Actors.adjacent(target, st.px, st.py) && this.rng() < 0.4) {
        this.gameApi().hitPlayer(1, 'dog', target);
      }
    }
    if (target.kind === 'npc' && target.withdrawn) {
      const both = this.actors.filter((a) => a.kind === 'npc' && (a.id === 'reyes' || a.id === 'guard'));
      if (both.every((a) => a.withdrawn)) {
        st.flags.toll_fought = true;
        this.openTollGate();
        this.toast('THEY PULL BACK.');
      }
    }
  },

  startTollFight() {
    for (const a of this.actors) {
      if (a.kind === 'npc' && (a.id === 'reyes' || a.id === 'guard') && !a.withdrawn) a.hostile = true;
    }
  },

  throwJerky() {
    const st = this.st;
    const [dx, dy] = this.DIRS[st.facing];
    let lx = st.px, ly = st.py;
    for (let i = 1; i <= 2; i++) {
      const nx = st.px + dx * i, ny = st.py + dy * i;
      if (!this.walkableFor(nx, ny, true)) break;
      lx = nx; ly = ny;
    }
    if (lx === st.px && ly === st.py) { this.toast('NO ROOM.'); return; }
    this.removeInv('jerky');
    const j = Actors.make('jerky', lx, ly, {});
    this.actors.push(j);
    st.stats.dogsFed++;
    GAudio.sfx('rustle');
  },

  boardDoor() {
    const st = this.st;
    const [tx, ty] = this.facingTile();
    const ch = this.tileChar(st.screen, tx, ty);
    if (ch !== 'D') { this.toast('BOARD WHAT?'); return; }
    if (st.boardsLeft <= 0) { this.toast('NO BOARDS LEFT.'); this.removeInv('boards'); return; }
    st.boardsLeft--;
    st.boarded[st.screen + ':' + tx + ',' + ty] = 1;
    st.boardedTonight = true;
    if (st.boardsLeft <= 0) this.removeInv('boards');
    GAudio.sfx('thunk');
    this.toast('BOARDED. (' + st.boardsLeft + ' LEFT)');
  },

  consume(id) {
    const st = this.st;
    const def = ITEMS.defs[id];
    if (!this.hasInv(id)) return;
    if (id === 'can') {
      if (this.hasKey('opener')) { st.meters.f = Math.min(100, st.meters.f + 35); }
      else if (this.hasKey('crowbar')) { st.meters.f = Math.min(100, st.meters.f + 17); this.toast('SPILLED HALF.'); }
      else { this.toast('NEED AN OPENER.'); GAudio.sfx('deny'); return; }
      this.removeInv(id); GAudio.sfx('eat'); return;
    }
    if (def.charge) {
      if (!this.hasKey('flashlight')) { this.toast('NO FLASHLIGHT.'); return; }
      st.flashCharge = 100;
      this.removeInv(id); GAudio.sfx('confirm');
      this.toast('FRESH BATTERIES.');
      return;
    }
    if (def.water) { st.meters.w = Math.min(100, st.meters.w + def.water); GAudio.sfx('drink'); }
    if (def.food) { st.meters.f = Math.min(100, st.meters.f + def.food); GAudio.sfx('eat'); }
    if (def.warmth) st.meters.h = Math.min(100, st.meters.h + def.warmth);
    if (def.heal) st.hearts = Math.min(8, st.hearts + def.heal);
    if (def.cures === 'bleed') st.bleeding = false;
    if (def.cures === 'gut') { st.gutUntil = 0; st.gutOnsetAt = 0; }
    this.removeInv(id);
  },

  noise() {
    const st = this.st;
    st.noisyScreens[st.screen] = 1;
    for (const a of this.actors) {
      if (a.kind === 'dog' && !a.fed && a.state === 'wander') { a.state = 'alert'; a.t = 0; }
    }
  },

  // ---------------------------------------------------------------- scripted
  tollCheck() {
    const st = this.st;
    if (st.screen !== 'C6' || st.flags.toll_paid || st.flags.toll_fought || st.flags.toll_sneaked) return;
    const reyes = this.actors.find((a) => a.id === 'reyes' && !a.withdrawn);
    const guard = this.actors.find((a) => a.id === 'guard' && !a.withdrawn);
    if (!reyes) return;
    if (reyes.hostile || (guard && guard.hostile)) return;
    // reached the east edge unseen = sneaked across
    if (st.px >= 9) { st.flags.toll_sneaked = true; return; }
    // only a crossing attempt past the gate line counts as getting caught
    if (st.px < 7) return;
    const night = st.clock >= 60 && st.clock < 300; // 01:00-05:00 guard sleeps
    const gApi = this.gameApi();
    let caught;
    if (night) {
      caught = Actors.los(reyes, gApi, 4) || (guard && false);
    } else {
      caught = !gApi.playerCovered; // daylight: the whole crew is watching the deck
    }
    if (caught) {
      if (!st.tollWarned) {
        st.tollWarned = true;
        this.runNpcDialog('reyes', () => {
          // pushed back to the west bank
          st.px = 2; st.py = 3;
          this.moving = null;
          this.tollChoice();
        });
      } else {
        this.startTollFight();
      }
    }
  },

  checkpointCheck() {
    const st = this.st;
    if (st.screen !== 'D8' || st.flags.photo_shown) return;
    const dee = this.actors.find((a) => a.id === 'dee');
    if (!dee) return;
    if (Actors.dist(dee, st.px, st.py) <= 2 && !this.deeTalked) {
      this.deeTalked = true;
      this.runNpcDialog('dee', () => this.npcExtras('dee', dee));
      setTimeout(() => { this.deeTalked = false; }, 4000);
    }
  },

  // beggar interaction (called by actor AI or by player A-press)
  beggarAsks(a, fromPlayer) {
    const st = this.st;
    if (a.resolved) return;
    a.resolved = true;
    this.runNpcDialog(a.id, () => {
      const foods = ['granola', 'can', 'jerky', 'bottle'].filter((f) => this.hasInv(f));
      const opts = [];
      if (foods.length) {
        opts.push({ label: 'GIVE ' + ITEMS.defs[foods[0]].name, cb: () => {
          this.removeInv(foods[0]);
          st.karma += 1;
          st.stats.given++;
          st.flags.fed_beggar = true;
          st.flags.gave_food_today = true;
          a.leaving = true;
          if (a.id === 'beggar_a' && !st.flags.toll_fought && st.intel.indexOf('D7') < 0) {
            st.intel.push('D7'); // culvert cache clue
          }
          this.runNpcDialog(a.id, null); // plays the thanks + intel box
        } });
      }
      opts.push({ label: 'REFUSE', cb: () => {
        a.leaving = true;
        if (this.rng() < 0.2) {
          a.leaving = false;
          a.kind = 'shadower';
          a.asked = true;
        }
      } });
      this.openChoice(null, opts);
    });
  },

  // ---------------------------------------------------------------- game api for actors
  gameApi() {
    const self = this;
    const st = this.st;
    return {
      player: { x: st.px, y: st.py, facing: st.facing },
      playerCovered: (LEGEND[this.tileChar(st.screen, st.px, st.py)] || {}).cover === true,
      playerMoving: !!this.moving || !!Input.dir(),
      night: Survival.phase(st.clock) === 'night',
      walkable: (x, y) => self.walkableFor(x, y, true),
      rng: () => self.rng(),
      sfx: (n) => GAudio.sfx(n),
      hitPlayer: (dmg, cause, actor) => {
        if (self.iframes > 0) return;
        st.hearts = Math.max(0, st.hearts - dmg);
        self.deathCause = cause;
        self.iframes = 60;
        GAudio.sfx(dmg >= 2 ? 'heart' : 'hurt');
        Input.vibrate(dmg >= 2 ? [30, 40, 30] : 30);
        if (cause === 'dog' && self.rng() < 0.15) st.bleeding = true;
        // knockback 1 tile
        if (actor) {
          const dx = Math.sign(st.px - actor.x), dy = Math.sign(st.py - actor.y);
          if (self.walkableFor(st.px + dx, st.py + dy, false)) { st.px += dx; st.py += dy; self.moving = null; }
        }
      },
      beggarAsks: (a) => self.beggarAsks(a),
      shadowerSteals: (a) => {
        if (st.inv.length) {
          const i = Math.floor(self.rng() * st.inv.length);
          a.stolen = st.inv.splice(i, 1)[0];
          self.toast('YOUR PACK IS LIGHTER.');
          GAudio.sfx('deny');
        }
      },
      prowlerGone: () => { if (self.nightEvent) self.resolveNightEvent(true); },
    };
  },

  // ---------------------------------------------------------------- camp & sleep
  sleepPrompt(spot) {
    const st = this.st;
    if (!Camp.canSleep(st)) { this.toast('TOO EARLY TO SLEEP.'); return; }
    const fireLit = Object.keys(st.fires).some((k) => k.indexOf(st.screen + ':') === 0);
    const vis = Camp.visibility(st, st.screen, spot);
    this.openChoice('SLEEP? VIS ' + vis + '/5', [
      { label: 'SLEEP UNTIL DAWN', cb: () => this.doSleep(spot, fireLit) },
      { label: 'STAY UP', cb: null },
    ]);
  },

  doSleep(spot, fireLit) {
    const st = this.st;
    GAudio.sfx('sleep');
    const { event } = Camp.roll(st, st.screen, spot, () => this.rng());
    if (event === 'prowler' && !st.screen.startsWith('INT_CHURCH')) {
      const boardedHere = Object.keys(st.boarded).some((k) => k.indexOf(st.screen + ':') === 0);
      if (st.clock >= 1140) st.day += 1; // crossed midnight while asleep
      st.clock = 120; // 02:00
      if (boardedHere) {
        GAudio.sfx('rattle');
        this.showCard(['SOMETHING RATTLES', 'THE DOOR. THE', 'BOARDS HOLD.'], () => {
          this.finishSleep(spot, fireLit);
        });
      } else {
        this.nightEvent = { kind: 'prowler', t: 0, spot, fireLit };
        const pos = this.freeTile() || [1, 1];
        const p = Actors.make('prowler', pos[0], pos[1], { id: 'prowler', target: [st.px, st.py] });
        this.actors.push(p);
        this.showCard(['YOU WAKE TO', 'FOOTSTEPS.'], null);
      }
      return;
    }
    if (event === 'dogs') {
      if (st.clock >= 1140) st.day += 1; // crossed midnight while asleep
      st.clock = 120;
      this.nightEvent = { kind: 'dogs', t: 0, spot, fireLit, still: 0 };
      for (let i = 0; i < 2; i++) {
        const pos = this.freeTile();
        if (pos) {
          const d = Actors.make('dog', pos[0], pos[1], { nightWatch: true });
          d.state = 'alert';
          this.actors.push(d);
        }
      }
      this.showCard(['LOW SHAPES AT THE', 'EDGE OF THE DARK.', 'HOLD STILL.'], null);
      return;
    }
    this.finishSleep(spot, fireLit);
  },

  finishSleep(spot, fireLit) {
    const st = this.st;
    const notes = Camp.applySleep(st, spot, fireLit);
    st.lastSleep = null; // never nest snapshots inside snapshots
    st.lastSleep = JSON.parse(JSON.stringify(st));
    Save.saveRun(st);
    GAudio.sfx('dawn');
    const lines = this.dayCard().concat(notes.length ? [notes[0]] : []);
    this.showCard(lines.slice(0, 3), () => {
      this.actors = Actors.spawnForScreen(st, st.screen, this.gameApi());
      this.applyPersistentScripts(st.screen);
    });
  },

  updateNightEvent() {
    const ne = this.nightEvent;
    const st = this.st;
    ne.t++;
    if (ne.kind === 'prowler') {
      const p = this.actors.find((a) => a.kind === 'prowler' && !a.gone);
      if (!p) { this.resolveNightEvent(true); return; }
      if (ne.t > 600 && !p.fleeing) {
        // he grabs and goes
        if (st.inv.length) {
          st.inv.splice(Math.floor(this.rng() * st.inv.length), 1);
          this.toast('SOMETHING IS GONE.');
        }
        p.fleeing = true;
      }
      const [ftx, fty] = this.facingTile();
      if (ftx === p.x && fty === p.y && this.swingT > 0 && !p.fleeing) {
        if (this.rng() < 0.25) this.gameApi().hitPlayer(2, 'human', p);
        p.fleeing = true;
      }
    } else if (ne.kind === 'dogs') {
      if (!this.moving && !Input.dir()) ne.still++;
      else ne.still = 0;
      if (ne.still >= 600) {
        this.actors = this.actors.filter((a) => a.kind !== 'dog' || a.key);
        this.resolveNightEvent(false);
        return;
      }
      if (this.actors.filter((a) => a.kind === 'dog' && !a.key && !a.gone).length === 0) this.resolveNightEvent(false);
    }
  },

  resolveNightEvent() {
    const ne = this.nightEvent;
    this.nightEvent = null;
    this.finishSleep(ne.spot, ne.fireLit);
  },

  // ---------------------------------------------------------------- dialog/choice/card/toast
  startDialog(boxes, after) {
    this.dialogQ = boxes;
    this.dialogLine = 0;
    this.dialogChars = 0;
    this.dialogAfter = after;
    this.mode = 'dialog';
  },

  updateDialog() {
    const box = this.dialogQ[0];
    if (!box) { this.endDialog(); return; }
    const full = box.join('\n').length;
    if (this.dialogChars < full) {
      this.dialogChars += 0.5;
      if (this.frame % 4 === 0) GAudio.sfx('blip');
      if (Input.pressed('a') || Input.pressed('b')) this.dialogChars = full;
      return;
    }
    if (Input.pressed('a') || Input.pressed('b')) {
      this.dialogQ.shift();
      this.dialogChars = 0;
      if (!this.dialogQ.length) this.endDialog();
      else GAudio.sfx('blip');
    }
  },

  endDialog() {
    this.mode = 'play';
    const after = this.dialogAfter;
    this.dialogAfter = null;
    if (after) after();
  },

  openChoice(prompt, options) {
    this.choice = { prompt, options, idx: 0 };
    this.mode = 'choice';
  },

  updateChoice() {
    const c = this.choice;
    if (Input.pressed('up')) { c.idx = (c.idx + c.options.length - 1) % c.options.length; GAudio.sfx('blip'); }
    if (Input.pressed('down')) { c.idx = (c.idx + 1) % c.options.length; GAudio.sfx('blip'); }
    if (Input.pressed('b')) { this.choice = null; this.mode = 'play'; return; }
    if (Input.pressed('a')) {
      const opt = c.options[c.idx];
      this.choice = null;
      this.mode = 'play';
      GAudio.sfx('confirm');
      if (opt.cb) opt.cb();
    }
  },

  showCard(lines, after) {
    this.card = { lines: lines || ['...'], after, t: 0 };
    this.mode = 'card';
  },

  updateCard() {
    this.card.t++;
    if (this.card.t > 30 && (Input.pressed('a') || Input.pressed('start'))) {
      const after = this.card.after;
      this.card = null;
      this.mode = 'play';
      GAudio.sfx('blip');
      if (after) after();
    }
  },

  toast(msg) {
    if (!msg) return;
    this.toastQ.push(msg.toUpperCase().slice(0, 36));
    if (this.toastQ.length === 1) this.toastT = 90;
  },

  startBusy(total, then) {
    this.busy = { t: 0, total, then };
  },

  // ---------------------------------------------------------------- menu
  openMenu() {
    this.menu = { page: 0, idx: 0 };
    this.mode = 'menu';
    GAudio.sfx('confirm');
  },

  menuItems() {
    const st = this.st;
    return st.keys.map((k) => ({ id: k, key: true })).concat(st.inv.map((i) => ({ id: i, key: false })));
  },

  updateMenu() {
    const m = this.menu;
    const PAGES = 4;
    if (Input.pressed('left')) { m.page = (m.page + PAGES - 1) % PAGES; m.idx = 0; GAudio.sfx('blip'); }
    if (Input.pressed('right')) { m.page = (m.page + 1) % PAGES; m.idx = 0; GAudio.sfx('blip'); }
    if (Input.pressed('start') || Input.pressed('b')) {
      this.menu = null;
      this.mode = 'play';
      Save.saveRun(this.st);
      return;
    }
    if (m.page === 0) {
      const items = this.menuItems();
      if (Input.pressed('up')) { m.idx = Math.max(0, m.idx - 1); GAudio.sfx('blip'); }
      if (Input.pressed('down')) { m.idx = Math.min(Math.max(0, items.length - 1), m.idx + 1); GAudio.sfx('blip'); }
      if (Input.pressed('a') && items[m.idx]) {
        const it = items[m.idx];
        const def = ITEMS.defs[it.id];
        if (def.equip) {
          this.st.bSlot = it.id;
          GAudio.sfx('confirm');
          this.toast('B: ' + def.name);
        } else if (!it.key) {
          this.consume(it.id);
        } else {
          this.toast(DIALOG.toasts[it.id] || def.name);
        }
      }
    } else if (m.page === 3) {
      const opts = ['SOUND: ' + (this.meta.sound ? 'ON' : 'OFF'), 'SAVE + QUIT', 'ABANDON RUN'];
      if (Input.pressed('up')) { m.idx = (m.idx + opts.length - 1) % opts.length; GAudio.sfx('blip'); }
      if (Input.pressed('down')) { m.idx = (m.idx + 1) % opts.length; GAudio.sfx('blip'); }
      if (Input.pressed('a')) {
        if (m.idx === 0) {
          this.meta.sound = !this.meta.sound;
          GAudio.setEnabled(this.meta.sound);
          Save.saveMeta(this.meta);
        } else if (m.idx === 1) {
          Save.saveRun(this.st);
          this.menu = null;
          this.openTitle();
        } else {
          this.menu = null;
          this.openChoice('ABANDON THE WALK?', [
            { label: 'KEEP WALKING', cb: null },
            { label: 'ABANDON', cb: () => { Save.clearRun(); this.openTitle(); } },
          ]);
        }
      }
    }
  },

  // ---------------------------------------------------------------- endings & death
  checkHome() {
    // called on entering INT_HOME
    const st = this.st;
    let id;
    if (st.day >= 9) id = 'empty_house';
    else if (st.day <= 4) id = 'before_wave';
    else if (st.day <= 6) id = 'homecoming';
    else id = 'long_way';
    const e = DIALOG.endings[id] || { title: 'HOME', lines: [['YOU MADE IT.']] };
    this.ending = { id, e, stage: 0 };
    this.mode = 'ending';
    GAudio.setLoop(null);
    GAudio.sfx('ending');
    this.meta.won = true;
    this.meta.iron = this.meta.iron || st.ironWalk;
    Save.saveMeta(this.meta);
  },

  updateEnding() {
    const en = this.ending;
    if (!en.dialogStarted) {
      en.dialogStarted = true;
      const boxes = (en.e.lines || [['YOU MADE IT.']]).slice();
      const promo = DIALOG.endings.promo;
      if (promo && promo.lines) boxes.push(...promo.lines);
      this.startDialog(boxes, () => {
        this.openReport(en.e.title || 'HOME');
      });
      // startDialog flips mode to 'dialog'; when it ends it calls openReport
    }
  },

  die() {
    const st = this.st;
    GAudio.setLoop(null);
    GAudio.sfx('death');
    const map = { cold: 'card_death_cold', dog: 'card_death_dogs', bleed: 'card_death_dogs', human: 'card_death_human', hunger: 'card_death_hunger', thirst: 'card_death_thirst' };
    const card = DIALOG.cards[map[this.deathCause]] || ['THE ROAD ITSELF', 'GOT YOU IN THE', 'END.'];
    this.mode = 'dead';
    this.deadCard = { lines: card, t: 0 };
  },

  updateDead() {
    this.deadCard.t++;
    if (this.deadCard.t < 60) return;
    if (!(Input.pressed('a') || Input.pressed('start'))) return;
    const st = this.st;
    if (st.secondWind && st.lastSleep) {
      this.openChoice('SECOND WIND?', [
        { label: 'GET UP', cb: () => {
          const ls = JSON.parse(JSON.stringify(st.lastSleep));
          ls.hearts = Math.max(1, ls.hearts - 2);
          if (ls.inv.length) ls.inv.splice(Math.floor(this.rng() * ls.inv.length), 1);
          ls.lastSleep = null;
          ls.lastSleep = JSON.parse(JSON.stringify(ls));
          this.st = ls;
          Save.saveRun(ls);
          this.enterScreen(ls.screen, ls.px, ls.py, true);
          this.mode = 'play';
        } },
        { label: 'LET GO', cb: () => { Save.clearRun(); this.openReport(null); } },
      ]);
    } else {
      Save.clearRun();
      this.openReport(null);
    }
  },

  openReport(endingTitle) {
    const st = this.st;
    this.report = {
      title: endingTitle || 'THE WALK ENDS',
      rows: [
        ['DAYS', String(st.day)],
        ['SCREENS SEEN', String(st.visited.length)],
        ['FIGHTS', String(st.stats.fights)],
        ['DOGS FED', String(st.stats.dogsFed)],
        ['DOGS ROUTED', String(st.stats.dogsRouted)],
        ['ITEMS GIVEN', String(st.stats.given)],
        ['CACHES', st.stats.caches + '/6'],
        ['BAD DRINKS', String(st.stats.badDrinks)],
      ],
      won: !!endingTitle,
    };
    if (endingTitle) Save.clearRun();
    this.mode = 'report';
  },

  updateReport() {
    if (Input.pressed('a') || Input.pressed('start')) {
      this.report = null;
      this.openTitle();
    }
  },

  // ================================================================= draw
  draw() {
    if (!R.ready) return;
    switch (this.mode) {
      case 'title': this.drawTitle(); break;
      case 'loadout': this.drawLoadout(); break;
      case 'card': this.drawCard(this.card.lines); break;
      case 'dead': this.drawCard(this.deadCard.lines); break;
      case 'report': this.drawReport(); break;
      case 'menu': this.drawMenu(); break;
      case 'transition': this.drawTransition(); break;
      default:
        if (this.st) this.drawWorldFrame();
        break;
    }
  },

  drawTitle() {
    R.ctx.fillStyle = R.PAL[0];
    R.ctx.fillRect(0, 0, R.W, R.H);
    R.textCenter('GRID DOWN', 28, true);
    R.textCenter('GET HOME', 44, true);
    R.fillAbs(40, 56, 80, 1, 2);
    const opts = this.titleOptions();
    opts.forEach((o, i) => {
      const y = 80 + i * 14;
      if (i === this.title.idx) R.text('>', 30, y, true);
      R.text(o, 42, y, true);
    });
    R.textCenter('38 MILES TO WALK', 128, true);
  },

  drawLoadout() {
    R.ctx.fillStyle = R.PAL[0];
    R.ctx.fillRect(0, 0, R.W, R.H);
    R.textCenter('CHOOSE YOUR BAG', 8, true);
    const t = this.title;
    const rows = [
      ITEMS.loadouts.edc.name, ITEMS.loadouts.gym.name, ITEMS.loadouts.prepper.name,
      'SECOND WIND: ' + (t.sw ? 'ON' : 'OFF'),
    ];
    if (this.meta.won) rows.push('IRON WALK: ' + (t.iron ? 'ON' : 'OFF'));
    rows.push('START');
    rows.forEach((r, i) => {
      const y = 24 + i * 12;
      if (i === t.idx) R.text('>', 8, y, true);
      const sel = i < 3 && ['edc', 'gym', 'prepper'][i] === t.pick;
      R.text((sel ? '*' : '') + r, 18, y, true);
    });
    const focus = t.idx < 3 ? ['edc', 'gym', 'prepper'][t.idx] : null;
    if (focus) {
      const d = ITEMS.loadouts[focus].desc || '';
      R.text(d.slice(0, 19), 4, 112, true);
      R.text(d.slice(19, 38), 4, 122, true);
    } else {
      R.text('B-BACK  A-PICK', 4, 122, true);
    }
  },

  drawCard(lines) {
    R.ctx.fillStyle = R.PAL[0];
    R.ctx.fillRect(0, 0, R.W, R.H);
    (lines || []).forEach((l, i) => R.textCenter(l, 56 + i * 12, true));
    if (this.frame % 60 < 40) R.textCenter('A', 128, true);
  },

  drawReport() {
    R.ctx.fillStyle = R.PAL[0];
    R.ctx.fillRect(0, 0, R.W, R.H);
    R.textCenter(this.report.title, 8, true);
    this.report.rows.forEach((r, i) => {
      R.text(r[0], 8, 26 + i * 11, true);
      R.text(r[1], 152 - r[1].length * 8, 26 + i * 11, true);
    });
    if (this.st && this.st.ironWalk) R.textCenter('IRON WALK', 118, true);
    R.textCenter('A: TITLE', 130, true);
  },

  drawTransition() {
    const tr = this.trans;
    if (tr.kind === 'fade') {
      const half = tr.t < 16;
      if (half) {
        this.drawWorldFrame();
        const a = tr.t / 16;
        R.ctx.fillStyle = 'rgba(15,56,15,' + a + ')';
        R.ctx.fillRect(0, 0, R.W, R.H);
      } else {
        // draw destination
        const a = 1 - (tr.t - 16) / 16;
        this.drawScreenMap(tr.to, 0, 16);
        this.drawHud();
        R.ctx.fillStyle = 'rgba(15,56,15,' + a + ')';
        R.ctx.fillRect(0, 0, R.W, R.H);
      }
      return;
    }
    // scroll
    const p = tr.t / 24;
    const [dx, dy] = this.DIRS[tr.dir];
    const ox = -dx * 160 * p, oy = -dy * 128 * p;
    R.ctx.fillStyle = R.PAL[0];
    R.ctx.fillRect(0, 0, R.W, R.H);
    this.drawScreenMap(tr.from, ox, 16 + oy);
    this.drawScreenMap(tr.to, ox + dx * 160, 16 + oy + dy * 128);
    this.drawHud();
  },

  resolveTileForDraw(screenId, x, y) {
    let ch = this.tileChar(screenId, x, y);
    const st = this.st;
    if (ch === 'F' && st.fires[screenId + ':' + x + ',' + y]) return 'firepit_lit';
    const L = LEGEND[ch] || LEGEND['#'];
    let name = L.t;
    if (ch === 'c') {
      const left = x > 0 ? this.tileChar(screenId, x - 1, y) : '';
      if (left === 'c') name = 'car_r';
    }
    return name;
  },

  drawScreenMap(screenId, ox, oy) {
    const sc = MAPS.screens[screenId];
    if (!sc) return;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 10; x++) {
        const name = this.resolveTileForDraw(screenId, x, y);
        const flip = name === 'water' && (((this.frame >> 5) + x + y) % 2 === 0);
        R.draw(name, ox + x * 16, oy + y * 16, { flip });
      }
    }
    // searched markers
    const st = this.st;
    for (const k of Object.keys(st.opened)) {
      const [scr, pos] = k.split(':');
      if (scr !== screenId) continue;
      const [x, y] = pos.split(',').map(Number);
      R.draw('searched', ox + x * 16 + 8, oy + y * 16, {});
    }
    // key items on ground
    (sc.ents || []).forEach((e, i) => {
      if (e.t === 'key' && !st.takenKeys[screenId + ':' + i]) {
        R.draw('item_' + e.item, ox + e.x * 16 + 4, oy + e.y * 16 + 4, {});
      }
    });
  },

  drawWorldFrame() {
    const st = this.st;
    const env = this.envNow();
    R.ramp = Survival.ramp(st, env);
    R.ctx.fillStyle = R.PAL[0];
    R.ctx.fillRect(0, 0, R.W, R.H);
    this.drawScreenMap(st.screen, 0, 16);

    // actors
    for (const a of this.actors) {
      if (a.gone) continue;
      const ax = a.px, ay = 16 + a.py;
      if (a.kind === 'jerky') { R.draw('item_jerky', ax + 4, ay + 4, {}); continue; }
      let spr, flip = false;
      const f = (a.moveDir ? (Math.floor(a.moveT / 8) % 2) : 0);
      if (a.kind === 'dog') {
        spr = a.state === 'alert' ? 'dog_alert' : 'dog_' + f;
        flip = a.facing === 'right';
      } else if (a.kind === 'npc' && !a.wanderer && a.id !== 'guard' && SPRITES['npc_' + a.id]) {
        spr = 'npc_' + a.id;
      } else {
        const dirMap = { down: 'd', up: 'u', left: 's', right: 's' };
        spr = 'human_' + dirMap[a.facing] + f;
        flip = a.facing === 'right';
      }
      R.draw(spr, ax, ay, { flip });
      if (a.state === 'alert') R.draw('alert_bang', ax + 4, ay - 8, {});
      if (a.kind === 'npc' && a.id === 'guard' && st.clock >= 60 && st.clock < 300) R.draw('zzz', ax + 8, ay - 8, {});
    }

    // player
    const ppx = this.moving
      ? (st.px + (this.moving.fx - st.px) * (this.moving.t / this.moving.frames)) * 16
      : st.px * 16;
    const ppy = this.moving
      ? (st.py + (this.moving.fy - st.py) * (this.moving.t / this.moving.frames)) * 16
      : st.py * 16;
    const blink = this.iframes > 0 && (this.frame % 8 < 4);
    if (!blink) {
      const dirMap = { down: 'd', up: 'u', left: 's', right: 's' };
      const f = this.moving ? (Math.floor(this.moving.t / 8) % 2) : 0;
      R.draw('player_' + dirMap[st.facing] + f, ppx, 16 + ppy, { flip: st.facing === 'right' });
    }
    // swing flash
    if (this.swingT > 0 && st.bSlot && ITEMS.defs[st.bSlot] && ITEMS.defs[st.bSlot].weapon) {
      const [dx, dy] = this.DIRS[st.facing];
      R.draw('item_' + st.bSlot, ppx + 4 + dx * 12, 16 + ppy + 4 + dy * 12, {});
    }
    // interaction cue
    if (!this.moving && this.interactTarget()) {
      R.draw('alert_bang', ppx + 4, 16 + ppy - 9, {});
    }
    // busy progress
    if (this.busy) {
      const w = Math.floor(16 * (this.busy.t / this.busy.total));
      R.fillAbs(ppx, 16 + ppy - 3, w, 2, 3);
    }

    // vision dither
    const radius = Survival.visionRadius(st, env);
    if (radius < 20) R.dither(ppx + 8, ppy + 8, radius);

    // rain / frost
    if (st.raining) R.rain(this.frame);
    else if (st.flags.frost_started && Survival.phase(st.clock) === 'predawn' && !this.sc().interior) R.frost(this.frame);

    this.drawHud();

    // toast
    if (this.toastQ.length && this.toastT > 0) {
      const msg = this.toastQ[0];
      const w = Math.min(156, msg.length * 8 + 6);
      R.box(2, 17, w, 13);
      R.text(msg.slice(0, 18), 5, 20, false);
    }

    // dialog / choice overlays
    if (this.mode === 'dialog') this.drawDialog();
    if (this.mode === 'choice') this.drawChoice();
  },

  drawHud() {
    const st = this.st;
    R.fillAbs(0, 0, R.W, 16, 0);
    // hearts
    for (let i = 0; i < 4; i++) {
      const v = st.hearts - i * 2;
      R.draw(v >= 2 ? 'heart_full' : v === 1 ? 'heart_half' : 'heart_empty', 2 + i * 8, 1, {});
    }
    // phase + day
    const phase = Survival.phase(st.clock);
    const conds = Survival.conditions(st);
    let pIcon = (phase === 'day' || phase === 'dusk') ? 'icon_sun' : 'icon_moon';
    if (conds.length && (this.frame % 120) >= 60) {
      if (st.bleeding) pIcon = 'icon_bleed';
      else if (st.gutUntil > 0 && st.gameSec < st.gutUntil) pIcon = 'icon_gut';
      else if (st.meters.h <= 20) pIcon = 'icon_cold';
    }
    R.draw(pIcon, 132, 1, {});
    R.text('D' + st.day, 142, 1, true);
    // meters
    const bars = [
      ['icon_drop', 2, 9, st.meters.w],
      ['icon_can', 41, 48, st.meters.f],
      ['icon_flame', 80, 87, st.meters.h],
      ['icon_bolt', 119, 126, st.meters.e],
    ];
    for (const [icon, ix, bx, val] of bars) {
      R.draw(icon, ix, 8, {});
      R.fillAbs(bx + 7, 10, 22, 4, 1);
      const fill = Math.ceil((val / 100) * 22);
      const blink = val <= 20 && (this.frame % 30 < 15);
      if (!blink && fill > 0) R.fillAbs(bx + 7, 10, fill, 4, 3);
    }
  },

  drawDialog() {
    R.box(0, 96, 160, 48);
    const box = this.dialogQ[0] || [''];
    let remaining = Math.floor(this.dialogChars);
    for (let i = 0; i < box.length; i++) {
      const line = box[i];
      const show = line.slice(0, Math.max(0, remaining));
      remaining -= line.length + 1;
      R.text(show, 6, 103 + i * 12, false);
    }
    const full = box.join('\n').length;
    if (this.dialogChars >= full && this.frame % 40 < 25) R.draw('icon_arrow', 148, 134, {});
  },

  drawChoice() {
    const c = this.choice;
    const h = 16 + c.options.length * 12 + (c.prompt ? 12 : 0);
    const y = 144 - h;
    R.box(28, y, 132 - 28 + 28, h);
    let yy = y + 6;
    if (c.prompt) { R.text(c.prompt.slice(0, 15), 36, yy, false); yy += 12; }
    c.options.forEach((o, i) => {
      if (i === c.idx) R.text('>', 34, yy, false);
      R.text(o.label.slice(0, 14), 44, yy, false);
      yy += 12;
    });
  },

  drawMenu() {
    const st = this.st;
    R.ctx.fillStyle = R.PAL[0];
    R.ctx.fillRect(0, 0, R.W, R.H);
    const m = this.menu;
    const titles = ['PACK', 'MAP', 'STATUS', 'SYSTEM'];
    R.textCenter('< ' + titles[m.page] + ' >', 4, true);
    if (m.page === 0) {
      const items = this.menuItems();
      R.text('SLOTS ' + st.inv.length + '/' + st.invMax, 8, 16, true);
      if (st.bSlot) R.text('B: ' + ITEMS.defs[st.bSlot].name.slice(0, 12), 8, 26, true);
      items.slice(0, 9).forEach((it, i) => {
        const y = 40 + i * 11;
        if (i === m.idx) R.text('>', 4, y, true);
        R.draw('item_' + it.id, 14, y, {});
        R.text((it.key ? '*' : '') + ITEMS.defs[it.id].name.slice(0, 15), 26, y, true);
      });
      if (!items.length) R.textCenter('EMPTY POCKETS', 70, true);
    } else if (m.page === 1) {
      if (!this.hasKey('map')) {
        R.textCenter('NO MAP.', 64, true);
        R.textCenter('TRY THE GAS', 78, true);
        R.textCenter('STATION.', 88, true);
      } else {
        const rows = 'ABCDEF';
        for (let r = 0; r < 6; r++) {
          for (let c = 1; c <= 8; c++) {
            const id = rows[r] + c;
            if (!MAPS.screens[id]) continue;
            const x = 16 + (c - 1) * 16, y = 24 + r * 13;
            const visited = st.visited.indexOf(id) >= 0;
            R.fillAbs(x, y, 14, 11, visited ? 2 : 1);
            if (st.intel.indexOf(id) >= 0) R.draw('icon_dot', x + 3, y + 2, {});
            if (st.screen === id && this.frame % 30 < 20) R.fillAbs(x + 5, y + 4, 4, 4, 0);
          }
        }
        R.text('HOME: F8 EAST', 30, 112, true);
      }
    } else if (m.page === 2) {
      const lines = [
        'DAY ' + st.day + '  ' + Survival.clockStr(st.clock),
        'WATER ' + Math.round(st.meters.w),
        'FOOD  ' + Math.round(st.meters.f),
        'WARM  ' + Math.round(st.meters.h),
        'REST  ' + Math.round(st.meters.e),
      ];
      const conds = Survival.conditions(st);
      lines.push(conds.length ? conds.slice(0, 2).join(' ') : 'STEADY.');
      if (st.flashCharge < 100 && this.hasKey('flashlight')) lines.push('LIGHT ' + Math.round(st.flashCharge) + '%');
      lines.forEach((l, i) => R.text(l, 12, 22 + i * 13, true));
    } else {
      const opts = ['SOUND: ' + (this.meta.sound ? 'ON' : 'OFF'), 'SAVE + QUIT', 'ABANDON RUN'];
      opts.forEach((o, i) => {
        const y = 40 + i * 14;
        if (i === m.idx) R.text('>', 12, y, true);
        R.text(o, 24, y, true);
      });
    }
    R.text('START: CLOSE', 36, 132, true);
  },
};

window.addEventListener('DOMContentLoaded', () => Game.init());
