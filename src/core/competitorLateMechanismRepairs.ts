import { VIDEO_PARITY_LEVELS } from "./videoParityLevels.generated";
import { VIDEO_PARITY_LEVELS_101_TO_200 } from "./videoParityLevels101To200.generated";
import { gatePortalRailKeys } from "./gatePortals";
import type { BlockSpec, FlipDoorSpec, LevelSpec } from "./types";

/**
 * Late, attribute-only competitor mechanism candidates.
 *
 * This module intentionally is not connected to `levels.ts`.  Every accepted
 * candidate restores only source-evidenced mechanism metadata on the current
 * final geometry; callers must still certify validation, solving and replay.
 */
export const COMPETITOR_LATE_MECHANISM_REPAIR_VERSION = "competitor-late-mechanisms-r1" as const;

export const COMPETITOR_LATE_NUMERIC_ICE_REQUESTED_LEVEL_IDS = [
  11, 17, 19, 54, 115, 161, 183, 198,
] as const;

export const COMPETITOR_LATE_LOCK_REQUESTED_LEVEL_IDS = [134, 141, 179, 192, 195] as const;
export const COMPETITOR_LATE_AXIS_REQUESTED_LEVEL_IDS = [60] as const;
export const COMPETITOR_LATE_FLIP_DOOR_REQUESTED_LEVEL_IDS = [151, 152, 162, 163] as const;
export const COMPETITOR_LATE_STAR_GATE_REQUESTED_LEVEL_IDS = [100, 102, 104, 118, 131, 163] as const;

/** Solver/replay-certified candidates. */
export const COMPETITOR_LATE_NUMERIC_ICE_LEVEL_IDS = [183] as const;
export const COMPETITOR_LATE_AXIS_LEVEL_IDS = [] as const;
export const COMPETITOR_LATE_FLIP_DOOR_LEVEL_IDS = [162] as const;
export const COMPETITOR_LATE_MECHANISM_REPAIR_LEVEL_IDS = [162, 183] as const;

/**
 * These source facts cannot yet be projected without inventing missing
 * bindings or changing unrelated colour/shape/exit data.  They remain
 * explicit blockers rather than being represented by placeholder mechanics.
 */
export const COMPETITOR_LATE_MECHANISM_BLOCKERS = {
  numericIce: [11, 17, 19, 54, 115, 161, 198],
  locks: [...COMPETITOR_LATE_LOCK_REQUESTED_LEVEL_IDS],
  axis: [...COMPETITOR_LATE_AXIS_REQUESTED_LEVEL_IDS],
  flipDoors: [151, 152, 163],
  starGates: [100, 102, 104, 118, 131, 163],
} as const;

export const COMPETITOR_LATE_MECHANISM_BLOCKER_REASONS: Readonly<Record<string, string>> = {
  "numericIce:11": "exact source binding exceeds the 30k-state proof budget",
  "numericIce:17": "exact source binding exhausts the supported state space without a solution",
  "numericIce:19": "final geometry has no six source-required 2x2 carriers",
  "numericIce:54": "exact source binding exhausts the supported state space without a solution",
  "numericIce:115": "values 9,9 cannot thaw under the current six-block clear-count semantics",
  "numericIce:161": "exact source binding exceeds the 30k-state proof budget",
  "numericIce:198": "exact 11-block binding could not be certified safely within the bounded run",
  "locks:134": "truth omits the three key identities and the generated one-key binding is insufficient",
  "locks:141": "truth shows one visible key for a four-key lock but does not identify hidden keys",
  "locks:179": "final geometry has no source-required red 2x2 lock carrier",
  "locks:192": "final geometry has no source-required yellow H2 lock carrier",
  "locks:195": "final geometry has no source-required red V3 lock carrier",
  "axis:60": "restoring all 35 source axes leaves eight blocks without an axis-compatible exit",
  "flipDoors:151": "exact doors replace rails needed by recoloured pink/orange/red blocks",
  "flipDoors:152": "exact doors replace rails needed by recoloured cyan/green blocks",
  "flipDoors:163": "exact doors replace the only yellow exit rail",
  "starGates:100": "seven star blocks span four final colours but truth permits only two star exits",
  "starGates:102": "truth records two star blocks and zero star exits",
  "starGates:104": "truth records two star blocks and zero star exits",
  "starGates:118": "truth records one star block and zero star exits",
  "starGates:131": "truth star-exit colours do not cover the four final star-block colours",
  "starGates:163": "two final star-block colours cannot route through the single truth star exit",
};

const numericIceIds = new Set<number>(COMPETITOR_LATE_NUMERIC_ICE_LEVEL_IDS);
const axisIds = new Set<number>(COMPETITOR_LATE_AXIS_LEVEL_IDS);
const flipDoorIds = new Set<number>(COMPETITOR_LATE_FLIP_DOOR_LEVEL_IDS);
const affectedIds = new Set<number>([
  ...COMPETITOR_LATE_NUMERIC_ICE_LEVEL_IDS,
  ...COMPETITOR_LATE_AXIS_LEVEL_IDS,
  ...COMPETITOR_LATE_FLIP_DOOR_LEVEL_IDS,
]);

const sourceById = new Map<number, LevelSpec>([
  ...VIDEO_PARITY_LEVELS,
  ...VIDEO_PARITY_LEVELS_101_TO_200,
].map((level) => [level.id, level]));

const sourceBlockById = (levelId: number): ReadonlyMap<string, BlockSpec> => new Map(
  (sourceById.get(levelId)?.blocks ?? []).map((block) => [block.id, block]),
);

const restoreBlockAttribute = (
  block: BlockSpec,
  source: BlockSpec | undefined,
  field: "frozen" | "movementAxis",
): BlockSpec => {
  const expected = source?.[field];
  if (block[field] === expected) return block;
  if (expected === undefined) {
    const { [field]: _removed, ...rest } = block;
    return rest as BlockSpec;
  }
  return { ...block, [field]: expected };
};

/** Exact, frame-recorded Flip Door positions, colours and initial states. */
const FLIP_DOORS: Readonly<Record<number, readonly FlipDoorSpec[]>> = {
  162: [
    { id: "competitor-late-flip-162-1", side: "top", offset: 2, size: 3, color: "green", initiallyOpen: false },
    { id: "competitor-late-flip-162-2", side: "right", offset: 5, size: 2, color: "purple", initiallyOpen: false },
    { id: "competitor-late-flip-162-3", side: "bottom", offset: 0, size: 2, color: "orange", initiallyOpen: true },
    { id: "competitor-late-flip-162-4", side: "bottom", offset: 3, size: 1, color: "blue", initiallyOpen: true },
    { id: "competitor-late-flip-162-5", side: "bottom", offset: 5, size: 2, color: "red", initiallyOpen: true },
  ],
};

const sameFlipDoors = (
  left: readonly FlipDoorSpec[] | undefined,
  right: readonly FlipDoorSpec[],
): boolean => JSON.stringify(left ?? []) === JSON.stringify(right);

export const applyCompetitorLateMechanismRepair = (level: LevelSpec): LevelSpec => {
  if (!affectedIds.has(level.id)) return level;
  const sources = sourceBlockById(level.id);
  let blocks = level.blocks;

  if (numericIceIds.has(level.id)) {
    blocks = blocks.map((block) => restoreBlockAttribute(block, sources.get(block.id), "frozen"));
  }
  if (axisIds.has(level.id)) {
    blocks = blocks.map((block) => restoreBlockAttribute(block, sources.get(block.id), "movementAxis"));
  }

  const expectedDoors = FLIP_DOORS[level.id];
  const flipDoors = expectedDoors?.map((door) => ({ ...door }));
  const doorRails = new Set(expectedDoors?.flatMap((door) => gatePortalRailKeys(level, door)) ?? []);
  const gates = expectedDoors
    ? level.gates.filter((gate) => !gatePortalRailKeys(level, gate).some((rail) => doorRails.has(rail)))
    : level.gates;
  const blocksChanged = blocks.some((block, index) => block !== level.blocks[index]);
  const doorsChanged = Boolean(expectedDoors) && !sameFlipDoors(level.flipDoors, expectedDoors);
  const gatesChanged = gates.length !== level.gates.length;
  if (!blocksChanged && !doorsChanged && !gatesChanged) return level;

  return {
    ...level,
    blocks,
    gates,
    ...(expectedDoors ? { flipDoors } : {}),
  };
};
