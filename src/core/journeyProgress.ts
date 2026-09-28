export const JOURNEY_LEVEL_COUNT = 200;
export const JOURNEY_SEGMENT_SIZE = 10;
export const JOURNEY_THEME_COUNT = 10;

export const JOURNEY_THEME_TITLES = Object.freeze([
  "Castle Avenue",
  "Desert Kingdom",
  "Jungle Ruins",
  "Ice Castle",
  "Pirate Bay",
  "Sky Islands",
  "Blossom Town",
  "Golden Bridge",
  "Volcano City",
  "Block Carnival",
] as const);

export interface JourneySegment {
  index: number;
  startLevel: number;
  endLevel: number;
}

/** Twenty permanent Journey segments with ten selectable level nodes each. */
export const JOURNEY_SEGMENTS: readonly JourneySegment[] = Object.freeze(
  Array.from({ length: JOURNEY_LEVEL_COUNT / JOURNEY_SEGMENT_SIZE }, (_, index) => Object.freeze({
    index: index + 1,
    startLevel: index * JOURNEY_SEGMENT_SIZE + 1,
    endLevel: (index + 1) * JOURNEY_SEGMENT_SIZE,
  })),
);

export interface JourneyEpisode {
  index: number;
  title: string;
  range: readonly [startLevel: number, endLevel: number];
  startLevel: number;
  endLevel: number;
  unlockLevel: number;
}

/**
 * Journey has ten supplied visual themes. The second hundred reuses those
 * themes in the same order while keeping chapter identity and persistence
 * indexes unique. No additional image asset is required for episodes 11–20.
 */
export const JOURNEY_EPISODES: readonly JourneyEpisode[] = Object.freeze(
  Array.from({ length: JOURNEY_LEVEL_COUNT / JOURNEY_SEGMENT_SIZE }, (_, offset) => {
    const index = offset + 1;
    const startLevel = offset * JOURNEY_SEGMENT_SIZE + 1;
    const endLevel = startLevel + JOURNEY_SEGMENT_SIZE - 1;
    const baseTitle = JOURNEY_THEME_TITLES[offset % JOURNEY_THEME_COUNT];
    const title = offset < JOURNEY_THEME_COUNT ? baseTitle : `${baseTitle} II`;
    return Object.freeze({
      index,
      title,
      range: Object.freeze([startLevel, endLevel] as const),
      startLevel,
      endLevel,
      unlockLevel: startLevel,
    });
  }),
);

/** Maps a 1-based episode id onto the ten checked-in Journey art themes. */
export const getJourneyEpisodeThemeIndex = (episodeIndex: unknown): number => {
  const numeric = Number(episodeIndex);
  const safeIndex = Number.isFinite(numeric) ? Math.max(1, Math.floor(numeric)) : 1;
  return (safeIndex - 1) % JOURNEY_THEME_COUNT;
};

export const JOURNEY_EPISODE_UNLOCK_LEVELS = Object.freeze(
  JOURNEY_EPISODES.slice(1).map((episode) => episode.unlockLevel),
);

export type JourneyRewardKind = "time" | "rocket" | "pulse" | "coins" | "heart" | "unlimited_lives";

export interface JourneyReward {
  level: number;
  kind: JourneyRewardKind;
  amount: number;
}

/**
 * The reference video's first-hundred reward cadence is preserved and reused
 * at +100 for the second hundred. This keeps every ten-level episode populated
 * without inventing another reward economy. `amount` is seconds only for
 * `unlimited_lives` and a direct inventory quantity for every other kind.
 */
const BASE_REWARD_PLAN: readonly [level: number, kind: JourneyRewardKind, amount: number][] = [
  [10, "coins", 50],
  [15, "unlimited_lives", 30 * 60],
  [25, "unlimited_lives", 60 * 60],
  [30, "pulse", 1],
  [35, "time", 1],
  [45, "rocket", 1],
  [50, "unlimited_lives", 30 * 60],
  [60, "pulse", 1],
  [65, "time", 1],
  [75, "rocket", 1],
  [80, "pulse", 1],
  [90, "unlimited_lives", 60 * 60],
  [95, "time", 1],
] as const;

const REWARD_PLAN: readonly [level: number, kind: JourneyRewardKind, amount: number][] = Array.from(
  { length: JOURNEY_LEVEL_COUNT / 100 },
  (_, cycle) => BASE_REWARD_PLAN.map(([level, kind, amount]) => [
    level + cycle * 100,
    kind,
    amount,
  ] as [number, JourneyRewardKind, number]),
).flat();

export const JOURNEY_MILESTONE_REWARDS: readonly JourneyReward[] = Object.freeze(
  REWARD_PLAN.map(([level, kind, amount]) => Object.freeze({
    level,
    kind,
    amount,
  })),
);

/** Milestone boundaries are owned by the explicit reward plan above. */
export const JOURNEY_MILESTONE_LEVELS: readonly number[] = Object.freeze(
  JOURNEY_MILESTONE_REWARDS.map((reward) => reward.level),
);

export interface JourneyProgressMemory {
  claimedMilestoneLevels: readonly number[];
  seenEpisodeUnlockLevels: readonly number[];
}

export type JourneyPendingEvent =
  | {
    type: "episode_unlock";
    level: number;
    episode: JourneyEpisode;
  }
  | {
    type: "milestone_reward";
    level: number;
    reward: JourneyReward;
  };

export const clampJourneyLevel = (value: unknown): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 1;
  return Math.max(1, Math.min(JOURNEY_LEVEL_COUNT, Math.floor(numeric)));
};

export const getJourneyEpisode = (highestLevel: unknown): JourneyEpisode => {
  const level = clampJourneyLevel(highestLevel);
  return JOURNEY_EPISODES.find((episode) => level <= episode.endLevel) ?? JOURNEY_EPISODES[JOURNEY_EPISODES.length - 1];
};

export const getJourneyEpisodeIndex = (highestLevel: unknown): number => getJourneyEpisode(highestLevel).index;

/**
 * Normalizes a persisted/selected theme and prevents navigating into a chapter
 * that the player's current Journey progress has not unlocked yet.
 */
export const sanitizeJourneyEpisodeIndex = (
  value: unknown,
  highestLevel: unknown,
): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 1;

  const requestedIndex = Math.max(1, Math.floor(numeric));
  const highestUnlockedIndex = JOURNEY_EPISODES
    .filter((episode) => episode.unlockLevel <= clampJourneyLevel(highestLevel))
    .at(-1)?.index ?? 1;
  return Math.min(requestedIndex, highestUnlockedIndex);
};

export const getJourneySegment = (level: unknown): JourneySegment => {
  const current = clampJourneyLevel(level);
  return JOURNEY_SEGMENTS.find((segment) => current <= segment.endLevel) ?? JOURNEY_SEGMENTS.at(-1)!;
};

// Three physical cards are visible in the supplied formal layout. These legacy
// visual anchors keep the selected level in the same familiar slot when Journey
// opens; continuous scrolling, rather than paging, exposes the other levels.
const JOURNEY_DEFAULT_ANCHORS = Object.freeze(JOURNEY_SEGMENTS.flatMap((segment) => [
  segment.startLevel,
  segment.startLevel + 3,
  segment.startLevel + 6,
  segment.endLevel - 2,
]));

export const getJourneyDefaultAnchorLevel = (level: unknown): number => {
  const current = clampJourneyLevel(level);
  const segment = getJourneySegment(current);
  return JOURNEY_DEFAULT_ANCHORS
    .filter((start) => start >= segment.startLevel && start <= segment.endLevel - 2 && start <= current)
    .at(-1) ?? segment.startLevel;
};

export const getJourneyReward = (milestoneLevel: unknown): JourneyReward | undefined => {
  const level = clampJourneyLevel(milestoneLevel);
  return JOURNEY_MILESTONE_REWARDS.find((reward) => reward.level === level);
};

const normalizeLevelSet = (
  values: unknown,
  allowedLevels: readonly number[],
): number[] => {
  if (!Array.isArray(values)) return [];
  const allowed = new Set(allowedLevels);
  return [...new Set(values
    .map(clampJourneyLevel)
    .filter((level) => allowed.has(level)))]
    .sort((left, right) => left - right);
};

export const sanitizeJourneyProgressMemory = (value: unknown): JourneyProgressMemory => {
  const candidate = value && typeof value === "object"
    ? value as Partial<Record<keyof JourneyProgressMemory, unknown>>
    : {};
  return {
    claimedMilestoneLevels: normalizeLevelSet(candidate.claimedMilestoneLevels, JOURNEY_MILESTONE_LEVELS),
    seenEpisodeUnlockLevels: normalizeLevelSet(candidate.seenEpisodeUnlockLevels, JOURNEY_EPISODE_UNLOCK_LEVELS),
  };
};

/**
 * Chooses one modal event. Episode introductions are chronological and always
 * take priority; after they are acknowledged, the newest reached unclaimed
 * milestone reward is returned.
 */
export const findPendingJourneyEvent = (
  highestLevel: unknown,
  memory: unknown,
  completedLevels?: readonly number[],
): JourneyPendingEvent | undefined => {
  const current = clampJourneyLevel(highestLevel);
  const safeMemory = sanitizeJourneyProgressMemory(memory);
  const seenEpisodes = new Set(safeMemory.seenEpisodeUnlockLevels);
  const episodeUnlock = JOURNEY_EPISODE_UNLOCK_LEVELS.find(
    (level) => level <= current && !seenEpisodes.has(level),
  );

  if (episodeUnlock !== undefined) {
    const episode = JOURNEY_EPISODES.find((item) => item.unlockLevel === episodeUnlock);
    if (episode) return { type: "episode_unlock", level: episodeUnlock, episode };
  }

  const claimed = new Set(safeMemory.claimedMilestoneLevels);
  const completed = completedLevels === undefined ? undefined : new Set(completedLevels);
  const reward = [...JOURNEY_MILESTONE_REWARDS]
    .reverse()
    .find((item) => (completed?.has(item.level) ?? item.level < current) && !claimed.has(item.level));
  return reward
    ? { type: "milestone_reward", level: reward.level, reward }
    : undefined;
};

/**
 * Legacy saves did not record Journey modal state. Treat every reward and
 * episode reached before migration as handled, preventing a cascade of old
 * unlock and claim popups on the first upgraded launch.
 */
export const deriveLegacyJourneyProgress = (
  highestLevel: unknown,
  completedLevels?: readonly number[],
): JourneyProgressMemory => {
  const current = clampJourneyLevel(highestLevel);
  const completed = completedLevels === undefined ? undefined : new Set(completedLevels);
  return {
    claimedMilestoneLevels: JOURNEY_MILESTONE_LEVELS.filter((level) => completed?.has(level) ?? level < current),
    seenEpisodeUnlockLevels: JOURNEY_EPISODE_UNLOCK_LEVELS.filter((level) => level <= current),
  };
};
