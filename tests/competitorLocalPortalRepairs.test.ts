import { describe, expect, it } from "vitest";
import {
  applyCompetitorLocalPortalRepair,
  COMPETITOR_LOCAL_PORTAL_REPAIR_LEVEL_IDS,
} from "../src/core/competitorLocalPortalRepairs";
import { solveLevelForValidation } from "../src/core/levelSolver";
import {
  LEVELS,
  LEVELS_BEFORE_COMPETITOR_LOCAL_PORTAL_REPAIR,
} from "../src/core/levels";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import type { BlockSpec, LevelSpec, Point } from "../src/core/types";

const EXPECTED_MASKS: Readonly<Record<number, readonly string[]>> = {
  73: [
    "#####..", "#####..", "#####..", "#####..", "#####..", ".......", ".......",
    "..#####", "..#####", "..#####", "..#####", "..#####",
  ],
  75: [
    "..###..", ".#####.", "#######", "#######", ".#####.", "..###..",
    ".......", ".#####.", "#######", "#######", "#######",
  ],
  83: [
    "###..###", "###..###", "###..###", "###..###", "........", "........",
    "########", "########", "########", "########", "########", "########",
  ],
  130: ["########", "########", "########", "........", "..####..", "..####..", "..####..", "..####.."],
};

const EXPECTED_PORTALS = new Map<number, number>([[73, 13], [75, 10], [83, 17], [130, 12]]);
const EXPECTED_OPENING = new Map<number, number>([[73, 9], [75, 20], [83, 12], [130, 20]]);
const EXPECTED_FULL = new Map<number, number>([[73, 29], [75, 24], [83, 28], [130, 25]]);
const EXPECTED_FROZEN = new Map<number, number[]>([
  [73, [1, 3, 5, 6, 6, 8, 19, 20, 22, 23, 24, 25]],
  [75, [1, 2, 3, 11, 11, 11, 11, 11, 11]],
  [83, [2, 6, 8, 10]],
  [130, [3, 6, 7]],
]);

const sourceLevel = (id: number): LevelSpec => (
  LEVELS_BEFORE_COMPETITOR_LOCAL_PORTAL_REPAIR.find((level) => level.id === id)!
);
const repairedLevel = (id: number): LevelSpec => applyCompetitorLocalPortalRepair(sourceLevel(id));

const maskRows = (level: LevelSpec): string[] => {
  const playable = new Set((level.playable ?? []).map(([x, y]) => `${x},${y}`));
  return Array.from({ length: level.height }, (_, y) => (
    Array.from({ length: level.width }, (_, x) => playable.has(`${x},${y}`) ? "#" : ".").join("")
  ));
};

const shapeName = (block: BlockSpec): string => {
  if (block.shape.length === 1) return "SINGLE";
  const width = Math.max(...block.shape.map(([x]) => x)) + 1;
  const height = Math.max(...block.shape.map(([, y]) => y)) + 1;
  if (block.shape.length === 2) return width === 2 ? "H2" : "V2";
  if (block.shape.length === 3) return width === 3 ? "H3" : height === 3 ? "V3" : "L3";
  if (block.shape.length === 4 && width === 2 && height === 2) return "SQ2";
  return `${width}x${height}:${block.shape.length}`;
};

const histogram = (blocks: readonly BlockSpec[]): Record<string, number> => blocks.reduce<Record<string, number>>(
  (result, block) => ({ ...result, [shapeName(block)]: (result[shapeName(block)] ?? 0) + 1 }),
  {},
);

const openingBlocks = (level: LevelSpec): BlockSpec[] => {
  const queued = new Set((level.generators ?? []).flatMap((generator) => generator.queueBlockIds));
  return level.blocks.filter((block) => !block.shutterId && !queued.has(block.id));
};

const visibleColor = (block: BlockSpec): string => block.layers?.[0] ?? block.color;
const sameColorOpeningContacts = (level: LevelSpec): string[] => {
  const cells = new Map<string, { id: string; color: string }>();
  for (const block of openingBlocks(level)) for (const [dx, dy] of block.shape) {
    cells.set(`${block.x + dx},${block.y + dy}`, { id: block.id, color: visibleColor(block) });
  }
  const issues: string[] = [];
  for (const [key, block] of cells) {
    const [x, y] = key.split(",").map(Number) as [number, number];
    for (const [dx, dy] of [[1, 0], [0, 1]] as Point[]) {
      const peer = cells.get(`${x + dx},${y + dy}`);
      if (peer && peer.id !== block.id && peer.color === block.color) issues.push(`${block.id}/${peer.id}@${key}`);
    }
  }
  return issues;
};

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

describe("competitor local-portal repairs", () => {
  it("is isolated and idempotent", () => {
    const nonTarget = sourceLevel(74);
    expect(applyCompetitorLocalPortalRepair(nonTarget)).toBe(nonTarget);
    expect(COMPETITOR_LOCAL_PORTAL_REPAIR_LEVEL_IDS).toEqual([73, 75, 83, 130]);
    for (const id of COMPETITOR_LOCAL_PORTAL_REPAIR_LEVEL_IDS) {
      const repaired = repairedLevel(id);
      expect(repaired).not.toBe(sourceLevel(id));
      expect(applyCompetitorLocalPortalRepair(repaired)).toBe(repaired);
      expect(applyCompetitorLocalPortalRepair(LEVELS[id - 1]!), `Lv${id} runtime idempotence`).toBe(LEVELS[id - 1]);
    }
  });

  it("keeps every observed physical exit independent on its exact local boundary", () => {
    for (const id of COMPETITOR_LOCAL_PORTAL_REPAIR_LEVEL_IDS) {
      const level = repairedLevel(id);
      expect(maskRows(level)).toEqual(EXPECTED_MASKS[id]);
      expect(level.gates).toHaveLength(EXPECTED_PORTALS.get(id)!);
      expect(level.flipDoors ?? []).toHaveLength(0);
      expect(level.gates.flatMap((gate) => gate.frozen === undefined ? [] : [gate.frozen]).sort((a, b) => a - b))
        .toEqual(EXPECTED_FROZEN.get(id));
      expect(level.gates.filter((gate) => gate.star)).toEqual([]);
      for (const gate of level.gates) {
        expect(gate.portals, `${gate.id} portal cardinality`).toHaveLength(1);
        const portal = gate.portals![0]!;
        expect(gate.side).toBe(portal.side);
        expect(gate.size).toBe(portal.size);
        expect(gate.offset).toBe(portal.side === "top" || portal.side === "bottom" ? portal.origin[0] : portal.origin[1]);
      }
      expect(() => validateLevel(level)).not.toThrow();
    }
  });

  it("preserves opening/full composition and source mechanisms", () => {
    const lv73 = repairedLevel(73);
    expect(openingBlocks(lv73)).toHaveLength(9);
    expect(lv73.blocks).toHaveLength(29);
    expect(histogram(openingBlocks(lv73))).toEqual({ SQ2: 3, H2: 2, SINGLE: 2, "3x2:4": 1, L3: 1 });
    expect(histogram(lv73.blocks)).toEqual({
      SQ2: 4,
      H2: 6,
      SINGLE: 7,
      "3x2:4": 1,
      L3: 5,
      H3: 3,
      "2x3:4": 1,
      V2: 2,
    });
    expect(lv73.blocks.filter((block) => block.layers)).toHaveLength(1);
    expect(lv73.shutters).toMatchObject([
      { skin: "shutter", count: 19, x: 2, y: 7, width: 5, height: 5 },
      { skin: "staged-frame", count: 9, x: 0, y: 0, width: 5, height: 5 },
    ]);

    const lv75 = repairedLevel(75);
    expect(openingBlocks(lv75)).toHaveLength(20);
    expect(lv75.blocks).toHaveLength(24);
    expect(histogram(openingBlocks(lv75))).toEqual({ V2: 2, H3: 4, SINGLE: 7, H2: 4, SQ2: 1, L3: 2 });
    expect(histogram(lv75.blocks)).toEqual({ V2: 3, H3: 4, SINGLE: 7, H2: 4, SQ2: 2, L3: 4 });
    expect(lv75.blocks.filter((block) => block.layers)).toHaveLength(2);
    expect(lv75.shutters).toMatchObject([{ skin: "staged-frame", count: 5, x: 2, y: 1, width: 3, height: 4 }]);

    const lv83 = repairedLevel(83);
    expect(openingBlocks(lv83)).toHaveLength(12);
    expect(lv83.blocks).toHaveLength(28);
    expect(histogram(openingBlocks(lv83))).toEqual({ SQ2: 12 });
    expect(histogram(lv83.blocks)).toEqual({ SQ2: 12, SINGLE: 12, L3: 4 });
    expect(lv83.shutters?.map(({ count, x, y, width, height }) => ({ count, x, y, width, height }))).toEqual([
      { count: 15, x: 0, y: 0, width: 3, height: 4 },
      { count: 15, x: 5, y: 0, width: 3, height: 4 },
    ]);
    expect(lv83.blocks.filter((block) => block.layers)).toHaveLength(3);
    expect(lv83.blocks.filter((block) => block.keyId)).toHaveLength(2);
    expect(lv83.blocks.filter((block) => block.lockedBy && block.lockCount === 1)).toHaveLength(2);

    const lv130 = repairedLevel(130);
    expect(openingBlocks(lv130)).toHaveLength(20);
    expect(lv130.blocks).toHaveLength(25);
    expect(histogram(openingBlocks(lv130))).toEqual({ SINGLE: 17, H2: 2, V2: 1 });
    expect(lv130.shutters).toMatchObject([{ skin: "shutter", count: 20, x: 2, y: 4, width: 4, height: 4 }]);
    expect(lv130.blocks.filter((block) => block.keyId)).toHaveLength(3);
    expect(lv130.blocks.filter((block) => block.lockedBy && block.lockCount === 1)).toHaveLength(3);

    for (const id of COMPETITOR_LOCAL_PORTAL_REPAIR_LEVEL_IDS) {
      const level = repairedLevel(id);
      expect(openingBlocks(level)).toHaveLength(EXPECTED_OPENING.get(id)!);
      expect(level.blocks).toHaveLength(EXPECTED_FULL.get(id)!);
      expect(level.generators ?? []).toEqual([]);
      expect(level.blocks.filter((block) => block.frozen || block.star)).toEqual([]);
      expect(sameColorOpeningContacts(level), `Lv${id} opening adjacency`).toEqual([]);
    }
  });

  it("fresh-solves and replays all four portal layouts within 30k states", () => {
    const explored = new Map<number, number>();
    for (const id of COMPETITOR_LOCAL_PORTAL_REPAIR_LEVEL_IDS) {
      const level = repairedLevel(id);
      const solution = solveLevelForValidation(level, 30_000);
      explored.set(id, solution.exploredStates);
      expect(solution.solved, `Lv${id}: ${solution.termination}`).toBe(true);
      expect(solution.exploredStates).toBeLessThanOrEqual(30_000);
      expect(replay(level, solution.drags), `Lv${id} replay`).toBe(true);
    }
    expect([...explored.keys()]).toEqual([73, 75, 83, 130]);
  }, 60_000);
});
