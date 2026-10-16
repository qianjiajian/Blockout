/** v1.156 candidate profile. Production keeps its legacy profile until adoption. */
export const DAILY_CHALLENGE_V3_PROFILE = "basic-combined-300-v1" as const;
export type DailyChallengeDifficultyV3 = 1 | 2 | 3;
export const DAILY_CHALLENGE_BASIC_MECHANISMS_V3 = Object.freeze([
  "color-exit", "irregular-block", "frozen-exit", "irregular-board", "numeric-ice", "shutter",
] as const);

export interface DailyChallengeStageV3 {
  readonly key: string;
  readonly unlockLevel: number;
  readonly newestMechanism: string | null;
  readonly allowedMechanisms: readonly string[];
}

const advanced = [
  ["multilayer-shell", 15], ["generator", 35], ["axis-block", 50],
  ["key-lock", 59], ["layered-lift", 65], ["star", 100],
  ["bomb", 120], ["flip-door", 150], ["colored-grid", 200],
] as const;

export const DAILY_CHALLENGE_STAGES_V3: readonly DailyChallengeStageV3[] = Object.freeze([
  Object.freeze({ key: "basic-combined", unlockLevel: 1, newestMechanism: null,
    allowedMechanisms: DAILY_CHALLENGE_BASIC_MECHANISMS_V3 }),
  ...advanced.map(([mechanism, unlockLevel], index) => Object.freeze({
    key: `mechanisms-${mechanism}-${unlockLevel}`, unlockLevel, newestMechanism: mechanism,
    allowedMechanisms: Object.freeze([
      ...DAILY_CHALLENGE_BASIC_MECHANISMS_V3, ...advanced.slice(0, index + 1).map(([id]) => id),
    ]),
  })),
]);

export interface DailyChallengeSlotV3 {
  readonly id: string;
  readonly stageKey: string;
  readonly stageUnlockLevel: number;
  readonly difficulty: DailyChallengeDifficultyV3;
  /** One based; persisted selected indices remain zero based. */
  readonly slot: number;
  readonly newestMechanism: string | null;
}

export const DAILY_CHALLENGE_V3_SLOTS: readonly DailyChallengeSlotV3[] = Object.freeze(
  DAILY_CHALLENGE_STAGES_V3.flatMap((stage) => ([1, 2, 3] as const).flatMap((difficulty) =>
    Array.from({ length: 10 }, (_, index) => Object.freeze({
      id: `daily-${stage.key}-d${difficulty}-${String(index + 1).padStart(2, "0")}`,
      stageKey: stage.key, stageUnlockLevel: stage.unlockLevel, difficulty, slot: index + 1,
      newestMechanism: stage.newestMechanism,
    })))),
);

export function getDailyChallengeStageV3(key: string): DailyChallengeStageV3 | undefined {
  return DAILY_CHALLENGE_STAGES_V3.find((stage) => stage.key === key);
}

/** Use only when creating a new day; same-day migration maps the saved stage. */
export function dailyChallengeStageV3(highestLevel: number): DailyChallengeStageV3 {
  const progress = Number.isFinite(highestLevel) ? Math.max(1, Math.floor(highestLevel)) : 1;
  return [...DAILY_CHALLENGE_STAGES_V3].reverse().find((stage) => stage.unlockLevel <= progress)!;
}

const legacyBasicStages = new Set([
  "mechanisms-color-exit-1", "mechanisms-irregular-block-5", "mechanisms-frozen-exit-6",
  "mechanisms-irregular-board-8", "mechanisms-numeric-ice-10", "mechanisms-shutter-20",
]);

/** A legacy frozen daily stage is never inferred from today's campaign progress. */
export function mapLegacyDailyChallengeStageV3(oldKey: string): DailyChallengeStageV3 | undefined {
  return legacyBasicStages.has(oldKey) ? DAILY_CHALLENGE_STAGES_V3[0] : getDailyChallengeStageV3(oldKey);
}

export function validateDailyChallengeStageMechanismsV3(stageKey: string, usedIds: readonly string[]) {
  const stage = getDailyChallengeStageV3(stageKey);
  const forbidden = [...new Set(usedIds.filter((id) => !stage?.allowedMechanisms.includes(id)))];
  const missingNewest = !!stage?.newestMechanism && !usedIds.includes(stage.newestMechanism);
  return { ok: !!stage && forbidden.length === 0 && !missingNewest, unknownStage: !stage,
    forbidden, missingNewest };
}
