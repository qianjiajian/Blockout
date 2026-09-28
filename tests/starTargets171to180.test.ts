import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/core/levels';
import { levelStarTargets } from '../src/core/levelStarConditions';

const changed = { 171: 35, 174: 47, 175: 46, 176: 51, 177: 38, 180: 35 } as const;
const old = { 171: 27, 174: 30, 175: 42, 176: 49, 177: 36, 180: 34 } as const;
const times = { 171: 64, 174: 79, 175: 75, 176: 129, 177: 75, 180: 97 } as const;

describe('171–180 score target adjustment v1.113', () => {
  it('changes only the six requested move targets and preserves time targets', () => {
    for (const [idText, target] of Object.entries(changed)) {
      const id = Number(idText), level = LEVELS[id - 1], score = levelStarTargets(level);
      expect(level.preservedMoveTarget).toBe(target);
      expect(score.moveTarget).toBe(target);
      expect(score.timeTargetSeconds).toBe(times[id as keyof typeof times]);
      expect(level.parMoves).toBe(old[id as keyof typeof old]);
    }
    expect(levelStarTargets(LEVELS[171 - 1]).moveTarget).toBe(35);
    expect(levelStarTargets(LEVELS[172 - 1]).moveTarget).toBe(64);
    expect(levelStarTargets(LEVELS[172 - 1]).timeTargetSeconds).toBe(100);
  });
  it('keeps the four unchanged move targets', () => {
    expect(levelStarTargets(LEVELS[171 - 1]).moveTarget).toBe(changed[171]);
    expect(levelStarTargets(LEVELS[172 - 1]).moveTarget).toBe(64);
    expect(levelStarTargets(LEVELS[173 - 1]).moveTarget).toBe(91);
    expect(levelStarTargets(LEVELS[178 - 1]).moveTarget).toBe(78);
    expect(levelStarTargets(LEVELS[179 - 1]).moveTarget).toBe(43);
  });
});
