// WebAudio chiptune: 2 pulse oscillators + noise. No asset files.
// All SFX are short envelope gestures; loops are note-string sequences.
const GAudio = {
  ctx: null,
  master: null,
  enabled: true,
  loopName: null,
  loopTimer: null,
  loopPos: 0,
  loopNextAt: 0,

  init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.16;
      this.master.connect(this.ctx.destination);
    } catch (e) {
      this.ctx = null;
    }
  },

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },

  setEnabled(on) {
    this.enabled = on;
    if (!on) this.stopLoop();
  },

  freq(note) {
    // "E4" -> Hz
    const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    const m = /^([A-G])(#?)(\d)$/.exec(note);
    if (!m) return 440;
    const n = SEMI[m[1]] + (m[2] ? 1 : 0) + (+m[3] + 1) * 12;
    return 440 * Math.pow(2, (n - 69) / 12);
  },

  pulse(f0, f1, t, dur, vol, type) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  },

  noise(t, dur, vol, low) {
    if (!this.ctx) return;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    let v = 0;
    for (let i = 0; i < len; i++) {
      v = low ? v * 0.96 + (Math.random() * 2 - 1) * 0.2 : Math.random() * 2 - 1;
      d[i] = v;
    }
    const src = this.ctx.createBufferSource();
    const g = this.ctx.createGain();
    src.buffer = buf;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(g); g.connect(this.master);
    src.start(t);
  },

  sfx(name) {
    if (!this.ctx || !this.enabled) return;
    this.resume();
    const t = this.ctx.currentTime;
    switch (name) {
      case 'blip': this.pulse(880, 880, t, 0.03, 0.5); break;
      case 'confirm': this.pulse(660, 990, t, 0.07, 0.5); break;
      case 'deny': this.pulse(220, 110, t, 0.12, 0.5); break;
      case 'item': // 4-note jingle
        this.pulse(this.freq('G4'), 0, t, 0.09, 0.5);
        this.pulse(this.freq('C5'), 0, t + 0.09, 0.09, 0.5);
        this.pulse(this.freq('E5'), 0, t + 0.18, 0.09, 0.5);
        this.pulse(this.freq('G5'), 0, t + 0.27, 0.2, 0.5);
        break;
      case 'rustle': this.noise(t, 0.18, 0.3, true); break;
      case 'door': this.pulse(140, 90, t, 0.1, 0.5); this.noise(t, 0.08, 0.2, true); break;
      case 'pry': this.noise(t, 0.25, 0.4, true); this.pulse(90, 60, t + 0.1, 0.15, 0.5); break;
      case 'glass': this.noise(t, 0.3, 0.5); this.pulse(1200, 400, t, 0.15, 0.3); break;
      case 'bark': this.pulse(300, 180, t, 0.08, 0.6); this.pulse(280, 160, t + 0.12, 0.08, 0.6); break;
      case 'growl': this.pulse(90, 70, t, 0.3, 0.4, 'sawtooth'); break;
      case 'swing': this.noise(t, 0.07, 0.3); break;
      case 'thunk': this.pulse(120, 60, t, 0.09, 0.6); this.noise(t, 0.06, 0.3, true); break;
      case 'hurt': this.pulse(200, 80, t, 0.2, 0.6, 'sawtooth'); break;
      case 'heart': this.pulse(160, 50, t, 0.35, 0.7, 'sawtooth'); break;
      case 'heartbeat': this.pulse(55, 45, t, 0.08, 0.5, 'sine'); this.pulse(50, 40, t + 0.18, 0.08, 0.45, 'sine'); break;
      case 'sleep':
        this.pulse(this.freq('E4'), 0, t, 0.15, 0.4);
        this.pulse(this.freq('C4'), 0, t + 0.18, 0.3, 0.4);
        break;
      case 'dawn':
        this.pulse(this.freq('C4'), 0, t, 0.12, 0.4);
        this.pulse(this.freq('E4'), 0, t + 0.12, 0.12, 0.4);
        this.pulse(this.freq('G4'), 0, t + 0.24, 0.25, 0.4);
        break;
      case 'death':
        this.pulse(this.freq('E3'), 0, t, 0.3, 0.5);
        this.pulse(this.freq('C3'), 0, t + 0.32, 0.5, 0.5);
        this.noise(t + 0.4, 0.6, 0.15, true);
        break;
      case 'ending':
        ['C4', 'E4', 'G4', 'C5', 'E5', 'G5'].forEach((n, i) =>
          this.pulse(this.freq(n), 0, t + i * 0.11, 0.22, 0.45));
        break;
      case 'drink': this.pulse(500, 700, t, 0.06, 0.3, 'sine'); this.pulse(520, 720, t + 0.1, 0.06, 0.3, 'sine'); break;
      case 'eat': this.noise(t, 0.06, 0.25, true); this.noise(t + 0.12, 0.06, 0.25, true); break;
      case 'fire': this.noise(t, 0.5, 0.25, true); break;
      case 'cut': this.pulse(800, 300, t, 0.06, 0.4); this.noise(t + 0.05, 0.1, 0.3); break;
      case 'rattle': this.noise(t, 0.08, 0.3, true); this.noise(t + 0.15, 0.08, 0.3, true); this.noise(t + 0.34, 0.1, 0.35, true); break;
      default: break;
    }
  },

  // --- loops -------------------------------------------------------------
  LOOPS: {
    day: { bpm: 84, vol: 0.32, notes: 'C3:2 G3:2 E3:2 G3:2 A2:2 E3:2 G3:2 E3:2 F3:2 C3:2 E3:2 C3:2 G2:2 D3:2 E3:4' },
    night: { bpm: 50, vol: 0.25, notes: 'C2:8 G2:8 A2:8 E2:8' },
    safe: { bpm: 96, vol: 0.26, notes: 'C4:2 E4:2 G4:2 E4:2 A3:2 C4:2 E4:2 C4:2 F3:2 A3:2 C4:2 A3:2 G3:2 B3:2 D4:4' },
  },

  setLoop(name) {
    if (this.loopName === name) return;
    this.stopLoop();
    this.loopName = name;
    if (!name || !this.ctx || !this.enabled) return;
    this.loopPos = 0;
    this.loopNextAt = this.ctx.currentTime + 0.1;
    this.loopTimer = setInterval(() => this.scheduleLoop(), 120);
  },

  stopLoop() {
    if (this.loopTimer) clearInterval(this.loopTimer);
    this.loopTimer = null;
    this.loopName = null;
  },

  scheduleLoop() {
    if (!this.ctx || !this.enabled || !this.loopName) return;
    const def = this.LOOPS[this.loopName];
    if (!def) return;
    const seq = def.notes.split(' ');
    const beat = 60 / def.bpm / 2; // eighth-note base
    while (this.loopNextAt < this.ctx.currentTime + 0.3) {
      const [note, lenStr] = seq[this.loopPos % seq.length].split(':');
      const dur = beat * (+lenStr || 2);
      this.pulse(this.freq(note), 0, this.loopNextAt, dur * 0.85, def.vol, 'triangle');
      this.loopNextAt += dur;
      this.loopPos++;
    }
  },
};
