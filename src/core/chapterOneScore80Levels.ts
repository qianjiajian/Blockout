import type { LevelSpec } from "./types";
import { CHAPTER_ONE_COMPETITOR_LEVELS } from "./chapterOneCompetitorLevels";

/**
 * Legacy export name retained for existing imports. Lv5–10 now prioritize the
 * latest competitor-composition brief over the superseded score-80 constraint.
 */
export const CHAPTER_ONE_SCORE80_LEVELS: LevelSpec[] = CHAPTER_ONE_COMPETITOR_LEVELS.slice(4);
