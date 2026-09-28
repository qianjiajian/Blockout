import { describe, expect, it } from "vitest";

import {
  applyCompetitorCertifiedExactGeometryRepair,
  COMPETITOR_CERTIFIED_EXACT_GEOMETRY_REPAIR_LEVEL_IDS,
  COMPETITOR_CERTIFIED_EXACT_GEOMETRY_REPAIR_VERSION,
} from "../src/core/competitorCertifiedExactGeometryRepairs";
import { finalGeneratorPlacementIssues } from "../src/core/finalGeneratorContracts";
import { generatorSpawnAlignmentIssues } from "../src/core/generatorSpawnAlignmentRepairs";
import { solveLevelForValidation, type SolverDrag } from "../src/core/levelSolver";
import {
  LEVELS,
  LEVELS_BEFORE_COMPETITOR_CERTIFIED_EXACT_GEOMETRY_REPAIR,
  LEVELS_BEFORE_GENERATOR_FROZEN_CARGO_REPAIR,
} from "../src/core/levels";
import { openingVisibleBlockIds } from "../src/core/openingBlockCountRepairs";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { auditOrdinaryShutterCoverage } from "../src/core/shutterCoverage";
import type { BlockSpec, LevelSpec } from "../src/core/types";

const EXPECTED_MASKS: Readonly<Record<number, string>> = {
  72: "7x13:3j.3j.3j.34.34.3j.3j.3j.7.7.3j.3j.3j",
  77: "7x9:1t.3j.3j.3j.3j.3j.3j.2r.2r",
  79: "9x12:dj.dj.dj.dj.dj.dj.dj.0.e7.e7.e7.e7",
  82: "7x9:2o.3j.3j.3j.3j.3j.3j.3j.3j",
  92: "7x12:3j.3j.3j.3j.0.0.3j.3j.3j.3j.3j.3j",
  93: "8x9:6f.6f.6f.6f.6f.6f.6f.6f.6f",
  95: "8x11:73.73.73.73.0.0.0.73.73.73.73",
  97: "7x10:3j.3j.3j.3j.0.0.3j.3j.3j.3j",
  104: "7x10:3j.3j.3j.3j.1q.1q.3j.3j.3j.3j",
  115: "5x8:l.l.l.0.0.l.l.l",
  121: "6x8:1r.1r.1r.0.1r.1r.1r.1r",
  125: "6x7:x.x.x.x.x.19.1r",
  141: "8x14:73.73.73.73.73.73.1k.1k.1k.1k.73.73.73.73",
  144: "8x10:7.7.7.1r.1r.1r.73.73.73.73",
  145: "7x9:3i.3i.3i.1q.1q.1q.3j.3j.3j",
  146: "7x11:3j.3j.37.37.3j.3j.3j.2v.2v.3j.3j",
  147: "7x11:3j.f.f.3j.3j.3j.f.f.3j.3j.3j",
  148: "7x11:s.s.s.3j.3j.3j.3j.3j.3j.3j.3j",
  152: "6x8:c.1r.1r.1r.1r.1r.1r.c",
  155: "5x8:e.v.v.v.v.v.v.e",
  157: "6x11:1r.1r.1r.1r.u.u.u.1r.1r.1r.1r",
  158: "7x11:s.s.s.s.3j.3j.3j.s.s.s.s",
  159: "7x10:1q.1q.1q.3j.3j.3j.3j.3j.3j.3j",
  166: "7x10:3b.3b.3b.3b.3j.3j.3j.3b.3b.3b",
  167: "7x11:f.f.f.f.v.3j.3g.3c.3c.3c.3c",
  168: "7x9:3j.3j.3j.3j.0.3j.3j.3j.3j",
  169: "7x10:3j.3j.3j.3j.3j.1r.v.v.f.f",
  170: "8x11:1o.3i.73.73.73.3i.3i.73.73.73.73",
  171: "8x10:1o.3i.73.73.73.73.73.73.3i.1o",
  173: "8x12:1o.3i.73.73.73.73.73.73.73.73.3i.1o",
  174: "7x10:v.3j.3j.3j.3j.3j.3j.3j.3j.v",
  177: "7x11:s.s.1q.1q.3j.3j.3j.3j.3b.3b.3b",
  178: "7x10:3j.3j.3b.3b.1i.1i.3j.3j.3j.3j",
  182: "7x11:8.s.1q.3j.3j.3j.3j.3j.3j.3j.3j",
  184: "7x10:3j.3j.3j.v.v.v.v.3j.3j.3j",
  185: "7x10:3j.3j.3j.3j.3j.3j.3j.3j.3j.3j",
  186: "7x10:3j.3j.3j.7.3b.3b.3j.3j.3j.3j",
  188: "7x10:3j.3j.3j.3j.3j.s.s.s.s.s",
  192: "8x10:o.1o.3i.73.73.73.73.73.73.73",
  194: "8x15:73.73.73.73.73.73.3i.1o.o.o.o.73.73.73.73",
  197: "6x9:1r.1r.1r.1r.u.u.1r.1r.1r",
};

const without = <T extends object>(value: T, fields: readonly string[]): Partial<T> => (
  Object.fromEntries(Object.entries(value).filter(([name]) => !fields.includes(name))) as Partial<T>
);
const key = (x: number, y: number): string => `${x},${y}`;
const outer = (block: BlockSpec): string => block.layers?.[0] ?? block.color;

const maskSignature = (level: LevelSpec): string => {
  const playable = new Set((level.playable ?? []).map(([x, y]) => key(x, y)));
  const rows = Array.from({ length: level.height }, (_, y) => {
    let bits = 0;
    for (let x = 0; x < level.width; x += 1) if (playable.has(key(x, y))) bits += 2 ** x;
    return bits.toString(36);
  });
  return `${level.width}x${level.height}:${rows.join(".")}`;
};

const openingAdjacencyIssues = (level: LevelSpec): string[] => {
  const opening = new Set(openingVisibleBlockIds(level));
  const occupied = new Map<string, BlockSpec>();
  for (const block of level.blocks.filter(({ id }) => opening.has(id))) {
    for (const [dx, dy] of block.shape) occupied.set(key(block.x + dx, block.y + dy), block);
  }
  const issues = new Set<string>();
  for (const block of level.blocks.filter(({ id }) => opening.has(id))) {
    for (const [dx, dy] of block.shape) {
      const [x, y] = [block.x + dx, block.y + dy];
      for (const [ox, oy] of [[1, 0], [0, 1]] as const) {
        const other = occupied.get(key(x + ox, y + oy));
        if (other && other.id !== block.id && outer(other) === outer(block)) {
          issues.add([block.id, other.id].sort().join("|"));
        }
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

describe(`competitor certified exact geometry ${COMPETITOR_CERTIFIED_EXACT_GEOMETRY_REPAIR_VERSION}`, () => {
  it("changes exactly the 41 certified levels and is reference-idempotent", () => {
    expect(Object.keys(EXPECTED_MASKS).map(Number)).toEqual([
      ...COMPETITOR_CERTIFIED_EXACT_GEOMETRY_REPAIR_LEVEL_IDS,
    ]);
    const affected = new Set<number>(COMPETITOR_CERTIFIED_EXACT_GEOMETRY_REPAIR_LEVEL_IDS);
    for (const before of LEVELS_BEFORE_COMPETITOR_CERTIFIED_EXACT_GEOMETRY_REPAIR) {
      const after = applyCompetitorCertifiedExactGeometryRepair(before);
      expect(after === before, `Lv${before.id}`).toBe(!affected.has(before.id));
      if (!affected.has(before.id)) continue;
      expect(after, `Lv${before.id} production stage`).toEqual(
        LEVELS_BEFORE_GENERATOR_FROZEN_CARGO_REPAIR[before.id - 1],
      );
      expect(applyCompetitorCertifiedExactGeometryRepair(after), `Lv${before.id} idempotence`).toBe(after);
    }
  });

  it("matches every certified mask exactly and removes legacy blocked cells", () => {
    for (const levelId of COMPETITOR_CERTIFIED_EXACT_GEOMETRY_REPAIR_LEVEL_IDS) {
      const level = LEVELS[levelId - 1]!;
      expect(maskSignature(level), `Lv${levelId}`).toBe(EXPECTED_MASKS[levelId]);
      expect(level.blocked, `Lv${levelId}`).toBeUndefined();
    }
  });

  it("preserves source order and every non-geometric payload", () => {
    for (const levelId of COMPETITOR_CERTIFIED_EXACT_GEOMETRY_REPAIR_LEVEL_IDS) {
      const before = LEVELS_BEFORE_COMPETITOR_CERTIFIED_EXACT_GEOMETRY_REPAIR[levelId - 1]!;
      const after = LEVELS_BEFORE_GENERATOR_FROZEN_CARGO_REPAIR[levelId - 1]!;
      expect(after.blocks.map(({ id }) => id), `Lv${levelId} block order`)
        .toEqual(before.blocks.map(({ id }) => id));
      expect(after.gates.map(({ id }) => id), `Lv${levelId} gate order`)
        .toEqual(before.gates.map(({ id }) => id));
      expect(after.blocks.map((block) => without(block, ["x", "y"])), `Lv${levelId} block payload`)
        .toEqual(before.blocks.map((block) => without(block, ["x", "y"])));
      expect(after.gates.map((gate) => without(gate, ["side", "offset", "size"])), `Lv${levelId} gate payload`)
        .toEqual(before.gates.map((gate) => without(gate, ["side", "offset", "size"])));
      expect((after.shutters ?? []).map((shutter) => without(shutter, ["x", "y", "width", "height"])), `Lv${levelId} shutter payload`)
        .toEqual((before.shutters ?? []).map((shutter) => without(shutter, ["x", "y", "width", "height"])));
      expect((after.generators ?? []).map((generator) => without(generator, ["side", "offset", "spawn", "rimAnchor"])), `Lv${levelId} generator payload`)
        .toEqual((before.generators ?? []).map((generator) => without(generator, ["side", "offset", "spawn", "rimAnchor"])));
      expect((after.flipDoors ?? []).map((door) => without(door, ["side", "offset", "size"])), `Lv${levelId} flip payload`)
        .toEqual((before.flipDoors ?? []).map((door) => without(door, ["side", "offset", "size"])));
      expect(openingVisibleBlockIds(after), `Lv${levelId} opening cohort`)
        .toEqual(openingVisibleBlockIds(before));
      expect(without(after, ["width", "height", "playable", "blocked", "blocks", "gates", "shutters", "generators", "flipDoors"]), `Lv${levelId} level payload`)
        .toEqual(without(before, ["width", "height", "playable", "blocked", "blocks", "gates", "shutters", "generators", "flipDoors"]));
    }
  });

  it("passes validation, adjacency, shutter coverage and generator contracts", () => {
    for (const levelId of COMPETITOR_CERTIFIED_EXACT_GEOMETRY_REPAIR_LEVEL_IDS) {
      const level = LEVELS[levelId - 1]!;
      expect(() => validateLevel(level), `Lv${levelId}`).not.toThrow();
      expect(openingAdjacencyIssues(level), `Lv${levelId} opening adjacency`).toEqual([]);
      expect(
        auditOrdinaryShutterCoverage(level).filter(({ kind }) => kind !== "missing-hidden-cohort"),
        `Lv${levelId} shutter geometry coverage`,
      ).toEqual([]);
      expect(generatorSpawnAlignmentIssues(level), `Lv${levelId} centre mouth`).toEqual([]);
      expect(finalGeneratorPlacementIssues(level), `Lv${levelId} generator rim`).toEqual([]);
    }
  });

  it("fresh-solves all 41 levels within 20k states and independently replays them", () => {
    for (const levelId of COMPETITOR_CERTIFIED_EXACT_GEOMETRY_REPAIR_LEVEL_IDS) {
      const level = LEVELS[levelId - 1]!;
      const solution = solveLevelForValidation(level, 20_000);
      expect(solution.staticUnsatReasons, `Lv${levelId} static`).toEqual([]);
      expect(solution.unsupportedReasons, `Lv${levelId} unsupported`).toEqual([]);
      expect(solution.solved, `Lv${levelId}: ${solution.termination}/${solution.exploredStates}`).toBe(true);
      expect(solution.exploredStates, `Lv${levelId} state budget`).toBeLessThanOrEqual(20_000);
      expect(replay(level, solution.drags), `Lv${levelId} replay`).toBe(true);
    }
  }, 180_000);
});
