// Historical prototype test with failed solve; never a certificate or production test.
import { describe, expect, it } from "vitest";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { solveLevelForValidation, solveLevelOptimally } from "../src/core/levelSolver";
import { LEVELS } from "../src/core/levels";
import { auditOrdinaryShutterCoverage } from "../src/core/shutterCoverage";
import { matchFormalBlockShape } from "../src/game/formalBlockShapes";
import type { LevelSpec } from "../src/core/types";

const level = LEVELS.find((candidate) => candidate.id === 20)!;

const playableMask = (candidate: LevelSpec): string[] => {
  const playable = new Set((candidate.playable ?? []).map(([x, y]) => `${x},${y}`));
  return Array.from({ length: candidate.height }, (_, y) => (
    Array.from({ length: candidate.width }, (_, x) => playable.has(`${x},${y}`) ? "#" : ".").join("")
  ));
};

const blockCells = (candidate: LevelSpec, hidden: boolean): Set<string> => new Set(candidate.blocks
  .filter((block) => Boolean(block.shutterId) === hidden)
  .flatMap((block) => block.shape.map(([dx, dy]) => `${block.x + dx},${block.y + dy}`)));

const replay = (candidate: LevelSpec, route: ReturnType<typeof solveLevelOptimally>["drags"]): void => {
  const model = new PuzzleModel(candidate);
  model.start();
  model.startCountdown();
  for (const drag of route) {
    model.beginAction();
    for (const [x, y] of drag.path) expect(model.moveBlockStep(drag.blockId, x, y), drag.blockId).toBe(true);
    if (drag.exitSide) expect(model.tryExit(drag.blockId, drag.exitSide).ok, drag.blockId).toBe(true);
    expect(model.commitAction(), drag.blockId).toBe(true);
  }
  expect(model.snapshot()).toMatchObject({ complete: true, blocks: [], queuedBlocks: [] });
};

describe("Lv20 v1.86 original full-rectangle remake", () => {
  it("uses a distinct 5×6 full board and fills both opening/shutter regions", () => {
    expect([level.width, level.height]).toEqual([5, 6]);
    expect(playableMask(level)).toEqual(["#####", "#####", "#####", "#####", "#####", "#####"]);
    expect(level.playable).toHaveLength(30);
    expect(level.blocks).toHaveLength(14);
    expect(level.blocks.reduce((sum, block) => sum + block.shape.length, 0)).toBe(30);
    expect(level.blocks.filter((block) => !block.shutterId)).toHaveLength(7);
    expect(level.blocks.filter((block) => block.shutterId === "vp-020-original-cover-1")).toHaveLength(7);
    expect(level.blocks.filter((block) => block.shape.length === 2)).toHaveLength(12);
    expect(level.blocks.filter((block) => block.shape.length === 3)).toHaveLength(2);
    expect(level.blocks.every((block) => Boolean(matchFormalBlockShape(block.shape)))).toBe(true);
    expect(level.shutters).toEqual([{
      id: "vp-020-original-cover-1", x: 0, y: 0, width: 5, height: 3, count: 6, skin: "shutter",
    }]);
    expect(blockCells(level, true)).toEqual(new Set(Array.from({ length: 15 }, (_, index) => (
      `${index % 5},${Math.floor(index / 5)}`
    ))));
    expect(blockCells(level, false)).toEqual(new Set(Array.from({ length: 15 }, (_, index) => (
      `${index % 5},${Math.floor(index / 5) + 3}`
    ))));
    expect(auditOrdinaryShutterCoverage(level)).toEqual([]);
    expect(level.difficulty).toBe("easy");
    expect(level.designTargets?.minimumRepositionOverhead).toBe(5);
    expect(() => validateLevel(level)).not.toThrow();
  });

  it("preserves source gate counts and restores the source color bindings", () => {
    expect(level.gates).toHaveLength(8);
    expect(level.gates.filter((gate) => !gate.frozen)).toHaveLength(1);
    expect(level.gates.map((gate) => gate.frozen).filter(Boolean).sort((a, b) => a! - b!))
      .toEqual([1, 2, 3, 6, 7, 8, 10]);
    const frozenByValue = new Map(level.gates.filter((gate) => gate.frozen).map((gate) => [gate.frozen, gate.color]));
    expect(Object.fromEntries(frozenByValue)).toEqual({
      1: "pink", 2: "blue", 3: "red", 6: "red", 7: "pink", 8: "green", 10: "red",
    });
  });

  it("has a fresh solvable route within the simple 5–10 reposition band", () => {
    const debugModel = new PuzzleModel(level);
    debugModel.start();
    debugModel.startCountdown();
    console.log("LV20_SNAPSHOT", JSON.stringify(debugModel.snapshot()));
    debugModel.beginAction();
    console.log("LV20_YELLOW_EXIT", JSON.stringify(debugModel.tryExit("cc-020-b1-06", "bottom")));
    console.log("LV20_YELLOW_COMMIT", debugModel.commitAction(), JSON.stringify(debugModel.snapshot()));
    const proof = solveLevelOptimally(level, 1_000_000);
    const validationProof = solveLevelForValidation(level, 1_000_000);
    console.log("LV20_VALIDATION", JSON.stringify({ solved: validationProof.solved, termination: validationProof.termination, exploredStates: validationProof.exploredStates, minimumDrags: validationProof.minimumDrags, staticUnsatReasons: validationProof.staticUnsatReasons }));
    console.log("LV20_PROOF", JSON.stringify({ solved: proof.solved, termination: proof.termination, exploredStates: proof.exploredStates, minimumDrags: proof.minimumDrags, clearLoad: proof.clearLoad, repositionOverhead: proof.repositionOverhead, staticUnsatReasons: proof.staticUnsatReasons }));
    expect(proof.solved, proof.termination).toBe(true);
    expect(proof.repositionOverhead).toBeGreaterThanOrEqual(5);
    expect(proof.repositionOverhead).toBeLessThanOrEqual(10);
    expect(proof.clearLoad).toBe(14);
    expect(proof.minimumDrags).toBe(proof.clearLoad + proof.repositionOverhead);
    replay(level, proof.drags);
  }, 30_000);
});
