// Fresh v1.47 validation of the resumed 31-40 batch. Unlisted levels stay unchanged.
import type {LevelSpec} from './types';
export const NATIVE_REMAKE31_40_IDS: readonly number[] = [31,32,33,34,35,36,37,38,39,40];
const reviewed: Record<number,LevelSpec> = {
  "31": {
    "mechanismRules": "revised-2026-09-23-v1.4",
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
    "gates": [
      {
        "id": "v141-31-yellow",
        "color": "yellow",
        "side": "bottom",
        "size": 3,
        "offset": 3
      },
      {
        "id": "v141-31-white",
        "color": "blue",
        "frozen": 2,
        "side": "right",
        "size": 3,
        "offset": 5
      },
      {
        "id": "v141-31-black",
        "color": "purple",
        "frozen": 10,
        "side": "left",
        "size": 2,
        "offset": 0
      },
      {
        "id": "v141-31-green",
        "color": "green",
        "frozen": 13,
        "side": "left",
        "size": 2,
        "offset": 2
      }
    ],
    "blocks": [
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
            0,
            1
          ],
          [
            1,
            1
          ]
        ],
        "color": "green",
        "frozen": 10,
        "id": "v141-31-b1"
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
        "frozen": 5,
        "id": "v141-31-b2"
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
        "color": "purple",
        "id": "v141-31-b3"
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
        "color": "blue",
        "id": "v141-31-b4"
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
            0,
            1
          ],
          [
            1,
            1
          ]
        ],
        "color": "yellow",
        "frozen": 9,
        "id": "v141-31-b5"
      },
      {
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
        "color": "purple",
        "id": "v141-31-b6"
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
        "color": "yellow",
        "frozen": 13,
        "id": "v141-31-b7"
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
        "color": "blue",
        "id": "v141-31-b8"
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
            0,
            1
          ]
        ],
        "color": "purple",
        "id": "v141-31-b9"
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
          ]
        ],
        "color": "green",
        "id": "v141-31-b10"
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
            0,
            1
          ]
        ],
        "color": "yellow",
        "id": "v141-31-b11"
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
            0,
            1
          ],
          [
            1,
            1
          ]
        ],
        "color": "blue",
        "id": "v141-31-b12"
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
          ]
        ],
        "color": "green",
        "id": "v141-31-b13"
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
          ]
        ],
        "color": "blue",
        "id": "v141-31-b14"
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
          ]
        ],
        "color": "yellow",
        "id": "v141-31-b15"
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
          ]
        ],
        "color": "blue",
        "id": "v141-31-b16"
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
          ]
        ],
        "color": "yellow",
        "id": "v141-31-b17"
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
          ]
        ],
        "color": "green",
        "id": "v141-31-b18"
      }
    ],
    "id": 31,
    "name": "冰值交错 · 对向门阵",
    "difficulty": "easy",
    "timeSeconds": 90,
    "reward": 80,
    "parMoves": 27,
    "preservedMoveTarget": 27,
    "generators": [],
    "shutters": []
  },
  "32": {
    "mechanismRules": "revised-2026-09-23-v1.4",
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
    "gates": [
      {
        "id": "v141-32-yellow",
        "color": "yellow",
        "side": "top",
        "size": 2,
        "offset": 2
      },
      {
        "id": "v141-32-blue",
        "color": "blue",
        "frozen": 8,
        "side": "bottom",
        "size": 1,
        "offset": 1
      },
      {
        "id": "v141-32-green",
        "color": "green",
        "frozen": 8,
        "side": "right",
        "size": 2,
        "offset": 3
      },
      {
        "id": "v141-32-red",
        "color": "red",
        "frozen": 8,
        "side": "bottom",
        "size": 1,
        "offset": 4
      }
    ],
    "blocks": [
      {
        "x": 0,
        "y": 0,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "yellow",
        "id": "v141-32-b1"
      },
      {
        "x": 1,
        "y": 0,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "red",
        "id": "v141-32-b2"
      },
      {
        "x": 2,
        "y": 0,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "yellow",
        "id": "v141-32-b3"
      },
      {
        "x": 3,
        "y": 0,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "blue",
        "id": "v141-32-b4"
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
        "color": "red",
        "id": "v141-32-b5"
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
        "color": "yellow",
        "layers": [
          "yellow",
          "red"
        ],
        "frozen": 4,
        "id": "v141-32-b6"
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
        "color": "red",
        "id": "v141-32-b7"
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
        "color": "yellow",
        "id": "v141-32-b8"
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
        "color": "red",
        "id": "v141-32-b9"
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
        "color": "yellow",
        "id": "v141-32-b10"
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
          ]
        ],
        "color": "yellow",
        "layers": [
          "yellow",
          "blue"
        ],
        "frozen": 4,
        "id": "v141-32-b11"
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
            0,
            1
          ]
        ],
        "color": "blue",
        "id": "v141-32-b12"
      },
      {
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
        "color": "yellow",
        "layers": [
          "yellow",
          "green"
        ],
        "frozen": 4,
        "id": "v141-32-b13"
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
            0,
            1
          ]
        ],
        "color": "red",
        "id": "v141-32-b14"
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
            0,
            1
          ]
        ],
        "color": "yellow",
        "layers": [
          "yellow",
          "green"
        ],
        "frozen": 4,
        "id": "v141-32-b15"
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
          ]
        ],
        "color": "red",
        "id": "v141-32-b16"
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
        "color": "red",
        "id": "v141-32-b17"
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
            0,
            1
          ]
        ],
        "color": "yellow",
        "layers": [
          "yellow",
          "blue"
        ],
        "frozen": 4,
        "id": "v141-32-b18"
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
          ]
        ],
        "color": "red",
        "id": "v141-32-b19"
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
            0,
            1
          ]
        ],
        "color": "blue",
        "id": "v141-32-b20"
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
          ]
        ],
        "color": "red",
        "id": "v141-32-b21"
      },
      {
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
        "color": "yellow",
        "layers": [
          "yellow",
          "red"
        ],
        "frozen": 4,
        "id": "v141-32-b22"
      }
    ],
    "id": 32,
    "name": "冰壳回路",
    "difficulty": "normal",
    "timeSeconds": 90,
    "reward": 85,
    "parMoves": 124,
    "preservedMoveTarget": 124,
    "generators": [],
    "shutters": []
  },
  "33": {
    "mechanismRules": "revised-2026-09-23-v1.4",
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
        "id": "v141-33-ordinary-yellow",
        "color": "yellow",
        "side": "top",
        "size": 3,
        "offset": 3
      },
      {
        "id": "v141-33-ice-red",
        "color": "red",
        "frozen": 10,
        "side": "left",
        "size": 2,
        "offset": 4
      },
      {
        "id": "v141-33-ice-white",
        "color": "cyan",
        "frozen": 18,
        "side": "bottom",
        "size": 1,
        "offset": 2
      },
      {
        "id": "v141-33-ice-green",
        "color": "green",
        "frozen": 16,
        "side": "right",
        "size": 3,
        "offset": 5
      },
      {
        "id": "v141-33-ice-black",
        "color": "purple",
        "frozen": 10,
        "side": "top",
        "size": 1,
        "offset": 2
      },
      {
        "id": "v141-33-ice-blue",
        "color": "blue",
        "frozen": 5,
        "side": "bottom",
        "size": 3,
        "offset": 3
      }
    ],
    "blocks": [
      {
        "x": 1,
        "y": 0,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "purple",
        "id": "v141-33-b1"
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
            0,
            1
          ],
          [
            0,
            2
          ]
        ],
        "color": "blue",
        "id": "v141-33-b2"
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
          ],
          [
            0,
            2
          ]
        ],
        "color": "yellow",
        "id": "v141-33-b3"
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
          ],
          [
            0,
            2
          ]
        ],
        "color": "purple",
        "id": "v141-33-b4"
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
          ],
          [
            0,
            2
          ]
        ],
        "color": "yellow",
        "id": "v141-33-b5"
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
          ],
          [
            0,
            2
          ]
        ],
        "color": "purple",
        "id": "v141-33-b6"
      },
      {
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
        "color": "cyan",
        "id": "v141-33-b7"
      },
      {
        "x": 6,
        "y": 1,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "blue",
        "id": "v141-33-b8"
      },
      {
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
        "color": "yellow",
        "id": "v141-33-b9"
      },
      {
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
        "color": "blue",
        "id": "v141-33-b10"
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
            0,
            1
          ],
          [
            0,
            2
          ]
        ],
        "color": "cyan",
        "id": "v141-33-b11"
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
        "color": "blue",
        "id": "v141-33-b12"
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
          ],
          [
            0,
            2
          ]
        ],
        "color": "cyan",
        "id": "v141-33-b13"
      },
      {
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
        "color": "purple",
        "id": "v141-33-b14"
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
        "color": "cyan",
        "id": "v141-33-b15"
      },
      {
        "x": 0,
        "y": 7,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "blue",
        "id": "v141-33-b16"
      },
      {
        "x": 1,
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
        "color": "red",
        "id": "v141-33-b17"
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
        "color": "purple",
        "id": "v141-33-b18"
      },
      {
        "x": 2,
        "y": 5,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "yellow",
        "id": "v141-33-b19"
      },
      {
        "x": 1,
        "y": 7,
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
        "color": "green",
        "id": "v141-33-b20"
      },
      {
        "x": 2,
        "y": 6,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "cyan",
        "id": "v141-33-b21"
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
        "color": "blue",
        "id": "v141-33-b22"
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
        "color": "yellow",
        "id": "v141-33-b23"
      }
    ],
    "id": 33,
    "name": "阶梯锁阵 tree parking pairs",
    "difficulty": "normal",
    "timeSeconds": 90,
    "reward": 90,
    "parMoves": 35,
    "preservedMoveTarget": 35,
    "generators": [],
    "shutters": []
  },
  "34": {
    "mechanismRules": "revised-2026-09-23-v1.4",
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
    "gates": [
      {
        "id": "v141-34-ordinary-white",
        "color": "cyan",
        "side": "top",
        "size": 1,
        "offset": 4
      },
      {
        "id": "v141-34-ice-red",
        "color": "red",
        "frozen": 14,
        "side": "right",
        "size": 3,
        "offset": 1
      },
      {
        "id": "v141-34-ice-yellow",
        "color": "yellow",
        "frozen": 22,
        "side": "bottom",
        "size": 1,
        "offset": 0
      },
      {
        "id": "v141-34-ice-blue",
        "color": "blue",
        "frozen": 22,
        "side": "top",
        "size": 1,
        "offset": 1
      },
      {
        "id": "v141-34-ice-black",
        "color": "purple",
        "frozen": 7,
        "side": "right",
        "size": 3,
        "offset": 5
      },
      {
        "id": "v141-34-ice-green",
        "color": "green",
        "frozen": 13,
        "side": "top",
        "size": 1,
        "offset": 6
      }
    ],
    "blocks": [
      {
        "x": 6,
        "y": 0,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "cyan",
        "id": "v141-34-single-1"
      },
      {
        "x": 5,
        "y": 0,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "purple",
        "id": "v141-34-single-2"
      },
      {
        "x": 5,
        "y": 5,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "purple",
        "id": "v141-34-single-3"
      },
      {
        "x": 6,
        "y": 3,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "cyan",
        "id": "v141-34-single-4"
      },
      {
        "x": 4,
        "y": 2,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "cyan",
        "id": "v141-34-single-5"
      },
      {
        "x": 4,
        "y": 5,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "cyan",
        "id": "v141-34-single-6"
      },
      {
        "x": 5,
        "y": 4,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "cyan",
        "id": "v141-34-single-7"
      },
      {
        "x": 6,
        "y": 6,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "purple",
        "id": "v141-34-single-8"
      },
      {
        "x": 5,
        "y": 2,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "purple",
        "id": "v141-34-single-9"
      },
      {
        "x": 4,
        "y": 0,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "cyan",
        "id": "v141-34-single-10"
      },
      {
        "x": 4,
        "y": 4,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "purple",
        "id": "v141-34-single-11"
      },
      {
        "x": 4,
        "y": 1,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "purple",
        "id": "v141-34-single-12"
      },
      {
        "x": 5,
        "y": 1,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "cyan",
        "id": "v141-34-single-13"
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
        "color": "red",
        "id": "v141-34-red-h2"
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
          ]
        ],
        "color": "red",
        "id": "v141-34-red-v2-1"
      },
      {
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
          ]
        ],
        "color": "red",
        "id": "v141-34-red-v2-2"
      },
      {
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
        "color": "red",
        "id": "v141-34-red-v2-3"
      },
      {
        "id": "v141-34-shell-2",
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
        "color": "yellow",
        "shutterId": "v141-34-cover1",
        "layers": [
          "yellow",
          "red"
        ]
      },
      {
        "id": "v141-34-shell-7",
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
        "color": "red",
        "shutterId": "v141-34-cover1",
        "layers": [
          "red",
          "blue"
        ]
      },
      {
        "id": "v141-34-shell-1",
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
        "color": "red",
        "shutterId": "v141-34-cover1",
        "layers": [
          "red",
          "blue"
        ]
      },
      {
        "id": "v141-34-shell-3",
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
        "color": "blue",
        "shutterId": "v141-34-cover1",
        "layers": [
          "blue",
          "green"
        ]
      },
      {
        "id": "v141-34-hidden-plain-red",
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
        "color": "red",
        "shutterId": "v141-34-cover1"
      },
      {
        "id": "v141-34-shell-6",
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
        "color": "yellow",
        "shutterId": "v141-34-cover1",
        "layers": [
          "yellow",
          "red"
        ]
      },
      {
        "id": "v141-34-shell-5",
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
        "color": "blue",
        "shutterId": "v141-34-cover1",
        "layers": [
          "blue",
          "green"
        ]
      },
      {
        "id": "v141-34-shell-4",
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
        "color": "green",
        "shutterId": "v141-34-cover1",
        "layers": [
          "green",
          "red"
        ]
      },
      {
        "id": "v141-34-hidden2-6",
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
        "color": "green",
        "shutterId": "v141-34-cover2"
      },
      {
        "id": "v141-34-hidden2-1",
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
        "color": "blue",
        "shutterId": "v141-34-cover2"
      },
      {
        "id": "v141-34-hidden2-2",
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
        "color": "yellow",
        "shutterId": "v141-34-cover2"
      },
      {
        "id": "v141-34-hidden2-4",
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
        "color": "yellow",
        "shutterId": "v141-34-cover2"
      },
      {
        "id": "v141-34-hidden2-5",
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
        "color": "red",
        "shutterId": "v141-34-cover2"
      },
      {
        "id": "v141-34-hidden2-3",
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
        "color": "red",
        "shutterId": "v141-34-cover2"
      }
    ],
    "shutters": [
      {
        "id": "v141-34-cover1",
        "x": 0,
        "y": 0,
        "width": 4,
        "height": 6,
        "count": 12
      },
      {
        "id": "v141-34-cover2",
        "x": 0,
        "y": 6,
        "width": 6,
        "height": 3,
        "count": 22
      }
    ],
    "id": 34,
    "name": "双舱开闸",
    "difficulty": "hard",
    "timeSeconds": 120,
    "reward": 95,
    "parMoves": 68,
    "preservedMoveTarget": 68,
    "generators": []
  },
  "35": {
    "mechanismRules": "revised-2026-09-23-v1.4",
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
    "gates": [
      {
        "id": "v145-35-gate-blue",
        "color": "blue",
        "side": "right",
        "offset": 1,
        "size": 3
      },
      {
        "id": "v145-35-gate-red",
        "color": "red",
        "side": "top",
        "offset": 0,
        "size": 3
      },
      {
        "id": "v145-35-gate-yellow",
        "color": "yellow",
        "side": "bottom",
        "offset": 0,
        "size": 3
      }
    ],
    "blocks": [
      {
        "id": "v145-35-added-4",
        "x": 0,
        "y": 0,
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
        "id": "v145-35-added-2",
        "x": 0,
        "y": 2,
        "color": "blue",
        "shape": [
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
        "id": "v145-35-added-1",
        "x": 0,
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
        "id": "v145-35-added-6",
        "x": 2,
        "y": 0,
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
        "id": "v145-35-added-3",
        "x": 2,
        "y": 2,
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
        "id": "v145-35-added-5",
        "x": 2,
        "y": 4,
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
        "id": "v145-35-opening-1",
        "x": 4,
        "y": 0,
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
        ]
      },
      {
        "id": "v145-35-added-7",
        "x": 4,
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
        ]
      },
      {
        "id": "v145-35-opening-2",
        "x": 4,
        "y": 4,
        "color": "blue",
        "shape": [
          [
            0,
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
        ]
      },
      {
        "id": "v145-35-added-9",
        "x": 5,
        "y": 0,
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
        "id": "v145-35-added-0",
        "x": 5,
        "y": 1,
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
        "id": "v145-35-added-8",
        "x": 5,
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
          ]
        ]
      },
      {
        "id": "v145-35-left-1",
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
        "id": "v145-35-left-2",
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
        "id": "v145-35-left-3",
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
        "id": "v145-35-left-4",
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
        "id": "v145-35-left-5",
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
        "id": "v145-35-left-6",
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
        "id": "v145-35-left-7",
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
        "id": "v145-35-left-8",
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
        "id": "v145-35-right-1",
        "x": 0,
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
        "color": "red"
      },
      {
        "id": "v145-35-right-2",
        "x": 0,
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
        "color": "yellow"
      },
      {
        "id": "v145-35-right-3",
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
        "id": "v145-35-right-4",
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
        "color": "blue"
      },
      {
        "id": "v145-35-right-5",
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
        "color": "red"
      },
      {
        "id": "v145-35-right-6",
        "x": 0,
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
        "id": "v145-35-right-7",
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
        "color": "yellow"
      },
      {
        "id": "v145-35-right-8",
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
          ]
        ],
        "color": "red"
      }
    ],
    "id": 35,
    "name": "双线投放",
    "difficulty": "easy",
    "timeSeconds": 60,
    "reward": 100,
    "parMoves": 26,
    "preservedMoveTarget": 38,
    "generators": [
      {
        "id": "v145-35-machine-1",
        "side": "left",
        "offset": 1,
        "spawn": [
          0,
          1
        ],
        "rimSpan": 3,
        "rimMount": "rim",
        "queueBlockIds": [
          "v145-35-left-1",
          "v145-35-left-2",
          "v145-35-left-3",
          "v145-35-left-4",
          "v145-35-left-5",
          "v145-35-left-6",
          "v145-35-left-7",
          "v145-35-left-8"
        ]
      },
      {
        "id": "v145-35-machine-2",
        "side": "left",
        "offset": 4,
        "spawn": [
          0,
          3
        ],
        "rimSpan": 3,
        "rimMount": "rim",
        "queueBlockIds": [
          "v145-35-right-1",
          "v145-35-right-2",
          "v145-35-right-3",
          "v145-35-right-4",
          "v145-35-right-5",
          "v145-35-right-6",
          "v145-35-right-7",
          "v145-35-right-8"
        ]
      }
    ]
  },
  "36": {
    "mechanismRules": "revised-2026-09-23-v1.4",
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
        "id": "v145-36-gate-blue",
        "color": "blue",
        "side": "bottom",
        "offset": 2,
        "size": 2
      },
      {
        "id": "v145-36-gate-yellow",
        "color": "yellow",
        "side": "right",
        "offset": 6,
        "size": 3
      },
      {
        "id": "v145-36-gate-green",
        "color": "green",
        "side": "right",
        "offset": 1,
        "size": 2
      },
      {
        "id": "v145-36-gate-red",
        "color": "red",
        "side": "top",
        "offset": 1,
        "size": 3
      }
    ],
    "blocks": [
      {
        "id": "v145-36-opening-10",
        "x": 0,
        "y": 0,
        "color": "red",
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
        "id": "v145-36-opening-3",
        "x": 1,
        "y": 0,
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
            1,
            1
          ]
        ]
      },
      {
        "id": "v145-36-opening-9",
        "x": 2,
        "y": 0,
        "color": "green",
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
        "id": "v145-36-added-2",
        "x": 4,
        "y": 0,
        "color": "blue",
        "shape": [
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
        "id": "v145-36-opening-4",
        "x": 3,
        "y": 1,
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
            1,
            1
          ]
        ]
      },
      {
        "id": "v145-36-added-4",
        "x": 0,
        "y": 2,
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
        "id": "v145-36-opening-8",
        "x": 2,
        "y": 2,
        "color": "green",
        "shape": [
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
        ]
      },
      {
        "id": "v145-36-opening-11",
        "x": 5,
        "y": 2,
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
        "id": "v145-36-opening-7",
        "x": 4,
        "y": 3,
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
            1,
            1
          ]
        ]
      },
      {
        "id": "v145-36-added-0",
        "x": 0,
        "y": 4,
        "color": "blue",
        "shape": [
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
        "id": "v145-36-opening-6",
        "x": 2,
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
        "id": "v145-36-added-3",
        "x": 4,
        "y": 5,
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
        "id": "v145-36-opening-2",
        "x": 0,
        "y": 6,
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
        "id": "v145-36-opening-1",
        "x": 1,
        "y": 6,
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
          ],
          [
            0,
            1
          ]
        ]
      },
      {
        "id": "v145-36-added-1",
        "x": 2,
        "y": 7,
        "color": "blue",
        "shape": [
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
        "id": "v145-36-added-5",
        "x": 4,
        "y": 7,
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
        "id": "v145-36-opening-5",
        "x": 0,
        "y": 8,
        "color": "green",
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
        "id": "v145-36-left-upper-1",
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
        "id": "v145-36-left-lower-1",
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
          ]
        ],
        "color": "yellow"
      },
      {
        "id": "v145-36-right-1",
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
      }
    ],
    "id": 36,
    "name": "三向补给",
    "difficulty": "easy",
    "timeSeconds": 90,
    "reward": 105,
    "parMoves": 19,
    "preservedMoveTarget": 31,
    "generators": [
      {
        "id": "v145-36-machine-1",
        "side": "left",
        "offset": 1,
        "spawn": [
          0,
          1
        ],
        "rimSpan": 3,
        "rimMount": "rim",
        "queueBlockIds": [
          "v145-36-left-upper-1"
        ]
      },
      {
        "id": "v145-36-machine-2",
        "side": "left",
        "offset": 4,
        "spawn": [
          0,
          4
        ],
        "rimSpan": 3,
        "rimMount": "rim",
        "queueBlockIds": [
          "v145-36-left-lower-1"
        ]
      },
      {
        "id": "v145-36-machine-3",
        "side": "left",
        "offset": 7,
        "spawn": [
          0,
          7
        ],
        "rimSpan": 3,
        "rimMount": "rim",
        "queueBlockIds": [
          "v145-36-right-1"
        ]
      }
    ]
  },
  "37": {
    "mechanismRules": "revised-2026-09-23-v1.4",
    "width": 7,
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
    "gates": [
      {
        "id": "v145-37-gate-cyan",
        "color": "cyan",
        "side": "bottom",
        "offset": 3,
        "size": 3,
        "frozen": 15
      },
      {
        "id": "v145-37-gate-yellow",
        "color": "yellow",
        "side": "right",
        "offset": 1,
        "size": 3
      },
      {
        "id": "v145-37-gate-blue",
        "color": "blue",
        "side": "top",
        "offset": 2,
        "size": 3
      },
      {
        "id": "v145-37-gate-green",
        "color": "green",
        "side": "right",
        "offset": 4,
        "size": 2,
        "frozen": 2
      },
      {
        "id": "v145-37-gate-red",
        "color": "red",
        "side": "left",
        "offset": 5,
        "size": 2,
        "frozen": 7
      },
      {
        "id": "v145-37-gate-pink",
        "color": "pink",
        "side": "bottom",
        "offset": 1,
        "size": 2,
        "frozen": 11
      }
    ],
    "blocks": [
      {
        "id": "v145-37-added-2",
        "x": 1,
        "y": 0,
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
        "id": "v145-37-opening-6",
        "x": 4,
        "y": 0,
        "color": "blue",
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
        "id": "v145-37-added-1",
        "x": 5,
        "y": 0,
        "color": "yellow",
        "shape": [
          [
            0,
            0
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
        "id": "v145-37-opening-1",
        "x": 0,
        "y": 1,
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
        "id": "v145-37-opening-4",
        "x": 6,
        "y": 1,
        "color": "blue",
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
        "id": "v145-37-opening-2",
        "x": 4,
        "y": 2,
        "color": "cyan",
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
        "id": "v145-37-opening-8",
        "x": 0,
        "y": 3,
        "color": "cyan",
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
        "id": "v145-37-opening-7",
        "x": 5,
        "y": 3,
        "color": "pink",
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
        "id": "v145-37-opening-11",
        "x": 6,
        "y": 3,
        "color": "red",
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
        "id": "v145-37-opening-12",
        "x": 1,
        "y": 4,
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
        "frozen": 3
      },
      {
        "id": "v145-37-added-0",
        "x": 4,
        "y": 4,
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
        ]
      },
      {
        "id": "v145-37-opening-10",
        "x": 0,
        "y": 5,
        "color": "green",
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
        "id": "v145-37-opening-13",
        "x": 1,
        "y": 5,
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
        ],
        "frozen": 3
      },
      {
        "id": "v145-37-opening-5",
        "x": 5,
        "y": 5,
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
        "id": "v145-37-opening-3",
        "x": 1,
        "y": 6,
        "color": "pink",
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
        "id": "v145-37-opening-9",
        "x": 2,
        "y": 6,
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
        "id": "v145-37-added-3",
        "x": 4,
        "y": 7,
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
        "id": "v145-37-cover-1-3",
        "x": 1,
        "y": 1,
        "color": "pink",
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
        "shutterId": "v145-37-cover"
      },
      {
        "id": "v145-37-cover-1-1",
        "x": 2,
        "y": 1,
        "color": "blue",
        "shape": [
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
        "shutterId": "v145-37-cover"
      },
      {
        "id": "v145-37-cover-1-2",
        "x": 1,
        "y": 3,
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
        ],
        "shutterId": "v145-37-cover"
      },
      {
        "id": "v145-37-top-1",
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
        "color": "yellow"
      },
      {
        "id": "v145-37-top-2",
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
        "id": "v145-37-top-3",
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
        "id": "v145-37-top-4",
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
        ],
        "color": "blue"
      }
    ],
    "id": 37,
    "name": "四机联锁",
    "difficulty": "normal",
    "timeSeconds": 90,
    "reward": 110,
    "parMoves": 63,
    "preservedMoveTarget": 63,
    "shutters": [
      {
        "id": "v145-37-cover",
        "x": 1,
        "y": 1,
        "width": 3,
        "height": 3,
        "count": 9
      }
    ],
    "generators": [
      {
        "id": "v145-37-machine-1",
        "side": "left",
        "offset": 3,
        "spawn": [
          0,
          3
        ],
        "rimSpan": 3,
        "rimMount": "rim",
        "queueBlockIds": [
          "v145-37-top-1",
          "v145-37-top-2",
          "v145-37-top-3",
          "v145-37-top-4"
        ]
      }
    ]
  },
  "38": {
    "mechanismRules": "revised-2026-09-23-v1.4",
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
    "gates": [
      {
        "id": "v147-38-gate-yellow",
        "color": "yellow",
        "side": "left",
        "offset": 2,
        "size": 2
      },
      {
        "id": "v147-38-gate-cyan",
        "color": "cyan",
        "side": "right",
        "offset": 0,
        "size": 3,
        "frozen": 3
      },
      {
        "id": "v147-38-gate-blue",
        "color": "blue",
        "side": "left",
        "offset": 0,
        "size": 2,
        "frozen": 8
      },
      {
        "id": "v147-38-gate-red",
        "color": "red",
        "side": "right",
        "offset": 6,
        "size": 2,
        "frozen": 18
      },
      {
        "id": "v147-38-gate-pink",
        "color": "pink",
        "side": "bottom",
        "offset": 2,
        "size": 3,
        "frozen": 20
      },
      {
        "id": "v147-38-gate-green",
        "color": "green",
        "side": "right",
        "offset": 4,
        "size": 2,
        "frozen": 23
      }
    ],
    "blocks": [
      {
        "id": "v147-38-s38-o-5",
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
        "id": "v147-38-s38-o-7",
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
          ]
        ],
        "color": "yellow"
      },
      {
        "id": "v147-38-s38-o-1",
        "x": 0,
        "y": 0,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "blue",
        "frozen": 5
      },
      {
        "id": "v147-38-s38-o-2",
        "x": 4,
        "y": 0,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "yellow",
        "frozen": 5
      },
      {
        "id": "v147-38-s38-o-9",
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
        "color": "yellow"
      },
      {
        "id": "v147-38-s38-o-6",
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
        "id": "v147-38-s38-o-3",
        "x": 5,
        "y": 0,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "pink",
        "frozen": 5
      },
      {
        "id": "v147-38-s38-o-4",
        "x": 3,
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
        "id": "v147-38-s38-o-10",
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
        "color": "blue"
      },
      {
        "id": "v147-38-s38-o-11",
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
        "id": "v147-38-s38-o-8",
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
        "color": "blue"
      },
      {
        "id": "v147-38-s38-c1-1",
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
        "color": "green",
        "shutterId": "v147-38-cover-1"
      },
      {
        "id": "v147-38-s38-c1-5",
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
        "color": "cyan",
        "shutterId": "v147-38-cover-1"
      },
      {
        "id": "v147-38-s38-c1-3",
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
        "color": "green",
        "shutterId": "v147-38-cover-1"
      },
      {
        "id": "v147-38-added-hidden-3",
        "x": 3,
        "y": 4,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "green",
        "shutterId": "v147-38-cover-1"
      },
      {
        "id": "v147-38-s38-c1-8",
        "x": 3,
        "y": 4,
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
          ],
          [
            1,
            2
          ]
        ],
        "color": "pink",
        "shutterId": "v147-38-cover-1"
      },
      {
        "id": "v147-38-added-hidden-1",
        "x": 5,
        "y": 4,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "green",
        "shutterId": "v147-38-cover-1"
      },
      {
        "id": "v147-38-s38-c1-4",
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
        "color": "blue",
        "shutterId": "v147-38-cover-1"
      },
      {
        "id": "v147-38-s38-c1-2",
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
        "shutterId": "v147-38-cover-1"
      },
      {
        "id": "v147-38-added-hidden-0",
        "x": 3,
        "y": 6,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "green",
        "shutterId": "v147-38-cover-1"
      },
      {
        "id": "v147-38-added-hidden-2",
        "x": 5,
        "y": 6,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "green",
        "shutterId": "v147-38-cover-1"
      },
      {
        "id": "v147-38-s38-c1-7",
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
        "color": "cyan",
        "shutterId": "v147-38-cover-1"
      },
      {
        "id": "v147-38-s38-c1-6",
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
        "color": "red",
        "shutterId": "v147-38-cover-1"
      },
      {
        "id": "v147-38-s38-q-1",
        "x": 2,
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
        "id": "v147-38-s38-q-2",
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
        "id": "v147-38-s38-q-3",
        "x": 2,
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
        "id": "v147-38-s38-q-4",
        "x": 2,
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
        "id": "v147-38-s38-q-5",
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
        "id": "v147-38-s38-q-6",
        "x": 2,
        "y": 0,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "yellow"
      }
    ],
    "id": 38,
    "name": "高压转仓",
    "difficulty": "hard",
    "timeSeconds": 120,
    "reward": 115,
    "parMoves": 41,
    "preservedMoveTarget": 49,
    "shutters": [
      {
        "id": "v147-38-cover-1",
        "x": 0,
        "y": 3,
        "width": 6,
        "height": 5,
        "count": 15
      }
    ],
    "generators": [
      {
        "id": "v147-38-generator-1",
        "side": "top",
        "offset": 2,
        "spawn": [
          2,
          0
        ],
        "rimSpan": 3,
        "rimMount": "rim",
        "queueBlockIds": [
          "v147-38-s38-q-1",
          "v147-38-s38-q-2",
          "v147-38-s38-q-3",
          "v147-38-s38-q-4",
          "v147-38-s38-q-5",
          "v147-38-s38-q-6"
        ]
      }
    ]
  },
  "39": {
    "mechanismRules": "revised-2026-09-23-v1.4",
    "width": 8,
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
    "gates": [
      {
        "id": "v147-39-gate-yellow",
        "color": "yellow",
        "side": "bottom",
        "offset": 5,
        "size": 2
      },
      {
        "id": "v147-39-gate-purple",
        "color": "purple",
        "side": "bottom",
        "offset": 3,
        "size": 2,
        "frozen": 2
      },
      {
        "id": "v147-39-gate-green",
        "color": "green",
        "side": "right",
        "offset": 3,
        "size": 2,
        "frozen": 5
      },
      {
        "id": "v147-39-gate-red",
        "color": "red",
        "side": "right",
        "offset": 5,
        "size": 2,
        "frozen": 9
      },
      {
        "id": "v147-39-gate-blue",
        "color": "blue",
        "side": "right",
        "offset": 1,
        "size": 2,
        "frozen": 11
      },
      {
        "id": "v147-39-gate-orange",
        "color": "orange",
        "side": "top",
        "offset": 4,
        "size": 2,
        "frozen": 30
      }
    ],
    "blocks": [
      {
        "id": "v147-39-s39-o-7",
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
        "id": "v147-39-s39-o-5",
        "x": 7,
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
        "id": "v147-39-s39-o-3",
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
        "color": "green"
      },
      {
        "id": "v147-39-s39-o-8",
        "x": 4,
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
        "id": "v147-39-s39-o-10",
        "x": 4,
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
        "id": "v147-39-s39-o-6",
        "x": 4,
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
        "id": "v147-39-s39-o-1",
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
            1,
            1
          ]
        ],
        "color": "yellow"
      },
      {
        "id": "v147-39-s39-o-11",
        "x": 6,
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
        "id": "v147-39-s39-o-9",
        "x": 1,
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
        "id": "v147-39-s39-o-4",
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
        "id": "v147-39-s39-o-2",
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
        "id": "v147-39-s39-c1-7",
        "x": 0,
        "y": 2,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "red",
        "shutterId": "v147-39-cover-1"
      },
      {
        "id": "v147-39-s39-c1-2",
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
        "color": "orange",
        "shutterId": "v147-39-cover-1"
      },
      {
        "id": "v147-39-s39-c1-9",
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
        "color": "yellow",
        "shutterId": "v147-39-cover-1"
      },
      {
        "id": "v147-39-s39-c1-5",
        "x": 0,
        "y": 3,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "yellow",
        "shutterId": "v147-39-cover-1"
      },
      {
        "id": "v147-39-s39-c1-1",
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
          ]
        ],
        "color": "red",
        "shutterId": "v147-39-cover-1"
      },
      {
        "id": "v147-39-s39-c1-6",
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
        "color": "red",
        "shutterId": "v147-39-cover-1"
      },
      {
        "id": "v147-39-s39-c1-4",
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
        "color": "blue",
        "shutterId": "v147-39-cover-1"
      },
      {
        "id": "v147-39-s39-c1-8",
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
        "color": "purple",
        "shutterId": "v147-39-cover-1"
      },
      {
        "id": "v147-39-s39-c1-3",
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
        "color": "blue",
        "frozen": 12,
        "shutterId": "v147-39-cover-1"
      },
      {
        "id": "v147-39-s39-c1-11",
        "x": 2,
        "y": 6,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "yellow",
        "shutterId": "v147-39-cover-1"
      },
      {
        "id": "v147-39-s39-c1-10",
        "x": 3,
        "y": 6,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "red",
        "shutterId": "v147-39-cover-1"
      },
      {
        "id": "v147-39-s39-c2-4",
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
        "color": "purple",
        "shutterId": "v147-39-cover-2"
      },
      {
        "id": "v147-39-s39-c2-6",
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
        "shutterId": "v147-39-cover-2"
      },
      {
        "id": "v147-39-s39-c2-3",
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
        "color": "yellow",
        "shutterId": "v147-39-cover-2"
      },
      {
        "id": "v147-39-s39-c2-1",
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
          ]
        ],
        "color": "orange",
        "shutterId": "v147-39-cover-2"
      },
      {
        "id": "v147-39-s39-c2-5",
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
        "color": "red",
        "shutterId": "v147-39-cover-2"
      },
      {
        "id": "v147-39-s39-c2-2",
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
        "color": "green",
        "frozen": 1,
        "shutterId": "v147-39-cover-2"
      },
      {
        "id": "v147-39-s39-c3-3",
        "x": 5,
        "y": 2,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "purple",
        "shutterId": "v147-39-cover-3"
      },
      {
        "id": "v147-39-s39-c3-4",
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
        "color": "red",
        "frozen": 1,
        "shutterId": "v147-39-cover-3"
      },
      {
        "id": "v147-39-s39-c3-1",
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
            1,
            1
          ]
        ],
        "color": "green",
        "frozen": 1,
        "shutterId": "v147-39-cover-3"
      },
      {
        "id": "v147-39-s39-c3-2",
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
          ]
        ],
        "color": "blue",
        "frozen": 1,
        "shutterId": "v147-39-cover-3"
      },
      {
        "id": "v147-39-s39-c3-5",
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
        "color": "green",
        "shutterId": "v147-39-cover-3"
      },
      {
        "id": "v147-39-s39-q-1",
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
        "color": "orange"
      },
      {
        "id": "v147-39-s39-q-2",
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
        "color": "yellow"
      }
    ],
    "id": 39,
    "name": "分区总控",
    "difficulty": "easy",
    "timeSeconds": 160,
    "reward": 120,
    "parMoves": 39,
    "preservedMoveTarget": 44,
    "shutters": [
      {
        "id": "v147-39-cover-1",
        "x": 0,
        "y": 2,
        "width": 4,
        "height": 5,
        "count": 15
      },
      {
        "id": "v147-39-cover-2",
        "x": 1,
        "y": 0,
        "width": 6,
        "height": 2,
        "count": 22
      },
      {
        "id": "v147-39-cover-3",
        "x": 5,
        "y": 2,
        "width": 3,
        "height": 4,
        "count": 5
      }
    ],
    "generators": [
      {
        "id": "v147-39-generator-1",
        "side": "top",
        "offset": 2,
        "spawn": [
          2,
          0
        ],
        "rimSpan": 3,
        "rimMount": "rim",
        "queueBlockIds": [
          "v147-39-s39-q-1",
          "v147-39-s39-q-2"
        ]
      }
    ]
  },
  "40": {
    "mechanismRules": "revised-2026-09-23-v1.4",
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
        "id": "v141-40-green",
        "color": "green",
        "side": "right",
        "offset": 1,
        "size": 2,
        "frozen": 6
      },
      {
        "id": "v141-40-purple",
        "color": "purple",
        "side": "bottom",
        "offset": 2,
        "size": 2,
        "frozen": 3
      },
      {
        "id": "v141-40-yellow",
        "color": "yellow",
        "side": "top",
        "offset": 2,
        "size": 2
      },
      {
        "id": "v141-40-blue",
        "color": "blue",
        "side": "left",
        "offset": 2,
        "size": 3,
        "frozen": 2
      },
      {
        "id": "v141-40-red",
        "color": "red",
        "side": "right",
        "offset": 3,
        "size": 2,
        "frozen": 4
      }
    ],
    "blocks": [
      {
        "id": "s40-o-10",
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
        "id": "s40-o-11",
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
        "id": "s40-o-1",
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
        "id": "s40-o-6",
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
        "id": "s40-o-4",
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
        "id": "s40-o-9",
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
        "id": "s40-o-3",
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
        "id": "s40-o-5",
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
        "id": "s40-o-8",
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
        "id": "s40-o-2",
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
        "id": "s40-o-7",
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
        "id": "s40-c1-5",
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
        "shutterId": "v141-40-cover1"
      },
      {
        "id": "s40-c1-1",
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
        "shutterId": "v141-40-cover1"
      },
      {
        "id": "s40-c1-8",
        "color": "purple",
        "x": 4,
        "y": 1,
        "shape": [
          [
            0,
            0
          ]
        ],
        "shutterId": "v141-40-cover1"
      },
      {
        "id": "s40-c1-3",
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
        "shutterId": "v141-40-cover1"
      },
      {
        "id": "s40-c1-2",
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
        "shutterId": "v141-40-cover1"
      },
      {
        "id": "s40-c1-4",
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
        "shutterId": "v141-40-cover1"
      },
      {
        "id": "s40-c1-6",
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
        "shutterId": "v141-40-cover1"
      },
      {
        "id": "s40-c1-7",
        "color": "purple",
        "x": 4,
        "y": 4,
        "shape": [
          [
            0,
            0
          ]
        ],
        "shutterId": "v141-40-cover1"
      }
    ],
    "id": 40,
    "name": "紧凑收束",
    "difficulty": "normal",
    "timeSeconds": 90,
    "reward": 125,
    "parMoves": 34,
    "preservedMoveTarget": 34,
    "shutters": [
      {
        "id": "v141-40-cover1",
        "x": 1,
        "y": 1,
        "width": 4,
        "height": 4,
        "count": 4
      }
    ]
  }
};
export const applyNativeRemake31to40 = (level:LevelSpec):LevelSpec => reviewed[level.id] ?? level;
