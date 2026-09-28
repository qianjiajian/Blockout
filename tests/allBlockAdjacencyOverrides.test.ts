import { describe, expect, it } from "vitest";

import { LEVELS, LEVELS_BEFORE_SINGLE_BLOCK_ADJACENCY } from "../src/core/levels";
import {
  ALL_BLOCK_ADJACENCY_DIRECT_LEVEL_IDS,
  ALL_BLOCK_ADJACENCY_FORCED_LEVEL_IDS,
  ALL_BLOCK_ADJACENCY_MINIMAL_LEVEL_IDS,
  ALL_BLOCK_ADJACENCY_REPAIRED_LEVEL_IDS,
  applyAllBlockAdjacencyRepair,
} from "../src/core/allBlockAdjacencyOverrides";
import { applySingleBlockAdjacencyRepair } from "../src/core/singleBlockAdjacencyOverrides";
import { solveLevelForValidation } from "../src/core/levelSolver";
import { PuzzleModel } from "../src/core/PuzzleModel";
import type { BlockSpec, LevelSpec } from "../src/core/types";

type ContactViolation = {
  levelId: number;
  color: string;
  firstBlockId: string;
  secondBlockId: string;
  firstCell: readonly [number, number];
  secondCell: readonly [number, number];
};

const outerColor = (block: BlockSpec): BlockSpec["color"] => block.layers?.[0] ?? block.color;

const occupiedCells = (block: BlockSpec): readonly (readonly [number, number])[] => (
  block.shape.map(([dx, dy]) => [block.x + dx, block.y + dy] as const)
);

/**
 * Only blocks that are actually present on the opening board participate in
 * the visual-adjacency contract. Generator cargo is still off-board, while a
 * block assigned to a positive-count shutter is both hidden and immovable.
 * A zero-count shutter is already open, so its blocks remain in scope.
 */
const openingVisibleBlocks = (level: Pick<LevelSpec, "blocks" | "generators" | "shutters">): BlockSpec[] => {
  const queuedBlockIds = new Set(
    (level.generators ?? []).flatMap((generator) => generator.queueBlockIds),
  );
  const closedShutterIds = new Set(
    (level.shutters ?? [])
      .filter((shutter) => shutter.count > 0)
      .map((shutter) => shutter.id),
  );
  return level.blocks.filter((block) => (
    !queuedBlockIds.has(block.id)
    && !(block.shutterId && closedShutterIds.has(block.shutterId))
  ));
};

const sameColorOrthogonalContacts = (
  level: Pick<LevelSpec, "id" | "blocks" | "generators" | "shutters">,
): ContactViolation[] => {
  const blocks = openingVisibleBlocks(level);
  const occupants = new Map<string, BlockSpec[]>();
  for (const block of blocks) {
    for (const [x, y] of occupiedCells(block)) {
      const key = `${x},${y}`;
      occupants.set(key, [...(occupants.get(key) ?? []), block]);
    }
  }

  const violations = new Map<string, ContactViolation>();
  for (const block of blocks) {
    for (const [x, y] of occupiedCells(block)) {
      // Right and down are sufficient: every undirected orthogonal contact is
      // visited once, while contacts spanning several cells are de-duplicated.
      for (const [dx, dy] of [[1, 0], [0, 1]] as const) {
        for (const neighbour of occupants.get(`${x + dx},${y + dy}`) ?? []) {
          if (neighbour.id === block.id || outerColor(neighbour) !== outerColor(block)) continue;
          const [firstBlockId, secondBlockId] = [block.id, neighbour.id].sort();
          const key = `${firstBlockId}|${secondBlockId}`;
          if (violations.has(key)) continue;
          violations.set(key, {
            levelId: level.id,
            color: outerColor(block),
            firstBlockId,
            secondBlockId,
            firstCell: [x, y],
            secondCell: [x + dx, y + dy],
          });
        }
      }
    }
  }
  return [...violations.values()].sort((left, right) => (
    left.firstBlockId.localeCompare(right.firstBlockId)
    || left.secondBlockId.localeCompare(right.secondBlockId)
  ));
};

const fixtureLevel = (overrides: Partial<LevelSpec>): LevelSpec => ({
  id: 999,
  name: "adjacency fixture",
  difficulty: "normal",
  timeSeconds: 60,
  reward: 0,
  width: 6,
  height: 6,
  gates: [],
  blocks: [],
  ...overrides,
});

const replay = (level: LevelSpec, drags: ReturnType<typeof solveLevelForValidation>["drags"]): boolean => {
  const model = new PuzzleModel(level);
  for (const drag of drags) {
    model.beginAction();
    for (const [x, y] of drag.path) if (!model.moveBlockStep(drag.blockId, x, y)) return false;
    if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) return false;
    if (!model.commitAction()) return false;
  }
  const snapshot = model.snapshot();
  return snapshot.complete && snapshot.blocks.length === 0 && snapshot.queuedBlocks.length === 0;
};

describe("opening all-block colour adjacency", () => {
  it("publishes the certified repair scope and keeps fallback openings populated", () => {
    expect(ALL_BLOCK_ADJACENCY_DIRECT_LEVEL_IDS).toHaveLength(54);
    expect(ALL_BLOCK_ADJACENCY_MINIMAL_LEVEL_IDS).toEqual([
      37, 40, 41, 45, 54, 55, 61, 85, 96, 97, 99, 103, 105, 107, 108, 116, 127, 156,
    ]);
    expect(ALL_BLOCK_ADJACENCY_FORCED_LEVEL_IDS).toEqual([
      25, 31, 50, 51, 52, 53, 59, 66, 67, 75, 77, 83, 93, 100, 124, 152, 187,
    ]);
    expect(ALL_BLOCK_ADJACENCY_REPAIRED_LEVEL_IDS).toHaveLength(89);
    for (const levelId of ALL_BLOCK_ADJACENCY_FORCED_LEVEL_IDS) {
      const level = LEVELS.find((candidate) => candidate.id === levelId)!;
      expect(openingVisibleBlocks(level).length, `Lv${levelId} opening density`).toBeGreaterThanOrEqual(3);
    }
  });

  it("keeps every orthogonally touching visible block pair differently coloured in all 200 levels", () => {
    expect(LEVELS).toHaveLength(200);
    expect(LEVELS.map((level) => level.id)).toEqual(
      Array.from({ length: 200 }, (_, index) => index + 1),
    );

    const violations = LEVELS.flatMap(sameColorOrthogonalContacts);
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });

  it("keeps the dense Lv93/Lv124 openings while minimally widening compatible exits", () => {
    const repairedById = new Map([93, 124].map((levelId) => {
      const source = LEVELS_BEFORE_SINGLE_BLOCK_ADJACENCY.find((level) => level.id === levelId)!;
      const recolored = applySingleBlockAdjacencyRepair(source);
      const repaired = applyAllBlockAdjacencyRepair(recolored);
      expect(openingVisibleBlocks(repaired)).toHaveLength(openingVisibleBlocks(recolored).length);
      expect(repaired.blocks).toHaveLength(recolored.blocks.length);
      expect(repaired.shutters).toEqual(recolored.shutters);
      expect(repaired.gates).toHaveLength(recolored.gates.length);
      expect(repaired.flipDoors).toEqual(recolored.flipDoors);
      expect(repaired.gates.map((gate) => gate.frozen ?? 0)).toEqual(
        recolored.gates.map((gate) => gate.frozen ?? 0),
      );
      return [levelId, repaired] as const;
    }));

    expect(repairedById.get(93)!.gates.find((gate) => gate.id === "vp-093-gate-09")).toEqual(
      expect.objectContaining({ side: "left", offset: 3, size: 2, color: "blue" }),
    );
    expect(repairedById.get(124)!.gates.find((gate) => gate.id === "lv124-gate-05")).toEqual(
      expect.objectContaining({ side: "left", offset: 0, size: 3, color: "red" }),
    );
    expect(repairedById.get(124)!.gates.find((gate) => gate.id === "lv124-gate-06")).toEqual(
      expect.objectContaining({ side: "right", offset: 0, size: 2, color: "green" }),
    );

    for (const [levelId, level] of repairedById) {
      expect(sameColorOrthogonalContacts(level), `Lv${levelId} adjacency`).toEqual([]);
      const result = solveLevelForValidation(level, 20_000);
      expect(result.staticUnsatReasons, `Lv${levelId} static feasibility`).toEqual([]);
      expect(result.solved, `Lv${levelId} solver (${result.termination}, ${result.exploredStates} states)`).toBe(true);
      expect(replay(level, result.drags), `Lv${levelId} PuzzleModel replay`).toBe(true);
    }
  });

  it("excludes generator cargo and positive-count shutter cargo, but includes an open shutter", () => {
    const singleton = (id: string, x: number, shutterId?: string): BlockSpec => ({
      id,
      x,
      y: 0,
      shape: [[0, 0]],
      color: "red",
      ...(shutterId ? { shutterId } : {}),
    });
    const level = fixtureLevel({
      blocks: [
        singleton("visible", 0),
        singleton("queued", 1),
        singleton("closed-cargo", 1, "closed"),
        singleton("open-cargo", 1, "open"),
      ],
      generators: [{
        id: "generator",
        side: "top",
        offset: 0,
        spawn: [1, 0],
        queueBlockIds: ["queued"],
      }],
      shutters: [
        { id: "closed", x: 1, y: 0, width: 1, height: 1, count: 1 },
        { id: "open", x: 1, y: 0, width: 1, height: 1, count: 0 },
      ],
    });

    expect(openingVisibleBlocks(level).map((block) => block.id)).toEqual(["visible", "open-cargo"]);
    expect(sameColorOrthogonalContacts(level)).toEqual([expect.objectContaining({
      firstBlockId: "open-cargo",
      secondBlockId: "visible",
      color: "red",
    })]);
  });

  it("compares the currently visible outer layer and ignores contacts inside one shaped block", () => {
    const level = fixtureLevel({
      blocks: [
        {
          id: "layered-domino",
          x: 0,
          y: 0,
          shape: [[0, 0], [1, 0]],
          color: "red",
          layers: ["blue", "red"],
        },
        { id: "blue-single", x: 2, y: 0, shape: [[0, 0]], color: "blue" },
      ],
    });

    expect(sameColorOrthogonalContacts(level)).toEqual([expect.objectContaining({
      firstBlockId: "blue-single",
      secondBlockId: "layered-domino",
      color: "blue",
    })]);
  });
});
