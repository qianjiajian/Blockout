import { describe, expect, it } from "vitest";
import {
  classifyIceEligibleShape,
  isIceEligibleBlockShape,
  normalizeFrozenBlockShapes,
} from "../src/core/blockShape";
import { LEVELS } from "../src/core/levels";
import { validateLevel } from "../src/core/PuzzleModel";
import type { LevelSpec } from "../src/core/types";

describe("frozen block shape rule", () => {
  it("accepts integer orthogonally connected shapes regardless of their local origin", () => {
    expect(classifyIceEligibleShape([[0, 0], [1, 0], [2, 0]])).toBe("bar");
    expect(classifyIceEligibleShape([[4, 7], [4, 8]])).toBe("bar");
    expect(classifyIceEligibleShape([[0, 0], [1, 0], [0, 1], [1, 1]])).toBe("rectangle");
    expect(classifyIceEligibleShape([[2, 3], [3, 3], [2, 4], [3, 4], [2, 5], [3, 5]])).toBe("rectangle");
    expect(classifyIceEligibleShape([[0, 0]])).toBe("bar");
    expect(classifyIceEligibleShape([[0, 0], [0, 1], [0, 2], [1, 2]])).toBe("irregular");
    expect(classifyIceEligibleShape([[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]])).toBe("irregular");
  });

  it("rejects empty, disconnected, duplicate, and fractional shapes", () => {
    const invalid = [
      [],
      [[0, 0], [1, 0], [0, 1], [2, 1]],
      [[0, 0], [2, 0]],
      [[0, 0], [0, 0]],
      [[0, 0], [1.5, 0]],
    ] as const;
    for (const shape of invalid) expect(isIceEligibleBlockShape(shape)).toBe(false);
  });

  it("preserves a legal frozen L-piece without rectangularizing it", () => {
    const fixture: LevelSpec = {
      id: 991,
      name: "legacy ice shape",
      difficulty: "normal",
      timeSeconds: 180,
      reward: 0,
      width: 5,
      height: 5,
      gates: [{ id: "red-top", side: "top", offset: 0, size: 2, color: "red" }],
      blocks: [{ id: "legacy", x: 1, y: 1, shape: [[0, 0], [1, 0], [0, 1]], color: "red", frozen: 4 }],
    };
    const migrated = normalizeFrozenBlockShapes(fixture);
    const block = migrated.blocks[0];
    expect(block).toMatchObject({ id: "legacy", color: "red", frozen: 4, x: 1, y: 1 });
    expect(block.shape).toEqual([[0, 0], [1, 0], [0, 1]]);
    expect(() => validateLevel(migrated)).not.toThrow();
  });

  it("accepts an irregular numeric-ice block with one outer shell", () => {
    const fixture: LevelSpec = {
      id: 990,
      name: "irregular layered ice shape",
      difficulty: "normal",
      timeSeconds: 180,
      reward: 0,
      width: 4,
      height: 4,
      gates: [
        { id: "red-top", side: "top", offset: 0, size: 2, color: "red" },
        { id: "blue-left", side: "left", offset: 0, size: 3, color: "blue" },
      ],
      blocks: [{
        id: "frozen-l",
        x: 0,
        y: 0,
        shape: [[0, 0], [0, 1], [0, 2], [1, 2]],
        color: "red",
        layers: ["red", "blue"],
        frozen: 1,
      }],
    };
    expect(() => validateLevel(fixture)).not.toThrow();
  });

  it("rejects a disconnected frozen block at the model boundary", () => {
    const fixture: LevelSpec = {
      id: 989,
      name: "invalid disconnected ice shape",
      difficulty: "normal",
      timeSeconds: 180,
      reward: 0,
      width: 3,
      height: 3,
      gates: [{ id: "red-top", side: "top", offset: 0, size: 3, color: "red" }],
      blocks: [{ id: "frozen-split", x: 0, y: 0, shape: [[0, 0], [2, 0]], color: "red", frozen: 1 }],
    };
    expect(() => validateLevel(fixture)).toThrow(/unique integer orthogonally connected cells/);
  });

  it("keeps every frozen block in the 200-level runtime campaign eligible", () => {
    expect(LEVELS).toHaveLength(200);
    for (const level of LEVELS) {
      for (const block of level.blocks) {
        if ((block.frozen ?? 0) > 0) expect(isIceEligibleBlockShape(block.shape), `Lv${level.id} ${block.id}`).toBe(true);
      }
    }
  });
});
