/**
 * Approved formal-campaign targets from the competitor-constrained v4 contract,
 * amended only where an exact competitor-composition layout has a stricter
 * solver-certified floor. These are design targets, kept separate from the
 * structural D1 diagnostic so reports never relabel an authored curve value as
 * a measured solver result.
 */
export const CAMPAIGN_REPOSITION_FLOORS = [
  null, 2, 1, 5, 5, 5, 6, 7, 8, 10,
  6, 7, 8, 9, 5, 8, 9, 10, 12, 11,
  6, 7, 8, 10, 5, 8, 9, 11, 12, 13,
  7, 8, 10, 11, 8, 5, 12, 5, 5, 15,
  8, 9, 11, 12, 6, 11, 13, 14, 15, 5,
  9, 10, 12, 13, 6, 12, 13, 15, 16, 17,
  10, 11, 12, 14, 7, 13, 14, 16, 17, 5,
  11, 12, 14, 15, 7, 14, 15, 16, 17, 18,
  12, 13, 14, 15, 7, 15, 16, 17, 18, 18,
  8, 13, 15, 16, 8, 15, 16, 17, 18, 18,
] as const;

const FIVE_LEVEL_WAVE_OFFSETS = [0, 2, 4, 5.5, 7] as const;

export const campaignTargetD1 = (levelId: number): number => {
  if (!Number.isInteger(levelId) || levelId < 1 || levelId > 100) {
    throw new RangeError(`Unknown campaign level ${levelId}; expected 1-100`);
  }
  if (levelId === 1) return 35.29;
  if (levelId === 2) return 57.1;
  if (levelId === 3) return 50.54;
  if (levelId === 4) return 70;
  if (levelId === 5) return 76;
  const waveIndex = Math.floor((levelId - 6) / 5);
  const position = (levelId - 6) % 5;
  return 70 + waveIndex + FIVE_LEVEL_WAVE_OFFSETS[position];
};

export const campaignRepositionFloor = (levelId: number): number | null => {
  if (!Number.isInteger(levelId) || levelId < 1 || levelId > CAMPAIGN_REPOSITION_FLOORS.length) {
    throw new RangeError(`Unknown campaign level ${levelId}; expected 1-100`);
  }
  return CAMPAIGN_REPOSITION_FLOORS[levelId - 1];
};

export const campaignPacingForTarget = (targetD1: number): {
  difficulty: "normal" | "hard" | "super";
  timeSeconds: 180 | 150 | 120;
} => targetD1 < 70
  ? { difficulty: "normal", timeSeconds: 180 }
  : targetD1 < 80
    ? { difficulty: "hard", timeSeconds: 150 }
    : { difficulty: "super", timeSeconds: 120 };
