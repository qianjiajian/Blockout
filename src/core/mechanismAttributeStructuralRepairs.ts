import type { BlockSpec, LevelSpec } from "./types";

/**
 * Second-pass, solver-certified mechanism-attribute repairs.
 *
 * This layer is intentionally structural and narrow: it never changes exits,
 * shutters, generators, block identity/count, or the opening-visible cohort.
 * Numeric ice is rebound to blocks that clear late enough, axis markers use
 * stable staged blocks with an aligned starting lane, and Lv200 restores the
 * canonical 6x2 red grid while moving one hidden yellow carrier below it.
 */

export const STRUCTURAL_NUMERIC_ICE_REPAIR_LEVEL_IDS = [
  39, 77, 87, 129, 132, 177, 186,
] as const;

export const STRUCTURAL_AXIS_REPAIR_LEVEL_IDS = [140, 181] as const;

export const STRUCTURAL_COLORED_GRID_REPAIR_LEVEL_IDS = [200] as const;

export const MECHANISM_ATTRIBUTE_STRUCTURAL_REPAIR_LEVEL_IDS = [
  ...STRUCTURAL_NUMERIC_ICE_REPAIR_LEVEL_IDS,
  ...STRUCTURAL_AXIS_REPAIR_LEVEL_IDS,
  ...STRUCTURAL_COLORED_GRID_REPAIR_LEVEL_IDS,
].sort((left, right) => left - right);

export const STRUCTURAL_NUMERIC_ICE_BLOCKED_LEVEL_IDS = [11, 17, 115, 161, 183, 198] as const;
export const STRUCTURAL_AXIS_BLOCKED_LEVEL_IDS = [60] as const;
export const STRUCTURAL_LOCK_BLOCKED_LEVEL_IDS = [134, 141, 179, 192, 195] as const;
export const STRUCTURAL_COLORED_GRID_BLOCKED_LEVEL_IDS = [] as const;

const numericAssignments: Readonly<Record<number, Readonly<Record<string, number>>>> = {
  39: { "cc-039-b3-02": 12, "cc-039-b1-01": 1, "cc-039-b1-02": 1, "cc-039-b1-03": 1, "cc-039-b1-04": 1 },
  77: { "cc-077-b1-19": 18, "cc-077-b1-07": 6 },
  87: { "cc-087-b1-10": 9, "cc-087-b1-11": 9, "cc-087-b1-04": 9, "cc-087-b1-13": 9, "cc-087-b1-06": 9, "cc-087-b1-14": 9, "cc-087-b1-16": 9 },
  129: { "lv129-opening-b11": 10 },
  132: { "lv132-opening-b15": 14, "lv132-opening-b16": 14, "lv132-opening-b17": 14, "lv132-opening-b18": 14 },
  177: { "lv177-opening-b13": 12 },
  186: { "lv186-opening-b18": 17 },
};

type AxisPlacement = readonly [axis: "horizontal" | "vertical", x: number, y: number];

const axisAssignments: Readonly<Record<number, Readonly<Record<string, AxisPlacement>>>> = {
  140: {
    "lv140-cover-count-8-inferred-batch-b02": ["horizontal", 2, 3],
    "lv140-cover-count-8-inferred-batch-b03": ["horizontal", 3, 0],
    "lv140-cover-count-8-inferred-batch-b04": ["horizontal", 3, 1],
    "lv140-cover-count-8-inferred-batch-b05": ["vertical", 0, 1],
  },
  181: {
    "lv181-opening-b02": ["horizontal", 6, 0],
    "lv181-opening-b15": ["horizontal", 6, 0],
  },
};

const clearFrozen = (block: BlockSpec): BlockSpec => {
  const { frozen: _frozen, ...rest } = block;
  return rest;
};

const clearAxis = (block: BlockSpec): BlockSpec => {
  const { movementAxis: _movementAxis, ...rest } = block;
  return rest;
};

const applyNumeric = (level: LevelSpec): LevelSpec => {
  const assignments = numericAssignments[level.id];
  if (!assignments) return level;
  return {
    ...level,
    blocks: level.blocks.map((block) => {
      const cleared = clearFrozen(block);
      const frozen = assignments[block.id];
      return frozen === undefined ? cleared : { ...cleared, frozen };
    }),
  };
};

const applyAxis = (level: LevelSpec): LevelSpec => {
  const assignments = axisAssignments[level.id];
  if (!assignments) return level;
  return {
    ...level,
    blocks: level.blocks.map((block) => {
      const cleared = clearAxis(block);
      const placement = assignments[block.id];
      return placement === undefined ? cleared : {
        ...cleared,
        movementAxis: placement[0],
        x: placement[1],
        y: placement[2],
      };
    }),
  };
};

const applyColoredGrid = (level: LevelSpec): LevelSpec => {
  if (level.id !== 200) return level;
  return {
    ...level,
    blocks: level.blocks.map((block) => block.id === "lv200-opening-b04"
      ? { ...block, x: 0, y: 6 }
      : block),
    coloredGrids: [{
      id: "mechanism-attribute-grid-200",
      color: "red",
      cells: Array.from({ length: 12 }, (_, index) => [index % 6, 4 + Math.floor(index / 6)] as const),
    }],
  };
};

export const applyMechanismAttributeStructuralRepair = (level: LevelSpec): LevelSpec => (
  applyColoredGrid(applyAxis(applyNumeric(level)))
);
