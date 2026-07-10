const ITEMS = /*JSON*/{
  "defs": {
    "photo":       { "name": "FAMILY PHOTO", "kind": "key" },
    "bag":         { "name": "GET-HOME BAG", "kind": "key" },
    "crowbar":     { "name": "CROWBAR", "kind": "key", "equip": true, "weapon": 2 },
    "boltcutters": { "name": "BOLTCUTTERS", "kind": "key" },
    "straw":       { "name": "FILTER STRAW", "kind": "key" },
    "flashlight":  { "name": "FLASHLIGHT", "kind": "key", "equip": true, "light": true },
    "map":         { "name": "COUNTY MAP", "kind": "key" },
    "opener":      { "name": "CAN OPENER", "kind": "key" },
    "stick":       { "name": "STICK", "kind": "tool", "equip": true, "weapon": 3 },
    "matches":     { "name": "MATCHES", "kind": "tool" },
    "bedroll":     { "name": "BEDROLL", "kind": "tool" },
    "boards":      { "name": "BOARD KIT", "kind": "tool", "equip": true, "uses": 3 },
    "poncho":      { "name": "PONCHO", "kind": "tool" },
    "bottle":      { "name": "WATER BOTTLE", "kind": "consumable", "water": 40, "equip": true },
    "granola":     { "name": "GRANOLA BAR", "kind": "consumable", "food": 15 },
    "can":         { "name": "CANNED FOOD", "kind": "consumable", "food": 35, "needsOpener": true },
    "jerky":       { "name": "JERKY", "kind": "consumable", "food": 25, "equip": true, "throwable": true },
    "hotmeal":     { "name": "HOT MEAL", "kind": "consumable", "food": 45, "warmth": 10, "heal": 1 },
    "bandage":     { "name": "BANDAGE", "kind": "consumable", "heal": 2, "cures": "bleed", "equip": true },
    "meds":        { "name": "MEDS", "kind": "consumable", "cures": "gut" },
    "batteries":   { "name": "BATTERIES", "kind": "consumable", "charge": 100 },
    "insulin":     { "name": "INSULIN", "kind": "quest" },
    "letter":      { "name": "JUNIE'S LETTER", "kind": "quest" }
  },
  "tables": {
    "desk":      [[20, "granola"], [15, "bottle"], [10, "bandage"], [10, "batteries"], [45, null]],
    "dumpster":  [[15, "can"], [15, "granola"], [8, "bottle"], [62, null]],
    "trunk":     [[20, "bottle"], [12, "jerky"], [10, "bandage"], [10, "matches"], [48, null]],
    "vending":   [[45, "granola"], [35, "bottle"], [20, "granola"]],
    "shelf":     [[25, "can"], [20, "granola"], [12, "batteries"], [6, "opener"], [37, null]],
    "shelf_med": [[30, "meds"], [40, "bandage"], [15, "bottle"], [15, null]],
    "boxcar":    [[30, "can"], [12, "bedroll"], [12, "boards"], [46, null]],
    "fridge":    [[30, "can"], [20, "bottle"], [10, "granola"], [40, null]],
    "cache":     [[100, null]]
  },
  "caches": {
    "boxcar_cache":    ["bedroll", "can", "can"],
    "warehouse_fence": ["boards", "batteries", "can"],
    "third_pew":       ["meds", "granola", "granola"],
    "scarecrow":       ["jerky", "jerky", "matches", "poncho"],
    "culvert":         ["bottle", "bottle", "bandage"],
    "farm_cellar":     ["can", "can", "can"]
  },
  "loadouts": {
    "edc":     { "name": "OFFICE EDC", "desc": "GRANOLA BAR AND A SPARE BOTTLE.", "items": ["granola", "bottle"] },
    "gym":     { "name": "GYM BAG", "desc": "SNEAKERS AND A HOODIE. TRAVEL LIGHT.", "items": [], "speed": 14, "hoodie": true },
    "prepper": { "name": "DESK PREPPER", "desc": "YOU ALWAYS SAID JUST IN CASE.", "items": ["jerky", "jerky", "bandage", "matches", "bottle"] }
  }
};
