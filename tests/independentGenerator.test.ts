import { describe, expect, it } from "vitest";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { solveLevelForValidation } from "../src/core/levelSolver";
import type { LevelSpec } from "../src/core/types";

const generatorFixture = (): LevelSpec => ({
  id: 980,
  name: "independent generator fixture",
  difficulty: "normal",
  timeSeconds: 180,
  reward: 0,
  width: 4,
  height: 4,
  gates: [
    { id: "blue-right", side: "right", offset: 1, size: 1, color: "blue" },
    { id: "yellow-top", side: "top", offset: 2, size: 1, color: "yellow" },
    { id: "red-bottom", side: "bottom", offset: 0, size: 1, color: "red" },
  ],
  generators: [{
    id: "blue-generator",
    side: "right",
    offset: 1,
    spawn: [2, 1],
    queueBlockIds: ["queued-blue-a", "queued-blue-b"],
  }],
  blocks: [
    { id: "spawn-blocker", x: 2, y: 1, shape: [[0, 0]], color: "yellow" },
    { id: "trigger", x: 0, y: 3, shape: [[0, 0]], color: "red" },
    { id: "queued-blue-a", x: 2, y: 1, shape: [[0, 0]], color: "blue" },
    { id: "queued-blue-b", x: 2, y: 1, shape: [[0, 0]], color: "blue" },
  ],
});

const commitStep = (model: PuzzleModel, blockId: string, x: number, y: number): void => {
  model.beginAction();
  expect(model.moveBlockStep(blockId, x, y)).toBe(true);
  expect(model.commitAction()).toBe(true);
};

describe("independent board-external generators", () => {
  it("rejects frozen cargo before it can enter a generator queue", () => {
    const level = generatorFixture();
    level.blocks = level.blocks.map((block) => block.id === "queued-blue-a"
      ? { ...block, frozen: 1 }
      : block);
    expect(() => validateLevel(level)).toThrow(
      "Level 980: generator blue-generator queued block queued-blue-a cannot be frozen",
    );
  });

  it("keeps a blocked queue intact and hides every queued block", () => {
    const model = new PuzzleModel(generatorFixture());
    expect(model.getBlock("queued-blue-a")).toBeUndefined();
    expect(model.snapshot().queuedBlocks.map((block) => block.id)).toEqual(["queued-blue-a", "queued-blue-b"]);

    commitStep(model, "trigger", 1, 3);

    expect(model.snapshot().generators[0]).toMatchObject({
      head: 0,
      remaining: 2,
      nextBlockId: "queued-blue-a",
    });
    expect(model.getBlock("queued-blue-a")).toBeUndefined();
  });

  it("releases at most one queued block after a commit that vacates the full spawn footprint", () => {
    const model = new PuzzleModel(generatorFixture());
    model.beginAction();
    expect(model.moveBlockStep("spawn-blocker", 1, 1)).toBe(true);
    expect(model.moveBlockStep("spawn-blocker", 0, 1)).toBe(true);
    expect(model.commitAction()).toBe(true);

    expect(model.getBlock("queued-blue-a")).toMatchObject({ x: 2, y: 1 });
    expect(model.getBlock("queued-blue-b")).toBeUndefined();
    expect(model.snapshot().generators[0]).toMatchObject({
      head: 1,
      remaining: 1,
      nextBlockId: "queued-blue-b",
    });

    commitStep(model, "queued-blue-a", 2, 2);
    expect(model.getBlock("queued-blue-b")).toMatchObject({ x: 2, y: 1 });
    expect(model.snapshot().generators[0]).toMatchObject({ head: 2, remaining: 0 });
    expect(model.snapshot().generators[0].nextBlockId).toBeUndefined();
  });

  it("runs two machines independently when one spawn is blocked", () => {
    const level: LevelSpec = {
      id: 981,
      name: "two independent generators",
      difficulty: "normal",
      timeSeconds: 180,
      reward: 0,
      width: 4,
      height: 4,
      gates: [
        { id: "blue-right", side: "right", offset: 1, size: 1, color: "blue" },
        { id: "green-left", side: "left", offset: 1, size: 1, color: "green" },
        { id: "red-bottom", side: "bottom", offset: 0, size: 1, color: "red" },
      ],
      generators: [
        { id: "free", side: "right", offset: 1, spawn: [3, 1], queueBlockIds: ["blue"] },
        { id: "blocked", side: "left", offset: 1, spawn: [0, 1], queueBlockIds: ["green"] },
      ],
      blocks: [
        { id: "trigger", x: 0, y: 3, shape: [[0, 0]], color: "red" },
        { id: "blocker", x: 0, y: 1, shape: [[0, 0]], color: "red" },
        { id: "blue", x: 3, y: 1, shape: [[0, 0]], color: "blue" },
        { id: "green", x: 0, y: 1, shape: [[0, 0]], color: "green" },
      ],
    };
    const model = new PuzzleModel(level);
    commitStep(model, "trigger", 1, 3);

    expect(model.getBlock("blue")).toMatchObject({ x: 3, y: 1 });
    expect(model.getBlock("green")).toBeUndefined();
    expect(model.snapshot().generators.map(({ head, remaining }) => ({ head, remaining }))).toEqual([
      { head: 1, remaining: 0 },
      { head: 0, remaining: 1 },
    ]);
  });

  it("does not treat Pulse or a remote booster clear as a generator counter", () => {
    const blocked = new PuzzleModel({
      ...generatorFixture(),
      gates: generatorFixture().gates.map((gate, index) => index === 0 ? { ...gate, frozen: 2 } : gate),
    });
    blocked.beginAction();
    expect(blocked.thawAll(1)).toBe(true);
    expect(blocked.commitAction(false)).toBe(true);
    expect(blocked.snapshot().generators[0]).toMatchObject({ head: 0, remaining: 2 });

    blocked.beginAction();
    expect(blocked.removeBlockWithBooster("trigger").ok).toBe(true);
    expect(blocked.commitAction(false)).toBe(true);
    expect(blocked.snapshot().generators[0]).toMatchObject({ head: 0, remaining: 2 });
  });

  it("restores queue progress, released cargo and the vacating move with undo", () => {
    const model = new PuzzleModel(generatorFixture());
    const before = model.snapshot();
    commitStep(model, "spawn-blocker", 1, 1);
    expect(model.snapshot().generators[0].head).toBe(1);

    const clone = model.clone();
    expect(clone.snapshot()).toEqual(model.snapshot());
    commitStep(clone, "queued-blue-a", 2, 2);
    expect(clone.snapshot().generators[0].head).toBe(2);
    expect(model.snapshot().generators[0].head).toBe(1);

    expect(model.undo()).toBe(true);
    expect(model.snapshot()).toEqual(before);
  });

  it("is solved by the authoritative solver with generator progress in its state", () => {
    const level: LevelSpec = {
      id: 982,
      name: "generator solver fixture",
      difficulty: "normal",
      timeSeconds: 180,
      reward: 0,
      width: 3,
      height: 3,
      gates: [
        { id: "red-top", side: "top", offset: 0, size: 1, color: "red" },
        { id: "blue-bottom", side: "bottom", offset: 1, size: 1, color: "blue" },
      ],
      generators: [{
        id: "bottom-generator",
        side: "bottom",
        offset: 1,
        spawn: [1, 2],
        queueBlockIds: ["blue"],
      }],
      blocks: [
        { id: "red", x: 0, y: 0, shape: [[0, 0]], color: "red" },
        { id: "blue", x: 1, y: 2, shape: [[0, 0]], color: "blue" },
      ],
    };
    expect(() => validateLevel(level)).not.toThrow();
    const solution = solveLevelForValidation(level, 10_000);
    expect(solution).toMatchObject({ solved: true, minimumDrags: 2, clearLoad: 2 });

    const model = new PuzzleModel(level);
    for (const drag of solution.drags) {
      model.beginAction();
      for (const [x, y] of drag.path) expect(model.moveBlockStep(drag.blockId, x, y)).toBe(true);
      if (drag.exitSide) expect(model.tryExit(drag.blockId, drag.exitSide).ok).toBe(true);
      expect(model.commitAction()).toBe(true);
    }
    expect(model.snapshot()).toMatchObject({ complete: true, queuedBlocks: [] });
    expect(model.snapshot().generators[0]).toMatchObject({ head: 1, remaining: 0 });
  });
});
