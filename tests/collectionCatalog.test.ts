import { describe, expect, it } from "vitest";
import { LEVELS } from "../src/core/levels";
import {
  COLLECTION_CATALOG,
  COLLECTION_PAGE_SIZE,
  LEVEL_COLLECTION_ARTWORK_TITLES_ZH,
  LEVEL_COLLECTION_CATALOG,
  MASTERPIECE_COLLECTION_ARTWORK_TITLES_ZH,
  MASTERPIECE_COLLECTION_CATALOG,
  buildLevelCollectionCatalog,
  collectionCatalogFor,
  collectionItemIsCollected,
  findCollectionCatalogItem,
  getCollectionCatalogPage,
  levelCollectionArtworkTitleZh,
  masterpieceCollectionArtworkTitleZh,
  paginateCollectionItems,
  summarizeCollectionProgress,
} from "../src/core/collectionCatalog";

describe("standalone collection catalogue", () => {
  it("derives one stable level keepsake from every shipping level", () => {
    expect(LEVEL_COLLECTION_CATALOG).toHaveLength(LEVELS.length);
    expect(LEVEL_COLLECTION_CATALOG.map(({ levelId }) => levelId)).toEqual(
      [...LEVELS].sort((left, right) => left.id - right.id).map(({ id }) => id),
    );
    expect(new Set(LEVEL_COLLECTION_CATALOG.map(({ id }) => id)).size).toBe(LEVELS.length);

    for (const card of LEVEL_COLLECTION_CATALOG) {
      const source = LEVELS.find((level) => level.id === card.levelId);
      expect(source).toBeDefined();
      expect(card).toMatchObject({
        id: `level-${String(card.levelId).padStart(3, "0")}`,
        category: "level",
        unlockLevel: card.levelId,
        chapter: Math.floor((card.levelId - 1) / 10) + 1,
        difficulty: source?.difficulty,
      });
      expect(card.titleKey).toBe(`collectionCatalog.level.${String(card.levelId).padStart(3, "0")}.title`);
      expect(card.descriptionKey).toBe(`collectionCatalog.level.${String(card.levelId).padStart(3, "0")}.description`);
      expect(card.defaultTitleZh).toContain(source?.name);
      expect(card.defaultDescriptionZh).toContain(`第${card.levelId}关`);
      expect(card.themeColor).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it("builds deterministically, sorts by level id, and rejects unstable source ids", () => {
    const subset = [LEVELS[9], LEVELS[0], LEVELS[4]];
    const before = subset.map(({ id }) => id);
    const first = buildLevelCollectionCatalog(subset);
    const second = buildLevelCollectionCatalog(subset);
    expect(first).toEqual(second);
    expect(first.map(({ levelId }) => levelId)).toEqual([1, 5, 10]);
    expect(subset.map(({ id }) => id)).toEqual(before);
    expect(Object.isFrozen(first)).toBe(true);
    expect(first.every(Object.isFrozen)).toBe(true);

    expect(() => buildLevelCollectionCatalog([LEVELS[0], { ...LEVELS[0] }])).toThrow(/Duplicate/);
    expect(() => buildLevelCollectionCatalog([{ ...LEVELS[0], id: 0 }])).toThrow(/positive safe integer/);
  });

  it("uses picture titles in the album instead of level and generator metadata", () => {
    expect(levelCollectionArtworkTitleZh({
      levelId: 24,
      defaultTitleZh: "第24关 · 隐藏航道 S-handle mechanism room",
    })).toBe("风车麦田");
    expect(levelCollectionArtworkTitleZh({
      levelId: 99,
      defaultTitleZh: "第99关 · 最终回路 · 轴向可解种子",
    })).toBe("鎏金瀑谷");
    expect(levelCollectionArtworkTitleZh({
      levelId: 42,
      defaultTitleZh: "第42关 · 金色港湾 · 轴向可解种子",
    })).toBe("海岸遗城");
    expect(levelCollectionArtworkTitleZh({
      levelId: 3,
      defaultTitleZh: "第3关 · 隐藏轨道 S-handle mechanism room",
    })).toBe("冰晶宫");
    expect(LEVEL_COLLECTION_CATALOG.every((card) => levelCollectionArtworkTitleZh(card) === LEVEL_COLLECTION_ARTWORK_TITLES_ZH[card.levelId])).toBe(true);
    expect(masterpieceCollectionArtworkTitleZh({
      catalogNumber: 1,
      defaultTitleZh: "晨雾花园",
    })).toBe("海岬灯塔");
    expect(MASTERPIECE_COLLECTION_CATALOG.every((card) => masterpieceCollectionArtworkTitleZh(card) === MASTERPIECE_COLLECTION_ARTWORK_TITLES_ZH[card.catalogNumber])).toBe(true);
  });

  it("defines forty original masterpiece entries at five-level milestones", () => {
    expect(MASTERPIECE_COLLECTION_CATALOG).toHaveLength(40);
    expect(MASTERPIECE_COLLECTION_CATALOG.map(({ unlockLevel }) => unlockLevel)).toEqual(
      Array.from({ length: 40 }, (_, index) => (index + 1) * 5),
    );
    expect(MASTERPIECE_COLLECTION_CATALOG.at(-1)?.unlockLevel).toBeLessThanOrEqual(LEVELS.length);
    expect(new Set(MASTERPIECE_COLLECTION_CATALOG.map(({ id }) => id)).size).toBe(40);
    expect(new Set(MASTERPIECE_COLLECTION_CATALOG.map(({ defaultTitleZh }) => defaultTitleZh)).size).toBe(40);

    for (const card of MASTERPIECE_COLLECTION_CATALOG) {
      expect(card.id).toBe(`masterpiece-${String(card.catalogNumber).padStart(2, "0")}`);
      expect(card.category).toBe("masterpiece");
      expect(card.provenance).toBe("original");
      expect(card.visualTheme).toBe("gallery");
      expect(card.chapter).toBe(Math.floor((card.unlockLevel - 1) / 10) + 1);
      expect(card.inspirationCost).toBeGreaterThanOrEqual(0);
      expect(card.defaultTitleZh.length).toBeGreaterThan(2);
      expect(card.defaultArtistZh.length).toBeGreaterThan(1);
      expect(card.defaultEraZh.length).toBeGreaterThan(3);
      expect(card.themeColor).toMatch(/^#[0-9A-F]{6}$/);
      expect(Object.keys(card).some((key) => /image|asset|url|path/i.test(key))).toBe(false);
    }

    const rarityCounts = Object.fromEntries(["common", "rare", "epic", "legendary"].map((rarity) => [
      rarity,
      MASTERPIECE_COLLECTION_CATALOG.filter((card) => card.rarity === rarity).length,
    ]));
    expect(rarityCounts).toEqual({ common: 16, rare: 12, epic: 8, legendary: 4 });
    expect(MASTERPIECE_COLLECTION_CATALOG[0]?.inspirationCost).toBe(0);
    expect(MASTERPIECE_COLLECTION_CATALOG.reduce((sum, card) => sum + card.inspirationCost, 0)).toBe(604);
  });

  it("keeps the new catalogues independent from the existing mechanic guide", () => {
    expect(collectionCatalogFor("level")).toBe(LEVEL_COLLECTION_CATALOG);
    expect(collectionCatalogFor("masterpiece")).toBe(MASTERPIECE_COLLECTION_CATALOG);
    expect(COLLECTION_CATALOG).toHaveLength(LEVELS.length + 40);
    expect(COLLECTION_CATALOG.every((item) => item.category === "level" || item.category === "masterpiece")).toBe(true);
    expect(findCollectionCatalogItem("level-001")).toBe(LEVEL_COLLECTION_CATALOG[0]);
    expect(findCollectionCatalogItem("masterpiece-40")).toBe(MASTERPIECE_COLLECTION_CATALOG[39]);
    expect(findCollectionCatalogItem("color-block")).toBeUndefined();
  });

  it("paginates nine cards per page and clamps hostile page requests", () => {
    expect(COLLECTION_PAGE_SIZE).toBe(9);
    const first = getCollectionCatalogPage("masterpiece", 1);
    expect(first).toMatchObject({
      page: 1,
      pageSize: 9,
      totalItems: 40,
      totalPages: 5,
      startIndex: 0,
      endIndexExclusive: 9,
      hasPrevious: false,
      hasNext: true,
    });
    expect(first.items).toHaveLength(9);

    const last = getCollectionCatalogPage("masterpiece", 999);
    expect(last).toMatchObject({
      page: 5,
      startIndex: 36,
      endIndexExclusive: 40,
      hasPrevious: true,
      hasNext: false,
    });
    expect(last.items).toHaveLength(4);
    expect(getCollectionCatalogPage("masterpiece", -8).page).toBe(1);
    expect(getCollectionCatalogPage("masterpiece", Number.NaN).page).toBe(1);
    expect(paginateCollectionItems([], 3)).toEqual({
      page: 0,
      pageSize: 9,
      totalItems: 0,
      totalPages: 0,
      startIndex: 0,
      endIndexExclusive: 0,
      hasPrevious: false,
      hasNext: false,
      items: [],
    });
  });

  it("computes collected, viewed, and new counts from exact durable clears", () => {
    const completedLevelIds = [1, 2, 5, 10, 10, -1, 2.5];
    const levelSummary = summarizeCollectionProgress(LEVEL_COLLECTION_CATALOG, {
      completedLevelIds,
      viewedItemIds: ["level-001", "level-005", "level-999"],
    });
    expect(levelSummary).toMatchObject({
      total: LEVELS.length,
      collected: 4,
      locked: LEVELS.length - 4,
      viewed: 2,
      newCount: 2,
      completionRatio: 4 / LEVELS.length,
    });
    expect(levelSummary.collectedIds).toEqual(["level-001", "level-002", "level-005", "level-010"]);
    expect(levelSummary.newItemIds).toEqual(["level-002", "level-010"]);

    const masterpieceSummary = summarizeCollectionProgress(MASTERPIECE_COLLECTION_CATALOG, {
      completedLevelIds,
      viewedItemIds: ["masterpiece-01", "masterpiece-99"],
    });
    expect(masterpieceSummary).toMatchObject({
      total: 40,
      collected: 2,
      locked: 38,
      viewed: 1,
      newCount: 1,
      completionRatio: 2 / 40,
    });
    expect(masterpieceSummary.collectedIds).toEqual(["masterpiece-01", "masterpiece-02"]);
    expect(collectionItemIsCollected(MASTERPIECE_COLLECTION_CATALOG[1], completedLevelIds)).toBe(true);
    expect(collectionItemIsCollected(MASTERPIECE_COLLECTION_CATALOG[2], completedLevelIds)).toBe(false);
  });
});
