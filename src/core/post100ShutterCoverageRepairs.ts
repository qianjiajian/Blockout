import type { LevelSpec } from "./types";

/** Source-backed cover packing, encoded as x/y digits in level.blocks order. */
export const POST_100_SHUTTER_COVERAGE_REPAIR_VERSION = "authoritative-cover-pack-r1" as const;

const PACKED_POSITIONS: Readonly<Record<number, string>> = {
  103: "33030455440626462545230017203740571127",
  105: "345446365600142024402511043115",
  112: "050235061226460717145527374700324022",
};

export const POST_100_SHUTTER_COVERAGE_REPAIR_LEVEL_IDS = [103, 105, 112] as const;

export const applyPost100ShutterCoverageRepair = (level: LevelSpec): LevelSpec => {
  const packed = PACKED_POSITIONS[level.id];
  if (!packed) return level;
  if (packed.length !== level.blocks.length * 2) {
    throw new Error(`Lv${level.id} shutter coverage repair block order drifted`);
  }
  return {
    ...level,
    blocks: level.blocks.map((block, index) => ({
      ...block,
      x: Number(packed[index * 2]),
      y: Number(packed[index * 2 + 1]),
    })),
  };
};
