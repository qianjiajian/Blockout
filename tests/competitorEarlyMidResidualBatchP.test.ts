// @ts-expect-error The app tsconfig excludes Node ambient types; Vitest runs in Node.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  applyCompetitorEarlyMidResidualBatchP,
  COMPETITOR_EARLY_MID_RESIDUAL_BATCH_P_BLOCKERS,
  COMPETITOR_EARLY_MID_RESIDUAL_BATCH_P_CERTIFIED_LEVEL_IDS,
  COMPETITOR_EARLY_MID_RESIDUAL_BATCH_P_REQUESTED_LEVEL_IDS,
  COMPETITOR_EARLY_MID_RESIDUAL_BATCH_P_USES_STAGING_FALLBACK,
} from "../src/core/competitorEarlyMidResidualBatchP";
import {
  compareCompetitorMechanismCountContract,
  extractCompetitorMechanismCountContracts,
  extractRuntimeMechanismCountFacts,
} from "../src/core/competitorMechanismCountContract";
import { solveLevelForValidation, type SolverDrag } from "../src/core/levelSolver";
import {
  LEVELS,
  LEVELS_BEFORE_COMPETITOR_EARLY_MID_RESIDUAL_BATCH_P,
} from "../src/core/levels";
import { openingVisibleBlockIds } from "../src/core/openingBlockCountRepairs";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import type { BlockSpec, LevelSpec } from "../src/core/types";
import { VIDEO_PARITY_LEVELS } from "../src/core/videoParityLevels.generated";

const truth = JSON.parse(readFileSync(new URL(
  "../deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json",
  import.meta.url,
), "utf8").replace(/^\uFEFF/, "")) as unknown;
const contractById = new Map(extractCompetitorMechanismCountContracts(truth)
  .map((contract) => [contract.levelId, contract] as const));

const source = (levelId: number): LevelSpec => (
  LEVELS_BEFORE_COMPETITOR_EARLY_MID_RESIDUAL_BATCH_P[levelId - 1]!
);
const repaired = (levelId: number): LevelSpec => applyCompetitorEarlyMidResidualBatchP(source(levelId));
const outerColor = (block: BlockSpec): string => block.layers?.[0] ?? block.color;

const openingContactEdges = (level: LevelSpec): [string, string][] => {
  const opening = new Set(openingVisibleBlockIds(level));
  const occupied = new Map<string, BlockSpec>();
  for (const block of level.blocks.filter(({ id }) => opening.has(id))) {
    for (const [dx, dy] of block.shape) occupied.set(`${block.x + dx},${block.y + dy}`, block);
  }
  const edges = new Set<string>();
  for (const [key, block] of occupied) {
    const [x, y] = key.split(",").map(Number) as [number, number];
    for (const [dx, dy] of [[1, 0], [0, 1]] as const) {
      const other = occupied.get(`${x + dx},${y + dy}`);
      if (other && other.id !== block.id) edges.add([block.id, other.id].sort().join("|"));
    }
  }
  return [...edges].sort().map((edge) => edge.split("|") as [string, string]);
};

const openingAdjacencyIssues = (level: LevelSpec): string[] => {
  const byId = new Map(level.blocks.map((block) => [block.id, block] as const));
  return openingContactEdges(level)
    .filter(([left, right]) => outerColor(byId.get(left)!) === outerColor(byId.get(right)!))
    .map(([left, right]) => `${left}|${right}`);
};

const replay = (level: LevelSpec, drags: readonly SolverDrag[]): boolean => {
  const model = new PuzzleModel(level);
  model.start();
  model.startCountdown();
  for (const drag of drags) {
    if (!model.getBlock(drag.blockId)) return false;
    model.beginAction();
    for (const [x, y] of drag.path) if (!model.moveBlockStep(drag.blockId, x, y)) return false;
    if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) return false;
    if (!model.commitAction()) return false;
  }
  const snapshot = model.snapshot();
  return snapshot.complete && snapshot.blocks.length === 0 && snapshot.queuedBlocks.length === 0;
};

const minimumOpeningRecolors = (level: LevelSpec): number => {
  const blocks = level.blocks.filter(({ id }) => openingVisibleBlockIds(level).includes(id));
  const palette = [...new Set(level.gates.map(({ color }) => color))];
  const indexById = new Map(blocks.map(({ id }, index) => [id, index] as const));
  const neighbors = blocks.map(() => new Set<number>());
  for (const [leftId, rightId] of openingContactEdges(level)) {
    const left = indexById.get(leftId)!;
    const right = indexById.get(rightId)!;
    neighbors[left]!.add(right);
    neighbors[right]!.add(left);
  }
  const order = blocks.map((_, index) => index)
    .sort((left, right) => neighbors[right]!.size - neighbors[left]!.size);
  const assigned: (string | undefined)[] = blocks.map(() => undefined);
  let best = Number.POSITIVE_INFINITY;
  const visit = (position: number, changes: number): void => {
    if (changes >= best) return;
    if (position === order.length) {
      if (new Set(assigned).size === palette.length) best = changes;
      return;
    }
    const index = order[position]!;
    const forbidden = new Set([...neighbors[index]!].map((neighbor) => assigned[neighbor]).filter(Boolean));
    const original = outerColor(blocks[index]!);
    for (const color of [original, ...palette.filter((candidate) => candidate !== original)]) {
      if (forbidden.has(color)) continue;
      assigned[index] = color;
      visit(position + 1, changes + Number(color !== original));
      assigned[index] = undefined;
    }
  };
  visit(0, 0);
  return best;
};

describe("competitor early/mid residual structural batch P", () => {
  it("publishes only the replay-certified subset and retains exhaustive blockers", () => {
    expect(COMPETITOR_EARLY_MID_RESIDUAL_BATCH_P_REQUESTED_LEVEL_IDS)
      .toEqual([29, 31, 32, 38, 39, 40, 41, 47, 48, 64, 95, 99]);
    expect(COMPETITOR_EARLY_MID_RESIDUAL_BATCH_P_CERTIFIED_LEVEL_IDS).toEqual([31, 40]);
    expect(COMPETITOR_EARLY_MID_RESIDUAL_BATCH_P_BLOCKERS.map(({ levelId }) => levelId))
      .toEqual([29, 32, 38, 39, 41, 47, 48, 64, 95, 99]);
    expect(COMPETITOR_EARLY_MID_RESIDUAL_BATCH_P_BLOCKERS.every(({ evidence }) => evidence.length >= 3))
      .toBe(true);
    expect(COMPETITOR_EARLY_MID_RESIDUAL_BATCH_P_USES_STAGING_FALLBACK).toBe(false);
  });

  it("is isolated and reference-idempotent", () => {
    expect(applyCompetitorEarlyMidResidualBatchP(source(30))).toBe(source(30));
    expect(applyCompetitorEarlyMidResidualBatchP(source(32))).toBe(source(32));
    for (const levelId of COMPETITOR_EARLY_MID_RESIDUAL_BATCH_P_CERTIFIED_LEVEL_IDS) {
      const level = repaired(levelId);
      expect(applyCompetitorEarlyMidResidualBatchP(level)).toBe(level);
      expect(LEVELS[levelId - 1]).toEqual(level);
    }
  });

  it("restores the exact Lv31 board, four mouths and numeric-ice inventory with a minimal five-colour patch", () => {
    const raw = VIDEO_PARITY_LEVELS.find(({ id }) => id === 31)!;
    const level = repaired(31);
    expect(level).toMatchObject({ id: 31, width: 6, height: 8, timeSeconds: 90 });
    expect(level.gates).toEqual(raw.gates);
    expect(level.blocks).toHaveLength(18);
    expect(openingVisibleBlockIds(level)).toHaveLength(18);
    expect(level.blocks.filter(({ frozen }) => frozen !== undefined)
      .map(({ frozen }) => frozen).sort((left, right) => left! - right!))
      .toEqual([5, 9, 10, 13]);
    expect(new Set(level.blocks.map(outerColor))).toEqual(new Set(["yellow", "pink", "orange", "red"]));

    const targetById = new Map(level.blocks.map((block) => [block.id, block] as const));
    const changedIds = raw.blocks.filter((block) => outerColor(block) !== outerColor(targetById.get(block.id)!))
      .map(({ id }) => id);
    expect(changedIds).toEqual([
      "cc-031-b1-06", "cc-031-b1-08", "cc-031-b1-14", "cc-031-b1-17", "cc-031-b1-18",
    ]);
    for (const block of raw.blocks) {
      const target = targetById.get(block.id)!;
      expect({ ...target, color: block.color }).toEqual(block);
    }
    expect(minimumOpeningRecolors(raw)).toBe(5);
  });

  it("keeps Lv40's lower-6x3 opening packing and source mouths outside its exact physical cover", () => {
    const raw = VIDEO_PARITY_LEVELS.find(({ id }) => id === 40)!;
    const level = repaired(40);
    expect(level.gates).toEqual(raw.gates);
    expect(level.shutters).toEqual([
      { id: "vp-040-cover-1", x: 0, y: 0, width: 6, height: 3, count: 4, skin: "shutter" },
    ]);
    expect(level.blocks.filter(({ shutterId }) => shutterId === "vp-040-cover-1")).toHaveLength(8);
    expect(level.blocks.filter(({ shutterId }) => !shutterId)
      .map(({ id, x, y, color }) => [id, x, y, color])).toEqual([
      ["cc-040-b1-01", 2, 5, "purple"],
      ["cc-040-b1-02", 4, 5, "orange"],
      ["cc-040-b1-03", 1, 4, "orange"],
      ["cc-040-b1-04", 2, 3, "blue"],
      ["cc-040-b1-05", 0, 5, "green"],
      ["cc-040-b1-06", 2, 4, "pink"],
      ["cc-040-b1-07", 4, 3, "purple"],
      ["cc-040-b1-08", 0, 4, "pink"],
      ["cc-040-b1-09", 5, 3, "orange"],
      ["cc-040-b1-10", 0, 3, "purple"],
      ["cc-040-b1-11", 5, 5, "cyan"],
    ]);

    const withoutRequiredPink = {
      ...level,
      blocks: level.blocks.map((block) => block.id === "cc-040-b1-08"
        ? { ...block, color: "blue" as const }
        : block),
    };
    expect(solveLevelForValidation(withoutRequiredPink, 30_000)).toMatchObject({
      solved: false,
      termination: "exhausted",
      exploredStates: 1,
    });
  });

  it("matches truth mechanisms, validates and keeps opening adjacency at zero", () => {
    expect(extractRuntimeMechanismCountFacts(repaired(31))).toMatchObject({
      ordinaryExitCount: 1,
      frozenExitCount: 3,
      frozenExitValues: [2, 10, 13],
      numericIceCount: 4,
      numericIceValues: [5, 9, 10, 13],
    });
    expect(extractRuntimeMechanismCountFacts(repaired(40))).toMatchObject({
      ordinaryExitCount: 1,
      frozenExitCount: 5,
      frozenExitValues: [1, 2, 3, 4, 6],
      shutterCount: 1,
      shutterCoverCounts: [4],
      shutterCoveredCohortCounts: [8],
    });
    for (const levelId of COMPETITOR_EARLY_MID_RESIDUAL_BATCH_P_CERTIFIED_LEVEL_IDS) {
      const level = repaired(levelId);
      expect(compareCompetitorMechanismCountContract(level, contractById.get(levelId)!).issues).toEqual([]);
      expect(openingAdjacencyIssues(level)).toEqual([]);
      expect(() => validateLevel(level)).not.toThrow();
    }
  });

  it("fresh-solves and independently replays both repairs", () => {
    const expected = new Map([
      [31, { exploredStates: 142, minimumDrags: 26 }],
      [40, { exploredStates: 64, minimumDrags: 23 }],
    ]);
    for (const levelId of COMPETITOR_EARLY_MID_RESIDUAL_BATCH_P_CERTIFIED_LEVEL_IDS) {
      const level = repaired(levelId);
      const solution = solveLevelForValidation(level, 30_000);
      expect(solution.staticUnsatReasons).toEqual([]);
      expect(solution.unsupportedReasons).toEqual([]);
      expect(solution).toMatchObject({
        solved: true,
        termination: "solved",
        ...expected.get(levelId),
      });
      expect(replay(level, solution.drags)).toBe(true);
    }
  }, 60_000);
});
