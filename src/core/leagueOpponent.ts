import { LEAGUE_LEVELS } from "./leagueLevelData";
import { OPPONENT_PERIOD_HOURS, opponentTypeForIndex, type OpponentType } from "./opponentPacing";

export interface LeagueOpponentProgress {
  cleared: number;
  dayIndex: number;
  dayStartCleared: number;
}

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
const BEIJING_OFFSET_MS = 8 * HOUR_MS;
const BOT_COUNT = 49;
/** Read only the formal catalog's badge inventory; no model or solver is loaded. */
export const LEAGUE_OPPONENT_LEVEL_POINTS: readonly number[] = Object.freeze(
  LEAGUE_LEVELS.map(entry => entry.specials.length * 10),
);
export const LEAGUE_OPPONENT_MAX_CLEARED = LEAGUE_OPPONENT_LEVEL_POINTS.length;
export const LEAGUE_OPPONENT_MAX_SCORE = LEAGUE_OPPONENT_LEVEL_POINTS.reduce((sum, points) => sum + points, 0);

const dayIndexAt = (time: number): number => Math.floor((time + BEIJING_OFFSET_MS) / DAY_MS);
const validTime = (time: number): void => {
  if (!Number.isSafeInteger(time) || time < 0) throw Error("Invalid opponent time");
};
const validCleared = (cleared: number): void => {
  if (!Number.isSafeInteger(cleared) || cleared < 0 || cleared > LEAGUE_OPPONENT_MAX_CLEARED) {
    throw Error("Invalid opponent progress");
  }
};

/** The daily quota is fixed from this opponent's progress at that day's start. */
export function leagueOpponentDailyQuota(type: OpponentType, cleared: number): number {
  validCleared(cleared);
  if (cleared === LEAGUE_OPPONENT_MAX_CLEARED) return 0;
  const band = cleared < 20 ? 0 : cleared < 60 ? 1 : cleared < 90 ? 2 : 3;
  return Math.min(LEAGUE_OPPONENT_MAX_CLEARED - cleared, Math.floor(24 / OPPONENT_PERIOD_HOURS[type][band]));
}

/** Unique, evenly spaced Beijing-hour slots. Midnight is reserved for rollover. */
export function leagueOpponentHours(type: OpponentType, dayStartCleared: number, seed: number): number[] {
  const quota = leagueOpponentDailyQuota(type, dayStartCleared);
  const phase = (seed >>> 0) % 23;
  return Array.from({ length: quota }, (_, index) =>
    1 + (Math.floor((index + 0.5) * 23 / quota) + phase) % 23,
  ).sort((left, right) => left - right);
}

/** Legacy scores are retained, including any amount between two level prefixes. */
export function createLeagueOpponentProgress(score: number, fromMs: number): LeagueOpponentProgress {
  validTime(fromMs);
  if (!Number.isSafeInteger(score) || score < 0) throw Error("Invalid opponent score");
  let cleared = 0, prefix = 0;
  while (cleared < LEAGUE_OPPONENT_MAX_CLEARED
    && prefix + LEAGUE_OPPONENT_LEVEL_POINTS[cleared] <= score) {
    prefix += LEAGUE_OPPONENT_LEVEL_POINTS[cleared];
    cleared += 1;
  }
  return { cleared, dayIndex: dayIndexAt(fromMs), dayStartCleared: cleared };
}

function identitySeed(seed: number, index: number, seasonIndex: number): number {
  let hash = seed >>> 0;
  for (const part of [index, seasonIndex]) {
    hash = Math.imul(hash ^ part, 0x45d9f3b);
    hash ^= hash >>> 16;
  }
  return hash >>> 0;
}

/** Catch up only new hour boundaries, never replay a legacy season's old hours.
 * The caller bounds untilMs to the season's final eligible millisecond. */
export function advanceLeagueOpponent(
  input: { score: number; progress?: LeagueOpponentProgress },
  index: number,
  seed: number,
  seasonIndex: number,
  fromMs: number,
  untilMs: number,
): { score: number; progress: LeagueOpponentProgress } {
  validTime(fromMs);
  validTime(untilMs);
  if (!Number.isSafeInteger(input.score) || input.score < 0) throw Error("Invalid opponent score");
  const type = opponentTypeForIndex(index, BOT_COUNT);
  const progress = input.progress ? { ...input.progress } : createLeagueOpponentProgress(input.score, fromMs);
  validCleared(progress.cleared);
  validCleared(progress.dayStartCleared);
  if (!Number.isSafeInteger(progress.dayIndex) || progress.dayIndex < 0
    || progress.dayStartCleared > progress.cleared || progress.dayIndex > dayIndexAt(fromMs)) {
    throw Error("Invalid opponent daily progress");
  }
  let score = input.score;
  if (untilMs <= fromMs) return { score, progress };
  if (progress.dayIndex !== dayIndexAt(fromMs)) {
    progress.dayIndex = dayIndexAt(fromMs);
    progress.dayStartCleared = progress.cleared;
  }
  const phase = identitySeed(seed, index, seasonIndex);
  let slots = leagueOpponentHours(type, progress.dayStartCleared, phase);
  const finalHour = Math.floor((untilMs + BEIJING_OFFSET_MS) / HOUR_MS);
  for (let hour = Math.floor((fromMs + BEIJING_OFFSET_MS) / HOUR_MS) + 1; hour <= finalHour; hour += 1) {
    const dayIndex = Math.floor(hour / 24);
    if (dayIndex !== progress.dayIndex) {
      progress.dayIndex = dayIndex;
      progress.dayStartCleared = progress.cleared;
      slots = leagueOpponentHours(type, progress.dayStartCleared, phase);
    }
    if (progress.cleared === LEAGUE_OPPONENT_MAX_CLEARED) {
      if (progress.dayIndex !== dayIndexAt(untilMs)) {
        progress.dayIndex = dayIndexAt(untilMs);
        progress.dayStartCleared = progress.cleared;
      }
      break;
    }
    if (!slots.includes(hour % 24)) continue;
    score += LEAGUE_OPPONENT_LEVEL_POINTS[progress.cleared];
    progress.cleared += 1;
  }
  return { score, progress };
}
