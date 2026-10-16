import { evaluateLevelStars } from "./levelStarConditions";
import type { LevelSpec } from "./types";

export interface CollectionStarRecord { stars: number; moves: number; elapsedSeconds: number }
export function normalizeCollectionStarRecords(raw: unknown): Record<string, CollectionStarRecord> {
  const result: Record<string, CollectionStarRecord> = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return result;
  for (const [key, value] of Object.entries(raw)) {
    if (!/^[1-9]\d*$/.test(key) || !value || typeof value !== "object") continue;
    const record = value as CollectionStarRecord;
    if (!Number.isInteger(record.stars) || record.stars < 1 || record.stars > 3
      || !Number.isInteger(record.moves) || record.moves < 0 || record.moves > 99999
      || !Number.isInteger(record.elapsedSeconds) || record.elapsedSeconds < 0 || record.elapsedSeconds > 99999) continue;
    result[key] = { stars: record.stars, moves: record.moves, elapsedSeconds: record.elapsedSeconds };
  }
  return result;
}

/** Keep the conditions of one best attempt; never combine separate runs into three stars. */
export function collectionStarStatus(level: LevelSpec, bestStars: number, record?: CollectionStarRecord): (boolean | undefined)[] {
  if (!bestStars) return [false, false, false];
  if (record && record.stars === bestStars) {
    const evaluation = evaluateLevelStars(level, record);
    return [true, evaluation.moveAchieved, evaluation.timeAchieved];
  }
  return [true, bestStars === 3 ? true : undefined, bestStars === 3 ? true : undefined];
}
