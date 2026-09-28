// v1.45 batch, independently reviewed under the v1.47 rule lock.
// Historical candidates and certificates remain in the batch deliverables.
import type { LevelSpec } from './types';

export const REMADE_61_70_IDS: readonly number[] = [61,62,63,64,65,66,67,68,69,70];
const reviewed: Record<number, LevelSpec> = {
  "61": {
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
    "id": 61,
    "name": "工坊巡检 · 轴向可解种子",
    "difficulty": "easy",
    "timeSeconds": 130,
    "reward": 140,
    "parMoves": 29,
    "blocks": [
      {
        "id": "v146-61-opening-9",
        "x": 1,
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
          ]
        ]
      },
      {
        "id": "v146-61-opening-11",
        "x": 3,
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
        "id": "v146-61-opening-10",
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
        ],
        "movementAxis": "horizontal"
      },
      {
        "id": "v146-61-opening-4",
        "x": 2,
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
          ]
        ]
      },
      {
        "id": "v146-61-opening-6",
        "x": 4,
        "y": 4,
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
        "id": "v146-61-added-h2",
        "x": 2,
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
          ]
        ]
      },
      {
        "id": "v146-61-opening-3",
        "x": 0,
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
          ]
        ]
      },
      {
        "id": "v146-61-opening-8",
        "x": 2,
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
          ]
        ],
        "movementAxis": "vertical"
      },
      {
        "id": "v146-61-opening-2",
        "x": 4,
        "y": 6,
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
        ]
      },
      {
        "id": "v146-61-opening-5",
        "x": 5,
        "y": 6,
        "color": "cyan",
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "v146-61-added-h3",
        "x": 0,
        "y": 7,
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
        ]
      },
      {
        "id": "v146-61-opening-1",
        "x": 3,
        "y": 7,
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
        ]
      },
      {
        "id": "v146-61-opening-7",
        "x": 1,
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
        "id": "v146-61-cover-4-2",
        "x": 0,
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
          ]
        ],
        "shutterId": "v146-61-cover-4"
      },
      {
        "id": "v146-61-cover-4-8",
        "x": 2,
        "y": 1,
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
        "shutterId": "v146-61-cover-4"
      },
      {
        "id": "v146-61-cover-4-1",
        "x": 4,
        "y": 1,
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
        "shutterId": "v146-61-cover-4"
      },
      {
        "id": "v146-61-cover-4-7",
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
          ]
        ],
        "shutterId": "v146-61-cover-4"
      },
      {
        "id": "v146-61-cover-4-4",
        "x": 2,
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
          ]
        ],
        "movementAxis": "horizontal",
        "shutterId": "v146-61-cover-4"
      },
      {
        "id": "v146-61-cover-4-6",
        "x": 4,
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
        ],
        "shutterId": "v146-61-cover-4"
      },
      {
        "id": "v146-61-cover-4-5",
        "x": 0,
        "y": 3,
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
        "shutterId": "v146-61-cover-4"
      },
      {
        "id": "v146-61-cover-4-3",
        "x": 2,
        "y": 3,
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
        "movementAxis": "horizontal",
        "shutterId": "v146-61-cover-4"
      }
    ],
    "gates": [
      {
        "id": "v146-61-gate-orange",
        "color": "orange",
        "frozen": 4,
        "side": "left",
        "size": 2,
        "offset": 2
      },
      {
        "id": "v146-61-gate-green",
        "color": "green",
        "frozen": 5,
        "side": "right",
        "size": 3,
        "offset": 1
      },
      {
        "id": "v146-61-gate-red",
        "color": "red",
        "frozen": 8,
        "side": "top",
        "size": 3,
        "offset": 1
      },
      {
        "id": "v146-61-gate-blue",
        "color": "blue",
        "frozen": 1,
        "side": "left",
        "size": 2,
        "offset": 4
      },
      {
        "id": "v146-61-gate-yellow",
        "color": "yellow",
        "frozen": 3,
        "side": "right",
        "size": 2,
        "offset": 6
      },
      {
        "id": "v146-61-gate-pink",
        "color": "pink",
        "side": "left",
        "size": 2,
        "offset": 6
      },
      {
        "id": "v146-61-gate-cyan",
        "color": "cyan",
        "frozen": 2,
        "side": "bottom",
        "size": 3,
        "offset": 1
      },
      {
        "id": "v146-61-gate-purple",
        "color": "purple",
        "frozen": 6,
        "side": "right",
        "size": 2,
        "offset": 4
      }
    ],
    "preservedMoveTarget": 31,
    "shutters": [
      {
        "id": "v146-61-cover-4",
        "x": 0,
        "y": 1,
        "width": 6,
        "height": 3,
        "count": 4
      }
    ]
  },
  "62": {
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
    "id": 62,
    "name": "单舱调度",
    "difficulty": "normal",
    "timeSeconds": 125,
    "reward": 145,
    "parMoves": 35,
    "blocks": [
      {
        "id": "v146-62-added-single",
        "x": 1,
        "y": 0,
        "color": "purple",
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "v146-62-opening-8",
        "x": 2,
        "y": 0,
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
        ]
      },
      {
        "id": "v146-62-opening-7",
        "x": 5,
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
          ]
        ]
      },
      {
        "id": "v146-62-opening-12",
        "x": 5,
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
        "id": "v146-62-opening-11",
        "x": 0,
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
          "pink"
        ]
      },
      {
        "id": "v146-62-opening-13",
        "x": 2,
        "y": 4,
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
        "id": "v146-62-opening-2",
        "x": 3,
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
          ]
        ]
      },
      {
        "id": "v146-62-opening-4",
        "x": 3,
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
        "id": "v146-62-opening-1",
        "x": 0,
        "y": 6,
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
        "id": "v146-62-opening-10",
        "x": 2,
        "y": 6,
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
        "id": "v146-62-opening-3",
        "x": 4,
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
          ]
        ]
      },
      {
        "id": "v146-62-opening-9",
        "x": 4,
        "y": 7,
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
        "id": "v146-62-opening-5",
        "x": 1,
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
        "id": "v146-62-opening-6",
        "x": 3,
        "y": 8,
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
        "id": "v146-62-cover-4-3",
        "x": 0,
        "y": 1,
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
        "shutterId": "v146-62-cover-4"
      },
      {
        "id": "v146-62-cover-4-2",
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
          ]
        ],
        "shutterId": "v146-62-cover-4"
      },
      {
        "id": "v146-62-cover-4-1",
        "x": 4,
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
          ],
          [
            0,
            2
          ]
        ],
        "frozen": 5,
        "shutterId": "v146-62-cover-4"
      },
      {
        "id": "v146-62-cover-4-5",
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
          ]
        ],
        "shutterId": "v146-62-cover-4"
      },
      {
        "id": "v146-62-cover-4-7",
        "x": 2,
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
        ],
        "shutterId": "v146-62-cover-4"
      },
      {
        "id": "v146-62-cover-4-6",
        "x": 3,
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
          ]
        ],
        "shutterId": "v146-62-cover-4"
      },
      {
        "id": "v146-62-cover-4-4",
        "x": 0,
        "y": 3,
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
        "shutterId": "v146-62-cover-4"
      },
      {
        "id": "v146-62-cargo-1",
        "x": 0,
        "y": 4,
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
        ]
      },
      {
        "id": "v146-62-cargo-2",
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
        "id": "v146-62-cargo-3",
        "x": 0,
        "y": 4,
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
          ],
          [
            0,
            1
          ]
        ]
      }
    ],
    "gates": [
      {
        "id": "v146-62-gate-yellow",
        "color": "yellow",
        "side": "left",
        "size": 2,
        "offset": 6
      },
      {
        "id": "v146-62-gate-purple",
        "color": "purple",
        "frozen": 1,
        "side": "right",
        "size": 2,
        "offset": 4
      },
      {
        "id": "v146-62-gate-cyan",
        "color": "cyan",
        "frozen": 7,
        "side": "top",
        "size": 3,
        "offset": 1
      },
      {
        "id": "v146-62-gate-pink",
        "color": "pink",
        "frozen": 5,
        "side": "left",
        "size": 2,
        "offset": 1
      },
      {
        "id": "v146-62-gate-blue",
        "color": "blue",
        "frozen": 8,
        "side": "bottom",
        "size": 3,
        "offset": 1
      },
      {
        "id": "v146-62-gate-red",
        "color": "red",
        "frozen": 11,
        "side": "right",
        "size": 3,
        "offset": 1
      },
      {
        "id": "v146-62-gate-green",
        "color": "green",
        "frozen": 3,
        "side": "right",
        "size": 2,
        "offset": 6
      }
    ],
    "preservedMoveTarget": 41,
    "shutters": [
      {
        "id": "v146-62-cover-4",
        "x": 0,
        "y": 1,
        "width": 5,
        "height": 3,
        "count": 4
      }
    ],
    "generators": [
      {
        "id": "v146-62-machine",
        "side": "left",
        "offset": 4,
        "rimSpan": 3,
        "rimMount": "rim",
        "spawn": [
          0,
          4
        ],
        "queueBlockIds": [
          "v146-62-cargo-1",
          "v146-62-cargo-2",
          "v146-62-cargo-3"
        ]
      }
    ]
  },
  "63": {
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
    "id": 63,
    "name": "分流枢纽 · 轴向可解种子",
    "difficulty": "super",
    "timeSeconds": 180,
    "reward": 150,
    "parMoves": 31,
    "blocks": [
      {
        "id": "v146-63-opening-4",
        "x": 0,
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
        "id": "v146-63-opening-2",
        "x": 2,
        "y": 0,
        "color": "blue",
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "v146-63-opening-13",
        "x": 3,
        "y": 0,
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
        "id": "v146-63-opening-5",
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
          ]
        ],
        "movementAxis": "horizontal"
      },
      {
        "id": "v146-63-opening-6",
        "x": 0,
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
          ]
        ],
        "movementAxis": "horizontal"
      },
      {
        "id": "v146-63-opening-14",
        "x": 2,
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
          ],
          [
            1,
            1
          ]
        ]
      },
      {
        "id": "v146-63-opening-1",
        "x": 5,
        "y": 1,
        "color": "red",
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "v146-63-opening-10",
        "x": 0,
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
        ],
        "layers": [
          "purple",
          "cyan"
        ]
      },
      {
        "id": "v146-63-opening-7",
        "x": 4,
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
          ]
        ]
      },
      {
        "id": "v146-63-opening-16",
        "x": 2,
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
        "id": "v146-63-opening-11",
        "x": 3,
        "y": 3,
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
        ]
      },
      {
        "id": "v146-63-opening-8",
        "x": 0,
        "y": 4,
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
        ]
      },
      {
        "id": "v146-63-opening-3",
        "x": 4,
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
          ]
        ]
      },
      {
        "id": "v146-63-opening-15",
        "x": 0,
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
        ]
      },
      {
        "id": "v146-63-opening-18",
        "x": 3,
        "y": 5,
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
        "movementAxis": "vertical"
      },
      {
        "id": "v146-63-opening-17",
        "x": 0,
        "y": 6,
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
        "movementAxis": "horizontal"
      },
      {
        "id": "v146-63-opening-9",
        "x": 4,
        "y": 6,
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
        ]
      },
      {
        "id": "v146-63-opening-12",
        "x": 1,
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
          ],
          [
            2,
            0
          ]
        ]
      }
    ],
    "gates": [
      {
        "id": "v146-63-gate-blue",
        "color": "blue",
        "frozen": 3,
        "side": "left",
        "size": 2,
        "offset": 0
      },
      {
        "id": "v146-63-gate-orange",
        "color": "orange",
        "frozen": 10,
        "side": "right",
        "size": 3,
        "offset": 5
      },
      {
        "id": "v146-63-gate-yellow",
        "color": "yellow",
        "frozen": 2,
        "side": "right",
        "size": 3,
        "offset": 0
      },
      {
        "id": "v146-63-gate-cyan",
        "color": "cyan",
        "frozen": 12,
        "side": "bottom",
        "size": 3,
        "offset": 3
      },
      {
        "id": "v146-63-gate-purple",
        "color": "purple",
        "frozen": 7,
        "side": "left",
        "size": 3,
        "offset": 4
      },
      {
        "id": "v146-63-gate-green",
        "color": "green",
        "side": "top",
        "size": 3,
        "offset": 2
      },
      {
        "id": "v146-63-gate-pink",
        "color": "pink",
        "frozen": 1,
        "side": "top",
        "size": 2,
        "offset": 0
      },
      {
        "id": "v146-63-gate-red",
        "color": "red",
        "frozen": 14,
        "side": "bottom",
        "size": 3,
        "offset": 0
      }
    ],
    "preservedMoveTarget": 31
  },
  "64": {
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
    "id": 64,
    "name": "暗舱开启",
    "difficulty": "easy",
    "timeSeconds": 195,
    "reward": 155,
    "parMoves": 43,
    "blocks": [
      {
        "id": "v146-64-opening-1",
        "x": 3,
        "y": 9,
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "v146-64-opening-10",
        "x": 6,
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
        "id": "v146-64-opening-11",
        "x": 0,
        "y": 9,
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
        ]
      },
      {
        "id": "v146-64-opening-8",
        "x": 2,
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
          ]
        ]
      },
      {
        "id": "v146-64-opening-4",
        "x": 0,
        "y": 4,
        "color": "red",
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "v146-64-opening-6",
        "x": 0,
        "y": 5,
        "color": "purple",
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "v146-64-opening-7",
        "x": 1,
        "y": 5,
        "color": "red",
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "v146-64-opening-9",
        "x": 0,
        "y": 2,
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
        ]
      },
      {
        "id": "v146-64-opening-3",
        "x": 3,
        "y": 4,
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "v146-64-opening-2",
        "x": 2,
        "y": 4,
        "color": "red",
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "v146-64-opening-5",
        "x": 1,
        "y": 4,
        "color": "blue",
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "v146-64-cover-5-1",
        "x": 0,
        "y": 8,
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
        "shutterId": "v146-64-cover-5"
      },
      {
        "id": "v146-64-cover-5-5",
        "x": 3,
        "y": 6,
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
        "shutterId": "v146-64-cover-5"
      },
      {
        "id": "v146-64-cover-5-3",
        "x": 0,
        "y": 6,
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
        "shutterId": "v146-64-cover-5"
      },
      {
        "id": "v146-64-cover-5-2",
        "x": 1,
        "y": 6,
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
        "shutterId": "v146-64-cover-5"
      },
      {
        "id": "v146-64-cover-5-4",
        "x": 2,
        "y": 7,
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
        "shutterId": "v146-64-cover-5"
      },
      {
        "id": "v146-64-cover-8-3",
        "x": 1,
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
            2,
            0
          ],
          [
            0,
            1
          ]
        ],
        "shutterId": "v146-64-cover-8"
      },
      {
        "id": "v146-64-added-cover8-1",
        "x": 4,
        "y": 0,
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ]
        ],
        "shutterId": "v146-64-cover-8"
      },
      {
        "id": "v146-64-cover-8-1",
        "x": 5,
        "y": 0,
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
        "shutterId": "v146-64-cover-8"
      },
      {
        "id": "v146-64-cover-8-2",
        "x": 3,
        "y": 3,
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
        "shutterId": "v146-64-cover-8"
      },
      {
        "id": "v146-64-cover-8-4",
        "x": 1,
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
          "orange"
        ],
        "shutterId": "v146-64-cover-8"
      },
      {
        "id": "v146-64-cover-8-5",
        "x": 2,
        "y": 1,
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
            1,
            1
          ],
          [
            2,
            1
          ]
        ],
        "shutterId": "v146-64-cover-8"
      },
      {
        "id": "v146-64-added-cover8-2",
        "x": 4,
        "y": 1,
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ]
        ],
        "shutterId": "v146-64-cover-8"
      },
      {
        "id": "v146-64-cover-13-4",
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
        "shutterId": "v146-64-cover-13"
      },
      {
        "id": "v146-64-cover-13-2",
        "x": 5,
        "y": 5,
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
        "layers": [
          "purple",
          "green"
        ],
        "shutterId": "v146-64-cover-13"
      },
      {
        "id": "v146-64-cover-13-1",
        "x": 4,
        "y": 6,
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
        "frozen": 3,
        "shutterId": "v146-64-cover-13"
      },
      {
        "id": "v146-64-cover-13-5",
        "x": 6,
        "y": 7,
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
        "shutterId": "v146-64-cover-13"
      },
      {
        "id": "v146-64-cover-13-3",
        "x": 4,
        "y": 8,
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
          "cyan"
        ],
        "shutterId": "v146-64-cover-13"
      },
      {
        "id": "v146-64-added-cover5-1",
        "x": 2,
        "y": 6,
        "color": "purple",
        "shape": [
          [
            0,
            0
          ]
        ],
        "shutterId": "v146-64-cover-5"
      }
    ],
    "gates": [
      {
        "id": "v146-64-gate-red",
        "color": "red",
        "side": "left",
        "size": 2,
        "offset": 4
      },
      {
        "id": "v146-64-gate-purple",
        "color": "purple",
        "frozen": 3,
        "side": "left",
        "size": 2,
        "offset": 2
      },
      {
        "id": "v146-64-gate-green",
        "color": "green",
        "frozen": 6,
        "side": "left",
        "size": 3,
        "offset": 6
      },
      {
        "id": "v146-64-gate-yellow",
        "color": "yellow",
        "frozen": 8,
        "side": "top",
        "size": 2,
        "offset": 3
      },
      {
        "id": "v146-64-gate-orange",
        "color": "orange",
        "frozen": 16,
        "side": "top",
        "size": 2,
        "offset": 1
      },
      {
        "id": "v146-64-gate-blue",
        "color": "blue",
        "frozen": 17,
        "side": "bottom",
        "size": 3,
        "offset": 0
      },
      {
        "id": "v146-64-gate-cyan",
        "color": "cyan",
        "frozen": 22,
        "side": "right",
        "size": 3,
        "offset": 2
      }
    ],
    "preservedMoveTarget": 43,
    "shutters": [
      {
        "id": "v146-64-cover-8",
        "x": 1,
        "y": 0,
        "width": 5,
        "height": 4,
        "count": 8
      },
      {
        "id": "v146-64-cover-13",
        "x": 4,
        "y": 4,
        "width": 3,
        "height": 6,
        "count": 13
      },
      {
        "id": "v146-64-cover-5",
        "x": 0,
        "y": 6,
        "width": 4,
        "height": 3,
        "count": 5
      }
    ]
  },
  "65": {
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
        "id": "v146-65-gate-blue",
        "side": "left",
        "offset": 4,
        "size": 3,
        "color": "blue"
      },
      {
        "id": "v146-65-gate-purple",
        "side": "bottom",
        "offset": 2,
        "size": 3,
        "color": "purple"
      },
      {
        "id": "v146-65-gate-green",
        "side": "top",
        "offset": 3,
        "size": 3,
        "color": "green"
      },
      {
        "id": "v146-65-gate-red",
        "side": "left",
        "offset": 0,
        "size": 3,
        "color": "red"
      },
      {
        "id": "v146-65-gate-yellow",
        "side": "right",
        "offset": 1,
        "size": 3,
        "color": "yellow"
      },
      {
        "id": "v146-65-gate-pink",
        "side": "right",
        "offset": 5,
        "size": 3,
        "color": "pink"
      }
    ],
    "blocks": [
      {
        "id": "v146-65-opening-1",
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
        "id": "v146-65-opening-10",
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
        "id": "v146-65-opening-5",
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
        "id": "v146-65-opening-3",
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
        "color": "green"
      },
      {
        "id": "v146-65-opening-8",
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
        "color": "red"
      },
      {
        "id": "v146-65-opening-9",
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
        "color": "pink"
      },
      {
        "id": "v146-65-opening-4",
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
        "color": "yellow"
      },
      {
        "id": "v146-65-opening-6",
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
        "color": "blue"
      },
      {
        "id": "v146-65-opening-7",
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
        "frozen": 10
      },
      {
        "id": "v146-65-opening-2",
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
        "color": "purple"
      },
      {
        "id": "v146-65-opening-0",
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
        "color": "green"
      },
      {
        "id": "v146-65-padding-3",
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
        "id": "v146-65-padding-1",
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
        "id": "v146-65-padding-0",
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
        "id": "v146-65-padding-2",
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
        "color": "purple"
      },
      {
        "id": "v146-65-padding-4",
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
        "color": "red"
      },
      {
        "id": "v146-65-lift2-4",
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
        "color": "red",
        "shutterId": "v146-65-lift2"
      },
      {
        "id": "v146-65-lift2-3",
        "x": 1,
        "y": 0,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "yellow",
        "shutterId": "v146-65-lift2"
      },
      {
        "id": "v146-65-lift2-2",
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
        "color": "purple",
        "shutterId": "v146-65-lift2"
      },
      {
        "id": "v146-65-lift2-10",
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
        "color": "yellow",
        "shutterId": "v146-65-lift2"
      },
      {
        "id": "v146-65-lift2-1",
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
        "shutterId": "v146-65-lift2"
      },
      {
        "id": "v146-65-lift2-7",
        "x": 3,
        "y": 2,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "purple",
        "shutterId": "v146-65-lift2"
      },
      {
        "id": "v146-65-lift2-5",
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
        "color": "green",
        "shutterId": "v146-65-lift2"
      },
      {
        "id": "v146-65-lift2-6",
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
        "color": "blue",
        "shutterId": "v146-65-lift2"
      },
      {
        "id": "v146-65-lift2-9",
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
        "shutterId": "v146-65-lift2"
      },
      {
        "id": "v146-65-lift2-8",
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
        "color": "yellow",
        "shutterId": "v146-65-lift2"
      },
      {
        "id": "v146-65-lift2-0",
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
        "color": "red",
        "shutterId": "v146-65-lift2"
      },
      {
        "id": "v146-65-lift2-11",
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
        "color": "blue",
        "shutterId": "v146-65-lift2"
      }
    ],
    "id": 65,
    "name": "机械休整",
    "difficulty": "easy",
    "timeSeconds": 180,
    "reward": 160,
    "parMoves": 29,
    "featureIntro": {
      "kind": "lift",
      "title": "分层框！",
      "description": "清空当前框层内的全部指定方块，下一层色块才会整体显现。"
    },
    "shutters": [
      {
        "id": "v146-65-lift2",
        "x": 0,
        "y": 0,
        "width": 5,
        "height": 6,
        "count": 0,
        "skin": "lift"
      }
    ],
    "preservedMoveTarget": 38
  },
  "66": {
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
        "id": "v146-66-gate-green",
        "side": "top",
        "offset": 4,
        "size": 3,
        "color": "green"
      },
      {
        "id": "v146-66-gate-red",
        "side": "bottom",
        "offset": 0,
        "size": 3,
        "color": "red",
        "frozen": 1
      },
      {
        "id": "v146-66-gate-purple",
        "side": "left",
        "offset": 2,
        "size": 3,
        "color": "purple",
        "frozen": 2
      },
      {
        "id": "v146-66-gate-yellow",
        "side": "right",
        "offset": 3,
        "size": 3,
        "color": "yellow",
        "frozen": 3
      },
      {
        "id": "v146-66-gate-cyan",
        "side": "bottom",
        "offset": 3,
        "size": 2,
        "color": "cyan",
        "frozen": 4
      },
      {
        "id": "v146-66-gate-blue",
        "side": "left",
        "offset": 5,
        "size": 3,
        "color": "blue",
        "frozen": 16
      }
    ],
    "blocks": [
      {
        "id": "v146-66-ice-1",
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
        "color": "red",
        "frozen": 6
      },
      {
        "id": "v146-66-ice-3",
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
        "frozen": 6
      },
      {
        "id": "v146-66-ice-4",
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
        "color": "red",
        "frozen": 6
      },
      {
        "id": "v146-66-ice-0",
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
        "color": "purple",
        "frozen": 6
      },
      {
        "id": "v146-66-ice-2",
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
        "color": "yellow",
        "frozen": 6
      },
      {
        "id": "v146-66-opening-5",
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
        "id": "v146-66-opening-7",
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
        "color": "purple"
      },
      {
        "id": "v146-66-opening-8",
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
        "color": "blue"
      },
      {
        "id": "v146-66-padding-1",
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
        "color": "purple"
      },
      {
        "id": "v146-66-opening-10",
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
        "color": "blue"
      },
      {
        "id": "v146-66-padding-2",
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
        "id": "v146-66-padding-0",
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
        "color": "yellow"
      },
      {
        "id": "v146-66-opening-3",
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
        "color": "green"
      },
      {
        "id": "v146-66-opening-2",
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
        "id": "v146-66-opening-0",
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
        "color": "cyan"
      },
      {
        "id": "v146-66-opening-4",
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
        "color": "yellow"
      },
      {
        "id": "v146-66-opening-6",
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
        "color": "purple"
      },
      {
        "id": "v146-66-opening-11",
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
        "color": "cyan"
      },
      {
        "id": "v146-66-opening-1",
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
        "color": "red"
      },
      {
        "id": "v146-66-opening-9",
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
        "id": "v146-66-lift2-0",
        "x": 0,
        "y": 0,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "yellow",
        "shutterId": "v146-66-lift2"
      },
      {
        "id": "v146-66-lift2-3",
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
        "color": "red",
        "frozen": 5,
        "shutterId": "v146-66-lift2"
      },
      {
        "id": "v146-66-lift2-1",
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
        "layers": [
          "yellow",
          "blue"
        ],
        "shutterId": "v146-66-lift2"
      },
      {
        "id": "v146-66-lift2-2",
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
        "color": "purple",
        "frozen": 5,
        "shutterId": "v146-66-lift2"
      },
      {
        "id": "v146-66-lift2-4",
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
        "color": "blue",
        "shutterId": "v146-66-lift2"
      }
    ],
    "id": 66,
    "name": "阶段接力",
    "difficulty": "normal",
    "timeSeconds": 180,
    "reward": 165,
    "parMoves": 40,
    "shutters": [
      {
        "id": "v146-66-lift2",
        "x": 0,
        "y": 0,
        "width": 5,
        "height": 3,
        "count": 0,
        "skin": "lift"
      }
    ],
    "preservedMoveTarget": 40
  },
  "67": {
    "mechanismRules": "revised-2026-09-23-v1.4",
    "width": 7,
    "height": 10,
    "playable": [
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
        "id": "v146-67-gate-green",
        "side": "left",
        "offset": 2,
        "size": 3,
        "color": "green"
      },
      {
        "id": "v146-67-gate-yellow",
        "side": "left",
        "offset": 5,
        "size": 3,
        "color": "yellow",
        "frozen": 1
      },
      {
        "id": "v146-67-gate-red",
        "side": "bottom",
        "offset": 2,
        "size": 3,
        "color": "red",
        "frozen": 3
      },
      {
        "id": "v146-67-gate-cyan",
        "side": "top",
        "offset": 2,
        "size": 3,
        "color": "cyan",
        "frozen": 4
      },
      {
        "id": "v146-67-gate-purple",
        "side": "right",
        "offset": 2,
        "size": 3,
        "color": "purple",
        "frozen": 5
      },
      {
        "id": "v146-67-gate-blue",
        "side": "right",
        "offset": 5,
        "size": 3,
        "color": "blue",
        "frozen": 5
      }
    ],
    "blocks": [
      {
        "id": "v146-67-lift1-0",
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
        "color": "yellow",
        "frozen": 5
      },
      {
        "id": "v146-67-lift1-1",
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
        "color": "blue",
        "frozen": 5
      },
      {
        "id": "v146-67-lift1-2",
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
        "frozen": 5
      },
      {
        "id": "v146-67-padding-2",
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
        "color": "blue"
      },
      {
        "id": "v146-67-padding-7",
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
        "color": "blue"
      },
      {
        "id": "v146-67-padding-4",
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
        "color": "purple"
      },
      {
        "id": "v146-67-opening-6",
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
        "id": "v146-67-opening-2",
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
        "color": "green"
      },
      {
        "id": "v146-67-padding-6",
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
        "color": "blue"
      },
      {
        "id": "v146-67-padding-3",
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
        "id": "v146-67-opening-7",
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
        ],
        "color": "red"
      },
      {
        "id": "v146-67-padding-1",
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
        "color": "blue"
      },
      {
        "id": "v146-67-opening-4",
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
        "color": "purple"
      },
      {
        "id": "v146-67-padding-5",
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
        "id": "v146-67-padding-0",
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
        "id": "v146-67-opening-0",
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
        "color": "green"
      },
      {
        "id": "v146-67-opening-3",
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
        "id": "v146-67-opening-1",
        "x": 3,
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
        "color": "red"
      },
      {
        "id": "v146-67-opening-5",
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
          ]
        ],
        "color": "cyan"
      },
      {
        "id": "v146-67-left-open-0",
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
        "color": "purple",
        "frozen": 10
      },
      {
        "id": "v146-67-lift2-0",
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
        "color": "blue",
        "shutterId": "v146-67-lift2"
      },
      {
        "id": "v146-67-lift2-1",
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
        "shutterId": "v146-67-lift2"
      },
      {
        "id": "v146-67-lift2-2",
        "x": 4,
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
        "color": "yellow",
        "shutterId": "v146-67-lift2"
      },
      {
        "id": "v146-67-lift2-3",
        "x": 6,
        "y": 6,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "green",
        "shutterId": "v146-67-lift2"
      },
      {
        "id": "v146-67-left-hidden-0",
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
        "color": "green",
        "shutterId": "v146-67-left-lift"
      },
      {
        "id": "v146-67-cover-0",
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
        "color": "cyan",
        "shutterId": "v146-67-cover"
      }
    ],
    "id": 67,
    "name": "隐藏冰块",
    "difficulty": "normal",
    "timeSeconds": 150,
    "reward": 170,
    "parMoves": 35,
    "shutters": [
      {
        "id": "v146-67-lift2",
        "x": 4,
        "y": 5,
        "width": 3,
        "height": 3,
        "count": 0,
        "skin": "lift"
      },
      {
        "id": "v146-67-left-lift",
        "x": 6,
        "y": 2,
        "width": 1,
        "height": 3,
        "count": 0,
        "skin": "lift"
      },
      {
        "id": "v146-67-cover",
        "x": 2,
        "y": 0,
        "width": 3,
        "height": 1,
        "count": 3
      }
    ],
    "preservedMoveTarget": 40
  },
  "68": {
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
        "id": "v147-68-gate-0",
        "side": "right",
        "offset": 1,
        "size": 3,
        "color": "red"
      },
      {
        "id": "v147-68-gate-1",
        "side": "right",
        "offset": 7,
        "size": 2,
        "color": "purple",
        "frozen": 5
      },
      {
        "id": "v147-68-gate-2",
        "side": "top",
        "offset": 2,
        "size": 3,
        "color": "yellow",
        "frozen": 3
      },
      {
        "id": "v147-68-gate-4",
        "side": "right",
        "offset": 4,
        "size": 3,
        "color": "blue",
        "frozen": 6
      },
      {
        "id": "v147-68-gate-3",
        "side": "left",
        "offset": 1,
        "size": 2,
        "color": "green",
        "frozen": 6
      }
    ],
    "blocks": [
      {
        "id": "v147-68-opening-fill-4",
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
        "color": "green"
      },
      {
        "id": "v147-68-opening-4",
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
        "color": "yellow"
      },
      {
        "id": "v147-68-opening-fill-2",
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
        "id": "v147-68-opening-7",
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
        "id": "v147-68-opening-5",
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
        "color": "blue"
      },
      {
        "id": "v147-68-opening-6",
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
        "color": "purple"
      },
      {
        "id": "v147-68-opening-fill-5",
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
        "id": "v147-68-opening-2",
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
        "color": "red"
      },
      {
        "id": "v147-68-opening-fill-3",
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
        "color": "green"
      },
      {
        "id": "v147-68-opening-9",
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
        "color": "red"
      },
      {
        "id": "v147-68-opening-8",
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
        "color": "red"
      },
      {
        "id": "v147-68-opening-3",
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
        "color": "blue"
      },
      {
        "id": "v147-68-opening-fill-1",
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
        "color": "green"
      },
      {
        "id": "v147-68-opening-1",
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
        "id": "v147-68-opening-fill-0",
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
        "color": "yellow"
      },
      {
        "id": "v147-68-opening-0",
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
        "color": "green"
      },
      {
        "id": "v147-68-cover10-0",
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
            0,
            1
          ],
          [
            1,
            1
          ]
        ],
        "color": "blue",
        "shutterId": "v147-68-cover10"
      },
      {
        "id": "v147-68-cover10-1",
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
        "color": "blue",
        "shutterId": "v147-68-cover10"
      },
      {
        "id": "v147-68-cover10-2",
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
        "color": "green",
        "shutterId": "v147-68-cover10"
      },
      {
        "id": "v147-68-cover10-3",
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
        "color": "yellow",
        "shutterId": "v147-68-cover10"
      },
      {
        "id": "v147-68-cover10-8",
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
        "color": "red",
        "shutterId": "v147-68-cover10"
      },
      {
        "id": "v147-68-cover10-4",
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
            0,
            1
          ],
          [
            1,
            1
          ]
        ],
        "color": "purple",
        "shutterId": "v147-68-cover10"
      },
      {
        "id": "v147-68-cover10-6",
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
          ]
        ],
        "color": "red",
        "shutterId": "v147-68-cover10"
      },
      {
        "id": "v147-68-cover10-5",
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
          ]
        ],
        "color": "purple",
        "shutterId": "v147-68-cover10"
      },
      {
        "id": "v147-68-cover10-fill-0",
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
        "color": "blue",
        "shutterId": "v147-68-cover10"
      },
      {
        "id": "v147-68-cover10-7",
        "x": 6,
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
        "color": "green",
        "shutterId": "v147-68-cover10"
      },
      {
        "id": "v147-68-lift2-5",
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
        "color": "purple",
        "shutterId": "v147-68-lift2"
      },
      {
        "id": "v147-68-lift2-2",
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
        "color": "yellow",
        "shutterId": "v147-68-lift2"
      },
      {
        "id": "v147-68-lift2-7",
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
        "color": "yellow",
        "shutterId": "v147-68-lift2"
      },
      {
        "id": "v147-68-lift2-4",
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
            2,
            0
          ],
          [
            0,
            1
          ]
        ],
        "color": "blue",
        "shutterId": "v147-68-lift2"
      },
      {
        "id": "v147-68-lift2-0",
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
        "color": "red",
        "shutterId": "v147-68-lift2"
      },
      {
        "id": "v147-68-lift2-6",
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
        "color": "green",
        "shutterId": "v147-68-lift2"
      },
      {
        "id": "v147-68-lift2-3",
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
            0,
            1
          ],
          [
            1,
            1
          ]
        ],
        "color": "blue",
        "shutterId": "v147-68-lift2"
      },
      {
        "id": "v147-68-lift2-1",
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
        "color": "purple",
        "shutterId": "v147-68-lift2"
      }
    ],
    "shutters": [
      {
        "id": "v147-68-cover10",
        "x": 0,
        "y": 6,
        "width": 7,
        "height": 4,
        "count": 10
      },
      {
        "id": "v147-68-lift2",
        "x": 0,
        "y": 6,
        "width": 7,
        "height": 4,
        "count": 1,
        "skin": "lift"
      }
    ],
    "id": 68,
    "name": "双室倒计",
    "difficulty": "hard",
    "timeSeconds": 190,
    "reward": 175,
    "parMoves": 35,
    "generators": [],
    "preservedMoveTarget": 53
  },
  "69": {
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
        "id": "v147-69-gate-0",
        "side": "left",
        "offset": 3,
        "size": 3,
        "color": "red"
      },
      {
        "id": "v147-69-gate-3",
        "side": "right",
        "offset": 3,
        "size": 3,
        "color": "blue",
        "frozen": 3
      },
      {
        "id": "v147-69-gate-5",
        "side": "left",
        "offset": 7,
        "size": 3,
        "color": "green",
        "frozen": 6
      },
      {
        "id": "v147-69-gate-1",
        "side": "right",
        "offset": 0,
        "size": 3,
        "color": "yellow",
        "frozen": 9
      },
      {
        "id": "v147-69-gate-4",
        "side": "bottom",
        "offset": 0,
        "size": 3,
        "color": "cyan",
        "frozen": 24
      },
      {
        "id": "v147-69-gate-2",
        "side": "bottom",
        "offset": 3,
        "size": 3,
        "color": "purple",
        "frozen": 13
      }
    ],
    "blocks": [
      {
        "id": "v147-69-opening-4",
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
        "color": "red"
      },
      {
        "id": "v147-69-opening-3",
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
        "id": "v147-69-opening-6",
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
        "color": "red"
      },
      {
        "id": "v147-69-opening-5",
        "x": 6,
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
        "id": "v147-69-opening-0",
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
      },
      {
        "id": "v147-69-opening-1",
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
        "color": "purple"
      },
      {
        "id": "v147-69-opening-8",
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
        "color": "yellow"
      },
      {
        "id": "v147-69-opening-2",
        "x": 1,
        "y": 6,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "blue",
        "layers": [
          "blue",
          "cyan"
        ]
      },
      {
        "id": "v147-69-opening-7",
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
        "color": "red",
        "layers": [
          "red",
          "green"
        ]
      },
      {
        "id": "v147-69-cover6-3",
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
        "color": "green",
        "shutterId": "v147-69-cover6"
      },
      {
        "id": "v147-69-cover6-0",
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
        "color": "blue",
        "shutterId": "v147-69-cover6"
      },
      {
        "id": "v147-69-cover6-2",
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
          ]
        ],
        "color": "blue",
        "layers": [
          "blue",
          "purple"
        ],
        "shutterId": "v147-69-cover6"
      },
      {
        "id": "v147-69-cover6-fill-0",
        "x": 3,
        "y": 8,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "blue",
        "shutterId": "v147-69-cover6"
      },
      {
        "id": "v147-69-cover6-4",
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
            1,
            1
          ]
        ],
        "color": "cyan",
        "shutterId": "v147-69-cover6"
      },
      {
        "id": "v147-69-cover6-1",
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
        "color": "cyan",
        "shutterId": "v147-69-cover6"
      },
      {
        "id": "v147-69-cover9-2",
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
        "color": "blue",
        "shutterId": "v147-69-cover9"
      },
      {
        "id": "v147-69-cover9-0",
        "x": 6,
        "y": 8,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "cyan",
        "shutterId": "v147-69-cover9"
      },
      {
        "id": "v147-69-cover9-3",
        "x": 4,
        "y": 8,
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
        "shutterId": "v147-69-cover9"
      },
      {
        "id": "v147-69-cover9-1",
        "x": 4,
        "y": 8,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "purple",
        "shutterId": "v147-69-cover9"
      },
      {
        "id": "v147-69-cover11-2",
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
        "color": "yellow",
        "shutterId": "v147-69-cover11"
      },
      {
        "id": "v147-69-cover11-3",
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
        "color": "blue",
        "shutterId": "v147-69-cover11"
      },
      {
        "id": "v147-69-cover11-0",
        "x": 6,
        "y": 1,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "cyan",
        "shutterId": "v147-69-cover11"
      },
      {
        "id": "v147-69-cover11-4",
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
            1,
            1
          ]
        ],
        "color": "yellow",
        "shutterId": "v147-69-cover11"
      },
      {
        "id": "v147-69-cover11-5",
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
        "color": "green",
        "shutterId": "v147-69-cover11"
      },
      {
        "id": "v147-69-cover11-1",
        "x": 6,
        "y": 3,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "cyan",
        "shutterId": "v147-69-cover11"
      },
      {
        "id": "v147-69-cover18-3",
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
        "color": "yellow",
        "shutterId": "v147-69-cover18"
      },
      {
        "id": "v147-69-cover18-0",
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
        "color": "purple",
        "layers": [
          "purple",
          "cyan"
        ],
        "shutterId": "v147-69-cover18"
      },
      {
        "id": "v147-69-cover18-4",
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
        "color": "yellow",
        "frozen": 5,
        "shutterId": "v147-69-cover18"
      },
      {
        "id": "v147-69-cover18-2",
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
        "color": "red",
        "layers": [
          "red",
          "green"
        ],
        "shutterId": "v147-69-cover18"
      },
      {
        "id": "v147-69-cover18-1",
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
        "layers": [
          "blue",
          "cyan"
        ],
        "shutterId": "v147-69-cover18"
      },
      {
        "id": "v147-69-lift2-4",
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
        "shutterId": "v147-69-lift2"
      },
      {
        "id": "v147-69-lift2-2",
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
        "shutterId": "v147-69-lift2"
      },
      {
        "id": "v147-69-lift2-1",
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
        "color": "yellow",
        "shutterId": "v147-69-lift2"
      },
      {
        "id": "v147-69-lift2-3",
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
        "color": "blue",
        "shutterId": "v147-69-lift2"
      },
      {
        "id": "v147-69-lift2-0",
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
        "color": "blue",
        "frozen": 3,
        "shutterId": "v147-69-lift2"
      }
    ],
    "shutters": [
      {
        "id": "v147-69-cover6",
        "x": 0,
        "y": 7,
        "width": 4,
        "height": 3,
        "count": 6
      },
      {
        "id": "v147-69-cover9",
        "x": 4,
        "y": 7,
        "width": 3,
        "height": 3,
        "count": 9
      },
      {
        "id": "v147-69-cover11",
        "x": 4,
        "y": 0,
        "width": 3,
        "height": 4,
        "count": 11
      },
      {
        "id": "v147-69-cover18",
        "x": 0,
        "y": 0,
        "width": 4,
        "height": 4,
        "count": 18
      },
      {
        "id": "v147-69-lift2",
        "x": 0,
        "y": 0,
        "width": 4,
        "height": 4,
        "count": 1,
        "skin": "lift"
      }
    ],
    "id": 69,
    "name": "错层迷城",
    "difficulty": "easy",
    "timeSeconds": 195,
    "reward": 180,
    "parMoves": 48,
    "generators": [],
    "preservedMoveTarget": 52
  },
  "70": {
    "mechanismRules": "revised-2026-09-23-v1.4",
    "width": 6,
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
        "id": "v146-70-gate-blue",
        "side": "left",
        "offset": 1,
        "size": 3,
        "color": "blue"
      },
      {
        "id": "v146-70-gate-green",
        "side": "bottom",
        "offset": 2,
        "size": 2,
        "color": "green",
        "frozen": 1
      },
      {
        "id": "v146-70-gate-yellow",
        "side": "right",
        "offset": 2,
        "size": 2,
        "color": "yellow",
        "frozen": 1
      },
      {
        "id": "v146-70-gate-pink",
        "side": "right",
        "offset": 4,
        "size": 2,
        "color": "pink",
        "frozen": 1
      }
    ],
    "blocks": [
      {
        "id": "v146-70-fill-10",
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
        "color": "green"
      },
      {
        "id": "v146-70-fill-11",
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
        "color": "pink"
      },
      {
        "id": "v146-70-fill-16",
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
        "color": "pink"
      },
      {
        "id": "v146-70-fill-1",
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
        "color": "blue"
      },
      {
        "id": "v146-70-fill-17",
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
        "color": "yellow"
      },
      {
        "id": "v146-70-fill-4",
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
        "color": "green"
      },
      {
        "id": "v146-70-fill-5",
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
        "id": "v146-70-fill-3",
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
        "color": "green"
      },
      {
        "id": "v146-70-fill-12",
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
        "color": "pink"
      },
      {
        "id": "v146-70-fill-15",
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
        "id": "v146-70-fill-6",
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
        "color": "blue"
      },
      {
        "id": "v146-70-fill-2",
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
        "color": "pink"
      },
      {
        "id": "v146-70-fill-7",
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
        "id": "v146-70-fill-0",
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
        "color": "pink"
      },
      {
        "id": "v146-70-opening",
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
        "color": "green"
      },
      {
        "id": "v146-70-fill-13",
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
        "id": "v146-70-fill-9",
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
        "color": "yellow"
      },
      {
        "id": "v146-70-fill-8",
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
        "color": "blue"
      },
      {
        "id": "v146-70-fill-14",
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
        "color": "pink"
      },
      {
        "id": "v146-70-queue-0",
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
        "id": "v146-70-queue-1",
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
      },
      {
        "id": "v146-70-queue-2",
        "x": 2,
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
        "id": "v146-70-queue-3",
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
        "color": "pink"
      },
      {
        "id": "v146-70-queue-4",
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
        "id": "v146-70-queue-5",
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
        "color": "green"
      },
      {
        "id": "v146-70-queue-6",
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
        "id": "v146-70-queue-7",
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
      },
      {
        "id": "v146-70-queue-8",
        "x": 2,
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
        "id": "v146-70-queue-9",
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
        "color": "pink"
      },
      {
        "id": "v146-70-queue-10",
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
        "id": "v146-70-queue-11",
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
        "color": "green"
      },
      {
        "id": "v146-70-queue-12",
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
        "id": "v146-70-queue-13",
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
      },
      {
        "id": "v146-70-queue-14",
        "x": 2,
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
        "id": "v146-70-queue-15",
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
        "id": "v146-70-queue-16",
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
        "color": "blue"
      }
    ],
    "generators": [
      {
        "id": "v146-70-generator",
        "side": "top",
        "offset": 2,
        "rimSpan": 3,
        "rimMount": "rim",
        "spawn": [
          2,
          0
        ],
        "queueBlockIds": [
          "v146-70-queue-0",
          "v146-70-queue-1",
          "v146-70-queue-2",
          "v146-70-queue-3",
          "v146-70-queue-4",
          "v146-70-queue-5",
          "v146-70-queue-6",
          "v146-70-queue-7",
          "v146-70-queue-8",
          "v146-70-queue-9",
          "v146-70-queue-10",
          "v146-70-queue-11",
          "v146-70-queue-12",
          "v146-70-queue-13",
          "v146-70-queue-14",
          "v146-70-queue-15",
          "v146-70-queue-16"
        ]
      }
    ],
    "id": 70,
    "name": "定时投放 · 五步清槽",
    "difficulty": "normal",
    "timeSeconds": 180,
    "reward": 185,
    "parMoves": 23,
    "preservedMoveTarget": 23
  }
};

export const applyRemake61to70 = (level: LevelSpec): LevelSpec => reviewed[level.id] ?? level;
