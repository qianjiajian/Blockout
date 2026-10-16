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

// <stdin>
var stdin_exports = {};
__export(stdin_exports, {
  FORMAL_201_205_LEVELS: () => FORMAL_201_205_LEVELS,
  auditRevisedMechanismContract: () => auditRevisedMechanismContract
});
module.exports = __toCommonJS(stdin_exports);

// src/core/formal201to205Data.ts
var FORMAL_201_205_LEVELS = [
  {
    "mechanismRules": "revised-2026-09-27-v1.5",
    "width": 6,
    "height": 9,
    "gates": [
      {
        "id": "l201-r147-190-g0",
        "color": "red",
        "side": "top",
        "offset": 3,
        "size": 3
      },
      {
        "id": "l201-r147-190-g1",
        "color": "blue",
        "side": "right",
        "offset": 0,
        "size": 3
      },
      {
        "id": "l201-r147-190-g2",
        "color": "green",
        "side": "left",
        "offset": 3,
        "size": 2,
        "frozen": 3
      },
      {
        "id": "l201-r147-190-g3",
        "color": "yellow",
        "side": "left",
        "offset": 0,
        "size": 3,
        "frozen": 5
      },
      {
        "id": "l201-r147-190-g4",
        "color": "purple",
        "side": "left",
        "offset": 5,
        "size": 3,
        "frozen": 8
      },
      {
        "id": "l201-r147-190-g5",
        "color": "cyan",
        "side": "top",
        "offset": 0,
        "size": 3,
        "frozen": 11
      }
    ],
    "blocks": [
      {
        "x": 0,
        "y": 0,
        "shape": [
          [
            1,
            0
          ],
          [
            0,
            0
          ]
        ],
        "id": "l201-r147-190-b0",
        "color": "yellow",
        "layers": [
          "yellow",
          "cyan"
        ]
      },
      {
        "x": 0,
        "y": 1,
        "shape": [
          [
            1,
            0
          ],
          [
            0,
            0
          ]
        ],
        "id": "l201-r147-190-b1",
        "color": "cyan",
        "layers": [
          "cyan",
          "green"
        ]
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
        "id": "l201-r147-190-b2",
        "color": "red"
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
        "id": "l201-r147-190-b3",
        "color": "blue"
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
            0,
            1
          ]
        ],
        "id": "l201-r147-190-b4",
        "color": "red"
      },
      {
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
        "id": "l201-r147-190-b5",
        "color": "green"
      },
      {
        "x": 0,
        "y": 2,
        "shape": [
          [
            1,
            0
          ],
          [
            0,
            0
          ],
          [
            1,
            1
          ],
          [
            0,
            1
          ]
        ],
        "id": "l201-r147-190-b6",
        "color": "blue"
      },
      {
        "x": 2,
        "y": 2,
        "shape": [
          [
            2,
            0
          ],
          [
            1,
            0
          ],
          [
            0,
            0
          ]
        ],
        "id": "l201-r147-190-b7",
        "color": "yellow"
      },
      {
        "x": 4,
        "y": 2,
        "shape": [
          [
            1,
            0
          ],
          [
            1,
            1
          ],
          [
            0,
            1
          ]
        ],
        "id": "l201-r147-190-b8",
        "color": "blue"
      },
      {
        "x": 2,
        "y": 3,
        "shape": [
          [
            1,
            0
          ],
          [
            0,
            0
          ]
        ],
        "id": "l201-r147-190-b9",
        "color": "red"
      },
      {
        "x": 0,
        "y": 4,
        "shape": [
          [
            2,
            0
          ],
          [
            1,
            0
          ],
          [
            0,
            0
          ]
        ],
        "id": "l201-r147-190-b10",
        "color": "cyan"
      },
      {
        "x": 0,
        "y": 5,
        "shape": [
          [
            1,
            0
          ],
          [
            0,
            0
          ]
        ],
        "id": "l201-r147-190-b11",
        "color": "purple"
      },
      {
        "x": 2,
        "y": 4,
        "shape": [
          [
            1,
            0
          ],
          [
            1,
            1
          ],
          [
            0,
            1
          ]
        ],
        "id": "l201-r147-190-b12",
        "color": "green"
      },
      {
        "x": 4,
        "y": 4,
        "shape": [
          [
            1,
            0
          ],
          [
            0,
            0
          ],
          [
            1,
            1
          ],
          [
            0,
            1
          ]
        ],
        "id": "l201-r147-190-b13",
        "color": "purple"
      },
      {
        "x": 3,
        "y": 6,
        "shape": [
          [
            2,
            0
          ],
          [
            1,
            0
          ],
          [
            0,
            0
          ]
        ],
        "shutterId": "l201-r147-190-curtain-0",
        "id": "l201-r147-190-b14",
        "color": "red"
      },
      {
        "x": 3,
        "y": 7,
        "shape": [
          [
            2,
            0
          ],
          [
            1,
            0
          ],
          [
            0,
            0
          ]
        ],
        "shutterId": "l201-r147-190-curtain-0",
        "id": "l201-r147-190-b15",
        "color": "green"
      },
      {
        "x": 3,
        "y": 8,
        "shape": [
          [
            2,
            0
          ],
          [
            1,
            0
          ],
          [
            0,
            0
          ]
        ],
        "shutterId": "l201-r147-190-curtain-0",
        "id": "l201-r147-190-b16",
        "color": "blue"
      },
      {
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
        "shutterId": "l201-r147-190-curtain-1",
        "id": "l201-r147-190-b17",
        "color": "purple"
      },
      {
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
        "shutterId": "l201-r147-190-curtain-1",
        "id": "l201-r147-190-b18",
        "color": "cyan"
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
        "shutterId": "l201-r147-190-curtain-1",
        "id": "l201-r147-190-b19",
        "color": "yellow"
      }
    ],
    "shutters": [
      {
        "id": "l201-r147-190-curtain-0",
        "x": 3,
        "y": 6,
        "width": 3,
        "height": 3,
        "count": 7
      },
      {
        "id": "l201-r147-190-curtain-1",
        "x": 0,
        "y": 6,
        "width": 3,
        "height": 3,
        "count": 12
      }
    ],
    "generators": [],
    "id": 201,
    "name": "\u7ADE\u54C1\u7EED\u7AE0\xB7201",
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
      "userAuthorized": "201-210\u7ADE\u54C1\u89C6\u9891\u7EED\u4F5C\xB7\u89C4\u5219\u91CD\u751F\u6210",
      "change": "\u4FDD\u7559201\u89C6\u9891\u89C2\u5BDF\u5230\u7684\u9876\u90E8\u51B0\u95E8\u3001\u4E0B\u65B9\u5377\u5E18\u548C\u5916\u58F3\u5C42\u610F\u56FE\uFF1B\u89C6\u9891\u51E0\u4F55\u4E0E\u5E93\u5B58\u672A\u77E5\uFF0C\u91C7\u7528\u5DF2\u9A8C\u8BC1v1.5\u591A\u533A\u5377\u5E18\u5E95\u56FE\uFF0C\u672A\u5C06\u7EA2\u82723x3\u8F6E\u5ED3\u5192\u79F0\u7CBE\u786E\u590D\u523B\u3002"
    }
  },
  {
    "mechanismRules": "revised-2026-09-27-v1.5",
    "width": 6,
    "height": 9,
    "gates": [
      {
        "id": "l202-r147-190-g0",
        "color": "red",
        "side": "bottom",
        "offset": 0,
        "size": 3
      },
      {
        "id": "l202-r147-190-g1",
        "color": "blue",
        "side": "left",
        "offset": 6,
        "size": 3
      },
      {
        "id": "l202-r147-190-g2",
        "color": "green",
        "side": "right",
        "offset": 4,
        "size": 2,
        "frozen": 3
      },
      {
        "id": "l202-r147-190-g3",
        "color": "yellow",
        "side": "right",
        "offset": 6,
        "size": 3,
        "frozen": 5
      },
      {
        "id": "l202-r147-190-g4",
        "color": "purple",
        "side": "right",
        "offset": 1,
        "size": 3,
        "frozen": 8
      },
      {
        "id": "l202-r147-190-g5",
        "color": "cyan",
        "side": "bottom",
        "offset": 3,
        "size": 3,
        "frozen": 11
      }
    ],
    "blocks": [
      {
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
          ]
        ],
        "id": "l202-r147-190-b0",
        "color": "yellow",
        "layers": [
          "yellow",
          "cyan"
        ]
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
          ]
        ],
        "id": "l202-r147-190-b1",
        "color": "cyan",
        "layers": [
          "cyan",
          "green"
        ]
      },
      {
        "x": 3,
        "y": 7,
        "shape": [
          [
            0,
            1
          ],
          [
            0,
            0
          ]
        ],
        "id": "l202-r147-190-b2",
        "color": "red"
      },
      {
        "x": 2,
        "y": 7,
        "shape": [
          [
            0,
            1
          ],
          [
            0,
            0
          ]
        ],
        "id": "l202-r147-190-b3",
        "color": "blue"
      },
      {
        "x": 1,
        "y": 7,
        "shape": [
          [
            0,
            1
          ],
          [
            0,
            0
          ]
        ],
        "id": "l202-r147-190-b4",
        "color": "red"
      },
      {
        "x": 0,
        "y": 7,
        "shape": [
          [
            0,
            1
          ],
          [
            0,
            0
          ]
        ],
        "id": "l202-r147-190-b5",
        "color": "green"
      },
      {
        "x": 4,
        "y": 5,
        "shape": [
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
            0
          ],
          [
            1,
            0
          ]
        ],
        "id": "l202-r147-190-b6",
        "color": "blue"
      },
      {
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
        "id": "l202-r147-190-b7",
        "color": "yellow"
      },
      {
        "x": 0,
        "y": 5,
        "shape": [
          [
            0,
            1
          ],
          [
            0,
            0
          ],
          [
            1,
            0
          ]
        ],
        "id": "l202-r147-190-b8",
        "color": "blue"
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
            1,
            0
          ]
        ],
        "id": "l202-r147-190-b9",
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
        "id": "l202-r147-190-b10",
        "color": "cyan"
      },
      {
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
        "id": "l202-r147-190-b11",
        "color": "purple"
      },
      {
        "x": 2,
        "y": 3,
        "shape": [
          [
            0,
            1
          ],
          [
            0,
            0
          ],
          [
            1,
            0
          ]
        ],
        "id": "l202-r147-190-b12",
        "color": "green"
      },
      {
        "x": 0,
        "y": 3,
        "shape": [
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
            0
          ],
          [
            1,
            0
          ]
        ],
        "id": "l202-r147-190-b13",
        "color": "purple"
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
            1,
            0
          ],
          [
            2,
            0
          ]
        ],
        "shutterId": "l202-r147-190-curtain-0",
        "id": "l202-r147-190-b14",
        "color": "red"
      },
      {
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
        "shutterId": "l202-r147-190-curtain-0",
        "id": "l202-r147-190-b15",
        "color": "green"
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
            1,
            0
          ],
          [
            2,
            0
          ]
        ],
        "shutterId": "l202-r147-190-curtain-0",
        "id": "l202-r147-190-b16",
        "color": "blue"
      },
      {
        "x": 3,
        "y": 0,
        "shape": [
          [
            0,
            2
          ],
          [
            0,
            1
          ],
          [
            0,
            0
          ]
        ],
        "shutterId": "l202-r147-190-curtain-1",
        "id": "l202-r147-190-b17",
        "color": "purple"
      },
      {
        "x": 4,
        "y": 0,
        "shape": [
          [
            0,
            2
          ],
          [
            0,
            1
          ],
          [
            0,
            0
          ]
        ],
        "shutterId": "l202-r147-190-curtain-1",
        "id": "l202-r147-190-b18",
        "color": "cyan"
      },
      {
        "x": 5,
        "y": 0,
        "shape": [
          [
            0,
            2
          ],
          [
            0,
            1
          ],
          [
            0,
            0
          ]
        ],
        "shutterId": "l202-r147-190-curtain-1",
        "id": "l202-r147-190-b19",
        "color": "yellow"
      }
    ],
    "shutters": [
      {
        "id": "l202-r147-190-curtain-0",
        "x": 0,
        "y": 0,
        "width": 3,
        "height": 3,
        "count": 7
      },
      {
        "id": "l202-r147-190-curtain-1",
        "x": 3,
        "y": 0,
        "width": 3,
        "height": 3,
        "count": 12
      }
    ],
    "generators": [],
    "id": 202,
    "name": "\u7ADE\u54C1\u7EED\u7AE0\xB7202",
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
      "userAuthorized": "201-210\u7ADE\u54C1\u89C6\u9891\u7EED\u4F5C\xB7\u89C4\u5219\u91CD\u751F\u6210",
      "change": "\u6309202\u89C6\u9891\u7684\u591A\u51B0\u95E8/\u4E2D\u592E\u89C4\u5212\u538B\u529B\u9002\u914D\uFF1B\u53CC\u751F\u6210\u5668\u961F\u5217\u53EA\u6709\u9884\u89C8\u8BC1\u636E\uFF0C\u672A\u77E5\u5B57\u6BB5\u4E0D\u5199\u5165\u8FD0\u884C\u673A\u5236\uFF0C\u91C7\u7528\u540C\u7B49\u7A7A\u95F4\u7EA6\u675F\u7684\u53CC\u5377\u5E18\u5E95\u56FE\u3002"
    }
  },
  {
    "mechanismRules": "revised-2026-09-27-v1.5",
    "width": 6,
    "height": 7,
    "gates": [
      {
        "id": "l203-gate-red",
        "color": "red",
        "side": "right",
        "size": 3,
        "offset": 1
      },
      {
        "id": "l203-gate-blue",
        "color": "blue",
        "side": "top",
        "size": 3,
        "offset": 2,
        "frozen": 1
      },
      {
        "id": "l203-gate-green",
        "color": "green",
        "side": "left",
        "size": 1,
        "offset": 2,
        "frozen": 5
      },
      {
        "id": "l203-gate-yellow",
        "color": "yellow",
        "side": "right",
        "size": 1,
        "offset": 6,
        "frozen": 9
      }
    ],
    "blocks": [
      {
        "id": "l203-a191-7",
        "color": "blue",
        "shape": [
          [
            2,
            0
          ],
          [
            1,
            0
          ],
          [
            0,
            0
          ]
        ],
        "layers": [
          "blue",
          "red"
        ],
        "x": 3,
        "y": 0
      },
      {
        "id": "l203-a191-0",
        "color": "green",
        "shape": [
          [
            2,
            0
          ],
          [
            1,
            0
          ],
          [
            0,
            0
          ]
        ],
        "x": 0,
        "y": 0
      },
      {
        "id": "l203-a191-6",
        "color": "red",
        "shape": [
          [
            2,
            0
          ],
          [
            1,
            0
          ],
          [
            0,
            0
          ]
        ],
        "x": 3,
        "y": 1
      },
      {
        "id": "l203-a191-4",
        "color": "yellow",
        "shape": [
          [
            2,
            0
          ],
          [
            1,
            0
          ],
          [
            0,
            0
          ]
        ],
        "layers": [
          "yellow",
          "blue"
        ],
        "x": 0,
        "y": 1
      },
      {
        "id": "l203-a191-1",
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
        "x": 5,
        "y": 2
      },
      {
        "id": "l203-a191-2",
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
        ],
        "x": 0,
        "y": 2
      },
      {
        "id": "l203-a191-5",
        "color": "red",
        "shape": [
          [
            2,
            0
          ],
          [
            1,
            0
          ],
          [
            0,
            0
          ]
        ],
        "x": 2,
        "y": 3
      },
      {
        "id": "l203-a191-3",
        "color": "yellow",
        "shape": [
          [
            2,
            0
          ],
          [
            1,
            0
          ],
          [
            0,
            0
          ]
        ],
        "x": 2,
        "y": 4
      },
      {
        "id": "l203-a191-8",
        "color": "red",
        "shape": [
          [
            2,
            0
          ],
          [
            1,
            0
          ],
          [
            0,
            0
          ]
        ],
        "x": 3,
        "y": 5
      },
      {
        "id": "l203-a191-13",
        "color": "green",
        "shape": [
          [
            2,
            0
          ],
          [
            1,
            0
          ],
          [
            0,
            0
          ]
        ],
        "x": 0,
        "y": 5
      },
      {
        "id": "l203-a191-12",
        "color": "yellow",
        "shape": [
          [
            2,
            0
          ],
          [
            1,
            0
          ],
          [
            0,
            0
          ]
        ],
        "x": 3,
        "y": 6
      },
      {
        "id": "l203-a191-9",
        "color": "green",
        "shape": [
          [
            2,
            0
          ],
          [
            1,
            0
          ],
          [
            0,
            0
          ]
        ],
        "frozen": 2,
        "x": 2,
        "y": 2
      },
      {
        "id": "l203-a191-10",
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
        "frozen": 3,
        "x": 1,
        "y": 2
      },
      {
        "id": "l203-a191-11",
        "color": "blue",
        "shape": [
          [
            2,
            0
          ],
          [
            1,
            0
          ],
          [
            0,
            0
          ]
        ],
        "frozen": 4,
        "x": 0,
        "y": 6
      }
    ],
    "shutters": [],
    "id": 203,
    "name": "\u7ADE\u54C1\u7EED\u7AE0\xB7203",
    "difficulty": "normal",
    "timeSeconds": 120,
    "reward": 200,
    "parMoves": 31,
    "preservedMoveTarget": 31,
    "designTargets": {
      "formulaVersion": "blockout-d1",
      "calibratedDifficulty": 15,
      "minimumRepositionOverhead": 11
    },
    "mechanismAdaptation": {
      "userAuthorized": "201-210\u7ADE\u54C1\u89C6\u9891\u7EED\u4F5C\xB7\u89C4\u5219\u91CD\u751F\u6210",
      "change": "\u4FDD\u7559203\u89C6\u9891\u4E0A\u90E8\u5377\u5E18\u4E0E\u591A\u4FA7\u51B0\u95E8\u7684\u987A\u5E8F\u610F\u56FE\uFF1B\u6E90\u51E0\u4F55/\u95E8\u53E3\u5C3A\u5BF8\u672A\u77E5\uFF0C\u91C7\u7528\u65E0\u5377\u5E18\u53EF\u89E3\u6295\u5F71\u5E76\u5355\u5217\u5DEE\u5F02\u3002"
    }
  },
  {
    "mechanismRules": "revised-2026-09-27-v1.5",
    "width": 7,
    "height": 11,
    "playable": [
      [
        5,
        0
      ],
      [
        4,
        0
      ],
      [
        3,
        0
      ],
      [
        2,
        0
      ],
      [
        1,
        0
      ],
      [
        6,
        1
      ],
      [
        5,
        1
      ],
      [
        4,
        1
      ],
      [
        3,
        1
      ],
      [
        2,
        1
      ],
      [
        1,
        1
      ],
      [
        0,
        1
      ],
      [
        6,
        2
      ],
      [
        5,
        2
      ],
      [
        4,
        2
      ],
      [
        3,
        2
      ],
      [
        2,
        2
      ],
      [
        1,
        2
      ],
      [
        0,
        2
      ],
      [
        6,
        3
      ],
      [
        5,
        3
      ],
      [
        4,
        3
      ],
      [
        3,
        3
      ],
      [
        2,
        3
      ],
      [
        1,
        3
      ],
      [
        0,
        3
      ],
      [
        6,
        4
      ],
      [
        5,
        4
      ],
      [
        4,
        4
      ],
      [
        3,
        4
      ],
      [
        2,
        4
      ],
      [
        1,
        4
      ],
      [
        0,
        4
      ],
      [
        6,
        5
      ],
      [
        5,
        5
      ],
      [
        4,
        5
      ],
      [
        3,
        5
      ],
      [
        2,
        5
      ],
      [
        1,
        5
      ],
      [
        0,
        5
      ],
      [
        6,
        6
      ],
      [
        5,
        6
      ],
      [
        4,
        6
      ],
      [
        3,
        6
      ],
      [
        2,
        6
      ],
      [
        1,
        6
      ],
      [
        0,
        6
      ],
      [
        6,
        7
      ],
      [
        5,
        7
      ],
      [
        4,
        7
      ],
      [
        3,
        7
      ],
      [
        2,
        7
      ],
      [
        1,
        7
      ],
      [
        0,
        7
      ],
      [
        6,
        8
      ],
      [
        5,
        8
      ],
      [
        4,
        8
      ],
      [
        3,
        8
      ],
      [
        2,
        8
      ],
      [
        1,
        8
      ],
      [
        0,
        8
      ],
      [
        6,
        9
      ],
      [
        5,
        9
      ],
      [
        4,
        9
      ],
      [
        3,
        9
      ],
      [
        2,
        9
      ],
      [
        1,
        9
      ],
      [
        0,
        9
      ],
      [
        6,
        10
      ],
      [
        5,
        10
      ],
      [
        4,
        10
      ],
      [
        3,
        10
      ],
      [
        2,
        10
      ],
      [
        1,
        10
      ],
      [
        0,
        10
      ]
    ],
    "gates": [
      {
        "id": "l204-r107-182-gblue",
        "color": "blue",
        "side": "bottom",
        "offset": 4,
        "size": 3
      },
      {
        "id": "l204-r107-182-gcyan",
        "color": "cyan",
        "side": "right",
        "offset": 8,
        "size": 3,
        "frozen": 1
      },
      {
        "id": "l204-r107-182-gpink",
        "color": "pink",
        "side": "left",
        "offset": 4,
        "size": 3,
        "frozen": 3
      },
      {
        "id": "l204-r107-182-ggreen",
        "color": "green",
        "side": "left",
        "offset": 7,
        "size": 3,
        "frozen": 8
      },
      {
        "id": "l204-r107-182-gpurple",
        "color": "purple",
        "side": "top",
        "offset": 3,
        "size": 3,
        "frozen": 9
      },
      {
        "id": "l204-r107-182-gyellow",
        "color": "yellow",
        "side": "top",
        "offset": 1,
        "size": 2,
        "frozen": 10
      },
      {
        "id": "l204-r107-182-gred",
        "color": "red",
        "side": "left",
        "offset": 1,
        "size": 3,
        "frozen": 19
      },
      {
        "id": "l204-r107-182-gorange",
        "color": "orange",
        "side": "bottom",
        "offset": 1,
        "size": 3,
        "frozen": 24
      }
    ],
    "blocks": [
      {
        "id": "l204-o0",
        "shape": [
          [
            1,
            0
          ],
          [
            0,
            0
          ]
        ],
        "color": "blue",
        "x": 5,
        "y": 10
      },
      {
        "color": "yellow",
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
          ]
        ],
        "id": "l204-o1"
      },
      {
        "color": "blue",
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
        ],
        "id": "l204-o2"
      },
      {
        "color": "purple",
        "x": 6,
        "y": 3,
        "shape": [
          [
            0,
            0
          ]
        ],
        "id": "l204-o3"
      },
      {
        "color": "pink",
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
        "id": "l204-o4"
      },
      {
        "color": "cyan",
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
        "id": "l204-o5"
      },
      {
        "color": "green",
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
          ]
        ],
        "id": "l204-o6"
      },
      {
        "color": "red",
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
        "id": "l204-o7"
      },
      {
        "color": "cyan",
        "x": 5,
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
        "id": "l204-o8"
      },
      {
        "color": "pink",
        "layers": [
          "pink",
          "yellow"
        ],
        "frozen": 22,
        "x": 3,
        "y": 1,
        "shape": [
          [
            1,
            0
          ],
          [
            0,
            0
          ],
          [
            1,
            1
          ],
          [
            0,
            1
          ]
        ],
        "id": "l204-h0",
        "shutterId": "l204-r107-182-c4"
      },
      {
        "color": "blue",
        "x": 0,
        "y": 1,
        "shape": [
          [
            2,
            0
          ],
          [
            1,
            0
          ],
          [
            0,
            0
          ],
          [
            2,
            1
          ],
          [
            1,
            1
          ],
          [
            0,
            1
          ]
        ],
        "id": "l204-h1",
        "shutterId": "l204-r107-182-c4"
      },
      {
        "color": "orange",
        "x": 3,
        "y": 3,
        "shape": [
          [
            1,
            0
          ],
          [
            0,
            0
          ],
          [
            1,
            1
          ],
          [
            0,
            1
          ]
        ],
        "id": "l204-h2",
        "shutterId": "l204-r107-182-c4"
      },
      {
        "color": "cyan",
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
        "id": "l204-h3",
        "shutterId": "l204-r107-182-c4"
      },
      {
        "color": "pink",
        "x": 0,
        "y": 3,
        "shape": [
          [
            1,
            0
          ],
          [
            0,
            0
          ],
          [
            1,
            1
          ],
          [
            0,
            1
          ]
        ],
        "id": "l204-h4",
        "shutterId": "l204-r107-182-c4"
      },
      {
        "color": "blue",
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
        "id": "l204-h5",
        "shutterId": "l204-r107-182-c4"
      },
      {
        "color": "pink",
        "x": 2,
        "y": 5,
        "shape": [
          [
            1,
            0
          ],
          [
            1,
            1
          ],
          [
            0,
            1
          ]
        ],
        "id": "l204-h6",
        "shutterId": "l204-r107-182-c4"
      },
      {
        "color": "blue",
        "x": 0,
        "y": 5,
        "shape": [
          [
            1,
            0
          ],
          [
            0,
            0
          ],
          [
            1,
            1
          ],
          [
            0,
            1
          ]
        ],
        "id": "l204-h7",
        "shutterId": "l204-r107-182-c4"
      },
      {
        "color": "cyan",
        "x": 2,
        "y": 7,
        "shape": [
          [
            1,
            0
          ],
          [
            0,
            0
          ],
          [
            1,
            1
          ],
          [
            0,
            1
          ]
        ],
        "id": "l204-h8",
        "shutterId": "l204-r107-182-c4"
      },
      {
        "color": "pink",
        "x": 0,
        "y": 7,
        "shape": [
          [
            1,
            0
          ],
          [
            0,
            0
          ],
          [
            1,
            1
          ],
          [
            0,
            1
          ]
        ],
        "id": "l204-h9",
        "shutterId": "l204-r107-182-c4"
      },
      {
        "color": "red",
        "x": 4,
        "y": 8,
        "shape": [
          [
            0,
            0
          ],
          [
            0,
            1
          ],
          [
            0,
            2
          ]
        ],
        "id": "l204-h10",
        "shutterId": "l204-r107-182-c4"
      },
      {
        "color": "blue",
        "x": 2,
        "y": 9,
        "shape": [
          [
            1,
            0
          ],
          [
            0,
            0
          ],
          [
            1,
            1
          ],
          [
            0,
            1
          ]
        ],
        "id": "l204-h11",
        "shutterId": "l204-r107-182-c4"
      },
      {
        "color": "cyan",
        "x": 0,
        "y": 9,
        "shape": [
          [
            1,
            0
          ],
          [
            0,
            0
          ],
          [
            1,
            1
          ],
          [
            0,
            1
          ]
        ],
        "id": "l204-h12",
        "shutterId": "l204-r107-182-c4"
      },
      {
        "id": "l204-m0",
        "x": 5,
        "y": 0,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "green",
        "shutterId": "l204-r107-182-m0"
      },
      {
        "id": "l204-m1",
        "x": 4,
        "y": 0,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "purple",
        "shutterId": "l204-r107-182-m1"
      },
      {
        "id": "l204-m2",
        "x": 3,
        "y": 0,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "yellow",
        "shutterId": "l204-r107-182-m2"
      },
      {
        "id": "l204-m3",
        "x": 2,
        "y": 0,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "cyan",
        "shutterId": "l204-r107-182-m3"
      },
      {
        "id": "l204-m4",
        "x": 1,
        "y": 0,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "pink",
        "shutterId": "l204-r107-182-m4"
      }
    ],
    "shutters": [
      {
        "id": "l204-r107-182-c4",
        "x": 0,
        "y": 1,
        "width": 5,
        "height": 10,
        "count": 4
      },
      {
        "id": "l204-r107-182-m0",
        "x": 5,
        "y": 0,
        "width": 1,
        "height": 1,
        "count": 10
      },
      {
        "id": "l204-r107-182-m1",
        "x": 4,
        "y": 0,
        "width": 1,
        "height": 1,
        "count": 10
      },
      {
        "id": "l204-r107-182-m2",
        "x": 3,
        "y": 0,
        "width": 1,
        "height": 1,
        "count": 10
      },
      {
        "id": "l204-r107-182-m3",
        "x": 2,
        "y": 0,
        "width": 1,
        "height": 1,
        "count": 10
      },
      {
        "id": "l204-r107-182-m4",
        "x": 1,
        "y": 0,
        "width": 1,
        "height": 1,
        "count": 10
      }
    ],
    "id": 204,
    "name": "\u7ADE\u54C1\u7EED\u7AE0\xB7204",
    "difficulty": "hard",
    "timeSeconds": 180,
    "reward": 200,
    "parMoves": 48,
    "preservedMoveTarget": 48,
    "designTargets": {
      "formulaVersion": "blockout-d1",
      "calibratedDifficulty": 20,
      "minimumRepositionOverhead": 16
    },
    "mechanismAdaptation": {
      "userAuthorized": "201-210\u7ADE\u54C1\u89C6\u9891\u7EED\u4F5C\xB7\u89C4\u5219\u91CD\u751F\u6210",
      "change": "\u5BF9\u5E94204\u89C6\u9891Hard\u4E09\u5757\u5927\u5377\u5E18\u4E0E\u957F\u51B0\u95E8\u94FE\uFF1B\u89C6\u9891\u4EC5\u8BC1\u5B9E\u4E09\u5757\u533A\u57DF\uFF0C\u5E95\u56FE\u4FDD\u7559\u5DF2\u9A8C\u8BC1\u591A\u6279\u5377\u5E18\u5E76\u4EE5v1.5\u786C\u6863\u7A7A\u95F4\u987A\u5E8F\u9002\u914D\uFF0C\u672A\u58F0\u79F0\u4E09\u5757\u9010\u683C\u4E00\u81F4\u3002"
    }
  },
  {
    "mechanismRules": "revised-2026-09-27-v1.5",
    "width": 6,
    "height": 8,
    "playable": [
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
        2
      ],
      [
        0,
        1
      ],
      [
        0,
        0
      ],
      [
        1,
        2
      ],
      [
        1,
        1
      ],
      [
        1,
        0
      ],
      [
        2,
        2
      ],
      [
        2,
        1
      ],
      [
        2,
        0
      ],
      [
        3,
        2
      ],
      [
        3,
        1
      ],
      [
        3,
        0
      ],
      [
        4,
        2
      ],
      [
        4,
        1
      ],
      [
        4,
        0
      ],
      [
        5,
        2
      ],
      [
        5,
        1
      ],
      [
        5,
        0
      ]
    ],
    "gates": [
      {
        "id": "l205-g-green",
        "color": "green",
        "side": "left",
        "offset": 4,
        "size": 3
      },
      {
        "id": "l205-g-yellow",
        "color": "yellow",
        "side": "right",
        "offset": 4,
        "size": 3,
        "frozen": 12
      },
      {
        "id": "l205-g-purple",
        "color": "purple",
        "side": "right",
        "offset": 0,
        "size": 3,
        "frozen": 8
      },
      {
        "id": "l205-g-orange",
        "color": "orange",
        "side": "bottom",
        "offset": 1,
        "size": 2,
        "frozen": 10
      },
      {
        "id": "l205-g-pink",
        "color": "pink",
        "side": "left",
        "offset": 0,
        "size": 3,
        "frozen": 1
      },
      {
        "id": "l205-g-red",
        "color": "red",
        "side": "top",
        "offset": 0,
        "size": 3,
        "frozen": 5
      },
      {
        "id": "l205-g-cyan",
        "color": "cyan",
        "side": "bottom",
        "offset": 3,
        "size": 2,
        "frozen": 6
      },
      {
        "id": "l205-g-blue",
        "color": "blue",
        "side": "top",
        "offset": 3,
        "size": 3,
        "frozen": 2
      }
    ],
    "blocks": [
      {
        "id": "l205-r108-195-s8",
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
        "keyId": "pink",
        "x": 1,
        "y": 7
      },
      {
        "id": "l205-r108-195-s2",
        "shape": [
          [
            0,
            2
          ],
          [
            0,
            1
          ],
          [
            0,
            0
          ]
        ],
        "color": "yellow",
        "lockedBy": "blue",
        "lockCount": 3,
        "x": 3,
        "y": 5
      },
      {
        "id": "l205-r108-195-s15",
        "shape": [
          [
            0,
            1
          ],
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
        "x": 4,
        "y": 6
      },
      {
        "id": "l205-r108-195-s3",
        "shape": [
          [
            0,
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
        "x": 0,
        "y": 6
      },
      {
        "id": "l205-r108-195-s12",
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
        "x": 0,
        "y": 5
      },
      {
        "id": "l205-r108-195-s1",
        "shape": [
          [
            0,
            2
          ],
          [
            0,
            1
          ],
          [
            0,
            0
          ]
        ],
        "color": "orange",
        "lockedBy": "pink",
        "lockCount": 3,
        "x": 2,
        "y": 3
      },
      {
        "id": "l205-r108-195-s10",
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
        "x": 4,
        "y": 5
      },
      {
        "id": "l205-r108-195-s9",
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
        "keyId": "blue",
        "x": 0,
        "y": 4
      },
      {
        "id": "l205-r108-195-s17",
        "shape": [
          [
            0,
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
        "x": 3,
        "y": 4
      },
      {
        "id": "l205-r108-195-s4",
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
        "keyId": "blue",
        "x": 0,
        "y": 3
      },
      {
        "id": "l205-r108-195-s0",
        "shape": [
          [
            0,
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
        "x": 3,
        "y": 3
      },
      {
        "id": "l205-r108-195-s14",
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
        "x": 0,
        "y": 2
      },
      {
        "id": "l205-r108-195-s13",
        "shape": [
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
            0
          ],
          [
            1,
            0
          ]
        ],
        "color": "red",
        "keyId": "blue",
        "x": 0,
        "y": 0
      },
      {
        "id": "l205-r108-195-s5",
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
        "keyId": "pink",
        "x": 2,
        "y": 2
      },
      {
        "id": "l205-r108-195-s7",
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
        "keyId": "pink",
        "x": 2,
        "y": 1
      },
      {
        "id": "l205-r108-195-s6",
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
        "x": 2,
        "y": 0
      },
      {
        "id": "l205-r108-195-s11",
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
        "x": 4,
        "y": 2
      },
      {
        "id": "l205-r108-195-s16",
        "shape": [
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
            0
          ],
          [
            1,
            0
          ]
        ],
        "color": "red",
        "x": 4,
        "y": 0
      }
    ],
    "id": 205,
    "name": "\u7ADE\u54C1\u7EED\u7AE0\xB7205",
    "difficulty": "hard",
    "timeSeconds": 180,
    "reward": 200,
    "parMoves": 38,
    "preservedMoveTarget": 38,
    "designTargets": {
      "formulaVersion": "blockout-d1",
      "calibratedDifficulty": 20,
      "minimumRepositionOverhead": 16
    },
    "mechanismAdaptation": {
      "userAuthorized": "201-210\u7ADE\u54C1\u89C6\u9891\u7EED\u4F5C\xB7\u89C4\u5219\u91CD\u751F\u6210",
      "change": "\u4FDD\u7559205\u89C6\u9891\u65E0\u5377\u5E18\u3001\u5916\u56F4\u9EC4\u8272\u683C\u548C\u591A\u5C42\u5916\u58F3\u7684\u89E3\u6CD5\u610F\u56FE\uFF1B\u9EC4\u8272\u683C\u7CBE\u786E\u5750\u6807\u65E0\u6CD5\u4ECE\u5355\u5E27\u6838\u5B9E\uFF0C\u8FD0\u884C\u6570\u636E\u4E0D\u5192\u79F0\u5F69\u683C\u9010\u683C\u590D\u523B\u3002"
    }
  }
];

// src/core/generatorMouthSpawnGeometry.ts
var vectorsFor = (quarterTurns) => {
  if (quarterTurns === 0) {
    return { tangent: [1, 0], inward: [0, 1], outward: [0, -1] };
  }
  if (quarterTurns === 1) {
    return { tangent: [0, 1], inward: [-1, 0], outward: [1, 0] };
  }
  if (quarterTurns === 2) {
    return { tangent: [-1, 0], inward: [0, -1], outward: [0, 1] };
  }
  return { tangent: [0, -1], inward: [1, 0], outward: [-1, 0] };
};
var pointKey = ([x, y]) => `${x},${y}`;
var isIntegerPoint = (point) => point.length === 2 && point.every((coordinate) => Number.isInteger(coordinate));
var effectiveRimAnchor = (generator, board) => {
  if (generator.rimAnchor) return { ...generator.rimAnchor };
  if (!Number.isInteger(generator.offset)) return void 0;
  if (generator.side === "top") {
    return { x: generator.offset + 0.5, y: 0, quarterTurns: 0 };
  }
  if (generator.side === "right") {
    return { x: board.width, y: generator.offset + 0.5, quarterTurns: 1 };
  }
  if (generator.side === "bottom") {
    return { x: generator.offset + 0.5, y: board.height, quarterTurns: 2 };
  }
  if (generator.side === "left") {
    return { x: 0, y: generator.offset + 0.5, quarterTurns: 3 };
  }
  return void 0;
};
var generatorMouthTemplateFromRimAnchor = (rimAnchor) => {
  if (!Number.isFinite(rimAnchor.x) || !Number.isFinite(rimAnchor.y) || ![0, 1, 2, 3].includes(rimAnchor.quarterTurns)) {
    return { status: "invalid", reason: "Generator rim geometry is invalid." };
  }
  const vectors = vectorsFor(rimAnchor.quarterTurns);
  const centerX = rimAnchor.x - vectors.outward[0] * 0.5 - 0.5;
  const centerY = rimAnchor.y - vectors.outward[1] * 0.5 - 0.5;
  if (!Number.isInteger(centerX) || !Number.isInteger(centerY)) {
    return { status: "invalid", reason: "Generator center rail is not aligned to the cell grid." };
  }
  const mouthCells = [-1, 0, 1].map((offset) => [
    centerX + vectors.tangent[0] * offset,
    centerY + vectors.tangent[1] * offset
  ]);
  const templateCells = mouthCells.flatMap(([x, y]) => [0, 1, 2].map((depth) => [
    x + vectors.inward[0] * depth,
    y + vectors.inward[1] * depth
  ]));
  const templateOrigin = [
    Math.min(...templateCells.map(([x]) => x)),
    Math.min(...templateCells.map(([, y]) => y))
  ];
  return {
    status: "ok",
    rimAnchor: { ...rimAnchor },
    mouthCells,
    templateOrigin,
    templateBounds: {
      x: templateOrigin[0],
      y: templateOrigin[1],
      width: 3,
      height: 3
    }
  };
};
var resolveGeneratorMouthTemplate = (generator, board) => {
  if (!Number.isInteger(board.width) || board.width <= 0 || !Number.isInteger(board.height) || board.height <= 0) {
    return { status: "invalid", reason: "Board dimensions must be positive integers." };
  }
  const rimAnchor = effectiveRimAnchor(generator, board);
  if (!rimAnchor) return { status: "invalid", reason: "Generator rim geometry is invalid." };
  return generatorMouthTemplateFromRimAnchor(rimAnchor);
};
var validateGeneratorMouthSpawn = (generator, spawn, shape, board) => {
  if (!isIntegerPoint(spawn)) {
    return { status: "invalid", reason: "Spawn must be an integer board anchor." };
  }
  if (!shape.length || shape.some((cell) => !isIntegerPoint(cell))) {
    return { status: "invalid", reason: "Shape must contain integer cell offsets." };
  }
  if (new Set(shape.map(pointKey)).size !== shape.length) {
    return { status: "invalid", reason: "Shape cell offsets must be unique." };
  }
  const template = resolveGeneratorMouthTemplate(generator, board);
  if (template.status === "invalid") return template;
  const { status: _templateStatus, ...geometry } = template;
  const footprint = shape.map(([dx, dy]) => [spawn[0] + dx, spawn[1] + dy]);
  const centerMouthKey = pointKey(geometry.mouthCells[1]);
  const touchesCenterMouth = footprint.some((cell) => pointKey(cell) === centerMouthKey);
  const checked = {
    ...geometry,
    spawn: [...spawn],
    footprint,
    touchesCenterMouth
  };
  if (!touchesCenterMouth) {
    return {
      status: "invalid",
      ...checked,
      reason: "Spawn footprint does not contain the center mouth cell."
    };
  }
  const playable = board.playable ? new Set(board.playable.map(pointKey)) : void 0;
  const blocked = new Set((board.blocked ?? []).map(pointKey));
  const rejectedCells = footprint.filter(([x, y]) => x < 0 || x >= board.width || y < 0 || y >= board.height || playable !== void 0 && !playable.has(pointKey([x, y])) || blocked.has(pointKey([x, y])));
  if (rejectedCells.length) {
    return {
      status: "blocked",
      ...checked,
      rejectedCells,
      reason: "Spawn footprint is not fully playable."
    };
  }
  return { status: "ok", ...checked };
};

// src/core/gatePortals.ts
var outwardVector = (side) => side === "top" ? [0, -1] : side === "right" ? [1, 0] : side === "bottom" ? [0, 1] : [-1, 0];
var legacyOuterPortal = (board, gate) => ({
  side: gate.side,
  origin: gate.side === "top" ? [gate.offset, 0] : gate.side === "right" ? [board.width - 1, gate.offset] : gate.side === "bottom" ? [gate.offset, board.height - 1] : [0, gate.offset],
  size: gate.size
});
var gatePortals = (board, gate) => gate.portals?.length ? gate.portals : [legacyOuterPortal(board, gate)];
var portalMouthCells = (portal) => {
  const [originX, originY] = portal.origin;
  return Array.from({ length: portal.size }, (_, index) => portal.side === "top" || portal.side === "bottom" ? [originX + index, originY] : [originX, originY + index]);
};
var directedRailKey = ([x, y], side) => `${x},${y}:${side}`;

// src/core/generatorMountContract.ts
var SIDES = ["top", "right", "bottom", "left"];
var keyOf = ([x, y]) => `${x},${y}`;
var generatorMountBounds = (anchor) => {
  if (anchor.quarterTurns === 0) return { x: anchor.x - 1.5, y: anchor.y - 1, width: 3, height: 1.35 };
  if (anchor.quarterTurns === 1) return { x: anchor.x - 0.35, y: anchor.y - 1.5, width: 1.35, height: 3 };
  if (anchor.quarterTurns === 2) return { x: anchor.x - 1.5, y: anchor.y - 0.35, width: 3, height: 1.35 };
  return { x: anchor.x - 1, y: anchor.y - 1.5, width: 1.35, height: 3 };
};
var intersects = (left, right) => Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x) > 1e-9 && Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y) > 1e-9;
var auditGeneratorMounts = (level) => {
  if (!level.generators?.length) return [];
  const issues = [];
  const explicitPlayable = level.playable ? new Set(level.playable.map(keyOf)) : void 0;
  const blocked = new Set((level.blocked ?? []).map(keyOf));
  const playable = ([x, y]) => Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < level.width && y < level.height && (!explicitPlayable || explicitPlayable.has(keyOf([x, y]))) && !blocked.has(keyOf([x, y]));
  const exterior = /* @__PURE__ */ new Set();
  if (Number.isInteger(level.width) && level.width > 0 && Number.isInteger(level.height) && level.height > 0) {
    const pending = [[-1, -1]];
    exterior.add("-1,-1");
    for (let index = 0; index < pending.length; index += 1) {
      const [x, y] = pending[index];
      for (const cell of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        if (cell[0] < -1 || cell[1] < -1 || cell[0] > level.width || cell[1] > level.height) continue;
        const key = keyOf(cell);
        if (exterior.has(key) || playable(cell)) continue;
        exterior.add(key);
        pending.push(cell);
      }
    }
  }
  const exitRails = /* @__PURE__ */ new Map();
  for (const gate of [...level.gates, ...level.flipDoors ?? []]) {
    for (const portal of gatePortals(level, gate)) {
      if (!Number.isInteger(portal.size) || portal.size <= 0) continue;
      for (const cell of portalMouthCells(portal)) exitRails.set(directedRailKey(cell, portal.side), gate.id);
    }
  }
  const occupiedRails = /* @__PURE__ */ new Map();
  const occupiedBounds = [];
  for (const generator of level.generators) {
    const add = (code, message, details = {}) => {
      issues.push({ code, message, generatorId: generator.id, ...details });
    };
    if (generator.rimSpan !== void 0 && generator.rimSpan !== 3) {
      add("generator-rim-span", "A generator requires exactly three mounting rails.");
    }
    if (generator.rimMount !== void 0 && generator.rimMount !== "rim") {
      add("generator-rim-mount", "Revised generators must replace exposed rim rails, not float outboard.");
    }
    if (!SIDES.includes(generator.side) || !Number.isInteger(generator.offset)) {
      add("generator-rim-geometry", "Generator side and offset must identify a grid-aligned mounting edge.");
      continue;
    }
    const template = resolveGeneratorMouthTemplate(generator, level);
    if (template.status !== "ok") {
      add("generator-rim-geometry", template.reason);
      continue;
    }
    const { rimAnchor, mouthCells } = template;
    const side = SIDES[rimAnchor.quarterTurns];
    const expectedOffset = side === "top" || side === "bottom" ? rimAnchor.x - 0.5 : rimAnchor.y - 0.5;
    if (generator.side !== side || generator.offset !== expectedOffset) {
      add("generator-rim-direction", "Generator side/offset must agree with the actual rim anchor and inward mouth direction.");
    }
    const [dx, dy] = outwardVector(side);
    for (const cell of mouthCells) {
      const outward = [cell[0] + dx, cell[1] + dy];
      if (!playable(cell) || !exterior.has(keyOf(outward))) {
        add("generator-rim-not-exposed", "Every machine rail must border playable floor and exterior-connected void.", { cell });
      }
      const rail = directedRailKey(cell, side);
      const gateId = exitRails.get(rail);
      if (gateId !== void 0) add("generator-exit-overlap", "A generator rail overlaps an exit, including closed, frozen or star exits.", { gateId, cell });
      const otherGeneratorId = occupiedRails.get(rail);
      if (otherGeneratorId !== void 0) add("generator-rail-overlap", "Two machines cannot share a mounting rail.", { otherGeneratorId, cell });
      else occupiedRails.set(rail, generator.id);
    }
    const bounds = generatorMountBounds(rimAnchor);
    for (const occupied of occupiedBounds) {
      if (intersects(bounds, occupied.bounds)) {
        add("generator-body-overlap", "Machine body envelopes overlap even if their directed rails differ.", { otherGeneratorId: occupied.generatorId });
      }
    }
    occupiedBounds.push({ generatorId: generator.id, bounds });
  }
  return issues;
};

// src/core/mechanismRules.ts
var ACTIVE_MECHANISM_PROFILE = "revised-2026-09-27-v1.5";
var usesRevisedMechanisms = (value) => value.mechanismRules === "revised-2026-09-21" || value.mechanismRules === "revised-2026-09-21-v1.1" || value.mechanismRules === "revised-2026-09-21-v1.2" || value.mechanismRules === "revised-2026-09-23-v1.3" || value.mechanismRules === "revised-2026-09-23-v1.4" || value.mechanismRules === ACTIVE_MECHANISM_PROFILE;

// src/core/shutterCoverage.ts
var isOrdinaryShutter = (shutter) => shutter.count > 0 && (shutter.skin === void 0 || shutter.skin === "shutter");
var cellKey = (x, y) => `${x},${y}`;
var blockCells = (block) => block.shape.map(([dx, dy]) => [block.x + dx, block.y + dy]);
var playableKeys = (level) => {
  if (level.playable?.length) return new Set(level.playable.map(([x, y]) => cellKey(x, y)));
  const blocked = new Set((level.blocked ?? []).map(([x, y]) => cellKey(x, y)));
  const result = /* @__PURE__ */ new Set();
  for (let y = 0; y < level.height; y += 1) {
    for (let x = 0; x < level.width; x += 1) {
      if (!blocked.has(cellKey(x, y))) result.add(cellKey(x, y));
    }
  }
  return result;
};
var auditOrdinaryShutterCoverage = (level) => {
  const issues = [];
  const playable = playableKeys(level);
  const queued = new Set((level.generators ?? []).flatMap((generator) => generator.queueBlockIds));
  const ordinary = (level.shutters ?? []).filter(isOrdinaryShutter);
  const closedIds = new Set((level.shutters ?? []).filter(({ count }) => count > 0).map(({ id }) => id));
  const openingBlocks = level.blocks.filter((block) => !queued.has(block.id) && !(block.shutterId && closedIds.has(block.shutterId)));
  for (const shutter of ordinary) {
    const cover = /* @__PURE__ */ new Set();
    for (let y = shutter.y; y < shutter.y + shutter.height; y += 1) {
      for (let x = shutter.x; x < shutter.x + shutter.width; x += 1) {
        const key = cellKey(x, y);
        cover.add(key);
        if (!playable.has(key)) {
          issues.push({
            levelId: level.id,
            shutterId: shutter.id,
            kind: "cover-cell-outside-board",
            cell: [x, y]
          });
        }
      }
    }
    const hidden = level.blocks.filter((block) => block.shutterId === shutter.id);
    if (!hidden.length) {
      issues.push({ levelId: level.id, shutterId: shutter.id, kind: "missing-hidden-cohort" });
    }
    const hiddenOccupants = /* @__PURE__ */ new Map();
    for (const block of hidden) {
      for (const [x, y] of blockCells(block)) {
        const key = cellKey(x, y);
        if (!cover.has(key)) {
          issues.push({
            levelId: level.id,
            shutterId: shutter.id,
            kind: "hidden-cell-outside-cover",
            cell: [x, y],
            blockId: block.id
          });
        }
        const otherBlockId = hiddenOccupants.get(key);
        if (otherBlockId && otherBlockId !== block.id) {
          issues.push({
            levelId: level.id,
            shutterId: shutter.id,
            kind: "hidden-cell-overlap",
            cell: [x, y],
            blockId: block.id,
            otherBlockId
          });
        } else hiddenOccupants.set(key, block.id);
      }
    }
    for (const block of openingBlocks) {
      for (const [x, y] of blockCells(block)) {
        if (!cover.has(cellKey(x, y))) continue;
        issues.push({
          levelId: level.id,
          shutterId: shutter.id,
          kind: "opening-cell-covered",
          cell: [x, y],
          blockId: block.id
        });
      }
    }
  }
  return issues;
};

// src/core/types.ts
var shutterHasPhysicalFootprint = (shutter) => shutter.count > 0 && shutter.skin !== "staging" && shutter.skin !== "lift" && shutter.skin !== "staged-frame";

// src/core/revisedMechanismContract.ts
var keyOf2 = ([x, y]) => `${x},${y}`;
var validRectangle = (region) => [region.x, region.y, region.width, region.height].every(Number.isInteger) && region.width > 0 && region.height > 0;
var regionContains = (region, [x, y]) => x >= region.x && x < region.x + region.width && y >= region.y && y < region.y + region.height;
var auditRevisedMechanismContract = (level) => {
  if (!usesRevisedMechanisms(level)) return [];
  const issues = [];
  const add = (code, message, details = {}) => {
    issues.push({ levelId: level.id, code, message, ...details });
  };
  const blocks = new Map(level.blocks.map((block) => [block.id, block]));
  const playable = level.playable ? new Set(level.playable.map(keyOf2)) : void 0;
  const blocked = new Set((level.blocked ?? []).map(keyOf2));
  const isPlayable = ([x, y]) => Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x < level.width && y >= 0 && y < level.height && (!playable || playable.has(keyOf2([x, y]))) && !blocked.has(keyOf2([x, y]));
  for (const elevator of level.elevators ?? []) {
    add("legacy-moving-elevator", "Revised lifts reveal a fixed region; moving platform elevators are not approved.", { elevatorId: elevator.id });
  }
  for (const conveyor of level.conveyors ?? []) {
    add("legacy-conveyor", "Legacy conveyors have no approved revised-mechanism mapping.", { conveyorId: conveyor.id });
  }
  for (const block of level.blocks) if (block.rotationBadge) {
    add("legacy-rotation-badge", "Rotation metadata is not a revised axis-movement mechanism.", { blockId: block.id });
  }
  if (level.coloredGrids?.length) {
    for (const block of level.blocks) if ((block.layers?.length ?? 1) > 1) {
      add("colored-grid-shell", "A colored-grid level cannot contain a shell, including hidden or queued blocks.", { blockId: block.id });
    }
  }
  for (const generator of level.generators ?? []) {
    if (generator.trigger === "time") {
      add("timed-generator", "Revised generators release from vacant footprints, not wall-clock time.", { generatorId: generator.id });
    }
    if (generator.intervalSeconds !== void 0 || generator.initialDelaySeconds !== void 0) {
      add("generator-clock-metadata", "Revised generators have no timed interval or initial delay.", { generatorId: generator.id });
    }
    for (const blockId of generator.queueBlockIds) {
      const block = blocks.get(blockId);
      if (!block) {
        add("missing-queued-block", "Generator queue references a missing block.", { generatorId: generator.id, blockId });
        continue;
      }
      if ((block.frozen ?? 0) > 0) add("queued-ice", "Generator cargo cannot carry numeric ice.", { generatorId: generator.id, blockId });
      const placement = validateGeneratorMouthSpawn(generator, generator.spawn, block.shape, level);
      if (placement.status !== "ok") {
        add("generator-mouth-footprint", placement.reason, { generatorId: generator.id, blockId });
      }
    }
  }
  for (const mountIssue of auditGeneratorMounts(level)) issues.push({ levelId: level.id, ...mountIssue });
  const validRegions = [];
  for (const shutter of level.shutters ?? []) {
    if (shutter.skin === "staging" || shutter.skin === "staged-frame") {
      add("legacy-nonspatial-staging", "Non-spatial staging and staged-frame releases are not revised mechanisms.", { shutterId: shutter.id });
    }
    if (shutter.skin === "generator") {
      add("legacy-generator-shutter", "A countdown-covered generator skin is not a fixed-mouth queue generator.", { shutterId: shutter.id });
    }
    if ((shutter.skin === void 0 || shutter.skin === "shutter") && shutter.triggerBlockIds !== void 0) {
      add("shutter-trigger-cohort", "Revised ordinary shutters count all clears and peels, not a named removal cohort.", { shutterId: shutter.id });
    }
    if (!validRectangle(shutter)) {
      add("region-geometry", "Mechanism regions require integer coordinates and positive integer dimensions.", { shutterId: shutter.id });
      continue;
    }
    validRegions.push(shutter);
    for (let y = shutter.y; y < shutter.y + shutter.height; y += 1) {
      for (let x = shutter.x; x < shutter.x + shutter.width; x += 1) {
        if (!isPlayable([x, y])) add("region-outside-playable", "Mechanism region includes a wall or non-playable cell.", { shutterId: shutter.id, cell: [x, y] });
      }
    }
    if (shutter.skin !== "lift") continue;
    if (shutter.triggerBlockIds !== void 0) {
      add("lift-trigger-cohort", "A revised lift waits for its occupied region to clear, not a named removal cohort.", { shutterId: shutter.id });
    }
    const occupied = /* @__PURE__ */ new Map();
    for (const block of level.blocks.filter((piece) => piece.shutterId === shutter.id)) {
      for (const [dx, dy] of block.shape) {
        const cell = [block.x + dx, block.y + dy];
        if (!regionContains(shutter, cell)) {
          add("lift-hidden-outside-region", "Every hidden lift cell must lie inside its fixed region.", { shutterId: shutter.id, blockId: block.id, cell });
        }
        if (!isPlayable(cell)) {
          add("lift-hidden-outside-playable", "Hidden lift cargo must have a fully playable footprint.", { shutterId: shutter.id, blockId: block.id, cell });
        }
        const key = keyOf2(cell);
        const previous = occupied.get(key);
        if (previous !== void 0) {
          add("lift-hidden-overlap", `Hidden lift cohort overlaps ${previous} at ${key}.`, { shutterId: shutter.id, blockId: block.id, cell });
        } else occupied.set(key, block.id);
      }
    }
  }
  const validRegionIds = new Set(validRegions.map(({ id }) => id));
  for (const coverage of auditOrdinaryShutterCoverage({
    ...level,
    shutters: (level.shutters ?? []).filter((shutter) => validRegionIds.has(shutter.id))
  })) {
    if (coverage.kind === "missing-hidden-cohort") continue;
    add(`shutter-${coverage.kind}`, `Ordinary shutter coverage: ${coverage.kind}.`, {
      shutterId: coverage.shutterId,
      blockId: coverage.blockId,
      cell: coverage.cell
    });
  }
  const physical = validRegions.filter(shutterHasPhysicalFootprint);
  for (let index = 0; index < physical.length; index += 1) {
    const left = physical[index];
    for (const right of physical.slice(index + 1)) {
      const x = Math.max(left.x, right.x);
      const y = Math.max(left.y, right.y);
      if (x < Math.min(left.x + left.width, right.x + right.width) && y < Math.min(left.y + left.height, right.y + right.height)) {
        add("physical-shutter-overlap", "Closed physical shutters cannot overlap.", {
          shutterId: left.id,
          otherShutterId: right.id,
          cell: [x, y]
        });
      }
    }
  }
  return issues;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  FORMAL_201_205_LEVELS,
  auditRevisedMechanismContract
});
