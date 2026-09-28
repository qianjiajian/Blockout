import type { BlockSpec, LevelSpec } from "./types";

/**
 * Solver-certified attribute-only repairs for competitor mechanism parity.
 *
 * These repairs deliberately do not touch block position, shape, colour,
 * visibility/staging, exits, shutters, generators, or playable geometry. The
 * block ids below are stable ids from the final runtime level, selected against
 * a 20,000-state solver route and replayed through PuzzleModel.
 */

export const NUMERIC_ICE_ATTRIBUTE_REPAIR_LEVEL_IDS = [
  24, 31, 32, 38, 41, 47, 51, 53, 55, 58, 64, 66, 67, 72, 76, 89, 113, 126,
  133, 135, 137, 146, 149, 153, 156, 159, 166, 170, 189, 192, 200,
] as const;

/** Candidates that cannot be wired without losing the 20k-state proof. */
export const NUMERIC_ICE_ATTRIBUTE_BLOCKED_LEVEL_IDS = [
  11, 17, 39, 77, 87, 115, 129, 132, 161, 177, 183, 186, 198,
] as const;

export const AXIS_ATTRIBUTE_REPAIR_LEVEL_IDS = [
  50, 51, 52, 53, 55, 61, 172,
] as const;

export const AXIS_ATTRIBUTE_BLOCKED_LEVEL_IDS = [60, 140, 181] as const;

export const LOCK_ATTRIBUTE_REPAIR_LEVEL_IDS = [
  59, 83, 84, 94, 95, 107, 109, 130, 144, 154, 157, 165, 178, 198,
] as const;

/** Their canonical key totals cannot satisfy the requested lock requirements. */
export const LOCK_ATTRIBUTE_BLOCKED_LEVEL_IDS = [134, 141, 179, 192, 195] as const;

/** Lv200's canonical 6x2 red grid makes the repaired runtime layout unsolvable. */
export const COLORED_GRID_ATTRIBUTE_BLOCKED_LEVEL_IDS = [200] as const;

export const MECHANISM_ATTRIBUTE_REPAIR_LEVEL_IDS = [...new Set([
  ...NUMERIC_ICE_ATTRIBUTE_REPAIR_LEVEL_IDS,
  ...AXIS_ATTRIBUTE_REPAIR_LEVEL_IDS,
  ...LOCK_ATTRIBUTE_REPAIR_LEVEL_IDS,
])].sort((left, right) => left - right);

const numericIceLevelIds = new Set<number>(NUMERIC_ICE_ATTRIBUTE_REPAIR_LEVEL_IDS);
const axisLevelIds = new Set<number>(AXIS_ATTRIBUTE_REPAIR_LEVEL_IDS);
const lockLevelIds = new Set<number>(LOCK_ATTRIBUTE_REPAIR_LEVEL_IDS);
const mechanismAttributeRepairLevelIds = new Set<number>(MECHANISM_ATTRIBUTE_REPAIR_LEVEL_IDS);

const NUMERIC_ICE_ASSIGNMENTS: Readonly<Record<number, Readonly<Record<string, number>>>> = {
  24: { "cc-024-b3-09": 6, "cc-024-b3-08": 6, "cc-024-b2-02": 6, "cc-024-b3-07": 6 },
  31: { "cc-031-b1-18": 13, "cc-031-b1-17": 10, "cc-031-b1-16": 9, "cc-031-b1-15": 5 },
  32: { "cc-032-b1-09": 4, "cc-032-b1-12": 4, "cc-032-b1-05": 4, "cc-032-b1-11": 4, "cc-032-b1-10": 4, "cc-032-b1-08": 4 },
  38: { "cc-038-b3-06": 5, "cc-038-b3-05": 5, "cc-038-b3-08": 5 },
  41: { "cc-041-b5-01": 7, "cc-041-b4-03": 7, "cc-041-b1-04": 7, "cc-041-b1-08": 7 },
  47: { "cc-047-b1-23": 14, "cc-047-b1-22": 9 },
  51: { "strategy-guard-12": 7 },
  53: { "cc-053-b1-14": 7, "cc-053-b1-13": 7, "cc-053-b1-12": 5 },
  55: { "cc-piece-s2-03": 5, "cc-piece-s2-02": 5, "cc-piece-s2-01": 5, "cc-piece-s1-16": 5 },
  58: { "cc-058-b1-18": 12, "cc-058-b1-01": 12, "cc-058-b1-03": 12, "cc-058-b1-02": 9, "cc-058-b1-08": 7, "cc-058-b1-04": 5, "cc-058-b1-13": 5, "cc-058-b1-14": 3 },
  64: { "cc-064-b4-06": 3 },
  66: { "cc-066-b3-04": 6, "cc-066-b3-03": 6, "cc-066-b3-02": 6, "cc-066-b3-01": 6, "cc-066-b2-05": 6, "cc-066-b2-04": 5, "cc-066-b2-03": 5 },
  67: { "cc-067-b4-01": 10, "cc-067-b3-04": 5, "cc-067-b3-03": 5, "cc-067-b3-02": 5 },
  72: { "cc-072-b2-05": 17, "cc-072-b2-02": 10 },
  76: { "cc-076-b1-18": 14, "cc-076-b1-16": 14, "cc-076-b1-13": 8, "cc-076-b1-14": 5, "cc-076-b1-03": 5, "cc-076-b1-17": 5, "cc-076-b1-08": 5, "cc-076-b1-02": 5, "cc-076-b1-12": 5 },
  89: { "cc-089-b3-08": 7 },
  113: { "lv113-pooled-hidden-b12": 6 },
  126: { "lv126-opening-b04": 5, "lv126-opening-b13": 5 },
  133: { "lv133-opening-b14": 3, "lv133-opening-b18": 3 },
  135: { "lv135-opening-b17": 10, "lv135-opening-b14": 7, "lv135-cover-count-10-b04": 7, "lv135-cover-count-10-b03": 7, "lv135-cover-count-10-b02": 7, "lv135-cover-count-10-b01": 7 },
  137: { "lv137-cover-count-3-inferred-batch-b10": 8, "lv137-cover-count-3-inferred-batch-b09": 8 },
  146: { "lv146-pooled-hidden-b01": 14, "lv146-pooled-hidden-b02": 14, "lv146-opening-b03": 7 },
  149: { "lv149-opening-b09": 2 },
  153: { "lv153-opening-b29": 15, "lv153-opening-b28": 13 },
  156: { "lv156-opening-b01": 1, "lv156-opening-b02": 1 },
  159: { "lv159-pooled-hidden-b05": 14 },
  166: { "lv166-pooled-hidden-b20": 18 },
  170: { "lv170-opening-b20": 5 },
  189: { "lv189-pooled-hidden-b11": 18 },
  192: { "lv192-opening-b17": 2, "lv192-opening-b07": 2 },
  200: { "lv200-opening-b05": 3, "lv200-opening-b09": 3 },
};

const AXIS_ASSIGNMENTS: Readonly<Record<number, Readonly<Record<string, "horizontal" | "vertical">>>> = {
  50: {
    "axis-seed-050-01": "horizontal", "axis-seed-050-02": "vertical",
    "axis-seed-050-03": "horizontal", "axis-seed-050-04": "vertical",
    "axis-seed-050-05": "horizontal", "axis-seed-050-06": "horizontal",
    "axis-seed-050-07": "vertical", "axis-seed-050-08": "horizontal",
    "axis-seed-050-09": "horizontal", "axis-seed-050-10": "horizontal",
    "axis-seed-050-11": "horizontal", "axis-seed-050-12": "vertical",
    "axis-seed-050-13": "horizontal",
  },
  51: {
    "strategy-guard-01": "horizontal", "strategy-guard-02": "vertical",
    "strategy-guard-03": "vertical", "strategy-guard-04": "vertical",
    "strategy-guard-05": "vertical", "strategy-guard-06": "horizontal",
  },
  52: {
    "cc-052-b1-01": "horizontal", "cc-052-b1-02": "horizontal",
    "cc-052-b1-03": "vertical", "cc-052-b1-04": "horizontal",
    "cc-052-b1-05": "horizontal", "cc-052-b1-06": "horizontal",
    "cc-052-b1-07": "vertical",
  },
  53: { "cc-053-b1-01": "vertical", "cc-053-b1-02": "vertical" },
  55: {
    "strategy-guard-s1-01": "vertical", "cc-piece-s1-02": "horizontal",
    "strategy-guard-s1-03": "horizontal",
  },
  61: { "cc-piece-s1-01": "horizontal", "cc-piece-s1-02": "vertical" },
  172: {
    "lv172-opening-b05": "vertical", "lv172-opening-b11": "vertical",
    "lv172-opening-b15": "horizontal",
  },
};

type LockAssignments = Readonly<{
  keyIds: readonly string[];
  locks: Readonly<Record<string, number>>;
}>;

const LOCK_ASSIGNMENTS: Readonly<Record<number, LockAssignments>> = {
  59: { keyIds: ["cc-059-b1-01", "cc-059-b1-02"], locks: { "cc-059-b3-04": 1, "cc-059-b1-07": 1 } },
  83: { keyIds: ["cc-083-b1-01", "cc-083-b1-02"], locks: { "cc-083-b1-11": 1, "cc-083-b1-12": 1 } },
  84: { keyIds: ["cc-084-b1-05", "cc-084-b5-02", "cc-084-b1-12"], locks: { "cc-084-b5-01": 3 } },
  94: { keyIds: ["cc-094-b1-08", "cc-094-b2-01", "cc-094-b2-04", "cc-094-b1-01"], locks: { "cc-094-b5-04": 4 } },
  95: { keyIds: ["cc-095-b1-13", "cc-095-b1-15"], locks: { "cc-095-b1-17": 1, "cc-095-b2-01": 1 } },
  107: { keyIds: ["lv107-opening-b01", "lv107-opening-b02", "lv107-opening-b04", "lv107-opening-b05"], locks: { "lv107-opening-b17": 1, "lv107-opening-b18": 1, "lv107-opening-b03": 1, "lv107-opening-b06": 1 } },
  109: { keyIds: ["lv109-opening-b03", "lv109-opening-b04", "lv109-opening-b01", "lv109-opening-b05"], locks: { "lv109-opening-b16": 3, "lv109-opening-b02": 1, "lv109-opening-b08": 1 } },
  130: { keyIds: ["lv130-opening-b01", "lv130-opening-b02", "lv130-opening-b04"], locks: { "sr130-d": 1, "sr130-e": 1, "lv130-opening-b03": 1 } },
  144: { keyIds: ["lv144-opening-b03", "lv144-opening-b01", "lv144-opening-b04", "lv144-opening-b06"], locks: { "lv144-opening-b15": 3 } },
  154: { keyIds: ["lv154-opening-b01", "lv154-opening-b02", "lv154-opening-b03", "lv154-opening-b04"], locks: { "lv154-opening-b39": 4 } },
  157: { keyIds: ["lv157-opening-b02"], locks: { "lv157-opening-b15": 1 } },
  165: { keyIds: ["lv165-opening-b03", "lv165-opening-b01"], locks: { "lv165-pooled-hidden-b07": 1 } },
  178: { keyIds: ["lv178-opening-b03"], locks: { "lv178-opening-b21": 1 } },
  198: { keyIds: ["lv198-opening-b03", "lv198-opening-b01"], locks: { "lv198-opening-b29": 1, "lv198-opening-b30": 1 } },
};

const clearNumericIce = (block: BlockSpec): BlockSpec => {
  const { frozen: _frozen, ...rest } = block;
  return rest;
};

const clearAxis = (block: BlockSpec): BlockSpec => {
  const { movementAxis: _movementAxis, ...rest } = block;
  return rest;
};

const clearKeyLock = (block: BlockSpec): BlockSpec => {
  const { keyId: _keyId, lockedBy: _lockedBy, lockCount: _lockCount, ...rest } = block;
  return rest;
};

export const applyNumericIceAttributeRepair = (level: LevelSpec): LevelSpec => {
  if (!numericIceLevelIds.has(level.id)) return level;
  const assignments = NUMERIC_ICE_ASSIGNMENTS[level.id];
  if (!assignments) throw new Error(`Missing certified numeric-ice assignments for Lv${level.id}`);
  return {
    ...level,
    blocks: level.blocks.map((block) => {
      const cleared = clearNumericIce(block);
      const frozen = assignments[block.id];
      return frozen === undefined ? cleared : { ...cleared, frozen };
    }),
  };
};

export const applyAxisAttributeRepair = (level: LevelSpec): LevelSpec => {
  if (!axisLevelIds.has(level.id)) return level;
  const assignments = AXIS_ASSIGNMENTS[level.id];
  if (!assignments) throw new Error(`Missing certified axis assignments for Lv${level.id}`);
  return {
    ...level,
    blocks: level.blocks.map((block) => {
      const movementAxis = assignments[block.id];
      const cleared = clearAxis(block);
      return movementAxis ? { ...cleared, movementAxis } : cleared;
    }),
  };
};

export const applyLockAttributeRepair = (level: LevelSpec): LevelSpec => {
  if (!lockLevelIds.has(level.id)) return level;
  const assignments = LOCK_ASSIGNMENTS[level.id];
  if (!assignments) throw new Error(`Missing certified key/lock assignments for Lv${level.id}`);
  const keyIds = new Set(assignments.keyIds);
  const lockGroup = `mechanism-lock-${level.id}`;
  return {
    ...level,
    blocks: level.blocks.map((block) => {
      const cleared = clearKeyLock(block);
      if (keyIds.has(block.id)) return { ...cleared, keyId: lockGroup };
      const lockCount = assignments.locks[block.id];
      return lockCount === undefined
        ? cleared
        : { ...cleared, lockedBy: lockGroup, lockCount };
    }),
  };
};

export const applyMechanismAttributeRepair = (level: LevelSpec): LevelSpec => {
  if (!mechanismAttributeRepairLevelIds.has(level.id)) return level;
  return applyLockAttributeRepair(applyAxisAttributeRepair(
    applyNumericIceAttributeRepair(level),
  ));
};
