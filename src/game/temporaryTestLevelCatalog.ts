import {
  FORMAL_201_210_LEVELS,
  FORMAL_211_220_LEVELS,
  FORMAL_221_230_LEVELS,
  LEVELS,
} from "../core/levels";
import type { LevelSpec } from "../core/types";
import { FORMAL_231_240_LEVELS } from "../core/formal231to240Data";

// The temporary selector can exercise accepted continuation data without
// extending the production campaign or its saved-progress boundary.
const temporaryTestLevels = [
  ...LEVELS,
  ...FORMAL_201_210_LEVELS,
  ...FORMAL_211_220_LEVELS,
  ...FORMAL_221_230_LEVELS,
  ...FORMAL_231_240_LEVELS,
];
const temporaryTestLevelsById = new Map(temporaryTestLevels.map((level) => [level.id, level]));
export const TEMPORARY_TEST_LEVEL_IDS: readonly number[] = Object.freeze(
  temporaryTestLevels.map((level) => level.id),
);
export const TEMPORARY_TEST_LEVEL_COUNT = TEMPORARY_TEST_LEVEL_IDS.length;

export const getTemporaryTestLevelStrict = (id: number): LevelSpec => {
  const level = Number.isInteger(id) ? temporaryTestLevelsById.get(id) : undefined;
  if (!level) throw new RangeError(`Unknown temporary test level id ${id}`);
  return level;
};

export const getAdjacentTemporaryTestLevelId = (id: number, direction: -1 | 1): number => {
  getTemporaryTestLevelStrict(id);
  const index = TEMPORARY_TEST_LEVEL_IDS.indexOf(id);
  return TEMPORARY_TEST_LEVEL_IDS[
    Math.max(0, Math.min(TEMPORARY_TEST_LEVEL_COUNT - 1, index + direction))
  ];
};
