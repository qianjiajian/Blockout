import type { LevelSpec } from "./types";
import { FORMAL_211_220_LEVELS } from "./formal211to220Data";

export { FORMAL_211_220_LEVELS, FORMAL_211_220_EVIDENCE, getFormal211to220LevelStrict } from "./formal211to220Data";
export const REMADE_211_220_LEVELS = FORMAL_211_220_LEVELS;
export const CONTINUATION_LEVELS_211_220 = REMADE_211_220_LEVELS;
export const REMADE_211_220_IDS = Object.freeze(REMADE_211_220_LEVELS.map(level => level.id));
export const applyRemake211to220 = (level: LevelSpec): LevelSpec => REMADE_211_220_LEVELS.find(candidate => candidate.id === level.id) ?? level;
