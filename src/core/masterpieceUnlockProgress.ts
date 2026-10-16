/** Presentation-only view of the existing campaign unlock thresholds. */
export interface MasterpieceUnlockDefinition {
  readonly id: string;
  readonly unlockLevel: number;
}

export interface MasterpieceUnlockProgressInput {
  readonly beforeRewardedLevels: unknown;
  readonly afterRewardedLevels: unknown;
  readonly catalog: readonly MasterpieceUnlockDefinition[];
  /** When supplied, a newly unlocked target must belong to this actual result. */
  readonly settledLevelId?: number;
}

export interface MasterpieceUnlockProgress {
  readonly targetId?: string;
  readonly previous: number;
  readonly current: number;
  readonly total: number;
  readonly remaining: number;
  readonly justUnlocked: boolean;
  readonly allUnlocked: boolean;
}

const completedLevels = (value: unknown): Set<number> => new Set(
  Array.isArray(value) ? value.filter((level): level is number => (
    typeof level === "number" && Number.isSafeInteger(level) && level > 0
  )) : [],
);

const highestCompleted = (levels: ReadonlySet<number>): number => {
  let highest = 0;
  for (const level of levels) highest = Math.max(highest, level);
  return highest;
};

/**
 * Uses the same highest-completed-level fact as masterpiece blueprint unlocks.
 * A threshold-crossing result keeps the highest newly unlocked work at full;
 * later results show the next threshold. This never grants or restores art.
 */
export function deriveMasterpieceUnlockProgress({
  beforeRewardedLevels,
  afterRewardedLevels,
  catalog,
  settledLevelId,
}: MasterpieceUnlockProgressInput): MasterpieceUnlockProgress {
  const seenIds = new Set<string>();
  const seenLevels = new Set<number>();
  const ordered = catalog.filter(({ id, unlockLevel }) => {
    if (typeof id !== "string" || !id || !Number.isSafeInteger(unlockLevel) || unlockLevel <= 0
      || seenIds.has(id) || seenLevels.has(unlockLevel)) return false;
    seenIds.add(id);
    seenLevels.add(unlockLevel);
    return true;
  }).sort((left, right) => left.unlockLevel - right.unlockLevel);
  const before = completedLevels(beforeRewardedLevels);
  const after = completedLevels(afterRewardedLevels);
  const beforeHighest = highestCompleted(before);
  const afterHighest = highestCompleted(after);
  const allUnlocked = ordered.length === 0 || afterHighest >= ordered[ordered.length - 1]!.unlockLevel;
  const isNewHighestResult = settledLevelId === undefined
    || (settledLevelId === afterHighest && after.has(settledLevelId) && !before.has(settledLevelId));

  let crossedIndex = -1;
  if (isNewHighestResult && afterHighest > beforeHighest) {
    ordered.forEach((item, index) => {
      if (item.unlockLevel > beforeHighest && item.unlockLevel <= afterHighest) crossedIndex = index;
    });
  }
  const targetIndex = crossedIndex >= 0 ? crossedIndex
    : ordered.findIndex((item) => item.unlockLevel > afterHighest);
  if (targetIndex < 0) {
    return { previous: 0, current: 0, total: 0, remaining: 0, justUnlocked: false, allUnlocked };
  }

  const target = ordered[targetIndex]!;
  const startLevel = targetIndex > 0 ? ordered[targetIndex - 1]!.unlockLevel : 0;
  const total = target.unlockLevel - startLevel;
  const progressAt = (highest: number): number => Math.max(0, Math.min(total, highest - startLevel));
  const current = progressAt(afterHighest);
  return {
    targetId: target.id,
    previous: progressAt(beforeHighest),
    current,
    total,
    remaining: total - current,
    justUnlocked: crossedIndex >= 0,
    allUnlocked,
  };
}
