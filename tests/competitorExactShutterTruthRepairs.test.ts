import { describe, expect, it } from "vitest";

import {
  applyCompetitorExactShutterTruthRepair,
  COMPETITOR_EXACT_SHUTTER_TRUTH_REPAIR_LEVEL_IDS,
  COMPETITOR_EXACT_SHUTTER_TRUTH_REPAIR_VERSION,
} from "../src/core/competitorExactShutterTruthRepairs";
import { finalGeneratorPlacementIssues } from "../src/core/finalGeneratorContracts";
import { generatorSpawnAlignmentIssues } from "../src/core/generatorSpawnAlignmentRepairs";
import { solveLevelForValidation, type SolverDrag } from "../src/core/levelSolver";
import { LEVELS_BEFORE_COMPETITOR_EXACT_SHUTTER_TRUTH_REPAIR } from "../src/core/levels";
import { openingVisibleBlockIds } from "../src/core/openingBlockCountRepairs";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { auditOrdinaryShutterCoverage } from "../src/core/shutterCoverage";
import type { BlockSpec, LevelSpec } from "../src/core/types";

const repaired = new Map(COMPETITOR_EXACT_SHUTTER_TRUTH_REPAIR_LEVEL_IDS.map((levelId) => {
  const source = LEVELS_BEFORE_COMPETITOR_EXACT_SHUTTER_TRUTH_REPAIR[levelId - 1]!;
  return [levelId, applyCompetitorExactShutterTruthRepair(source)] as const;
}));

const openingBlocks = (level: LevelSpec): BlockSpec[] => {
  const ids = new Set(openingVisibleBlockIds(level));
  return level.blocks.filter(({ id }) => ids.has(id));
};

const activeColor = (block: BlockSpec): string => block.layers?.[0] ?? block.color;

const openingAdjacencyIssues = (level: LevelSpec): string[] => {
  const blocks = openingBlocks(level);
  const occupied = new Map<string, BlockSpec>();
  for (const block of blocks) for (const [dx, dy] of block.shape) {
    occupied.set(`${block.x + dx},${block.y + dy}`, block);
  }
  const issues = new Set<string>();
  for (const block of blocks) for (const [dx, dy] of block.shape) {
    const x = block.x + dx;
    const y = block.y + dy;
    for (const [stepX, stepY] of [[1, 0], [0, 1]] as const) {
      const other = occupied.get(`${x + stepX},${y + stepY}`);
      if (other && other.id !== block.id && activeColor(other) === activeColor(block)) {
        issues.add([block.id, other.id].sort().join("|"));
      }
    }
  }
  return [...issues].sort();
};

const replay = (level: LevelSpec, drags: readonly SolverDrag[]): boolean => {
  const model = new PuzzleModel(level);
  model.start();
  model.startCountdown();
  for (const drag of drags) {
    if (!model.getBlock(drag.blockId)) return false;
    model.beginAction();
    for (const [x, y] of drag.path) {
      const before = model.getBlock(drag.blockId);
      if (!before) return false;
      const distance = Math.abs(before.x - x) + Math.abs(before.y - y);
      const moved = distance === 1
        ? model.moveBlockStep(drag.blockId, x, y)
        : model.moveBlock(drag.blockId, x, y);
      if (!moved) return false;
    }
    if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) return false;
    if (!model.commitAction()) return false;
  }
  const snapshot = model.snapshot();
  return snapshot.complete && snapshot.blocks.length === 0 && snapshot.queuedBlocks.length === 0;
};

const shapeName = (block: BlockSpec): string => {
  const xs = block.shape.map(([x]) => x);
  const ys = block.shape.map(([, y]) => y);
  const width = Math.max(...xs) - Math.min(...xs) + 1;
  const height = Math.max(...ys) - Math.min(...ys) + 1;
  const size = block.shape.length;
  if (size === 1) return "SINGLE";
  if (size === 2) return width === 2 ? "H2" : "V2";
  if (size === 3) return width === 3 ? "H3" : height === 3 ? "V3" : "L3";
  if (size === 4 && width === 2 && height === 2) return "SQ2";
  if (size === 4 && ((width === 3 && height === 2) || (width === 2 && height === 3))) {
    const shortAxis = width === 3 ? ys : xs;
    const counts = new Map<number, number>();
    shortAxis.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
    const singletonIndex = shortAxis.findIndex((value) => counts.get(value) === 1);
    const longCoordinate = width === 3 ? xs[singletonIndex] : ys[singletonIndex];
    return longCoordinate === 1 ? "T4" : "L4";
  }
  if (size === 5) return "CROSS5";
  if (size === 6 && ((width === 3 && height === 2) || (width === 2 && height === 3))) return "RECT2X3";
  return `CELLS${size}`;
};

const histogram = (blocks: readonly BlockSpec[]): Record<string, number> => {
  const result: Record<string, number> = {};
  for (const block of blocks) {
    const name = shapeName(block);
    result[name] = (result[name] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(result).sort(([left], [right]) => left.localeCompare(right)));
};

const idsFor = (level: LevelSpec, shutterId: string): string[] => level.blocks
  .filter((block) => block.shutterId === shutterId)
  .map(({ id }) => id)
  .sort();

describe(`competitor exact shutter truth ${COMPETITOR_EXACT_SHUTTER_TRUTH_REPAIR_VERSION}`, () => {
  it("is scoped, preserves unrelated fields and is referentially idempotent", () => {
    expect(COMPETITOR_EXACT_SHUTTER_TRUTH_REPAIR_LEVEL_IDS).toEqual([46, 54, 57]);
    expect(applyCompetitorExactShutterTruthRepair(LEVELS_BEFORE_COMPETITOR_EXACT_SHUTTER_TRUTH_REPAIR[0]!))
      .toBe(LEVELS_BEFORE_COMPETITOR_EXACT_SHUTTER_TRUTH_REPAIR[0]);
    for (const levelId of COMPETITOR_EXACT_SHUTTER_TRUTH_REPAIR_LEVEL_IDS) {
      const source = LEVELS_BEFORE_COMPETITOR_EXACT_SHUTTER_TRUTH_REPAIR[levelId - 1]!;
      const after = repaired.get(levelId)!;
      expect(after).not.toBe(source);
      expect(applyCompetitorExactShutterTruthRepair(after), `Lv${levelId}`).toBe(after);
      expect({
        id: after.id, name: after.name, difficulty: after.difficulty, timeSeconds: after.timeSeconds,
        reward: after.reward, parMoves: after.parMoves, width: after.width, height: after.height,
        flipDoors: after.flipDoors, coloredGrids: after.coloredGrids, elevators: after.elevators,
        conveyors: after.conveyors, featureIntro: after.featureIntro, designTargets: after.designTargets,
      }).toEqual({
        id: source.id, name: source.name, difficulty: source.difficulty, timeSeconds: source.timeSeconds,
        reward: source.reward, parMoves: source.parMoves, width: source.width, height: source.height,
        flipDoors: source.flipDoors, coloredGrids: source.coloredGrids, elevators: source.elevators,
        conveyors: source.conveyors, featureIntro: source.featureIntro, designTargets: source.designTargets,
      });
    }
  });

  it("restores the exact masks, panel rectangles and hidden cohorts", () => {
    const lv46 = repaired.get(46)!;
    const lv54 = repaired.get(54)!;
    const lv57 = repaired.get(57)!;
    expect(lv46.playable).toHaveLength(55);
    expect(lv46.playable?.every(([x, y]) => y >= 5 || x <= 1 || x >= 5)).toBe(true);
    expect(lv54.playable).toHaveLength(70);
    expect(lv57.playable).toHaveLength(63);
    expect([lv46.blocked, lv54.blocked, lv57.blocked]).toEqual([undefined, undefined, undefined]);
    expect(lv46.shutters).toEqual([
      { id: "vp-046-cover-1", x: 0, y: 7, width: 7, height: 3, count: 4, skin: "shutter" },
      { id: "vp-046-cover-2", x: 0, y: 0, width: 2, height: 5, count: 9, skin: "shutter" },
      { id: "vp-046-cover-3", x: 5, y: 0, width: 2, height: 5, count: 14, skin: "shutter" },
    ]);
    expect(lv54.shutters).toEqual([
      { id: "vp-054-cover-1", x: 0, y: 0, width: 4, height: 3, count: 5, skin: "shutter" },
      { id: "vp-054-cover-2", x: 0, y: 7, width: 4, height: 3, count: 8, skin: "shutter" },
      { id: "vp-054-cover-3", x: 4, y: 0, width: 3, height: 7, count: 13, skin: "shutter" },
      { id: "vp-054-cover-4", x: 4, y: 7, width: 3, height: 3, count: 21, skin: "shutter" },
    ]);
    expect(lv57.shutters).toEqual([
      { id: "vp-057-cover-1", x: 2, y: 0, width: 5, height: 3, count: 6, skin: "shutter" },
      { id: "vp-057-cover-2", x: 0, y: 5, width: 7, height: 4, count: 12, skin: "shutter" },
    ]);
    expect(idsFor(lv46, "vp-046-cover-1")).toEqual(Array.from({ length: 7 }, (_, i) => `cc-046-b4-0${i + 1}`));
    expect(idsFor(lv46, "vp-046-cover-2")).toEqual(Array.from({ length: 4 }, (_, i) => `cc-046-b5-0${i + 1}`));
    expect(idsFor(lv46, "vp-046-cover-3")).toEqual(Array.from({ length: 4 }, (_, i) => `cc-046-b6-0${i + 1}`));
    expect(idsFor(lv54, "vp-054-cover-1")).toEqual(Array.from({ length: 4 }, (_, i) => `cc-054-b2-0${i + 1}`));
    expect(idsFor(lv54, "vp-054-cover-2")).toEqual(Array.from({ length: 3 }, (_, i) => `cc-054-b3-0${i + 1}`));
    expect(idsFor(lv54, "vp-054-cover-3")).toEqual(Array.from({ length: 7 }, (_, i) => `cc-054-b4-0${i + 1}`));
    expect(idsFor(lv54, "vp-054-cover-4")).toEqual(["cc-054-b5-01"]);
    expect(idsFor(lv57, "vp-057-cover-1")).toEqual(Array.from({ length: 6 }, (_, i) => `cc-057-b3-0${i + 1}`));
    expect(idsFor(lv57, "vp-057-cover-2")).toEqual(Array.from({ length: 7 }, (_, i) => `cc-057-b4-0${i + 1}`));
  });

  it("locks the corrected high-fps truth facts", () => {
    const lv46 = repaired.get(46)!;
    const lv54 = repaired.get(54)!;
    const lv57 = repaired.get(57)!;
    expect(openingBlocks(lv46)).toHaveLength(6);
    expect(lv46.blocks.reduce((sum, block) => sum + block.shape.length, 0)).toBe(73);
    expect(histogram(lv46.blocks)).toEqual({ H2: 6, H3: 2, L3: 8, SINGLE: 3, SQ2: 5, T4: 1, V2: 2 });
    expect(lv46.gates.filter(({ frozen }) => !frozen)).toHaveLength(5);
    expect(lv46.gates.flatMap(({ frozen }) => frozen ? [frozen] : []).sort((a, b) => a - b)).toEqual([2, 5]);
    expect(lv46.generators?.map(({ queueBlockIds }) => queueBlockIds)).toEqual([
      ["cc-046-b2-01", "cc-046-b2-02", "cc-046-b2-03"],
      ["cc-046-b3-02", "cc-046-b3-03", "cc-046-b3-01"],
    ]);
    expect(lv46.generators?.map(({ queueBlockIds }) => queueBlockIds.map((id) => shapeName(lv46.blocks.find((block) => block.id === id)!))))
      .toEqual([["SQ2", "L3", "L3"], ["V2", "L3", "SQ2"]]);

    const opening54 = openingBlocks(lv54);
    expect(opening54).toHaveLength(9);
    expect(opening54.reduce((sum, block) => sum + block.shape.length, 0)).toBe(16);
    expect(histogram(opening54)).toEqual({ H2: 3, L3: 1, SINGLE: 3, V2: 2 });
    expect(opening54.flatMap(({ frozen }) => frozen ? [frozen] : []).sort((a, b) => a - b)).toEqual([2, 3]);
    expect(lv54.gates.flatMap(({ frozen }) => frozen ? [frozen] : []).sort((a, b) => a - b)).toEqual([3, 6, 10, 14, 22]);

    const opening57 = openingBlocks(lv57);
    expect(opening57).toHaveLength(8);
    expect(opening57.reduce((sum, block) => sum + block.shape.length, 0)).toBe(17);
    expect(histogram(opening57)).toEqual({ H2: 6, SINGLE: 1, SQ2: 1 });
    expect(lv57.blocks.reduce((sum, block) => sum + block.shape.length, 0)).toBe(62);
  });

  it.each(COMPETITOR_EXACT_SHUTTER_TRUTH_REPAIR_LEVEL_IDS)(
    "keeps Lv%i valid, coverage/adjacency/generator-clean and solver-replay complete",
    (levelId) => {
      const level = repaired.get(levelId)!;
      expect(() => validateLevel(level)).not.toThrow();
      expect(auditOrdinaryShutterCoverage(level)).toEqual([]);
      expect(openingAdjacencyIssues(level)).toEqual([]);
      expect(generatorSpawnAlignmentIssues(level)).toEqual([]);
      expect(finalGeneratorPlacementIssues(level)).toEqual([]);
      const solution = solveLevelForValidation(level, 20_000);
      expect(solution.staticUnsatReasons).toEqual([]);
      expect(solution.unsupportedReasons).toEqual([]);
      expect(solution.solved, `Lv${levelId} ${solution.termination}/${solution.exploredStates}`).toBe(true);
      expect(replay(level, solution.drags), `Lv${levelId} replay`).toBe(true);
    },
    60_000,
  );
});
