// @ts-expect-error The app tsconfig excludes Node ambient types; Vitest runs in Node.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  applyCompetitorMidExitStructuralBatchC,
  COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_C_BLOCKERS,
  COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_C_CERTIFIED_LEVEL_IDS,
  COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_C_CONTRACTS,
  COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_C_REQUESTED_LEVEL_IDS,
  COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_C_USES_STAGING_FALLBACK,
  COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_C_VERSION,
} from "../src/core/competitorMidExitStructuralBatchC";
import {
  auditCompetitorMechanismCountContracts,
  extractCompetitorMechanismCountContracts,
} from "../src/core/competitorMechanismCountContract";
import {
  LEVELS,
  LEVELS_BEFORE_COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_C,
} from "../src/core/levels";
import { solveLevelForValidation, type SolverDrag } from "../src/core/levelSolver";
import { openingVisibleBlockIds } from "../src/core/openingBlockCountRepairs";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { auditOrdinaryShutterCoverage } from "../src/core/shutterCoverage";
import type { BlockSpec, LevelSpec } from "../src/core/types";

const TRUTH = JSON.parse(readFileSync(
  "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json",
  "utf8",
).replace(/^\uFEFF/, ""));
const truth55 = TRUTH.levels.find(({ level }: { level: number }) => Number(level) === 55)!;
const mechanism55 = extractCompetitorMechanismCountContracts(TRUTH).filter(({ levelId }) => levelId === 55);
const contract55 = COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_C_CONTRACTS[0];
const repairedLv55 = (): LevelSpec => applyCompetitorMidExitStructuralBatchC(
  LEVELS_BEFORE_COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_C[54]!,
);

const outer = (block: BlockSpec): string => block.layers?.[0] ?? block.color;

const shapeName = (block: BlockSpec): string => {
  if (block.shape.length === 1) return "SINGLE";
  const width = Math.max(...block.shape.map(([x]) => x)) - Math.min(...block.shape.map(([x]) => x)) + 1;
  const height = Math.max(...block.shape.map(([, y]) => y)) - Math.min(...block.shape.map(([, y]) => y)) + 1;
  return `${width === 1 ? "V" : height === 1 ? "H" : "OTHER"}${block.shape.length}`;
};

const histogram = (values: readonly string[]): Record<string, number> => Object.fromEntries(
  [...values.reduce((counts, value) => counts.set(value, (counts.get(value) ?? 0) + 1), new Map<string, number>())]
    .sort(([left], [right]) => left.localeCompare(right)),
);

const occupiedCellCount = (blocks: readonly BlockSpec[]): number => (
  blocks.reduce((sum, block) => sum + block.shape.length, 0)
);

const adjacencyIssues = (blocks: readonly BlockSpec[]): string[] => {
  const cells = new Map<string, BlockSpec>();
  const issues = new Set<string>();
  for (const block of blocks) for (const [dx, dy] of block.shape) {
    cells.set(`${block.x + dx},${block.y + dy}`, block);
  }
  for (const [cell, block] of cells) {
    const [x, y] = cell.split(",").map(Number);
    for (const [dx, dy] of [[1, 0], [0, 1]] as const) {
      const other = cells.get(`${x! + dx},${y! + dy}`);
      if (other && other.id !== block.id && outer(other) === outer(block)) {
        issues.add([block.id, other.id].sort().join("|"));
      }
    }
  }
  return [...issues];
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

describe(`competitor mid exit structural batch C ${COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_C_VERSION}`, () => {
  it("publishes only Lv55 and keeps every unproved target as an explicit blocker", () => {
    expect(COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_C_REQUESTED_LEVEL_IDS)
      .toEqual([51, 52, 53, 55, 59, 61, 62]);
    expect(COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_C_CERTIFIED_LEVEL_IDS).toEqual([55]);
    expect(COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_C_USES_STAGING_FALLBACK).toBe(false);
    expect(COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_C_BLOCKERS.map(({ levelId }) => levelId))
      .toEqual([51, 52, 53, 59, 61, 62]);
    for (const blocker of COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_C_BLOCKERS) {
      expect(blocker.reason.length).toBeGreaterThan(180);
      expect(blocker.evidence.length).toBeGreaterThanOrEqual(2);
      expect(applyCompetitorMidExitStructuralBatchC(LEVELS[blocker.levelId - 1]!))
        .toBe(LEVELS[blocker.levelId - 1]);
    }
    expect(applyCompetitorMidExitStructuralBatchC(LEVELS[0]!)).toBe(LEVELS[0]);
  });

  it("restores Lv55 exact source composition, physical mouths and real covered cohort", () => {
    const candidate = repairedLv55();
    const openingIds = new Set(openingVisibleBlockIds(candidate));
    const opening = candidate.blocks.filter(({ id }) => openingIds.has(id));
    const direct = candidate.blocks.filter(({ shutterId }) => shutterId === contract55.panel.id);

    expect(() => validateLevel(candidate)).not.toThrow();
    expect([candidate.width, candidate.height, candidate.playable?.length])
      .toEqual([contract55.board.width, contract55.board.height, contract55.board.playableCellCount]);
    expect(opening).toHaveLength(truth55.composition.opening_piece_count);
    expect(candidate.blocks).toHaveLength(truth55.composition.source_full_piece_count);
    expect(occupiedCellCount(opening)).toBe(contract55.openingOccupiedCellCount);
    expect(occupiedCellCount(candidate.blocks)).toBe(contract55.fullOccupiedCellCount);
    expect(new Set(opening.map(outer)).size).toBe(truth55.composition.opening_color_count);
    expect(new Set(candidate.blocks.map(outer)).size).toBe(truth55.composition.full_color_count);
    expect(histogram(opening.map(shapeName))).toEqual(truth55.composition.opening_shape_histogram);
    expect(histogram(candidate.blocks.map(shapeName))).toEqual(truth55.composition.source_full_shape_histogram);

    expect(candidate.gates.map(({ color, side, offset, size, frozen }) => ({
      color, side, offset, size, ...(frozen ? { frozen } : {}),
    }))).toEqual([
      { color: "purple", side: "top", offset: 0, size: 3, frozen: 8 },
      { color: "red", side: "right", offset: 0, size: 2 },
      { color: "green", side: "right", offset: 5, size: 3 },
      { color: "blue", side: "left", offset: 4, size: 1, frozen: 2 },
      { color: "pink", side: "left", offset: 6, size: 2, frozen: 8 },
      { color: "cyan", side: "bottom", offset: 0, size: 3, frozen: 8 },
      { color: "yellow", side: "bottom", offset: 3, size: 3, frozen: 8 },
    ]);
    expect(new Set(candidate.gates.map(({ color }) => color)).size).toBe(candidate.gates.length);
    expect(candidate.gates.filter(({ frozen }) => !frozen)).toHaveLength(2);
    expect(candidate.gates.filter(({ frozen }) => frozen).map(({ frozen }) => frozen).sort((a, b) => a! - b!))
      .toEqual([2, 8, 8, 8, 8]);

    expect(candidate.shutters).toEqual([{
      id: "vp-055-cover-1", x: 0, y: 6, width: 7, height: 2, count: 8, skin: "shutter",
    }]);
    expect(candidate.shutters?.some(({ skin }) => skin === "staging")).toBe(false);
    expect(direct.map(({ id }) => id)).toEqual(contract55.panel.directBlockIds);
    expect(direct.every((block) => block.shape.every(([dx, dy]) => (
      block.x + dx >= 0 && block.x + dx < 7 && block.y + dy >= 6 && block.y + dy < 8
    )))).toBe(true);
    expect(occupiedCellCount(direct)).toBe(9);
    expect(adjacencyIssues(opening)).toEqual([]);
    expect(adjacencyIssues(direct)).toEqual([]);
    expect(auditOrdinaryShutterCoverage(candidate)).toEqual([]);

    const ice = candidate.blocks.filter(({ frozen }) => frozen);
    expect(ice).toHaveLength(4);
    expect(ice.every(({ frozen, shape }) => frozen === 5 && shapeName({ shape } as BlockSpec) === "V3"))
      .toBe(true);
    expect(candidate.blocks.filter(({ movementAxis }) => movementAxis)).toHaveLength(3);
    expect(auditCompetitorMechanismCountContracts([candidate], mechanism55)[0]?.issues).toEqual([]);
    expect(applyCompetitorMidExitStructuralBatchC(candidate)).toBe(candidate);
    expect(LEVELS[54]).toEqual(candidate);
  });

  it("fresh-solves Lv55 within 30k and independently replays every drag", () => {
    const candidate = repairedLv55();
    const solution = solveLevelForValidation(candidate, contract55.freshSolverMaxStates);
    expect(solution.staticUnsatReasons).toEqual([]);
    expect(solution.unsupportedReasons).toEqual([]);
    expect(solution.solved, `${solution.termination}/${solution.exploredStates}`).toBe(true);
    expect(solution.exploredStates).toBe(contract55.certifiedExploredStates);
    expect(solution.drags).toHaveLength(contract55.certifiedDragCount);
    expect(replay(candidate, solution.drags)).toBe(true);
  }, 120_000);
});
