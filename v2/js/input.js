// Input: keyboard + multi-touch (fixed visible D-pad, A/B/START buttons).
// Direction is measured from the pad's center with axis priority and 1.2x
// hysteresis to avoid diagonal jitter; the active arm lights up.
const Input = {
  held: { up: false, down: false, left: false, right: false, a: false, b: false, start: false },
  just: {},
  dpadPointer: null,
  padEl: null,
  touchDir: null,
  buttonPointers: {},
  DEAD: 14,
  HYST: 1.2,

  init() {
    const KEYS = {
      ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
      w: 'up', s: 'down', a: 'left', d: 'right',
      W: 'up', S: 'down', A: 'left', D: 'right',
      z: 'a', Z: 'a', j: 'a', J: 'a', ' ': 'a',
      x: 'b', X: 'b', k: 'b', K: 'b',
      Enter: 'start', Escape: 'start',
    };
    document.addEventListener('keydown', (e) => {
      const k = KEYS[e.key];
      if (!k) return;
      e.preventDefault();
      if (!e.repeat && !this.held[k]) this.just[k] = true;
      this.held[k] = true;
      GAudio.init(); GAudio.resume();
    });
    document.addEventListener('keyup', (e) => {
      const k = KEYS[e.key];
      if (k) this.held[k] = false;
    });

    const dpad = document.getElementById('dpadZone');
    const pad = document.getElementById('dpad');
    this.padEl = pad;
    if (dpad) {
      const dirFrom = (x, y) => {
        const r = pad.getBoundingClientRect();
        const dx = x - (r.left + r.width / 2);
        const dy = y - (r.top + r.height / 2);
        const ax = Math.abs(dx), ay = Math.abs(dy);
        if (ax < this.DEAD && ay < this.DEAD) return null;
        let dir = this.touchDir;
        if (dir === 'left' || dir === 'right') {
          if (ay > ax * this.HYST) dir = dy < 0 ? 'up' : 'down';
          else dir = dx < 0 ? 'left' : 'right';
        } else if (dir === 'up' || dir === 'down') {
          if (ax > ay * this.HYST) dir = dx < 0 ? 'left' : 'right';
          else dir = dy < 0 ? 'up' : 'down';
        } else {
          dir = ax >= ay ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
        }
        return dir;
      };
      dpad.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        GAudio.init(); GAudio.resume();
        if (this.dpadPointer !== null) return;
        this.dpadPointer = e.pointerId;
        dpad.setPointerCapture(e.pointerId);
        if (pad) pad.classList.add('on');
        this.setTouchDir(dirFrom(e.clientX, e.clientY));
      });
      dpad.addEventListener('pointermove', (e) => {
        if (e.pointerId !== this.dpadPointer) return;
        this.setTouchDir(dirFrom(e.clientX, e.clientY));
      });
      const end = (e) => {
        if (e.pointerId !== this.dpadPointer) return;
        this.dpadPointer = null;
        this.setTouchDir(null);
        if (pad) pad.classList.remove('on');
      };
      dpad.addEventListener('pointerup', end);
      dpad.addEventListener('pointercancel', end);
    }

    for (const [id, key] of [['btnA', 'a'], ['btnB', 'b'], ['btnStart', 'start']]) {
      const el = document.getElementById(id);
      if (!el) continue;
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        GAudio.init(); GAudio.resume();
        this.buttonPointers[e.pointerId] = key;
        if (!this.held[key]) this.just[key] = true;
        this.held[key] = true;
        el.classList.add('on');
        this.vibrate(10);
      });
      const release = (e) => {
        if (this.buttonPointers[e.pointerId] !== key) return;
        delete this.buttonPointers[e.pointerId];
        this.held[key] = false;
        el.classList.remove('on');
      };
      el.addEventListener('pointerup', release);
      el.addEventListener('pointercancel', release);
    }
  },

  setTouchDir(dir) {
    if (this.touchDir === dir) return;
    for (const d of ['up', 'down', 'left', 'right']) {
      if (this.touchDir === d) this.held[d] = false;
    }
    this.touchDir = dir;
    if (this.padEl) {
      this.padEl.classList.remove('dir-up', 'dir-down', 'dir-left', 'dir-right');
      if (dir) this.padEl.classList.add('dir-' + dir);
    }
    if (dir) {
      if (!this.held[dir]) this.just[dir] = true;
      this.held[dir] = true;
    }
  },

  dir() {
    // current movement intent (first held wins, touch already exclusive)
    if (this.held.up) return 'up';
    if (this.held.down) return 'down';
    if (this.held.left) return 'left';
    if (this.held.right) return 'right';
    return null;
  },

  pressed(k) {
    if (this.just[k]) { delete this.just[k]; return true; }
    return false;
  },

  endFrame() {
    this.just = {};
  },

  vibrate(pattern) {
    try {
      if (navigator.vibrate) navigator.vibrate(pattern);
    } catch (e) { /* ignore */ }
  },
};
