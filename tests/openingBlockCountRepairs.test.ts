import { describe, expect, it } from "vitest";
import { extractRuntimeMechanismCountFacts } from "../src/core/competitorMechanismCountContract";
import {
  LEVELS_BEFORE_OPENING_BLOCK_COUNT_REPAIR as BASE_LEVELS,
  LEVELS_BEFORE_PLAYER_FACING_SHUTTER_COUNT_CONTRACT as OPENING_LEVELS,
} from "../src/core/levels";
import {
  applyOpeningBlockCountRepair,
  expectedOpeningBlockCount,
  openingVisibleBlockIds,
  OPENING_BLOCK_COUNT_REPAIR_LEVEL_IDS,
  OPENING_BLOCK_COUNT_REPAIR_VERSION,
} from "../src/core/openingBlockCountRepairs";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { solveLevelForValidation, type SolverDrag } from "../src/core/levelSolver";
import type { BlockSpec, LevelSpec } from "../src/core/types";

const withoutStageBinding = ({ shutterId: _ignored, ...block }: BlockSpec): Omit<BlockSpec, "shutterId"> => block;
const pointKey = (x: number, y: number): string => `${x},${y}`;

const openingAdjacency = (level: LevelSpec): string[] => {
  const visibleIds = new Set(openingVisibleBlockIds(level));
  const visible = level.blocks.filter((block) => visibleIds.has(block.id));
  const occupied = visible.map((block) => new Set(block.shape.map(([dx, dy]) => pointKey(block.x + dx, block.y + dy))));
  const issues: string[] = [];
  for (let left = 0; left < visible.length; left += 1) {
    for (let right = left + 1; right < visible.length; right += 1) {
      const leftBlock = visible[left]!;
      const rightBlock = visible[right]!;
      if ((leftBlock.layers?.[0] ?? leftBlock.color) !== (rightBlock.layers?.[0] ?? rightBlock.color)) continue;
      const touches = [...occupied[left]!].some((cell) => {
        const [x, y] = cell.split(",").map(Number);
        return occupied[right]!.has(pointKey(x! + 1, y!))
          || occupied[right]!.has(pointKey(x! - 1, y!))
          || occupied[right]!.has(pointKey(x!, y! + 1))
          || occupied[right]!.has(pointKey(x!, y! - 1));
      });
      if (touches) issues.push(`${leftBlock.id}:${rightBlock.id}`);
    }
  }
  return issues;
};

const replay = (level: LevelSpec, drags: readonly SolverDrag[]): void => {
  const model = new PuzzleModel(level);
  model.start();
  model.startCountdown();
  for (const [index, drag] of drags.entries()) {
    model.beginAction();
    for (const [x, y] of drag.path) {
      const before = model.getBlock(drag.blockId)!;
      const distance = Math.abs(before.x - x) + Math.abs(before.y - y);
      const moved = distance === 1
        ? model.moveBlockStep(drag.blockId, x, y)
        : model.moveBlock(drag.blockId, x, y);
      expect(moved, `Lv${level.id}/drag ${index + 1}/${drag.blockId} -> ${x},${y}`).toBe(true);
    }
    if (drag.exitSide) {
      expect(model.tryExit(drag.blockId, drag.exitSide).ok, `Lv${level.id}/drag ${index + 1} exits`).toBe(true);
    }
    expect(model.commitAction(), `Lv${level.id}/drag ${index + 1} commits`).toBe(true);
  }
  expect(model.snapshot(), `Lv${level.id}`).toMatchObject({ complete: true, blocks: [], queuedBlocks: [] });
};

describe(`opening block count repairs ${OPENING_BLOCK_COUNT_REPAIR_VERSION}`, () => {
  it("targets only the 22 structurally and solver-certified levels", () => {
    expect(OPENING_BLOCK_COUNT_REPAIR_LEVEL_IDS).toEqual([
      34, 92, 95, 101, 104, 136, 138, 140, 141, 145, 148,
      149, 157, 159, 164, 165, 166, 169, 176, 182, 192, 199,
    ]);
    expect(applyOpeningBlockCountRepair(BASE_LEVELS.find((level) => level.id === 1)!))
      .toBe(BASE_LEVELS.find((level) => level.id === 1));
  });

  it("restores exact competitor opening counts without changing player-facing contracts", () => {
    for (const levelId of OPENING_BLOCK_COUNT_REPAIR_LEVEL_IDS) {
      const before = BASE_LEVELS.find((level) => level.id === levelId)!;
      const after = applyOpeningBlockCountRepair(before);
      expect(after, `Lv${levelId} production integration`)
        .toEqual(OPENING_LEVELS.find((level) => level.id === levelId));
      expect(openingVisibleBlockIds(after).length, `Lv${levelId} opening count`)
        .toBe(expectedOpeningBlockCount(levelId));
      expect(after.blocks.map(withoutStageBinding), `Lv${levelId} block geometry/content`)
        .toEqual(before.blocks.map(withoutStageBinding));
      expect(after.gates, `Lv${levelId} gates`).toEqual(before.gates);
      expect(after.generators, `Lv${levelId} generators`).toEqual(before.generators);
      expect(after.flipDoors, `Lv${levelId} flip doors`).toEqual(before.flipDoors);
      expect(after.elevators, `Lv${levelId} elevators`).toEqual(before.elevators);
      expect(after.conveyors, `Lv${levelId} conveyors`).toEqual(before.conveyors);
      expect(after.coloredGrids, `Lv${levelId} colored grids`).toEqual(before.coloredGrids);
      expect((after.shutters ?? []).filter((shutter) => shutter.skin !== "staging"), `Lv${levelId} physical shutters`)
        .toEqual((before.shutters ?? []).filter((shutter) => shutter.skin !== "staging"));
      expect(extractRuntimeMechanismCountFacts(after), `Lv${levelId} mechanism quantities`)
        .toEqual(extractRuntimeMechanismCountFacts(before));
      expect(openingAdjacency(after), `Lv${levelId} opening adjacency`).toEqual([]);
      expect(() => validateLevel(after), `Lv${levelId} validation`).not.toThrow();
      expect(applyOpeningBlockCountRepair(after), `Lv${levelId} idempotence`).toBe(after);
    }
  });

  it("keeps every repaired level solver-complete and PuzzleModel replayable", () => {
    for (const levelId of OPENING_BLOCK_COUNT_REPAIR_LEVEL_IDS) {
      const level = applyOpeningBlockCountRepair(BASE_LEVELS.find((candidate) => candidate.id === levelId)!);
      const solution = solveLevelForValidation(level, 20_000);
      expect(solution.staticUnsatReasons, `Lv${levelId} static constraints`).toEqual([]);
      expect(solution.unsupportedReasons, `Lv${levelId} solver support`).toEqual([]);
      expect(solution.solved, `Lv${levelId}/${solution.termination}/${solution.exploredStates} states`).toBe(true);
      replay(level, solution.drags);
    }
  }, 120_000);
});
