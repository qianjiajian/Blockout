import { describe, expect, it } from "vitest";

import { LEVELS } from "../src/core/levels";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { solveLevelForValidation } from "../src/core/levelSolver";

const openingSameColorDegree = (level: NonNullable<(typeof LEVELS)[number]>): Map<string, number> => {
  const cells = new Map(level.blocks.map((block) => [
    block.id,
    block.shape.map(([dx, dy]) => [block.x + dx, block.y + dy] as const),
  ]));
  const degree = new Map(level.blocks.map((block) => [block.id, 0]));
  for (let index = 0; index < level.blocks.length; index += 1) {
    const left = level.blocks[index];
    for (let otherIndex = index + 1; otherIndex < level.blocks.length; otherIndex += 1) {
      const right = level.blocks[otherIndex];
      const leftColor = left.layers?.[0] ?? left.color;
      const rightColor = right.layers?.[0] ?? right.color;
      if (leftColor !== rightColor) continue;
      const touches = cells.get(left.id)!.some(([leftX, leftY]) => (
        cells.get(right.id)!.some(([rightX, rightY]) => Math.abs(leftX - rightX) + Math.abs(leftY - rightY) === 1)
      ));
      if (!touches) continue;
      degree.set(left.id, degree.get(left.id)! + 1);
      degree.set(right.id, degree.get(right.id)! + 1);
    }
  }
  return degree;
};

describe("Lv14 solver-verified frozen-gate, unique-exit, and opening-colour repair", () => {
  it("keeps the difficulty, makes exits unique, breaks same-colour clusters, and completes", () => {
    const level = LEVELS.find(({ id }) => id === 14);
    expect(level).toBeDefined();
    expect(() => validateLevel(level!)).not.toThrow();
    expect(level!.gates.find(({ id }) => id === "vp-014-gate-04")?.frozen).toBe(2);
    expect(level!.gates.find(({ id }) => id === "vp-014-gate-01")?.color).toBe("red");
    expect(level!.blocks.find(({ id }) => id === "strategy-guard-06")?.color).toBe("red");
    expect(level!.blocks.find(({ id }) => id === "strategy-guard-12")?.color).toBe("red");
    expect(level!.blocks.find(({ id }) => id === "cc-piece-09")?.color).toBe("orange");
    expect(level!.blocks.find(({ id }) => id === "cc-piece-08")?.color).toBe("purple");
    expect(level!.blocks.find(({ id }) => id === "strategy-guard-13")?.color).toBe("green");

    const exits = [...level!.gates, ...(level!.flipDoors ?? [])];
    expect(exits).toHaveLength(4);
    expect(new Set(exits.map(({ color }) => color)).size).toBe(exits.length);
    expect(exits.map(({ color }) => color)).toEqual(["red", "orange", "purple", "green"]);
    expect(Math.max(...openingSameColorDegree(level!).values())).toBeLessThanOrEqual(1);

    const result = solveLevelForValidation(level!, 10_000);
    expect(result).toMatchObject({
      solved: true,
      termination: "solved",
      minimumDrags: 32,
      clearLoad: 17,
      repositionOverhead: 15,
      exploredStates: 169,
      gridSteps: 97,
      turns: 13,
      unsupportedReasons: [],
      staticUnsatReasons: [],
    });

    const model = new PuzzleModel(level!);
    for (const drag of result.drags) {
      model.beginAction();
      for (const [x, y] of drag.path) expect(model.moveBlockStep(drag.blockId, x, y)).toBe(true);
      if (drag.exitSide) expect(model.tryExit(drag.blockId, drag.exitSide).ok).toBe(true);
      expect(model.commitAction()).toBe(true);
    }
    expect(model.snapshot()).toMatchObject({ complete: true, moves: 32, blocks: [], queuedBlocks: [] });
  });
});
