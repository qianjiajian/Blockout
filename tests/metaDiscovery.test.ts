import { describe, expect, it } from "vitest";
import {
  DEFAULT_META_DISCOVERY,
  acknowledgeCollectionItem,
  acknowledgeCollectionUnlocks,
  collectionItemHasBeenViewed,
  pendingCollectionItemIds,
  pendingCollectionUnlockLevel,
  sanitizeMetaDiscovery,
} from "../src/core/metaDiscovery";

const collectionItems = [
  { id: "color-block", unlockLevel: 1 },
  { id: "irregular-block", unlockLevel: 3 },
  { id: "shutter", unlockLevel: 34 },
  { id: "conveyor", unlockLevel: 70 },
] as const;

describe("meta discovery milestones", () => {
  it("reveals only newly unlocked collection milestones", () => {
    expect(pendingCollectionUnlockLevel(DEFAULT_META_DISCOVERY, [1, 1, 1])).toBeUndefined();
    expect(pendingCollectionUnlockLevel(DEFAULT_META_DISCOVERY, [1, 3])).toBe(3);
    const viewed = acknowledgeCollectionUnlocks(DEFAULT_META_DISCOVERY, [1, 3]);
    expect(viewed.collectionViewedThroughLevel).toBe(3);
    expect(pendingCollectionUnlockLevel(viewed, [1, 3])).toBeUndefined();
    expect(pendingCollectionUnlockLevel(viewed, [1, 3, 6, 10])).toBe(10);
  });

  it("coalesces duplicate items at one milestone and never moves its watermark backward", () => {
    const viewedTen = acknowledgeCollectionUnlocks(
      { collectionViewedThroughLevel: 6, dailyUnlockSeen: false },
      [1, 3, 6, 10, 10],
    );
    expect(viewedTen).toEqual({ collectionViewedThroughLevel: 10, dailyUnlockSeen: false });
    expect(acknowledgeCollectionUnlocks(viewedTen, [1, 3, 6])).toBe(viewedTen);
  });

  it("supports every authored aggregate-block and mechanism threshold", () => {
    const thresholds = [3, 6, 8, 10, 15, 34, 35, 50, 70, 91];
    let state = { ...DEFAULT_META_DISCOVERY };
    for (const threshold of thresholds) {
      expect(pendingCollectionUnlockLevel(state, [1, threshold])).toBe(threshold);
      state = acknowledgeCollectionUnlocks(state, [1, threshold]);
      expect(state).toEqual({ collectionViewedThroughLevel: threshold, dailyUnlockSeen: false });
    }
  });

  it("tracks newly unlocked Collection entries by stable item id", () => {
    const unlocked = collectionItems.slice(0, 2);
    expect(pendingCollectionItemIds(DEFAULT_META_DISCOVERY, unlocked)).toEqual(["irregular-block"]);

    const viewed = acknowledgeCollectionItem(DEFAULT_META_DISCOVERY, unlocked[1], collectionItems);
    expect(viewed).toEqual({
      collectionViewedThroughLevel: 3,
      collectionViewedItemIds: ["color-block", "irregular-block"],
      dailyUnlockSeen: false,
    });
    expect(pendingCollectionItemIds(viewed, unlocked)).toEqual([]);
    expect(acknowledgeCollectionItem(viewed, unlocked[1], collectionItems)).toBe(viewed);
  });

  it("clears same-level Collection entries independently", () => {
    const sameLevelItems = [
      { id: "foundation", unlockLevel: 1 },
      { id: "shared-a", unlockLevel: 70 },
      { id: "shared-b", unlockLevel: 70 },
    ] as const;
    const legacyState = { collectionViewedThroughLevel: 69, dailyUnlockSeen: false };
    const first = acknowledgeCollectionItem(legacyState, sameLevelItems[1], sameLevelItems);
    expect(pendingCollectionItemIds(first, sameLevelItems)).toEqual(["shared-b"]);
    expect(collectionItemHasBeenViewed(first, sameLevelItems[1])).toBe(true);
    expect(collectionItemHasBeenViewed(first, sameLevelItems[2])).toBe(false);

    const second = acknowledgeCollectionItem(first, sameLevelItems[2], sameLevelItems);
    expect(pendingCollectionItemIds(second, sameLevelItems)).toEqual([]);
  });

  it("uses an explicit item list as authoritative after migrating", () => {
    const partiallyViewed = {
      collectionViewedThroughLevel: 70,
      collectionViewedItemIds: ["color-block", "shutter"],
      dailyUnlockSeen: true,
    };
    expect(pendingCollectionItemIds(partiallyViewed, collectionItems)).toEqual([
      "irregular-block",
      "conveyor",
    ]);
  });

  it("backfills missing legacy fields without replaying historical unlocks", () => {
    expect(sanitizeMetaDiscovery(undefined, 15, true, 100)).toEqual({
      collectionViewedThroughLevel: 15,
      dailyUnlockSeen: true,
    });
    expect(sanitizeMetaDiscovery({}, 10, true, 100)).toEqual({
      collectionViewedThroughLevel: 10,
      dailyUnlockSeen: true,
    });
  });

  it("preserves explicit fresh state and clamps corrupt progress", () => {
    expect(sanitizeMetaDiscovery(DEFAULT_META_DISCOVERY, 1, false, 100)).toEqual(DEFAULT_META_DISCOVERY);
    expect(sanitizeMetaDiscovery({
      collectionViewedThroughLevel: 999,
      dailyUnlockSeen: false,
    }, 1, true, 100)).toEqual({
      collectionViewedThroughLevel: 100,
      dailyUnlockSeen: false,
    });
    expect(sanitizeMetaDiscovery({
      collectionViewedThroughLevel: -8,
      dailyUnlockSeen: "yes",
    }, 35, true, 100)).toEqual({
      collectionViewedThroughLevel: 1,
      dailyUnlockSeen: true,
    });
    expect(sanitizeMetaDiscovery({
      collectionViewedThroughLevel: Number.NaN,
      dailyUnlockSeen: false,
    }, 51, true, 100)).toEqual({
      collectionViewedThroughLevel: 51,
      dailyUnlockSeen: false,
    });
  });

  it("sanitizes, deduplicates, and preserves an explicit viewed-item ledger", () => {
    expect(sanitizeMetaDiscovery({
      collectionViewedThroughLevel: 70,
      collectionViewedItemIds: ["shutter", "unknown", "shutter", 42, "conveyor"],
      dailyUnlockSeen: true,
    }, 1, false, 100, collectionItems.map(({ id }) => id))).toEqual({
      collectionViewedThroughLevel: 70,
      collectionViewedItemIds: ["shutter", "conveyor"],
      dailyUnlockSeen: true,
    });
    expect(sanitizeMetaDiscovery({
      collectionViewedThroughLevel: 70,
      collectionViewedItemIds: [],
      dailyUnlockSeen: false,
    }, 1, false, 100, collectionItems.map(({ id }) => id)).collectionViewedItemIds).toEqual([]);
  });
});
