// v1.43 native whole-sprite replacements; only the 12 authorized footprints.
// Lv5, all other blocks, geometry, mechanisms and evaluation data stay intact.
import type {LevelSpec} from './types';
export const NATIVE_BLOCK_REPAIR_IDS = [23,26,28,29,30] as const;
const replacements:Record<number,{sourceIds:string[];blocks:LevelSpec['blocks']}[]> = {
  "23": [
    {
      "sourceIds": [
        "r139-23-17"
      ],
      "blocks": [
        {
          "id": "v143-23-17-bar",
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
          "color": "green",
          "shutterId": "cover-2"
        },
        {
          "id": "v143-23-17-single",
          "x": 1,
          "y": 2,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "blue",
          "shutterId": "cover-2"
        }
      ]
    }
  ],
  "26": [
    {
      "sourceIds": [
        "r139-26-h10"
      ],
      "blocks": [
        {
          "id": "v143-26-h10-bar",
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
          "color": "purple",
          "shutterId": "r139-26-lower"
        },
        {
          "id": "v143-26-h10-single",
          "x": 2,
          "y": 6,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "purple",
          "shutterId": "r139-26-lower"
        }
      ]
    },
    {
      "sourceIds": [
        "r139-26-h11"
      ],
      "blocks": [
        {
          "id": "v143-26-h11-bar",
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
          "color": "red",
          "shutterId": "r139-26-lower"
        },
        {
          "id": "v143-26-h11-single",
          "x": 2,
          "y": 7,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "red",
          "shutterId": "r139-26-lower"
        }
      ]
    }
  ],
  "28": [
    {
      "sourceIds": [
        "s28-hidden-1-0"
      ],
      "blocks": [
        {
          "id": "v143-28-hidden-1-0-bar",
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
          "color": "cyan",
          "shutterId": "s28-curtain-1"
        },
        {
          "id": "v143-28-hidden-1-0-single",
          "x": 1,
          "y": 7,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "cyan",
          "shutterId": "s28-curtain-1"
        }
      ]
    },
    {
      "sourceIds": [
        "s28-hidden-1-1"
      ],
      "blocks": [
        {
          "id": "v143-28-hidden-1-1-bar",
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
          "color": "pink",
          "shutterId": "s28-curtain-1"
        },
        {
          "id": "v143-28-hidden-1-1-single",
          "x": 5,
          "y": 6,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "pink",
          "shutterId": "s28-curtain-1"
        }
      ]
    },
    {
      "sourceIds": [
        "s28-hidden-1-2"
      ],
      "blocks": [
        {
          "id": "v143-28-hidden-1-2-bar",
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
          "color": "yellow",
          "shutterId": "s28-curtain-1"
        },
        {
          "id": "v143-28-hidden-1-2-single",
          "x": 0,
          "y": 7,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "yellow",
          "shutterId": "s28-curtain-1"
        }
      ]
    }
  ],
  "29": [
    {
      "sourceIds": [
        "s29-open-red-1"
      ],
      "blocks": [
        {
          "id": "v143-29-open-red-1-bar",
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
          "color": "yellow"
        },
        {
          "id": "v143-29-open-red-1-single",
          "x": 2,
          "y": 1,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "red"
        }
      ]
    },
    {
      "sourceIds": [
        "s29-open-red-2"
      ],
      "blocks": [
        {
          "id": "v143-29-open-red-2-bar",
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
          "id": "v143-29-open-red-2-single",
          "x": 0,
          "y": 5,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "red"
        }
      ]
    },
    {
      "sourceIds": [
        "s29-hidden-2-4"
      ],
      "blocks": [
        {
          "id": "v143-29-hidden-2-4-bar",
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
          "color": "green",
          "shutterId": "s29-curtain-2"
        },
        {
          "id": "v143-29-hidden-2-4-single",
          "x": 6,
          "y": 2,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "green",
          "shutterId": "s29-curtain-2"
        }
      ]
    }
  ],
  "30": [
    {
      "sourceIds": [
        "s30-open-15"
      ],
      "blocks": [
        {
          "id": "v143-30-open-15-bar",
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
          "id": "v143-30-open-15-single",
          "x": 0,
          "y": 6,
          "shape": [
            [
              0,
              0
            ]
          ],
          "color": "green"
        }
      ]
    },
    {
      "sourceIds": [
        "s30-hidden-3",
        "s30-hidden-4"
      ],
      "blocks": [
        {
          "id": "v143-30-hidden-4-bar",
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
          "color": "red",
          "shutterId": "s30-curtain-1"
        },
        {
          "id": "v143-30-hidden-3-bar",
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
          "color": "green",
          "shutterId": "s30-curtain-1"
        }
      ]
    }
  ]
};
export function applyNativeBlockRepair(level:LevelSpec):LevelSpec {
  const rows=replacements[level.id];
  if(!rows)return level;
  const blocks=level.blocks.flatMap(block=>{
    const row=rows.find(r=>r.sourceIds.includes(block.id));
    if(!row)return [block];
    return row.sourceIds[0]===block.id?row.blocks:[];
  });
  return {...level,blocks};
}
