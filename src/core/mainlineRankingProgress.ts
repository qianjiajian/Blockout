import { isRankingProvince } from "./rankingProvince";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
export interface MainlineRankingProgress {
  version: 1;
  epochMs: number;
  lastObservedMs: number;
  weekStartMs: number;
  weeklyStars: number;
  weekBaselineMs: number;
  province?: string;
  provinceSource?: "ip" | "random";
}

export const rankingWeekStartMs = (timeMs: number): number => (
  Math.floor((timeMs + 8 * HOUR + 3 * DAY) / WEEK) * WEEK - 3 * DAY - 8 * HOUR
);
const time = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);

/** Missing historical dates cannot be reconstructed from cumulative stars. */
export function normalizeMainlineRankingProgress(raw: unknown, nowMs = Date.now(), joinedAt?: number, totalStars = 600): MainlineRankingProgress {
  const now = time(nowMs) ? nowMs : Date.now();
  const source = record(raw) ? raw : {};
  const province = isRankingProvince(source.province) && (source.provinceSource === "ip" || source.provinceSource === "random")
    ? { province: source.province, provinceSource: source.provinceSource } : {};
  if (source.version === 1 && time(source.epochMs) && time(source.lastObservedMs)
    && source.epochMs <= source.lastObservedMs && source.weekStartMs === rankingWeekStartMs(source.lastObservedMs)
    && typeof source.weeklyStars === "number" && Number.isInteger(source.weeklyStars) && source.weeklyStars >= 0 && source.weeklyStars <= Math.min(600, totalStars)
    && time(source.weekBaselineMs) && source.weekBaselineMs >= Math.max(source.weekStartMs as number, source.epochMs)
    && source.weekBaselineMs <= source.lastObservedMs) {
    return { version: 1, epochMs: source.epochMs, lastObservedMs: source.lastObservedMs,
      weekStartMs: source.weekStartMs as number, weeklyStars: source.weeklyStars,
      weekBaselineMs: source.weekBaselineMs, ...province } as MainlineRankingProgress;
  }
  const epochMs = time(source.epochMs) && source.epochMs <= now ? source.epochMs
    : time(joinedAt) && joinedAt <= now ? joinedAt : now;
  return { version: 1, epochMs, lastObservedMs: now, weekStartMs: rankingWeekStartMs(now),
    weeklyStars: 0, weekBaselineMs: now, ...province } as MainlineRankingProgress;
}

/** Pure projection; callers persist it through the owning immutable candidate. */
export function observeMainlineRanking(progress: MainlineRankingProgress, nowMs: number): MainlineRankingProgress {
  const lastObservedMs = Math.max(progress.lastObservedMs, time(nowMs) ? nowMs : progress.lastObservedMs);
  const weekStartMs = rankingWeekStartMs(lastObservedMs);
  return { ...progress, lastObservedMs, weekStartMs,
    ...(weekStartMs > progress.weekStartMs ? { weeklyStars: 0, weekBaselineMs: Math.max(weekStartMs, progress.epochMs) } : {}) };
}

export function recordMainlineRankingStars(progress: MainlineRankingProgress, previousBest: number, newBest: number, completedAtMs: number): MainlineRankingProgress {
  const next = observeMainlineRanking(progress, completedAtMs);
  const bounded = (value: number) => Number.isInteger(value) && value >= 0 && value <= 3 ? value : 0;
  next.weeklyStars = Math.min(600, next.weeklyStars + Math.max(0, bounded(newBest) - bounded(previousBest)));
  return next;
}
