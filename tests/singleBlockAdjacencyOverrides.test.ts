import { describe, expect, it } from "vitest";

import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { LEVELS, LEVELS_BEFORE_SINGLE_BLOCK_ADJACENCY } from "../src/core/levels";
import { solveLevelForValidation } from "../src/core/levelSolver";
import {
  SINGLE_BLOCK_ADJACENCY_LEVEL_IDS,
  SINGLE_BLOCK_COLOR_ONLY_SOLVED_LEVEL_IDS,
  SINGLE_BLOCK_COLOR_PATCHES,
  applySingleBlockAdjacencyRepair,
} from "../src/core/singleBlockAdjacencyOverrides";
import {
  SINGLE_BLOCK_OPENING_REPAIR_LEVEL_IDS,
  SINGLE_BLOCK_OPENING_REPAIR_POLICY_VERSION,
} from "../src/core/singleBlockAdjacencyRepairs";
import type { BlockSpec, LevelSpec } from "../src/core/types";

const SINGLE_BLOCK_LEVELS = LEVELS_BEFORE_SINGLE_BLOCK_ADJACENCY.map(applySingleBlockAdjacencyRepair);

const outerColor = (block: BlockSpec) => block.layers?.[0] ?? block.color;
const isSingleton = (block: BlockSpec): boolean => (
  block.shape.length === 1 && block.shape[0]?.[0] === 0 && block.shape[0]?.[1] === 0
);
const cells = (block: BlockSpec): readonly (readonly [number, number])[] => (
  block.shape.map(([dx, dy]) => [block.x + dx, block.y + dy] as const)
);

const openingBlocks = (level: LevelSpec): BlockSpec[] => {
  const queued = new Set((level.generators ?? []).flatMap((generator) => generator.queueBlockIds));
  const shutterById = new Map((level.shutters ?? []).map((shutter) => [shutter.id, shutter]));
  return level.blocks.filter((block) => (
    !queued.has(block.id)
    && !(block.shutterId && (shutterById.get(block.shutterId)?.count ?? 0) > 0)
  ));
};

const singletonAdjacencyViolations = (level: LevelSpec): string[] => {
  const visible = openingBlocks(level);
  const occupants = new Map<string, BlockSpec[]>();
  for (const block of visible) {
    for (const [x, y] of cells(block)) {
      const key = `${x},${y}`;
      occupants.set(key, [...(occupants.get(key) ?? []), block]);
    }
  }
  const violations = new Set<string>();
  for (const block of visible.filter(isSingleton)) {
    const [x, y] = cells(block)[0]!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      for (const neighbour of occupants.get(`${x + dx},${y + dy}`) ?? []) {
        if (neighbour.id === block.id || outerColor(neighbour) !== outerColor(block)) continue;
        violations.add([block.id, neighbour.id].sort().join("|"));
      }
    }
  }
  return [...violations].sort();
};

const replaySolution = (level: LevelSpec, drags: ReturnType<typeof solveLevelForValidation>["drags"]): void => {
  const model = new PuzzleModel(level);
  for (const drag of drags) {
    model.beginAction();
    for (const [x, y] of drag.path) {
        const moved = model.moveBlockStep(drag.blockId, x, y);
        expect(moved, `Lv${level.id}/${drag.blockId} move ${x},${y}`).toBe(true);
      }
      if (drag.exitSide) expect(model.tryExit(drag.blockId, drag.exitSide).ok, `Lv${level.id}/${drag.blockId} exit`).toBe(true);
      expect(model.commitAction(), `Lv${level.id}/${drag.blockId} commit`).toBe(true);
  }
  expect(model.snapshot()).toMatchObject({ complete: true, blocks: [], queuedBlocks: [] });
};

describe("visible singleton adjacency repair", () => {
  it("publishes the exact 55-level, 203-colour-patch scope", () => {
    expect(SINGLE_BLOCK_ADJACENCY_LEVEL_IDS).toHaveLength(55);
    expect(new Set(SINGLE_BLOCK_ADJACENCY_LEVEL_IDS).size).toBe(55);
    expect(Object.values(SINGLE_BLOCK_COLOR_PATCHES).flat()).toHaveLength(203);
    expect(SINGLE_BLOCK_COLOR_ONLY_SOLVED_LEVEL_IDS).toHaveLength(27);
    expect(SINGLE_BLOCK_OPENING_REPAIR_LEVEL_IDS).toHaveLength(28);
    expect(SINGLE_BLOCK_OPENING_REPAIR_POLICY_VERSION).toBe("opening-preserving-v2");
    expect(new Set(SINGLE_BLOCK_OPENING_REPAIR_LEVEL_IDS).size).toBe(28);
    expect(SINGLE_BLOCK_OPENING_REPAIR_LEVEL_IDS).toEqual(
      SINGLE_BLOCK_ADJACENCY_LEVEL_IDS.filter((id) => !SINGLE_BLOCK_COLOR_ONLY_SOLVED_LEVEL_IDS.includes(id as never)),
    );
    expect(new Set(SINGLE_BLOCK_COLOR_ONLY_SOLVED_LEVEL_IDS).size).toBe(27);
    expect(SINGLE_BLOCK_COLOR_ONLY_SOLVED_LEVEL_IDS.every((id) => (
      SINGLE_BLOCK_ADJACENCY_LEVEL_IDS.includes(id as (typeof SINGLE_BLOCK_ADJACENCY_LEVEL_IDS)[number])
    ))).toBe(true);
    expect(Object.keys(SINGLE_BLOCK_COLOR_PATCHES).map(Number).sort((a, b) => a - b)).toEqual(
      [...SINGLE_BLOCK_ADJACENCY_LEVEL_IDS].sort((a, b) => a - b),
    );
  });

  it("records the regenerated intermediate delta and leaves the final 200-level runtime clean", () => {
    const sourceRows = LEVELS_BEFORE_SINGLE_BLOCK_ADJACENCY.map((level) => ({
      id: level.id,
      violations: singletonAdjacencyViolations(level),
    }));
    expect(sourceRows.filter((row) => row.violations.length > 0).map((row) => row.id)).toEqual(
      [...SINGLE_BLOCK_ADJACENCY_LEVEL_IDS],
    );
    expect(sourceRows.reduce((sum, row) => sum + row.violations.length, 0)).toBe(250);
    expect(SINGLE_BLOCK_LEVELS).toHaveLength(200);
    expect(SINGLE_BLOCK_LEVELS.flatMap((level) => (
      singletonAdjacencyViolations(level).map((pair) => `Lv${level.id}:${pair}`)
    ))).toEqual(["Lv117:lv117-opening-b03|lv117-opening-b08"]);
    for (const level of SINGLE_BLOCK_LEVELS) {
      expect(() => validateLevel(level), `Lv${level.id}`).not.toThrow();
    }
    for (const level of LEVELS) expect(singletonAdjacencyViolations(level), `final Lv${level.id}`).toEqual([]);
  });

  it("limits every patch to a source 1x1 block and preserves structure for the pure-colour subset", () => {
    for (const [rawId, patches] of Object.entries(SINGLE_BLOCK_COLOR_PATCHES)) {
      const id = Number(rawId);
      const source = LEVELS_BEFORE_SINGLE_BLOCK_ADJACENCY.find((level) => level.id === id)!;
      for (const patch of patches) {
        const block = source.blocks.find((candidate) => candidate.id === patch.blockId);
        expect(block, `Lv${id}/${patch.blockId}`).toBeDefined();
        expect(isSingleton(block!), `Lv${id}/${patch.blockId} must be 1x1`).toBe(true);
        expect(outerColor(block!), `Lv${id}/${patch.blockId} source colour`).toBe(patch.from);
        expect(patch.color).not.toBe(patch.from);
      }
    }
    for (const id of SINGLE_BLOCK_COLOR_ONLY_SOLVED_LEVEL_IDS) {
      const source = LEVELS_BEFORE_SINGLE_BLOCK_ADJACENCY.find((level) => level.id === id)!;
      const final = SINGLE_BLOCK_LEVELS.find((level) => level.id === id)!;
      expect({ ...final, blocks: undefined }, `Lv${id} non-block structure`).toEqual({ ...source, blocks: undefined });
      const sourceById = new Map(source.blocks.map((block) => [block.id, block]));
      for (const block of final.blocks) {
        const original = sourceById.get(block.id)!;
        expect({ ...block, color: undefined, layers: undefined }, `Lv${id}/${block.id} geometry`).toEqual({
          ...original,
          color: undefined,
          layers: undefined,
        });
      }
    }
  });

  it("keeps the opening dense for structural repairs instead of hiding the whole level", () => {
    const openingCount = (level: LevelSpec): number => {
      const queued = new Set((level.generators ?? []).flatMap((generator) => generator.queueBlockIds));
      const shutterById = new Map((level.shutters ?? []).map((shutter) => [shutter.id, shutter]));
      return level.blocks.filter((block) => (
        !queued.has(block.id)
        && !(block.shutterId && (shutterById.get(block.shutterId)?.count ?? 0) > 0)
      )).length;
    };
    for (const id of SINGLE_BLOCK_OPENING_REPAIR_LEVEL_IDS) {
      const level = SINGLE_BLOCK_LEVELS.find((candidate) => candidate.id === id)!;
      expect(openingCount(level), `Lv${id} should not collapse to one opening block`).toBeGreaterThan(1);
      expect(level.shutters?.some((shutter) => shutter.id.startsWith("solvability-repair-stage-")) ?? false).toBe(false);
    }
  });

  it("solves and replays only the 28 structurally regenerated fallback levels", () => {
    for (const id of SINGLE_BLOCK_OPENING_REPAIR_LEVEL_IDS) {
      const level = SINGLE_BLOCK_LEVELS.find((candidate) => candidate.id === id)!;
      const result = solveLevelForValidation(level, 20_000);
      expect(result, `Lv${id}`).toMatchObject({
        solved: true,
        termination: "solved",
        staticUnsatReasons: [],
        unsupportedReasons: [],
      });
      replaySolution(level, result.drags);
    }
  }, 180_000);
});
