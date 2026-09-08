import { describe, expect, it } from "vitest";
import { PuzzleModel } from "../src/core/PuzzleModel";
import { solveLevelOptimally } from "../src/core/levelSolver";
import { LEVELS } from "../src/core/levels";
import type { LevelSpec } from "../src/core/types";

const continuationFrom = (level: LevelSpec, model: PuzzleModel): LevelSpec => {
  const snapshot = model.snapshot();
  return {
    ...level,
    id: level.id + 20_000,
    name: `${level.name}-choice-check`,
    parMoves: undefined,
    playable: snapshot.playable,
    blocked: snapshot.blocked,
    gates: snapshot.gates,
    blocks: snapshot.blocks,
    shutters: snapshot.shutters,
  };
};

describe("campaign strategy choices", () => {
  for (const levelId of [3, 8, 9, 13, 19, 26, 29, 40]) {
    it(`level ${levelId} has a legal decision that costs an extra drag`, () => {
      const level = LEVELS[levelId - 1];
      const optimal = solveLevelOptimally(level);
      expect(optimal.solved).toBe(true);
      let proved = false;

      for (const [dragIndex, drag] of optimal.drags.entries()) {
        if (drag.exitSide || drag.path.length < 2) continue;
        for (const [partialIndex, [x, y]] of drag.path.slice(0, -1).entries()) {
          const model = new PuzzleModel(level);
          for (const prefix of optimal.drags.slice(0, dragIndex)) {
            model.beginAction();
            for (const [prefixX, prefixY] of prefix.path) expect(model.moveBlock(prefix.blockId, prefixX, prefixY)).toBe(true);
            if (prefix.exitSide) expect(model.tryExit(prefix.blockId, prefix.exitSide).ok).toBe(true);
            expect(model.commitAction()).toBe(true);
          }
          model.beginAction();
          for (const [partialX, partialY] of drag.path.slice(0, partialIndex + 1)) {
            expect(model.moveBlock(drag.blockId, partialX, partialY)).toBe(true);
          }
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
      // Automatic gate alignment can intentionally remove an old partial-stop
      // branch. The strategic requirement is still meaningful if a different
      // legal opening commits the player to at least one extra drag.
      if (!proved) {
        const directions = [[1, 0], [0, 1], [-1, 0], [0, -1]] as const;
        for (const authored of level.blocks) {
          for (const [dx, dy] of directions) {
            const model = new PuzzleModel(level);
            const block = model.getBlock(authored.id);
            if (!block) continue;
            model.beginAction();
            if (!model.moveBlockStep(block.id, block.x + dx, block.y + dy)) {
              model.cancelAction();
              continue;
            }
            const moved = model.getBlock(block.id);
            const automaticSide = moved ? model.possibleExitSides(moved)[0] : undefined;
            if (automaticSide) expect(model.tryExit(block.id, automaticSide).ok).toBe(true);
            expect(model.commitAction()).toBe(true);
            const continuation = solveLevelOptimally(continuationFrom(level, model));
            expect(continuation.solved).toBe(true);
            if (1 + continuation.minimumDrags > optimal.minimumDrags) {
              proved = true;
              break;
            }
          }
          if (proved) break;
        }
      }
      expect(proved).toBe(true);
    }, 90_000);
  }
});
