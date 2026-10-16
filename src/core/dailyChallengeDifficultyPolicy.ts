/** Daily300 admission tolerance. Historical proof values and nominal targets stay unchanged. */
export const DAILY_CHALLENGE_DIFFICULTY_POLICY_VERSION = "1.198.0" as const;
export const DAILY_CHALLENGE_DIFFICULTY_TOLERANCE = 3;

export const DAILY_CHALLENGE_DIFFICULTY_BANDS = Object.freeze({
  1: Object.freeze({ nominalLower: 16, nominalUpper: 20, lower: 13, upper: 23 }),
  2: Object.freeze({ nominalLower: 21, nominalUpper: 30, lower: 18, upper: 33 }),
  3: Object.freeze({ nominalLower: 31, nominalUpper: null, lower: 28, upper: null }),
} as const);

/** Checks a same-layout proof interval; it does not certify or alter that proof. */
export function isDailyChallengeProofWithinBand(
  difficulty: unknown,
  lower: unknown,
  upper: unknown,
): boolean {
  if (difficulty !== 1 && difficulty !== 2 && difficulty !== 3) return false;
  if (typeof lower !== "number" || typeof upper !== "number"
    || !Number.isSafeInteger(lower) || !Number.isSafeInteger(upper)
    || lower <= 0 || upper <= 0 || lower > upper) return false;
  const band = DAILY_CHALLENGE_DIFFICULTY_BANDS[difficulty];
  return lower >= band.lower && (band.upper === null || upper <= band.upper);
}
