// @ts-expect-error The app tsconfig excludes Node ambient types; Vitest runs in Node.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  COMPETITOR_EXACT_SHUTTER_GEOMETRY_POST100_LEVEL_IDS,
  applyCompetitorExactShutterGeometryRepairPost100,
} from "../src/core/competitorExactShutterGeometryRepairsPost100";
import {
  compareCompetitorMechanismCountContract,
  extractCompetitorMechanismCountContracts,
} from "../src/core/competitorMechanismCountContract";
import { finalGeneratorPlacementIssues } from "../src/core/finalGeneratorContracts";
import { solveLevelForValidation } from "../src/core/levelSolver";
import {
  LEVELS_BEFORE_COMPETITOR_EXACT_SHUTTER_GEOMETRY_POST100 as BASE_LEVELS,
  LEVELS_BEFORE_OPENING_BLOCK_COUNT_EXPANSION_REPAIR as EXACT_SHUTTER_LEVELS,
} from "../src/core/levels";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { auditOrdinaryShutterCoverage, isOrdinaryShutter } from "../src/core/shutterCoverage";
import type { BlockSpec, LevelSpec, Point } from "../src/core/types";

const truth = JSON.parse(readFileSync(new URL(
  "../deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json",
  import.meta.url,
), "utf8")) as unknown;
const contractById = new Map(extractCompetitorMechanismCountContracts(truth)
  .map((contract) => [contract.levelId, contract] as const));
const beforeById = new Map(BASE_LEVELS.map((level) => [level.id, level] as const));
const repaired = BASE_LEVELS.map(applyCompetitorExactShutterGeometryRepairPost100);
const repairedById = new Map(repaired.map((level) => [level.id, level] as const));

const expected = new Map<number, { x: number; y: number; width: number; height: number; count: number }>([
  [137, { x: 0, y: 0, width: 4, height: 5, count: 3 }],
  [154, { x: 0, y: 6, width: 8, height: 6, count: 10 }],
]);

const cellsOf = (block: BlockSpec): Point[] => block.shape.map(([dx, dy]) => [block.x + dx, block.y + dy]);
const boundsOf = (blocks: readonly BlockSpec[]) => {
  const cells = blocks.flatMap(cellsOf);
  return {
    x: Math.min(...cells.map(([x]) => x)),
    y: Math.min(...cells.map(([, y]) => y)),
    width: Math.max(...cells.map(([x]) => x)) - Math.min(...cells.map(([x]) => x)) + 1,
    height: Math.max(...cells.map(([, y]) => y)) - Math.min(...cells.map(([, y]) => y)) + 1,
  };
};

const openingAdjacency = (level: LevelSpec): string[] => {
  const queued = new Set((level.generators ?? []).flatMap(({ queueBlockIds }) => queueBlockIds));
  const closed = new Set((level.shutters ?? []).filter(({ count }) => count > 0).map(({ id }) => id));
  const visible = level.blocks.filter((block) => !queued.has(block.id)
    && !(block.shutterId && closed.has(block.shutterId)));
  const occupants = new Map<string, BlockSpec[]>();
  for (const block of visible) for (const [x, y] of cellsOf(block)) {
    const key = `${x},${y}`;
    occupants.set(key, [...(occupants.get(key) ?? []), block]);
  }
  const violations = new Set<string>();
  for (const block of visible) for (const [x, y] of cellsOf(block)) {
    for (const [dx, dy] of [[1, 0], [0, 1]] as const) {
      for (const other of occupants.get(`${x + dx},${y + dy}`) ?? []) {
        if (other.id !== block.id && (other.layers?.[0] ?? other.color) === (block.layers?.[0] ?? block.color)) {
          violations.add([block.id, other.id].sort().join("|"));
        }
      }
    }
  }
  return [...violations];
};

const replay = (level: LevelSpec, drags: ReturnType<typeof solveLevelForValidation>["drags"]): boolean => {
  const model = new PuzzleModel(level);
  model.start();
  model.startCountdown();
  const interval = Math.max(0, ...(level.generators ?? []).filter(({ trigger }) => trigger === "time")
    .map((generator) => Math.max(generator.initialDelaySeconds ?? 0, generator.intervalSeconds ?? 1)));
  for (const drag of drags) {
    if (!model.getBlock(drag.blockId) && interval > 0) model.tick(interval);
    if (!model.getBlock(drag.blockId)) return false;
    model.beginAction();
    for (const [x, y] of drag.path) {
      const before = model.getBlock(drag.blockId);
      if (!before) return false;
      const distance = Math.abs(before.x - x) + Math.abs(before.y - y);
      if (!(distance === 1 ? model.moveBlockStep(drag.blockId, x, y) : model.moveBlock(drag.blockId, x, y))) return false;
    }
    if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) return false;
    if (!model.commitAction()) return false;
    if (interval > 0) model.tick(interval);
  }
  const snapshot = model.snapshot();
  return snapshot.complete && !snapshot.blocks.length && !snapshot.queuedBlocks.length;
};

describe("post-100 competitor-exact shutter geometry repair", () => {
  it("is identity outside the two independently certified levels", () => {
    for (const level of BASE_LEVELS) {
      expect(applyCompetitorExactShutterGeometryRepairPost100(level) === level)
        .toBe(!COMPETITOR_EXACT_SHUTTER_GEOMETRY_POST100_LEVEL_IDS.includes(level.id as 137 | 154));
    }
  });

  it.each(COMPETITOR_EXACT_SHUTTER_GEOMETRY_POST100_LEVEL_IDS)(
    "matches the competitor rectangle and direct hidden bounds at Lv%i",
    (levelId) => {
      const level = repairedById.get(levelId)!;
      expect(EXACT_SHUTTER_LEVELS[levelId - 1], `Lv${levelId} production integration`).toEqual(level);
      const panel = (level.shutters ?? []).filter(isOrdinaryShutter);
      const { count: _count, ...geometry } = expected.get(levelId)!;
      expect(panel).toHaveLength(1);
      expect(panel[0]).toMatchObject(expected.get(levelId)!);
      expect(boundsOf(level.blocks.filter((block) => block.shutterId === panel[0]!.id)))
        .toEqual(geometry);
      expect(auditOrdinaryShutterCoverage(level)).toEqual([]);
      expect(() => validateLevel(level)).not.toThrow();
      expect(openingAdjacency(level)).toEqual([]);
      expect(finalGeneratorPlacementIssues(level)).toEqual([]);
    },
  );

  it.each(COMPETITOR_EXACT_SHUTTER_GEOMETRY_POST100_LEVEL_IDS)(
    "introduces no mechanism-count issue field and solves/replays Lv%i",
    (levelId) => {
      const before = beforeById.get(levelId)!;
      const level = repairedById.get(levelId)!;
      const contract = contractById.get(levelId)!;
      const beforeIssues = compareCompetitorMechanismCountContract(before, contract).issues;
      const afterIssues = compareCompetitorMechanismCountContract(level, contract).issues;
      const beforeFields = new Set(beforeIssues.map(({ field }) => field));
      expect(afterIssues.filter(({ field }) => !beforeFields.has(field))).toEqual([]);
      expect(afterIssues.length).toBeLessThanOrEqual(beforeIssues.length);
      const result = solveLevelForValidation(level, 20_000);
      expect(result.solved, `Lv${levelId}: ${result.termination}`).toBe(true);
      expect(replay(level, result.drags)).toBe(true);
    },
  );
});
