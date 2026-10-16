import { FEATURE_UNLOCKS, isFeatureUnlocked } from "./featureUnlocks";

export type GuidedFeatureId = "leaderboard" | "supply" | "levels" | "dailyChallenge" | "league";

export interface FeatureGuideProgress {
  version: 1;
  pending: GuidedFeatureId[];
  seen: GuidedFeatureId[];
}

type CampaignProgress = { highestLevel: number; rewardedLevels: readonly number[] };

export const GUIDED_FEATURE_IDS: readonly GuidedFeatureId[] = Object.freeze(
  (["leaderboard", "supply", "levels", "dailyChallenge", "league"] as GuidedFeatureId[])
    .sort((a, b) => FEATURE_UNLOCKS[a].completedLevel - FEATURE_UNLOCKS[b].completedLevel),
);

const orderedIds = (values: readonly unknown[]): GuidedFeatureId[] => (
  GUIDED_FEATURE_IDS.filter(id => values.includes(id))
);

/** Older or malformed ledgers never retroactively announce already-open features. */
export function sanitizeFeatureGuideProgress(raw: unknown, progress: CampaignProgress): FeatureGuideProgress {
  const source = raw !== null && typeof raw === "object" && !Array.isArray(raw)
    ? raw as Partial<Record<keyof FeatureGuideProgress, unknown>> : undefined;
  if (source?.version !== 1 || !Array.isArray(source.pending) || !Array.isArray(source.seen)) {
    return { version: 1, pending: [], seen: GUIDED_FEATURE_IDS.filter(id => isFeatureUnlocked(id, progress)) };
  }
  const seen = orderedIds(source.seen);
  const pending = orderedIds(source.pending).filter(id => !seen.includes(id) && isFeatureUnlocked(id, progress));
  return { version: 1, pending, seen };
}

/** Call only for a genuine campaign result; persist this with its progress candidate. */
export function queueFeatureUnlockGuides(
  raw: unknown,
  before: CampaignProgress,
  after: CampaignProgress,
): FeatureGuideProgress {
  // Migrate against the pre-clear progress so this very clear still gets its guide.
  const previous = sanitizeFeatureGuideProgress(raw, before);
  const crossed = GUIDED_FEATURE_IDS.filter(id => !isFeatureUnlocked(id, before) && isFeatureUnlocked(id, after));
  return sanitizeFeatureGuideProgress({
    version: 1,
    pending: [...previous.pending, ...crossed],
    seen: previous.seen,
  }, after);
}

/** Acknowledging a queued feature is idempotent and never consumes a reward. */
export function acknowledgeFeatureGuide(state: FeatureGuideProgress, id: GuidedFeatureId): FeatureGuideProgress {
  const seen = orderedIds(state.seen);
  if (GUIDED_FEATURE_IDS.includes(id) && state.pending.includes(id)) seen.push(id);
  const orderedSeen = orderedIds(seen);
  return {
    version: 1,
    pending: orderedIds(state.pending).filter(pendingId => !orderedSeen.includes(pendingId)),
    seen: orderedSeen,
  };
}
