export interface MetaDiscoveryState {
  collectionViewedThroughLevel: number;
  dailyUnlockSeen: boolean;
}

export const DEFAULT_META_DISCOVERY: MetaDiscoveryState = {
  collectionViewedThroughLevel: 1,
  dailyUnlockSeen: false,
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === "object" && value !== null && !Array.isArray(value)
);

const boundedLevel = (value: unknown, fallback: number, maximumLevel: number): number => {
  if (typeof value !== "number" && typeof value !== "string") return fallback;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(1, Math.min(maximumLevel, Math.floor(numeric)));
};

/**
 * Legacy saves predate discovery prompts. Backfill already-unlocked milestones
 * as viewed so an update cannot replay a stack of historical notifications.
 */
export const sanitizeMetaDiscovery = (
  value: unknown,
  legacyCollectionLevel: number,
  legacyDailyUnlocked: boolean,
  maximumLevel: number,
): MetaDiscoveryState => {
  if (!isRecord(value)) {
    return {
      collectionViewedThroughLevel: boundedLevel(legacyCollectionLevel, 1, maximumLevel),
      dailyUnlockSeen: legacyDailyUnlocked,
    };
  }
  return {
    collectionViewedThroughLevel: boundedLevel(
      value.collectionViewedThroughLevel,
      boundedLevel(legacyCollectionLevel, 1, maximumLevel),
      maximumLevel,
    ),
    dailyUnlockSeen: typeof value.dailyUnlockSeen === "boolean"
      ? value.dailyUnlockSeen
      : legacyDailyUnlocked,
  };
};

export const pendingCollectionUnlockLevel = (
  state: MetaDiscoveryState,
  unlockedLevels: readonly number[],
): number | undefined => {
  const unseen = unlockedLevels.filter((level) => level > state.collectionViewedThroughLevel);
  return unseen.length ? Math.max(...unseen) : undefined;
};

export const acknowledgeCollectionUnlocks = (
  state: MetaDiscoveryState,
  unlockedLevels: readonly number[],
): MetaDiscoveryState => {
  const pending = pendingCollectionUnlockLevel(state, unlockedLevels);
  return pending == null ? state : { ...state, collectionViewedThroughLevel: pending };
};

export const dailyUnlockPending = (state: MetaDiscoveryState, dailyUnlocked: boolean): boolean => (
  dailyUnlocked && !state.dailyUnlockSeen
);

export const acknowledgeDailyUnlock = (state: MetaDiscoveryState): MetaDiscoveryState => (
  state.dailyUnlockSeen ? state : { ...state, dailyUnlockSeen: true }
);
