import type { LevelSpec } from "./types";
import { QUALIFIED_221_230_LEVELS } from "./remake221to230Data";
export { FORMAL_221_230_LEVELS, FORMAL_221_230_EVIDENCE, getFormal221to230LevelStrict } from "./formal221to230Data";

/** v1.121 design plan. A target is not a lower-bound certificate. */
export const CONTINUATION_221_230_PLAN = [
  { id: 221, difficulty: "easy", band: [5, 10], target: 5 },
  { id: 222, difficulty: "normal", band: [11, 15], target: 11 },
  { id: 223, difficulty: "normal", band: [11, 15], target: 12 },
  { id: 224, difficulty: "hard", band: [16, 20], target: 16 },
  { id: 225, difficulty: "easy", band: [5, 10], target: 6 },
  { id: 226, difficulty: "normal", band: [11, 15], target: 13 },
  { id: 227, difficulty: "hard", band: [16, 20], target: 17 },
  { id: 228, difficulty: "easy", band: [5, 10], target: 7 },
  { id: 229, difficulty: "normal", band: [11, 15], target: 14 },
  { id: 230, difficulty: "super", band: [21, 30], target: 21 },
] as const;

/** Only original candidates with floor, complete route, dual Pointer, natural
 * clock and three-star evidence enter here. Unfinished IDs remain in the plan.
 * Rejected recolours of 201–210 are archived. Production boundary stays 200. */
export const REMADE_221_230_LEVELS: readonly LevelSpec[] = Object.freeze(QUALIFIED_221_230_LEVELS);
export const REMADE_221_230_IDS = Object.freeze(REMADE_221_230_LEVELS.map(level => level.id));
export const CONTINUATION_LEVELS_221_230 = REMADE_221_230_LEVELS;
export const applyRemake221to230 = (level: LevelSpec): LevelSpec => (
  REMADE_221_230_LEVELS.find(candidate => candidate.id === level.id) ?? level
);
