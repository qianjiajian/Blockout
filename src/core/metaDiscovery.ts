export interface MetaDiscoveryState {
  collectionViewedThroughLevel: number;
  /**
   * Stable Collection item ids the player has explicitly opened. When this
   * field is absent, the legacy level watermark remains the migration source.
   */
  collectionViewedItemIds?: readonly string[];
  /** Retained only so schema-v1 saves normalize without replaying removed prompts. */
  dailyUnlockSeen: boolean;
}

export interface CollectionDiscoveryItem {
  readonly id: string;
  readonly unlockLevel: number;
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
  knownCollectionItemIds?: readonly string[],
): MetaDiscoveryState => {
  if (!isRecord(value)) {
    return {
      collectionViewedThroughLevel: boundedLevel(legacyCollectionLevel, 1, maximumLevel),
      dailyUnlockSeen: legacyDailyUnlocked,
    };
  }
  const normalized: MetaDiscoveryState = {
    collectionViewedThroughLevel: boundedLevel(
      value.collectionViewedThroughLevel,
      boundedLevel(legacyCollectionLevel, 1, maximumLevel),
      maximumLevel,
    ),
    dailyUnlockSeen: typeof value.dailyUnlockSeen === "boolean"
      ? value.dailyUnlockSeen
      : legacyDailyUnlocked,
  };
  if (!Array.isArray(value.collectionViewedItemIds)) return normalized;

  const knownIds = knownCollectionItemIds ? new Set(knownCollectionItemIds) : undefined;
  const collectionViewedItemIds = [...new Set(value.collectionViewedItemIds.filter((id): id is string => (
    typeof id === "string"
      && id.length > 0
      && id.length <= 64
      && (!knownIds || knownIds.has(id))
  )))].slice(0, 64);
  return { ...normalized, collectionViewedItemIds };
};

/**
 * Explicit item ids become authoritative as soon as the first Collection card
 * is opened. Before that, legacy saves keep using their historical watermark.
 */
export const collectionItemHasBeenViewed = (
  state: MetaDiscoveryState,
  item: CollectionDiscoveryItem,
): boolean => state.collectionViewedItemIds != null
  ? state.collectionViewedItemIds.includes(item.id)
  : item.unlockLevel <= state.collectionViewedThroughLevel;

export const pendingCollectionItemIds = (
  state: MetaDiscoveryState,
  unlockedItems: readonly CollectionDiscoveryItem[],
): string[] => unlockedItems
  .filter((item) => !collectionItemHasBeenViewed(state, item))
  .map((item) => item.id);

export const acknowledgeCollectionItem = (
  state: MetaDiscoveryState,
  item: CollectionDiscoveryItem,
  allItems: readonly CollectionDiscoveryItem[],
): MetaDiscoveryState => {
  if (collectionItemHasBeenViewed(state, item)) return state;
  const viewedBeforeExplicitTracking = state.collectionViewedItemIds ?? allItems
    .filter((candidate) => candidate.unlockLevel <= state.collectionViewedThroughLevel)
    .map((candidate) => candidate.id);
  return {
    ...state,
    collectionViewedThroughLevel: Math.max(state.collectionViewedThroughLevel, item.unlockLevel),
    collectionViewedItemIds: [...new Set([...viewedBeforeExplicitTracking, item.id])].slice(0, 64),
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
