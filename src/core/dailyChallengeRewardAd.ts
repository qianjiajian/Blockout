/** Extra attempts are kept outside the fixed five-attempt daily challenge schema. */
export interface DailyChallengeRewardAdRequest {
  id: string;
  dayKey: string;
  startedAtMs: number;
  phase: "watching" | "completed";
  completedAtMs?: number;
}

export interface DailyChallengeRewardAdState {
  version: 1;
  /** Canonical day from the reconciled daily challenge, including its rollback guard. */
  dayKey: string;
  bonusAttempts: number;
  completedRequestIds: string[];
  pending?: DailyChallengeRewardAdRequest;
}

export type DailyChallengeRewardAdStatus = "prepared" | "confirmed" | "rewarded" | "cancelled"
  | "duplicate" | "missing" | "not-completed" | "completed-pending" | "invalid-request" | "busy" | "full";

export interface DailyChallengeRewardAdResult {
  status: DailyChallengeRewardAdStatus;
  state: DailyChallengeRewardAdState;
  request?: DailyChallengeRewardAdRequest;
}

export interface DailyChallengeRewardAdCompletion extends DailyChallengeRewardAdResult {
  amount?: number;
}

const LEDGER_LIMIT = 256;
const MAX_TIME_MS = 253_402_271_999_999;
const validTime = (value: unknown): value is number => typeof value === "number"
  && Number.isSafeInteger(value) && value >= 0 && value <= MAX_TIME_MS;
const validId = (value: unknown): value is string => typeof value === "string"
  && /^[A-Za-z0-9._:-]{1,128}$/.test(value);
const validDayKey = (value: unknown): value is string => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
const record = (value: unknown): Record<string, unknown> => value !== null
  && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const safeAttempts = (value: unknown): number => typeof value === "number" && Number.isSafeInteger(value)
  && value >= 0 ? value : 0;

const normalizeRequest = (value: unknown): DailyChallengeRewardAdRequest | undefined => {
  const source = record(value);
  if (!validId(source.id) || !validDayKey(source.dayKey) || !validTime(source.startedAtMs)
    || (source.phase !== "watching" && source.phase !== "completed")
    || (source.phase === "completed" && !validTime(source.completedAtMs))) return undefined;
  return {
    id: source.id, dayKey: source.dayKey, startedAtMs: source.startedAtMs, phase: source.phase,
    ...(source.phase === "completed"
      ? { completedAtMs: Math.max(source.startedAtMs, source.completedAtMs as number) } : {}),
  };
};

/** Advances bonus balance to the canonical daily key without cancelling in-flight receipts. */
export const normalizeDailyChallengeRewardAd = (value: unknown, dayKey?: string): DailyChallengeRewardAdState => {
  const source = record(value);
  const savedDayKey = validDayKey(source.dayKey) ? source.dayKey : "";
  // Never revive an older day when the device clock moves backwards. The caller
  // normally supplies dailyChallenge.dayKey, which already has this protection.
  const nextDayKey = validDayKey(dayKey) && dayKey > savedDayKey ? dayKey : savedDayKey;
  const ids = Array.isArray(source.completedRequestIds) ? source.completedRequestIds.filter(validId) : [];
  const allCompletedRequestIds = [...new Set(ids)];
  const pending = normalizeRequest(source.pending);
  // An unfinished watch from a previous day cannot block today's offer. A
  // completed receipt is retained so a midnight crossing never loses a paid
  // reward; it settles into the canonical day supplied by the caller.
  const dayPending = pending && (pending.phase === "completed" || pending.dayKey === nextDayKey)
    ? pending : undefined;
  return {
    version: 1,
    dayKey: nextDayKey,
    bonusAttempts: savedDayKey && savedDayKey === nextDayKey ? safeAttempts(source.bonusAttempts) : 0,
    completedRequestIds: allCompletedRequestIds.slice(-LEDGER_LIMIT),
    ...(dayPending && !allCompletedRequestIds.includes(dayPending.id) ? { pending: dayPending } : {}),
  };
};

export const cloneDailyChallengeRewardAd = (value: DailyChallengeRewardAdState): DailyChallengeRewardAdState => ({
  version: 1, dayKey: value.dayKey, bonusAttempts: value.bonusAttempts,
  completedRequestIds: [...value.completedRequestIds],
  ...(value.pending ? { pending: { ...value.pending } } : {}),
});

export const dailyChallengeRewardAttempts = (value: unknown, dayKey: string): number => {
  const state = normalizeDailyChallengeRewardAd(value, dayKey);
  return state.dayKey === dayKey ? state.bonusAttempts : 0;
};

/** The caller persists this result atomically with the new daily challenge run. */
export const consumeDailyChallengeRewardAttempt = (value: unknown, dayKey: string): {
  state: DailyChallengeRewardAdState; accepted: boolean; attemptsRemaining: number;
} => {
  const state = normalizeDailyChallengeRewardAd(value, dayKey);
  if (!validDayKey(dayKey) || state.dayKey !== dayKey || state.bonusAttempts <= 0) {
    return { state, accepted: false, attemptsRemaining: 0 };
  }
  const bonusAttempts = state.bonusAttempts - 1;
  return { state: { ...state, bonusAttempts }, accepted: true, attemptsRemaining: bonusAttempts };
};

export const prepareDailyChallengeRewardAd = (value: unknown, options: {
  id: string; dayKey: string; nowMs: number;
}): DailyChallengeRewardAdResult => {
  const state = normalizeDailyChallengeRewardAd(value, options.dayKey);
  if (!validId(options.id) || !validDayKey(options.dayKey) || state.dayKey !== options.dayKey
    || !validTime(options.nowMs)) return { status: "invalid-request", state };
  if (state.completedRequestIds.includes(options.id)) return { status: "duplicate", state };
  if (state.pending) return { status: "busy", state, request: { ...state.pending } };
  const request: DailyChallengeRewardAdRequest = {
    id: options.id, dayKey: options.dayKey, startedAtMs: options.nowMs, phase: "watching",
  };
  return { status: "prepared", state: { ...state, pending: request }, request: { ...request } };
};

/** Call only after the native host reports a completed rewarded-video close. */
export const confirmDailyChallengeRewardAd = (
  value: unknown, requestId: string, completedAtMs: number,
): DailyChallengeRewardAdResult => {
  const state = normalizeDailyChallengeRewardAd(value);
  if (state.completedRequestIds.includes(requestId)) return { status: "duplicate", state };
  if (!state.pending || state.pending.id !== requestId) return { status: "missing", state };
  if (!validTime(completedAtMs)) return { status: "invalid-request", state };
  const request = state.pending.phase === "completed" ? state.pending : {
    ...state.pending, phase: "completed" as const,
    completedAtMs: Math.max(state.pending.startedAtMs, completedAtMs),
  };
  return { status: "confirmed", state: { ...state, pending: request }, request: { ...request } };
};

/** Persist the returned state after the completed receipt is safely recorded. */
export const completeDailyChallengeRewardAd = (
  value: unknown, dayKey: string, nowMs: number,
): DailyChallengeRewardAdCompletion => {
  const state = normalizeDailyChallengeRewardAd(value, dayKey);
  if (!validDayKey(dayKey) || state.dayKey !== dayKey || !validTime(nowMs)) return { status: "invalid-request", state };
  if (!state.pending) return { status: "missing", state };
  if (state.pending.phase !== "completed") return { status: "not-completed", state, request: { ...state.pending } };
  if (state.bonusAttempts >= Number.MAX_SAFE_INTEGER) return { status: "full", state, request: { ...state.pending } };
  const request = state.pending;
  const nextState: DailyChallengeRewardAdState = {
    ...state,
    bonusAttempts: state.bonusAttempts + 1,
    completedRequestIds: [...state.completedRequestIds, request.id].slice(-LEDGER_LIMIT),
  };
  delete nextState.pending;
  return { status: "rewarded", state: nextState, amount: 1, request: { ...request } };
};

/** A completed receipt cannot be cancelled, including during a day rollover. */
export const cancelDailyChallengeRewardAd = (value: unknown, requestId: string): DailyChallengeRewardAdResult => {
  const state = normalizeDailyChallengeRewardAd(value);
  if (!state.pending || state.pending.id !== requestId) return { status: "missing", state };
  if (state.pending.phase === "completed") return { status: "completed-pending", state, request: { ...state.pending } };
  const nextState = { ...state };
  delete nextState.pending;
  return { status: "cancelled", state: nextState };
};
