// Authoring targets only. This lookup does not prove difficulty, relabel maps,
// change star targets, or migrate historical batch checkers/certificates.
export const DIFFICULTY_RULE_VERSION = '1.32.0';
export const DIFFICULTY_BANDS = Object.freeze({
  easy: Object.freeze({min: 3, max: 5}),
  normal: Object.freeze({min: 6, max: 10}),
  hard: Object.freeze({min: 11, max: 15}),
  super: Object.freeze({min: 16, max: 25}),
});

export function difficultyBand(difficulty) {
  if (typeof difficulty !== 'string' || !Object.hasOwn(DIFFICULTY_BANDS, difficulty)) {
    throw new RangeError(`Unknown difficulty: ${String(difficulty)}`);
  }
  return DIFFICULTY_BANDS[difficulty];
}
