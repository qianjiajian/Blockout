import { describe, expect, it } from "vitest";

import { boardCellsSeparatedBySeam } from "../src/core/boardSeams";
import {
  applyCompetitorDisconnectedBoardRepair,
  COMPETITOR_DISCONNECTED_BOARD_REPAIR_LEVEL_IDS,
  COMPETITOR_DISCONNECTED_BOARD_REPAIR_VERSION,
} from "../src/core/competitorDisconnectedBoardRepairs";
import { solveLevelForValidation, type SolverDrag } from "../src/core/levelSolver";
import {
  LEVELS,
  LEVELS_BEFORE_COMPETITOR_DISCONNECTED_BOARD_REPAIR,
} from "../src/core/levels";
import { openingVisibleBlockIds } from "../src/core/openingBlockCountRepairs";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import type { BlockSpec, LevelSpec, Point, Side } from "../src/core/types";

const repaired = (id: 176 | 185): LevelSpec => applyCompetitorDisconnectedBoardRepair(LEVELS[id - 1]!);
const pointKey = ([x, y]: Point): string => `${x},${y}`;
const outerColor = (block: BlockSpec): string => block.layers?.[0] ?? block.color;

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
      const moved = Math.abs(before.x - x) + Math.abs(before.y - y) === 1
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

const adjacencyIssues = (level: LevelSpec, blockIds: readonly string[]): string[] => {
  const selected = new Set(blockIds);
  const occupied = new Map<string, BlockSpec>();
  for (const block of level.blocks.filter(({ id }) => selected.has(id))) {
    for (const [dx, dy] of block.shape) occupied.set(pointKey([block.x + dx, block.y + dy]), block);
  }
  const issues = new Set<string>();
  for (const block of level.blocks.filter(({ id }) => selected.has(id))) {
    for (const [dx, dy] of block.shape) {
      const cell: Point = [block.x + dx, block.y + dy];
      for (const delta of [[1, 0], [0, 1]] as const) {
        const neighbor: Point = [cell[0] + delta[0], cell[1] + delta[1]];
        if (boardCellsSeparatedBySeam(level, cell, neighbor)) continue;
        const other = occupied.get(pointKey(neighbor));
        if (other && other.id !== block.id && outerColor(other) === outerColor(block)) {
          issues.add([block.id, other.id].sort().join("|"));
        }
      }
    }
  }
  return [...issues];
};

const frozenBySide = (level: LevelSpec): Record<Side, number[]> => Object.fromEntries(
  (["top", "right", "bottom", "left"] as const).map((side) => [
    side,
    level.gates.flatMap((gate) => gate.side === side && gate.frozen ? [gate.frozen] : []).sort((a, b) => a - b),
  ]),
) as Record<Side, number[]>;

describe(`competitor disconnected boards ${COMPETITOR_DISCONNECTED_BOARD_REPAIR_VERSION}`, () => {
  it("targets exactly Lv176/Lv185 and is reference-idempotent", () => {
    expect(COMPETITOR_DISCONNECTED_BOARD_REPAIR_LEVEL_IDS).toEqual([176, 185]);
    const targeted = new Set<number>(COMPETITOR_DISCONNECTED_BOARD_REPAIR_LEVEL_IDS);
    for (const source of LEVELS_BEFORE_COMPETITOR_DISCONNECTED_BOARD_REPAIR) {
      const after = applyCompetitorDisconnectedBoardRepair(source);
      expect(after === source, `Lv${source.id}`).toBe(!targeted.has(source.id));
      expect(applyCompetitorDisconnectedBoardRepair(after), `Lv${source.id} idempotence`).toBe(after);
    }
    for (const source of LEVELS) {
      expect(applyCompetitorDisconnectedBoardRepair(source), `Lv${source.id} runtime idempotence`).toBe(source);
    }
  });

  it("models two complete 5-row boards with a physical seam, never blocked interior cells", () => {
    for (const [id, width] of [[176, 8], [185, 7]] as const) {
      const level = repaired(id);
      expect(level).toMatchObject({ width, height: 10, blocked: undefined });
      expect(level.playable).toHaveLength(width * 10);
      expect(new Set(level.playable!.map(pointKey))).toHaveLength(width * 10);
      expect(level.seams).toEqual([{ orientation: "horizontal", offset: 5, start: 0, size: width }]);
      for (let x = 0; x < width; x += 1) {
        expect(boardCellsSeparatedBySeam(level, [x, 4], [x, 5]), `Lv${id} x${x}`).toBe(true);
      }
    }
  });

  it("places every video-visible exit on its physical component boundary", () => {
    const lv176 = repaired(176);
    expect(lv176.gates).toHaveLength(12);
    expect(lv176.gates.filter(({ frozen }) => frozen === undefined)).toHaveLength(1);
    expect(frozenBySide(lv176)).toEqual({
      top: [12, 16, 22, 23], right: [18, 18], bottom: [1, 8, 30], left: [4, 21],
    });
    expect(lv176.gates.map(({ side, portals }) => [side, portals?.[0]?.origin, portals?.[0]?.size])).toEqual([
      ["top", [0, 0], 3], ["top", [6, 0], 2], ["left", [0, 0], 2],
      ["right", [7, 0], 2], ["right", [7, 3], 2], ["bottom", [2, 4], 2],
      ["top", [2, 5], 2], ["top", [5, 5], 3], ["left", [0, 5], 3],
      ["left", [0, 8], 2], ["bottom", [0, 9], 2], ["bottom", [6, 9], 2],
    ]);

    const lv185 = repaired(185);
    expect(lv185.gates).toHaveLength(10);
    expect(lv185.gates.filter(({ frozen }) => frozen === undefined)).toHaveLength(5);
    expect(frozenBySide(lv185)).toEqual({ top: [14], right: [14, 14], bottom: [], left: [14, 14] });
    expect(lv185.gates.map(({ side, portals }) => [side, portals?.[0]?.origin, portals?.[0]?.size])).toEqual([
      ["top", [0, 0], 2], ["right", [6, 0], 2], ["right", [6, 3], 2],
      ["left", [0, 4], 1], ["bottom", [3, 4], 2], ["top", [3, 5], 2],
      ["left", [0, 5], 2], ["left", [0, 8], 2], ["right", [6, 5], 2], ["right", [6, 8], 2],
    ]);
  });

  it("preserves block ids/shapes/full counts and restores exact opening and shutter contracts", () => {
    const expected = {
      176: { opening: 9, full: 24, shutters: [[0, 0, 8, 5, 18], [4, 5, 4, 5, 5]] },
      185: { opening: 14, full: 17, shutters: [[0, 5, 7, 5, 14]] },
    } as const;
    for (const id of COMPETITOR_DISCONNECTED_BOARD_REPAIR_LEVEL_IDS) {
      const source = LEVELS[id - 1]!;
      const level = repaired(id);
      expect(level.blocks.map(({ id: blockId }) => blockId)).toEqual(source.blocks.map(({ id: blockId }) => blockId));
      expect(level.blocks.map(({ shape }) => shape)).toEqual(source.blocks.map(({ shape }) => shape));
      expect(level.blocks).toHaveLength(expected[id].full);
      expect(openingVisibleBlockIds(level)).toHaveLength(expected[id].opening);
      expect(level.shutters?.map(({ x, y, width, height, count }) => [x, y, width, height, count]))
        .toEqual(expected[id].shutters);
    }
  });

  it("validates and has no same-colour opening or packed-batch adjacency", () => {
    for (const id of COMPETITOR_DISCONNECTED_BOARD_REPAIR_LEVEL_IDS) {
      const level = repaired(id);
      expect(() => validateLevel(level), `Lv${id}`).not.toThrow();
      expect(adjacencyIssues(level, openingVisibleBlockIds(level)), `Lv${id} opening`).toEqual([]);
      expect(adjacencyIssues(level, level.blocks.map(({ id: blockId }) => blockId)), `Lv${id} all blocks`).toEqual([]);
    }
  });

  it("fresh-solves both separated boards within 30k states and transactionally replays", () => {
    for (const id of COMPETITOR_DISCONNECTED_BOARD_REPAIR_LEVEL_IDS) {
      const level = repaired(id);
      const solution = solveLevelForValidation(level, 30_000);
      expect(solution.staticUnsatReasons, `Lv${id} static`).toEqual([]);
      expect(solution.unsupportedReasons, `Lv${id} unsupported`).toEqual([]);
      expect(solution.solved, `Lv${id} ${solution.termination}/${solution.exploredStates}`).toBe(true);
      expect(solution.exploredStates, `Lv${id} state bound`).toBeLessThanOrEqual(30_000);
      expect(replay(level, solution.drags), `Lv${id} replay`).toBe(true);
    }
  }, 180_000);
});
