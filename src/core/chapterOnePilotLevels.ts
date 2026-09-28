import type { LevelSpec } from "./types";
import { campaignRepositionFloor, campaignTargetD1 } from "./campaignDifficultyTargets";
import { COMPETITOR_CONSTRAINED_CAMPAIGN_LEVELS } from "./competitorConstrainedCampaign";
import { normalizeRuntimeLevel } from "./runtimeLevelNormalization";

// SHA-256 of the approved v4 design contract that locks the Lv1–100 board,
// composition, palette-count, difficulty-target, and reposition-floor data.
export const CHAPTER_ONE_PILOT_BOARD_SOURCE_SHA256 = "6A464F0FBCBAE72EB82BA63070687CAD606BE27E428D4B50B152A5F504A31B9C";

export const CHAPTER_ONE_PILOT_TARGET_DIFFICULTY = {
  1: 35.29,
  2: 57.1,
  3: 50.54,
  4: 70,
  5: 76,
  6: 70,
  7: 72,
  8: 74,
  9: 75.5,
  10: 77,
} as const;

for (let levelId = 1; levelId <= 10; levelId += 1) {
  if (CHAPTER_ONE_PILOT_TARGET_DIFFICULTY[levelId as keyof typeof CHAPTER_ONE_PILOT_TARGET_DIFFICULTY] !== campaignTargetD1(levelId)) {
    throw new Error(`Chapter-one target difficulty drifted at Lv${levelId}`);
  }
}

// User-approved campaign-order change: the complete Lv2/Lv3 designs trade
// slots. IDs and final-slot design targets are normalized after the swap;
// every other authored field travels with its original level.
export const CHAPTER_ONE_PILOT_SOURCE_ORDER = [1, 3, 2, 4, 5, 6, 7, 8, 9, 10] as const;

export const CHAPTER_ONE_PILOT_LEVELS: LevelSpec[] = CHAPTER_ONE_PILOT_SOURCE_ORDER.map((sourceId, index) => {
  const id = index + 1;
  const source = COMPETITOR_CONSTRAINED_CAMPAIGN_LEVELS[sourceId - 1];
  if (!source) throw new Error(`Missing chapter-one source Lv${sourceId}`);
  return normalizeRuntimeLevel({
    ...source,
    id,
    designTargets: {
      formulaVersion: "blockout-d1",
      calibratedDifficulty: campaignTargetD1(id),
      minimumRepositionOverhead: campaignRepositionFloor(id),
    },
  });
});
