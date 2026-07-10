const DIALOG = /*JSON*/{
  "npcs": {
    "dale": [
      {
        "if": { "notFlag": "bag_have" },
        "set": { "flags": { "met_dale": true } },
        "lines": [
          ["BREAKERS ARE FINE.", "THERE'S JUST", "NOTHING COMING IN."],
          ["WHOLE GRID, MAYBE.", "RADIO'S DEAD AIR."],
          ["GO HOME. GRAB THE", "BAG FROM YOUR CAR", "FIRST."]
        ]
      },
      {
        "lines": [
          ["I'LL WATCH THE", "FLOOR. GO ON.", "DAYLIGHT'S SHORT."]
        ]
      }
    ],
    "theo": [
      {
        "if": { "notFlag": "met_theo" },
        "set": { "flags": { "met_theo": true } },
        "lines": [
          ["THAT'S BISCUIT.", "HE'S MINE. THE", "OTHERS AREN'T."],
          ["DON'T RUN. THEY", "ONLY CHASE IF", "YOU RUN."],
          ["MOM ISN'T WORRIED.", "SO I'M NOT."]
        ]
      },
      {
        "if": { "flag": "biscuit_returned" },
        "lines": [
          ["BISCUIT WON'T", "LEAVE MY SIDE.", "THANKS, MISTER."]
        ]
      },
      {
        "if": { "flag": "biscuit_found", "notFlag": "biscuit_returned" },
        "set": { "flags": { "biscuit_returned": true }, "give": "granola", "karma": 1 },
        "lines": [
          ["HE CAME RUNNING.", "RIGHT TO ME."],
          ["MOM SAYS TAKE", "THIS. SHE MEANS", "IT."]
        ]
      },
      {
        "if": { "dayMin": 2, "notFlag": "biscuit_missing" },
        "set": { "flags": { "biscuit_missing": true } },
        "lines": [
          ["BISCUIT'S GONE.", "RAN OFF TOWARD", "THE TRACKS."],
          ["SWITCH YARD, I", "BET. I'M NOT", "ALLOWED PAST 3RD."],
          ["DON'T RUN AT HIM.", "HE ONLY CHASES", "IF YOU RUN."]
        ]
      },
      {
        "if": { "flag": "biscuit_missing" },
        "lines": [
          ["DID YOU SEE HIM?", "BROWN. DUMB EARS.", "PLEASE LOOK."]
        ]
      },
      {
        "lines": [
          ["DON'T RUN.", "THAT'S THE WHOLE", "TRICK."]
        ]
      }
    ],
    "biscuit": [
      {
        "if": { "flag": "biscuit_found" },
        "lines": [
          ["GONE HOME."]
        ]
      },
      {
        "set": { "flags": { "biscuit_found": true } },
        "lines": [
          ["THE DOG SHIVERS", "BEHIND A BOXCAR.", "DUMB EARS. BROWN."],
          ["IT KNOWS YOU", "SOMEHOW. IT BOLTS", "WEST. HOME."]
        ]
      }
    ],
    "junie": [
      {
        "if": { "flag": "letter_delivered" },
        "lines": [
          ["YOU TOLD DEE?", "THEN I CAN LIMP", "SLOW. THANK YOU."]
        ]
      },
      {
        "if": { "item": "letter" },
        "lines": [
          ["GO ON. CEDAR RUN", "GATE. ASK FOR", "DEE. TELL HER."]
        ]
      },
      {
        "set": { "give": "letter" },
        "lines": [
          ["TWISTED MY ANKLE", "DAY ONE. I CAN'T", "WALK THE MILES."],
          ["MY SISTER WORKS", "THE CEDAR RUN", "GATE. NAME'S DEE."],
          ["TELL HER JUNIE'S", "ALIVE. ROOM TWO.", "THAT'S ALL I ASK."]
        ]
      }
    ],
    "wes": [
      {
        "if": { "flag": "wes_told" },
        "lines": [
          ["AMES KNOWS?", "GOOD. NOW LET AN", "OLD MAN SIT."]
        ]
      },
      {
        "if": { "flag": "wes_found" },
        "lines": [
          ["I SAID WHAT I", "SAID. GO EAST,", "YOUNG PERSON."]
        ]
      },
      {
        "set": { "flags": { "wes_found": true } },
        "lines": [
          ["EASY. I LIVE HERE", "NOW. THE QUIET", "SUITS ME FINE."],
          ["YOU KNOW AMES?", "TELL HIM WES IS", "FINE. NOT COMING."],
          ["NOT TILL THE", "LIGHTS ARE BACK.", "MAYBE NOT THEN."]
        ]
      }
    ],
    "marta": [
      {
        "if": { "flag": "insulin_delivered" },
        "lines": [
          ["YOU GOT IT TO", "RUTH. I OWE YOU.", "EVERYONE DOES."]
        ]
      },
      {
        "if": { "notFlag": "straw_given" },
        "set": { "flags": { "met_marta": true, "straw_given": true }, "give": "straw" },
        "lines": [
          ["I'M NOT LEAVING", "MY SHELVES.", "PEOPLE NEED THEM."],
          ["TAKE THE STRAW.", "DON'T DRINK CREEK", "WATER WITHOUT IT."],
          ["GOING EAST? TAKE", "THE INSULIN TO", "HOLLER FARM."]
        ]
      },
      {
        "if": { "notFlag": "water_asked" },
        "set": { "flags": { "water_asked": true } },
        "lines": [
          ["THE PUMP'S IN TOWN", "SQUARE. I CAN'T", "LEAVE THE SHELVES."],
          ["BRING A FULL", "BOTTLE IF YOU", "PASS. I TRADE."]
        ]
      },
      {
        "if": { "flag": "insulin_have" },
        "lines": [
          ["RUTH HOLLER.", "BIG FARMHOUSE", "NORTH OF THE ROAD."],
          ["AND MIND THE", "BRIDGE. THEY", "CHARGE NOW."]
        ]
      },
      {
        "lines": [
          ["STILL STANDING.", "BOTH OF US."]
        ]
      }
    ],
    "ames": [
      {
        "if": { "notFlag": "met_ames" },
        "set": { "flags": { "met_ames": true } },
        "lines": [
          ["SOUP AT SIX.", "EVERY EVENING.", "NO QUESTIONS."],
          ["YOU CAN SLEEP IN", "A PEW. NOBODY", "TROUBLES A CHURCH."]
        ]
      },
      {
        "if": { "flag": "wes_found", "notFlag": "wes_told" },
        "set": { "flags": { "wes_told": true }, "give": "hotmeal", "karma": 1 },
        "lines": [
          ["WES. ALIVE. IN", "THAT DARK HOLE.", "STUBBORN MULE."],
          ["THANK YOU FOR", "CARRYING WORD.", "EAT. IT'S EARNED."]
        ]
      },
      {
        "if": { "flag": "pot_filled", "notFlag": "pot_thanked" },
        "set": { "flags": { "pot_thanked": true } },
        "lines": [
          ["THE POT'S FULL", "BECAUSE OF YOU.", "BOWL'S ALWAYS ON."]
        ]
      },
      {
        "if": { "dayMin": 2, "notFlag": "wes_asked" },
        "set": { "flags": { "wes_asked": true } },
        "lines": [
          ["ONE OF OURS IS", "MISSING. WES.", "SLEEPS ROUGH."],
          ["SOMEONE SAW HIM", "NEAR THE ROUTE 9", "UNDERPASS. WEST."],
          ["IF YOUR ROAD", "PASSES, LOOK IN", "ON HIM. PLEASE."]
        ]
      },
      {
        "if": { "flag": "soup_today" },
        "lines": [
          ["EAT SLOW.", "THERE'S ALWAYS", "TOMORROW'S POT."],
          ["IF YOU'VE CANS OR", "JERKY TO SPARE,", "WE TRADE FAIR."]
        ]
      },
      {
        "if": { "notFlag": "crossed_river" },
        "lines": [
          ["REYES HOLDS THE", "BRIDGE. TWO ITEMS", "OR THE HARD WAY."],
          ["THE TRESTLE AND", "THE UNDERPASS", "TAKE NO TOLL."],
          ["AND THEY'RE", "CHECKING FACES AT", "CEDAR RUN."]
        ]
      },
      {
        "lines": [
          ["THEY'RE CHECKING", "FACES AT CEDAR", "RUN."],
          ["HOPE SOMEONE'S", "EXPECTING YOU."]
        ]
      }
    ],
    "reyes": [
      {
        "if": { "flag": "toll_paid" },
        "lines": [
          ["YOU'RE CHALKED.", "CROSS."]
        ]
      },
      {
        "if": { "flag": "toll_fought" },
        "lines": [
          ["YOU MADE YOUR", "POINT. GO."]
        ]
      },
      {
        "if": { "flag": "toll_sneaked" },
        "lines": [
          ["I DON'T REMEMBER", "CHALKING YOU.", "GO ON, THEN."]
        ]
      },
      {
        "set": { "flags": { "met_reyes": true } },
        "lines": [
          ["TWO ITEMS."],
          ["RIVER'S THE", "ONLY THING HERE", "THAT'S FREE."],
          ["PAY, OR FIND", "ANOTHER WAY", "ACROSS."]
        ]
      }
    ],
    "guard": [
      {
        "if": { "flag": "toll_paid" },
        "lines": [
          ["REYES SAYS GO,", "YOU GO."]
        ]
      },
      {
        "if": { "flag": "toll_fought" },
        "lines": [
          ["DON'T LOOK AT ME.", "WALK."]
        ]
      },
      {
        "lines": [
          ["TALK TO REYES.", "I JUST WATCH."],
          ["COLD WORK,", "NIGHTS."]
        ]
      }
    ],
    "dee": [
      {
        "if": { "item": "letter", "notFlag": "letter_delivered" },
        "set": { "flags": { "letter_delivered": true }, "takeKey": "letter", "intel": "D7", "karma": 1 },
        "lines": [
          ["THAT'S JUNIE'S", "HAND. SHE'S AT", "THE DRIFTWOOD?"],
          ["WE'LL SEND A CART", "BEFORE FROST.", "YOU DID RIGHT."],
          ["THERE'S WATER AT", "THE DRY MEADOW", "CULVERT. TAKE IT."]
        ]
      },
      {
        "if": { "flag": "photo_shown" },
        "lines": [
          ["MAPLE LANE'S PAST", "THE OAKS. GO ON.", "THEY'RE WAITING."]
        ]
      },
      {
        "if": { "item": "photo" },
        "set": { "flags": { "photo_shown": true, "met_dee": true } },
        "lines": [
          ["NOBODY COMES", "THROUGH I CAN'T", "PLACE."],
          ["WAIT. THAT PHOTO.", "LET ME SEE IT."],
          ["THAT'S SAM'S", "PORCH. GO ON.", "THEY'RE WAITING."]
        ]
      },
      {
        "lines": [
          ["NOBODY COMES", "THROUGH I CAN'T", "PLACE."],
          ["NOTHING PERSONAL.", "TURN BACK."]
        ]
      }
    ],
    "ruth": [
      {
        "if": { "flag": "insulin_delivered" },
        "lines": [
          ["BED'S MADE UP.", "STEW'S ON THE", "STOVE. SIT."],
          ["AND CHECK THE", "WOODPILE BY THE", "SCARECROW. OURS."]
        ]
      },
      {
        "if": { "flag": "insulin_have" },
        "set": { "flags": { "insulin_delivered": true, "met_ruth": true }, "karma": 1 },
        "lines": [
          ["THAT'S MARTA'S", "COLD BOX. YOU", "CARRIED IT HERE?"],
          ["ACROSS THE RIVER.", "FOR STRANGERS."],
          ["EARL. OPEN THE", "DOOR. PUT THE", "STEW ON."]
        ]
      },
      {
        "lines": [
          ["DOOR STAYS", "CRACKED. WE", "DON'T KNOW YOU."],
          ["WE'RE CAREFUL.", "NOT CRUEL."]
        ]
      }
    ],
    "earl": [
      {
        "if": { "flag": "insulin_delivered" },
        "lines": [
          ["RUTH'S COLOR IS", "BACK. THAT WAS", "YOUR DOING."],
          ["EAT. SLEEP. GO", "AT FIRST LIGHT", "IF YOU WANT."]
        ]
      },
      {
        "lines": [
          ["RUTH DOES THE", "TALKING. I DO", "THE WATCHING."]
        ]
      }
    ],
    "sam": [
      {
        "if": { "dayMax": 4 },
        "lines": [
          ["YOU'RE HERE.", "YOU'RE ACTUALLY", "HERE."],
          ["WE HAVEN'T EVEN", "EATEN THE FRIDGE", "FOOD YET."],
          ["DON'T TELL ME.", "TELL ME TOMORROW.", "JUST COME IN."]
        ]
      },
      {
        "if": { "dayMax": 6, "karmaMin": 4 },
        "lines": [
          ["THE ROAD KEPT", "TELLING US ABOUT", "YOU. ALL OF IT."],
          ["COME IN. COME IN.", "THE KID SAVED", "YOUR CHAIR."]
        ]
      },
      {
        "if": { "dayMax": 6, "karmaMin": 2 },
        "lines": [
          ["I TOLD THE KID", "YOU'D WALK IN.", "AND HERE YOU ARE."],
          ["SOMEBODY ON THE", "ROAD SAID A", "STRANGER FED HIM."],
          ["THAT WAS YOU.", "OF COURSE IT WAS.", "COME IN."]
        ]
      },
      {
        "if": { "dayMax": 6 },
        "lines": [
          ["I TOLD THE KID", "YOU'D WALK IN.", "AND HERE YOU ARE."],
          ["WE KEPT A PLATE", "OUT. EVERY NIGHT."]
        ]
      },
      {
        "if": { "dayMax": 8 },
        "lines": [
          ["I'D STOPPED", "SAYING TOMORROW", "TO THE KID."],
          ["COME IN.", "JUST COME IN."]
        ]
      },
      {
        "lines": [
          ["YOU'RE HERE.", "THAT'S WHAT", "MATTERS."]
        ]
      }
    ],
    "kid": [
      {
        "if": { "karmaMin": 2 },
        "lines": [
          ["DID YOU HELP", "PEOPLE OUT THERE?", "YOU DID, RIGHT?"],
          ["I KNEW IT."]
        ]
      },
      {
        "lines": [
          ["I KEPT YOUR", "CHAIR. NOBODY", "SAT IN IT."]
        ]
      }
    ],
    "beggar_a": [
      {
        "if": { "flag": "gave_food_today" },
        "lines": [
          ["YOU'RE ALRIGHT.", "LISTEN. CULVERT", "PAST THE BRIDGE,"],
          ["DRY MEADOW SIDE.", "I STASHED BOTTLES", "THERE. TAKE THEM."]
        ]
      },
      {
        "if": { "flag": "fed_beggar" },
        "lines": [
          ["STILL OUT HERE.", "STILL GRATEFUL."]
        ]
      },
      {
        "lines": [
          ["SPARE ANYTHING?", "I HAVEN'T EATEN", "SINCE TUESDAY."]
        ]
      }
    ],
    "beggar_b": [
      {
        "if": { "flag": "gave_food_today" },
        "lines": [
          ["BLESS YOU.", "ONE THING, FOR", "THE ROAD."],
          ["A MAN SLEEPS IN", "THE UNDERPASS.", "DON'T WAKE HIM."]
        ]
      },
      {
        "if": { "flag": "fed_beggar" },
        "lines": [
          ["YOU'RE THE ONE", "WHO SHARES.", "DAYS GET LONG."]
        ]
      },
      {
        "lines": [
          ["ANYTHING HELPS.", "A BAR. A CAN.", "ANYTHING."]
        ]
      }
    ],
    "walker_a": [
      {
        "lines": [
          ["PROBABLY A", "SUBSTATION. BE ON", "BY DINNER."]
        ]
      }
    ],
    "walker_b": [
      {
        "if": { "dayMin": 2 },
        "lines": [
          ["STILL OUT. THAT'S", "A FIRST."]
        ]
      },
      {
        "lines": [
          ["PHONE'S DEAD TOO.", "FIGURES."]
        ]
      }
    ],
    "walker_c": [
      {
        "if": { "dayMin": 2 },
        "lines": [
          ["MART SHELVES WERE", "BARE BY NOON.", "PEOPLE, HUH."]
        ]
      },
      {
        "lines": [
          ["NO TRAFFIC LIGHTS,", "NO TRAFFIC.", "KIND OF NICE."]
        ]
      }
    ],
    "prowler": [
      {
        "lines": [
          ["EASY. DIDN'T KNOW", "ANYONE WAS HERE.", "I'M GOING."]
        ]
      }
    ]
  },
  "signs": {
    "sign_plaza": [
      ["MERIDIAN OFFICE", "PLAZA. TENANT", "PARKING IN REAR."]
    ],
    "sign_overpass": [
      ["ROUTE 9 EAST", "MILLBROOK 5", "CEDAR RUN 29"]
    ],
    "sign_pharmacy": [
      ["MILLBROOK DRUGS"],
      ["MARKER ON CARD:", "NO STOCK LEFT.", "DON'T BOTHER."]
    ],
    "sign_church": [
      ["ST. ANSELM'S", "SOUP AT 6.", "ALL WELCOME."],
      ["PINNED NOTE:", "WES - COME HOME.", "ASK FOR AMES."]
    ],
    "sign_motel": [
      ["DRIFTWOOD MOTEL", "VACANCY"],
      ["NO POWER.", "NO REFUNDS."]
    ],
    "sign_gas": [
      ["GAS N GO"],
      ["CARDBOARD SIGN:", "PUMPS NEED POWER.", "SO DO WE. CLOSED."]
    ],
    "sign_bridge_w": [
      ["HARLAN RIVER", "BRIDGE. LOAD", "LIMIT 10 TONS."],
      ["CHALK BELOW:", "TOLL. TWO ITEMS."]
    ],
    "sign_trestle": [
      ["RAIL PROPERTY.", "NO TRESPASSING."],
      ["PLANKS OUT MID-", "SPAN. LONG DROP."]
    ],
    "sign_underpass": [
      ["ROUTE 9", "UNDERPASS."],
      ["SPRAY PAINT:", "DARK ALL DAY.", "BRING A LIGHT."]
    ],
    "sign_checkpoint": [
      ["CEDAR RUN.", "RESIDENTS AND", "FAMILY ONLY."],
      ["BE READY TO SHOW", "YOU BELONG HERE."]
    ],
    "sign_farm": [
      ["HOLLER FARM.", "FRESH EGGS."],
      ["TAPED OVER:", "NO EGGS.", "NO VISITORS."]
    ],
    "note_pharmacy": [
      ["MARTA'S LIST:", "MOVED THE SPARE", "MEDS TO ST. A'S."],
      ["THIRD PEW FROM", "THE FRONT."]
    ],
    "note_office": [
      ["BUILDING MEMO:", "BRIEF OUTAGES", "POSSIBLE TUESDAY."]
    ]
  },
  "cards": {
    "card_open_1": ["TUESDAY.", "4:17 PM."],
    "card_open_2": ["NO ALARMS.", "JUST QUIET.", "HOME IS 38 MILES."],
    "card_day": ["DAY %"],
    "card_frost": ["FROST ON THE", "GRASS."],
    "card_rain": ["RAIN. THE STEADY", "KIND."],
    "card_death_cold": ["YOU STOPPED BEING", "COLD AROUND 3 AM."],
    "card_death_dogs": ["THEY ONLY CHASE", "IF YOU RUN.", "YOU RAN."],
    "card_death_human": ["HE WANTED THE BAG.", "NOT THIS."],
    "card_death_hunger": ["YOU WERE SAVING", "THE LAST CAN.", "FOR WHAT."],
    "card_death_thirst": ["THE RIVER WAS", "RIGHT THERE."],
    "card_collapse": ["YOU SAT DOWN FOR", "A MINUTE.", "THE MINUTE WON."]
  },
  "endings": {
    "before_wave": {
      "title": "BEFORE THE WAVE",
      "lines": [
        ["YOUR STREET IS", "QUIET. YOUR HOUSE", "ISN'T."],
        ["SAM'S FILLING THE", "TUB. THE KID", "SPOTS YOU FIRST."],
        ["YOU BEAT THE", "PANIC HOME. MOST", "PEOPLE WON'T."],
        ["THERE'S WORK TO", "DO. YOU DO IT", "TOGETHER."]
      ]
    },
    "homecoming": {
      "title": "HOMECOMING",
      "lines": [
        ["THE GATE SQUEAKS", "LIKE IT ALWAYS", "HAS."],
        ["SAM OPENS THE", "DOOR BEFORE YOU", "KNOCK."],
        ["NOBODY SAYS MUCH.", "NOBODY NEEDS TO."],
        ["YOU'RE HOME.", "NOW THE REAL", "WORK STARTS."]
      ]
    },
    "long_way": {
      "title": "THE LONG WAY",
      "lines": [
        ["THE DOOR IS", "BARRED. YOU KNOCK.", "THEN WAIT."],
        ["SAM LOOKS OLDER.", "SO DO YOU."],
        ["THE KID HANGS", "BACK A SECOND", "TOO LONG."],
        ["YOU'RE HOME.", "THE WORD STILL", "FITS. BARELY."]
      ]
    },
    "empty_house": {
      "title": "EMPTY HOUSE",
      "lines": [
        ["THE DOOR IS", "UNLOCKED. THE", "STOVE IS COLD."],
        ["A NOTE IN SAM'S", "HAND. STEADY", "LETTERS."],
        ["WAITED AS LONG AS", "WE COULD. SAFE", "WITH THE CHURCH."],
        ["THE KID KEPT YOUR", "CHAIR EMPTY.", "EIGHT DAYS."],
        ["THEIR 30 DAYS", "STARTED WITHOUT", "YOU."]
      ]
    },
    "promo": {
      "title": "GRID DOWN",
      "lines": [
        ["THE GRID IS STILL", "DOWN. THE FAMILY", "COUNTS EVERY CAN."],
        ["THEIR 30 DAYS", "START NOW."],
        ["PLAY GRID DOWN."]
      ]
    }
  },
  "toasts": {
    "photo": "FAMILY PHOTO. DON'T LOSE THIS.",
    "bag": "GET-HOME BAG. PACK GROWS 3 TO 10.",
    "crowbar": "CROWBAR + PRY BOARDED DOORS.",
    "boltcutters": "BOLTCUTTERS + CUT CHAIN GATES.",
    "straw": "FILTER STRAW + CREEKS ARE SAFE NOW.",
    "letter": "LETTER + JUNIE'S SISTER. CEDAR RUN.",
    "flashlight": "FLASHLIGHT + B TOGGLES. EATS CHARGE.",
    "batteries": "BATTERIES + FLASHLIGHT BACK TO FULL.",
    "map": "COUNTY MAP + MAP PAGE IN START MENU.",
    "opener": "CAN OPENER + CANS WITHOUT THE SPILL.",
    "stick": "STICK + SWING ON B. 3 ROUTS A DOG.",
    "matches": "MATCHES + LIGHT FIRE PITS.",
    "bedroll": "BEDROLL + SLEEP ON ANY INDOOR FLOOR.",
    "boards": "BOARD KIT + BAR DOORS AT CAMP. X3.",
    "poncho": "PONCHO + RAIN WON'T CHILL YOU NOW.",
    "noise": "THE SOUND CARRIES.",
    "gate_cut": "THE CHAIN GIVES WAY.",
    "door_pried": "THE BOARDS COME LOOSE.",
    "glass_smashed": "GLASS EVERYWHERE. THE SOUND CARRIES.",
    "cache_found": "HIDDEN WELL. NOT WELL ENOUGH."
  }
};
