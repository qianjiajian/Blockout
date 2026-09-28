// Authoring targets only. This lookup does not prove difficulty, relabel maps,
// change star targets, or migrate historical batch checkers/certificates.
export const DIFFICULTY_RULE_VERSION = '1.38.0';
export const DIFFICULTY_BANDS = Object.freeze({
  easy: Object.freeze({min: 5, max: 10}),
  normal: Object.freeze({min: 11, max: 15}),
  hard: Object.freeze({min: 16, max: 20}),
  super: Object.freeze({min: 21, max: 30}),
});

export function difficultyBand(difficulty) {
  if (typeof difficulty !== 'string' || !Object.hasOwn(DIFFICULTY_BANDS, difficulty)) {
    throw new RangeError(`Unknown difficulty: ${String(difficulty)}`);
  }
  return DIFFICULTY_BANDS[difficulty];
}
