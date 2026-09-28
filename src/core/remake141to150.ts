// Reviewed v1.73 designs; v1.74 accepts specified authored gate fields for144/150.
import type {LevelSpec} from './types';
export const REMADE_141_150_IDS: readonly number[] = [141,142,143,144,145,146,147,148,149,150];
const reviewed: Record<number,LevelSpec> = {
  "141": {
    "mechanismRules": "revised-2026-09-23-v1.4",
    "width": 8,
    "height": 12,
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
      ],
      [
        0,
        10
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
      ],
      [
        6,
        10
      ],
      [
        7,
        10
      ],
      [
        0,
        11
      ],
      [
        1,
        11
      ],
      [
        2,
        11
      ],
      [
        3,
        11
      ],
      [
        4,
        11
      ],
      [
        5,
        11
      ],
      [
        6,
        11
      ],
      [
        7,
        11
      ]
    ],
    "gates": [
      {
        "id": "s141-orange",
        "color": "orange",
        "side": "left",
        "offset": 9,
        "size": 3
      },
      {
        "id": "s141-green",
        "color": "green",
        "side": "bottom",
        "offset": 5,
        "size": 3,
        "frozen": 2
      },
      {
        "id": "s141-purple",
        "color": "purple",
        "side": "top",
        "offset": 3,
        "size": 3,
        "frozen": 1
      },
      {
        "id": "s141-cyan",
        "color": "cyan",
        "side": "right",
        "offset": 6,
        "size": 3,
        "frozen": 5
      },
      {
        "id": "s141-yellow",
        "color": "yellow",
        "side": "right",
        "offset": 9,
        "size": 3,
        "frozen": 8
      },
      {
        "id": "s141-red",
        "color": "red",
        "side": "right",
        "offset": 1,
        "size": 3,
        "frozen": 10
      },
      {
        "id": "s141-blue",
        "color": "blue",
        "side": "left",
        "offset": 1,
        "size": 3,
        "frozen": 16
      },
      {
        "id": "s141-pink",
        "color": "pink",
        "side": "top",
        "offset": 1,
        "size": 2,
        "frozen": 14
      }
    ],
    "blocks": [
      {
        "id": "s141-o8",
        "color": "pink",
        "shape": [
          [
            0,
            0
          ],
          [
            1,
            0
          ]
        ],
        "x": 1,
        "y": 0
      },
      {
        "id": "s141-o12",
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
        ],
        "x": 3,
        "y": 0
      },
      {
        "id": "s141-o11",
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ],
          [
            1,
            0
          ]
        ],
        "x": 5,
        "y": 0
      },
      {
        "id": "s141-o4",
        "color": "orange",
        "shape": [
          [
            0,
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
        "x": 0,
        "y": 6
      },
      {
        "id": "s141-o10",
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
        "x": 3,
        "y": 6
      },
      {
        "id": "s141-o5",
        "color": "orange",
        "shape": [
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
        "x": 6,
        "y": 6
      },
      {
        "id": "s141-o9",
        "color": "cyan",
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
        "keyId": "s141-red-key",
        "x": 0,
        "y": 7
      },
      {
        "id": "s141-o13",
        "color": "green",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 2,
        "y": 8
      },
      {
        "id": "s141-o7",
        "color": "cyan",
        "shape": [
          [
            0,
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
        "x": 3,
        "y": 8
      },
      {
        "id": "s141-o1",
        "color": "orange",
        "shape": [
          [
            0,
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
        "x": 0,
        "y": 9
      },
      {
        "id": "s141-o2",
        "color": "orange",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 4,
        "y": 9
      },
      {
        "id": "s141-o6",
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
        "x": 5,
        "y": 9
      },
      {
        "id": "s141-o3",
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
        "layers": [
          "blue",
          "purple"
        ],
        "lockedBy": "s141-red-key",
        "lockCount": 4,
        "x": 3,
        "y": 10
      },
      {
        "id": "s141-h11",
        "color": "orange",
        "shape": [
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
        "shutterId": "s141-curtain8",
        "x": 0,
        "y": 1
      },
      {
        "id": "s141-h4",
        "color": "orange",
        "shape": [
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
        "layers": [
          "orange",
          "cyan"
        ],
        "shutterId": "s141-curtain8",
        "x": 2,
        "y": 1
      },
      {
        "id": "s141-h12",
        "color": "orange",
        "shape": [
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
        "shutterId": "s141-curtain8",
        "x": 4,
        "y": 1
      },
      {
        "id": "s141-h7",
        "color": "orange",
        "shape": [
          [
            0,
            0
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
        "shutterId": "s141-curtain8",
        "x": 5,
        "y": 1
      },
      {
        "id": "s141-h13",
        "color": "orange",
        "shape": [
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
        "layers": [
          "orange",
          "purple"
        ],
        "shutterId": "s141-curtain8",
        "x": 6,
        "y": 2
      },
      {
        "id": "s141-h2",
        "color": "orange",
        "shape": [
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
        "shutterId": "s141-curtain8",
        "x": 0,
        "y": 3
      },
      {
        "id": "s141-h10",
        "color": "orange",
        "shape": [
          [
            0,
            0
          ],
          [
            1,
            0
          ]
        ],
        "shutterId": "s141-curtain8",
        "x": 1,
        "y": 3
      },
      {
        "id": "s141-h8",
        "color": "orange",
        "shape": [
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
        "keyId": "s141-red-key",
        "shutterId": "s141-curtain8",
        "x": 3,
        "y": 3
      },
      {
        "id": "s141-h6",
        "color": "orange",
        "shape": [
          [
            0,
            0
          ],
          [
            1,
            0
          ]
        ],
        "keyId": "s141-red-key",
        "shutterId": "s141-curtain8",
        "x": 4,
        "y": 3
      },
      {
        "id": "s141-h9",
        "color": "orange",
        "shape": [
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
        "shutterId": "s141-curtain8",
        "x": 2,
        "y": 4
      },
      {
        "id": "s141-h5",
        "color": "orange",
        "shape": [
          [
            0,
            0
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
        "shutterId": "s141-curtain8",
        "x": 5,
        "y": 4
      },
      {
        "id": "s141-h14",
        "color": "orange",
        "shape": [
          [
            0,
            0
          ],
          [
            1,
            0
          ]
        ],
        "shutterId": "s141-curtain8",
        "x": 0,
        "y": 5
      },
      {
        "id": "s141-h1",
        "color": "orange",
        "shape": [
          [
            0,
            0
          ],
          [
            1,
            0
          ]
        ],
        "keyId": "s141-red-key",
        "shutterId": "s141-curtain8",
        "x": 4,
        "y": 5
      },
      {
        "id": "s141-h3",
        "color": "orange",
        "shape": [
          [
            0,
            0
          ],
          [
            1,
            0
          ]
        ],
        "shutterId": "s141-curtain8",
        "x": 6,
        "y": 5
      },
      {
        "id": "s141-lift-next1",
        "color": "cyan",
        "shape": [
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
        "shutterId": "s141-lift",
        "x": 0,
        "y": 1
      },
      {
        "id": "s141-lift-next2",
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
        ],
        "shutterId": "s141-lift",
        "x": 2,
        "y": 1
      },
      {
        "id": "s141-lift-next3",
        "color": "orange",
        "shape": [
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
        "shutterId": "s141-lift",
        "x": 3,
        "y": 1
      },
      {
        "id": "s141-lift-next4",
        "color": "cyan",
        "shape": [
          [
            0,
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
        "shutterId": "s141-lift",
        "x": 5,
        "y": 1
      },
      {
        "id": "s141-lift-next5",
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
        "shutterId": "s141-lift",
        "x": 0,
        "y": 3
      },
      {
        "id": "s141-lift-next6",
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
        "shutterId": "s141-lift",
        "x": 2,
        "y": 3
      },
      {
        "id": "s141-lift-next7",
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
        ],
        "shutterId": "s141-lift",
        "x": 3,
        "y": 3
      },
      {
        "id": "s141-lift-next8",
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
        ],
        "shutterId": "s141-lift",
        "x": 5,
        "y": 3
      },
      {
        "id": "s141-lift-next9",
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
        ],
        "shutterId": "s141-lift",
        "x": 6,
        "y": 2
      },
      {
        "id": "s141-lift-next10",
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
        ],
        "shutterId": "s141-lift",
        "x": 6,
        "y": 4
      }
    ],
    "shutters": [
      {
        "id": "s141-curtain8",
        "x": 0,
        "y": 1,
        "width": 8,
        "height": 5,
        "count": 8
      },
      {
        "id": "s141-lift",
        "x": 0,
        "y": 1,
        "width": 8,
        "height": 4,
        "count": 1,
        "skin": "lift"
      }
    ],
    "id": 141,
    "name": "竞品映射 Lv141",
    "difficulty": "easy",
    "timeSeconds": 180,
    "reward": 200,
    "parMoves": 58,
    "preservedMoveTarget": 48
  },
  "142": {
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
        "id": "r146-142-yellow",
        "color": "yellow",
        "side": "left",
        "offset": 2,
        "size": 3
      },
      {
        "id": "r146-142-blue",
        "color": "blue",
        "side": "top",
        "offset": 0,
        "size": 3,
        "frozen": 3
      },
      {
        "id": "r146-142-red",
        "color": "red",
        "side": "top",
        "offset": 3,
        "size": 3,
        "frozen": 9
      },
      {
        "id": "r146-142-green",
        "color": "green",
        "side": "right",
        "offset": 1,
        "size": 3,
        "frozen": 12
      },
      {
        "id": "r146-142-purple",
        "color": "purple",
        "side": "bottom",
        "offset": 0,
        "size": 3,
        "frozen": 27
      },
      {
        "id": "r146-142-cyan",
        "color": "cyan",
        "side": "bottom",
        "offset": 3,
        "size": 3,
        "frozen": 33
      }
    ],
    "blocks": [
      {
        "id": "r146-142-o1",
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
        "color": "purple"
      },
      {
        "id": "r146-142-o7",
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
        "color": "red"
      },
      {
        "id": "r146-142-o11",
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
        "id": "r146-142-o8",
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
        "color": "red"
      },
      {
        "id": "r146-142-o3",
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
        "id": "r146-142-o10",
        "x": 3,
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
        "id": "r146-142-o5",
        "x": 1,
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
        "id": "r146-142-o6",
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
        "color": "blue",
        "layers": [
          "blue",
          "red"
        ]
      },
      {
        "id": "r146-142-o2",
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
        "id": "r146-142-o9",
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
        "id": "r146-142-o4",
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
        "color": "yellow"
      },
      {
        "id": "r146-142-o12",
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
        "color": "purple"
      },
      {
        "id": "r146-142-a1",
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
        "color": "blue",
        "shutterId": "r146-142-first",
        "timedBombSeconds": 30
      },
      {
        "id": "r146-142-a2",
        "x": 5,
        "y": 0,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "yellow",
        "shutterId": "r146-142-first"
      },
      {
        "id": "r146-142-a3",
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
        "color": "green",
        "shutterId": "r146-142-first",
        "layers": [
          "green",
          "yellow"
        ]
      },
      {
        "id": "r146-142-a4",
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
        "color": "green",
        "shutterId": "r146-142-first",
        "layers": [
          "green",
          "yellow"
        ]
      },
      {
        "id": "r146-142-a5",
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
        "color": "green",
        "shutterId": "r146-142-first"
      },
      {
        "id": "r146-142-b1",
        "x": 0,
        "y": 5,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "red",
        "shutterId": "r146-142-second",
        "layers": [
          "red",
          "cyan"
        ]
      },
      {
        "id": "r146-142-b2",
        "x": 1,
        "y": 5,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "red",
        "shutterId": "r146-142-second"
      },
      {
        "id": "r146-142-b3",
        "x": 2,
        "y": 5,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "blue",
        "shutterId": "r146-142-second"
      },
      {
        "id": "r146-142-b4",
        "x": 0,
        "y": 6,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "red",
        "shutterId": "r146-142-second"
      },
      {
        "id": "r146-142-b5",
        "x": 1,
        "y": 6,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "blue",
        "shutterId": "r146-142-second"
      },
      {
        "id": "r146-142-b6",
        "x": 2,
        "y": 6,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "yellow",
        "shutterId": "r146-142-second"
      },
      {
        "id": "r146-142-b7",
        "x": 0,
        "y": 7,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "yellow",
        "shutterId": "r146-142-second",
        "layers": [
          "yellow",
          "cyan"
        ]
      },
      {
        "id": "r146-142-b8",
        "x": 1,
        "y": 7,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "red",
        "shutterId": "r146-142-second"
      },
      {
        "id": "r146-142-b9",
        "x": 2,
        "y": 7,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "red",
        "shutterId": "r146-142-second"
      },
      {
        "id": "r146-142-c1",
        "x": 4,
        "y": 5,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "green",
        "shutterId": "r146-142-third"
      },
      {
        "id": "r146-142-c2",
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
        "color": "blue",
        "shutterId": "r146-142-third",
        "layers": [
          "blue",
          "purple"
        ]
      },
      {
        "id": "r146-142-c3",
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
        "color": "purple",
        "shutterId": "r146-142-third",
        "layers": [
          "purple",
          "blue"
        ]
      },
      {
        "id": "r146-142-c4",
        "x": 5,
        "y": 5,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "blue",
        "shutterId": "r146-142-third"
      },
      {
        "id": "r146-142-c5",
        "x": 3,
        "y": 5,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "blue",
        "shutterId": "r146-142-third"
      }
    ],
    "shutters": [
      {
        "id": "r146-142-first",
        "x": 4,
        "y": 0,
        "width": 2,
        "height": 5,
        "count": 7
      },
      {
        "id": "r146-142-second",
        "x": 0,
        "y": 5,
        "width": 3,
        "height": 3,
        "count": 12
      },
      {
        "id": "r146-142-third",
        "x": 3,
        "y": 5,
        "width": 3,
        "height": 3,
        "count": 22
      }
    ],
    "id": 142,
    "name": "竞品映射 Lv142",
    "difficulty": "normal",
    "timeSeconds": 150,
    "reward": 200,
    "parMoves": 51
  },
  "143": {
    "mechanismRules": "revised-2026-09-23-v1.4",
    "width": 7,
    "height": 10,
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
        "id": "s143-green",
        "color": "green",
        "side": "left",
        "offset": 4,
        "size": 1
      },
      {
        "id": "s143-yellow",
        "color": "yellow",
        "side": "right",
        "offset": 1,
        "size": 2
      },
      {
        "id": "s143-red",
        "color": "red",
        "side": "left",
        "offset": 1,
        "size": 1,
        "frozen": 4
      },
      {
        "id": "s143-blue",
        "color": "blue",
        "side": "left",
        "offset": 2,
        "size": 1,
        "frozen": 13
      },
      {
        "id": "s143-pink",
        "color": "pink",
        "side": "left",
        "offset": 5,
        "size": 1,
        "frozen": 6
      },
      {
        "id": "s143-cyan",
        "color": "cyan",
        "side": "right",
        "offset": 4,
        "size": 2,
        "frozen": 11
      }
    ],
    "blocks": [
      {
        "id": "s143-o17",
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
        "x": 1,
        "y": 0
      },
      {
        "id": "s143-o18",
        "color": "cyan",
        "shape": [
          [
            0,
            0
          ],
          [
            1,
            0
          ]
        ],
        "x": 4,
        "y": 0
      },
      {
        "id": "s143-o10",
        "color": "cyan",
        "shape": [
          [
            0,
            0
          ],
          [
            1,
            0
          ]
        ],
        "x": 0,
        "y": 1
      },
      {
        "id": "s143-o9",
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
        "x": 2,
        "y": 1
      },
      {
        "id": "s143-o7",
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ],
          [
            1,
            0
          ]
        ],
        "x": 5,
        "y": 1
      },
      {
        "id": "s143-o12",
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
        ],
        "x": 0,
        "y": 2
      },
      {
        "id": "s143-o4",
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ],
          [
            1,
            0
          ]
        ],
        "x": 2,
        "y": 2
      },
      {
        "id": "s143-o2",
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
          ]
        ],
        "x": 4,
        "y": 2
      },
      {
        "id": "s143-o11",
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ],
          [
            1,
            0
          ]
        ],
        "x": 0,
        "y": 3
      },
      {
        "id": "s143-o5",
        "color": "pink",
        "shape": [
          [
            0,
            0
          ],
          [
            1,
            0
          ]
        ],
        "x": 2,
        "y": 3
      },
      {
        "id": "s143-o8",
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
        "x": 4,
        "y": 3
      },
      {
        "id": "s143-o3",
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
        ],
        "layers": [
          "green",
          "red"
        ],
        "x": 0,
        "y": 4
      },
      {
        "id": "s143-o13",
        "color": "cyan",
        "shape": [
          [
            0,
            0
          ],
          [
            1,
            0
          ]
        ],
        "x": 2,
        "y": 4
      },
      {
        "id": "s143-o16",
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
          ]
        ],
        "x": 4,
        "y": 4
      },
      {
        "id": "s143-o15",
        "color": "cyan",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 0,
        "y": 5
      },
      {
        "id": "s143-o6",
        "color": "pink",
        "shape": [
          [
            0,
            0
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
        "x": 1,
        "y": 5
      },
      {
        "id": "s143-o1",
        "color": "cyan",
        "shape": [
          [
            0,
            0
          ],
          [
            1,
            0
          ]
        ],
        "x": 4,
        "y": 5
      },
      {
        "id": "s143-o14",
        "color": "green",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 6,
        "y": 5
      },
      {
        "id": "s143-h13",
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
            1,
            1
          ]
        ],
        "shutterId": "s143-curtain19",
        "x": 0,
        "y": 6
      },
      {
        "id": "s143-h3",
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
        "frozen": 9,
        "shutterId": "s143-curtain19",
        "x": 1,
        "y": 6
      },
      {
        "id": "s143-h9",
        "color": "cyan",
        "shape": [
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
        "shutterId": "s143-curtain19",
        "x": 4,
        "y": 6
      },
      {
        "id": "s143-h10",
        "color": "blue",
        "shape": [
          [
            0,
            0
          ],
          [
            1,
            0
          ]
        ],
        "shutterId": "s143-curtain19",
        "x": 5,
        "y": 6
      },
      {
        "id": "s143-h5",
        "color": "blue",
        "shape": [
          [
            0,
            0
          ],
          [
            1,
            0
          ]
        ],
        "shutterId": "s143-curtain19",
        "x": 2,
        "y": 7
      },
      {
        "id": "s143-h16",
        "color": "pink",
        "shape": [
          [
            0,
            0
          ]
        ],
        "shutterId": "s143-curtain19",
        "x": 6,
        "y": 7
      },
      {
        "id": "s143-h14",
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ],
          [
            1,
            0
          ]
        ],
        "shutterId": "s143-curtain19",
        "x": 0,
        "y": 8
      },
      {
        "id": "s143-h1",
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
        ],
        "shutterId": "s143-curtain19",
        "x": 2,
        "y": 8
      },
      {
        "id": "s143-h6",
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ],
          [
            1,
            0
          ]
        ],
        "shutterId": "s143-curtain19",
        "x": 4,
        "y": 8
      },
      {
        "id": "s143-h11",
        "color": "pink",
        "shape": [
          [
            0,
            0
          ]
        ],
        "shutterId": "s143-curtain19",
        "x": 6,
        "y": 8
      },
      {
        "id": "s143-h8",
        "color": "green",
        "shape": [
          [
            0,
            0
          ]
        ],
        "shutterId": "s143-curtain19",
        "x": 0,
        "y": 9
      },
      {
        "id": "s143-h7",
        "color": "green",
        "shape": [
          [
            0,
            0
          ]
        ],
        "shutterId": "s143-curtain19",
        "x": 1,
        "y": 9
      },
      {
        "id": "s143-h2",
        "color": "pink",
        "shape": [
          [
            0,
            0
          ]
        ],
        "shutterId": "s143-curtain19",
        "x": 2,
        "y": 9
      },
      {
        "id": "s143-h4",
        "color": "pink",
        "shape": [
          [
            0,
            0
          ]
        ],
        "shutterId": "s143-curtain19",
        "x": 3,
        "y": 9
      },
      {
        "id": "s143-h12",
        "color": "pink",
        "shape": [
          [
            0,
            0
          ]
        ],
        "shutterId": "s143-curtain19",
        "x": 4,
        "y": 9
      },
      {
        "id": "s143-h17",
        "color": "green",
        "shape": [
          [
            0,
            0
          ]
        ],
        "shutterId": "s143-curtain19",
        "x": 5,
        "y": 9
      },
      {
        "id": "s143-h15",
        "color": "green",
        "shape": [
          [
            0,
            0
          ]
        ],
        "shutterId": "s143-curtain19",
        "x": 6,
        "y": 9
      },
      {
        "id": "s143-queue1",
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
        "x": 2,
        "y": 9
      },
      {
        "id": "s143-queue2",
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
        "x": 2,
        "y": 9
      }
    ],
    "shutters": [
      {
        "id": "s143-curtain19",
        "x": 0,
        "y": 6,
        "width": 7,
        "height": 4,
        "count": 19
      }
    ],
    "generators": [
      {
        "id": "s143-machine",
        "side": "bottom",
        "offset": 3,
        "spawn": [
          2,
          9
        ],
        "rimMount": "rim",
        "rimSpan": 3,
        "queueBlockIds": [
          "s143-queue1",
          "s143-queue2"
        ]
      }
    ],
    "id": 143,
    "name": "竞品映射 Lv143",
    "difficulty": "hard",
    "timeSeconds": 130,
    "reward": 200,
    "parMoves": 66,
    "preservedMoveTarget": 57
  },
  "144": {
    "mechanismRules": "revised-2026-09-23-v1.4",
    "width": 7,
    "height": 7,
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
      ]
    ],
    "gates": [
      {
        "id": "n144-blue",
        "color": "blue",
        "side": "top",
        "offset": 1,
        "size": 3
      },
      {
        "id": "n144-purple",
        "color": "purple",
        "side": "top",
        "offset": 4,
        "size": 2,
        "frozen": 3
      },
      {
        "id": "n144-yellow",
        "color": "yellow",
        "side": "left",
        "offset": 1,
        "size": 3,
        "frozen": 7
      },
      {
        "id": "n144-cyan",
        "color": "cyan",
        "side": "right",
        "offset": 1,
        "size": 3,
        "frozen": 12
      },
      {
        "id": "n144-red15",
        "color": "red",
        "side": "left",
        "offset": 4,
        "size": 3,
        "frozen": 15
      },
      {
        "id": "n144-green18",
        "color": "green",
        "side": "right",
        "offset": 4,
        "size": 3,
        "frozen": 18
      },
      {
        "id": "n144-pink23",
        "color": "pink",
        "side": "bottom",
        "offset": 2,
        "size": 3,
        "frozen": 23
      }
    ],
    "blocks": [
      {
        "id": "n144-o6",
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ],
          [
            1,
            0
          ]
        ],
        "lockedBy": "key-blue",
        "lockCount": 1,
        "x": 1,
        "y": 0
      },
      {
        "id": "n144-o11",
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
        ],
        "keyId": "key-red",
        "x": 3,
        "y": 0
      },
      {
        "id": "n144-o2",
        "color": "purple",
        "shape": [
          [
            0,
            0
          ],
          [
            0,
            1
          ]
        ],
        "x": 4,
        "y": 0
      },
      {
        "id": "n144-o7",
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
        ],
        "x": 5,
        "y": 0
      },
      {
        "id": "n144-o16",
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
        ],
        "keyId": "key-red",
        "x": 0,
        "y": 1
      },
      {
        "id": "n144-o4",
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
        ],
        "x": 1,
        "y": 1
      },
      {
        "id": "n144-o1",
        "color": "purple",
        "shape": [
          [
            0,
            0
          ],
          [
            0,
            1
          ]
        ],
        "x": 2,
        "y": 1
      },
      {
        "id": "n144-o3",
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
        ],
        "x": 6,
        "y": 1
      },
      {
        "id": "n144-o12",
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
        ],
        "x": 3,
        "y": 2
      },
      {
        "id": "n144-o9",
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
        ],
        "keyId": "key-red",
        "x": 4,
        "y": 2
      },
      {
        "id": "n144-o10",
        "color": "purple",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 5,
        "y": 2
      },
      {
        "id": "n144-o13",
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
        ],
        "keyId": "key-blue",
        "x": 0,
        "y": 3
      },
      {
        "id": "n144-o15",
        "color": "blue",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 2,
        "y": 3
      },
      {
        "id": "n144-o8",
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ],
          [
            1,
            0
          ]
        ],
        "lockedBy": "key-red",
        "lockCount": 3,
        "x": 5,
        "y": 3
      },
      {
        "id": "n144-o14",
        "color": "purple",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 3,
        "y": 4
      },
      {
        "id": "n144-o5",
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 4,
        "y": 4
      },
      {
        "id": "n144-h5d",
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
            0,
            2
          ]
        ],
        "shutterId": "n144-cover5",
        "x": 0,
        "y": 4
      },
      {
        "id": "n144-h5c",
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
        ],
        "shutterId": "n144-cover5",
        "x": 1,
        "y": 4
      },
      {
        "id": "n144-h5a",
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
        ],
        "shutterId": "n144-cover5",
        "x": 2,
        "y": 4
      },
      {
        "id": "n144-h5b",
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ]
        ],
        "shutterId": "n144-cover5",
        "x": 2,
        "y": 6
      },
      {
        "id": "n144-h12c",
        "color": "cyan",
        "shape": [
          [
            0,
            0
          ],
          [
            1,
            0
          ]
        ],
        "layers": [
          "cyan",
          "purple"
        ],
        "shutterId": "n144-cover12",
        "x": 5,
        "y": 4
      },
      {
        "id": "n144-h12b",
        "color": "blue",
        "shape": [
          [
            0,
            0
          ],
          [
            1,
            0
          ]
        ],
        "shutterId": "n144-cover12",
        "x": 5,
        "y": 5
      },
      {
        "id": "n144-h12a",
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
        ],
        "shutterId": "n144-cover12",
        "x": 5,
        "y": 6
      },
      {
        "id": "n144-original-last",
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
        "color": "pink",
        "shutterId": "n144-cover15"
      }
    ],
    "id": 144,
    "name": "竞品映射 Lv144",
    "difficulty": "easy",
    "timeSeconds": 135,
    "reward": 200,
    "parMoves": 56,
    "preservedMoveTarget": 31,
    "shutters": [
      {
        "id": "n144-cover5",
        "x": 0,
        "y": 4,
        "width": 3,
        "height": 3,
        "count": 5
      },
      {
        "id": "n144-cover12",
        "x": 5,
        "y": 4,
        "width": 2,
        "height": 3,
        "count": 12
      },
      {
        "id": "n144-cover15",
        "x": 3,
        "y": 5,
        "width": 2,
        "height": 2,
        "count": 15
      }
    ]
  },
  "145": {
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
        "id": "r146-145-pink",
        "color": "pink",
        "side": "top",
        "offset": 1,
        "size": 2
      },
      {
        "id": "r146-145-yellow",
        "color": "yellow",
        "side": "left",
        "offset": 3,
        "size": 3,
        "frozen": 3
      },
      {
        "id": "r146-145-red",
        "color": "red",
        "side": "top",
        "offset": 4,
        "size": 2,
        "frozen": 7
      },
      {
        "id": "r146-145-blue",
        "color": "blue",
        "side": "right",
        "offset": 2,
        "size": 3,
        "frozen": 11
      },
      {
        "id": "r146-145-green",
        "color": "green",
        "side": "bottom",
        "offset": 0,
        "size": 3,
        "frozen": 19
      }
    ],
    "blocks": [
      {
        "id": "r146-145-o5",
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
        "id": "r146-145-o8",
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
        "color": "pink",
        "layers": [
          "pink",
          "yellow"
        ]
      },
      {
        "id": "r146-145-o1",
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
        "id": "r146-145-o6",
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
        "id": "r146-145-o3",
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
        "id": "r146-145-o12",
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
        "id": "r146-145-o9",
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
        "color": "pink"
      },
      {
        "id": "r146-145-o10",
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
        "color": "pink",
        "layers": [
          "pink",
          "blue"
        ],
        "timedBombSeconds": 30
      },
      {
        "id": "r146-145-o4",
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
        "color": "pink",
        "layers": [
          "pink",
          "red"
        ],
        "timedBombSeconds": 20
      },
      {
        "id": "r146-145-o7",
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
        "color": "yellow",
        "layers": [
          "yellow",
          "red"
        ]
      },
      {
        "id": "r146-145-o2",
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
        "id": "r146-145-o11",
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
        "color": "blue"
      },
      {
        "id": "r146-145-h4",
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
        "color": "blue",
        "layers": [
          "blue",
          "green"
        ],
        "shutterId": "r146-145-curtain10"
      },
      {
        "id": "r146-145-h2",
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
        "layers": [
          "blue",
          "green"
        ],
        "shutterId": "r146-145-curtain10"
      },
      {
        "id": "r146-145-h1",
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
        "color": "green",
        "shutterId": "r146-145-curtain10"
      },
      {
        "id": "r146-145-h5",
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
        "color": "blue",
        "layers": [
          "blue",
          "green"
        ],
        "shutterId": "r146-145-curtain10"
      },
      {
        "id": "r146-145-h3",
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
        "color": "blue",
        "layers": [
          "blue",
          "green"
        ],
        "shutterId": "r146-145-curtain10"
      }
    ],
    "shutters": [
      {
        "id": "r146-145-curtain10",
        "x": 0,
        "y": 6,
        "width": 7,
        "height": 3,
        "count": 10
      }
    ],
    "id": 145,
    "name": "竞品映射 Lv145",
    "difficulty": "normal",
    "timeSeconds": 80,
    "reward": 200,
    "parMoves": 44,
    "preservedMoveTarget": 38
  },
  "146": {
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
        "id": "green",
        "color": "green",
        "side": "right",
        "offset": 7,
        "size": 3
      },
      {
        "id": "purple",
        "color": "purple",
        "side": "bottom",
        "offset": 1,
        "size": 2
      },
      {
        "id": "purple-star",
        "color": "purple",
        "star": true,
        "side": "left",
        "offset": 7,
        "size": 3
      },
      {
        "id": "yellow",
        "color": "yellow",
        "side": "right",
        "offset": 1,
        "size": 3,
        "frozen": 6
      },
      {
        "id": "yellow-star",
        "color": "yellow",
        "star": true,
        "side": "bottom",
        "offset": 3,
        "size": 3,
        "frozen": 2
      },
      {
        "id": "red",
        "color": "red",
        "side": "left",
        "offset": 1,
        "size": 3,
        "frozen": 10
      },
      {
        "id": "blue",
        "color": "blue",
        "side": "top",
        "offset": 0,
        "size": 3,
        "frozen": 14
      }
    ],
    "blocks": [
      {
        "color": "yellow",
        "x": 6,
        "y": 4,
        "shape": [
          [
            0,
            0
          ]
        ],
        "frozen": 14,
        "id": "s146-o12"
      },
      {
        "color": "purple",
        "x": 5,
        "y": 4,
        "shape": [
          [
            0,
            0
          ]
        ],
        "frozen": 14,
        "id": "s146-o13"
      },
      {
        "color": "yellow",
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
        "id": "s146-o1"
      },
      {
        "color": "purple",
        "x": 3,
        "y": 3,
        "shape": [
          [
            0,
            0
          ]
        ],
        "star": true,
        "id": "s146-o5"
      },
      {
        "color": "yellow",
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
        "frozen": 7,
        "id": "s146-o9"
      },
      {
        "color": "blue",
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
        "id": "s146-o6"
      },
      {
        "color": "green",
        "x": 4,
        "y": 6,
        "shape": [
          [
            0,
            0
          ]
        ],
        "id": "s146-o10"
      },
      {
        "color": "purple",
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
        "id": "s146-o3"
      },
      {
        "color": "yellow",
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
        "id": "s146-o8"
      },
      {
        "color": "purple",
        "x": 1,
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
        "id": "s146-o0"
      },
      {
        "color": "green",
        "x": 2,
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
        "id": "s146-o2"
      },
      {
        "color": "yellow",
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
        "layers": [
          "yellow",
          "purple"
        ],
        "id": "s146-o7"
      },
      {
        "color": "green",
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
            0,
            1
          ],
          [
            1,
            1
          ]
        ],
        "id": "s146-o4"
      },
      {
        "color": "purple",
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
          ],
          [
            2,
            0
          ]
        ],
        "id": "s146-o11"
      },
      {
        "color": "yellow",
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
        "id": "s146-h0-1",
        "shutterId": "s146-c0"
      },
      {
        "color": "red",
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
        "id": "s146-h0-0",
        "shutterId": "s146-c0"
      },
      {
        "color": "green",
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
          ]
        ],
        "layers": [
          "green",
          "yellow"
        ],
        "id": "s146-h0-3",
        "shutterId": "s146-c0"
      },
      {
        "color": "blue",
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
            2,
            0
          ]
        ],
        "id": "s146-h0-2",
        "shutterId": "s146-c0"
      },
      {
        "color": "yellow",
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
        "star": true,
        "id": "s146-h1-2",
        "shutterId": "s146-c1"
      },
      {
        "color": "blue",
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
        "id": "s146-h1-1",
        "shutterId": "s146-c1"
      },
      {
        "color": "purple",
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
        "star": true,
        "id": "s146-h1-0",
        "shutterId": "s146-c1"
      },
      {
        "color": "red",
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
        "id": "s146-h1-3",
        "shutterId": "s146-c1"
      },
      {
        "color": "green",
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
        "id": "s146-h2-1",
        "shutterId": "s146-c2"
      },
      {
        "color": "green",
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
        "layers": [
          "green",
          "yellow"
        ],
        "id": "s146-h2-0",
        "shutterId": "s146-c2"
      },
      {
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
        ],
        "id": "s146-h3-0",
        "shutterId": "s146-c3"
      },
      {
        "color": "purple",
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
        "star": true,
        "id": "s146-h3-1",
        "shutterId": "s146-c3"
      }
    ],
    "shutters": [
      {
        "id": "s146-c0",
        "x": 4,
        "y": 0,
        "width": 3,
        "height": 4,
        "count": 22
      },
      {
        "id": "s146-c1",
        "x": 0,
        "y": 0,
        "width": 3,
        "height": 5,
        "count": 19
      },
      {
        "id": "s146-c2",
        "x": 0,
        "y": 5,
        "width": 2,
        "height": 3,
        "count": 11
      },
      {
        "id": "s146-c3",
        "x": 5,
        "y": 5,
        "width": 2,
        "height": 3,
        "count": 14
      }
    ],
    "id": 146,
    "name": "竞品映射 Lv146",
    "difficulty": "super",
    "timeSeconds": 80,
    "reward": 200,
    "parMoves": 41,
    "preservedMoveTarget": 54
  },
  "147": {
    "mechanismRules": "revised-2026-09-23-v1.4",
    "width": 7,
    "height": 12,
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
      ],
      [
        0,
        10
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
      ],
      [
        6,
        10
      ],
      [
        0,
        11
      ],
      [
        1,
        11
      ],
      [
        2,
        11
      ],
      [
        3,
        11
      ],
      [
        4,
        11
      ],
      [
        5,
        11
      ],
      [
        6,
        11
      ]
    ],
    "gates": [
      {
        "id": "green",
        "color": "green",
        "side": "right",
        "offset": 9,
        "size": 3
      },
      {
        "id": "blue",
        "color": "blue",
        "side": "right",
        "offset": 4,
        "size": 3,
        "frozen": 1
      },
      {
        "id": "orange",
        "color": "orange",
        "side": "top",
        "offset": 1,
        "size": 3,
        "frozen": 4
      },
      {
        "id": "pink",
        "color": "pink",
        "side": "bottom",
        "offset": 4,
        "size": 3,
        "frozen": 8
      },
      {
        "id": "red",
        "color": "red",
        "side": "bottom",
        "offset": 0,
        "size": 3,
        "frozen": 26
      },
      {
        "id": "purple",
        "color": "purple",
        "side": "top",
        "offset": 4,
        "size": 2,
        "frozen": 44
      },
      {
        "id": "cyan",
        "color": "cyan",
        "side": "left",
        "offset": 2,
        "size": 3,
        "frozen": 8
      },
      {
        "id": "yellow",
        "color": "yellow",
        "side": "left",
        "offset": 9,
        "size": 3,
        "frozen": 19
      }
    ],
    "blocks": [
      {
        "color": "orange",
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
        "id": "s147-o3"
      },
      {
        "color": "blue",
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
          ]
        ],
        "id": "s147-o1"
      },
      {
        "color": "blue",
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
        "id": "s147-o2"
      },
      {
        "color": "blue",
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
        "id": "s147-o4"
      },
      {
        "color": "green",
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
        "id": "s147-o11"
      },
      {
        "color": "orange",
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
            1,
            1
          ]
        ],
        "id": "s147-o8"
      },
      {
        "color": "blue",
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
        "id": "s147-o0"
      },
      {
        "color": "blue",
        "x": 3,
        "y": 9,
        "shape": [
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
        "id": "s147-o5"
      },
      {
        "color": "cyan",
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
          ],
          [
            0,
            2
          ]
        ],
        "id": "s147-o10"
      },
      {
        "color": "green",
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
            0,
            1
          ],
          [
            1,
            1
          ]
        ],
        "id": "s147-o9"
      },
      {
        "color": "pink",
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
            1,
            1
          ]
        ],
        "id": "s147-o7"
      },
      {
        "color": "green",
        "x": 2,
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
        "id": "s147-o6"
      },
      {
        "color": "green",
        "x": 0,
        "y": 11,
        "shape": [
          [
            0,
            0
          ],
          [
            1,
            0
          ]
        ],
        "id": "s147-h0-0",
        "shutterId": "s147-c0"
      },
      {
        "color": "purple",
        "x": 2,
        "y": 11,
        "shape": [
          [
            0,
            0
          ],
          [
            1,
            0
          ]
        ],
        "id": "s147-h0-1",
        "shutterId": "s147-c0"
      },
      {
        "color": "red",
        "x": 4,
        "y": 11,
        "shape": [
          [
            0,
            0
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
        "id": "s147-h0-2",
        "shutterId": "s147-c0"
      },
      {
        "color": "orange",
        "x": 3,
        "y": 1,
        "shape": [
          [
            0,
            0
          ]
        ],
        "id": "s147-h1-0",
        "shutterId": "s147-c1"
      },
      {
        "color": "orange",
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
        "id": "s147-h1-1",
        "shutterId": "s147-c1"
      },
      {
        "color": "cyan",
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
        "id": "s147-h1-2",
        "shutterId": "s147-c1"
      },
      {
        "color": "orange",
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
        "id": "s147-h1-3",
        "shutterId": "s147-c1"
      },
      {
        "color": "cyan",
        "x": 0,
        "y": 1,
        "shape": [
          [
            0,
            0
          ]
        ],
        "id": "s147-h1-4",
        "shutterId": "s147-c1"
      },
      {
        "color": "cyan",
        "x": 0,
        "y": 2,
        "shape": [
          [
            0,
            0
          ]
        ],
        "id": "s147-h1-5",
        "shutterId": "s147-c1"
      },
      {
        "color": "cyan",
        "x": 2,
        "y": 3,
        "shape": [
          [
            0,
            0
          ]
        ],
        "id": "s147-h1-6",
        "shutterId": "s147-c1"
      },
      {
        "color": "cyan",
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
        "id": "s147-h1-7",
        "shutterId": "s147-c1"
      },
      {
        "color": "cyan",
        "x": 1,
        "y": 3,
        "shape": [
          [
            0,
            0
          ]
        ],
        "id": "s147-h1-8",
        "shutterId": "s147-c1"
      },
      {
        "color": "cyan",
        "x": 3,
        "y": 4,
        "shape": [
          [
            0,
            0
          ]
        ],
        "id": "s147-h1-9",
        "shutterId": "s147-c1"
      },
      {
        "color": "cyan",
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
        "id": "s147-h1-10",
        "shutterId": "s147-c1"
      },
      {
        "color": "purple",
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
        "id": "s147-h1-13",
        "shutterId": "s147-c1"
      },
      {
        "color": "cyan",
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
        "id": "s147-h1-14",
        "shutterId": "s147-c1"
      },
      {
        "color": "cyan",
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
            1,
            1
          ]
        ],
        "id": "s147-h1-11",
        "shutterId": "s147-c1"
      },
      {
        "color": "cyan",
        "x": 2,
        "y": 7,
        "shape": [
          [
            0,
            0
          ]
        ],
        "id": "s147-h1-12",
        "shutterId": "s147-c1"
      },
      {
        "color": "cyan",
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
        "id": "s147-h1-15",
        "shutterId": "s147-c1"
      },
      {
        "color": "cyan",
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
        "id": "s147-h1-16",
        "shutterId": "s147-c1"
      },
      {
        "color": "green",
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
        "frozen": 5,
        "id": "s147-h2-0",
        "shutterId": "s147-c2"
      },
      {
        "color": "orange",
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
        "id": "s147-h2-1",
        "shutterId": "s147-c2"
      },
      {
        "color": "red",
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
        "id": "s147-h2-2",
        "shutterId": "s147-c2"
      },
      {
        "color": "pink",
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
          ]
        ],
        "id": "s147-h2-3",
        "shutterId": "s147-c2"
      },
      {
        "color": "blue",
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
        "id": "s147-l0-1",
        "shutterId": "s147-lift0"
      },
      {
        "color": "pink",
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
        "id": "s147-l0-0",
        "shutterId": "s147-lift0"
      },
      {
        "color": "orange",
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
        "id": "s147-l0-2",
        "shutterId": "s147-lift0"
      },
      {
        "color": "cyan",
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
        "id": "s147-l0-3",
        "shutterId": "s147-lift0"
      },
      {
        "color": "blue",
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
            1,
            1
          ]
        ],
        "id": "s147-l0-4",
        "shutterId": "s147-lift0"
      },
      {
        "color": "green",
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
        "id": "s147-l1-0",
        "shutterId": "s147-lift1"
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
            1,
            0
          ]
        ],
        "id": "s147-l1-1",
        "shutterId": "s147-lift1"
      },
      {
        "color": "cyan",
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
        "id": "s147-l1-2",
        "shutterId": "s147-lift1"
      },
      {
        "color": "pink",
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
          ]
        ],
        "id": "s147-l1-3",
        "shutterId": "s147-lift1"
      },
      {
        "color": "yellow",
        "x": 4,
        "y": 11,
        "shape": [
          [
            0,
            0
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
        "id": "s147-l2-0",
        "shutterId": "s147-lift2"
      }
    ],
    "shutters": [
      {
        "id": "s147-c0",
        "x": 0,
        "y": 11,
        "width": 7,
        "height": 1,
        "count": 18
      },
      {
        "id": "s147-c1",
        "x": 0,
        "y": 1,
        "width": 4,
        "height": 8,
        "count": 5
      },
      {
        "id": "s147-c2",
        "x": 4,
        "y": 1,
        "width": 3,
        "height": 3,
        "count": 17
      },
      {
        "id": "s147-lift0",
        "x": 0,
        "y": 1,
        "width": 2,
        "height": 7,
        "count": 1,
        "skin": "lift"
      },
      {
        "id": "s147-lift1",
        "x": 4,
        "y": 1,
        "width": 3,
        "height": 3,
        "count": 1,
        "skin": "lift"
      },
      {
        "id": "s147-lift2",
        "x": 4,
        "y": 11,
        "width": 3,
        "height": 1,
        "count": 1,
        "skin": "lift"
      }
    ],
    "id": 147,
    "name": "竞品映射 Lv147",
    "difficulty": "easy",
    "timeSeconds": 200,
    "reward": 200,
    "parMoves": 53,
    "preservedMoveTarget": 55
  },
  "148": {
    "mechanismRules": "revised-2026-09-23-v1.4",
    "width": 7,
    "height": 11,
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
      ],
      [
        0,
        10
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
      ],
      [
        6,
        10
      ]
    ],
    "gates": [
      {
        "id": "red",
        "color": "red",
        "side": "left",
        "offset": 3,
        "size": 3
      },
      {
        "id": "blue",
        "color": "blue",
        "side": "top",
        "offset": 3,
        "size": 3,
        "frozen": 21
      },
      {
        "id": "purple",
        "color": "purple",
        "side": "bottom",
        "offset": 0,
        "size": 3,
        "frozen": 8
      },
      {
        "id": "yellow",
        "color": "yellow",
        "side": "right",
        "offset": 6,
        "size": 3,
        "frozen": 4
      },
      {
        "id": "orange",
        "color": "orange",
        "side": "left",
        "offset": 6,
        "size": 3,
        "frozen": 8
      },
      {
        "id": "green",
        "color": "green",
        "side": "right",
        "offset": 3,
        "size": 2,
        "frozen": 10
      },
      {
        "id": "cyan",
        "color": "cyan",
        "side": "right",
        "offset": 9,
        "size": 2,
        "frozen": 13
      }
    ],
    "blocks": [
      {
        "id": "s148-open-7",
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
        "color": "red"
      },
      {
        "id": "s148-open-0",
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
        "color": "yellow",
        "layers": [
          "yellow",
          "purple"
        ]
      },
      {
        "id": "s148-open-12",
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
        "id": "s148-open-6",
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
        "color": "red"
      },
      {
        "id": "s148-open-1",
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
          ]
        ],
        "color": "cyan"
      },
      {
        "id": "s148-open-9",
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
        "color": "red"
      },
      {
        "id": "s148-open-5",
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
        "color": "blue"
      },
      {
        "id": "s148-open-4",
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
        "color": "purple"
      },
      {
        "id": "s148-open-2",
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
        "id": "s148-open-8",
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
        "color": "cyan"
      },
      {
        "id": "s148-open-11",
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
        "color": "red"
      },
      {
        "id": "s148-open-10",
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
        "color": "orange"
      },
      {
        "id": "s148-open-3",
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
          ]
        ],
        "color": "yellow"
      },
      {
        "id": "s148-lower-6",
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
          ],
          [
            1,
            1
          ]
        ],
        "color": "orange",
        "shutterId": "curtain6"
      },
      {
        "id": "s148-lower-0",
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
        "color": "green",
        "shutterId": "curtain6"
      },
      {
        "id": "s148-lower-3",
        "x": 3,
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
            1,
            1
          ]
        ],
        "color": "green",
        "shutterId": "curtain6"
      },
      {
        "id": "s148-lower-7",
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
        "color": "yellow",
        "layers": [
          "yellow",
          "red"
        ],
        "shutterId": "curtain6"
      },
      {
        "id": "s148-lower-2",
        "x": 2,
        "y": 9,
        "shape": [
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
        "color": "purple",
        "shutterId": "curtain6"
      },
      {
        "id": "s148-lower-1",
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
            0,
            1
          ],
          [
            1,
            1
          ]
        ],
        "color": "yellow",
        "layers": [
          "yellow",
          "purple"
        ],
        "shutterId": "curtain6"
      },
      {
        "id": "s148-lower-5",
        "x": 0,
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
        "color": "orange",
        "shutterId": "curtain6"
      },
      {
        "id": "s148-lower-4",
        "x": 4,
        "y": 10,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "cyan",
        "shutterId": "curtain6"
      },
      {
        "id": "s148-top-0",
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
        "color": "purple",
        "shutterId": "curtain15",
        "movementAxis": "vertical"
      },
      {
        "id": "s148-top-1",
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
        "shutterId": "curtain15"
      },
      {
        "id": "s148-top-2",
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
        "shutterId": "curtain15"
      },
      {
        "id": "s148-top-3",
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
        "color": "orange",
        "shutterId": "curtain15"
      },
      {
        "id": "s148-top-4",
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
        "color": "blue",
        "shutterId": "curtain15",
        "movementAxis": "vertical"
      }
    ],
    "shutters": [
      {
        "id": "curtain15",
        "x": 1,
        "y": 0,
        "width": 5,
        "height": 3,
        "count": 15
      },
      {
        "id": "curtain6",
        "x": 0,
        "y": 8,
        "width": 7,
        "height": 3,
        "count": 6
      }
    ],
    "id": 148,
    "name": "竞品映射 Lv148",
    "difficulty": "normal",
    "timeSeconds": 130,
    "reward": 200,
    "parMoves": 57,
    "preservedMoveTarget": 44
  },
  "149": {
    "mechanismRules": "revised-2026-09-23-v1.4",
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
    "gates": [
      {
        "id": "n149-red",
        "color": "red",
        "side": "left",
        "offset": 0,
        "size": 3
      },
      {
        "id": "n149-green",
        "color": "green",
        "side": "right",
        "offset": 0,
        "size": 3,
        "frozen": 4
      },
      {
        "id": "n149-purple",
        "color": "purple",
        "side": "right",
        "offset": 3,
        "size": 3,
        "frozen": 6
      },
      {
        "id": "n149-blue",
        "color": "blue",
        "side": "left",
        "offset": 3,
        "size": 3,
        "frozen": 15
      },
      {
        "id": "n149-yellow",
        "color": "yellow",
        "side": "bottom",
        "offset": 0,
        "size": 3,
        "frozen": 29
      },
      {
        "id": "n149-cyan",
        "color": "cyan",
        "side": "bottom",
        "offset": 5,
        "size": 3,
        "frozen": 32
      }
    ],
    "blocks": [
      {
        "id": "new149-op-red-H3",
        "shape": [
          [
            0,
            0
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
        "x": 0,
        "y": 0
      },
      {
        "id": "new149-op-shell",
        "shape": [
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
          "blue"
        ],
        "x": 0,
        "y": 2
      },
      {
        "id": "new149-op-purple-S2",
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "green",
        "x": 3,
        "y": 0
      },
      {
        "id": "new149-op-yellow-L",
        "shape": [
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
        "color": "purple",
        "x": 4,
        "y": 0
      },
      {
        "id": "new149-op-blue-S",
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "green",
        "x": 5,
        "y": 0
      },
      {
        "id": "new149-op-cyan-V",
        "shape": [
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
        "x": 6,
        "y": 0
      },
      {
        "id": "new149-op-green-S",
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "green",
        "x": 7,
        "y": 0
      },
      {
        "id": "new149-op-green-H",
        "shape": [
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
        "x": 0,
        "y": 1
      },
      {
        "id": "new149-op-purple-L",
        "shape": [
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
        "color": "purple",
        "x": 2,
        "y": 1
      },
      {
        "id": "new149-op-red-S",
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "red",
        "x": 3,
        "y": 1
      },
      {
        "id": "new149-op-blue-V",
        "shape": [
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
        "x": 7,
        "y": 1
      },
      {
        "id": "new149-op-ice3",
        "shape": [
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
        "frozen": 3,
        "x": 4,
        "y": 2
      },
      {
        "id": "new149-op-purple-S1",
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "green",
        "x": 6,
        "y": 2
      },
      {
        "id": "new149-c6-purple",
        "shape": [
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
        "x": 3,
        "y": 3,
        "shutterId": "new149-cover6"
      },
      {
        "id": "new149-c6-red",
        "shape": [
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
        "x": 5,
        "y": 3,
        "shutterId": "new149-cover6"
      },
      {
        "id": "new149-c6-yellow",
        "shape": [
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
        "x": 3,
        "y": 4,
        "shutterId": "new149-cover6"
      },
      {
        "id": "new149-c6-blue-H",
        "shape": [
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
        "x": 4,
        "y": 4,
        "shutterId": "new149-cover6"
      },
      {
        "id": "new149-c6-green",
        "shape": [
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
        "x": 6,
        "y": 4,
        "shutterId": "new149-cover6"
      },
      {
        "id": "new149-c6-blue-S",
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "green",
        "x": 5,
        "y": 5,
        "shutterId": "new149-cover6"
      },
      {
        "id": "new149-c6-ice2",
        "shape": [
          [
            0,
            0
          ],
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
        "layers": [
          "green",
          "purple"
        ],
        "frozen": 2,
        "x": 7,
        "y": 3,
        "shutterId": "new149-cover6"
      },
      {
        "id": "new149-c14-ice7",
        "shape": [
          [
            0,
            0
          ],
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
        "layers": [
          "green",
          "yellow"
        ],
        "frozen": 7,
        "x": 0,
        "y": 3,
        "shutterId": "new149-cover14"
      },
      {
        "id": "new149-c14-shell",
        "shape": [
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
          "yellow"
        ],
        "x": 1,
        "y": 3,
        "shutterId": "new149-cover14"
      },
      {
        "id": "new149-c14-green",
        "shape": [
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
        "x": 2,
        "y": 3,
        "shutterId": "new149-cover14"
      },
      {
        "id": "new149-c14-blue-H",
        "shape": [
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
        "x": 1,
        "y": 5,
        "shutterId": "new149-cover14"
      },
      {
        "id": "new149-c22-purple-shell",
        "shape": [
          [
            0,
            0
          ],
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
        "layers": [
          "purple",
          "cyan"
        ],
        "x": 0,
        "y": 6,
        "shutterId": "new149-cover22"
      },
      {
        "id": "new149-c22-ice13",
        "shape": [
          [
            0,
            0
          ],
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
        "frozen": 13,
        "x": 1,
        "y": 6,
        "shutterId": "new149-cover22"
      },
      {
        "id": "new149-c22-green-shell",
        "shape": [
          [
            0,
            0
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
        "layers": [
          "red",
          "blue"
        ],
        "x": 2,
        "y": 6,
        "shutterId": "new149-cover22"
      },
      {
        "id": "new149-c22-blue-L4",
        "shape": [
          [
            0,
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
        "x": 2,
        "y": 7,
        "shutterId": "new149-cover22"
      },
      {
        "id": "new149-c22-purple",
        "shape": [
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
        "x": 3,
        "y": 8,
        "shutterId": "new149-cover22"
      },
      {
        "id": "new149-c22-red-shell",
        "shape": [
          [
            0,
            0
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
        "layers": [
          "red",
          "cyan"
        ],
        "x": 0,
        "y": 9,
        "shutterId": "new149-cover22"
      },
      {
        "id": "new149-c25-red",
        "shape": [
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
        "x": 5,
        "y": 6,
        "shutterId": "new149-cover25"
      },
      {
        "id": "new149-c25-cyan-shell",
        "shape": [
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
        ],
        "x": 7,
        "y": 6,
        "shutterId": "new149-cover25"
      },
      {
        "id": "new149-c25-blue",
        "shape": [
          [
            0,
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
        "x": 5,
        "y": 8,
        "shutterId": "new149-cover25"
      }
    ],
    "shutters": [
      {
        "id": "new149-cover6",
        "x": 3,
        "y": 3,
        "width": 5,
        "height": 3,
        "count": 6
      },
      {
        "id": "new149-cover14",
        "x": 0,
        "y": 3,
        "width": 3,
        "height": 3,
        "count": 14
      },
      {
        "id": "new149-cover22",
        "x": 0,
        "y": 6,
        "width": 5,
        "height": 4,
        "count": 22
      },
      {
        "id": "new149-cover25",
        "x": 5,
        "y": 6,
        "width": 3,
        "height": 4,
        "count": 25
      }
    ],
    "id": 149,
    "name": "竞品映射 Lv149",
    "difficulty": "normal",
    "timeSeconds": 140,
    "reward": 200,
    "parMoves": 78,
    "preservedMoveTarget": 56
  },
  "150": {
    "mechanismRules": "revised-2026-09-23-v1.4",
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
    "gates": [
      {
        "id": "red",
        "color": "red",
        "side": "left",
        "offset": 0,
        "size": 3,
        "frozen": 7
      }
    ],
    "blocks": [
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
          ]
        ],
        "id": "r173-150-0",
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
            0,
            1
          ]
        ],
        "id": "r173-150-1",
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
          ]
        ],
        "id": "r173-150-2",
        "color": "red"
      },
      {
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
        "id": "r173-150-3",
        "color": "blue"
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
          ]
        ],
        "id": "r173-150-4",
        "color": "green",
        "layers": [
          "green",
          "red"
        ]
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
          ]
        ],
        "id": "r173-150-5",
        "color": "yellow"
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
            1,
            0
          ]
        ],
        "id": "r173-150-6",
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
        "id": "r173-150-7",
        "color": "yellow"
      },
      {
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
        "id": "r173-150-8",
        "color": "blue"
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
          ]
        ],
        "id": "r173-150-9",
        "color": "green"
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
        "id": "r173-150-10",
        "color": "red",
        "layers": [
          "red",
          "green"
        ]
      },
      {
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
        "id": "r173-150-11",
        "color": "yellow"
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
        "id": "r173-150-12",
        "color": "yellow"
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
        "id": "r173-150-13",
        "color": "blue"
      }
    ],
    "flipDoors": [
      {
        "id": "blue",
        "color": "blue",
        "side": "right",
        "offset": 4,
        "size": 3,
        "initiallyOpen": true
      },
      {
        "id": "green",
        "color": "green",
        "side": "top",
        "offset": 1,
        "size": 3,
        "initiallyOpen": false
      },
      {
        "id": "yellow",
        "color": "yellow",
        "side": "left",
        "offset": 3,
        "size": 3,
        "frozen": 7,
        "initiallyOpen": true
      }
    ],
    "id": 150,
    "name": "竞品映射 Lv150",
    "difficulty": "easy",
    "timeSeconds": 150,
    "reward": 200,
    "parMoves": 30,
    "preservedMoveTarget": 26
  }
};
export const applyRemake141to150 = (level: LevelSpec): LevelSpec => reviewed[level.id] ?? level;
