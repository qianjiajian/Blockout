import { describe, expect, it } from "vitest";
import { LEVELS } from "../src/core/levels";
import { MECHANISM_GUIDE } from "../src/core/mechanismCatalog";
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

describe("shipping mechanism guide", () => {
  it("lists every active mechanic once in atlas order without retired rules", () => {
    expect(MECHANISM_GUIDE).toHaveLength(11);
    expect(new Set(MECHANISM_GUIDE.map((item) => item.id)).size).toBe(MECHANISM_GUIDE.length);
    expect(new Set(MECHANISM_GUIDE.map((item) => item.title)).size).toBe(MECHANISM_GUIDE.length);
    expect(MECHANISM_GUIDE.map((item) => item.atlasIndex)).toEqual(Array.from({ length: 11 }, (_, index) => index));
    expect(MECHANISM_GUIDE.map((item) => item.id)).toEqual([
      "color-exit",
      "irregular-board",
      "irregular-block",
      "numeric-ice",
      "frozen-exit",
      "multilayer-shell",
      "generator",
      "elevator",
      "shutter",
      "conveyor",
      "star",
    ]);
    for (const item of MECHANISM_GUIDE) {
      expect(item.unlockLevel).toBeGreaterThanOrEqual(1);
      expect(item.unlockLevel).toBeLessThanOrEqual(LEVELS.length);
      expect(item.effect.length, item.id).toBeGreaterThanOrEqual(12);
      expect(item.effect.length, item.id).toBeLessThanOrEqual(35);
      expect(`${item.id}${item.title}${item.effect}`).not.toMatch(/钥匙|锁孔|箭头方块|双向箭头/);
    }
  });

  it("uses the first shipping appearance as each unlock milestone", () => {
    const actualFirstLevels: Record<string, number | undefined> = {
      "color-exit": firstLevelWith((level) => level.gates.length > 0),
      "irregular-board": firstLevelWith((level) => (level.playable?.length ?? level.width * level.height) < level.width * level.height),
      "irregular-block": firstLevelWith((level) => level.blocks.some(isIrregularBlock)),
      "numeric-ice": firstLevelWith((level) => level.blocks.some((block) => (block.frozen ?? 0) > 0)),
      "frozen-exit": firstLevelWith((level) => level.gates.some((gate) => (gate.frozen ?? 0) > 0)),
      "multilayer-shell": firstLevelWith((level) => level.blocks.some((block) => (block.layers?.length ?? 1) > 1)),
      generator: firstLevelWith((level) => level.shutters?.some((shutter) => shutter.skin === "generator") ?? false),
      elevator: firstLevelWith((level) => (level.elevators?.length ?? 0) > 0),
      shutter: firstLevelWith((level) => level.shutters?.some((shutter) => shutter.skin !== "generator") ?? false),
      conveyor: firstLevelWith((level) => (level.conveyors?.length ?? 0) > 0),
      star: firstLevelWith((level) => level.blocks.some((block) => block.star) || level.gates.some((gate) => gate.star)),
    };
    expect(Object.fromEntries(MECHANISM_GUIDE.map((item) => [item.id, item.unlockLevel]))).toEqual(actualFirstLevels);
  });

  it("provides staged one-shot explanations for every advanced rule", () => {
    expect(LEVELS.filter((level) => level.featureIntro).map((level) => [level.id, level.featureIntro?.kind])).toEqual([
      [6, "ice-block"],
      [7, "ice-door"],
      [8, "layer"],
      [35, "generator"],
      [50, "elevator"],
      [70, "conveyor"],
      [91, "star"],
    ]);
  });
});
