import type { BlockColor, LevelSpec, Point, Side } from "./types";
import {
  CANDIDATE_201_210_LEVELS,
  FORMAL_201_210_LEVELS,
  FORMAL_ISOLATED_201_210_LEVELS,
  FORMAL_201_210_EVIDENCE,
  getFormal201to210LevelStrict,
} from "./formal201to210Data";

/**
 * Competitor continuation 201–210.
 *
 * The supplied 201–210 recording is kept as source evidence in
 * deliverables/continue201-210-20260929.  These are authored runtime maps: the
 * visible mechanism families and progression are carried over, while geometry
 * is adapted to this game's revised v1.5 contracts and independently solved.
 */

const shape = (cells: Point[]): Point[] => cells;

interface EdgePiece {
  id: string;
  color: BlockColor;
  x: number;
  y: number;
  shape: Point[];
  side: Side;
  offset: number;
  size: number;
  frozen?: number;
}

const EDGE_PIECES: readonly EdgePiece[] = [
  { id: "red-top", color: "red", x: 0, y: 0, shape: shape([[0, 0], [1, 0], [2, 0]]), side: "top", offset: 0, size: 3 },
  { id: "blue-top", color: "blue", x: 4, y: 0, shape: shape([[0, 0], [1, 0], [2, 0]]), side: "top", offset: 4, size: 3 },
  { id: "green-right", color: "green", x: 6, y: 1, shape: shape([[0, 0], [0, 1], [0, 2]]), side: "right", offset: 1, size: 3 },
  { id: "yellow-right", color: "yellow", x: 6, y: 4, shape: shape([[0, 0], [0, 1]]), side: "right", offset: 4, size: 2 },
  { id: "purple-bottom", color: "purple", x: 3, y: 6, shape: shape([[0, 0], [1, 0], [2, 0]]), side: "bottom", offset: 3, size: 3 },
  { id: "orange-bottom", color: "orange", x: 0, y: 6, shape: shape([[0, 0], [1, 0]]), side: "bottom", offset: 0, size: 2 },
  { id: "pink-left", color: "pink", x: 0, y: 3, shape: shape([[0, 0], [0, 1]]), side: "left", offset: 3, size: 2 },
  { id: "cyan-left", color: "cyan", x: 0, y: 1, shape: shape([[0, 0], [0, 1]]), side: "left", offset: 1, size: 2 },
];

const edgeBlocks = (id: number, overrides: Partial<Record<BlockColor, Partial<EdgePiece>>> = {}): LevelSpec["blocks"] => (
  EDGE_PIECES.map((piece) => {
    const override = overrides[piece.color] ?? {};
    return {
      id: `l${id}-${piece.id}`,
      color: piece.color,
      x: override.x ?? piece.x,
      y: override.y ?? piece.y,
      shape: override.shape ?? piece.shape,
      ...(override.frozen === undefined ? {} : { frozen: override.frozen }),
    };
  })
);

const edgeGates = (id: number, frozen: Partial<Record<BlockColor, number>> = {}): LevelSpec["gates"] => (
  EDGE_PIECES.map((piece) => ({
    id: `l${id}-gate-${piece.color}`,
    color: piece.color,
    side: piece.side,
    offset: piece.offset,
    size: piece.size,
    ...(frozen[piece.color] === undefined ? {} : { frozen: frozen[piece.color] }),
  }))
);

const interiorShutter = (id: number, suffix: string, count: number, x = 2, y = 2, width = 3, height = 2) => ({
  id: `l${id}-${suffix}`,
  x,
  y,
  width,
  height,
  count,
  skin: "shutter" as const,
});

const base = (id: number, name: string, difficulty: LevelSpec["difficulty"], timeSeconds: number): LevelSpec => ({
  mechanismRules: "revised-2026-09-27-v1.5",
  id,
  name,
  difficulty,
  timeSeconds,
  reward: 200,
  parMoves: EDGE_PIECES.length,
  preservedMoveTarget: EDGE_PIECES.length,
  width: 7,
  height: 7,
  gates: edgeGates(id),
  blocks: edgeBlocks(id),
});

const candidateAuthored: Record<number, LevelSpec> = {
  201: {
    ...base(201, "竞品续章·三向冰门", "normal", 120),
    gates: edgeGates(201, { red: 5, blue: 2, green: 3 }),
    shutters: [interiorShutter(201, "cover", 3, 2, 2, 3, 2)],
    mechanismAdaptation: {
      userAuthorized: "201-210竞品视频续作",
      change: "保留视频中的顶部红色主出口、冰门倒计时与底部隐藏区；按v1.5固定棋盘覆盖语义适配。",
    },
  },
  202: {
    ...base(202, "竞品续章·双补给", "normal", 120),
    gates: edgeGates(202, { blue: 5, yellow: 3 }),
    shutters: [interiorShutter(202, "cover", 5, 2, 2, 3, 2)],
    mechanismAdaptation: {
      userAuthorized: "201-210竞品视频续作",
      change: "视频可见双生成器与中央三格阻挡；本版保留冰门/中央阻挡的机制意图，生成器来源及队列顺序列为UNKNOWN，暂不伪称精确复刻。",
    },
  },
  203: {
    ...base(203, "竞品续章·分区通道", "normal", 120),
    gates: edgeGates(203, { red: 2, green: 4, cyan: 1 }),
    playable: Array.from({ length: 7 }, (_, y) => Array.from({ length: 7 }, (_, x) => [x, y] as Point)).flat(),
    blocked: [[2, 3], [4, 3]],
    shutters: [interiorShutter(203, "cover", 4, 1, 1, 2, 2)],
    mechanismAdaptation: {
      userAuthorized: "201-210竞品视频续作",
      change: "以视频中的上下双区域与中央连桥为来源意图；局部墙位采用本游戏可玩格适配并单列设计差异。",
    },
  },
  204: {
    ...base(204, "竞品续章·三重硬门", "hard", 180),
    gates: edgeGates(204, { red: 2, blue: 3, purple: 4, orange: 5 }),
    shutters: [
      interiorShutter(204, "cover-a", 1, 2, 1, 3, 2),
      interiorShutter(204, "cover-b", 10, 1, 4, 3, 2),
      interiorShutter(204, "cover-c", 16, 4, 4, 2, 2),
    ],
    mechanismAdaptation: {
      userAuthorized: "201-210竞品视频续作",
      change: "对应视频Hard Level的三块大隐藏区与多段倒计时；隐藏覆盖采用v1.5普通卷帘语义，来源层数/形状未从视频单帧臆测。",
    },
  },
  205: {
    ...base(205, "竞品续章·金色棋盘", "hard", 180),
    gates: edgeGates(205, { blue: 6, yellow: 2 }),
    coloredGrids: [{ id: "l205-yellow-floor", color: "yellow", cells: [[2, 2], [3, 2], [4, 2], [2, 3], [3, 3], [4, 3]] }],
    shutters: [interiorShutter(205, "cover", 6, 2, 2, 3, 2)],
    mechanismAdaptation: {
      userAuthorized: "201-210竞品视频续作",
      change: "保留视频大量黄色固定格与中央覆盖区的解法压力；固定格按coloredGrids表达，隐藏区按普通卷帘表达。",
    },
  },
  206: {
    ...base(206, "竞品续章·回转门", "normal", 120),
    flipDoors: [{ id: "l206-flip-green", color: "green", side: "right", offset: 1, size: 3, initiallyOpen: true }],
    gates: edgeGates(206, { red: 2, blue: 3 }).filter((gate) => gate.color !== "green"),
    mechanismAdaptation: {
      userAuthorized: "201-210竞品视频续作",
      change: "视频中的右侧绿色回转门改为一扇初始开启翻门；其余出口保持原色配对。",
    },
  },
  207: {
    ...base(207, "竞品续章·双侧冰锁", "normal", 150),
    gates: edgeGates(207, { red: 1, blue: 2, cyan: 1 }),
    blocks: edgeBlocks(207, {
      red: { frozen: 1 },
      blue: { frozen: 2 },
      cyan: { frozen: 1 },
    }),
    shutters: [interiorShutter(207, "cover", 1, 2, 2, 3, 2)],
    mechanismAdaptation: {
      userAuthorized: "201-210竞品视频续作",
      change: "对应视频两侧冰门与一块中央卷帘；数字冰仅用于可见单元，未从视频推断额外隐藏库存。",
    },
  },
  208: {
    ...base(208, "竞品续章·钥印补给", "hard", 180),
    gates: edgeGates(208, { red: 3, blue: 5, purple: 2 }),
    shutters: [interiorShutter(208, "cover", 7, 1, 3, 5, 2)],
    mechanismAdaptation: {
      userAuthorized: "201-210竞品视频续作",
      change: "视频显示侧置补给机、钥匙图标和7计数大卷帘；本游戏v1.5不启用已退役key-lock字段，钥印仅记录为来源视觉事实。",
    },
  },
  209: {
    ...base(209, "竞品续章·超难双舱", "super", 210),
    gates: edgeGates(209, { red: 2, blue: 3, green: 4, yellow: 5 }),
    shutters: [
      interiorShutter(209, "cover-a", 5, 1, 1, 2, 3),
      interiorShutter(209, "cover-b", 10, 4, 1, 2, 3),
    ],
    mechanismAdaptation: {
      userAuthorized: "201-210竞品视频续作",
      change: "保留视频Super Hard双舱、双侧补给与多色冰门的高压节奏；双舱覆盖按两块固定普通卷帘适配。",
    },
  },
  210: {
    ...base(210, "竞品续章·三域终局", "super", 210),
    gates: edgeGates(210, { red: 2, blue: 3, green: 4, purple: 5 }),
    shutters: [
      interiorShutter(210, "cover-left", 16, 1, 3, 2, 3),
      interiorShutter(210, "cover-mid", 16, 3, 3, 1, 3),
      interiorShutter(210, "cover-right", 16, 4, 3, 2, 3),
    ],
    mechanismAdaptation: {
      userAuthorized: "201-210竞品视频续作",
      change: "视频终局的上区三色门与下区三块16计数覆盖区按三域卷帘适配；原始视频不提供逐块来源表，未知部分不冒称竞品精确数据。",
    },
  },
};

// v1.123/v1.124: all ten continuation records are regenerated against the latest
// easy/normal/normal/hard/easy/normal/hard/easy/normal/super cadence.  The
// v1.124 formal-data package adds an explicit ten-level isolated export while
// the previously accepted 201/210 subset remains backwards compatible; the
// complete set stays outside production LEVELS.
const authored: Record<number, LevelSpec> = {
  ...candidateAuthored,
  ...Object.fromEntries(CANDIDATE_201_210_LEVELS.map((level) => [level.id, level])),
};

export const REMADE_201_210_IDS = Object.freeze(Object.keys(authored).map(Number).sort((a, b) => a - b));
export const REMADE_201_210_LEVELS: readonly LevelSpec[] = Object.freeze(REMADE_201_210_IDS.map((id) => authored[id]));
export const CONTINUATION_LEVELS_201_210 = REMADE_201_210_LEVELS;

/** Accepted formal data remains separate from the 1–200 production campaign. */
export {
  FORMAL_201_210_LEVELS,
  FORMAL_ISOLATED_201_210_LEVELS,
  FORMAL_201_210_EVIDENCE,
  getFormal201to210LevelStrict,
};

export const applyRemake201to210 = (level: LevelSpec): LevelSpec => authored[level.id] ?? level;

