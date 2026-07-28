// Renderer: builds GBC-style palette-grouped atlases from pixel-string data at
// boot, draws tiles/sprites/text to a 160x144 canvas. Integer-scaled via CSS.
// Art stays 4-index; color comes from each element's palette group, with
// day/dusk/night variants computed per group (night shifts dark blue).
const R = {
  W: 160,
  H: 144,
  // neutral UI palette (menus, HUD chrome, boxes): dark -> light
  PAL: ['#101820', '#3c5064', '#8ca4b4', '#f8f4e4'],
  // palette groups: 4 shades dark -> light (day colors)
  PALS: {
    veg:    ['#0c380c', '#227424', '#54ac38', '#a0d858'],
    ground: ['#4c3014', '#8a5c2c', '#c49458', '#ecd0a0'],
    pave:   ['#282830', '#606068', '#a0a0a8', '#d8d8dc'],
    water:  ['#0c2870', '#1c54c0', '#4894e8', '#a0d4f8'],
    brick:  ['#481410', '#98342c', '#d07048', '#f0b888'],
    wood:   ['#3c2410', '#7c4c24', '#b48454', '#e4c494'],
    metal:  ['#1c2028', '#4c5460', '#8c96a4', '#ccd4dc'],
    fire:   ['#401000', '#a83810', '#f08020', '#f8d858'],
    hero:   ['#201824', '#c03028', '#eca070', '#f8f0e4'],
    dog:    ['#281408', '#6c4018', '#a87840', '#e0c088'],
    folk:   ['#1c1c2c', '#3060a8', '#eca070', '#f0f0f0'],
    red:    ['#480810', '#c01830', '#f05858', '#f8ccc8'],
    gold:   ['#443008', '#a87c14', '#e0b02c', '#f8ec90'],
  },
  // day / dusk / night channel multipliers
  LIGHT: [[1, 1, 1], [0.8, 0.62, 0.68], [0.38, 0.44, 0.75]],
  ramp: 0,

  canvas: null,
  ctx: null,
  atlas: [],       // one canvas per light ramp
  rects: {},       // name -> {x, y, w, h}
  fontDark: null,  // ink (for light boxes)
  fontLight: null, // paper (for dark strips)
  fontIdx: {},
  ditherTile: null,
  ready: false,

  GROUP: {
    grass: 'veg', tallgrass: 'veg', tree: 'veg', icon_gut: 'veg',
    dirt: 'ground', floor: 'ground', doorway: 'ground', cache: 'ground', plank: 'ground',
    road: 'pave', road_line: 'pave', sidewalk: 'pave', rail: 'pave', debris: 'pave',
    glasshaz: 'pave', wire: 'pave',
    water: 'water', icon_drop: 'water', icon_cold: 'water',
    brick: 'brick', brick_window: 'brick', vending: 'brick', boxcar: 'brick', floor_rug: 'brick',
    wood: 'wood', wood_window: 'wood', door: 'wood', boarded: 'wood', fence: 'wood',
    shelf: 'wood', desk: 'wood', counter: 'wood', sign: 'wood', firepit: 'wood', gap: 'wood',
    gate: 'metal', pump: 'metal', car_l: 'metal', car_r: 'metal', dumpster: 'metal',
    glassdoor: 'metal', bed: 'metal', searched: 'metal', icon_arrow: 'metal', icon_moon: 'metal',
    firepit_lit: 'fire', icon_flame: 'fire',
    icon_sun: 'gold', icon_can: 'gold', icon_bolt: 'gold',
    zzz: 'folk',
    alert_bang: 'red', icon_bleed: 'red', icon_dot: 'red',
    heart_full: 'red', heart_half: 'red', heart_empty: 'red',
  },

  groupFor(name) {
    if (this.GROUP[name]) return this.GROUP[name];
    if (name.startsWith('player_')) return 'hero';
    if (name.startsWith('dog_')) return 'dog';
    if (name.startsWith('npc_') || name.startsWith('human_')) return 'folk';
    if (name.startsWith('item_')) return 'gold';
    return 'ground';
  },

  hexToRgb(h) {
    return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  },

  lit(rgb, rampIdx) {
    const m = this.LIGHT[rampIdx];
    return [Math.round(rgb[0] * m[0]), Math.round(rgb[1] * m[1]), Math.round(rgb[2] * m[2])];
  },

  litCss(hex, rampIdx) {
    const c = this.lit(this.hexToRgb(hex), rampIdx == null ? this.ramp : rampIdx);
    return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
  },

  init(canvas) {
    this.canvas = canvas;
    canvas.width = this.W;
    canvas.height = this.H;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.buildAtlases();
    this.buildFont();
    this.buildDither();
    this.ready = true;
  },

  entries() {
    const out = [];
    for (const [k, v] of Object.entries(TILES)) out.push([k, v, 16]);
    for (const [k, v] of Object.entries(SPRITES)) out.push([k, v, v.length === 256 ? 16 : 8]);
    return out;
  },

  buildAtlases() {
    const list = this.entries();
    const COLS = 16;
    const CELL = 16;
    const rows = Math.ceil(list.length / COLS);
    this.atlas = this.LIGHT.map(() => {
      const c = document.createElement('canvas');
      c.width = COLS * CELL;
      c.height = rows * CELL;
      return c;
    });
    list.forEach(([name, str, size], i) => {
      const ax = (i % COLS) * CELL;
      const ay = Math.floor(i / COLS) * CELL;
      this.rects[name] = { x: ax, y: ay, w: size, h: size };
      const pal = this.PALS[this.groupFor(name)].map((h) => this.hexToRgb(h));
      this.LIGHT.forEach((mult, ri) => {
        const ctx = this.atlas[ri].getContext('2d');
        const img = ctx.createImageData(size, size);
        for (let p = 0; p < str.length; p++) {
          const ch = str[p];
          if (ch === '.') continue;
          const shade = this.lit(pal[+ch], ri);
          const o = p * 4;
          img.data[o] = shade[0]; img.data[o + 1] = shade[1];
          img.data[o + 2] = shade[2]; img.data[o + 3] = 255;
        }
        ctx.putImageData(img, ax, ay);
      });
    });
  },

  buildFont() {
    const glyphs = Object.keys(FONT);
    glyphs.forEach((g, i) => { this.fontIdx[g] = i; });
    const make = (rgba) => {
      const c = document.createElement('canvas');
      c.width = glyphs.length * 8;
      c.height = 8;
      const ctx = c.getContext('2d');
      const img = ctx.createImageData(c.width, 8);
      glyphs.forEach((g, gi) => {
        const str = FONT[g];
        for (let p = 0; p < 64; p++) {
          if (str[p] !== '1') continue;
          const x = gi * 8 + (p % 8);
          const y = Math.floor(p / 8);
          const o = (y * c.width + x) * 4;
          img.data[o] = rgba[0]; img.data[o + 1] = rgba[1];
          img.data[o + 2] = rgba[2]; img.data[o + 3] = 255;
        }
      });
      ctx.putImageData(img, 0, 0);
      return c;
    };
    this.fontDark = make(this.hexToRgb('#182028'));
    this.fontLight = make(this.hexToRgb('#f8f4e4'));
  },

  buildDither() {
    const c = document.createElement('canvas');
    c.width = 16; c.height = 16;
    const ctx = c.getContext('2d');
    ctx.fillStyle = this.PAL[0];
    for (let y = 0; y < 16; y += 2) {
      for (let x = 0; x < 16; x += 2) {
        if (((x + y) / 2) % 2 === 0) ctx.fillRect(x, y, 2, 2);
      }
    }
    this.ditherTile = c;
  },

  clear(shade) {
    this.ctx.fillStyle = this.PAL[shade == null ? 0 : shade];
    this.ctx.fillRect(0, 0, this.W, this.H);
  },

  draw(name, x, y, opts) {
    const r = this.rects[name];
    if (!r) return;
    const a = this.atlas[(opts && opts.ramp != null) ? opts.ramp : this.ramp];
    const ctx = this.ctx;
    if (opts && opts.flip) {
      ctx.save();
      ctx.translate(Math.round(x) + r.w, Math.round(y));
      ctx.scale(-1, 1);
      ctx.drawImage(a, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
      ctx.restore();
    } else {
      ctx.drawImage(a, r.x, r.y, r.w, r.h, Math.round(x), Math.round(y), r.w, r.h);
    }
  },

  text(str, x, y, light) {
    const strip = light ? this.fontLight : this.fontDark;
    const ctx = this.ctx;
    for (let i = 0; i < str.length; i++) {
      const gi = this.fontIdx[str[i]];
      if (gi == null) continue;
      ctx.drawImage(strip, gi * 8, 0, 8, 8, Math.round(x) + i * 8, Math.round(y), 8, 8);
    }
  },

  textCenter(str, y, light) {
    this.text(str, Math.floor((this.W - str.length * 8) / 2), y, light);
  },

  fill(x, y, w, h, shade) {
    this.fillAbs(x, y, w, h, shade);
  },

  fillAbs(x, y, w, h, shade) {
    this.ctx.fillStyle = this.PAL[shade];
    this.ctx.fillRect(x, y, w, h);
  },

  fillHex(x, y, w, h, hex) {
    this.ctx.fillStyle = hex;
    this.ctx.fillRect(x, y, w, h);
  },

  // text box frame (paper bg, ink border with inner accent line)
  box(x, y, w, h) {
    this.fillAbs(x, y, w, h, 3);
    this.ctx.strokeStyle = this.PAL[0];
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    this.ctx.strokeStyle = this.PAL[2];
    this.ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  },

  // vision dither: hide tiles beyond radius (tile units) from player center
  dither(pcx, pcy, radius, offY) {
    const oy = offY == null ? 16 : offY;
    for (let ty = 0; ty < 8; ty++) {
      for (let tx = 0; tx < 10; tx++) {
        const cx = tx * 16 + 8;
        const cy = ty * 16 + 8;
        const d = Math.sqrt((cx - pcx) * (cx - pcx) + (cy - pcy) * (cy - pcy)) / 16;
        if (d > radius + 1.2) {
          this.fillAbs(tx * 16, oy + ty * 16, 16, 16, 0);
        } else if (d > radius) {
          this.ctx.drawImage(this.ditherTile, tx * 16, oy + ty * 16);
        }
      }
    }
  },

  rain(frame) {
    const ctx = this.ctx;
    ctx.fillStyle = this.litCss(this.PALS.water[2]);
    const ph = frame % 2;
    for (let i = 0; i < 28; i++) {
      const x = (i * 37 + (frame >> 1) * 3) % 168 - 4;
      const y = (i * 53 + (frame >> 1) * 11) % 128 + 16;
      ctx.fillRect(x + ph, y, 1, 3);
    }
  },

  frost(frame) {
    // sparse light dots over outdoor ground during dawn frost
    const ctx = this.ctx;
    ctx.fillStyle = this.litCss('#e8f4f8');
    for (let i = 0; i < 40; i++) {
      const x = (i * 41) % 160;
      const y = ((i * 67) % 128) + 1;
      ctx.fillRect(x, y + 15, 1, 1);
    }
  },
};
