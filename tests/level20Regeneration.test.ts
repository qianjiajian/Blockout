import { describe, expect, it } from "vitest";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { applyAllBlockAdjacencyRepair } from "../src/core/allBlockAdjacencyOverrides";
import { solveLevelOptimally } from "../src/core/levelSolver";
import { LEVELS_BEFORE_LEVEL20_ORIGINAL_REMAKE as LEVELS, LEVELS_BEFORE_SINGLE_BLOCK_ADJACENCY } from "../src/core/levels";
import { applyMechanismParityRepair1To100 } from "../src/core/mechanismParityRepairs1To100";
import { auditOrdinaryShutterCoverage } from "../src/core/shutterCoverage";
import type { LevelSpec } from "../src/core/types";
import { matchFormalBlockShape } from "../src/game/formalBlockShapes";

const DOGBONE_MASK = ["#####", "#####", "#####", "..#..", "..#..", "#####", "#####", "#####"];

const playableMask = (level: LevelSpec): string[] => {
  const playable = new Set((level.playable ?? []).map(([x, y]) => `${x},${y}`));
  return Array.from({ length: level.height }, (_, y) => (
    Array.from({ length: level.width }, (_, x) => playable.has(`${x},${y}`) ? "#" : ".").join("")
  ));
};

const blockCells = (level: LevelSpec, hidden: boolean): Set<string> => new Set(level.blocks
  .filter((block) => Boolean(block.shutterId) === hidden)
  .flatMap((block) => block.shape.map(([dx, dy]) => `${block.x + dx},${block.y + dy}`)));

const sameColorAdjacency = (level: LevelSpec): string[][] => {
  const result: string[][] = [];
  for (let leftIndex = 0; leftIndex < level.blocks.length; leftIndex += 1) {
    const left = level.blocks[leftIndex]!;
    const leftCells = left.shape.map(([dx, dy]) => [left.x + dx, left.y + dy] as const);
    for (let rightIndex = leftIndex + 1; rightIndex < level.blocks.length; rightIndex += 1) {
      const right = level.blocks[rightIndex]!;
      if ((left.layers?.[0] ?? left.color) !== (right.layers?.[0] ?? right.color)) continue;
      const rightCells = new Set(right.shape.map(([dx, dy]) => `${right.x + dx},${right.y + dy}`));
      if (leftCells.some(([x, y]) => (
        rightCells.has(`${x + 1},${y}`)
        || rightCells.has(`${x - 1},${y}`)
        || rightCells.has(`${x},${y + 1}`)
        || rightCells.has(`${x},${y - 1}`)
      ))) result.push([left.id, right.id]);
    }
  }
  return result;
};

const replay = (level: LevelSpec, route: ReturnType<typeof solveLevelOptimally>["drags"]): void => {
  const model = new PuzzleModel(level);
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

describe("Lv20 competitor dogbone and physical shutter regeneration", () => {
  it("publishes the observed 5×8 opening and a strict 5×3 seven-block warehouse", () => {
    const source = LEVELS_BEFORE_SINGLE_BLOCK_ADJACENCY.find((level) => level.id === 20);
    const level = LEVELS.find((candidate) => candidate.id === 20)!;
    expect(source).toBeDefined();
    expect(level.timeSeconds).toBe(75);
    expect([level.width, level.height]).toEqual([5, 8]);
    expect(playableMask(level)).toEqual(DOGBONE_MASK);
    expect(level.playable).toHaveLength(32);
    expect(level.blocks).toHaveLength(14);
    expect(level.blocks.reduce((sum, block) => sum + block.shape.length, 0)).toBe(30);
    expect(level.blocks.filter((block) => !block.shutterId)).toHaveLength(7);
    expect(level.blocks.filter((block) => block.shutterId === "vp-020-cover-1")).toHaveLength(7);
    expect(level.blocks.filter((block) => block.shape.length === 2)).toHaveLength(12);
    expect(level.blocks.filter((block) => block.shape.length === 3)).toHaveLength(2);
    expect(level.blocks.every((block) => Boolean(matchFormalBlockShape(block.shape)))).toBe(true);
    expect(level.shutters).toEqual([{
      id: "vp-020-cover-1", x: 0, y: 0, width: 5, height: 3, count: 6, skin: "shutter",
    }]);
    expect(blockCells(level, true)).toEqual(new Set(Array.from({ length: 15 }, (_, index) => (
      `${index % 5},${Math.floor(index / 5)}`
    ))));
    expect(blockCells(level, false)).toEqual(new Set(Array.from({ length: 15 }, (_, index) => (
      `${index % 5},${Math.floor(index / 5) + 5}`
    ))));
    expect(auditOrdinaryShutterCoverage(level)).toEqual([]);
    expect(sameColorAdjacency(level)).toEqual([]);
    expect(level.featureIntro?.kind).toBe("shutter");
    expect(() => validateLevel(level)).not.toThrow();
  });

  it("keeps the exact competitor mechanism quantities and the minimal ice-hidden colour swap", () => {
    const level = LEVELS[19]!;
    expect(level.gates).toHaveLength(8);
    expect(level.gates.filter((gate) => !gate.frozen)).toHaveLength(1);
    expect(level.gates.map((gate) => gate.frozen).filter(Boolean).sort((a, b) => a! - b!))
      .toEqual([1, 2, 3, 6, 7, 8, 10]);
    expect(level.gates.find((gate) => gate.id === "lv020-exact-bottom-red-2"))
      .toMatchObject({ side: "bottom", offset: 0, size: 2, color: "red", frozen: 2 });
    expect(level.gates.find((gate) => gate.id === "lv020-exact-left-blue-3"))
      .toMatchObject({ side: "left", offset: 5, size: 1, color: "blue", frozen: 3 });
    expect(applyAllBlockAdjacencyRepair(level)).toBe(level);
    expect(applyMechanismParityRepair1To100(level)).toBe(level);
  });

  it("proves ten necessary reposition drags and replays the exact optimal route", () => {
    const level = LEVELS[19]!;
    expect(level.designTargets?.minimumRepositionOverhead).toBe(10);
    const proof = solveLevelOptimally(level, 100_000);
    expect(proof.solved, proof.termination).toBe(true);
    expect(proof.exploredStates).toBe(3_052);
    expect(proof.minimumDrags).toBe(24);
    expect(proof.clearLoad).toBe(14);
    expect(proof.repositionOverhead).toBe(10);
    replay(level, proof.drags);
  }, 30_000);
});
