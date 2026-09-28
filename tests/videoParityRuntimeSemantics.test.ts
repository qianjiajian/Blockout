import { describe, expect, it } from "vitest";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { solveLevelForValidation } from "../src/core/levelSolver";
import { LEVELS } from "../src/core/levels";

const VIDEO_PARITY_LEVELS_1_TO_100 = LEVELS.slice(0, 100);
import {
  isFullThreeByThreeCargo,
  normalizeRuntimeLevel,
  normalizeRuntimeReplayRoute,
} from "../src/core/runtimeLevelNormalization";
import { rect, type LevelSpec } from "../src/core/types";

const baseLevel = (overrides: Partial<LevelSpec> = {}): LevelSpec => ({
  id: 979,
  name: "video parity runtime fixture",
  difficulty: "normal",
  timeSeconds: 60,
  reward: 0,
  width: 4,
  height: 4,
  gates: [{ id: "red-left", side: "left", offset: 0, size: 1, color: "red" }],
  blocks: [{ id: "red", x: 0, y: 0, shape: rect(1, 1), color: "red" }],
  ...overrides,
});

describe("video-parity runtime invariants", () => {
  it("ships the competitor's eleven full 3x3 cargo blocks without shrinking them", () => {
    const sq3 = VIDEO_PARITY_LEVELS_1_TO_100.flatMap((level) => level.blocks
      .filter((block) => isFullThreeByThreeCargo(block.shape))
      .map((block) => ({ levelId: level.id, blockId: block.id })));
    expect(sq3).toHaveLength(11);
    expect([...new Set(sq3.map(({ levelId }) => levelId))]).toEqual([8, 14, 18, 59, 64, 72, 76, 89]);
  });

  it("preserves and accepts a full 3x3 footprint at the authoritative model boundary", () => {
    const fullThreeByThree = baseLevel({
      width: 5,
      height: 5,
      blocks: [{ id: "sq3", x: 1, y: 1, shape: rect(3, 3), color: "red" }],
    });
    expect(normalizeRuntimeLevel(fullThreeByThree).blocks[0].shape).toEqual(rect(3, 3));
    expect(() => validateLevel(fullThreeByThree)).not.toThrow();
    expect(new PuzzleModel(fullThreeByThree).getBlock("sq3")?.shape).toEqual(rect(3, 3));
    expect(normalizeRuntimeReplayRoute(fullThreeByThree, [{
      blockId: "sq3",
      path: [[1, 1], [2, 1]],
      exitSide: "right",
    }])).toEqual([{
      blockId: "sq3",
      path: [[1, 1], [2, 1]],
      exitSide: "right",
    }]);

    expect(() => validateLevel(baseLevel({
      width: 5,
      height: 5,
      blocks: [{ id: "rect2x3", x: 1, y: 1, shape: rect(2, 3), color: "red" }],
    }))).not.toThrow();
  });

  it("rejects a two-layer block whose outer and inner colors are identical", () => {
    expect(() => validateLevel(baseLevel({
      blocks: [{
        id: "same-color-shell",
        x: 0,
        y: 0,
        shape: rect(1, 1),
        color: "red",
        layers: ["red", "red"],
      }],
    }))).toThrow(/distinct outer and inner shell colors/);
  });

  it("treats omitted frozen as ordinary and rejects ambiguous explicit zero countdowns", () => {
    expect(() => validateLevel(baseLevel())).not.toThrow();
    expect(new PuzzleModel(baseLevel()).snapshot().gates[0].frozen).toBe(0);

    expect(() => validateLevel(baseLevel({
      gates: [{ id: "zero-gate", side: "left", offset: 0, size: 1, color: "red", frozen: 0 }],
    }))).toThrow(/must omit frozen for an ordinary exit/);
    expect(() => validateLevel(baseLevel({
      blocks: [{ id: "zero-block", x: 0, y: 0, shape: rect(1, 1), color: "red", frozen: 0 }],
    }))).toThrow(/must omit frozen when thawed/);
  });

  it("matches the competitor numeric-ice countdown on clears, not moves or time", () => {
    const level = baseLevel({
      width: 5,
      height: 3,
      gates: [
        { id: "red-left", side: "left", offset: 0, size: 1, color: "red" },
        { id: "green-left", side: "left", offset: 1, size: 1, color: "green" },
        { id: "yellow-right", side: "right", offset: 1, size: 1, color: "yellow" },
        { id: "blue-right", side: "right", offset: 2, size: 1, color: "blue", frozen: 2 },
      ],
      blocks: [
        { id: "red-clear", x: 0, y: 0, shape: rect(1, 1), color: "red" },
        {
          id: "green-yellow-shell",
          x: 0,
          y: 1,
          shape: rect(1, 1),
          color: "green",
          layers: ["green", "yellow"],
        },
        { id: "blue-ice", x: 4, y: 2, shape: rect(1, 1), color: "blue", frozen: 2 },
      ],
    });
    const model = new PuzzleModel(level);
    const frozenState = () => ({
      block: model.getBlock("blue-ice")?.frozen,
      gate: model.snapshot().gates.find((gate) => gate.id === "blue-right")?.frozen,
    });

    expect(frozenState()).toEqual({ block: 2, gate: 2 });
    expect(model.isBlockActive(model.getBlock("blue-ice")!)).toBe(false);
    expect(model.canPlace(model.getBlock("blue-ice")!, 3, 2)).toBe(false);

    model.beginAction();
    expect(model.moveBlockStep("red-clear", 1, 0)).toBe(true);
    expect(model.commitAction()).toBe(true);
    expect(model.tick(1)).toBe(false);
    expect(frozenState()).toEqual({ block: 2, gate: 2 });

    model.beginAction();
    expect(model.moveBlockStep("red-clear", 0, 0)).toBe(true);
    expect(model.tryExit("red-clear", "left").ok).toBe(true);
    expect(model.commitAction()).toBe(true);
    expect(frozenState()).toEqual({ block: 1, gate: 1 });

    model.beginAction();
    const shellExit = model.tryExit("green-yellow-shell", "left");
    expect(shellExit).toMatchObject({ ok: true, layerRemoved: true, complete: false });
    expect(model.commitAction()).toBe(true);
    expect(model.getBlock("green-yellow-shell")?.layers).toEqual(["yellow"]);
    expect(frozenState()).toEqual({ block: 0, gate: 0 });
    expect(model.isBlockActive(model.getBlock("blue-ice")!)).toBe(true);
    expect(model.canPlace(model.getBlock("blue-ice")!, 3, 2)).toBe(true);
  });

  it("keeps the solver on the same numeric-ice and shell-clear ordering", () => {
    const level = baseLevel({
      width: 5,
      height: 3,
      gates: [
        { id: "red-left", side: "left", offset: 0, size: 1, color: "red" },
        { id: "green-left", side: "left", offset: 1, size: 1, color: "green" },
        { id: "yellow-right", side: "right", offset: 1, size: 1, color: "yellow" },
        { id: "blue-right", side: "right", offset: 2, size: 1, color: "blue", frozen: 2 },
      ],
      blocks: [
        { id: "red-clear", x: 0, y: 0, shape: rect(1, 1), color: "red" },
        {
          id: "green-yellow-shell",
          x: 0,
          y: 1,
          shape: rect(1, 1),
          color: "green",
          layers: ["green", "yellow"],
        },
        { id: "blue-ice", x: 4, y: 2, shape: rect(1, 1), color: "blue", frozen: 2 },
      ],
    });
    const solution = solveLevelForValidation(level, 5_000);
    expect(solution.solved).toBe(true);
    const exits = solution.drags.filter((drag) => drag.exitSide);
    const blueIndex = exits.findIndex((drag) => drag.blockId === "blue-ice");
    expect(blueIndex).toBeGreaterThanOrEqual(2);
    expect(exits.slice(0, blueIndex).map((drag) => drag.blockId)).toEqual(expect.arrayContaining([
      "red-clear",
      "green-yellow-shell",
    ]));
    expect(exits.filter((drag) => drag.blockId === "green-yellow-shell")).toHaveLength(2);
  });

  it("applies movementAxis to exits in both PuzzleModel and the solver", () => {
    const level = baseLevel({
      width: 3,
      height: 3,
      gates: [
        { id: "red-top", side: "top", offset: 0, size: 1, color: "red" },
        { id: "blue-top", side: "top", offset: 2, size: 1, color: "blue" },
        { id: "red-left", side: "left", offset: 0, size: 1, color: "red" },
        { id: "blue-right", side: "right", offset: 0, size: 1, color: "blue" },
      ],
      blocks: [
        { id: "horizontal", x: 0, y: 0, shape: rect(1, 1), color: "red", movementAxis: "horizontal" },
        { id: "vertical", x: 2, y: 0, shape: rect(1, 1), color: "blue", movementAxis: "vertical" },
      ],
    });
    const model = new PuzzleModel(level);
    expect(model.exitAttemptStatus("horizontal", "top")).toBe("no-gate");
    expect(model.exitAttemptStatus("horizontal", "left")).toBe("ok");
    expect(model.exitAttemptStatus("vertical", "right")).toBe("no-gate");
    expect(model.exitAttemptStatus("vertical", "top")).toBe("ok");
    expect(model.possibleExitSides(model.getBlock("horizontal")!)).toEqual(["left"]);
    expect(model.possibleExitSides(model.getBlock("vertical")!)).toEqual(["top"]);

    const solution = solveLevelForValidation(level, 1_000);
    expect(solution.solved).toBe(true);
    expect(solution.drags.find((drag) => drag.blockId === "horizontal")?.exitSide).toBe("left");
    expect(solution.drags.find((drag) => drag.blockId === "vertical")?.exitSide).toBe("top");
  });

  it("starts a timed feeder only after the first successful player operation", () => {
    const level = baseLevel({
      width: 4,
      height: 3,
      gates: [
        { id: "red-bottom", side: "bottom", offset: 0, size: 1, color: "red" },
        { id: "blue-right", side: "right", offset: 1, size: 1, color: "blue" },
      ],
      generators: [{
        id: "timed-feeder",
        side: "top",
        offset: 2,
        spawn: [2, 1],
        queueBlockIds: ["queued-a", "queued-b"],
        trigger: "time",
        intervalSeconds: 0.25,
        initialDelaySeconds: 0.5,
      }],
      blocks: [
        { id: "starter", x: 0, y: 2, shape: rect(1, 1), color: "red" },
        { id: "queued-a", x: 2, y: 1, shape: rect(1, 1), color: "blue" },
        { id: "queued-b", x: 2, y: 1, shape: rect(1, 1), color: "blue" },
      ],
    });
    const model = new PuzzleModel(level);

    expect(model.tick(10)).toBe(false);
    expect(model.snapshot()).toMatchObject({
      started: false,
      remainingSeconds: 60,
      generators: [{ head: 0, remaining: 2, elapsed: 0 }],
    });
    model.beginAction();
    expect(model.commitAction()).toBe(false);
    expect(model.tick(10)).toBe(false);
    expect(model.snapshot().generators[0]).toMatchObject({ head: 0, remaining: 2, elapsed: 0 });

    model.beginAction();
    expect(model.moveBlockStep("starter", 1, 2)).toBe(true);
    expect(model.commitAction()).toBe(true);
    expect(model.snapshot().started).toBe(true);
    expect(model.tick(0.49)).toBe(false);
    expect(model.snapshot().generators[0]).toMatchObject({ head: 0, remaining: 2, elapsed: 0.49 });
    expect(model.tick(0.01)).toBe(true);
    expect(model.getBlock("queued-a")).toMatchObject({ x: 2, y: 1 });
    expect(model.snapshot().generators[0]).toMatchObject({ head: 1, remaining: 1, elapsed: 0 });

    model.beginAction();
    expect(model.moveBlockStep("queued-a", 3, 1)).toBe(true);
    expect(model.commitAction()).toBe(true);
    expect(model.tick(0.24)).toBe(false);
    expect(model.tick(0.01)).toBe(true);
    expect(model.getBlock("queued-b")).toMatchObject({ x: 2, y: 1 });
    expect(model.snapshot().generators[0]).toMatchObject({ head: 2, remaining: 0, elapsed: 0 });
  });

  it("holds a blocked timed feeder ready without consuming cargo or cadence", () => {
    const level = baseLevel({
      width: 4,
      height: 3,
      generators: [{
        id: "timed-feeder",
        side: "top",
        offset: 2,
        spawn: [2, 1],
        queueBlockIds: ["queued"],
        trigger: "time",
        intervalSeconds: 0.5,
        initialDelaySeconds: 0.5,
      }],
      blocks: [
        { id: "starter", x: 0, y: 2, shape: rect(1, 1), color: "red" },
        { id: "spawn-blocker", x: 2, y: 1, shape: rect(1, 1), color: "blue" },
        { id: "queued", x: 2, y: 1, shape: rect(1, 1), color: "red" },
      ],
    });
    const model = new PuzzleModel(level);
    model.beginAction();
    expect(model.moveBlockStep("starter", 1, 2)).toBe(true);
    model.commitAction();

    expect(model.tick(0.75)).toBe(false);
    expect(model.snapshot().generators[0]).toMatchObject({ remaining: 1, elapsed: 0.5 });
    model.beginAction();
    expect(model.moveBlockStep("spawn-blocker", 3, 1)).toBe(true);
    model.commitAction();
    expect(model.tick(0)).toBe(true);
    expect(model.snapshot().generators[0]).toMatchObject({ remaining: 0, elapsed: 0 });
  });

  it("requires positive explicit initialDelaySeconds", () => {
    const timed = (initialDelaySeconds: number): LevelSpec => baseLevel({
      generators: [{
        id: "timed",
        side: "top",
        offset: 1,
        spawn: [1, 1],
        queueBlockIds: ["queued"],
        trigger: "time",
        intervalSeconds: 1,
        initialDelaySeconds,
      }],
      blocks: [
        ...baseLevel().blocks,
        { id: "queued", x: 1, y: 1, shape: rect(1, 1), color: "blue" },
      ],
    });
    expect(() => validateLevel(timed(0))).toThrow(/invalid initialDelaySeconds/);
    expect(() => validateLevel(timed(-1))).toThrow(/invalid initialDelaySeconds/);
    expect(() => validateLevel(timed(0.1))).not.toThrow();
  });
});
