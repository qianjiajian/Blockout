import { describe, expect, it } from "vitest";
import { solveLevelForValidation } from "../src/core/levelSolver";
import { LEVELS } from "../src/core/levels";
import { PuzzleModel } from "../src/core/PuzzleModel";

export const registerCampaignValidationChapter = (chapter: number): void => {
  const levels = LEVELS.slice((chapter - 1) * 10, chapter * 10);
  describe(`campaign validation chapter ${chapter}`, () => {
    for (const level of levels) {
      it(`finds and replays a complete route for level ${level.id}: ${level.name}`, () => {
        const result = solveLevelForValidation(level);
        expect(result.solved, `searched ${result.exploredStates} validation states`).toBe(true);
        expect(result.minimumDrags).toBeGreaterThanOrEqual(result.clearLoad);
        if (level.id === 1) {
          expect(result).toMatchObject({ minimumDrags: 2, clearLoad: 2, repositionOverhead: 0, turns: 0 });
        } else if (level.id <= 10) {
          // Chapter 1 is calibrated against Lv3 by total proven work. Dense
          // clear-load levels may spend that work on exits instead of three
          // separate parking gestures; the dedicated parity suite proves the
          // exact 11–13 drag band with the optimal solver.
          expect(result.minimumDrags, `level ${level.id} chapter-one route`).toBeGreaterThanOrEqual(11);
          expect(result.repositionOverhead, `level ${level.id} required setup drags`).toBeGreaterThanOrEqual(1);
          expect(result.turns, `level ${level.id} route turns`).toBeGreaterThanOrEqual(1);
        } else {
          expect(result.repositionOverhead, `level ${level.id} required setup drags`).toBeGreaterThanOrEqual(3);
          expect(result.turns, `level ${level.id} route turns`).toBeGreaterThanOrEqual(3);
        }

        const model = new PuzzleModel(level);
        for (const drag of result.drags) {
          model.beginAction();
          for (const [stepIndex, [x, y]] of drag.path.entries()) {
            expect(model.moveBlock(drag.blockId, x, y), `${drag.blockId} -> ${x},${y}`).toBe(true);
            const movedBlock = model.getBlock(drag.blockId);
            const automaticSides = movedBlock ? model.possibleExitSides(movedBlock) : [];
            if (automaticSides.length > 0) {
              expect(stepIndex, `${drag.blockId} crosses an automatic exit before its drag ends`).toBe(drag.path.length - 1);
              expect(drag.exitSide, `${drag.blockId} parks on an automatic exit`).toBeDefined();
              expect(automaticSides, `${drag.blockId} exits through a different aligned gate`).toContain(drag.exitSide);
            }
          }
          if (drag.exitSide) expect(model.tryExit(drag.blockId, drag.exitSide).ok, `${drag.blockId} exits ${drag.exitSide}`).toBe(true);
          expect(model.commitAction()).toBe(true);
        }
        expect(model.snapshot().complete).toBe(true);
        expect(model.snapshot().moves).toBe(result.minimumDrags);
      }, 60_000);
    }
  });
};
