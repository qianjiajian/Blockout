import { describe, expect, it } from "vitest";
import { CAMPAIGN_BLUEPRINT_LEVELS, CAMPAIGN_BLUEPRINT_SOLUTIONS } from "../src/core/campaignBlueprints";
import { BASE_LEVELS } from "../src/core/levels";
import { PuzzleModel } from "../src/core/PuzzleModel";
import { BASE_STANDARD_SOLUTIONS } from "../src/core/solutions";

const prototypes = [...BASE_LEVELS, ...CAMPAIGN_BLUEPRINT_LEVELS];
const solutions = { ...BASE_STANDARD_SOLUTIONS, ...CAMPAIGN_BLUEPRINT_SOLUTIONS };

describe("authored prototype solutions", () => {
  for (const level of prototypes) {
    it(`completes prototype ${level.id}: ${level.name} at par`, () => {
      const model = new PuzzleModel(level);
      const actions = solutions[level.id];
      expect(actions?.length).toBeGreaterThan(0);
      let effectiveDrags = 0;
      for (const [index, action] of actions.entries()) {
        const previous = actions[index - 1];
        if (!(previous?.type === "move" && previous.blockId === action.blockId)) effectiveDrags += 1;
        if (action.type === "move") {
          expect(model.moveBlock(action.blockId, action.x, action.y), JSON.stringify(action)).toBe(true);
        } else {
          const status = model.exitAttemptStatus(action.blockId, action.side);
          expect(model.tryExit(action.blockId, action.side).ok, JSON.stringify({ ...action, status, block: model.getBlock(action.blockId) })).toBe(true);
        }
      }
      expect(model.snapshot().complete).toBe(true);
      expect(effectiveDrags).toBe(level.parMoves);
    });
  }
});
