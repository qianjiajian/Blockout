/**
 * The first production campaign ended at level 100. Completing that final
 * level could not advance `highestLevel`/`currentLevel` beyond the old cap, so
 * `rewardedLevels` is the durable proof that level 100 was actually cleared.
 */
export const LEGACY_CAMPAIGN_LEVEL_CAP = 100;

interface CampaignProgressFields {
  readonly currentLevel?: unknown;
  readonly highestLevel?: unknown;
  readonly rewardedLevels?: unknown;
}

const hasCompletedLegacyCap = (
  save: CampaignProgressFields,
  legacyLevelCap: number,
): boolean => Array.isArray(save.rewardedLevels)
  && save.rewardedLevels.some((level) => level === legacyLevelCap);

/**
 * Unlocks the first newly-added level for a save that demonstrably completed
 * the old capped campaign.
 *
 * This is intentionally idempotent: after the first migration highestLevel is
 * above the legacy cap, so loading the same save again is a no-op. A player
 * replaying an earlier level keeps that current selection; only the old
 * cap-screen position itself advances to the newly unlocked level.
 *
 * All unrelated save fields and nested values are preserved verbatim.
 */
export const migrateLegacyCampaignCap = <T extends object>(
  save: T,
  currentLevelCount: number,
  legacyLevelCap = LEGACY_CAMPAIGN_LEVEL_CAP,
): T => {
  const fields = save as T & CampaignProgressFields;
  if (!Number.isInteger(currentLevelCount)
    || !Number.isInteger(legacyLevelCap)
    || currentLevelCount <= legacyLevelCap
    || fields.highestLevel !== legacyLevelCap
    || !hasCompletedLegacyCap(fields, legacyLevelCap)) {
    return save;
  }

  const firstExpandedLevel = legacyLevelCap + 1;
  return {
    ...save,
    highestLevel: firstExpandedLevel,
    currentLevel: fields.currentLevel === legacyLevelCap
      ? firstExpandedLevel
      : fields.currentLevel,
  };
};
