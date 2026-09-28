import { describe, expect, it } from "vitest";
import {
  collectionInspirationForResult,
  DEFAULT_COLLECTION_PROGRESS,
  deriveCollectionLevelCards,
  deriveCollectionMasterpieces,
  markCollectionItemsSeen,
  markCollectionMilestonesClaimed,
  masterpieceUnlockLevel,
  mergeCollectionProgress,
  migrateCollectionProgress,
  restoreCollectionMasterpiece,
  sanitizeCollectionProgress,
  summarizeCollectionProgress,
  type CollectionProgressCatalog,
} from "../src/core/collectionProgress";

const catalog: CollectionProgressCatalog = {
  levelCards: Array.from({ length: 20 }, (_, index) => ({
    id: `level-${String(index + 1).padStart(3, "0")}`,
    level: index + 1,
  })),
  masterpieces: [
    { id: "masterpiece-01", cost: 0 },
    { id: "masterpiece-02", cost: 8 },
    { id: "masterpiece-03", cost: 14 },
    { id: "masterpiece-04", cost: 23 },
  ],
  milestoneIds: ["cards-10", "cards-20", "paintings-4"],
};

const campaignThrough = (level: number, stars = 1) => ({
  rewardedLevels: Array.from({ length: level }, (_, index) => index + 1),
  bestStars: Object.fromEntries(
    Array.from({ length: level }, (_, index) => [String(index + 1), stars]),
  ),
});

describe("standalone collection progress", () => {
  it("derives owned level cards and one- to three-star frames from campaign records", () => {
    const cards = deriveCollectionLevelCards({
      rewardedLevels: [4, 1, 2, 2, 999, "3"],
      bestStars: { 1: 3, 2: 0, 3: 3, 4: "2", 999: 3 },
    }, catalog);

    expect(cards.slice(0, 5)).toMatchObject([
      { id: "level-001", obtained: true, frameStars: 3 },
      { id: "level-002", obtained: true, frameStars: 1 },
      { id: "level-003", obtained: false, frameStars: 0 },
      { id: "level-004", obtained: true, frameStars: 2 },
      { id: "level-005", obtained: false, frameStars: 0 },
    ]);
  });

  it("unlocks one fixed masterpiece blueprint every five completed levels", () => {
    expect(masterpieceUnlockLevel(0)).toBe(5);
    expect(masterpieceUnlockLevel(39)).toBe(200);

    const atNine = deriveCollectionMasterpieces(
      campaignThrough(9),
      DEFAULT_COLLECTION_PROGRESS,
      catalog,
    );
    expect(atNine.map(({ unlockLevel, blueprintUnlocked }) => ({ unlockLevel, blueprintUnlocked }))).toEqual([
      { unlockLevel: 5, blueprintUnlocked: true },
      { unlockLevel: 10, blueprintUnlocked: false },
      { unlockLevel: 15, blueprintUnlocked: false },
      { unlockLevel: 20, blueprintUnlocked: false },
    ]);

    expect(deriveCollectionMasterpieces(
      campaignThrough(10),
      DEFAULT_COLLECTION_PROGRESS,
      catalog,
    )[1]?.blueprintUnlocked).toBe(true);
  });

  it("sanitizes numeric progress and canonicalizes every id ledger against the injected catalog", () => {
    expect(sanitizeCollectionProgress({
      version: 99,
      inspiration: "12.9",
      restoredMasterpieceIds: ["unknown", "masterpiece-03", "masterpiece-01", "masterpiece-03", 7],
      seenItemIds: ["masterpiece-02", "level-002", "unknown", "level-002"],
      claimedMilestoneIds: ["cards-20", "unknown", "cards-10", "cards-20"],
    }, catalog)).toEqual({
      version: 1,
      inspiration: 12,
      restoredMasterpieceIds: ["masterpiece-01", "masterpiece-03"],
      seenItemIds: ["level-002", "masterpiece-02"],
      claimedMilestoneIds: ["cards-10", "cards-20"],
    });

    expect(sanitizeCollectionProgress({ inspiration: -5 }, catalog)).toEqual(DEFAULT_COLLECTION_PROGRESS);
  });

  it("migrates the unversioned prototype aliases into v1 without retaining unknown ids", () => {
    expect(migrateCollectionProgress({
      inspiration: 31,
      restoredIds: ["masterpiece-02", "removed-painting"],
      seenItems: ["level-004", "removed-card"],
      claimedMilestones: ["paintings-4", "removed-reward"],
    }, catalog)).toEqual({
      version: 1,
      inspiration: 31,
      restoredMasterpieceIds: ["masterpiece-02"],
      seenItemIds: ["level-004"],
      claimedMilestoneIds: ["paintings-4"],
    });
  });

  it("merges conflicts monotonically, canonically, and idempotently", () => {
    const left = {
      version: 1,
      inspiration: 20,
      restoredMasterpieceIds: ["masterpiece-03"],
      seenItemIds: ["level-002"],
      claimedMilestoneIds: ["cards-20"],
    };
    const right = {
      inspiration: 15,
      restoredIds: ["masterpiece-01", "unknown"],
      seenItems: ["masterpiece-02"],
      claimedMilestones: ["cards-10"],
    };
    const merged = mergeCollectionProgress(left, right, catalog);
    expect(merged).toEqual({
      version: 1,
      inspiration: 20,
      restoredMasterpieceIds: ["masterpiece-01", "masterpiece-03"],
      seenItemIds: ["level-002", "masterpiece-02"],
      claimedMilestoneIds: ["cards-10", "cards-20"],
    });
    expect(mergeCollectionProgress(merged, merged, catalog)).toEqual(merged);
    expect(mergeCollectionProgress(right, left, catalog)).toEqual(merged);
  });

  it("marks only known items and milestones and remains idempotent", () => {
    const seen = markCollectionItemsSeen(
      DEFAULT_COLLECTION_PROGRESS,
      ["masterpiece-02", "unknown", "level-002", "masterpiece-02"],
      catalog,
    );
    expect(seen.seenItemIds).toEqual(["level-002", "masterpiece-02"]);
    expect(markCollectionItemsSeen(seen, ["level-002"], catalog)).toEqual(seen);

    const claimed = markCollectionMilestonesClaimed(
      seen,
      ["cards-20", "unknown", "cards-10"],
      catalog,
    );
    expect(claimed.claimedMilestoneIds).toEqual(["cards-10", "cards-20"]);
    expect(markCollectionMilestonesClaimed(claimed, ["cards-20"], catalog)).toEqual(claimed);
  });

  it("restores only unlocked known masterpieces, spends once, and reports exact shortfalls", () => {
    const funded = { ...DEFAULT_COLLECTION_PROGRESS, inspiration: 10 };
    expect(restoreCollectionMasterpiece(funded, "removed", campaignThrough(20), catalog).status)
      .toBe("unknown-id");
    expect(restoreCollectionMasterpiece(funded, "masterpiece-02", campaignThrough(9), catalog).status)
      .toBe("locked");

    const insufficient = restoreCollectionMasterpiece(
      { ...DEFAULT_COLLECTION_PROGRESS, inspiration: 5 },
      "masterpiece-02",
      campaignThrough(10),
      catalog,
    );
    expect(insufficient).toMatchObject({
      status: "insufficient-inspiration",
      cost: 8,
      shortfall: 3,
    });
    expect(insufficient.save.inspiration).toBe(5);

    const restored = restoreCollectionMasterpiece(
      funded,
      "masterpiece-02",
      campaignThrough(10),
      catalog,
    );
    expect(restored).toMatchObject({ status: "restored", cost: 8, shortfall: 0 });
    expect(restored.save).toMatchObject({
      inspiration: 2,
      restoredMasterpieceIds: ["masterpiece-02"],
    });

    const repeated = restoreCollectionMasterpiece(
      restored.save,
      "masterpiece-02",
      campaignThrough(1),
      catalog,
    );
    expect(repeated.status).toBe("already-restored");
    expect(repeated.save).toEqual(restored.save);
  });

  it("supports a 200-card and 40-masterpiece catalog without storing derived campaign state", () => {
    const fullCatalog: CollectionProgressCatalog = {
      levelCards: Array.from({ length: 200 }, (_, index) => ({
        id: `card-${index + 1}`,
        level: index + 1,
      })),
      masterpieces: Array.from({ length: 40 }, (_, index) => ({
        id: `painting-${index + 1}`,
        cost: index === 0 ? 0 : 8,
      })),
      milestoneIds: [],
    };
    const summary = summarizeCollectionProgress(
      campaignThrough(200, 3),
      DEFAULT_COLLECTION_PROGRESS,
      fullCatalog,
    );
    expect(summary.obtainedLevelCardCount).toBe(200);
    expect(summary.levelCards.every(({ frameStars }) => frameStars === 3)).toBe(true);
    expect(summary.masterpieces).toHaveLength(40);
    expect(summary.masterpieces.at(-1)).toMatchObject({
      unlockLevel: 200,
      blueprintUnlocked: true,
    });
    expect(summary.save).toEqual(DEFAULT_COLLECTION_PROGRESS);
  });

  it("awards inspiration only for newly improved stars and first-clear chapter boundaries", () => {
    expect(collectionInspirationForResult(9, 0, 3, true)).toBe(3);
    expect(collectionInspirationForResult(9, 2, 3, false)).toBe(1);
    expect(collectionInspirationForResult(10, 0, 3, true)).toBe(5);
    expect(collectionInspirationForResult(10, 3, 3, true)).toBe(2);
    expect(collectionInspirationForResult(10, 3, 2, false)).toBe(0);
  });
});
