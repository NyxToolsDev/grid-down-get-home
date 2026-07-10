#!/usr/bin/env python
"""World generator for Grid Down: Get Home.
Authors all 48 maps (37 overworld + 11 interiors), runs safety passes
(border solidify, edge-alignment punch), and writes js/data-maps.js.
Run: python tools/_gen_maps.py   then: node tools/validate-data.mjs maps
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

WORLD = {"A": [2, 3, 5, 6, 7, 8], "B": list(range(1, 9)), "C": list(range(1, 9)),
         "D": list(range(1, 9)), "E": [3, 4, 5, 6, 7, 8], "F": [8]}
BLOCKED = ["B6|B7", "D6|D7", "E7|E8"]
WALKABLE = set(".,=-tR^hwrI+Lu")
OPENISH = WALKABLE | set("G")

SCREENS = {}


def scr(sid, name, region, rows, ents=None, doors=None, dark=False, interior=False):
    assert len(rows) == 8, f"{sid}: {len(rows)} rows"
    for r in rows:
        assert len(r) == 10, f"{sid}: row '{r}' len {len(r)}"
    SCREENS[sid] = {"name": name, "region": region, "rows": [list(r) for r in rows],
                    "ents": ents or [], "doors": doors or {},
                    "dark": dark, "interior": interior}


def E(t, x, y, **kw):
    d = {"t": t, "x": x, "y": y}
    d.update(kw)
    return d


# ============================== REGION 1: DOWNTOWN ==========================
scr("B1", "OFFICE PLAZA", 1, [
    "##########",
    "#nn#Dn#nn#",
    "T---------",
    "----------",
    "----------",
    "T-S------=",
    "T...---..=",
    "TTTT--TTTT",
], ents=[E("sign", 2, 5, text="sign_plaza")],
   doors={"4,1": {"to": "INT_OFFICE", "at": [4, 6]}})

scr("B2", "FREIGHT ROW", 1, [
    "TTTT--TTTT",
    "#dd#--#dd#",
    "#,,,--,,,#",
    "----------",
    "----------",
    "#,,#--#,,#",
    "#,,,--,,,#",
    "TTTT--TTTT",
], ents=[E("box", 1, 1, table="dumpster"), E("box", 7, 1, table="dumpster")])

scr("C1", "MAPLE + 3RD", 1, [
    "TTTT--TTTT",
    "#nn#--#nn#",
    "==========",
    "LLLLLLLLLL",
    "==========",
    "---d------",
    "T.........",
    "TTTT--TTTT",
], ents=[E("npc", 6, 5, id="theo"), E("box", 3, 5, table="dumpster")])

scr("C2", "MAIN ST WEST", 1, [
    "TTTT--TTTT",
    "#ng#gn#dn#",
    "==========",
    "LLLLLLLLLL",
    "==========",
    "----------",
    "#,,,,,,,,#",
    "TTTT--TTTT",
], ents=[E("box", 7, 1, table="dumpster")],
   doors={"4,1": {"to": "INT_MART", "at": [4, 6]}})

scr("D1", "GARAGE GATE", 1, [
    "TTTT--TTTT",
    "#ff,--,ff#",
    "#fD,,,,cc#",
    "#f,,,,,,,#",
    "----------",
    "#cc,,,,,,#",
    "#ff,,,,ff#",
    "TTTTTTTTTT",
], ents=[E("box", 7, 2, table="trunk"), E("box", 1, 5, table="trunk"),
         E("sleepcar", 2, 5)],
   doors={"2,2": {"to": "INT_GARAGE", "at": [4, 6]}})

scr("D2", "MAIN ST EAST", 1, [
    "TTTT--TTTT",
    "#nn#--#nn#",
    "#,,,--,,d#",
    "----------",
    "----------",
    "#d,,,,,,,#",
    "#,,,,,,,,#",
    "TTTTTTTTTT",
], ents=[E("dog", 6, 5), E("box", 8, 2, table="dumpster"), E("box", 1, 5, table="dumpster")])

# ============================== REGION 2: RAILSIDE ==========================
scr("A2", "RAILYARD N", 2, [
    "##########",
    "#rrrrrrrr#",
    "#r,,,,,,r#",
    "#,x,x,x,,#",
    "#,,,,,,,O#",
    "#rrrrrrrr#",
    "#,,,,,,,,#",
    "####GG####",
], ents=[E("box", 2, 3, table="boxcar"), E("box", 4, 3, table="boxcar"),
         E("box", 8, 4, table="cache", cache="boxcar_cache"), E("dog", 2, 6)])

scr("A3", "RAIL SIDING", 2, [
    "##########",
    "#rrrrrrrr#",
    "#,,,,,,,,#",
    "#,x,,x,,,#",
    "#,,,,,,,,#",
    "#rrrrrrrr#",
    "#,,,,,,,,#",
    "####GG####",
], ents=[E("box", 2, 3, table="boxcar"), E("box", 5, 3, table="boxcar")])

scr("B3", "SWITCH YARD", 2, [
    "TTTT--TTTT",
    "#rr,--,rr#",
    "#rr,,,,rr#",
    "-------,,-",
    "----------",
    "#d,,,,,,d#",
    "#,,,,,,,,#",
    "TTTT--TTTT",
], ents=[E("box", 1, 5, table="dumpster"), E("box", 8, 5, table="dumpster"),
         E("npc", 4, 2, id="biscuit")])

# Jackknifed semi blocks the overpass mid-span: the fast lanes thread glass,
# the clean line is the slow southern loop. Time or blood.
scr("C3", "OVERPASS", 2, [
    "TTTT--TTTT",
    "#S,,--,,,#",
    "==,,h**,==",
    "LLLh***,LL",
    "==,,**cc==",
    "---cc,,h--",
    "T,,,,,,,,T",
    "TTTT--TTTT",
], ents=[E("sign", 1, 1, text="sign_overpass"), E("box", 6, 4, table="trunk"),
         E("box", 3, 5, table="trunk"), E("sleepcar", 4, 5)])

# Fence line splits the alley: the shed door and the through-route east both
# pass the den. Feed them, fight them, or go around via C3/E3.
scr("D3", "DOG ALLEY", 2, [
    "TTTT--TTTT",
    "#,,,f,,WW#",
    "#d,,f,,DW#",
    "----f,,,--",
    "---,f,,---",
    "#d,,f,,,d#",
    "#,,,,,,,,#",
    "TTTT,,TTTT",
], ents=[E("dog", 6, 3), E("dog", 5, 5), E("dog", 7, 6),
         E("box", 1, 2, table="dumpster"), E("box", 1, 5, table="dumpster"),
         E("box", 8, 5, table="dumpster")],
   doors={"7,2": {"to": "INT_RAILSHED", "at": [4, 6]}})

scr("E3", "CULVERT PATH", 2, [
    "TTTT,,TTTT",
    "T.,,,,,..T",
    "T.,*****.T",
    "T,,,,,,,,,",
    "T,,,,,,,,,",
    "T.,d.....T",
    "T........T",
    "TTTTTTTTTT",
], ents=[E("box", 3, 5, table="dumpster")])

# ============================== REGION 3: MILLBROOK STRIP ===================
scr("B4", "STRIP NORTH", 3, [
    "TTTT--TTTT",
    "#nn#--#nn#",
    "#d,,--,,c#",
    "----------",
    "----------",
    "#,,,,,,,d#",
    "#,,,,,,,,#",
    "TTTT--TTTT",
], ents=[E("box", 1, 2, table="dumpster"), E("box", 8, 2, table="trunk"),
         E("box", 8, 5, table="dumpster")])

scr("A5", "WAREHOUSE ROW", 3, [
    "##########",
    "#nnnnnnnn#",
    "#,,,,,,,,#",
    "#,d,,ff,,G",
    "#,,,,fOf,G",
    "#,,d,fGf,#",
    "#,,,,,,,,#",
    "#,,#######",
], ents=[E("box", 2, 3, table="dumpster"), E("box", 3, 5, table="dumpster"),
         E("box", 6, 4, table="cache", cache="warehouse_fence")])

scr("B5", "HARDWARE FRT", 3, [
    "T,,TTTTTTT",
    "#,,#Dn#nn#",
    "#,,,--,,,#",
    "----------",
    "----------",
    "#,,,,,,,c#",
    "#,,,,,,,,#",
    "TTTT--TTTT",
], ents=[E("box", 8, 5, table="trunk")],
   doors={"4,1": {"to": "INT_HARDWARE", "at": [4, 6]}})

scr("C4", "PHARMACY BLK", 3, [
    "TTTT--TTTT",
    "#nn#Bn#dn#",
    "==========",
    "LLLLLLLLLL",
    "==========",
    "--S-------",
    "#,,,,,,,,#",
    "TTTT--TTTT",
], ents=[E("sign", 2, 5, text="sign_pharmacy"), E("box", 7, 1, table="dumpster")],
   doors={"4,1": {"to": "INT_PHARMACY", "at": [4, 6]}})

scr("C5", "CHURCH GREEN", 3, [
    "TTTT--TTTT",
    "T.##D##..T",
    "==========",
    "LLLLLLLLLL",
    "==========",
    "-S--------",
    "T........T",
    "TTTT--TTTT",
], ents=[E("sign", 1, 5, text="sign_church")],
   doors={"4,1": {"to": "INT_CHURCH", "at": [4, 6]}})

scr("D4", "STRIP SOUTH", 3, [
    "TTTT--TTTT",
    "#nn#--#nn#",
    "#v,,--,,v#",
    "----------",
    "----------",
    "#,,,,,,,d#",
    "#,,,,,,,,#",
    "TTTT--TTTT",
], ents=[E("box", 1, 2, table="vending"), E("box", 8, 2, table="vending"),
         E("box", 8, 5, table="dumpster")])

scr("D5", "GAS STATION", 3, [
    "TTTT--TTTT",
    "#nn#-#Dnn#",
    "#,,,-,,,,#",
    "---cc-----",
    "----------",
    "#cc,,,S,,#",
    "#,,,,,,,,#",
    "TTTT--TTTT",
], ents=[E("sign", 6, 5, text="sign_gas"), E("box", 3, 3, table="trunk"),
         E("box", 1, 5, table="trunk"), E("sleepcar", 2, 5)],
   doors={"6,1": {"to": "INT_GAS", "at": [4, 6]}})

scr("E4", "MOTEL COURT", 3, [
    "TTTT--TTTT",
    "#WoWoWoWW#",
    "#WEIWIEWv#",
    "#W,,,,,,,#",
    ",,,,,,,,,,",
    ",,,F,,,c,,",
    "#,S,,,,,,#",
    "TTTTTTTTTT",
], ents=[E("sign", 2, 6, text="sign_motel"), E("box", 8, 2, table="vending"),
         E("box", 7, 5, table="trunk"), E("npc", 3, 3, id="junie")])

scr("E5", "TOWN SQUARE", 3, [
    "TTTT--TTTT",
    "#,,,--,,v#",
    "#,,,,,,,,#",
    ",,,,P,,,,,",
    ",,,,,,,,,,",
    "#,,,,,,,d#",
    "#,,,,,,,,#",
    "TTTTTTTTTT",
], ents=[E("box", 8, 1, table="vending"), E("box", 8, 5, table="dumpster")])

# ============================== REGION 4: HARLAN RIVER ======================
scr("A6", "TRESTLE WEST", 4, [
    "##########",
    "#........~",
    "#.S......~",
    "rrrrrrRR^R",
    ",rrrrrRRRR",
    "#....,...~",
    "#....,,..~",
    "####,,####",
], ents=[E("sign", 2, 2, text="sign_trestle")])

scr("A7", "TRESTLE EAST", 4, [
    "##########",
    "~........#",
    "~........#",
    "RRrrrrrrr,",
    "R^Rrrrrrr,",
    "~........#",
    "~..x.,...#",
    "####,,####",
], ents=[E("box", 3, 6, table="boxcar")])

scr("B6", "RIVERBANK N", 4, [
    "TTTT,,TTTT",
    "T.....,..~",
    "T.d...,..~",
    ",,,,,,,..~",
    ",,,,,,...~",
    "T..F.....~",
    "T..c.....~",
    "TTTT,,TTTT",
], ents=[E("box", 2, 2, table="dumpster"), E("box", 3, 6, table="trunk")])

scr("C6", "TOLL BRIDGE", 4, [
    "TTTT,,TTTT",
    "T...,....~",
    "=cc===GRRR",
    "LLLLLLGRRR",
    "====ccGRR~",
    "-S..t,,F.~",
    "T...tttRRR",
    "TTTT,,TTTT",
], ents=[E("sign", 1, 5, text="sign_bridge_w"), E("npc", 5, 3, id="reyes"),
         E("npc", 6, 5, id="guard"), E("box", 1, 2, table="trunk"),
         E("box", 4, 4, table="trunk"), E("box", 2, 2, table="trunk")])

scr("D6", "RIVERBANK S", 4, [
    "TTTT,,TTTT",
    "T........~",
    "T.d......~",
    ",,,,,,,..~",
    ",,,,,,...~",
    "T...F....~",
    "T...c....~",
    "TTTT,,TTTT",
], ents=[E("box", 2, 2, table="dumpster"), E("box", 4, 6, table="trunk")])

scr("E6", "UNDERPASS W", 4, [
    "##########",
    "#,,,,,,,,#",
    "#,S,*,,,,#",
    ",,,,w,,,ww",
    ",,,w,,,w,,",
    "#,,,,*,,d#",
    "#,,,,,,,c#",
    "##########",
], ents=[E("sign", 2, 2, text="sign_underpass"), E("box", 8, 5, table="dumpster"),
         E("box", 8, 6, table="trunk"), E("npc", 2, 5, id="wes")],
   dark=True, interior=True)

scr("E7", "UNDERPASS E", 4, [
    "####,,####",
    "#,,,,,,,,#",
    "#,,,*,,d,#",
    "ww,,,,,,,#",
    ",,w,,,,,,#",
    "#,,,,,,,,#",
    "#,,,,,,,,#",
    "##########",
], ents=[E("dog", 6, 5), E("box", 7, 2, table="dumpster")], dark=True, interior=True)

# ============================== REGION 5: CEDAR RUN RURAL ===================
scr("A8", "PINE HOLLOW", 5, [
    "##########",
    "#TT...TTT#",
    "#T..O...T#",
    "#..,,,..T#",
    ",,,,,,,..#",
    "#T.,F,..T#",
    "#TT,,,TTT#",
    "####,,####",
], ents=[E("box", 4, 2, table="cache", cache="scarecrow"), E("dog", 2, 4), E("dog", 7, 3)])

scr("B7", "CREEK BEND", 5, [
    "TTTT,,TTTT",
    "~~...,...T",
    "~~~..,...T",
    "~,,,,,,,,,",
    "~,,,,,,,,,",
    "~..~~....T",
    "~...~~...T",
    "TTTT,,TTTT",
], ents=[E("dog", 6, 2), E("dog", 2, 4)])

scr("B8", "HOLLER FARM", 5, [
    "TTTT,,TTTT",
    "T.WoDoW..T",
    "T.W,,,W..T",
    ",,,,,,,,.T",
    ",,,,,,,..T",
    "T.fff.F..T",
    "T.S......T",
    "TTTT,,TTTT",
], ents=[E("sign", 2, 6, text="sign_farm")],
   doors={"4,1": {"to": "INT_FARMHOUSE", "at": [4, 6]}})

# The river took a bite out of the county road. Fast lanes wade glass at the
# washout lip; the dry line loops south past the cars.
scr("C7", "COUNTY ROAD", 5, [
    "TTTT,,TTTT",
    "~....,...T",
    "R==~~~,===",
    "RLL~~h,LLL",
    "~=,,h,cc==",
    "~..cc,...T",
    "R,,......T",
    "TTTT,,TTTT",
], ents=[E("box", 6, 4, table="trunk"), E("box", 3, 5, table="trunk"),
         E("sleepcar", 4, 5)])

scr("C8", "FARM FIELDS", 5, [
    "TTTT,,TTTT",
    "T.##.tttT#",
    "T.nn.ttttT",
    ",,,,,,,,,T",
    ",,,,,,,,,T",
    "Tttt..cc.T",
    "Td...tttT#",
    "TTTT,,TTTT",
], ents=[E("dog", 6, 3), E("box", 1, 6, table="dumpster"), E("box", 6, 5, table="trunk")])

scr("D7", "DRY MEADOW", 5, [
    "TTTT,,TTTT",
    "~ttt.....T",
    "~tttt..t.T",
    "~,,,,,,,,,",
    "~,,,,,,,,,",
    "~t..O..ttT",
    "~ttt..tttT",
    "TTTT,,TTTT",
], ents=[E("box", 4, 5, table="cache", cache="culvert")])

scr("D8", "CHECKPOINT", 5, [
    "TTTT,,TTTT",
    "T....,fffT",
    "T.S..f...T",
    ",,,,,f,,,T",
    ",,,,,,,,,T",
    "T....f.d.T",
    "T....f...T",
    "TTTT,,TTTT",
], ents=[E("sign", 2, 2, text="sign_checkpoint"), E("npc", 5, 4, id="dee"),
         E("box", 7, 5, table="dumpster")])

scr("E8", "MAPLE LANE", 5, [
    "TTTT,,TTTT",
    "#T...,..TT",
    "#.T..,..cT",
    "#,,,,,,,,T",
    "#,,,,,,,,T",
    "#.d...T..T",
    "#..T...T.T",
    "TTTT,,TTTT",
], ents=[E("box", 8, 2, table="trunk"), E("box", 2, 5, table="dumpster"),
         E("dog", 4, 3), E("dog", 5, 5)])

scr("F8", "HOME STREET", 5, [
    "TTTT,,TTTT",
    "#oW..,.Wo#",
    "#WW.,,.WD#",
    "#...,,...#",
    "#,,,,,,,,#",
    "#.d....c.#",
    "#........#",
    "##########",
], ents=[E("box", 2, 5, table="dumpster"), E("box", 7, 5, table="trunk")],
   doors={"8,2": {"to": "INT_HOME", "at": [4, 6]}})

# ============================== INTERIORS ===================================
scr("INT_OFFICE", "OFFICE FLOOR", 1, [
    "##########",
    "#kIIkkIIk#",
    "#IIIIIIII#",
    "#kIIIIIIE#",
    "#IIIIIIII#",
    "#SIIIIIII#",
    "#IIIIIIII#",
    "####++####",
], ents=[E("npc", 6, 4, id="dale"), E("sign", 1, 5, text="note_office"),
         E("box", 1, 1, table="desk"), E("box", 8, 1, table="desk"),
         E("box", 1, 3, table="desk")],
   doors={"4,7": {"to": "B1", "at": [4, 2]}, "5,7": {"to": "B1", "at": [4, 2]}},
   interior=True)

scr("INT_GARAGE", "PARKING GARAGE", 1, [
    "##########",
    "#ccIIIcc##",
    "#IIIIIIII#",
    "#IIIIIIII#",
    "#ccIIIIcc#",
    "#IIIIIIII#",
    "#IIIIIIII#",
    "####++####",
], ents=[E("key", 4, 2, item="bag"), E("box", 1, 1, table="trunk"),
         E("box", 7, 4, table="trunk")],
   doors={"4,7": {"to": "D1", "at": [2, 3]}, "5,7": {"to": "D1", "at": [2, 3]}},
   dark=True, interior=True)

scr("INT_MART", "CORNER MART", 1, [
    "##########",
    "#sIsIsIIC#",
    "#IIIIIIII#",
    "#sIsIsIIh#",
    "#IIIIIIII#",
    "#hIIIIIII#",
    "#IIIIIIII#",
    "####++####",
], ents=[E("box", 1, 1, table="shelf"), E("box", 3, 1, table="shelf"),
         E("box", 5, 3, table="shelf"), E("box", 3, 3, table="shelf"),
         E("box", 8, 1, table="fridge")],
   doors={"4,7": {"to": "C2", "at": [4, 2]}, "5,7": {"to": "C2", "at": [4, 2]}},
   interior=True)

scr("INT_RAILSHED", "RAIL SHED", 2, [
    "##########",
    "##sIIIs###",
    "##IIIII###",
    "##IIIII###",
    "##IIIII###",
    "##IIIII###",
    "##IIIII###",
    "####++####",
], ents=[E("key", 4, 3, item="crowbar"), E("box", 2, 1, table="shelf"),
         E("box", 6, 1, table="shelf")],
   doors={"4,7": {"to": "D3", "at": [7, 3]}, "5,7": {"to": "D3", "at": [7, 3]}},
   dark=True, interior=True)

scr("INT_PHARMACY", "PHARMACY", 3, [
    "##########",
    "#sIsIIsIs#",
    "#IIIIIIII#",
    "#CCCCIIII#",
    "#IIIIIIIS#",
    "#IIIIIIII#",
    "#IIIIIIII#",
    "####++####",
], ents=[E("npc", 2, 4, id="marta"), E("key", 1, 2, item="insulin"),
         E("sign", 8, 4, text="note_pharmacy"),
         E("box", 1, 1, table="shelf"), E("box", 3, 1, table="shelf"),
         E("box", 6, 1, table="shelf"), E("box", 8, 1, table="shelf")],
   doors={"4,7": {"to": "C4", "at": [4, 2]}, "5,7": {"to": "C4", "at": [4, 2]}},
   interior=True)

scr("INT_HARDWARE", "HARDWARE STORE", 3, [
    "##########",
    "#IIIsIIIs#",
    "#IsIIIIII#",
    "####B#####",
    "#sIIIIIsI#",
    "#IIIIIIII#",
    "#IIIIIIII#",
    "####++####",
], ents=[E("key", 2, 1, item="boltcutters"),
         E("box", 4, 1, table="shelf"), E("box", 8, 1, table="shelf"),
         E("box", 2, 2, table="shelf"),
         E("box", 1, 4, table="shelf"), E("box", 7, 4, table="shelf")],
   doors={"4,7": {"to": "B5", "at": [4, 2]}, "5,7": {"to": "B5", "at": [4, 2]},
          "4,3": {"to": "INT_HARDWARE", "at": [4, 2], "at2": [4, 4]}},
   interior=True)

scr("INT_CHURCH", "CHURCH", 3, [
    "##########",
    "#IIIIIIII#",
    "#EIIIIIEI#",
    "#IIIIIIII#",
    "#EIIIIIOI#",
    "#IIIIIIII#",
    "#IIIIIIII#",
    "####++####",
], ents=[E("npc", 4, 1, id="ames"),
         E("box", 7, 4, table="cache", cache="third_pew")],
   doors={"4,7": {"to": "C5", "at": [4, 2]}, "5,7": {"to": "C5", "at": [4, 2]}},
   interior=True)

scr("INT_GAS", "GAS STATION", 3, [
    "##########",
    "#sIIsIIIC#",
    "#IIIIIIII#",
    "#IIIIIIII#",
    "#IIIIIIII#",
    "#IIIIIIII#",
    "#IIIIIIII#",
    "####++####",
], ents=[E("key", 2, 3, item="flashlight"), E("key", 6, 3, item="map"),
         E("key", 7, 5, item="matches"),
         E("box", 1, 1, table="shelf"), E("box", 4, 1, table="shelf"),
         E("box", 8, 1, table="fridge")],
   doors={"4,7": {"to": "D5", "at": [6, 2]}, "5,7": {"to": "D5", "at": [6, 2]}},
   interior=True)

scr("INT_FARMHOUSE", "FARMHOUSE", 5, [
    "##########",
    "#CIIIIIIE#",
    "#IIIIIIII#",
    "#IIIIIIII#",
    "#IIIIIID##",
    "#IIIIIIII#",
    "#IIIIIIII#",
    "####++####",
], ents=[E("npc", 3, 2, id="ruth"), E("npc", 6, 2, id="earl"),
         E("box", 1, 1, table="fridge")],
   doors={"4,7": {"to": "B8", "at": [4, 2]}, "5,7": {"to": "B8", "at": [4, 2]},
          "7,4": {"to": "INT_CELLAR", "at": [4, 2]}},
   interior=True)

scr("INT_CELLAR", "CELLAR", 5, [
    "##########",
    "####++####",
    "##IIIIII##",
    "##IsIIOI##",
    "##IIIIII##",
    "##IIIIII##",
    "##########",
    "##########",
], ents=[E("box", 3, 3, table="shelf"),
         E("box", 6, 3, table="cache", cache="farm_cellar")],
   doors={"4,1": {"to": "INT_FARMHOUSE", "at": [6, 4]}, "5,1": {"to": "INT_FARMHOUSE", "at": [6, 4]}},
   dark=True, interior=True)

scr("INT_HOME", "YOUR HOUSE", 5, [
    "##########",
    "#CIIIIIIE#",
    "#IIIIIIII#",
    "#IIIIIIII#",
    "#uuIIIIII#",
    "#uuIIIIII#",
    "#IIIIIIII#",
    "####++####",
], ents=[E("npc", 4, 3, id="sam"), E("npc", 6, 4, id="kid"),
         E("box", 1, 1, table="fridge")],
   doors={"4,7": {"to": "F8", "at": [8, 3]}, "5,7": {"to": "F8", "at": [8, 3]}},
   interior=True)

# ============================== SAFETY PASSES ===============================
ROWS = "ABCDEF"


def neighbor(sid, d):
    r, c = sid[0], int(sid[1:])
    if d == "N":
        nr = ROWS[ROWS.index(r) - 1] if ROWS.index(r) > 0 else None
        return f"{nr}{c}" if nr and c in WORLD.get(nr, []) else None
    if d == "S":
        nr = ROWS[ROWS.index(r) + 1] if ROWS.index(r) < 5 else None
        return f"{nr}{c}" if nr and c in WORLD.get(nr, []) else None
    if d == "W":
        return f"{r}{c-1}" if (c - 1) in WORLD[r] else None
    return f"{r}{c+1}" if (c + 1) in WORLD[r] else None


def ekey(a, b):
    return "|".join(sorted([a, b]))


OVERWORLD = [f"{r}{c}" for r, cs in WORLD.items() for c in cs]

# pass 1: solidify borders with no neighbor (keep water)
for sid in OVERWORLD:
    rows = SCREENS[sid]["rows"]
    for d, cells in (("N", [(x, 0) for x in range(10)]), ("S", [(x, 7) for x in range(10)]),
                     ("W", [(0, y) for y in range(8)]), ("E", [(9, y) for y in range(8)])):
        if neighbor(sid, d):
            continue
        for (x, y) in cells:
            if rows[y][x] in WALKABLE:
                rows[y][x] = "T"

# pass 2: guarantee >=1 aligned opening on every non-blocked adjacency
PUNCHED = []
for sid in OVERWORLD:
    for d in ("E", "S"):
        n = neighbor(sid, d)
        if not n or ekey(sid, n) in BLOCKED:
            continue
        a, b = SCREENS[sid]["rows"], SCREENS[n]["rows"]
        if d == "E":
            pairs = [(y, a[y][9], b[y][0]) for y in range(8)]
        else:
            pairs = [(x, a[7][x], b[0][x]) for x in range(10)]
        if any(ca in OPENISH and cb in OPENISH for _, ca, cb in pairs):
            continue
        # punch at standard slots
        slots = (3, 4) if d == "E" else (4, 5)
        for s in slots:
            if d == "E":
                a[s][9] = ","
                b[s][0] = ","
            else:
                a[7][s] = ","
                b[0][s] = ","
        PUNCHED.append(f"{sid}|{n}")

if PUNCHED:
    print("punched openings:", PUNCHED)

# ============================== EMIT ========================================
out = {"screens": {}, "blockedEdges": BLOCKED}
for sid, sc in SCREENS.items():
    out["screens"][sid] = {
        "name": sc["name"], "region": sc["region"],
        "rows": ["".join(r) for r in sc["rows"]],
        "ents": sc["ents"], "doors": sc["doors"],
        "dark": sc["dark"], "interior": sc["interior"],
    }

boxes = sum(1 for s in out["screens"].values() for e in s["ents"] if e["t"] == "box")
dogs = sum(1 for s in out["screens"].values() for e in s["ents"] if e["t"] == "dog")
print(f"screens={len(out['screens'])} boxes={boxes} dogs={dogs}")

js = "const MAPS = /*JSON*/" + json.dumps(out, separators=(",", ":")) + ";\n"
(ROOT / "js" / "data-maps.js").write_text(js, encoding="utf-8")
print(f"wrote js/data-maps.js ({len(js)} bytes)")
