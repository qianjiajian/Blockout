import type { LevelSpec } from "./types";

// Accepted exact objects only; no failed candidates or placeholder levels.
export const FORMAL_211_220_LEVELS: readonly LevelSpec[] = [
  {
    "id": 211,
    "name": "星门错位·211",
    "mechanismRules": "revised-2026-09-27-v1.5",
    "width": 7,
    "height": 9,
    "difficulty": "easy",
    "timeSeconds": 110,
    "reward": 200,
    "parMoves": 8,
    "preservedMoveTarget": 32,
    "designTargets": {
      "formulaVersion": "blockout-d1",
      "minimumRepositionOverhead": 5,
      "calibratedDifficulty": 0.8
    },
    "gates": [
      {
        "id": "l211-g-red",
        "color": "red",
        "side": "top",
        "offset": 2,
        "size": 3,
        "frozen": 1
      },
      {
        "id": "l211-g-green",
        "color": "green",
        "side": "left",
        "offset": 0,
        "size": 2
      },
      {
        "id": "l211-g-blue",
        "color": "blue",
        "side": "left",
        "offset": 2,
        "size": 3,
        "frozen": 7
      },
      {
        "id": "l211-g-orange-star",
        "color": "orange",
        "side": "left",
        "offset": 5,
        "size": 2,
        "frozen": 10,
        "star": true
      },
      {
        "id": "l211-g-green-star",
        "color": "green",
        "side": "left",
        "offset": 7,
        "size": 2,
        "frozen": 8,
        "star": true
      },
      {
        "id": "l211-g-purple",
        "color": "purple",
        "side": "right",
        "offset": 0,
        "size": 2,
        "frozen": 3
      },
      {
        "id": "l211-g-yellow",
        "color": "yellow",
        "side": "right",
        "offset": 2,
        "size": 1,
        "frozen": 3
      },
      {
        "id": "l211-g-pink",
        "color": "pink",
        "side": "right",
        "offset": 4,
        "size": 3,
        "frozen": 8
      },
      {
        "id": "l211-g-blue-star",
        "color": "blue",
        "side": "right",
        "offset": 7,
        "size": 2,
        "frozen": 9,
        "star": true
      },
      {
        "id": "l211-g-orange",
        "color": "orange",
        "side": "bottom",
        "offset": 2,
        "size": 3,
        "frozen": 8
      }
    ],
    "blocks": [
      {
        "id": "l211-a",
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
        "id": "l211-b",
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
        "id": "l211-c",
        "color": "green",
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
        "id": "l211-d",
        "color": "red",
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
        ]
      },
      {
        "id": "l211-e",
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
        "id": "l211-f",
        "color": "red",
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
        "id": "l211-g",
        "color": "blue",
        "x": 2,
        "y": 1,
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "l211-h",
        "color": "purple",
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
        "id": "l211-i",
        "color": "yellow",
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
        "id": "l211-j",
        "color": "pink",
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
        "id": "l211-k",
        "color": "red",
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
        "id": "l211-l",
        "color": "blue",
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
        "movementAxis": "horizontal"
      },
      {
        "id": "l211-m",
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
        "id": "l211-n",
        "color": "purple",
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
        ]
      },
      {
        "id": "l211-p",
        "color": "orange",
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
        "star": true
      },
      {
        "id": "l211-s",
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
        "id": "l211-r",
        "color": "yellow",
        "x": 6,
        "y": 7,
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "l211-t",
        "color": "orange",
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
        ]
      },
      {
        "id": "l211-w",
        "color": "green",
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
        "id": "l211-q",
        "color": "blue",
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
        "star": true
      },
      {
        "id": "l211-o",
        "color": "green",
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
        "star": true
      },
      {
        "id": "l211-u",
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
        "id": "l211-v",
        "color": "red",
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
        "movementAxis": "vertical"
      }
    ],
    "mechanismAdaptation": {
      "userAuthorized": "用户要求211–220上下界反复不满足时换色、换形及必要重排，达标后直接接入正式数据",
      "change": "211按视频独立复核的7×9满棋盘、23体、10物理口及九冰门原计数、三星块、二轴块重构。源lime映yellow、gold映orange；为简单5–10必挪和本项目原向整图/矩形轴块合同，四个普通块改色（b黄→红、d紫→红、g红→蓝、k黄→红），下四行九体原创重排，两L3改原向L3，红T4轴块改原向SQ2轴块；源事实与设计差异分别保存。"
    }
  },
  {
    "id": 212,
    "name": "彩格双帘·212",
    "difficulty": "normal",
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
    "timeSeconds": 95,
    "reward": 200,
    "parMoves": 8,
    "preservedMoveTarget": 50,
    "designTargets": {
      "formulaVersion": "blockout-d1",
      "minimumRepositionOverhead": 11,
      "calibratedDifficulty": 1.3
    },
    "gates": [
      {
        "id": "l212-green",
        "color": "green",
        "side": "top",
        "offset": 2,
        "size": 3,
        "frozen": 19
      },
      {
        "id": "l212-red",
        "color": "red",
        "side": "left",
        "offset": 0,
        "size": 2,
        "frozen": 16
      },
      {
        "id": "l212-yellow",
        "color": "yellow",
        "side": "left",
        "offset": 6,
        "size": 2,
        "frozen": 11
      },
      {
        "id": "l212-blue",
        "color": "blue",
        "side": "right",
        "offset": 6,
        "size": 3
      }
    ],
    "shutters": [
      {
        "id": "root212-top35",
        "x": 0,
        "y": 0,
        "width": 7,
        "height": 5,
        "count": 10,
        "skin": "shutter"
      },
      {
        "id": "root212-small4",
        "x": 0,
        "y": 7,
        "width": 2,
        "height": 2,
        "count": 1,
        "skin": "shutter"
      }
    ],
    "coloredGrids": [
      {
        "id": "l212-blue-floor",
        "color": "blue",
        "cells": [
          [
            5,
            0
          ],
          [
            6,
            0
          ]
        ]
      }
    ],
    "blocks": [
      {
        "id": "l212-top-bomb40",
        "color": "blue",
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
        "shutterId": "root212-top35",
        "timedBombSeconds": 40
      },
      {
        "id": "l212-top-blue-h2",
        "color": "blue",
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
        "shutterId": "root212-top35"
      },
      {
        "id": "l212-top21-0",
        "color": "red",
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
        "shutterId": "root212-top35"
      },
      {
        "id": "l212-top21-1",
        "color": "yellow",
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
        "shutterId": "root212-top35"
      },
      {
        "id": "l212-top21-2",
        "color": "red",
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
        "shutterId": "root212-top35"
      },
      {
        "id": "l212-top21-3",
        "color": "red",
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
          ],
          [
            0,
            1
          ],
          [
            1,
            1
          ]
        ],
        "shutterId": "root212-top35"
      },
      {
        "id": "l212-top21-4",
        "color": "red",
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
        "shutterId": "root212-top35"
      },
      {
        "id": "l212-top21-5",
        "color": "green",
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
        "shutterId": "root212-top35"
      },
      {
        "id": "l212-top21-6",
        "color": "yellow",
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
          ],
          [
            2,
            1
          ]
        ],
        "shutterId": "root212-top35"
      },
      {
        "id": "l212-top21-7",
        "color": "green",
        "x": 1,
        "y": 3,
        "shape": [
          [
            0,
            0
          ]
        ],
        "shutterId": "root212-top35"
      },
      {
        "id": "l212-top21-8",
        "color": "yellow",
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
        "shutterId": "root212-top35"
      },
      {
        "id": "l212-top21-9",
        "color": "green",
        "x": 6,
        "y": 3,
        "shape": [
          [
            0,
            0
          ]
        ],
        "shutterId": "root212-top35"
      },
      {
        "id": "l212-top21-10",
        "color": "green",
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
        "shutterId": "root212-top35"
      },
      {
        "id": "root212-red-ice11",
        "x": 2,
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
        ],
        "frozen": 11
      },
      {
        "id": "root212-2-5",
        "x": 2,
        "y": 5,
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "root212-3-5",
        "x": 3,
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
        "id": "root212-4-5",
        "x": 4,
        "y": 5,
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "root212-0-6",
        "x": 0,
        "y": 6,
        "color": "blue",
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "root212-1-6",
        "x": 1,
        "y": 6,
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "root212-2-6",
        "x": 2,
        "y": 6,
        "color": "blue",
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "root212-3-6",
        "x": 3,
        "y": 6,
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "root212-4-6",
        "x": 4,
        "y": 6,
        "color": "blue",
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "root212-5-6",
        "x": 5,
        "y": 6,
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "root212-6-6",
        "x": 6,
        "y": 6,
        "color": "blue",
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "root212-2-7",
        "x": 2,
        "y": 7,
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "root212-3-7",
        "x": 3,
        "y": 7,
        "color": "blue",
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "root212-4-7",
        "x": 4,
        "y": 7,
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "root212-5-7",
        "x": 5,
        "y": 7,
        "color": "blue",
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "root212-6-7",
        "x": 6,
        "y": 7,
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "root212-4-8",
        "x": 4,
        "y": 8,
        "color": "blue",
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "root212-5-8",
        "x": 5,
        "y": 8,
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "root212-6-8",
        "x": 6,
        "y": 8,
        "color": "blue",
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "root212-small-0-7",
        "x": 0,
        "y": 7,
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ]
        ],
        "shutterId": "root212-small4"
      },
      {
        "id": "root212-small-1-7",
        "x": 1,
        "y": 7,
        "color": "blue",
        "shape": [
          [
            0,
            0
          ]
        ],
        "shutterId": "root212-small4"
      },
      {
        "id": "root212-small-0-8",
        "x": 0,
        "y": 8,
        "color": "blue",
        "shape": [
          [
            0,
            0
          ]
        ],
        "shutterId": "root212-small4"
      },
      {
        "id": "root212-small-1-8",
        "x": 1,
        "y": 8,
        "color": "yellow",
        "shape": [
          [
            0,
            0
          ]
        ],
        "shutterId": "root212-small4"
      }
    ],
    "mechanismAdaptation": {
      "userAuthorized": "v1.125：211–220上下界持续不满足时有限换色换形与必要重排，完整验收合格后自主接入正式数据。",
      "sourceFactsFile": "deliverables/continue211-220-20260930/design212-new/source212-facts-v5-raw.json",
      "change": "v1.11：竞品两层壳与两蓝彩格冲突，保留两蓝彩格、移除两壳属性；普通本体在v1.125换形换色重排中保留其库存角色。v1.22：竞品小帘有3个真实空格，设计层必须实际补满。 按v1.125有限重生成。源7×9异形56格、25开局+6上帘+1小帘=32体；设计同外尺寸原创左右对称59格、19开局+13上帘+4小帘=36体。上帘7×2/14格改7×5/35格，计数仍10；小帘移(0,7)，2×2满铺为两蓝两黄S，计数仍1。两蓝彩格从源(1,4)/(2,4)移至(5,0)/(6,0)；红H2数字冰11移(2,8)，上帘蓝H2炸弹40移(0,2)，已知初值与机关实例保持。绿顶门19/宽3、红左上16/宽2、黄左下11/宽2均保；普通蓝右下口宽2改3，在通常≤3限制内服务重排后的下舱路线。普通形色、相邻关系及帘区面积/体数均为设计适配，非竞品逐格复刻。来源3个非矩形体、两壳和小帘空格仍单列，不改写来源事实。三星采用已验50拖，68秒时间星/95秒总时限及历史par8/reward200保持。"
    },
    "blocked": [
      [
        0,
        5
      ],
      [
        1,
        5
      ],
      [
        5,
        5
      ],
      [
        6,
        5
      ]
    ]
  },
  {
    "id": 213,
    "name": "双域升降·213",
    "difficulty": "normal",
    "mechanismRules": "revised-2026-09-27-v1.5",
    "width": 7,
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
    "timeSeconds": 150,
    "reward": 200,
    "parMoves": 8,
    "preservedMoveTarget": 38,
    "designTargets": {
      "formulaVersion": "blockout-d1",
      "minimumRepositionOverhead": 12,
      "calibratedDifficulty": 1.4
    },
    "gates": [
      {
        "id": "l213-orange",
        "color": "orange",
        "side": "top",
        "offset": 2,
        "size": 3,
        "frozen": 10
      },
      {
        "id": "l213-cyan",
        "color": "cyan",
        "side": "right",
        "offset": 0,
        "size": 2,
        "frozen": 9
      },
      {
        "id": "l213-pink",
        "color": "pink",
        "side": "left",
        "offset": 3,
        "size": 3,
        "frozen": 9
      },
      {
        "id": "l213-yellow",
        "color": "yellow",
        "side": "left",
        "offset": 7,
        "size": 2,
        "frozen": 2,
        "portals": [
          {
            "side": "left",
            "origin": [
              1,
              7
            ],
            "size": 2
          }
        ]
      },
      {
        "id": "l213-blue",
        "color": "blue",
        "side": "right",
        "offset": 7,
        "size": 2,
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
        "id": "l213-red",
        "color": "red",
        "side": "bottom",
        "offset": 3,
        "size": 3,
        "frozen": 1
      },
      {
        "id": "l213-green",
        "color": "green",
        "side": "left",
        "offset": 9,
        "size": 3,
        "frozen": 2,
        "portals": [
          {
            "side": "left",
            "origin": [
              1,
              9
            ],
            "size": 3
          }
        ]
      }
    ],
    "shutters": [
      {
        "id": "l213-upper",
        "x": 0,
        "y": 0,
        "width": 7,
        "height": 6,
        "count": 3,
        "skin": "shutter"
      },
      {
        "id": "l213-lift",
        "x": 3,
        "y": 7,
        "width": 3,
        "height": 3,
        "count": 0,
        "skin": "lift"
      }
    ],
    "blocks": [
      {
        "id": "l213-red-t",
        "color": "yellow",
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
        "id": "l213-green-square",
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
        "id": "l213-ice1-blue-orange",
        "color": "red",
        "x": 3,
        "y": 10,
        "shape": [
          [
            0,
            0
          ],
          [
            0,
            1
          ]
        ],
        "frozen": 1
      },
      {
        "id": "l213-yellow-square",
        "color": "yellow",
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
        "id": "l213-blue-base",
        "color": "blue",
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
          ]
        ]
      },
      {
        "id": "l213-start-blue",
        "color": "blue",
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
        ]
      },
      {
        "id": "l213-ice-e",
        "color": "green",
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
        "shutterId": "l213-upper",
        "frozen": 5
      },
      {
        "id": "l213-ice-d",
        "color": "pink",
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
        "shutterId": "l213-upper",
        "frozen": 5
      },
      {
        "id": "l213-upper-retile-3",
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
        "shutterId": "l213-upper",
        "x": 3,
        "y": 0
      },
      {
        "id": "l213-upper-retile-4",
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
            0,
            2
          ]
        ],
        "shutterId": "l213-upper",
        "x": 2,
        "y": 0
      },
      {
        "id": "l213-ice-a",
        "color": "cyan",
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
        "shutterId": "l213-upper",
        "frozen": 5
      },
      {
        "id": "l213-upper-retile-6",
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
        "shutterId": "l213-upper",
        "x": 1,
        "y": 0
      },
      {
        "id": "l213-ice-c",
        "color": "yellow",
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
        "shutterId": "l213-upper",
        "frozen": 5
      },
      {
        "id": "l213-upper-retile-1",
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
        "shutterId": "l213-upper",
        "x": 5,
        "y": 2
      },
      {
        "id": "l213-upper-retile-2",
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
        "shutterId": "l213-upper",
        "x": 3,
        "y": 2
      },
      {
        "id": "l213-ice-g",
        "color": "orange",
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
            1,
            1
          ],
          [
            2,
            1
          ]
        ],
        "shutterId": "l213-upper",
        "frozen": 5
      },
      {
        "id": "l213-ice-f",
        "color": "cyan",
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
        "shutterId": "l213-upper",
        "frozen": 5
      },
      {
        "id": "l213-ice-b",
        "color": "pink",
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
        "shutterId": "l213-upper",
        "frozen": 5
      },
      {
        "id": "l213-upper-retile-0",
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
        "shutterId": "l213-upper",
        "x": 5,
        "y": 4
      },
      {
        "id": "l213-upper-retile-5",
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
        "shutterId": "l213-upper",
        "x": 2,
        "y": 5
      },
      {
        "id": "l213-new-neck",
        "x": 2,
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
          ]
        ]
      },
      {
        "id": "l213-lift-shell-former",
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
        "color": "yellow",
        "shutterId": "l213-lift"
      },
      {
        "id": "l213-lift-orange-former",
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
        "color": "orange",
        "shutterId": "l213-lift"
      },
      {
        "id": "l213-lift-H2",
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
        "color": "blue",
        "shutterId": "l213-lift"
      }
    ],
    "mechanismAdaptation": {
      "userAuthorized": "211–220有限换色/换形/必要布局重生成；v1.11彩格优先于壳；fresh全门禁后自主正式数据接入",
      "change": "SOURCE v2 corrects initial ice1 to plain redV2, true lift3x3 at source(4,9) containing3 bodies: yellowouter/blueinnerQ2,blueouter/orangeinnerV2,blueH2; source orangegrid1 at(3,3). Authored70cell LR-symmetric narrow lower room, 7opening+14upper+3lift=24bodies versus source6+15+3=24. Upper ordinary fillers consolidated/recolored/native retiled, ice5x7 retained; lower T4→yellowQ2, blueH2 and redice1 preserved; 1ordinaryneckH3 added, other original ordinary piece shape/count differences explicitly authored. v1.11 removes both hidden shell attributes but retains3bodies; outeryellowQ2/innerorangeV2 enlargedV3+ordinaryblueH2 fill9cells. Orangegrid moves to(2,3), lift moves(3,7). All gate colors/counts/spans retained with actual new-boundary side portals and lowergreen movedleft9/redbottom3. Source masks/positions retained as facts, never claimed exact clone."
    },
    "coloredGrids": [
      {
        "id": "l213-orange-floor",
        "color": "orange",
        "cells": [
          [
            2,
            3
          ]
        ]
      }
    ]
  },
  {
    "id": 214,
    "name": "双机升降·214",
    "difficulty": "hard",
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
    "timeSeconds": 105,
    "reward": 200,
    "parMoves": 8,
    "preservedMoveTarget": 51,
    "designTargets": {
      "formulaVersion": "blockout-d1",
      "minimumRepositionOverhead": 16,
      "calibratedDifficulty": 1.65
    },
    "gates": [
      {
        "id": "l214-g-purple",
        "color": "purple",
        "side": "left",
        "offset": 0,
        "size": 3
      },
      {
        "id": "l214-g-pink",
        "color": "pink",
        "side": "left",
        "offset": 3,
        "size": 2,
        "portals": [
          {
            "side": "left",
            "origin": [
              2,
              3
            ],
            "size": 2
          }
        ]
      },
      {
        "id": "l214-g-orange",
        "color": "orange",
        "side": "left",
        "offset": 7,
        "size": 3,
        "portals": [
          {
            "side": "left",
            "origin": [
              1,
              7
            ],
            "size": 3
          }
        ]
      },
      {
        "id": "l214-g-green",
        "color": "green",
        "side": "right",
        "offset": 0,
        "size": 3
      },
      {
        "id": "l214-g-yellow",
        "color": "yellow",
        "side": "right",
        "offset": 3,
        "size": 2,
        "portals": [
          {
            "side": "right",
            "origin": [
              4,
              3
            ],
            "size": 2
          }
        ]
      },
      {
        "id": "l214-g-blue",
        "color": "blue",
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
        ]
      },
      {
        "id": "l214-g-red",
        "color": "red",
        "side": "bottom",
        "offset": 1,
        "size": 3
      },
      {
        "id": "l214-g-cyan",
        "color": "cyan",
        "side": "bottom",
        "offset": 4,
        "size": 2,
        "portals": [
          {
            "side": "bottom",
            "origin": [
              4,
              9
            ],
            "size": 2
          }
        ]
      }
    ],
    "shutters": [
      {
        "id": "l214-lift",
        "skin": "lift",
        "x": 1,
        "y": 6,
        "width": 5,
        "height": 4,
        "count": 1
      }
    ],
    "generators": [
      {
        "id": "l214-machine-left",
        "side": "top",
        "offset": 1,
        "rimSpan": 3,
        "rimMount": "rim",
        "spawn": [
          0,
          0
        ],
        "queueBlockIds": [
          "l214-ql1",
          "l214-ql2",
          "l214-ql3"
        ]
      },
      {
        "id": "l214-machine-right",
        "side": "top",
        "offset": 5,
        "rimSpan": 3,
        "rimMount": "rim",
        "spawn": [
          4,
          0
        ],
        "queueBlockIds": [
          "l214-qr1",
          "l214-qr2",
          "l214-qr3"
        ]
      }
    ],
    "blocks": [
      {
        "id": "l214-a",
        "color": "red",
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
        "movementAxis": "vertical"
      },
      {
        "id": "l214-b",
        "color": "yellow",
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
        "frozen": 2
      },
      {
        "id": "l214-ql1",
        "color": "orange",
        "x": 0,
        "y": 0,
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
            1,
            2
          ]
        ]
      },
      {
        "id": "l214-ql2",
        "color": "purple",
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
          ]
        ]
      },
      {
        "id": "l214-ql3",
        "color": "cyan",
        "x": 0,
        "y": 0,
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
        ]
      },
      {
        "id": "l214-qr1",
        "color": "blue",
        "x": 0,
        "y": 0,
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
            1,
            2
          ]
        ]
      },
      {
        "id": "l214-qr2",
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
          ],
          [
            0,
            1
          ]
        ]
      },
      {
        "id": "l214-qr3",
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
        "id": "l214-fill50-0",
        "x": 0,
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
        ]
      },
      {
        "id": "l214-fill50-1",
        "x": 6,
        "y": 0,
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
        "id": "l214-fill50-2",
        "x": 4,
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
          ]
        ]
      },
      {
        "id": "l214-fill50-3",
        "x": 2,
        "y": 2,
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
        "id": "l214-fill50-4",
        "x": 2,
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
        ]
      },
      {
        "id": "l214-fill50-5",
        "x": 2,
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
        "id": "l214-i",
        "color": "pink",
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
        ]
      },
      {
        "id": "l214-f",
        "color": "blue",
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
        ]
      },
      {
        "id": "l214-g",
        "color": "purple",
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
        "frozen": 8
      },
      {
        "id": "l214-c",
        "color": "yellow",
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
        "layers": [
          "cyan",
          "yellow"
        ]
      },
      {
        "id": "l214-d",
        "color": "orange",
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
        "layers": [
          "purple",
          "orange"
        ]
      },
      {
        "id": "l214-h",
        "color": "red",
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
        "id": "l214-e",
        "color": "green",
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
        ]
      },
      {
        "id": "l214-hidden-blue-s",
        "color": "purple",
        "x": 1,
        "y": 6,
        "shape": [
          [
            0,
            0
          ]
        ],
        "shutterId": "l214-lift"
      },
      {
        "id": "l214-hidden-pink",
        "color": "yellow",
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
        "shutterId": "l214-lift"
      },
      {
        "id": "l214-hidden-purple",
        "color": "orange",
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
        "shutterId": "l214-lift"
      },
      {
        "id": "l214-hidden-orange",
        "color": "blue",
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
        "shutterId": "l214-lift"
      },
      {
        "id": "l214-hidden-blue-h2",
        "color": "red",
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
        "shutterId": "l214-lift"
      },
      {
        "id": "l214-hidden-yellow",
        "color": "blue",
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
        "shutterId": "l214-lift"
      },
      {
        "id": "l214-hidden-shell",
        "color": "blue",
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
        "layers": [
          "green",
          "blue"
        ],
        "shutterId": "l214-lift"
      },
      {
        "id": "l214-hidden-red",
        "color": "pink",
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
        "shutterId": "l214-lift"
      }
    ],
    "mechanismAdaptation": {
      "userAuthorized": "用户要求211–220上下界持续不满足时有限换色换形及必要重排，满足难度和必挪后直接接入正式数据，并调整三星拖数。",
      "change": "源7×10异形66格改为同外尺寸原创50格左右对称轮廓：上3行宽7、中3行宽3、下4行宽5；保真实5×4升降区。源9个开局本体和全部6件FIFO、8个升降隐藏本体均保留，原向换形重排并增6个普通填充体使开局实际50/50满铺。非矩形红纵轴改原向Q2；下舱普通L4/L3必要适配H2/V2，普通体颜色重新分配。保源2台各3件FIFO顺序、颜色及每件占格数，源L形队列换已有原向L块并按机器口中线对齐、源3外壳、数字冰2/8、1纵轴、8普通门颜色及跨度；门随真实边界重映射。两台首货因真实落点空在初始化自动投放，较源未投放开局不同，后续4货真实自动FIFO。隐藏8体保原向形状清单和20格覆盖，7普通外色在源颜色多重集内重新分配并重铺，绿→蓝Q2壳保持。三星采用已验完整51拖，不称最优；时间星75秒/总105秒、历史par8/reward200保持。"
    }
  },
  {
    "id": 215,
    "name": "双帘错层·215",
    "difficulty": "easy",
    "mechanismRules": "revised-2026-09-27-v1.5",
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
    "reward": 200,
    "parMoves": 8,
    "preservedMoveTarget": 37,
    "designTargets": {
      "formulaVersion": "blockout-d1",
      "minimumRepositionOverhead": 6,
      "calibratedDifficulty": 1.2
    },
    "gates": [
      {
        "id": "l215-g-green",
        "color": "green",
        "side": "top",
        "offset": 2,
        "size": 3,
        "frozen": 12
      },
      {
        "id": "l215-g-pink",
        "color": "pink",
        "side": "left",
        "offset": 0,
        "size": 2
      },
      {
        "id": "l215-g-yellow",
        "color": "yellow",
        "side": "right",
        "offset": 0,
        "size": 2
      },
      {
        "id": "l215-g-orange",
        "color": "orange",
        "side": "left",
        "offset": 5,
        "size": 2
      },
      {
        "id": "l215-g-purple",
        "color": "purple",
        "side": "top",
        "offset": 6,
        "size": 1,
        "frozen": 2,
        "portals": [
          {
            "side": "top",
            "origin": [
              6,
              5
            ],
            "size": 1
          }
        ]
      },
      {
        "id": "l215-g-red",
        "color": "red",
        "side": "right",
        "offset": 5,
        "size": 3,
        "frozen": 6
      },
      {
        "id": "l215-g-blue",
        "color": "blue",
        "side": "bottom",
        "offset": 0,
        "size": 2,
        "frozen": 4
      }
    ],
    "shutters": [
      {
        "id": "l215-left",
        "x": 0,
        "y": 0,
        "width": 2,
        "height": 3,
        "count": 16,
        "skin": "shutter"
      },
      {
        "id": "l215-right",
        "x": 5,
        "y": 0,
        "width": 2,
        "height": 3,
        "count": 14,
        "skin": "shutter"
      }
    ],
    "blocks": [
      {
        "id": "l215-t",
        "color": "pink",
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
        ]
      },
      {
        "id": "l215-d",
        "color": "red",
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
        "id": "l215-i",
        "color": "blue",
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
        "id": "l215-b",
        "color": "purple",
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
        ]
      },
      {
        "id": "l215-c",
        "color": "pink",
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
        ]
      },
      {
        "id": "l215-a",
        "color": "blue",
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
        ]
      },
      {
        "id": "l215-g",
        "color": "green",
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
        ]
      },
      {
        "id": "l215-e",
        "color": "blue",
        "x": 4,
        "y": 4,
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "l215-f",
        "color": "orange",
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
        ]
      },
      {
        "id": "l215-s",
        "color": "purple",
        "x": 6,
        "y": 5,
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "l215-m",
        "color": "green",
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
        "id": "l215-l",
        "color": "orange",
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
        "id": "l215-h",
        "color": "red",
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
        "id": "l215-k",
        "color": "purple",
        "x": 4,
        "y": 5,
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "l215-n",
        "color": "orange",
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
        "id": "l215-r",
        "color": "red",
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
        "id": "l215-u",
        "color": "yellow",
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
        ]
      },
      {
        "id": "l215-p",
        "color": "orange",
        "x": 4,
        "y": 6,
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "l215-q",
        "color": "green",
        "x": 1,
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
        ]
      },
      {
        "id": "l215-j",
        "color": "red",
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
        "id": "l215-o",
        "color": "red",
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
        "id": "l215-hidden-left-red",
        "color": "red",
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
        "shutterId": "l215-left",
        "timedBombSeconds": 30
      },
      {
        "id": "l215-hidden-left-purple",
        "color": "purple",
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
        "shutterId": "l215-left"
      },
      {
        "id": "l215-hidden-right-orange",
        "color": "orange",
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
        "shutterId": "l215-right"
      },
      {
        "id": "l215-hidden-right-blue",
        "color": "blue",
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
        "shutterId": "l215-right"
      },
      {
        "id": "l215-added-left",
        "x": 1,
        "y": 3,
        "color": "red",
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "l215-added-right",
        "x": 5,
        "y": 3,
        "color": "red",
        "shape": [
          [
            0,
            0
          ]
        ]
      }
    ],
    "mechanismAdaptation": {
      "userAuthorized": "用户要求211–220上下界持续不满足时换色换形及必要重排，满足难度与必挪后直接正式接入并调整三星",
      "change": "原创50格对称轮廓：相对竞品48格，在中段两侧新增(x1,y3)/(x5,y3)真实可玩格，各由一个原向普通S满铺。保来源全部25块及16/14双帘隐藏各6格、冰门12/2/6/4、隐藏红V3炸弹30秒；原两L3原向与中干/下舱重排继续。新增普通块为真实覆盖适配，不增加机关；fresh下界/完整路线独立重验。三星37采用完整无道具路线，不称最优。"
    }
  },
  {
    "id": 216,
    "name": "紫色栈桥·216",
    "mechanismRules": "revised-2026-09-27-v1.5",
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
    "difficulty": "normal",
    "timeSeconds": 120,
    "reward": 200,
    "parMoves": 8,
    "preservedMoveTarget": 39,
    "designTargets": {
      "formulaVersion": "blockout-d1",
      "minimumRepositionOverhead": 13,
      "calibratedDifficulty": 1.45
    },
    "gates": [
      {
        "id": "red",
        "color": "red",
        "side": "left",
        "offset": 0,
        "size": 3,
        "portals": [
          {
            "side": "left",
            "origin": [
              0,
              0
            ],
            "size": 3
          }
        ]
      },
      {
        "id": "pink",
        "color": "pink",
        "side": "top",
        "offset": 5,
        "size": 3,
        "portals": [
          {
            "side": "top",
            "origin": [
              5,
              0
            ],
            "size": 3
          }
        ]
      },
      {
        "id": "purple",
        "color": "purple",
        "side": "right",
        "offset": 0,
        "size": 3,
        "portals": [
          {
            "side": "right",
            "origin": [
              7,
              0
            ],
            "size": 3
          }
        ]
      },
      {
        "id": "green",
        "color": "green",
        "side": "right",
        "offset": 3,
        "size": 1,
        "portals": [
          {
            "side": "right",
            "origin": [
              7,
              3
            ],
            "size": 1
          }
        ]
      },
      {
        "id": "cyan",
        "color": "cyan",
        "side": "bottom",
        "offset": 0,
        "size": 1,
        "portals": [
          {
            "side": "bottom",
            "origin": [
              0,
              3
            ],
            "size": 1
          }
        ]
      },
      {
        "id": "blue",
        "color": "blue",
        "side": "left",
        "offset": 8,
        "size": 2,
        "portals": [
          {
            "side": "left",
            "origin": [
              0,
              8
            ],
            "size": 2
          }
        ]
      },
      {
        "id": "orange",
        "color": "orange",
        "side": "top",
        "offset": 6,
        "size": 2,
        "portals": [
          {
            "side": "top",
            "origin": [
              6,
              7
            ],
            "size": 2
          }
        ],
        "frozen": 2
      },
      {
        "id": "yellow",
        "color": "yellow",
        "side": "right",
        "offset": 9,
        "size": 1,
        "portals": [
          {
            "side": "right",
            "origin": [
              7,
              9
            ],
            "size": 1
          }
        ],
        "frozen": 3
      }
    ],
    "blocks": [
      {
        "id": "l216-b7",
        "color": "blue",
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
        ]
      },
      {
        "id": "l216-b0",
        "color": "orange",
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
        ]
      },
      {
        "id": "l216-b8",
        "color": "purple",
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
        ]
      },
      {
        "id": "l216-b4",
        "color": "blue",
        "x": 2,
        "y": 7,
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "l216-b1",
        "color": "yellow",
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
        ]
      },
      {
        "id": "l216-b5",
        "color": "orange",
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
        ]
      },
      {
        "id": "l216-b3",
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
        "id": "l216-b6",
        "color": "purple",
        "x": 6,
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
        "id": "l216-b2",
        "color": "blue",
        "x": 4,
        "y": 9,
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "l216-b9",
        "color": "yellow",
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
        ]
      },
      {
        "id": "l216-bridge",
        "color": "purple",
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
          ],
          [
            0,
            2
          ],
          [
            1,
            2
          ]
        ]
      },
      {
        "id": "l216-h3",
        "color": "red",
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
        "movementAxis": "horizontal",
        "shutterId": "cover"
      },
      {
        "id": "l216-h8",
        "color": "pink",
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
            2,
            0
          ]
        ],
        "movementAxis": "vertical",
        "shutterId": "cover"
      },
      {
        "id": "l216-h10",
        "color": "pink",
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
        "shutterId": "cover"
      },
      {
        "id": "l216-h5",
        "color": "red",
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
        "shutterId": "cover"
      },
      {
        "id": "l216-h1",
        "color": "purple",
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
        "shutterId": "cover"
      },
      {
        "id": "l216-h7",
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
          ]
        ],
        "shutterId": "cover"
      },
      {
        "id": "l216-h4",
        "color": "red",
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
        "shutterId": "cover"
      },
      {
        "id": "l216-h6",
        "color": "cyan",
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
        "shutterId": "cover"
      },
      {
        "id": "l216-h11",
        "color": "pink",
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
        "shutterId": "cover"
      },
      {
        "id": "l216-h2",
        "color": "cyan",
        "x": 2,
        "y": 2,
        "shape": [
          [
            0,
            0
          ]
        ],
        "shutterId": "cover"
      },
      {
        "id": "l216-h0",
        "color": "pink",
        "x": 2,
        "y": 3,
        "shape": [
          [
            0,
            0
          ]
        ],
        "shutterId": "cover"
      },
      {
        "id": "l216-h9",
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
            0,
            1
          ],
          [
            1,
            1
          ]
        ],
        "shutterId": "cover"
      },
      {
        "id": "l216-new-neck-left",
        "color": "yellow",
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
        "id": "l216-new-neck-right",
        "color": "yellow",
        "x": 5,
        "y": 6,
        "shape": [
          [
            0,
            0
          ]
        ]
      }
    ],
    "shutters": [
      {
        "id": "cover",
        "x": 0,
        "y": 0,
        "width": 8,
        "height": 4,
        "count": 6,
        "skin": "shutter"
      }
    ],
    "coloredGrids": [
      {
        "id": "purple-floor",
        "color": "purple",
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
          ],
          [
            3,
            6
          ],
          [
            4,
            6
          ]
        ]
      }
    ],
    "mechanismAdaptation": {
      "userAuthorized": "211–220有限换色换形与直接正式数据接入，v1.125",
      "change": "216视频580秒及630秒：保8×10/62格双舱、1帘6、6紫彩格、冰门2/3、隐藏2方向块。源隐藏约24/32格及开局桥6格未铺满，补普通块；非原向下层紫T4和上层红方向L4改Q2。源10实体口/重复红蓝橙与8色唯一口冲突：保全部冰门，取消上舱蓝/橙普通口，下舱红口和对应块映黄，上舱蓝橙块换色换形匹配其余色口。原向全铺重排，不冒称来源精确一致。 新族普通块 h4 换色 red，原布局U16已淘汰。 棋盘原创改为64格：保8×10、8×4卷帘及6紫格，源颈底新增对称两侧格(2,6)/(5,6)，普通块真实填满新格；不与来源mask等价。"
    }
  },
  {
    "id": 217,
    "name": "冰桥升降·217",
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
    "timeSeconds": 90,
    "reward": 200,
    "parMoves": 8,
    "preservedMoveTarget": 41,
    "designTargets": {
      "formulaVersion": "blockout-d1",
      "minimumRepositionOverhead": 17,
      "calibratedDifficulty": 2.2
    },
    "gates": [
      {
        "id": "l217-cyan",
        "color": "cyan",
        "side": "top",
        "offset": 0,
        "size": 2,
        "frozen": 5
      },
      {
        "id": "l217-red",
        "color": "red",
        "side": "top",
        "offset": 5,
        "size": 3,
        "frozen": 4
      },
      {
        "id": "l217-pink",
        "color": "pink",
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
        "color": "blue",
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
        "color": "blue",
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
        "color": "blue",
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
        "color": "blue"
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
        "color": "cyan"
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
        "color": "cyan"
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
        "color": "blue"
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
        "color": "blue"
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
        "color": "red"
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
        "color": "pink"
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
        "color": "cyan"
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
        "color": "red"
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
        "color": "pink"
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
        "color": "cyan"
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
    ],
    "mechanismAdaptation": {
      "userAuthorized": "211–220有限改色/换形/必要布局，合格后正式数据接入",
      "sourceFactsFile": "deliverables/continue211-220-20260930/design212-new/source217/source217-facts-v2.json",
      "change": "Reconstructed actual source8x9 irregular/62 cells; authored symmetric68 cells. Keep1 real3x4lift and full12-cell blueQ3+goldH3 hidden layer,4blue coloredcells,1 horizontal-axis V3. Source9ice+1ordinary10portals exceed8-colorunique capacity: v1.11 removes exactlypurple10 andgreen7; retained5/4/8/8/3/12/1 andordinary orange unchanged. Source goldH3 mapsyellow to fit its right1-cell portal; sourcewidepurpleH2 recoloredpink forretainedleft8. SourceblueQ2 lowerretiledblueV2+redS+purpleS forfullopening andunlocking. Confirmednarrowdoublearrow isaxisblock (Lv56sourceframe andmechanism workbook A10:B10), notflipgate orrotation. KnownV3axis preserved. Otherordinaryshape,color,layout adaptations declared; sourceparity notclaimed. Latestfinite mutation [[\"fill-11\",\"green\"],[\"fill-14\",\"blue\"],[\"fill-7\",\"orange\"]] New authored64-cell narrow bridge mask: remove four outer neck cells and repack ordinary bodies into eight upper Q2 plus larger lower rectangles. All4 blue grid cells, horizontal axis, lift inventory and retained gate values remain. No source parity claim. Lower chamber ordinary inventory retiles into V3 columns; source horizontal-axis V3 moves to left column. Fixed8 gate counts,4grid cells and real12-cell lift2bodies remain. New68-cell symmetric wide-neck geometry with full Q2 upper/bridge tiling and V3 lower columns, ordinary colors reassigned. Source4 blue floors, axis orientation, lift2-body12-cell inventory and retained gates unchanged; ordinary bodies merged/split as authored adaptation."
    }
  },
  {
    "id": 218,
    "name": "钥锁错位·218",
    "mechanismRules": "revised-2026-09-27-v1.5",
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
    "difficulty": "easy",
    "timeSeconds": 100,
    "reward": 200,
    "parMoves": 8,
    "preservedMoveTarget": 35,
    "designTargets": {
      "formulaVersion": "blockout-d1",
      "minimumRepositionOverhead": 7,
      "calibratedDifficulty": 1.25
    },
    "gates": [
      {
        "id": "purple",
        "color": "purple",
        "side": "top",
        "offset": 3,
        "size": 2
      },
      {
        "id": "blue",
        "color": "blue",
        "side": "top",
        "offset": 1,
        "size": 2,
        "frozen": 3
      },
      {
        "id": "red",
        "color": "red",
        "side": "right",
        "offset": 1,
        "size": 3,
        "frozen": 1
      },
      {
        "id": "orange",
        "color": "orange",
        "side": "left",
        "offset": 2,
        "size": 2,
        "frozen": 3
      },
      {
        "id": "green",
        "color": "green",
        "side": "left",
        "offset": 7,
        "size": 2
      },
      {
        "id": "yellow",
        "color": "yellow",
        "side": "right",
        "offset": 6,
        "size": 2
      }
    ],
    "blocks": [
      {
        "id": "l218-b12",
        "color": "purple",
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
        ]
      },
      {
        "id": "l218-b9",
        "color": "yellow",
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
        ]
      },
      {
        "id": "l218-b0",
        "color": "green",
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
        ]
      },
      {
        "id": "l218-b15",
        "color": "yellow",
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
          ]
        ]
      },
      {
        "id": "l218-b7",
        "color": "red",
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
            1,
            1
          ]
        ]
      },
      {
        "id": "l218-b13",
        "color": "blue",
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
        ]
      },
      {
        "id": "l218-b11",
        "color": "purple",
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
            1,
            1
          ]
        ]
      },
      {
        "id": "l218-b8",
        "color": "blue",
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
        ]
      },
      {
        "id": "l218-b10",
        "color": "orange",
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
        ]
      },
      {
        "id": "l218-b6",
        "color": "red",
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
            1,
            1
          ],
          [
            2,
            1
          ]
        ],
        "keyId": "key218"
      },
      {
        "id": "l218-b3",
        "color": "orange",
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
        "lockedBy": "key218",
        "lockCount": 3
      },
      {
        "id": "l218-b2",
        "color": "purple",
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
        "layers": [
          "purple",
          "red"
        ]
      },
      {
        "id": "l218-b21",
        "color": "green",
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
        ]
      },
      {
        "id": "l218-b1",
        "color": "yellow",
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
        "layers": [
          "yellow",
          "blue"
        ]
      },
      {
        "id": "l218-b16",
        "color": "blue",
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
        ]
      },
      {
        "id": "l218-b4",
        "color": "blue",
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
        "keyId": "key218"
      },
      {
        "id": "l218-b5",
        "color": "purple",
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
        "keyId": "key218"
      },
      {
        "id": "l218-b14",
        "color": "red",
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
        ]
      },
      {
        "id": "l218-b20",
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
          ],
          [
            2,
            0
          ]
        ]
      },
      {
        "id": "l218-b18",
        "color": "green",
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
        ]
      },
      {
        "id": "l218-b19",
        "color": "orange",
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
        "id": "l218-b17",
        "color": "red",
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
      }
    ],
    "mechanismAdaptation": {
      "userAuthorized": "211–220有限换色换形重生成与正式数据接入；v1.125",
      "change": "218来源786秒/820秒：3钥匙1锁3、3壳、3冰门3/3/1保留。源gold映orange、lime映yellow。源不对称64格与空17格、非矩形壳/非原向形状须适配；原创对称66格轮廓、3壳改原向矩形，空白补普通块，钥匙和形色原向重排；不称精确复刻。"
    }
  },
  {
    "id": 219,
    "name": "转门折廊·219",
    "difficulty": "normal",
    "mechanismRules": "revised-2026-09-27-v1.5",
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
    "timeSeconds": 100,
    "reward": 200,
    "parMoves": 8,
    "preservedMoveTarget": 40,
    "designTargets": {
      "formulaVersion": "blockout-d1",
      "minimumRepositionOverhead": 14,
      "calibratedDifficulty": 1.5
    },
    "gates": [
      {
        "id": "l219-g-green",
        "color": "green",
        "side": "top",
        "offset": 0,
        "size": 2
      },
      {
        "id": "l219-g-purple",
        "color": "purple",
        "side": "bottom",
        "offset": 0,
        "size": 2
      },
      {
        "id": "l219-g-yellow",
        "color": "yellow",
        "side": "top",
        "offset": 6,
        "size": 2,
        "frozen": 8,
        "portals": [
          {
            "side": "top",
            "origin": [
              6,
              6
            ],
            "size": 2
          }
        ]
      },
      {
        "id": "l219-g-red",
        "color": "red",
        "side": "left",
        "offset": 8,
        "size": 2,
        "frozen": 3
      },
      {
        "id": "l219-g-cyan",
        "color": "cyan",
        "side": "bottom",
        "offset": 3,
        "size": 2,
        "frozen": 5
      }
    ],
    "flipDoors": [
      {
        "id": "l219-g-blue",
        "color": "blue",
        "side": "left",
        "offset": 0,
        "size": 2,
        "initiallyOpen": false
      },
      {
        "id": "l219-g-pink",
        "color": "pink",
        "side": "top",
        "offset": 2,
        "size": 2,
        "initiallyOpen": false
      },
      {
        "id": "l219-g-orange",
        "color": "orange",
        "side": "right",
        "offset": 7,
        "size": 3,
        "initiallyOpen": false
      }
    ],
    "blocks": [
      {
        "id": "l219-b",
        "color": "orange",
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
        "id": "l219-c",
        "color": "red",
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
        "id": "l219-d",
        "color": "cyan",
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
        "id": "l219-e",
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
          ],
          [
            2,
            0
          ]
        ]
      },
      {
        "id": "l219-f",
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
        "id": "l219-g",
        "color": "purple",
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
        ]
      },
      {
        "id": "l219-h",
        "color": "pink",
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
        "id": "l219-i",
        "color": "green",
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
        ]
      },
      {
        "id": "l219-j",
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
          ],
          [
            2,
            0
          ]
        ]
      },
      {
        "id": "l219-k",
        "color": "red",
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
        ]
      },
      {
        "id": "l219-l",
        "color": "yellow",
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
        ]
      },
      {
        "id": "l219-m",
        "color": "orange",
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
        ]
      },
      {
        "id": "l219-n",
        "color": "yellow",
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
          ]
        ]
      },
      {
        "id": "l219-o",
        "color": "cyan",
        "x": 6,
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
        "id": "l219-p",
        "color": "cyan",
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
        "id": "l219-q",
        "color": "red",
        "x": 1,
        "y": 8,
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "l219-r",
        "color": "purple",
        "x": 2,
        "y": 8,
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "l219-s",
        "color": "red",
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
          ]
        ]
      },
      {
        "id": "l219-t",
        "color": "purple",
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
        ]
      },
      {
        "id": "l219-u",
        "color": "cyan",
        "x": 2,
        "y": 9,
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "l219-v",
        "color": "cyan",
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
        "layers": [
          "purple",
          "cyan"
        ]
      },
      {
        "id": "l219-w",
        "color": "orange",
        "x": 5,
        "y": 9,
        "shape": [
          [
            0,
            0
          ]
        ]
      },
      {
        "id": "l219-x",
        "color": "pink",
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
        ]
      },
      {
        "id": "l219-a",
        "color": "purple",
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
        "id": "l219-a2",
        "color": "green",
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
      }
    ],
    "mechanismAdaptation": {
      "userAuthorized": "用户要求211–220上下界持续不满足时换色换形及必要重排，满足难度与必挪后直接正式接入并调整三星",
      "change": "原创62格上下对称轮廓：源x5..7第4行三格移至第6行，黄色冰8出口随新外边界上移一行，保颜色/跨度/冰数。左上普通Q2拆为两个原向H2并重配普通颜色，使源24本体适配25本体；紫外青内H2壳、冰门8/3/5和三扇初关闭翻门全部保持。完整40拖为三星目标，不称最优；难度fresh全开翻门放宽下界L11与真实翻门严格路线U14分别记录。"
    }
  },
  {
    "id": 220,
    "name": "双源回流·220",
    "difficulty": "super",
    "mechanismRules": "revised-2026-09-27-v1.5",
    "width": 8,
    "height": 9,
    "blocked": [],
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
        3,
        4
      ],
      [
        4,
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
    "timeSeconds": 120,
    "reward": 200,
    "parMoves": 8,
    "preservedMoveTarget": 59,
    "designTargets": {
      "formulaVersion": "blockout-d1",
      "calibratedDifficulty": 3,
      "minimumRepositionOverhead": 21
    },
    "shutters": [
      {
        "id": "l220-cover",
        "x": 0,
        "y": 0,
        "width": 3,
        "height": 4,
        "count": 9
      }
    ],
    "gates": [
      {
        "id": "blue",
        "color": "blue",
        "side": "top",
        "offset": 0,
        "size": 3,
        "frozen": 9
      },
      {
        "id": "purple",
        "color": "purple",
        "side": "top",
        "offset": 3,
        "size": 2,
        "frozen": 9
      },
      {
        "id": "red",
        "color": "red",
        "side": "top",
        "offset": 5,
        "size": 3,
        "frozen": 9
      },
      {
        "id": "orange",
        "color": "orange",
        "side": "bottom",
        "offset": 0,
        "size": 3
      },
      {
        "id": "green",
        "color": "green",
        "side": "bottom",
        "offset": 4,
        "size": 2
      }
    ],
    "blocks": [
      {
        "id": "l220-main-0",
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
        "color": "red"
      },
      {
        "id": "l220-main-1",
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
        "id": "l220-main-2",
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
        "id": "l220-main-3",
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
        "color": "red"
      },
      {
        "id": "l220-main-4",
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
        "id": "l220-main-5",
        "x": 7,
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
        "id": "l220-main-6",
        "x": 1,
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
        "id": "l220-main-7",
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
        "id": "l220-main-8",
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
        "color": "green"
      },
      {
        "id": "l220-main-9",
        "x": 6,
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
        "color": "blue"
      },
      {
        "id": "l220-main-10",
        "x": 1,
        "y": 8,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "orange"
      },
      {
        "id": "l220-hidden-shell",
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
        "color": "red",
        "layers": [
          "orange",
          "red"
        ],
        "shutterId": "l220-cover"
      },
      {
        "id": "l220-hidden-1",
        "x": 0,
        "y": 0,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "purple",
        "shutterId": "l220-cover"
      },
      {
        "id": "l220-hidden-2",
        "x": 1,
        "y": 0,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "green",
        "shutterId": "l220-cover"
      },
      {
        "id": "l220-hidden-3",
        "x": 2,
        "y": 0,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "red",
        "shutterId": "l220-cover"
      },
      {
        "id": "l220-hidden-4",
        "x": 0,
        "y": 1,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "red",
        "shutterId": "l220-cover"
      },
      {
        "id": "l220-hidden-5",
        "x": 0,
        "y": 2,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "purple",
        "shutterId": "l220-cover"
      },
      {
        "id": "l220-hidden-6",
        "x": 0,
        "y": 3,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "red",
        "shutterId": "l220-cover"
      },
      {
        "id": "l220-hidden-7",
        "x": 1,
        "y": 3,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "blue",
        "shutterId": "l220-cover"
      },
      {
        "id": "l220-hidden-8",
        "x": 2,
        "y": 3,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "purple",
        "shutterId": "l220-cover"
      },
      {
        "id": "l220-retile-0",
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
        "color": "blue"
      },
      {
        "id": "l220-retile-1",
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
        "color": "purple"
      },
      {
        "id": "l220-retile-2",
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
        "color": "red"
      },
      {
        "id": "l220-retile-3",
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
        "id": "l220-retile-4",
        "x": 5,
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
        "id": "l220-retile-5",
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
        "color": "red"
      },
      {
        "id": "l220-retile-6",
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
        "id": "l220-retile-7",
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
        "id": "l220-retile-8",
        "x": 5,
        "y": 3,
        "shape": [
          [
            0,
            0
          ]
        ],
        "color": "green"
      }
    ],
    "mechanismAdaptation": {
      "userAuthorized": "211–220上下界未达后换色换形和必要普通块拆合/布局重生成，同1帘9及9隐藏体可重设区域并分列source差异，合格后直接正式数据接入",
      "change": "竞品220首稳定972秒为8×9异形66格、19开局体、顶帘8×4/32格及9隐藏体；本原创图保8×9异形并采用64格左右对称双侧收颈，开局20体以8个Q2、3个V3、1个H3及8个S铺52格；左上真实帘改3×4/12格，仍是同一帘计数9、9隐藏体（橙壳红芯Q2与8个S）。完整28体适配为29体。源三冰门初值9/9/9、两普通门、各自口宽及颜色映射、一个橙壳红芯Q2均保持；source gold映orange。帘位置面积、普通块形色及排列、开局体数和轮廓为本轮换形换色必要重排的明确原创差异，不冒称逐格复制。",
      "sourceFactsFile": "deliverables/continue211-220-20260930/design220-new/source-facts220-final.json"
    }
  }
];

export const FORMAL_211_220_EVIDENCE = [
  {
    "id": 211,
    "levelSha256": "725654e9a0db4cc808edd1a17150475f7da69517c86cbd8a94345069351036ea",
    "L": 5,
    "U": 9,
    "starMoves": 32,
    "evidence": "deliverables/continue211-220-20260930/formal-adoption211-v125.json"
  },
  {
    "id": 212,
    "levelSha256": "1de4934ab571f3d63b4fe068209c9fac5e1d4a31ba1af0f1005a865fcc996f73",
    "L": 11,
    "U": 14,
    "starMoves": 50,
    "evidence": "deliverables/continue211-220-20260930/formal-adoption212-typed-v125.json"
  },
  {
    "id": 213,
    "levelSha256": "51edfac8e9a6a701ff2ed36113cf5d579dafceeed47f619e29321b65d1cbfaca",
    "L": 11,
    "U": 14,
    "starMoves": 38,
    "evidence": "deliverables/continue211-220-20260930/formal-adoption213-v125.json"
  },
  {
    "id": 214,
    "levelSha256": "63b98279811e33635366eec7304e1ba92dad0ffdba6423140118237412f37182",
    "L": 16,
    "U": 19,
    "starMoves": 51,
    "evidence": "deliverables/continue211-220-20260930/formal-adoption214-v125.json"
  },
  {
    "id": 215,
    "levelSha256": "79072509451fc0e9ecda313d179125cfe8a4f587d874533a465f5df6bf4ef83e",
    "L": 5,
    "U": 10,
    "starMoves": 37,
    "evidence": "deliverables/continue211-220-20260930/formal-adoption215-geometry-v125.json"
  },
  {
    "id": 216,
    "levelSha256": "5633d06f970e58545187b592223c63c76ce7790aa491de351d9a2ecfe5a23079",
    "L": 11,
    "U": 14,
    "starMoves": 39,
    "evidence": "deliverables/continue211-220-20260930/formal-adoption216-v125.json"
  },
  {
    "id": 217,
    "levelSha256": "f98afa02c522d791a85d2555f502e9e4bb01466966d323226e5c52585ca38693",
    "L": 16,
    "U": 20,
    "starMoves": 41,
    "evidence": "deliverables/continue211-220-20260930/formal-adoption217-v125.json"
  },
  {
    "id": 218,
    "levelSha256": "911dd117a30194bd1d5d09450efa4d9c21df61e827e7310d82d50c3228573b49",
    "L": 5,
    "U": 10,
    "starMoves": 35,
    "evidence": "deliverables/continue211-220-20260930/formal-adoption218-v125.json"
  },
  {
    "id": 219,
    "levelSha256": "98796883404a010c541323c3809f4ade880e9223887c09cd54cfb8b23710de32",
    "L": 11,
    "U": 14,
    "starMoves": 40,
    "evidence": "deliverables/continue211-220-20260930/formal-adoption219-v125.json"
  },
  {
    "id": 220,
    "levelSha256": "2c1949568897fc609abd9a4287d664ab2b5aa42213e97d0bf538b2c4f0190181",
    "L": 21,
    "U": 29,
    "starMoves": 59,
    "evidence": "deliverables/continue211-220-20260930/formal-adoption220-v125.json"
  }
] as const;

export const getFormal211to220LevelStrict = (id: number): LevelSpec => {
  const level = FORMAL_211_220_LEVELS.find(level => level.id === id);
  if (!level) throw new RangeError(`Level ${id} has not passed formal-data acceptance`);
  return level;
};
