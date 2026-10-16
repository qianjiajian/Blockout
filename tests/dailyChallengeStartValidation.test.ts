import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ clone: vi.fn(), consume: vi.fn() }));
vi.mock("../src/core/dailyChallenge", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/core/dailyChallenge")>();
  return {
    ...actual,
    cloneDailyChallengeLevel: mocks.clone,
    consumeDailyChallengeAttempt: mocks.consume,
  };
});
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
import { createDailyChallengeState, getDailyChallengeAssignment } from "../src/core/dailyChallenge";

describe("daily challenge object preflight", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-07T12:00:00+08:00"));
    mocks.clone.mockReset().mockReturnValue(undefined);
    mocks.consume.mockReset();
  });
  afterEach(() => vi.useRealTimers());

  for (const restarting of [false, true]) {
    it(`${restarting ? "restart" : "start"} rejects a missing certified clone before spending or saving`, () => {
      const state = createDailyChallengeState("2026-10-07", 16, undefined, 12345);
      const assignment = getDailyChallengeAssignment(state, 2)!;
      const save = {
        currentLevel: 1, highestLevel: 16, rewardedLevels: Array.from({ length: 15 }, (_, i) => i + 1), dailyChallenge: state,
        activeRun: restarting ? {
          daily: true, dailyDayKey: state.dayKey, dailyChallengeDifficulty: 2,
          dailyChallengeSourceLevelId: assignment.sourceLevelId,
          levelId: assignment.sourceLevelId, returnLevelId: 1, lifeStarted: true,
          boosterSpent: { time: 0, rocket: 0, pulse: 0 },
        } : undefined,
      };
      const baseline = structuredClone(save);
      // Exercise the actual methods without a host or any persistent storage.
      const game = Object.assign(Object.create(ColorEscapeGame.prototype), {
        save, cloneSave: (value: unknown) => structuredClone(value),
        persistVerified: vi.fn(), persist: vi.fn(), loadLevel: vi.fn(),
        playSound: vi.fn(), scheduleFrame: vi.fn(),
      });
      if (restarting) game.restartDailyChallenge();
      else game.startDailyChallenge(2);
      expect(mocks.clone).toHaveBeenCalledOnce();
      expect(mocks.consume).not.toHaveBeenCalled();
      expect(game.persistVerified).not.toHaveBeenCalled();
      expect(game.persist).not.toHaveBeenCalled();
      expect(game.loadLevel).not.toHaveBeenCalled();
      expect(game.save).toEqual(baseline);
      expect(game.dailyChallengeFeedback.text).toBe("当前阶段暂无可用关卡");
    });
  }
});
