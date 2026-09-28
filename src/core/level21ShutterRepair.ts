import type { LevelSpec } from "./types";

/** Reversible source-backed correction for Lv21's three countdown covers. */
export const LEVEL_21_SHUTTER_REPAIR_VERSION = "source-cover-geometry-r1" as const;

/** x/y digits in level.blocks order; hidden cohorts tile their cover rectangles. */
const BLOCK_POSITIONS = "002040210104424324412505454402122232060826284656";

/** x/y/width/height digits in level.shutters order. */
const SHUTTER_GEOMETRY = "024206434623";

/** Apply only to production Lv21; every other level is returned untouched. */
export const applyLevel21ShutterRepair = (level: LevelSpec): LevelSpec => {
  if (level.id !== 21) return level;
  if (BLOCK_POSITIONS.length !== level.blocks.length * 2 || SHUTTER_GEOMETRY.length !== (level.shutters?.length ?? 0) * 4) {
    throw new Error("Lv21 shutter repair source order drifted");
  }
  return {
    ...level,
    blocks: level.blocks.map((block, index) => ({
      ...block,
      x: Number(BLOCK_POSITIONS[index * 2]),
      y: Number(BLOCK_POSITIONS[index * 2 + 1]),
    })),
    shutters: level.shutters?.map((shutter, index) => ({
      ...shutter,
      x: Number(SHUTTER_GEOMETRY[index * 4]),
      y: Number(SHUTTER_GEOMETRY[index * 4 + 1]),
      width: Number(SHUTTER_GEOMETRY[index * 4 + 2]),
      height: Number(SHUTTER_GEOMETRY[index * 4 + 3]),
    })),
  };
};
