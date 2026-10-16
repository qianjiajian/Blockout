import type { LevelSpec } from "./types";

export const FORMAL_DAILY_300_PROFILE = "incremental-formal-300-v1" as const;
/** Canonical SHA-256 of the individually admitted entries. */
export const FORMAL_DAILY_300_REVISION = "9c127177c7f6de53efad21bbfa96650f8feb13afbad8d47710c8c3719fafdb13";

export interface FormalDaily300Entry {
  formalId: string;
  stageKey: string;
  difficulty: 1 | 2 | 3;
  slot: number;
  sourceLevelId: number;
  layoutSha256: string;
  /** Stable first-admission revision; later appends never change this binding. */
  admittedInRevision: string;
  dailyMechanisms: readonly string[];
  level: LevelSpec;
  proof: {
    levelSha256: string;
    sourceLevelId: number;
    lowerBound: number;
    upperBound: number;
    routeReplayComplete: true;
    reportSha256: string;
    routeSha256: string;
    toolchainSha256: string;
  };
  acceptance: {
    levelSha256: string;
    designReportSha256: string;
    runtimeReportSha256: string;
    dualScreenPointer: true;
    naturalTime: true;
    fullInventory: true;
    settlement: true;
  };
}

// Each object retains its original mathematical and real dual-screen evidence.
// The legacy 450 catalogue stays separate and never counts toward the new 300.
export const FORMAL_DAILY_300_ENTRIES: readonly FormalDaily300Entry[] = Object.freeze([
  {
    "formalId": "daily-mechanisms-bomb-120-d3-03",
    "stageKey": "mechanisms-bomb-120",
    "difficulty": 3,
    "slot": 3,
    "sourceLevelId": 118,
    "layoutSha256": "a59513a65aadff290b76ffe2c9c34710eb133f10ba1f474409bac21d93ae2b07",
    "admittedInRevision": "3d740fe4ec50f8ad71f71b6281cf379cb5ee4c7ff586493514b41dfd456d9a09",
    "dailyMechanisms": [
      "color-exit",
      "frozen-exit",
      "bomb"
    ],
    "level": {
      "id": 118,
      "name": "每日挑战整盘冰门新布局 wholeboard-ice-d3-s118-twentyfour-r07",
      "difficulty": "super",
      "reward": 0,
      "width": 7,
      "height": 8,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          5,
          0
        ],
        [
          6,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          5,
          1
        ],
        [
          6,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          5,
          2
        ],
        [
          6,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          5,
          3
        ],
        [
          6,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          5,
          4
        ],
        [
          6,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          5,
          5
        ],
        [
          6,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ],
        [
          5,
          6
        ],
        [
          6,
          6
        ],
        [
          0,
          7
        ],
        [
          1,
          7
        ],
        [
          2,
          7
        ],
        [
          3,
          7
        ],
        [
          4,
          7
        ],
        [
          5,
          7
        ],
        [
          6,
          7
        ]
      ],
      "timeSeconds": 120,
      "parMoves": 34,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-118-3247592696-b0",
          "x": 0,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-118-3247592696-b1",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-118-3247592696-b2",
          "x": 6,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-118-3247592696-b3",
          "x": 6,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-118-3247592696-b4",
          "x": 0,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "pink",
          "timedBombSeconds": 32
        },
        {
          "id": "v3-118-3247592696-b5",
          "x": 5,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-118-3247592696-b6",
          "x": 4,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "yellow",
          "timedBombSeconds": 33
        },
        {
          "id": "v3-118-3247592696-b7",
          "x": 6,
          "y": 2,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-118-3247592696-b8",
          "x": 3,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-118-3247592696-b9",
          "x": 1,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-118-3247592696-b10",
          "x": 0,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "cyan",
          "timedBombSeconds": 40
        },
        {
          "id": "v3-118-3247592696-b11",
          "x": 3,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-118-3247592696-b12",
          "x": 1,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-118-3247592696-b13",
          "x": 4,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-118-3247592696-b14",
          "x": 3,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-118-3247592696-b15",
          "x": 5,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-118-3247592696-b16",
          "x": 4,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-118-3247592696-b17",
          "x": 4,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-118-3247592696-b18",
          "x": 1,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              2,
              1
            ]
          ],
          "color": "green",
          "timedBombSeconds": 50
        },
        {
          "id": "v3-118-3247592696-b19",
          "x": 1,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "red"
        }
      ],
      "gates": [
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "left",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "left",
          "offset": 6,
          "size": 2
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "top",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "bottom",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "top",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "left",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "left",
          "offset": 5,
          "size": 1,
          "frozen": 7
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "top",
          "offset": 4,
          "size": 2,
          "frozen": 10
        }
      ]
    },
    "proof": {
      "levelSha256": "a59513a65aadff290b76ffe2c9c34710eb133f10ba1f474409bac21d93ae2b07",
      "sourceLevelId": 118,
      "lowerBound": 31,
      "upperBound": 35,
      "routeReplayComplete": true,
      "reportSha256": "4237b2e6815f84b22853227493ed6129d066ab771aeb01c797ac81e3e5b516c4",
      "routeSha256": "47df7edba28a6408df777fad2a1084de4e0439998e1e7232cf83156bd39fde14",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "a59513a65aadff290b76ffe2c9c34710eb133f10ba1f474409bac21d93ae2b07",
      "designReportSha256": "5ddd00e7f6ba9e10446d1355286484bd7eb17d74f9f75c503116e996ee79b346",
      "runtimeReportSha256": "444154036e0cf5f1f2ba680cf56e4a426e6ceeebea29e6812381096271337c06",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-mechanisms-axis-block-50-d1-06",
    "stageKey": "mechanisms-axis-block-50",
    "difficulty": 1,
    "slot": 6,
    "sourceLevelId": 7,
    "layoutSha256": "78640c741424909a28ee5d8f973a4029d820d4345ab58da0bb6960ded22d5a27",
    "admittedInRevision": "afb8bb6786f01782ebe204800d3883fc3c7abe00a61b6ad0d6ffeca87807dfb2",
    "dailyMechanisms": [
      "color-exit",
      "axis-block",
      "irregular-block"
    ],
    "level": {
      "id": 7,
      "name": "荣耀联赛全局重铺候选 7-10640947",
      "difficulty": "super",
      "reward": 0,
      "width": 5,
      "height": 8,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ],
        [
          0,
          7
        ],
        [
          1,
          7
        ],
        [
          2,
          7
        ],
        [
          3,
          7
        ],
        [
          4,
          7
        ]
      ],
      "timeSeconds": 120,
      "parMoves": 24,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-7-10640947-b0",
          "x": 4,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-7-10640947-b1",
          "x": 2,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-7-10640947-b2",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-7-10640947-b3",
          "x": 1,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-7-10640947-b4",
          "x": 3,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "orange",
          "movementAxis": "horizontal"
        },
        {
          "id": "v3-7-10640947-b5",
          "x": 4,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "red",
          "movementAxis": "vertical"
        },
        {
          "id": "v3-7-10640947-b6",
          "x": 3,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-7-10640947-b7",
          "x": 0,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-7-10640947-b8",
          "x": 1,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-7-10640947-b9",
          "x": 1,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-7-10640947-b10",
          "x": 2,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-7-10640947-b11",
          "x": 3,
          "y": 5,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-7-10640947-b12",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-7-10640947-b13",
          "x": 3,
          "y": 4,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-7-10640947-b14",
          "x": 0,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              2,
              1
            ]
          ],
          "color": "orange"
        }
      ],
      "gates": [
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "right",
          "offset": 3,
          "size": 1
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "top",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "top",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "left",
          "offset": 6,
          "size": 2
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "left",
          "offset": 2,
          "size": 2
        }
      ]
    },
    "proof": {
      "levelSha256": "78640c741424909a28ee5d8f973a4029d820d4345ab58da0bb6960ded22d5a27",
      "sourceLevelId": 7,
      "lowerBound": 16,
      "upperBound": 16,
      "routeReplayComplete": true,
      "reportSha256": "bdeee266479abab28f615774d416ade8ddca02d88a92955d04c523b66df0e9c0",
      "routeSha256": "d902fd7d039e9533513656bce5386629f886b2fadb6760c4611c377a24452a9b",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "78640c741424909a28ee5d8f973a4029d820d4345ab58da0bb6960ded22d5a27",
      "designReportSha256": "8049919a0d1837014a398b1830ddf61fa1b6e9690113bde7db3ec9d36295b2ff",
      "runtimeReportSha256": "e4d4c253bee132adbceb438c0e3fffb9ebcaa99f01391307f85ebca8d1f561ad",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-mechanisms-key-lock-59-d1-07",
    "stageKey": "mechanisms-key-lock-59",
    "difficulty": 1,
    "slot": 7,
    "sourceLevelId": 5,
    "layoutSha256": "16c640ebd47e3b5c6035d51694799c7cdbf7a986b7762106b5c06a6d0be2fbc9",
    "admittedInRevision": "24a6c7940322e2f8159982ff4fa398ef7b46926c92cdefaacef4d8aa3e2093c9",
    "dailyMechanisms": [
      "color-exit",
      "key-lock",
      "irregular-block"
    ],
    "level": {
      "id": 5,
      "name": "每日挑战 · 钥匙与锁 · 困难 7",
      "difficulty": "hard",
      "reward": 0,
      "width": 5,
      "height": 7,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ]
      ],
      "blocked": [],
      "timeSeconds": 180,
      "parMoves": 21,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-5-7160120-b0",
          "x": 3,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "cyan",
          "keyId": "constraint-daily-mechanisms-key-lock-59-d1-07-keys"
        },
        {
          "id": "v3-5-7160120-b1",
          "x": 2,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "blue",
          "lockedBy": "constraint-daily-mechanisms-key-lock-59-d1-07-keys",
          "lockCount": 2
        },
        {
          "id": "v3-5-7160120-b2",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "green",
          "keyId": "constraint-daily-mechanisms-key-lock-59-d1-07-keys"
        },
        {
          "id": "v3-5-7160120-b3",
          "x": 0,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-5-7160120-b4",
          "x": 3,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-5-7160120-b5",
          "x": 0,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              1,
              1
            ],
            [
              2,
              1
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-5-7160120-b6",
          "x": 0,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "blue",
          "keyId": "constraint-daily-mechanisms-key-lock-59-d1-07-keys"
        },
        {
          "id": "v3-5-7160120-b7",
          "x": 2,
          "y": 5,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-5-7160120-b8",
          "x": 3,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              0,
              2
            ],
            [
              1,
              2
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-5-7160120-b9",
          "x": 1,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-5-7160120-b10",
          "x": 2,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-5-7160120-b11",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "cyan",
          "lockedBy": "constraint-daily-mechanisms-key-lock-59-d1-07-keys",
          "lockCount": 3
        }
      ],
      "gates": [
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "bottom",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "right",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "left",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "right",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "bottom",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "top",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "top",
          "offset": 2,
          "size": 3
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "left",
          "offset": 0,
          "size": 2
        }
      ]
    },
    "proof": {
      "levelSha256": "16c640ebd47e3b5c6035d51694799c7cdbf7a986b7762106b5c06a6d0be2fbc9",
      "sourceLevelId": 5,
      "lowerBound": 16,
      "upperBound": 16,
      "routeReplayComplete": true,
      "reportSha256": "b0662f55f7c12438d52bc3fdd762c707c17cae5372877c7243c204ec8e8ef088",
      "routeSha256": "7735f21ab4adcf7908c90feb0f5050ed512236ecb8557f5e6619df3972658b3a",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "16c640ebd47e3b5c6035d51694799c7cdbf7a986b7762106b5c06a6d0be2fbc9",
      "designReportSha256": "8049919a0d1837014a398b1830ddf61fa1b6e9690113bde7db3ec9d36295b2ff",
      "runtimeReportSha256": "2dff1d8a7da11902f9e510705ddadb6067fdd218dd3229258ac6bebcd2439269",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-mechanisms-key-lock-59-d1-08",
    "stageKey": "mechanisms-key-lock-59",
    "difficulty": 1,
    "slot": 8,
    "sourceLevelId": 196,
    "layoutSha256": "a8d5ecd1a7e597c572c39193d5266f2c2ab068e578b1185917aad6996ccab45e",
    "admittedInRevision": "4a4b552f6f85dcbdd7bac72ca3dc22b6f1b77f326bcc4a3aac9bfc18953fcac1",
    "dailyMechanisms": [
      "color-exit",
      "key-lock",
      "irregular-block"
    ],
    "level": {
      "id": 196,
      "name": "每日挑战 · 钥匙与锁 · 困难 8",
      "difficulty": "hard",
      "reward": 0,
      "width": 6,
      "height": 8,
      "timeSeconds": 75,
      "parMoves": 32,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-196-11691752-b0",
          "x": 5,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-196-11691752-b1",
          "x": 5,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "red",
          "keyId": "constraint-daily-mechanisms-key-lock-59-d1-08-keys"
        },
        {
          "id": "v3-196-11691752-b2",
          "x": 5,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-196-11691752-b3",
          "x": 2,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              3,
              0
            ]
          ],
          "color": "pink",
          "lockedBy": "constraint-daily-mechanisms-key-lock-59-d1-08-keys",
          "lockCount": 2
        },
        {
          "id": "v3-196-11691752-b4",
          "x": 1,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              3,
              0
            ]
          ],
          "color": "blue",
          "keyId": "constraint-daily-mechanisms-key-lock-59-d1-08-keys"
        },
        {
          "id": "v3-196-11691752-b5",
          "x": 0,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-196-11691752-b6",
          "x": 1,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-196-11691752-b7",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-196-11691752-b8",
          "x": 1,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              2,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-196-11691752-b9",
          "x": 4,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-196-11691752-b10",
          "x": 1,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              3,
              0
            ]
          ],
          "color": "pink",
          "lockedBy": "constraint-daily-mechanisms-key-lock-59-d1-08-keys",
          "lockCount": 3
        },
        {
          "id": "v3-196-11691752-b11",
          "x": 2,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "blue",
          "keyId": "constraint-daily-mechanisms-key-lock-59-d1-08-keys"
        },
        {
          "id": "v3-196-11691752-b12",
          "x": 0,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-196-11691752-b13",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              2,
              1
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-196-11691752-b14",
          "x": 3,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "purple"
        }
      ],
      "gates": [
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "top",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "top",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "left",
          "offset": 4,
          "size": 2
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "bottom",
          "offset": 4,
          "size": 2
        },
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "right",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "left",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "bottom",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "bottom",
          "offset": 3,
          "size": 1
        }
      ]
    },
    "proof": {
      "levelSha256": "a8d5ecd1a7e597c572c39193d5266f2c2ab068e578b1185917aad6996ccab45e",
      "sourceLevelId": 196,
      "lowerBound": 16,
      "upperBound": 16,
      "routeReplayComplete": true,
      "reportSha256": "5e0928e91c094973f14f1450d741e195e0bdf68f321f1f55b117a04fd8de83d8",
      "routeSha256": "9fe10db2181fe95e54ed3b245463a26d4b550a00f0df8f766b1a07aaa106afd1",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "a8d5ecd1a7e597c572c39193d5266f2c2ab068e578b1185917aad6996ccab45e",
      "designReportSha256": "8049919a0d1837014a398b1830ddf61fa1b6e9690113bde7db3ec9d36295b2ff",
      "runtimeReportSha256": "ba95537767e926f353ebb7df2b32ef3fc8830d8025c5f2f3e4f381e064c4d891",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-mechanisms-flip-door-150-d1-07",
    "stageKey": "mechanisms-flip-door-150",
    "difficulty": 1,
    "slot": 7,
    "sourceLevelId": 3,
    "layoutSha256": "54592a8644832ce86f13afa0562933e3f1b5b7a6bc750ddb0536ae4e1e11c332",
    "admittedInRevision": "0f5b6eef2fbaa87ad8d9d6337e1e7b34ae97c5e3f3485df44733ee50989e5cd0",
    "dailyMechanisms": [
      "color-exit",
      "flip-door"
    ],
    "level": {
      "id": 3,
      "name": "每日挑战 · 翻转门 · 困难 7",
      "difficulty": "hard",
      "reward": 0,
      "width": 6,
      "height": 6,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          5,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          5,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          5,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          5,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          5,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          5,
          5
        ]
      ],
      "blocked": [],
      "timeSeconds": 180,
      "parMoves": 14,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-3-6718425-b0",
          "x": 0,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-3-6718425-b1",
          "x": 2,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-3-6718425-b2",
          "x": 0,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-3-6718425-b3",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-3-6718425-b4",
          "x": 3,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-3-6718425-b5",
          "x": 5,
          "y": 5,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-3-6718425-b6",
          "x": 3,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              2,
              1
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-3-6718425-b7",
          "x": 2,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-3-6718425-b8",
          "x": 2,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-3-6718425-b9",
          "x": 4,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              0,
              2
            ],
            [
              1,
              2
            ]
          ],
          "color": "purple"
        }
      ],
      "gates": [
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "left",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "left",
          "offset": 4,
          "size": 2
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "right",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "right",
          "offset": 0,
          "size": 1
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "bottom",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "top",
          "offset": 4,
          "size": 2
        }
      ],
      "flipDoors": [
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "top",
          "offset": 2,
          "size": 2,
          "initiallyOpen": true
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "bottom",
          "offset": 1,
          "size": 2,
          "initiallyOpen": true
        }
      ]
    },
    "proof": {
      "levelSha256": "54592a8644832ce86f13afa0562933e3f1b5b7a6bc750ddb0536ae4e1e11c332",
      "sourceLevelId": 3,
      "lowerBound": 16,
      "upperBound": 16,
      "routeReplayComplete": true,
      "reportSha256": "fe29cf0719c7d510306a4e28a63bec45a982c9124e340c4436b79979e3dbbe0c",
      "routeSha256": "0a4c545a7f02cffbe16dc69f661d0ff96b8cf855747a0b934a8384dc4e9ba77d",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "54592a8644832ce86f13afa0562933e3f1b5b7a6bc750ddb0536ae4e1e11c332",
      "designReportSha256": "8049919a0d1837014a398b1830ddf61fa1b6e9690113bde7db3ec9d36295b2ff",
      "runtimeReportSha256": "3ca9dfb184190017bc1ef56ba46abc54950e5c308e43f5af62a3a500e9534512",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-mechanisms-flip-door-150-d1-08",
    "stageKey": "mechanisms-flip-door-150",
    "difficulty": 1,
    "slot": 8,
    "sourceLevelId": 5,
    "layoutSha256": "396e3f3af112fb86e0909424ce3e9d276a1f3fbea87d58434cf86f764f494a9e",
    "admittedInRevision": "11a5288da6884a24735226202e1a1f4ea0b92e2a9f11cfd498cb0db4d35d5ac5",
    "dailyMechanisms": [
      "color-exit",
      "irregular-block",
      "flip-door"
    ],
    "level": {
      "id": 5,
      "name": "每日挑战 · 翻转门 · 困难 8",
      "difficulty": "hard",
      "reward": 0,
      "width": 5,
      "height": 7,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ]
      ],
      "blocked": [],
      "timeSeconds": 180,
      "parMoves": 21,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-5-9639105-b0",
          "x": 2,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-5-9639105-b1",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-5-9639105-b2",
          "x": 1,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-5-9639105-b3",
          "x": 4,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-5-9639105-b4",
          "x": 2,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-5-9639105-b5",
          "x": 1,
          "y": 2,
          "shape": [
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-5-9639105-b6",
          "x": 2,
          "y": 3,
          "shape": [
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              2,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-5-9639105-b7",
          "x": 0,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-5-9639105-b8",
          "x": 1,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-5-9639105-b9",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-5-9639105-b10",
          "x": 1,
          "y": 6,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-5-9639105-b11",
          "x": 2,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-5-9639105-b12",
          "x": 2,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "purple"
        }
      ],
      "gates": [
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "bottom",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "left",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "right",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "right",
          "offset": 5,
          "size": 2
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "bottom",
          "offset": 4,
          "size": 1
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "left",
          "offset": 6,
          "size": 1
        }
      ],
      "flipDoors": [
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "left",
          "offset": 1,
          "size": 2,
          "initiallyOpen": false
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "right",
          "offset": 1,
          "size": 2,
          "initiallyOpen": true
        }
      ]
    },
    "proof": {
      "levelSha256": "396e3f3af112fb86e0909424ce3e9d276a1f3fbea87d58434cf86f764f494a9e",
      "sourceLevelId": 5,
      "lowerBound": 16,
      "upperBound": 17,
      "routeReplayComplete": true,
      "reportSha256": "f976df319fd4d9289f70a279e8504fc450d78c1c6a62950e200996edd1d1c874",
      "routeSha256": "b4196bdbb68f61e092663c0b3c9201b3ac4d5565f5b7bf704fe93dcfe8533920",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "396e3f3af112fb86e0909424ce3e9d276a1f3fbea87d58434cf86f764f494a9e",
      "designReportSha256": "8049919a0d1837014a398b1830ddf61fa1b6e9690113bde7db3ec9d36295b2ff",
      "runtimeReportSha256": "50b7f9f43e92100e5aebb7fbd6561c44352f9f6a8845d93b04a1caada660df9b",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-mechanisms-flip-door-150-d1-09",
    "stageKey": "mechanisms-flip-door-150",
    "difficulty": 1,
    "slot": 9,
    "sourceLevelId": 7,
    "layoutSha256": "becaa25d1e969cfc15ccf98ed545471e9c062e3b4bbe8e3bdf131ece27346173",
    "admittedInRevision": "5e22ab7211bed1d695db2d30032da2d6962d7bc0a2b2382a5a5686257a19b3d4",
    "dailyMechanisms": [
      "color-exit",
      "irregular-block",
      "flip-door"
    ],
    "level": {
      "id": 7,
      "name": "每日挑战 · 翻转门 · 困难 9",
      "difficulty": "hard",
      "reward": 0,
      "width": 5,
      "height": 8,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ],
        [
          0,
          7
        ],
        [
          1,
          7
        ],
        [
          2,
          7
        ],
        [
          3,
          7
        ],
        [
          4,
          7
        ]
      ],
      "timeSeconds": 120,
      "parMoves": 24,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-7-10011733-b0",
          "x": 2,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-7-10011733-b1",
          "x": 0,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-7-10011733-b2",
          "x": 4,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-7-10011733-b3",
          "x": 2,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-7-10011733-b4",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-7-10011733-b5",
          "x": 3,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-7-10011733-b6",
          "x": 2,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-7-10011733-b7",
          "x": 1,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-7-10011733-b8",
          "x": 0,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-7-10011733-b9",
          "x": 2,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-7-10011733-b10",
          "x": 4,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-7-10011733-b11",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              3,
              0
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-7-10011733-b12",
          "x": 0,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-7-10011733-b13",
          "x": 1,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              2,
              1
            ]
          ],
          "color": "green"
        }
      ],
      "gates": [
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "right",
          "offset": 6,
          "size": 2
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "right",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "left",
          "offset": 5,
          "size": 2
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "right",
          "offset": 4,
          "size": 2
        }
      ],
      "flipDoors": [
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "right",
          "offset": 0,
          "size": 2,
          "initiallyOpen": true
        },
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "top",
          "offset": 3,
          "size": 2,
          "initiallyOpen": false
        }
      ]
    },
    "proof": {
      "levelSha256": "becaa25d1e969cfc15ccf98ed545471e9c062e3b4bbe8e3bdf131ece27346173",
      "sourceLevelId": 7,
      "lowerBound": 16,
      "upperBound": 20,
      "routeReplayComplete": true,
      "reportSha256": "a295c26a5197dfdf4f7fd95197bcb4b89bea1a5b804a4a5390d6aa419dcec016",
      "routeSha256": "42eb7da81f3e285719f81a35912def91b60730d42530551f39432a33ff0ea22f",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "becaa25d1e969cfc15ccf98ed545471e9c062e3b4bbe8e3bdf131ece27346173",
      "designReportSha256": "8049919a0d1837014a398b1830ddf61fa1b6e9690113bde7db3ec9d36295b2ff",
      "runtimeReportSha256": "1ced0a90f76bfbca4cc568cba7cde569962a9f7e503fdb72534dd64b8b56bf7f",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-mechanisms-colored-grid-200-d1-07",
    "stageKey": "mechanisms-colored-grid-200",
    "difficulty": 1,
    "slot": 7,
    "sourceLevelId": 27,
    "layoutSha256": "7857a70b91debf1f76c8b6b0a50466f7fc59f084388f0f3b1705a885142d6c67",
    "admittedInRevision": "1f3a28d9651ff9690adaa78021ec1a9a79e14ea491590594303d3b3cbdd5c61a",
    "dailyMechanisms": [
      "color-exit",
      "irregular-board",
      "colored-grid"
    ],
    "level": {
      "id": 27,
      "name": "每日挑战多样原型 27-7055105",
      "difficulty": "super",
      "reward": 0,
      "width": 6,
      "height": 9,
      "playable": [
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          5,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          5,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          5,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ],
        [
          5,
          6
        ],
        [
          0,
          7
        ],
        [
          1,
          7
        ],
        [
          2,
          7
        ],
        [
          3,
          7
        ],
        [
          4,
          7
        ],
        [
          5,
          7
        ],
        [
          0,
          8
        ],
        [
          1,
          8
        ],
        [
          2,
          8
        ],
        [
          3,
          8
        ],
        [
          4,
          8
        ],
        [
          5,
          8
        ]
      ],
      "timeSeconds": 60,
      "parMoves": 28,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-27-7055105-b0",
          "x": 1,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-27-7055105-b1",
          "x": 0,
          "y": 8,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-27-7055105-b2",
          "x": 0,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-27-7055105-b3",
          "x": 0,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-27-7055105-b4",
          "x": 0,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-27-7055105-b5",
          "x": 2,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-27-7055105-b6",
          "x": 3,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-27-7055105-b7",
          "x": 4,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-27-7055105-b8",
          "x": 5,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-27-7055105-b9",
          "x": 3,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-27-7055105-b10",
          "x": 4,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-27-7055105-b11",
          "x": 2,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-27-7055105-b12",
          "x": 1,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-27-7055105-b13",
          "x": 2,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-27-7055105-b14",
          "x": 5,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-27-7055105-b15",
          "x": 4,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-27-7055105-b16",
          "x": 3,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "cyan"
        }
      ],
      "gates": [
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "left",
          "offset": 4,
          "size": 2
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "bottom",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "left",
          "offset": 7,
          "size": 2
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "right",
          "offset": 7,
          "size": 1
        },
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "top",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "right",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "right",
          "offset": 5,
          "size": 2
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "bottom",
          "offset": 0,
          "size": 2
        }
      ],
      "coloredGrids": [
        {
          "id": "daily-mechanisms-colored-grid-200-d1-07-grid-0",
          "color": "red",
          "cells": [
            [
              1,
              0
            ]
          ]
        },
        {
          "id": "daily-mechanisms-colored-grid-200-d1-07-grid-1",
          "color": "orange",
          "cells": [
            [
              2,
              0
            ]
          ]
        }
      ]
    },
    "proof": {
      "levelSha256": "7857a70b91debf1f76c8b6b0a50466f7fc59f084388f0f3b1705a885142d6c67",
      "sourceLevelId": 27,
      "lowerBound": 16,
      "upperBound": 17,
      "routeReplayComplete": true,
      "reportSha256": "8af57c085b0333bb1fbd7f3aafff49bf4e62eed9c66364a57a17c889178ef7fd",
      "routeSha256": "08ae1758ddf92bc75f8701a1c3e98dc69888b5613adc6295629b25ce4ad3fe5a",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "7857a70b91debf1f76c8b6b0a50466f7fc59f084388f0f3b1705a885142d6c67",
      "designReportSha256": "8049919a0d1837014a398b1830ddf61fa1b6e9690113bde7db3ec9d36295b2ff",
      "runtimeReportSha256": "15a09cca8391b4f46c7fd57d920a0361d4f6515012c9b18987d2eb714c93f4fe",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-mechanisms-axis-block-50-d2-03",
    "stageKey": "mechanisms-axis-block-50",
    "difficulty": 2,
    "slot": 3,
    "sourceLevelId": 18,
    "layoutSha256": "cac4cf476feac5dc8c97f191a1510ef47e458ac741f2dba3adca1d5ae0b12513",
    "admittedInRevision": "9c3bd1990ac01469329691f00d64501a42269de2d48f98f9ae0de9e183d4334a",
    "dailyMechanisms": [
      "color-exit",
      "frozen-exit",
      "axis-block"
    ],
    "level": {
      "id": 18,
      "name": "每日挑战多样原型 18-6788934",
      "difficulty": "super",
      "reward": 0,
      "width": 5,
      "height": 8,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ],
        [
          0,
          7
        ],
        [
          1,
          7
        ],
        [
          2,
          7
        ],
        [
          3,
          7
        ],
        [
          4,
          7
        ]
      ],
      "timeSeconds": 75,
      "parMoves": 28,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-18-6788934-b0",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-18-6788934-b1",
          "x": 3,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-18-6788934-b2",
          "x": 4,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-18-6788934-b3",
          "x": 2,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-18-6788934-b4",
          "x": 0,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "blue",
          "movementAxis": "vertical"
        },
        {
          "id": "v3-18-6788934-b5",
          "x": 0,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-18-6788934-b6",
          "x": 3,
          "y": 6,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-18-6788934-b7",
          "x": 4,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "pink",
          "movementAxis": "vertical"
        },
        {
          "id": "v3-18-6788934-b8",
          "x": 4,
          "y": 3,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-18-6788934-b9",
          "x": 3,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-18-6788934-b10",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-18-6788934-b11",
          "x": 1,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-18-6788934-b12",
          "x": 0,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-18-6788934-b13",
          "x": 0,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-18-6788934-b14",
          "x": 2,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "cyan"
        }
      ],
      "gates": [
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "right",
          "offset": 5,
          "size": 2
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "bottom",
          "offset": 3,
          "size": 2,
          "frozen": 13
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "top",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "top",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "right",
          "offset": 0,
          "size": 2,
          "frozen": 11
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "left",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "left",
          "offset": 4,
          "size": 2
        },
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "right",
          "offset": 4,
          "size": 1
        }
      ]
    },
    "proof": {
      "levelSha256": "cac4cf476feac5dc8c97f191a1510ef47e458ac741f2dba3adca1d5ae0b12513",
      "sourceLevelId": 18,
      "lowerBound": 21,
      "upperBound": 25,
      "routeReplayComplete": true,
      "reportSha256": "72b9b9ab708e36cd79285e492b3fb9880c9cc52914cfaf66e5acd29ab48a5a42",
      "routeSha256": "84ce1541e5056268317a0bba895579915cbb9b36139dfa8c94feec59ea7a4d34",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "cac4cf476feac5dc8c97f191a1510ef47e458ac741f2dba3adca1d5ae0b12513",
      "designReportSha256": "8049919a0d1837014a398b1830ddf61fa1b6e9690113bde7db3ec9d36295b2ff",
      "runtimeReportSha256": "8fa8e12563aa9f8f19ef4ebe767e8d1f58f9c0057fbaa2e14bfb3d9b7d1a1281",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-mechanisms-axis-block-50-d1-07",
    "stageKey": "mechanisms-axis-block-50",
    "difficulty": 1,
    "slot": 7,
    "sourceLevelId": 50,
    "layoutSha256": "6b4aa1452a4870097dbc1b97920583be76bb32e6651d8e0781aadd182c3d5654",
    "admittedInRevision": "e0d6dec618d46c6c047d8af3b548b61d3b70a4af756fefec38ec6ce197fb7825",
    "dailyMechanisms": [
      "color-exit",
      "axis-block",
      "irregular-block"
    ],
    "level": {
      "id": 50,
      "name": "荣耀联赛主线大区重铺 50-10609575",
      "difficulty": "super",
      "reward": 0,
      "width": 5,
      "height": 9,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ],
        [
          0,
          7
        ],
        [
          1,
          7
        ],
        [
          2,
          7
        ],
        [
          3,
          7
        ],
        [
          4,
          7
        ],
        [
          0,
          8
        ],
        [
          1,
          8
        ],
        [
          2,
          8
        ],
        [
          3,
          8
        ],
        [
          4,
          8
        ]
      ],
      "timeSeconds": 135,
      "parMoves": 18,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-50-10457296-b0",
          "x": 4,
          "y": 2,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-50-10457296-b1",
          "x": 3,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-50-10457296-b2",
          "x": 1,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-50-10457296-b3",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-50-10457296-b4",
          "x": 4,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-50-10457296-b5",
          "x": 2,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-50-10457296-b6",
          "x": 1,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-50-10457296-b7",
          "x": 0,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-50-10457296-b8",
          "x": 3,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "cyan",
          "movementAxis": "vertical"
        },
        {
          "id": "v3-50-10457296-b9",
          "x": 0,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-50-10457296-b10",
          "x": 0,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-50-10457296-b11",
          "x": 0,
          "y": 2,
          "shape": [
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              2,
              1
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-50-10457296-b12",
          "x": 2,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-50-10457296-b13",
          "x": 3,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-50-10457296-b14",
          "x": 3,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "yellow",
          "movementAxis": "horizontal"
        },
        {
          "id": "v3-50-10457296-b15",
          "x": 1,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "purple"
        }
      ],
      "gates": [
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "left",
          "offset": 5,
          "size": 2
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "right",
          "offset": 6,
          "size": 2
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "right",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "bottom",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "top",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "right",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "left",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "right",
          "offset": 4,
          "size": 2
        }
      ]
    },
    "proof": {
      "levelSha256": "6b4aa1452a4870097dbc1b97920583be76bb32e6651d8e0781aadd182c3d5654",
      "sourceLevelId": 50,
      "lowerBound": 16,
      "upperBound": 18,
      "routeReplayComplete": true,
      "reportSha256": "3d84579ef3055eedc1d68d184abf5550239e59885020ca12e52f47d3260bd597",
      "routeSha256": "4919146b50dd965ac9cda90bcca1d71afd30f8a23fefea647b0196a6a00c272b",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "6b4aa1452a4870097dbc1b97920583be76bb32e6651d8e0781aadd182c3d5654",
      "designReportSha256": "8049919a0d1837014a398b1830ddf61fa1b6e9690113bde7db3ec9d36295b2ff",
      "runtimeReportSha256": "1e48c56d7f8f893aa42f7b12dd21fb19d7eb480a589b3659324c8f0050fe4657",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-mechanisms-axis-block-50-d1-08",
    "stageKey": "mechanisms-axis-block-50",
    "difficulty": 1,
    "slot": 8,
    "sourceLevelId": 52,
    "layoutSha256": "be10ed11bc25a0d6e34f70b326b558497e4f087880aefc37f26834e15135d0aa",
    "admittedInRevision": "0aa98fcab7fc8db51169a8ef02513af6c143484d764fafc66197a6def4e7cc33",
    "dailyMechanisms": [
      "color-exit",
      "frozen-exit",
      "axis-block"
    ],
    "level": {
      "id": 52,
      "name": "每日挑战多样原型 52-7082401",
      "difficulty": "super",
      "reward": 0,
      "width": 6,
      "height": 8,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          5,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          5,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          5,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          5,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          5,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          5,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ],
        [
          5,
          6
        ],
        [
          0,
          7
        ],
        [
          1,
          7
        ],
        [
          2,
          7
        ],
        [
          3,
          7
        ],
        [
          4,
          7
        ],
        [
          5,
          7
        ]
      ],
      "timeSeconds": 105,
      "parMoves": 30,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-52-7082401-b0",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-52-7082401-b1",
          "x": 0,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-52-7082401-b2",
          "x": 2,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-52-7082401-b3",
          "x": 0,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              0,
              2
            ],
            [
              1,
              2
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-52-7082401-b4",
          "x": 0,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "yellow",
          "movementAxis": "horizontal"
        },
        {
          "id": "v3-52-7082401-b5",
          "x": 4,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-52-7082401-b6",
          "x": 2,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-52-7082401-b7",
          "x": 2,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-52-7082401-b8",
          "x": 2,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-52-7082401-b9",
          "x": 5,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-52-7082401-b10",
          "x": 3,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              2,
              1
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-52-7082401-b11",
          "x": 3,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              2,
              1
            ]
          ],
          "color": "yellow"
        }
      ],
      "gates": [
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "right",
          "offset": 6,
          "size": 2
        },
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "bottom",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "top",
          "offset": 4,
          "size": 2
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "top",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "left",
          "offset": 0,
          "size": 2,
          "frozen": 11
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "bottom",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "right",
          "offset": 5,
          "size": 1,
          "frozen": 6
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "left",
          "offset": 6,
          "size": 1
        }
      ]
    },
    "proof": {
      "levelSha256": "be10ed11bc25a0d6e34f70b326b558497e4f087880aefc37f26834e15135d0aa",
      "sourceLevelId": 52,
      "lowerBound": 16,
      "upperBound": 20,
      "routeReplayComplete": true,
      "reportSha256": "dcb104a822979c9b90f29c479022b7a566ccf27ae08f29a1cb5b11b7f6363ca5",
      "routeSha256": "f832aae97ca57cc0a61592ade2774c6faf924576a14366dc5b767718cb742fd2",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "be10ed11bc25a0d6e34f70b326b558497e4f087880aefc37f26834e15135d0aa",
      "designReportSha256": "8049919a0d1837014a398b1830ddf61fa1b6e9690113bde7db3ec9d36295b2ff",
      "runtimeReportSha256": "774b5ffef3020b93c9cb0489bebc31af2da4e705daa956ee27ee49f341448dd9",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-mechanisms-axis-block-50-d1-09",
    "stageKey": "mechanisms-axis-block-50",
    "difficulty": 1,
    "slot": 9,
    "sourceLevelId": 3,
    "layoutSha256": "d5478de00f71da05d1f53811aca0ec6107a888f1fe5d969efbb1ce8bf1cb69b5",
    "admittedInRevision": "2802e88eacd18726f3c891401355c698889d08ef807c908727137e5afa53dc10",
    "dailyMechanisms": [
      "color-exit",
      "frozen-exit",
      "axis-block"
    ],
    "level": {
      "id": 3,
      "name": "每日挑战多样原型 3-6671193",
      "difficulty": "super",
      "reward": 0,
      "width": 6,
      "height": 6,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          5,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          5,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          5,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          5,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          5,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          5,
          5
        ]
      ],
      "blocked": [],
      "timeSeconds": 180,
      "parMoves": 14,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-3-6671193-b0",
          "x": 5,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-3-6671193-b1",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-3-6671193-b2",
          "x": 3,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "green",
          "movementAxis": "vertical"
        },
        {
          "id": "v3-3-6671193-b3",
          "x": 4,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-3-6671193-b4",
          "x": 5,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-3-6671193-b5",
          "x": 3,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-3-6671193-b6",
          "x": 3,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-3-6671193-b7",
          "x": 0,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-3-6671193-b8",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              2,
              1
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-3-6671193-b9",
          "x": 0,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              2,
              1
            ]
          ],
          "color": "red"
        }
      ],
      "gates": [
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "bottom",
          "offset": 3,
          "size": 2,
          "frozen": 8
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "left",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "right",
          "offset": 0,
          "size": 2,
          "frozen": 7
        },
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "bottom",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "left",
          "offset": 4,
          "size": 2
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "right",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "top",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "top",
          "offset": 0,
          "size": 2
        }
      ]
    },
    "proof": {
      "levelSha256": "d5478de00f71da05d1f53811aca0ec6107a888f1fe5d969efbb1ce8bf1cb69b5",
      "sourceLevelId": 3,
      "lowerBound": 16,
      "upperBound": 17,
      "routeReplayComplete": true,
      "reportSha256": "1300c3939edbd1013a616d48929d5765d52865600399ff6badaf8a4d771830fe",
      "routeSha256": "6d31d0be7af8c6dd75f1a65729144ec4f428c0673149f80075263db44e6a88f2",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "d5478de00f71da05d1f53811aca0ec6107a888f1fe5d969efbb1ce8bf1cb69b5",
      "designReportSha256": "8049919a0d1837014a398b1830ddf61fa1b6e9690113bde7db3ec9d36295b2ff",
      "runtimeReportSha256": "6571a874f2966896ea6ec39872a0aec4a8e79f590feb987ccc155e7f711ec51d",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-mechanisms-axis-block-50-d2-04",
    "stageKey": "mechanisms-axis-block-50",
    "difficulty": 2,
    "slot": 4,
    "sourceLevelId": 108,
    "layoutSha256": "59f8641ed4914d5bab63b3a31aa5a7f7d032e3ca00b163cdab3f857b1367dc27",
    "admittedInRevision": "a8b898d4a8477ec16b1ab4afaad1e40df1e5e2af0825558eeb2582bb18897755",
    "dailyMechanisms": [
      "color-exit",
      "frozen-exit",
      "axis-block"
    ],
    "level": {
      "id": 108,
      "name": "每日挑战多样原型 108-8075076",
      "difficulty": "super",
      "reward": 0,
      "width": 6,
      "height": 7,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          5,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          5,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          5,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          5,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          5,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          5,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ],
        [
          5,
          6
        ]
      ],
      "timeSeconds": 180,
      "parMoves": 30,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-108-8075076-b0",
          "x": 2,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "orange",
          "movementAxis": "vertical"
        },
        {
          "id": "v3-108-8075076-b1",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-108-8075076-b2",
          "x": 3,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-108-8075076-b3",
          "x": 2,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-108-8075076-b4",
          "x": 5,
          "y": 0,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-108-8075076-b5",
          "x": 4,
          "y": 0,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-108-8075076-b6",
          "x": 3,
          "y": 0,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-108-8075076-b7",
          "x": 0,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-108-8075076-b8",
          "x": 1,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-108-8075076-b9",
          "x": 0,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-108-8075076-b10",
          "x": 0,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-108-8075076-b11",
          "x": 3,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              0,
              2
            ],
            [
              1,
              2
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-108-8075076-b12",
          "x": 5,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-108-8075076-b13",
          "x": 3,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              2,
              1
            ]
          ],
          "color": "pink"
        }
      ],
      "gates": [
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "right",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "right",
          "offset": 6,
          "size": 1
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "top",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "left",
          "offset": 4,
          "size": 2,
          "frozen": 8
        },
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "bottom",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "top",
          "offset": 3,
          "size": 2,
          "frozen": 13
        },
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "left",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "right",
          "offset": 5,
          "size": 1
        }
      ]
    },
    "proof": {
      "levelSha256": "59f8641ed4914d5bab63b3a31aa5a7f7d032e3ca00b163cdab3f857b1367dc27",
      "sourceLevelId": 108,
      "lowerBound": 21,
      "upperBound": 23,
      "routeReplayComplete": true,
      "reportSha256": "14d8cf9e3680ae1ad826e11f7f27d6e37c18f36dac7066fbb81cc5ac3852fe0e",
      "routeSha256": "3b4e25ab8874c7fc40d865ac316eb9e6df9e06a965c1707fd1b6b2f66ed481b7",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "59f8641ed4914d5bab63b3a31aa5a7f7d032e3ca00b163cdab3f857b1367dc27",
      "designReportSha256": "8049919a0d1837014a398b1830ddf61fa1b6e9690113bde7db3ec9d36295b2ff",
      "runtimeReportSha256": "a4c8179117c06dd1f2c36b644e1f642be9ed077faf98c946f13ee1c3b8102521",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-mechanisms-bomb-120-d1-02",
    "stageKey": "mechanisms-bomb-120",
    "difficulty": 1,
    "slot": 2,
    "sourceLevelId": 40,
    "layoutSha256": "7be41abffdbe29ead3608e84960ec53e30adeb5ee539d4446ce0ce7c8ca21a6a",
    "admittedInRevision": "3bad425e8c81f6a2819332b0cf710085bcd02d6837f00e0925f2f60d625e27a8",
    "dailyMechanisms": [
      "color-exit",
      "bomb",
      "irregular-board"
    ],
    "level": {
      "id": 40,
      "name": "每日挑战 bomb 1-2",
      "difficulty": "hard",
      "reward": 0,
      "width": 6,
      "height": 6,
      "playable": [
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          5,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          5,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          5,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          5,
          4
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ]
      ],
      "timeSeconds": 90,
      "parMoves": 34,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-40-7026367-b0",
          "x": 0,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-40-7026367-b1",
          "x": 0,
          "y": 1,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-40-7026367-b2",
          "x": 3,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-40-7026367-b3",
          "x": 3,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-40-7026367-b4",
          "x": 1,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-40-7026367-b5",
          "x": 1,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-40-7026367-b6",
          "x": 2,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-40-7026367-b7",
          "x": 1,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-40-7026367-b8",
          "x": 2,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "cyan",
          "timedBombSeconds": 15
        },
        {
          "id": "v3-40-7026367-b9",
          "x": 3,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "red",
          "timedBombSeconds": 15
        },
        {
          "id": "v3-40-7026367-b10",
          "x": 5,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-40-7026367-b11",
          "x": 3,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "red"
        }
      ],
      "gates": [
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "right",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "bottom",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "right",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "bottom",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "top",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "left",
          "offset": 2,
          "size": 1
        },
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "top",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "left",
          "offset": 3,
          "size": 2
        }
      ]
    },
    "proof": {
      "levelSha256": "7be41abffdbe29ead3608e84960ec53e30adeb5ee539d4446ce0ce7c8ca21a6a",
      "sourceLevelId": 40,
      "lowerBound": 16,
      "upperBound": 19,
      "routeReplayComplete": true,
      "reportSha256": "750853017ec665469ce471b6edbc21f4576ab1f1b29d53f386a0b969861e591e",
      "routeSha256": "27df42704e3fd8bf880b57b03d2999f02bab7a34a894213ab950bb1210964f80",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "7be41abffdbe29ead3608e84960ec53e30adeb5ee539d4446ce0ce7c8ca21a6a",
      "designReportSha256": "8049919a0d1837014a398b1830ddf61fa1b6e9690113bde7db3ec9d36295b2ff",
      "runtimeReportSha256": "4a7a0c8df87358cc2ea55ab41e8aeed791d1b261d065e769480bd7cca08892e7",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-mechanisms-bomb-120-d2-03",
    "stageKey": "mechanisms-bomb-120",
    "difficulty": 2,
    "slot": 3,
    "sourceLevelId": 151,
    "layoutSha256": "dcb28bd0937f92e460dcad556ae49cb4b345493b742473c735741cb94ceac7b2",
    "admittedInRevision": "23daea2e3fdc871cb55fee0c9ba93a1ae57e4bda7df8eda24b0b5396218a509d",
    "dailyMechanisms": [
      "color-exit",
      "bomb"
    ],
    "level": {
      "id": 151,
      "name": "每日挑战 bomb 2-3",
      "difficulty": "super",
      "reward": 0,
      "width": 5,
      "height": 6,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ]
      ],
      "timeSeconds": 90,
      "parMoves": 29,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-151-11547955-b0",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-151-11547955-b1",
          "x": 3,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-151-11547955-b2",
          "x": 0,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-151-11547955-b3",
          "x": 1,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-151-11547955-b4",
          "x": 3,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "orange",
          "timedBombSeconds": 15
        },
        {
          "id": "v3-151-11547955-b5",
          "x": 3,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-151-11547955-b6",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-151-11547955-b7",
          "x": 1,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "cyan",
          "timedBombSeconds": 20
        },
        {
          "id": "v3-151-11547955-b8",
          "x": 0,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "blue",
          "timedBombSeconds": 19
        },
        {
          "id": "v3-151-11547955-b9",
          "x": 2,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "yellow"
        }
      ],
      "gates": [
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "bottom",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "bottom",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "top",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "right",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "left",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "right",
          "offset": 5,
          "size": 1
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "left",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "top",
          "offset": 3,
          "size": 2
        }
      ]
    },
    "proof": {
      "levelSha256": "dcb28bd0937f92e460dcad556ae49cb4b345493b742473c735741cb94ceac7b2",
      "sourceLevelId": 151,
      "lowerBound": 21,
      "upperBound": 21,
      "routeReplayComplete": true,
      "reportSha256": "5ee38d993d40a207238f074c68cbd0dc468860c504c5f4c65c9472f951281445",
      "routeSha256": "4fbc04aee0964aaaafd4e5193c3bf7d72bb4e230cc402d1c7aa6d0ca6a36b37a",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "dcb28bd0937f92e460dcad556ae49cb4b345493b742473c735741cb94ceac7b2",
      "designReportSha256": "8049919a0d1837014a398b1830ddf61fa1b6e9690113bde7db3ec9d36295b2ff",
      "runtimeReportSha256": "64c6c17644d8818ee915c6fccccf840291770e2196a2838f48606c3d63c840c2",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-mechanisms-bomb-120-d3-01",
    "stageKey": "mechanisms-bomb-120",
    "difficulty": 3,
    "slot": 1,
    "sourceLevelId": 18,
    "layoutSha256": "460c0448ef1dc3fcc932ec65ac0cb77ec3b19510234dfbcad90a7efb487541ee",
    "admittedInRevision": "c22a02b6681479f15feac85c00a1b98fb6713cbf65d9ccc5ed1a4ee2c4c525ca",
    "dailyMechanisms": [
      "color-exit",
      "bomb",
      "irregular-block"
    ],
    "level": {
      "id": 18,
      "name": "每日挑战 bomb 3-1",
      "difficulty": "super",
      "reward": 0,
      "width": 5,
      "height": 8,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ],
        [
          0,
          7
        ],
        [
          1,
          7
        ],
        [
          2,
          7
        ],
        [
          3,
          7
        ],
        [
          4,
          7
        ]
      ],
      "timeSeconds": 75,
      "parMoves": 28,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-18-10424968-b0",
          "x": 2,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "orange",
          "timedBombSeconds": 33
        },
        {
          "id": "v3-18-10424968-b1",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "cyan",
          "timedBombSeconds": 15
        },
        {
          "id": "v3-18-10424968-b2",
          "x": 2,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-18-10424968-b3",
          "x": 0,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-18-10424968-b4",
          "x": 1,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "yellow",
          "timedBombSeconds": 15
        },
        {
          "id": "v3-18-10424968-b5",
          "x": 4,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "purple",
          "timedBombSeconds": 25
        },
        {
          "id": "v3-18-10424968-b6",
          "x": 3,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-18-10424968-b7",
          "x": 3,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-18-10424968-b8",
          "x": 1,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-18-10424968-b9",
          "x": 0,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-18-10424968-b10",
          "x": 0,
          "y": 6,
          "shape": [
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-18-10424968-b11",
          "x": 2,
          "y": 7,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-18-10424968-b12",
          "x": 1,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-18-10424968-b13",
          "x": 2,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-18-10424968-b14",
          "x": 3,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              0,
              2
            ],
            [
              1,
              2
            ]
          ],
          "color": "yellow"
        }
      ],
      "gates": [
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "left",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "top",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "top",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "right",
          "offset": 1,
          "size": 1
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "left",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "bottom",
          "offset": 0,
          "size": 1
        }
      ]
    },
    "proof": {
      "levelSha256": "460c0448ef1dc3fcc932ec65ac0cb77ec3b19510234dfbcad90a7efb487541ee",
      "sourceLevelId": 18,
      "lowerBound": 31,
      "upperBound": 32,
      "routeReplayComplete": true,
      "reportSha256": "a8124f90a99e387fd23459a40c6e2da9d8f35a33095417d22a66c77dfdd481de",
      "routeSha256": "4b5c1d314374476edbd09b2a866728031aaa6d7c52b36564601cdd13befa66fb",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "460c0448ef1dc3fcc932ec65ac0cb77ec3b19510234dfbcad90a7efb487541ee",
      "designReportSha256": "8049919a0d1837014a398b1830ddf61fa1b6e9690113bde7db3ec9d36295b2ff",
      "runtimeReportSha256": "4964ad360db7290513ad59a95f58fafd9b3baee9187fa35d6066563b1f21fc43",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-mechanisms-key-lock-59-d1-02",
    "stageKey": "mechanisms-key-lock-59",
    "difficulty": 1,
    "slot": 2,
    "sourceLevelId": 108,
    "layoutSha256": "b710e6b3b1c24b56f6b53144f55ca7ab69460437eddb07f3a9d6217a34a02934",
    "admittedInRevision": "b98377552531bace24eb91f36ccc86cfc2987cbe1db676390d2d3e0fad3b8ba1",
    "dailyMechanisms": [
      "color-exit",
      "key-lock"
    ],
    "level": {
      "id": 108,
      "name": "每日挑战 key-lock 1-2",
      "difficulty": "hard",
      "reward": 0,
      "width": 6,
      "height": 7,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          5,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          5,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          5,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          5,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          5,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          5,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ],
        [
          5,
          6
        ]
      ],
      "timeSeconds": 180,
      "parMoves": 30,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-108-7572892-b0",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "cyan",
          "keyId": "daily-mechanisms-key-lock-59-d1-02-shared-key"
        },
        {
          "id": "v3-108-7572892-b1",
          "x": 2,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-108-7572892-b2",
          "x": 5,
          "y": 6,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "pink",
          "keyId": "daily-mechanisms-key-lock-59-d1-02-shared-key"
        },
        {
          "id": "v3-108-7572892-b3",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "pink",
          "lockedBy": "daily-mechanisms-key-lock-59-d1-02-shared-key",
          "lockCount": 3
        },
        {
          "id": "v3-108-7572892-b4",
          "x": 3,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "orange",
          "lockedBy": "daily-mechanisms-key-lock-59-d1-02-shared-key",
          "lockCount": 2
        },
        {
          "id": "v3-108-7572892-b5",
          "x": 2,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-108-7572892-b6",
          "x": 1,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-108-7572892-b7",
          "x": 0,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-108-7572892-b8",
          "x": 0,
          "y": 1,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "green",
          "keyId": "daily-mechanisms-key-lock-59-d1-02-shared-key"
        },
        {
          "id": "v3-108-7572892-b9",
          "x": 1,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-108-7572892-b10",
          "x": 3,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-108-7572892-b11",
          "x": 4,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              0,
              2
            ],
            [
              1,
              2
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-108-7572892-b12",
          "x": 3,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              2,
              1
            ]
          ],
          "color": "green"
        }
      ],
      "gates": [
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "right",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "bottom",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "top",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "bottom",
          "offset": 5,
          "size": 1
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "left",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "right",
          "offset": 4,
          "size": 2
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "bottom",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "left",
          "offset": 4,
          "size": 2
        }
      ]
    },
    "proof": {
      "levelSha256": "b710e6b3b1c24b56f6b53144f55ca7ab69460437eddb07f3a9d6217a34a02934",
      "sourceLevelId": 108,
      "lowerBound": 16,
      "upperBound": 16,
      "routeReplayComplete": true,
      "reportSha256": "af8f4aa82b554917998cff5f07f6a42db71e39aa1d2d426c22504b3cb0f78fd7",
      "routeSha256": "b2a1a04ec105d8f7006655d30601e185e4dddc63e5763af985bb4aeefe71221f",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "b710e6b3b1c24b56f6b53144f55ca7ab69460437eddb07f3a9d6217a34a02934",
      "designReportSha256": "8049919a0d1837014a398b1830ddf61fa1b6e9690113bde7db3ec9d36295b2ff",
      "runtimeReportSha256": "d2c2a83296e2c5b154f7a90f43000b25523faea15e401e73ba95688a3436a12b",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-mechanisms-key-lock-59-d2-01",
    "stageKey": "mechanisms-key-lock-59",
    "difficulty": 2,
    "slot": 1,
    "sourceLevelId": 31,
    "layoutSha256": "82e9eeed65dd357b265a0c0170e574413ad07c6fba969c69db6fd1b579260f1a",
    "admittedInRevision": "eb6f4193668430f3b915947098190b87ae853cc607aa01ae0ca89d465c918e53",
    "dailyMechanisms": [
      "color-exit",
      "key-lock"
    ],
    "level": {
      "id": 31,
      "name": "每日挑战 key-lock 2-1",
      "difficulty": "super",
      "reward": 0,
      "width": 6,
      "height": 8,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          5,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          5,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          5,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          5,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          5,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          5,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ],
        [
          5,
          6
        ],
        [
          0,
          7
        ],
        [
          1,
          7
        ],
        [
          2,
          7
        ],
        [
          3,
          7
        ],
        [
          4,
          7
        ],
        [
          5,
          7
        ]
      ],
      "timeSeconds": 90,
      "parMoves": 27,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-31-6957772-b0",
          "x": 4,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "red",
          "lockedBy": "daily-mechanisms-key-lock-59-d2-01-shared-key",
          "lockCount": 3
        },
        {
          "id": "v3-31-6957772-b1",
          "x": 4,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "purple",
          "keyId": "daily-mechanisms-key-lock-59-d2-01-shared-key"
        },
        {
          "id": "v3-31-6957772-b2",
          "x": 3,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-31-6957772-b3",
          "x": 3,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "purple",
          "keyId": "daily-mechanisms-key-lock-59-d2-01-shared-key"
        },
        {
          "id": "v3-31-6957772-b4",
          "x": 3,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-31-6957772-b5",
          "x": 3,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-31-6957772-b6",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "purple",
          "keyId": "daily-mechanisms-key-lock-59-d2-01-shared-key"
        },
        {
          "id": "v3-31-6957772-b7",
          "x": 3,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "blue",
          "keyId": "daily-mechanisms-key-lock-59-d2-01-shared-key"
        },
        {
          "id": "v3-31-6957772-b8",
          "x": 2,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "green",
          "keyId": "daily-mechanisms-key-lock-59-d2-01-shared-key"
        },
        {
          "id": "v3-31-6957772-b9",
          "x": 0,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "blue",
          "lockedBy": "daily-mechanisms-key-lock-59-d2-01-shared-key",
          "lockCount": 5
        },
        {
          "id": "v3-31-6957772-b10",
          "x": 0,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-31-6957772-b11",
          "x": 1,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-31-6957772-b12",
          "x": 1,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-31-6957772-b13",
          "x": 0,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-31-6957772-b14",
          "x": 0,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-31-6957772-b15",
          "x": 1,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "green",
          "lockedBy": "daily-mechanisms-key-lock-59-d2-01-shared-key",
          "lockCount": 5
        }
      ],
      "gates": [
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "bottom",
          "offset": 4,
          "size": 2
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "bottom",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "left",
          "offset": 5,
          "size": 2
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "top",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "left",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "right",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "top",
          "offset": 3,
          "size": 1
        },
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "left",
          "offset": 7,
          "size": 1
        }
      ]
    },
    "proof": {
      "levelSha256": "82e9eeed65dd357b265a0c0170e574413ad07c6fba969c69db6fd1b579260f1a",
      "sourceLevelId": 31,
      "lowerBound": 21,
      "upperBound": 22,
      "routeReplayComplete": true,
      "reportSha256": "7cf1697d53f0ed34bab6b8668f187d42f242c7fffa4a9473c65d5b50659cb6f5",
      "routeSha256": "179216a881425c9345d4e67960a287f743968de0b4e1ba223598550444d6132d",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "82e9eeed65dd357b265a0c0170e574413ad07c6fba969c69db6fd1b579260f1a",
      "designReportSha256": "8049919a0d1837014a398b1830ddf61fa1b6e9690113bde7db3ec9d36295b2ff",
      "runtimeReportSha256": "ce5d39b9bf8ec6c935ec55cf07ad04e38092e83fd80b480b98a194d51937aa29",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-mechanisms-flip-door-150-d1-02",
    "stageKey": "mechanisms-flip-door-150",
    "difficulty": 1,
    "slot": 2,
    "sourceLevelId": 151,
    "layoutSha256": "9b02b1af7cf57c88acb487dda0017846ee0497c2a973225f750663c032262b94",
    "admittedInRevision": "1521d468a620ef333b9ee10d3d981a23252e3a4934eabf33fa6855607f476f67",
    "dailyMechanisms": [
      "color-exit",
      "flip-door"
    ],
    "level": {
      "id": 151,
      "name": "每日挑战 flip-door 1-2",
      "difficulty": "hard",
      "reward": 0,
      "width": 5,
      "height": 6,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ]
      ],
      "timeSeconds": 90,
      "parMoves": 29,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-151-7982336-b0",
          "x": 0,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-151-7982336-b1",
          "x": 0,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-151-7982336-b2",
          "x": 2,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-151-7982336-b3",
          "x": 4,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-151-7982336-b4",
          "x": 3,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-151-7982336-b5",
          "x": 4,
          "y": 2,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-151-7982336-b6",
          "x": 3,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-151-7982336-b7",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-151-7982336-b8",
          "x": 1,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              0,
              2
            ],
            [
              1,
              2
            ]
          ],
          "color": "purple"
        }
      ],
      "gates": [
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "left",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "bottom",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "right",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "left",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "right",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "bottom",
          "offset": 4,
          "size": 1
        }
      ],
      "flipDoors": [
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "top",
          "offset": 0,
          "size": 2,
          "initiallyOpen": false
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "top",
          "offset": 2,
          "size": 2,
          "initiallyOpen": true
        }
      ]
    },
    "proof": {
      "levelSha256": "9b02b1af7cf57c88acb487dda0017846ee0497c2a973225f750663c032262b94",
      "sourceLevelId": 151,
      "lowerBound": 16,
      "upperBound": 17,
      "routeReplayComplete": true,
      "reportSha256": "c5e12bf29ca1eaabfa3679f1ad298df6fbaa60c49e283bf0cc1d7fac5a81fa5b",
      "routeSha256": "9ca98c1581c3657ad3565cc6ec8447b5d46fb292d36b149a7bf13e93a59aba62",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "9b02b1af7cf57c88acb487dda0017846ee0497c2a973225f750663c032262b94",
      "designReportSha256": "8049919a0d1837014a398b1830ddf61fa1b6e9690113bde7db3ec9d36295b2ff",
      "runtimeReportSha256": "2d6d3d910925de2dae8d7a164549e242495537e1d2621969898d9dcc51faef36",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-mechanisms-flip-door-150-d2-05",
    "stageKey": "mechanisms-flip-door-150",
    "difficulty": 2,
    "slot": 5,
    "sourceLevelId": 151,
    "layoutSha256": "968bdc123806989d4a27f4a04f7fded6c1fcce280c430a58f6673b52edd7661c",
    "admittedInRevision": "0441926be6efbfb5de159c67aac1bf636fd27a6cf28c0b61ec8123853288e02a",
    "dailyMechanisms": [
      "color-exit",
      "flip-door"
    ],
    "level": {
      "id": 151,
      "name": "每日挑战 flip-door 2-5",
      "difficulty": "super",
      "reward": 0,
      "width": 5,
      "height": 6,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ]
      ],
      "timeSeconds": 90,
      "parMoves": 29,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-151-11692468-b0",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-151-11692468-b1",
          "x": 1,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-151-11692468-b2",
          "x": 3,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-151-11692468-b3",
          "x": 3,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-151-11692468-b4",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-151-11692468-b5",
          "x": 1,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-151-11692468-b6",
          "x": 3,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-151-11692468-b7",
          "x": 1,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-151-11692468-b8",
          "x": 0,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              2,
              1
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-151-11692468-b9",
          "x": 3,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "orange"
        }
      ],
      "gates": [
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "left",
          "offset": 4,
          "size": 2
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "left",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "top",
          "offset": 2,
          "size": 1
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "right",
          "offset": 4,
          "size": 2
        },
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "bottom",
          "offset": 3,
          "size": 2
        }
      ],
      "flipDoors": [
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "right",
          "offset": 0,
          "size": 1,
          "initiallyOpen": false
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "right",
          "offset": 1,
          "size": 1,
          "initiallyOpen": false
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "bottom",
          "offset": 2,
          "size": 1,
          "initiallyOpen": true
        }
      ]
    },
    "proof": {
      "levelSha256": "968bdc123806989d4a27f4a04f7fded6c1fcce280c430a58f6673b52edd7661c",
      "sourceLevelId": 151,
      "lowerBound": 21,
      "upperBound": 21,
      "routeReplayComplete": true,
      "reportSha256": "58f497c2144fdc3759ce749953d48a57566b5770d6b73906e56aae3509dedfa9",
      "routeSha256": "f7003f9a4067fac879c2ae8ff04933813eb6b0483dac826d26057bd2a912c143",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "968bdc123806989d4a27f4a04f7fded6c1fcce280c430a58f6673b52edd7661c",
      "designReportSha256": "8049919a0d1837014a398b1830ddf61fa1b6e9690113bde7db3ec9d36295b2ff",
      "runtimeReportSha256": "0d8b1f5400731213edafaa0942158eed605526fc3fae0f64cf99167f8f30a3c9",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-mechanisms-flip-door-150-d3-01",
    "stageKey": "mechanisms-flip-door-150",
    "difficulty": 3,
    "slot": 1,
    "sourceLevelId": 18,
    "layoutSha256": "6d7db924f3b144dfa12d3d476f0701a28871467878f1b8d3d03595c037b888e4",
    "admittedInRevision": "abeb78cf05202c6044fcf25a56ad27ed69a8b0cc701460ff5b3dd24875b943dc",
    "dailyMechanisms": [
      "color-exit",
      "flip-door"
    ],
    "level": {
      "id": 18,
      "name": "每日挑战 flip-door 3-1",
      "difficulty": "super",
      "reward": 0,
      "width": 5,
      "height": 8,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ],
        [
          0,
          7
        ],
        [
          1,
          7
        ],
        [
          2,
          7
        ],
        [
          3,
          7
        ],
        [
          4,
          7
        ]
      ],
      "timeSeconds": 75,
      "parMoves": 28,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-18-7154331-b0",
          "x": 0,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-18-7154331-b1",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-18-7154331-b2",
          "x": 2,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-18-7154331-b3",
          "x": 4,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-18-7154331-b4",
          "x": 1,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-18-7154331-b5",
          "x": 0,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-18-7154331-b6",
          "x": 2,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-18-7154331-b7",
          "x": 4,
          "y": 7,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-18-7154331-b8",
          "x": 3,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-18-7154331-b9",
          "x": 2,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-18-7154331-b10",
          "x": 2,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-18-7154331-b11",
          "x": 1,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-18-7154331-b12",
          "x": 3,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-18-7154331-b13",
          "x": 0,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-18-7154331-b14",
          "x": 2,
          "y": 3,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-18-7154331-b15",
          "x": 1,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              2,
              1
            ]
          ],
          "color": "pink"
        }
      ],
      "gates": [
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "top",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "bottom",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "top",
          "offset": 0,
          "size": 1
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "right",
          "offset": 1,
          "size": 2
        }
      ],
      "flipDoors": [
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "left",
          "offset": 6,
          "size": 2,
          "initiallyOpen": true
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "left",
          "offset": 2,
          "size": 2,
          "initiallyOpen": true
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "right",
          "offset": 4,
          "size": 1,
          "initiallyOpen": false
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "right",
          "offset": 6,
          "size": 2,
          "initiallyOpen": true
        }
      ]
    },
    "proof": {
      "levelSha256": "6d7db924f3b144dfa12d3d476f0701a28871467878f1b8d3d03595c037b888e4",
      "sourceLevelId": 18,
      "lowerBound": 31,
      "upperBound": 31,
      "routeReplayComplete": true,
      "reportSha256": "929fb7ecbc7111f8c77b6fba5f2c8306982698f92dbdab2c40672ac4de2cacac",
      "routeSha256": "2a17937134f011bb88cd31696d694653d5b9df12e49cb1b80c8d090f2671f5d4",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "6d7db924f3b144dfa12d3d476f0701a28871467878f1b8d3d03595c037b888e4",
      "designReportSha256": "8049919a0d1837014a398b1830ddf61fa1b6e9690113bde7db3ec9d36295b2ff",
      "runtimeReportSha256": "be658b29cfc928960c89ea1f040cb413a773f66be3535ee12e24a723340f4835",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-mechanisms-axis-block-50-d1-05",
    "stageKey": "mechanisms-axis-block-50",
    "difficulty": 1,
    "slot": 5,
    "sourceLevelId": 80,
    "layoutSha256": "af25dad339af43b6ffea3fca54045ed25c9412f8be5eda10f41a06eb9f4a8f0d",
    "admittedInRevision": "24085040481706f291f5b37126baf2eb1557a0be53a3c839a06107bf5c45a699",
    "dailyMechanisms": [
      "color-exit",
      "axis-block",
      "irregular-block",
      "irregular-board"
    ],
    "level": {
      "id": 80,
      "name": "每日挑战 axis-block 1-5",
      "difficulty": "hard",
      "reward": 0,
      "width": 5,
      "height": 7,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ]
      ],
      "timeSeconds": 180,
      "parMoves": 34,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-80-9992374-b0",
          "x": 4,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-80-9992374-b1",
          "x": 1,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "red",
          "movementAxis": "horizontal"
        },
        {
          "id": "v3-80-9992374-b2",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-80-9992374-b3",
          "x": 3,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-80-9992374-b4",
          "x": 2,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-80-9992374-b5",
          "x": 1,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-80-9992374-b6",
          "x": 0,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-80-9992374-b7",
          "x": 3,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-80-9992374-b8",
          "x": 1,
          "y": 5,
          "shape": [
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              2,
              1
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-80-9992374-b9",
          "x": 1,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "green",
          "movementAxis": "horizontal"
        },
        {
          "id": "v3-80-9992374-b10",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-80-9992374-b11",
          "x": 3,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "cyan"
        }
      ],
      "gates": [
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "left",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "bottom",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "right",
          "offset": 4,
          "size": 2
        },
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "right",
          "offset": 3,
          "size": 1
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "left",
          "offset": 4,
          "size": 2
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "top",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "left",
          "offset": 0,
          "size": 1
        },
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "left",
          "offset": 1,
          "size": 1
        }
      ]
    },
    "proof": {
      "levelSha256": "af25dad339af43b6ffea3fca54045ed25c9412f8be5eda10f41a06eb9f4a8f0d",
      "sourceLevelId": 80,
      "lowerBound": 16,
      "upperBound": 16,
      "routeReplayComplete": true,
      "reportSha256": "f615c40c8e3dd9af1e2d89642fc2cc71713aa1e8812ea7ba7b4123bd57e826fb",
      "routeSha256": "17861ec5fd8e85e6eedc4dd4e64d72c3984158542006b88df994af49a9f7b246",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "af25dad339af43b6ffea3fca54045ed25c9412f8be5eda10f41a06eb9f4a8f0d",
      "designReportSha256": "8049919a0d1837014a398b1830ddf61fa1b6e9690113bde7db3ec9d36295b2ff",
      "runtimeReportSha256": "cfc5b355b076245cd4e80cfc2cb9768b813fe487f567fb6bd8ff1a2bfa4135ca",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-mechanisms-axis-block-50-d2-01",
    "stageKey": "mechanisms-axis-block-50",
    "difficulty": 2,
    "slot": 1,
    "sourceLevelId": 50,
    "layoutSha256": "af1efbe2f99aa23c317dbce9a9a10ef55887e844bbb41c2a4fbf44644313a998",
    "admittedInRevision": "e6c6e7b6d0c6c7bfd4fdac277de9cf6a33a2565cb9138e590ed73fa9a1da0eee",
    "dailyMechanisms": [
      "color-exit",
      "axis-block",
      "irregular-block"
    ],
    "level": {
      "id": 50,
      "name": "每日挑战 axis-block 2-1",
      "difficulty": "super",
      "reward": 0,
      "width": 5,
      "height": 9,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ],
        [
          0,
          7
        ],
        [
          1,
          7
        ],
        [
          2,
          7
        ],
        [
          3,
          7
        ],
        [
          4,
          7
        ],
        [
          0,
          8
        ],
        [
          1,
          8
        ],
        [
          2,
          8
        ],
        [
          3,
          8
        ],
        [
          4,
          8
        ]
      ],
      "timeSeconds": 135,
      "parMoves": 18,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-50-7310537-b0",
          "x": 3,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-50-7310537-b1",
          "x": 4,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-50-7310537-b2",
          "x": 2,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-50-7310537-b3",
          "x": 3,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-50-7310537-b4",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-50-7310537-b5",
          "x": 1,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-50-7310537-b6",
          "x": 0,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "yellow",
          "movementAxis": "vertical"
        },
        {
          "id": "v3-50-7310537-b7",
          "x": 2,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-50-7310537-b8",
          "x": 1,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-50-7310537-b9",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-50-7310537-b10",
          "x": 4,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-50-7310537-b11",
          "x": 0,
          "y": 8,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "cyan",
          "movementAxis": "horizontal"
        },
        {
          "id": "v3-50-7310537-b12",
          "x": 1,
          "y": 7,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-50-7310537-b13",
          "x": 3,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-50-7310537-b14",
          "x": 4,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-50-7310537-b15",
          "x": 2,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "pink",
          "movementAxis": "vertical"
        }
      ],
      "gates": [
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "top",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "left",
          "offset": 6,
          "size": 2
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "bottom",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "top",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "bottom",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "left",
          "offset": 4,
          "size": 2
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "left",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "right",
          "offset": 8,
          "size": 1
        }
      ]
    },
    "proof": {
      "levelSha256": "af1efbe2f99aa23c317dbce9a9a10ef55887e844bbb41c2a4fbf44644313a998",
      "sourceLevelId": 50,
      "lowerBound": 21,
      "upperBound": 23,
      "routeReplayComplete": true,
      "reportSha256": "e05e36debba6b1f72188168588a168a6f2773ba77aacfc829e2e9b182bc36050",
      "routeSha256": "74448c92c5248befbf007d42dc2149e932a640ce55ad80681e7fcf7d84713f83",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "af1efbe2f99aa23c317dbce9a9a10ef55887e844bbb41c2a4fbf44644313a998",
      "designReportSha256": "8049919a0d1837014a398b1830ddf61fa1b6e9690113bde7db3ec9d36295b2ff",
      "runtimeReportSha256": "a47f279cf7c6b3465aa14dde444abf960534063cb85a98a2229bc7607e9843f9",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-mechanisms-multilayer-shell-15-d1-05",
    "stageKey": "mechanisms-multilayer-shell-15",
    "difficulty": 1,
    "slot": 5,
    "sourceLevelId": 14,
    "layoutSha256": "c15b542d2554d962b731984c3829cb8ad6d9b3126f24d273e6dfa68fc3d70002",
    "admittedInRevision": "0c90633b08513ff4ea6154cc4ba31a641fd6282d7c971782e5e661236aca328e",
    "dailyMechanisms": [
      "color-exit",
      "multilayer-shell",
      "irregular-block"
    ],
    "level": {
      "id": 14,
      "name": "每日挑战 multilayer-shell 1-5",
      "difficulty": "hard",
      "reward": 0,
      "width": 5,
      "height": 7,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ]
      ],
      "timeSeconds": 120,
      "parMoves": 39,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-14-9911964-b1",
          "x": 3,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-14-9911964-b2",
          "x": 2,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-14-9911964-b6",
          "x": 3,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-14-9911964-b7",
          "x": 2,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              2,
              1
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-14-9911964-b8",
          "x": 1,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-14-9911964-b10",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-14-9911964-b9",
          "x": 0,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-14-9911964-b0",
          "x": 2,
          "y": 0,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "pink",
          "layers": [
            "pink",
            "purple"
          ]
        },
        {
          "id": "v3-14-9911964-b3",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-14-9911964-b5",
          "x": 0,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "orange",
          "layers": [
            "orange",
            "pink"
          ]
        },
        {
          "id": "v3-14-9911964-b4",
          "x": 1,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-14-1763459255-b11",
          "x": 3,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              0,
              2
            ],
            [
              1,
              2
            ]
          ],
          "color": "blue"
        }
      ],
      "gates": [
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "top",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "top",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "left",
          "offset": 5,
          "size": 2
        },
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "right",
          "offset": 4,
          "size": 2
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "bottom",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "bottom",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "right",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "left",
          "offset": 1,
          "size": 2
        }
      ]
    },
    "proof": {
      "levelSha256": "c15b542d2554d962b731984c3829cb8ad6d9b3126f24d273e6dfa68fc3d70002",
      "sourceLevelId": 14,
      "lowerBound": 16,
      "upperBound": 19,
      "routeReplayComplete": true,
      "reportSha256": "1147376e1d47f9f11525c0ad334d046bb2debf544d71804702d7ca6e5b408cb1",
      "routeSha256": "66d6d10e6f311f86cccbf617e83a39689ff651e076d1ebf4dcb86b50d77971a0",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "c15b542d2554d962b731984c3829cb8ad6d9b3126f24d273e6dfa68fc3d70002",
      "designReportSha256": "8049919a0d1837014a398b1830ddf61fa1b6e9690113bde7db3ec9d36295b2ff",
      "runtimeReportSha256": "fc61c2552dcd45c0e76b657dd485980a422ee53cb44caef188fb8fdd0fc14509",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-mechanisms-multilayer-shell-15-d2-03",
    "stageKey": "mechanisms-multilayer-shell-15",
    "difficulty": 2,
    "slot": 3,
    "sourceLevelId": 11,
    "layoutSha256": "1c23d615a6ea44275476222a3b195247207b9dac039b3caa1b153f9703f619e0",
    "admittedInRevision": "37682ee06485a5b422fa113edacab4acad4b11bd54789fcf7b7bbcbb0292cdd1",
    "dailyMechanisms": [
      "color-exit",
      "multilayer-shell",
      "irregular-block",
      "irregular-board"
    ],
    "level": {
      "id": 11,
      "name": "每日挑战 multilayer-shell 2-3",
      "difficulty": "super",
      "reward": 0,
      "width": 6,
      "height": 8,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          5,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          5,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          5,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          5,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          5,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ],
        [
          5,
          6
        ],
        [
          0,
          7
        ],
        [
          1,
          7
        ],
        [
          2,
          7
        ]
      ],
      "blocked": [],
      "timeSeconds": 120,
      "parMoves": 36,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-11-6903314-b0",
          "x": 3,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-11-6903314-b1",
          "x": 3,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-11-6903314-b2",
          "x": 4,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "orange",
          "layers": [
            "orange",
            "pink"
          ]
        },
        {
          "id": "v3-11-6903314-b3",
          "x": 3,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "yellow",
          "layers": [
            "yellow",
            "cyan"
          ]
        },
        {
          "id": "v3-11-6903314-b4",
          "x": 4,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-11-6903314-b5",
          "x": 1,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-11-6903314-b6",
          "x": 2,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-11-6903314-b7",
          "x": 0,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-11-6903314-b8",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "red",
          "layers": [
            "red",
            "orange"
          ]
        },
        {
          "id": "v3-11-6903314-b9",
          "x": 0,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-11-6903314-b10",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-11-6903314-b11",
          "x": 1,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              0,
              2
            ],
            [
              1,
              2
            ]
          ],
          "color": "cyan"
        }
      ],
      "gates": [
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "left",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "left",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "right",
          "offset": 5,
          "size": 2
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "left",
          "offset": 6,
          "size": 2
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "right",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "bottom",
          "offset": 0,
          "size": 1
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "bottom",
          "offset": 1,
          "size": 2
        }
      ]
    },
    "proof": {
      "levelSha256": "1c23d615a6ea44275476222a3b195247207b9dac039b3caa1b153f9703f619e0",
      "sourceLevelId": 11,
      "lowerBound": 21,
      "upperBound": 21,
      "routeReplayComplete": true,
      "reportSha256": "fd49eafdf4401170ca889de45672df580e7b3ddb22f24c57f1628a28e3aa3c96",
      "routeSha256": "fe6074def227ed067c35687364fcf1e442aa6deca54028d4a9bc386847ce6491",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "1c23d615a6ea44275476222a3b195247207b9dac039b3caa1b153f9703f619e0",
      "designReportSha256": "8049919a0d1837014a398b1830ddf61fa1b6e9690113bde7db3ec9d36295b2ff",
      "runtimeReportSha256": "af4439c79dc46f1e872dee371b0fb72aab1d58caddac65d1fe11e8ca06afefce",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-mechanisms-colored-grid-200-d1-02",
    "stageKey": "mechanisms-colored-grid-200",
    "difficulty": 1,
    "slot": 2,
    "sourceLevelId": 122,
    "layoutSha256": "988c56da5969c6f0c22ec1891aed3475d78a9d23558f929aefbe1264a6ac1377",
    "admittedInRevision": "bb43250c53aa4acb4bc2da78274a9120d6602a61c2b0f7a0499b49069330af7c",
    "dailyMechanisms": [
      "color-exit",
      "irregular-block",
      "colored-grid"
    ],
    "level": {
      "id": 122,
      "name": "每日挑战 colored-grid 1-2",
      "difficulty": "hard",
      "reward": 0,
      "width": 6,
      "height": 8,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          5,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          5,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          5,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          5,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          5,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          5,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ],
        [
          5,
          6
        ],
        [
          0,
          7
        ],
        [
          1,
          7
        ],
        [
          2,
          7
        ],
        [
          3,
          7
        ],
        [
          4,
          7
        ],
        [
          5,
          7
        ]
      ],
      "timeSeconds": 90,
      "parMoves": 42,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-122-7925725-b0",
          "x": 4,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-122-7925725-b1",
          "x": 3,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-122-7925725-b2",
          "x": 5,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-122-7925725-b3",
          "x": 4,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-122-7925725-b4",
          "x": 3,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-122-7925725-b5",
          "x": 4,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-122-7925725-b6",
          "x": 2,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-122-7925725-b7",
          "x": 3,
          "y": 6,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-122-7925725-b8",
          "x": 1,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-122-7925725-b9",
          "x": 3,
          "y": 4,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-122-7925725-b10",
          "x": 1,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-122-7925725-b11",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-122-7925725-b12",
          "x": 0,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-122-7925725-b13",
          "x": 0,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-122-7925725-b14",
          "x": 1,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              0,
              2
            ],
            [
              1,
              2
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-122-7925725-b15",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "cyan"
        }
      ],
      "gates": [
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "left",
          "offset": 4,
          "size": 1
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "bottom",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "bottom",
          "offset": 4,
          "size": 2
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "right",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "left",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "top",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "right",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "right",
          "offset": 0,
          "size": 1
        }
      ],
      "coloredGrids": [
        {
          "id": "daily-mechanisms-colored-grid-200-d1-02-grid-0",
          "color": "yellow",
          "cells": [
            [
              4,
              2
            ]
          ]
        },
        {
          "id": "daily-mechanisms-colored-grid-200-d1-02-grid-1",
          "color": "green",
          "cells": [
            [
              0,
              3
            ]
          ]
        }
      ]
    },
    "proof": {
      "levelSha256": "988c56da5969c6f0c22ec1891aed3475d78a9d23558f929aefbe1264a6ac1377",
      "sourceLevelId": 122,
      "lowerBound": 16,
      "upperBound": 19,
      "routeReplayComplete": true,
      "reportSha256": "362d9c088fb2644a8b3ef9dec0573b9232b6a7338d9a9c7f018ff433c69fad90",
      "routeSha256": "7285146c2e025dcbb98b59987f43593e313f70253a9aecb3665edb90e87ca2da",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "988c56da5969c6f0c22ec1891aed3475d78a9d23558f929aefbe1264a6ac1377",
      "designReportSha256": "8049919a0d1837014a398b1830ddf61fa1b6e9690113bde7db3ec9d36295b2ff",
      "runtimeReportSha256": "22e747452f33b18b878345e1449f67446e42c9fcf22baf1eb114cd428d251e56",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-mechanisms-colored-grid-200-d1-03",
    "stageKey": "mechanisms-colored-grid-200",
    "difficulty": 1,
    "slot": 3,
    "sourceLevelId": 1,
    "layoutSha256": "21c803649fda1519ea5b673fe2d8068e4a1d87b15bef7f68fc8ba83ab8cbe077",
    "admittedInRevision": "92d800f474cbbd378e49a4cabdec6f825f2974fe0b61a17c3b5d70de87a5bd52",
    "dailyMechanisms": [
      "color-exit",
      "colored-grid"
    ],
    "level": {
      "id": 1,
      "name": "每日挑战 colored-grid 1-3",
      "difficulty": "hard",
      "reward": 0,
      "width": 5,
      "height": 5,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ]
      ],
      "timeSeconds": 180,
      "parMoves": 3,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-1-6705683-b0",
          "x": 0,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-1-6705683-b1",
          "x": 3,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-1-6705683-b2",
          "x": 3,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-1-6705683-b3",
          "x": 2,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-1-6705683-b4",
          "x": 4,
          "y": 0,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-1-6705683-b5",
          "x": 1,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-1-6705683-b6",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-1-6705683-b7",
          "x": 2,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-1-6705683-b8",
          "x": 0,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              0,
              2
            ],
            [
              1,
              2
            ]
          ],
          "color": "pink"
        }
      ],
      "gates": [
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "left",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "top",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "bottom",
          "offset": 2,
          "size": 1
        },
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "right",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "bottom",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "left",
          "offset": 1,
          "size": 1
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "bottom",
          "offset": 1,
          "size": 1
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "top",
          "offset": 0,
          "size": 2
        }
      ],
      "coloredGrids": [
        {
          "id": "daily-mechanisms-colored-grid-200-d1-03-grid-0",
          "color": "green",
          "cells": [
            [
              4,
              2
            ]
          ]
        },
        {
          "id": "daily-mechanisms-colored-grid-200-d1-03-grid-1",
          "color": "yellow",
          "cells": [
            [
              4,
              0
            ]
          ]
        }
      ]
    },
    "proof": {
      "levelSha256": "21c803649fda1519ea5b673fe2d8068e4a1d87b15bef7f68fc8ba83ab8cbe077",
      "sourceLevelId": 1,
      "lowerBound": 16,
      "upperBound": 17,
      "routeReplayComplete": true,
      "reportSha256": "0a050263de1f11fe86e37519f27662af19e0abea69f46c4d7c0f74688ae47a12",
      "routeSha256": "ce7df4bf82bcce7c20d41cae72520962dd99757e8adef3182e47e33a38e643b1",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "21c803649fda1519ea5b673fe2d8068e4a1d87b15bef7f68fc8ba83ab8cbe077",
      "designReportSha256": "8049919a0d1837014a398b1830ddf61fa1b6e9690113bde7db3ec9d36295b2ff",
      "runtimeReportSha256": "56746bb3ec81e5e93cef264c70d2eac2b830b5659197ee29d7804734c4362f51",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-mechanisms-generator-35-d2-01",
    "stageKey": "mechanisms-generator-35",
    "difficulty": 2,
    "slot": 1,
    "sourceLevelId": 149,
    "layoutSha256": "925b037a326d35db5f0ec8d7712f643d25daf2e4618ca6357f7d830357f69a90",
    "admittedInRevision": "6d62af018e60057fb6b75a641f5b86e1a50dd6d6b4b63c13e7c33db352cc2108",
    "dailyMechanisms": [
      "color-exit",
      "generator"
    ],
    "level": {
      "id": 149,
      "name": "每日挑战 generator 2-1",
      "difficulty": "super",
      "reward": 0,
      "width": 8,
      "height": 10,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          5,
          0
        ],
        [
          6,
          0
        ],
        [
          7,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          5,
          1
        ],
        [
          6,
          1
        ],
        [
          7,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          5,
          2
        ],
        [
          6,
          2
        ],
        [
          7,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          5,
          3
        ],
        [
          6,
          3
        ],
        [
          7,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          5,
          4
        ],
        [
          6,
          4
        ],
        [
          7,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          5,
          5
        ],
        [
          6,
          5
        ],
        [
          7,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ],
        [
          5,
          6
        ],
        [
          6,
          6
        ],
        [
          7,
          6
        ],
        [
          0,
          7
        ],
        [
          1,
          7
        ],
        [
          2,
          7
        ],
        [
          3,
          7
        ],
        [
          4,
          7
        ],
        [
          5,
          7
        ],
        [
          6,
          7
        ],
        [
          7,
          7
        ],
        [
          0,
          8
        ],
        [
          1,
          8
        ],
        [
          2,
          8
        ],
        [
          3,
          8
        ],
        [
          4,
          8
        ],
        [
          5,
          8
        ],
        [
          6,
          8
        ],
        [
          7,
          8
        ],
        [
          0,
          9
        ],
        [
          1,
          9
        ],
        [
          2,
          9
        ],
        [
          3,
          9
        ],
        [
          4,
          9
        ],
        [
          5,
          9
        ],
        [
          6,
          9
        ],
        [
          7,
          9
        ]
      ],
      "timeSeconds": 140,
      "parMoves": 78,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-149-7690006-b0",
          "x": 7,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-149-7690006-b1",
          "x": 5,
          "y": 9,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-149-7690006-b2",
          "x": 4,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-149-7690006-b3",
          "x": 0,
          "y": 9,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-149-7690006-b4",
          "x": 5,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-149-7690006-b5",
          "x": 2,
          "y": 9,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-149-7690006-b6",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-149-7690006-b7",
          "x": 3,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-149-7690006-b8",
          "x": 4,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-149-7690006-b9",
          "x": 0,
          "y": 8,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-149-7690006-b10",
          "x": 3,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-149-7690006-b11",
          "x": 5,
          "y": 8,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-149-7690006-b12",
          "x": 4,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-149-7690006-b13",
          "x": 6,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-149-7690006-b14",
          "x": 5,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-149-7690006-b15",
          "x": 7,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-149-7690006-b16",
          "x": 6,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-149-7690006-b17",
          "x": 5,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-149-7690006-b18",
          "x": 5,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-149-7690006-b19",
          "x": 0,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-149-7690006-b20",
          "x": 2,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-149-7690006-b21",
          "x": 1,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-149-7690006-b22",
          "x": 2,
          "y": 7,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-149-7690006-b23",
          "x": 0,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-149-7690006-b24",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-149-7690006-b25",
          "x": 0,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              2,
              1
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-149-7690006-b26",
          "x": 1,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-149-7690006-b27",
          "x": 3,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              0,
              2
            ],
            [
              1,
              2
            ]
          ],
          "color": "pink"
        },
        {
          "id": "small-cargo-0-0",
          "color": "pink",
          "x": 7,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ]
        },
        {
          "id": "small-cargo-0-1",
          "color": "red",
          "x": 7,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ]
        },
        {
          "id": "small-cargo-0-2",
          "color": "pink",
          "x": 7,
          "y": 5,
          "shape": [
            [
              0,
              0
            ]
          ]
        },
        {
          "id": "small-cargo-0-3",
          "color": "red",
          "x": 7,
          "y": 5,
          "shape": [
            [
              0,
              0
            ]
          ]
        },
        {
          "id": "small-cargo-1-0",
          "color": "pink",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ]
          ]
        },
        {
          "id": "small-cargo-1-1",
          "color": "red",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ]
          ]
        },
        {
          "id": "small-cargo-1-2",
          "color": "pink",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ]
          ]
        },
        {
          "id": "small-cargo-1-3",
          "color": "red",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ]
          ]
        },
        {
          "id": "small-cargo-2-0",
          "color": "blue",
          "x": 2,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ]
        },
        {
          "id": "small-cargo-2-1",
          "color": "pink",
          "x": 2,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ]
        },
        {
          "id": "small-cargo-2-2",
          "color": "blue",
          "x": 2,
          "y": 0,
          "shape": [
            [
              0,
              0
            ]
          ]
        },
        {
          "id": "small-cargo-2-3",
          "color": "pink",
          "x": 2,
          "y": 0,
          "shape": [
            [
              0,
              0
            ]
          ]
        }
      ],
      "gates": [
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "bottom",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "left",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "top",
          "offset": 4,
          "size": 2
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "top",
          "offset": 6,
          "size": 2
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "left",
          "offset": 3,
          "size": 1
        },
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "right",
          "offset": 2,
          "size": 2
        }
      ],
      "generators": [
        {
          "id": "small-machine-0",
          "side": "right",
          "offset": 5,
          "rimSpan": 3,
          "rimMount": "rim",
          "spawn": [
            7,
            5
          ],
          "queueBlockIds": [
            "small-cargo-0-0",
            "small-cargo-0-1",
            "small-cargo-0-2",
            "small-cargo-0-3"
          ]
        },
        {
          "id": "small-machine-1",
          "side": "left",
          "offset": 5,
          "rimSpan": 3,
          "rimMount": "rim",
          "spawn": [
            0,
            5
          ],
          "queueBlockIds": [
            "small-cargo-1-0",
            "small-cargo-1-1",
            "small-cargo-1-2",
            "small-cargo-1-3"
          ]
        },
        {
          "id": "small-machine-2",
          "side": "top",
          "offset": 2,
          "rimSpan": 3,
          "rimMount": "rim",
          "spawn": [
            2,
            0
          ],
          "queueBlockIds": [
            "small-cargo-2-0",
            "small-cargo-2-1",
            "small-cargo-2-2",
            "small-cargo-2-3"
          ]
        }
      ]
    },
    "proof": {
      "levelSha256": "925b037a326d35db5f0ec8d7712f643d25daf2e4618ca6357f7d830357f69a90",
      "sourceLevelId": 149,
      "lowerBound": 21,
      "upperBound": 27,
      "routeReplayComplete": true,
      "reportSha256": "cb4ab66b07df42711ae761a8c2566b3c073c1ace0421cd63a9425715c8f1745f",
      "routeSha256": "298b0579900ff33f7cc3a7cb5637e91dbbf53c47a16ebacb34310cae4cb4f4a8",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "925b037a326d35db5f0ec8d7712f643d25daf2e4618ca6357f7d830357f69a90",
      "designReportSha256": "8049919a0d1837014a398b1830ddf61fa1b6e9690113bde7db3ec9d36295b2ff",
      "runtimeReportSha256": "62235316df0c246a564ac08b9e1a9875ef718d408f16dacf22a9bc7d3634f91b",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-mechanisms-key-lock-59-d1-01",
    "stageKey": "mechanisms-key-lock-59",
    "difficulty": 1,
    "slot": 1,
    "sourceLevelId": 18,
    "layoutSha256": "426b5ab4fb118b6c06f505d5daf450446fe73e43eb28c188962cf5e666677543",
    "admittedInRevision": "67a9ce11e7a02857ed6d92ad93f3bbcdf16fd45679b95f4e75e25a930597efe2",
    "dailyMechanisms": [
      "color-exit",
      "key-lock"
    ],
    "level": {
      "id": 18,
      "name": "每日挑战 key-lock 1-1",
      "difficulty": "hard",
      "reward": 0,
      "width": 5,
      "height": 8,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ],
        [
          0,
          7
        ],
        [
          1,
          7
        ],
        [
          2,
          7
        ],
        [
          3,
          7
        ],
        [
          4,
          7
        ]
      ],
      "timeSeconds": 75,
      "parMoves": 28,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-18-6963561-b0",
          "x": 0,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-18-6963561-b1",
          "x": 3,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-18-6963561-b2",
          "x": 2,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-18-6963561-b3",
          "x": 0,
          "y": 6,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-18-6963561-b4",
          "x": 1,
          "y": 6,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "red",
          "lockedBy": "daily-mechanisms-key-lock-59-d1-01-shared-key",
          "lockCount": 3
        },
        {
          "id": "v3-18-6963561-b5",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "blue",
          "lockedBy": "daily-mechanisms-key-lock-59-d1-01-shared-key",
          "lockCount": 2
        },
        {
          "id": "v3-18-6963561-b6",
          "x": 4,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-18-6963561-b7",
          "x": 2,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "green",
          "keyId": "daily-mechanisms-key-lock-59-d1-01-shared-key"
        },
        {
          "id": "v3-18-6963561-b8",
          "x": 2,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-18-6963561-b9",
          "x": 3,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-18-6963561-b10",
          "x": 2,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-18-6963561-b11",
          "x": 2,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "blue",
          "keyId": "daily-mechanisms-key-lock-59-d1-01-shared-key"
        },
        {
          "id": "v3-18-6963561-b12",
          "x": 1,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-18-6963561-b13",
          "x": 0,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-18-6963561-b14",
          "x": 0,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "orange",
          "keyId": "daily-mechanisms-key-lock-59-d1-01-shared-key"
        },
        {
          "id": "v3-18-6963561-b15",
          "x": 1,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "green"
        }
      ],
      "gates": [
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "right",
          "offset": 5,
          "size": 2
        },
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "right",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "right",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "top",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "top",
          "offset": 0,
          "size": 1
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "left",
          "offset": 4,
          "size": 2
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "left",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "bottom",
          "offset": 1,
          "size": 2
        }
      ]
    },
    "proof": {
      "levelSha256": "426b5ab4fb118b6c06f505d5daf450446fe73e43eb28c188962cf5e666677543",
      "sourceLevelId": 18,
      "lowerBound": 16,
      "upperBound": 19,
      "routeReplayComplete": true,
      "reportSha256": "202a0b3a605f1fb79fb1a27a4f0f9e614ae2b195dc63e1d3e9e00ab1808ff411",
      "routeSha256": "e14cdd42ae56fe3c2d71606098254fa2bc943523962662315831e276e36c5c05",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "426b5ab4fb118b6c06f505d5daf450446fe73e43eb28c188962cf5e666677543",
      "designReportSha256": "8049919a0d1837014a398b1830ddf61fa1b6e9690113bde7db3ec9d36295b2ff",
      "runtimeReportSha256": "27723ba38d84ba7684f0815d2aee8a3cc5b77b3a386ee6f3d678c97894457387",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-mechanisms-key-lock-59-d1-04",
    "stageKey": "mechanisms-key-lock-59",
    "difficulty": 1,
    "slot": 4,
    "sourceLevelId": 200,
    "layoutSha256": "52a57b19baab4cf2d6838c8fe6754ae6be33b48e689fbec730c9c12c1ba4b151",
    "admittedInRevision": "0e7fe9fed94f92907430fb1f74a3f1c2f84c33eab2c47e96f72ecbfee039c049",
    "dailyMechanisms": [
      "color-exit",
      "key-lock",
      "irregular-block"
    ],
    "level": {
      "id": 200,
      "name": "每日挑战 key-lock 1-4",
      "difficulty": "hard",
      "reward": 0,
      "width": 6,
      "height": 8,
      "timeSeconds": 75,
      "parMoves": 21,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-200-8370206-b0",
          "x": 4,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-200-8370206-b1",
          "x": 5,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-200-8370206-b2",
          "x": 1,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-200-8370206-b3",
          "x": 3,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "blue",
          "keyId": "daily-mechanisms-key-lock-59-d1-04-shared-key"
        },
        {
          "id": "v3-200-8370206-b4",
          "x": 4,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-200-8370206-b5",
          "x": 5,
          "y": 5,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-200-8370206-b6",
          "x": 0,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "red",
          "lockedBy": "daily-mechanisms-key-lock-59-d1-04-shared-key",
          "lockCount": 2
        },
        {
          "id": "v3-200-8370206-b7",
          "x": 3,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-200-8370206-b8",
          "x": 4,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-200-8370206-b9",
          "x": 3,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-200-8370206-b10",
          "x": 3,
          "y": 4,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-200-8370206-b11",
          "x": 2,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "purple",
          "keyId": "daily-mechanisms-key-lock-59-d1-04-shared-key"
        },
        {
          "id": "v3-200-8370206-b12",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "red",
          "lockedBy": "daily-mechanisms-key-lock-59-d1-04-shared-key",
          "lockCount": 3
        },
        {
          "id": "v3-200-8370206-b13",
          "x": 0,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              2,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-200-8370206-b14",
          "x": 0,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              2,
              1
            ]
          ],
          "color": "pink",
          "keyId": "daily-mechanisms-key-lock-59-d1-04-shared-key"
        }
      ],
      "gates": [
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "bottom",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "bottom",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "top",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "left",
          "offset": 6,
          "size": 2
        },
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "right",
          "offset": 5,
          "size": 2
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "left",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "right",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "left",
          "offset": 4,
          "size": 2
        }
      ]
    },
    "proof": {
      "levelSha256": "52a57b19baab4cf2d6838c8fe6754ae6be33b48e689fbec730c9c12c1ba4b151",
      "sourceLevelId": 200,
      "lowerBound": 16,
      "upperBound": 16,
      "routeReplayComplete": true,
      "reportSha256": "187a2c1097142d9fc90adaba9b10a35d4fbe1c3e428f9759e5c01bc19cd8c614",
      "routeSha256": "dc7926953f9c316dd14b984856d1308bc569299365a4b1c13b1629099ac4c455",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "52a57b19baab4cf2d6838c8fe6754ae6be33b48e689fbec730c9c12c1ba4b151",
      "designReportSha256": "8049919a0d1837014a398b1830ddf61fa1b6e9690113bde7db3ec9d36295b2ff",
      "runtimeReportSha256": "671964cf1f79f81efe460de87050ae609023f3d618b63181007bd3016f696c5a",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-basic-combined-d1-01",
    "stageKey": "basic-combined",
    "difficulty": 1,
    "slot": 1,
    "sourceLevelId": 1,
    "layoutSha256": "ea9ee2153988366694281ff30d9ac481b84ea561f640883c35b121ac25071319",
    "admittedInRevision": "647a1ee499c2d3055625082ae2e1a02f89bdfc58a375d8b37dfefd7477ac0f8f",
    "dailyMechanisms": [
      "color-exit",
      "frozen-exit"
    ],
    "level": {
      "id": 1,
      "name": "每日挑战 frozen-exit 1-3",
      "difficulty": "hard",
      "reward": 0,
      "width": 5,
      "height": 5,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ]
      ],
      "timeSeconds": 180,
      "parMoves": 3,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-1-9355885-b0",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              3,
              0
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-1-9355885-b1",
          "x": 4,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-1-9355885-b2",
          "x": 0,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-1-9355885-b3",
          "x": 0,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-1-9355885-b4",
          "x": 2,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-1-9355885-b5",
          "x": 4,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-1-9355885-b6",
          "x": 1,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-1-9355885-b7",
          "x": 2,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "orange"
        }
      ],
      "gates": [
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "top",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "top",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "left",
          "offset": 0,
          "size": 1
        },
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "left",
          "offset": 3,
          "size": 2,
          "frozen": 5
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "bottom",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "right",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "bottom",
          "offset": 3,
          "size": 1,
          "frozen": 3
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "right",
          "offset": 4,
          "size": 1
        }
      ]
    },
    "proof": {
      "levelSha256": "ea9ee2153988366694281ff30d9ac481b84ea561f640883c35b121ac25071319",
      "sourceLevelId": 1,
      "lowerBound": 16,
      "upperBound": 20,
      "routeReplayComplete": true,
      "reportSha256": "eaf272da6e39ff9b9b330c47e7371ad503d147ec8a0c00fa314492972c063e1a",
      "routeSha256": "378c3ad44d0cd9b4f85cd63ff5e6e882c0f92c2932913f29d086dc3171788680",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "ea9ee2153988366694281ff30d9ac481b84ea561f640883c35b121ac25071319",
      "designReportSha256": "8049919a0d1837014a398b1830ddf61fa1b6e9690113bde7db3ec9d36295b2ff",
      "runtimeReportSha256": "49d91dca06cc653107bd9cb90cff86944fd21b0114411bcde6eb2647e7fa05eb",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-basic-combined-d1-02",
    "stageKey": "basic-combined",
    "difficulty": 1,
    "slot": 2,
    "sourceLevelId": 118,
    "layoutSha256": "5905e61ec436c8dd57e0e03cfc975d79c85eba232327c46b0b6191bd14fc9377",
    "admittedInRevision": "f647f12f5dbeeafde8b28bc836a5533ea4f86ce0239fbcee3d13e99e4e3c6908",
    "dailyMechanisms": [
      "color-exit",
      "numeric-ice",
      "irregular-block"
    ],
    "level": {
      "id": 118,
      "name": "每日挑战 numeric-ice 1-1",
      "difficulty": "hard",
      "reward": 0,
      "width": 7,
      "height": 8,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          5,
          0
        ],
        [
          6,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          5,
          1
        ],
        [
          6,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          5,
          2
        ],
        [
          6,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          5,
          3
        ],
        [
          6,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          5,
          4
        ],
        [
          6,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          5,
          5
        ],
        [
          6,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ],
        [
          5,
          6
        ],
        [
          6,
          6
        ],
        [
          0,
          7
        ],
        [
          1,
          7
        ],
        [
          2,
          7
        ],
        [
          3,
          7
        ],
        [
          4,
          7
        ],
        [
          5,
          7
        ],
        [
          6,
          7
        ]
      ],
      "timeSeconds": 120,
      "parMoves": 34,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-118-8193806-b0",
          "x": 6,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-118-8193806-b1",
          "x": 3,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-118-8193806-b2",
          "x": 4,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-118-8193806-b3",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              2,
              1
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-118-8193806-b4",
          "x": 1,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "yellow",
          "frozen": 4
        },
        {
          "id": "v3-118-8193806-b5",
          "x": 3,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "yellow",
          "frozen": 3
        },
        {
          "id": "v3-118-8193806-b6",
          "x": 4,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              2,
              1
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-118-8193806-b7",
          "x": 5,
          "y": 2,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-118-8193806-b8",
          "x": 2,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-118-8193806-b9",
          "x": 0,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-118-8193806-b10",
          "x": 0,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-118-8193806-b11",
          "x": 1,
          "y": 4,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-118-8193806-b12",
          "x": 0,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-118-8193806-b13",
          "x": 4,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              2,
              1
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-118-8193806-b14",
          "x": 4,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              2,
              1
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-118-8193806-b15",
          "x": 3,
          "y": 4,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-118-8193806-b16",
          "x": 2,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              0,
              2
            ],
            [
              1,
              2
            ]
          ],
          "color": "purple"
        }
      ],
      "gates": [
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "top",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "right",
          "offset": 5,
          "size": 2
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "left",
          "offset": 5,
          "size": 1
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "right",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "bottom",
          "offset": 4,
          "size": 2
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "bottom",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "top",
          "offset": 5,
          "size": 2
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "right",
          "offset": 1,
          "size": 1
        }
      ]
    },
    "proof": {
      "levelSha256": "5905e61ec436c8dd57e0e03cfc975d79c85eba232327c46b0b6191bd14fc9377",
      "sourceLevelId": 118,
      "lowerBound": 16,
      "upperBound": 16,
      "routeReplayComplete": true,
      "reportSha256": "102e7ac54629ff11ab9f789857755bb41d59a13dcb82e7b0a15418860b106e4f",
      "routeSha256": "9b831ad6ede3b846128d4453a574ff5cb1e90ce09c52037fe0fd60ee72b86ef0",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "5905e61ec436c8dd57e0e03cfc975d79c85eba232327c46b0b6191bd14fc9377",
      "designReportSha256": "8049919a0d1837014a398b1830ddf61fa1b6e9690113bde7db3ec9d36295b2ff",
      "runtimeReportSha256": "81a6a0f549c260386b5c45a62ac48f3d0aa1bf637c3f65e551204b3f321880e6",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-basic-combined-d1-03",
    "stageKey": "basic-combined",
    "difficulty": 1,
    "slot": 3,
    "sourceLevelId": 96,
    "layoutSha256": "5ecee4b528bf02afc414a06be2a14fc6d6e8baafd52f01214e4c51ad6d86a10f",
    "admittedInRevision": "72ceeab5b1e5be4c7bb602a54d63e56dbf06bdff9963da9fa63c3bfaa6dc71c2",
    "dailyMechanisms": [
      "color-exit",
      "irregular-board",
      "shutter"
    ],
    "level": {
      "id": 96,
      "name": "每日挑战 shutter 1-4",
      "difficulty": "hard",
      "reward": 0,
      "width": 8,
      "height": 9,
      "playable": [
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          5,
          0
        ],
        [
          6,
          0
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          5,
          1
        ],
        [
          6,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          5,
          2
        ],
        [
          6,
          2
        ],
        [
          7,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          5,
          3
        ],
        [
          6,
          3
        ],
        [
          7,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          5,
          4
        ],
        [
          6,
          4
        ],
        [
          7,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          5,
          5
        ],
        [
          6,
          5
        ],
        [
          7,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ],
        [
          5,
          6
        ],
        [
          6,
          6
        ],
        [
          7,
          6
        ],
        [
          1,
          7
        ],
        [
          2,
          7
        ],
        [
          3,
          7
        ],
        [
          4,
          7
        ],
        [
          5,
          7
        ],
        [
          6,
          7
        ],
        [
          1,
          8
        ],
        [
          2,
          8
        ],
        [
          3,
          8
        ],
        [
          4,
          8
        ],
        [
          5,
          8
        ],
        [
          6,
          8
        ]
      ],
      "timeSeconds": 180,
      "parMoves": 47,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-96-7718504-b0",
          "x": 4,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "red",
          "shutterId": "daily-mechanisms-shutter-20-d1-04-cover-0"
        },
        {
          "id": "v3-96-7718504-b1",
          "x": 0,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "red",
          "shutterId": "daily-mechanisms-shutter-20-d1-04-cover-1"
        },
        {
          "id": "v3-96-7718504-b2",
          "x": 1,
          "y": 8,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-96-7718504-b3",
          "x": 1,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-96-7718504-b4",
          "x": 7,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-96-7718504-b5",
          "x": 4,
          "y": 8,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-96-7718504-b6",
          "x": 4,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-96-7718504-b7",
          "x": 3,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-96-7718504-b8",
          "x": 4,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-96-7718504-b9",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-96-7718504-b10",
          "x": 0,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-96-7718504-b11",
          "x": 0,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-96-7718504-b12",
          "x": 0,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-96-7718504-b13",
          "x": 1,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-96-7718504-b14",
          "x": 1,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-96-7718504-b15",
          "x": 5,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-96-7718504-b16",
          "x": 5,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-96-7718504-b17",
          "x": 6,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-96-7718504-b18",
          "x": 4,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-96-7718504-b19",
          "x": 5,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-96-7718504-b20",
          "x": 6,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-96-7718504-b21",
          "x": 3,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-96-7718504-b22",
          "x": 3,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              2,
              1
            ]
          ],
          "color": "red"
        }
      ],
      "gates": [
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "bottom",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "left",
          "offset": 4,
          "size": 1
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "bottom",
          "offset": 3,
          "size": 1
        },
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "left",
          "offset": 2,
          "size": 1
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "right",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "right",
          "offset": 4,
          "size": 2
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "bottom",
          "offset": 4,
          "size": 2
        },
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "top",
          "offset": 4,
          "size": 2
        }
      ],
      "shutters": [
        {
          "id": "daily-mechanisms-shutter-20-d1-04-cover-0",
          "x": 4,
          "y": 0,
          "width": 3,
          "height": 1,
          "count": 8
        },
        {
          "id": "daily-mechanisms-shutter-20-d1-04-cover-1",
          "x": 0,
          "y": 6,
          "width": 3,
          "height": 1,
          "count": 16
        }
      ]
    },
    "proof": {
      "levelSha256": "5ecee4b528bf02afc414a06be2a14fc6d6e8baafd52f01214e4c51ad6d86a10f",
      "sourceLevelId": 96,
      "lowerBound": 16,
      "upperBound": 16,
      "routeReplayComplete": true,
      "reportSha256": "352c31c1c05c0158745f310659a5c6e8526a6b65e0362f353c51d72ce434f4d5",
      "routeSha256": "a8bbdd9babfcca654426ba9b871cf87f9586838817ea5675884396367df22cb9",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "5ecee4b528bf02afc414a06be2a14fc6d6e8baafd52f01214e4c51ad6d86a10f",
      "designReportSha256": "8049919a0d1837014a398b1830ddf61fa1b6e9690113bde7db3ec9d36295b2ff",
      "runtimeReportSha256": "dade00eedca9e3c2a257500895818c251b980ed36cbf89c47796c4ef51f3d681",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-basic-combined-d1-04",
    "stageKey": "basic-combined",
    "difficulty": 1,
    "slot": 4,
    "sourceLevelId": 155,
    "layoutSha256": "4afcbd1d2e915ea0965e706e08a01c0c278e427283546066c8903087d2eb1ad0",
    "admittedInRevision": "c5bf26a845f7b465b28b065e41ed0c37cccca31916e7e76fbf1668dfb3ca1142",
    "dailyMechanisms": [
      "color-exit",
      "irregular-block",
      "irregular-board"
    ],
    "level": {
      "id": 155,
      "name": "每日挑战 irregular-board 1-4",
      "difficulty": "hard",
      "reward": 0,
      "width": 5,
      "height": 8,
      "playable": [
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ],
        [
          0,
          7
        ],
        [
          1,
          7
        ],
        [
          2,
          7
        ],
        [
          3,
          7
        ],
        [
          4,
          7
        ]
      ],
      "timeSeconds": 75,
      "parMoves": 39,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-155-11626318-b0",
          "x": 3,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-155-11626318-b1",
          "x": 4,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-155-11626318-b2",
          "x": 0,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-155-11626318-b3",
          "x": 1,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-155-11626318-b4",
          "x": 4,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-155-11626318-b5",
          "x": 0,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-155-11626318-b6",
          "x": 2,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-155-11626318-b7",
          "x": 2,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-155-11626318-b8",
          "x": 4,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-155-11626318-b9",
          "x": 2,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-155-11626318-b10",
          "x": 0,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-155-11626318-b11",
          "x": 1,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-155-11626318-b12",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-155-11626318-b13",
          "x": 0,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-155-11626318-b14",
          "x": 3,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-155-11626318-b15",
          "x": 2,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-155-11626318-b16",
          "x": 2,
          "y": 4,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "red"
        }
      ],
      "gates": [
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "right",
          "offset": 5,
          "size": 2
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "bottom",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "left",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "top",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "bottom",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "left",
          "offset": 4,
          "size": 2
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "bottom",
          "offset": 2,
          "size": 1
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "right",
          "offset": 1,
          "size": 1
        }
      ]
    },
    "proof": {
      "levelSha256": "4afcbd1d2e915ea0965e706e08a01c0c278e427283546066c8903087d2eb1ad0",
      "sourceLevelId": 155,
      "lowerBound": 16,
      "upperBound": 20,
      "routeReplayComplete": true,
      "reportSha256": "331f50c943b8b03491c4ee0d922c3c178a7ad9a0fd58c4aa26830b6c05d1ae5a",
      "routeSha256": "4164f9127149185abdda6efd255771f256e63dbc9bef07d052bc53988b80fa52",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "4afcbd1d2e915ea0965e706e08a01c0c278e427283546066c8903087d2eb1ad0",
      "designReportSha256": "8049919a0d1837014a398b1830ddf61fa1b6e9690113bde7db3ec9d36295b2ff",
      "runtimeReportSha256": "b588a6462b3f246dbe5af099177e9915615a2836177cc8936c2121e11b99bac4",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-basic-combined-d1-05",
    "stageKey": "basic-combined",
    "difficulty": 1,
    "slot": 5,
    "sourceLevelId": 18,
    "layoutSha256": "6978df8d40f74d7b63dbc597431c9809d02a54331c73ed4171c73517fa812030",
    "admittedInRevision": "52103fec78f39e6d83a31a531333a6615a9d551554ef204076e89d081fcbaef3",
    "dailyMechanisms": [
      "color-exit"
    ],
    "level": {
      "id": 18,
      "name": "每日挑战 color-exit 1-5",
      "difficulty": "hard",
      "reward": 0,
      "width": 5,
      "height": 8,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ],
        [
          0,
          7
        ],
        [
          1,
          7
        ],
        [
          2,
          7
        ],
        [
          3,
          7
        ],
        [
          4,
          7
        ]
      ],
      "timeSeconds": 75,
      "parMoves": 28,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-18-6867074-b0",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-18-6867074-b1",
          "x": 1,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-18-6867074-b2",
          "x": 4,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-18-6867074-b3",
          "x": 4,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-18-6867074-b4",
          "x": 2,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-18-6867074-b5",
          "x": 2,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-18-6867074-b6",
          "x": 2,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-18-6867074-b7",
          "x": 2,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-18-6867074-b8",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-18-6867074-b9",
          "x": 0,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-18-6867074-b10",
          "x": 2,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-18-6867074-b11",
          "x": 1,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-18-6867074-b12",
          "x": 3,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-18-6867074-b13",
          "x": 0,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "orange"
        }
      ],
      "gates": [
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "top",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "bottom",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "left",
          "offset": 0,
          "size": 1
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "bottom",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "top",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "bottom",
          "offset": 2,
          "size": 1
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "left",
          "offset": 2,
          "size": 1
        },
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "top",
          "offset": 2,
          "size": 1
        }
      ]
    },
    "proof": {
      "levelSha256": "6978df8d40f74d7b63dbc597431c9809d02a54331c73ed4171c73517fa812030",
      "sourceLevelId": 18,
      "lowerBound": 16,
      "upperBound": 19,
      "routeReplayComplete": true,
      "reportSha256": "fe409eb4eb295e3472ac584af0d0e733472b7fc5ca3c5369ca8d2143a2c4fd5d",
      "routeSha256": "cb30c389269072bbf1d3331fd6a851851cbc0416ba6bcf66dc6ffaa9a5cf7eb7",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "6978df8d40f74d7b63dbc597431c9809d02a54331c73ed4171c73517fa812030",
      "designReportSha256": "8049919a0d1837014a398b1830ddf61fa1b6e9690113bde7db3ec9d36295b2ff",
      "runtimeReportSha256": "cb7936ad3e027fe5c14941b02f7d2192247aacd4d0cff4ddc31565f99ec6f4ae",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-basic-combined-d1-06",
    "stageKey": "basic-combined",
    "difficulty": 1,
    "slot": 6,
    "sourceLevelId": 81,
    "layoutSha256": "51fb2240b7c0338eb4bcfddab717c79f93839f1a46fa67152973f0300696946d",
    "admittedInRevision": "a3006eddb2b35e2bfacd6c359737865bd59d6db5118f3b41961c2b8bf39d9acc",
    "dailyMechanisms": [
      "color-exit",
      "irregular-block"
    ],
    "level": {
      "id": 81,
      "name": "每日挑战 irregular-block 1-1",
      "difficulty": "hard",
      "reward": 0,
      "width": 6,
      "height": 8,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          5,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          5,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          5,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          5,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          5,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          5,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ],
        [
          5,
          6
        ],
        [
          0,
          7
        ],
        [
          1,
          7
        ],
        [
          2,
          7
        ],
        [
          3,
          7
        ],
        [
          4,
          7
        ],
        [
          5,
          7
        ]
      ],
      "timeSeconds": 120,
      "parMoves": 29,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-81-7488150-b0",
          "x": 5,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-81-7488150-b1",
          "x": 4,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-81-7488150-b2",
          "x": 1,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-81-7488150-b3",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-81-7488150-b4",
          "x": 2,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-81-7488150-b5",
          "x": 4,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-81-7488150-b6",
          "x": 1,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-81-7488150-b7",
          "x": 0,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-81-7488150-b8",
          "x": 3,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-81-7488150-b9",
          "x": 4,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-81-7488150-b10",
          "x": 3,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-81-7488150-b11",
          "x": 5,
          "y": 7,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-81-7488150-b12",
          "x": 3,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-81-7488150-b13",
          "x": 0,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-81-7488150-b14",
          "x": 0,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-81-7488150-b15",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              2,
              1
            ]
          ],
          "color": "green"
        }
      ],
      "gates": [
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "right",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "right",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "left",
          "offset": 4,
          "size": 2
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "left",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "top",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "bottom",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "right",
          "offset": 5,
          "size": 2
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "left",
          "offset": 2,
          "size": 2
        }
      ]
    },
    "proof": {
      "levelSha256": "51fb2240b7c0338eb4bcfddab717c79f93839f1a46fa67152973f0300696946d",
      "sourceLevelId": 81,
      "lowerBound": 16,
      "upperBound": 19,
      "routeReplayComplete": true,
      "reportSha256": "236d909b70a9fb50e28ce85e3cb5c2c86cb69d5166923c6c6477106e8c4dd964",
      "routeSha256": "017731dff2c5feab99c38c70e1b2ebed64adea944cd0b218170037228ed596c0",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "51fb2240b7c0338eb4bcfddab717c79f93839f1a46fa67152973f0300696946d",
      "designReportSha256": "8049919a0d1837014a398b1830ddf61fa1b6e9690113bde7db3ec9d36295b2ff",
      "runtimeReportSha256": "41182ece2e9908b262361c2a89d21770a8462b4b1c7a5c1794343b8040dc52cf",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-basic-combined-d1-07",
    "stageKey": "basic-combined",
    "difficulty": 1,
    "slot": 7,
    "sourceLevelId": 11,
    "layoutSha256": "3525c15f8242f5c7ef3aa3caf251b4b701373fdd70492baea4f85ee7274f3319",
    "admittedInRevision": "7437667569cffbd59fa47f120b5f8d1d5ecf93ff5e8d4818162f6944ac953c5a",
    "dailyMechanisms": [
      "color-exit",
      "irregular-block",
      "irregular-board"
    ],
    "level": {
      "id": 11,
      "name": "每日挑战 irregular-board 1-3",
      "difficulty": "hard",
      "reward": 0,
      "width": 6,
      "height": 8,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          5,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          5,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          5,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          5,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          5,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ],
        [
          5,
          6
        ],
        [
          0,
          7
        ],
        [
          1,
          7
        ],
        [
          2,
          7
        ]
      ],
      "blocked": [],
      "timeSeconds": 120,
      "parMoves": 36,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-11-10495982-b0",
          "x": 5,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-11-10495982-b1",
          "x": 5,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-11-10495982-b2",
          "x": 5,
          "y": 4,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-11-10495982-b3",
          "x": 4,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-11-10495982-b4",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-11-10495982-b5",
          "x": 2,
          "y": 0,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-11-10495982-b6",
          "x": 3,
          "y": 2,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-11-10495982-b7",
          "x": 4,
          "y": 3,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-11-10495982-b8",
          "x": 2,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-11-10495982-b9",
          "x": 4,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-11-10495982-b10",
          "x": 1,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-11-10495982-b11",
          "x": 0,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-11-10495982-b12",
          "x": 2,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-11-10495982-b13",
          "x": 1,
          "y": 3,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-11-10495982-b14",
          "x": 3,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-11-10495982-b15",
          "x": 0,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-11-10495982-b16",
          "x": 1,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-11-10495982-b17",
          "x": 2,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-11-10495982-b18",
          "x": 2,
          "y": 7,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-11-10495982-b19",
          "x": 0,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-11-10495982-b20",
          "x": 0,
          "y": 6,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-11-10495982-b21",
          "x": 1,
          "y": 6,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "yellow"
        }
      ],
      "gates": [
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "left",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "right",
          "offset": 4,
          "size": 2
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "bottom",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "top",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "left",
          "offset": 6,
          "size": 2
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "right",
          "offset": 2,
          "size": 1
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "left",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "left",
          "offset": 5,
          "size": 1
        }
      ]
    },
    "proof": {
      "levelSha256": "3525c15f8242f5c7ef3aa3caf251b4b701373fdd70492baea4f85ee7274f3319",
      "sourceLevelId": 11,
      "lowerBound": 16,
      "upperBound": 17,
      "routeReplayComplete": true,
      "reportSha256": "0843257ef2da698ae9efe3cccc8e0c62926ea83e014659c78dab7067ac0d279a",
      "routeSha256": "19fc81217f5c7563ad49df3dd5bab6f5212397b75b70af9cded55e944f60fa21",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "3525c15f8242f5c7ef3aa3caf251b4b701373fdd70492baea4f85ee7274f3319",
      "designReportSha256": "8049919a0d1837014a398b1830ddf61fa1b6e9690113bde7db3ec9d36295b2ff",
      "runtimeReportSha256": "3d72b62d5e49202edb762b1680ea8fcc31bded95627cade2be6c40560457e633",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-basic-combined-d1-08",
    "stageKey": "basic-combined",
    "difficulty": 1,
    "slot": 8,
    "sourceLevelId": 27,
    "layoutSha256": "bb4e500be8551afdb643bf328266e57b49d7a9d52ef8da697953f38008e41818",
    "admittedInRevision": "74bd5d2f98e076b548f8fab2ad335e8e58d2ed85668e77403b059586a0cbda1c",
    "dailyMechanisms": [
      "color-exit",
      "numeric-ice",
      "irregular-block",
      "irregular-board"
    ],
    "level": {
      "id": 27,
      "name": "每日挑战 numeric-ice 1-3",
      "difficulty": "hard",
      "reward": 0,
      "width": 6,
      "height": 9,
      "playable": [
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          5,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          5,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          5,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ],
        [
          5,
          6
        ],
        [
          0,
          7
        ],
        [
          1,
          7
        ],
        [
          2,
          7
        ],
        [
          3,
          7
        ],
        [
          4,
          7
        ],
        [
          5,
          7
        ],
        [
          0,
          8
        ],
        [
          1,
          8
        ],
        [
          2,
          8
        ],
        [
          3,
          8
        ],
        [
          4,
          8
        ],
        [
          5,
          8
        ]
      ],
      "timeSeconds": 60,
      "parMoves": 28,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-27-4255108462-b0",
          "x": 4,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-27-4255108462-b1",
          "x": 3,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "orange",
          "frozen": 6
        },
        {
          "id": "v3-27-4255108462-b2",
          "x": 3,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-27-4255108462-b3",
          "x": 2,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "cyan",
          "frozen": 7
        },
        {
          "id": "v3-27-4255108462-b4",
          "x": 1,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-27-4255108462-b5",
          "x": 3,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-27-4255108462-b6",
          "x": 1,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-27-4255108462-b7",
          "x": 0,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-27-4255108462-b8",
          "x": 2,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-27-4255108462-b9",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-27-4255108462-b10",
          "x": 1,
          "y": 5,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-27-4255108462-b11",
          "x": 0,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "purple",
          "frozen": 5
        },
        {
          "id": "v3-27-4255108462-b12",
          "x": 0,
          "y": 8,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-27-4255108462-b13",
          "x": 1,
          "y": 8,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-27-4255108462-b14",
          "x": 5,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-27-4255108462-b15",
          "x": 3,
          "y": 8,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-27-4255108462-b16",
          "x": 2,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-27-4255108462-b17",
          "x": 3,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              0,
              2
            ],
            [
              1,
              2
            ]
          ],
          "color": "blue"
        }
      ],
      "gates": [
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "right",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "top",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "bottom",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "right",
          "offset": 7,
          "size": 2
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "bottom",
          "offset": 4,
          "size": 2
        },
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "bottom",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "left",
          "offset": 4,
          "size": 1
        },
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "left",
          "offset": 6,
          "size": 2
        }
      ]
    },
    "proof": {
      "levelSha256": "bb4e500be8551afdb643bf328266e57b49d7a9d52ef8da697953f38008e41818",
      "sourceLevelId": 27,
      "lowerBound": 16,
      "upperBound": 16,
      "routeReplayComplete": true,
      "reportSha256": "e31ac78d8b5fb262761b4f7e8d56ba6a78bd87988cb3bc6d48b7af5dd3a131fb",
      "routeSha256": "c87a0befea03ffce89da08b71bf8f4347402f6fe5194fd88f0b94586159aff8c",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "bb4e500be8551afdb643bf328266e57b49d7a9d52ef8da697953f38008e41818",
      "designReportSha256": "8049919a0d1837014a398b1830ddf61fa1b6e9690113bde7db3ec9d36295b2ff",
      "runtimeReportSha256": "07b2d8f0fc42a18165a6655daf1097d66cab624977bf635e0035e4717636d6cf",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-basic-combined-d1-09",
    "stageKey": "basic-combined",
    "difficulty": 1,
    "slot": 9,
    "sourceLevelId": 108,
    "layoutSha256": "26af1a3417c239b25047158f0973997a127a2f9c42b625bf640ef836fcd86220",
    "admittedInRevision": "4f679bfec10eb92d628f1268c7838a6a3feaf61c7c568613b44be15fc67c0649",
    "dailyMechanisms": [
      "color-exit",
      "numeric-ice",
      "irregular-block"
    ],
    "level": {
      "id": 108,
      "name": "每日挑战 numeric-ice 1-2",
      "difficulty": "hard",
      "reward": 0,
      "width": 6,
      "height": 7,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          5,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          5,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          5,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          5,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          5,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          5,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ],
        [
          5,
          6
        ]
      ],
      "timeSeconds": 180,
      "parMoves": 30,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-108-7753820-b0",
          "x": 3,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-108-7753820-b1",
          "x": 3,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-108-7753820-b2",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-108-7753820-b3",
          "x": 3,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-108-7753820-b4",
          "x": 4,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-108-7753820-b5",
          "x": 3,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-108-7753820-b6",
          "x": 3,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-108-7753820-b7",
          "x": 3,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-108-7753820-b8",
          "x": 1,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-108-7753820-b9",
          "x": 0,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-108-7753820-b10",
          "x": 2,
          "y": 2,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-108-7753820-b11",
          "x": 1,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-108-7753820-b12",
          "x": 0,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "yellow",
          "frozen": 3
        },
        {
          "id": "v3-108-7753820-b13",
          "x": 2,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-108-7753820-b14",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "orange",
          "frozen": 4
        }
      ],
      "gates": [
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "top",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "right",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "bottom",
          "offset": 4,
          "size": 2
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "right",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "bottom",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "left",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "left",
          "offset": 5,
          "size": 2
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "top",
          "offset": 2,
          "size": 2
        }
      ]
    },
    "proof": {
      "levelSha256": "26af1a3417c239b25047158f0973997a127a2f9c42b625bf640ef836fcd86220",
      "sourceLevelId": 108,
      "lowerBound": 16,
      "upperBound": 18,
      "routeReplayComplete": true,
      "reportSha256": "b949551ec212304c3a26033fb90e7faea62eb869a6b632cabab7ab62469e781b",
      "routeSha256": "fa0097fde37153a38e97b24c160418b210b050edc5e0b65561f35c8e90c8f9b9",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "26af1a3417c239b25047158f0973997a127a2f9c42b625bf640ef836fcd86220",
      "designReportSha256": "8049919a0d1837014a398b1830ddf61fa1b6e9690113bde7db3ec9d36295b2ff",
      "runtimeReportSha256": "a373c766ad7a2adadd7263b1ee788a6c6accc3eb60d98dff51a9d01e602f7c4d",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-basic-combined-d1-10",
    "stageKey": "basic-combined",
    "difficulty": 1,
    "slot": 10,
    "sourceLevelId": 23,
    "layoutSha256": "a6bafc255a8b1a5cc1e1998aad107ef335c30511e0a2f0b63a38e83824e3f90a",
    "admittedInRevision": "0b6bc14a9a68be812846298aea04aad5ca4b683d201d21245242d3db82095b7b",
    "dailyMechanisms": [
      "color-exit",
      "irregular-board"
    ],
    "level": {
      "id": 23,
      "name": "每日挑战 irregular-board 1-1",
      "difficulty": "hard",
      "reward": 0,
      "width": 6,
      "height": 8,
      "playable": [
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          5,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          5,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          5,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          5,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          5,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ],
        [
          5,
          6
        ],
        [
          2,
          7
        ],
        [
          3,
          7
        ]
      ],
      "timeSeconds": 120,
      "parMoves": 65,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-23-7092041-b0",
          "x": 3,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-23-7092041-b1",
          "x": 2,
          "y": 7,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-23-7092041-b2",
          "x": 4,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-23-7092041-b3",
          "x": 4,
          "y": 5,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-23-7092041-b4",
          "x": 5,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-23-7092041-b5",
          "x": 3,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-23-7092041-b6",
          "x": 3,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-23-7092041-b7",
          "x": 3,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-23-7092041-b8",
          "x": 3,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-23-7092041-b9",
          "x": 1,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-23-7092041-b10",
          "x": 0,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-23-7092041-b11",
          "x": 2,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-23-7092041-b12",
          "x": 1,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-23-7092041-b13",
          "x": 1,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-23-7092041-b14",
          "x": 0,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-23-7092041-b15",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-23-7092041-b16",
          "x": 1,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              0,
              2
            ],
            [
              1,
              2
            ]
          ],
          "color": "red"
        }
      ],
      "gates": [
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "left",
          "offset": 4,
          "size": 2
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "top",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "right",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "left",
          "offset": 2,
          "size": 1
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "right",
          "offset": 5,
          "size": 1
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "bottom",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "left",
          "offset": 6,
          "size": 1
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "right",
          "offset": 1,
          "size": 1
        }
      ]
    },
    "proof": {
      "levelSha256": "a6bafc255a8b1a5cc1e1998aad107ef335c30511e0a2f0b63a38e83824e3f90a",
      "sourceLevelId": 23,
      "lowerBound": 16,
      "upperBound": 18,
      "routeReplayComplete": true,
      "reportSha256": "cd8516d8136ce4c9876b0489b35ac8e9aed294a1efe648fd4ed95f8944869f97",
      "routeSha256": "28b58fb8159f10aa7ece53eaa97076b3a0e00df891f9423f49c6d8a9e3410e6d",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "a6bafc255a8b1a5cc1e1998aad107ef335c30511e0a2f0b63a38e83824e3f90a",
      "designReportSha256": "8049919a0d1837014a398b1830ddf61fa1b6e9690113bde7db3ec9d36295b2ff",
      "runtimeReportSha256": "3fad423dac0412eb3619f9b428165dd5290d7017e3ad324b2db8ad66e237df7b",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-basic-combined-d2-01",
    "stageKey": "basic-combined",
    "difficulty": 2,
    "slot": 1,
    "sourceLevelId": 105,
    "layoutSha256": "ed8301a26baa27b5c2f6b16004a753a7a4363b7fe0e7dd1ae81eaf7d9fd4fced",
    "admittedInRevision": "4c491b3ef6e58d0103a86f40bf9f855fde2b1fd830952efa57e42be3d28fc3ac",
    "dailyMechanisms": [
      "color-exit",
      "numeric-ice",
      "irregular-block"
    ],
    "level": {
      "id": 105,
      "name": "每日挑战 numeric-ice 2-1",
      "difficulty": "super",
      "reward": 0,
      "width": 6,
      "height": 8,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          5,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          5,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          5,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          5,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          5,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          5,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ],
        [
          5,
          6
        ],
        [
          0,
          7
        ],
        [
          1,
          7
        ],
        [
          2,
          7
        ],
        [
          3,
          7
        ],
        [
          4,
          7
        ],
        [
          5,
          7
        ]
      ],
      "timeSeconds": 105,
      "parMoves": 31,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-105-7748324-b0",
          "x": 3,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "purple",
          "frozen": 8
        },
        {
          "id": "v3-105-7748324-b1",
          "x": 3,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              2,
              1
            ]
          ],
          "color": "green",
          "frozen": 6
        },
        {
          "id": "v3-105-7748324-b2",
          "x": 2,
          "y": 0,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "cyan",
          "frozen": 13
        },
        {
          "id": "v3-105-7748324-b3",
          "x": 1,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-105-7748324-b4",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-105-7748324-b5",
          "x": 2,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-105-7748324-b6",
          "x": 1,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-105-7748324-b7",
          "x": 0,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-105-7748324-b8",
          "x": 3,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-105-7748324-b9",
          "x": 3,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-105-7748324-b10",
          "x": 3,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-105-7748324-b11",
          "x": 3,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-105-7748324-b12",
          "x": 3,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-105-7748324-b13",
          "x": 1,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-105-7748324-b14",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-105-7748324-b15",
          "x": 0,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              2,
              1
            ]
          ],
          "color": "cyan"
        }
      ],
      "gates": [
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "left",
          "offset": 5,
          "size": 2
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "right",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "bottom",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "bottom",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "left",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "top",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "right",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "right",
          "offset": 6,
          "size": 2
        }
      ]
    },
    "proof": {
      "levelSha256": "ed8301a26baa27b5c2f6b16004a753a7a4363b7fe0e7dd1ae81eaf7d9fd4fced",
      "sourceLevelId": 105,
      "lowerBound": 21,
      "upperBound": 30,
      "routeReplayComplete": true,
      "reportSha256": "64067dc3cc4ca01bc1d41aa8d030c90e4eb6f4f9dab369cec5bc158afb7e6242",
      "routeSha256": "4e644f3eb9290be285c9d4b320c04bc8f7a6e26fde6239a54ce0b36490aaffce",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "ed8301a26baa27b5c2f6b16004a753a7a4363b7fe0e7dd1ae81eaf7d9fd4fced",
      "designReportSha256": "8049919a0d1837014a398b1830ddf61fa1b6e9690113bde7db3ec9d36295b2ff",
      "runtimeReportSha256": "e88c613b19a900b3ef63276bc0ad391570749221294e13ca8fe0d9a240146863",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-basic-combined-d2-02",
    "stageKey": "basic-combined",
    "difficulty": 2,
    "slot": 2,
    "sourceLevelId": 24,
    "layoutSha256": "cbc9e9b393337b2cf97e59a6332361a9e912c1e04e0551aed7ecb915eb5835c8",
    "admittedInRevision": "28ed3ebe24b13908c0f1ce75261e8a8426a1252348a3f488f738e4c06cdced72",
    "dailyMechanisms": [
      "color-exit",
      "irregular-block",
      "irregular-board"
    ],
    "level": {
      "id": 24,
      "name": "每日挑战 irregular-board 2-1",
      "difficulty": "super",
      "reward": 0,
      "width": 5,
      "height": 9,
      "playable": [
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ],
        [
          0,
          7
        ],
        [
          1,
          7
        ],
        [
          2,
          7
        ],
        [
          3,
          7
        ],
        [
          4,
          7
        ],
        [
          1,
          8
        ],
        [
          2,
          8
        ],
        [
          3,
          8
        ]
      ],
      "timeSeconds": 150,
      "parMoves": 39,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-24-7090366-b0",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-24-7090366-b1",
          "x": 2,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-24-7090366-b2",
          "x": 2,
          "y": 8,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-24-7090366-b3",
          "x": 1,
          "y": 8,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-24-7090366-b4",
          "x": 1,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-24-7090366-b5",
          "x": 2,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-24-7090366-b6",
          "x": 0,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-24-7090366-b7",
          "x": 3,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-24-7090366-b8",
          "x": 4,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-24-7090366-b9",
          "x": 3,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-24-7090366-b10",
          "x": 4,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-24-7090366-b11",
          "x": 0,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-24-7090366-b12",
          "x": 1,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-24-7090366-b13",
          "x": 1,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              2,
              1
            ]
          ],
          "color": "pink"
        }
      ],
      "gates": [
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "bottom",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "left",
          "offset": 5,
          "size": 2
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "right",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "right",
          "offset": 5,
          "size": 2
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "left",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "right",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "left",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "top",
          "offset": 2,
          "size": 2
        }
      ]
    },
    "proof": {
      "levelSha256": "cbc9e9b393337b2cf97e59a6332361a9e912c1e04e0551aed7ecb915eb5835c8",
      "sourceLevelId": 24,
      "lowerBound": 21,
      "upperBound": 23,
      "routeReplayComplete": true,
      "reportSha256": "a3e19197e9e486ba1fefc6d9e89543978631b8082131cbc78b192e3d9cf26d88",
      "routeSha256": "ce902accb9f353e0cd56f031d1bd9a0bae2805b894411778f33c5b8460f482d7",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "cbc9e9b393337b2cf97e59a6332361a9e912c1e04e0551aed7ecb915eb5835c8",
      "designReportSha256": "8049919a0d1837014a398b1830ddf61fa1b6e9690113bde7db3ec9d36295b2ff",
      "runtimeReportSha256": "098959ed31ad4c9aabdd65d0b7b3152f920bc30f1d6eb07e5511eb1b468357d7",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-basic-combined-d2-03",
    "stageKey": "basic-combined",
    "difficulty": 2,
    "slot": 3,
    "sourceLevelId": 14,
    "layoutSha256": "0ccb62fde516d13a3606a026071c1df9072e7f54af0f37013658ff8ab2621510",
    "admittedInRevision": "583d78798e75152bb6da54beb6d89f962879f33e6699a94787f33da1ab27e5d2",
    "dailyMechanisms": [
      "color-exit",
      "frozen-exit",
      "irregular-block"
    ],
    "level": {
      "id": 14,
      "name": "每日挑战 frozen-exit 2-5",
      "difficulty": "super",
      "reward": 0,
      "width": 5,
      "height": 7,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ]
      ],
      "timeSeconds": 120,
      "parMoves": 39,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-14-9643507-b0",
          "x": 4,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-14-9643507-b1",
          "x": 0,
          "y": 1,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-14-9643507-b2",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              3,
              0
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-14-9643507-b3",
          "x": 1,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-14-9643507-b4",
          "x": 1,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              3,
              0
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-14-9643507-b5",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-14-9643507-b6",
          "x": 4,
          "y": 3,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-14-9643507-b7",
          "x": 3,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-14-9643507-b8",
          "x": 3,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-14-9643507-b9",
          "x": 1,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-14-9643507-b10",
          "x": 0,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-14-9643507-b11",
          "x": 1,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "yellow"
        }
      ],
      "gates": [
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "top",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "top",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "right",
          "offset": 3,
          "size": 2,
          "frozen": 5
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "left",
          "offset": 5,
          "size": 2
        },
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "left",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "bottom",
          "offset": 3,
          "size": 2,
          "frozen": 9
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "bottom",
          "offset": 0,
          "size": 2,
          "frozen": 7
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "right",
          "offset": 6,
          "size": 1
        }
      ]
    },
    "proof": {
      "levelSha256": "0ccb62fde516d13a3606a026071c1df9072e7f54af0f37013658ff8ab2621510",
      "sourceLevelId": 14,
      "lowerBound": 21,
      "upperBound": 25,
      "routeReplayComplete": true,
      "reportSha256": "ef6acf11362589ee7d43b4c0b5678cba1078e9e073df26957af1c55ae09aa9ea",
      "routeSha256": "9f02460cd31e7af3e297a22c20e3936d5fb9c903ffb34e6bd83478eba98f972e",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "0ccb62fde516d13a3606a026071c1df9072e7f54af0f37013658ff8ab2621510",
      "designReportSha256": "8049919a0d1837014a398b1830ddf61fa1b6e9690113bde7db3ec9d36295b2ff",
      "runtimeReportSha256": "13ead7fd9375bfa235922c979eee890c7fe39d10a95bb8151b2c8d0f6a152f1d",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-basic-combined-d2-04",
    "stageKey": "basic-combined",
    "difficulty": 2,
    "slot": 4,
    "sourceLevelId": 187,
    "layoutSha256": "fc0ee7edfeb015882055e5493f6315e3919fc55343554f17ce0e0587fcabc774",
    "admittedInRevision": "2919d19f4a52ac892b1524438722a8dadb08b435d8ba9bf3ea43a6375a547c1b",
    "dailyMechanisms": [
      "color-exit",
      "irregular-block"
    ],
    "level": {
      "id": 187,
      "name": "每日挑战 irregular-block 2-2",
      "difficulty": "super",
      "reward": 0,
      "width": 7,
      "height": 8,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          5,
          0
        ],
        [
          6,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          5,
          1
        ],
        [
          6,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          5,
          2
        ],
        [
          6,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          5,
          3
        ],
        [
          6,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          5,
          4
        ],
        [
          6,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          5,
          5
        ],
        [
          6,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ],
        [
          5,
          6
        ],
        [
          6,
          6
        ],
        [
          0,
          7
        ],
        [
          1,
          7
        ],
        [
          2,
          7
        ],
        [
          3,
          7
        ],
        [
          4,
          7
        ],
        [
          5,
          7
        ],
        [
          6,
          7
        ]
      ],
      "timeSeconds": 120,
      "parMoves": 31,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-187-11983775-b0",
          "x": 4,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-187-11983775-b1",
          "x": 6,
          "y": 2,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-187-11983775-b2",
          "x": 4,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-187-11983775-b3",
          "x": 1,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-187-11983775-b4",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-187-11983775-b5",
          "x": 3,
          "y": 1,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-187-11983775-b6",
          "x": 2,
          "y": 1,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-187-11983775-b7",
          "x": 1,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-187-11983775-b8",
          "x": 0,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-187-11983775-b9",
          "x": 3,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-187-11983775-b10",
          "x": 2,
          "y": 3,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-187-11983775-b11",
          "x": 1,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-187-11983775-b12",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-187-11983775-b13",
          "x": 0,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-187-11983775-b14",
          "x": 2,
          "y": 4,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-187-11983775-b15",
          "x": 5,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-187-11983775-b16",
          "x": 4,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-187-11983775-b17",
          "x": 5,
          "y": 4,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-187-11983775-b18",
          "x": 6,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-187-11983775-b19",
          "x": 6,
          "y": 7,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-187-11983775-b20",
          "x": 4,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-187-11983775-b21",
          "x": 3,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-187-11983775-b22",
          "x": 4,
          "y": 5,
          "shape": [
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              2,
              1
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-187-11983775-b23",
          "x": 2,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-187-11983775-b24",
          "x": 2,
          "y": 7,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "pink"
        }
      ],
      "gates": [
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "bottom",
          "offset": 4,
          "size": 2
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "right",
          "offset": 6,
          "size": 2
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "left",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "left",
          "offset": 4,
          "size": 2
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "bottom",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "right",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "top",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "right",
          "offset": 5,
          "size": 1
        }
      ]
    },
    "proof": {
      "levelSha256": "fc0ee7edfeb015882055e5493f6315e3919fc55343554f17ce0e0587fcabc774",
      "sourceLevelId": 187,
      "lowerBound": 21,
      "upperBound": 23,
      "routeReplayComplete": true,
      "reportSha256": "f7e892f2006e618dab5f401f532bcd87851ec0ca9a956c3f75bef0d0ab4d412d",
      "routeSha256": "df9c597299e81de744a8d6c182e4eafd677fb5769718852d74bfd79e8a68d22a",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "fc0ee7edfeb015882055e5493f6315e3919fc55343554f17ce0e0587fcabc774",
      "designReportSha256": "8049919a0d1837014a398b1830ddf61fa1b6e9690113bde7db3ec9d36295b2ff",
      "runtimeReportSha256": "258ff1b1a9166545b10646d10e7178b78ebbd21ec723958fb199d832cd150899",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-basic-combined-d2-05",
    "stageKey": "basic-combined",
    "difficulty": 2,
    "slot": 5,
    "sourceLevelId": 4,
    "layoutSha256": "6cf0aaff8f54fdc9e99b290e5af2ea9f5b8651ecb4c4e8ecb66a7cb995b1bf67",
    "admittedInRevision": "f56828213d122c93020864c35c00f6764f781a7b73561525679e3b826da356d1",
    "dailyMechanisms": [
      "color-exit"
    ],
    "level": {
      "id": 4,
      "name": "每日挑战 color-exit 2-1",
      "difficulty": "super",
      "reward": 0,
      "width": 5,
      "height": 6,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ]
      ],
      "timeSeconds": 180,
      "parMoves": 35,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-4-6628512-b0",
          "x": 4,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-4-6628512-b1",
          "x": 2,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-4-6628512-b2",
          "x": 2,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-4-6628512-b3",
          "x": 3,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-4-6628512-b4",
          "x": 1,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-4-6628512-b5",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-4-6628512-b6",
          "x": 2,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-4-6628512-b7",
          "x": 0,
          "y": 2,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-4-6628512-b8",
          "x": 3,
          "y": 3,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-4-6628512-b9",
          "x": 3,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-4-6628512-b10",
          "x": 0,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-4-6628512-b11",
          "x": 2,
          "y": 4,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-4-6628512-b12",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "blue"
        }
      ],
      "gates": [
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "bottom",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "bottom",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "left",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "right",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "right",
          "offset": 4,
          "size": 2
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "left",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "top",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "top",
          "offset": 3,
          "size": 1
        }
      ]
    },
    "proof": {
      "levelSha256": "6cf0aaff8f54fdc9e99b290e5af2ea9f5b8651ecb4c4e8ecb66a7cb995b1bf67",
      "sourceLevelId": 4,
      "lowerBound": 21,
      "upperBound": 23,
      "routeReplayComplete": true,
      "reportSha256": "13bddd6b102510f21b78482a6da89b7922f9e0c8086e8c4bbb49037646a5ab32",
      "routeSha256": "73c90bcc26f5994564522815ab6052204d03fc0e1f9cc4d9f0d22799a1cdee7d",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "6cf0aaff8f54fdc9e99b290e5af2ea9f5b8651ecb4c4e8ecb66a7cb995b1bf67",
      "designReportSha256": "8049919a0d1837014a398b1830ddf61fa1b6e9690113bde7db3ec9d36295b2ff",
      "runtimeReportSha256": "c6ee5d69b5da2c6c990b1b5204ba68ad87dd484350bfd344f68c204cd27aec63",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-basic-combined-d2-07",
    "stageKey": "basic-combined",
    "difficulty": 2,
    "slot": 7,
    "sourceLevelId": 18,
    "layoutSha256": "e79e0c1f25e416e2305ef0f2c2db899d1461ae3b709bf7409f66b474ecae85ad",
    "admittedInRevision": "62d256f514a6265e8dd2955b1b49146d6282a6c76c45cb137cac09a5cc1b2e2f",
    "dailyMechanisms": [
      "color-exit",
      "frozen-exit"
    ],
    "level": {
      "id": 18,
      "name": "每日挑战 frozen-exit 2-4",
      "difficulty": "super",
      "reward": 0,
      "width": 5,
      "height": 8,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ],
        [
          0,
          7
        ],
        [
          1,
          7
        ],
        [
          2,
          7
        ],
        [
          3,
          7
        ],
        [
          4,
          7
        ]
      ],
      "timeSeconds": 75,
      "parMoves": 28,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-18-6854779-b0",
          "x": 4,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-18-6854779-b1",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-18-6854779-b2",
          "x": 2,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-18-6854779-b3",
          "x": 0,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-18-6854779-b4",
          "x": 2,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-18-6854779-b5",
          "x": 4,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-18-6854779-b6",
          "x": 3,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-18-6854779-b7",
          "x": 2,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-18-6854779-b8",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              2,
              1
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-18-6854779-b9",
          "x": 0,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              0,
              2
            ],
            [
              1,
              2
            ]
          ],
          "color": "cyan"
        }
      ],
      "gates": [
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "left",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "top",
          "offset": 1,
          "size": 1,
          "frozen": 5
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "left",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "right",
          "offset": 5,
          "size": 2,
          "frozen": 7
        },
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "top",
          "offset": 4,
          "size": 1
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "right",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "right",
          "offset": 4,
          "size": 1
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "bottom",
          "offset": 3,
          "size": 2,
          "frozen": 8
        }
      ]
    },
    "proof": {
      "levelSha256": "e79e0c1f25e416e2305ef0f2c2db899d1461ae3b709bf7409f66b474ecae85ad",
      "sourceLevelId": 18,
      "lowerBound": 21,
      "upperBound": 21,
      "routeReplayComplete": true,
      "reportSha256": "b4bf1e87de2766bda00ba10882995856adae17b75427ee7234a918c8ef77d067",
      "routeSha256": "b6415abc039aa8fc30c4e3f192805c981d49e90223fbeff4543daaf7eda6f68e",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "e79e0c1f25e416e2305ef0f2c2db899d1461ae3b709bf7409f66b474ecae85ad",
      "designReportSha256": "8049919a0d1837014a398b1830ddf61fa1b6e9690113bde7db3ec9d36295b2ff",
      "runtimeReportSha256": "c6b48bfac75b3186ced53acc28d41aa4e2662d506c41a1c6bc7957cd9c24f54f",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-basic-combined-d2-08",
    "stageKey": "basic-combined",
    "difficulty": 2,
    "slot": 8,
    "sourceLevelId": 3,
    "layoutSha256": "654124c03ba9497c3a0e1391fa66b88a246365ae594fc07a026e238c40f62016",
    "admittedInRevision": "cd75fc77c8b3fa546c39d0c57fdc36a6172be0c41b5c080ff2486493a6cc7970",
    "dailyMechanisms": [
      "color-exit",
      "irregular-block"
    ],
    "level": {
      "id": 3,
      "name": "每日挑战 irregular-block 2-4",
      "difficulty": "super",
      "reward": 0,
      "width": 6,
      "height": 6,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          5,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          5,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          5,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          5,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          5,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          5,
          5
        ]
      ],
      "blocked": [],
      "timeSeconds": 180,
      "parMoves": 14,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-3-9248323-b0",
          "x": 4,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-3-9248323-b1",
          "x": 1,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-3-9248323-b2",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-3-9248323-b3",
          "x": 2,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-3-9248323-b4",
          "x": 3,
          "y": 1,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-3-9248323-b5",
          "x": 1,
          "y": 2,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-3-9248323-b6",
          "x": 2,
          "y": 3,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-3-9248323-b7",
          "x": 0,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-3-9248323-b8",
          "x": 0,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-3-9248323-b9",
          "x": 5,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-3-9248323-b10",
          "x": 3,
          "y": 2,
          "shape": [
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-3-9248323-b11",
          "x": 2,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              2,
              1
            ]
          ],
          "color": "red"
        }
      ],
      "gates": [
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "bottom",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "left",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "left",
          "offset": 4,
          "size": 2
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "right",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "top",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "right",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "right",
          "offset": 0,
          "size": 1
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "top",
          "offset": 4,
          "size": 2
        }
      ]
    },
    "proof": {
      "levelSha256": "654124c03ba9497c3a0e1391fa66b88a246365ae594fc07a026e238c40f62016",
      "sourceLevelId": 3,
      "lowerBound": 21,
      "upperBound": 21,
      "routeReplayComplete": true,
      "reportSha256": "8ffd21bee8630fbc891127b15d4f7b0d18dcd0451a9c27c0e1ee94049d62877f",
      "routeSha256": "92779621867f3d0f384e34d52f7ba3ba18a1f2986629d00b5c6a2c55f719731a",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "654124c03ba9497c3a0e1391fa66b88a246365ae594fc07a026e238c40f62016",
      "designReportSha256": "8049919a0d1837014a398b1830ddf61fa1b6e9690113bde7db3ec9d36295b2ff",
      "runtimeReportSha256": "8e37172d0b88f552237495b40d805e2c2d61c4b727624ec06f989cb18ce61fc7",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-basic-combined-d2-09",
    "stageKey": "basic-combined",
    "difficulty": 2,
    "slot": 9,
    "sourceLevelId": 80,
    "layoutSha256": "b82ffe202debd1a2c8fb5d2a98d86d1fc6f0c4891fd3083e0b9cc29a92ba8824",
    "admittedInRevision": "afa6967547beed83ee45e67846aa2139733982ef3c9223d2c2a45af3adafa6bf",
    "dailyMechanisms": [
      "color-exit",
      "irregular-block",
      "irregular-board"
    ],
    "level": {
      "id": 80,
      "name": "每日挑战 irregular-board 2-2",
      "difficulty": "super",
      "reward": 0,
      "width": 5,
      "height": 7,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ]
      ],
      "timeSeconds": 180,
      "parMoves": 34,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-80-10600755-b0",
          "x": 3,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-80-10600755-b1",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-80-10600755-b2",
          "x": 1,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-80-10600755-b3",
          "x": 4,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-80-10600755-b4",
          "x": 3,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-80-10600755-b5",
          "x": 2,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-80-10600755-b6",
          "x": 1,
          "y": 1,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-80-10600755-b7",
          "x": 1,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-80-10600755-b8",
          "x": 0,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-80-10600755-b9",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-80-10600755-b10",
          "x": 1,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-80-10600755-b11",
          "x": 3,
          "y": 6,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-80-10600755-b12",
          "x": 2,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-80-10600755-b13",
          "x": 3,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "pink"
        }
      ],
      "gates": [
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "top",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "left",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "right",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "right",
          "offset": 4,
          "size": 2
        },
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "top",
          "offset": 4,
          "size": 1
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "top",
          "offset": 0,
          "size": 1
        },
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "left",
          "offset": 0,
          "size": 2
        }
      ]
    },
    "proof": {
      "levelSha256": "b82ffe202debd1a2c8fb5d2a98d86d1fc6f0c4891fd3083e0b9cc29a92ba8824",
      "sourceLevelId": 80,
      "lowerBound": 21,
      "upperBound": 26,
      "routeReplayComplete": true,
      "reportSha256": "7d3a3257cd727c0237507a4874c57ecc884136c79b0256fe5634ede43d8b097c",
      "routeSha256": "9c6ed805479868ef112f9bbee6081ca209f2b30f64924c345a9fda397d41ae9a",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "b82ffe202debd1a2c8fb5d2a98d86d1fc6f0c4891fd3083e0b9cc29a92ba8824",
      "designReportSha256": "8049919a0d1837014a398b1830ddf61fa1b6e9690113bde7db3ec9d36295b2ff",
      "runtimeReportSha256": "d62c5eeb33107fb723262456ceb74f2a9e32ed6510b4f9435a02c2938334e892",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-basic-combined-d2-10",
    "stageKey": "basic-combined",
    "difficulty": 2,
    "slot": 10,
    "sourceLevelId": 1,
    "layoutSha256": "61bcdf9d9511a447c4308cd73d4fd2b99e62ab93ea6bfe4a4a3baebbe43f037a",
    "admittedInRevision": "8a4b1461f11dea1633d88c3054cd613924558e46d03ef24975cf424c3cd8207e",
    "dailyMechanisms": [
      "color-exit"
    ],
    "level": {
      "id": 1,
      "name": "每日挑战 color-exit 2-3",
      "difficulty": "super",
      "reward": 0,
      "width": 5,
      "height": 5,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ]
      ],
      "timeSeconds": 180,
      "parMoves": 3,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-1-10014222-b0",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              3,
              0
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-1-10014222-b1",
          "x": 4,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-1-10014222-b2",
          "x": 0,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-1-10014222-b3",
          "x": 0,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-1-10014222-b4",
          "x": 1,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-1-10014222-b5",
          "x": 2,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-1-10014222-b6",
          "x": 1,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-1-10014222-b7",
          "x": 2,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              2,
              1
            ]
          ],
          "color": "blue"
        }
      ],
      "gates": [
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "right",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "top",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "right",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "left",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "bottom",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "top",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "bottom",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "left",
          "offset": 1,
          "size": 1
        }
      ]
    },
    "proof": {
      "levelSha256": "61bcdf9d9511a447c4308cd73d4fd2b99e62ab93ea6bfe4a4a3baebbe43f037a",
      "sourceLevelId": 1,
      "lowerBound": 21,
      "upperBound": 21,
      "routeReplayComplete": true,
      "reportSha256": "41b64b941381a5b6be2ecfffec82d970367c9aca78354108bc0cd98042fdad23",
      "routeSha256": "8ccf7246efe7eb386c071fa12762caa22ffdd39cd83bbdf9e36add42932d6724",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "61bcdf9d9511a447c4308cd73d4fd2b99e62ab93ea6bfe4a4a3baebbe43f037a",
      "designReportSha256": "8049919a0d1837014a398b1830ddf61fa1b6e9690113bde7db3ec9d36295b2ff",
      "runtimeReportSha256": "d1bb1ba32f2893c84a6dd91dac3c9dbb3aa5de54d89b7b6a3456a4665e80f242",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-basic-combined-d3-02",
    "stageKey": "basic-combined",
    "difficulty": 3,
    "slot": 2,
    "sourceLevelId": 42,
    "layoutSha256": "5129a8529210881b438a9a908307d7aa887f1b7713fe92e0a9ab64534355d883",
    "admittedInRevision": "43c426396fb0ac3b0c9aeebcbfa5894fc3d703c64bbcd759af61d73ade360954",
    "dailyMechanisms": [
      "color-exit",
      "irregular-block",
      "irregular-board"
    ],
    "level": {
      "id": 42,
      "name": "每日挑战 irregular-board 3-1",
      "difficulty": "super",
      "reward": 0,
      "timeSeconds": 135,
      "parMoves": 49,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "width": 5,
      "height": 9,
      "playable": [
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ],
        [
          0,
          7
        ],
        [
          1,
          7
        ],
        [
          2,
          7
        ],
        [
          3,
          7
        ],
        [
          4,
          7
        ],
        [
          1,
          8
        ],
        [
          2,
          8
        ],
        [
          3,
          8
        ]
      ],
      "blocks": [
        {
          "id": "42-o17",
          "x": 1,
          "y": 2,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "red"
        },
        {
          "id": "42-o3",
          "x": 2,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "42-o12",
          "x": 4,
          "y": 2,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "42-o13",
          "x": 0,
          "y": 1,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "red"
        },
        {
          "id": "42-o8",
          "x": 3,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "red"
        },
        {
          "id": "42-o1",
          "x": 2,
          "y": 5,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "blue"
        },
        {
          "id": "42-o2",
          "x": 0,
          "y": 4,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "blue"
        },
        {
          "id": "42-o4",
          "x": 1,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "42-o20",
          "x": 3,
          "y": 2,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "blue"
        },
        {
          "id": "42-o10",
          "x": 0,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "42-o7",
          "x": 1,
          "y": 3,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "blue"
        },
        {
          "id": "42-o21",
          "x": 3,
          "y": 3,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "42-o9",
          "x": 4,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "red"
        },
        {
          "id": "42-o24",
          "x": 1,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "red"
        },
        {
          "id": "42-o22",
          "x": 2,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "42-o15",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "42-o18",
          "x": 3,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "42-o5",
          "x": 4,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "42-o16",
          "x": 0,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "blue"
        },
        {
          "id": "42-o19",
          "x": 2,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "42-o14",
          "x": 0,
          "y": 7,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "red"
        },
        {
          "id": "42-o11",
          "x": 1,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "42-o6",
          "x": 2,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "red"
        },
        {
          "id": "42-o23",
          "x": 2,
          "y": 8,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "green"
        }
      ],
      "gates": [
        {
          "id": "42-g-red",
          "color": "red",
          "side": "bottom",
          "offset": 1,
          "size": 3
        },
        {
          "id": "42-g-yellow",
          "color": "yellow",
          "side": "top",
          "offset": 1,
          "size": 3
        },
        {
          "id": "42-g-green",
          "color": "green",
          "side": "right",
          "offset": 2,
          "size": 2
        },
        {
          "id": "42-g-blue",
          "color": "blue",
          "side": "left",
          "offset": 2,
          "size": 2
        }
      ]
    },
    "proof": {
      "levelSha256": "5129a8529210881b438a9a908307d7aa887f1b7713fe92e0a9ab64534355d883",
      "sourceLevelId": 42,
      "lowerBound": 31,
      "upperBound": 39,
      "routeReplayComplete": true,
      "reportSha256": "f2d07bbcd7ede1e5dc957bc2684a8d37d53c7a93568304db73379e51e8af2af3",
      "routeSha256": "d970487ae29b76c8e8dae63c7356eac2b896492c5c6881fea78520416a48bdd2",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "5129a8529210881b438a9a908307d7aa887f1b7713fe92e0a9ab64534355d883",
      "designReportSha256": "8049919a0d1837014a398b1830ddf61fa1b6e9690113bde7db3ec9d36295b2ff",
      "runtimeReportSha256": "85c0cbea9bf91c2929810bcf8525f44ffb514e90921c4b6b3545b3e25f6f06ae",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-basic-combined-d3-03",
    "stageKey": "basic-combined",
    "difficulty": 3,
    "slot": 3,
    "sourceLevelId": 29,
    "layoutSha256": "c0a30fc007bb2dc322d72a97aa8e40dffc46c2397204d5e03ff1e2ea0e02cc54",
    "admittedInRevision": "9ed03341e7319a5cdedbe3d288c4ee314e0fd5793b95b44e2ec6110fa996427e",
    "dailyMechanisms": [
      "color-exit",
      "frozen-exit"
    ],
    "level": {
      "id": 29,
      "name": "每日挑战 frozen-exit 3-1",
      "difficulty": "super",
      "reward": 0,
      "width": 7,
      "height": 9,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          5,
          0
        ],
        [
          6,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          5,
          1
        ],
        [
          6,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          5,
          2
        ],
        [
          6,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          5,
          3
        ],
        [
          6,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          5,
          4
        ],
        [
          6,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          5,
          5
        ],
        [
          6,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ],
        [
          5,
          6
        ],
        [
          6,
          6
        ],
        [
          0,
          7
        ],
        [
          1,
          7
        ],
        [
          2,
          7
        ],
        [
          3,
          7
        ],
        [
          4,
          7
        ],
        [
          5,
          7
        ],
        [
          6,
          7
        ],
        [
          0,
          8
        ],
        [
          1,
          8
        ],
        [
          2,
          8
        ],
        [
          3,
          8
        ],
        [
          4,
          8
        ],
        [
          5,
          8
        ],
        [
          6,
          8
        ]
      ],
      "timeSeconds": 115,
      "parMoves": 204,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-29-6871441-b0",
          "x": 0,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-29-6871441-b1",
          "x": 0,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-29-6871441-b2",
          "x": 6,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-29-6871441-b3",
          "x": 0,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-29-6871441-b4",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-29-6871441-b5",
          "x": 3,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-29-6871441-b6",
          "x": 2,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-29-6871441-b7",
          "x": 1,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-29-6871441-b8",
          "x": 6,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-29-6871441-b9",
          "x": 4,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-29-6871441-b10",
          "x": 4,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-29-6871441-b11",
          "x": 5,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-29-6871441-b12",
          "x": 4,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-29-6871441-b13",
          "x": 3,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-29-6871441-b14",
          "x": 2,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-29-6871441-b15",
          "x": 5,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-29-6871441-b16",
          "x": 1,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-29-6871441-b17",
          "x": 4,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-29-6871441-b18",
          "x": 5,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-29-6871441-b19",
          "x": 3,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-29-6871441-b20",
          "x": 2,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-29-6871441-b21",
          "x": 4,
          "y": 7,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-29-6871441-b22",
          "x": 4,
          "y": 8,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "blue"
        }
      ],
      "gates": [
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "bottom",
          "offset": 5,
          "size": 2,
          "frozen": 13
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "right",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "left",
          "offset": 4,
          "size": 2
        },
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "left",
          "offset": 7,
          "size": 2,
          "frozen": 21
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "left",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "top",
          "offset": 4,
          "size": 2,
          "frozen": 10
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "left",
          "offset": 0,
          "size": 1,
          "frozen": 9
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "top",
          "offset": 0,
          "size": 2
        }
      ]
    },
    "proof": {
      "levelSha256": "c0a30fc007bb2dc322d72a97aa8e40dffc46c2397204d5e03ff1e2ea0e02cc54",
      "sourceLevelId": 29,
      "lowerBound": 31,
      "upperBound": 38,
      "routeReplayComplete": true,
      "reportSha256": "c868e91ad41544b254458274034449b1eb73b3bdbcf04f604c2791acbcd54b59",
      "routeSha256": "ee727372ef0f745767f20be70c53c3457451d3becc1368206ec1bbf4c9f2b293",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "c0a30fc007bb2dc322d72a97aa8e40dffc46c2397204d5e03ff1e2ea0e02cc54",
      "designReportSha256": "8049919a0d1837014a398b1830ddf61fa1b6e9690113bde7db3ec9d36295b2ff",
      "runtimeReportSha256": "550324a7a148dec8e77b80b7c298b7589564ad16e44ebaa2565bc5145a861d77",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-basic-combined-d3-07",
    "stageKey": "basic-combined",
    "difficulty": 3,
    "slot": 7,
    "sourceLevelId": 52,
    "layoutSha256": "07dc287ea2d32ebe90ce506d037135406adb6522c6ae01128b58ce8257d9ddc9",
    "admittedInRevision": "85d8c03fb3ac3eae4c8afeab8c17a1a13d68c79678ce73865dd88ec5a671413d",
    "dailyMechanisms": [
      "color-exit",
      "frozen-exit",
      "irregular-block"
    ],
    "level": {
      "id": 52,
      "name": "每日挑战 frozen-exit 3-2",
      "difficulty": "super",
      "reward": 0,
      "width": 6,
      "height": 8,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          5,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          5,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          5,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          5,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          5,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          5,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ],
        [
          5,
          6
        ],
        [
          0,
          7
        ],
        [
          1,
          7
        ],
        [
          2,
          7
        ],
        [
          3,
          7
        ],
        [
          4,
          7
        ],
        [
          5,
          7
        ]
      ],
      "timeSeconds": 105,
      "parMoves": 30,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-52-9267045-b0",
          "x": 4,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-52-9267045-b1",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-52-9267045-b2",
          "x": 5,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-52-9267045-b3",
          "x": 3,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-52-9267045-b4",
          "x": 4,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-52-9267045-b5",
          "x": 4,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-52-9267045-b6",
          "x": 0,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-52-9267045-b7",
          "x": 3,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-52-9267045-b8",
          "x": 0,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-52-9267045-b9",
          "x": 1,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-52-9267045-b10",
          "x": 1,
          "y": 4,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-52-9267045-b11",
          "x": 3,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-52-9267045-b12",
          "x": 4,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-52-9267045-b13",
          "x": 5,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-52-9267045-b14",
          "x": 4,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-52-9267045-b15",
          "x": 1,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              1,
              1
            ],
            [
              2,
              1
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-52-9267045-b16",
          "x": 2,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-52-9267045-b17",
          "x": 1,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-52-9267045-b18",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "blue"
        }
      ],
      "gates": [
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "left",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "right",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "top",
          "offset": 4,
          "size": 2
        },
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "right",
          "offset": 2,
          "size": 1,
          "frozen": 10
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "left",
          "offset": 4,
          "size": 2,
          "frozen": 17
        },
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "top",
          "offset": 0,
          "size": 2,
          "frozen": 14
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "right",
          "offset": 0,
          "size": 1,
          "frozen": 8
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "bottom",
          "offset": 3,
          "size": 2
        }
      ]
    },
    "proof": {
      "levelSha256": "07dc287ea2d32ebe90ce506d037135406adb6522c6ae01128b58ce8257d9ddc9",
      "sourceLevelId": 52,
      "lowerBound": 31,
      "upperBound": 33,
      "routeReplayComplete": true,
      "reportSha256": "657a8a95afa27064eb766743a66efc87f48eae1f56b67360cf860ca2748ed3ba",
      "routeSha256": "f634f0a10ed17a61ec8d80101014cd9d0a0b84f09a513b6bc2ee3fb0597f174e",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "07dc287ea2d32ebe90ce506d037135406adb6522c6ae01128b58ce8257d9ddc9",
      "designReportSha256": "8049919a0d1837014a398b1830ddf61fa1b6e9690113bde7db3ec9d36295b2ff",
      "runtimeReportSha256": "d0d625befa0460f91066e6cb888b8a413f66430c973affbb61acf615a8c169d1",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-basic-combined-d3-04",
    "stageKey": "basic-combined",
    "difficulty": 3,
    "slot": 4,
    "sourceLevelId": 100,
    "layoutSha256": "3389ea4876867b2dd2394a34a491d2efc56881248612dcd91e6b68fdea2cbdf3",
    "admittedInRevision": "67b5b457d871a7c5d1f83eb3537ed99bf619951e5fe4d3af32f3d4f9024e4d42",
    "dailyMechanisms": [
      "color-exit",
      "numeric-ice"
    ],
    "level": {
      "id": 100,
      "name": "每日挑战 numeric-ice 3-1",
      "difficulty": "super",
      "reward": 0,
      "width": 6,
      "height": 8,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          5,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          5,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          5,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          5,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          5,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          5,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ],
        [
          5,
          6
        ],
        [
          0,
          7
        ],
        [
          1,
          7
        ],
        [
          2,
          7
        ],
        [
          3,
          7
        ],
        [
          4,
          7
        ],
        [
          5,
          7
        ]
      ],
      "timeSeconds": 180,
      "parMoves": 30,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-100-7949656-b0",
          "x": 5,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "red",
          "frozen": 10
        },
        {
          "id": "v3-100-7949656-b1",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-100-7949656-b2",
          "x": 5,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-100-7949656-b3",
          "x": 4,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-100-7949656-b4",
          "x": 4,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-100-7949656-b8",
          "x": 2,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-100-7949656-b9",
          "x": 1,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-100-7949656-b10",
          "x": 1,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-100-7949656-b11",
          "x": 3,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-100-7949656-b12",
          "x": 2,
          "y": 6,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-100-7949656-b5",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "yellow",
          "frozen": 16
        },
        {
          "id": "v3-100-7949656-b16",
          "x": 1,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "green",
          "frozen": 17
        },
        {
          "id": "v3-100-1768392924-b17",
          "x": 4,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-100-7949656-b13",
          "x": 3,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-100-7949656-b15",
          "x": 4,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-100-7949656-b6",
          "x": 0,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-100-7949656-b7",
          "x": 3,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-100-7949656-b14",
          "x": 1,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "blue",
          "frozen": 14
        },
        {
          "id": "v3-100-1768401410-b18",
          "x": 0,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "green"
        }
      ],
      "gates": [
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "right",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "right",
          "offset": 4,
          "size": 2
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "bottom",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "bottom",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "left",
          "offset": 1,
          "size": 1
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "left",
          "offset": 6,
          "size": 2
        }
      ]
    },
    "proof": {
      "levelSha256": "3389ea4876867b2dd2394a34a491d2efc56881248612dcd91e6b68fdea2cbdf3",
      "sourceLevelId": 100,
      "lowerBound": 31,
      "upperBound": 35,
      "routeReplayComplete": true,
      "reportSha256": "427c30088c5087a94d20c97c50328d3ed16862fc0929c1a7767dbe704aab3532",
      "routeSha256": "d3f8795a7b3d1d78d2f207878cdf03cb6b46ce671ffe794e0b19fcb6c4550c40",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "3389ea4876867b2dd2394a34a491d2efc56881248612dcd91e6b68fdea2cbdf3",
      "designReportSha256": "3659c55ca176af1ac9d9fd0d09815a1a15465e4146fd48a5c1cd3c7a9202edd6",
      "runtimeReportSha256": "4827fe077605349fc56f242387665e93e65bf20e1468a321a06d82607ce83d15",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-basic-combined-d3-01",
    "stageKey": "basic-combined",
    "difficulty": 3,
    "slot": 1,
    "sourceLevelId": 54,
    "layoutSha256": "72c0e870409f35bd11c3609388d666b0c3e4919fd320ffbdbd3b3d73fe66d881",
    "admittedInRevision": "35073364078b1fd6cf9c1b9a07d574e3b12bea7f0c75c20b2aa1a4829657842e",
    "dailyMechanisms": [
      "color-exit",
      "irregular-block"
    ],
    "level": {
      "id": 54,
      "name": "每日挑战多样原型 54-7083810",
      "difficulty": "super",
      "reward": 0,
      "width": 7,
      "height": 10,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          5,
          0
        ],
        [
          6,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          5,
          1
        ],
        [
          6,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          5,
          2
        ],
        [
          6,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          5,
          3
        ],
        [
          6,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          5,
          4
        ],
        [
          6,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          5,
          5
        ],
        [
          6,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ],
        [
          5,
          6
        ],
        [
          6,
          6
        ],
        [
          0,
          7
        ],
        [
          1,
          7
        ],
        [
          2,
          7
        ],
        [
          3,
          7
        ],
        [
          4,
          7
        ],
        [
          5,
          7
        ],
        [
          6,
          7
        ],
        [
          0,
          8
        ],
        [
          1,
          8
        ],
        [
          2,
          8
        ],
        [
          3,
          8
        ],
        [
          4,
          8
        ],
        [
          5,
          8
        ],
        [
          6,
          8
        ],
        [
          0,
          9
        ],
        [
          1,
          9
        ],
        [
          2,
          9
        ],
        [
          3,
          9
        ],
        [
          4,
          9
        ],
        [
          5,
          9
        ],
        [
          6,
          9
        ]
      ],
      "timeSeconds": 180,
      "parMoves": 37,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-54-7083810-b0",
          "x": 6,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-54-7083810-b1",
          "x": 0,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-54-7083810-b2",
          "x": 1,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-54-7083810-b3",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-54-7083810-b4",
          "x": 0,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-54-7083810-b5",
          "x": 0,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-54-7083810-b6",
          "x": 2,
          "y": 9,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-54-7083810-b7",
          "x": 5,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-54-7083810-b8",
          "x": 4,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-54-7083810-b9",
          "x": 2,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-54-7083810-b10",
          "x": 2,
          "y": 8,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-54-7083810-b11",
          "x": 4,
          "y": 8,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-54-7083810-b12",
          "x": 3,
          "y": 6,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-54-7083810-b13",
          "x": 1,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-54-7083810-b14",
          "x": 1,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-54-7083810-b15",
          "x": 2,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-54-7083810-b16",
          "x": 5,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-54-7083810-b17",
          "x": 4,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-54-7083810-b18",
          "x": 3,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-54-7083810-b19",
          "x": 5,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-54-7083810-b20",
          "x": 4,
          "y": 1,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-54-7083810-b21",
          "x": 6,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-54-7083810-b22",
          "x": 5,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-54-7083810-b23",
          "x": 3,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-54-7083810-b24",
          "x": 1,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              0,
              2
            ],
            [
              1,
              2
            ]
          ],
          "color": "orange"
        }
      ],
      "gates": [
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "top",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "right",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "top",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "right",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "left",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "right",
          "offset": 7,
          "size": 2
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "left",
          "offset": 5,
          "size": 2
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "bottom",
          "offset": 0,
          "size": 2
        }
      ]
    },
    "proof": {
      "levelSha256": "72c0e870409f35bd11c3609388d666b0c3e4919fd320ffbdbd3b3d73fe66d881",
      "sourceLevelId": 54,
      "lowerBound": 46,
      "upperBound": 46,
      "routeReplayComplete": true,
      "reportSha256": "2ec26b77333a32e6527ef5cefdeaa5cba9d889474c00a37d0b6fc60a761edc99",
      "routeSha256": "1576ad2698b970cb32cdc35d72a6216267f036b7f2a311b977efa853a0cee6ef",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "72c0e870409f35bd11c3609388d666b0c3e4919fd320ffbdbd3b3d73fe66d881",
      "designReportSha256": "788ba02c0e255ebf6e86f4e3d00e512cbb73ed382a052b613d34d96d77986f79",
      "runtimeReportSha256": "1471803fb9fe1a10f4c08f50926448d4bc21580ac4c9b404292562a33879f95b",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-basic-combined-d3-05",
    "stageKey": "basic-combined",
    "difficulty": 3,
    "slot": 5,
    "sourceLevelId": 86,
    "layoutSha256": "1fa82f486a651a076fe61e598e1e33185a5e88a1a332d19470b8c4c798753325",
    "admittedInRevision": "e2ec651c864157413a1b96ab72312907796210216c39fabb8ab684b151e4eaea",
    "dailyMechanisms": [
      "color-exit",
      "irregular-board"
    ],
    "level": {
      "id": 86,
      "name": "荣耀联赛全局重铺候选 86-9593710",
      "difficulty": "super",
      "reward": 0,
      "width": 4,
      "height": 6,
      "playable": [
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ]
      ],
      "timeSeconds": 80,
      "parMoves": 31,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-86-9593710-b0",
          "x": 1,
          "y": 0,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-86-9593710-b1",
          "x": 2,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-86-9593710-b2",
          "x": 3,
          "y": 1,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-86-9593710-b3",
          "x": 0,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-86-9593710-b4",
          "x": 1,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-86-9593710-b5",
          "x": 2,
          "y": 2,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-86-9593710-b6",
          "x": 3,
          "y": 2,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-86-9593710-b7",
          "x": 3,
          "y": 3,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-86-9593710-b8",
          "x": 3,
          "y": 4,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-86-9593710-b9",
          "x": 1,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-86-9593710-b10",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-86-9593710-b11",
          "x": 0,
          "y": 3,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-86-9593710-b12",
          "x": 1,
          "y": 4,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-86-9593710-b13",
          "x": 1,
          "y": 3,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-86-9593710-b14",
          "x": 2,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-86-9593710-b15",
          "x": 0,
          "y": 4,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "purple"
        }
      ],
      "gates": [
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "right",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "bottom",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "top",
          "offset": 2,
          "size": 1
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "left",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "left",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "bottom",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "right",
          "offset": 4,
          "size": 1
        },
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "right",
          "offset": 5,
          "size": 1
        }
      ]
    },
    "proof": {
      "levelSha256": "1fa82f486a651a076fe61e598e1e33185a5e88a1a332d19470b8c4c798753325",
      "sourceLevelId": 86,
      "lowerBound": 37,
      "upperBound": 37,
      "routeReplayComplete": true,
      "reportSha256": "42747f880f9ca5db3661a226e47da4d85379091bafeb3e7066a4f30cd9c4d2fb",
      "routeSha256": "84a46b7129a08ebe8db0660854ecc579fb73d487cd3ec3e5ff3a5ff7d5ee9021",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "1fa82f486a651a076fe61e598e1e33185a5e88a1a332d19470b8c4c798753325",
      "designReportSha256": "788ba02c0e255ebf6e86f4e3d00e512cbb73ed382a052b613d34d96d77986f79",
      "runtimeReportSha256": "9587e8a45cd0e84bd597647080fc1efa24a67909b5a366af210cbc34c43e2bca",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-basic-combined-d3-06",
    "stageKey": "basic-combined",
    "difficulty": 3,
    "slot": 6,
    "sourceLevelId": 60,
    "layoutSha256": "96b8e234004e927edd48b8c3bf0eaa203008d9a4039eeba34fd5349c41ee8566",
    "admittedInRevision": "1f68741cc303784cd10f748d24deab5f00b9c033258895136a604f2689c61ed8",
    "dailyMechanisms": [
      "color-exit",
      "irregular-block"
    ],
    "level": {
      "id": 60,
      "name": "每日挑战多样原型 60-7312492",
      "difficulty": "super",
      "reward": 0,
      "width": 5,
      "height": 7,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ]
      ],
      "timeSeconds": 90,
      "parMoves": 52,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-60-7312492-b0",
          "x": 4,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-60-7312492-b1",
          "x": 0,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-60-7312492-b2",
          "x": 2,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-60-7312492-b3",
          "x": 1,
          "y": 5,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-60-7312492-b4",
          "x": 0,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-60-7312492-b5",
          "x": 1,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-60-7312492-b6",
          "x": 3,
          "y": 4,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-60-7312492-b7",
          "x": 3,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-60-7312492-b8",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-60-7312492-b9",
          "x": 0,
          "y": 2,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-60-7312492-b10",
          "x": 0,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-60-7312492-b11",
          "x": 4,
          "y": 2,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-60-7312492-b12",
          "x": 3,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-60-7312492-b13",
          "x": 1,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              2,
              1
            ]
          ],
          "color": "orange"
        }
      ],
      "gates": [
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "right",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "left",
          "offset": 4,
          "size": 2
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "left",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "right",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "right",
          "offset": 5,
          "size": 2
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "top",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "bottom",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "bottom",
          "offset": 0,
          "size": 1
        }
      ]
    },
    "proof": {
      "levelSha256": "96b8e234004e927edd48b8c3bf0eaa203008d9a4039eeba34fd5349c41ee8566",
      "sourceLevelId": 60,
      "lowerBound": 29,
      "upperBound": 29,
      "routeReplayComplete": true,
      "reportSha256": "90fd31ee42b15690c424fc36d9ab98f1c6c1abf5ff510118a220c148f7d1c495",
      "routeSha256": "5d8dd0f90c3b5c372c9bb4c7b41933d63621a102178c2b1ae2038fb6bb921c2b",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "96b8e234004e927edd48b8c3bf0eaa203008d9a4039eeba34fd5349c41ee8566",
      "designReportSha256": "162e44802b003e77b74552f6e3a4b1f262cdb0b030c245a02e087a6a2b588c06",
      "runtimeReportSha256": "76554881a0caf8ecbe2ab604014966315581938abbcbb994a9c47aaa327a2743",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-basic-combined-d3-09",
    "stageKey": "basic-combined",
    "difficulty": 3,
    "slot": 9,
    "sourceLevelId": 18,
    "layoutSha256": "36fd8347153c8854a401c42ddfcd20f934f098255d8ba5fc82adf99ce1a1f570",
    "admittedInRevision": "f8c5a3aa0ddea2d8a34e2f624fcf3e86b193b1297ec0e77f46656b7f23220ef1",
    "dailyMechanisms": [
      "color-exit"
    ],
    "level": {
      "id": 18,
      "name": "每日挑战多样原型 18-6841290",
      "difficulty": "super",
      "reward": 0,
      "width": 5,
      "height": 8,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ],
        [
          0,
          7
        ],
        [
          1,
          7
        ],
        [
          2,
          7
        ],
        [
          3,
          7
        ],
        [
          4,
          7
        ]
      ],
      "timeSeconds": 75,
      "parMoves": 28,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-18-6841290-b0",
          "x": 0,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-18-6841290-b1",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-18-6841290-b3",
          "x": 2,
          "y": 6,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-18-6841290-b4",
          "x": 2,
          "y": 7,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-18-6841290-b5",
          "x": 1,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-18-6841290-b6",
          "x": 2,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-18-6841290-b7",
          "x": 3,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-18-6841290-b8",
          "x": 3,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-18-6841290-b9",
          "x": 4,
          "y": 5,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-18-6841290-b2",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-18-6841290-b10",
          "x": 0,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              2,
              1
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-18-6841290-b11",
          "x": 3,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-18-6841290-b12",
          "x": 4,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-18-6841290-b13",
          "x": 3,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "late-811217594-6",
          "x": 1,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              0,
              2
            ],
            [
              1,
              2
            ]
          ],
          "color": "orange"
        }
      ],
      "gates": [
        {
          "id": "late-aware-blue",
          "color": "blue",
          "side": "right",
          "offset": 5,
          "size": 1
        },
        {
          "id": "late-aware-yellow",
          "color": "yellow",
          "side": "top",
          "offset": 0,
          "size": 2
        },
        {
          "id": "late-aware-purple",
          "color": "purple",
          "side": "top",
          "offset": 3,
          "size": 1
        },
        {
          "id": "late-aware-pink",
          "color": "pink",
          "side": "right",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "bottom",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "left",
          "offset": 5,
          "size": 2
        },
        {
          "id": "late-aware-cyan",
          "color": "cyan",
          "side": "right",
          "offset": 3,
          "size": 2
        },
        {
          "id": "late-aware-green",
          "color": "green",
          "side": "right",
          "offset": 6,
          "size": 2
        }
      ]
    },
    "proof": {
      "levelSha256": "36fd8347153c8854a401c42ddfcd20f934f098255d8ba5fc82adf99ce1a1f570",
      "sourceLevelId": 18,
      "lowerBound": 31,
      "upperBound": 39,
      "routeReplayComplete": true,
      "reportSha256": "246088d178d068f245f32e18e04ae3b0aee820db358aefd2f6b30827fa35749a",
      "routeSha256": "c52ae5aff3d92ed8b6892e1a97c155e63b614b02747b836b13be3d22b07fc62d",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "36fd8347153c8854a401c42ddfcd20f934f098255d8ba5fc82adf99ce1a1f570",
      "designReportSha256": "aa9f993da34065911020836a96b0e14af0d2b9af2a249ec823825cc2b48761b6",
      "runtimeReportSha256": "80c520d03c628c89bf4b722ebbb5cb8146da9f32b2a7f404bb3b3d4fd265f4e5",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-basic-combined-d2-06",
    "stageKey": "basic-combined",
    "difficulty": 2,
    "slot": 6,
    "sourceLevelId": 3,
    "layoutSha256": "72d33cae9009c9335880d4ed94ba16c8b9d44b1ba8343b7bb107b31a0dc75543",
    "admittedInRevision": "78f3b295f93e7267121f925d944811116a9ed399c97d6364e80be842f65df20c",
    "dailyMechanisms": [
      "color-exit",
      "irregular-block"
    ],
    "level": {
      "id": 3,
      "name": "荣耀联赛全局重铺候选 3-9922717",
      "difficulty": "super",
      "reward": 0,
      "width": 6,
      "height": 6,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          5,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          5,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          5,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          5,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          5,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          5,
          5
        ]
      ],
      "blocked": [],
      "timeSeconds": 180,
      "parMoves": 14,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-3-9922717-b0",
          "x": 3,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-3-9922717-b1",
          "x": 2,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              3,
              0
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-3-9922717-b2",
          "x": 0,
          "y": 0,
          "shape": [
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-3-9922717-b3",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-3-9922717-b4",
          "x": 5,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-3-9922717-b5",
          "x": 4,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-3-9922717-b6",
          "x": 2,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-3-9922717-b7",
          "x": 2,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-3-9922717-b8",
          "x": 1,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-3-9922717-b9",
          "x": 0,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-3-9922717-b10",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-3-9922717-b11",
          "x": 3,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "pink"
        }
      ],
      "gates": [
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "right",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "left",
          "offset": 0,
          "size": 1
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "top",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "left",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "bottom",
          "offset": 4,
          "size": 2
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "top",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "top",
          "offset": 4,
          "size": 1
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "right",
          "offset": 5,
          "size": 1
        }
      ]
    },
    "proof": {
      "levelSha256": "72d33cae9009c9335880d4ed94ba16c8b9d44b1ba8343b7bb107b31a0dc75543",
      "sourceLevelId": 3,
      "lowerBound": 24,
      "upperBound": 24,
      "routeReplayComplete": true,
      "reportSha256": "352e0e043c9e2f76d516964beaef5926bd3afdb27e9d971496d454f5d63bd45f",
      "routeSha256": "382566a7a9b4ac2fe27ae1f71d2795584ca8a4e86df88cb6772cdd6ebcfdd9db",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "72d33cae9009c9335880d4ed94ba16c8b9d44b1ba8343b7bb107b31a0dc75543",
      "designReportSha256": "a59f65d13d428e7d0d1cd0b4b6bc76640673acc4e53beeca41e151c7d22fca0e",
      "runtimeReportSha256": "20a8bf3837429edea22de0aa2dd741340105f19a6633f26d5769b427e28874b0",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-basic-combined-d3-08",
    "stageKey": "basic-combined",
    "difficulty": 3,
    "slot": 8,
    "sourceLevelId": 42,
    "layoutSha256": "06919a1e981046a05746560a5f75f94b98898c98c15802163975856b04497bef",
    "admittedInRevision": "bbb9006659488b05c6b47dc03ff2317bb5ef4c365a65053f4d6c1390901830cb",
    "dailyMechanisms": [
      "color-exit",
      "irregular-block",
      "irregular-board"
    ],
    "level": {
      "id": 42,
      "name": "荣耀联赛全局重铺候选 42-10134856",
      "difficulty": "super",
      "reward": 0,
      "width": 5,
      "height": 9,
      "playable": [
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ],
        [
          0,
          7
        ],
        [
          1,
          7
        ],
        [
          2,
          7
        ],
        [
          3,
          7
        ],
        [
          4,
          7
        ],
        [
          1,
          8
        ],
        [
          2,
          8
        ],
        [
          3,
          8
        ]
      ],
      "timeSeconds": 135,
      "parMoves": 49,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-42-10134856-b0",
          "x": 2,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-42-10134856-b1",
          "x": 1,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-42-10134856-b2",
          "x": 0,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-42-10134856-b3",
          "x": 3,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-42-10134856-b4",
          "x": 4,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-42-10134856-b5",
          "x": 2,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-42-10134856-b6",
          "x": 3,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-42-10134856-b7",
          "x": 0,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "red"
        },
        {
          "id": "v3-42-10134856-b8",
          "x": 1,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-42-10134856-b9",
          "x": 0,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-42-10134856-b10",
          "x": 1,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-42-10134856-b11",
          "x": 3,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-42-10134856-b12",
          "x": 1,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-42-10134856-b13",
          "x": 3,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-42-10134856-b14",
          "x": 2,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              2,
              1
            ]
          ],
          "color": "orange"
        }
      ],
      "gates": [
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "right",
          "offset": 4,
          "size": 2
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "left",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "bottom",
          "offset": 1,
          "size": 1
        },
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "bottom",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "left",
          "offset": 5,
          "size": 2
        },
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "top",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "right",
          "offset": 6,
          "size": 2
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "right",
          "offset": 1,
          "size": 1
        }
      ]
    },
    "proof": {
      "levelSha256": "06919a1e981046a05746560a5f75f94b98898c98c15802163975856b04497bef",
      "sourceLevelId": 42,
      "lowerBound": 36,
      "upperBound": 36,
      "routeReplayComplete": true,
      "reportSha256": "3f0bf242660ec742f66dc5835fcdbdee69d278ffe89ab956cc736ee478ceff3f",
      "routeSha256": "a6ef444bbbcb6b1e00973c4983229173a59eb06a12563317759e0f25ff330cf1",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "06919a1e981046a05746560a5f75f94b98898c98c15802163975856b04497bef",
      "designReportSha256": "e80171300d060bf6af78d0d39913b36474e61e6c380a75d3468cf15c0ecc8d96",
      "runtimeReportSha256": "619376d30188661e9d78715e19afd2a573c4e2b3a019eec2932a3d00db4bd54b",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-basic-combined-d3-10",
    "stageKey": "basic-combined",
    "difficulty": 3,
    "slot": 10,
    "sourceLevelId": 118,
    "layoutSha256": "f073384f1ad286fe48b68eb8f8763289ce112a924d6fc7b81f1c24acf7b47d70",
    "admittedInRevision": "58acb0df46e64ae466df2c3ce7c6d8bd910a335be3752375237f7f24956cdc3e",
    "dailyMechanisms": [
      "color-exit"
    ],
    "level": {
      "id": 118,
      "name": "每日挑战多样原型 118-7652547",
      "difficulty": "super",
      "reward": 0,
      "width": 7,
      "height": 8,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          5,
          0
        ],
        [
          6,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          5,
          1
        ],
        [
          6,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          5,
          2
        ],
        [
          6,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          5,
          3
        ],
        [
          6,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          5,
          4
        ],
        [
          6,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          5,
          5
        ],
        [
          6,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ],
        [
          5,
          6
        ],
        [
          6,
          6
        ],
        [
          0,
          7
        ],
        [
          1,
          7
        ],
        [
          2,
          7
        ],
        [
          3,
          7
        ],
        [
          4,
          7
        ],
        [
          5,
          7
        ],
        [
          6,
          7
        ]
      ],
      "timeSeconds": 120,
      "parMoves": 34,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "v3-118-7652547-b0",
          "x": 4,
          "y": 0,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-118-7652547-b1",
          "x": 5,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              0,
              2
            ],
            [
              1,
              2
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-118-7652547-b2",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-118-7652547-b3",
          "x": 1,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-118-7652547-b4",
          "x": 4,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-118-7652547-b5",
          "x": 3,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-118-7652547-b6",
          "x": 2,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-118-7652547-b7",
          "x": 5,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-118-7652547-b8",
          "x": 6,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-118-7652547-b9",
          "x": 0,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-118-7652547-b10",
          "x": 1,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "v3-118-7652547-b11",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-118-7652547-b12",
          "x": 1,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "v3-118-7652547-b13",
          "x": 5,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "pink"
        },
        {
          "id": "v3-118-7652547-b14",
          "x": 3,
          "y": 7,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "v3-118-7652547-b15",
          "x": 3,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-118-7652547-b16",
          "x": 4,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "v3-118-7652547-b17",
          "x": 4,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "orange"
        },
        {
          "id": "v3-118-7652547-b18",
          "x": 2,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "v3-118-7652547-b19",
          "x": 3,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "yellow"
        }
      ],
      "gates": [
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "top",
          "offset": 4,
          "size": 2
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "right",
          "offset": 6,
          "size": 2
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "left",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "left",
          "offset": 5,
          "size": 2
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "bottom",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "left",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "right",
          "offset": 4,
          "size": 1
        },
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "bottom",
          "offset": 4,
          "size": 2
        }
      ]
    },
    "proof": {
      "levelSha256": "f073384f1ad286fe48b68eb8f8763289ce112a924d6fc7b81f1c24acf7b47d70",
      "sourceLevelId": 118,
      "lowerBound": 40,
      "upperBound": 40,
      "routeReplayComplete": true,
      "reportSha256": "f28399c6e4975229e9c3b00333923bbd0c4fe9ba6174d5691594cfbd15b76228",
      "routeSha256": "063cf6f60c9812aa483085dc21269cc0c097062ab667ef51022bed23a97071ba",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "f073384f1ad286fe48b68eb8f8763289ce112a924d6fc7b81f1c24acf7b47d70",
      "designReportSha256": "e80171300d060bf6af78d0d39913b36474e61e6c380a75d3468cf15c0ecc8d96",
      "runtimeReportSha256": "326716d3306168b453f4cfb5e557f754958ce86e3909d91cc359479be936e540",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-mechanisms-multilayer-shell-15-d1-01",
    "stageKey": "mechanisms-multilayer-shell-15",
    "difficulty": 1,
    "slot": 1,
    "sourceLevelId": 7,
    "layoutSha256": "2aa3bb2a9eb3117ed3789109e63641efbfe0a516631eb83da1098d7c00d00dad",
    "admittedInRevision": "440cf042714d182855ea6dd301584680dc09603e6b37678608b72665737a5250",
    "dailyMechanisms": [
      "color-exit",
      "multilayer-shell"
    ],
    "level": {
      "id": 7,
      "name": "每日挑战 外壳通路",
      "difficulty": "hard",
      "reward": 0,
      "width": 5,
      "height": 8,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ],
        [
          0,
          7
        ],
        [
          1,
          7
        ],
        [
          2,
          7
        ],
        [
          3,
          7
        ],
        [
          4,
          7
        ]
      ],
      "timeSeconds": 120,
      "parMoves": 24,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "shell-d101-s7-n02-b0",
          "x": 2,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "shell-d101-s7-n02-b1",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "shell-d101-s7-n02-b16",
          "x": 1,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "red"
        },
        {
          "id": "shell-d101-s7-n02-b2",
          "x": 2,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "pink"
        },
        {
          "id": "shell-d101-s7-n02-b3",
          "x": 4,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "shell-d101-s7-n02-b4",
          "x": 3,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "green"
        },
        {
          "id": "shell-d101-s7-n02-b5",
          "x": 2,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "red",
          "layers": [
            "red",
            "yellow"
          ]
        },
        {
          "id": "shell-d101-s7-n02-b6",
          "x": 3,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "shell-d101-s7-n02-b7",
          "x": 4,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "green"
        },
        {
          "id": "shell-d101-s7-n02-b8",
          "x": 0,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "orange"
        },
        {
          "id": "shell-d101-s7-n02-b9",
          "x": 0,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "red",
          "layers": [
            "red",
            "cyan"
          ]
        },
        {
          "id": "shell-d101-s7-n02-b10",
          "x": 1,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "shell-d101-s7-n02-b11",
          "x": 3,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "orange"
        },
        {
          "id": "shell-d101-s7-n02-b12",
          "x": 3,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "shell-d101-s7-n02-b13",
          "x": 0,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "orange"
        },
        {
          "id": "shell-d101-s7-n02-b14",
          "x": 2,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "shell-d101-s7-n02-b15",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "pink"
        }
      ],
      "gates": [
        {
          "id": "shell-d101-s7-n02-g-green",
          "color": "green",
          "side": "right",
          "offset": 2,
          "size": 2
        },
        {
          "id": "shell-d101-s7-n02-g-orange",
          "color": "orange",
          "side": "left",
          "offset": 4,
          "size": 2
        },
        {
          "id": "shell-d101-s7-n02-g-purple",
          "color": "purple",
          "side": "right",
          "offset": 4,
          "size": 2
        },
        {
          "id": "shell-d101-s7-n02-g-cyan",
          "color": "cyan",
          "side": "left",
          "offset": 6,
          "size": 2
        },
        {
          "id": "shell-d101-s7-n02-g-blue",
          "color": "blue",
          "side": "top",
          "offset": 3,
          "size": 2
        },
        {
          "id": "shell-d101-s7-n02-g-yellow",
          "color": "yellow",
          "side": "bottom",
          "offset": 2,
          "size": 2
        },
        {
          "id": "shell-d101-s7-n02-g-pink",
          "color": "pink",
          "side": "top",
          "offset": 1,
          "size": 2
        },
        {
          "id": "shell-d101-s7-n02-g-red",
          "color": "red",
          "side": "bottom",
          "offset": 1,
          "size": 1
        }
      ]
    },
    "proof": {
      "levelSha256": "2aa3bb2a9eb3117ed3789109e63641efbfe0a516631eb83da1098d7c00d00dad",
      "sourceLevelId": 7,
      "lowerBound": 13,
      "upperBound": 17,
      "routeReplayComplete": true,
      "reportSha256": "93881034815fa9a9a9a998d92a18f996c5ae3b425f3bd1227bde7df4833fa54c",
      "routeSha256": "9e0770d979064286e8a9208b7eb4a7a18fb71b5b70c16a412811dd018f5c08ce",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "2aa3bb2a9eb3117ed3789109e63641efbfe0a516631eb83da1098d7c00d00dad",
      "designReportSha256": "29eb6c8343a626b1f3b002425a73db03ad7dfe9e1b218ca7ff33f6140c83b33d",
      "runtimeReportSha256": "251a74d0724624ca5faf8ae485a259906974bc54e56d6ff94c85d2214cbb44f1",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-mechanisms-multilayer-shell-15-d1-02",
    "stageKey": "mechanisms-multilayer-shell-15",
    "difficulty": 1,
    "slot": 2,
    "sourceLevelId": 21,
    "layoutSha256": "32e5a7971fa9f4b9a638c069255f90926ca8e36834bf9152298b07c85c4b5469",
    "admittedInRevision": "2edd65df2b1094d0a6a0b7da6da2dc5fa0cb94bb27dbef8e2738d83ca7fde967",
    "dailyMechanisms": [
      "color-exit",
      "multilayer-shell"
    ],
    "level": {
      "id": 21,
      "name": "每日挑战 外壳转门",
      "difficulty": "hard",
      "reward": 0,
      "width": 6,
      "height": 9,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          5,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          5,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          5,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          5,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          5,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          5,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ],
        [
          5,
          6
        ],
        [
          0,
          7
        ],
        [
          1,
          7
        ],
        [
          2,
          7
        ],
        [
          3,
          7
        ],
        [
          4,
          7
        ],
        [
          5,
          7
        ],
        [
          0,
          8
        ],
        [
          1,
          8
        ],
        [
          2,
          8
        ],
        [
          3,
          8
        ],
        [
          4,
          8
        ],
        [
          5,
          8
        ]
      ],
      "timeSeconds": 130,
      "parMoves": 33,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "shell-d102-s21-n01-b0",
          "x": 3,
          "y": 8,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "red"
        },
        {
          "id": "shell-d102-s21-n01-b1",
          "x": 4,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "blue"
        },
        {
          "id": "shell-d102-s21-n01-b13",
          "x": 4,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "shell-d102-s21-n01-b2",
          "x": 4,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "green"
        },
        {
          "id": "shell-d102-s21-n01-b3",
          "x": 4,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "shell-d102-s21-n01-b4",
          "x": 4,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "pink"
        },
        {
          "id": "shell-d102-s21-n01-b5",
          "x": 1,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "pink",
          "layers": [
            "pink",
            "red"
          ]
        },
        {
          "id": "shell-d102-s21-n01-b6",
          "x": 3,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "orange"
        },
        {
          "id": "shell-d102-s21-n01-b7",
          "x": 0,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "shell-d102-s21-n01-b8",
          "x": 1,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "red",
          "layers": [
            "red",
            "orange"
          ]
        },
        {
          "id": "shell-d102-s21-n01-b9",
          "x": 0,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              0,
              2
            ],
            [
              1,
              2
            ]
          ],
          "color": "orange"
        },
        {
          "id": "shell-d102-s21-n01-b10",
          "x": 2,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              0,
              2
            ],
            [
              1,
              2
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "shell-d102-s21-n01-b11",
          "x": 2,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              0,
              2
            ],
            [
              1,
              2
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "shell-d102-s21-n01-b12",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              0,
              2
            ],
            [
              1,
              2
            ]
          ],
          "color": "yellow"
        }
      ],
      "gates": [
        {
          "id": "shell-d102-s21-n01-g-pink",
          "color": "pink",
          "side": "left",
          "offset": 3,
          "size": 2
        },
        {
          "id": "shell-d102-s21-n01-g-red",
          "color": "red",
          "side": "left",
          "offset": 0,
          "size": 2
        },
        {
          "id": "shell-d102-s21-n01-g-yellow",
          "color": "yellow",
          "side": "bottom",
          "offset": 1,
          "size": 2
        },
        {
          "id": "shell-d102-s21-n01-g-orange",
          "color": "orange",
          "side": "top",
          "offset": 0,
          "size": 2
        },
        {
          "id": "shell-d102-s21-n01-g-green",
          "color": "green",
          "side": "right",
          "offset": 7,
          "size": 2
        },
        {
          "id": "shell-d102-s21-n01-g-cyan",
          "color": "cyan",
          "side": "top",
          "offset": 4,
          "size": 2
        },
        {
          "id": "shell-d102-s21-n01-g-blue",
          "color": "blue",
          "side": "right",
          "offset": 0,
          "size": 1
        },
        {
          "id": "shell-d102-s21-n01-g-purple",
          "color": "purple",
          "side": "right",
          "offset": 1,
          "size": 1
        }
      ]
    },
    "proof": {
      "levelSha256": "32e5a7971fa9f4b9a638c069255f90926ca8e36834bf9152298b07c85c4b5469",
      "sourceLevelId": 21,
      "lowerBound": 13,
      "upperBound": 18,
      "routeReplayComplete": true,
      "reportSha256": "6c945fdbfb2d696565816987f2e34ce561736f96946a526de1a0de5e26b104ad",
      "routeSha256": "2c64de94b83c522cdd1149828e9359b095cea98665f3cafab247b39ce231842c",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "32e5a7971fa9f4b9a638c069255f90926ca8e36834bf9152298b07c85c4b5469",
      "designReportSha256": "14638bca69f1f8e0a107c34690b960c4ff736cfc0243da9cf409e5c6ac9b84ca",
      "runtimeReportSha256": "d6595887a213559ab86c4d21ea86ebf9a7a5bd3be3e116e51e0dded5d6701115",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-mechanisms-multilayer-shell-15-d1-03",
    "stageKey": "mechanisms-multilayer-shell-15",
    "difficulty": 1,
    "slot": 3,
    "sourceLevelId": 109,
    "layoutSha256": "317b75ef9dc5df78c0e7716599b43108ca82c859bf9ac5b934591319fb6f2b8d",
    "admittedInRevision": "239c136d5cfe493f09fcbf0b07616e1db5d01c2125eabd5008a03a28eb515f39",
    "dailyMechanisms": [
      "color-exit",
      "multilayer-shell",
      "irregular-board"
    ],
    "level": {
      "id": 109,
      "name": "每日挑战 下路换壳",
      "difficulty": "hard",
      "reward": 0,
      "width": 7,
      "height": 9,
      "playable": [
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          5,
          0
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          5,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          5,
          2
        ],
        [
          6,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          5,
          3
        ],
        [
          6,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          5,
          4
        ],
        [
          6,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          5,
          5
        ],
        [
          6,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ],
        [
          5,
          6
        ],
        [
          6,
          6
        ],
        [
          0,
          7
        ],
        [
          1,
          7
        ],
        [
          2,
          7
        ],
        [
          3,
          7
        ],
        [
          4,
          7
        ],
        [
          5,
          7
        ],
        [
          6,
          7
        ],
        [
          0,
          8
        ],
        [
          1,
          8
        ],
        [
          2,
          8
        ],
        [
          3,
          8
        ],
        [
          4,
          8
        ],
        [
          5,
          8
        ],
        [
          6,
          8
        ]
      ],
      "timeSeconds": 110,
      "parMoves": 60,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "shell-d103-s109-n01-b0",
          "x": 6,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "shell-d103-s109-n01-b1",
          "x": 4,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "shell-d103-s109-n01-b2",
          "x": 1,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "orange"
        },
        {
          "id": "shell-d103-s109-n01-b3",
          "x": 0,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "blue"
        },
        {
          "id": "shell-d103-s109-n01-b4",
          "x": 0,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "shell-d103-s109-n01-b5",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "pink"
        },
        {
          "id": "shell-d103-s109-n01-b6",
          "x": 3,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "blue"
        },
        {
          "id": "shell-d103-s109-n01-b7",
          "x": 1,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "purple",
          "layers": [
            "purple",
            "orange"
          ]
        },
        {
          "id": "shell-d103-s109-n01-b8",
          "x": 2,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "shell-d103-s109-n01-b9",
          "x": 2,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "shell-d103-s109-n01-b10",
          "x": 3,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "shell-d103-s109-n01-b11",
          "x": 5,
          "y": 1,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "shell-d103-s109-n01-b12",
          "x": 2,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "shell-d103-s109-n01-b13",
          "x": 4,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "red"
        },
        {
          "id": "shell-d103-s109-n01-b14",
          "x": 6,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "shell-d103-s109-n01-b15",
          "x": 4,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "red"
        },
        {
          "id": "shell-d103-s109-n01-b20",
          "x": 5,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "shell-d103-s109-n01-b16",
          "x": 5,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "blue"
        },
        {
          "id": "shell-d103-s109-n01-b17",
          "x": 4,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "orange",
          "layers": [
            "orange",
            "yellow"
          ]
        },
        {
          "id": "shell-d103-s109-n01-b18",
          "x": 1,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "orange"
        },
        {
          "id": "shell-d103-s109-n01-b19",
          "x": 2,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              0,
              2
            ],
            [
              1,
              2
            ]
          ],
          "color": "yellow"
        }
      ],
      "gates": [
        {
          "id": "shell-d103-s109-n01-g-purple",
          "color": "purple",
          "side": "left",
          "offset": 3,
          "size": 2
        },
        {
          "id": "shell-d103-s109-n01-g-orange",
          "color": "orange",
          "side": "bottom",
          "offset": 1,
          "size": 2
        },
        {
          "id": "shell-d103-s109-n01-g-yellow",
          "color": "yellow",
          "side": "bottom",
          "offset": 4,
          "size": 2
        },
        {
          "id": "shell-d103-s109-n01-g-cyan",
          "color": "cyan",
          "side": "right",
          "offset": 7,
          "size": 1
        },
        {
          "id": "shell-d103-s109-n01-g-red",
          "color": "red",
          "side": "right",
          "offset": 5,
          "size": 2
        },
        {
          "id": "shell-d103-s109-n01-g-blue",
          "color": "blue",
          "side": "top",
          "offset": 1,
          "size": 1
        },
        {
          "id": "shell-d103-s109-n01-g-pink",
          "color": "pink",
          "side": "right",
          "offset": 2,
          "size": 1
        },
        {
          "id": "shell-d103-s109-n01-g-green",
          "color": "green",
          "side": "left",
          "offset": 6,
          "size": 1
        }
      ]
    },
    "proof": {
      "levelSha256": "317b75ef9dc5df78c0e7716599b43108ca82c859bf9ac5b934591319fb6f2b8d",
      "sourceLevelId": 109,
      "lowerBound": 13,
      "upperBound": 18,
      "routeReplayComplete": true,
      "reportSha256": "f7225d65c6722105e9b428979e5831bf9c94d91b921afc8195c37d0e56ad534d",
      "routeSha256": "2a99de95005768b573c4441cfa97849999f6b956015445f51fe591133f396088",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "317b75ef9dc5df78c0e7716599b43108ca82c859bf9ac5b934591319fb6f2b8d",
      "designReportSha256": "a1d6c3aca7b4f61b1a68f63c79786cdd73a6acd5d0fff09393ec862c3a609c85",
      "runtimeReportSha256": "4b9879ab3412620414c4901a48e008e9ab7c38c50a9e69c5b48a2768278be79c",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-mechanisms-multilayer-shell-15-d1-04",
    "stageKey": "mechanisms-multilayer-shell-15",
    "difficulty": 1,
    "slot": 4,
    "sourceLevelId": 130,
    "layoutSha256": "1cbb7944f0e9f65a9761d4c22eca40d6f50574f654838ab8a649e2f0dcbfb2fd",
    "admittedInRevision": "00cf9fc19620504b9141e126d2986f349e9640e03d81bd09bac0a2fa95a0aeba",
    "dailyMechanisms": [
      "color-exit",
      "multilayer-shell"
    ],
    "level": {
      "id": 130,
      "name": "每日挑战 顶芯换道",
      "difficulty": "hard",
      "reward": 0,
      "width": 6,
      "height": 8,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          5,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          5,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          5,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          5,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          5,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          5,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ],
        [
          5,
          6
        ],
        [
          0,
          7
        ],
        [
          1,
          7
        ],
        [
          2,
          7
        ],
        [
          3,
          7
        ],
        [
          4,
          7
        ],
        [
          5,
          7
        ]
      ],
      "timeSeconds": 85,
      "parMoves": 49,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "shell-d104-s130-n01-b0",
          "x": 0,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "shell-d104-s130-n01-b1",
          "x": 3,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "orange"
        },
        {
          "id": "shell-d104-s130-n01-b2",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "orange"
        },
        {
          "id": "shell-d104-s130-n01-b3",
          "x": 3,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "shell-d104-s130-n01-b4",
          "x": 0,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "shell-d104-s130-n01-b5",
          "x": 0,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "orange"
        },
        {
          "id": "shell-d104-s130-n01-b6",
          "x": 5,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "blue"
        },
        {
          "id": "shell-d104-s130-n01-b7",
          "x": 4,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "pink",
          "layers": [
            "pink",
            "blue"
          ]
        },
        {
          "id": "shell-d104-s130-n01-b8",
          "x": 3,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "shell-d104-s130-n01-b9",
          "x": 3,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "shell-d104-s130-n01-b10",
          "x": 5,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "shell-d104-s130-n01-b11",
          "x": 3,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "shell-d104-s130-n01-b12",
          "x": 0,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "shell-d104-s130-n01-b13",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "purple"
        },
        {
          "id": "shell-d104-s130-n01-b17",
          "x": 1,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "red"
        },
        {
          "id": "shell-d104-s130-n01-b14",
          "x": 2,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "shell-d104-s130-n01-b15",
          "x": 1,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "pink",
          "layers": [
            "pink",
            "green"
          ]
        },
        {
          "id": "shell-d104-s130-n01-b16",
          "x": 1,
          "y": 4,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "green"
        }
      ],
      "gates": [
        {
          "id": "shell-d104-s130-n01-g-green",
          "color": "green",
          "side": "right",
          "offset": 1,
          "size": 2
        },
        {
          "id": "shell-d104-s130-n01-g-pink",
          "color": "pink",
          "side": "top",
          "offset": 0,
          "size": 2
        },
        {
          "id": "shell-d104-s130-n01-g-orange",
          "color": "orange",
          "side": "left",
          "offset": 2,
          "size": 2
        },
        {
          "id": "shell-d104-s130-n01-g-cyan",
          "color": "cyan",
          "side": "top",
          "offset": 2,
          "size": 2
        },
        {
          "id": "shell-d104-s130-n01-g-purple",
          "color": "purple",
          "side": "bottom",
          "offset": 2,
          "size": 2
        },
        {
          "id": "shell-d104-s130-n01-g-blue",
          "color": "blue",
          "side": "bottom",
          "offset": 4,
          "size": 1
        },
        {
          "id": "shell-d104-s130-n01-g-yellow",
          "color": "yellow",
          "side": "top",
          "offset": 4,
          "size": 2
        },
        {
          "id": "shell-d104-s130-n01-g-red",
          "color": "red",
          "side": "bottom",
          "offset": 1,
          "size": 1
        }
      ]
    },
    "proof": {
      "levelSha256": "1cbb7944f0e9f65a9761d4c22eca40d6f50574f654838ab8a649e2f0dcbfb2fd",
      "sourceLevelId": 130,
      "lowerBound": 13,
      "upperBound": 17,
      "routeReplayComplete": true,
      "reportSha256": "611a4c30471df80f009c54326116bac6561123637039f0d1dae63083cb366670",
      "routeSha256": "35da65d56eda29e0bb7374d56f744e7d023ac6403ab41a492ed5e98d36646f0f",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "1cbb7944f0e9f65a9761d4c22eca40d6f50574f654838ab8a649e2f0dcbfb2fd",
      "designReportSha256": "d878e56851f6400de4ec44a0ab836a136e4069ed2c8c8c16a3ca9e7f06ff4bcf",
      "runtimeReportSha256": "4c297ff896b1d87379c1b9712aedf62f3f3c63c0335d88bb8f50d9d48e8b4fc3",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-mechanisms-multilayer-shell-15-d1-06",
    "stageKey": "mechanisms-multilayer-shell-15",
    "difficulty": 1,
    "slot": 6,
    "sourceLevelId": 121,
    "layoutSha256": "39070f3fe502b91640d90ddaf97657f68ad102db61c92a381e18098739ff1857",
    "admittedInRevision": "bac57c5222d9f68b953dcc9bf996d16e071e9b2b898aa5075ec67ff72142a1a8",
    "dailyMechanisms": [
      "color-exit",
      "multilayer-shell"
    ],
    "level": {
      "id": 121,
      "name": "每日挑战 中路换壳",
      "difficulty": "hard",
      "reward": 0,
      "width": 6,
      "height": 7,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          5,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          5,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          5,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          5,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          5,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          5,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ],
        [
          5,
          6
        ]
      ],
      "timeSeconds": 120,
      "parMoves": 81,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "shell-d106-s121-n03-b0",
          "x": 5,
          "y": 0,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "shell-d106-s121-n03-b1",
          "x": 0,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "shell-d106-s121-n03-b2",
          "x": 4,
          "y": 0,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "shell-d106-s121-n03-b3",
          "x": 4,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              0,
              2
            ],
            [
              1,
              2
            ]
          ],
          "color": "orange"
        },
        {
          "id": "shell-d106-s121-n03-b4",
          "x": 3,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "shell-d106-s121-n03-b5",
          "x": 3,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "shell-d106-s121-n03-b6",
          "x": 3,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "blue"
        },
        {
          "id": "shell-d106-s121-n03-b17",
          "x": 5,
          "y": 6,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "shell-d106-s121-n03-b7",
          "x": 3,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "pink"
        },
        {
          "id": "shell-d106-s121-n03-b8",
          "x": 2,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "blue"
        },
        {
          "id": "shell-d106-s121-n03-b9",
          "x": 2,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "orange",
          "layers": [
            "orange",
            "purple"
          ]
        },
        {
          "id": "shell-d106-s121-n03-b10",
          "x": 1,
          "y": 5,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "shell-d106-s121-n03-b11",
          "x": 1,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "shell-d106-s121-n03-b12",
          "x": 0,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "red"
        },
        {
          "id": "shell-d106-s121-n03-b13",
          "x": 2,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "orange"
        },
        {
          "id": "shell-d106-s121-n03-b14",
          "x": 1,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "red",
          "layers": [
            "red",
            "orange"
          ]
        },
        {
          "id": "shell-d106-s121-n03-b15",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "orange"
        }
      ],
      "gates": [
        {
          "id": "shell-d106-s121-n03-g-blue",
          "color": "blue",
          "side": "left",
          "offset": 5,
          "size": 2
        },
        {
          "id": "shell-d106-s121-n03-g-yellow",
          "color": "yellow",
          "side": "right",
          "offset": 2,
          "size": 2
        },
        {
          "id": "shell-d106-s121-n03-g-orange",
          "color": "orange",
          "side": "top",
          "offset": 3,
          "size": 2
        },
        {
          "id": "shell-d106-s121-n03-g-red",
          "color": "red",
          "side": "bottom",
          "offset": 2,
          "size": 2
        },
        {
          "id": "shell-d106-s121-n03-g-green",
          "color": "green",
          "side": "left",
          "offset": 3,
          "size": 2
        },
        {
          "id": "shell-d106-s121-n03-g-purple",
          "color": "purple",
          "side": "right",
          "offset": 4,
          "size": 2
        },
        {
          "id": "shell-d106-s121-n03-g-cyan",
          "color": "cyan",
          "side": "top",
          "offset": 1,
          "size": 2
        },
        {
          "id": "shell-d106-s121-n03-g-pink",
          "color": "pink",
          "side": "top",
          "offset": 5,
          "size": 1
        }
      ]
    },
    "proof": {
      "levelSha256": "39070f3fe502b91640d90ddaf97657f68ad102db61c92a381e18098739ff1857",
      "sourceLevelId": 121,
      "lowerBound": 13,
      "upperBound": 21,
      "routeReplayComplete": true,
      "reportSha256": "4c02562b063520f1c68eb5c521588a1aa38a4d11d36bebb7dee62c14eb38ddf3",
      "routeSha256": "e4a16080ec451bc68484d2dea0458e7bf7faa73cdb1742698d796c4522f7311a",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "39070f3fe502b91640d90ddaf97657f68ad102db61c92a381e18098739ff1857",
      "designReportSha256": "bf9b6488d31e4a15f2ee96d62f74369fe851017276560a59479850fe1c9ba645",
      "runtimeReportSha256": "ae03a310f4399358b6fe132401e07c6031f8bb1826a044b7b8044e607c1d1a39",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-mechanisms-multilayer-shell-15-d1-07",
    "stageKey": "mechanisms-multilayer-shell-15",
    "difficulty": 1,
    "slot": 7,
    "sourceLevelId": 2,
    "layoutSha256": "ca814786fb451fece734de4e34c27eb5c6793a3244d7ba80494686925ab37fdc",
    "admittedInRevision": "098a1bc1fa523736de429f11cd444735c0032bba2f3812e3080fbcb071798759",
    "dailyMechanisms": [
      "color-exit",
      "multilayer-shell"
    ],
    "level": {
      "id": 2,
      "name": "每日挑战 双壳让路",
      "difficulty": "hard",
      "reward": 0,
      "width": 4,
      "height": 6,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ]
      ],
      "timeSeconds": 120,
      "parMoves": 29,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "shell-d107-s2-n01-target",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "red"
        },
        {
          "id": "shell-d107-s2-n01-v1",
          "x": 2,
          "y": 1,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "shell-d107-s2-n01-v2",
          "x": 3,
          "y": 0,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "orange",
          "layers": [
            "orange",
            "purple"
          ]
        },
        {
          "id": "shell-d107-s2-n01-v3",
          "x": 0,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "purple"
        },
        {
          "id": "shell-d107-s2-n01-v4",
          "x": 3,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "purple"
        },
        {
          "id": "shell-d107-s2-n01-bridge",
          "x": 1,
          "y": 1,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "shell-d107-s2-n01-single1",
          "x": 1,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "blue"
        },
        {
          "id": "shell-d107-s2-n01-single2",
          "x": 1,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "red"
        },
        {
          "id": "shell-d107-s2-n01-opening1",
          "x": 0,
          "y": 4,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "pink"
        },
        {
          "id": "shell-d107-s2-n01-opening2",
          "x": 2,
          "y": 3,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "cyan",
          "layers": [
            "cyan",
            "purple"
          ]
        },
        {
          "id": "shell-d107-s2-n01-bottombridge",
          "x": 2,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "shell-d107-s2-n01-barrier-green",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "shell-d107-s2-n01-barrier-blue",
          "x": 2,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "blue"
        }
      ],
      "gates": [
        {
          "id": "shell-d107-s2-n01-g-orange",
          "color": "orange",
          "side": "top",
          "offset": 0,
          "size": 1
        },
        {
          "id": "shell-d107-s2-n01-g-purple",
          "color": "purple",
          "side": "top",
          "offset": 3,
          "size": 1
        },
        {
          "id": "shell-d107-s2-n01-g-red",
          "color": "red",
          "side": "right",
          "offset": 2,
          "size": 2
        },
        {
          "id": "shell-d107-s2-n01-g-blue",
          "color": "blue",
          "side": "right",
          "offset": 0,
          "size": 1
        },
        {
          "id": "shell-d107-s2-n01-g-cyan",
          "color": "cyan",
          "side": "right",
          "offset": 4,
          "size": 1
        },
        {
          "id": "shell-d107-s2-n01-g-pink",
          "color": "pink",
          "side": "left",
          "offset": 4,
          "size": 1
        },
        {
          "id": "shell-d107-s2-n01-g-yellow",
          "color": "yellow",
          "side": "left",
          "offset": 1,
          "size": 1
        },
        {
          "id": "shell-d107-s2-n01-g-green",
          "color": "green",
          "side": "left",
          "offset": 2,
          "size": 1
        }
      ]
    },
    "proof": {
      "levelSha256": "ca814786fb451fece734de4e34c27eb5c6793a3244d7ba80494686925ab37fdc",
      "sourceLevelId": 2,
      "lowerBound": 13,
      "upperBound": 16,
      "routeReplayComplete": true,
      "reportSha256": "99aa285b6e203ea2ff4052c76278f638442bc32d62934a6facf10f8aeb81c126",
      "routeSha256": "f5feb3e21a6d65f3fb388be7a5884c7c85ecf77c81f150e7bbbcf89c08d4bdef",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "ca814786fb451fece734de4e34c27eb5c6793a3244d7ba80494686925ab37fdc",
      "designReportSha256": "b8f86ad14c8509f7c8df5fd1e99b3aed325ca8180a03dda12d40b3680a9a538f",
      "runtimeReportSha256": "6b0fe2c262078fdcb618cd7ef915536c7ea5b38f97bf0fb4e3e03c199aed7b1f",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-mechanisms-multilayer-shell-15-d1-08",
    "stageKey": "mechanisms-multilayer-shell-15",
    "difficulty": 1,
    "slot": 8,
    "sourceLevelId": 2,
    "layoutSha256": "adeb650548f19b03969fee80890e91c7e5d83a90c1e958596864886bc5f2bb08",
    "admittedInRevision": "7114f002f11491081387f2f1f08b1619bf87474c989f3cf0b307df12d749048c",
    "dailyMechanisms": [
      "color-exit",
      "multilayer-shell"
    ],
    "level": {
      "id": 2,
      "name": "每日挑战 双壳让路",
      "difficulty": "hard",
      "reward": 0,
      "width": 4,
      "height": 6,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ]
      ],
      "timeSeconds": 120,
      "parMoves": 29,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "shell-d108-s2-n01-target",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "red"
        },
        {
          "id": "shell-d108-s2-n01-v1",
          "x": 2,
          "y": 1,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "cyan",
          "layers": [
            "cyan",
            "red"
          ]
        },
        {
          "id": "shell-d108-s2-n01-v2",
          "x": 3,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "orange"
        },
        {
          "id": "shell-d108-s2-n01-v3",
          "x": 0,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "purple"
        },
        {
          "id": "shell-d108-s2-n01-v4",
          "x": 3,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "purple",
          "layers": [
            "purple",
            "red"
          ]
        },
        {
          "id": "shell-d108-s2-n01-bridge",
          "x": 1,
          "y": 1,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "shell-d108-s2-n01-single1",
          "x": 1,
          "y": 2,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "pink"
        },
        {
          "id": "shell-d108-s2-n01-single2",
          "x": 1,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "red"
        },
        {
          "id": "shell-d108-s2-n01-opening1",
          "x": 0,
          "y": 4,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "pink"
        },
        {
          "id": "shell-d108-s2-n01-opening2",
          "x": 2,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "orange"
        },
        {
          "id": "shell-d108-s2-n01-bottombridge",
          "x": 2,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "shell-d108-s2-n01-barrier-green",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "shell-d108-s2-n01-barrier-blue",
          "x": 1,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "blue"
        }
      ],
      "gates": [
        {
          "id": "shell-d108-s2-n01-g-orange",
          "color": "orange",
          "side": "top",
          "offset": 0,
          "size": 1
        },
        {
          "id": "shell-d108-s2-n01-g-purple",
          "color": "purple",
          "side": "top",
          "offset": 3,
          "size": 1
        },
        {
          "id": "shell-d108-s2-n01-g-red",
          "color": "red",
          "side": "right",
          "offset": 2,
          "size": 2
        },
        {
          "id": "shell-d108-s2-n01-g-blue",
          "color": "blue",
          "side": "right",
          "offset": 0,
          "size": 1
        },
        {
          "id": "shell-d108-s2-n01-g-cyan",
          "color": "cyan",
          "side": "right",
          "offset": 4,
          "size": 1
        },
        {
          "id": "shell-d108-s2-n01-g-pink",
          "color": "pink",
          "side": "left",
          "offset": 4,
          "size": 1
        },
        {
          "id": "shell-d108-s2-n01-g-yellow",
          "color": "yellow",
          "side": "left",
          "offset": 1,
          "size": 1
        },
        {
          "id": "shell-d108-s2-n01-g-green",
          "color": "green",
          "side": "left",
          "offset": 2,
          "size": 1
        }
      ]
    },
    "proof": {
      "levelSha256": "adeb650548f19b03969fee80890e91c7e5d83a90c1e958596864886bc5f2bb08",
      "sourceLevelId": 2,
      "lowerBound": 13,
      "upperBound": 20,
      "routeReplayComplete": true,
      "reportSha256": "3b2fc5783e780e851aee342be413f312ed1aeeb32dad2deb89e810684866bc60",
      "routeSha256": "4c423bdfca53c7742441c7e6856c7384c8db3a6c0dae3d12582219467d44fbd4",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "adeb650548f19b03969fee80890e91c7e5d83a90c1e958596864886bc5f2bb08",
      "designReportSha256": "afb545abf638dec6326e733ce140709479f10efe31aaf5b7861211ef6e18e5a6",
      "runtimeReportSha256": "53884fcf69a5229f5ccd7abef87252d674f5957cfe4b99d885e9330117b0b4e2",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-mechanisms-multilayer-shell-15-d1-09",
    "stageKey": "mechanisms-multilayer-shell-15",
    "difficulty": 1,
    "slot": 9,
    "sourceLevelId": 2,
    "layoutSha256": "82dd54926b1654fe1240abb50772441d54f30b0c9fad8f4a2167b9fffcccfc36",
    "admittedInRevision": "8b52b6692284477da752a6ada1b1bb1ba5523efd2f4731cbae8fed37dc8a9d15",
    "dailyMechanisms": [
      "color-exit",
      "multilayer-shell"
    ],
    "level": {
      "id": 2,
      "name": "每日挑战 腾挪破壳",
      "difficulty": "hard",
      "reward": 0,
      "width": 4,
      "height": 6,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ]
      ],
      "timeSeconds": 120,
      "parMoves": 29,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "shell-d109-s2-n03-target",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "red"
        },
        {
          "id": "shell-d109-s2-n03-v1",
          "x": 2,
          "y": 1,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "shell-d109-s2-n03-v2",
          "x": 3,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "orange"
        },
        {
          "id": "shell-d109-s2-n03-v3",
          "x": 0,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "purple"
        },
        {
          "id": "shell-d109-s2-n03-v3-green",
          "x": 0,
          "y": 3,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "shell-d109-s2-n03-v4",
          "x": 3,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "purple",
          "layers": [
            "purple",
            "red"
          ]
        },
        {
          "id": "shell-d109-s2-n03-bridge",
          "x": 1,
          "y": 1,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "shell-d109-s2-n03-single1",
          "x": 1,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "pink"
        },
        {
          "id": "shell-d109-s2-n03-single2",
          "x": 1,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "red"
        },
        {
          "id": "shell-d109-s2-n03-opening1",
          "x": 0,
          "y": 4,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "pink"
        },
        {
          "id": "shell-d109-s2-n03-opening2",
          "x": 2,
          "y": 3,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "cyan",
          "layers": [
            "cyan",
            "red"
          ]
        },
        {
          "id": "shell-d109-s2-n03-bottombridge",
          "x": 2,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "shell-d109-s2-n03-barrier",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              3,
              0
            ]
          ],
          "color": "blue"
        }
      ],
      "gates": [
        {
          "id": "shell-d109-s2-n03-g-orange",
          "color": "orange",
          "side": "top",
          "offset": 0,
          "size": 1
        },
        {
          "id": "shell-d109-s2-n03-g-purple",
          "color": "purple",
          "side": "top",
          "offset": 3,
          "size": 1
        },
        {
          "id": "shell-d109-s2-n03-g-red",
          "color": "red",
          "side": "right",
          "offset": 2,
          "size": 2
        },
        {
          "id": "shell-d109-s2-n03-g-blue",
          "color": "blue",
          "side": "right",
          "offset": 1,
          "size": 1
        },
        {
          "id": "shell-d109-s2-n03-g-cyan",
          "color": "cyan",
          "side": "right",
          "offset": 4,
          "size": 1
        },
        {
          "id": "shell-d109-s2-n03-g-pink",
          "color": "pink",
          "side": "left",
          "offset": 4,
          "size": 1
        },
        {
          "id": "shell-d109-s2-n03-g-yellow",
          "color": "yellow",
          "side": "left",
          "offset": 1,
          "size": 1
        },
        {
          "id": "shell-d109-s2-n03-g-green",
          "color": "green",
          "side": "left",
          "offset": 2,
          "size": 1
        }
      ]
    },
    "proof": {
      "levelSha256": "82dd54926b1654fe1240abb50772441d54f30b0c9fad8f4a2167b9fffcccfc36",
      "sourceLevelId": 2,
      "lowerBound": 13,
      "upperBound": 21,
      "routeReplayComplete": true,
      "reportSha256": "b9d049f529d148268a902f999c71d521f0e2969fd73f3f5bdc8d257b62d11ab7",
      "routeSha256": "7b1a5104d873413ca29ed66b6f90925370af342c9245209fb97738b814dd8214",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "82dd54926b1654fe1240abb50772441d54f30b0c9fad8f4a2167b9fffcccfc36",
      "designReportSha256": "866189d95dcc7f7e07ceaafd900103af69f0f8b1fe0a5907958d03c9733c4c52",
      "runtimeReportSha256": "68cbd5b6c3317e9f3fa9d3b386bc103b98db4e245e77d61a7b913d2d3112d08d",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-mechanisms-multilayer-shell-15-d2-07",
    "stageKey": "mechanisms-multilayer-shell-15",
    "difficulty": 2,
    "slot": 7,
    "sourceLevelId": 2,
    "layoutSha256": "7316fe17efbf751dc9723ac5f17730d7f1713b1ec562762c74769048862e2e06",
    "admittedInRevision": "f34f9a8e9016ea1c18e4f673782a9f2fffc71e67b9ad3bacbd90282c26b3c507",
    "dailyMechanisms": [
      "color-exit",
      "multilayer-shell"
    ],
    "level": {
      "id": 2,
      "name": "每日挑战 四柱换手",
      "difficulty": "super",
      "reward": 0,
      "width": 4,
      "height": 6,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ]
      ],
      "blocked": [],
      "timeSeconds": 120,
      "parMoves": 29,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "shell-d207-s2-n01-target",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "red"
        },
        {
          "id": "shell-d207-s2-n01-v1",
          "x": 2,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "shell-d207-s2-n01-v2",
          "x": 2,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "pink",
          "layers": [
            "pink",
            "blue"
          ]
        },
        {
          "id": "shell-d207-s2-n01-v3",
          "x": 0,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "purple"
        },
        {
          "id": "shell-d207-s2-n01-bridge",
          "x": 1,
          "y": 1,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "shell-d207-s2-n01-single1",
          "x": 2,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "green",
          "layers": [
            "green",
            "yellow"
          ]
        },
        {
          "id": "shell-d207-s2-n01-single2",
          "x": 1,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "orange",
          "layers": [
            "orange",
            "purple"
          ]
        },
        {
          "id": "shell-d207-s2-n01-opening1",
          "x": 0,
          "y": 4,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "pink"
        },
        {
          "id": "shell-d207-s2-n01-opening2",
          "x": 3,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "orange"
        },
        {
          "id": "shell-d207-s2-n01-bottombridge",
          "x": 2,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "purple"
        },
        {
          "id": "shell-d207-s2-n01-barrier",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "cyan"
        }
      ],
      "gates": [
        {
          "id": "shell-d207-s2-n01-g-orange",
          "color": "orange",
          "side": "top",
          "offset": 0,
          "size": 1
        },
        {
          "id": "shell-d207-s2-n01-g-purple",
          "color": "purple",
          "side": "top",
          "offset": 3,
          "size": 1
        },
        {
          "id": "shell-d207-s2-n01-g-red",
          "color": "red",
          "side": "right",
          "offset": 2,
          "size": 2
        },
        {
          "id": "shell-d207-s2-n01-g-blue",
          "color": "blue",
          "side": "right",
          "offset": 0,
          "size": 1
        },
        {
          "id": "shell-d207-s2-n01-g-cyan",
          "color": "cyan",
          "side": "right",
          "offset": 4,
          "size": 1
        },
        {
          "id": "shell-d207-s2-n01-g-pink",
          "color": "pink",
          "side": "left",
          "offset": 4,
          "size": 1
        },
        {
          "id": "shell-d207-s2-n01-g-yellow",
          "color": "yellow",
          "side": "left",
          "offset": 1,
          "size": 1
        },
        {
          "id": "shell-d207-s2-n01-g-green",
          "color": "green",
          "side": "left",
          "offset": 2,
          "size": 1
        }
      ]
    },
    "proof": {
      "levelSha256": "7316fe17efbf751dc9723ac5f17730d7f1713b1ec562762c74769048862e2e06",
      "sourceLevelId": 2,
      "lowerBound": 18,
      "upperBound": 32,
      "routeReplayComplete": true,
      "reportSha256": "6f535966c9d7cc6ce0010e9ec75323eef37445014df81989ca2d158b0e2afa91",
      "routeSha256": "65d515f734cec0d4f4a83a5e0a07a8bd3bf87a7025c6aee8890399c3f9140415",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "7316fe17efbf751dc9723ac5f17730d7f1713b1ec562762c74769048862e2e06",
      "designReportSha256": "d31c7739333ef4ef4ee184ffb87d910a2203a99364d544cc62d08a20a3819b26",
      "runtimeReportSha256": "69016e3868bd95dd46f18dcfac2a9cdf572a87901507ae440ea9f8f53983455e",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-mechanisms-multilayer-shell-15-d2-08",
    "stageKey": "mechanisms-multilayer-shell-15",
    "difficulty": 2,
    "slot": 8,
    "sourceLevelId": 2,
    "layoutSha256": "3ef856fda5757c38dba415e2e1546f33ab27634cd40fd33ec7d87ba064fdc992",
    "admittedInRevision": "b6a22b5e7b27e818f58cf667f6e2f84053ffb1dd6d6952c92b878601fd901f7c",
    "dailyMechanisms": [
      "color-exit",
      "multilayer-shell",
      "irregular-block"
    ],
    "level": {
      "id": 2,
      "name": "每日挑战 方芯借道",
      "difficulty": "super",
      "reward": 0,
      "width": 4,
      "height": 6,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ]
      ],
      "blocked": [],
      "timeSeconds": 120,
      "parMoves": 29,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "shell-d208-s2-n01-target",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "red"
        },
        {
          "id": "shell-d208-s2-n01-v1",
          "x": 2,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "orange"
        },
        {
          "id": "shell-d208-s2-n01-v2",
          "x": 3,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "purple"
        },
        {
          "id": "shell-d208-s2-n01-v3",
          "x": 0,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "purple"
        },
        {
          "id": "shell-d208-s2-n01-v4",
          "x": 1,
          "y": 2,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "blue",
          "layers": [
            "blue",
            "green"
          ]
        },
        {
          "id": "shell-d208-s2-n01-bridge",
          "x": 1,
          "y": 1,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "shell-d208-s2-n01-single1",
          "x": 2,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "green",
          "layers": [
            "green",
            "blue"
          ]
        },
        {
          "id": "shell-d208-s2-n01-single2",
          "x": 2,
          "y": 5,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "shell-d208-s2-n01-opening2",
          "x": 3,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "orange"
        },
        {
          "id": "shell-d208-s2-n01-bottombridge",
          "x": 1,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "red",
          "layers": [
            "red",
            "cyan"
          ]
        },
        {
          "id": "shell-d208-s2-n01-barrier",
          "x": 0,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "blue"
        }
      ],
      "gates": [
        {
          "id": "shell-d208-s2-n01-g-orange",
          "color": "orange",
          "side": "top",
          "offset": 0,
          "size": 1
        },
        {
          "id": "shell-d208-s2-n01-g-purple",
          "color": "purple",
          "side": "top",
          "offset": 3,
          "size": 1
        },
        {
          "id": "shell-d208-s2-n01-g-red",
          "color": "red",
          "side": "right",
          "offset": 2,
          "size": 2
        },
        {
          "id": "shell-d208-s2-n01-g-blue",
          "color": "blue",
          "side": "right",
          "offset": 0,
          "size": 2
        },
        {
          "id": "shell-d208-s2-n01-g-cyan",
          "color": "cyan",
          "side": "right",
          "offset": 4,
          "size": 2
        },
        {
          "id": "shell-d208-s2-n01-g-pink",
          "color": "pink",
          "side": "left",
          "offset": 4,
          "size": 1
        },
        {
          "id": "shell-d208-s2-n01-g-yellow",
          "color": "yellow",
          "side": "left",
          "offset": 1,
          "size": 1
        },
        {
          "id": "shell-d208-s2-n01-g-green",
          "color": "green",
          "side": "left",
          "offset": 2,
          "size": 1
        }
      ]
    },
    "proof": {
      "levelSha256": "3ef856fda5757c38dba415e2e1546f33ab27634cd40fd33ec7d87ba064fdc992",
      "sourceLevelId": 2,
      "lowerBound": 18,
      "upperBound": 29,
      "routeReplayComplete": true,
      "reportSha256": "e966fd639d060e17b71fc8fefa13d3e9a59a94a5be581024a0db52f2b45ae366",
      "routeSha256": "51850ffde57e1a979aae2949a63346314a09fd5cfccb9c9377e6cc6895b10b95",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "3ef856fda5757c38dba415e2e1546f33ab27634cd40fd33ec7d87ba064fdc992",
      "designReportSha256": "2d84feaf55e4d7b2dad43df7cc432d49f7e12e46791eabba6c1ace52e89a936e",
      "runtimeReportSha256": "92e0aa1417a9cb1690f45a42789c37d19383374d51d9470259d09da4c3b4571c",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-mechanisms-multilayer-shell-15-d1-10",
    "stageKey": "mechanisms-multilayer-shell-15",
    "difficulty": 1,
    "slot": 10,
    "sourceLevelId": 5,
    "layoutSha256": "46b334493fc7b4d6403b1f967d26b0173c3c6b67bb1cde110fb8694787cb6795",
    "admittedInRevision": "79c2c1a8f589b047d2ced3df01475d823a78812c13d86eb66dd210670aed4a39",
    "dailyMechanisms": [
      "color-exit",
      "multilayer-shell",
      "irregular-block"
    ],
    "level": {
      "id": 5,
      "name": "每日挑战 multilayer-shell 1-10",
      "difficulty": "hard",
      "reward": 0,
      "width": 5,
      "height": 7,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ]
      ],
      "timeSeconds": 180,
      "parMoves": 21,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "cyan",
          "id": "d110-v9-b03",
          "x": 3,
          "y": 0
        },
        {
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "purple",
          "id": "d110-v9-b02",
          "x": 2,
          "y": 0
        },
        {
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "cyan",
          "id": "d110-v9-b04",
          "x": 0,
          "y": 1
        },
        {
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "orange",
          "layers": [
            "orange",
            "pink"
          ],
          "id": "d110-v9-b06",
          "x": 0,
          "y": 0
        },
        {
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "yellow",
          "id": "d110-v9-b05",
          "x": 3,
          "y": 1
        },
        {
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "orange",
          "id": "d110-v9-b00",
          "x": 2,
          "y": 2
        },
        {
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "yellow",
          "id": "d110-v9-b01",
          "x": 0,
          "y": 2
        },
        {
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "blue",
          "id": "d110-v9-b07",
          "x": 4,
          "y": 2
        },
        {
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              0,
              2
            ],
            [
              1,
              2
            ]
          ],
          "color": "blue",
          "id": "d110-v9-b11",
          "x": 0,
          "y": 4
        },
        {
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "pink",
          "layers": [
            "pink",
            "purple"
          ],
          "id": "d110-v9-b08",
          "x": 2,
          "y": 4
        },
        {
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "green",
          "id": "d110-v9-b09",
          "x": 3,
          "y": 4
        },
        {
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              2,
              1
            ]
          ],
          "color": "red",
          "id": "d110-v9-b10",
          "x": 2,
          "y": 5
        }
      ],
      "gates": [
        {
          "id": "d110-v9-g0",
          "color": "purple",
          "side": "bottom",
          "offset": 0,
          "size": 2
        },
        {
          "id": "d110-v9-g1",
          "color": "orange",
          "side": "bottom",
          "offset": 3,
          "size": 2
        },
        {
          "id": "d110-v9-g2",
          "color": "pink",
          "side": "left",
          "offset": 0,
          "size": 2
        },
        {
          "id": "d110-v9-g3",
          "color": "yellow",
          "side": "right",
          "offset": 1,
          "size": 2
        },
        {
          "id": "d110-v9-g4",
          "color": "cyan",
          "side": "top",
          "offset": 3,
          "size": 2
        },
        {
          "id": "d110-v9-g5",
          "color": "blue",
          "side": "top",
          "offset": 0,
          "size": 2
        },
        {
          "id": "d110-v9-g6",
          "color": "green",
          "side": "right",
          "offset": 3,
          "size": 2
        },
        {
          "id": "d110-v9-g7",
          "color": "red",
          "side": "left",
          "offset": 4,
          "size": 2
        }
      ]
    },
    "proof": {
      "levelSha256": "46b334493fc7b4d6403b1f967d26b0173c3c6b67bb1cde110fb8694787cb6795",
      "sourceLevelId": 5,
      "lowerBound": 13,
      "upperBound": 17,
      "routeReplayComplete": true,
      "reportSha256": "65eafb772107738efe2fadcfd0547970709b2b4952a2cf99fef2b021d7e61a64",
      "routeSha256": "5e4c00209620ea25988a4ea3a47ca29f6e8d55ed71b63e194fa374b3ee6c65d1",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "46b334493fc7b4d6403b1f967d26b0173c3c6b67bb1cde110fb8694787cb6795",
      "designReportSha256": "0b744c4e19edafd07f94c27294fb36c885812c7da1d76b1f05328f26ace2cefe",
      "runtimeReportSha256": "cf7d486973ac5a0bcd5d617ce6c74d758371b0a4fa7f1703fbcec9a98a31785b",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-mechanisms-multilayer-shell-15-d2-01",
    "stageKey": "mechanisms-multilayer-shell-15",
    "difficulty": 2,
    "slot": 1,
    "sourceLevelId": 5,
    "layoutSha256": "f0a27bf6d77d799355bfbc4a9412d0785f5e5cabe759b78f0eb578722219df33",
    "admittedInRevision": "8dba125b59355a0a8dcc46cb57be893e19c5d0869a644c888ef2a6bd9f223900",
    "dailyMechanisms": [
      "color-exit",
      "multilayer-shell",
      "irregular-block"
    ],
    "level": {
      "id": 5,
      "name": "每日挑战 multilayer-shell 2-1",
      "difficulty": "super",
      "reward": 0,
      "width": 5,
      "height": 7,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ]
      ],
      "blocked": [],
      "timeSeconds": 180,
      "parMoves": 21,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "shell-d201-s5-n08-A",
          "x": 4,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "pink",
          "layers": [
            "pink",
            "cyan"
          ]
        },
        {
          "id": "shell-d201-s5-n08-B",
          "x": 2,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "orange"
        },
        {
          "id": "shell-d201-s5-n08-C",
          "x": 2,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "shell-d201-s5-n08-D",
          "x": 3,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "shell-d201-s5-n08-E",
          "x": 3,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "purple",
          "layers": [
            "purple",
            "orange"
          ]
        },
        {
          "id": "shell-d201-s5-n08-F",
          "x": 0,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "red"
        },
        {
          "id": "shell-d201-s5-n08-G",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "blue"
        },
        {
          "id": "shell-d201-s5-n08-H",
          "x": 2,
          "y": 0,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "orange"
        },
        {
          "id": "shell-d201-s5-n08-I",
          "x": 0,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "pink",
          "layers": [
            "pink",
            "green"
          ]
        },
        {
          "id": "shell-d201-s5-n08-J",
          "x": 0,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              0,
              2
            ],
            [
              1,
              2
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "shell-d201-s5-n08-K",
          "x": 2,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "shell-d201-s5-n08-L",
          "x": 2,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "red"
        },
        {
          "id": "shell-d201-s5-n08-M",
          "x": 3,
          "y": 4,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "yellow"
        }
      ],
      "gates": [
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "right",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "left",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "bottom",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "bottom",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "right",
          "offset": 5,
          "size": 2
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "left",
          "offset": 5,
          "size": 2
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "left",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "top",
          "offset": 2,
          "size": 2
        }
      ]
    },
    "proof": {
      "levelSha256": "f0a27bf6d77d799355bfbc4a9412d0785f5e5cabe759b78f0eb578722219df33",
      "sourceLevelId": 5,
      "lowerBound": 18,
      "upperBound": 31,
      "routeReplayComplete": true,
      "reportSha256": "6360984906b1fb0ff44c79d09f1498ce4d995aafc8af38d7c10ddfad5ef96b76",
      "routeSha256": "ea57d629a9ece1e33bac8c4f4f51c73c8fb16d5efbe231129732605d2b872944",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "f0a27bf6d77d799355bfbc4a9412d0785f5e5cabe759b78f0eb578722219df33",
      "designReportSha256": "985080b10d0db0bc86388a47ca99201b21090bc458f12b9c3fd2677b059d0241",
      "runtimeReportSha256": "29ef9c8c8084001792114e6f32cc8d8a084369968064b57350ec37e97af47837",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-mechanisms-multilayer-shell-15-d2-02",
    "stageKey": "mechanisms-multilayer-shell-15",
    "difficulty": 2,
    "slot": 2,
    "sourceLevelId": 80,
    "layoutSha256": "2a7bebf0568da438004fedc1f10685bc5a1da4d7ac76493ae3e4d9ef3ba34456",
    "admittedInRevision": "17078b7d18f68fdff81c0495c08a46b769708cb869332bd3edfaaf9537f56f1b",
    "dailyMechanisms": [
      "color-exit",
      "multilayer-shell",
      "irregular-block",
      "irregular-board"
    ],
    "level": {
      "id": 80,
      "name": "每日挑战 multilayer-shell 2-2",
      "difficulty": "super",
      "reward": 0,
      "width": 5,
      "height": 7,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ]
      ],
      "timeSeconds": 180,
      "parMoves": 34,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "shell-d202-s80-n10-A",
          "x": 2,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "shell-d202-s80-n10-B",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "cyan",
          "layers": [
            "cyan",
            "red"
          ]
        },
        {
          "id": "shell-d202-s80-n10-C",
          "x": 1,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "red"
        },
        {
          "id": "shell-d202-s80-n10-D",
          "x": 1,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "red"
        },
        {
          "id": "shell-d202-s80-n10-E",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "shell-d202-s80-n10-F",
          "x": 0,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "blue",
          "layers": [
            "blue",
            "red"
          ]
        },
        {
          "id": "shell-d202-s80-n10-G",
          "x": 2,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "shell-d202-s80-n10-H",
          "x": 1,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              2,
              1
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "shell-d202-s80-n10-I",
          "x": 2,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "orange"
        },
        {
          "id": "shell-d202-s80-n10-J",
          "x": 4,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "red",
          "layers": [
            "red",
            "blue"
          ]
        },
        {
          "id": "shell-d202-s80-n10-K",
          "x": 2,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              2,
              1
            ]
          ],
          "color": "green"
        },
        {
          "id": "shell-d202-s80-n10-L",
          "x": 3,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "pink"
        }
      ],
      "gates": [
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "right",
          "offset": 4,
          "size": 2
        },
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "right",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "left",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "top",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "bottom",
          "offset": 1,
          "size": 1
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "top",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "left",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "left",
          "offset": 5,
          "size": 1
        }
      ]
    },
    "proof": {
      "levelSha256": "2a7bebf0568da438004fedc1f10685bc5a1da4d7ac76493ae3e4d9ef3ba34456",
      "sourceLevelId": 80,
      "lowerBound": 18,
      "upperBound": 26,
      "routeReplayComplete": true,
      "reportSha256": "3c2f5d452bc4be746f8764130a8996abed09c58703967cf386cff784141d4942",
      "routeSha256": "b57f0309c0c476364a55028428106bdebe6a0b750dff78291e30e736133b1eee",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "2a7bebf0568da438004fedc1f10685bc5a1da4d7ac76493ae3e4d9ef3ba34456",
      "designReportSha256": "c69e94de72c1f630a8d414b7702b3903ec2f455c5797e4ceeec6141d0a853482",
      "runtimeReportSha256": "c615eb093d74bcff076318052099fbc62895c82358741808a1a5e7070cb3cd06",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-mechanisms-multilayer-shell-15-d2-04",
    "stageKey": "mechanisms-multilayer-shell-15",
    "difficulty": 2,
    "slot": 4,
    "sourceLevelId": 100,
    "layoutSha256": "07b89679390edd5880c120e33c6e95a661b89e5528f3f5e9083e7e0262b81a45",
    "admittedInRevision": "1956cdab21cb7b3e5ab340a2de260e0b6e789fd1bb4e19375998a444eebff71c",
    "dailyMechanisms": [
      "color-exit",
      "multilayer-shell"
    ],
    "level": {
      "id": 100,
      "name": "每日挑战 multilayer-shell 2-4",
      "difficulty": "super",
      "reward": 0,
      "width": 6,
      "height": 8,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          5,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          5,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          5,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          5,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          5,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          5,
          5
        ],
        [
          0,
          6
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ],
        [
          4,
          6
        ],
        [
          5,
          6
        ],
        [
          0,
          7
        ],
        [
          1,
          7
        ],
        [
          2,
          7
        ],
        [
          3,
          7
        ],
        [
          4,
          7
        ],
        [
          5,
          7
        ]
      ],
      "timeSeconds": 180,
      "parMoves": 30,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "shell-d204-s100-n02-b1",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "shell-d204-s100-n02-b2",
          "x": 5,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "shell-d204-s100-n02-b3",
          "x": 4,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "green",
          "layers": [
            "green",
            "orange"
          ]
        },
        {
          "id": "shell-d204-s100-n02-b4",
          "x": 4,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "orange"
        },
        {
          "id": "shell-d204-s100-n02-b5",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "red"
        },
        {
          "id": "shell-d204-s100-n02-b8",
          "x": 2,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "orange",
          "layers": [
            "orange",
            "green"
          ]
        },
        {
          "id": "shell-d204-s100-n02-b9",
          "x": 1,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "blue",
          "layers": [
            "blue",
            "orange"
          ]
        },
        {
          "id": "shell-d204-s100-n02-b10",
          "x": 1,
          "y": 7,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "shell-d204-s100-n02-b11",
          "x": 3,
          "y": 6,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "red"
        },
        {
          "id": "shell-d204-s100-n02-b12",
          "x": 2,
          "y": 6,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "shell-d204-s100-n02-b13",
          "x": 3,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "red"
        },
        {
          "id": "shell-d204-s100-n02-b6",
          "x": 0,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "green"
        },
        {
          "id": "shell-d204-s100-n02-b7",
          "x": 2,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "shell-d204-s100-n02-b14",
          "x": 3,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "shell-d204-s100-n02-b15",
          "x": 1,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "orange"
        },
        {
          "id": "shell-d204-s100-n02-b0",
          "x": 1,
          "y": 0,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "shell-d204-s100-n02-b16",
          "x": 4,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              0,
              2
            ],
            [
              1,
              2
            ]
          ],
          "color": "red"
        },
        {
          "id": "shell-d204-s100-n02-b17",
          "x": 2,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              0,
              2
            ],
            [
              1,
              2
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "shell-d204-s100-n02-b18",
          "x": 4,
          "y": 5,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "purple"
        }
      ],
      "gates": [
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "left",
          "offset": 4,
          "size": 2
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "right",
          "offset": 4,
          "size": 2
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "bottom",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "bottom",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "left",
          "offset": 1,
          "size": 1
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "left",
          "offset": 6,
          "size": 2
        }
      ]
    },
    "proof": {
      "levelSha256": "07b89679390edd5880c120e33c6e95a661b89e5528f3f5e9083e7e0262b81a45",
      "sourceLevelId": 100,
      "lowerBound": 18,
      "upperBound": 31,
      "routeReplayComplete": true,
      "reportSha256": "6d83ee51721140e123adb06ae23b24f4ca06a7544861120ba9e5fb7db0f0bae8",
      "routeSha256": "98ab70a0323956398936c47326c4afa816b8b7e54bb4812684e43cf9ad96ca45",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "07b89679390edd5880c120e33c6e95a661b89e5528f3f5e9083e7e0262b81a45",
      "designReportSha256": "7ac990a50bce5668509265b91949763599d867924b4d89f422a7c6ec98d5de11",
      "runtimeReportSha256": "e176b4a5339cdbf7b4895cdb3da2a0d47ef8c0b15de00cd45c123be0ffdf9975",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-mechanisms-multilayer-shell-15-d2-05",
    "stageKey": "mechanisms-multilayer-shell-15",
    "difficulty": 2,
    "slot": 5,
    "sourceLevelId": 80,
    "layoutSha256": "b378a5b85dcf1d7f2326678df9d9019ba46d1350497168ef9cd0ccd4d3bae0d0",
    "admittedInRevision": "fb4d0337918631b72f8594fdcbf906e344d0c6f076ed33b5b3db783fe26dd173",
    "dailyMechanisms": [
      "color-exit",
      "multilayer-shell",
      "irregular-block",
      "irregular-board"
    ],
    "level": {
      "id": 80,
      "name": "每日挑战 multilayer-shell 2-5",
      "difficulty": "super",
      "reward": 0,
      "width": 5,
      "height": 7,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          1,
          6
        ],
        [
          2,
          6
        ],
        [
          3,
          6
        ]
      ],
      "timeSeconds": 180,
      "parMoves": 34,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "shell-d205-s80-n06-A",
          "x": 3,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "green"
        },
        {
          "id": "shell-d205-s80-n06-B",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "cyan",
          "layers": [
            "cyan",
            "purple"
          ]
        },
        {
          "id": "shell-d205-s80-n06-C",
          "x": 1,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "shell-d205-s80-n06-D",
          "x": 1,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "red"
        },
        {
          "id": "shell-d205-s80-n06-E",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "shell-d205-s80-n06-F",
          "x": 0,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "blue",
          "layers": [
            "blue",
            "red"
          ]
        },
        {
          "id": "shell-d205-s80-n06-G",
          "x": 2,
          "y": 6,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "shell-d205-s80-n06-H",
          "x": 1,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              2,
              1
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "shell-d205-s80-n06-I",
          "x": 2,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              2,
              1
            ]
          ],
          "color": "orange"
        },
        {
          "id": "shell-d205-s80-n06-J",
          "x": 4,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "red",
          "layers": [
            "red",
            "blue"
          ]
        },
        {
          "id": "shell-d205-s80-n06-K",
          "x": 2,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              2,
              1
            ]
          ],
          "color": "green"
        },
        {
          "id": "shell-d205-s80-n06-L",
          "x": 3,
          "y": 6,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "pink"
        }
      ],
      "gates": [
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "right",
          "offset": 4,
          "size": 2
        },
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "right",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "left",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "top",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "bottom",
          "offset": 1,
          "size": 1
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "top",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "left",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "left",
          "offset": 5,
          "size": 1
        }
      ]
    },
    "proof": {
      "levelSha256": "b378a5b85dcf1d7f2326678df9d9019ba46d1350497168ef9cd0ccd4d3bae0d0",
      "sourceLevelId": 80,
      "lowerBound": 18,
      "upperBound": 21,
      "routeReplayComplete": true,
      "reportSha256": "4c6b54c398328466e84a76044a3c4499672e42491f52725b121694a63692d495",
      "routeSha256": "b990bc1447b4201b10a0128ced2a560f29d4475f79b1cd8b102da2da503ddd41",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "b378a5b85dcf1d7f2326678df9d9019ba46d1350497168ef9cd0ccd4d3bae0d0",
      "designReportSha256": "afd02ffe5b7167fac6d147bf2100c88ebef73287c0f1d32b1981f6fb9c1da304",
      "runtimeReportSha256": "5c5258254dfc17de2f6e7fab1c3a3377c8a534f558ebe0bcc4060233873b5131",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-mechanisms-multilayer-shell-15-d2-06",
    "stageKey": "mechanisms-multilayer-shell-15",
    "difficulty": 2,
    "slot": 6,
    "sourceLevelId": 51,
    "layoutSha256": "0315ab6b00aff5dc0ca6ad8da902cc00396b31ed9d4d74d7570f9f6db120c1b6",
    "admittedInRevision": "e9f7e1fa282f4b4ba66faa356016447ba71a8a7789495171c00831b2a762f63e",
    "dailyMechanisms": [
      "color-exit",
      "multilayer-shell",
      "irregular-block"
    ],
    "level": {
      "id": 51,
      "name": "每日挑战 multilayer-shell 2-6",
      "difficulty": "super",
      "reward": 0,
      "width": 6,
      "height": 6,
      "playable": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          2,
          0
        ],
        [
          3,
          0
        ],
        [
          4,
          0
        ],
        [
          5,
          0
        ],
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          2,
          1
        ],
        [
          3,
          1
        ],
        [
          4,
          1
        ],
        [
          5,
          1
        ],
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ],
        [
          3,
          2
        ],
        [
          4,
          2
        ],
        [
          5,
          2
        ],
        [
          0,
          3
        ],
        [
          1,
          3
        ],
        [
          2,
          3
        ],
        [
          3,
          3
        ],
        [
          4,
          3
        ],
        [
          5,
          3
        ],
        [
          0,
          4
        ],
        [
          1,
          4
        ],
        [
          2,
          4
        ],
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          5,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          5
        ],
        [
          2,
          5
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ],
        [
          5,
          5
        ]
      ],
      "timeSeconds": 120,
      "parMoves": 46,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "shell-d206-s51-n02-b0",
          "x": 4,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              0,
              2
            ],
            [
              1,
              2
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "shell-d206-s51-n02-b1",
          "x": 3,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "shell-d206-s51-n02-b2",
          "x": 2,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "green"
        },
        {
          "id": "shell-d206-s51-n02-b3",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "orange"
        },
        {
          "id": "shell-d206-s51-n02-b4",
          "x": 0,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "pink"
        },
        {
          "id": "shell-d206-s51-n02-b5",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "purple",
          "layers": [
            "purple",
            "blue"
          ]
        },
        {
          "id": "shell-d206-s51-n02-b6",
          "x": 0,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "shell-d206-s51-n02-b7",
          "x": 2,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              2,
              1
            ]
          ],
          "color": "orange"
        },
        {
          "id": "shell-d206-s51-n02-b8",
          "x": 5,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ]
          ],
          "color": "pink"
        },
        {
          "id": "shell-d206-s51-n02-b9",
          "x": 3,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "blue",
          "layers": [
            "blue",
            "purple"
          ]
        },
        {
          "id": "shell-d206-s51-n02-b10",
          "x": 3,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "purple"
        },
        {
          "id": "shell-d206-s51-n02-b11",
          "x": 5,
          "y": 2,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "red"
        },
        {
          "id": "shell-d206-s51-n02-b12",
          "x": 1,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              0,
              1
            ],
            [
              0,
              2
            ]
          ],
          "color": "cyan",
          "layers": [
            "cyan",
            "green"
          ]
        }
      ],
      "gates": [
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "left",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "bottom",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "left",
          "offset": 4,
          "size": 1
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "top",
          "offset": 1,
          "size": 1
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "top",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "right",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "bottom",
          "offset": 1,
          "size": 1
        },
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "bottom",
          "offset": 4,
          "size": 2
        }
      ]
    },
    "proof": {
      "levelSha256": "0315ab6b00aff5dc0ca6ad8da902cc00396b31ed9d4d74d7570f9f6db120c1b6",
      "sourceLevelId": 51,
      "lowerBound": 18,
      "upperBound": 32,
      "routeReplayComplete": true,
      "reportSha256": "075767293c2214b81d6edeaf96d613fd2cef8d7301bd878e6d61a8532ba57631",
      "routeSha256": "dbb9791c788824352eeb0127e29dd3637512e2bfe7d838a5f2ae04ee739efa59",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "0315ab6b00aff5dc0ca6ad8da902cc00396b31ed9d4d74d7570f9f6db120c1b6",
      "designReportSha256": "63742024166f752bb3b8932a0bc5af455c42595901afaeff9ec47f34e9440c9c",
      "runtimeReportSha256": "9f0f57da72b61db2d5781a170d907e21fdce25cd833b73da27f22051e3734e4e",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  },
  {
    "formalId": "daily-mechanisms-multilayer-shell-15-d2-09",
    "stageKey": "mechanisms-multilayer-shell-15",
    "difficulty": 2,
    "slot": 9,
    "sourceLevelId": 35,
    "layoutSha256": "6c2e34867cdf7e73c4e01498bd39b7d1dc04e56aafa31ac39964f178fc13013f",
    "admittedInRevision": "f6282671b4fd386b9b2298a06096c0a684467121d38bf340b100d8526a179a3b",
    "dailyMechanisms": [
      "color-exit",
      "multilayer-shell"
    ],
    "level": {
      "id": 35,
      "name": "每日挑战 multilayer-shell 2-9",
      "difficulty": "super",
      "reward": 0,
      "width": 7,
      "height": 6,
      "playable": [
        [
          0,
          0
        ],
        [
          0,
          1
        ],
        [
          0,
          2
        ],
        [
          0,
          3
        ],
        [
          0,
          4
        ],
        [
          0,
          5
        ],
        [
          1,
          0
        ],
        [
          1,
          1
        ],
        [
          1,
          2
        ],
        [
          1,
          3
        ],
        [
          1,
          4
        ],
        [
          1,
          5
        ],
        [
          2,
          0
        ],
        [
          2,
          1
        ],
        [
          2,
          2
        ],
        [
          2,
          3
        ],
        [
          2,
          4
        ],
        [
          2,
          5
        ],
        [
          3,
          0
        ],
        [
          3,
          1
        ],
        [
          3,
          2
        ],
        [
          3,
          3
        ],
        [
          3,
          4
        ],
        [
          3,
          5
        ],
        [
          4,
          0
        ],
        [
          4,
          1
        ],
        [
          4,
          2
        ],
        [
          4,
          3
        ],
        [
          4,
          4
        ],
        [
          4,
          5
        ],
        [
          5,
          0
        ],
        [
          5,
          1
        ],
        [
          5,
          2
        ],
        [
          5,
          3
        ],
        [
          5,
          4
        ],
        [
          5,
          5
        ],
        [
          6,
          0
        ],
        [
          6,
          1
        ],
        [
          6,
          2
        ],
        [
          6,
          3
        ],
        [
          6,
          4
        ],
        [
          6,
          5
        ]
      ],
      "timeSeconds": 60,
      "parMoves": 26,
      "mechanismRules": "revised-2026-09-27-v1.5",
      "blocks": [
        {
          "id": "shell-d209-s35-n03-b0",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "red"
        },
        {
          "id": "shell-d209-s35-n03-b1",
          "x": 0,
          "y": 3,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "green",
          "layers": [
            "green",
            "red"
          ]
        },
        {
          "id": "shell-d209-s35-n03-b3",
          "x": 0,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "shell-d209-s35-n03-b4",
          "x": 0,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "cyan",
          "layers": [
            "cyan",
            "red"
          ]
        },
        {
          "id": "shell-d209-s35-n03-b5",
          "x": 2,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "yellow"
        },
        {
          "id": "shell-d209-s35-n03-b6",
          "x": 4,
          "y": 0,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              2,
              1
            ]
          ],
          "color": "blue"
        },
        {
          "id": "shell-d209-s35-n03-b7",
          "x": 2,
          "y": 1,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              0,
              2
            ],
            [
              1,
              2
            ]
          ],
          "color": "orange"
        },
        {
          "id": "shell-d209-s35-n03-b8",
          "x": 2,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ]
          ],
          "color": "cyan"
        },
        {
          "id": "shell-d209-s35-n03-b9",
          "x": 3,
          "y": 5,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "color": "purple",
          "layers": [
            "purple",
            "cyan"
          ]
        },
        {
          "id": "shell-d209-s35-n03-b10",
          "x": 4,
          "y": 2,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              2,
              1
            ]
          ],
          "color": "green"
        },
        {
          "id": "shell-d209-s35-n03-b11",
          "x": 5,
          "y": 4,
          "shape": [
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "color": "pink"
        }
      ],
      "gates": [
        {
          "id": "v3-g-blue",
          "color": "blue",
          "side": "right",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-green",
          "color": "green",
          "side": "left",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-yellow",
          "color": "yellow",
          "side": "top",
          "offset": 3,
          "size": 2
        },
        {
          "id": "v3-g-pink",
          "color": "pink",
          "side": "bottom",
          "offset": 5,
          "size": 2
        },
        {
          "id": "v3-g-orange",
          "color": "orange",
          "side": "bottom",
          "offset": 0,
          "size": 2
        },
        {
          "id": "v3-g-purple",
          "color": "purple",
          "side": "bottom",
          "offset": 2,
          "size": 2
        },
        {
          "id": "v3-g-cyan",
          "color": "cyan",
          "side": "right",
          "offset": 1,
          "size": 2
        },
        {
          "id": "v3-g-red",
          "color": "red",
          "side": "left",
          "offset": 3,
          "size": 2
        }
      ]
    },
    "proof": {
      "levelSha256": "6c2e34867cdf7e73c4e01498bd39b7d1dc04e56aafa31ac39964f178fc13013f",
      "sourceLevelId": 35,
      "lowerBound": 18,
      "upperBound": 27,
      "routeReplayComplete": true,
      "reportSha256": "30971961d6266887d0eb5966a1a3e9fa7b1b1aa906870dbdedead0beb2985651",
      "routeSha256": "f77bd426c5621f2c055944c3c8b48f71fdf7416b38f3cfe0b382e2cf6d742a46",
      "toolchainSha256": "45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804"
    },
    "acceptance": {
      "levelSha256": "6c2e34867cdf7e73c4e01498bd39b7d1dc04e56aafa31ac39964f178fc13013f",
      "designReportSha256": "9f19cc6db5d3cef5302bab635ecc5c8b37dfe856fce676b8baa44226de54d71f",
      "runtimeReportSha256": "a846ca4daba2bef094cabb638d9c08066768da6be4612982c16f237bc2642db3",
      "dualScreenPointer": true,
      "naturalTime": true,
      "fullInventory": true,
      "settlement": true
    }
  }
]);
