import type { LevelSpec } from "./types";

export const LOCAL_LEADERBOARD_PAGE_SIZE = 5;

export interface ChapterLeaderboardEntry {
  chapter: number;
  stars: number;
  cleared: number;
  total: number;
}

export interface EfficiencyLeaderboardEntry {
  level: number;
  moves: number;
  par: number;
  delta: number;
}

export interface LeaderboardPage<T> {
  entries: T[];
  page: number;
  pageCount: number;
  totalEntries: number;
  firstRank: number;
  canGoBack: boolean;
  canGoForward: boolean;
}

const boundedInteger = (value: unknown, minimum: number, maximum: number): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return minimum;
  return Math.max(minimum, Math.min(maximum, Math.floor(numeric)));
};

export const buildChapterLeaderboard = (
  levelCount: number,
  bestStars: Readonly<Record<string, number>>,
  rewardedLevels: readonly number[],
  chapterSize = 10,
): ChapterLeaderboardEntry[] => {
  const safeLevelCount = Math.max(0, Math.floor(levelCount));
  const safeChapterSize = Math.max(1, Math.floor(chapterSize));
  const rewarded = new Set(rewardedLevels.filter((level) => Number.isInteger(level) && level >= 1 && level <= safeLevelCount));
  return Array.from({ length: Math.ceil(safeLevelCount / safeChapterSize) }, (_, index) => {
    const start = index * safeChapterSize + 1;
    const end = Math.min(safeLevelCount, start + safeChapterSize - 1);
    const ids = Array.from({ length: Math.max(0, end - start + 1) }, (__, offset) => start + offset);
    return {
      chapter: index + 1,
      stars: ids.reduce((sum, id) => sum + boundedInteger(bestStars[String(id)], 0, 3), 0),
      cleared: ids.filter((id) => rewarded.has(id)).length,
      total: ids.length,
    };
  }).sort((a, b) => b.stars - a.stars || b.cleared - a.cleared || a.chapter - b.chapter);
};

export const buildEfficiencyLeaderboard = (
  bestMoves: Readonly<Record<string, number>>,
  levels: readonly LevelSpec[],
): EfficiencyLeaderboardEntry[] => Object.entries(bestMoves)
  .map(([key, value]) => {
    const numericLevel = Number(key);
    const level = Number.isInteger(numericLevel) ? numericLevel : -1;
    const moves = Math.max(0, Math.floor(Number(value) || 0));
    const spec = levels[level - 1];
    const par = spec?.parMoves ?? Math.max(3, (spec?.blocks.length ?? 1) + 2);
    return { level, moves, par, delta: moves - par };
  })
  .filter((entry) => entry.level >= 1 && entry.level <= levels.length && entry.moves > 0)
  .sort((a, b) => a.delta - b.delta || a.moves - b.moves || a.level - b.level);

export const paginateLeaderboard = <T>(
  entries: readonly T[],
  requestedPage: number,
  pageSize = LOCAL_LEADERBOARD_PAGE_SIZE,
): LeaderboardPage<T> => {
  const safePageSize = Math.max(1, Math.floor(pageSize));
  const totalEntries = entries.length;
  const pageCount = Math.max(1, Math.ceil(totalEntries / safePageSize));
  const page = boundedInteger(requestedPage, 0, pageCount - 1);
  const firstRank = page * safePageSize + 1;
  return {
    entries: entries.slice(page * safePageSize, (page + 1) * safePageSize),
    page,
    pageCount,
    totalEntries,
    firstRank,
    canGoBack: page > 0,
    canGoForward: page < pageCount - 1,
  };
};
