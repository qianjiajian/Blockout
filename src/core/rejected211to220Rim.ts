import type { BlockColor, LevelSpec, Point, Side } from "./types";

/**
 * Isolated continuation layouts for the 211–220 video batch.
 *
 * The video gives us the chapter rhythm and the visible side-gate/curtain
 * language.  Exact block inventories are authored here as an adaptation and
 * are kept outside the formal 1–200 campaign until fresh solver and Pointer
 * evidence is attached.
 */

const H = (length: number): Point[] => Array.from({ length }, (_, index) => [index, 0]);
const V = (length: number): Point[] => Array.from({ length }, (_, index) => [0, index]);
const SINGLE: Point[] = [[0, 0]];

type EdgePiece = {
  color: BlockColor;
  x: number;
  y: number;
  shape: Point[];
};

/**
 * A failed lower/upper-bound attempt is replaced by a bounded authored
 * variant.  The sequence is deliberately finite so a solver cannot keep
 * spending budget on one geometry forever.
 */
export type Remake211to220Variant = "base" | "palette-shape-v2" | "palette-shape-v3";
export const REMAKE211TO220_VARIANT_SEQUENCE: readonly Remake211to220Variant[] = Object.freeze([
  "base", "palette-shape-v2", "palette-shape-v3",
]);
export const MAX_REGENERATION_ATTEMPTS_211_220 = REMAKE211TO220_VARIANT_SEQUENCE.length;
export const ACTIVE_REMAKE211TO220_VARIANT: Remake211to220Variant = "palette-shape-v3";

const COLOR_REMAP_V2: Readonly<Record<BlockColor, BlockColor>> = {
  red: "red", blue: "blue", green: "cyan", yellow: "pink",
  purple: "purple", orange: "orange", pink: "yellow", cyan: "green",
};
const COLOR_REMAP_V3: Readonly<Record<BlockColor, BlockColor>> = {
  red: "orange", blue: "purple", green: "pink", yellow: "cyan",
  purple: "blue", orange: "red", pink: "green", cyan: "yellow",
};

const remapColor = (color: BlockColor, variant: Remake211to220Variant): BlockColor => {
  if (variant === "palette-shape-v2") return COLOR_REMAP_V2[color];
  if (variant === "palette-shape-v3") return COLOR_REMAP_V3[color];
  return color;
};

/**
 * The rim is a 7×7 full board. Four rim cells are reserved for real hidden
 * shutter cohorts; every other opening cell is occupied by a visible block.
 */
const EDGE_PIECES: readonly EdgePiece[] = [
  { color: "red", x: 0, y: 0, shape: H(3) },
  { color: "red", x: 3, y: 0, shape: SINGLE },
  { color: "blue", x: 4, y: 0, shape: H(3) },
  { color: "green", x: 6, y: 1, shape: V(3) },
  { color: "yellow", x: 6, y: 4, shape: V(2) },
  { color: "purple", x: 6, y: 6, shape: SINGLE },
  { color: "purple", x: 3, y: 6, shape: H(3) },
  { color: "orange", x: 0, y: 6, shape: H(2) },
  { color: "orange", x: 2, y: 6, shape: SINGLE },
  { color: "pink", x: 0, y: 3, shape: V(2) },
  { color: "pink", x: 0, y: 5, shape: SINGLE },
  { color: "cyan", x: 0, y: 1, shape: V(2) },
];

const HIDDEN_RIM = new Set([1, 5, 8, 10]);

const RIM_GATES = (levelId: number, variant: Remake211to220Variant): LevelSpec["gates"] => [
  { id: `l${levelId}-gate-red`, color: remapColor("red", variant), side: "top", offset: 0, size: 4 },
  { id: `l${levelId}-gate-blue`, color: remapColor("blue", variant), side: "top", offset: 4, size: 3 },
  { id: `l${levelId}-gate-green`, color: remapColor("green", variant), side: "right", offset: 1, size: 3 },
  { id: `l${levelId}-gate-yellow`, color: remapColor("yellow", variant), side: "right", offset: 4, size: 2 },
  { id: `l${levelId}-gate-purple`, color: remapColor("purple", variant), side: "bottom", offset: 3, size: 4 },
  { id: `l${levelId}-gate-orange`, color: remapColor("orange", variant), side: "bottom", offset: 0, size: 3 },
  { id: `l${levelId}-gate-pink`, color: remapColor("pink", variant), side: "left", offset: 3, size: 3 },
  { id: `l${levelId}-gate-cyan`, color: remapColor("cyan", variant), side: "left", offset: 1, size: 2 },
];

/** Number of necessary interior reposition pieces for each level. */
const ROW_COUNTS: Readonly<Record<number, readonly number[]>> = {
  5: [1, 1, 1, 1, 1],
  6: [1, 1, 1, 1, 2],
  7: [1, 1, 1, 2, 2],
  11: [2, 2, 2, 2, 3],
  12: [2, 2, 2, 3, 3],
  13: [2, 2, 3, 3, 3],
  14: [2, 3, 3, 3, 3],
  16: [3, 3, 3, 3, 4],
  17: [3, 3, 3, 4, 4],
  21: [4, 4, 4, 4, 5],
};

const splitWidths = (count: number, variant: Remake211to220Variant): number[] => {
  if (count === 1) return [5];
  if (variant === "palette-shape-v2") {
    if (count === 2) return [1, 4];
    if (count === 3) return [2, 1, 2];
    if (count === 4) return [1, 2, 1, 1];
  }
  if (variant === "palette-shape-v3") {
    if (count === 2) return [4, 1];
    if (count === 3) return [2, 2, 1];
    if (count === 4) return [1, 1, 2, 1];
  }
  if (count === 2) return [2, 3];
  if (count === 3) return [1, 2, 2];
  if (count === 4) return [1, 1, 1, 2];
  if (count === 5) return [1, 1, 1, 1, 1];
  throw new Error(`Unsupported 5-cell row split: ${count}`);
};

const DIFFICULTY_BY_LEVEL: Readonly<Record<number, LevelSpec["difficulty"]>> = {
  211: "easy", 212: "normal", 213: "normal", 214: "hard", 215: "easy",
  216: "normal", 217: "hard", 218: "easy", 219: "normal", 220: "super",
};

const REPOSITION_FLOOR_BY_LEVEL: Readonly<Record<number, number>> = {
  211: 5, 212: 11, 213: 12, 214: 16, 215: 6,
  216: 13, 217: 17, 218: 7, 219: 14, 220: 21,
};

const STAR_MOVES_BY_LEVEL: Readonly<Record<number, number>> = {
  211: 32, 212: 34, 213: 36, 214: 42, 215: 45,
  216: 48, 217: 52, 218: 58, 219: 62, 220: 68,
};

const TIME_BY_LEVEL: Readonly<Record<number, number>> = {
  211: 110, 212: 95, 213: 150, 214: 105, 215: 120,
  216: 120, 217: 90, 218: 100, 219: 100, 220: 120,
};

const CALIBRATED_DIFFICULTY_BY_LEVEL: Readonly<Record<number, number>> = {
  211: 0.8, 212: 1.3, 213: 1.4, 214: 1.65, 215: 1.2,
  216: 1.45, 217: 1.7, 218: 1.25, 219: 1.5, 220: 2.1,
};

const hiddenRimBlocks = (levelId: number, variant: Remake211to220Variant): LevelSpec["blocks"] => [
  { id: `l${levelId}-hidden-red`, color: remapColor("red", variant), x: 3, y: 0, shape: SINGLE, shutterId: `l${levelId}-shutter-red` },
  { id: `l${levelId}-hidden-purple`, color: remapColor("purple", variant), x: 6, y: 6, shape: SINGLE, shutterId: `l${levelId}-shutter-purple` },
  { id: `l${levelId}-hidden-orange`, color: remapColor("orange", variant), x: 2, y: 6, shape: SINGLE, shutterId: `l${levelId}-shutter-orange` },
  { id: `l${levelId}-hidden-pink`, color: remapColor("pink", variant), x: 0, y: 5, shape: SINGLE, shutterId: `l${levelId}-shutter-pink` },
];

const hiddenRimShutters = (levelId: number): NonNullable<LevelSpec["shutters"]> => [
  { id: `l${levelId}-shutter-red`, x: 3, y: 0, width: 1, height: 1, count: 1, skin: "shutter" },
  { id: `l${levelId}-shutter-purple`, x: 6, y: 6, width: 1, height: 1, count: 1, skin: "shutter" },
  { id: `l${levelId}-shutter-orange`, x: 2, y: 6, width: 1, height: 1, count: 1, skin: "shutter" },
  { id: `l${levelId}-shutter-pink`, x: 0, y: 5, width: 1, height: 1, count: 1, skin: "shutter" },
];

const interiorBlocks = (levelId: number, repositionFloor: number, variant: Remake211to220Variant): LevelSpec["blocks"] => {
  const rows = ROW_COUNTS[repositionFloor];
  if (!rows) throw new Error(`Missing 211–220 row split for ${repositionFloor}`);
  const blocks: LevelSpec["blocks"] = [];
  let serial = 0;
  rows.forEach((count, row) => {
    let x = 1;
    for (const width of splitWidths(count, variant)) {
      blocks.push({
        id: `l${levelId}-inner-${serial}`,
        color: remapColor(row < 2 ? "cyan" : "pink", variant),
        x,
        y: row + 1,
        shape: H(width),
        ...(variant === "palette-shape-v2" || variant === "palette-shape-v3"
          ? { movementAxis: "horizontal" as const }
          : {}),
      });
      serial += 1;
      x += width;
    }
  });
  return blocks;
};

const mechanismNote = (levelId: number, variant: Remake211to220Variant): string => (
  `视频211-220帧序作为节奏参考；Lv${levelId}采用7×7满铺原创适配。` +
  "四个边缘单格为真实普通卷帘隐藏批次，内部横向块组负责该档必挪；精确竞品逐块库存、计数和来源仍单列为UNKNOWN。" +
  `有限重生成=${variant}：下界捷径触发后更换色板、横向块形分割和移动轴。`
);

export const makeRemake211to220Level = (
  levelId: number,
  variant: Remake211to220Variant = ACTIVE_REMAKE211TO220_VARIANT,
): LevelSpec => {
  const repositionFloor = REPOSITION_FLOOR_BY_LEVEL[levelId];
  const blocks: LevelSpec["blocks"] = EDGE_PIECES
    .filter((_, index) => !HIDDEN_RIM.has(index))
    .map((piece, index) => ({
      id: `l${levelId}-edge-${index}`,
      color: remapColor(piece.color, variant),
      x: piece.x,
      y: piece.y,
      shape: piece.shape,
    }));
  blocks.push(...hiddenRimBlocks(levelId, variant), ...interiorBlocks(levelId, repositionFloor, variant));
  return {
    mechanismRules: "revised-2026-09-27-v1.5",
    id: levelId,
    name: `竞品续章·${levelId}`,
    difficulty: DIFFICULTY_BY_LEVEL[levelId],
    timeSeconds: TIME_BY_LEVEL[levelId],
    reward: 200,
    // The competitor par is kept as historical metadata; stars use the
    // explicit continuation target below.
    parMoves: 8,
    preservedMoveTarget: STAR_MOVES_BY_LEVEL[levelId],
    width: 7,
    height: 7,
    gates: RIM_GATES(levelId, variant),
    blocks,
    shutters: hiddenRimShutters(levelId),
    designTargets: {
      formulaVersion: "blockout-d1",
      calibratedDifficulty: CALIBRATED_DIFFICULTY_BY_LEVEL[levelId],
      minimumRepositionOverhead: repositionFloor,
    },
    featureIntro: levelId === 220
      ? { kind: "shutter", title: "三域终局", description: "三侧出口与隐藏边缘批次同时管理。" }
      : levelId === 214 || levelId === 217
        ? { kind: "shutter", title: "双舱倒计时", description: "边缘卷帘释放后再处理内部横向块组。" }
        : undefined,
    mechanismAdaptation: {
      userAuthorized: "211-220竞品视频续作；按v1.122最新每十关难度曲线重新设计",
      change: mechanismNote(levelId, variant),
    },
  };
};

export const REMADE_211_220_IDS = Object.freeze([211, 212, 213, 214, 215, 216, 217, 218, 219, 220]);
export const BASE_REMADE_211_220_LEVELS: readonly LevelSpec[] = Object.freeze(
  REMADE_211_220_IDS.map((levelId) => makeRemake211to220Level(levelId, "base")),
);
export const REMADE_211_220_LEVELS: readonly LevelSpec[] = Object.freeze(
  REMADE_211_220_IDS.map((levelId) => makeRemake211to220Level(levelId)),
);
export const CONTINUATION_LEVELS_211_220 = REMADE_211_220_LEVELS;

export const applyRemake211to220 = (level: LevelSpec): LevelSpec => (
  REMADE_211_220_LEVELS.find((candidate) => candidate.id === level.id) ?? level
);

