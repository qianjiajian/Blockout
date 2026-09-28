// Reviewed formal maps. 101 uses v1.54 L10; 102/109 are directly accepted under v1.56 with original L16 NOT_MET.
import type {LevelSpec} from './types';
export const REMADE_101_110_IDS: readonly number[] = [101,102,103,104,105,106,107,108,109,110];
const reviewed: Record<number,LevelSpec> = {
  "101": {
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
        "color": "purple",
        "side": "left",
        "offset": 4,
        "size": 3,
        "id": "r147-101-g0"
      },
      {
        "color": "blue",
        "side": "right",
        "offset": 4,
        "size": 2,
        "frozen": 1,
        "id": "r147-101-g1"
      },
      {
        "color": "red",
        "side": "bottom",
        "offset": 5,
        "size": 2,
        "id": "r147-101-g2"
      },
      {
        "color": "yellow",
        "side": "left",
        "offset": 2,
        "size": 2,
        "frozen": 9,
        "id": "r147-101-g3"
      },
      {
        "color": "green",
        "side": "bottom",
        "offset": 2,
        "size": 2,
        "star": true,
        "frozen": 3,
        "id": "r147-101-g4"
      },
      {
        "color": "red",
        "side": "right",
        "offset": 7,
        "size": 2,
        "star": true,
        "frozen": 14,
        "id": "r147-101-g5"
      },
      {
        "color": "blue",
        "side": "top",
        "offset": 4,
        "size": 3,
        "star": true,
        "frozen": 15,
        "id": "r147-101-g6"
      },
      {
        "color": "yellow",
        "side": "left",
        "offset": 7,
        "size": 2,
        "star": true,
        "frozen": 21,
        "id": "r147-101-g7"
      }
    ],
    "blocks": [
      {
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
        "x": 0,
        "y": 4,
        "id": "r147-101-opening-0"
      },
      {
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
        "y": 4,
        "id": "r147-101-opening-2"
      },
      {
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
        "y": 4,
        "id": "r147-101-opening-3"
      },
      {
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
        "y": 5,
        "id": "r147-101-opening-4"
      },
      {
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
        "y": 5,
        "id": "r147-101-opening-5"
      },
      {
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
        "x": 4,
        "y": 5,
        "id": "r147-101-opening-1"
      },
      {
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
        "x": 0,
        "y": 6,
        "id": "r147-101-cover4-6",
        "shutterId": "r147-101-cover4"
      },
      {
        "color": "blue",
        "star": true,
        "shape": [
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
        "y": 6,
        "id": "r147-101-cover4-2",
        "shutterId": "r147-101-cover4"
      },
      {
        "color": "blue",
        "star": true,
        "shape": [
          [
            0,
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
        "y": 6,
        "id": "r147-101-cover4-7",
        "shutterId": "r147-101-cover4"
      },
      {
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
        "x": 6,
        "y": 6,
        "id": "r147-101-cover4-4",
        "shutterId": "r147-101-cover4"
      },
      {
        "color": "red",
        "star": true,
        "shape": [
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
        "y": 7,
        "id": "r147-101-cover4-5",
        "shutterId": "r147-101-cover4"
      },
      {
        "color": "yellow",
        "star": true,
        "shape": [
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
        "x": 2,
        "y": 7,
        "id": "r147-101-cover4-8",
        "shutterId": "r147-101-cover4"
      },
      {
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
        "x": 4,
        "y": 7,
        "id": "r147-101-cover4-0",
        "shutterId": "r147-101-cover4"
      },
      {
        "color": "blue",
        "movementAxis": "vertical",
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
        "x": 4,
        "y": 8,
        "id": "r147-101-cover4-9",
        "shutterId": "r147-101-cover4"
      },
      {
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
        "y": 9,
        "id": "r147-101-cover4-3",
        "shutterId": "r147-101-cover4"
      },
      {
        "color": "green",
        "star": true,
        "shape": [
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
        "id": "r147-101-cover4-1",
        "shutterId": "r147-101-cover4"
      },
      {
        "color": "red",
        "star": true,
        "shape": [
          [
            0,
            0
          ],
          [
            1,
            0
          ],
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
        "id": "r147-101-cover9-7",
        "shutterId": "r147-101-cover9"
      },
      {
        "color": "blue",
        "star": true,
        "shape": [
          [
            0,
            0
          ],
          [
            1,
            0
          ],
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
        "id": "r147-101-cover9-5",
        "shutterId": "r147-101-cover9"
      },
      {
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
        "x": 4,
        "y": 0,
        "id": "r147-101-cover9-3",
        "shutterId": "r147-101-cover9"
      },
      {
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
        "x": 6,
        "y": 0,
        "id": "r147-101-cover9-6",
        "shutterId": "r147-101-cover9"
      },
      {
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
        "x": 0,
        "y": 2,
        "id": "r147-101-cover9-4",
        "shutterId": "r147-101-cover9"
      },
      {
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
        "y": 2,
        "id": "r147-101-cover9-1",
        "shutterId": "r147-101-cover9"
      },
      {
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
        "y": 2,
        "id": "r147-101-cover9-2",
        "shutterId": "r147-101-cover9"
      },
      {
        "color": "green",
        "star": true,
        "shape": [
          [
            0,
            0
          ],
          [
            1,
            0
          ],
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
        "y": 2,
        "id": "r147-101-cover9-0",
        "shutterId": "r147-101-cover9"
      }
    ],
    "shutters": [
      {
        "id": "r147-101-cover9",
        "x": 0,
        "y": 0,
        "width": 7,
        "height": 4,
        "count": 9
      },
      {
        "id": "r147-101-cover4",
        "x": 0,
        "y": 6,
        "width": 7,
        "height": 4,
        "count": 4
      }
    ],
    "id": 101,
    "name": "竞品映射 Lv101",
    "difficulty": "normal",
    "timeSeconds": 180,
    "reward": 200,
    "parMoves": 49,
    "preservedMoveTarget": 49
  },
  "102": {
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
        "color": "red",
        "side": "left",
        "offset": 0,
        "size": 1,
        "id": "r147-102-g0",
        "portals": [
          {
            "side": "left",
            "origin": [
              1,
              0
            ],
            "size": 1
          }
        ]
      },
      {
        "color": "blue",
        "side": "left",
        "offset": 3,
        "size": 2,
        "id": "r147-102-g1"
      },
      {
        "color": "green",
        "side": "left",
        "offset": 5,
        "size": 1,
        "id": "r147-102-g2"
      },
      {
        "color": "yellow",
        "side": "right",
        "offset": 1,
        "size": 1,
        "id": "r147-102-g3"
      },
      {
        "color": "purple",
        "side": "right",
        "offset": 8,
        "size": 1,
        "id": "r147-102-g4"
      },
      {
        "color": "orange",
        "side": "right",
        "offset": 3,
        "size": 2,
        "id": "r147-102-g5"
      },
      {
        "color": "red",
        "side": "bottom",
        "offset": 0,
        "size": 3,
        "star": true,
        "id": "r147-102-g6"
      },
      {
        "color": "yellow",
        "side": "left",
        "offset": 6,
        "size": 3,
        "star": true,
        "id": "r147-102-g7"
      },
      {
        "color": "green",
        "side": "bottom",
        "offset": 4,
        "size": 3,
        "star": true,
        "id": "r147-102-g8"
      },
      {
        "color": "purple",
        "side": "top",
        "offset": 1,
        "size": 3,
        "star": true,
        "id": "r147-102-g9"
      }
    ],
    "blocks": [
      {
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
        "y": 1,
        "id": "r147-102-opening-13"
      },
      {
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
        "y": 1,
        "id": "r147-102-opening-9"
      },
      {
        "color": "orange",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 5,
        "y": 1,
        "id": "r147-102-opening-1"
      },
      {
        "color": "red",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 6,
        "y": 1,
        "id": "r147-102-opening-3"
      },
      {
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 0,
        "y": 2,
        "id": "r147-102-opening-4"
      },
      {
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
        "y": 2,
        "id": "r147-102-opening-16"
      },
      {
        "color": "green",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 5,
        "y": 2,
        "id": "r147-102-opening-0"
      },
      {
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 6,
        "y": 2,
        "id": "r147-102-opening-8"
      },
      {
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
        "y": 3,
        "id": "r147-102-opening-10"
      },
      {
        "color": "purple",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 2,
        "y": 3,
        "id": "r147-102-opening-2"
      },
      {
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
        "x": 3,
        "y": 3,
        "id": "r147-102-opening-14"
      },
      {
        "color": "green",
        "star": true,
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 6,
        "y": 3,
        "id": "r147-102-opening-5"
      },
      {
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
        "x": 2,
        "y": 4,
        "id": "r147-102-opening-12"
      },
      {
        "color": "blue",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 4,
        "y": 4,
        "id": "r147-102-opening-7"
      },
      {
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
        "x": 5,
        "y": 4,
        "id": "r147-102-opening-11"
      },
      {
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
        "x": 0,
        "y": 5,
        "id": "r147-102-opening-15"
      },
      {
        "color": "purple",
        "star": true,
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 4,
        "y": 5,
        "id": "r147-102-opening-6"
      },
      {
        "color": "yellow",
        "star": true,
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 1,
        "y": 0,
        "id": "r147-102-cover9-3",
        "shutterId": "r147-102-cover9"
      },
      {
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 2,
        "y": 0,
        "id": "r147-102-cover9-2",
        "shutterId": "r147-102-cover9"
      },
      {
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
        "x": 3,
        "y": 0,
        "id": "r147-102-cover9-1",
        "shutterId": "r147-102-cover9"
      },
      {
        "color": "yellow",
        "star": true,
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 5,
        "y": 0,
        "id": "r147-102-cover9-0",
        "shutterId": "r147-102-cover9"
      },
      {
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
        "y": 6,
        "id": "r147-102-cover13-5",
        "shutterId": "r147-102-cover13"
      },
      {
        "color": "red",
        "star": true,
        "shape": [
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
        "y": 6,
        "id": "r147-102-cover13-9",
        "shutterId": "r147-102-cover13"
      },
      {
        "color": "yellow",
        "star": true,
        "shape": [
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
        "y": 6,
        "id": "r147-102-cover13-7",
        "shutterId": "r147-102-cover13"
      },
      {
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
        "y": 6,
        "id": "r147-102-cover13-3",
        "shutterId": "r147-102-cover13"
      },
      {
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
        "x": 6,
        "y": 6,
        "id": "r147-102-cover13-2",
        "shutterId": "r147-102-cover13"
      },
      {
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
        "x": 2,
        "y": 7,
        "id": "r147-102-cover13-4",
        "shutterId": "r147-102-cover13"
      },
      {
        "color": "purple",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 4,
        "y": 7,
        "id": "r147-102-cover13-6",
        "shutterId": "r147-102-cover13"
      },
      {
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 5,
        "y": 7,
        "id": "r147-102-cover13-0",
        "shutterId": "r147-102-cover13"
      },
      {
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
        "y": 8,
        "id": "r147-102-cover13-10",
        "shutterId": "r147-102-cover13"
      },
      {
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
        "x": 3,
        "y": 8,
        "id": "r147-102-cover13-1",
        "shutterId": "r147-102-cover13"
      },
      {
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
        "y": 8,
        "id": "r147-102-cover13-8",
        "shutterId": "r147-102-cover13"
      }
    ],
    "shutters": [
      {
        "id": "r147-102-cover9",
        "x": 1,
        "y": 0,
        "width": 5,
        "height": 1,
        "count": 9
      },
      {
        "id": "r147-102-cover13",
        "x": 0,
        "y": 6,
        "width": 7,
        "height": 3,
        "count": 13
      }
    ],
    "id": 102,
    "name": "竞品映射 Lv102",
    "difficulty": "hard",
    "timeSeconds": 80,
    "reward": 200,
    "parMoves": 27,
    "preservedMoveTarget": 47
  },
  "103": {
    "mechanismRules": "revised-2026-09-23-v1.4",
    "width": 6,
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
      ]
    ],
    "gates": [
      {
        "color": "pink",
        "side": "left",
        "offset": 4,
        "size": 3,
        "id": "r147-103-g0"
      },
      {
        "color": "green",
        "side": "right",
        "offset": 4,
        "size": 3,
        "star": true,
        "frozen": 2,
        "id": "r147-103-g1"
      },
      {
        "color": "blue",
        "side": "right",
        "offset": 8,
        "size": 1,
        "frozen": 5,
        "id": "r147-103-g2"
      },
      {
        "color": "yellow",
        "side": "left",
        "offset": 7,
        "size": 3,
        "star": true,
        "frozen": 11,
        "id": "r147-103-g3"
      },
      {
        "color": "orange",
        "side": "left",
        "offset": 0,
        "size": 3,
        "frozen": 11,
        "id": "r147-103-g4"
      },
      {
        "color": "red",
        "side": "bottom",
        "offset": 0,
        "size": 3,
        "frozen": 12,
        "id": "r147-103-g5"
      },
      {
        "color": "cyan",
        "side": "bottom",
        "offset": 3,
        "size": 3,
        "frozen": 15,
        "id": "r147-103-g6"
      },
      {
        "color": "purple",
        "side": "top",
        "offset": 4,
        "size": 2,
        "frozen": 20,
        "id": "r147-103-g7"
      }
    ],
    "blocks": [
      {
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
        "x": 4,
        "y": 4,
        "id": "r147-103-opening-2"
      },
      {
        "color": "blue",
        "frozen": 11,
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 1,
        "y": 3,
        "id": "r147-103-opening-7"
      },
      {
        "color": "blue",
        "frozen": 11,
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 3,
        "y": 3,
        "id": "r147-103-opening-8"
      },
      {
        "color": "yellow",
        "frozen": 11,
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 4,
        "y": 3,
        "id": "r147-103-opening-9"
      },
      {
        "color": "cyan",
        "frozen": 11,
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 5,
        "y": 3,
        "id": "r147-103-opening-10"
      },
      {
        "color": "green",
        "frozen": 11,
        "shape": [
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
        "id": "r147-103-opening-11"
      },
      {
        "color": "red",
        "frozen": 11,
        "shape": [
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
        "id": "r147-103-opening-12"
      },
      {
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
        "x": 0,
        "y": 5,
        "id": "r147-103-opening-0"
      },
      {
        "color": "blue",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 3,
        "y": 5,
        "id": "r147-103-opening-1"
      },
      {
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
        "y": 5,
        "id": "r147-103-opening-6"
      },
      {
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
        "y": 6,
        "id": "r147-103-opening-4"
      },
      {
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
        "y": 6,
        "id": "r147-103-opening-3"
      },
      {
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
        "x": 4,
        "y": 6,
        "id": "r147-103-opening-5"
      },
      {
        "color": "blue",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 0,
        "y": 7,
        "id": "r147-103-cover5-5",
        "shutterId": "r147-103-cover5"
      },
      {
        "color": "yellow",
        "star": true,
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
        "x": 0,
        "y": 7,
        "id": "r147-103-cover5-1",
        "shutterId": "r147-103-cover5"
      },
      {
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
        "y": 7,
        "id": "r147-103-cover5-7",
        "shutterId": "r147-103-cover5"
      },
      {
        "color": "green",
        "star": true,
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
        "x": 3,
        "y": 7,
        "id": "r147-103-cover5-0",
        "shutterId": "r147-103-cover5"
      },
      {
        "color": "pink",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 5,
        "y": 7,
        "id": "r147-103-cover5-3",
        "shutterId": "r147-103-cover5"
      },
      {
        "color": "green",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 0,
        "y": 9,
        "id": "r147-103-cover5-4",
        "shutterId": "r147-103-cover5"
      },
      {
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
        "y": 9,
        "id": "r147-103-cover5-6",
        "shutterId": "r147-103-cover5"
      },
      {
        "color": "pink",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 5,
        "y": 9,
        "id": "r147-103-cover5-2",
        "shutterId": "r147-103-cover5"
      },
      {
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
        "x": 3,
        "y": 0,
        "id": "r147-103-cover20-0",
        "shutterId": "r147-103-cover20"
      },
      {
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
        "y": 1,
        "id": "r147-103-cover20-1",
        "shutterId": "r147-103-cover20"
      },
      {
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
        "x": 0,
        "y": 0,
        "id": "r147-103-cover20-2",
        "shutterId": "r147-103-cover20"
      },
      {
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
            1,
            1
          ],
          [
            2,
            1
          ]
        ],
        "x": 1,
        "y": 1,
        "id": "r147-103-cover20-3",
        "shutterId": "r147-103-cover20"
      },
      {
        "color": "purple",
        "movementAxis": "vertical",
        "shape": [
          [
            0,
            0
          ],
          [
            1,
            0
          ],
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
        "y": 1,
        "id": "r147-103-cover20-4",
        "shutterId": "r147-103-cover20"
      }
    ],
    "shutters": [
      {
        "id": "r147-103-cover20",
        "x": 0,
        "y": 0,
        "width": 6,
        "height": 3,
        "count": 20
      },
      {
        "id": "r147-103-cover5",
        "x": 0,
        "y": 7,
        "width": 6,
        "height": 3,
        "count": 5
      }
    ],
    "id": 103,
    "name": "竞品映射 Lv103",
    "difficulty": "easy",
    "timeSeconds": 90,
    "reward": 200,
    "parMoves": 42,
    "preservedMoveTarget": 42
  },
  "104": {
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
        "color": "blue",
        "side": "right",
        "offset": 2,
        "size": 2,
        "id": "r147-104-g0"
      },
      {
        "color": "green",
        "side": "left",
        "offset": 2,
        "size": 3,
        "frozen": 2,
        "id": "r147-104-g1"
      },
      {
        "color": "purple",
        "side": "right",
        "offset": 4,
        "size": 2,
        "frozen": 8,
        "id": "r147-104-g2"
      },
      {
        "color": "red",
        "side": "left",
        "offset": 5,
        "size": 3,
        "frozen": 16,
        "id": "r147-104-g3"
      },
      {
        "color": "yellow",
        "side": "bottom",
        "offset": 0,
        "size": 3,
        "frozen": 20,
        "id": "r147-104-g4"
      },
      {
        "color": "pink",
        "side": "bottom",
        "offset": 3,
        "size": 3,
        "frozen": 22,
        "id": "r147-104-g5"
      },
      {
        "color": "red",
        "side": "top",
        "offset": 1,
        "size": 3,
        "star": true,
        "frozen": 22,
        "id": "r147-104-g6"
      },
      {
        "color": "yellow",
        "side": "right",
        "offset": 0,
        "size": 2,
        "portals": [
          {
            "side": "right",
            "origin": [
              5,
              0
            ],
            "size": 2
          }
        ],
        "star": true,
        "frozen": 24,
        "id": "r147-104-g7"
      }
    ],
    "blocks": [
      {
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
        "x": 0,
        "y": 4,
        "id": "r147-104-opening-0"
      },
      {
        "color": "blue",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 6,
        "y": 5,
        "id": "r147-104-opening-2"
      },
      {
        "color": "green",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 6,
        "y": 4,
        "id": "r147-104-opening-8"
      },
      {
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
        "x": 5,
        "y": 2,
        "id": "r147-104-opening-11"
      },
      {
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
        "y": 2,
        "id": "r147-104-opening-10"
      },
      {
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 2,
        "y": 2,
        "id": "r147-104-opening-4"
      },
      {
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
        "x": 3,
        "y": 2,
        "id": "r147-104-opening-13"
      },
      {
        "color": "red",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 0,
        "y": 3,
        "id": "r147-104-opening-14"
      },
      {
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
        "y": 3,
        "id": "r147-104-opening-3"
      },
      {
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
        "x": 3,
        "y": 3,
        "id": "r147-104-opening-1"
      },
      {
        "color": "yellow",
        "star": true,
        "shape": [
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
        "y": 4,
        "id": "r147-104-opening-7"
      },
      {
        "color": "purple",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 3,
        "y": 4,
        "id": "r147-104-opening-5"
      },
      {
        "color": "red",
        "star": true,
        "shape": [
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
        "y": 4,
        "id": "r147-104-opening-6"
      },
      {
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
        "y": 5,
        "id": "r147-104-opening-12"
      },
      {
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
        "x": 3,
        "y": 5,
        "id": "r147-104-opening-9"
      },
      {
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
        "y": 0,
        "id": "r147-104-cover6-0",
        "shutterId": "r147-104-cover6"
      },
      {
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
        "y": 0,
        "id": "r147-104-cover6-3",
        "shutterId": "r147-104-cover6"
      },
      {
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
        "x": 3,
        "y": 0,
        "id": "r147-104-cover6-1",
        "shutterId": "r147-104-cover6"
      },
      {
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
        "x": 4,
        "y": 1,
        "id": "r147-104-cover6-2",
        "shutterId": "r147-104-cover6"
      },
      {
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
        "x": 0,
        "y": 6,
        "id": "r147-104-cover12-8",
        "shutterId": "r147-104-cover12"
      },
      {
        "color": "yellow",
        "layers": [
          "yellow",
          "pink"
        ],
        "shape": [
          [
            0,
            0
          ],
          [
            1,
            0
          ],
          [
            0,
            1
          ],
          [
            1,
            1
          ]
        ],
        "x": 1,
        "y": 6,
        "id": "r147-104-cover12-9",
        "shutterId": "r147-104-cover12"
      },
      {
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
        "y": 6,
        "id": "r147-104-cover12-7",
        "shutterId": "r147-104-cover12"
      },
      {
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
        "y": 6,
        "id": "r147-104-cover12-1",
        "shutterId": "r147-104-cover12"
      },
      {
        "color": "yellow",
        "layers": [
          "yellow",
          "pink"
        ],
        "shape": [
          [
            0,
            0
          ],
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
        "y": 6,
        "id": "r147-104-cover12-0",
        "shutterId": "r147-104-cover12"
      },
      {
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
        "x": 4,
        "y": 7,
        "id": "r147-104-cover12-2",
        "shutterId": "r147-104-cover12"
      },
      {
        "color": "green",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 5,
        "y": 7,
        "id": "r147-104-cover12-6",
        "shutterId": "r147-104-cover12"
      },
      {
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
        "x": 0,
        "y": 8,
        "id": "r147-104-cover12-4",
        "shutterId": "r147-104-cover12"
      },
      {
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
        ],
        "x": 1,
        "y": 8,
        "id": "r147-104-cover12-3",
        "shutterId": "r147-104-cover12"
      },
      {
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
        "y": 9,
        "id": "r147-104-cover12-5",
        "shutterId": "r147-104-cover12"
      },
      {
        "color": "red",
        "star": true,
        "shape": [
          [
            0,
            0
          ],
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
        "id": "r147-104-cover12-10",
        "shutterId": "r147-104-cover12"
      },
      {
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
        "x": 2,
        "y": 2,
        "id": "r147-104-lift-2",
        "shutterId": "r147-104-lift"
      },
      {
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
        "x": 2,
        "y": 3,
        "id": "r147-104-lift-1",
        "shutterId": "r147-104-lift"
      },
      {
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
        "y": 4,
        "id": "r147-104-lift-0",
        "shutterId": "r147-104-lift"
      }
    ],
    "shutters": [
      {
        "id": "r147-104-cover6",
        "x": 1,
        "y": 0,
        "width": 5,
        "height": 2,
        "count": 6
      },
      {
        "id": "r147-104-cover12",
        "x": 0,
        "y": 6,
        "width": 7,
        "height": 4,
        "count": 12
      },
      {
        "id": "r147-104-lift",
        "x": 2,
        "y": 2,
        "width": 3,
        "height": 3,
        "count": 0,
        "skin": "lift"
      }
    ],
    "id": 104,
    "name": "竞品映射 Lv104",
    "difficulty": "normal",
    "timeSeconds": 125,
    "reward": 200,
    "parMoves": 43,
    "preservedMoveTarget": 52
  },
  "105": {
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
        "id": "n105-g-blue",
        "color": "blue",
        "side": "bottom",
        "size": 2,
        "offset": 4
      },
      {
        "id": "n105-g-yellow",
        "color": "yellow",
        "side": "right",
        "size": 2,
        "offset": 3,
        "frozen": 5
      },
      {
        "id": "n105-g-cyan",
        "color": "cyan",
        "side": "left",
        "size": 1,
        "offset": 7,
        "frozen": 5
      },
      {
        "id": "n105-g-red",
        "color": "red",
        "side": "top",
        "size": 3,
        "offset": 0,
        "frozen": 2
      },
      {
        "id": "n105-g-pink",
        "color": "pink",
        "side": "bottom",
        "size": 2,
        "offset": 2,
        "frozen": 1
      },
      {
        "id": "n105-g-purple",
        "color": "purple",
        "side": "right",
        "size": 2,
        "offset": 6,
        "frozen": 6
      },
      {
        "id": "n105-g-green",
        "color": "green",
        "side": "top",
        "size": 2,
        "offset": 4,
        "frozen": 3
      }
    ],
    "blocks": [
      {
        "id": "n105-opening-3",
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
        "id": "n105-opening-4",
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
        "id": "n105-opening-1",
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
        "color": "pink"
      },
      {
        "id": "n105-opening-2",
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
        "color": "yellow"
      },
      {
        "id": "n105-opening-5",
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
        "color": "blue"
      },
      {
        "id": "n105-cover2-2",
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
        "color": "pink",
        "shutterId": "n105-c2"
      },
      {
        "id": "n105-cover2-1",
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
        "layers": [
          "purple",
          "red"
        ],
        "shutterId": "n105-c2"
      },
      {
        "id": "n105-cover2-9",
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
        "shutterId": "n105-c2"
      },
      {
        "id": "n105-cover2-5",
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
        "color": "pink",
        "shutterId": "n105-c2"
      },
      {
        "id": "n105-cover2-6",
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
        "color": "yellow",
        "shutterId": "n105-c2"
      },
      {
        "id": "n105-cover2-3",
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
        "color": "red",
        "shutterId": "n105-c2"
      },
      {
        "id": "n105-cover2-4",
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
        "layers": [
          "blue",
          "green"
        ],
        "shutterId": "n105-c2"
      },
      {
        "id": "n105-cover2-7",
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
        "shutterId": "n105-c2"
      },
      {
        "id": "n105-cover2-8",
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
        "color": "red",
        "shutterId": "n105-c2"
      },
      {
        "id": "n105-cover5-1",
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
        "color": "purple",
        "layers": [
          "purple",
          "yellow"
        ],
        "shutterId": "n105-c5"
      },
      {
        "id": "n105-cover5-3",
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
        "color": "green",
        "layers": [
          "green",
          "blue"
        ],
        "shutterId": "n105-c5"
      },
      {
        "id": "n105-cover5-2",
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
        "color": "red",
        "shutterId": "n105-c5"
      }
    ],
    "shutters": [
      {
        "id": "n105-c2",
        "x": 2,
        "y": 0,
        "width": 4,
        "height": 6,
        "count": 2
      },
      {
        "id": "n105-c5",
        "x": 0,
        "y": 0,
        "width": 2,
        "height": 6,
        "count": 5
      }
    ],
    "id": 105,
    "name": "竞品映射 Lv105",
    "difficulty": "super",
    "timeSeconds": 105,
    "reward": 200,
    "parMoves": 31,
    "preservedMoveTarget": 51
  },
  "106": {
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
      ],
      [
        5,
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
      ]
    ],
    "gates": [
      {
        "id": "r147-src106-g6",
        "color": "orange",
        "side": "bottom",
        "offset": 2,
        "size": 3,
        "portals": [
          {
            "side": "bottom",
            "origin": [
              2,
              9
            ],
            "size": 3
          }
        ],
        "star": true
      },
      {
        "id": "r147-src106-g5",
        "color": "purple",
        "side": "right",
        "offset": 7,
        "size": 3,
        "portals": [
          {
            "side": "right",
            "origin": [
              5,
              7
            ],
            "size": 3
          }
        ],
        "frozen": 1
      },
      {
        "id": "r147-src106-g7",
        "color": "purple",
        "side": "left",
        "offset": 8,
        "size": 1,
        "portals": [
          {
            "side": "left",
            "origin": [
              1,
              8
            ],
            "size": 1
          }
        ],
        "frozen": 2,
        "star": true
      },
      {
        "id": "r147-src106-g11",
        "color": "blue",
        "side": "right",
        "offset": 0,
        "size": 2,
        "portals": [
          {
            "side": "right",
            "origin": [
              6,
              0
            ],
            "size": 2
          }
        ],
        "frozen": 7
      },
      {
        "id": "r147-src106-g9",
        "color": "green",
        "side": "top",
        "offset": 0,
        "size": 3,
        "portals": [
          {
            "side": "top",
            "origin": [
              0,
              0
            ],
            "size": 3
          }
        ],
        "frozen": 9
      },
      {
        "id": "r147-src106-g8",
        "color": "yellow",
        "side": "left",
        "offset": 5,
        "size": 3,
        "portals": [
          {
            "side": "left",
            "origin": [
              1,
              5
            ],
            "size": 3
          }
        ],
        "frozen": 10,
        "star": true
      },
      {
        "id": "r147-src106-g0",
        "color": "cyan",
        "side": "right",
        "offset": 2,
        "size": 2,
        "portals": [
          {
            "side": "right",
            "origin": [
              6,
              2
            ],
            "size": 2
          }
        ],
        "frozen": 12,
        "star": true
      },
      {
        "id": "r147-src106-g1",
        "color": "red",
        "side": "left",
        "offset": 1,
        "size": 3,
        "portals": [
          {
            "side": "left",
            "origin": [
              0,
              1
            ],
            "size": 3
          }
        ],
        "frozen": 14,
        "star": true
      },
      {
        "id": "r147-src106-g3",
        "color": "yellow",
        "side": "top",
        "offset": 4,
        "size": 3,
        "portals": [
          {
            "side": "top",
            "origin": [
              4,
              0
            ],
            "size": 3
          }
        ],
        "frozen": 16
      },
      {
        "id": "r147-src106-g4",
        "color": "green",
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
        ],
        "frozen": 18,
        "star": true
      }
    ],
    "blocks": [
      {
        "id": "r147-src106-15",
        "color": "green",
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
        "movementAxis": "vertical"
      },
      {
        "id": "r147-src106-28",
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
        "id": "r147-src106-18",
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
        "id": "r147-src106-8",
        "color": "green",
        "x": 3,
        "y": 0,
        "shape": [
          [
            0,
            0
          ]
        ],
        "star": true
      },
      {
        "id": "r147-src106-6",
        "color": "blue",
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
        "id": "r147-src106-20",
        "color": "yellow",
        "x": 5,
        "y": 0,
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "r147-src106-14",
        "color": "green",
        "x": 6,
        "y": 0,
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "r147-src106-2",
        "color": "yellow",
        "x": 1,
        "y": 1,
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "r147-src106-25",
        "color": "red",
        "x": 2,
        "y": 1,
        "shape": [
          [
            0,
            0
          ]
        ],
        "star": true
      },
      {
        "id": "r147-src106-9",
        "color": "yellow",
        "x": 3,
        "y": 1,
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "r147-src106-22",
        "color": "green",
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
        "id": "r147-src106-17",
        "color": "orange",
        "x": 5,
        "y": 1,
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "r147-src106-31",
        "color": "blue",
        "x": 6,
        "y": 1,
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "r147-src106-11",
        "color": "red",
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
        "id": "r147-src106-0",
        "color": "green",
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
        ]
      },
      {
        "id": "r147-src106-1",
        "color": "blue",
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
        "id": "r147-src106-29",
        "color": "purple",
        "x": 4,
        "y": 2,
        "shape": [
          [
            0,
            0
          ]
        ],
        "star": true
      },
      {
        "id": "r147-src106-10",
        "color": "cyan",
        "x": 5,
        "y": 2,
        "shape": [
          [
            0,
            0
          ]
        ],
        "star": true
      },
      {
        "id": "r147-src106-3",
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
        "id": "r147-src106-12",
        "color": "green",
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
        "id": "r147-fill106-1",
        "color": "orange",
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
        ]
      },
      {
        "id": "r147-src106-5",
        "color": "cyan",
        "x": 4,
        "y": 3,
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "r147-src106-4",
        "color": "yellow",
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
        "id": "r147-src106-24",
        "color": "cyan",
        "x": 6,
        "y": 3,
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "r147-fill106-2",
        "color": "purple",
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
        ]
      },
      {
        "id": "r147-src106-13",
        "color": "yellow",
        "x": 1,
        "y": 5,
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "r147-src106-19",
        "color": "purple",
        "x": 2,
        "y": 5,
        "shape": [
          [
            0,
            0
          ]
        ],
        "star": true
      },
      {
        "id": "r147-src106-23",
        "color": "yellow",
        "x": 3,
        "y": 5,
        "shape": [
          [
            0,
            0
          ]
        ],
        "star": true
      },
      {
        "id": "r147-fill106-0",
        "color": "green",
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
        "id": "r147-src106-32",
        "color": "orange",
        "x": 4,
        "y": 6,
        "shape": [
          [
            0,
            0
          ]
        ],
        "star": true
      },
      {
        "id": "r147-src106-30",
        "color": "green",
        "x": 5,
        "y": 6,
        "shape": [
          [
            0,
            0
          ]
        ],
        "star": true
      },
      {
        "id": "r147-src106-33",
        "color": "purple",
        "x": 4,
        "y": 7,
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "r147-src106-7",
        "color": "blue",
        "x": 5,
        "y": 7,
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "r147-src106-16",
        "color": "blue",
        "x": 4,
        "y": 8,
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "r147-src106-26",
        "color": "purple",
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
        ]
      },
      {
        "id": "r147-src106-27",
        "color": "purple",
        "x": 1,
        "y": 9,
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "r147-src106-21",
        "color": "orange",
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
        ]
      }
    ],
    "id": 106,
    "name": "竞品映射 Lv106",
    "difficulty": "easy",
    "timeSeconds": 90,
    "reward": 200,
    "parMoves": 48
  },
  "107": {
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
      ],
      [
        5,
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
      ]
    ],
    "gates": [
      {
        "id": "r147-107-pink-plain",
        "side": "bottom",
        "offset": 1,
        "color": "pink",
        "size": 2,
        "frozen": 1
      },
      {
        "id": "r147-107-green-plain",
        "side": "top",
        "offset": 6,
        "color": "green",
        "size": 1,
        "frozen": 8
      },
      {
        "id": "r147-107-purple-plain",
        "side": "right",
        "offset": 7,
        "color": "purple",
        "size": 2,
        "frozen": 2,
        "portals": [
          {
            "side": "right",
            "origin": [
              5,
              7
            ],
            "size": 2
          }
        ]
      },
      {
        "id": "r147-107-yellow-plain",
        "side": "left",
        "offset": 8,
        "color": "yellow",
        "size": 2,
        "frozen": 9,
        "portals": [
          {
            "side": "left",
            "origin": [
              1,
              8
            ],
            "size": 2
          }
        ]
      },
      {
        "id": "r147-107-red-plain",
        "side": "top",
        "offset": 1,
        "color": "red",
        "size": 2,
        "frozen": 12
      },
      {
        "id": "r147-107-blue-plain",
        "side": "right",
        "offset": 4,
        "color": "blue",
        "size": 3,
        "portals": [
          {
            "side": "right",
            "origin": [
              5,
              4
            ],
            "size": 3
          }
        ]
      }
    ],
    "blocks": [
      {
        "id": "r147-107-opening-17",
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
        "lockedBy": "purple",
        "lockCount": 1,
        "x": 0,
        "y": 3
      },
      {
        "id": "r147-107-opening-16",
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
        "lockedBy": "red",
        "lockCount": 1,
        "x": 2,
        "y": 3
      },
      {
        "id": "r147-107-opening-14",
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
        "lockedBy": "blue",
        "lockCount": 1,
        "x": 4,
        "y": 3
      },
      {
        "id": "r147-107-opening-15",
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
        "lockedBy": "green",
        "lockCount": 1,
        "x": 5,
        "y": 3
      },
      {
        "id": "r147-107-opening-0",
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
        "id": "r147-107-opening-2",
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
        "keyId": "blue",
        "x": 2,
        "y": 4
      },
      {
        "id": "r147-107-opening-11",
        "color": "yellow",
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
        "id": "r147-107-opening-7",
        "color": "pink",
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
        "id": "r147-107-opening-6",
        "color": "pink",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 1,
        "y": 5
      },
      {
        "id": "r147-107-opening-12",
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
        "x": 4,
        "y": 5
      },
      {
        "id": "r147-107-opening-5",
        "color": "blue",
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
        "id": "r147-107-opening-9",
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
        "x": 1,
        "y": 6
      },
      {
        "id": "r147-107-opening-1",
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
        "x": 2,
        "y": 6
      },
      {
        "id": "r147-107-opening-10",
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
        "keyId": "red",
        "x": 3,
        "y": 6
      },
      {
        "id": "r147-107-opening-8",
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
        "keyId": "green",
        "x": 4,
        "y": 7
      },
      {
        "id": "r147-107-opening-13",
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
        ],
        "keyId": "purple",
        "x": 1,
        "y": 8
      },
      {
        "id": "r147-107-opening-4",
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
        "x": 3,
        "y": 8
      },
      {
        "id": "r147-107-opening-3",
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
        "y": 8
      },
      {
        "id": "r147-107-cover7-1",
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
        "y": 0,
        "shutterId": "r147-107-cover"
      },
      {
        "id": "r147-107-cover7-0",
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
        "x": 2,
        "y": 0,
        "shutterId": "r147-107-cover"
      },
      {
        "id": "r147-107-cover7-6",
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
        "x": 3,
        "y": 0,
        "shutterId": "r147-107-cover"
      },
      {
        "id": "r147-107-cover7-3",
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
          ],
          [
            1,
            2
          ]
        ],
        "x": 4,
        "y": 0,
        "shutterId": "r147-107-cover"
      },
      {
        "id": "r147-107-cover7-7",
        "color": "green",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 6,
        "y": 0,
        "shutterId": "r147-107-cover"
      },
      {
        "id": "r147-107-cover7-2",
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
        "x": 0,
        "y": 1,
        "shutterId": "r147-107-cover"
      },
      {
        "id": "r147-107-cover7-9",
        "color": "pink",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 1,
        "y": 1,
        "shutterId": "r147-107-cover"
      },
      {
        "id": "r147-107-cover7-8",
        "color": "purple",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 3,
        "y": 1,
        "shutterId": "r147-107-cover"
      },
      {
        "id": "r147-107-cover7-5",
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
        "y": 2,
        "shutterId": "r147-107-cover"
      },
      {
        "id": "r147-107-cover7-4",
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 6,
        "y": 2,
        "shutterId": "r147-107-cover"
      }
    ],
    "shutters": [
      {
        "id": "r147-107-cover",
        "x": 0,
        "y": 0,
        "width": 7,
        "height": 3,
        "count": 7
      }
    ],
    "id": 107,
    "name": "竞品映射 Lv107",
    "difficulty": "normal",
    "timeSeconds": 110,
    "reward": 200,
    "parMoves": 71,
    "preservedMoveTarget": 71
  },
  "108": {
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
        "id": "r147-108-pink-plain",
        "side": "top",
        "offset": 2,
        "color": "pink",
        "size": 2,
        "frozen": 7
      },
      {
        "id": "r147-108-orange-star",
        "side": "right",
        "offset": 4,
        "color": "orange",
        "size": 1,
        "frozen": 5,
        "star": true
      },
      {
        "id": "r147-108-red-star",
        "side": "top",
        "offset": 0,
        "color": "red",
        "size": 2,
        "frozen": 10,
        "star": true
      },
      {
        "id": "r147-108-yellow-star",
        "side": "right",
        "offset": 0,
        "color": "yellow",
        "size": 1,
        "frozen": 2,
        "star": true
      },
      {
        "id": "r147-108-orange-plain",
        "side": "bottom",
        "offset": 0,
        "color": "orange",
        "size": 2,
        "frozen": 1
      },
      {
        "id": "r147-108-green-plain",
        "side": "bottom",
        "offset": 2,
        "color": "green",
        "size": 2
      },
      {
        "id": "r147-108-yellow-plain",
        "side": "top",
        "offset": 4,
        "color": "yellow",
        "size": 2,
        "frozen": 3
      },
      {
        "id": "r147-108-blue-plain",
        "side": "right",
        "offset": 2,
        "color": "blue",
        "size": 2,
        "frozen": 14
      },
      {
        "id": "r147-108-cyan-plain",
        "side": "left",
        "offset": 5,
        "color": "cyan",
        "size": 2,
        "frozen": 4
      },
      {
        "id": "r147-108-purple-plain",
        "side": "right",
        "offset": 6,
        "color": "purple",
        "size": 1,
        "frozen": 12
      }
    ],
    "blocks": [
      {
        "id": "r147-108-opening-13",
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
        "star": true,
        "x": 0,
        "y": 0
      },
      {
        "id": "r147-108-opening-0",
        "color": "blue",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 0,
        "y": 1
      },
      {
        "id": "r147-108-opening-9",
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
        "id": "r147-108-opening-2",
        "color": "purple",
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
        "id": "r147-108-fill-0",
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
        "x": 0,
        "y": 5
      },
      {
        "id": "r147-108-opening-4",
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
        "x": 3,
        "y": 1
      },
      {
        "id": "r147-108-opening-7",
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
        "x": 0,
        "y": 2
      },
      {
        "id": "r147-108-opening-8",
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
        "y": 2
      },
      {
        "id": "r147-108-opening-12",
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
        "x": 1,
        "y": 3
      },
      {
        "id": "r147-108-opening-3",
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
        ],
        "x": 3,
        "y": 3
      },
      {
        "id": "r147-108-opening-10",
        "color": "blue",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 4,
        "y": 3
      },
      {
        "id": "r147-108-opening-11",
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
        "y": 4
      },
      {
        "id": "r147-108-opening-1",
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
        "star": true,
        "x": 1,
        "y": 1
      },
      {
        "id": "r147-108-opening-6",
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
        ],
        "x": 2,
        "y": 5
      },
      {
        "id": "r147-108-opening-14",
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
        "star": true,
        "x": 3,
        "y": 5
      },
      {
        "id": "r147-108-opening-5",
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
        "x": 4,
        "y": 6
      },
      {
        "id": "r147-108-lift-0",
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
        "x": 2,
        "y": 3,
        "shutterId": "r147-108-lift"
      },
      {
        "id": "r147-108-lift-1",
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
        "y": 3,
        "shutterId": "r147-108-lift"
      }
    ],
    "shutters": [
      {
        "id": "r147-108-lift",
        "x": 2,
        "y": 3,
        "width": 3,
        "height": 2,
        "count": 1,
        "skin": "lift"
      }
    ],
    "id": 108,
    "name": "竞品映射 Lv108",
    "difficulty": "normal",
    "timeSeconds": 180,
    "reward": 200,
    "parMoves": 30,
    "preservedMoveTarget": 33
  },
  "109": {
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
    "gates": [
      {
        "id": "r147-109-pink-plain",
        "side": "right",
        "offset": 2,
        "color": "pink",
        "size": 2,
        "frozen": 15
      },
      {
        "id": "r147-109-red-plain",
        "side": "bottom",
        "offset": 3,
        "color": "red",
        "size": 3
      },
      {
        "id": "r147-109-blue-plain",
        "side": "bottom",
        "offset": 0,
        "color": "blue",
        "size": 2,
        "frozen": 3
      },
      {
        "id": "r147-109-orange-plain",
        "side": "left",
        "offset": 6,
        "color": "orange",
        "size": 1,
        "frozen": 19
      },
      {
        "id": "r147-109-yellow-plain",
        "side": "top",
        "offset": 2,
        "color": "yellow",
        "size": 3,
        "frozen": 12
      },
      {
        "id": "r147-109-green-plain",
        "side": "left",
        "offset": 4,
        "color": "green",
        "size": 2,
        "frozen": 9
      },
      {
        "id": "r147-109-purple-plain",
        "side": "right",
        "offset": 5,
        "color": "purple",
        "size": 2,
        "frozen": 5
      }
    ],
    "blocks": [
      {
        "id": "r147-109-opening-6",
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
        "layers": [
          "yellow",
          "green"
        ],
        "lockedBy": "blue",
        "lockCount": 1,
        "x": 5,
        "y": 0
      },
      {
        "id": "r147-109-opening-4",
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
        "keyId": "red",
        "x": 0,
        "y": 5
      },
      {
        "id": "r147-109-opening-10",
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
        "x": 1,
        "y": 5
      },
      {
        "id": "r147-109-opening-1",
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
        "y": 5
      },
      {
        "id": "r147-109-opening-8",
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 0,
        "y": 7
      },
      {
        "id": "r147-109-opening-3",
        "color": "purple",
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
        "id": "r147-109-opening-2",
        "color": "red",
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
        "id": "r147-109-opening-5",
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
        "keyId": "blue",
        "x": 4,
        "y": 6
      },
      {
        "id": "r147-109-opening-13",
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
        "x": 6,
        "y": 6
      },
      {
        "id": "r147-109-opening-9",
        "color": "blue",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 0,
        "y": 8
      },
      {
        "id": "r147-109-opening-14",
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
        "y": 7
      },
      {
        "id": "r147-109-opening-15",
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
        "keyId": "red",
        "x": 5,
        "y": 8
      },
      {
        "id": "r147-109-opening-12",
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 5,
        "y": 7
      },
      {
        "id": "r147-109-opening-7",
        "color": "red",
        "shape": [
          [
            0,
            0
          ]
        ],
        "lockedBy": "red",
        "lockCount": 3,
        "x": 3,
        "y": 6
      },
      {
        "id": "r147-109-opening-11",
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
        "y": 8
      },
      {
        "id": "r147-109-fill-0",
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
        "y": 8
      },
      {
        "id": "r147-109-opening-0",
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
        "keyId": "red",
        "x": 3,
        "y": 7
      },
      {
        "id": "r147-109-joint8-9",
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
        "keyId": "green",
        "x": 1,
        "y": 0,
        "shutterId": "r147-109-left"
      },
      {
        "id": "r147-109-joint8-7",
        "color": "purple",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 2,
        "y": 0,
        "shutterId": "r147-109-left"
      },
      {
        "id": "r147-109-joint8-4",
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
        ],
        "x": 3,
        "y": 3,
        "shutterId": "r147-109-middle"
      },
      {
        "id": "r147-109-joint8-10",
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
          "yellow"
        ],
        "x": 0,
        "y": 4,
        "shutterId": "r147-109-middle"
      },
      {
        "id": "r147-109-joint8-2",
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
          "red"
        ],
        "keyId": "green",
        "x": 4,
        "y": 2,
        "shutterId": "r147-109-middle"
      },
      {
        "id": "r147-109-joint8-0",
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
        "x": 6,
        "y": 2,
        "shutterId": "r147-109-middle"
      },
      {
        "id": "r147-109-joint8-1",
        "color": "orange",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 2,
        "y": 3,
        "shutterId": "r147-109-middle"
      },
      {
        "id": "r147-109-joint8-3",
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
        "x": 0,
        "y": 2,
        "shutterId": "r147-109-middle"
      },
      {
        "id": "r147-109-joint8-5",
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
        "y": 2,
        "shutterId": "r147-109-middle"
      },
      {
        "id": "r147-109-joint8-6",
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ]
        ],
        "lockedBy": "green",
        "lockCount": 3,
        "x": 5,
        "y": 4,
        "shutterId": "r147-109-middle"
      },
      {
        "id": "r147-109-joint8-8",
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
        ],
        "keyId": "green",
        "x": 3,
        "y": 0,
        "shutterId": "r147-109-right"
      }
    ],
    "shutters": [
      {
        "id": "r147-109-left",
        "x": 1,
        "y": 0,
        "width": 2,
        "height": 2,
        "count": 8
      },
      {
        "id": "r147-109-middle",
        "x": 0,
        "y": 2,
        "width": 7,
        "height": 3,
        "count": 8
      },
      {
        "id": "r147-109-right",
        "x": 3,
        "y": 0,
        "width": 2,
        "height": 2,
        "count": 8
      }
    ],
    "id": 109,
    "name": "竞品映射 Lv109",
    "difficulty": "hard",
    "timeSeconds": 110,
    "reward": 200,
    "parMoves": 60,
    "preservedMoveTarget": 60
  },
  "110": {
    "mechanismRules": "revised-2026-09-23-v1.4",
    "width": 5,
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
      ]
    ],
    "gates": [
      {
        "id": "r147-110-cyan-plain",
        "side": "left",
        "offset": 6,
        "color": "cyan",
        "size": 3,
        "frozen": 2
      },
      {
        "id": "r147-110-green-plain",
        "side": "left",
        "offset": 2,
        "color": "green",
        "size": 3,
        "frozen": 12
      },
      {
        "id": "r147-110-pink-plain",
        "side": "bottom",
        "offset": 1,
        "color": "pink",
        "size": 3,
        "frozen": 20
      },
      {
        "id": "r147-110-red-plain",
        "side": "right",
        "offset": 4,
        "color": "red",
        "size": 3,
        "frozen": 9
      },
      {
        "id": "r147-110-yellow-plain",
        "side": "right",
        "offset": 0,
        "color": "yellow",
        "size": 3
      },
      {
        "id": "r147-110-blue-plain",
        "side": "top",
        "offset": 2,
        "color": "blue",
        "size": 3,
        "frozen": 1
      }
    ],
    "blocks": [
      {
        "id": "r147-110-opening-1",
        "color": "cyan",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 4,
        "y": 7
      },
      {
        "id": "r147-110-opening-3",
        "color": "pink",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 1,
        "y": 0
      },
      {
        "id": "r147-110-fill-3",
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
        "y": 0
      },
      {
        "id": "r147-110-opening-11",
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
        "y": 1
      },
      {
        "id": "r147-110-fill-1",
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
        "x": 2,
        "y": 1
      },
      {
        "id": "r147-110-opening-4",
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
        "x": 3,
        "y": 3
      },
      {
        "id": "r147-110-opening-6",
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
        "layers": [
          "yellow",
          "green"
        ],
        "x": 0,
        "y": 8
      },
      {
        "id": "r147-110-fill-0",
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
        "y": 3
      },
      {
        "id": "r147-110-opening-10",
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
        "x": 0,
        "y": 2
      },
      {
        "id": "r147-110-opening-5",
        "color": "blue",
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
        "id": "r147-110-opening-0",
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
        "id": "r147-110-opening-2",
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
        ],
        "x": 3,
        "y": 5
      },
      {
        "id": "r147-110-opening-12",
        "color": "blue",
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
        "id": "r147-110-opening-8",
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
        "x": 3,
        "y": 7
      },
      {
        "id": "r147-110-opening-7",
        "color": "cyan",
        "shape": [
          [
            0,
            0
          ]
        ],
        "x": 0,
        "y": 0
      },
      {
        "id": "r147-110-opening-9",
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
          "green"
        ],
        "x": 1,
        "y": 9
      },
      {
        "id": "r147-110-fill-2",
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
        "y": 2
      },
      {
        "id": "r147-110-cover4-1",
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
        "y": 4,
        "shutterId": "r147-110-cover"
      },
      {
        "id": "r147-110-cover4-3",
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
        "x": 1,
        "y": 4,
        "shutterId": "r147-110-cover"
      },
      {
        "id": "r147-110-cover4-2",
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
        "x": 2,
        "y": 4,
        "shutterId": "r147-110-cover"
      },
      {
        "id": "r147-110-cover4-0",
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
        "x": 0,
        "y": 6,
        "shutterId": "r147-110-cover"
      },
      {
        "id": "r147-110-lift-1",
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
        "layers": [
          "blue",
          "green"
        ],
        "x": 0,
        "y": 4,
        "shutterId": "r147-110-lift"
      },
      {
        "id": "r147-110-lift-0",
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
        "x": 1,
        "y": 4,
        "shutterId": "r147-110-lift"
      },
      {
        "id": "r147-110-lift-3",
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
        "frozen": 2,
        "x": 0,
        "y": 6,
        "shutterId": "r147-110-lift"
      },
      {
        "id": "r147-110-lift-2",
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
        "x": 2,
        "y": 6,
        "shutterId": "r147-110-lift"
      }
    ],
    "shutters": [
      {
        "id": "r147-110-cover",
        "x": 0,
        "y": 4,
        "width": 3,
        "height": 4,
        "count": 4
      },
      {
        "id": "r147-110-lift",
        "x": 0,
        "y": 4,
        "width": 3,
        "height": 4,
        "count": 1,
        "skin": "lift"
      }
    ],
    "id": 110,
    "name": "竞品映射 Lv110",
    "difficulty": "easy",
    "timeSeconds": 135,
    "reward": 200,
    "parMoves": 40,
    "preservedMoveTarget": 40
  }
};
export const applyRemake101to110 = (level: LevelSpec): LevelSpec => reviewed[level.id] ?? level;
