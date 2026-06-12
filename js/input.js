// Input: keyboard + multi-touch (floating-origin D-pad, A/B/START buttons).
// Direction uses axis priority with 1.2x hysteresis to avoid diagonal jitter.
const Input = {
  held: { up: false, down: false, left: false, right: false, a: false, b: false, start: false },
  just: {},
  dpadPointer: null,
  dpadOrigin: null,
  touchDir: null,
  buttonPointers: {},
  DEAD: 12,
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
    const gfx = document.getElementById('dpadGfx');
    if (dpad) {
      dpad.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        GAudio.init(); GAudio.resume();
        if (this.dpadPointer !== null) return;
        this.dpadPointer = e.pointerId;
        this.dpadOrigin = [e.clientX, e.clientY];
        dpad.setPointerCapture(e.pointerId);
        if (gfx) {
          const r = dpad.getBoundingClientRect();
          gfx.style.left = (e.clientX - r.left) + 'px';
          gfx.style.top = (e.clientY - r.top) + 'px';
          gfx.classList.add('on');
        }
      });
      dpad.addEventListener('pointermove', (e) => {
        if (e.pointerId !== this.dpadPointer) return;
        const dx = e.clientX - this.dpadOrigin[0];
        const dy = e.clientY - this.dpadOrigin[1];
        const ax = Math.abs(dx), ay = Math.abs(dy);
        let dir = this.touchDir;
        if (ax < this.DEAD && ay < this.DEAD) {
          dir = null;
        } else if (dir === 'left' || dir === 'right') {
          if (ay > ax * this.HYST) dir = dy < 0 ? 'up' : 'down';
          else if (ax >= this.DEAD) dir = dx < 0 ? 'left' : 'right';
        } else if (dir === 'up' || dir === 'down') {
          if (ax > ay * this.HYST) dir = dx < 0 ? 'left' : 'right';
          else if (ay >= this.DEAD) dir = dy < 0 ? 'up' : 'down';
        } else {
          dir = ax >= ay ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
        }
        this.setTouchDir(dir);
      });
      const end = (e) => {
        if (e.pointerId !== this.dpadPointer) return;
        this.dpadPointer = null;
        this.setTouchDir(null);
        if (gfx) gfx.classList.remove('on');
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
