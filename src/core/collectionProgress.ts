export const COLLECTION_PROGRESS_VERSION = 1 as const;
export const MASTERPIECE_UNLOCK_INTERVAL = 5;

export interface CollectionLevelCardDefinition {
  readonly id: string;
  readonly level: number;
}

/**
 * Masterpieces are ordered by their permanent catalog position. Position zero
 * unlocks after level 5, position one after level 10, and so on.
 */
export interface CollectionMasterpieceDefinition {
  readonly id: string;
  readonly cost: number;
}

/**
 * The art/content catalog owns all stable ids and restoration prices. Keeping
 * it as an argument prevents this persistence module from depending on a UI or
 * asset catalog.
 */
export interface CollectionProgressCatalog {
  readonly levelCards: readonly CollectionLevelCardDefinition[];
  readonly masterpieces: readonly CollectionMasterpieceDefinition[];
  readonly milestoneIds: readonly string[];
}

export interface CollectionProgressSave {
  readonly version: typeof COLLECTION_PROGRESS_VERSION;
  readonly inspiration: number;
  readonly restoredMasterpieceIds: readonly string[];
  readonly seenItemIds: readonly string[];
  readonly claimedMilestoneIds: readonly string[];
}

export interface CollectionCampaignSnapshot {
  readonly rewardedLevels: unknown;
  readonly bestStars: unknown;
}

export type CollectionCardFrameStars = 0 | 1 | 2 | 3;

export interface CollectionLevelCardProgress extends CollectionLevelCardDefinition {
  readonly obtained: boolean;
  /** Zero means locked; obtained cards always use a one-, two-, or three-star frame. */
  readonly frameStars: CollectionCardFrameStars;
}

export interface CollectionMasterpieceProgress extends CollectionMasterpieceDefinition {
  readonly unlockLevel: number;
  readonly blueprintUnlocked: boolean;
  readonly restored: boolean;
}

export interface CollectionProgressSummary {
  readonly save: CollectionProgressSave;
  readonly levelCards: readonly CollectionLevelCardProgress[];
  readonly masterpieces: readonly CollectionMasterpieceProgress[];
  readonly obtainedLevelCardCount: number;
  readonly restoredMasterpieceCount: number;
}

export type RestoreMasterpieceStatus =
  | "restored"
  | "already-restored"
  | "locked"
  | "unknown-id"
  | "invalid-cost"
  | "insufficient-inspiration";

export interface RestoreMasterpieceResult {
  readonly status: RestoreMasterpieceStatus;
  readonly save: CollectionProgressSave;
  readonly cost: number;
  readonly shortfall: number;
}

/** New historical stars pay once; each newly completed ten-level chapter adds two. */
export const collectionInspirationForResult = (
  level: number,
  previousBestStars: number,
  earnedStars: number,
  firstClear: boolean,
): number => {
  const safeLevel = Number.isInteger(level) && level > 0 ? level : 0;
  const previous = Math.max(0, Math.min(3, Math.floor(Number(previousBestStars) || 0)));
  const earned = Math.max(0, Math.min(3, Math.floor(Number(earnedStars) || 0)));
  const starGain = Math.max(0, earned - previous);
  return starGain + (firstClear && safeLevel % 10 === 0 ? 2 : 0);
};

export const DEFAULT_COLLECTION_PROGRESS: CollectionProgressSave = Object.freeze({
  version: COLLECTION_PROGRESS_VERSION,
  inspiration: 0,
  restoredMasterpieceIds: Object.freeze([]),
  seenItemIds: Object.freeze([]),
  claimedMilestoneIds: Object.freeze([]),
});

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === "object" && value !== null && !Array.isArray(value)
);

const isStableId = (value: unknown): value is string => (
  typeof value === "string" && value.length > 0 && value.length <= 96
);

const safeNonNegativeInteger = (value: unknown): number => {
  if (typeof value !== "number" && typeof value !== "string") return 0;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.floor(numeric)));
};

const uniqueStableIds = (values: readonly unknown[]): string[] => {
  const unique = new Set<string>();
  values.forEach((value) => {
    if (isStableId(value)) unique.add(value);
  });
  return [...unique];
};

const normalizedLevelCards = (
  catalog: CollectionProgressCatalog,
): CollectionLevelCardDefinition[] => {
  const seenIds = new Set<string>();
  return catalog.levelCards.filter((card) => {
    if (!isStableId(card.id) || seenIds.has(card.id)) return false;
    if (!Number.isInteger(card.level) || card.level < 1) return false;
    seenIds.add(card.id);
    return true;
  });
};

const normalizedMasterpieces = (
  catalog: CollectionProgressCatalog,
): CollectionMasterpieceDefinition[] => {
  const seenIds = new Set<string>();
  return catalog.masterpieces.filter((masterpiece) => {
    if (!isStableId(masterpiece.id) || seenIds.has(masterpiece.id)) return false;
    seenIds.add(masterpiece.id);
    return true;
  });
};

const normalizedMilestoneIds = (catalog: CollectionProgressCatalog): string[] => (
  uniqueStableIds(catalog.milestoneIds)
);

const normalizedItemIds = (catalog: CollectionProgressCatalog): string[] => uniqueStableIds([
  ...normalizedLevelCards(catalog).map(({ id }) => id),
  ...normalizedMasterpieces(catalog).map(({ id }) => id),
]);

const canonicalKnownIds = (value: unknown, knownIds: readonly string[]): string[] => {
  if (!Array.isArray(value)) return [];
  const requested = new Set(value.filter(isStableId));
  return knownIds.filter((id) => requested.has(id));
};

const unionKnownIds = (
  left: readonly string[],
  right: readonly string[],
  knownIds: readonly string[],
): string[] => {
  const union = new Set([...left, ...right]);
  return knownIds.filter((id) => union.has(id));
};

const levelSet = (value: unknown, knownLevels: ReadonlySet<number>): Set<number> => {
  if (!Array.isArray(value)) return new Set();
  return new Set(value.filter((candidate): candidate is number => (
    typeof candidate === "number"
      && Number.isInteger(candidate)
      && knownLevels.has(candidate)
  )));
};

const normalizedBestStars = (value: unknown, level: number): CollectionCardFrameStars => {
  if (!isRecord(value)) return 1;
  const raw = value[String(level)];
  if (typeof raw !== "number" && typeof raw !== "string") return 1;
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) return 1;
  return Math.max(1, Math.min(3, Math.floor(numeric))) as 1 | 2 | 3;
};

/** Stamps any canonical or legacy prototype shape into the compact v1 form. */
export const migrateCollectionProgress = (
  value: unknown,
  catalog: CollectionProgressCatalog,
): CollectionProgressSave => {
  if (!isRecord(value)) return sanitizeCollectionProgress(value, catalog);
  const migrated = {
    version: COLLECTION_PROGRESS_VERSION,
    inspiration: value.inspiration,
    restoredMasterpieceIds: value.restoredMasterpieceIds
      ?? value.restoredMasterpieces
      ?? value.restoredIds,
    seenItemIds: value.seenItemIds ?? value.seenItems ?? value.seenIds,
    claimedMilestoneIds: value.claimedMilestoneIds
      ?? value.claimedMilestones
      ?? value.claimedIds,
  };
  return sanitizeCollectionProgress(migrated, catalog);
};

export const sanitizeCollectionProgress = (
  value: unknown,
  catalog: CollectionProgressCatalog,
): CollectionProgressSave => {
  const candidate = isRecord(value) ? value : {};
  return {
    version: COLLECTION_PROGRESS_VERSION,
    inspiration: safeNonNegativeInteger(candidate.inspiration),
    restoredMasterpieceIds: canonicalKnownIds(
      candidate.restoredMasterpieceIds,
      normalizedMasterpieces(catalog).map(({ id }) => id),
    ),
    seenItemIds: canonicalKnownIds(candidate.seenItemIds, normalizedItemIds(catalog)),
    claimedMilestoneIds: canonicalKnownIds(
      candidate.claimedMilestoneIds,
      normalizedMilestoneIds(catalog),
    ),
  };
};

/**
 * Monotonic conflict merge: unlocked/restored ledgers are unioned and a stale
 * copy can never lower the available inspiration balance.
 */
export const mergeCollectionProgress = (
  left: unknown,
  right: unknown,
  catalog: CollectionProgressCatalog,
): CollectionProgressSave => {
  const first = migrateCollectionProgress(left, catalog);
  const second = migrateCollectionProgress(right, catalog);
  const masterpieceIds = normalizedMasterpieces(catalog).map(({ id }) => id);
  const itemIds = normalizedItemIds(catalog);
  const milestoneIds = normalizedMilestoneIds(catalog);
  return {
    version: COLLECTION_PROGRESS_VERSION,
    inspiration: Math.max(first.inspiration, second.inspiration),
    restoredMasterpieceIds: unionKnownIds(
      first.restoredMasterpieceIds,
      second.restoredMasterpieceIds,
      masterpieceIds,
    ),
    seenItemIds: unionKnownIds(first.seenItemIds, second.seenItemIds, itemIds),
    claimedMilestoneIds: unionKnownIds(
      first.claimedMilestoneIds,
      second.claimedMilestoneIds,
      milestoneIds,
    ),
  };
};

export const markCollectionItemsSeen = (
  value: unknown,
  itemIds: readonly string[],
  catalog: CollectionProgressCatalog,
): CollectionProgressSave => {
  const save = migrateCollectionProgress(value, catalog);
  return {
    ...save,
    seenItemIds: unionKnownIds(save.seenItemIds, itemIds, normalizedItemIds(catalog)),
  };
};

export const markCollectionMilestonesClaimed = (
  value: unknown,
  milestoneIds: readonly string[],
  catalog: CollectionProgressCatalog,
): CollectionProgressSave => {
  const save = migrateCollectionProgress(value, catalog);
  return {
    ...save,
    claimedMilestoneIds: unionKnownIds(
      save.claimedMilestoneIds,
      milestoneIds,
      normalizedMilestoneIds(catalog),
    ),
  };
};

export const deriveCollectionLevelCards = (
  snapshot: CollectionCampaignSnapshot,
  catalog: CollectionProgressCatalog,
): CollectionLevelCardProgress[] => {
  const cards = normalizedLevelCards(catalog);
  const rewarded = levelSet(snapshot.rewardedLevels, new Set(cards.map(({ level }) => level)));
  return cards.map((card) => {
    const obtained = rewarded.has(card.level);
    return {
      ...card,
      obtained,
      frameStars: obtained ? normalizedBestStars(snapshot.bestStars, card.level) : 0,
    };
  });
};

export const masterpieceUnlockLevel = (catalogIndex: number): number => (
  (Math.max(0, Math.floor(catalogIndex)) + 1) * MASTERPIECE_UNLOCK_INTERVAL
);

const highestObtainedLevel = (
  snapshot: CollectionCampaignSnapshot,
  catalog: CollectionProgressCatalog,
): number => deriveCollectionLevelCards(snapshot, catalog).reduce(
  (highest, card) => card.obtained ? Math.max(highest, card.level) : highest,
  0,
);

export const deriveCollectionMasterpieces = (
  snapshot: CollectionCampaignSnapshot,
  value: unknown,
  catalog: CollectionProgressCatalog,
): CollectionMasterpieceProgress[] => {
  const save = migrateCollectionProgress(value, catalog);
  const restoredIds = new Set(save.restoredMasterpieceIds);
  const completedThrough = highestObtainedLevel(snapshot, catalog);
  return normalizedMasterpieces(catalog).map((masterpiece, index) => ({
    ...masterpiece,
    unlockLevel: masterpieceUnlockLevel(index),
    blueprintUnlocked: completedThrough >= masterpieceUnlockLevel(index),
    restored: restoredIds.has(masterpiece.id),
  }));
};

export const summarizeCollectionProgress = (
  snapshot: CollectionCampaignSnapshot,
  value: unknown,
  catalog: CollectionProgressCatalog,
): CollectionProgressSummary => {
  const save = migrateCollectionProgress(value, catalog);
  const levelCards = deriveCollectionLevelCards(snapshot, catalog);
  const masterpieces = deriveCollectionMasterpieces(snapshot, save, catalog);
  return {
    save,
    levelCards,
    masterpieces,
    obtainedLevelCardCount: levelCards.filter(({ obtained }) => obtained).length,
    restoredMasterpieceCount: masterpieces.filter(({ restored }) => restored).length,
  };
};

export const restoreCollectionMasterpiece = (
  value: unknown,
  masterpieceId: string,
  snapshot: CollectionCampaignSnapshot,
  catalog: CollectionProgressCatalog,
): RestoreMasterpieceResult => {
  const save = migrateCollectionProgress(value, catalog);
  const masterpieces = normalizedMasterpieces(catalog);
  const index = masterpieces.findIndex(({ id }) => id === masterpieceId);
  if (index < 0) {
    return { status: "unknown-id", save, cost: 0, shortfall: 0 };
  }

  const masterpiece = masterpieces[index]!;
  const rawCost = masterpiece.cost;
  if (!Number.isFinite(rawCost) || rawCost < 0 || !Number.isInteger(rawCost)) {
    return { status: "invalid-cost", save, cost: 0, shortfall: 0 };
  }
  const cost = Math.min(Number.MAX_SAFE_INTEGER, rawCost);

  // A completed restoration remains authoritative even if an older campaign
  // snapshot is loaded alongside it.
  if (save.restoredMasterpieceIds.includes(masterpieceId)) {
    return { status: "already-restored", save, cost, shortfall: 0 };
  }

  if (highestObtainedLevel(snapshot, catalog) < masterpieceUnlockLevel(index)) {
    return { status: "locked", save, cost, shortfall: 0 };
  }
  if (save.inspiration < cost) {
    return {
      status: "insufficient-inspiration",
      save,
      cost,
      shortfall: cost - save.inspiration,
    };
  }

  const masterpieceIds = masterpieces.map(({ id }) => id);
  return {
    status: "restored",
    save: {
      ...save,
      inspiration: save.inspiration - cost,
      restoredMasterpieceIds: unionKnownIds(
        save.restoredMasterpieceIds,
        [masterpieceId],
        masterpieceIds,
      ),
    },
    cost,
    shortfall: 0,
  };
};
