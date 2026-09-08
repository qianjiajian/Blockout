import { describe, expect, it } from "vitest";
import {
  DEFAULT_META_DISCOVERY,
  acknowledgeCollectionUnlocks,
  acknowledgeDailyUnlock,
  dailyUnlockPending,
  pendingCollectionUnlockLevel,
  sanitizeMetaDiscovery,
} from "../src/core/metaDiscovery";

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

  it("supports every authored collection threshold without touching daily state", () => {
    const thresholds = [3, 6, 10, 15, 31, 35, 51, 100];
    let state = { ...DEFAULT_META_DISCOVERY };
    for (const threshold of thresholds) {
      expect(pendingCollectionUnlockLevel(state, [1, threshold])).toBe(threshold);
      state = acknowledgeCollectionUnlocks(state, [1, threshold]);
      expect(state).toEqual({ collectionViewedThroughLevel: threshold, dailyUnlockSeen: false });
    }
  });

  it("reveals daily exactly once after it becomes available", () => {
    expect(dailyUnlockPending(DEFAULT_META_DISCOVERY, false)).toBe(false);
    expect(dailyUnlockPending(DEFAULT_META_DISCOVERY, true)).toBe(true);
    const viewed = acknowledgeDailyUnlock(DEFAULT_META_DISCOVERY);
    expect(dailyUnlockPending(viewed, true)).toBe(false);
    expect(viewed.collectionViewedThroughLevel).toBe(1);
    expect(acknowledgeDailyUnlock(viewed)).toBe(viewed);
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
});
