import { describe, expect, it } from "vitest";

import { LEVELS } from "../src/core/levels";
import { PuzzleModel } from "../src/core/PuzzleModel";
import { solveLevelForValidation, solveLevelOptimally, type SolverDrag } from "../src/core/levelSolver";
import type { LevelSpec } from "../src/core/types";

const baseLevel = (overrides: Partial<LevelSpec>): LevelSpec => ({
  id: 999,
  name: "solver-advanced-mechanism-fixture",
  difficulty: "normal",
  timeSeconds: 180,
  reward: 0,
  width: 2,
  height: 2,
  gates: [],
  blocks: [],
  ...overrides,
});

const replay = (level: LevelSpec, drags: SolverDrag[]): PuzzleModel => {
  const model = new PuzzleModel(level);
  for (const drag of drags) {
    model.beginAction();
    for (const [x, y] of drag.path) expect(model.moveBlockStep(drag.blockId, x, y)).toBe(true);
    if (drag.exitSide) expect(model.tryExit(drag.blockId, drag.exitSide).ok).toBe(true);
    expect(model.commitAction()).toBe(true);
  }
  return model;
};

describe("level solver advanced runtime mechanisms", () => {
  it("orders removals around an initially closed flip door", () => {
    const level = baseLevel({
      gates: [{ id: "blue-left", side: "left", offset: 1, size: 1, color: "blue" }],
      flipDoors: [{
        id: "red-top",
        side: "top",
        offset: 0,
        size: 1,
        color: "red",
        initiallyOpen: false,
      }],
      blocks: [
        { id: "red", x: 0, y: 0, shape: [[0, 0]], color: "red", rotationBadge: true },
        { id: "blue", x: 0, y: 1, shape: [[0, 0]], color: "blue" },
      ],
    });

    const result = solveLevelForValidation(level, 1_000);
    expect(result).toMatchObject({ solved: true, termination: "solved" });
    expect(result.staticUnsatReasons).toEqual([]);
    expect(result.drags.map((drag) => drag.blockId)).toEqual(["blue", "red"]);
    expect(replay(level, result.drags).snapshot().complete).toBe(true);
  });

  it("does not toggle a flip door when only an outer shell is removed", () => {
    const level = baseLevel({
      gates: [{ id: "blue-left", side: "left", offset: 0, size: 1, color: "blue" }],
      flipDoors: [{
        id: "red-top",
        side: "top",
        offset: 0,
        size: 1,
        color: "red",
        initiallyOpen: true,
      }],
      blocks: [{
        id: "shell",
        x: 0,
        y: 0,
        shape: [[0, 0]],
        color: "blue",
        layers: ["blue", "red"],
      }],
    });

    const result = solveLevelForValidation(level, 1_000);
    expect(result).toMatchObject({ solved: true, termination: "solved", minimumDrags: 2 });
    expect(result.drags.map((drag) => drag.exitSide)).toEqual(["left", "top"]);
    expect(replay(level, result.drags).snapshot().complete).toBe(true);
  });

  it("enforces colored-grid outer-colour occupancy", () => {
    const blocked: LevelSpec = baseLevel({
      width: 3,
      height: 2,
      gates: [{ id: "blue-right", side: "right", offset: 0, size: 2, color: "blue" }],
      coloredGrids: [{ id: "red-grid", color: "red", cells: [[1, 0], [1, 1]] }],
      blocks: [{ id: "blue", x: 0, y: 0, shape: [[0, 0], [0, 1]], color: "blue" }],
    });
    const allowed: LevelSpec = {
      ...blocked,
      gates: [{ id: "red-right", side: "right", offset: 0, size: 2, color: "red" }],
      blocks: [{ id: "red", x: 0, y: 0, shape: [[0, 0], [0, 1]], color: "red" }],
    };

    expect(solveLevelForValidation(blocked, 100)).toMatchObject({
      solved: false,
      termination: "exhausted",
    });
    const allowedResult = solveLevelForValidation(allowed, 100);
    expect(allowedResult).toMatchObject({
      solved: true,
      termination: "solved",
    });
    expect(replay(allowed, allowedResult.drags).snapshot().complete).toBe(true);
  });

  it("labels elapsed-time-only rules as unsupported instead of unsolvable", () => {
    const result = solveLevelForValidation(baseLevel({
      bombFailurePolicy: "fail",
      blocks: [{
        id: "bomb",
        x: 0,
        y: 0,
        shape: [[0, 0]],
        color: "red",
        timedBombSeconds: 5,
      }],
    }));

    expect(result).toMatchObject({
      solved: false,
      termination: "unsupported",
      exploredStates: 0,
    });
    expect(result.unsupportedReasons).toContain("bomb failure deadlines require elapsed-time search");
    expect(result.staticUnsatReasons).toEqual([]);
  });

  it("proves missing exits only after colour, star, axis, and span compatibility", () => {
    const level = baseLevel({
      width: 4,
      height: 4,
      gates: [
        { id: "red-ordinary", side: "top", offset: 0, size: 1, color: "red" },
        { id: "blue-wrong-axis", side: "left", offset: 0, size: 2, color: "blue" },
        { id: "green-too-small", side: "bottom", offset: 0, size: 1, color: "green" },
      ],
      blocks: [
        { id: "star-red", x: 0, y: 0, shape: [[0, 0]], color: "red", star: true },
        {
          id: "vertical-blue",
          x: 1,
          y: 0,
          shape: [[0, 0], [0, 1]],
          color: "blue",
          movementAxis: "vertical",
        },
        {
          id: "wide-green",
          x: 2,
          y: 0,
          shape: [[0, 0], [1, 0]],
          color: "green",
        },
      ],
    });

    for (const result of [solveLevelForValidation(level), solveLevelOptimally(level)]) {
      expect(result).toMatchObject({
        solved: false,
        termination: "exhausted",
        exploredStates: 0,
      });
      expect(result.staticUnsatReasons.map((reason) => [reason.code, "blockId" in reason ? reason.blockId : null]))
        .toEqual([
          ["missing-compatible-exit", "star-red"],
          ["missing-compatible-exit", "vertical-blue"],
          ["missing-compatible-exit", "wide-green"],
        ]);
    }
  });

  it("checks every shell layer instead of only the opening colour", () => {
    const level = baseLevel({
      gates: [{ id: "blue-left", side: "left", offset: 0, size: 1, color: "blue" }],
      blocks: [{
        id: "shell",
        x: 0,
        y: 0,
        shape: [[0, 0]],
        color: "blue",
        layers: ["blue", "red"],
      }],
    });

    const result = solveLevelForValidation(level);
    expect(result).toMatchObject({ termination: "exhausted", exploredStates: 0 });
    expect(result.staticUnsatReasons).toEqual([
      expect.objectContaining({
        code: "missing-compatible-exit",
        blockId: "shell",
        layerIndex: 1,
        color: "red",
      }),
    ]);
  });

  it("solves the two repaired formal levels while preserving their axis blocks", () => {
    for (const levelId of [106, 152]) {
      const level = LEVELS.find(({ id }) => id === levelId);
      expect(level).toBeDefined();
      expect(level!.blocks.some((block) => block.movementAxis !== undefined)).toBe(true);
      const result = solveLevelForValidation(level!);
      expect(result).toMatchObject({ solved: true, termination: "solved" });
      expect(result.staticUnsatReasons).toEqual([]);
      expect(replay(level!, result.drags).snapshot().complete).toBe(true);
    }
  }, 60_000);

  it("does not freeze an axis block's offset when a conveyor can relocate it", () => {
    const level = baseLevel({
      gates: [
        { id: "blue-top", side: "top", offset: 1, size: 1, color: "blue" },
        { id: "red-left", side: "left", offset: 0, size: 1, color: "red" },
      ],
      blocks: [
        { id: "blue", x: 1, y: 0, shape: [[0, 0]], color: "blue" },
        {
          id: "red",
          x: 0,
          y: 1,
          shape: [[0, 0]],
          color: "red",
          movementAxis: "horizontal",
        },
      ],
      conveyors: [{
        id: "red-lift-belt",
        blockId: "red",
        x: 0,
        y: 1,
        width: 1,
        height: 1,
        direction: "top",
      }],
    });

    const result = solveLevelForValidation(level, 100);
    expect(result.staticUnsatReasons).toEqual([]);
    expect(result).toMatchObject({ solved: true, termination: "solved" });
    expect(replay(level, result.drags).snapshot().complete).toBe(true);
  });

  it("counts closed flip doors as exits and treats rotation badges as display-only", () => {
    const level = baseLevel({
      width: 2,
      height: 1,
      flipDoors: [{
        id: "red-door",
        side: "top",
        offset: 0,
        size: 1,
        color: "red",
        initiallyOpen: false,
      }],
      blocks: [{
        id: "red",
        x: 0,
        y: 0,
        shape: [[0, 0]],
        color: "red",
        rotationBadge: true,
      }],
    });

    const result = solveLevelForValidation(level, 0);
    expect(result).toMatchObject({ termination: "max_states", exploredStates: 0 });
    expect(result.staticUnsatReasons).toEqual([]);
  });

  it("proves a lock whose count exceeds all matching key blocks", () => {
    const impossible = baseLevel({
      gates: [
        { id: "red-left", side: "left", offset: 0, size: 1, color: "red" },
        { id: "blue-right", side: "right", offset: 1, size: 1, color: "blue" },
      ],
      blocks: [
        { id: "key", x: 0, y: 0, shape: [[0, 0]], color: "red", keyId: "gold" },
        {
          id: "lock",
          x: 1,
          y: 1,
          shape: [[0, 0]],
          color: "blue",
          lockedBy: "gold",
          lockCount: 2,
        },
      ],
    });
    const possibleByKeyCount: LevelSpec = {
      ...impossible,
      blocks: [
        ...impossible.blocks,
        { id: "key-2", x: 1, y: 0, shape: [[0, 0]], color: "red", keyId: "gold" },
      ],
    };

    const impossibleResult = solveLevelForValidation(impossible);
    expect(impossibleResult).toMatchObject({ termination: "exhausted", exploredStates: 0 });
    expect(impossibleResult.staticUnsatReasons).toContainEqual(expect.objectContaining({
      code: "insufficient-keys",
      blockId: "lock",
      keyId: "gold",
      requiredKeys: 2,
      availableKeys: 1,
    }));

    const control = solveLevelForValidation(possibleByKeyCount, 0);
    expect(control).toMatchObject({ termination: "max_states", exploredStates: 0 });
    expect(control.staticUnsatReasons).toEqual([]);
  });

  it("proves an all-frozen colour deadlock when its counter exceeds every other layer", () => {
    const level = baseLevel({
      gates: [
        { id: "red-left", side: "left", offset: 1, size: 1, color: "red" },
        { id: "blue-top", side: "top", offset: 1, size: 1, color: "blue", frozen: 2 },
      ],
      blocks: [
        { id: "red", x: 0, y: 1, shape: [[0, 0]], color: "red" },
        { id: "blue", x: 1, y: 0, shape: [[0, 0]], color: "blue" },
      ],
    });

    const result = solveLevelForValidation(level);
    expect(result).toMatchObject({ termination: "exhausted", exploredStates: 0 });
    expect(result.staticUnsatReasons).toContainEqual(expect.objectContaining({
      code: "frozen-exit-deadlock",
      color: "blue",
      minimumFrozen: 2,
      maximumPriorOtherClears: 1,
    }));
  });

  it("ignores an unfrozen same-colour exit when it is incompatible with every matching block", () => {
    const level = baseLevel({
      gates: [
        { id: "red-left", side: "left", offset: 1, size: 1, color: "red" },
        { id: "blue-top", side: "top", offset: 1, size: 1, color: "blue", frozen: 2 },
        { id: "blue-left-wrong-axis", side: "left", offset: 0, size: 1, color: "blue" },
      ],
      blocks: [
        { id: "red", x: 0, y: 1, shape: [[0, 0]], color: "red" },
        {
          id: "blue",
          x: 1,
          y: 0,
          shape: [[0, 0]],
          color: "blue",
          movementAxis: "vertical",
        },
      ],
    });

    const result = solveLevelForValidation(level);
    expect(result.staticUnsatReasons).toContainEqual(expect.objectContaining({
      code: "frozen-exit-deadlock",
      color: "blue",
      minimumFrozen: 2,
      maximumPriorOtherClears: 1,
    }));
  });

  it("uses the unfrozen exit compatible with another same-colour block", () => {
    const level = baseLevel({
      gates: [
        { id: "blue-top", side: "top", offset: 1, size: 1, color: "blue" },
        { id: "blue-left", side: "left", offset: 1, size: 1, color: "blue", frozen: 1 },
      ],
      blocks: [
        { id: "free-blue", x: 1, y: 0, shape: [[0, 0]], color: "blue" },
        {
          id: "horizontal-blue",
          x: 0,
          y: 1,
          shape: [[0, 0]],
          color: "blue",
          movementAxis: "horizontal",
        },
      ],
    });

    const result = solveLevelForValidation(level, 100);
    expect(result.staticUnsatReasons).toEqual([]);
    expect(result).toMatchObject({ solved: true, termination: "solved" });
    expect(replay(level, result.drags).snapshot().complete).toBe(true);
  });

  it("uses every non-colour layer as the conservative pre-clear upper bound", () => {
    const level = baseLevel({
      gates: [
        { id: "red-left", side: "left", offset: 0, size: 1, color: "red" },
        { id: "blue-top", side: "top", offset: 0, size: 1, color: "blue", frozen: 2 },
      ],
      blocks: [
        { id: "blue-outer", x: 0, y: 0, shape: [[0, 0]], color: "blue", layers: ["blue", "red"] },
        { id: "red-outer", x: 1, y: 0, shape: [[0, 0]], color: "red", layers: ["red", "blue"] },
      ],
    });

    const result = solveLevelForValidation(level, 0);
    expect(result).toMatchObject({ termination: "max_states", exploredStates: 0 });
    expect(result.staticUnsatReasons).toEqual([]);
  });

  it("does not flag a frozen exit when enough earlier layers can thaw it", () => {
    const level = baseLevel({
      gates: [
        { id: "red-left", side: "left", offset: 1, size: 1, color: "red" },
        { id: "blue-top", side: "top", offset: 1, size: 1, color: "blue", frozen: 1 },
      ],
      blocks: [
        { id: "red", x: 0, y: 1, shape: [[0, 0]], color: "red" },
        { id: "blue", x: 1, y: 0, shape: [[0, 0]], color: "blue" },
      ],
    });

    const result = solveLevelForValidation(level, 100);
    expect(result).toMatchObject({ solved: true, termination: "solved" });
    expect(result.staticUnsatReasons).toEqual([]);
    expect(replay(level, result.drags).snapshot().complete).toBe(true);
  });

  it("canonicalizes interchangeable same-shape same-colour blocks", () => {
    const level = baseLevel({
      width: 4,
      height: 2,
      playable: [[0, 0], [2, 0], [3, 0], [2, 1], [3, 1]],
      gates: [{ id: "blue-isolated", side: "top", offset: 0, size: 1, color: "blue" }],
      blocks: [
        { id: "blue-a", x: 2, y: 0, shape: [[0, 0]], color: "blue" },
        { id: "blue-b", x: 3, y: 1, shape: [[0, 0]], color: "blue" },
      ],
    });

    const result = solveLevelForValidation(level, 100);
    expect(result).toMatchObject({
      solved: false,
      termination: "exhausted",
      exploredStates: 6,
    });
    expect(result.staticUnsatReasons).toEqual([]);
  });

  it("keeps trigger-referenced twins identity-sensitive", () => {
    const level = baseLevel({
      width: 4,
      height: 3,
      gates: [
        { id: "blue-top", side: "top", offset: 0, size: 4, color: "blue" },
        { id: "red-bottom", side: "bottom", offset: 1, size: 1, color: "red" },
      ],
      blocks: [
        { id: "trigger-blue", x: 0, y: 0, shape: [[0, 0]], color: "blue" },
        { id: "second-trigger-blue", x: 3, y: 1, shape: [[0, 0]], color: "blue" },
        { id: "hidden-red", x: 1, y: 0, shape: [[0, 0]], color: "red", shutterId: "red-cover" },
      ],
      shutters: [{
        id: "red-cover",
        x: 0,
        y: 0,
        width: 4,
        height: 2,
        count: 2,
        skin: "staged-frame",
        triggerBlockIds: ["trigger-blue", "second-trigger-blue"],
      }],
    });

    const result = solveLevelForValidation(level, 100);
    expect(result).toMatchObject({ solved: true, termination: "solved" });
    expect(new Set(result.drags.slice(0, 2).map((drag) => drag.blockId))).toEqual(
      new Set(["trigger-blue", "second-trigger-blue"]),
    );
    expect(replay(level, result.drags).snapshot().complete).toBe(true);
  });
});
