import type {LevelSpec} from './types';
// Independent league prototype; disclosed adapted original geometry from 217.
// Does not import or modify production LEVELS or its progression.
export const LEAGUE_TEST_LEVEL:LevelSpec={
  "id": 900001,
  "name": "联赛试炼·升降调度",
  "difficulty": "hard",
  "mechanismRules": "revised-2026-09-27-v1.5",
  "width": 8,
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
    ]
  ],
  "timeSeconds": 180,
  "reward": 0,
  "parMoves": 41,
  "preservedMoveTarget": 41,
  "designTargets": {
    "formulaVersion": "blockout-d1",
    "minimumRepositionOverhead": 17,
    "calibratedDifficulty": 2.2
  },
  "gates": [
    {
      "id": "l217-cyan",
      "color": "blue",
      "side": "top",
      "offset": 0,
      "size": 2,
      "frozen": 5
    },
    {
      "id": "l217-red",
      "color": "pink",
      "side": "top",
      "offset": 5,
      "size": 3,
      "frozen": 4
    },
    {
      "id": "l217-pink",
      "color": "red",
      "side": "left",
      "offset": 0,
      "size": 2,
      "frozen": 8
    },
    {
      "id": "l217-yellow",
      "color": "yellow",
      "side": "right",
      "offset": 0,
      "size": 1,
      "frozen": 8
    },
    {
      "id": "l217-blue",
      "color": "cyan",
      "side": "right",
      "offset": 6,
      "size": 3,
      "frozen": 3
    },
    {
      "id": "l217-green",
      "color": "green",
      "side": "left",
      "offset": 6,
      "size": 3,
      "frozen": 12
    },
    {
      "id": "l217-orange",
      "color": "orange",
      "side": "bottom",
      "offset": 2,
      "size": 2
    },
    {
      "id": "l217-purple",
      "color": "purple",
      "side": "bottom",
      "offset": 7,
      "size": 1,
      "frozen": 1
    }
  ],
  "coloredGrids": [
    {
      "id": "l217-blue-floor",
      "color": "cyan",
      "cells": [
        [
          3,
          4
        ],
        [
          4,
          4
        ],
        [
          3,
          5
        ],
        [
          4,
          5
        ]
      ]
    }
  ],
  "shutters": [
    {
      "id": "l217-lift",
      "x": 0,
      "y": 0,
      "width": 3,
      "height": 4,
      "count": 0,
      "skin": "lift"
    }
  ],
  "blocks": [
    {
      "id": "l217-lift-blue",
      "color": "cyan",
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
      "shutterId": "l217-lift"
    },
    {
      "id": "l217-lift-orange",
      "color": "yellow",
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
      "shutterId": "l217-lift"
    },
    {
      "id": "wide-lower-0",
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
      "color": "green",
      "movementAxis": "horizontal"
    },
    {
      "id": "wide-lower-1",
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
      "id": "wide-lower-2",
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
      "color": "orange"
    },
    {
      "id": "wide-lower-3",
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
      "color": "blue"
    },
    {
      "id": "wide-lower-4",
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
      "color": "orange"
    },
    {
      "id": "wide-lower-5",
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
      "id": "wide-lower-6",
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
      "color": "cyan"
    },
    {
      "id": "wide-lower-7",
      "x": 7,
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
      "color": "purple"
    },
    {
      "id": "wide-grid",
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
      "color": "cyan"
    },
    {
      "id": "wide-bridge-1",
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
      "color": "pink"
    },
    {
      "id": "wide-bridge-5",
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
      "color": "red"
    },
    {
      "id": "wide-top-0-0",
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
      "id": "wide-top-2-0",
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
      "color": "pink"
    },
    {
      "id": "wide-top-4-0",
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
      "color": "orange"
    },
    {
      "id": "wide-top-6-0",
      "x": 6,
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
      "id": "wide-top-0-2",
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
      "id": "wide-top-2-2",
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
      "color": "orange"
    },
    {
      "id": "wide-top-4-2",
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
      "color": "blue"
    },
    {
      "id": "wide-top-6-2",
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
      "color": "green"
    }
  ]
};
export const LEAGUE_TEST_SPECIAL_IDS:readonly string[]=["l217-lift-blue","l217-lift-orange","wide-lower-0","wide-lower-1","wide-lower-4","wide-lower-7","wide-bridge-5","wide-top-4-0","wide-top-2-2"];
export const LEAGUE_TEST_LEVEL_SHA256='f1d02501c5b920d0b7076eab861461903e9f1b307766cdfb21af286dd7671ade';
