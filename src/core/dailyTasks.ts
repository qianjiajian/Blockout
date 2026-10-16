const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type DailyTaskMetric =
  | "levels"
  | "stars"
  | "perfect"
  | "boosterFree"
  | "boosters";

export type DailyTaskId =
  | "clear-levels"
  | "earn-stars"
  | "perfect-clear"
  | "booster-free"
  | "use-booster";

export interface DailyTaskDefinition {
  id: DailyTaskId;
  metric: DailyTaskMetric;
  target: number;
  rewardCoins: number;
  unlockLevel: number;
  icon: "flag" | "star" | "crown" | "shield" | "booster";
}

export interface DailyTaskEntryState {
  id: DailyTaskId;
  progress: number;
  claimed: boolean;
}

export interface DailyTaskProgressState {
  version: 1;
  /** Local calendar cycle currently being shown. */
  dayKey: string;
  /** Monotonic guard: rolling the device clock back never creates another cycle. */
  maxObservedDayKey: string;
  tasks: DailyTaskEntryState[];
  bonusClaimed: boolean;
}

export interface DailyTaskRunResult {
  completedLevels: number;
  earnedStars: number;
  perfectClears: number;
  boosterFreeClears: number;
  boostersUsed: number;
}

export interface DailyTaskEvaluation extends DailyTaskDefinition {
  progress: number;
  completed: boolean;
  claimed: boolean;
  claimable: boolean;
}

export interface DailyTaskSummary {
  dayKey: string;
  tasks: DailyTaskEvaluation[];
  completedCount: number;
  claimedCount: number;
  bonusRewardCoins: number;
  bonusRewardInspiration: number;
  bonusCompleted: boolean;
  bonusClaimed: boolean;
  bonusClaimable: boolean;
}

export interface DailyTaskClaimResult {
  state: DailyTaskProgressState;
  rewardCoins: number;
  rewardInspiration: number;
  status: "claimed" | "already-claimed" | "incomplete" | "missing";
}

export const DAILY_TASK_BONUS_INSPIRATION = 100;
export const DAILY_TASK_SLOTS = 3;

export const DAILY_TASK_DEFINITIONS: Readonly<Record<DailyTaskId, DailyTaskDefinition>> = Object.freeze({
  "clear-levels": Object.freeze({
    id: "clear-levels", metric: "levels", target: 3, rewardCoins: 20, unlockLevel: 1, icon: "flag",
  }),
  "earn-stars": Object.freeze({
    id: "earn-stars", metric: "stars", target: 6, rewardCoins: 20, unlockLevel: 1, icon: "star",
  }),
  "perfect-clear": Object.freeze({
    id: "perfect-clear", metric: "perfect", target: 1, rewardCoins: 25, unlockLevel: 1, icon: "crown",
  }),
  "booster-free": Object.freeze({
    id: "booster-free", metric: "boosterFree", target: 2, rewardCoins: 25, unlockLevel: 1, icon: "shield",
  }),
  "use-booster": Object.freeze({
    id: "use-booster", metric: "boosters", target: 1, rewardCoins: 15, unlockLevel: 4, icon: "booster",
  }),
});

const TASK_ORDER = Object.freeze(Object.keys(DAILY_TASK_DEFINITIONS) as DailyTaskId[]);
const TASK_ID_SET = new Set<string>(TASK_ORDER);

const finiteInteger = (value: unknown, fallback: number, minimum: number, maximum: number): number => {
  const numeric = typeof value === "number" ? value : Number.NaN;
  return Number.isFinite(numeric)
    ? Math.min(maximum, Math.max(minimum, Math.floor(numeric)))
    : fallback;
};

const validDayKey = (value: unknown): value is string => {
  if (typeof value !== "string" || !DAY_KEY_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

export const localDayKey = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const millisecondsUntilNextLocalDay = (date = new Date()): number => {
  const nextDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  const duration = nextDay.getTime() - date.getTime();
  return Number.isFinite(duration) ? Math.max(0, duration) : 0;
};

const daySeed = (dayKey: string): number => {
  let hash = 2166136261;
  for (const character of dayKey) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const mix = (value: number): number => {
  let mixed = value >>> 0;
  mixed ^= mixed >>> 16;
  mixed = Math.imul(mixed, 0x7feb352d);
  mixed ^= mixed >>> 15;
  mixed = Math.imul(mixed, 0x846ca68b);
  mixed ^= mixed >>> 16;
  return mixed >>> 0;
};

/** Stable without relying on engine-specific Array.sort randomness. */
export const selectDailyTaskIds = (dayKey: string, highestLevel = 1): DailyTaskId[] => {
  const safeLevel = finiteInteger(highestLevel, 1, 1, Number.MAX_SAFE_INTEGER);
  const eligible = TASK_ORDER.filter((id) => DAILY_TASK_DEFINITIONS[id].unlockLevel <= safeLevel);
  const seed = daySeed(validDayKey(dayKey) ? dayKey : "1970-01-01");
  return eligible
    .map((id, index) => ({ id, rank: mix(seed ^ Math.imul(index + 1, 0x9e3779b1)) }))
    .sort((left, right) => left.rank - right.rank || TASK_ORDER.indexOf(left.id) - TASK_ORDER.indexOf(right.id))
    .slice(0, DAILY_TASK_SLOTS)
    .map(({ id }) => id);
};

export const createDailyTaskProgress = (
  dayKey: string,
  highestLevel = 1,
  maxObservedDayKey = dayKey,
): DailyTaskProgressState => ({
  version: 1,
  dayKey,
  maxObservedDayKey,
  tasks: selectDailyTaskIds(dayKey, highestLevel).map((id) => ({ id, progress: 0, claimed: false })),
  bonusClaimed: false,
});

const sanitizeSameCycle = (
  value: Record<string, unknown>,
  fallbackDayKey: string,
  highestLevel: number,
): DailyTaskProgressState => {
  const dayKey = validDayKey(value.dayKey) ? value.dayKey : fallbackDayKey;
  const maxObservedDayKey = validDayKey(value.maxObservedDayKey)
    ? (value.maxObservedDayKey < dayKey ? dayKey : value.maxObservedDayKey)
    : dayKey;
  if (!Array.isArray(value.tasks)) return createDailyTaskProgress(dayKey, highestLevel, maxObservedDayKey);

  const seen = new Set<DailyTaskId>();
  const tasks: DailyTaskEntryState[] = [];
  for (const rawTask of value.tasks) {
    if (typeof rawTask !== "object" || rawTask === null || Array.isArray(rawTask)) continue;
    const source = rawTask as Record<string, unknown>;
    if (typeof source.id !== "string" || !TASK_ID_SET.has(source.id) || seen.has(source.id as DailyTaskId)) continue;
    const id = source.id as DailyTaskId;
    const definition = DAILY_TASK_DEFINITIONS[id];
    const progress = finiteInteger(source.progress, 0, 0, definition.target);
    const claimed = source.claimed === true && progress >= definition.target;
    tasks.push({ id, progress, claimed });
    seen.add(id);
  }
  if (tasks.length !== DAILY_TASK_SLOTS) return createDailyTaskProgress(dayKey, highestLevel, maxObservedDayKey);
  const allCompleted = tasks.every((task) => task.progress >= DAILY_TASK_DEFINITIONS[task.id].target);
  return {
    version: 1,
    dayKey,
    maxObservedDayKey,
    tasks,
    bonusClaimed: value.bonusClaimed === true && allCompleted,
  };
};

/**
 * Advances at local midnight, but never moves backward. A future device date
 * therefore cannot be rolled back to mint a second set of rewards.
 */
const reconcileDailyTaskCycle = (
  value: unknown,
  date = new Date(),
  highestLevel = 1,
): DailyTaskProgressState => {
  const today = localDayKey(date);
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return createDailyTaskProgress(today, highestLevel);
  }
  const current = sanitizeSameCycle(value as Record<string, unknown>, today, highestLevel);
  if (today > current.maxObservedDayKey) return createDailyTaskProgress(today, highestLevel, today);
  // Clock rollback (or a westward timezone jump): keep the furthest observed cycle.
  if (today < current.maxObservedDayKey) return current;
  return current.dayKey === today
    ? current
    : createDailyTaskProgress(today, highestLevel, today);
};

/** Locked accounts cannot bank task credit for a later unlock. Keep their
 * cycle and clock-rollback guard, while discarding legacy premature credit.
 * Existing unlocked accounts retain both earned progress and claim receipts. */
export const reconcileDailyTaskProgress = (
  value: unknown,
  date = new Date(),
  highestLevel = 1,
  trackingEnabled = true,
): DailyTaskProgressState => {
  const state = reconcileDailyTaskCycle(value, date, highestLevel);
  return trackingEnabled ? state : {
    ...state,
    tasks: state.tasks.map(task => ({ ...task, progress: 0, claimed: false })),
    bonusClaimed: false,
  };
};

const progressForMetric = (result: DailyTaskRunResult, metric: DailyTaskMetric): number => {
  if (metric === "levels") return result.completedLevels;
  if (metric === "stars") return result.earnedStars;
  if (metric === "perfect") return result.perfectClears;
  if (metric === "boosterFree") return result.boosterFreeClears;
  return result.boostersUsed;
};

export const applyDailyTaskRun = (
  state: DailyTaskProgressState,
  result: DailyTaskRunResult,
): DailyTaskProgressState => ({
  ...state,
  tasks: state.tasks.map((task) => {
    const definition = DAILY_TASK_DEFINITIONS[task.id];
    const increment = finiteInteger(progressForMetric(result, definition.metric), 0, 0, 999999);
    return {
      ...task,
      progress: Math.min(definition.target, task.progress + increment),
    };
  }),
});

export const summarizeDailyTasks = (state: DailyTaskProgressState): DailyTaskSummary => {
  const tasks = state.tasks.map((task): DailyTaskEvaluation => {
    const definition = DAILY_TASK_DEFINITIONS[task.id];
    const completed = task.progress >= definition.target;
    return {
      ...definition,
      progress: task.progress,
      completed,
      claimed: task.claimed,
      claimable: completed && !task.claimed,
    };
  });
  const completedCount = tasks.filter(({ completed }) => completed).length;
  const claimedCount = tasks.filter(({ claimed }) => claimed).length;
  const bonusCompleted = tasks.length === DAILY_TASK_SLOTS && completedCount === tasks.length;
  return {
    dayKey: state.dayKey,
    tasks,
    completedCount,
    claimedCount,
    bonusRewardCoins: 0,
    bonusRewardInspiration: DAILY_TASK_BONUS_INSPIRATION,
    bonusCompleted,
    bonusClaimed: state.bonusClaimed,
    bonusClaimable: bonusCompleted && !state.bonusClaimed,
  };
};

export const claimDailyTask = (
  state: DailyTaskProgressState,
  id: DailyTaskId,
): DailyTaskClaimResult => {
  const index = state.tasks.findIndex((task) => task.id === id);
  if (index < 0) return { state, rewardCoins: 0, rewardInspiration: 0, status: "missing" };
  const task = state.tasks[index];
  if (task.claimed) return { state, rewardCoins: 0, rewardInspiration: 0, status: "already-claimed" };
  const definition = DAILY_TASK_DEFINITIONS[id];
  if (task.progress < definition.target) return { state, rewardCoins: 0, rewardInspiration: 0, status: "incomplete" };
  return {
    state: {
      ...state,
      tasks: state.tasks.map((entry, taskIndex) => taskIndex === index ? { ...entry, claimed: true } : entry),
    },
    rewardCoins: definition.rewardCoins,
    rewardInspiration: 0,
    status: "claimed",
  };
};

export const claimDailyTaskBonus = (state: DailyTaskProgressState): DailyTaskClaimResult => {
  if (state.bonusClaimed) return { state, rewardCoins: 0, rewardInspiration: 0, status: "already-claimed" };
  if (!summarizeDailyTasks(state).bonusCompleted) return { state, rewardCoins: 0, rewardInspiration: 0, status: "incomplete" };
  return {
    state: { ...state, bonusClaimed: true },
    rewardCoins: 0,
    rewardInspiration: DAILY_TASK_BONUS_INSPIRATION,
    status: "claimed",
  };
};

export const dailyTasksHaveNotification = (state: DailyTaskProgressState): boolean => {
  const summary = summarizeDailyTasks(state);
  return summary.bonusClaimable || summary.tasks.some(({ claimable }) => claimable);
};
