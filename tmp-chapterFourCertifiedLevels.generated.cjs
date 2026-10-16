"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHAPTER_FOUR_CERTIFIED_LEVELS = void 0;
/**
 * Generated production copies of the permanently certified chapter-four candidates.
 * These objects are deliberately self-contained: runtime code never reads playtest-results.
 */
/**
 * Lv35 source: playtest-results/experiments/video-parity-v7/proofs/lv035-certified-floor8-r153/lv35-certified-candidate.json
 * Candidate file SHA-256: BECAB9E4777B9DE51A5CA39BE1D85FAB0D8CBEE927FED689B4B15194FC6BF6E6
 * Canonical candidate LevelSpec SHA-256: 36BA0F43F938E51FCA6A514E953199940FA53F75F4CE61F48FF93E317DD5E1F5
 */
const LEVEL_35 = {
    "id": 35,
    "name": "双线生成",
    "difficulty": "super",
    "timeSeconds": 60,
    "reward": 100,
    "width": 5,
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
        ]
    ],
    "gates": [
        {
            "id": "lv35-waist-top-red",
            "side": "top",
            "offset": 1,
            "size": 3,
            "color": "red"
        },
        {
            "id": "lv35-waist-bottom-blue",
            "side": "bottom",
            "offset": 1,
            "size": 3,
            "color": "blue"
        },
        {
            "id": "lv35-waist-opening-yellow",
            "side": "left",
            "offset": 5,
            "size": 3,
            "color": "yellow"
        }
    ],
    "blocks": [
        {
            "id": "v35-open-left",
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
            "color": "yellow",
            "layers": [
                "yellow"
            ]
        },
        {
            "id": "v35-open-right",
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
                    2,
                    0
                ],
                [
                    0,
                    1
                ]
            ],
            "color": "yellow",
            "layers": [
                "yellow"
            ]
        },
        {
            "id": "v35-left-q1",
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
            "color": "blue",
            "layers": [
                "blue"
            ]
        },
        {
            "id": "v35-left-q2",
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
                ],
                [
                    1,
                    2
                ]
            ],
            "color": "blue",
            "layers": [
                "blue"
            ]
        },
        {
            "id": "v35-left-q3",
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
                ],
                [
                    1,
                    2
                ]
            ],
            "color": "blue",
            "layers": [
                "blue"
            ]
        },
        {
            "id": "v35-left-q4",
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
            "color": "blue",
            "layers": [
                "blue"
            ]
        },
        {
            "id": "v35-left-q5",
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
            "color": "red",
            "layers": [
                "red"
            ]
        },
        {
            "id": "v35-left-q6",
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
                    1,
                    1
                ]
            ],
            "color": "blue",
            "layers": [
                "blue"
            ]
        },
        {
            "id": "v35-left-q7",
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
                ],
                [
                    1,
                    1
                ]
            ],
            "color": "red",
            "layers": [
                "red"
            ]
        },
        {
            "id": "v35-left-q8",
            "x": 1,
            "y": 5,
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
            "color": "red",
            "layers": [
                "red"
            ]
        },
        {
            "id": "v35-right-q1",
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
                    1,
                    1
                ]
            ],
            "color": "blue",
            "layers": [
                "blue"
            ]
        },
        {
            "id": "v35-right-q2",
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
                ],
                [
                    1,
                    1
                ]
            ],
            "color": "red",
            "layers": [
                "red"
            ]
        },
        {
            "id": "v35-right-q3",
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
                ]
            ],
            "color": "red",
            "layers": [
                "red"
            ]
        },
        {
            "id": "v35-right-q4",
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
                ]
            ],
            "color": "blue",
            "layers": [
                "blue"
            ]
        },
        {
            "id": "v35-right-q5",
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
            "color": "red",
            "layers": [
                "red"
            ]
        },
        {
            "id": "v35-right-q6",
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
                ],
                [
                    1,
                    1
                ]
            ],
            "color": "red",
            "layers": [
                "red"
            ]
        },
        {
            "id": "v35-right-q7",
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
            "color": "blue",
            "layers": [
                "blue"
            ]
        },
        {
            "id": "v35-right-q8",
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
                ],
                [
                    1,
                    2
                ]
            ],
            "color": "red",
            "layers": [
                "red"
            ]
        }
    ],
    "generators": [
        {
            "id": "v35-left-generator",
            "side": "top",
            "offset": 1,
            "spawn": [
                1,
                0
            ],
            "queueBlockIds": [
                "v35-left-q1",
                "v35-right-q7",
                "v35-left-q2",
                "v35-right-q4",
                "v35-right-q1",
                "v35-left-q3",
                "v35-left-q6",
                "v35-left-q4"
            ],
            "trigger": "move"
        },
        {
            "id": "v35-right-generator",
            "side": "bottom",
            "offset": 1,
            "spawn": [
                1,
                5
            ],
            "queueBlockIds": [
                "v35-right-q3",
                "v35-left-q8",
                "v35-left-q7",
                "v35-left-q5",
                "v35-right-q2",
                "v35-right-q5",
                "v35-right-q8",
                "v35-right-q6"
            ],
            "trigger": "move"
        }
    ],
    "featureIntro": {
        "kind": "generator",
        "title": "独立生成器！",
        "description": "腾空机器的输出区域后，它才会按预览顺序逐件投放；其他消除不会扣减队列。"
    },
    "designTargets": {
        "formulaVersion": "blockout-d1",
        "calibratedDifficulty": 82,
        "minimumRepositionOverhead": 8
    },
    "blocked": [],
    "parMoves": 26
};
/**
 * Lv38 source: playtest-results/experiments/video-parity-v7/proofs/lv038-certified-floor5-r153/candidate.json
 * Candidate file SHA-256: 5F997DBAB86E2B921E3191E006D92D0C97BE33D846C2AF42B8E550ECEEB545F4
 * Canonical candidate LevelSpec SHA-256: AB8379C88A33CB41105F76C9FAD49748C8BA777970E666E7E5B897A02CE5753E
 */
const LEVEL_38 = {
    "id": 38,
    "name": "高压转仓",
    "difficulty": "super",
    "timeSeconds": 120,
    "reward": 115,
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
            "id": "vp-038-gate-01",
            "side": "top",
            "offset": 0,
            "size": 3,
            "color": "yellow"
        },
        {
            "id": "vp-038-gate-02",
            "side": "top",
            "offset": 3,
            "size": 3,
            "color": "pink",
            "frozen": 3
        },
        {
            "id": "vp-038-gate-03",
            "side": "right",
            "offset": 0,
            "size": 3,
            "color": "blue",
            "frozen": 8
        },
        {
            "id": "vp-038-gate-04",
            "side": "right",
            "offset": 3,
            "size": 3,
            "color": "green",
            "frozen": 23
        },
        {
            "id": "vp-038-gate-05",
            "side": "bottom",
            "offset": 0,
            "size": 3,
            "color": "cyan",
            "frozen": 20
        },
        {
            "id": "vp-038-gate-06",
            "side": "bottom",
            "offset": 3,
            "size": 3,
            "color": "purple",
            "frozen": 18
        }
    ],
    "blocks": [
        {
            "id": "cc-038-b1-01",
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
            "color": "blue"
        },
        {
            "id": "cc-038-b1-02",
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
            "color": "yellow"
        },
        {
            "id": "cc-038-b1-03",
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
            "id": "cc-038-b1-04",
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
            "color": "yellow"
        },
        {
            "id": "cc-038-b1-05",
            "x": 2,
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
            "id": "cc-038-b1-06",
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
            "id": "cc-038-b1-07",
            "x": 2,
            "y": 1,
            "shape": [
                [
                    0,
                    0
                ]
            ],
            "color": "purple",
            "frozen": 5
        },
        {
            "id": "cc-038-b1-08",
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
            "id": "cc-038-b1-09",
            "x": 2,
            "y": 3,
            "shape": [
                [
                    0,
                    0
                ]
            ],
            "color": "blue"
        },
        {
            "id": "cc-038-b1-10",
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
            "id": "cc-038-b1-11",
            "x": 2,
            "y": 2,
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
            "id": "cc-038-b2-01",
            "x": 4,
            "y": 2,
            "shape": [
                [
                    0,
                    0
                ]
            ],
            "color": "yellow"
        },
        {
            "id": "cc-038-b2-02",
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
            "id": "cc-038-b2-03",
            "x": 4,
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
            "id": "cc-038-b2-04",
            "x": 5,
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
            "id": "cc-038-b2-05",
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
            "color": "yellow"
        },
        {
            "id": "cc-038-b2-06",
            "x": 5,
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
            "id": "cc-038-b3-01",
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
            "color": "green",
            "shutterId": "vp-038-cover-1"
        },
        {
            "id": "cc-038-b3-02",
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
            "color": "green",
            "shutterId": "vp-038-cover-1"
        },
        {
            "id": "cc-038-b3-03",
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
            ],
            "color": "purple",
            "shutterId": "vp-038-cover-1"
        },
        {
            "id": "cc-038-b3-04",
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
            "color": "blue",
            "shutterId": "vp-038-cover-1"
        },
        {
            "id": "cc-038-b3-05",
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
            "color": "pink",
            "shutterId": "vp-038-cover-1"
        },
        {
            "id": "cc-038-b3-06",
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
            "color": "yellow",
            "shutterId": "vp-038-cover-1"
        },
        {
            "id": "cc-038-b3-07",
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
            "color": "cyan",
            "shutterId": "vp-038-cover-1"
        },
        {
            "id": "cc-038-b3-08",
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
            "color": "cyan",
            "shutterId": "vp-038-cover-1"
        }
    ],
    "shutters": [
        {
            "id": "vp-038-cover-1",
            "x": 3,
            "y": 1,
            "width": 3,
            "height": 3,
            "count": 15,
            "skin": "shutter"
        }
    ],
    "generators": [
        {
            "id": "vp-038-generator-1",
            "side": "left",
            "offset": 2,
            "spawn": [
                2,
                2
            ],
            "queueBlockIds": [
                "cc-038-b2-02",
                "cc-038-b2-03",
                "cc-038-b2-04",
                "cc-038-b2-01",
                "cc-038-b2-06",
                "cc-038-b2-05"
            ],
            "trigger": "move"
        }
    ],
    "designTargets": {
        "formulaVersion": "blockout-d1",
        "calibratedDifficulty": 80,
        "minimumRepositionOverhead": 5
    },
    "parMoves": 41
};
/**
 * Lv39 source: playtest-results/experiments/video-parity-v7/proofs/lv039-certified-floor5-r153/candidate.json
 * Candidate file SHA-256: BD3426053EBCB291A43F64C197ED1FA5B539AFA90D65F70468B5D87BA95AF688
 * Canonical candidate LevelSpec SHA-256: B0F9C28EB1184A3B6CB1DDAAEB23FB4D0CFD337AA21C1F18A5B4E6374F272628
 */
const LEVEL_39 = {
    "id": 39,
    "name": "双轨冰闸",
    "difficulty": "super",
    "timeSeconds": 160,
    "reward": 120,
    "parMoves": 48,
    "designTargets": {
        "formulaVersion": "blockout-d1",
        "calibratedDifficulty": 81.5,
        "minimumRepositionOverhead": 5
    },
    "width": 8,
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
        ]
    ],
    "blocked": [],
    "gates": [
        {
            "id": "lv39-gate-pink-02",
            "side": "top",
            "offset": 0,
            "size": 2,
            "color": "pink",
            "frozen": 2
        },
        {
            "id": "lv39-gate-cyan-05",
            "side": "top",
            "offset": 2,
            "size": 2,
            "color": "cyan",
            "frozen": 5
        },
        {
            "id": "lv39-gate-orange-09",
            "side": "top",
            "offset": 4,
            "size": 2,
            "color": "orange",
            "frozen": 9
        },
        {
            "id": "lv39-gate-green-11",
            "side": "top",
            "offset": 6,
            "size": 2,
            "color": "green",
            "frozen": 11
        },
        {
            "id": "lv39-gate-pink-15",
            "side": "left",
            "offset": 0,
            "size": 2,
            "color": "pink",
            "frozen": 15
        },
        {
            "id": "lv39-gate-cyan-19",
            "side": "left",
            "offset": 2,
            "size": 2,
            "color": "cyan",
            "frozen": 19
        },
        {
            "id": "lv39-gate-orange-22",
            "side": "left",
            "offset": 4,
            "size": 2,
            "color": "orange",
            "frozen": 22
        },
        {
            "id": "lv39-gate-red-open",
            "side": "left",
            "offset": 7,
            "size": 1,
            "color": "red"
        },
        {
            "id": "lv39-gate-green-23",
            "side": "right",
            "offset": 0,
            "size": 2,
            "color": "green",
            "frozen": 23
        },
        {
            "id": "lv39-gate-pink-28",
            "side": "right",
            "offset": 2,
            "size": 2,
            "color": "pink",
            "frozen": 28
        },
        {
            "id": "lv39-gate-cyan-30",
            "side": "right",
            "offset": 4,
            "size": 2,
            "color": "cyan",
            "frozen": 30
        },
        {
            "id": "lv39-gate-yellow-open",
            "side": "right",
            "offset": 7,
            "size": 1,
            "color": "yellow"
        }
    ],
    "blocks": [
        {
            "id": "core-039-m01",
            "x": 0,
            "y": 7,
            "shape": [
                [
                    0,
                    0
                ]
            ],
            "color": "red",
            "layers": [
                "red"
            ]
        },
        {
            "id": "core-039-m02",
            "x": 3,
            "y": 7,
            "shape": [
                [
                    0,
                    0
                ]
            ],
            "color": "red",
            "layers": [
                "red"
            ]
        },
        {
            "id": "core-039-m03",
            "x": 4,
            "y": 7,
            "shape": [
                [
                    0,
                    0
                ]
            ],
            "color": "yellow",
            "layers": [
                "yellow"
            ]
        },
        {
            "id": "core-039-m04",
            "x": 0,
            "y": 6,
            "shape": [
                [
                    0,
                    0
                ]
            ],
            "color": "yellow",
            "layers": [
                "yellow"
            ]
        },
        {
            "id": "core-039-m05",
            "x": 1,
            "y": 6,
            "shape": [
                [
                    0,
                    0
                ]
            ],
            "color": "yellow",
            "layers": [
                "yellow"
            ]
        },
        {
            "id": "core-039-m06",
            "x": 1,
            "y": 7,
            "shape": [
                [
                    0,
                    0
                ]
            ],
            "color": "yellow",
            "layers": [
                "yellow"
            ]
        },
        {
            "id": "core-039-m07",
            "x": 2,
            "y": 7,
            "shape": [
                [
                    0,
                    0
                ]
            ],
            "color": "yellow",
            "layers": [
                "yellow"
            ]
        },
        {
            "id": "core-039-m08",
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
            "color": "yellow",
            "layers": [
                "yellow"
            ]
        },
        {
            "id": "core-039-m09",
            "x": 4,
            "y": 6,
            "shape": [
                [
                    0,
                    0
                ]
            ],
            "color": "red",
            "layers": [
                "red"
            ]
        },
        {
            "id": "core-039-m10",
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
            ],
            "color": "red",
            "layers": [
                "red"
            ]
        },
        {
            "id": "core-039-m11",
            "x": 5,
            "y": 7,
            "shape": [
                [
                    0,
                    0
                ]
            ],
            "color": "red",
            "layers": [
                "red"
            ]
        },
        {
            "id": "core-039-m12",
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
                ]
            ],
            "color": "red",
            "layers": [
                "red"
            ]
        },
        {
            "id": "lv39-generator-tail",
            "x": 0,
            "y": 6,
            "shape": [
                [
                    0,
                    0
                ]
            ],
            "color": "red",
            "layers": [
                "red"
            ]
        },
        {
            "id": "lv39-cover-05-q01",
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
            "color": "pink",
            "layers": [
                "pink"
            ],
            "shutterId": "lv39-cover-05",
            "frozen": 12
        },
        {
            "id": "lv39-cover-05-h01",
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
            "color": "cyan",
            "layers": [
                "cyan"
            ],
            "shutterId": "lv39-cover-05",
            "frozen": 1
        },
        {
            "id": "lv39-cover-05-v01",
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
            "color": "orange",
            "layers": [
                "orange"
            ],
            "shutterId": "lv39-cover-05",
            "frozen": 1
        },
        {
            "id": "lv39-cover-05-s01",
            "x": 6,
            "y": 0,
            "shape": [
                [
                    0,
                    0
                ]
            ],
            "color": "green",
            "layers": [
                "green"
            ],
            "shutterId": "lv39-cover-05",
            "frozen": 1
        },
        {
            "id": "lv39-cover-15-q01",
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
            "color": "pink",
            "layers": [
                "pink"
            ],
            "shutterId": "lv39-cover-15",
            "frozen": 1
        },
        {
            "id": "lv39-cover-15-h01",
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
            "color": "pink",
            "layers": [
                "pink"
            ],
            "shutterId": "lv39-cover-15"
        },
        {
            "id": "lv39-cover-15-s01",
            "x": 0,
            "y": 3,
            "shape": [
                [
                    0,
                    0
                ]
            ],
            "color": "pink",
            "layers": [
                "pink"
            ],
            "shutterId": "lv39-cover-15"
        },
        {
            "id": "lv39-cover-15-l01",
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
            "color": "cyan",
            "layers": [
                "cyan"
            ],
            "shutterId": "lv39-cover-15"
        },
        {
            "id": "lv39-cover-15-h02",
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
            "color": "cyan",
            "layers": [
                "cyan"
            ],
            "shutterId": "lv39-cover-15"
        },
        {
            "id": "lv39-cover-15-v01",
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
            "color": "cyan",
            "layers": [
                "cyan"
            ],
            "shutterId": "lv39-cover-15"
        },
        {
            "id": "lv39-cover-15-l02",
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
                    1,
                    1
                ]
            ],
            "color": "orange",
            "layers": [
                "orange"
            ],
            "shutterId": "lv39-cover-15"
        },
        {
            "id": "lv39-cover-15-h03",
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
            "color": "orange",
            "layers": [
                "orange"
            ],
            "shutterId": "lv39-cover-15"
        },
        {
            "id": "lv39-cover-15-v02",
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
            "color": "orange",
            "layers": [
                "orange"
            ],
            "shutterId": "lv39-cover-15"
        },
        {
            "id": "lv39-cover-15-v03",
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
            "color": "green",
            "layers": [
                "green"
            ],
            "shutterId": "lv39-cover-15"
        },
        {
            "id": "lv39-cover-15-v04",
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
            "color": "green",
            "layers": [
                "green"
            ],
            "shutterId": "lv39-cover-15"
        },
        {
            "id": "lv39-cover-22-q01",
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
            "color": "pink",
            "layers": [
                "pink"
            ],
            "shutterId": "lv39-cover-22"
        },
        {
            "id": "lv39-cover-22-h01",
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
            "color": "pink",
            "layers": [
                "pink"
            ],
            "shutterId": "lv39-cover-22"
        },
        {
            "id": "lv39-cover-22-v01",
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
            "color": "pink",
            "layers": [
                "pink"
            ],
            "shutterId": "lv39-cover-22"
        },
        {
            "id": "lv39-cover-22-h02",
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
            "color": "cyan",
            "layers": [
                "cyan"
            ],
            "shutterId": "lv39-cover-22"
        },
        {
            "id": "lv39-cover-22-v02",
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
            "color": "cyan",
            "layers": [
                "cyan"
            ],
            "shutterId": "lv39-cover-22"
        },
        {
            "id": "lv39-cover-22-v03",
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
            "color": "cyan",
            "layers": [
                "cyan"
            ],
            "shutterId": "lv39-cover-22"
        }
    ],
    "shutters": [
        {
            "id": "lv39-cover-05",
            "x": 0,
            "y": 5,
            "width": 3,
            "height": 1,
            "count": 5,
            "skin": "shutter"
        },
        {
            "id": "lv39-cover-15",
            "x": 3,
            "y": 5,
            "width": 3,
            "height": 1,
            "count": 15,
            "skin": "shutter"
        },
        {
            "id": "lv39-cover-22",
            "x": 6,
            "y": 5,
            "width": 2,
            "height": 1,
            "count": 22,
            "skin": "shutter"
        }
    ],
    "generators": [
        {
            "id": "lv39-generator",
            "side": "left",
            "offset": 6,
            "spawn": [
                0,
                6
            ],
            "queueBlockIds": [
                "core-039-m04",
                "lv39-generator-tail"
            ],
            "trigger": "move"
        }
    ]
};
exports.CHAPTER_FOUR_CERTIFIED_LEVELS = {
    35: LEVEL_35,
    38: LEVEL_38,
    39: LEVEL_39,
};
