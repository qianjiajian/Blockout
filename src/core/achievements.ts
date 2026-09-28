export const ACHIEVEMENT_MAX_LEVEL = 200;

export type AchievementCategory = "levels" | "stars" | "perfect";
export type AchievementTier = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type AchievementId =
  | "levels-1"
  | "levels-10"
  | "levels-50"
  | "levels-100"
  | "levels-150"
  | "levels-200"
  | "stars-10"
  | "stars-90"
  | "stars-180"
  | "stars-300"
  | "stars-450"
  | "stars-600"
  | "perfect-3"
  | "perfect-10"
  | "perfect-30"
  | "perfect-50"
  | "perfect-100"
  | "perfect-150"
  | "perfect-200";

export interface AchievementDefinition {
  readonly id: AchievementId;
  readonly category: AchievementCategory;
  readonly tier: AchievementTier;
  readonly target: number;
  readonly rewardCoins: number;
}

export const ACHIEVEMENT_DEFINITIONS = [
  { id: "levels-1", category: "levels", tier: 1, target: 1, rewardCoins: 50 },
  { id: "levels-10", category: "levels", tier: 2, target: 10, rewardCoins: 100 },
  { id: "levels-50", category: "levels", tier: 3, target: 50, rewardCoins: 250 },
  { id: "levels-100", category: "levels", tier: 4, target: 100, rewardCoins: 500 },
  { id: "levels-150", category: "levels", tier: 5, target: 150, rewardCoins: 750 },
  { id: "levels-200", category: "levels", tier: 6, target: 200, rewardCoins: 1000 },
  { id: "stars-10", category: "stars", tier: 1, target: 10, rewardCoins: 50 },
  { id: "stars-90", category: "stars", tier: 2, target: 90, rewardCoins: 150 },
  { id: "stars-180", category: "stars", tier: 3, target: 180, rewardCoins: 300 },
  { id: "stars-300", category: "stars", tier: 4, target: 300, rewardCoins: 500 },
  { id: "stars-450", category: "stars", tier: 5, target: 450, rewardCoins: 750 },
  { id: "stars-600", category: "stars", tier: 6, target: 600, rewardCoins: 1000 },
  { id: "perfect-3", category: "perfect", tier: 1, target: 3, rewardCoins: 50 },
  { id: "perfect-10", category: "perfect", tier: 2, target: 10, rewardCoins: 100 },
  { id: "perfect-30", category: "perfect", tier: 3, target: 30, rewardCoins: 200 },
  { id: "perfect-50", category: "perfect", tier: 4, target: 50, rewardCoins: 300 },
  { id: "perfect-100", category: "perfect", tier: 5, target: 100, rewardCoins: 500 },
  { id: "perfect-150", category: "perfect", tier: 6, target: 150, rewardCoins: 750 },
  { id: "perfect-200", category: "perfect", tier: 7, target: 200, rewardCoins: 1000 },
] as const satisfies readonly AchievementDefinition[];

export interface AchievementProgressState {
  readonly claimedIds: readonly AchievementId[];
}

export const DEFAULT_ACHIEVEMENT_PROGRESS: AchievementProgressState = {
  claimedIds: [],
};

/**
 * The small portion of a save needed to evaluate achievements. `highestLevel`
 * denotes the highest unlocked level, while `rewardedLevels` is the durable
 * first-clear ledger.
 */
export interface AchievementSaveSnapshot {
  readonly highestLevel: number;
  readonly rewardedLevels: readonly number[];
  readonly bestStars: Readonly<Record<string, number>>;
}

export interface AchievementMetrics {
  readonly completedLevels: number;
  readonly totalStars: number;
  readonly perfectLevels: number;
}

export interface AchievementResult extends AchievementDefinition {
  readonly progress: number;
  readonly completed: boolean;
  readonly claimed: boolean;
  readonly claimable: boolean;
}

export interface AchievementProgressSummary {
  readonly completedLevelIds: readonly number[];
  readonly metrics: AchievementMetrics;
  readonly entries: readonly AchievementResult[];
  readonly completedAchievementCount: number;
  readonly claimedAchievementCount: number;
  readonly claimableIds: readonly AchievementId[];
  readonly hasClaimableAchievements: boolean;
}

const achievementIds = new Set<AchievementId>(ACHIEVEMENT_DEFINITIONS.map(({ id }) => id));

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === "object" && value !== null && !Array.isArray(value)
);

const normalizeHighestLevel = (value: unknown): number => {
  if (typeof value !== "number" && typeof value !== "string") return 1;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 1;
  return Math.max(1, Math.min(ACHIEVEMENT_MAX_LEVEL, Math.floor(numeric)));
};

const normalizeStars = (value: unknown): number => {
  if (typeof value !== "number" && typeof value !== "string") return 0;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(3, Math.floor(numeric)));
};

export const sanitizeAchievementProgress = (value: unknown): AchievementProgressState => {
  const candidate = isRecord(value) ? value.claimedIds : undefined;
  if (!Array.isArray(candidate)) return { claimedIds: [] };
  const claimed = new Set(candidate.filter((id): id is AchievementId => (
    typeof id === "string" && achievementIds.has(id as AchievementId)
  )));
  return {
    claimedIds: ACHIEVEMENT_DEFINITIONS
      .map(({ id }) => id)
      .filter((id) => claimed.has(id)),
  };
};

/**
 * Builds the authoritative completed-level set for both modern and legacy
 * saves. Levels below the highest unlocked level are known clears. The last
 * campaign level is only complete when its first-clear reward is recorded.
 */
export const deriveCompletedAchievementLevelIds = (
  snapshot: AchievementSaveSnapshot,
): number[] => {
  const completed = new Set<number>();
  const highestLevel = normalizeHighestLevel(snapshot.highestLevel);
  for (let level = 1; level < highestLevel; level += 1) completed.add(level);

  const rewardedLevels: unknown = snapshot.rewardedLevels;
  if (Array.isArray(rewardedLevels)) {
    rewardedLevels.forEach((value) => {
      if (typeof value !== "number" || !Number.isInteger(value)) return;
      if (value >= 1 && value <= ACHIEVEMENT_MAX_LEVEL) completed.add(value);
    });
  }
  return [...completed].sort((left, right) => left - right);
};

export const summarizeAchievementMetrics = (
  snapshot: AchievementSaveSnapshot,
): AchievementMetrics => {
  const completedLevelIds = deriveCompletedAchievementLevelIds(snapshot);
  const rawBestStars: unknown = snapshot.bestStars;
  const bestStars = isRecord(rawBestStars) ? rawBestStars : {};
  let totalStars = 0;
  let perfectLevels = 0;

  completedLevelIds.forEach((level) => {
    const stars = normalizeStars(bestStars[String(level)]);
    totalStars += stars;
    if (stars === 3) perfectLevels += 1;
  });

  return {
    completedLevels: completedLevelIds.length,
    totalStars,
    perfectLevels,
  };
};

const progressForCategory = (
  category: AchievementCategory,
  metrics: AchievementMetrics,
): number => {
  switch (category) {
    case "levels": return metrics.completedLevels;
    case "stars": return metrics.totalStars;
    case "perfect": return metrics.perfectLevels;
  }
};

export const evaluateAchievements = (
  snapshot: AchievementSaveSnapshot,
  progress: unknown = DEFAULT_ACHIEVEMENT_PROGRESS,
): AchievementResult[] => {
  const metrics = summarizeAchievementMetrics(snapshot);
  const claimedIds = new Set(sanitizeAchievementProgress(progress).claimedIds);
  return ACHIEVEMENT_DEFINITIONS.map((definition) => {
    const currentProgress = progressForCategory(definition.category, metrics);
    const completed = currentProgress >= definition.target;
    const claimed = claimedIds.has(definition.id);
    return {
      ...definition,
      progress: Math.min(currentProgress, definition.target),
      completed,
      claimed,
      claimable: completed && !claimed,
    };
  });
};

/** Orders rows for the player-facing list without changing catalog order within a state group. */
export const sortAchievementEntries = (
  entries: readonly AchievementResult[],
): AchievementResult[] => {
  const catalogOrder = new Map(ACHIEVEMENT_DEFINITIONS.map(({ id }, index) => [id, index]));
  const stateRank = (entry: AchievementResult): number => (
    entry.claimable ? 0 : entry.claimed ? 2 : 1
  );
  return [...entries].sort((left, right) => (
    stateRank(left) - stateRank(right)
      || (catalogOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER)
      - (catalogOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER)
  ));
};

export const claimableAchievementIds = (
  snapshot: AchievementSaveSnapshot,
  progress: unknown = DEFAULT_ACHIEVEMENT_PROGRESS,
): AchievementId[] => evaluateAchievements(snapshot, progress)
  .filter(({ claimable }) => claimable)
  .map(({ id }) => id);

export const hasClaimableAchievements = (
  snapshot: AchievementSaveSnapshot,
  progress: unknown = DEFAULT_ACHIEVEMENT_PROGRESS,
): boolean => evaluateAchievements(snapshot, progress).some(({ claimable }) => claimable);

export const buildAchievementProgressSummary = (
  snapshot: AchievementSaveSnapshot,
  progress: unknown = DEFAULT_ACHIEVEMENT_PROGRESS,
): AchievementProgressSummary => {
  const completedLevelIds = deriveCompletedAchievementLevelIds(snapshot);
  const metrics = summarizeAchievementMetrics(snapshot);
  const entries = evaluateAchievements(snapshot, progress);
  const claimableIds = entries.filter(({ claimable }) => claimable).map(({ id }) => id);
  return {
    completedLevelIds,
    metrics,
    entries,
    completedAchievementCount: entries.filter(({ completed }) => completed).length,
    claimedAchievementCount: entries.filter(({ claimed }) => claimed).length,
    claimableIds,
    hasClaimableAchievements: claimableIds.length > 0,
  };
};
