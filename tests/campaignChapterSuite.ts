import { describe, expect, it } from "vitest";
import { solveLevelOptimally } from "../src/core/levelSolver";
import { LEVELS } from "../src/core/levels";
import { PuzzleModel } from "../src/core/PuzzleModel";

export const registerCampaignChapter = (chapter: number): void => {
  const levels = LEVELS.slice((chapter - 1) * 10, chapter * 10);
  describe(`campaign chapter ${chapter}`, () => {
    for (const level of levels) {
      it(`keeps level ${level.id}: ${level.name} on an achievable clear budget`, () => {
        const clearLoad = level.blocks.reduce((sum, block) => sum + (block.layers?.length ?? 1), 0);
        expect(level.parMoves).toBeTypeOf("number");
        expect(level.parMoves).toBeGreaterThanOrEqual(clearLoad);
      });
    }

    it(`proves and replays one exact optimum in chapter ${chapter}`, () => {
      const level = levels[0];
      const result = solveLevelOptimally(level);
      expect(result.solved, `explored ${result.exploredStates} states`).toBe(true);
      expect(result.minimumDrags).toBeLessThanOrEqual(level.parMoves ?? Number.POSITIVE_INFINITY);

      const model = new PuzzleModel(level);
      for (const drag of result.drags) {
        model.beginAction();
        for (const [x, y] of drag.path) expect(model.moveBlock(drag.blockId, x, y)).toBe(true);
        if (drag.exitSide) expect(model.tryExit(drag.blockId, drag.exitSide).ok).toBe(true);
        expect(model.commitAction()).toBe(true);
      }
      expect(model.snapshot().complete).toBe(true);
      expect(model.snapshot().moves).toBe(result.minimumDrags);
    }, 60_000);
  });
};
