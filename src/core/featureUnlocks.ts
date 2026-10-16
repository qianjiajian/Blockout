export type FeatureId = "levels" | "leaderboard" | "supply" | "dailyTasks"
  | "dailyChallenge" | "achievements" | "league";

/** Completion thresholds for feature entry points. `guide` declares eligibility;
 * it does not start a guide or record that a guide has been shown. */
export const FEATURE_UNLOCKS: Readonly<Record<FeatureId, {
  readonly completedLevel: number;
  readonly guide: boolean;
}>> = Object.freeze({
  levels: Object.freeze({ completedLevel: 10, guide: true }),
  leaderboard: Object.freeze({ completedLevel: 6, guide: true }),
  supply: Object.freeze({ completedLevel: 8, guide: true }),
  dailyTasks: Object.freeze({ completedLevel: 5, guide: false }),
  dailyChallenge: Object.freeze({ completedLevel: 15, guide: true }),
  achievements: Object.freeze({ completedLevel: 5, guide: false }),
  league: Object.freeze({ completedLevel: 20, guide: true }),
});

/** Highest progress points to the next available level; browsing/replaying a
 * level cannot unlock a feature. Explicit first-clear records also prove it. */
export function isFeatureUnlocked(
  feature: FeatureId,
  progress: { highestLevel: number; rewardedLevels: readonly number[] },
): boolean {
  const threshold = FEATURE_UNLOCKS[feature].completedLevel;
  return progress.highestLevel > threshold || progress.rewardedLevels.includes(threshold);
}
