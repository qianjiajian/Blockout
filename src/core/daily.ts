const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

export interface DailySettlement {
  completedNow: boolean;
  reward: number;
  streak: number;
  lastCompletedDay: string;
}

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

export const previousDayKey = (dayKey: string): string => {
  if (!DAY_KEY.test(dayKey)) return "";
  const [year, month, day] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - 1);
  return `${date.getUTCFullYear()}-${`${date.getUTCMonth() + 1}`.padStart(2, "0")}-${`${date.getUTCDate()}`.padStart(2, "0")}`;
};

export const selectDailyLevel = (dayKey: string, completedLevels: number[], maxLevel = 100): number | undefined => {
  const safeMaxLevel = Math.max(1, Math.floor(Number(maxLevel) || 1));
  const pool = [...new Set(completedLevels)]
    .filter((level) => Number.isInteger(level) && level >= 1 && level <= safeMaxLevel)
    .sort((a, b) => a - b);
  if (!pool.length) return undefined;
  let hash = 2166136261;
  for (const character of dayKey) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return pool[(hash >>> 0) % pool.length];
};

export const settleDailyChallenge = (
  today: string,
  lastCompletedDay: string,
  currentStreak: number,
  stars: number,
): DailySettlement => {
  const safeStreak = Math.max(0, Math.min(999, Math.floor(Number(currentStreak) || 0)));
  if (lastCompletedDay === today) {
    return { completedNow: false, reward: 0, streak: safeStreak, lastCompletedDay };
  }
  if (DAY_KEY.test(lastCompletedDay) && DAY_KEY.test(today) && lastCompletedDay > today) {
    return { completedNow: false, reward: 0, streak: safeStreak, lastCompletedDay };
  }
  const streak = lastCompletedDay === previousDayKey(today) ? Math.min(999, safeStreak + 1) : 1;
  const reward = 60 + (stars >= 3 ? 20 : 0);
  return { completedNow: true, reward, streak, lastCompletedDay: today };
};
