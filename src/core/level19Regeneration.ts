import type { LevelSpec, Point } from "./types";

/**
 * Lv19 regeneration policy.
 *
 * The previous runtime projection exposed a row of immediately matching
 * singletons.  Its exact optimal route therefore had zero reposition
 * overhead, even though the authored target called for a parking decision.
 * This reversible overlay keeps the 6×9 tray and the hard/150-second pacing,
 * but replaces that opening with a dense parking layout.  The layout is
 * intentionally isolated from generated video data so a future source
 * regeneration can remove this policy without rewriting the campaign file.
 */
export const LEVEL_19_REGENERATION_POLICY_VERSION = "parking-r2" as const;

const FULL_PLAYABLE_6X9: Point[] = Array.from({ length: 9 }, (_, y) => (
  Array.from({ length: 6 }, (_, x) => [x, y] as Point)
)).flat();

const SHAPE_A: Point[] = [[2, 0], [0, 1], [1, 1], [2, 1]];
const SHAPE_B: Point[] = [[0, 0], [1, 0], [2, 0], [0, 1]];
const SHAPE_C: Point[] = [[0, 0], [1, 0], [1, 1], [1, 2]];
const SHAPE_D: Point[] = [[0, 0], [0, 1], [0, 2], [1, 2]];

const REGENERATED_GATES: LevelSpec["gates"] = [
  { id: "lv019-g-top-red", side: "top", offset: 0, size: 3, color: "red" },
  { id: "lv019-g-bottom-blue", side: "bottom", offset: 0, size: 3, color: "blue" },
  { id: "lv019-g-left-green", side: "left", offset: 0, size: 3, color: "green" },
  { id: "lv019-g-right-orange", side: "right", offset: 0, size: 3, color: "orange" },
];

const REGENERATED_BLOCKS: LevelSpec["blocks"] = [
  { id: "lv019-r2-b01", x: 0, y: 4, shape: SHAPE_A, color: "red" },
  { id: "lv019-r2-b02", x: 3, y: 0, shape: SHAPE_B, color: "orange" },
  { id: "lv019-r2-b03", x: 4, y: 1, shape: SHAPE_C, color: "blue" },
  { id: "lv019-r2-b04", x: 2, y: 6, shape: SHAPE_B, color: "orange" },
  { id: "lv019-r2-b05", x: 0, y: 0, shape: SHAPE_B, color: "blue" },
  { id: "lv019-r2-b06", x: 2, y: 2, shape: SHAPE_C, color: "orange" },
  { id: "lv019-r2-b07", x: 4, y: 5, shape: SHAPE_C, color: "orange" },
  { id: "lv019-r2-b08", x: 4, y: 2, shape: SHAPE_D, color: "red" },
  { id: "lv019-r2-b09", x: 0, y: 6, shape: SHAPE_D, color: "orange" },
  { id: "lv019-r2-b10", x: 2, y: 7, shape: SHAPE_A, color: "blue" },
  { id: "lv019-r2-b11", x: 0, y: 2, shape: SHAPE_D, color: "green" },
  { id: "lv019-r2-b12", x: 1, y: 1, shape: SHAPE_D, color: "red" },
];

/** Canonical regenerated Lv19 data used by the runtime overlay and tests. */
export const REGENERATED_LEVEL_19: LevelSpec = {
  id: 19,
  name: "换色预判",
  difficulty: "hard",
  timeSeconds: 150,
  reward: 80,
  parMoves: 28,
  width: 6,
  height: 9,
  playable: FULL_PLAYABLE_6X9,
  gates: REGENERATED_GATES,
  blocks: REGENERATED_BLOCKS,
  designTargets: {
    formulaVersion: "blockout-d1",
    calibratedDifficulty: 77.5,
    minimumRepositionOverhead: 12,
  },
};

const cloneRegeneratedLevel = (): LevelSpec => ({
  ...REGENERATED_LEVEL_19,
  playable: REGENERATED_LEVEL_19.playable?.map(([x, y]) => [x, y] as Point),
  gates: REGENERATED_LEVEL_19.gates.map((gate) => ({ ...gate })),
  blocks: REGENERATED_LEVEL_19.blocks.map((block) => ({
    ...block,
    shape: block.shape.map(([x, y]) => [x, y] as Point),
  })),
  designTargets: REGENERATED_LEVEL_19.designTargets
    ? { ...REGENERATED_LEVEL_19.designTargets }
    : undefined,
});

/** Apply only to runtime Lv19; every other level is returned untouched. */
export const applyLevel19Regeneration = (level: LevelSpec): LevelSpec => (
  level.id === 19 ? cloneRegeneratedLevel() : level
);

