import { describe, expect, it } from "vitest";
import { EXPANSION_RECIPES } from "../src/core/campaignExpansion";
import { solveLevelForValidation, solveLevelOptimally } from "../src/core/levelSolver";
import { LEVELS } from "../src/core/levels";
import { PuzzleModel } from "../src/core/PuzzleModel";
import type { LevelSpec, Point } from "../src/core/types";

const BOSS_EXPECTATIONS = [
  { levelId: 60, sourceId: 111, overhead: 3 },
  { levelId: 70, sourceId: 112, overhead: 3 },
  { levelId: 80, sourceId: 113, overhead: 8 },
  { levelId: 90, sourceId: 114, overhead: 3 },
  { levelId: 100, sourceId: 115, overhead: 12 },
] as const;

const replay = (level: LevelSpec, result: ReturnType<typeof solveLevelForValidation>): PuzzleModel => {
  const model = new PuzzleModel(level);
  for (const drag of result.drags) {
    model.beginAction();
    for (const [x, y] of drag.path) expect(model.moveBlock(drag.blockId, x, y)).toBe(true);
    if (drag.exitSide) expect(model.tryExit(drag.blockId, drag.exitSide).ok).toBe(true);
    expect(model.commitAction()).toBe(true);
  }
  return model;
};

const continuationFrom = (level: LevelSpec, model: PuzzleModel): LevelSpec => {
  const snapshot = model.snapshot();
  return {
    ...level,
    id: level.id + 10_000,
    name: `${level.name}-continuation`,
    parMoves: undefined,
    playable: snapshot.playable,
    blocked: snapshot.blocked,
    gates: snapshot.gates,
    blocks: snapshot.blocks,
    shutters: snapshot.shutters,
  };
};

describe("late campaign boss strategy", () => {
  it("uses five dedicated one-off blueprints", () => {
    for (const expectation of BOSS_EXPECTATIONS) {
      const recipe = EXPANSION_RECIPES.find(({ id }) => id === expectation.levelId);
      expect(recipe?.sourceId).toBe(expectation.sourceId);
      expect(EXPANSION_RECIPES.filter(({ sourceId }) => sourceId === expectation.sourceId)).toHaveLength(1);
    }
  });

  const strategyProfiles: string[] = [];
  for (const expectation of BOSS_EXPECTATIONS) {
    it(`solves and replays level ${expectation.levelId} with strategic routing`, () => {
      const level = LEVELS[expectation.levelId - 1];
      const result = solveLevelForValidation(level);
      expect(result.solved, `explored ${result.exploredStates} states`).toBe(true);
      expect(level.parMoves).toBeGreaterThanOrEqual(result.clearLoad);
      expect(result.repositionOverhead).toBe(expectation.overhead);
      expect(result.turns).toBeGreaterThanOrEqual(3);
      const model = replay(level, result);
      expect(model.snapshot().complete).toBe(true);
      expect(model.snapshot().moves).toBe(result.minimumDrags);
      strategyProfiles.push(JSON.stringify({
        board: [level.width, level.height, level.playable],
        positions: level.blocks.map((block) => [block.id, block.x, block.y]),
        shapes: level.blocks.map((block) => block.shape),
        layers: level.blocks.map((block) => block.layers?.length ?? 1),
        frozenGates: level.gates.map((gate) => gate.frozen ?? 0),
        shutters: level.shutters?.map((shutter) => shutter.count) ?? [],
        elevator: level.elevators?.length ?? 0,
        conveyor: level.conveyors?.length ?? 0,
        star: level.blocks.some((block) => block.star),
      }));
    }, 60_000);
  }

  it("does not collapse all five bosses onto one metric profile", () => {
    expect(new Set(strategyProfiles)).toHaveLength(BOSS_EXPECTATIONS.length);
  });

  it("keeps at least two legal opening choices on all five bosses", () => {
    for (const { levelId } of BOSS_EXPECTATIONS) {
      const level = LEVELS[levelId - 1];
      const legalOpeners = new Set<string>();
      for (const block of level.blocks) {
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as Point[]) {
          const model = new PuzzleModel(level);
          model.beginAction();
          if (model.moveBlock(block.id, block.x + dx, block.y + dy) && model.commitAction()) {
            legalOpeners.add(`${block.id}:${dx},${dy}`);
          }
        }
      }
      expect(legalOpeners.size, `Lv${levelId} legal opening choices`).toBeGreaterThanOrEqual(2);
    }
  });

  it("proves a representative legal first drag is suboptimal", () => {
    const level = LEVELS[2];
    const optimal = solveLevelOptimally(level);
    expect(optimal.solved).toBe(true);
    let proved = false;
    for (const [dragIndex, drag] of optimal.drags.entries()) {
      if (drag.exitSide || drag.path.length < 2) continue;
      for (const [partialIndex] of drag.path.slice(0, -1).entries()) {
        const model = new PuzzleModel(level);
        for (const prefix of optimal.drags.slice(0, dragIndex)) {
          model.beginAction();
          for (const [x, y] of prefix.path) expect(model.moveBlock(prefix.blockId, x, y)).toBe(true);
          if (prefix.exitSide) expect(model.tryExit(prefix.blockId, prefix.exitSide).ok).toBe(true);
          expect(model.commitAction()).toBe(true);
        }
        model.beginAction();
        for (const [x, y] of drag.path.slice(0, partialIndex + 1)) expect(model.moveBlock(drag.blockId, x, y)).toBe(true);
        expect(model.commitAction()).toBe(true);
        const continuation = solveLevelOptimally(continuationFrom(level, model));
        expect(continuation.solved).toBe(true);
        if (dragIndex + 1 + continuation.minimumDrags > optimal.minimumDrags) {
          proved = true;
          break;
        }
      }
      if (proved) break;
    }
    expect(proved).toBe(true);
  }, 60_000);
});
