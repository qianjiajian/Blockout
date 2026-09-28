import { describe, expect, it } from "vitest";
import { LEVELS } from "../src/core/levels";
import { MECHANISM_GUIDE, MECHANISM_GUIDE_SAVE_IDS } from "../src/core/mechanismCatalog";
import { acknowledgeCollectionItem, pendingCollectionItemIds, sanitizeMetaDiscovery } from "../src/core/metaDiscovery";
import { getScheduledFeatureIntro } from "../src/game/featureIntroPolicy";
import type { BlockSpec, LevelSpec } from "../src/core/types";

const isIrregularBlock = (block: BlockSpec): boolean => {
  const xs = block.shape.map(([x]) => x);
  const ys = block.shape.map(([, y]) => y);
  const boundingArea = (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1);
  return block.shape.length < boundingArea;
};

const firstLevelWith = (predicate: (level: LevelSpec) => boolean): number | undefined => (
  LEVELS.find(predicate)?.id
);

const hasGenerator = (level: LevelSpec): boolean => (
  level.generators?.some((generator) => (generator.trigger ?? "move") === "move") ?? false
);

const hasPlayerShutter = (level: LevelSpec): boolean => (
  level.shutters?.some((shutter) => shutter.skin === undefined || shutter.skin === "shutter") ?? false
);

describe("shipping mechanism guide", () => {
  it("lists all 15 mechanics by unlock level while retaining their authored icon indexes", () => {
    expect(MECHANISM_GUIDE).toHaveLength(15);
    expect(new Set(MECHANISM_GUIDE.map((item) => item.id)).size).toBe(MECHANISM_GUIDE.length);
    expect(new Set(MECHANISM_GUIDE.map((item) => item.title)).size).toBe(MECHANISM_GUIDE.length);
    expect(MECHANISM_GUIDE.map((item) => item.atlasIndex)).toEqual([9, 10, 12, 11, 13, 14, 7, 0, 1, 2, 8, 3, 6, 4, 5]);
    expect(MECHANISM_GUIDE.map((item) => item.unlockLevel)).toEqual([1, 5, 6, 8, 10, 15, 20, 35, 50, 59, 65, 100, 120, 150, 200]);
    expect(MECHANISM_GUIDE_SAVE_IDS).toEqual([
      ...[...MECHANISM_GUIDE].sort((a, b) => a.atlasIndex - b.atlasIndex).map(({ id }) => id),
      "color-block", "timed-generator", "staged-frame",
    ]);
    expect(MECHANISM_GUIDE.map((item) => item.id)).toEqual([
      "color-exit",
      "irregular-block",
      "frozen-exit",
      "irregular-board",
      "numeric-ice",
      "multilayer-shell",
      "shutter",
      "generator",
      "axis-block",
      "key-lock",
      "layered-lift",
      "star",
      "bomb",
      "flip-door",
      "colored-grid",
    ]);
    expect(MECHANISM_GUIDE.map((item) => item.title)).toEqual([
      "普通出口", "异形色块", "冰冻出口", "异形棋盘", "数字冰块",
      "外壳块", "卷帘门", "色块生成器", "轴向块", "钥匙与锁",
      "升降台", "星标块、星门", "炸弹", "翻转门", "彩色地格",
    ]);
    for (const item of MECHANISM_GUIDE) {
      expect(item.unlockLevel).toBeGreaterThanOrEqual(1);
      expect(item.unlockLevel).toBeLessThanOrEqual(LEVELS.length);
      expect(item.effect.length, item.id).toBeGreaterThanOrEqual(12);
      expect(item.effect.length, item.id).toBeLessThanOrEqual(55);
    }
    expect(MECHANISM_GUIDE.map((item) => item.id)).not.toEqual(expect.arrayContaining(["elevator", "conveyor"]));
  });

  it("keeps the existing guide/actual-appearance differences explicit without moving mechanics", () => {
    const actualFirstLevels: Record<string, number | undefined> = {
      "color-exit": firstLevelWith((level) => level.gates.length > 0),
      "irregular-block": firstLevelWith((level) => level.blocks.some(isIrregularBlock)),
      "frozen-exit": firstLevelWith((level) => level.gates.some((gate) => (gate.frozen ?? 0) > 0)),
      "irregular-board": firstLevelWith((level) => (level.playable?.length ?? level.width * level.height) < level.width * level.height),
      "numeric-ice": firstLevelWith((level) => level.blocks.some((block) => (block.frozen ?? 0) > 0)),
      "multilayer-shell": firstLevelWith((level) => level.blocks.some((block) => (block.layers?.length ?? 1) > 1)),
      shutter: firstLevelWith(hasPlayerShutter),
      generator: firstLevelWith(hasGenerator),
      "axis-block": firstLevelWith((level) => level.blocks.some((block) => Boolean(block.movementAxis))),
      "key-lock": firstLevelWith((level) => level.blocks.some((block) => Boolean(block.keyId || block.lockedBy))),
      "layered-lift": firstLevelWith((level) => level.shutters?.some((shutter) => shutter.skin === "lift") ?? false),
      "flip-door": firstLevelWith((level) => Boolean(level.flipDoors?.length)),
      "colored-grid": firstLevelWith((level) => Boolean(level.coloredGrids?.length)),
      bomb: firstLevelWith((level) => level.blocks.some((block) => (block.timedBombSeconds ?? 0) > 0)),
      star: firstLevelWith((level) => level.blocks.some((block) => block.star) || level.gates.some((gate) => gate.star)),
    };
    // Popup scheduling is now independent. This task does not synchronize
    // either the guide or actual maps; pin their three pre-existing differences.
    expect(MECHANISM_GUIDE.flatMap((item) => item.unlockLevel === actualFirstLevels[item.id] ? [] : [{
      id: item.id, actual: actualFirstLevels[item.id], guide: item.unlockLevel,
    }])).toEqual([
      { id: "axis-block", actual: 35, guide: 50 },
      { id: "key-lock", actual: 43, guide: 59 },
      { id: "colored-grid", actual: 151, guide: 200 },
    ]);
  });

  it("does not expose internal staging batches as shutters or generators", () => {
    const levelsWithEarlyStaging = LEVELS.map((level) => level.id === 1 ? {
      ...level,
      shutters: [
        ...(level.shutters ?? []),
        { id: "internal-stage", x: 0, y: 0, width: 1, height: 1, count: 1, skin: "staging" as const },
      ],
    } : level);
    const firstGenerator = levelsWithEarlyStaging.find(hasGenerator)?.id;
    const firstShutter = levelsWithEarlyStaging.find(hasPlayerShutter)?.id;

    expect(firstGenerator).toBe(MECHANISM_GUIDE.find((item) => item.id === "generator")?.unlockLevel);
    expect(firstShutter).toBe(MECHANISM_GUIDE.find((item) => item.id === "shutter")?.unlockLevel);
  });

  it("uses the workbook popup schedule while preserving unused legacy level metadata", () => {
    expect(LEVELS.filter((level) => level.featureIntro).map((level) => [level.id, level.featureIntro?.kind])).toEqual([
      [6, "ice-door"],
      [10, "ice-block"],
      [15, "layer"],
      [20, "shutter"],
      [50, "arrow-block"],
      [59, "key-lock"],
      [65, "lift"],
      [73, "staged-frame"],
      [100, "star"],
    ]);
    expect(LEVELS.flatMap((level) => {
      const intro = getScheduledFeatureIntro(level.id);
      return intro ? [[level.id, intro.kind]] : [];
    })).toEqual([
      [6, "ice-door"], [10, "ice-block"], [15, "layer"], [20, "shutter"],
      [35, "generator"], [50, "arrow-block"], [60, "key-lock"], [65, "lift"],
      [100, "star"], [120, "bomb"], [150, "flip-door"], [200, "colored-grid"],
    ]);
  });

  it("keeps retired viewed ids without treating them as new mechanics", () => {
    const oldIds = ["color-block", "timed-generator", "staged-frame", "generator"];
    const state = sanitizeMetaDiscovery({
      collectionViewedThroughLevel: 200,
      collectionViewedItemIds: [...oldIds, "invalid-id"],
      dailyUnlockSeen: true,
    }, 200, true, 200, MECHANISM_GUIDE_SAVE_IDS);
    expect(state.collectionViewedItemIds).toEqual(oldIds);
    expect(pendingCollectionItemIds(state, MECHANISM_GUIDE)).toEqual(
      MECHANISM_GUIDE.filter(({ id }) => id !== "generator").map(({ id }) => id),
    );
    const bomb = MECHANISM_GUIDE.find(({ id }) => id === "bomb")!;
    const viewedBomb = acknowledgeCollectionItem(state, bomb, MECHANISM_GUIDE);
    expect(viewedBomb.collectionViewedItemIds).toEqual([...oldIds, "bomb"]);
    expect(pendingCollectionItemIds(viewedBomb, MECHANISM_GUIDE)).toContain("flip-door");
    expect(pendingCollectionItemIds(viewedBomb, MECHANISM_GUIDE)).toContain("colored-grid");
    expect(pendingCollectionItemIds(viewedBomb, MECHANISM_GUIDE)).not.toContain("bomb");
  });

  it("retains legacy watermark migration without replaying historical notifications", () => {
    const state = sanitizeMetaDiscovery({ collectionViewedThroughLevel: 200 }, 200, true, 200, MECHANISM_GUIDE_SAVE_IDS);
    expect(pendingCollectionItemIds(state, MECHANISM_GUIDE)).toEqual([]);
    expect(state.collectionViewedItemIds).toBeUndefined();
  });
});
