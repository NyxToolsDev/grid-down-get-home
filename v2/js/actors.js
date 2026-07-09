// Actor AI: one 5-state machine (wander/alert/chase/attack/flee) with
// per-kind parameters. Dogs, opportunist humans, scripted toll crew, NPCs.
// All movement is grid-locked like the player. No A* — greedy + sidestep.
const Actors = {

  spawnForScreen(st, screenId, game) {
    const sc = MAPS.screens[screenId];
    const list = [];
    if (!sc) return list;
    (sc.ents || []).forEach((e, idx) => {
      if (e.t === 'dog') {
        const key = screenId + ':' + idx;
        const ds = st.dogStates[key];
        if (ds === 'routed') return;
        list.push(this.make('dog', e.x, e.y, { key, fed: ds === 'fed' }));
      } else if (e.t === 'npc') {
        const a = this.make('npc', e.x, e.y, { id: e.id });
        if (e.id === 'reyes') { a.patrol = true; a.baseY = e.y; }
        list.push(a);
      }
    });
    return list;
  },

  make(kind, x, y, extra) {
    return Object.assign({
      kind, x, y, px: x * 16, py: y * 16,
      facing: 'down', state: 'wander', t: 0, cool: 0,
      moveT: 0, moveFrames: 16, moveDir: null, hits: 0,
      home: [x, y], frame: 0, gone: false,
    }, extra || {});
  },

  occupied(list, x, y, self) {
    return list.some((a) => a !== self && !a.gone && ((a.moveDir ? a.tx === x && a.ty === y : a.x === x && a.y === y)));
  },

  startMove(a, dir, game, list) {
    const D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const [dx, dy] = D[dir];
    const nx = a.x + dx, ny = a.y + dy;
    a.facing = dir;
    if (nx < 0 || nx > 9 || ny < 0 || ny > 7) return false;
    if (!game.walkable(nx, ny)) return false;
    if (game.player.x === nx && game.player.y === ny) return false;
    if (this.occupied(list, nx, ny, a)) return false;
    a.moveDir = dir; a.tx = nx; a.ty = ny; a.moveT = 0;
    return true;
  },

  stepToward(a, txx, tyy, game, list) {
    const dx = txx - a.x, dy = tyy - a.y;
    const prefs = Math.abs(dx) >= Math.abs(dy)
      ? [dx > 0 ? 'right' : 'left', dy > 0 ? 'down' : (dy < 0 ? 'up' : null)]
      : [dy > 0 ? 'down' : 'up', dx > 0 ? 'right' : (dx < 0 ? 'left' : null)];
    // sidestep options
    const all = prefs.filter(Boolean).concat(['up', 'down', 'left', 'right'].filter((d) => !prefs.includes(d)));
    for (const d of all) {
      if (this.startMove(a, d, game, list)) return true;
    }
    return false;
  },

  stepAway(a, fx, fy, game, list) {
    const dx = a.x - fx, dy = a.y - fy;
    const prefs = Math.abs(dx) >= Math.abs(dy)
      ? [dx >= 0 ? 'right' : 'left', dy >= 0 ? 'down' : 'up']
      : [dy >= 0 ? 'down' : 'up', dx >= 0 ? 'right' : 'left'];
    for (const d of prefs.concat(['up', 'down', 'left', 'right'])) {
      if (this.startMove(a, d, game, list)) return true;
    }
    return false;
  },

  dist(a, x, y) {
    return Math.abs(a.x - x) + Math.abs(a.y - y);
  },

  adjacent(a, x, y) {
    return this.dist(a, x, y) === 1;
  },

  update(list, st, game) {
    for (const a of list) {
      if (a.gone) continue;
      a.frame++;
      if (a.cool > 0) a.cool--;
      // advance current move
      if (a.moveDir) {
        a.moveT++;
        const p = a.moveT / a.moveFrames;
        a.px = (a.x + (a.tx - a.x) * p) * 16;
        a.py = (a.y + (a.ty - a.y) * p) * 16;
        if (a.moveT >= a.moveFrames) {
          a.x = a.tx; a.y = a.ty; a.moveDir = null;
          a.px = a.x * 16; a.py = a.y * 16;
        }
        continue;
      }
      switch (a.kind) {
        case 'dog': this.updateDog(a, st, game, list); break;
        case 'npc': this.updateNpc(a, st, game, list); break;
        case 'beggar': this.updateBeggar(a, st, game, list); break;
        case 'shadower': this.updateShadower(a, st, game, list); break;
        case 'prowler': this.updateProwler(a, st, game, list); break;
        default: break;
      }
    }
    // cull
    return list.filter((a) => !a.gone);
  },

  updateDog(a, st, game, list) {
    const P = game.player;
    // night-event dogs: hold at the edge while the player holds still
    if (a.nightWatch) {
      if (!game.playerMoving) {
        a.facing = this.faceToward(a, P.x, P.y);
        a.state = 'alert';
        if (a.frame % 180 === 0) game.sfx('growl');
        return;
      }
      a.nightWatch = false;
      a.state = 'chase';
    }
    // jerky overrides everything
    const jerky = list.find((j) => j.kind === 'jerky' && !j.gone);
    if (a.fed) {
      this.wanderStep(a, game, list, 90);
      return;
    }
    if (jerky && this.dist(a, jerky.x, jerky.y) <= 5) {
      if (this.dist(a, jerky.x, jerky.y) === 0 || this.adjacent(a, jerky.x, jerky.y)) {
        a.state = 'eat'; a.t++;
        if (a.t > 480) {
          a.fed = true; a.state = 'wander'; a.t = 0;
          jerky.eaten = (jerky.eaten || 0) + 1;
          jerky.gone = true;
          if (a.key) st.dogStates[a.key] = 'fed';
        }
      } else {
        a.moveFrames = 13;
        this.stepToward(a, jerky.x, jerky.y, game, list);
      }
      return;
    }
    const radius = game.night || st.hearts <= 2 ? 5 : 3;
    const d = this.dist(a, P.x, P.y);
    switch (a.state) {
      case 'wander':
        if (d <= radius) { a.state = 'alert'; a.t = 0; game.sfx('growl'); }
        else this.wanderStep(a, game, list, 70);
        break;
      case 'alert':
        a.t++;
        a.facing = this.faceToward(a, P.x, P.y);
        if (a.t >= 30) { a.state = 'chase'; a.t = 0; game.sfx('bark'); }
        break;
      case 'chase':
        if (d > radius + 4) { a.state = 'wander'; break; }
        if (this.adjacent(a, P.x, P.y) && a.cool === 0) {
          a.state = 'attack'; a.t = 0;
          a.facing = this.faceToward(a, P.x, P.y);
        } else {
          a.moveFrames = 13;
          this.stepToward(a, P.x, P.y, game, list);
        }
        break;
      case 'attack':
        a.t++;
        if (a.t >= 8) {
          if (this.adjacent(a, P.x, P.y)) {
            game.hitPlayer(1, 'dog', a);
          }
          a.cool = 45; a.state = 'chase'; a.t = 0;
        }
        break;
      case 'flee':
        a.moveFrames = 11;
        a.fleeT = (a.fleeT || 0) + 1;
        if (!this.stepAway(a, P.x, P.y, game, list) || this.dist(a, P.x, P.y) > 9 || a.fleeT > 240) {
          a.gone = true;
          if (a.key) st.dogStates[a.key] = 'routed';
        }
        break;
      default: a.state = 'wander';
    }
  },

  updateNpc(a, st, game, list) {
    const P = game.player;
    if (a.hostile) {
      // toll fight mode: behaves like a strong dog
      const d = this.dist(a, P.x, P.y);
      if (this.adjacent(a, P.x, P.y) && a.cool === 0) {
        game.hitPlayer(2, 'human', a);
        a.cool = 70;
      } else if (d <= 7) {
        a.moveFrames = 15;
        this.stepToward(a, P.x, P.y, game, list);
      }
      return;
    }
    if (a.patrol && game.night) {
      // Reyes patrols a 4-tile vertical line at night
      a.moveFrames = 24;
      const targetY = a.baseY + ((Math.floor(a.frame / 240) % 2 === 0) ? 0 : 3);
      if (a.y !== targetY) this.stepToward(a, a.x, targetY, game, list);
    }
    if (this.adjacent(a, P.x, P.y)) a.facing = this.faceToward(a, P.x, P.y);
  },

  updateBeggar(a, st, game, list) {
    const P = game.player;
    if (a.leaving) {
      a.moveFrames = 18;
      a.fleeT = (a.fleeT || 0) + 1;
      if (!this.stepAway(a, P.x, P.y, game, list) || this.dist(a, P.x, P.y) > 10 || a.fleeT > 300) a.gone = true;
      return;
    }
    if (this.adjacent(a, P.x, P.y)) {
      a.facing = this.faceToward(a, P.x, P.y);
      if (!a.asked) { a.asked = true; game.beggarAsks(a); }
    } else if (!a.asked) {
      a.moveFrames = 18;
      this.stepToward(a, P.x, P.y, game, list);
    } else {
      this.wanderStep(a, game, list, 100);
    }
  },

  updateShadower(a, st, game, list) {
    const P = game.player;
    const d = this.dist(a, P.x, P.y);
    if (a.fleeing) {
      a.moveFrames = 14;
      a.fleeT = (a.fleeT || 0) + 1;
      if (!this.stepAway(a, P.x, P.y, game, list) || d > 9 || a.fleeT > 240) a.gone = true;
      return;
    }
    const behind = this.faceToward(a, P.x, P.y) !== this.opposite(P.facing) ? false
      : true; // approaching from the side the player faces away from
    if (this.adjacent(a, P.x, P.y) && behind) {
      game.shadowerSteals(a);
      a.fleeing = true;
    } else if (d > 4 || behind) {
      a.moveFrames = 16;
      this.stepToward(a, P.x, P.y, game, list);
    } else {
      this.wanderStep(a, game, list, 50);
    }
  },

  updateProwler(a, st, game, list) {
    const P = game.player;
    if (a.fleeing) {
      a.moveFrames = 14;
      a.fleeT = (a.fleeT || 0) + 1;
      if (!this.stepAway(a, P.x, P.y, game, list) || this.dist(a, P.x, P.y) > 9 || a.fleeT > 240) {
        a.gone = true;
        game.prowlerGone(a);
      }
      return;
    }
    // walks toward target (the player's camp spot)
    a.moveFrames = 20;
    const [txx, tyy] = a.target || [P.x, P.y];
    if (this.dist(a, txx, tyy) > 0) this.stepToward(a, txx, tyy, game, list);
  },

  wanderStep(a, game, list, period) {
    a.t++;
    if (a.t < period) return;
    a.t = 0;
    const dirs = ['up', 'down', 'left', 'right'];
    const d = dirs[Math.floor(game.rng() * 4)];
    // stay near home (leash 3)
    const D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[d];
    if (Math.abs(a.x + D[0] - a.home[0]) > 3 || Math.abs(a.y + D[1] - a.home[1]) > 3) return;
    a.moveFrames = 22;
    this.startMove(a, d, game, list);
  },

  faceToward(a, x, y) {
    const dx = x - a.x, dy = y - a.y;
    if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'right' : 'left';
    return dy >= 0 ? 'down' : 'up';
  },

  opposite(dir) {
    return { up: 'down', down: 'up', left: 'right', right: 'left' }[dir];
  },

  // player swings at the actor; returns true if it routs/flees
  hit(a, weaponHits, st, game) {
    a.hits++;
    const needed = a.kind === 'npc' && a.hostile ? 3 : weaponHits;
    if (a.hits >= needed) {
      a.state = 'flee';
      a.fleeing = true;
      if (a.kind === 'npc') { a.hostile = false; a.withdrawn = true; }
      return true;
    }
    return false;
  },

  // line of sight for toll crew: straight line, max range, blocked by solids
  // and by the player standing in tall grass
  los(a, game, range) {
    const P = game.player;
    if (game.playerCovered) return false;
    const dx = P.x - a.x, dy = P.y - a.y;
    if (dx !== 0 && dy !== 0) return false;
    const d = Math.abs(dx + dy);
    if (d === 0 || d > range) return false;
    const sx = Math.sign(dx), sy = Math.sign(dy);
    for (let i = 1; i < d; i++) {
      if (!game.walkable(a.x + sx * i, a.y + sy * i)) return false;
    }
    return true;
  },
};
