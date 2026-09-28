import { describe, expect, it } from "vitest";
import {
  DAILY_TASK_BONUS_INSPIRATION,
  DAILY_TASK_DEFINITIONS,
  applyDailyTaskRun,
  claimDailyTask,
  claimDailyTaskBonus,
  createDailyTaskProgress,
  dailyTasksHaveNotification,
  localDayKey,
  millisecondsUntilNextLocalDay,
  reconcileDailyTaskProgress,
  selectDailyTaskIds,
  summarizeDailyTasks,
} from "../src/core/dailyTasks";

describe("daily task cycles", () => {
  it("uses local midnight and deterministic three-task rotations", () => {
    const date = new Date(2026, 8, 18, 23, 59, 59, 750);
    expect(localDayKey(date)).toBe("2026-09-18");
    expect(millisecondsUntilNextLocalDay(date)).toBe(250);
    const selected = selectDailyTaskIds("2026-09-18", 20);
    expect(selected).toHaveLength(3);
    expect(new Set(selected).size).toBe(3);
    expect(selectDailyTaskIds("2026-09-18", 20)).toEqual(selected);
  });

  it("does not select the booster task before boosters unlock", () => {
    expect(selectDailyTaskIds("2026-09-18", 1)).not.toContain("use-booster");
    expect(selectDailyTaskIds("2026-09-18", 1)).toHaveLength(3);
  });

  it("refreshes forward and refuses a device-clock rollback", () => {
    const dayOne = createDailyTaskProgress("2026-09-18", 20);
    const dayTwo = reconcileDailyTaskProgress(dayOne, new Date(2026, 8, 19, 12), 20);
    expect(dayTwo.dayKey).toBe("2026-09-19");
    expect(dayTwo.maxObservedDayKey).toBe("2026-09-19");
    expect(dayTwo.tasks.every(({ progress, claimed }) => progress === 0 && !claimed)).toBe(true);

    const rolledBack = reconcileDailyTaskProgress(dayTwo, new Date(2026, 8, 18, 12), 20);
    expect(rolledBack).toEqual(dayTwo);
  });

  it("sanitizes malformed and over-range persisted progress", () => {
    const base = createDailyTaskProgress("2026-09-18", 20);
    const raw = {
      ...base,
      tasks: base.tasks.map((task, index) => ({
        ...task,
        progress: index === 0 ? 999999 : -8,
        claimed: true,
      })),
    };
    const sanitized = reconcileDailyTaskProgress(raw, new Date(2026, 8, 18, 12), 20);
    expect(sanitized.tasks[0].progress).toBe(DAILY_TASK_DEFINITIONS[sanitized.tasks[0].id].target);
    expect(sanitized.tasks[0].claimed).toBe(true);
    expect(sanitized.tasks.slice(1).every(({ progress, claimed }) => progress === 0 && !claimed)).toBe(true);
  });
});

describe("daily task progress and claims", () => {
  it("adds one successful settlement atomically to every matching task", () => {
    const state = createDailyTaskProgress("2026-09-18", 20);
    const advanced = applyDailyTaskRun(state, {
      completedLevels: 1,
      earnedStars: 3,
      perfectClears: 1,
      boosterFreeClears: 1,
      boostersUsed: 0,
    });
    for (const task of advanced.tasks) {
      const metric = DAILY_TASK_DEFINITIONS[task.id].metric;
      const expected = metric === "stars" ? 3 : metric === "boosters" ? 0 : 1;
      expect(task.progress).toBe(Math.min(expected, DAILY_TASK_DEFINITIONS[task.id].target));
    }
  });

  it("claims each completed task and the final chest exactly once", () => {
    let state = createDailyTaskProgress("2026-09-18", 20);
    state = {
      ...state,
      tasks: state.tasks.map((task) => ({
        ...task,
        progress: DAILY_TASK_DEFINITIONS[task.id].target,
      })),
    };
    expect(dailyTasksHaveNotification(state)).toBe(true);
    for (const task of state.tasks) {
      const result = claimDailyTask(state, task.id);
      expect(result.status).toBe("claimed");
      expect(result.rewardCoins).toBe(DAILY_TASK_DEFINITIONS[task.id].rewardCoins);
      state = result.state;
      expect(claimDailyTask(state, task.id).status).toBe("already-claimed");
    }
    const summary = summarizeDailyTasks(state);
    expect(summary.completedCount).toBe(3);
    expect(summary.claimedCount).toBe(3);
    expect(summary.bonusRewardCoins).toBe(0);
    expect(summary.bonusRewardInspiration).toBe(DAILY_TASK_BONUS_INSPIRATION);
    expect(summary.bonusClaimable).toBe(true);
    const bonus = claimDailyTaskBonus(state);
    expect(bonus.status).toBe("claimed");
    expect(bonus.rewardCoins).toBe(0);
    expect(bonus.rewardInspiration).toBe(DAILY_TASK_BONUS_INSPIRATION);
    expect(claimDailyTaskBonus(bonus.state).status).toBe("already-claimed");
    expect(dailyTasksHaveNotification(bonus.state)).toBe(false);
  });

  it("does not mutate the persisted state when a task is incomplete", () => {
    const state = createDailyTaskProgress("2026-09-18", 20);
    const result = claimDailyTask(state, state.tasks[0].id);
    expect(result.status).toBe("incomplete");
    expect(result.state).toBe(state);
    expect(claimDailyTaskBonus(state).state).toBe(state);
  });
});
