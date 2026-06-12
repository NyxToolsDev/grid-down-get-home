#!/usr/bin/env python
"""Generator for js/data-tiles.js (Grid Down: Get Home).

Authoring tool for the art-tiles agent. Builds all 40 required 16x16 DMG
metatiles as '0123' pixel strings and emits the strict-JSON data file.
Run:  python tools/_gen_tiles.py
Then: node tools/validate-data.mjs tiles
      python tools/preview-art.py tiles
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SIZE = 16

# ---------------------------------------------------------------- helpers

def blank(c="3", w=SIZE, h=SIZE):
    return [[c] * w for _ in range(h)]


def P(g, x, y, c):
    if 0 <= y < len(g) and 0 <= x < len(g[0]):
        g[y][x] = c


def hline(g, x0, x1, y, c):
    for x in range(x0, x1 + 1):
        P(g, x, y, c)


def vline(g, x, y0, y1, c):
    for y in range(y0, y1 + 1):
        P(g, x, y, c)


def box(g, x0, y0, x1, y1, c):
    for y in range(y0, y1 + 1):
        hline(g, x0, x1, y, c)


def stamp(g, x, y, rows, trans="."):
    for dy, r in enumerate(rows):
        for dx, ch in enumerate(r):
            if ch != trans:
                P(g, x + dx, y + dy, ch)


def rows_tile(rows):
    assert len(rows) == 16, f"need 16 rows, got {len(rows)}"
    for i, r in enumerate(rows):
        assert len(r) == 16, f"row {i} is {len(r)} chars: {r}"
    return [list(r) for r in rows]


def S(g):
    return "".join("".join(r) for r in g)


# ---------------------------------------------------------------- ground

def t_grass():
    g = blank("3")
    for x, y in [(2, 3), (9, 10)]:                       # small tufts
        stamp(g, x, y, ["2.2", ".2."])
    for x, y in [(13, 2), (5, 13), (14, 12), (6, 6)]:    # lone blades
        P(g, x, y, "2")
    return g


def t_dirt():
    g = blank("2")
    for x, y in [(1, 1), (6, 2), (12, 4), (3, 7), (9, 8), (14, 10), (5, 12), (10, 14)]:
        P(g, x, y, "3")                                   # dry mottle
    for x, y in [(4, 4), (11, 2), (8, 6), (2, 10), (13, 13), (7, 11)]:
        P(g, x, y, "1")                                   # pebbles
    return g


def t_road():
    g = blank("2")
    for x, y in [(2, 3), (9, 1), (14, 6), (5, 8), (11, 12), (3, 14)]:
        P(g, x, y, "1")                                   # asphalt grit
    P(g, 7, 5, "1")
    P(g, 8, 6, "1")                                       # short crack
    return g


def t_road_line():
    g = t_road()
    for y in (7, 8):                                      # dashed center line
        hline(g, 0, 4, y, "3")
        hline(g, 8, 12, y, "3")
    return g


def t_sidewalk():
    g = blank("3")
    vline(g, 15, 0, 15, "2")                              # slab joints
    hline(g, 0, 15, 15, "2")
    for x, y in [(3, 5), (10, 9), (5, 12), (12, 2)]:
        P(g, x, y, "2")
    P(g, 8, 3, "2")
    P(g, 9, 4, "2")                                       # hairline crack
    return g


def t_tallgrass():
    g = blank("3")
    tri = [".2.", "222", "222", "1.1"]                    # little bush w/ roots
    for ox in (0, 4, 8, 12):                              # band 1
        stamp(g, ox, 1, tri)
    for ox in (-2, 2, 6, 10, 14):                         # band 2 (offset)
        stamp(g, ox, 6, tri)
    for ox in (0, 4, 8, 12):                              # band 3
        stamp(g, ox, 11, tri)
    for x, y in [(2, 0), (10, 0), (6, 15), (14, 15)]:     # loose blades
        P(g, x, y, "2")
    return g


def t_floor():
    g = blank("3")
    for y in (3, 7, 11, 15):                              # plank seams
        hline(g, 0, 15, y, "2")
    joints = {0: (5, 13), 4: (1, 9), 8: (5, 13), 12: (1, 9)}
    for band, xs in joints.items():                       # staggered ends
        for x in xs:
            vline(g, x, band, band + 2, "2")
    for x, y in [(3, 1), (11, 5), (6, 9), (14, 13)]:      # knots
        P(g, x, y, "2")
    return g


def t_floor_rug():
    g = blank("2")
    hline(g, 0, 15, 0, "1")
    hline(g, 0, 15, 15, "1")
    vline(g, 0, 0, 15, "1")
    vline(g, 15, 0, 15, "1")
    for y in range(16):
        for x in range(16):
            d2 = abs(2 * x - 15) + abs(2 * y - 15)
            if d2 == 8:
                P(g, x, y, "3")                           # diamond motif
            elif d2 <= 2:
                P(g, x, y, "1")                           # center dot
    return g


def t_doorway():
    g = blank("3")
    for y in range(16):
        for x in (0, 1, 2, 13, 14, 15):
            P(g, x, y, "0")                               # jambs
    hline(g, 0, 15, 0, "0")                               # lintel
    for y in range(1, 16):
        P(g, 3, y, "1")
        P(g, 12, y, "1")                                  # inner jamb shade
    hline(g, 3, 12, 1, "1")
    hline(g, 4, 11, 15, "2")                              # threshold
    return g


# ---------------------------------------------------------------- nature

def t_tree():
    # round canopy: 3 highlight band top-left, 2 body, 1 shadow base, 0 outline
    return rows_tile([
        "3333300000033333",
        "3330023333200333",
        "3303333322222033",
        "3033333222222203",
        "3033222222222103",
        "0322222222221120",
        "0222212222221220",
        "0221222211222220",
        "3021112111121103",
        "3011121111211103",
        "3301111111111033",
        "3330002110000333",
        "3333332110333333",
        "3333332110333333",
        "3333322111033333",
        "3333311111133333",
    ])


def t_debris():
    g = blank("3")
    # chunky rubble mound: 2 fill, 1 seams, 0 holes, 3 caps on top
    stamp(g, 1, 4, [
        "....12321.....",
        "...1223221....",
        "..122232221...",
        ".12221222221..",
        "1222122022221.",
        "12212222122221",
        "12220122212221",
        "11222122221221",
        "01111111111110",
    ])
    hline(g, 3, 12, 13, "1")                              # ground shadow
    P(g, 11, 3, "1")                                      # rebar stub
    P(g, 12, 2, "1")
    return g


def t_water():
    g = blank("1")
    for x0, x1, y in [(2, 6, 1), (9, 13, 5), (1, 4, 9), (8, 12, 12)]:
        hline(g, x0, x1, y, "2")                          # crests, staggered
        P(g, x0, y, "3")                                  # sparkle tip
        P(g, x0 + 1, y + 1, "0")                          # under-shadow
    P(g, 14, 8, "2")                                      # lone flecks
    P(g, 6, 14, "2")
    return g


def t_pump():
    g = blank("3")
    box(g, 3, 12, 12, 13, "2")                            # concrete pad
    hline(g, 3, 12, 14, "1")
    box(g, 6, 4, 9, 11, "1")                              # column body
    vline(g, 6, 4, 11, "2")                               # lit left edge
    vline(g, 9, 4, 11, "0")                               # dark right edge
    hline(g, 6, 9, 11, "0")                               # base shade
    hline(g, 6, 9, 2, "0")                                # cap dome
    hline(g, 5, 10, 3, "0")
    hline(g, 3, 5, 6, "0")                                # spout (left)
    P(g, 3, 7, "0")
    P(g, 3, 9, "1")                                       # falling drop
    P(g, 10, 4, "0")                                      # lever pivot
    P(g, 11, 4, "1")
    P(g, 11, 3, "0")
    P(g, 12, 3, "1")
    P(g, 12, 2, "0")
    P(g, 13, 2, "0")
    P(g, 13, 1, "0")                                      # grip
    P(g, 14, 1, "0")
    return g


def t_cache():
    g = blank("3")

    def log_end(x, y):                                    # 5x5 log seen end-on
        stamp(g, x, y, [
            ".000.",
            "03220",
            "02120",
            "02220",
            ".000.",
        ])

    log_end(0, 9)                                         # bottom row of 3
    log_end(5, 9)
    log_end(10, 9)
    log_end(2, 5)                                         # top row of 2
    log_end(7, 5)
    hline(g, 1, 13, 14, "1")                              # ground shadow
    P(g, 15, 3, "2")                                      # grass tufts
    P(g, 1, 4, "2")
    return g


def t_firebase():
    """Shared fire-pit base: grass, earth disc, stone ring."""
    g = blank("3")
    for y in range(16):                                   # bare-earth disc
        for x in range(16):
            if (x - 7.5) ** 2 + (y - 7.5) ** 2 <= 4.6 ** 2:
                P(g, x, y, "2")
    stones = [(7, 1), (11, 3), (13, 7), (11, 11), (7, 13), (3, 11), (1, 7), (3, 3)]
    for sx, sy in stones:
        box(g, sx, sy, sx + 1, sy + 1, "1")
        P(g, sx, sy, "2")                                 # lit top px
        P(g, sx + 1, sy + 1, "0")                         # shadow px
    return g


def t_firepit():
    g = t_firebase()
    box(g, 6, 6, 9, 9, "0")                               # cold charcoal heap
    P(g, 5, 7, "0")
    P(g, 5, 8, "0")
    P(g, 10, 7, "0")
    P(g, 10, 8, "0")
    P(g, 7, 6, "1")                                       # dead coal tops
    P(g, 8, 8, "1")
    P(g, 6, 9, "1")
    P(g, 9, 7, "2")                                       # ash fleck
    return g


def t_firepit_lit():
    g = t_firebase()
    stamp(g, 4, 2, [                                      # teardrop flame, dark bed
        "...00...",
        "..0330..",
        "..0330..",
        ".033330.",
        ".033330.",
        "00233200",
        "00022000",
        ".000000.",
    ])
    P(g, 5, 1, "3")                                       # sparks
    P(g, 11, 2, "3")
    return g


# ---------------------------------------------------------------- walls

def t_brick():
    g = blank("2")
    for y in (3, 7, 11, 15):                              # mortar courses
        hline(g, 0, 15, y, "1")
    for band, xs in {0: (7, 15), 4: (3, 11), 8: (7, 15), 12: (3, 11)}.items():
        for x in xs:                                      # staggered joints
            vline(g, x, band, band + 2, "1")
    P(g, 5, 1, "1")
    P(g, 10, 9, "1")                                      # chipped bricks
    return g


def t_brick_window():
    g = t_brick()
    hline(g, 3, 12, 3, "0")                               # frame
    hline(g, 3, 12, 12, "0")
    vline(g, 3, 3, 12, "0")
    vline(g, 12, 3, 12, "0")
    box(g, 4, 4, 11, 11, "1")                             # dark glass
    for x, y in [(6, 4), (5, 5), (4, 6), (10, 7), (9, 8), (8, 9)]:
        P(g, x, y, "3")                                   # glints
    hline(g, 3, 12, 13, "3")                              # sill
    return g


def t_wood():
    g = blank("2")
    for y in (5, 11):                                     # siding seams
        hline(g, 0, 15, y, "1")
    for x, y in [(3, 2), (4, 2), (10, 8), (11, 8), (6, 14), (7, 14)]:
        P(g, x, y, "1")                                   # grain ticks
    P(g, 12, 3, "1")                                      # knot
    return g


def t_wood_window():
    g = t_wood()
    hline(g, 3, 12, 3, "0")
    hline(g, 3, 12, 12, "0")
    vline(g, 3, 3, 12, "0")
    vline(g, 12, 3, 12, "0")
    box(g, 4, 4, 11, 11, "1")
    vline(g, 7, 4, 11, "0")                               # mullions: 4 panes
    vline(g, 8, 4, 11, "0")
    hline(g, 4, 11, 7, "0")
    hline(g, 4, 11, 8, "0")
    P(g, 4, 4, "3")
    P(g, 9, 4, "3")                                       # upper-pane glints
    hline(g, 3, 12, 13, "3")                              # sill
    return g


def t_fence():
    g = blank("3")
    hline(g, 0, 15, 1, "0")                               # top rail
    for y in range(3, 14):                                # chain-link mesh
        for x in range(16):
            if (x + y) % 4 == 0 or (x - y) % 4 == 0:
                P(g, x, y, "1")
    hline(g, 0, 15, 13, "1")                              # bottom wire
    vline(g, 0, 1, 13, "0")                               # post
    P(g, 2, 14, "2")
    P(g, 9, 15, "2")                                      # grass tufts
    return g


def t_gate():
    g = blank("3")
    hline(g, 0, 15, 0, "0")                               # frame
    hline(g, 0, 15, 14, "0")
    vline(g, 0, 0, 14, "0")
    vline(g, 15, 0, 14, "0")
    vline(g, 1, 1, 13, "1")                               # inner frame shade
    vline(g, 14, 1, 13, "1")
    hline(g, 1, 14, 1, "1")
    hline(g, 1, 14, 13, "1")
    for y in range(2, 13):                                # chain-link mesh
        for x in range(2, 14):
            if (x + y) % 4 == 0 or (x - y) % 4 == 0:
                P(g, x, y, "1")
    P(g, 7, 5, "0")                                       # shackle
    P(g, 8, 5, "0")
    P(g, 6, 6, "0")
    P(g, 9, 6, "0")
    box(g, 6, 7, 9, 10, "0")                              # padlock body
    P(g, 7, 8, "3")                                       # keyhole glint
    hline(g, 1, 14, 15, "1")                              # ground shadow
    return g


# ---------------------------------------------------------------- doors

def t_door():
    return rows_tile([
        "1111111111111111",
        "1000000000000001",
        "1022222222222201",
        "1022222222222201",
        "1022111111112201",
        "1022122222212201",
        "1022122222212201",
        "1022111111112201",
        "1022222222223201",
        "1022222222220201",
        "1022111111112201",
        "1022122222212201",
        "1022122222212201",
        "1022111111112201",
        "1022222222222201",
        "1022222222222201",
    ])


def t_boarded():
    return rows_tile([
        "1111111111111111",
        "1000000000000001",
        "1000000000000001",
        "10" + "3" * 11 + "001",
        "10" + "20222222202" + "001",
        "10" + "1" * 11 + "001",
        "1000000000000001",
        "100" + "3" * 11 + "01",
        "100" + "20222222202" + "01",
        "100" + "1" * 11 + "01",
        "1000000000000001",
        "10" + "3" * 11 + "001",
        "10" + "20222222202" + "001",
        "10" + "1" * 11 + "001",
        "1000000000000001",
        "1000000000000001",
    ])


def t_glassdoor():
    g = blank("3")
    hline(g, 0, 15, 0, "0")
    hline(g, 0, 15, 15, "0")
    vline(g, 0, 0, 15, "0")
    vline(g, 15, 0, 15, "0")
    vline(g, 1, 1, 14, "1")
    vline(g, 14, 1, 14, "1")
    vline(g, 7, 1, 13, "1")                               # double-door divider
    vline(g, 8, 1, 13, "1")
    for y in range(1, 14):                                # reflection streaks
        for x in list(range(2, 7)) + list(range(9, 14)):
            s = x + y
            if x < 7 and s in (7, 8, 17, 18):
                P(g, x, y, "2")
            if x > 8 and s in (14, 15, 24, 25):
                P(g, x, y, "2")
    hline(g, 2, 13, 8, "0")                               # push bar
    hline(g, 1, 14, 14, "1")                              # bottom rail
    return g


# ---------------------------------------------------------------- rail

def t_rail():
    g = blank("2")
    for x, y in [(0, 1), (7, 0), (12, 14), (3, 15), (15, 1), (10, 15)]:
        P(g, x, y, "1")                                   # ballast grit
    for tx in (1, 5, 9, 13):                              # ties under rails
        box(g, tx, 3, tx + 1, 12, "1")
    hline(g, 0, 15, 4, "3")                               # rail shine
    hline(g, 0, 15, 5, "0")                               # rail dark
    hline(g, 0, 15, 10, "3")
    hline(g, 0, 15, 11, "0")
    return g


def t_plank():
    g = blank("2")
    for x in (3, 7, 11, 15):                              # board seams
        vline(g, x, 0, 15, "1")
    hline(g, 0, 15, 0, "3")                               # board top light
    for x in (3, 7, 11, 15):
        P(g, x, 0, "1")
    hline(g, 0, 15, 15, "1")
    for x, y in [(1, 2), (5, 13), (9, 2), (13, 13)]:      # nails
        P(g, x, y, "0")
    hline(g, 0, 15, 4, "3")                               # rails continue
    hline(g, 0, 15, 5, "0")
    hline(g, 0, 15, 10, "3")
    hline(g, 0, 15, 11, "0")
    return g


def t_gap():
    g = blank("0")
    hline(g, 0, 15, 4, "3")                               # rails over the void
    hline(g, 0, 15, 5, "1")
    hline(g, 0, 15, 10, "3")
    hline(g, 0, 15, 11, "1")
    # splintered plank stubs (left edge)
    hline(g, 0, 3, 0, "2")
    hline(g, 0, 1, 1, "2")
    P(g, 2, 1, "1")
    hline(g, 0, 2, 7, "2")
    hline(g, 0, 1, 8, "2")
    P(g, 2, 8, "1")
    hline(g, 0, 3, 14, "2")
    hline(g, 0, 1, 15, "2")
    P(g, 2, 15, "1")
    # stubs (right edge)
    hline(g, 13, 15, 1, "2")
    P(g, 14, 2, "2")
    P(g, 15, 2, "2")
    hline(g, 14, 15, 8, "2")
    P(g, 13, 8, "1")
    hline(g, 12, 15, 13, "2")
    hline(g, 14, 15, 14, "2")
    # river glint far below
    hline(g, 6, 8, 8, "1")
    P(g, 9, 7, "1")
    hline(g, 4, 6, 13, "1")
    P(g, 7, 14, "1")
    return g


# ---------------------------------------------------------------- hazards

def t_glasshaz():
    g = blank("3")
    stamp(g, 3, 4, [                                      # shard, point up-right
        "030.",
        "0330",
        ".00.",
    ])
    stamp(g, 9, 7, [                                      # shard, point down
        ".00.",
        "0330",
        ".030",
    ])
    stamp(g, 5, 11, [                                     # shard, point left
        "00..",
        "0330",
        ".00.",
    ])
    P(g, 11, 2, "0")                                      # chips
    P(g, 12, 3, "0")
    P(g, 2, 9, "1")
    P(g, 13, 12, "0")
    P(g, 8, 2, "1")
    P(g, 14, 9, "1")
    for x, y in [(6, 8), (10, 13), (1, 13), (12, 5), (7, 6)]:
        P(g, x, y, "2")                                   # glass dust
    return g


def t_wire():
    g = blank("2")
    for x, y in [(1, 1), (13, 2), (4, 14), (11, 15)]:
        P(g, x, y, "1")
    for y in range(4, 9):                                 # big coil (diamonds)
        for x in range(16):
            m = (x + 2 * abs(y - 6)) % 4
            if (y == 6 and x % 4 == 0) or (y in (5, 7) and x % 4 in (1, 3)) \
               or (y in (4, 8) and x % 4 == 2):
                P(g, x, y, "0")
            del m
    for x in range(16):                                   # ground shadow
        if x % 4 == 2:
            P(g, x, 9, "1")
    for x in range(16):                                   # low strand
        if x % 4 == 0:
            P(g, x, 11, "0")
        if x % 4 in (1, 3):
            P(g, x, 12, "0")
        if x % 4 == 2:
            P(g, x, 13, "0")
    P(g, 2, 5, "3")
    P(g, 10, 6, "3")                                      # glints
    return g


# ---------------------------------------------------------------- objects

def car_rows():
    bg = "2"

    def body(hood, ws, roof, rw, trunk):
        return "220" + hood * 7 + ws * 3 + roof * 8 + rw * 3 + trunk * 5 + "022"

    wheels = bg * 5 + "0000" + bg * 13 + "0000" + bg * 6
    rows = [
        bg * 32,
        bg * 32,
        wheels,
        bg * 3 + "0" * 26 + bg * 3,
        body("3", "1", "3", "1", "3"),
        body("2", "1", "3", "1", "2"),
        body("2", "1", "3", "1", "2"),
        body("2", "1", "3", "1", "2"),
        body("2", "1", "3", "1", "2"),
        body("2", "1", "2", "1", "2"),
        body("2", "1", "2", "1", "2"),
        "220" + "2" * 26 + "022",
        "220" + "1" * 26 + "022",
        bg * 3 + "0" * 26 + bg * 3,
        wheels,
        bg * 32,
    ]
    for r in rows:
        assert len(r) == 32, r
    return rows


def t_car_l():
    return rows_tile([r[:16] for r in car_rows()])


def t_car_r():
    return rows_tile([r[16:] for r in car_rows()])


def t_dumpster():
    g = blank("2")
    hline(g, 1, 14, 2, "0")                               # lid back edge
    hline(g, 2, 6, 3, "3")                                # lid catch-light
    hline(g, 7, 13, 3, "2")
    vline(g, 1, 2, 13, "0")
    vline(g, 14, 2, 13, "0")
    hline(g, 2, 13, 4, "2")
    for x in (4, 5, 10, 11):
        P(g, x, 4, "1")                                   # lid handles
    hline(g, 2, 13, 5, "1")                               # lid lip
    box(g, 2, 6, 13, 12, "1")                             # body
    hline(g, 2, 13, 9, "0")                               # groove
    vline(g, 3, 7, 8, "2")
    vline(g, 12, 7, 8, "2")                               # pocket marks
    hline(g, 1, 14, 13, "0")
    hline(g, 2, 13, 14, "1")                              # shadow
    for x in (3, 4, 11, 12):
        P(g, x, 14, "0")                                  # casters
    return g


def t_vending():
    g = blank("3")
    hline(g, 3, 12, 0, "0")
    vline(g, 3, 0, 14, "0")
    vline(g, 12, 0, 14, "0")
    hline(g, 4, 11, 1, "1")                               # top trim
    box(g, 4, 2, 9, 8, "3")                               # glass front
    stamp(g, 4, 3, ["313131"])                            # snack row 1
    hline(g, 4, 9, 5, "2")                                # shelf line
    stamp(g, 4, 6, ["131313"])                            # snack row 2
    vline(g, 10, 2, 8, "1")                               # select panel
    vline(g, 11, 2, 8, "1")
    P(g, 11, 3, "2")                                      # buttons
    P(g, 11, 5, "3")                                      # coin slot glint
    P(g, 11, 7, "2")
    hline(g, 4, 11, 9, "0")                               # divider
    box(g, 4, 10, 11, 13, "1")                            # lower body
    box(g, 5, 11, 8, 12, "0")                             # dispense slot
    hline(g, 3, 12, 14, "0")
    hline(g, 4, 11, 15, "1")                              # shadow
    return g


def t_shelf():
    g = blank("1")
    hline(g, 0, 15, 0, "0")
    vline(g, 0, 0, 15, "0")
    vline(g, 15, 0, 15, "0")
    hline(g, 1, 14, 1, "2")                               # top board
    # upper cavity items
    box(g, 2, 3, 4, 5, "2")
    P(g, 2, 3, "3")
    box(g, 7, 4, 8, 5, "3")
    box(g, 11, 3, 12, 5, "2")
    P(g, 11, 3, "3")
    hline(g, 1, 14, 6, "2")                               # mid shelf board
    hline(g, 1, 14, 7, "0")                               # board shadow
    # lower cavity items
    box(g, 3, 9, 4, 12, "3")
    P(g, 3, 9, "2")
    box(g, 8, 10, 10, 12, "2")
    P(g, 8, 10, "3")
    box(g, 13, 11, 13, 12, "3")
    hline(g, 1, 14, 13, "2")                              # base board
    hline(g, 1, 14, 14, "1")
    hline(g, 0, 15, 15, "0")
    return g


def t_desk():
    g = blank("3")
    hline(g, 2, 13, 1, "0")
    vline(g, 2, 1, 14, "0")
    vline(g, 13, 1, 14, "0")
    hline(g, 3, 12, 2, "3")                               # top surface
    hline(g, 3, 12, 3, "2")                               # front edge
    box(g, 3, 4, 12, 6, "2")                              # drawer 1
    hline(g, 6, 9, 5, "0")
    hline(g, 3, 12, 7, "1")
    box(g, 3, 8, 12, 10, "2")                             # drawer 2
    hline(g, 6, 9, 9, "0")
    hline(g, 3, 12, 11, "1")
    box(g, 3, 12, 12, 13, "2")                            # drawer 3
    hline(g, 6, 9, 13, "0")
    hline(g, 2, 13, 14, "0")
    hline(g, 3, 12, 15, "1")                              # floor shadow
    return g


def t_boxcar():
    g = blank("1")
    hline(g, 0, 15, 0, "0")                               # roof edge
    hline(g, 0, 15, 1, "2")                               # roof lip lit
    hline(g, 0, 15, 2, "0")                               # door track
    vline(g, 1, 3, 12, "0")                               # wall ribs
    vline(g, 14, 3, 12, "0")
    vline(g, 3, 3, 12, "0")                               # door frame
    vline(g, 12, 3, 12, "0")
    box(g, 4, 3, 11, 12, "2")                             # sliding door
    vline(g, 6, 3, 12, "1")                               # door planks
    vline(g, 9, 3, 12, "1")
    vline(g, 10, 7, 9, "0")                               # handle bar
    P(g, 11, 8, "3")                                      # handle glint
    hline(g, 0, 15, 13, "0")
    hline(g, 0, 15, 14, "1")
    for x in (2, 3, 12, 13):
        P(g, x, 14, "0")                                  # wheel hint
    g[15] = list("2212222122221222")                      # ballast under car
    return g


def t_bed():
    g = blank("3")
    hline(g, 3, 12, 0, "0")
    vline(g, 3, 0, 14, "0")
    vline(g, 12, 0, 14, "0")
    hline(g, 4, 11, 1, "1")                               # headboard
    box(g, 4, 2, 11, 4, "3")                              # pillow
    hline(g, 4, 11, 4, "2")                               # pillow crease
    hline(g, 4, 11, 5, "3")                               # folded sheet
    box(g, 4, 6, 11, 12, "2")                             # blanket
    hline(g, 4, 11, 8, "1")                               # folds
    hline(g, 4, 11, 11, "1")
    hline(g, 4, 11, 13, "1")                              # blanket end
    hline(g, 3, 12, 14, "0")                              # footboard
    hline(g, 4, 11, 15, "1")                              # shadow
    return g


def t_sign():
    g = blank("3")
    hline(g, 1, 14, 1, "0")
    vline(g, 1, 1, 8, "0")
    vline(g, 14, 1, 8, "0")
    box(g, 2, 2, 13, 6, "3")                              # board face
    hline(g, 3, 6, 3, "1")                                # text scratches
    hline(g, 8, 12, 3, "1")
    hline(g, 3, 9, 5, "1")
    hline(g, 2, 13, 7, "2")                               # board lower shade
    hline(g, 1, 14, 8, "0")
    for x in (3, 11):                                     # post legs
        vline(g, x, 9, 13, "1")
        vline(g, x + 1, 9, 13, "0")
    P(g, 2, 13, "2")
    P(g, 13, 13, "2")                                     # base tufts
    return g


def t_counter():
    g = blank("2")
    hline(g, 0, 15, 0, "0")                               # back edge
    box(g, 0, 1, 15, 4, "3")                              # countertop
    for x, y in [(3, 2), (9, 3), (13, 1)]:
        P(g, x, y, "2")
    hline(g, 0, 15, 5, "2")                               # top front edge
    hline(g, 0, 15, 6, "0")                               # lip shadow
    for y in range(7, 14):                                # front panel
        for x in range(16):
            if x % 4 == 3:
                P(g, x, y, "1")
    hline(g, 0, 15, 14, "1")
    hline(g, 0, 15, 15, "0")                              # floor shadow
    return g


# ---------------------------------------------------------------- emit

TILES = {
    "grass": t_grass, "dirt": t_dirt, "road": t_road, "road_line": t_road_line,
    "sidewalk": t_sidewalk, "tallgrass": t_tallgrass, "tree": t_tree,
    "debris": t_debris, "water": t_water, "pump": t_pump, "brick": t_brick,
    "brick_window": t_brick_window, "wood": t_wood, "wood_window": t_wood_window,
    "fence": t_fence, "gate": t_gate, "door": t_door, "boarded": t_boarded,
    "glassdoor": t_glassdoor, "rail": t_rail, "plank": t_plank, "gap": t_gap,
    "glasshaz": t_glasshaz, "wire": t_wire, "car_l": t_car_l, "car_r": t_car_r,
    "dumpster": t_dumpster, "vending": t_vending, "shelf": t_shelf,
    "desk": t_desk, "boxcar": t_boxcar, "firepit": t_firepit,
    "firepit_lit": t_firepit_lit, "bed": t_bed, "sign": t_sign,
    "cache": t_cache, "floor": t_floor, "floor_rug": t_floor_rug,
    "doorway": t_doorway, "counter": t_counter,
}


def main():
    out = {}
    for name, fn in TILES.items():
        s = S(fn())
        assert len(s) == 256, f"{name}: {len(s)} chars"
        assert set(s) <= set("0123"), f"{name}: bad chars {set(s) - set('0123')}"
        out[name] = s
    body = json.dumps(out, indent=2)
    target = ROOT / "js" / "data-tiles.js"
    target.write_text(f"const TILES = /*JSON*/{body};\n", encoding="utf-8")
    print(f"wrote {target} ({len(out)} tiles)")


if __name__ == "__main__":
    main()
