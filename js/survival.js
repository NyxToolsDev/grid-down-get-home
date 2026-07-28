// Survival systems: clock, meters, conditions. All rates from the design spec
// (per real minute, converted to per-second here). 1 real second = 2 game minutes.
const Survival = {
  // returns array of event objects for main to react to
  tick(st, dt, env) {
    const ev = [];
    const mult = (st.ironWalk ? 1.25 : 1.0)
      * (st.diff === 'easy' ? 0.8 : st.diff === 'hard' ? 1.2 : 1.1);

    // ---- clock ----
    const prevClock = st.clock;
    st.clock += dt * 2; // game minutes
    if (st.clock >= 1440) {
      st.clock -= 1440;
      st.day += 1;
      ev.push({ type: 'midnight' });
    }
    if (prevClock < 360 && st.clock >= 360) ev.push({ type: 'dawn' });
    if (prevClock < 1080 && st.clock >= 1080) ev.push({ type: 'dusk' });

    const phase = this.phase(st.clock);
    const day = phase === 'day';
    const night = phase === 'night';
    const frost = st.day >= 4;
    if (frost && !st.flags.frost_started) st.flags.frost_started = true;

    const gutActive = st.gutUntil > 0 && st.gameSec < st.gutUntil;
    const gutMult = gutActive ? 2 : 1;
    st.gameSec += dt;

    // gut onset
    if (st.gutOnsetAt > 0 && st.gameSec >= st.gutOnsetAt) {
      st.gutOnsetAt = 0;
      st.gutUntil = st.gameSec + 720; // 24 game hours
      ev.push({ type: 'gutOnset' });
    }
    if (gutActive === false && st.gutUntil > 0 && st.gameSec >= st.gutUntil) st.gutUntil = 0;

    // ---- water ----
    const thirstyMult = st.meters.w <= 20 ? 1.5 : 1.0;
    st.meters.w = Math.max(0, st.meters.w - (env.moving ? 0.10 : 0.05) * dt * mult * gutMult);

    // ---- food ----
    st.meters.f = Math.max(0, st.meters.f - 0.05 * dt * mult * gutMult);
    const hungry = st.meters.f <= 20;

    // ---- warmth ----
    let wRate = 0; // per minute
    if (env.outdoors) {
      if (day) wRate = frost ? 2 : 5;
      else if (night) wRate = frost ? -12 : -8;
      else wRate = frost ? -6 : -4; // dusk/pre-dawn shoulder
      if (st.raining && env.outdoors && wRate < 0 && !this.hasItem(st, 'poncho')) wRate *= 2;
      if (st.raining && wRate > 0 && !this.hasItem(st, 'poncho')) wRate = 0;
    } else {
      if (night || phase === 'predawn') wRate = frost ? -4 : -3;
      else wRate = 0;
    }
    if (env.nearFire) wRate += 15;
    if (st.hoodie && wRate < 0) wRate += 2;
    if (hungry && wRate < 0) wRate *= 1.5;
    if (wRate < 0) wRate *= mult;
    st.meters.h = Math.min(100, Math.max(0, st.meters.h + (wRate / 60) * dt));

    // ---- energy ----
    let eRate = day ? 3 : 5; // drain per minute
    eRate *= thirstyMult * mult;
    st.meters.e = Math.max(0, st.meters.e - (eRate / 60) * dt);
    if (st.meters.f <= 0) st.meters.e = Math.min(st.meters.e, 30); // starvation caps energy

    // ---- damage ticks (accumulator timers in real seconds) ----
    st.dmgT = st.dmgT || {};
    const tickDmg = (key, period, cause) => {
      st.dmgT[key] = (st.dmgT[key] || 0) + dt;
      if (st.dmgT[key] >= period) {
        st.dmgT[key] -= period;
        st.hearts = Math.max(0, st.hearts - 1);
        ev.push({ type: 'damage', cause });
      }
    };
    if (st.meters.w <= 0) tickDmg('water', 45, 'thirst'); else st.dmgT.water = 0;
    if (st.meters.f <= 0) tickDmg('food', 90, 'hunger'); else st.dmgT.food = 0;
    if (st.meters.h <= 0) tickDmg('cold', 30, 'cold'); else st.dmgT.cold = 0;
    if (st.bleeding) tickDmg('bleed', 30, 'bleed'); else st.dmgT.bleed = 0;

    // ---- collapse ----
    if (st.meters.e <= 0) ev.push({ type: 'collapse' });

    return ev;
  },

  phase(clock) {
    if (clock >= 360 && clock < 1080) return 'day';
    if (clock >= 1080 && clock < 1200) return 'dusk';
    if (clock >= 240 && clock < 360) return 'predawn';
    return 'night';
  },

  conditions(st) {
    const c = [];
    if (st.meters.w <= 20) c.push('THIRSTY');
    if (st.meters.f <= 20) c.push('HUNGRY');
    if (st.meters.h <= 20) c.push('COLD');
    if (st.meters.e <= 20) c.push('EXHAUSTED');
    if (st.bleeding) c.push('BLEEDING');
    if (st.gutUntil > 0 && st.gameSec < st.gutUntil) c.push('GUT ILLNESS');
    if (st.hearts <= 2) c.push('INJURED');
    return c;
  },

  // movement frames per tile given state
  walkSpeed(st) {
    let frames = st.sneakers ? 14 : 16;
    if (st.meters.h <= 20 || st.meters.e <= 20) frames = 24;
    return frames;
  },

  swingAllowed(st) {
    return st.meters.e > 20;
  },

  ramp(st, env) {
    const phase = this.phase(st.clock);
    let r = phase === 'day' ? 0 : (phase === 'night' ? 2 : 1);
    if (env && env.darkInterior) r = 2;
    if (this.conditions(st).length >= 2) r = Math.min(2, r + 1);
    return r;
  },

  visionRadius(st, env) {
    const phase = this.phase(st.clock);
    const lit = st.flashOn && st.flashCharge > 0;
    if (env.darkInterior) return lit ? 6 : 2;
    if (phase === 'night') return lit ? 6 : 4;
    return 99;
  },

  hasItem(st, id) {
    return st.inv.indexOf(id) >= 0 || st.keys.indexOf(id) >= 0 || (id === 'poncho' && st.ponchoWorn);
  },

  clockStr(clock) {
    const h = Math.floor(clock / 60) % 24;
    const m = Math.floor(clock % 60);
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  },
};
