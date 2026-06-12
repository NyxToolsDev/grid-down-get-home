#!/usr/bin/env python
"""Generate PWA icons: a 16x16 pixel-art scene (house at the end of the road,
DMG green palette) scaled with nearest-neighbor. Writes icons/icon-192.png,
icon-512.png, icon-512-maskable.png."""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "icons"
OUT.mkdir(exist_ok=True)

P = [(15, 56, 15), (48, 98, 48), (139, 172, 15), (155, 188, 15)]

ART = [
    "0000000000000000",
    "0333000000000000",
    "0303000002000000",
    "0333000023200000",
    "0000000233320000",
    "0000002333332000",
    "0000023333333200",
    "0000233333333320",
    "0000022222222000",
    "0000022022022000",
    "1111122022022111",
    "2222122222222222",
    "1212122222221212",
    "2121212121212121",
    "1111111111111111",
    "0000000000000000",
]
# legend: row1-3 left = small "GD" marker block; house with roof, two dark
# windows/door; road of shades 1/2 leading east; dithered ground.

def base16():
    img = Image.new("RGB", (16, 16), P[0])
    px = img.load()
    for y, row in enumerate(ART):
        for x, ch in enumerate(row):
            px[x, y] = P[int(ch)]
    return img


def save(img16, size, name, pad=0.0):
    canvas = Image.new("RGB", (size, size), P[0])
    art = int(size * (1 - pad * 2))
    art -= art % 16  # keep integer pixel multiples
    scaled = img16.resize((art, art), Image.NEAREST)
    off = (size - art) // 2
    canvas.paste(scaled, (off, off))
    canvas.save(OUT / name)
    print("wrote icons/" + name)


img = base16()
save(img, 192, "icon-192.png")
save(img, 512, "icon-512.png")
save(img, 512, "icon-512-maskable.png", pad=0.12)
