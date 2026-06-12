// Renderer: builds palette-ramped atlases from pixel-string data at boot,
// draws tiles/sprites/text to a 160x144 canvas. Integer-scaled via CSS.
const R = {
  W: 160,
  H: 144,
  PAL: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'],
  RGBA: [[15, 56, 15, 255], [48, 98, 48, 255], [139, 172, 15, 255], [155, 188, 15, 255]],
  RAMPS: [[0, 1, 2, 3], [0, 1, 2, 2], [0, 0, 1, 2]], // DAY, DUSK, NIGHT
  ramp: 0,

  canvas: null,
  ctx: null,
  atlas: [],       // one canvas per ramp
  rects: {},       // name -> {x, y, w, h}
  fontDark: null,  // ink P0 (for light boxes)
  fontLight: null, // ink P3 (for dark strips)
  fontIdx: {},
  ditherTile: null,
  ready: false,

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
    this.atlas = this.RAMPS.map(() => {
      const c = document.createElement('canvas');
      c.width = COLS * CELL;
      c.height = rows * CELL;
      return c;
    });
    list.forEach(([name, str, size], i) => {
      const ax = (i % COLS) * CELL;
      const ay = Math.floor(i / COLS) * CELL;
      this.rects[name] = { x: ax, y: ay, w: size, h: size };
      this.RAMPS.forEach((ramp, ri) => {
        const ctx = this.atlas[ri].getContext('2d');
        const img = ctx.createImageData(size, size);
        for (let p = 0; p < str.length; p++) {
          const ch = str[p];
          if (ch === '.') continue;
          const shade = this.RGBA[ramp[+ch]];
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
    this.fontDark = make(this.RGBA[0]);
    this.fontLight = make(this.RGBA[3]);
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
    this.ctx.fillStyle = this.PAL[this.RAMPS[this.ramp][shade]];
    this.ctx.fillRect(x, y, w, h);
  },

  fillAbs(x, y, w, h, shade) {
    this.ctx.fillStyle = this.PAL[shade];
    this.ctx.fillRect(x, y, w, h);
  },

  // text box frame (light bg, dark 1px border)
  box(x, y, w, h) {
    this.fillAbs(x, y, w, h, 3);
    this.ctx.strokeStyle = this.PAL[0];
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
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
    ctx.fillStyle = this.PAL[this.RAMPS[this.ramp][1]];
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
    ctx.fillStyle = this.PAL[this.RAMPS[this.ramp][3]];
    for (let i = 0; i < 40; i++) {
      const x = (i * 41) % 160;
      const y = ((i * 67) % 128) + 16;
      ctx.fillRect(x, y, 1, 1);
    }
  },
};
