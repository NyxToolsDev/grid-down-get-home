#!/usr/bin/env python
"""Render pixel-string art data to PNG contact sheets for visual inspection.

Usage: python tools/preview-art.py <tiles|sprites|font|all>
Output: tools/preview/<target>.png  (8x scale, labeled grid)

Also renders tools/preview/worldmap.png if data-maps.js and data-tiles.js both
exist (every screen rendered with real tiles, stitched into the world grid).
"""
import json
import re
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "tools" / "preview"
OUT.mkdir(parents=True, exist_ok=True)

PALETTE = {
    "0": (15, 56, 15),
    "1": (48, 98, 48),
    "2": (139, 172, 15),
    "3": (155, 188, 15),
    ".": None,  # transparent
}
BG = (255, 0, 255)  # magenta = transparency in previews
SCALE = 8

LEGEND = {
    ".": "grass", ",": "dirt", "=": "road", "L": "road_line", "-": "sidewalk",
    "t": "tallgrass", "T": "tree", "*": "debris", "~": "water", "P": "pump",
    "#": "brick", "n": "brick_window", "W": "wood", "o": "wood_window", "f": "fence",
    "G": "gate", "D": "door", "B": "boarded", "g": "glassdoor", "r": "rail",
    "R": "plank", "^": "gap", "h": "glasshaz", "w": "wire", "c": "car_l",
    "d": "dumpster", "v": "vending", "s": "shelf", "k": "desk", "x": "boxcar",
    "F": "firepit", "E": "bed", "S": "sign", "O": "cache", "I": "floor",
    "u": "floor_rug", "+": "doorway", "C": "counter",
}


def load(name):
    p = ROOT / "js" / name
    if not p.exists():
        return None
    src = p.read_text(encoding="utf-8")
    body = src[src.index("=") + 1: src.rindex(";")]
    body = re.sub(r"^\s*/\*JSON\*/", "", body)
    return json.loads(body)


def draw_pix(img, str_data, ox, oy, size):
    px = img.load()
    for i, ch in enumerate(str_data):
        x, y = i % size, i // size
        c = PALETTE.get(ch)
        if c is None and ch == ".":
            continue
        if c is None:
            c = (255, 0, 0)  # invalid char = red
        for sy in range(SCALE):
            for sx in range(SCALE):
                px[ox + x * SCALE + sx, oy + y * SCALE + sy] = c


def sheet(data, keys, size, fname, cols=8):
    cell_w, cell_h = size * SCALE + 8, size * SCALE + 22
    rows = (len(keys) + cols - 1) // cols
    img = Image.new("RGB", (cols * cell_w + 8, rows * cell_h + 8), BG)
    d = ImageDraw.Draw(img)
    for i, k in enumerate(keys):
        cx, cy = (i % cols) * cell_w + 8, (i // cols) * cell_h + 8
        if k in data and isinstance(data[k], str) and len(data[k]) == size * size:
            draw_pix(img, data[k], cx, cy, size)
        else:
            d.rectangle([cx, cy, cx + size * SCALE, cy + size * SCALE], outline=(255, 0, 0))
            d.text((cx + 4, cy + 4), "MISSING", fill=(255, 0, 0))
        label = k if len(k) <= 16 else k[:15] + "~"
        d.text((cx, cy + size * SCALE + 4), label, fill=(0, 0, 0))
    img.save(OUT / fname)
    print(f"wrote tools/preview/{fname} ({len(keys)} cells)")


def preview_tiles():
    t = load("data-tiles.js")
    if not t:
        print("data-tiles.js missing/unparseable")
        return
    sheet(t, sorted(t.keys()), 16, "tiles.png")


def preview_sprites():
    s = load("data-sprites.js")
    if not s:
        print("data-sprites.js missing/unparseable")
        return
    k16 = [k for k in sorted(s) if len(s[k]) == 256]
    k8 = [k for k in sorted(s) if len(s[k]) == 64]
    if k16:
        sheet(s, k16, 16, "sprites16.png")
    if k8:
        sheet(s, k8, 8, "sprites8.png", cols=12)


def preview_font():
    f = load("data-font.js")
    if not f:
        print("data-font.js missing/unparseable")
        return
    # render glyphs + a sample sentence
    keys = sorted(f.keys())
    sheet({k: v.replace("1", "0").replace("0", "0") if False else v.replace("1", "X") for k, v in f.items()}, [], 8, "_unused.png") if False else None
    data = {k: v.translate(str.maketrans("01", ".0")) for k, v in f.items()}  # ink=darkest, bg transparent
    sheet(data, keys, 8, "font.png", cols=12)
    sample = "THE QUICK BROWN FOX 0123456789. IT'S COLD?"
    img = Image.new("RGB", (len(sample) * 8 * 4 + 16, 8 * 4 + 16), (155, 188, 15))
    px = img.load()
    for ci, ch in enumerate(sample):
        g = f.get(ch)
        if not g:
            continue
        for i, bit in enumerate(g):
            if bit == "1":
                x, y = i % 8, i // 8
                for sy in range(4):
                    for sx in range(4):
                        px[8 + ci * 32 + x * 4 + sx, 8 + y * 4 + sy] = (15, 56, 15)
    img.save(OUT / "font_sample.png")
    print("wrote tools/preview/font_sample.png")


def preview_worldmap():
    t = load("data-tiles.js")
    m = load("data-maps.js")
    if not t or not m:
        return
    world = {"A": [2, 3, 5, 6, 7, 8], "B": list(range(1, 9)), "C": list(range(1, 9)),
             "D": list(range(1, 9)), "E": [3, 4, 5, 6, 7, 8], "F": [8]}
    sc_w, sc_h = 10 * 16, 8 * 16
    img = Image.new("RGB", (8 * (sc_w + 2) + 2, 6 * (sc_h + 2) + 2), (40, 40, 40))
    px = img.load()
    rows = "ABCDEF"
    for rid, cols in world.items():
        for c in cols:
            sid = f"{rid}{c}"
            sc = m.get("screens", {}).get(sid)
            if not sc:
                continue
            ox, oy = (c - 1) * (sc_w + 2) + 2, rows.index(rid) * (sc_h + 2) + 2
            for y in range(8):
                for x in range(10):
                    tile = t.get(LEGEND.get(sc["rows"][y][x], ""), None)
                    if not tile:
                        continue
                    for i, ch in enumerate(tile):
                        c2 = PALETTE.get(ch, (255, 0, 0))
                        px[ox + x * 16 + i % 16, oy + y * 16 + i // 16] = c2
    img.save(OUT / "worldmap.png")
    print("wrote tools/preview/worldmap.png")

    # interiors sheet
    interiors = [k for k in m.get("screens", {}) if k.startswith("INT")]
    if interiors:
        img2 = Image.new("RGB", (5 * (sc_w + 2) + 2, ((len(interiors) + 4) // 5) * (sc_h + 14) + 2), (40, 40, 40))
        d2 = ImageDraw.Draw(img2)
        px2 = img2.load()
        for i, sid in enumerate(sorted(interiors)):
            sc = m["screens"][sid]
            ox = (i % 5) * (sc_w + 2) + 2
            oy = (i // 5) * (sc_h + 14) + 2
            for y in range(8):
                for x in range(10):
                    tile = t.get(LEGEND.get(sc["rows"][y][x], ""), None)
                    if not tile:
                        continue
                    for j, ch in enumerate(tile):
                        c2 = PALETTE.get(ch, (255, 0, 0))
                        px2[ox + x * 16 + j % 16, oy + y * 16 + j // 16] = c2
            d2.text((ox, oy + sc_h + 2), sid, fill=(255, 255, 255))
        img2.save(OUT / "interiors.png")
        print("wrote tools/preview/interiors.png")


target = sys.argv[1] if len(sys.argv) > 1 else "all"
actions = {"tiles": [preview_tiles], "sprites": [preview_sprites], "font": [preview_font],
           "maps": [preview_worldmap],
           "all": [preview_tiles, preview_sprites, preview_font, preview_worldmap]}
for fn in actions.get(target, []):
    fn()
