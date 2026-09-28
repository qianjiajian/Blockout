import type { LevelSpec } from "./types";

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

export interface ProgressLeaderboardEntry {
  level: number;
  stars: number;
  moves?: number;
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

/**
 * Builds a truthful newest-first history from the local save. Reaching level N
 * proves that 1..N-1 were cleared even if an older save is missing reward
 * ledger entries, while level N itself is included only after its clear is
 * recorded.
 */
export const buildProgressLeaderboard = (
  levelCount: number,
  highestLevel: number,
  bestStars: Readonly<Record<string, number>>,
  bestMoves: Readonly<Record<string, number>>,
  rewardedLevels: readonly number[],
): ProgressLeaderboardEntry[] => {
  const safeLevelCount = Math.max(0, Math.floor(levelCount));
  const safeHighestLevel = boundedInteger(highestLevel, 1, Math.max(1, safeLevelCount));
  const cleared = new Set<number>();
  for (let level = 1; level < safeHighestLevel; level += 1) cleared.add(level);
  rewardedLevels.forEach((level) => {
    if (Number.isInteger(level) && level >= 1 && level <= safeLevelCount) cleared.add(level);
  });
  return [...cleared]
    .sort((a, b) => b - a)
    .map((level) => {
      const moves = Math.floor(Number(bestMoves[String(level)]) || 0);
      return {
        level,
        stars: boundedInteger(bestStars[String(level)], 0, 3),
        ...(moves > 0 ? { moves } : {}),
      };
    });
};
