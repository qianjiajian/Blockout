// @ts-expect-error The app tsconfig excludes Node ambient types; Vitest runs in Node.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  applyCompetitorLateExitStructuralBatchJ,
  COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_J_BLOCKERS,
  COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_J_CERTIFIED_LEVEL_IDS,
  COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_J_LV157_SHELL,
  COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_J_NUMERIC_ICE,
  COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_J_REQUESTED_LEVEL_IDS,
  COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_J_USES_STAGING_FALLBACK,
  COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_J_VERSION,
} from "../src/core/competitorLateExitStructuralBatchJ";
import { extractRuntimeMechanismCountFacts } from "../src/core/competitorMechanismCountContract";
import {
  LEVELS,
  LEVELS_BEFORE_COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_J,
} from "../src/core/levels";
import { solveLevelForValidation, type SolverDrag } from "../src/core/levelSolver";
import { openingVisibleBlockIds } from "../src/core/openingBlockCountRepairs";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import type { BlockSpec, LevelSpec, Point } from "../src/core/types";
import { VIDEO_PARITY_LEVELS_101_TO_200 } from "../src/core/videoParityLevels101To200.generated";

interface TruthMechanism {
  numeric_ice: { shape: string; value: number; stage: string }[];
  shells: {
    shape: string;
    outer_color_class: string;
    inner_color_class: string;
    stage: string;
  }[];
}

interface TruthLevel {
  level: number;
  mechanisms: TruthMechanism;
}

const truth = JSON.parse(readFileSync(new URL(
  "../deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json",
  import.meta.url,
), "utf8")) as { levels: TruthLevel[] };

const truthLevel = (levelId: number): TruthLevel => truth.levels.find(({ level }) => level === levelId)!;
const source = (levelId: number): LevelSpec => (
  LEVELS_BEFORE_COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_J[levelId - 1]!
);
const candidate = (levelId: number): LevelSpec => applyCompetitorLateExitStructuralBatchJ(source(levelId));
const outer = (block: BlockSpec): string => block.layers?.[0] ?? block.color;

const shapeName = (shape: readonly Point[]): string => {
  if (shape.length === 1) return "SINGLE";
  const width = Math.max(...shape.map(([x]) => x)) - Math.min(...shape.map(([x]) => x)) + 1;
  const height = Math.max(...shape.map(([, y]) => y)) - Math.min(...shape.map(([, y]) => y)) + 1;
  return `${height === 1 ? "H" : width === 1 ? "V" : "OTHER"}${shape.length}`;
};

const adjacencyIssues = (level: LevelSpec): string[] => {
  const visible = new Set(openingVisibleBlockIds(level));
  const occupied = new Map<string, BlockSpec>();
  for (const block of level.blocks.filter(({ id }) => visible.has(id))) for (const [dx, dy] of block.shape) {
    occupied.set(`${block.x + dx},${block.y + dy}`, block);
  }
  const issues = new Set<string>();
  for (const [cell, block] of occupied) {
    const [x, y] = cell.split(",").map(Number);
    for (const [dx, dy] of [[1, 0], [0, 1]] as Point[]) {
      const other = occupied.get(`${x! + dx},${y! + dy}`);
      if (other && other.id !== block.id && outer(other) === outer(block)) {
        issues.add([block.id, other.id].sort().join("/"));
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
      const block = model.getBlock(drag.blockId);
      if (!block) return false;
      const moved = Math.abs(block.x - x) + Math.abs(block.y - y) === 1
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

const changedBlockIds = (before: LevelSpec, after: LevelSpec): string[] => before.blocks
  .filter((block, index) => JSON.stringify(block) !== JSON.stringify(after.blocks[index]))
  .map(({ id }) => id)
  .sort();

const immutableBlockProjection = (level: LevelSpec): unknown => level.blocks.map((block) => ({
  id: block.id,
  x: block.x,
  y: block.y,
  shape: block.shape,
  shutterId: block.shutterId,
  movementAxis: block.movementAxis,
  keyId: block.keyId,
  lockedBy: block.lockedBy,
  lockCount: block.lockCount,
  star: block.star,
  timedBombSeconds: block.timedBombSeconds,
  rotationBadge: block.rotationBadge,
}));

describe(`competitor late exit structural batch J ${COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_J_VERSION}`, () => {
  it("publishes only the four exact attribute repairs and retains every residual gap as a blocker", () => {
    expect(COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_J_REQUESTED_LEVEL_IDS)
      .toEqual([136, 137, 143, 147, 148, 149, 153, 154, 157, 159]);
    expect(COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_J_CERTIFIED_LEVEL_IDS).toEqual([149, 153, 157, 159]);
    expect(COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_J_USES_STAGING_FALLBACK).toBe(false);
    expect(COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_J_BLOCKERS.map(({ levelId }) => levelId))
      .toEqual([136, 137, 143, 147, 148, 149, 153, 154, 157, 159]);
    expect(COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_J_BLOCKERS.every(({ evidence, reason }) => (
      evidence.length >= 4 && reason.length >= 180
    ))).toBe(true);

    for (const levelId of [136, 137, 143, 147, 148, 154]) {
      expect(applyCompetitorLateExitStructuralBatchJ(source(levelId))).toBe(source(levelId));
    }
    expect(applyCompetitorLateExitStructuralBatchJ(source(1))).toBe(source(1));
  });

  it("restores the exact video/source numeric-ice carriers and Lv157 shell order", () => {
    expect(truthLevel(149).mechanisms.numeric_ice).toEqual([{ shape: "H2", value: 2, stage: "opening" }]);
    expect(truthLevel(153).mechanisms.numeric_ice).toEqual([
      { shape: "H3", value: 15, stage: "opening" },
      { shape: "V2", value: 13, stage: "opening" },
    ]);
    expect(truthLevel(159).mechanisms.numeric_ice).toEqual([{ shape: "SINGLE", value: 14, stage: "opening" }]);
    expect(truthLevel(157).mechanisms.shells).toEqual([expect.objectContaining({
      shape: "V2",
      outer_color_class: "red",
      inner_color_class: "orange",
      stage: "opening",
    })]);

    for (const levelId of [149, 153, 159] as const) {
      const level = candidate(levelId);
      const assignments = COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_J_NUMERIC_ICE[levelId];
      const visible = new Set(openingVisibleBlockIds(level));
      expect(level.blocks.filter(({ frozen }) => frozen !== undefined).map(({ id, frozen, shape }) => ({
        id, frozen, shape: shapeName(shape),
      }))).toEqual(Object.entries(assignments).map(([id, frozen]) => ({
        id,
        frozen,
        shape: truthLevel(levelId).mechanisms.numeric_ice.find(({ value }) => value === frozen)!.shape,
      })));
      expect(Object.keys(assignments).every((id) => visible.has(id))).toBe(true);

      const raw = VIDEO_PARITY_LEVELS_101_TO_200[levelId - 101]!;
      for (const [id, frozen] of Object.entries(assignments)) {
        const rawBlock = raw.blocks.find((block) => block.id === id)!;
        const repaired = level.blocks.find((block) => block.id === id)!;
        expect({ id, shape: repaired.shape, frozen: repaired.frozen })
          .toEqual({ id, shape: rawBlock.shape, frozen });
      }
    }

    const shell = candidate(157).blocks.find(({ id }) => (
      id === COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_J_LV157_SHELL.blockId
    ))!;
    expect(shapeName(shell.shape)).toBe("V2");
    expect(shell.color).toBe("red");
    expect(shell.layers).toEqual(["red", "orange"]);
    expect(new Set(openingVisibleBlockIds(candidate(157))).has(shell.id)).toBe(true);
  });

  it("changes only the intended attributes and preserves board, opening, generators and portal/seam data", () => {
    const expectedChanged: Readonly<Record<number, readonly string[]>> = {
      149: ["lv149-opening-b03", "lv149-opening-b09"],
      153: ["lv153-opening-b05", "lv153-opening-b06", "lv153-opening-b28", "lv153-opening-b29"],
      157: ["lv157-opening-b04"],
      159: ["lv159-opening-b11", "lv159-pooled-hidden-b05"],
    };
    for (const levelId of COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_J_CERTIFIED_LEVEL_IDS) {
      const before = source(levelId);
      const after = candidate(levelId);
      expect(changedBlockIds(before, after)).toEqual([...expectedChanged[levelId]!].sort());
      expect(immutableBlockProjection(after)).toEqual(immutableBlockProjection(before));
      expect(after).toMatchObject({
        id: before.id,
        width: before.width,
        height: before.height,
        playable: before.playable,
        blocked: before.blocked,
        gates: before.gates,
        flipDoors: before.flipDoors,
        shutters: before.shutters,
        generators: before.generators,
      });
      expect(openingVisibleBlockIds(after).sort()).toEqual(openingVisibleBlockIds(before).sort());
      expect(extractRuntimeMechanismCountFacts(after)).toEqual(extractRuntimeMechanismCountFacts(before));
      expect(applyCompetitorLateExitStructuralBatchJ(after)).toBe(after);
      expect(LEVELS[levelId - 1]).toEqual(after);
    }
  });

  it("keeps opening-visible same-colour orthogonal adjacency at zero and validates each candidate", () => {
    for (const levelId of COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_J_CERTIFIED_LEVEL_IDS) {
      const level = candidate(levelId);
      expect(() => validateLevel(level)).not.toThrow();
      expect(adjacencyIssues(level), `Lv${levelId} adjacency`).toEqual([]);
    }
  });

  it("fresh-solves and independently replays every certified candidate", () => {
    const expected: Readonly<Record<number, { states: number; drags: number }>> = {
      149: { states: 31, drags: 30 },
      153: { states: 30, drags: 29 },
      157: { states: 21, drags: 20 },
      159: { states: 24, drags: 23 },
    };
    for (const levelId of COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_J_CERTIFIED_LEVEL_IDS) {
      const level = candidate(levelId);
      const solution = solveLevelForValidation(level, 20_000);
      expect(solution.staticUnsatReasons).toEqual([]);
      expect(solution.unsupportedReasons).toEqual([]);
      expect(solution.solved, `Lv${levelId} ${solution.termination}/${solution.exploredStates}`).toBe(true);
      expect(solution.exploredStates).toBe(expected[levelId]!.states);
      expect(solution.drags).toHaveLength(expected[levelId]!.drags);
      expect(replay(level, solution.drags), `Lv${levelId} PuzzleModel replay`).toBe(true);
    }
  }, 120_000);
});
