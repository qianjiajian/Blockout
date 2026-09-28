// v1.53: 51–60 are installed. Lv59 is a user-authorized direct write; its L16 certificate remains UNKNOWN.
import type {LevelSpec} from './types';
export const REMADE_51_60_IDS: readonly number[] = [51,52,53,54,55,56,57,58,59,60];
const reviewed: Record<number,LevelSpec> = {
  "51": {
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
        "id": "v146-51-gate-red",
        "color": "red",
        "side": "left",
        "offset": 3,
        "size": 3
      },
      {
        "id": "v146-51-gate-green",
        "color": "green",
        "side": "top",
        "offset": 0,
        "size": 3,
        "frozen": 3
      },
      {
        "id": "v146-51-gate-cyan",
        "color": "cyan",
        "side": "right",
        "offset": 3,
        "size": 2,
        "frozen": 5
      },
      {
        "id": "v146-51-gate-pink",
        "color": "pink",
        "side": "top",
        "offset": 4,
        "size": 2,
        "frozen": 4
      },
      {
        "id": "v146-51-gate-purple",
        "color": "purple",
        "side": "bottom",
        "offset": 0,
        "size": 3,
        "frozen": 10
      },
      {
        "id": "v146-51-gate-yellow",
        "color": "yellow",
        "side": "left",
        "offset": 0,
        "size": 3,
        "frozen": 8
      },
      {
        "id": "v146-51-gate-blue",
        "color": "blue",
        "side": "bottom",
        "offset": 3,
        "size": 3,
        "frozen": 6
      }
    ],
    "blocks": [
      {
        "id": "v146-51-purple-v",
        "color": "purple",
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
        ]
      },
      {
        "id": "v146-51-yellow-shell",
        "color": "yellow",
        "layers": [
          "yellow",
          "blue"
        ],
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
        ]
      },
      {
        "id": "v146-51-blue-shell",
        "color": "blue",
        "layers": [
          "blue",
          "purple"
        ],
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
        ]
      },
      {
        "id": "v146-51-red-v",
        "color": "pink",
        "movementAxis": "vertical",
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
        ]
      },
      {
        "id": "v146-51-green-h1",
        "color": "green",
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
        ]
      },
      {
        "id": "v146-51-yellow-ice",
        "color": "yellow",
        "frozen": 7,
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
        ]
      },
      {
        "id": "v146-51-green-h2",
        "color": "green",
        "movementAxis": "vertical",
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
        ]
      },
      {
        "id": "v146-51-red-h2",
        "color": "red",
        "movementAxis": "horizontal",
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
        ]
      },
      {
        "id": "v146-51-red-h3",
        "color": "red",
        "movementAxis": "horizontal",
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
        ]
      },
      {
        "id": "v146-51-red-h4",
        "color": "cyan",
        "movementAxis": "horizontal",
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
        ]
      },
      {
        "id": "v146-51-yellow-h1",
        "color": "yellow",
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
        ]
      },
      {
        "id": "v146-51-red-h1",
        "color": "red",
        "movementAxis": "horizontal",
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
        ]
      }
    ],
    "id": 51,
    "name": "棱镜热身 · 轴向可解种子",
    "difficulty": "normal",
    "timeSeconds": 120,
    "reward": 120,
    "parMoves": 46,
    "preservedMoveTarget": 46
  },
  "52": {
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
        "id": "v146-52-gate-yellow",
        "color": "yellow",
        "side": "left",
        "offset": 3,
        "size": 3,
        "frozen": 3
      },
      {
        "id": "v146-52-gate-cyan",
        "color": "cyan",
        "side": "top",
        "offset": 2,
        "size": 2,
        "frozen": 12
      },
      {
        "id": "v146-52-gate-pink",
        "color": "pink",
        "side": "bottom",
        "offset": 0,
        "size": 2,
        "frozen": 14
      },
      {
        "id": "v146-52-gate-red",
        "color": "red",
        "side": "bottom",
        "offset": 2,
        "size": 3
      },
      {
        "id": "v146-52-gate-green",
        "color": "green",
        "side": "top",
        "offset": 0,
        "size": 2,
        "frozen": 4
      },
      {
        "id": "v146-52-gate-blue",
        "color": "blue",
        "side": "top",
        "offset": 5,
        "size": 1,
        "frozen": 2
      }
    ],
    "blocks": [
      {
        "id": "v146-52-pink-h",
        "color": "pink",
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
        ]
      },
      {
        "id": "v146-52-green-h1",
        "color": "green",
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
        ]
      },
      {
        "id": "v146-52-red-v2",
        "color": "red",
        "movementAxis": "vertical",
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
        ]
      },
      {
        "id": "v146-52-green-v1",
        "color": "green",
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
        ]
      },
      {
        "id": "v146-52-red-h",
        "color": "red",
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
        ]
      },
      {
        "id": "v146-52-cyan-square",
        "color": "cyan",
        "movementAxis": "vertical",
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
        ]
      },
      {
        "id": "v146-52-green-v2",
        "color": "green",
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
        ]
      },
      {
        "id": "v146-52-yellow-v",
        "color": "yellow",
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
        ]
      },
      {
        "id": "v146-52-red-square",
        "color": "red",
        "movementAxis": "vertical",
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
        ]
      },
      {
        "id": "v146-52-yellow-h1",
        "color": "yellow",
        "movementAxis": "horizontal",
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
          ]
        ]
      },
      {
        "id": "v146-52-cyan-h",
        "color": "cyan",
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
        ]
      },
      {
        "id": "v146-52-pink-square",
        "color": "pink",
        "movementAxis": "vertical",
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
        ]
      },
      {
        "id": "v146-52-yellow-h2",
        "color": "yellow",
        "movementAxis": "horizontal",
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
        ]
      },
      {
        "id": "v146-52-red-v1",
        "color": "red",
        "movementAxis": "vertical",
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
        ]
      },
      {
        "id": "v146-52-blue-v",
        "color": "blue",
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
        ]
      },
      {
        "id": "v146-52-red-single",
        "color": "red",
        "x": 2,
        "y": 6,
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "v146-52-blue-v2",
        "color": "blue",
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
        ]
      },
      {
        "id": "v146-52-blue-single",
        "color": "blue",
        "x": 0,
        "y": 7,
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "v146-52-green-h2",
        "color": "green",
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
        ]
      }
    ],
    "id": 52,
    "name": "折线换位 · 轴向可解种子",
    "difficulty": "super",
    "timeSeconds": 105,
    "reward": 125,
    "parMoves": 30,
    "preservedMoveTarget": 45
  },
  "53": {
    "mechanismRules": "revised-2026-09-23-v1.4",
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
    "gates": [
      {
        "id": "v146-53-gate-red",
        "color": "red",
        "side": "right",
        "offset": 2,
        "size": 3,
        "frozen": 3
      },
      {
        "id": "v146-53-gate-cyan",
        "color": "cyan",
        "side": "top",
        "offset": 2,
        "size": 3,
        "frozen": 5
      },
      {
        "id": "v146-53-gate-purple",
        "color": "purple",
        "side": "left",
        "offset": 2,
        "size": 3,
        "frozen": 8
      },
      {
        "id": "v146-53-gate-pink",
        "color": "pink",
        "side": "bottom",
        "offset": 1,
        "size": 3,
        "frozen": 6
      },
      {
        "id": "v146-53-gate-blue",
        "color": "blue",
        "side": "right",
        "offset": 0,
        "size": 2,
        "frozen": 1
      },
      {
        "id": "v146-53-gate-orange",
        "color": "orange",
        "side": "top",
        "offset": 0,
        "size": 2
      },
      {
        "id": "v146-53-gate-yellow",
        "color": "yellow",
        "side": "left",
        "offset": 0,
        "size": 2,
        "frozen": 7
      },
      {
        "id": "v146-53-gate-green",
        "color": "green",
        "side": "left",
        "offset": 5,
        "size": 1,
        "frozen": 8
      }
    ],
    "blocks": [
      {
        "id": "v146-53-orange-square",
        "color": "orange",
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
        ]
      },
      {
        "id": "v146-53-pink-v",
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
          ]
        ]
      },
      {
        "id": "v146-53-orange-shell",
        "color": "orange",
        "layers": [
          "orange",
          "pink"
        ],
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
        ]
      },
      {
        "id": "v146-53-cyan-single",
        "color": "cyan",
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
        "id": "v146-53-purple-single",
        "color": "purple",
        "x": 4,
        "y": 1,
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "v146-53-red-axis",
        "color": "red",
        "movementAxis": "horizontal",
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
        ]
      },
      {
        "id": "v146-53-blue-h",
        "color": "blue",
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
        ]
      },
      {
        "id": "v146-53-cyan-shell",
        "color": "cyan",
        "layers": [
          "cyan",
          "yellow"
        ],
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
        "id": "v146-53-purple-ice",
        "color": "purple",
        "frozen": 5,
        "movementAxis": "horizontal",
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
        ]
      },
      {
        "id": "v146-53-yellow-h",
        "color": "yellow",
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
        ]
      },
      {
        "id": "v146-53-blue-single",
        "color": "blue",
        "x": 3,
        "y": 4,
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "v146-53-cyan-axis",
        "color": "cyan",
        "movementAxis": "vertical",
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
        ]
      },
      {
        "id": "v146-53-yellow-ice",
        "color": "yellow",
        "frozen": 7,
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
        ]
      },
      {
        "id": "v146-53-green-ice",
        "color": "green",
        "frozen": 7,
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
        ]
      }
    ],
    "id": 53,
    "name": "分区转运 · 轴向可解种子",
    "difficulty": "easy",
    "timeSeconds": 180,
    "reward": 130,
    "parMoves": 52,
    "preservedMoveTarget": 52
  },
  "54": {
    "mechanismRules": "revised-2026-09-23-v1.4",
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
        "id": "s54-gate-blue",
        "color": "blue",
        "side": "right",
        "offset": 5,
        "size": 2,
        "frozen": 3
      },
      {
        "id": "s54-gate-yellow",
        "color": "yellow",
        "side": "right",
        "offset": 3,
        "size": 2
      },
      {
        "id": "s54-gate-green",
        "color": "green",
        "side": "top",
        "offset": 3,
        "size": 3,
        "frozen": 6
      },
      {
        "id": "s54-gate-red",
        "color": "red",
        "side": "bottom",
        "offset": 4,
        "size": 1,
        "frozen": 10
      },
      {
        "id": "s54-gate-purple",
        "color": "purple",
        "side": "left",
        "offset": 0,
        "size": 3,
        "frozen": 14
      },
      {
        "id": "s54-gate-cyan",
        "color": "cyan",
        "side": "top",
        "offset": 0,
        "size": 3,
        "frozen": 22
      }
    ],
    "blocks": [
      {
        "id": "s54-o-yellow-square",
        "color": "yellow",
        "x": 5,
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
        ]
      },
      {
        "id": "s54-o-blue-ice",
        "color": "blue",
        "frozen": 2,
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
          ]
        ]
      },
      {
        "id": "s54-o-blue",
        "color": "blue",
        "x": 3,
        "y": 3,
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "s54-o-red-ice",
        "color": "red",
        "frozen": 3,
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
        ]
      },
      {
        "id": "s54-o-yellow2",
        "color": "yellow",
        "x": 3,
        "y": 4,
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "s54-o-green",
        "color": "green",
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
        "id": "s54-o-red",
        "color": "red",
        "x": 5,
        "y": 5,
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "s54-o-purple",
        "color": "purple",
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
        ]
      },
      {
        "id": "s54-o-yellow1",
        "color": "yellow",
        "x": 5,
        "y": 6,
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "s54-5-purple",
        "color": "purple",
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
        "shutterId": "s54-cover5"
      },
      {
        "id": "s54-5-green",
        "color": "green",
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
        "shutterId": "s54-cover5"
      },
      {
        "id": "s54-5-cyan",
        "color": "cyan",
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
        "shutterId": "s54-cover5"
      },
      {
        "id": "s54-5-yellow",
        "color": "yellow",
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
        "shutterId": "s54-cover5"
      },
      {
        "id": "s54-8-green",
        "color": "green",
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
          ],
          [
            0,
            2
          ]
        ],
        "shutterId": "s54-cover8"
      },
      {
        "id": "s54-8-blue",
        "color": "blue",
        "layers": [
          "blue",
          "cyan"
        ],
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
        "shutterId": "s54-cover8"
      },
      {
        "id": "s54-8-purple",
        "color": "purple",
        "layers": [
          "purple",
          "cyan"
        ],
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
        "shutterId": "s54-cover8"
      },
      {
        "id": "s54-8-yellow",
        "color": "yellow",
        "frozen": 2,
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
          ]
        ],
        "shutterId": "s54-cover8"
      },
      {
        "id": "s54-13-blue-axis",
        "color": "blue",
        "frozen": 7,
        "movementAxis": "horizontal",
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
            1,
            1
          ]
        ],
        "shutterId": "s54-cover13"
      },
      {
        "id": "s54-13-yellow",
        "color": "yellow",
        "layers": [
          "yellow",
          "cyan"
        ],
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
        "shutterId": "s54-cover13"
      },
      {
        "id": "s54-13-purple",
        "color": "purple",
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
        "shutterId": "s54-cover13"
      },
      {
        "id": "s54-13-purple-shell",
        "color": "purple",
        "layers": [
          "purple",
          "cyan"
        ],
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
        "shutterId": "s54-cover13"
      },
      {
        "id": "s54-13-cyan",
        "color": "cyan",
        "frozen": 4,
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
        "shutterId": "s54-cover13"
      },
      {
        "id": "s54-13-red-single",
        "color": "red",
        "frozen": 9,
        "x": 1,
        "y": 3,
        "shape": [
          [
            0,
            0
          ]
        ],
        "shutterId": "s54-cover13"
      },
      {
        "id": "s54-13-green",
        "color": "green",
        "layers": [
          "green",
          "cyan"
        ],
        "frozen": 4,
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
        "shutterId": "s54-cover13"
      },
      {
        "id": "s54-13-red",
        "color": "red",
        "frozen": 7,
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
        "shutterId": "s54-cover13"
      },
      {
        "id": "s54-21-green",
        "x": 0,
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
          ],
          [
            1,
            2
          ]
        ],
        "color": "green",
        "shutterId": "s54-cover21"
      },
      {
        "id": "s54-fill-0",
        "x": 0,
        "y": 7,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "red",
        "shutterId": "s54-cover21"
      },
      {
        "id": "s54-fill-1",
        "x": 2,
        "y": 7,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "yellow",
        "shutterId": "s54-cover21"
      },
      {
        "id": "s54-fill-2",
        "x": 0,
        "y": 9,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "purple",
        "shutterId": "s54-cover21"
      },
      {
        "id": "s54-fill-3",
        "x": 2,
        "y": 9,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "blue",
        "shutterId": "s54-cover21"
      }
    ],
    "shutters": [
      {
        "id": "s54-cover5",
        "x": 3,
        "y": 0,
        "width": 4,
        "height": 3,
        "count": 5
      },
      {
        "id": "s54-cover8",
        "x": 3,
        "y": 7,
        "width": 4,
        "height": 3,
        "count": 8
      },
      {
        "id": "s54-cover13",
        "x": 0,
        "y": 0,
        "width": 3,
        "height": 7,
        "count": 13
      },
      {
        "id": "s54-cover21",
        "x": 0,
        "y": 7,
        "width": 3,
        "height": 3,
        "count": 21
      }
    ],
    "id": 54,
    "name": "换色禁区",
    "difficulty": "normal",
    "timeSeconds": 180,
    "reward": 135,
    "parMoves": 37,
    "preservedMoveTarget": 48
  },
  "55": {
    "mechanismRules": "revised-2026-09-23-v1.4",
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
    "gates": [
      {
        "id": "s55-blue",
        "color": "blue",
        "side": "left",
        "size": 1,
        "offset": 0,
        "frozen": 2
      },
      {
        "id": "s55-yellow",
        "color": "yellow",
        "side": "bottom",
        "size": 3,
        "offset": 3,
        "frozen": 8
      },
      {
        "id": "s55-red",
        "color": "red",
        "side": "left",
        "size": 1,
        "offset": 4
      },
      {
        "id": "s55-green",
        "color": "green",
        "side": "top",
        "size": 3,
        "offset": 0
      },
      {
        "id": "s55-pink",
        "color": "pink",
        "side": "right",
        "size": 2,
        "offset": 6,
        "frozen": 8
      },
      {
        "id": "s55-cyan",
        "color": "cyan",
        "side": "left",
        "size": 1,
        "offset": 5,
        "frozen": 8
      },
      {
        "id": "s55-purple",
        "color": "purple",
        "side": "top",
        "size": 3,
        "offset": 3,
        "frozen": 8
      }
    ],
    "blocks": [
      {
        "id": "s55-b2",
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
        "color": "blue",
        "movementAxis": "horizontal"
      },
      {
        "id": "s55-g2",
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
        "id": "s55-p1",
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
        "color": "purple",
        "frozen": 5
      },
      {
        "id": "s55-c1",
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
        "color": "cyan"
      },
      {
        "id": "s55-y1",
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
        "movementAxis": "vertical",
        "frozen": 5
      },
      {
        "id": "s55-r2",
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
        "color": "red"
      },
      {
        "id": "s55-b1",
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
        "id": "s55-b3",
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
        "color": "blue"
      },
      {
        "id": "s55-g3",
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
        "id": "s55-r3",
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
        "id": "s55-y2",
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
        "color": "yellow",
        "movementAxis": "vertical",
        "frozen": 5
      },
      {
        "id": "s55-g1",
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
        "color": "green",
        "frozen": 5
      },
      {
        "id": "s55-r1",
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
        "color": "red",
        "movementAxis": "horizontal"
      },
      {
        "id": "s55-p2",
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
        "color": "purple"
      },
      {
        "id": "s55-y3",
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
        "id": "s55-c2",
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
        "color": "cyan"
      },
      {
        "id": "s55-p3",
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
        "color": "purple",
        "shutterId": "s55-cover"
      },
      {
        "id": "s55-pink1",
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
        "color": "pink",
        "movementAxis": "horizontal",
        "shutterId": "s55-cover"
      },
      {
        "id": "s55-g4",
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
          ]
        ],
        "color": "green",
        "shutterId": "s55-cover"
      },
      {
        "id": "s55-b4",
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
        "color": "blue",
        "shutterId": "s55-cover"
      }
    ],
    "shutters": [
      {
        "id": "s55-cover",
        "x": 0,
        "y": 6,
        "width": 7,
        "height": 2,
        "count": 8
      }
    ],
    "id": 55,
    "name": "光谱休整 · 轴向可解种子",
    "difficulty": "normal",
    "timeSeconds": 180,
    "reward": 140,
    "parMoves": 25,
    "preservedMoveTarget": 34
  },
  "56": {
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
        "id": "s56-green",
        "color": "green",
        "side": "right",
        "size": 2,
        "offset": 1,
        "frozen": 9
      },
      {
        "id": "s56-cyan",
        "color": "cyan",
        "side": "right",
        "size": 2,
        "offset": 5,
        "frozen": 10
      },
      {
        "id": "s56-purple",
        "color": "purple",
        "side": "left",
        "size": 2,
        "offset": 6,
        "frozen": 6
      },
      {
        "id": "s56-red",
        "color": "red",
        "side": "top",
        "size": 2,
        "offset": 4,
        "frozen": 10
      },
      {
        "id": "s56-orange",
        "color": "orange",
        "side": "left",
        "size": 2,
        "offset": 0
      },
      {
        "id": "s56-pink",
        "color": "pink",
        "side": "bottom",
        "size": 3,
        "offset": 2,
        "frozen": 2
      },
      {
        "id": "s56-yellow",
        "color": "yellow",
        "side": "right",
        "size": 1,
        "offset": 3,
        "frozen": 7
      },
      {
        "id": "s56-blue",
        "color": "blue",
        "side": "left",
        "size": 2,
        "offset": 3,
        "frozen": 1
      }
    ],
    "blocks": [
      {
        "id": "s56-o1",
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
        "id": "s56-o2",
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
        "color": "orange",
        "movementAxis": "horizontal"
      },
      {
        "id": "s56-r3",
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
        "color": "red",
        "movementAxis": "vertical"
      },
      {
        "id": "s56-r4",
        "x": 4,
        "y": 0,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "red"
      },
      {
        "id": "s56-pink1",
        "x": 2,
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
        "id": "s56-pink4",
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
      },
      {
        "id": "s56-b3",
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
        "color": "blue"
      },
      {
        "id": "s56-r1",
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
        "id": "s56-pink3",
        "x": 3,
        "y": 6,
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
        "color": "pink",
        "frozen": 5
      },
      {
        "id": "s56-c1",
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
          ]
        ],
        "color": "cyan",
        "movementAxis": "horizontal"
      },
      {
        "id": "s56-p1",
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
            1,
            1
          ]
        ],
        "color": "purple"
      },
      {
        "id": "s56-pink2",
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
        "id": "s56-g2",
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
        "color": "green"
      },
      {
        "id": "s56-b1",
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
        "color": "blue"
      },
      {
        "id": "s56-r2",
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
        "id": "s56-p2",
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
        "color": "purple"
      },
      {
        "id": "s56-g1",
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
        "color": "green",
        "frozen": 7
      },
      {
        "id": "s56-b2",
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
        "id": "s56-q0",
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
        "color": "purple"
      },
      {
        "id": "s56-q1",
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
        "color": "green"
      },
      {
        "id": "s56-q2",
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
      }
    ],
    "generators": [
      {
        "id": "s56-machine",
        "side": "top",
        "offset": 1,
        "rimMount": "rim",
        "rimSpan": 3,
        "spawn": [
          1,
          0
        ],
        "queueBlockIds": [
          "s56-q0",
          "s56-q1",
          "s56-q2"
        ]
      }
    ],
    "id": 56,
    "name": "批次接力 · 轴向可解种子",
    "difficulty": "hard",
    "timeSeconds": 135,
    "reward": 145,
    "parMoves": 33,
    "preservedMoveTarget": 40
  },
  "57": {
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
        "id": "s57-green",
        "color": "green",
        "side": "top",
        "offset": 5,
        "size": 2
      },
      {
        "id": "s57-purple",
        "color": "purple",
        "side": "left",
        "offset": 0,
        "size": 2,
        "frozen": 3
      },
      {
        "id": "s57-yellow",
        "color": "yellow",
        "side": "right",
        "offset": 0,
        "size": 2,
        "frozen": 5
      },
      {
        "id": "s57-cyan",
        "color": "cyan",
        "side": "right",
        "offset": 2,
        "size": 2,
        "frozen": 1
      },
      {
        "id": "s57-orange",
        "color": "orange",
        "side": "left",
        "offset": 6,
        "size": 3,
        "frozen": 11
      },
      {
        "id": "s57-pink",
        "color": "pink",
        "side": "bottom",
        "offset": 0,
        "size": 2,
        "frozen": 11
      },
      {
        "id": "s57-red",
        "color": "red",
        "side": "bottom",
        "offset": 2,
        "size": 3,
        "frozen": 11
      },
      {
        "id": "s57-blue",
        "color": "blue",
        "side": "bottom",
        "offset": 5,
        "size": 2,
        "frozen": 11
      }
    ],
    "blocks": [
      {
        "id": "s57-open-g",
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
        "color": "green"
      },
      {
        "id": "s57-open-c1",
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
        "color": "cyan"
      },
      {
        "id": "s57-open-c3",
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
        "color": "cyan"
      },
      {
        "id": "s57-open-y2",
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
        "color": "yellow"
      },
      {
        "id": "s57-open-c2",
        "x": 4,
        "y": 3,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "cyan"
      },
      {
        "id": "s57-open-y1",
        "x": 5,
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
        "id": "s57-added1",
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
        "id": "s57-open-ice",
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
        "color": "cyan",
        "frozen": 3
      },
      {
        "id": "s57-open-p",
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
          ]
        ],
        "color": "purple"
      },
      {
        "id": "s57-a-ice",
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
        "frozen": 4,
        "shutterId": "s57-a"
      },
      {
        "id": "s57-a-y",
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
        "color": "yellow",
        "shutterId": "s57-a"
      },
      {
        "id": "s57-a-b2",
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
        "color": "blue",
        "shutterId": "s57-a"
      },
      {
        "id": "s57-a-g1",
        "x": 4,
        "y": 0,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "green",
        "shutterId": "s57-a"
      },
      {
        "id": "s57-a-g2",
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
        "color": "green",
        "shutterId": "s57-a"
      },
      {
        "id": "s57-a-r",
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
        "color": "red",
        "shutterId": "s57-a"
      },
      {
        "id": "s57-a-b1",
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
        "color": "blue",
        "shutterId": "s57-a"
      },
      {
        "id": "s57-b-r1",
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
        "color": "red",
        "shutterId": "s57-b"
      },
      {
        "id": "s57-b-y",
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
        "color": "yellow",
        "shutterId": "s57-b"
      },
      {
        "id": "s57-b-c",
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
        "shutterId": "s57-b"
      },
      {
        "id": "s57-b-o",
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
        "color": "orange",
        "movementAxis": "horizontal",
        "shutterId": "s57-b"
      },
      {
        "id": "s57-b-blue",
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
            0,
            1
          ],
          [
            1,
            1
          ]
        ],
        "color": "blue",
        "shutterId": "s57-b"
      },
      {
        "id": "s57-b-p",
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
          ]
        ],
        "color": "purple",
        "shutterId": "s57-b"
      },
      {
        "id": "s57-b-r2",
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
          ]
        ],
        "color": "red",
        "shutterId": "s57-b"
      },
      {
        "id": "s57-q0",
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
        "id": "s57-q1",
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
        "color": "blue"
      },
      {
        "id": "s57-q2",
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
          ]
        ],
        "color": "pink"
      }
    ],
    "shutters": [
      {
        "id": "s57-a",
        "x": 0,
        "y": 0,
        "width": 5,
        "height": 3,
        "count": 6
      },
      {
        "id": "s57-b",
        "x": 0,
        "y": 5,
        "width": 7,
        "height": 4,
        "count": 12
      }
    ],
    "generators": [
      {
        "id": "s57-machine",
        "side": "top",
        "offset": 2,
        "rimMount": "rim",
        "rimSpan": 3,
        "spawn": [
          2,
          0
        ],
        "queueBlockIds": [
          "s57-q0",
          "s57-q1",
          "s57-q2"
        ]
      }
    ],
    "id": 57,
    "name": "棱镜冰锁",
    "difficulty": "easy",
    "timeSeconds": 100,
    "reward": 150,
    "parMoves": 37,
    "preservedMoveTarget": 37
  },
  "58": {
    "mechanismRules": "revised-2026-09-23-v1.4",
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
      ]
    ],
    "gates": [
      {
        "id": "r147-r58-gate-yellow",
        "color": "yellow",
        "side": "top",
        "offset": 0,
        "size": 3
      },
      {
        "id": "r147-r58-gate-pink",
        "color": "pink",
        "side": "left",
        "offset": 1,
        "size": 1,
        "frozen": 1
      },
      {
        "id": "r147-r58-gate-purple",
        "color": "purple",
        "side": "top",
        "offset": 3,
        "size": 3,
        "frozen": 2
      },
      {
        "id": "r147-r58-gate-blue",
        "color": "blue",
        "side": "right",
        "offset": 3,
        "size": 3,
        "frozen": 7
      },
      {
        "id": "r147-r58-gate-cyan",
        "color": "cyan",
        "side": "right",
        "offset": 0,
        "size": 3,
        "frozen": 4
      },
      {
        "id": "r147-r58-gate-red",
        "color": "red",
        "side": "bottom",
        "offset": 3,
        "size": 2,
        "frozen": 16
      },
      {
        "id": "r147-r58-gate-green",
        "color": "green",
        "side": "right",
        "offset": 6,
        "size": 1,
        "frozen": 14
      }
    ],
    "blocks": [
      {
        "id": "r147-r58-o02",
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
        "id": "r147-r58-o04",
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
        "color": "blue"
      },
      {
        "id": "r147-r58-o01",
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
        "id": "r147-r58-o03",
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
        "color": "pink"
      },
      {
        "id": "r147-r58-o06",
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
        "id": "r147-r58-i03",
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
        "color": "yellow",
        "frozen": 3,
        "layers": [
          "yellow",
          "blue"
        ]
      },
      {
        "id": "r147-r58-i12b",
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
        "color": "blue",
        "frozen": 12
      },
      {
        "id": "r147-r58-fill1",
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
        "color": "cyan"
      },
      {
        "id": "r147-r58-i12c",
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
        "color": "red",
        "frozen": 12,
        "layers": [
          "red",
          "blue"
        ]
      },
      {
        "id": "r147-r58-o09",
        "x": 4,
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
        "id": "r147-r58-i12a",
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
        "color": "cyan",
        "frozen": 12
      },
      {
        "id": "r147-r58-i05b",
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
        "color": "green",
        "frozen": 5
      },
      {
        "id": "r147-r58-o07",
        "x": 2,
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
        "id": "r147-r58-i05a",
        "x": 5,
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
        "frozen": 5
      },
      {
        "id": "r147-r58-o08",
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
        "id": "r147-r58-o05",
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
        "id": "r147-r58-fill0",
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
        "id": "r147-r58-o10",
        "x": 0,
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
        "id": "r147-r58-i07",
        "x": 0,
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
        "color": "cyan",
        "frozen": 7
      },
      {
        "id": "r147-r58-i09",
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
        "color": "yellow",
        "frozen": 9
      },
      {
        "id": "r147-r58-q01",
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
        "id": "r147-r58-q02",
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
        "color": "cyan"
      },
      {
        "id": "r147-r58-q03",
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
        "color": "red"
      },
      {
        "id": "r147-r58-q04",
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
        "id": "r147-r58-q05",
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
      }
    ],
    "id": 58,
    "name": "三向换色",
    "difficulty": "normal",
    "timeSeconds": 125,
    "reward": 155,
    "parMoves": 38,
    "preservedMoveTarget": 41,
    "generators": [
      {
        "id": "r147-r58-generator",
        "side": "left",
        "offset": 5,
        "spawn": [
          0,
          5
        ],
        "rimMount": "rim",
        "rimSpan": 3,
        "queueBlockIds": [
          "r147-r58-q01",
          "r147-r58-q02",
          "r147-r58-q03",
          "r147-r58-q04",
          "r147-r58-q05"
        ]
      }
    ]
  },
  "59": {
    "mechanismRules": "revised-2026-09-23-v1.4",
    "width": 7,
    "height": 11,
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
        1,
        10
      ],
      [
        2,
        10
      ],
      [
        3,
        10
      ],
      [
        4,
        10
      ],
      [
        5,
        10
      ]
    ],
    "gates": [
      {
        "id": "v146-59-gate-blue",
        "color": "blue",
        "side": "right",
        "offset": 1,
        "size": 3
      },
      {
        "id": "v146-59-gate-pink",
        "color": "pink",
        "side": "left",
        "offset": 3,
        "size": 3,
        "frozen": 4
      },
      {
        "id": "v146-59-gate-yellow",
        "color": "yellow",
        "side": "right",
        "offset": 7,
        "size": 2,
        "frozen": 6
      },
      {
        "id": "v146-59-gate-green",
        "color": "green",
        "side": "top",
        "offset": 0,
        "size": 3,
        "frozen": 13
      },
      {
        "id": "v146-59-gate-red",
        "color": "red",
        "side": "right",
        "offset": 4,
        "size": 2,
        "frozen": 12
      },
      {
        "id": "v146-59-gate-purple",
        "color": "purple",
        "side": "top",
        "offset": 4,
        "size": 3,
        "frozen": 14
      },
      {
        "id": "v146-59-gate-orange",
        "color": "orange",
        "side": "bottom",
        "offset": 2,
        "size": 3,
        "frozen": 14
      }
    ],
    "blocks": [
      {
        "id": "v146-59-c6-pink-large",
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
        "color": "pink",
        "shutterId": "v146-59-cover6"
      },
      {
        "id": "v146-59-c6-purple",
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
        "shutterId": "v146-59-cover6"
      },
      {
        "id": "v146-59-c6-red-lock",
        "x": 2,
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
        "color": "red",
        "shutterId": "v146-59-cover6"
      },
      {
        "id": "v146-59-c6-pink-single",
        "x": 4,
        "y": 2,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "pink",
        "shutterId": "v146-59-cover6"
      },
      {
        "id": "v146-59-c6-red-key",
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
        "color": "red",
        "shutterId": "v146-59-cover6"
      },
      {
        "id": "v146-59-c12-yellow-lock",
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
            0,
            1
          ],
          [
            1,
            1
          ]
        ],
        "color": "yellow",
        "shutterId": "v146-59-cover12"
      },
      {
        "id": "v146-59-c12-blue",
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
            0,
            1
          ],
          [
            1,
            1
          ]
        ],
        "color": "blue",
        "shutterId": "v146-59-cover12"
      },
      {
        "id": "v146-59-c12-blue-key",
        "x": 1,
        "y": 10,
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
        "shutterId": "v146-59-cover12"
      },
      {
        "id": "v146-59-c12-yellow",
        "x": 3,
        "y": 10,
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
        "shutterId": "v146-59-cover12"
      },
      {
        "id": "v146-59-o02",
        "x": 5,
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
        "id": "v146-59-o03",
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
        "color": "pink"
      },
      {
        "id": "v146-59-o04",
        "x": 6,
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
        "id": "v146-59-o07",
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
          ]
        ],
        "color": "blue"
      },
      {
        "id": "v146-59-o10",
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
        "color": "blue"
      },
      {
        "id": "v146-59-o14",
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
        "color": "blue",
        "layers": [
          "blue",
          "yellow"
        ]
      },
      {
        "id": "v146-59-o16",
        "x": 5,
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
        "id": "v146-59-fill3",
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
        "id": "v146-59-o15",
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
        "color": "pink"
      },
      {
        "id": "v146-59-o08",
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
        "id": "v146-59-o11",
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
        "color": "red"
      },
      {
        "id": "v146-59-fill2",
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
        "color": "orange"
      },
      {
        "id": "v146-59-o01",
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
        "id": "v146-59-fill0",
        "x": 2,
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
        "id": "v146-59-o13",
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
        "color": "green"
      },
      {
        "id": "v146-59-fill4",
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
        "color": "pink"
      },
      {
        "id": "v146-59-o09",
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
        "color": "red"
      },
      {
        "id": "v146-59-o12",
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
        "color": "yellow"
      },
      {
        "id": "v146-59-o05",
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
          ]
        ],
        "color": "purple"
      },
      {
        "id": "v146-59-o06",
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
          ]
        ],
        "color": "yellow"
      },
      {
        "id": "v146-59-fill1",
        "x": 5,
        "y": 9,
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
      }
    ],
    "id": 59,
    "name": "棱镜迷舱",
    "difficulty": "hard",
    "timeSeconds": 180,
    "reward": 160,
    "parMoves": 41,
    "preservedMoveTarget": 51,
    "shutters": [
      {
        "id": "v146-59-cover6",
        "x": 0,
        "y": 0,
        "width": 5,
        "height": 4,
        "count": 6
      },
      {
        "id": "v146-59-cover12",
        "x": 1,
        "y": 8,
        "width": 4,
        "height": 3,
        "count": 12
      }
    ]
  },
  "60": {
    "mechanismRules": "revised-2026-09-23-v1.4",
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
    "gates": [
      {
        "id": "v147-60-gate-pink",
        "color": "pink",
        "side": "right",
        "offset": 6,
        "size": 1
      },
      {
        "id": "v147-60-gate-yellow",
        "color": "yellow",
        "side": "bottom",
        "offset": 2,
        "size": 3
      },
      {
        "id": "v147-60-gate-blue",
        "color": "blue",
        "side": "left",
        "offset": 3,
        "size": 3
      },
      {
        "id": "v147-60-gate-red",
        "color": "red",
        "side": "right",
        "offset": 0,
        "size": 3
      },
      {
        "id": "v147-60-gate-green",
        "color": "green",
        "side": "bottom",
        "offset": 0,
        "size": 2
      }
    ],
    "blocks": [
      {
        "id": "v147-60-cell-0-0",
        "x": 0,
        "y": 0,
        "color": "green",
        "shape": [
          [
            0,
            0
          ]
        ],
        "movementAxis": "vertical"
      },
      {
        "id": "v147-60-cell-1-0",
        "x": 1,
        "y": 0,
        "color": "red",
        "shape": [
          [
            0,
            0
          ]
        ],
        "movementAxis": "horizontal",
        "keyId": "intro-key"
      },
      {
        "id": "v147-60-cell-2-0",
        "x": 2,
        "y": 0,
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ]
        ],
        "movementAxis": "vertical"
      },
      {
        "id": "v147-60-cell-3-0",
        "x": 3,
        "y": 0,
        "color": "red",
        "shape": [
          [
            0,
            0
          ]
        ],
        "movementAxis": "horizontal"
      },
      {
        "id": "v147-60-cell-4-0",
        "x": 4,
        "y": 0,
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ]
        ],
        "movementAxis": "vertical"
      },
      {
        "id": "v147-60-cell-0-1",
        "x": 0,
        "y": 1,
        "color": "red",
        "shape": [
          [
            0,
            0
          ]
        ],
        "movementAxis": "horizontal"
      },
      {
        "id": "v147-60-cell-1-1",
        "x": 1,
        "y": 1,
        "color": "green",
        "shape": [
          [
            0,
            0
          ]
        ],
        "movementAxis": "vertical"
      },
      {
        "id": "v147-60-cell-2-1",
        "x": 2,
        "y": 1,
        "color": "red",
        "shape": [
          [
            0,
            0
          ]
        ],
        "movementAxis": "horizontal"
      },
      {
        "id": "v147-60-cell-3-1",
        "x": 3,
        "y": 1,
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ]
        ],
        "movementAxis": "vertical"
      },
      {
        "id": "v147-60-cell-4-1",
        "x": 4,
        "y": 1,
        "color": "red",
        "shape": [
          [
            0,
            0
          ]
        ],
        "movementAxis": "horizontal"
      },
      {
        "id": "v147-60-cell-0-2",
        "x": 0,
        "y": 2,
        "color": "green",
        "shape": [
          [
            0,
            0
          ]
        ],
        "movementAxis": "vertical"
      },
      {
        "id": "v147-60-cell-1-2",
        "x": 1,
        "y": 2,
        "color": "red",
        "shape": [
          [
            0,
            0
          ]
        ],
        "movementAxis": "horizontal"
      },
      {
        "id": "v147-60-cell-2-2",
        "x": 2,
        "y": 2,
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ]
        ],
        "movementAxis": "vertical"
      },
      {
        "id": "v147-60-cell-3-2",
        "x": 3,
        "y": 2,
        "color": "red",
        "shape": [
          [
            0,
            0
          ]
        ],
        "movementAxis": "horizontal"
      },
      {
        "id": "v147-60-cell-4-2",
        "x": 4,
        "y": 2,
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ]
        ],
        "movementAxis": "vertical"
      },
      {
        "id": "v147-60-cell-0-3",
        "x": 0,
        "y": 3,
        "color": "blue",
        "shape": [
          [
            0,
            0
          ]
        ],
        "movementAxis": "horizontal"
      },
      {
        "id": "v147-60-cell-1-3",
        "x": 1,
        "y": 3,
        "color": "green",
        "shape": [
          [
            0,
            0
          ]
        ],
        "movementAxis": "vertical"
      },
      {
        "id": "v147-60-cell-2-3",
        "x": 2,
        "y": 3,
        "color": "blue",
        "shape": [
          [
            0,
            0
          ]
        ],
        "movementAxis": "horizontal"
      },
      {
        "id": "v147-60-cell-3-3",
        "x": 3,
        "y": 3,
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ]
        ],
        "movementAxis": "vertical"
      },
      {
        "id": "v147-60-cell-4-3",
        "x": 4,
        "y": 3,
        "color": "blue",
        "shape": [
          [
            0,
            0
          ]
        ],
        "movementAxis": "horizontal"
      },
      {
        "id": "v147-60-cell-0-4",
        "x": 0,
        "y": 4,
        "color": "green",
        "shape": [
          [
            0,
            0
          ]
        ],
        "movementAxis": "vertical"
      },
      {
        "id": "v147-60-cell-1-4",
        "x": 1,
        "y": 4,
        "color": "blue",
        "shape": [
          [
            0,
            0
          ]
        ],
        "movementAxis": "horizontal"
      },
      {
        "id": "v147-60-cell-2-4",
        "x": 2,
        "y": 4,
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ]
        ],
        "movementAxis": "vertical"
      },
      {
        "id": "v147-60-cell-3-4",
        "x": 3,
        "y": 4,
        "color": "blue",
        "shape": [
          [
            0,
            0
          ]
        ],
        "movementAxis": "horizontal"
      },
      {
        "id": "v147-60-cell-4-4",
        "x": 4,
        "y": 4,
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ]
        ],
        "movementAxis": "vertical"
      },
      {
        "id": "v147-60-cell-0-5",
        "x": 0,
        "y": 5,
        "color": "blue",
        "shape": [
          [
            0,
            0
          ]
        ],
        "movementAxis": "horizontal"
      },
      {
        "id": "v147-60-cell-1-5",
        "x": 1,
        "y": 5,
        "color": "green",
        "shape": [
          [
            0,
            0
          ]
        ],
        "movementAxis": "vertical",
        "lockedBy": "intro-key",
        "lockCount": 1
      },
      {
        "id": "v147-60-cell-2-5",
        "x": 2,
        "y": 5,
        "color": "blue",
        "shape": [
          [
            0,
            0
          ]
        ],
        "movementAxis": "horizontal"
      },
      {
        "id": "v147-60-cell-3-5",
        "x": 3,
        "y": 5,
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ]
        ],
        "movementAxis": "vertical"
      },
      {
        "id": "v147-60-cell-4-5",
        "x": 4,
        "y": 5,
        "color": "blue",
        "shape": [
          [
            0,
            0
          ]
        ],
        "movementAxis": "horizontal"
      },
      {
        "id": "v147-60-cell-0-6",
        "x": 0,
        "y": 6,
        "color": "green",
        "shape": [
          [
            0,
            0
          ]
        ],
        "movementAxis": "vertical"
      },
      {
        "id": "v147-60-cell-1-6",
        "x": 1,
        "y": 6,
        "color": "pink",
        "shape": [
          [
            0,
            0
          ]
        ],
        "movementAxis": "horizontal"
      },
      {
        "id": "v147-60-cell-2-6",
        "x": 2,
        "y": 6,
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ]
        ],
        "movementAxis": "vertical"
      },
      {
        "id": "v147-60-cell-3-6",
        "x": 3,
        "y": 6,
        "color": "pink",
        "shape": [
          [
            0,
            0
          ]
        ],
        "movementAxis": "horizontal"
      },
      {
        "id": "v147-60-cell-4-6",
        "x": 4,
        "y": 6,
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ]
        ],
        "movementAxis": "vertical"
      }
    ],
    "id": 60,
    "name": "光谱核心 · 轴向可解种子",
    "difficulty": "easy",
    "timeSeconds": 90,
    "reward": 165,
    "parMoves": 52,
    "preservedMoveTarget": 52
  }
};
export const applyRemake51to60 = (level: LevelSpec): LevelSpec => reviewed[level.id] ?? level;
