// @ts-expect-error The app tsconfig excludes Node ambient types; Vitest runs in Node.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  applyCompetitorLateMechanismRepair,
  COMPETITOR_LATE_AXIS_LEVEL_IDS,
  COMPETITOR_LATE_AXIS_REQUESTED_LEVEL_IDS,
  COMPETITOR_LATE_FLIP_DOOR_LEVEL_IDS,
  COMPETITOR_LATE_FLIP_DOOR_REQUESTED_LEVEL_IDS,
  COMPETITOR_LATE_LOCK_REQUESTED_LEVEL_IDS,
  COMPETITOR_LATE_MECHANISM_BLOCKERS,
  COMPETITOR_LATE_MECHANISM_BLOCKER_REASONS,
  COMPETITOR_LATE_MECHANISM_REPAIR_LEVEL_IDS,
  COMPETITOR_LATE_MECHANISM_REPAIR_VERSION,
  COMPETITOR_LATE_NUMERIC_ICE_LEVEL_IDS,
  COMPETITOR_LATE_NUMERIC_ICE_REQUESTED_LEVEL_IDS,
  COMPETITOR_LATE_STAR_GATE_REQUESTED_LEVEL_IDS,
} from "../src/core/competitorLateMechanismRepairs";
import {
  extractCompetitorMechanismCountContracts,
  extractRuntimeMechanismCountFacts,
} from "../src/core/competitorMechanismCountContract";
import { finalGeneratorPlacementIssues } from "../src/core/finalGeneratorContracts";
import { generatorSpawnAlignmentIssues } from "../src/core/generatorSpawnAlignmentRepairs";
import { generatorFrozenCargoIssues } from "../src/core/generatorFrozenCargoRepairs";
import {
  LEVELS,
  LEVELS_BEFORE_COMPETITOR_LATE_MECHANISM_REPAIR,
} from "../src/core/levels";
import { solveLevelForValidation, type SolverDrag } from "../src/core/levelSolver";
import { openingVisibleBlockIds } from "../src/core/openingBlockCountRepairs";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import type { BlockSpec, LevelSpec } from "../src/core/types";

const truthPaths = [
  new URL("../deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json", import.meta.url),
  new URL("../deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json", import.meta.url),
] as const;
const contracts = truthPaths.flatMap((path) => extractCompetitorMechanismCountContracts(
  JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, "")),
));
const contractById = new Map(contracts.map((contract) => [contract.levelId, contract]));

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

const openingAdjacencyIssues = (level: LevelSpec): string[] => {
  const opening = new Set(openingVisibleBlockIds(level));
  const blocks = level.blocks.filter((block) => opening.has(block.id));
  const occupied = new Map<string, BlockSpec>();
  for (const block of blocks) for (const [dx, dy] of block.shape) {
    occupied.set(`${block.x + dx},${block.y + dy}`, block);
  }
  const issues = new Set<string>();
  for (const block of blocks) for (const [dx, dy] of block.shape) {
    const x = block.x + dx, y = block.y + dy;
    for (const [ox, oy] of [[1, 0], [0, 1]] as const) {
      const other = occupied.get(`${x + ox},${y + oy}`);
      if (other && other.id !== block.id
        && (other.layers?.[0] ?? other.color) === (block.layers?.[0] ?? block.color)) {
        issues.add([block.id, other.id].sort().join("|"));
      }
    }
  }
  return [...issues];
};

const appliedIds = [
  ...COMPETITOR_LATE_NUMERIC_ICE_LEVEL_IDS,
  ...COMPETITOR_LATE_AXIS_LEVEL_IDS,
  ...COMPETITOR_LATE_FLIP_DOOR_LEVEL_IDS,
].sort((left, right) => left - right);
const sourceLevel = (id: number): LevelSpec => LEVELS_BEFORE_COMPETITOR_LATE_MECHANISM_REPAIR[id - 1]!;

describe(`competitor late mechanism candidates ${COMPETITOR_LATE_MECHANISM_REPAIR_VERSION}`, () => {
  it("declares unresolved truth bindings instead of inventing placeholder mechanics", () => {
    expect(COMPETITOR_LATE_MECHANISM_BLOCKERS).toEqual({
      numericIce: [11, 17, 19, 54, 115, 161, 198],
      locks: [134, 141, 179, 192, 195],
      axis: [60],
      flipDoors: [151, 152, 163],
      starGates: [100, 102, 104, 118, 131, 163],
    });
    expect(Object.keys(COMPETITOR_LATE_MECHANISM_BLOCKER_REASONS)).toHaveLength(22);
    expect([
      ...COMPETITOR_LATE_NUMERIC_ICE_LEVEL_IDS,
      ...COMPETITOR_LATE_MECHANISM_BLOCKERS.numericIce,
    ].sort((left, right) => left - right)).toEqual([...COMPETITOR_LATE_NUMERIC_ICE_REQUESTED_LEVEL_IDS]);
    expect([
      ...COMPETITOR_LATE_AXIS_LEVEL_IDS,
      ...COMPETITOR_LATE_MECHANISM_BLOCKERS.axis,
    ]).toEqual([...COMPETITOR_LATE_AXIS_REQUESTED_LEVEL_IDS]);
    expect([
      ...COMPETITOR_LATE_FLIP_DOOR_LEVEL_IDS,
      ...COMPETITOR_LATE_MECHANISM_BLOCKERS.flipDoors,
    ].sort((left, right) => left - right)).toEqual([...COMPETITOR_LATE_FLIP_DOOR_REQUESTED_LEVEL_IDS]);
    expect(COMPETITOR_LATE_MECHANISM_BLOCKERS.locks).toEqual([...COMPETITOR_LATE_LOCK_REQUESTED_LEVEL_IDS]);
    expect(COMPETITOR_LATE_MECHANISM_BLOCKERS.starGates).toEqual([...COMPETITOR_LATE_STAR_GATE_REQUESTED_LEVEL_IDS]);
  });

  it("matches exact numeric-ice, axis and Flip Door facts", () => {
    for (const levelId of appliedIds) {
      const level = applyCompetitorLateMechanismRepair(sourceLevel(levelId));
      const facts = extractRuntimeMechanismCountFacts(level);
      const expected = contractById.get(levelId)!.facts;
      if ((COMPETITOR_LATE_NUMERIC_ICE_LEVEL_IDS as readonly number[]).includes(levelId)) {
        expect(facts.numericIceCount, `Lv${levelId} numeric ice count`).toBe(expected.numericIceCount);
        expect(facts.numericIceValues, `Lv${levelId} numeric ice values`).toEqual(expected.numericIceValues);
      }
      if ((COMPETITOR_LATE_AXIS_LEVEL_IDS as readonly number[]).includes(levelId)) {
        expect(facts.axisBlockCount, `Lv${levelId} axis count`).toBe(expected.axisBlockCount);
      }
      if ((COMPETITOR_LATE_FLIP_DOOR_LEVEL_IDS as readonly number[]).includes(levelId)) {
        expect(facts.flipDoorCount, `Lv${levelId} Flip Door count`).toBe(expected.flipDoorCount);
      }
    }
  });

  it("preserves geometry and unrelated payloads and is structurally idempotent", () => {
    for (const levelId of appliedIds) {
      const before = sourceLevel(levelId);
      const after = applyCompetitorLateMechanismRepair(before);
      expect(applyCompetitorLateMechanismRepair(after), `Lv${levelId}`).toEqual(after);
      expect({ ...after, blocks: undefined, gates: undefined, flipDoors: undefined }, `Lv${levelId} level`)
        .toEqual({ ...before, blocks: undefined, gates: undefined, flipDoors: undefined });
      expect(after.blocks.map(({ frozen: _f, movementAxis: _a, ...block }) => block), `Lv${levelId} blocks`)
        .toEqual(before.blocks.map(({ frozen: _f, movementAxis: _a, ...block }) => block));
      if (!(COMPETITOR_LATE_FLIP_DOOR_LEVEL_IDS as readonly number[]).includes(levelId)) {
        expect(after.flipDoors, `Lv${levelId} doors`).toEqual(before.flipDoors);
      }
      expect(applyCompetitorLateMechanismRepair(LEVELS[levelId - 1]!), `Lv${levelId} runtime idempotence`)
        .toBe(LEVELS[levelId - 1]);
    }
  });

  it("validates, keeps opening adjacency clean and preserves generator contracts", () => {
    for (const levelId of appliedIds) {
      const level = applyCompetitorLateMechanismRepair(sourceLevel(levelId));
      expect(() => validateLevel(level), `Lv${levelId}`).not.toThrow();
      expect(openingAdjacencyIssues(level), `Lv${levelId} adjacency`).toEqual([]);
      if (level.generators?.length) {
        expect(generatorSpawnAlignmentIssues(level), `Lv${levelId} centre mouth`).toEqual([]);
        expect(finalGeneratorPlacementIssues(level), `Lv${levelId} generator placement`).toEqual([]);
        expect(generatorFrozenCargoIssues(level), `Lv${levelId} frozen cargo`).toEqual([]);
      }
    }
  });

  it("fresh-solves and independently replays every accepted candidate within 30k states", () => {
    expect(appliedIds).toEqual([...COMPETITOR_LATE_MECHANISM_REPAIR_LEVEL_IDS]);
    for (const levelId of appliedIds) {
      const level = applyCompetitorLateMechanismRepair(sourceLevel(levelId));
      const solution = solveLevelForValidation(level, 30_000);
      expect(solution.staticUnsatReasons, `Lv${levelId} static`).toEqual([]);
      expect(solution.unsupportedReasons, `Lv${levelId} unsupported`).toEqual([]);
      expect(solution.solved, `Lv${levelId}: ${solution.termination}/${solution.exploredStates}`).toBe(true);
      expect(solution.exploredStates, `Lv${levelId} state budget`).toBeLessThanOrEqual(30_000);
      expect(replay(level, solution.drags), `Lv${levelId} replay`).toBe(true);
    }
  }, 180_000);
});
