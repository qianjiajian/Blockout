import { describe, expect, it } from "vitest";
import { LEVELS, getLevel } from "../src/core/levels";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { solveLevelForValidation } from "../src/core/levelSolver";
import type { SolutionAction } from "../src/core/solutions";
import type { LevelSpec } from "../src/core/types";

const solutionFor = (levelId: number): SolutionAction[] => solveLevelForValidation(getLevel(levelId)).drags.flatMap((drag) => [
  ...drag.path.map(([x, y]) => ({ type: "move" as const, blockId: drag.blockId, x, y })),
  ...(drag.exitSide ? [{ type: "exit" as const, blockId: drag.blockId, side: drag.exitSide }] : []),
]);

const playDrag = (model: PuzzleModel, actions: SolutionAction[], start: number): number => {
  const blockId = actions[start].blockId;
  let index = start;
  model.beginAction();
  while (index < actions.length && actions[index].blockId === blockId) {
    const action = actions[index];
    if (action.type === "move") expect(model.moveBlock(action.blockId, action.x, action.y)).toBe(true);
    else {
      expect(model.tryExit(action.blockId, action.side).ok).toBe(true);
      index += 1;
      break;
    }
    index += 1;
  }
  expect(model.commitAction()).toBe(true);
  return index;
};

const mechanicFixture = (): LevelSpec => ({
  id: 997,
  name: "mechanic fixture",
  difficulty: "normal",
  timeSeconds: 180,
  reward: 0,
  width: 4,
  height: 4,
  gates: [
    { id: "red-top", side: "top", offset: 0, size: 1, color: "red" },
    { id: "blue-bottom", side: "bottom", offset: 2, size: 2, color: "blue", frozen: 1 },
  ],
  shutters: [{ id: "cargo-door", x: 2, y: 2, width: 2, height: 1, count: 1 }],
  blocks: [
    { id: "red", x: 0, y: 0, shape: [[0, 0]], color: "red" },
    { id: "blue", x: 2, y: 2, shape: [[0, 0], [1, 0]], color: "blue", frozen: 1, shutterId: "cargo-door" },
  ],
});

describe("level data", () => {
  it("validates every one of the 100 authored levels", () => {
    expect(LEVELS).toHaveLength(100);
    for (const level of LEVELS) expect(() => validateLevel(level)).not.toThrow();
  });
});

describe("PuzzleModel", () => {
  it("treats silhouette voids as real collision instead of decorative holes", () => {
    const fixture: LevelSpec = {
      id: 998,
      name: "mask fixture",
      difficulty: "normal",
      timeSeconds: 180,
      reward: 0,
      width: 4,
      height: 4,
      playable: [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [1, 1], [3, 1], [0, 2], [1, 2], [2, 2], [3, 2], [0, 3], [1, 3], [2, 3], [3, 3]],
      gates: [{ id: "red-top", side: "top", offset: 1, size: 1, color: "red" }],
      blocks: [{ id: "red", x: 1, y: 1, shape: [[0, 0]], color: "red" }],
    };
    const model = new PuzzleModel(fixture);
    expect(model.canPlace(model.getBlock("red")!, 2, 1)).toBe(false);
    expect(model.moveBlock("red", 3, 1)).toBe(false);
    expect(model.getBlock("red")).toMatchObject({ x: 1, y: 1 });
    expect(model.moveBlock("red", 1, 0)).toBe(true);
    expect(model.tryExit("red", "top").ok).toBe(true);
  });

  it("solves the tutorial and only starts timing after the first drag", () => {
    const model = new PuzzleModel(getLevel(1));
    const actions = solutionFor(1);
    model.tick(10);
    expect(model.snapshot().remainingSeconds).toBe(180);

    let index = playDrag(model, actions, 0);
    model.tick(1.2);
    expect(model.snapshot().remainingSeconds).toBeCloseTo(178.8, 3);
    while (index < actions.length) index = playDrag(model, actions, index);
    expect(model.snapshot().complete).toBe(true);
  });

  it("restores a complete action with undo", () => {
    const model = new PuzzleModel(getLevel(1));
    const before = model.snapshot();
    playDrag(model, solutionFor(1), 0);
    expect(model.undo()).toBe(true);
    expect(model.snapshot()).toEqual(before);
  });

  it("counts one player action per committed drag and ignores no-op taps", () => {
    const model = new PuzzleModel(getLevel(1));
    model.beginAction();
    expect(model.commitAction()).toBe(false);
    expect(model.snapshot().moves).toBe(0);
    playDrag(model, solutionFor(1), 0);
    expect(model.snapshot().moves).toBe(1);
  });

  it("does not count timer-only progress as a player move", () => {
    const model = new PuzzleModel(getLevel(2));
    model.start();
    model.beginAction();
    const before = model.snapshot().remainingSeconds;
    expect(model.tick(0.25)).toBe(false);

    expect(model.commitAction()).toBe(false);
    expect(model.snapshot().moves).toBe(0);
    expect(model.snapshot().remainingSeconds).toBeCloseTo(before - 0.25, 5);
    expect(model.undo()).toBe(false);
  });

  it("keeps timer and elevator progress after a no-op action is committed or cancelled", () => {
    const elevatorFixture: LevelSpec = {
      id: 995,
      name: "environment-only action fixture",
      difficulty: "normal",
      timeSeconds: 180,
      reward: 0,
      width: 4,
      height: 4,
      gates: [{ id: "red-top", side: "top", offset: 0, size: 1, color: "red" }],
      blocks: [{ id: "red", x: 0, y: 1, shape: [[0, 0]], color: "red" }],
      elevators: [{
        id: "lift",
        blockId: "red",
        fromX: 0,
        fromY: 1,
        toX: 2,
        toY: 1,
        width: 1,
        height: 1,
        periodSeconds: 0.1,
      }],
    };
    const model = new PuzzleModel(elevatorFixture);
    model.start();
    model.beginAction();
    expect(model.tick(0.11)).toBe(true);
    expect(model.getBlock("red")).toMatchObject({ x: 1, y: 1 });
    expect(model.commitAction()).toBe(false);
    expect(model.snapshot().moves).toBe(0);
    expect(model.undo()).toBe(false);

    model.beginAction();
    const beforeCancel = model.snapshot();
    expect(model.tick(0.11)).toBe(true);
    model.cancelAction();
    const afterCancel = model.snapshot();
    expect(afterCancel.blocks[0]).toMatchObject({ x: 2, y: 1 });
    expect(afterCancel.remainingSeconds).toBeLessThan(beforeCancel.remainingSeconds);
    expect(afterCancel.moves).toBe(0);
    expect(model.undo()).toBe(false);
  });

  it("reserves a held fractional footprint from elevator cargo and detaches an actively dragged payload", () => {
    const foreignCargoFixture: LevelSpec = {
      id: 994,
      name: "held reservation fixture",
      difficulty: "normal",
      timeSeconds: 180,
      reward: 0,
      width: 4,
      height: 3,
      gates: [{ id: "red-top", side: "top", offset: 0, size: 1, color: "red" }],
      blocks: [
        { id: "held", x: 0, y: 1, shape: [[0, 0]], color: "red" },
        { id: "cargo", x: 2, y: 1, shape: [[0, 0]], color: "blue" },
      ],
      elevators: [{
        id: "cargo-lift", blockId: "cargo", fromX: 2, fromY: 1, toX: 1, toY: 1,
        width: 1, height: 1, periodSeconds: 0.1,
      }],
    };
    const blockedCargo = new PuzzleModel(foreignCargoFixture);
    blockedCargo.start();
    expect(blockedCargo.tick(0.11, {
      blockId: "held", x: 0.55, y: 1, shape: [[0, 0]],
    })).toBe(false);
    expect(blockedCargo.getBlock("cargo")).toMatchObject({ x: 2, y: 1 });
    expect(blockedCargo.snapshot().elevators[0]).toMatchObject({ x: 2, y: 1 });

    const heldCargoFixture: LevelSpec = {
      ...foreignCargoFixture,
      id: 993,
      blocks: [{ id: "cargo", x: 2, y: 1, shape: [[0, 0]], color: "blue" }],
    };
    const detachedCargo = new PuzzleModel(heldCargoFixture);
    detachedCargo.start();
    expect(detachedCargo.tick(0.11, {
      blockId: "cargo", x: 1.51, y: 1, shape: [[0, 0]],
    })).toBe(true);
    expect(detachedCargo.getBlock("cargo")).toMatchObject({ x: 2, y: 1 });
    expect(detachedCargo.snapshot().elevators[0]).toMatchObject({ x: 1, y: 1 });
  });

  it("counts one explicit move even when the timer advances during the action", () => {
    const model = new PuzzleModel(getLevel(2));
    const action = solutionFor(2).find((candidate) => candidate.type === "move");
    expect(action?.type).toBe("move");
    model.beginAction();
    expect(model.moveBlockStep(action!.blockId, action!.x, action!.y)).toBe(true);
    model.tick(0.25);
    expect(model.commitAction()).toBe(true);
    expect(model.snapshot().moves).toBe(1);
  });

  it("records a booster mutation for undo without charging a puzzle move", () => {
    const model = new PuzzleModel(mechanicFixture());
    const before = model.snapshot();
    model.beginAction();
    expect(model.thawAll(2)).toBe(true);
    expect(model.commitAction(false)).toBe(true);
    expect(model.snapshot().moves).toBe(0);
    expect(model.undo()).toBe(true);
    expect(model.snapshot()).toEqual(before);
  });

  it("rejects time boosts at the cap without creating an action", () => {
    const model = new PuzzleModel(getLevel(1));
    for (let index = 0; index < 4; index += 1) {
      model.beginAction();
      expect(model.addTime(30)).toBe(true);
      expect(model.commitAction(false)).toBe(true);
    }
    expect(model.snapshot().remainingSeconds).toBe(model.level.timeSeconds + 120);

    model.beginAction();
    expect(model.addTime(30)).toBe(false);
    expect(model.commitAction(false)).toBe(false);
    expect(model.snapshot().remainingSeconds).toBe(model.level.timeSeconds + 120);
  });

  it("rolls an interrupted drag back without creating undo history", () => {
    const model = new PuzzleModel(getLevel(1));
    const action = solutionFor(1).find((candidate) => candidate.type === "move");
    expect(action?.type).toBe("move");
    const before = model.snapshot();
    model.beginAction();
    expect(model.moveBlock(action!.blockId, action!.x, action!.y)).toBe(true);
    model.cancelAction();
    expect(model.snapshot()).toEqual(before);
    expect(model.undo()).toBe(false);
  });

  it("does not refund elapsed time when a real drag is cancelled in a running level", () => {
    const model = new PuzzleModel(getLevel(2));
    const action = solutionFor(2).find((candidate) => candidate.type === "move");
    expect(action?.type).toBe("move");
    const origin = model.getBlock(action!.blockId)!;
    const before = { x: origin.x, y: origin.y };
    model.start();
    model.beginAction();
    expect(model.moveBlockStep(action!.blockId, action!.x, action!.y)).toBe(true);
    model.tick(0.5);
    model.cancelAction();

    expect(model.getBlock(action!.blockId)).toMatchObject(before);
    expect(model.snapshot().remainingSeconds).toBeCloseTo(model.level.timeSeconds - 0.5, 5);
    expect(model.snapshot().moves).toBe(0);
  });

  it("preserves autonomous lift progress while cancelling a real player move", () => {
    const fixture: LevelSpec = {
      id: 992,
      name: "cancel with lift fixture",
      difficulty: "normal",
      timeSeconds: 180,
      reward: 0,
      width: 5,
      height: 3,
      gates: [{ id: "red-top", side: "top", offset: 0, size: 1, color: "red" }],
      blocks: [
        { id: "player", x: 0, y: 1, shape: [[0, 0]], color: "red" },
        { id: "cargo", x: 3, y: 1, shape: [[0, 0]], color: "blue" },
      ],
      elevators: [{
        id: "lift", blockId: "cargo", fromX: 3, fromY: 1, toX: 2, toY: 1,
        width: 1, height: 1, periodSeconds: 0.1,
      }],
    };
    const model = new PuzzleModel(fixture);
    model.beginAction();
    expect(model.moveBlockStep("player", 0, 2)).toBe(true);
    expect(model.tick(0.11)).toBe(true);
    model.cancelAction();

    expect(model.getBlock("player")).toMatchObject({ x: 0, y: 1 });
    expect(model.getBlock("cargo")).toMatchObject({ x: 2, y: 1 });
    expect(model.snapshot().elevators[0]).toMatchObject({ x: 2, y: 1 });
    expect(model.snapshot().remainingSeconds).toBeCloseTo(179.89, 5);
    expect(model.snapshot().started).toBe(true);
    expect(model.snapshot().moves).toBe(0);
  });

  it("reserves both the live drag pose and its rollback footprint from lift cargo", () => {
    const fixture: LevelSpec = {
      id: 991,
      name: "rollback reservation fixture",
      difficulty: "normal",
      timeSeconds: 180,
      reward: 0,
      width: 5,
      height: 3,
      gates: [{ id: "red-top", side: "top", offset: 0, size: 1, color: "red" }],
      blocks: [
        { id: "player", x: 2, y: 1, shape: [[0, 0]], color: "red" },
        { id: "cargo", x: 3, y: 1, shape: [[0, 0]], color: "blue" },
      ],
      elevators: [{
        id: "lift", blockId: "cargo", fromX: 3, fromY: 1, toX: 2, toY: 1,
        width: 1, height: 1, periodSeconds: 0.1,
      }],
    };
    const model = new PuzzleModel(fixture);
    model.beginAction();
    expect(model.moveBlockStep("player", 1, 1)).toBe(true);
    expect(model.tick(0.11, {
      blockId: "player",
      x: 1,
      y: 1,
      rollbackX: 2,
      rollbackY: 1,
      shape: [[0, 0]],
    })).toBe(false);
    expect(model.getBlock("cargo")).toMatchObject({ x: 3, y: 1 });
    expect(model.snapshot().elevators[0]).toMatchObject({ x: 3, y: 1, direction: -1 });

    model.cancelAction();
    expect(model.getBlock("player")).toMatchObject({ x: 2, y: 1 });
    expect(model.getBlock("cargo")).toMatchObject({ x: 3, y: 1 });
    expect(model.snapshot().elevators[0]).toMatchObject({ x: 3, y: 1, direction: -1 });
    expect(model.snapshot().remainingSeconds).toBeCloseTo(179.89, 5);
  });

  it("keeps live lift progress if restored cargo can no longer follow it", () => {
    const fixture: LevelSpec = {
      id: 990,
      name: "lift detach on rollback fixture",
      difficulty: "normal",
      timeSeconds: 180,
      reward: 0,
      width: 5,
      height: 3,
      gates: [{ id: "red-top", side: "top", offset: 0, size: 1, color: "red" }],
      blocks: [
        { id: "player", x: 2, y: 1, shape: [[0, 0]], color: "red" },
        { id: "cargo", x: 3, y: 1, shape: [[0, 0]], color: "blue" },
      ],
      elevators: [{
        id: "lift", blockId: "cargo", fromX: 3, fromY: 1, toX: 2, toY: 1,
        width: 1, height: 1, periodSeconds: 0.1,
      }],
    };
    const model = new PuzzleModel(fixture);
    model.beginAction();
    expect(model.moveBlockStep("player", 1, 1)).toBe(true);
    expect(model.tick(0.11)).toBe(true);
    expect(model.getBlock("cargo")).toMatchObject({ x: 2, y: 1 });

    model.cancelAction();
    expect(model.getBlock("player")).toMatchObject({ x: 2, y: 1 });
    expect(model.getBlock("cargo")).toMatchObject({ x: 3, y: 1 });
    expect(model.snapshot().elevators[0]).toMatchObject({ x: 2, y: 1 });
    expect(model.snapshot().remainingSeconds).toBeCloseTo(179.89, 5);
  });

  it("decrements frozen doors after every clear", () => {
    const model = new PuzzleModel(mechanicFixture());
    const before = model.snapshot().gates.reduce((sum, gate) => sum + gate.frozen, 0);
    expect(model.tryExit("red", "top").ok).toBe(true);
    const after = model.snapshot().gates.reduce((sum, gate) => sum + gate.frozen, 0);
    expect(after).toBeLessThan(before);
  });

  it("explains missing, mismatched, and frozen exit attempts", () => {
    const fixture: LevelSpec = {
      id: 999,
      name: "status fixture",
      difficulty: "normal",
      timeSeconds: 180,
      reward: 0,
      parMoves: 1,
      width: 4,
      height: 4,
      gates: [
        { id: "red-top", side: "top", offset: 1, size: 1, color: "red", frozen: 1 },
        { id: "blue-left", side: "left", offset: 1, size: 1, color: "blue" },
      ],
      blocks: [{ id: "red", x: 1, y: 1, shape: [[0, 0]], color: "red" }],
    };
    expect(new PuzzleModel(fixture).exitAttemptStatus("red", "top")).toBe("not-at-edge");
    const noGate = new PuzzleModel(fixture);
    expect(noGate.moveBlock("red", 3, 1)).toBe(true);
    expect(noGate.exitAttemptStatus("red", "right")).toBe("no-gate");
    const wrong = new PuzzleModel(fixture);
    expect(wrong.moveBlock("red", 0, 1)).toBe(true);
    expect(wrong.exitAttemptStatus("red", "left")).toBe("wrong-color");
    const frozen = new PuzzleModel(fixture);
    expect(frozen.moveBlock("red", 1, 0)).toBe(true);
    expect(frozen.exitAttemptStatus("red", "top")).toBe("frozen-gate");
  });

  it("thaws frozen blocks while preserving their color", () => {
    const model = new PuzzleModel(mechanicFixture());
    const frozen = model.snapshot().blocks.find((block) => block.id === "blue")!;
    const color = frozen.color;
    expect(model.thawAll(1)).toBe(true);
    expect(model.getBlock(frozen.id)?.color).toBe(color);
    expect(model.getBlock(frozen.id)?.frozen).toBe(0);
  });

  it("removes a layer before removing the inner block", () => {
    const fixture: LevelSpec = {
      id: 996, name: "layer fixture", difficulty: "normal", timeSeconds: 180, reward: 0,
      width: 3, height: 3,
      gates: [
        { id: "red-top", side: "top", offset: 1, size: 1, color: "red" },
        { id: "blue-bottom", side: "bottom", offset: 1, size: 1, color: "blue" },
      ],
      blocks: [{ id: "layered", x: 1, y: 0, shape: [[0, 0]], color: "red", layers: ["red", "blue"] }],
    };
    const model = new PuzzleModel(fixture);
    const layered = model.snapshot().blocks[0];
    const layerCount = layered.layers.length;
    expect(model.tryExit(layered.id, "top").ok).toBe(true);
    expect(model.getBlock(layered.id)?.layers).toHaveLength(layerCount - 1);
  });

  it("reveals shuttered blocks after the required clears", () => {
    const model = new PuzzleModel(mechanicFixture());
    const hidden = model.snapshot().blocks.find((block) => block.shutterId)!;
    expect(model.isBlockActive(model.getBlock(hidden.id)!)).toBe(false);
    expect(model.tryExit("red", "top").ok).toBe(true);
    expect(model.snapshot().shutters.every((shutter) => shutter.count === 0)).toBe(true);
    expect(model.isBlockActive(model.getBlock(hidden.id)!)).toBe(true);
  });
});
