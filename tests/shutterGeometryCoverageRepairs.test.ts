// @ts-expect-error The app tsconfig excludes Node ambient types; Vitest runs in Node.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import {
  compareCompetitorMechanismCountContract,
  extractCompetitorMechanismCountContracts,
} from "../src/core/competitorMechanismCountContract";
import { solveLevelForValidation } from "../src/core/levelSolver";
import {
  LEVELS_BEFORE_COMPETITOR_EXACT_SHUTTER_GEOMETRY_POST100 as SHUTTER_GEOMETRY_LEVELS,
  LEVELS_BEFORE_SHUTTER_GEOMETRY_COVERAGE_REPAIR,
} from "../src/core/levels";
import { auditOrdinaryShutterCoverage, isOrdinaryShutter } from "../src/core/shutterCoverage";
import {
  applyShutterGeometryCoverageRepair,
  SHUTTER_GEOMETRY_COVERAGE_REPAIR_LEVEL_IDS,
  SHUTTER_GEOMETRY_COVERAGE_REPAIR_VERSION,
} from "../src/core/shutterGeometryCoverageRepairs";
import type { BlockSpec, LevelSpec } from "../src/core/types";

const TRUTH_PATHS = [
  new URL("../deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json", import.meta.url),
  new URL("../deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json", import.meta.url),
] as const;
type JsonRecord = Record<string, any>;
const truthDocuments = TRUTH_PATHS.map((path) => JSON.parse(readFileSync(path, "utf8")) as JsonRecord);
const contracts = new Map(truthDocuments.flatMap((document) => (
  extractCompetitorMechanismCountContracts(document)
)).map((contract) => [contract.levelId, contract]));
const truthById = new Map(truthDocuments.flatMap((document) => document.levels as JsonRecord[])
  .map((level) => [Number(level.level), level]));

const sourceLevels = LEVELS_BEFORE_SHUTTER_GEOMETRY_COVERAGE_REPAIR;
const repaired = sourceLevels.map(applyShutterGeometryCoverageRepair);
const repairedById = new Map(repaired.map((level) => [level.id, level]));

const cellsOf = (block: BlockSpec): readonly (readonly [number, number])[] => (
  block.shape.map(([dx, dy]) => [block.x + dx, block.y + dy] as const)
);

const hiddenBounds = (level: LevelSpec, shutterId: string) => {
  const cells = level.blocks.filter((block) => block.shutterId === shutterId).flatMap(cellsOf);
  if (!cells.length) return null;
  const left = Math.min(...cells.map(([x]) => x));
  const top = Math.min(...cells.map(([, y]) => y));
  return {
    x: left,
    y: top,
    width: Math.max(...cells.map(([x]) => x)) - left + 1,
    height: Math.max(...cells.map(([, y]) => y)) - top + 1,
  };
};

const openingAdjacency = (level: LevelSpec): string[] => {
  const queued = new Set((level.generators ?? []).flatMap(({ queueBlockIds }) => queueBlockIds));
  const closed = new Set((level.shutters ?? []).filter(({ count }) => count > 0).map(({ id }) => id));
  const visible = level.blocks.filter((block) => (
    !queued.has(block.id) && !(block.shutterId && closed.has(block.shutterId))
  ));
  const occupants = new Map<string, BlockSpec[]>();
  for (const block of visible) for (const [x, y] of cellsOf(block)) {
    const key = `${x},${y}`;
    occupants.set(key, [...(occupants.get(key) ?? []), block]);
  }
  const result = new Set<string>();
  for (const block of visible) for (const [x, y] of cellsOf(block)) {
    for (const [dx, dy] of [[1, 0], [0, 1]] as const) {
      for (const other of occupants.get(`${x + dx},${y + dy}`) ?? []) {
        const firstColor = block.layers?.[0] ?? block.color;
        const secondColor = other.layers?.[0] ?? other.color;
        if (block.id !== other.id && firstColor === secondColor) {
          result.add([block.id, other.id].sort().join("|"));
        }
      }
    }
  }
  return [...result];
};

const replay = (level: LevelSpec, drags: ReturnType<typeof solveLevelForValidation>["drags"]): boolean => {
  const model = new PuzzleModel(level);
  model.start();
  model.startCountdown();
  const timedInterval = Math.max(0, ...(level.generators ?? [])
    .filter(({ trigger }) => trigger === "time")
    .map((generator) => Math.max(generator.initialDelaySeconds ?? 0, generator.intervalSeconds ?? 1)));
  for (const drag of drags) {
    if (!model.getBlock(drag.blockId) && timedInterval > 0) model.tick(timedInterval);
    if (!model.getBlock(drag.blockId)) return false;
    model.beginAction();
    for (const [x, y] of drag.path) {
      const before = model.getBlock(drag.blockId)!;
      const distance = Math.abs(before.x - x) + Math.abs(before.y - y);
      if (!(distance === 1
        ? model.moveBlockStep(drag.blockId, x, y)
        : model.moveBlock(drag.blockId, x, y))) return false;
    }
    if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) return false;
    if (!model.commitAction()) return false;
    if (timedInterval > 0) model.tick(timedInterval);
  }
  return model.snapshot().complete;
};

describe(`shutter geometry/coverage ${SHUTTER_GEOMETRY_COVERAGE_REPAIR_VERSION}`, () => {
  it("changes only the certified scope, remains idempotent and keeps strict coverage clean", () => {
    const changedIds = sourceLevels.filter((level, index) => level !== repaired[index]).map(({ id }) => id);
    expect([
      [],
      [...SHUTTER_GEOMETRY_COVERAGE_REPAIR_LEVEL_IDS].sort((a, b) => a - b),
    ]).toContainEqual(changedIds);
    for (const level of repaired) {
      expect(applyShutterGeometryCoverageRepair(level), `Lv${level.id} idempotence`).toBe(level);
      expect(auditOrdinaryShutterCoverage(level)
        .filter(({ kind }) => kind !== "missing-hidden-cohort"), `Lv${level.id} strict coverage`).toEqual([]);
      for (const shutter of (level.shutters ?? []).filter(isOrdinaryShutter)) {
        const bounds = hiddenBounds(level, shutter.id);
        if (bounds) expect(bounds, `Lv${level.id}/${shutter.id} hidden bounds`).toEqual({
          x: shutter.x,
          y: shutter.y,
          width: shutter.width,
          height: shutter.height,
        });
      }
    }
  });

  it("does not add a competitor mechanism-quantity mismatch", () => {
    for (const levelId of SHUTTER_GEOMETRY_COVERAGE_REPAIR_LEVEL_IDS) {
      const before = sourceLevels[levelId - 1]!;
      const after = repairedById.get(levelId)!;
      expect(SHUTTER_GEOMETRY_LEVELS[levelId - 1], `Lv${levelId} production integration`).toEqual(after);
      const contract = contracts.get(levelId)!;
      const beforeIssues = compareCompetitorMechanismCountContract(before, contract).issues;
      const afterIssues = compareCompetitorMechanismCountContract(after, contract).issues;
      const oldFields = new Set(beforeIssues.map(({ field }) => field));
      expect(afterIssues.length, `Lv${levelId} mechanism issue count`).toBeLessThanOrEqual(beforeIssues.length);
      expect(afterIssues.every(({ field }) => oldFields.has(field)), `Lv${levelId} new issue field`).toBe(true);
    }
  });

  it("preserves exact competitor cover geometry where the source records it", () => {
    for (const levelId of [103, 105, 112]) {
      const sourceCovers = truthById.get(levelId)!.mechanisms.covers as JsonRecord[];
      const expected = sourceCovers.map(({ x, y, w, h }) => ({ x, y, width: w, height: h }));
      const actual = (repairedById.get(levelId)!.shutters ?? [])
        .filter(isOrdinaryShutter)
        .map(({ x, y, width, height }) => ({ x, y, width, height }));
      expect(actual, `Lv${levelId} competitor rectangles`).toEqual(expected);
    }

    // Lv55's source proves the cohort rather than the cover coordinates.
    const level55 = repairedById.get(55)!;
    const panel55 = level55.shutters!.find((shutter) => shutter.id === "vp-055-cover-1")!;
    const cargo55 = level55.blocks.filter((block) => block.shutterId === panel55.id);
    expect(truthById.get(55)!.mechanisms.covers).toMatchObject({
      count: 1,
      values: [8],
      hidden_batch_counts: [3],
      hidden_batch_histograms: [{ H3: 3 }],
    });
    expect(panel55.count).toBe(8);
    expect(cargo55).toHaveLength(3);
    expect(cargo55.every((block) => block.shape.length === 3
      && new Set(block.shape.map(([, dy]) => dy)).size === 1)).toBe(true);
  });

  it.each(SHUTTER_GEOMETRY_COVERAGE_REPAIR_LEVEL_IDS)(
    "keeps repaired Lv%i valid, opening-adjacency clean, solver-complete and replayable",
    (levelId) => {
      const level = repairedById.get(levelId)!;
      expect(() => validateLevel(level)).not.toThrow();
      expect(openingAdjacency(level)).toEqual([]);
      const result = solveLevelForValidation(level, 20_000);
      expect(result.solved, `${result.termination}: ${JSON.stringify(result.staticUnsatReasons)}`).toBe(true);
      expect(replay(level, result.drags)).toBe(true);
    },
    60_000,
  );
});
