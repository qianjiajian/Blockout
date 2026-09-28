import { describe, expect, it } from "vitest";

import {
  exitFrontierCells,
  exitFrontierSpan,
  gateCoversExitFrontier,
} from "../src/core/blockExitFrontier";
import { scoreBlockOutLevel } from "../src/core/blockOutDifficulty";
import { solveLevelForValidation } from "../src/core/levelSolver";
import { canClearWithOtherBlocksFixed } from "../src/core/levelStrategyMetrics";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { LEVELS } from "../src/core/levels";
import type { LevelSpec, Point } from "../src/core/types";

const T4: Point[] = [[0, 0], [1, 0], [2, 0], [1, 1]];
const H3: Point[] = [[0, 0], [1, 0], [2, 0]];

const fixture = (shape: Point[], y: number): LevelSpec => ({
  id: 933,
  name: "exit-frontier fixture",
  difficulty: "normal",
  timeSeconds: 30,
  reward: 0,
  width: 3,
  height: 2,
  playable: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]],
  gates: [{ id: "red-bottom", side: "bottom", offset: 1, size: 1, color: "red" }],
  blocks: [{ id: "red-piece", x: 0, y, shape, color: "red" }],
});

describe("directional exit frontier", () => {
  it("uses the T stem for contact but does not let the wider rear pass a narrow gate", () => {
    expect(exitFrontierCells(T4, "bottom")).toEqual([[1, 1]]);
    expect(exitFrontierSpan(T4, "bottom")).toBe(1);
    expect(exitFrontierCells(T4, "top")).toEqual([[0, 0], [1, 0], [2, 0]]);
    expect(exitFrontierSpan(T4, "top")).toBe(3);
    expect(gateCoversExitFrontier(
      { width: 3, height: 2 },
      T4,
      { side: "bottom", offset: 1, size: 1 },
    )).toBe(false);
    expect(gateCoversExitFrontier(
      { width: 3, height: 2 },
      T4,
      { side: "top", offset: 1, size: 1 },
    )).toBe(false);
  });

  it("still requires the complete three-cell frontier for a horizontal bar", () => {
    const cells = H3.map(([x, y]) => [x, y + 1] as Point);
    expect(exitFrontierSpan(cells, "bottom")).toBe(3);
    expect(gateCoversExitFrontier(
      { width: 3, height: 2 },
      cells,
      { side: "bottom", offset: 1, size: 1 },
    )).toBe(false);
    expect(gateCoversExitFrontier(
      { width: 3, height: 2 },
      cells,
      { side: "bottom", offset: 0, size: 3 },
    )).toBe(true);
  });

  it("keeps PuzzleModel and the fresh solver consistent for both apertures", () => {
    const tLevel = fixture(T4, 0);
    validateLevel(tLevel);
    const tModel = new PuzzleModel(tLevel);
    expect(tModel.exitAttemptStatus("red-piece", "bottom")).toBe("no-gate");
    expect(canClearWithOtherBlocksFixed(tLevel, "red-piece")).toBe(false);
    const tSolution = solveLevelForValidation(tLevel, 20_000);
    expect(tSolution.solved).toBe(false);
    expect(tSolution.staticUnsatReasons).toEqual([
      expect.objectContaining({ code: "missing-compatible-exit", blockId: "red-piece" }),
    ]);

    const wideT = { ...tLevel, gates: [{ ...tLevel.gates[0], offset: 0, size: 3 }] };
    expect(new PuzzleModel(wideT).tryExit("red-piece", "bottom").ok).toBe(true);
    const wideSolution = solveLevelForValidation(wideT, 20_000);
    expect(wideSolution.solved).toBe(true);
    expect(wideSolution.drags).toEqual([{ blockId: "red-piece", path: [], exitSide: "bottom" }]);

    const barLevel = fixture(H3, 1);
    validateLevel(barLevel);
    const barModel = new PuzzleModel(barLevel);
    expect(barModel.exitAttemptStatus("red-piece", "bottom")).toBe("no-gate");
    expect(canClearWithOtherBlocksFixed(barLevel, "red-piece")).toBe(false);
    const barSolution = solveLevelForValidation(barLevel, 20_000);
    expect(barSolution.solved).toBe(false);
    expect(barSolution.staticUnsatReasons).toEqual([
      expect.objectContaining({ code: "missing-compatible-exit", blockId: "red-piece" }),
    ]);
  });

  it("uses the same directional span in the difficulty aperture metric", () => {
    const withSizeTwoGate = (shape: Point[], y: number): LevelSpec => ({
      ...fixture(shape, y),
      gates: [{ id: "red-bottom", side: "bottom", offset: 0, size: 2, color: "red" }],
    });
    const tCompetition = scoreBlockOutLevel(withSizeTwoGate(T4, 0)).components.exitCompetition;
    const barCompetition = scoreBlockOutLevel(withSizeTwoGate(H3, 1)).components.exitCompetition;
    expect(tCompetition).toBeLessThan(barCompetition);
  });
});

describe("continuous exit clearance", () => {
  it("keeps a blocked rigid piece inside the board until its path is clear", () => {
    const level: LevelSpec = {
      id: 934,
      name: "blocked exit path fixture",
      difficulty: "normal",
      timeSeconds: 30,
      reward: 0,
      width: 3,
      height: 3,
      playable: Array.from({ length: 3 }, (_, y) => (
        Array.from({ length: 3 }, (_, x) => [x, y] as Point)
      )).flat(),
      gates: [
        { id: "red-left", side: "left", offset: 1, size: 2, color: "red" },
        { id: "yellow-top", side: "top", offset: 0, size: 1, color: "yellow" },
      ],
      blocks: [
        {
          id: "red-l",
          x: 0,
          y: 1,
          shape: [[1, 0], [0, 1], [1, 1], [2, 1]],
          color: "red",
        },
        { id: "yellow-blocker", x: 0, y: 0, shape: [[0, 0], [0, 1]], color: "yellow" },
      ],
    };
    const model = new PuzzleModel(level);
    expect(model.exitAttemptStatus("red-l", "left")).toBe("blocked-path");
    expect(model.tryExit("red-l", "left")).toEqual({ ok: false });
    expect(model.getBlock("red-l")).toBeDefined();

    expect(model.tryExit("yellow-blocker", "top").ok).toBe(true);
    expect(model.exitAttemptStatus("red-l", "left")).toBe("ok");
    expect(model.tryExit("red-l", "left").ok).toBe(true);
  });

  it("rejects the four confirmed initial-state suction cases", () => {
    const cases = [
      [43, "43-o5", "left"],
      [63, "v146-63-opening-13", "top"],
      [97, "r147-97-openingUpper-5", "left"],
      [137, "v112-137-b18", "right"],
    ] as const;
    for (const [levelId, blockId, side] of cases) {
      const model = new PuzzleModel(LEVELS.find((level) => level.id === levelId)!);
      expect(model.exitAttemptStatus(blockId, side), `${levelId}:${blockId}`).toBe("blocked-path");
      expect(model.tryExit(blockId, side), `${levelId}:${blockId}`).toEqual({ ok: false });
      expect(model.getBlock(blockId), `${levelId}:${blockId}`).toBeDefined();
    }
  });
});
