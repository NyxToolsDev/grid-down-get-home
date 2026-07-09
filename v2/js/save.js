// localStorage persistence. Two keys: run state + meta (settings, records).
const Save = {
  RUN_KEY: 'gdgh_run_v1',
  META_KEY: 'gdgh_meta_v1',

  saveRun(st) {
    try {
      localStorage.setItem(this.RUN_KEY, JSON.stringify(st));
      return true;
    } catch (e) {
      return false;
    }
  },

  loadRun() {
    try {
      const raw = localStorage.getItem(this.RUN_KEY);
      if (!raw) return null;
      const st = JSON.parse(raw);
      if (st.v !== 1) return null;
      return st;
    } catch (e) {
      return null;
    }
  },

  clearRun() {
    try { localStorage.removeItem(this.RUN_KEY); } catch (e) { /* ignore */ }
  },

  loadMeta() {
    try {
      const raw = localStorage.getItem(this.META_KEY);
      const m = raw ? JSON.parse(raw) : {};
      return Object.assign({ sound: true, won: false, iron: false, best: null }, m);
    } catch (e) {
      return { sound: true, won: false, iron: false, best: null };
    }
  },

  saveMeta(meta) {
    try { localStorage.setItem(this.META_KEY, JSON.stringify(meta)); } catch (e) { /* ignore */ }
  },
};
