// Camp & sleep: the OPSEC system. Visibility 0-5, one night-event roll,
// deterministic sleep-skip costs. Church is always Visibility 0.
const Camp = {

  // visibility score for sleeping on this screen tonight
  visibility(st, screenId, spotType) {
    if (screenId === 'INT_CHURCH') return 0;
    let v = 0;
    const fires = st.fires || {};
    const fireLit = Object.keys(fires).some((k) => k.indexOf(screenId + ':') === 0);
    if (fireLit) v += 2;
    if (st.flashOn) v += 1;
    if (spotType === 'car' || spotType === 'out') v += 1;
    if (st.cookedTonight) v += 1;
    if (st.noisyScreens && st.noisyScreens[screenId]) v += 1;
    if (st.boardedTonight) v -= 1;
    return Math.max(0, Math.min(5, v));
  },

  canSleep(st) {
    // 19:00 - 04:00
    return st.clock >= 1140 || st.clock < 240;
  },

  // returns {event: null|'prowler'|'dogs', vis}
  roll(st, screenId, spotType, rng) {
    const vis = this.visibility(st, screenId, spotType);
    const chance = Math.min(0.6, 0.12 * vis);
    if (rng() < chance) {
      return { event: rng() < 0.6 ? 'prowler' : 'dogs', vis };
    }
    return { event: null, vis };
  },

  // apply deterministic sleep-skip costs; returns lines for the morning summary
  applySleep(st, spotType, fireLit) {
    const notes = [];
    // clock: jump to 06:00 (cross midnight if needed)
    if (st.clock >= 1140) st.day += 1;
    st.clock = 360;
    st.meters.e = spotType === 'car' ? 75 : 90;
    st.meters.f = Math.max(0, st.meters.f - 15);
    st.meters.w = Math.max(0, st.meters.w - 20);
    const gutActive = st.gutUntil > 0 && st.gameSec < st.gutUntil;
    if (gutActive) {
      st.meters.f = Math.max(0, st.meters.f - 10);
      st.meters.w = Math.max(0, st.meters.w - 10);
    }
    if (spotType === 'bed' || spotType === 'bedroll') {
      // warmth unchanged
    } else if (spotType === 'car') {
      st.meters.h = Math.max(0, st.meters.h - 10);
    } else if (spotType === 'out') {
      st.meters.h = Math.max(0, Math.min(100, st.meters.h + (fireLit ? 20 : -50)));
    } else {
      // indoors floor without bedroll
      st.meters.h = Math.max(0, st.meters.h - 20);
    }
    if (st.bleeding) {
      st.hearts = Math.max(0, st.hearts - 1);
      notes.push('YOU BLED IN THE NIGHT.');
    }
    if (st.meters.f >= 50 && st.meters.w >= 50) {
      st.hearts = Math.min(8, st.hearts + 2);
      notes.push('YOU SLEPT WELL.');
    }
    // night housekeeping
    st.fires = {};
    st.cookedTonight = false;
    st.boardedTonight = false;
    st.noisyScreens = {};
    st.flags.soup_today = false;
    st.flags.gave_food_today = false;
    return notes;
  },
};
