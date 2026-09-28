/** Persisted profile identifiers; changing active documentation never migrates old levels. */
export const ACTIVE_MECHANISM_PROFILE = "revised-2026-09-27-v1.5" as const;
export const usesRevisedMechanisms = (value: { mechanismRules?: string }): boolean => (
  value.mechanismRules === "revised-2026-09-21" || value.mechanismRules === "revised-2026-09-21-v1.1"
    || value.mechanismRules === "revised-2026-09-21-v1.2"
    || value.mechanismRules === "revised-2026-09-23-v1.3"
    || value.mechanismRules === "revised-2026-09-23-v1.4"
    || value.mechanismRules === ACTIVE_MECHANISM_PROFILE
);
/** v1.1 clarified the first playable-frame clock; v1 scenes keep their old start policy. */
export const usesImmediatePlayableClock = (value: { mechanismRules?: string }): boolean => (
  value.mechanismRules === "revised-2026-09-21-v1.1" || value.mechanismRules === "revised-2026-09-21-v1.2"
    || value.mechanismRules === "revised-2026-09-23-v1.3"
    || value.mechanismRules === "revised-2026-09-23-v1.4"
    || value.mechanismRules === ACTIVE_MECHANISM_PROFILE
);
/** v1.3 moves only flip-door toggles to the corresponding departure completion. */
export const usesExitAnimationCompletion = (value: { mechanismRules?: string }): boolean => (
  value.mechanismRules === "revised-2026-09-23-v1.3" || value.mechanismRules === "revised-2026-09-23-v1.4"
    || value.mechanismRules === ACTIVE_MECHANISM_PROFILE
);
/** v1.5 captures only already-thawed doors before a clearance reduces ice. */
export const usesFrozenFlipDoorEligibility = (value: { mechanismRules?: string }): boolean => (
  value.mechanismRules === "revised-2026-09-27-v1.5"
);
