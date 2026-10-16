import { describe, expect, it, vi } from "vitest";
import { getLevel } from "../src/core/levels";
import type { LevelSpec } from "../src/core/types";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";

function fixture(level: LevelSpec) {
  const game = Object.create(ColorEscapeGame.prototype) as any;
  game.model = { level };
  return game;
}

const inventory = (): LevelSpec => ({
  ...getLevel(21),
  blocks: [
    { id: "single", color: "red", x: 0, y: 0, shape: [[0, 0]], frozen: 3 },
    { id: "hidden-shell", color: "blue", layers: ["blue", "red"], shutterId: "curtain", x: 0, y: 0,
      shape: [[0, 0], [0, 1]], frozen: 4 },
    { id: "queue", color: "green", x: 0, y: 0, shape: [[0, 0], [1, 0]], frozen: 2 },
    { id: "duplicate", color: "green", x: 0, y: 0, shape: [[0, 0], [1, 0]], frozen: 2 },
  ],
  generators: [{ id: "machine", side: "top", offset: 0, spawn: [0, 0], queueBlockIds: ["queue"] }],
});

describe("formal artwork plans retain only the current authored inventory", () => {
  it("includes hidden shells, inner colors and queued ice without duplicate or permanent-single requests", () => {
    const game = fixture(inventory());
    const blockPlan = game.formalBlockAssetPlan();
    expect(blockPlan.requests.map(({ kind, color, shapeId }: any) => `${kind}:${color}:${shapeId}`).sort()).toEqual([
      "shell:blue:2", "solid:blue:2", "solid:green:8", "solid:red:2",
    ]);
    expect(new Set(blockPlan.requests.map(({ path }: any) => path)).size).toBe(4);
    expect(game.formalIceAssetPlan().requests.map(({ shapeId }: any) => shapeId)).toEqual([2, 8]);
  });

  it("does not rescan authored blocks on successive frames or after resetting the same level", () => {
    const level = inventory();
    const blocks = level.blocks;
    const readBlocks = vi.fn(() => blocks);
    Object.defineProperty(level, "blocks", { get: readBlocks });
    const game = fixture(level);
    const blockPlan = game.formalBlockAssetPlan();
    const icePlan = game.formalIceAssetPlan();
    expect(readBlocks).toHaveBeenCalledTimes(2);
    for (let frame = 0; frame < 120; frame++) {
      expect(game.formalBlockAssetPlan()).toBe(blockPlan);
      expect(game.formalIceAssetPlan()).toBe(icePlan);
    }
    game.model = { level };
    expect(game.formalBlockAssetPlan()).toBe(blockPlan);
    expect(game.formalIceAssetPlan()).toBe(icePlan);
    expect(readBlocks).toHaveBeenCalledTimes(2);
  });

  it("rebuilds for a replacement layout even when its level number is unchanged", () => {
    const oldLevel = inventory();
    const game = fixture(oldLevel);
    const previous = game.formalBlockAssetPlan();
    game.formalIceAssetPlan();
    const next: LevelSpec = { ...oldLevel, blocks: [
      { id: "new", color: "yellow", x: 0, y: 0, shape: [[0, 0], [1, 0], [0, 1], [1, 1]] },
    ] };
    game.model = { level: next };
    expect(game.formalBlockAssetPlan()).not.toBe(previous);
    expect(game.formalBlockAssetPlan().signature).toBe("solid:yellow:7");
    expect(game.formalIceAssetPlan().requests).toEqual([]);
    expect(game.formalBlockPlanCache.level).toBe(next);
    expect(game.formalIcePlanCache.level).toBe(next);
    game.model = { level: oldLevel };
    expect(game.formalBlockAssetPlan()).not.toBe(previous);
    expect(game.formalBlockAssetPlan()).toEqual(previous);
    expect(game.formalIceAssetPlan().requests.map(({ shapeId }: any) => shapeId)).toEqual([2, 8]);
  });
});
