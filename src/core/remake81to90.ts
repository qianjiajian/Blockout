// Reviewed data: all ten levels; eight certified and user-selected Lv88/Lv90 with unverified target lower bounds (v1.57).
import type {LevelSpec} from './types';
export const REMADE_81_90_IDS: readonly number[] = [81,82,83,84,85,86,87,88,89,90];
const reviewed: Record<number,LevelSpec> = {
  "81": {
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
    "id": 81,
    "name": "量子校准",
    "difficulty": "hard",
    "timeSeconds": 120,
    "reward": 180,
    "parMoves": 29,
    "preservedMoveTarget": 38,
    "blocks": [
      {
        "id": "r147-81-5-0",
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
        "color": "blue",
        "lockedBy": "red-key",
        "lockCount": 2
      },
      {
        "id": "r147-81-7-0",
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
        "color": "red",
        "keyId": "red-key"
      },
      {
        "id": "r147-81-6-1",
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
        "keyId": "red-key"
      },
      {
        "id": "r147-81-1-1",
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
        "id": "r147-81-3-0",
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
        "color": "green",
        "layers": [
          "green",
          "yellow"
        ]
      },
      {
        "id": "r147-81-4-1",
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
        "color": "blue"
      },
      {
        "id": "r147-81-2-0",
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
        "color": "red",
        "layers": [
          "red",
          "blue"
        ],
        "lockedBy": "blue-key",
        "lockCount": 1
      },
      {
        "id": "r147-81-1-0",
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
        "color": "green"
      },
      {
        "id": "r147-81-4-0",
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
        "id": "r147-81-3-1",
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
        "color": "red"
      },
      {
        "id": "r147-81-0-1",
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
        "color": "green"
      },
      {
        "id": "r147-81-7-1",
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
        "id": "r147-81-6-0",
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
        "id": "r147-81-2-1",
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
        "color": "green",
        "keyId": "blue-key"
      },
      {
        "id": "r147-81-0-0",
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
        "color": "blue"
      },
      {
        "id": "r147-81-5-1",
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
        "color": "yellow"
      }
    ],
    "gates": [
      {
        "id": "r147-81-yellow",
        "color": "yellow",
        "side": "bottom",
        "offset": 1,
        "size": 3,
        "frozen": 13
      },
      {
        "id": "r147-81-red",
        "color": "red",
        "side": "right",
        "offset": 2,
        "size": 1,
        "frozen": 4
      },
      {
        "id": "r147-81-blue",
        "color": "blue",
        "side": "left",
        "offset": 4,
        "size": 1,
        "frozen": 8
      },
      {
        "id": "r147-81-green",
        "color": "green",
        "side": "left",
        "offset": 5,
        "size": 1
      }
    ]
  },
  "82": {
    "mechanismRules": "revised-2026-09-23-v1.4",
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
    "id": 82,
    "name": "镜像航道",
    "difficulty": "easy",
    "timeSeconds": 120,
    "reward": 185,
    "parMoves": 32,
    "preservedMoveTarget": 32,
    "blocks": [
      {
        "id": "r147-82-6",
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
          ]
        ],
        "x": 1,
        "y": 0,
        "frozen": 3
      },
      {
        "id": "r147-82-11",
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
        "x": 4,
        "y": 0,
        "lockedBy": "red-key",
        "lockCount": 1
      },
      {
        "id": "r147-82-16",
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
        ],
        "x": 0,
        "y": 1,
        "lockedBy": "blue-key",
        "lockCount": 2
      },
      {
        "id": "r147-82-fill-orange",
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
        "x": 2,
        "y": 1
      },
      {
        "id": "r147-82-19",
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
        "x": 5,
        "y": 1
      },
      {
        "id": "r147-82-0",
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
          ]
        ],
        "x": 2,
        "y": 2
      },
      {
        "id": "r147-82-12",
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
        "x": 0,
        "y": 3
      },
      {
        "id": "r147-82-7",
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
        "x": 1,
        "y": 3
      },
      {
        "id": "r147-82-10",
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
            1,
            1
          ]
        ],
        "x": 3,
        "y": 3
      },
      {
        "id": "r147-82-17",
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
        "x": 4,
        "y": 3
      },
      {
        "id": "r147-82-4",
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
        "x": 2,
        "y": 4
      },
      {
        "id": "r147-82-2",
        "color": "orange",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 5,
        "y": 4
      },
      {
        "id": "r147-82-13",
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
        "y": 5,
        "keyId": "blue-key"
      },
      {
        "id": "r147-82-fill-cyan",
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
        "x": 3,
        "y": 5
      },
      {
        "id": "r147-82-5",
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
        "x": 5,
        "y": 5,
        "keyId": "blue-key"
      },
      {
        "id": "r147-82-14",
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
        "x": 0,
        "y": 6,
        "keyId": "red-key"
      },
      {
        "id": "r147-82-18",
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
        "x": 2,
        "y": 6
      },
      {
        "id": "r147-82-8",
        "color": "red",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 4,
        "y": 6
      },
      {
        "id": "r147-82-3",
        "color": "pink",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 1,
        "y": 7
      },
      {
        "id": "r147-82-1",
        "color": "purple",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 2,
        "y": 7
      },
      {
        "id": "r147-82-9",
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 3,
        "y": 7
      },
      {
        "id": "r147-82-15",
        "color": "green",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 4,
        "y": 7
      }
    ],
    "gates": [
      {
        "id": "r147-82-blue",
        "color": "blue",
        "side": "top",
        "offset": 1,
        "size": 2,
        "frozen": 7
      },
      {
        "id": "r147-82-yellow",
        "color": "yellow",
        "side": "bottom",
        "offset": 2,
        "size": 2
      },
      {
        "id": "r147-82-green",
        "color": "green",
        "side": "left",
        "offset": 4,
        "size": 2,
        "frozen": 4
      },
      {
        "id": "r147-82-cyan",
        "color": "cyan",
        "side": "right",
        "offset": 3,
        "size": 2,
        "frozen": 13
      },
      {
        "id": "r147-82-pink",
        "color": "pink",
        "side": "left",
        "offset": 2,
        "size": 2,
        "frozen": 11
      },
      {
        "id": "r147-82-orange",
        "color": "orange",
        "side": "right",
        "offset": 1,
        "size": 2,
        "frozen": 9
      },
      {
        "id": "r147-82-purple",
        "color": "purple",
        "side": "right",
        "offset": 5,
        "size": 2
      },
      {
        "id": "r147-82-red",
        "color": "red",
        "side": "top",
        "offset": 3,
        "size": 2,
        "frozen": 6
      }
    ]
  },
  "83": {
    "mechanismRules": "revised-2026-09-23-v1.4",
    "width": 8,
    "height": 12,
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
    "id": 83,
    "name": "错位出口",
    "difficulty": "normal",
    "timeSeconds": 150,
    "reward": 190,
    "parMoves": 45,
    "preservedMoveTarget": 56,
    "shutters": [
      {
        "id": "r147-83-left",
        "x": 0,
        "y": 0,
        "width": 4,
        "height": 3,
        "count": 15
      },
      {
        "id": "r147-83-right",
        "x": 0,
        "y": 3,
        "width": 4,
        "height": 3,
        "count": 15
      }
    ],
    "blocks": [
      {
        "id": "r147-83-o7",
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
        "x": 4,
        "y": 0
      },
      {
        "id": "r147-83-o11",
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
        "x": 6,
        "y": 0
      },
      {
        "id": "r147-83-o4",
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
        ],
        "x": 4,
        "y": 2,
        "layers": [
          "purple",
          "green"
        ]
      },
      {
        "id": "r147-83-o9",
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
        "x": 6,
        "y": 2,
        "lockedBy": "opening-green",
        "lockCount": 1
      },
      {
        "id": "r147-83-o8",
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
        ],
        "x": 4,
        "y": 4,
        "keyId": "opening-green"
      },
      {
        "id": "r147-83-o3",
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
        "x": 6,
        "y": 4
      },
      {
        "id": "r147-83-o6",
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
        ],
        "x": 0,
        "y": 6,
        "layers": [
          "yellow",
          "green"
        ]
      },
      {
        "id": "r147-83-o1",
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
        "x": 2,
        "y": 6
      },
      {
        "id": "r147-83-o5",
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
        "x": 4,
        "y": 6,
        "layers": [
          "red",
          "green"
        ],
        "lockedBy": "opening-red",
        "lockCount": 1
      },
      {
        "id": "r147-83-o2",
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
        ],
        "x": 6,
        "y": 6
      },
      {
        "id": "r147-83-o10",
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
        "x": 0,
        "y": 8
      },
      {
        "id": "r147-83-o0",
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
        "x": 2,
        "y": 8,
        "keyId": "opening-red"
      },
      {
        "id": "r147-83-fill-h0",
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
        "color": "purple"
      },
      {
        "id": "r147-83-fill-h1",
        "x": 6,
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
      },
      {
        "id": "r147-83-fill-h2",
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
        "color": "green"
      },
      {
        "id": "r147-83-fill-h3",
        "x": 6,
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
        "color": "purple"
      },
      {
        "id": "r147-83-fill-h4",
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
        "color": "red"
      },
      {
        "id": "r147-83-fill-h5",
        "x": 2,
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
        "color": "yellow"
      },
      {
        "id": "r147-83-fill-h6",
        "x": 4,
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
        "color": "red"
      },
      {
        "id": "r147-83-fill-h7",
        "x": 6,
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
        "color": "yellow"
      },
      {
        "id": "r147-83-fill-h8",
        "x": 1,
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
        "color": "purple"
      },
      {
        "id": "r147-83-fill-h9",
        "x": 3,
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
        "color": "green"
      },
      {
        "id": "r147-83-fill-h10",
        "x": 5,
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
        "color": "purple"
      },
      {
        "id": "r147-83-l0",
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
        ],
        "x": 0,
        "y": 0,
        "lockedBy": "left-red",
        "lockCount": 1,
        "shutterId": "r147-83-left"
      },
      {
        "id": "r147-83-l1",
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
        ],
        "x": 2,
        "y": 0,
        "lockedBy": "left-blue",
        "lockCount": 1,
        "shutterId": "r147-83-left"
      },
      {
        "id": "r147-83-l5",
        "color": "cyan",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 1,
        "y": 0,
        "keyId": "left-red",
        "shutterId": "r147-83-left"
      },
      {
        "id": "r147-83-l3",
        "color": "pink",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 3,
        "y": 0,
        "shutterId": "r147-83-left"
      },
      {
        "id": "r147-83-l4",
        "color": "green",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 0,
        "y": 2,
        "shutterId": "r147-83-left"
      },
      {
        "id": "r147-83-l7",
        "color": "pink",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 1,
        "y": 2,
        "shutterId": "r147-83-left"
      },
      {
        "id": "r147-83-l6",
        "color": "blue",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 2,
        "y": 2,
        "shutterId": "r147-83-left"
      },
      {
        "id": "r147-83-l2",
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 3,
        "y": 2,
        "keyId": "left-blue",
        "shutterId": "r147-83-left"
      },
      {
        "id": "r147-83-r0",
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
        "x": 0,
        "y": 3,
        "lockedBy": "right-orange",
        "lockCount": 1,
        "shutterId": "r147-83-right"
      },
      {
        "id": "r147-83-r1",
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
            1,
            1
          ]
        ],
        "x": 2,
        "y": 3,
        "lockedBy": "right-green",
        "lockCount": 1,
        "shutterId": "r147-83-right"
      },
      {
        "id": "r147-83-r7",
        "color": "cyan",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 1,
        "y": 3,
        "keyId": "right-orange",
        "shutterId": "r147-83-right"
      },
      {
        "id": "r147-83-r5",
        "color": "blue",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 3,
        "y": 3,
        "shutterId": "r147-83-right"
      },
      {
        "id": "r147-83-r4",
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 0,
        "y": 5,
        "keyId": "right-green",
        "shutterId": "r147-83-right"
      },
      {
        "id": "r147-83-r2",
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 1,
        "y": 5,
        "shutterId": "r147-83-right"
      },
      {
        "id": "r147-83-r6",
        "color": "orange",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 2,
        "y": 5,
        "shutterId": "r147-83-right"
      },
      {
        "id": "r147-83-r3",
        "color": "pink",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 3,
        "y": 5,
        "shutterId": "r147-83-right"
      }
    ],
    "gates": [
      {
        "id": "r147-83-g-cyan",
        "color": "cyan",
        "side": "left",
        "offset": 5,
        "size": 2
      },
      {
        "id": "r147-83-g-yellow",
        "color": "yellow",
        "frozen": 6,
        "side": "bottom",
        "offset": 2,
        "size": 3
      },
      {
        "id": "r147-83-g-blue",
        "color": "blue",
        "frozen": 10,
        "side": "left",
        "offset": 1,
        "size": 2
      },
      {
        "id": "r147-83-g-purple",
        "color": "purple",
        "frozen": 2,
        "side": "left",
        "offset": 9,
        "size": 2
      },
      {
        "id": "r147-83-g-pink",
        "color": "pink",
        "side": "right",
        "offset": 0,
        "size": 2
      },
      {
        "id": "r147-83-g-orange",
        "color": "orange",
        "side": "right",
        "offset": 5,
        "size": 2
      },
      {
        "id": "r147-83-g-red",
        "color": "red",
        "side": "right",
        "offset": 8,
        "size": 2
      },
      {
        "id": "r147-83-g-green",
        "color": "green",
        "frozen": 8,
        "side": "right",
        "offset": 3,
        "size": 2
      }
    ]
  },
  "84": {
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
        "id": "r155-84-red",
        "side": "bottom",
        "offset": 3,
        "size": 3,
        "color": "red"
      },
      {
        "id": "r155-84-cyan",
        "side": "right",
        "offset": 7,
        "size": 3,
        "color": "cyan"
      },
      {
        "id": "r155-84-blue",
        "side": "left",
        "offset": 7,
        "size": 3,
        "color": "blue",
        "frozen": 2
      },
      {
        "id": "r155-84-yellow",
        "side": "bottom",
        "offset": 0,
        "size": 3,
        "color": "yellow",
        "frozen": 7
      },
      {
        "id": "r155-84-green",
        "side": "right",
        "offset": 2,
        "size": 3,
        "color": "green",
        "frozen": 12
      },
      {
        "id": "r155-84-purple",
        "side": "left",
        "offset": 2,
        "size": 3,
        "color": "purple",
        "frozen": 17
      },
      {
        "id": "r155-84-orange",
        "side": "top",
        "offset": 1,
        "size": 3,
        "color": "orange",
        "frozen": 31
      }
    ],
    "blocks": [
      {
        "id": "r147-84-o7",
        "color": "blue",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 0,
        "y": 2
      },
      {
        "id": "r147-84-o4",
        "color": "green",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 6,
        "y": 8
      },
      {
        "id": "r147-84-o11",
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 6,
        "y": 9
      },
      {
        "id": "r147-84-o2",
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
        ],
        "x": 0,
        "y": 5
      },
      {
        "id": "r147-84-o10",
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
        ],
        "x": 0,
        "y": 7
      },
      {
        "id": "r147-84-o6",
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
        "y": 9,
        "layers": [
          "cyan",
          "blue"
        ]
      },
      {
        "id": "r147-84-o0",
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
        "x": 2,
        "y": 8
      },
      {
        "id": "r147-84-o5",
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
        "y": 9,
        "keyId": "red"
      },
      {
        "id": "r147-84-o8",
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
        ],
        "x": 4,
        "y": 8
      },
      {
        "id": "r147-84-o9",
        "color": "blue",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 0,
        "y": 4
      },
      {
        "id": "r147-84-o3",
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 5,
        "y": 8,
        "keyId": "red"
      },
      {
        "id": "r147-84-o1",
        "color": "green",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 0,
        "y": 3
      },
      {
        "id": "r147-84-c6-2",
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
        ],
        "x": 6,
        "y": 5,
        "layers": [
          "green",
          "purple"
        ],
        "lockedBy": "red",
        "lockCount": 3,
        "shutterId": "r155-84-cover-6"
      },
      {
        "id": "r147-84-c6-0",
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
        "x": 5,
        "y": 6,
        "keyId": "red",
        "shutterId": "r155-84-cover-6"
      },
      {
        "id": "r147-84-c6-3",
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
        "x": 3,
        "y": 5,
        "layers": [
          "blue",
          "cyan"
        ],
        "shutterId": "r155-84-cover-6"
      },
      {
        "id": "r147-84-c6-1",
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
            0,
            2
          ]
        ],
        "x": 2,
        "y": 5,
        "layers": [
          "cyan",
          "orange"
        ],
        "shutterId": "r155-84-cover-6"
      },
      {
        "id": "r147-84-c6-4",
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
        "x": 3,
        "y": 6,
        "shutterId": "r155-84-cover-6"
      },
      {
        "id": "r147-84-c15-1",
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
            0,
            2
          ]
        ],
        "x": 2,
        "y": 2,
        "layers": [
          "cyan",
          "orange"
        ],
        "shutterId": "r155-84-cover-15"
      },
      {
        "id": "r147-84-c15-axis",
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
        "x": 3,
        "y": 2,
        "movementAxis": "vertical",
        "shutterId": "r155-84-cover-15"
      },
      {
        "id": "r147-84-c15-0",
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
        ],
        "x": 6,
        "y": 2,
        "layers": [
          "yellow",
          "purple"
        ],
        "shutterId": "r155-84-cover-15"
      },
      {
        "id": "r147-84-c15-3",
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
        ],
        "x": 3,
        "y": 3,
        "layers": [
          "purple",
          "cyan"
        ],
        "shutterId": "r155-84-cover-15"
      },
      {
        "id": "r147-84-c15-2",
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
        "x": 5,
        "y": 3,
        "shutterId": "r155-84-cover-15"
      },
      {
        "id": "r147-84-c24-0",
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
        ],
        "x": 1,
        "y": 0,
        "layers": [
          "cyan",
          "orange"
        ],
        "shutterId": "r155-84-cover-24"
      },
      {
        "id": "r147-84-c24-2",
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
        "x": 1,
        "y": 2,
        "layers": [
          "red",
          "orange"
        ],
        "shutterId": "r155-84-cover-24"
      },
      {
        "id": "r147-84-c24-1",
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
            0,
            2
          ]
        ],
        "x": 1,
        "y": 5,
        "layers": [
          "cyan",
          "orange"
        ],
        "shutterId": "r155-84-cover-24"
      },
      {
        "id": "r147-84-c26-1",
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
        ],
        "x": 2,
        "y": 0,
        "layers": [
          "purple",
          "orange"
        ],
        "shutterId": "r155-84-cover-26"
      },
      {
        "id": "r147-84-c26-0",
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
        "x": 4,
        "y": 0,
        "layers": [
          "green",
          "cyan"
        ],
        "shutterId": "r155-84-cover-26"
      }
    ],
    "id": 84,
    "name": "量子高墙",
    "difficulty": "super",
    "timeSeconds": 170,
    "reward": 195,
    "parMoves": 125,
    "preservedMoveTarget": 125,
    "shutters": [
      {
        "id": "r155-84-cover-6",
        "count": 6,
        "x": 2,
        "y": 5,
        "width": 5,
        "height": 3
      },
      {
        "id": "r155-84-cover-15",
        "count": 15,
        "x": 2,
        "y": 2,
        "width": 5,
        "height": 3
      },
      {
        "id": "r155-84-cover-24",
        "count": 24,
        "x": 1,
        "y": 0,
        "width": 1,
        "height": 8
      },
      {
        "id": "r155-84-cover-26",
        "count": 26,
        "x": 2,
        "y": 0,
        "width": 4,
        "height": 2
      }
    ]
  },
  "85": {
    "mechanismRules": "revised-2026-09-23-v1.4",
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
    "gates": [
      {
        "id": "r147-85-g-red",
        "color": "red",
        "side": "left",
        "offset": 5,
        "size": 2,
        "portals": [
          {
            "side": "left",
            "origin": [
              0,
              5
            ],
            "size": 2
          }
        ],
        "frozen": 8
      },
      {
        "id": "r147-85-g-yellow",
        "color": "yellow",
        "side": "top",
        "offset": 2,
        "size": 3,
        "portals": [
          {
            "side": "top",
            "origin": [
              2,
              0
            ],
            "size": 3
          }
        ],
        "frozen": 2
      },
      {
        "id": "r147-85-g-purple",
        "color": "purple",
        "side": "right",
        "offset": 5,
        "size": 2,
        "portals": [
          {
            "side": "right",
            "origin": [
              5,
              5
            ],
            "size": 2
          }
        ]
      },
      {
        "id": "r147-85-g-green",
        "color": "green",
        "side": "right",
        "offset": 2,
        "size": 3,
        "portals": [
          {
            "side": "right",
            "origin": [
              5,
              2
            ],
            "size": 3
          }
        ],
        "frozen": 1
      },
      {
        "id": "r147-85-g-cyan",
        "color": "cyan",
        "side": "bottom",
        "offset": 2,
        "size": 3,
        "portals": [
          {
            "side": "bottom",
            "origin": [
              2,
              8
            ],
            "size": 3
          }
        ],
        "frozen": 6
      },
      {
        "id": "r147-85-g-blue",
        "color": "blue",
        "side": "left",
        "offset": 1,
        "size": 2,
        "portals": [
          {
            "side": "left",
            "origin": [
              0,
              1
            ],
            "size": 2
          }
        ],
        "frozen": 4
      }
    ],
    "blocks": [
      {
        "id": "r147-85-o6",
        "color": "blue",
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
        ]
      },
      {
        "id": "r147-85-o15",
        "color": "green",
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
        "id": "r147-85-o12",
        "color": "red",
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
        ]
      },
      {
        "id": "r147-85-o8",
        "color": "yellow",
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
        "movementAxis": "vertical"
      },
      {
        "id": "r147-85-o9",
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
        "id": "r147-85-o1",
        "color": "cyan",
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
        ]
      },
      {
        "id": "r147-85-o4",
        "color": "red",
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
        "id": "r147-85-o7",
        "color": "green",
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
            1,
            1
          ]
        ]
      },
      {
        "id": "r147-85-o17",
        "color": "blue",
        "x": 5,
        "y": 3,
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "r147-85-o2",
        "color": "green",
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
        ]
      },
      {
        "id": "r147-85-o11",
        "color": "yellow",
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
        ]
      },
      {
        "id": "r147-85-o5",
        "color": "cyan",
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
        ]
      },
      {
        "id": "r147-85-o10",
        "color": "purple",
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
        "id": "r147-85-fill",
        "color": "cyan",
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
        ]
      },
      {
        "id": "r147-85-o18",
        "color": "green",
        "x": 3,
        "y": 6,
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "r147-85-o3",
        "color": "purple",
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
        ]
      },
      {
        "id": "r147-85-o14",
        "color": "purple",
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
        ]
      },
      {
        "id": "r147-85-o13",
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
          ],
          [
            1,
            1
          ]
        ]
      },
      {
        "id": "r147-85-o16",
        "color": "yellow",
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
        ]
      }
    ],
    "id": 85,
    "name": "稳定窗口 · 轴向可解种子 · 混合封闭脊柱",
    "difficulty": "easy",
    "timeSeconds": 165,
    "reward": 200,
    "parMoves": 25,
    "preservedMoveTarget": 33,
    "shutters": []
  },
  "86": {
    "mechanismRules": "revised-2026-09-23-v1.4",
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
    "gates": [
      {
        "id": "r147-86-g-blue",
        "color": "blue",
        "side": "left",
        "offset": 2,
        "size": 2,
        "portals": [
          {
            "side": "left",
            "origin": [
              0,
              2
            ],
            "size": 2
          }
        ],
        "frozen": 2
      },
      {
        "id": "r147-86-g-green",
        "color": "green",
        "side": "top",
        "offset": 1,
        "size": 2,
        "portals": [
          {
            "side": "top",
            "origin": [
              1,
              0
            ],
            "size": 2
          }
        ],
        "frozen": 2
      },
      {
        "id": "r147-86-g-orange",
        "color": "orange",
        "side": "bottom",
        "offset": 3,
        "size": 1,
        "portals": [
          {
            "side": "bottom",
            "origin": [
              3,
              5
            ],
            "size": 1
          }
        ]
      },
      {
        "id": "r147-86-g-red",
        "color": "red",
        "side": "bottom",
        "offset": 0,
        "size": 2,
        "portals": [
          {
            "side": "bottom",
            "origin": [
              0,
              5
            ],
            "size": 2
          }
        ],
        "frozen": 3
      },
      {
        "id": "r147-86-g-yellow",
        "color": "yellow",
        "side": "left",
        "offset": 1,
        "size": 1,
        "portals": [
          {
            "side": "left",
            "origin": [
              0,
              1
            ],
            "size": 1
          }
        ],
        "frozen": 3
      },
      {
        "id": "r147-86-g-purple",
        "color": "purple",
        "side": "right",
        "offset": 3,
        "size": 2,
        "portals": [
          {
            "side": "right",
            "origin": [
              3,
              3
            ],
            "size": 2
          }
        ]
      }
    ],
    "blocks": [
      {
        "id": "r147-86-o4",
        "color": "purple",
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
        "id": "r147-86-o13",
        "color": "red",
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
        "id": "r147-86-o1",
        "color": "purple",
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
        ]
      },
      {
        "id": "r147-86-o6",
        "color": "red",
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
        ]
      },
      {
        "id": "r147-86-o7",
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
        "lockedBy": "red-key",
        "lockCount": 1
      },
      {
        "id": "r147-86-o10",
        "color": "blue",
        "x": 3,
        "y": 1,
        "shape": [
          [
            0,
            0
          ]
        ],
        "keyId": "red-key"
      },
      {
        "id": "r147-86-o9",
        "color": "yellow",
        "x": 3,
        "y": 2,
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "r147-86-o2",
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
        "id": "r147-86-o15",
        "color": "yellow",
        "x": 1,
        "y": 3,
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "r147-86-o11",
        "color": "purple",
        "x": 2,
        "y": 3,
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "r147-86-o14",
        "color": "green",
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
        "id": "r147-86-o12",
        "color": "purple",
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
        ]
      },
      {
        "id": "r147-86-o8",
        "color": "orange",
        "x": 2,
        "y": 4,
        "shape": [
          [
            0,
            0
          ]
        ],
        "keyId": "cyan-key"
      },
      {
        "id": "r147-86-o5",
        "color": "purple",
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
        "id": "r147-86-o16",
        "color": "green",
        "x": 0,
        "y": 5,
        "shape": [
          [
            0,
            0
          ]
        ],
        "lockedBy": "cyan-key",
        "lockCount": 1
      },
      {
        "id": "r147-86-o3",
        "color": "green",
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
    "id": 86,
    "name": "高阶跃迁",
    "difficulty": "normal",
    "timeSeconds": 80,
    "reward": 205,
    "parMoves": 31,
    "preservedMoveTarget": 31,
    "shutters": []
  },
  "87": {
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
        "id": "r147-87-g-yellow",
        "color": "yellow",
        "side": "right",
        "offset": 0,
        "size": 2
      },
      {
        "id": "r147-87-g-red",
        "color": "red",
        "side": "top",
        "offset": 4,
        "size": 3
      },
      {
        "id": "r147-87-g-green",
        "color": "green",
        "side": "left",
        "offset": 5,
        "size": 2
      },
      {
        "id": "r147-87-g-purple",
        "color": "purple",
        "side": "left",
        "offset": 7,
        "size": 2,
        "frozen": 17
      },
      {
        "id": "r147-87-g-blue",
        "color": "blue",
        "side": "top",
        "offset": 1,
        "size": 3,
        "frozen": 5
      }
    ],
    "blocks": [
      {
        "id": "r147-87-o13",
        "color": "red",
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
        "frozen": 9
      },
      {
        "id": "r147-87-o16",
        "color": "blue",
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
        "frozen": 9
      },
      {
        "id": "r147-87-o12",
        "color": "red",
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
        "frozen": 9
      },
      {
        "id": "r147-87-o18",
        "color": "yellow",
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
        "frozen": 9
      },
      {
        "id": "r147-87-o17",
        "color": "blue",
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
        "frozen": 9
      },
      {
        "id": "r147-87-o15",
        "color": "red",
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
            0,
            1
          ],
          [
            1,
            1
          ]
        ],
        "frozen": 9
      },
      {
        "id": "r147-87-o1",
        "color": "green",
        "x": 0,
        "y": 8,
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "r147-87-o14",
        "color": "green",
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
          ],
          [
            2,
            0
          ]
        ],
        "frozen": 9
      },
      {
        "id": "r147-87-fill2",
        "color": "green",
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
        ]
      },
      {
        "id": "r147-87-o3",
        "color": "blue",
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
        "layers": [
          "blue",
          "green"
        ]
      },
      {
        "id": "r147-87-o4",
        "color": "red",
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
        ]
      },
      {
        "id": "r147-87-fill3",
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
        ]
      },
      {
        "id": "r147-87-o9",
        "color": "red",
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
        ]
      },
      {
        "id": "r147-87-o7",
        "color": "yellow",
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
        ]
      },
      {
        "id": "r147-87-fill6",
        "color": "red",
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
        "id": "r147-87-o5",
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
          ],
          [
            2,
            0
          ]
        ],
        "layers": [
          "blue",
          "purple"
        ]
      },
      {
        "id": "r147-87-o10",
        "color": "red",
        "x": 6,
        "y": 2,
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "r147-87-o8",
        "color": "yellow",
        "x": 0,
        "y": 3,
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "r147-87-fill7",
        "color": "green",
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
        ]
      },
      {
        "id": "r147-87-fill5",
        "color": "yellow",
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
        ]
      },
      {
        "id": "r147-87-fill4",
        "color": "blue",
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
        ]
      },
      {
        "id": "r147-87-o6",
        "color": "green",
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
        "layers": [
          "green",
          "purple"
        ]
      },
      {
        "id": "r147-87-o2",
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
          ]
        ]
      },
      {
        "id": "r147-87-o11",
        "color": "green",
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
        "layers": [
          "green",
          "blue"
        ]
      },
      {
        "id": "r147-87-fill1",
        "color": "yellow",
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
        ]
      },
      {
        "id": "r147-87-q0-0",
        "color": "red",
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
        ]
      },
      {
        "id": "r147-87-q0-1",
        "color": "yellow",
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
        "id": "r147-87-q0-2",
        "color": "red",
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
        ]
      },
      {
        "id": "r147-87-q1-0",
        "color": "green",
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
        ]
      },
      {
        "id": "r147-87-q1-1",
        "color": "blue",
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
        ]
      },
      {
        "id": "r147-87-q1-2",
        "color": "green",
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
        ]
      }
    ],
    "generators": [
      {
        "id": "r147-87-generator0",
        "side": "left",
        "offset": 2,
        "spawn": [
          0,
          2
        ],
        "rimMount": "rim",
        "rimSpan": 3,
        "queueBlockIds": [
          "r147-87-q0-0",
          "r147-87-q0-1",
          "r147-87-q0-2"
        ]
      },
      {
        "id": "r147-87-generator1",
        "side": "right",
        "offset": 6,
        "spawn": [
          5,
          6
        ],
        "rimMount": "rim",
        "rimSpan": 3,
        "queueBlockIds": [
          "r147-87-q1-0",
          "r147-87-q1-1",
          "r147-87-q1-2"
        ]
      }
    ],
    "id": 87,
    "name": "冻结矩阵",
    "difficulty": "normal",
    "timeSeconds": 165,
    "reward": 210,
    "parMoves": 44,
    "preservedMoveTarget": 50,
    "shutters": []
  },
  "88": {
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
        "id": "r152-88-gate-yellow",
        "color": "yellow",
        "side": "top",
        "offset": 0,
        "size": 3
      },
      {
        "id": "r152-88-gate-green",
        "color": "green",
        "side": "right",
        "offset": 7,
        "size": 3,
        "frozen": 12
      },
      {
        "id": "r152-88-gate-purple",
        "color": "purple",
        "side": "bottom",
        "offset": 0,
        "size": 3,
        "frozen": 12
      },
      {
        "id": "r152-88-gate-red",
        "color": "red",
        "side": "top",
        "offset": 4,
        "size": 3,
        "frozen": 4
      },
      {
        "id": "r152-88-gate-blue",
        "color": "blue",
        "side": "left",
        "offset": 6,
        "size": 3,
        "frozen": 9
      },
      {
        "id": "r152-88-gate-orange",
        "color": "orange",
        "side": "bottom",
        "offset": 3,
        "size": 3,
        "frozen": 11
      }
    ],
    "blocks": [
      {
        "id": "r152-88-fill-1",
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
        "x": 0,
        "y": 0
      },
      {
        "id": "r152-88-o23",
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
        "x": 4,
        "y": 0
      },
      {
        "id": "r152-88-o08",
        "color": "orange",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 3,
        "y": 0
      },
      {
        "id": "r152-88-o15",
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 3,
        "y": 1
      },
      {
        "id": "r152-88-fill-2",
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
        "x": 4,
        "y": 2
      },
      {
        "id": "r152-88-o03",
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
        "x": 2,
        "y": 2
      },
      {
        "id": "r152-88-o17",
        "color": "red",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 6,
        "y": 0
      },
      {
        "id": "r152-88-o13",
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
        "x": 0,
        "y": 1
      },
      {
        "id": "r152-88-o18",
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
        "x": 1,
        "y": 1,
        "layers": [
          "red",
          "yellow"
        ]
      },
      {
        "id": "r152-88-o25",
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
        "x": 4,
        "y": 1,
        "layers": [
          "orange",
          "red"
        ]
      },
      {
        "id": "r152-88-o20",
        "color": "green",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 6,
        "y": 1
      },
      {
        "id": "r152-88-o07",
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
        "x": 1,
        "y": 2
      },
      {
        "id": "r152-88-o19",
        "color": "blue",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 3,
        "y": 2
      },
      {
        "id": "r152-88-o04",
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
        ],
        "x": 3,
        "y": 3
      },
      {
        "id": "r152-88-o16",
        "color": "orange",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 0,
        "y": 4
      },
      {
        "id": "r152-88-o21",
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 1,
        "y": 4
      },
      {
        "id": "r152-88-o11",
        "color": "purple",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 2,
        "y": 4
      },
      {
        "id": "r152-88-o22",
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
        "x": 1,
        "y": 5
      },
      {
        "id": "r152-88-o05",
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
        "x": 3,
        "y": 5
      },
      {
        "id": "r152-88-o26",
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
        "x": 4,
        "y": 5,
        "layers": [
          "yellow",
          "red"
        ]
      },
      {
        "id": "r152-88-o10",
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
        ],
        "x": 0,
        "y": 6
      },
      {
        "id": "r152-88-o02",
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
        "x": 1,
        "y": 6
      },
      {
        "id": "r152-88-fill-3",
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
        "x": 4,
        "y": 6
      },
      {
        "id": "r152-88-o14",
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
        "x": 2,
        "y": 7
      },
      {
        "id": "r152-88-o12",
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
        "x": 0,
        "y": 8
      },
      {
        "id": "r152-88-o24",
        "color": "orange",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 1,
        "y": 8
      },
      {
        "id": "r152-88-o09",
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
        "y": 8
      },
      {
        "id": "r152-88-o01",
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
        "x": 2,
        "y": 9
      },
      {
        "id": "r152-88-o06",
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
        "x": 4,
        "y": 9,
        "layers": [
          "orange",
          "green"
        ]
      },
      {
        "id": "r152-88-q01",
        "color": "purple",
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
            2,
            1
          ]
        ],
        "x": 0,
        "y": 1
      },
      {
        "id": "r152-88-q02",
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
        "x": 0,
        "y": 1
      },
      {
        "id": "r152-88-q11",
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
            1,
            1
          ]
        ],
        "x": 5,
        "y": 1
      },
      {
        "id": "r152-88-q12",
        "color": "red",
        "shape": [
          [
            1,
            1
          ]
        ],
        "x": 5,
        "y": 1
      }
    ],
    "id": 88,
    "name": "叠态枢纽",
    "difficulty": "hard",
    "timeSeconds": 180,
    "reward": 215,
    "parMoves": 51,
    "preservedMoveTarget": 54,
    "generators": [
      {
        "id": "r152-88-generator-1",
        "side": "left",
        "offset": 2,
        "rimSpan": 3,
        "rimMount": "rim",
        "spawn": [
          0,
          1
        ],
        "queueBlockIds": [
          "r152-88-q01",
          "r152-88-q02"
        ]
      },
      {
        "id": "r152-88-generator-2",
        "side": "right",
        "offset": 2,
        "rimSpan": 3,
        "rimMount": "rim",
        "spawn": [
          5,
          1
        ],
        "queueBlockIds": [
          "r152-88-q11",
          "r152-88-q12"
        ]
      }
    ]
  },
  "89": {
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
      ]
    ],
    "gates": [
      {
        "id": "gate-green",
        "color": "green",
        "side": "left",
        "offset": 4,
        "size": 3
      },
      {
        "id": "gate-yellow",
        "color": "yellow",
        "side": "right",
        "offset": 4,
        "size": 3,
        "frozen": 2
      },
      {
        "id": "gate-blue",
        "color": "blue",
        "side": "right",
        "offset": 1,
        "size": 3,
        "frozen": 4
      },
      {
        "id": "gate-purple",
        "color": "purple",
        "side": "top",
        "offset": 1,
        "size": 3,
        "frozen": 6
      },
      {
        "id": "gate-orange",
        "color": "orange",
        "side": "left",
        "offset": 1,
        "size": 3,
        "frozen": 8
      },
      {
        "id": "gate-red",
        "color": "red",
        "side": "bottom",
        "offset": 2,
        "size": 3,
        "frozen": 12
      },
      {
        "id": "gate-cyan",
        "color": "cyan",
        "side": "right",
        "offset": 8,
        "size": 3,
        "frozen": 18
      }
    ],
    "blocks": [
      {
        "id": "a89-o08",
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
        "x": 1,
        "y": 0
      },
      {
        "id": "a89-o02",
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
        "x": 3,
        "y": 0
      },
      {
        "id": "a89-o12",
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
        "x": 1,
        "y": 11,
        "frozen": 7
      },
      {
        "id": "a89-o10",
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
        "y": 11
      },
      {
        "id": "a89-o03",
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
        "x": 0,
        "y": 4
      },
      {
        "id": "a89-o11",
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
        "y": 4
      },
      {
        "id": "a89-o04",
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
        "x": 4,
        "y": 4
      },
      {
        "id": "a89-o07",
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 6,
        "y": 4
      },
      {
        "id": "a89-o01",
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
        "x": 2,
        "y": 5
      },
      {
        "id": "a89-o05",
        "color": "orange",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 4,
        "y": 5
      },
      {
        "id": "a89-o09",
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 5,
        "y": 5
      },
      {
        "id": "a89-o06",
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
        "id": "a89-s7-05",
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
        "x": 0,
        "y": 1,
        "shutterId": "s7"
      },
      {
        "id": "a89-s7-06",
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
        "x": 2,
        "y": 1,
        "shutterId": "s7"
      },
      {
        "id": "a89-s7-07",
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
            0,
            2
          ]
        ],
        "x": 3,
        "y": 1,
        "shutterId": "s7",
        "keyId": "red-key"
      },
      {
        "id": "a89-s7-02",
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
            0,
            2
          ]
        ],
        "x": 4,
        "y": 1,
        "shutterId": "s7"
      },
      {
        "id": "a89-s7-08",
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
        ],
        "x": 5,
        "y": 1,
        "shutterId": "s7"
      },
      {
        "id": "a89-s7-01",
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
        ],
        "x": 6,
        "y": 1,
        "shutterId": "s7",
        "lockedBy": "red-key",
        "lockCount": 2
      },
      {
        "id": "a89-s7-04",
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
        "y": 2,
        "shutterId": "s7"
      },
      {
        "id": "a89-s7-03",
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
          ]
        ],
        "x": 0,
        "y": 3,
        "shutterId": "s7",
        "keyId": "red-key"
      },
      {
        "id": "a89-s12-01",
        "color": "red",
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
        "x": 2,
        "y": 6,
        "shutterId": "s12",
        "movementAxis": "vertical"
      },
      {
        "id": "a89-s12-02",
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
        "y": 8,
        "shutterId": "s12"
      },
      {
        "id": "a89-s12-03",
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
            0,
            2
          ]
        ],
        "x": 3,
        "y": 8,
        "shutterId": "s12"
      },
      {
        "id": "a89-s12-04",
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
        "x": 4,
        "y": 8,
        "shutterId": "s12"
      },
      {
        "id": "a89-fill0",
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
        "x": 0,
        "y": 6,
        "shutterId": "s12"
      },
      {
        "id": "a89-fill1",
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
        "x": 4,
        "y": 6,
        "shutterId": "s12"
      },
      {
        "id": "a89-fill2",
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
        "x": 0,
        "y": 7,
        "shutterId": "s12"
      },
      {
        "id": "a89-fill3",
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
        "x": 5,
        "y": 7,
        "shutterId": "s12"
      },
      {
        "id": "a89-q01",
        "color": "yellow",
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
        "x": 0,
        "y": 8
      },
      {
        "id": "a89-q02",
        "color": "blue",
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
            2,
            1
          ]
        ],
        "x": 0,
        "y": 8
      },
      {
        "id": "a89-q03",
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
        "x": 0,
        "y": 8
      }
    ],
    "id": 89,
    "name": "迷阵收束 · 轴向可解种子",
    "difficulty": "easy",
    "timeSeconds": 150,
    "reward": 220,
    "parMoves": 45,
    "preservedMoveTarget": 45,
    "shutters": [
      {
        "id": "s7",
        "count": 7,
        "x": 0,
        "y": 1,
        "width": 7,
        "height": 3
      },
      {
        "id": "s12",
        "count": 12,
        "x": 0,
        "y": 6,
        "width": 7,
        "height": 5
      }
    ],
    "generators": [
      {
        "id": "machine0",
        "side": "left",
        "offset": 9,
        "rimSpan": 3,
        "rimMount": "rim",
        "spawn": [
          0,
          8
        ],
        "queueBlockIds": [
          "a89-q01",
          "a89-q02",
          "a89-q03"
        ]
      }
    ]
  },
  "90": {
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
        "id": "r152-90-gate-blue",
        "color": "blue",
        "side": "top",
        "offset": 0,
        "size": 3
      },
      {
        "id": "r152-90-gate-red",
        "color": "red",
        "side": "top",
        "offset": 3,
        "size": 3
      },
      {
        "id": "r152-90-gate-yellow",
        "color": "yellow",
        "side": "bottom",
        "offset": 0,
        "size": 3,
        "frozen": 10
      },
      {
        "id": "r152-90-gate-green",
        "color": "green",
        "side": "bottom",
        "offset": 3,
        "size": 3,
        "frozen": 6
      }
    ],
    "blocks": [
      {
        "id": "r152-90-access-0-0",
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
        "x": 0,
        "y": 0
      },
      {
        "id": "r152-90-access-0-1",
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
        "x": 3,
        "y": 0
      },
      {
        "id": "r152-90-access-1-0",
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
        "x": 0,
        "y": 1
      },
      {
        "id": "r152-90-access-1-1",
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
        "x": 3,
        "y": 1
      },
      {
        "id": "r152-90-access-2-0",
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
        "x": 1,
        "y": 2
      },
      {
        "id": "r152-90-access-2-1",
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
        "x": 3,
        "y": 2
      },
      {
        "id": "r152-90-access-3-0",
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
        "x": 1,
        "y": 3
      },
      {
        "id": "r152-90-access-3-1",
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
        "x": 3,
        "y": 3
      },
      {
        "id": "r152-90-fill-0",
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
        "x": 0,
        "y": 4
      },
      {
        "id": "r152-90-fill-1",
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
        "x": 3,
        "y": 4
      },
      {
        "id": "r152-90-fill-5",
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
        "x": 4,
        "y": 4
      },
      {
        "id": "r152-90-fill-2",
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
        "x": 5,
        "y": 4
      },
      {
        "id": "r152-90-fill-3",
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
        "x": 0,
        "y": 5
      },
      {
        "id": "r152-90-o02",
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
        ],
        "x": 0,
        "y": 6
      },
      {
        "id": "r152-90-o01",
        "color": "blue",
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
        "x": 3,
        "y": 6
      },
      {
        "id": "r152-90-fill-4",
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
        "x": 1,
        "y": 7
      },
      {
        "id": "r152-90-q01",
        "color": "yellow",
        "shape": [
          [
            0,
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
        "y": 5
      },
      {
        "id": "r152-90-q02",
        "color": "green",
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
            2
          ],
          [
            1,
            2
          ]
        ],
        "x": 0,
        "y": 5
      },
      {
        "id": "r152-90-q03",
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
        "x": 0,
        "y": 5
      },
      {
        "id": "r152-90-q04",
        "color": "yellow",
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
            2,
            1
          ]
        ],
        "x": 0,
        "y": 5
      },
      {
        "id": "r152-90-q05",
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
        "y": 5
      },
      {
        "id": "r152-90-q06",
        "color": "blue",
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
            2
          ],
          [
            1,
            2
          ]
        ],
        "x": 0,
        "y": 5
      },
      {
        "id": "r152-90-q07",
        "color": "green",
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
            2,
            1
          ],
          [
            0,
            2
          ]
        ],
        "x": 0,
        "y": 5
      },
      {
        "id": "r152-90-q08",
        "color": "red",
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
            2,
            1
          ],
          [
            0,
            2
          ]
        ],
        "x": 0,
        "y": 5
      },
      {
        "id": "r152-90-q09",
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
        "x": 0,
        "y": 5
      },
      {
        "id": "r152-90-q11",
        "color": "yellow",
        "shape": [
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
          ],
          [
            2,
            2
          ]
        ],
        "x": 3,
        "y": 5
      },
      {
        "id": "r152-90-q12",
        "color": "green",
        "shape": [
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
          ]
        ],
        "x": 3,
        "y": 5
      },
      {
        "id": "r152-90-q13",
        "color": "yellow",
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
            2,
            1
          ]
        ],
        "x": 3,
        "y": 5
      },
      {
        "id": "r152-90-q14",
        "color": "red",
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
        "x": 3,
        "y": 5
      },
      {
        "id": "r152-90-q15",
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
          ],
          [
            2,
            1
          ]
        ],
        "x": 3,
        "y": 5
      },
      {
        "id": "r152-90-q16",
        "color": "blue",
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
            2,
            1
          ]
        ],
        "x": 3,
        "y": 5
      },
      {
        "id": "r152-90-q17",
        "color": "red",
        "shape": [
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
          ],
          [
            2,
            2
          ]
        ],
        "x": 3,
        "y": 5
      },
      {
        "id": "r152-90-q18",
        "color": "blue",
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
            2,
            1
          ],
          [
            0,
            2
          ]
        ],
        "x": 3,
        "y": 5
      },
      {
        "id": "r152-90-q19",
        "color": "yellow",
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
            2,
            1
          ]
        ],
        "x": 3,
        "y": 5
      }
    ],
    "id": 90,
    "name": "量子核心",
    "difficulty": "normal",
    "timeSeconds": 150,
    "reward": 225,
    "parMoves": 49,
    "preservedMoveTarget": 49,
    "generators": [
      {
        "id": "r152-90-machine-0",
        "side": "left",
        "offset": 6,
        "rimSpan": 3,
        "rimMount": "rim",
        "spawn": [
          0,
          5
        ],
        "queueBlockIds": [
          "r152-90-q01",
          "r152-90-q02",
          "r152-90-q03",
          "r152-90-q04",
          "r152-90-q05",
          "r152-90-q06",
          "r152-90-q07",
          "r152-90-q08",
          "r152-90-q09"
        ]
      },
      {
        "id": "r152-90-machine-1",
        "side": "right",
        "offset": 6,
        "rimSpan": 3,
        "rimMount": "rim",
        "spawn": [
          3,
          5
        ],
        "queueBlockIds": [
          "r152-90-q11",
          "r152-90-q12",
          "r152-90-q13",
          "r152-90-q14",
          "r152-90-q15",
          "r152-90-q16",
          "r152-90-q17",
          "r152-90-q18",
          "r152-90-q19"
        ]
      }
    ]
  }
};
export const applyRemake81to90 = (level: LevelSpec): LevelSpec => reviewed[level.id] ?? level;
