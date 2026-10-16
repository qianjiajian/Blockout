import type { OpponentType } from "./opponentPacing";

export const MAINLINE_OPPONENT_MAX_LEVEL = 200;
export const MAINLINE_OPPONENT_MAX_STARS = MAINLINE_OPPONENT_MAX_LEVEL * 3;
export const MAINLINE_HOUR_MS = 3_600_000;
const DAY_MS = 24 * MAINLINE_HOUR_MS;
const BEIJING_OFFSET_MS = 8 * MAINLINE_HOUR_MS;
const PROGRESS_LIMITS = [20, 60, 120, MAINLINE_OPPONENT_MAX_LEVEL] as const;

// Mainline tuning is intentionally separate from the league's locked cadence.
export const MAINLINE_OPPONENT_DAILY_CLEARS: Readonly<Record<OpponentType, readonly number[]>> = {
  casual: [2, 1, 1, 1],
  steady: [4, 3, 2, 1],
  active: [8, 5, 3, 2],
  expert: [12, 8, 5, 3],
};
export const MAINLINE_OPPONENT_DAILY_REPAIRS: Readonly<Record<OpponentType, number>> = {
  casual: 1, steady: 2, active: 3, expert: 4,
};
const INITIAL_STARS: Readonly<Record<OpponentType, readonly [number, number]>> = {
  casual: [0, 9], steady: [10, 21], active: [22, 36], expert: [37, 48],
};

// Each row is a repeating ten-clear quality pattern, from early to late game.
// This allocates actual 1–3-star results, rather than treating stars as levels.
const QUALITY: Readonly<Record<OpponentType, readonly (readonly number[])[]>> = {
  casual: [[2, 3, 2, 2, 3, 2, 2, 3, 2, 2], [2, 2, 1, 2, 3, 2, 1, 2, 2, 2], [1, 2, 1, 2, 2, 1, 2, 1, 2, 2], [1, 1, 2, 1, 2, 1, 1, 2, 1, 2]],
  steady: [[3, 2, 3, 2, 3, 3, 2, 3, 2, 3], [2, 3, 2, 2, 3, 2, 2, 3, 2, 2], [2, 1, 2, 3, 2, 1, 2, 2, 1, 2], [1, 2, 1, 2, 2, 1, 2, 2, 1, 2]],
  active: [[3, 3, 3, 2, 3, 3, 3, 2, 3, 3], [3, 2, 3, 3, 2, 3, 2, 3, 3, 2], [2, 3, 2, 2, 3, 2, 2, 3, 2, 2], [2, 1, 2, 3, 2, 2, 1, 2, 3, 2]],
  expert: [[3, 3, 3, 3, 3, 3, 3, 2, 3, 3], [3, 3, 2, 3, 3, 3, 2, 3, 3, 3], [3, 2, 3, 2, 3, 3, 2, 3, 2, 3], [2, 3, 2, 2, 3, 2, 3, 2, 2, 3]],
};

export interface MainlineOpponentProgress { cleared: number; stars: number }

export const mainlineOpponentHash = (value: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export const beijingWeekStartMs = (timeMs: number): number => (
  Math.floor((timeMs + BEIJING_OFFSET_MS + 3 * DAY_MS) / (7 * DAY_MS)) * 7 * DAY_MS
  - 3 * DAY_MS - BEIJING_OFFSET_MS
);

const progressBand = (cleared: number): number => cleared < 20 ? 0 : cleared < 60 ? 1 : cleared < 120 ? 2 : 3;

export const mainlineOpponentDailyQuota = (type: OpponentType, cleared: number): number => (
  cleared >= MAINLINE_OPPONENT_MAX_LEVEL ? MAINLINE_OPPONENT_DAILY_REPAIRS[type]
    : MAINLINE_OPPONENT_DAILY_CLEARS[type][progressBand(cleared)]
);

export const mainlineOpponentHourSlots = (id: string, quota: number): readonly number[] => {
  const phase = mainlineOpponentHash(`${id}:hours`) % 23;
  return Array.from({ length: quota }, (_, index) => 1 + ((Math.floor((index + 0.5) * 23 / quota) + phase) % 23))
    .sort((left, right) => left - right);
};

export const mainlineOpponentInitialProgress = (id: string, type: OpponentType): MainlineOpponentProgress => {
  const [minimum, maximum] = INITIAL_STARS[type];
  const stars = minimum + mainlineOpponentHash(`${id}:initial`) % (maximum - minimum + 1);
  return { cleared: Math.ceil(stars / 3), stars };
};

export const mainlineOpponentClearStars = (id: string, type: OpponentType, level: number): number => {
  const pattern = QUALITY[type][progressBand(level - 1)];
  return pattern[(level - 1 + mainlineOpponentHash(`${id}:quality`)) % pattern.length];
};

// There are only four types and ten quality phases. Bounded shared prefixes let
// a decade of offline progress cost the same as a few days, without simulation.
const qualityPrefixes = new Map<string, readonly number[]>();
const qualityPrefix = (id: string, type: OpponentType): readonly number[] => {
  const phase = mainlineOpponentHash(`${id}:quality`) % 10;
  const key = `${type}:${phase}`;
  const cached = qualityPrefixes.get(key);
  if (cached) return cached;
  const result = [0];
  for (let level = 1; level <= MAINLINE_OPPONENT_MAX_LEVEL; level += 1) {
    const pattern = QUALITY[type][progressBand(level - 1)];
    result.push(result[level - 1] + pattern[(level - 1 + phase) % pattern.length]);
  }
  qualityPrefixes.set(key, result);
  return result;
};

/** Pure scheduled progress; does not read the player or solve a level. */
export const mainlineOpponentProgressAt = (
  id: string,
  type: OpponentType,
  createdAtMs: number,
  nowMs: number,
): MainlineOpponentProgress => {
  const progress = mainlineOpponentInitialProgress(id, type);
  if (nowMs <= createdAtMs) return progress;
  const prefix = qualityPrefix(id, type);
  const applyEvents = (count: number): void => {
    if (progress.cleared < MAINLINE_OPPONENT_MAX_LEVEL) {
      const cleared = Math.min(MAINLINE_OPPONENT_MAX_LEVEL, progress.cleared + count);
      progress.stars += prefix[cleared] - prefix[progress.cleared];
      progress.cleared = cleared;
    } else progress.stars = Math.min(MAINLINE_OPPONENT_MAX_STARS, progress.stars + count);
  };
  const firstDay = Math.floor((createdAtMs + BEIJING_OFFSET_MS) / DAY_MS);
  const lastDay = Math.floor((nowMs + BEIJING_OFFSET_MS) / DAY_MS);
  const partialDay = (day: number, lowerExclusive: number, upperInclusive: number): void => {
    const start = day * DAY_MS - BEIJING_OFFSET_MS;
    const quota = mainlineOpponentDailyQuota(type, progress.cleared);
    applyEvents(mainlineOpponentHourSlots(id, quota)
      .filter((hour) => start + hour * MAINLINE_HOUR_MS > lowerExclusive && start + hour * MAINLINE_HOUR_MS <= upperInclusive).length);
  };
  partialDay(firstDay, createdAtMs, nowMs);
  if (firstDay === lastDay) return progress;

  let wholeDays = lastDay - firstDay - 1;
  // Jump whole days within each clear-progress band. A quota remains locked
  // across a day's boundary crossing; the following day chooses the new band.
  while (wholeDays > 0 && progress.stars < MAINLINE_OPPONENT_MAX_STARS) {
    const quota = mainlineOpponentDailyQuota(type, progress.cleared);
    const remaining = progress.cleared < MAINLINE_OPPONENT_MAX_LEVEL
      ? PROGRESS_LIMITS[progressBand(progress.cleared)] - progress.cleared
      : MAINLINE_OPPONENT_MAX_STARS - progress.stars;
    const days = Math.min(wholeDays, Math.ceil(remaining / quota));
    applyEvents(days * quota);
    wholeDays -= days;
  }
  if (progress.stars < MAINLINE_OPPONENT_MAX_STARS) partialDay(lastDay, lastDay * DAY_MS - BEIJING_OFFSET_MS, nowMs);
  return progress;
};
