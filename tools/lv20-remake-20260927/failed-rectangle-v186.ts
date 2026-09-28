// Unaccepted v1.86 prototype; do not import from the production pipeline.
import type { LevelSpec, Point } from "../../src/core/types";

/**
 * v1.86: Lv20 source-faithful mechanism inventory on an original board.
 * The source is a 5×8 dogbone with two empty neck cells.  The remake keeps
 * its 30 occupied cells and mechanism inventory, but uses a 5×6 full board so
 * every playable cell is covered at the opening and after the shutter opens.
 */
export const LEVEL_20_ORIGINAL_REMAKE_POLICY_VERSION = "v1.86-original-full-rectangle" as const;

const H2: Point[] = [[0, 0], [1, 0]];
const V3: Point[] = [[0, 0], [0, 1], [0, 2]];
const FULL_RECTANGLE: Point[] = Array.from({ length: 6 }, (_, y) => (
  Array.from({ length: 5 }, (_, x) => [x, y] as Point)
)).flat();

const GATES: LevelSpec["gates"] = [
  { id: "lv020-original-bottom-yellow", side: "bottom", offset: 3, size: 2, color: "yellow" },
  { id: "lv020-original-top-green-8", side: "top", offset: 1, size: 2, color: "green", frozen: 8 },
  { id: "lv020-original-top-red-6", side: "top", offset: 3, size: 2, color: "red", frozen: 6 },
  { id: "lv020-original-right-pink-7", side: "right", offset: 3, size: 1, color: "pink", frozen: 7 },
  { id: "lv020-original-right-pink-1", side: "right", offset: 0, size: 1, color: "pink", frozen: 1 },
  { id: "lv020-original-left-red-10", side: "left", offset: 2, size: 1, color: "red", frozen: 10 },
  { id: "lv020-original-left-red-3", side: "left", offset: 5, size: 1, color: "red", frozen: 3 },
  { id: "lv020-original-bottom-blue-2", side: "bottom", offset: 0, size: 2, color: "blue", frozen: 2 },
];

const BLOCKS: LevelSpec["blocks"] = [
  // Visible lower chamber: 6 H2 + 1 V3, exactly covering rows 3–5.
  { id: "cc-020-b1-01", x: 0, y: 3, shape: H2, color: "red" },
  { id: "cc-020-b1-02", x: 3, y: 3, shape: H2, color: "pink" },
  { id: "cc-020-b1-03", x: 0, y: 4, shape: H2, color: "red" },
  { id: "cc-020-b1-04", x: 3, y: 4, shape: H2, color: "yellow" },
  { id: "cc-020-b1-05", x: 0, y: 5, shape: H2, color: "blue" },
  { id: "cc-020-b1-06", x: 3, y: 5, shape: H2, color: "yellow" },
  { id: "cc-020-b1-07", x: 2, y: 3, shape: V3, color: "green" },
  // Hidden shutter batch: 6 H2 + 1 V3, exactly covering rows 0–2.
  { id: "cc-020-b2-01", x: 1, y: 2, shape: H2, color: "blue", shutterId: "vp-020-original-cover-1" },
  { id: "cc-020-b2-02", x: 3, y: 0, shape: H2, color: "red", shutterId: "vp-020-original-cover-1" },
  { id: "cc-020-b2-03", x: 1, y: 1, shape: H2, color: "green", shutterId: "vp-020-original-cover-1" },
  { id: "cc-020-b2-04", x: 3, y: 1, shape: H2, color: "red", shutterId: "vp-020-original-cover-1" },
  { id: "cc-020-b2-05", x: 1, y: 0, shape: H2, color: "pink", shutterId: "vp-020-original-cover-1" },
  { id: "cc-020-b2-06", x: 3, y: 2, shape: H2, color: "blue", shutterId: "vp-020-original-cover-1" },
  { id: "cc-020-b2-07", x: 0, y: 0, shape: V3, color: "yellow", shutterId: "vp-020-original-cover-1" },
];

const SHUTTERS: NonNullable<LevelSpec["shutters"]> = [
  { id: "vp-020-original-cover-1", x: 0, y: 0, width: 5, height: 3, count: 6, skin: "shutter" },
];

export const REGENERATED_LEVEL_20_ORIGINAL: LevelSpec = {
  id: 20,
  name: "双重卷帘·异形停车重排",
  difficulty: "easy",
  timeSeconds: 75,
  reward: 85,
  parMoves: 24,
  width: 5,
  height: 6,
  playable: FULL_RECTANGLE,
  gates: GATES,
  blocks: BLOCKS,
  shutters: SHUTTERS,
  featureIntro: {
    title: "倒计时覆盖区！",
    description: "每次有效清除使数字减一；归零后开放覆盖区和隐藏色块。",
    kind: "shutter",
  },
  designTargets: {
    formulaVersion: "blockout-d1-v1.86",
    calibratedDifficulty: 42,
    minimumRepositionOverhead: 5,
  },
};

const cloneLevel = (): LevelSpec => ({
  ...REGENERATED_LEVEL_20_ORIGINAL,
  playable: REGENERATED_LEVEL_20_ORIGINAL.playable?.map(([x, y]) => [x, y] as Point),
  gates: REGENERATED_LEVEL_20_ORIGINAL.gates.map((gate) => ({ ...gate })),
  blocks: REGENERATED_LEVEL_20_ORIGINAL.blocks.map((block) => ({
    ...block,
    shape: block.shape.map(([x, y]) => [x, y] as Point),
    layers: block.layers ? [...block.layers] : undefined,
  })),
  shutters: REGENERATED_LEVEL_20_ORIGINAL.shutters?.map((shutter) => ({
    ...shutter,
    triggerBlockIds: shutter.triggerBlockIds ? [...shutter.triggerBlockIds] : undefined,
  })),
  featureIntro: REGENERATED_LEVEL_20_ORIGINAL.featureIntro
    ? { ...REGENERATED_LEVEL_20_ORIGINAL.featureIntro }
    : undefined,
  designTargets: REGENERATED_LEVEL_20_ORIGINAL.designTargets
    ? { ...REGENERATED_LEVEL_20_ORIGINAL.designTargets }
    : undefined,
});

export const applyLevel20OriginalRemake = (level: LevelSpec): LevelSpec => (
  level.id === 20 ? cloneLevel() : level
);
