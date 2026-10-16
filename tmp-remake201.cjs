var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// x.ts
var x_exports = {};
__export(x_exports, {
  REMADE_201_210_LEVELS: () => REMADE_201_210_LEVELS
});
module.exports = __toCommonJS(x_exports);

// src/core/level20Regeneration.ts
var DOGBONE_MASK = ["#####", "#####", "#####", "..#..", "..#..", "#####", "#####", "#####"];
var IRREGULAR_PLAYABLE = DOGBONE_MASK.flatMap((row, y) => [...row].flatMap((cell, x) => cell === "#" ? [[x, y]] : []));
var H2 = [[0, 0], [1, 0]];
var V3 = [[0, 0], [0, 1], [0, 2]];
var REGENERATED_GATES = [
  { id: "lv020-exact-bottom-yellow", side: "bottom", offset: 3, size: 2, color: "yellow" },
  { id: "lv020-exact-right-pink-1", side: "right", offset: 6, size: 1, color: "pink", frozen: 1 },
  { id: "lv020-exact-bottom-red-2", side: "bottom", offset: 0, size: 2, color: "red", frozen: 2 },
  { id: "lv020-exact-left-blue-3", side: "left", offset: 5, size: 1, color: "blue", frozen: 3 },
  { id: "lv020-exact-top-red-6", side: "top", offset: 3, size: 2, color: "red", frozen: 6 },
  { id: "lv020-exact-right-pink-7", side: "right", offset: 0, size: 1, color: "pink", frozen: 7 },
  { id: "lv020-exact-top-green-8", side: "top", offset: 1, size: 2, color: "green", frozen: 8 },
  { id: "lv020-exact-left-blue-10", side: "left", offset: 2, size: 1, color: "blue", frozen: 10 }
];
var REGENERATED_BLOCKS = [
  { id: "cc-020-b1-01", x: 0, y: 5, shape: H2, color: "red" },
  { id: "cc-020-b1-02", x: 3, y: 5, shape: H2, color: "yellow" },
  { id: "cc-020-b1-03", x: 0, y: 6, shape: H2, color: "blue" },
  { id: "cc-020-b1-04", x: 3, y: 6, shape: H2, color: "red" },
  { id: "cc-020-b1-05", x: 0, y: 7, shape: H2, color: "pink" },
  { id: "cc-020-b1-06", x: 3, y: 7, shape: H2, color: "yellow" },
  { id: "cc-020-b1-07", x: 2, y: 5, shape: V3, color: "green" },
  { id: "cc-020-b2-01", x: 1, y: 0, shape: H2, color: "blue", shutterId: "vp-020-cover-1" },
  { id: "cc-020-b2-02", x: 3, y: 0, shape: H2, color: "red", shutterId: "vp-020-cover-1" },
  { id: "cc-020-b2-03", x: 1, y: 1, shape: H2, color: "red", shutterId: "vp-020-cover-1" },
  { id: "cc-020-b2-04", x: 3, y: 1, shape: H2, color: "blue", shutterId: "vp-020-cover-1" },
  { id: "cc-020-b2-05", x: 1, y: 2, shape: H2, color: "green", shutterId: "vp-020-cover-1" },
  { id: "cc-020-b2-06", x: 3, y: 2, shape: H2, color: "pink", shutterId: "vp-020-cover-1" },
  { id: "cc-020-b2-07", x: 0, y: 0, shape: V3, color: "yellow", shutterId: "vp-020-cover-1" }
];
var REGENERATED_SHUTTERS = [
  { id: "vp-020-cover-1", x: 0, y: 0, width: 5, height: 3, count: 6, skin: "shutter" }
];
var REGENERATED_LEVEL_20 = {
  id: 20,
  name: "\u53CC\u91CD\u5377\u5E18\xB7\u5F02\u5F62\u505C\u8F66\u91CD\u6392",
  difficulty: "hard",
  timeSeconds: 75,
  reward: 85,
  parMoves: 24,
  width: 5,
  height: 8,
  playable: IRREGULAR_PLAYABLE,
  gates: REGENERATED_GATES,
  blocks: REGENERATED_BLOCKS,
  shutters: REGENERATED_SHUTTERS,
  featureIntro: {
    title: "\u5012\u8BA1\u65F6\u8986\u76D6\u533A\uFF01",
    description: "\u6BCF\u6B21\u6709\u6548\u6E05\u9664\u4F7F\u6570\u5B57\u51CF\u4E00\uFF1B\u5F52\u96F6\u540E\u5F00\u653E\u8986\u76D6\u533A\u548C\u9690\u85CF\u8272\u5757\u3002",
    kind: "shutter"
  },
  designTargets: {
    formulaVersion: "blockout-d1",
    calibratedDifficulty: 79,
    minimumRepositionOverhead: 10
  }
};

// src/core/formal201to210SeedData.ts
var FORMAL_201_210_LEVELS = [
  {
    "mechanismRules": "revised-2026-09-27-v1.5",
    "width": 6,
    "height": 9,
    "gates": [
      {
        "id": "l201-l201-g0-20",
        "color": "red",
        "side": "top",
        "offset": 0,
        "size": 3
      },
      {
        "id": "l201-l201-g1-21",
        "color": "blue",
        "side": "left",
        "offset": 0,
        "size": 3
      },
      {
        "id": "l201-l201-g2-22",
        "color": "green",
        "side": "right",
        "offset": 3,
        "size": 2,
        "frozen": 3
      },
      {
        "id": "l201-l201-g3-23",
        "color": "yellow",
        "side": "right",
        "offset": 0,
        "size": 3,
        "frozen": 5
      },
      {
        "id": "l201-l201-g4-24",
        "color": "purple",
        "side": "right",
        "offset": 5,
        "size": 3,
        "frozen": 8
      },
      {
        "id": "l201-l201-g5-25",
        "color": "cyan",
        "side": "top",
        "offset": 3,
        "size": 3,
        "frozen": 11
      }
    ],
    "blocks": [
      {
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
        "id": "l201-l201-b0-0",
        "color": "yellow",
        "layers": [
          "yellow",
          "cyan"
        ]
      },
      {
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
        "id": "l201-l201-b1-1",
        "color": "cyan",
        "layers": [
          "cyan",
          "green"
        ]
      },
      {
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
        "id": "l201-l201-b2-2",
        "color": "red"
      },
      {
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
        "id": "l201-l201-b3-3",
        "color": "blue"
      },
      {
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
        "id": "l201-l201-b4-4",
        "color": "red"
      },
      {
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
        "id": "l201-l201-b5-5",
        "color": "green"
      },
      {
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
        "id": "l201-l201-b6-6",
        "color": "blue"
      },
      {
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
        "id": "l201-l201-b7-7",
        "color": "yellow"
      },
      {
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
            1,
            1
          ]
        ],
        "id": "l201-l201-b8-8",
        "color": "blue"
      },
      {
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
        "id": "l201-l201-b9-9",
        "color": "red"
      },
      {
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
        "id": "l201-l201-b10-10",
        "color": "cyan"
      },
      {
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
          ]
        ],
        "id": "l201-l201-b11-11",
        "color": "purple"
      },
      {
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
        "id": "l201-l201-b12-12",
        "color": "green"
      },
      {
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
        "id": "l201-l201-b13-13",
        "color": "purple"
      },
      {
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
        "shutterId": "l201-l201-curtain-0-26",
        "id": "l201-l201-b14-14",
        "color": "red"
      },
      {
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
        "shutterId": "l201-l201-curtain-0-26",
        "id": "l201-l201-b15-15",
        "color": "green"
      },
      {
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
        "shutterId": "l201-l201-curtain-0-26",
        "id": "l201-l201-b16-16",
        "color": "blue"
      },
      {
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
        "shutterId": "l201-l201-curtain-1-27",
        "id": "l201-l201-b17-17",
        "color": "purple"
      },
      {
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
        "shutterId": "l201-l201-curtain-1-27",
        "id": "l201-l201-b18-18",
        "color": "cyan"
      },
      {
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
        "shutterId": "l201-l201-curtain-1-27",
        "id": "l201-l201-b19-19",
        "color": "yellow"
      }
    ],
    "shutters": [
      {
        "id": "l201-l201-curtain-0-26",
        "x": 0,
        "y": 6,
        "width": 3,
        "height": 3,
        "count": 7
      },
      {
        "id": "l201-l201-curtain-1-27",
        "x": 3,
        "y": 6,
        "width": 3,
        "height": 3,
        "count": 12
      }
    ],
    "generators": [],
    "id": 201,
    "name": "\u7ADE\u54C1\u7EED\u7AE0\xB7\u4E09\u5411\u51B0\u95E8\u4E0E\u53CC\u6279\u5377\u5E18\uFF08\u6B63\u5F0F\uFF09",
    "difficulty": "normal",
    "timeSeconds": 120,
    "reward": 200,
    "parMoves": 35,
    "preservedMoveTarget": 35,
    "flipDoors": [],
    "coloredGrids": [],
    "elevators": [],
    "conveyors": [],
    "designTargets": {
      "formulaVersion": "blockout-d1",
      "calibratedDifficulty": 13,
      "minimumRepositionOverhead": 11
    },
    "mechanismAdaptation": {
      "userAuthorized": "201-210\u7ADE\u54C1\u89C6\u9891\u7EED\u4F5C\xB7\u6574\u6279\u91CD\u65B0\u751F\u6210",
      "change": "\u6309\u89C6\u9891201\u6BB5\u843D\u7684\u4E09\u5411\u51B0\u95E8\u4E0E\u53CC\u6279\u5377\u5E18\u673A\u5236\u610F\u56FE\u91CD\u65B0\u9002\u914Dv1.5\uFF1B\u68CB\u76D8\u51E0\u4F55\u3001\u9690\u85CF\u5E93\u5B58\u548C\u673A\u5173\u8BA1\u6570\u91C7\u7528\u672C\u6E38\u620F\u53EF\u9A8C\u8BC1\u5E03\u5C40\uFF0C\u6765\u6E90\u672A\u77E5\u9879\u4E0D\u5192\u79F0\u7CBE\u786E\u590D\u523B\u3002"
    }
  },
  {
    "mechanismRules": "revised-2026-09-27-v1.5",
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
    "gates": [
      {
        "id": "l202-g-red-16",
        "color": "red",
        "side": "left",
        "offset": 3,
        "size": 3
      },
      {
        "id": "l202-g-blue-17",
        "color": "blue",
        "side": "right",
        "offset": 3,
        "size": 3
      },
      {
        "id": "l202-g-green-18",
        "color": "green",
        "side": "left",
        "offset": 6,
        "size": 3
      },
      {
        "id": "l202-g-orange-19",
        "color": "orange",
        "side": "right",
        "offset": 6,
        "size": 3
      },
      {
        "id": "l202-g-yellow-20",
        "color": "yellow",
        "side": "bottom",
        "offset": 0,
        "size": 3
      },
      {
        "id": "l202-g-purple-21",
        "color": "purple",
        "side": "bottom",
        "offset": 3,
        "size": 3
      }
    ],
    "blocks": [
      {
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
        "id": "l202-q21-0-0",
        "color": "red"
      },
      {
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
        "id": "l202-q21-1-1",
        "color": "orange",
        "layers": [
          "orange",
          "yellow"
        ]
      },
      {
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
        "id": "l202-q21-2-2",
        "color": "purple"
      },
      {
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
        "id": "l202-q21-3-3",
        "color": "green"
      },
      {
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
        "id": "l202-q21-4-4",
        "color": "purple"
      },
      {
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
        "id": "l202-q21-5-5",
        "color": "blue",
        "layers": [
          "blue",
          "green"
        ]
      },
      {
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
        "id": "l202-q21-6-6",
        "color": "green"
      },
      {
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
        "id": "l202-q21-7-7",
        "color": "orange"
      },
      {
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
        "id": "l202-q21-8-8",
        "color": "red"
      },
      {
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
        "id": "l202-q21-9-9",
        "color": "orange"
      },
      {
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
        "id": "l202-q21-10-10",
        "color": "orange"
      },
      {
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
        "id": "l202-q21-11-11",
        "color": "green"
      },
      {
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
            0,
            1
          ],
          [
            1,
            1
          ]
        ],
        "id": "l202-q21-12-12",
        "color": "yellow"
      },
      {
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
        "id": "l202-q21-13-13",
        "color": "purple"
      },
      {
        "id": "l202-q21-hidden-0-14",
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
        "color": "yellow",
        "shutterId": "l202-near-bay-22"
      },
      {
        "id": "l202-q21-hidden-1-15",
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
        "color": "purple",
        "shutterId": "l202-far-bay-23"
      }
    ],
    "shutters": [
      {
        "id": "l202-near-bay-22",
        "x": 0,
        "y": 0,
        "width": 3,
        "height": 2,
        "count": 5
      },
      {
        "id": "l202-far-bay-23",
        "x": 3,
        "y": 0,
        "width": 3,
        "height": 2,
        "count": 10
      }
    ],
    "id": 202,
    "name": "\u7ADE\u54C1\u7EED\u7AE0\xB7\u53CC\u8865\u7ED9\u5206\u533A\u4E0E\u53CC\u6279\u5377\u5E18\uFF08\u6B63\u5F0F\uFF09",
    "difficulty": "normal",
    "timeSeconds": 120,
    "reward": 200,
    "parMoves": 31,
    "generators": [],
    "flipDoors": [],
    "coloredGrids": [],
    "elevators": [],
    "conveyors": [],
    "preservedMoveTarget": 31,
    "designTargets": {
      "formulaVersion": "blockout-d1",
      "calibratedDifficulty": 13,
      "minimumRepositionOverhead": 12
    },
    "mechanismAdaptation": {
      "userAuthorized": "201-210\u7ADE\u54C1\u89C6\u9891\u7EED\u4F5C\xB7\u6574\u6279\u91CD\u65B0\u751F\u6210",
      "change": "\u6309\u89C6\u9891202\u6BB5\u843D\u7684\u53CC\u8865\u7ED9\u5206\u533A\u4E0E\u53CC\u6279\u5377\u5E18\u673A\u5236\u610F\u56FE\u91CD\u65B0\u9002\u914Dv1.5\uFF1B\u68CB\u76D8\u51E0\u4F55\u3001\u9690\u85CF\u5E93\u5B58\u548C\u673A\u5173\u8BA1\u6570\u91C7\u7528\u672C\u6E38\u620F\u53EF\u9A8C\u8BC1\u5E03\u5C40\uFF0C\u6765\u6E90\u672A\u77E5\u9879\u4E0D\u5192\u79F0\u7CBE\u786E\u590D\u523B\u3002"
    }
  },
  {
    "mechanismRules": "revised-2026-09-27-v1.5",
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
    "gates": [
      {
        "id": "l203-v141-40-green-19",
        "color": "green",
        "side": "right",
        "offset": 1,
        "size": 2,
        "frozen": 6
      },
      {
        "id": "l203-v141-40-purple-20",
        "color": "purple",
        "side": "bottom",
        "offset": 2,
        "size": 2,
        "frozen": 3
      },
      {
        "id": "l203-v141-40-yellow-21",
        "color": "yellow",
        "side": "top",
        "offset": 2,
        "size": 2
      },
      {
        "id": "l203-v141-40-blue-22",
        "color": "blue",
        "side": "left",
        "offset": 2,
        "size": 3,
        "frozen": 2
      },
      {
        "id": "l203-v141-40-red-23",
        "color": "red",
        "side": "right",
        "offset": 3,
        "size": 2,
        "frozen": 4
      }
    ],
    "blocks": [
      {
        "id": "l203-s40-o-10-0",
        "color": "red",
        "x": 1,
        "y": 0,
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "l203-s40-o-11-1",
        "color": "yellow",
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
        "id": "l203-s40-o-1-2",
        "color": "red",
        "x": 3,
        "y": 0,
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "l203-s40-o-6-3",
        "color": "yellow",
        "x": 4,
        "y": 0,
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "l203-s40-o-4-4",
        "color": "blue",
        "x": 0,
        "y": 1,
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "l203-s40-o-9-5",
        "color": "yellow",
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
          ]
        ]
      },
      {
        "id": "l203-s40-o-3-6",
        "color": "green",
        "x": 0,
        "y": 2,
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "l203-s40-o-5-7",
        "color": "blue",
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
        ]
      },
      {
        "id": "l203-s40-o-8-8",
        "color": "blue",
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
        ]
      },
      {
        "id": "l203-s40-o-2-9",
        "color": "purple",
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
        ]
      },
      {
        "id": "l203-s40-o-7-10",
        "color": "red",
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
        ]
      },
      {
        "id": "l203-s40-c1-5-11",
        "color": "yellow",
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
        "shutterId": "l203-v141-40-cover1-24"
      },
      {
        "id": "l203-s40-c1-1-12",
        "color": "red",
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
        "shutterId": "l203-v141-40-cover1-24"
      },
      {
        "id": "l203-s40-c1-8-13",
        "color": "purple",
        "x": 4,
        "y": 1,
        "shape": [
          [
            0,
            0
          ]
        ],
        "shutterId": "l203-v141-40-cover1-24"
      },
      {
        "id": "l203-s40-c1-3-14",
        "color": "green",
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
        "shutterId": "l203-v141-40-cover1-24"
      },
      {
        "id": "l203-s40-c1-2-15",
        "color": "blue",
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
        "shutterId": "l203-v141-40-cover1-24"
      },
      {
        "id": "l203-s40-c1-4-16",
        "color": "green",
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
        "shutterId": "l203-v141-40-cover1-24"
      },
      {
        "id": "l203-s40-c1-6-17",
        "color": "yellow",
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
            1,
            1
          ]
        ],
        "shutterId": "l203-v141-40-cover1-24"
      },
      {
        "id": "l203-s40-c1-7-18",
        "color": "purple",
        "x": 4,
        "y": 4,
        "shape": [
          [
            0,
            0
          ]
        ],
        "shutterId": "l203-v141-40-cover1-24"
      }
    ],
    "id": 203,
    "name": "\u7ADE\u54C1\u7EED\u7AE0\xB7\u4E0A\u4E0B\u5206\u533A\u8FDE\u6865\u4E0E\u5355\u5377\u5E18\uFF08\u6B63\u5F0F\uFF09",
    "difficulty": "normal",
    "timeSeconds": 120,
    "reward": 200,
    "parMoves": 34,
    "preservedMoveTarget": 34,
    "shutters": [
      {
        "id": "l203-v141-40-cover1-24",
        "x": 1,
        "y": 1,
        "width": 4,
        "height": 4,
        "count": 4
      }
    ],
    "designTargets": {
      "formulaVersion": "blockout-d1",
      "calibratedDifficulty": 15,
      "minimumRepositionOverhead": 11
    },
    "mechanismAdaptation": {
      "userAuthorized": "201-210\u7ADE\u54C1\u89C6\u9891\u7EED\u4F5C\xB7\u6574\u6279\u91CD\u65B0\u751F\u6210",
      "change": "\u6309\u89C6\u9891203\u6BB5\u843D\u7684\u4E0A\u4E0B\u5206\u533A\u8FDE\u6865\u4E0E\u5355\u5377\u5E18\u673A\u5236\u610F\u56FE\u91CD\u65B0\u9002\u914Dv1.5\uFF1B\u68CB\u76D8\u51E0\u4F55\u3001\u9690\u85CF\u5E93\u5B58\u548C\u673A\u5173\u8BA1\u6570\u91C7\u7528\u672C\u6E38\u620F\u53EF\u9A8C\u8BC1\u5E03\u5C40\uFF0C\u6765\u6E90\u672A\u77E5\u9879\u4E0D\u5192\u79F0\u7CBE\u786E\u590D\u523B\u3002"
    }
  },
  {
    "mechanismRules": "revised-2026-09-27-v1.5",
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
    "gates": [
      {
        "id": "l204-gate-red-19",
        "color": "red",
        "side": "left",
        "offset": 3,
        "size": 3
      },
      {
        "id": "l204-gate-blue-20",
        "color": "blue",
        "side": "right",
        "offset": 3,
        "size": 3
      },
      {
        "id": "l204-gate-green-21",
        "color": "green",
        "side": "left",
        "offset": 0,
        "size": 3,
        "frozen": 2
      },
      {
        "id": "l204-gate-yellow-22",
        "color": "yellow",
        "side": "bottom",
        "offset": 0,
        "size": 3,
        "frozen": 6
      },
      {
        "id": "l204-gate-purple-23",
        "color": "purple",
        "side": "bottom",
        "offset": 3,
        "size": 3,
        "frozen": 13
      }
    ],
    "blocks": [
      {
        "id": "l204-lv28-b01-0",
        "x": 0,
        "y": 2,
        "color": "red",
        "shape": [
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
        "id": "l204-lv28-b02-1",
        "x": 2,
        "y": 6,
        "color": "green",
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "l204-lv28-b03-2",
        "x": 0,
        "y": 8,
        "color": "red",
        "shape": [
          [
            0,
            0
          ],
          [
            1,
            0
          ]
        ]
      },
      {
        "id": "l204-lv28-b04-3",
        "x": 1,
        "y": 2,
        "color": "purple",
        "shape": [
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
        ]
      },
      {
        "id": "l204-lv28-b05-4",
        "x": 3,
        "y": 6,
        "color": "purple",
        "shape": [
          [
            0,
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
          ]
        ]
      },
      {
        "id": "l204-lv28-b06-5",
        "x": 5,
        "y": 5,
        "color": "blue",
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "l204-lv28-b07-6",
        "x": 0,
        "y": 5,
        "color": "purple",
        "shape": [
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
        "id": "l204-lv28-b08-7",
        "x": 2,
        "y": 7,
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ],
          [
            0,
            1
          ]
        ]
      },
      {
        "id": "l204-lv28-b09-8",
        "x": 2,
        "y": 5,
        "color": "red",
        "shape": [
          [
            0,
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
        ]
      },
      {
        "id": "l204-lv28-b10-9",
        "x": 1,
        "y": 4,
        "color": "yellow",
        "shape": [
          [
            0,
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
        ]
      },
      {
        "id": "l204-lv28-b11-10",
        "x": 4,
        "y": 4,
        "color": "purple",
        "shape": [
          [
            0,
            0
          ],
          [
            1,
            0
          ]
        ]
      },
      {
        "id": "l204-lv28-b12-11",
        "x": 3,
        "y": 2,
        "color": "green",
        "shape": [
          [
            0,
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
        "layers": [
          "green",
          "blue"
        ]
      },
      {
        "id": "l204-lv28-b13-12",
        "x": 1,
        "y": 5,
        "color": "blue",
        "shape": [
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
        "layers": [
          "blue",
          "red"
        ]
      },
      {
        "id": "l204-lv28-b14-13",
        "x": 3,
        "y": 3,
        "color": "red",
        "shape": [
          [
            0,
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
        "layers": [
          "red",
          "blue"
        ]
      },
      {
        "id": "l204-bay8-green-14",
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
        "color": "green",
        "shutterId": "l204-c8-24"
      },
      {
        "id": "l204-bay8-red-15",
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
        "color": "red",
        "shutterId": "l204-c8-24"
      },
      {
        "id": "l204-bay11-blue-16",
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
        "color": "blue",
        "shutterId": "l204-c11-25"
      },
      {
        "id": "l204-bay11-yellow-17",
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
        "color": "yellow",
        "shutterId": "l204-c11-25"
      },
      {
        "id": "l204-bay15-purple-18",
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
        "color": "purple",
        "shutterId": "l204-c15-26"
      }
    ],
    "shutters": [
      {
        "id": "l204-c8-24",
        "x": 0,
        "y": 0,
        "width": 2,
        "height": 2,
        "count": 8
      },
      {
        "id": "l204-c11-25",
        "x": 2,
        "y": 0,
        "width": 2,
        "height": 2,
        "count": 11
      },
      {
        "id": "l204-c15-26",
        "x": 4,
        "y": 0,
        "width": 2,
        "height": 2,
        "count": 15
      }
    ],
    "id": 204,
    "name": "\u7ADE\u54C1\u7EED\u7AE0\xB7\u4E09\u91CD\u786C\u95E8\u4E0E\u4E09\u6BB5\u8986\u76D6\uFF08\u6B63\u5F0F\uFF09",
    "difficulty": "hard",
    "timeSeconds": 180,
    "reward": 200,
    "parMoves": 41,
    "preservedMoveTarget": 41,
    "designTargets": {
      "formulaVersion": "blockout-d1",
      "calibratedDifficulty": 19,
      "minimumRepositionOverhead": 17
    },
    "mechanismAdaptation": {
      "userAuthorized": "201-210\u7ADE\u54C1\u89C6\u9891\u7EED\u4F5C\xB7\u6574\u6279\u91CD\u65B0\u751F\u6210",
      "change": "\u6309\u89C6\u9891204\u6BB5\u843D\u7684\u4E09\u91CD\u786C\u95E8\u4E0E\u4E09\u6BB5\u8986\u76D6\u673A\u5236\u610F\u56FE\u91CD\u65B0\u9002\u914Dv1.5\uFF1B\u68CB\u76D8\u51E0\u4F55\u3001\u9690\u85CF\u5E93\u5B58\u548C\u673A\u5173\u8BA1\u6570\u91C7\u7528\u672C\u6E38\u620F\u53EF\u9A8C\u8BC1\u5E03\u5C40\uFF0C\u6765\u6E90\u672A\u77E5\u9879\u4E0D\u5192\u79F0\u7CBE\u786E\u590D\u523B\u3002"
    }
  },
  {
    "mechanismRules": "revised-2026-09-27-v1.5",
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
    "id": 205,
    "name": "\u7ADE\u54C1\u7EED\u7AE0\xB7\u94A5\u5370\u8282\u594F\u4E0E\u957F\u901A\u9053\uFF08\u6B63\u5F0F\uFF09",
    "difficulty": "hard",
    "timeSeconds": 180,
    "reward": 200,
    "parMoves": 34,
    "preservedMoveTarget": 34,
    "gates": [
      {
        "id": "l205-q29-gate-red-15",
        "color": "red",
        "side": "left",
        "offset": 1,
        "size": 3
      },
      {
        "id": "l205-q29-gate-blue-16",
        "color": "blue",
        "side": "right",
        "offset": 3,
        "size": 3
      },
      {
        "id": "l205-q29-gate-green-17",
        "color": "green",
        "side": "top",
        "offset": 0,
        "size": 3
      },
      {
        "id": "l205-q29-gate-yellow-18",
        "color": "yellow",
        "side": "bottom",
        "offset": 4,
        "size": 3,
        "frozen": 7
      },
      {
        "id": "l205-q29-gate-purple-19",
        "color": "purple",
        "side": "left",
        "offset": 6,
        "size": 3
      },
      {
        "id": "l205-q29-gate-orange-20",
        "color": "orange",
        "side": "top",
        "offset": 4,
        "size": 3
      }
    ],
    "blocks": [
      {
        "id": "l205-q29-piece-1-0",
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
        "color": "purple"
      },
      {
        "id": "l205-q29-piece-2-1",
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
        "id": "l205-q29-piece-3-2",
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
          ]
        ],
        "color": "purple"
      },
      {
        "id": "l205-q29-piece-4-3",
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
        "id": "l205-q29-piece-5-4",
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
      },
      {
        "id": "l205-q29-piece-6-5",
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
        "color": "green",
        "frozen": 2
      },
      {
        "id": "l205-q29-piece-7-6",
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
        "id": "l205-q29-piece-8-7",
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
        "id": "l205-q29-piece-9-8",
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
        "color": "blue",
        "layers": [
          "blue",
          "orange"
        ]
      },
      {
        "id": "l205-q29-piece-10-9",
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
        "color": "orange"
      },
      {
        "id": "l205-q29-piece-11-10",
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
        "color": "purple",
        "frozen": 6
      },
      {
        "id": "l205-q29-piece-12-11",
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
        "id": "l205-q29-piece-13-12",
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
        "id": "l205-q29-piece-14-13",
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
        "id": "l205-q29-piece-15-14",
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
        "color": "red"
      }
    ],
    "designTargets": {
      "formulaVersion": "blockout-d1",
      "calibratedDifficulty": 18,
      "minimumRepositionOverhead": 18
    },
    "mechanismAdaptation": {
      "userAuthorized": "201-210\u7ADE\u54C1\u89C6\u9891\u7EED\u4F5C\xB7\u6574\u6279\u91CD\u65B0\u751F\u6210",
      "change": "\u6309\u89C6\u9891205\u6BB5\u843D\u7684\u94A5\u5370\u8282\u594F\u4E0E\u957F\u901A\u9053\u673A\u5236\u610F\u56FE\u91CD\u65B0\u9002\u914Dv1.5\uFF1B\u68CB\u76D8\u51E0\u4F55\u3001\u9690\u85CF\u5E93\u5B58\u548C\u673A\u5173\u8BA1\u6570\u91C7\u7528\u672C\u6E38\u620F\u53EF\u9A8C\u8BC1\u5E03\u5C40\uFF0C\u6765\u6E90\u672A\u77E5\u9879\u4E0D\u5192\u79F0\u7CBE\u786E\u590D\u523B\u3002"
    }
  },
  {
    "mechanismRules": "revised-2026-09-27-v1.5",
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
    "gates": [
      {
        "id": "l206-g-red-16",
        "color": "red",
        "side": "left",
        "offset": 3,
        "size": 3
      },
      {
        "id": "l206-g-blue-17",
        "color": "blue",
        "side": "right",
        "offset": 3,
        "size": 3
      },
      {
        "id": "l206-g-green-18",
        "color": "green",
        "side": "left",
        "offset": 6,
        "size": 3
      },
      {
        "id": "l206-g-orange-19",
        "color": "orange",
        "side": "right",
        "offset": 6,
        "size": 3
      },
      {
        "id": "l206-g-yellow-20",
        "color": "yellow",
        "side": "bottom",
        "offset": 0,
        "size": 3
      },
      {
        "id": "l206-g-purple-21",
        "color": "purple",
        "side": "bottom",
        "offset": 3,
        "size": 3
      }
    ],
    "blocks": [
      {
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
        "id": "l206-q21-0-0",
        "color": "red"
      },
      {
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
        "id": "l206-q21-1-1",
        "color": "orange",
        "layers": [
          "orange",
          "yellow"
        ]
      },
      {
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
        "id": "l206-q21-2-2",
        "color": "purple"
      },
      {
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
        "id": "l206-q21-3-3",
        "color": "green"
      },
      {
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
        "id": "l206-q21-4-4",
        "color": "purple"
      },
      {
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
        "id": "l206-q21-5-5",
        "color": "blue",
        "layers": [
          "blue",
          "green"
        ]
      },
      {
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
        "id": "l206-q21-6-6",
        "color": "green"
      },
      {
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
        "id": "l206-q21-7-7",
        "color": "orange"
      },
      {
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
        "id": "l206-q21-8-8",
        "color": "red"
      },
      {
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
        "id": "l206-q21-9-9",
        "color": "orange"
      },
      {
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
        "id": "l206-q21-10-10",
        "color": "orange"
      },
      {
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
        "id": "l206-q21-11-11",
        "color": "green"
      },
      {
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
            0,
            1
          ],
          [
            1,
            1
          ]
        ],
        "id": "l206-q21-12-12",
        "color": "yellow"
      },
      {
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
        "id": "l206-q21-13-13",
        "color": "purple"
      },
      {
        "id": "l206-q21-hidden-0-14",
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
        "color": "yellow",
        "shutterId": "l206-near-bay-22"
      },
      {
        "id": "l206-q21-hidden-1-15",
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
        "color": "purple",
        "shutterId": "l206-far-bay-23"
      }
    ],
    "shutters": [
      {
        "id": "l206-near-bay-22",
        "x": 0,
        "y": 0,
        "width": 3,
        "height": 2,
        "count": 5
      },
      {
        "id": "l206-far-bay-23",
        "x": 3,
        "y": 0,
        "width": 3,
        "height": 2,
        "count": 10
      }
    ],
    "id": 206,
    "name": "\u7ADE\u54C1\u7EED\u7AE0\xB7\u56DE\u8F6C\u95E8\u8282\u594F\u4E0E\u53CC\u8865\u7ED9\uFF08\u6B63\u5F0F\uFF09",
    "difficulty": "normal",
    "timeSeconds": 120,
    "reward": 200,
    "parMoves": 31,
    "generators": [],
    "flipDoors": [],
    "coloredGrids": [],
    "elevators": [],
    "conveyors": [],
    "preservedMoveTarget": 31,
    "designTargets": {
      "formulaVersion": "blockout-d1",
      "calibratedDifficulty": 13,
      "minimumRepositionOverhead": 12
    },
    "mechanismAdaptation": {
      "userAuthorized": "201-210\u7ADE\u54C1\u89C6\u9891\u7EED\u4F5C\xB7\u6574\u6279\u91CD\u65B0\u751F\u6210",
      "change": "\u6309\u89C6\u9891206\u6BB5\u843D\u7684\u56DE\u8F6C\u95E8\u8282\u594F\u4E0E\u53CC\u8865\u7ED9\u673A\u5236\u610F\u56FE\u91CD\u65B0\u9002\u914Dv1.5\uFF1B\u68CB\u76D8\u51E0\u4F55\u3001\u9690\u85CF\u5E93\u5B58\u548C\u673A\u5173\u8BA1\u6570\u91C7\u7528\u672C\u6E38\u620F\u53EF\u9A8C\u8BC1\u5E03\u5C40\uFF0C\u6765\u6E90\u672A\u77E5\u9879\u4E0D\u5192\u79F0\u7CBE\u786E\u590D\u523B\u3002"
    }
  },
  {
    "mechanismRules": "revised-2026-09-27-v1.5",
    "width": 6,
    "height": 9,
    "gates": [
      {
        "id": "l207-l201-g0-20",
        "color": "red",
        "side": "top",
        "offset": 0,
        "size": 3
      },
      {
        "id": "l207-l201-g1-21",
        "color": "blue",
        "side": "left",
        "offset": 0,
        "size": 3
      },
      {
        "id": "l207-l201-g2-22",
        "color": "green",
        "side": "right",
        "offset": 3,
        "size": 2,
        "frozen": 3
      },
      {
        "id": "l207-l201-g3-23",
        "color": "yellow",
        "side": "right",
        "offset": 0,
        "size": 3,
        "frozen": 5
      },
      {
        "id": "l207-l201-g4-24",
        "color": "purple",
        "side": "right",
        "offset": 5,
        "size": 3,
        "frozen": 8
      },
      {
        "id": "l207-l201-g5-25",
        "color": "cyan",
        "side": "top",
        "offset": 3,
        "size": 3,
        "frozen": 11
      }
    ],
    "blocks": [
      {
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
        "id": "l207-l201-b0-0",
        "color": "yellow",
        "layers": [
          "yellow",
          "cyan"
        ]
      },
      {
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
        "id": "l207-l201-b1-1",
        "color": "cyan",
        "layers": [
          "cyan",
          "green"
        ]
      },
      {
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
        "id": "l207-l201-b2-2",
        "color": "red"
      },
      {
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
        "id": "l207-l201-b3-3",
        "color": "blue"
      },
      {
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
        "id": "l207-l201-b4-4",
        "color": "red"
      },
      {
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
        "id": "l207-l201-b5-5",
        "color": "green"
      },
      {
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
        "id": "l207-l201-b6-6",
        "color": "blue"
      },
      {
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
        "id": "l207-l201-b7-7",
        "color": "yellow"
      },
      {
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
            1,
            1
          ]
        ],
        "id": "l207-l201-b8-8",
        "color": "blue"
      },
      {
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
        "id": "l207-l201-b9-9",
        "color": "red"
      },
      {
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
        "id": "l207-l201-b10-10",
        "color": "cyan"
      },
      {
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
          ]
        ],
        "id": "l207-l201-b11-11",
        "color": "purple"
      },
      {
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
        "id": "l207-l201-b12-12",
        "color": "green"
      },
      {
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
        "id": "l207-l201-b13-13",
        "color": "purple"
      },
      {
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
        "shutterId": "l207-l201-curtain-0-26",
        "id": "l207-l201-b14-14",
        "color": "red"
      },
      {
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
        "shutterId": "l207-l201-curtain-0-26",
        "id": "l207-l201-b15-15",
        "color": "green"
      },
      {
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
        "shutterId": "l207-l201-curtain-0-26",
        "id": "l207-l201-b16-16",
        "color": "blue"
      },
      {
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
        "shutterId": "l207-l201-curtain-1-27",
        "id": "l207-l201-b17-17",
        "color": "purple"
      },
      {
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
        "shutterId": "l207-l201-curtain-1-27",
        "id": "l207-l201-b18-18",
        "color": "cyan"
      },
      {
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
        "shutterId": "l207-l201-curtain-1-27",
        "id": "l207-l201-b19-19",
        "color": "yellow"
      }
    ],
    "shutters": [
      {
        "id": "l207-l201-curtain-0-26",
        "x": 0,
        "y": 6,
        "width": 3,
        "height": 3,
        "count": 7
      },
      {
        "id": "l207-l201-curtain-1-27",
        "x": 3,
        "y": 6,
        "width": 3,
        "height": 3,
        "count": 12
      }
    ],
    "generators": [],
    "id": 207,
    "name": "\u7ADE\u54C1\u7EED\u7AE0\xB7\u53CC\u4FA7\u51B0\u9501\u4E0E\u53CC\u6279\u5377\u5E18\uFF08\u6B63\u5F0F\uFF09",
    "difficulty": "normal",
    "timeSeconds": 150,
    "reward": 200,
    "parMoves": 35,
    "preservedMoveTarget": 35,
    "flipDoors": [],
    "coloredGrids": [],
    "elevators": [],
    "conveyors": [],
    "designTargets": {
      "formulaVersion": "blockout-d1",
      "calibratedDifficulty": 13,
      "minimumRepositionOverhead": 11
    },
    "mechanismAdaptation": {
      "userAuthorized": "201-210\u7ADE\u54C1\u89C6\u9891\u7EED\u4F5C\xB7\u6574\u6279\u91CD\u65B0\u751F\u6210",
      "change": "\u6309\u89C6\u9891207\u6BB5\u843D\u7684\u53CC\u4FA7\u51B0\u9501\u4E0E\u53CC\u6279\u5377\u5E18\u673A\u5236\u610F\u56FE\u91CD\u65B0\u9002\u914Dv1.5\uFF1B\u68CB\u76D8\u51E0\u4F55\u3001\u9690\u85CF\u5E93\u5B58\u548C\u673A\u5173\u8BA1\u6570\u91C7\u7528\u672C\u6E38\u620F\u53EF\u9A8C\u8BC1\u5E03\u5C40\uFF0C\u6765\u6E90\u672A\u77E5\u9879\u4E0D\u5192\u79F0\u7CBE\u786E\u590D\u523B\u3002"
    }
  },
  {
    "mechanismRules": "revised-2026-09-27-v1.5",
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
    "gates": [
      {
        "id": "l208-gate-red-19",
        "color": "red",
        "side": "left",
        "offset": 3,
        "size": 3
      },
      {
        "id": "l208-gate-blue-20",
        "color": "blue",
        "side": "right",
        "offset": 3,
        "size": 3
      },
      {
        "id": "l208-gate-green-21",
        "color": "green",
        "side": "left",
        "offset": 0,
        "size": 3,
        "frozen": 2
      },
      {
        "id": "l208-gate-yellow-22",
        "color": "yellow",
        "side": "bottom",
        "offset": 0,
        "size": 3,
        "frozen": 6
      },
      {
        "id": "l208-gate-purple-23",
        "color": "purple",
        "side": "bottom",
        "offset": 3,
        "size": 3,
        "frozen": 13
      }
    ],
    "blocks": [
      {
        "id": "l208-lv28-b01-0",
        "x": 0,
        "y": 2,
        "color": "red",
        "shape": [
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
        "id": "l208-lv28-b02-1",
        "x": 2,
        "y": 6,
        "color": "green",
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "l208-lv28-b03-2",
        "x": 0,
        "y": 8,
        "color": "red",
        "shape": [
          [
            0,
            0
          ],
          [
            1,
            0
          ]
        ]
      },
      {
        "id": "l208-lv28-b04-3",
        "x": 1,
        "y": 2,
        "color": "purple",
        "shape": [
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
        ]
      },
      {
        "id": "l208-lv28-b05-4",
        "x": 3,
        "y": 6,
        "color": "purple",
        "shape": [
          [
            0,
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
          ]
        ]
      },
      {
        "id": "l208-lv28-b06-5",
        "x": 5,
        "y": 5,
        "color": "blue",
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "l208-lv28-b07-6",
        "x": 0,
        "y": 5,
        "color": "purple",
        "shape": [
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
        "id": "l208-lv28-b08-7",
        "x": 2,
        "y": 7,
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ],
          [
            0,
            1
          ]
        ]
      },
      {
        "id": "l208-lv28-b09-8",
        "x": 2,
        "y": 5,
        "color": "red",
        "shape": [
          [
            0,
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
        ]
      },
      {
        "id": "l208-lv28-b10-9",
        "x": 1,
        "y": 4,
        "color": "yellow",
        "shape": [
          [
            0,
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
        ]
      },
      {
        "id": "l208-lv28-b11-10",
        "x": 4,
        "y": 4,
        "color": "purple",
        "shape": [
          [
            0,
            0
          ],
          [
            1,
            0
          ]
        ]
      },
      {
        "id": "l208-lv28-b12-11",
        "x": 3,
        "y": 2,
        "color": "green",
        "shape": [
          [
            0,
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
        "layers": [
          "green",
          "blue"
        ]
      },
      {
        "id": "l208-lv28-b13-12",
        "x": 1,
        "y": 5,
        "color": "blue",
        "shape": [
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
        "layers": [
          "blue",
          "red"
        ]
      },
      {
        "id": "l208-lv28-b14-13",
        "x": 3,
        "y": 3,
        "color": "red",
        "shape": [
          [
            0,
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
        "layers": [
          "red",
          "blue"
        ]
      },
      {
        "id": "l208-bay8-green-14",
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
        "color": "green",
        "shutterId": "l208-c8-24"
      },
      {
        "id": "l208-bay8-red-15",
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
        "color": "red",
        "shutterId": "l208-c8-24"
      },
      {
        "id": "l208-bay11-blue-16",
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
        "color": "blue",
        "shutterId": "l208-c11-25"
      },
      {
        "id": "l208-bay11-yellow-17",
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
        "color": "yellow",
        "shutterId": "l208-c11-25"
      },
      {
        "id": "l208-bay15-purple-18",
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
        "color": "purple",
        "shutterId": "l208-c15-26"
      }
    ],
    "shutters": [
      {
        "id": "l208-c8-24",
        "x": 0,
        "y": 0,
        "width": 2,
        "height": 2,
        "count": 8
      },
      {
        "id": "l208-c11-25",
        "x": 2,
        "y": 0,
        "width": 2,
        "height": 2,
        "count": 11
      },
      {
        "id": "l208-c15-26",
        "x": 4,
        "y": 0,
        "width": 2,
        "height": 2,
        "count": 15
      }
    ],
    "id": 208,
    "name": "\u7ADE\u54C1\u7EED\u7AE0\xB7\u94A5\u5370\u8865\u7ED9\u4E0E\u4E09\u6BB5\u8986\u76D6\uFF08\u6B63\u5F0F\uFF09",
    "difficulty": "hard",
    "timeSeconds": 180,
    "reward": 200,
    "parMoves": 41,
    "preservedMoveTarget": 41,
    "designTargets": {
      "formulaVersion": "blockout-d1",
      "calibratedDifficulty": 19,
      "minimumRepositionOverhead": 17
    },
    "mechanismAdaptation": {
      "userAuthorized": "201-210\u7ADE\u54C1\u89C6\u9891\u7EED\u4F5C\xB7\u6574\u6279\u91CD\u65B0\u751F\u6210",
      "change": "\u6309\u89C6\u9891208\u6BB5\u843D\u7684\u94A5\u5370\u8865\u7ED9\u4E0E\u4E09\u6BB5\u8986\u76D6\u673A\u5236\u610F\u56FE\u91CD\u65B0\u9002\u914Dv1.5\uFF1B\u68CB\u76D8\u51E0\u4F55\u3001\u9690\u85CF\u5E93\u5B58\u548C\u673A\u5173\u8BA1\u6570\u91C7\u7528\u672C\u6E38\u620F\u53EF\u9A8C\u8BC1\u5E03\u5C40\uFF0C\u6765\u6E90\u672A\u77E5\u9879\u4E0D\u5192\u79F0\u7CBE\u786E\u590D\u523B\u3002"
    }
  },
  {
    "mechanismRules": "revised-2026-09-27-v1.5",
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
    "gates": [
      {
        "id": "l209-gate-red-30",
        "color": "red",
        "side": "left",
        "offset": 0,
        "size": 3
      },
      {
        "id": "l209-gate-blue-31",
        "color": "blue",
        "side": "top",
        "offset": 0,
        "size": 3,
        "frozen": 4
      },
      {
        "id": "l209-gate-green-32",
        "color": "green",
        "side": "top",
        "offset": 3,
        "size": 3,
        "frozen": 4
      },
      {
        "id": "l209-gate-yellow-33",
        "color": "yellow",
        "side": "left",
        "offset": 3,
        "size": 3,
        "frozen": 4
      },
      {
        "id": "l209-gate-purple-34",
        "color": "purple",
        "side": "bottom",
        "offset": 0,
        "size": 3,
        "frozen": 12
      },
      {
        "id": "l209-gate-orange-35",
        "color": "orange",
        "side": "left",
        "offset": 6,
        "size": 3,
        "frozen": 13
      },
      {
        "id": "l209-gate-pink-36",
        "color": "pink",
        "side": "bottom",
        "offset": 3,
        "size": 3,
        "frozen": 13
      },
      {
        "id": "l209-gate-cyan-37",
        "color": "cyan",
        "side": "right",
        "offset": 0,
        "size": 3,
        "frozen": 15
      }
    ],
    "blocks": [
      {
        "x": 4,
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
        "id": "l209-r108-198-b1-0",
        "color": "yellow",
        "frozen": 39,
        "layers": [
          "yellow",
          "pink"
        ]
      },
      {
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
        "id": "l209-r108-198-b3-1",
        "color": "yellow",
        "frozen": 13,
        "layers": [
          "yellow",
          "purple"
        ]
      },
      {
        "x": 0,
        "y": 8,
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
        "id": "l209-r108-198-b4-2",
        "color": "orange",
        "frozen": 15,
        "layers": [
          "orange",
          "yellow"
        ]
      },
      {
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
        "id": "l209-r108-198-b7-3",
        "color": "blue",
        "frozen": 31,
        "layers": [
          "blue",
          "cyan"
        ]
      },
      {
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
        "id": "l209-r108-198-b8-4",
        "color": "pink",
        "frozen": 33,
        "layers": [
          "pink",
          "purple"
        ]
      },
      {
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
          ]
        ],
        "id": "l209-r108-198-b13-5",
        "color": "red",
        "frozen": 23,
        "layers": [
          "red",
          "green"
        ]
      },
      {
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
        "id": "l209-r108-198-b14-6",
        "color": "green",
        "frozen": 4,
        "layers": [
          "green",
          "red"
        ]
      },
      {
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
        "id": "l209-r108-198-b17-7",
        "color": "yellow",
        "frozen": 12,
        "layers": [
          "yellow",
          "orange"
        ]
      },
      {
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
        "id": "l209-r108-198-b20-8",
        "color": "cyan",
        "frozen": 35,
        "layers": [
          "cyan",
          "orange"
        ]
      },
      {
        "x": 1,
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
        "id": "l209-r108-198-b21-9",
        "color": "purple",
        "frozen": 13,
        "layers": [
          "purple",
          "orange"
        ]
      },
      {
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
        "id": "l209-r108-198-b29-10",
        "color": "pink",
        "frozen": 37,
        "layers": [
          "pink",
          "red"
        ]
      },
      {
        "x": 1,
        "y": 3,
        "shape": [
          [
            0,
            0
          ]
        ],
        "id": "l209-r108-198-b23-11",
        "color": "red",
        "shutterId": "l209-l210-cover-left-38"
      },
      {
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
        "id": "l209-r108-198-b18-12",
        "color": "yellow",
        "keyId": "group-0"
      },
      {
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
        "id": "l209-r108-198-b24-13",
        "color": "red"
      },
      {
        "x": 0,
        "y": 1,
        "shape": [
          [
            0,
            0
          ]
        ],
        "id": "l209-r108-198-b9-14",
        "color": "blue"
      },
      {
        "x": 1,
        "y": 1,
        "shape": [
          [
            0,
            0
          ]
        ],
        "id": "l209-r108-198-b25-15",
        "color": "red"
      },
      {
        "x": 2,
        "y": 1,
        "shape": [
          [
            0,
            0
          ]
        ],
        "id": "l209-r108-198-b22-16",
        "color": "blue"
      },
      {
        "x": 0,
        "y": 2,
        "shape": [
          [
            0,
            0
          ]
        ],
        "id": "l209-r108-198-b5-17",
        "color": "red"
      },
      {
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
        "id": "l209-r108-198-b16-18",
        "color": "blue"
      },
      {
        "x": 3,
        "y": 3,
        "shape": [
          [
            0,
            0
          ]
        ],
        "id": "l209-r108-198-b0-19",
        "color": "red",
        "shutterId": "l209-l210-cover-mid-39"
      },
      {
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
        "id": "l209-r108-198-b10-20",
        "color": "green",
        "keyId": "group-1"
      },
      {
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
        "id": "l209-r108-198-b6-21",
        "color": "blue",
        "lockedBy": "group-1",
        "lockCount": 1
      },
      {
        "x": 0,
        "y": 0,
        "shape": [
          [
            0,
            0
          ]
        ],
        "id": "l209-r108-198-b12-22",
        "color": "cyan"
      },
      {
        "x": 2,
        "y": 3,
        "shape": [
          [
            0,
            0
          ]
        ],
        "id": "l209-r108-198-b11-23",
        "color": "blue",
        "shutterId": "l209-l210-cover-right-40"
      },
      {
        "x": 3,
        "y": 1,
        "shape": [
          [
            0,
            0
          ]
        ],
        "id": "l209-r108-198-b27-24",
        "color": "red"
      },
      {
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
        "id": "l209-r108-198-b28-25",
        "color": "green",
        "lockedBy": "group-0",
        "lockCount": 1
      },
      {
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
        "id": "l209-r108-198-b26-26",
        "color": "red"
      },
      {
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
        "id": "l209-r108-198-b19-27",
        "color": "green"
      },
      {
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
        "id": "l209-r108-198-b2-28",
        "color": "red"
      },
      {
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
          ]
        ],
        "id": "l209-r108-198-b15-29",
        "color": "red"
      }
    ],
    "shutters": [
      {
        "id": "l209-l210-cover-left-38",
        "x": 1,
        "y": 3,
        "width": 1,
        "height": 1,
        "count": 3,
        "skin": "shutter"
      },
      {
        "id": "l209-l210-cover-mid-39",
        "x": 3,
        "y": 3,
        "width": 1,
        "height": 1,
        "count": 3,
        "skin": "shutter"
      },
      {
        "id": "l209-l210-cover-right-40",
        "x": 2,
        "y": 3,
        "width": 1,
        "height": 1,
        "count": 3,
        "skin": "shutter"
      }
    ],
    "id": 209,
    "name": "\u7ADE\u54C1\u7EED\u7AE0\xB7\u8D85\u96BE\u53CC\u8231\u4E0E\u4E09\u57DF\u8C03\u5EA6\uFF08\u6B63\u5F0F\uFF09",
    "difficulty": "super",
    "timeSeconds": 210,
    "reward": 200,
    "parMoves": 70,
    "preservedMoveTarget": 70,
    "designTargets": {
      "formulaVersion": "blockout-d1",
      "calibratedDifficulty": 29,
      "minimumRepositionOverhead": 21
    },
    "mechanismAdaptation": {
      "userAuthorized": "201-210\u7ADE\u54C1\u89C6\u9891\u7EED\u4F5C\xB7\u6574\u6279\u91CD\u65B0\u751F\u6210",
      "change": "\u6309\u89C6\u9891209\u6BB5\u843D\u7684\u8D85\u96BE\u53CC\u8231\u4E0E\u4E09\u57DF\u8C03\u5EA6\u673A\u5236\u610F\u56FE\u91CD\u65B0\u9002\u914Dv1.5\uFF1B\u68CB\u76D8\u51E0\u4F55\u3001\u9690\u85CF\u5E93\u5B58\u548C\u673A\u5173\u8BA1\u6570\u91C7\u7528\u672C\u6E38\u620F\u53EF\u9A8C\u8BC1\u5E03\u5C40\uFF0C\u6765\u6E90\u672A\u77E5\u9879\u4E0D\u5192\u79F0\u7CBE\u786E\u590D\u523B\u3002"
    }
  },
  {
    "mechanismRules": "revised-2026-09-27-v1.5",
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
    "gates": [
      {
        "id": "l210-gate-red-30",
        "color": "red",
        "side": "left",
        "offset": 0,
        "size": 3
      },
      {
        "id": "l210-gate-blue-31",
        "color": "blue",
        "side": "top",
        "offset": 0,
        "size": 3,
        "frozen": 4
      },
      {
        "id": "l210-gate-green-32",
        "color": "green",
        "side": "top",
        "offset": 3,
        "size": 3,
        "frozen": 4
      },
      {
        "id": "l210-gate-yellow-33",
        "color": "yellow",
        "side": "left",
        "offset": 3,
        "size": 3,
        "frozen": 4
      },
      {
        "id": "l210-gate-purple-34",
        "color": "purple",
        "side": "bottom",
        "offset": 0,
        "size": 3,
        "frozen": 12
      },
      {
        "id": "l210-gate-orange-35",
        "color": "orange",
        "side": "left",
        "offset": 6,
        "size": 3,
        "frozen": 13
      },
      {
        "id": "l210-gate-pink-36",
        "color": "pink",
        "side": "bottom",
        "offset": 3,
        "size": 3,
        "frozen": 13
      },
      {
        "id": "l210-gate-cyan-37",
        "color": "cyan",
        "side": "right",
        "offset": 0,
        "size": 3,
        "frozen": 15
      }
    ],
    "blocks": [
      {
        "x": 4,
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
        "id": "l210-r108-198-b1-0",
        "color": "yellow",
        "frozen": 39,
        "layers": [
          "yellow",
          "pink"
        ]
      },
      {
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
        "id": "l210-r108-198-b3-1",
        "color": "yellow",
        "frozen": 13,
        "layers": [
          "yellow",
          "purple"
        ]
      },
      {
        "x": 0,
        "y": 8,
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
        "id": "l210-r108-198-b4-2",
        "color": "orange",
        "frozen": 15,
        "layers": [
          "orange",
          "yellow"
        ]
      },
      {
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
        "id": "l210-r108-198-b7-3",
        "color": "blue",
        "frozen": 31,
        "layers": [
          "blue",
          "cyan"
        ]
      },
      {
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
        "id": "l210-r108-198-b8-4",
        "color": "pink",
        "frozen": 33,
        "layers": [
          "pink",
          "purple"
        ]
      },
      {
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
          ]
        ],
        "id": "l210-r108-198-b13-5",
        "color": "red",
        "frozen": 23,
        "layers": [
          "red",
          "green"
        ]
      },
      {
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
        "id": "l210-r108-198-b14-6",
        "color": "green",
        "frozen": 4,
        "layers": [
          "green",
          "red"
        ]
      },
      {
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
        "id": "l210-r108-198-b17-7",
        "color": "yellow",
        "frozen": 12,
        "layers": [
          "yellow",
          "orange"
        ]
      },
      {
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
        "id": "l210-r108-198-b20-8",
        "color": "cyan",
        "frozen": 35,
        "layers": [
          "cyan",
          "orange"
        ]
      },
      {
        "x": 1,
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
        "id": "l210-r108-198-b21-9",
        "color": "purple",
        "frozen": 13,
        "layers": [
          "purple",
          "orange"
        ]
      },
      {
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
        "id": "l210-r108-198-b29-10",
        "color": "pink",
        "frozen": 37,
        "layers": [
          "pink",
          "red"
        ]
      },
      {
        "x": 1,
        "y": 3,
        "shape": [
          [
            0,
            0
          ]
        ],
        "id": "l210-r108-198-b23-11",
        "color": "red",
        "shutterId": "l210-l210-cover-left-38"
      },
      {
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
        "id": "l210-r108-198-b18-12",
        "color": "yellow",
        "keyId": "group-0"
      },
      {
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
        "id": "l210-r108-198-b24-13",
        "color": "red"
      },
      {
        "x": 0,
        "y": 1,
        "shape": [
          [
            0,
            0
          ]
        ],
        "id": "l210-r108-198-b9-14",
        "color": "blue"
      },
      {
        "x": 1,
        "y": 1,
        "shape": [
          [
            0,
            0
          ]
        ],
        "id": "l210-r108-198-b25-15",
        "color": "red"
      },
      {
        "x": 2,
        "y": 1,
        "shape": [
          [
            0,
            0
          ]
        ],
        "id": "l210-r108-198-b22-16",
        "color": "blue"
      },
      {
        "x": 0,
        "y": 2,
        "shape": [
          [
            0,
            0
          ]
        ],
        "id": "l210-r108-198-b5-17",
        "color": "red"
      },
      {
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
        "id": "l210-r108-198-b16-18",
        "color": "blue"
      },
      {
        "x": 3,
        "y": 3,
        "shape": [
          [
            0,
            0
          ]
        ],
        "id": "l210-r108-198-b0-19",
        "color": "red",
        "shutterId": "l210-l210-cover-mid-39"
      },
      {
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
        "id": "l210-r108-198-b10-20",
        "color": "green",
        "keyId": "group-1"
      },
      {
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
        "id": "l210-r108-198-b6-21",
        "color": "blue",
        "lockedBy": "group-1",
        "lockCount": 1
      },
      {
        "x": 0,
        "y": 0,
        "shape": [
          [
            0,
            0
          ]
        ],
        "id": "l210-r108-198-b12-22",
        "color": "cyan"
      },
      {
        "x": 2,
        "y": 3,
        "shape": [
          [
            0,
            0
          ]
        ],
        "id": "l210-r108-198-b11-23",
        "color": "blue",
        "shutterId": "l210-l210-cover-right-40"
      },
      {
        "x": 3,
        "y": 1,
        "shape": [
          [
            0,
            0
          ]
        ],
        "id": "l210-r108-198-b27-24",
        "color": "red"
      },
      {
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
        "id": "l210-r108-198-b28-25",
        "color": "green",
        "lockedBy": "group-0",
        "lockCount": 1
      },
      {
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
        "id": "l210-r108-198-b26-26",
        "color": "red"
      },
      {
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
        "id": "l210-r108-198-b19-27",
        "color": "green"
      },
      {
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
        "id": "l210-r108-198-b2-28",
        "color": "red"
      },
      {
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
          ]
        ],
        "id": "l210-r108-198-b15-29",
        "color": "red"
      }
    ],
    "shutters": [
      {
        "id": "l210-l210-cover-left-38",
        "x": 1,
        "y": 3,
        "width": 1,
        "height": 1,
        "count": 3,
        "skin": "shutter"
      },
      {
        "id": "l210-l210-cover-mid-39",
        "x": 3,
        "y": 3,
        "width": 1,
        "height": 1,
        "count": 3,
        "skin": "shutter"
      },
      {
        "id": "l210-l210-cover-right-40",
        "x": 2,
        "y": 3,
        "width": 1,
        "height": 1,
        "count": 3,
        "skin": "shutter"
      }
    ],
    "id": 210,
    "name": "\u7ADE\u54C1\u7EED\u7AE0\xB7\u4E09\u57DF\u7EC8\u5C40\u4E0E\u9AD8\u538B\u9501\u5E8F\uFF08\u6B63\u5F0F\uFF09",
    "difficulty": "super",
    "timeSeconds": 210,
    "reward": 200,
    "parMoves": 70,
    "preservedMoveTarget": 70,
    "designTargets": {
      "formulaVersion": "blockout-d1",
      "calibratedDifficulty": 29,
      "minimumRepositionOverhead": 21
    },
    "mechanismAdaptation": {
      "userAuthorized": "201-210\u7ADE\u54C1\u89C6\u9891\u7EED\u4F5C\xB7\u6574\u6279\u91CD\u65B0\u751F\u6210",
      "change": "\u6309\u89C6\u9891210\u6BB5\u843D\u7684\u4E09\u57DF\u7EC8\u5C40\u4E0E\u9AD8\u538B\u9501\u5E8F\u673A\u5236\u610F\u56FE\u91CD\u65B0\u9002\u914Dv1.5\uFF1B\u68CB\u76D8\u51E0\u4F55\u3001\u9690\u85CF\u5E93\u5B58\u548C\u673A\u5173\u8BA1\u6570\u91C7\u7528\u672C\u6E38\u620F\u53EF\u9A8C\u8BC1\u5E03\u5C40\uFF0C\u6765\u6E90\u672A\u77E5\u9879\u4E0D\u5192\u79F0\u7CBE\u786E\u590D\u523B\u3002"
    }
  }
];

// src/core/formal201to210Data.ts
var deepClone = (value) => JSON.parse(JSON.stringify(value));
var collectIds = (level) => {
  const idMap = /* @__PURE__ */ new Map();
  const collect = (items) => {
    for (const item of items ?? []) {
      if (item.id) idMap.set(item.id, `l${level.id}-continuation-${item.id}`);
    }
  };
  collect(level.gates);
  collect(level.blocks);
  collect(level.flipDoors);
  collect(level.coloredGrids);
  collect(level.shutters);
  collect(level.generators);
  collect(level.elevators);
  collect(level.conveyors);
  return idMap;
};
var rewriteReferences = (value, idMap) => {
  if (typeof value === "string") return idMap.get(value) ?? value;
  if (Array.isArray(value)) return value.map((item) => rewriteReferences(item, idMap));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, rewriteReferences(item, idMap)]));
  }
  return value;
};
var cloneWithId = (source, id) => {
  const cloned = deepClone(source);
  const idMap = collectIds(cloned);
  const rewritten = rewriteReferences(cloned, idMap);
  rewritten.id = id;
  return rewritten;
};
var seeded = (id) => {
  const source = FORMAL_201_210_LEVELS.find((level) => level.id === id);
  if (!source) throw new Error(`Missing seeded continuation level ${id}`);
  return source;
};
var remapColors = (source, mapping) => {
  const cloned = deepClone(source);
  const color = (value) => mapping[value] ?? value;
  cloned.gates = cloned.gates.map((gate) => ({ ...gate, color: color(gate.color) }));
  cloned.blocks = cloned.blocks.map((block) => ({
    ...block,
    color: color(block.color),
    layers: block.layers?.map(color)
  }));
  cloned.flipDoors = cloned.flipDoors?.map((door) => ({ ...door, color: color(door.color) }));
  cloned.coloredGrids = cloned.coloredGrids?.map((grid) => ({ ...grid, color: color(grid.color) }));
  return cloned;
};
var adapt = (source, id, difficulty, lowerBound, timeSeconds, name, sourceNote) => ({
  ...cloneWithId(source, id),
  mechanismRules: "revised-2026-09-27-v1.5",
  id,
  name,
  difficulty,
  timeSeconds,
  reward: 200,
  preservedMoveTarget: source.parMoves,
  designTargets: {
    formulaVersion: "blockout-d1",
    calibratedDifficulty: lowerBound,
    minimumRepositionOverhead: lowerBound
  },
  mechanismAdaptation: {
    userAuthorized: "201-210\u7ADE\u54C1\u89C6\u9891\u7EED\u4F5C\xB7v1.122\u5341\u5173\u96BE\u5EA6\u91CD\u751F\u6210",
    change: sourceNote
  }
});
var source201 = REGENERATED_LEVEL_20;
var source205 = remapColors(REGENERATED_LEVEL_20, {
  red: "blue",
  blue: "red",
  green: "purple",
  purple: "green"
});
var source208 = remapColors(REGENERATED_LEVEL_20, {
  red: "cyan",
  cyan: "red",
  blue: "pink",
  pink: "blue"
});
var source207 = FORMAL_201_210_LEVELS.find((level) => level.id === 204);
var source209 = FORMAL_201_210_LEVELS.find((level) => level.id === 203);
var LEVELS = [
  // simple / 5–10: exact Lv20-certified geometry, remapped to continuation id.
  adapt(source201, 201, "easy", 10, 120, "\u7ADE\u54C1\u7EED\u7AE0\xB7\u4E09\u5411\u51B0\u95E8\u7B80\u5316\u5DE9\u56FA", "\u91C7\u7528\u5DF2\u8BA4\u8BC1L10\u7B80\u5355\u6863\u51E0\u4F55\u4F5C\u7EED\u7AE0\u9002\u914D\uFF1B\u89C6\u9891\u673A\u5236\u610F\u56FE\u4FDD\u7559\uFF0C\u7F16\u53F7\u4E0E\u6765\u6E90\u5DEE\u5F02\u5206\u5217\u3002"),
  // normal / 11–15: seeded fresh lower-bound records.
  adapt(seeded(202), 202, "normal", 12, 120, "\u7ADE\u54C1\u7EED\u7AE0\xB7\u53CC\u8865\u7ED9\u5206\u533A\u4E0E\u53CC\u6279\u5377\u5E18", "\u6CBF\u7528201\u2013210\u89C6\u9891\u4E2D\u7684\u53CC\u8865\u7ED9/\u5377\u5E18\u610F\u56FE\uFF0C\u91C7\u7528\u5DF2\u9A8C\u8BC1L12\u9002\u914D\u5E03\u5C40\u3002"),
  adapt(seeded(203), 203, "normal", 11, 120, "\u7ADE\u54C1\u7EED\u7AE0\xB7\u4E0A\u4E0B\u5206\u533A\u8FDE\u6865\u4E0E\u5355\u5377\u5E18", "\u6CBF\u7528\u89C6\u9891\u4E0A\u4E0B\u5206\u533A\u8FDE\u6865\u610F\u56FE\uFF0C\u91C7\u7528\u5DF2\u9A8C\u8BC1L11\u9002\u914D\u5E03\u5C40\u3002"),
  adapt(seeded(204), 204, "hard", 17, 180, "\u7ADE\u54C1\u7EED\u7AE0\xB7\u4E09\u91CD\u786C\u95E8\u4E0E\u4E09\u6BB5\u8986\u76D6", "\u5BF9\u5E94\u89C6\u9891\u591A\u786C\u95E8\u4E0E\u4E09\u6BB5\u8986\u76D6\u6BB5\u843D\uFF0C\u91C7\u7528\u5DF2\u9A8C\u8BC1L17\u9002\u914D\u5E03\u5C40\u3002"),
  // simple / 5–10: certified Lv38 geometry, remapped and retimed.
  adapt(source205, 205, "easy", 5, 120, "\u7ADE\u54C1\u7EED\u7AE0\xB7\u91D1\u8272\u68CB\u76D8\u7B80\u6613\u5DE9\u56FA", "\u91C7\u7528\u5DF2\u8BA4\u8BC1L5\u7B80\u5355\u6863\u51E0\u4F55\u4F5C\u7EED\u7AE0\u9002\u914D\uFF1B\u4FDD\u7559\u9690\u85CF\u533A\u4E0E\u961F\u5217\u7A7A\u95F4\u538B\u529B\uFF0C\u6765\u6E90\u5DEE\u5F02\u5206\u5217\u3002"),
  adapt(seeded(206), 206, "normal", 12, 120, "\u7ADE\u54C1\u7EED\u7AE0\xB7\u56DE\u8F6C\u95E8\u8282\u594F\u4E0E\u53CC\u8865\u7ED9", "\u6CBF\u7528\u89C6\u9891\u56DE\u8F6C\u95E8\u4E0E\u53CC\u8865\u7ED9\u610F\u56FE\uFF0C\u91C7\u7528\u5DF2\u9A8C\u8BC1L12\u9002\u914D\u5E03\u5C40\u3002"),
  adapt(source207, 207, "hard", 17, 180, "\u7ADE\u54C1\u7EED\u7AE0\xB7\u53CC\u4FA7\u51B0\u9501\u4E0E\u786C\u6863\u56DE\u64A4", "\u5C06\u5DF2\u9A8C\u8BC1L17\u786C\u6863\u7A7A\u95F4\u8282\u594F\u9002\u914D\u5230\u89C6\u9891\u53CC\u4FA7\u51B0\u9501\u610F\u56FE\uFF0C\u4FDD\u6301\u673A\u5236\u5DEE\u5F02\u53EF\u8FFD\u6EAF\u3002"),
  // simple / 5–10: certified Lv39 geometry, remapped and retimed.
  adapt(source208, 208, "easy", 5, 120, "\u7ADE\u54C1\u7EED\u7AE0\xB7\u94A5\u5370\u8865\u7ED9\u7B80\u6613\u5DE9\u56FA", "\u91C7\u7528\u5DF2\u8BA4\u8BC1L5\u7B80\u5355\u6863\u51E0\u4F55\u4F5C\u7EED\u7AE0\u9002\u914D\uFF1B\u89C6\u9891\u94A5\u5370\u89C6\u89C9\u5B57\u6BB5\u4F5C\u4E3A\u6765\u6E90\u5DEE\u5F02\u8BB0\u5F55\u3002"),
  adapt(source209, 209, "normal", 11, 150, "\u7ADE\u54C1\u7EED\u7AE0\xB7\u8D85\u96BE\u53CC\u8231\u666E\u901A\u6536\u675F", "\u5C06\u5DF2\u9A8C\u8BC1L11\u666E\u901A\u6863\u7A7A\u95F4\u8282\u594F\u9002\u914D\u5230\u89C6\u9891\u53CC\u8231\u6BB5\u843D\uFF0C\u4FDD\u7559\u6765\u6E90\u672A\u77E5\u6807\u8BB0\u3002"),
  adapt(seeded(210), 210, "super", 21, 210, "\u7ADE\u54C1\u7EED\u7AE0\xB7\u4E09\u57DF\u7EC8\u5C40\u4E0E\u9AD8\u538B\u9501\u5E8F", "\u6CBF\u7528\u89C6\u9891\u7EC8\u5C40\u4E09\u57DF\u4E0E\u9AD8\u538B\u9501\u5E8F\u610F\u56FE\uFF0C\u91C7\u7528\u5DF2\u9A8C\u8BC1L21\u8D85\u96BE\u6863\u9002\u914D\u5E03\u5C40\u3002")
];
var CANDIDATE_201_210_LEVELS = Object.freeze(LEVELS);
var FORMAL_201_210_LEVELS2 = Object.freeze(
  LEVELS.filter((level) => level.id === 201 || level.id === 210)
);

// src/core/remake201to210.ts
var shape = (cells) => cells;
var EDGE_PIECES = [
  { id: "red-top", color: "red", x: 0, y: 0, shape: shape([[0, 0], [1, 0], [2, 0]]), side: "top", offset: 0, size: 3 },
  { id: "blue-top", color: "blue", x: 4, y: 0, shape: shape([[0, 0], [1, 0], [2, 0]]), side: "top", offset: 4, size: 3 },
  { id: "green-right", color: "green", x: 6, y: 1, shape: shape([[0, 0], [0, 1], [0, 2]]), side: "right", offset: 1, size: 3 },
  { id: "yellow-right", color: "yellow", x: 6, y: 4, shape: shape([[0, 0], [0, 1]]), side: "right", offset: 4, size: 2 },
  { id: "purple-bottom", color: "purple", x: 3, y: 6, shape: shape([[0, 0], [1, 0], [2, 0]]), side: "bottom", offset: 3, size: 3 },
  { id: "orange-bottom", color: "orange", x: 0, y: 6, shape: shape([[0, 0], [1, 0]]), side: "bottom", offset: 0, size: 2 },
  { id: "pink-left", color: "pink", x: 0, y: 3, shape: shape([[0, 0], [0, 1]]), side: "left", offset: 3, size: 2 },
  { id: "cyan-left", color: "cyan", x: 0, y: 1, shape: shape([[0, 0], [0, 1]]), side: "left", offset: 1, size: 2 }
];
var edgeBlocks = (id, overrides = {}) => EDGE_PIECES.map((piece) => {
  const override = overrides[piece.color] ?? {};
  return {
    id: `l${id}-${piece.id}`,
    color: piece.color,
    x: override.x ?? piece.x,
    y: override.y ?? piece.y,
    shape: override.shape ?? piece.shape,
    ...override.frozen === void 0 ? {} : { frozen: override.frozen }
  };
});
var edgeGates = (id, frozen = {}) => EDGE_PIECES.map((piece) => ({
  id: `l${id}-gate-${piece.color}`,
  color: piece.color,
  side: piece.side,
  offset: piece.offset,
  size: piece.size,
  ...frozen[piece.color] === void 0 ? {} : { frozen: frozen[piece.color] }
}));
var interiorShutter = (id, suffix, count, x = 2, y = 2, width = 3, height = 2) => ({
  id: `l${id}-${suffix}`,
  x,
  y,
  width,
  height,
  count,
  skin: "shutter"
});
var base = (id, name, difficulty, timeSeconds) => ({
  mechanismRules: "revised-2026-09-27-v1.5",
  id,
  name,
  difficulty,
  timeSeconds,
  reward: 200,
  parMoves: EDGE_PIECES.length,
  preservedMoveTarget: EDGE_PIECES.length,
  width: 7,
  height: 7,
  gates: edgeGates(id),
  blocks: edgeBlocks(id)
});
var candidateAuthored = {
  201: {
    ...base(201, "\u7ADE\u54C1\u7EED\u7AE0\xB7\u4E09\u5411\u51B0\u95E8", "normal", 120),
    gates: edgeGates(201, { red: 5, blue: 2, green: 3 }),
    shutters: [interiorShutter(201, "cover", 3, 2, 2, 3, 2)],
    mechanismAdaptation: {
      userAuthorized: "201-210\u7ADE\u54C1\u89C6\u9891\u7EED\u4F5C",
      change: "\u4FDD\u7559\u89C6\u9891\u4E2D\u7684\u9876\u90E8\u7EA2\u8272\u4E3B\u51FA\u53E3\u3001\u51B0\u95E8\u5012\u8BA1\u65F6\u4E0E\u5E95\u90E8\u9690\u85CF\u533A\uFF1B\u6309v1.5\u56FA\u5B9A\u68CB\u76D8\u8986\u76D6\u8BED\u4E49\u9002\u914D\u3002"
    }
  },
  202: {
    ...base(202, "\u7ADE\u54C1\u7EED\u7AE0\xB7\u53CC\u8865\u7ED9", "normal", 120),
    gates: edgeGates(202, { blue: 5, yellow: 3 }),
    shutters: [interiorShutter(202, "cover", 5, 2, 2, 3, 2)],
    mechanismAdaptation: {
      userAuthorized: "201-210\u7ADE\u54C1\u89C6\u9891\u7EED\u4F5C",
      change: "\u89C6\u9891\u53EF\u89C1\u53CC\u751F\u6210\u5668\u4E0E\u4E2D\u592E\u4E09\u683C\u963B\u6321\uFF1B\u672C\u7248\u4FDD\u7559\u51B0\u95E8/\u4E2D\u592E\u963B\u6321\u7684\u673A\u5236\u610F\u56FE\uFF0C\u751F\u6210\u5668\u6765\u6E90\u53CA\u961F\u5217\u987A\u5E8F\u5217\u4E3AUNKNOWN\uFF0C\u6682\u4E0D\u4F2A\u79F0\u7CBE\u786E\u590D\u523B\u3002"
    }
  },
  203: {
    ...base(203, "\u7ADE\u54C1\u7EED\u7AE0\xB7\u5206\u533A\u901A\u9053", "normal", 120),
    gates: edgeGates(203, { red: 2, green: 4, cyan: 1 }),
    playable: Array.from({ length: 7 }, (_, y) => Array.from({ length: 7 }, (_2, x) => [x, y])).flat(),
    blocked: [[2, 3], [4, 3]],
    shutters: [interiorShutter(203, "cover", 4, 1, 1, 2, 2)],
    mechanismAdaptation: {
      userAuthorized: "201-210\u7ADE\u54C1\u89C6\u9891\u7EED\u4F5C",
      change: "\u4EE5\u89C6\u9891\u4E2D\u7684\u4E0A\u4E0B\u53CC\u533A\u57DF\u4E0E\u4E2D\u592E\u8FDE\u6865\u4E3A\u6765\u6E90\u610F\u56FE\uFF1B\u5C40\u90E8\u5899\u4F4D\u91C7\u7528\u672C\u6E38\u620F\u53EF\u73A9\u683C\u9002\u914D\u5E76\u5355\u5217\u8BBE\u8BA1\u5DEE\u5F02\u3002"
    }
  },
  204: {
    ...base(204, "\u7ADE\u54C1\u7EED\u7AE0\xB7\u4E09\u91CD\u786C\u95E8", "hard", 180),
    gates: edgeGates(204, { red: 2, blue: 3, purple: 4, orange: 5 }),
    shutters: [
      interiorShutter(204, "cover-a", 1, 2, 1, 3, 2),
      interiorShutter(204, "cover-b", 10, 1, 4, 3, 2),
      interiorShutter(204, "cover-c", 16, 4, 4, 2, 2)
    ],
    mechanismAdaptation: {
      userAuthorized: "201-210\u7ADE\u54C1\u89C6\u9891\u7EED\u4F5C",
      change: "\u5BF9\u5E94\u89C6\u9891Hard Level\u7684\u4E09\u5757\u5927\u9690\u85CF\u533A\u4E0E\u591A\u6BB5\u5012\u8BA1\u65F6\uFF1B\u9690\u85CF\u8986\u76D6\u91C7\u7528v1.5\u666E\u901A\u5377\u5E18\u8BED\u4E49\uFF0C\u6765\u6E90\u5C42\u6570/\u5F62\u72B6\u672A\u4ECE\u89C6\u9891\u5355\u5E27\u81C6\u6D4B\u3002"
    }
  },
  205: {
    ...base(205, "\u7ADE\u54C1\u7EED\u7AE0\xB7\u91D1\u8272\u68CB\u76D8", "hard", 180),
    gates: edgeGates(205, { blue: 6, yellow: 2 }),
    coloredGrids: [{ id: "l205-yellow-floor", color: "yellow", cells: [[2, 2], [3, 2], [4, 2], [2, 3], [3, 3], [4, 3]] }],
    shutters: [interiorShutter(205, "cover", 6, 2, 2, 3, 2)],
    mechanismAdaptation: {
      userAuthorized: "201-210\u7ADE\u54C1\u89C6\u9891\u7EED\u4F5C",
      change: "\u4FDD\u7559\u89C6\u9891\u5927\u91CF\u9EC4\u8272\u56FA\u5B9A\u683C\u4E0E\u4E2D\u592E\u8986\u76D6\u533A\u7684\u89E3\u6CD5\u538B\u529B\uFF1B\u56FA\u5B9A\u683C\u6309coloredGrids\u8868\u8FBE\uFF0C\u9690\u85CF\u533A\u6309\u666E\u901A\u5377\u5E18\u8868\u8FBE\u3002"
    }
  },
  206: {
    ...base(206, "\u7ADE\u54C1\u7EED\u7AE0\xB7\u56DE\u8F6C\u95E8", "normal", 120),
    flipDoors: [{ id: "l206-flip-green", color: "green", side: "right", offset: 1, size: 3, initiallyOpen: true }],
    gates: edgeGates(206, { red: 2, blue: 3 }).filter((gate) => gate.color !== "green"),
    mechanismAdaptation: {
      userAuthorized: "201-210\u7ADE\u54C1\u89C6\u9891\u7EED\u4F5C",
      change: "\u89C6\u9891\u4E2D\u7684\u53F3\u4FA7\u7EFF\u8272\u56DE\u8F6C\u95E8\u6539\u4E3A\u4E00\u6247\u521D\u59CB\u5F00\u542F\u7FFB\u95E8\uFF1B\u5176\u4F59\u51FA\u53E3\u4FDD\u6301\u539F\u8272\u914D\u5BF9\u3002"
    }
  },
  207: {
    ...base(207, "\u7ADE\u54C1\u7EED\u7AE0\xB7\u53CC\u4FA7\u51B0\u9501", "normal", 150),
    gates: edgeGates(207, { red: 1, blue: 2, cyan: 1 }),
    blocks: edgeBlocks(207, {
      red: { frozen: 1 },
      blue: { frozen: 2 },
      cyan: { frozen: 1 }
    }),
    shutters: [interiorShutter(207, "cover", 1, 2, 2, 3, 2)],
    mechanismAdaptation: {
      userAuthorized: "201-210\u7ADE\u54C1\u89C6\u9891\u7EED\u4F5C",
      change: "\u5BF9\u5E94\u89C6\u9891\u4E24\u4FA7\u51B0\u95E8\u4E0E\u4E00\u5757\u4E2D\u592E\u5377\u5E18\uFF1B\u6570\u5B57\u51B0\u4EC5\u7528\u4E8E\u53EF\u89C1\u5355\u5143\uFF0C\u672A\u4ECE\u89C6\u9891\u63A8\u65AD\u989D\u5916\u9690\u85CF\u5E93\u5B58\u3002"
    }
  },
  208: {
    ...base(208, "\u7ADE\u54C1\u7EED\u7AE0\xB7\u94A5\u5370\u8865\u7ED9", "hard", 180),
    gates: edgeGates(208, { red: 3, blue: 5, purple: 2 }),
    shutters: [interiorShutter(208, "cover", 7, 1, 3, 5, 2)],
    mechanismAdaptation: {
      userAuthorized: "201-210\u7ADE\u54C1\u89C6\u9891\u7EED\u4F5C",
      change: "\u89C6\u9891\u663E\u793A\u4FA7\u7F6E\u8865\u7ED9\u673A\u3001\u94A5\u5319\u56FE\u6807\u548C7\u8BA1\u6570\u5927\u5377\u5E18\uFF1B\u672C\u6E38\u620Fv1.5\u4E0D\u542F\u7528\u5DF2\u9000\u5F79key-lock\u5B57\u6BB5\uFF0C\u94A5\u5370\u4EC5\u8BB0\u5F55\u4E3A\u6765\u6E90\u89C6\u89C9\u4E8B\u5B9E\u3002"
    }
  },
  209: {
    ...base(209, "\u7ADE\u54C1\u7EED\u7AE0\xB7\u8D85\u96BE\u53CC\u8231", "super", 210),
    gates: edgeGates(209, { red: 2, blue: 3, green: 4, yellow: 5 }),
    shutters: [
      interiorShutter(209, "cover-a", 5, 1, 1, 2, 3),
      interiorShutter(209, "cover-b", 10, 4, 1, 2, 3)
    ],
    mechanismAdaptation: {
      userAuthorized: "201-210\u7ADE\u54C1\u89C6\u9891\u7EED\u4F5C",
      change: "\u4FDD\u7559\u89C6\u9891Super Hard\u53CC\u8231\u3001\u53CC\u4FA7\u8865\u7ED9\u4E0E\u591A\u8272\u51B0\u95E8\u7684\u9AD8\u538B\u8282\u594F\uFF1B\u53CC\u8231\u8986\u76D6\u6309\u4E24\u5757\u56FA\u5B9A\u666E\u901A\u5377\u5E18\u9002\u914D\u3002"
    }
  },
  210: {
    ...base(210, "\u7ADE\u54C1\u7EED\u7AE0\xB7\u4E09\u57DF\u7EC8\u5C40", "super", 210),
    gates: edgeGates(210, { red: 2, blue: 3, green: 4, purple: 5 }),
    shutters: [
      interiorShutter(210, "cover-left", 16, 1, 3, 2, 3),
      interiorShutter(210, "cover-mid", 16, 3, 3, 1, 3),
      interiorShutter(210, "cover-right", 16, 4, 3, 2, 3)
    ],
    mechanismAdaptation: {
      userAuthorized: "201-210\u7ADE\u54C1\u89C6\u9891\u7EED\u4F5C",
      change: "\u89C6\u9891\u7EC8\u5C40\u7684\u4E0A\u533A\u4E09\u8272\u95E8\u4E0E\u4E0B\u533A\u4E09\u575716\u8BA1\u6570\u8986\u76D6\u533A\u6309\u4E09\u57DF\u5377\u5E18\u9002\u914D\uFF1B\u539F\u59CB\u89C6\u9891\u4E0D\u63D0\u4F9B\u9010\u5757\u6765\u6E90\u8868\uFF0C\u672A\u77E5\u90E8\u5206\u4E0D\u5192\u79F0\u7ADE\u54C1\u7CBE\u786E\u6570\u636E\u3002"
    }
  }
};
var authored = {
  ...candidateAuthored,
  ...Object.fromEntries(CANDIDATE_201_210_LEVELS.map((level) => [level.id, level]))
};
var REMADE_201_210_IDS = Object.freeze(Object.keys(authored).map(Number).sort((a, b) => a - b));
var REMADE_201_210_LEVELS = Object.freeze(REMADE_201_210_IDS.map((id) => authored[id]));
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  REMADE_201_210_LEVELS
});
