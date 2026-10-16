import { grantLives, sanitizeLifeState, type LifeState } from "./lives";

/**
 * Durable state for the rewarded-video action in the life refill dialog.
 *
 * This ledger is deliberately separate from the welfare-station ledger. The
 * two buttons are different offers, so claiming one must not silently consume
 * the other's daily allowance. There is no client-side daily cap here; the
 * native ad provider remains the source of inventory limits.
 */
export interface LifeRefillAdRequest {
  id: string;
  startedAtMs: number;
  phase: "watching" | "completed";
  completedAtMs?: number;
}

export interface LifeRefillAdState {
  version: 1;
  completedRequestIds: string[];
  pending?: LifeRefillAdRequest;
}

export type LifeRefillAdStatus = "prepared" | "confirmed" | "rewarded" | "cancelled"
  | "duplicate" | "missing" | "not-completed" | "completed-pending" | "invalid-request" | "busy";

export interface LifeRefillAdResult {
  status: LifeRefillAdStatus;
  state: LifeRefillAdState;
  request?: LifeRefillAdRequest;
}

export interface LifeRefillAdCompletion extends LifeRefillAdResult {
  lifeState: LifeState;
  amount?: number;
}

const LEDGER_LIMIT = 256;
const MAX_TIME_MS = 253_402_271_999_999;
const validTime = (value: unknown): value is number => typeof value === "number"
  && Number.isSafeInteger(value) && value >= 0 && value <= MAX_TIME_MS;
const validId = (value: unknown): value is string => typeof value === "string"
  && /^[A-Za-z0-9._:-]{1,128}$/.test(value);
const record = (value: unknown): Record<string, unknown> => value !== null
  && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

const normalizeRequest = (value: unknown): LifeRefillAdRequest | undefined => {
  const source = record(value);
  if (!validId(source.id) || !validTime(source.startedAtMs)
    || (source.phase !== "watching" && source.phase !== "completed")
    || (source.phase === "completed" && !validTime(source.completedAtMs))) return undefined;
  return {
    id: source.id,
    startedAtMs: source.startedAtMs,
    phase: source.phase,
    ...(source.phase === "completed"
      ? { completedAtMs: Math.max(source.startedAtMs, source.completedAtMs as number) }
      : {}),
  };
};

export const normalizeLifeRefillAd = (value: unknown): LifeRefillAdState => {
  const source = record(value);
  const ids = Array.isArray(source.completedRequestIds)
    ? source.completedRequestIds.filter(validId)
    : [];
  const allCompletedRequestIds = [...new Set(ids)];
  const completedRequestIds = allCompletedRequestIds.slice(-LEDGER_LIMIT);
  const pending = normalizeRequest(source.pending);
  return {
    version: 1,
    completedRequestIds,
    ...(pending && !allCompletedRequestIds.includes(pending.id) ? { pending } : {}),
  };
};

export const cloneLifeRefillAd = (value: LifeRefillAdState): LifeRefillAdState => ({
  version: 1,
  completedRequestIds: [...value.completedRequestIds],
  ...(value.pending ? { pending: { ...value.pending } } : {}),
});

export const prepareLifeRefillAd = (value: unknown, options: {
  id: string;
  nowMs: number;
}): LifeRefillAdResult => {
  const state = normalizeLifeRefillAd(value);
  if (!validId(options.id) || !validTime(options.nowMs)) return { status: "invalid-request", state };
  if (state.completedRequestIds.includes(options.id)) return { status: "duplicate", state };
  if (state.pending) return { status: "busy", state, request: { ...state.pending } };
  const request: LifeRefillAdRequest = { id: options.id, startedAtMs: options.nowMs, phase: "watching" };
  return { status: "prepared", state: { ...state, pending: request }, request: { ...request } };
};

/** Call only after the host reports a completed rewarded-video close event. */
export const confirmLifeRefillAd = (value: unknown, requestId: string, completedAtMs: number): LifeRefillAdResult => {
  const state = normalizeLifeRefillAd(value);
  if (state.completedRequestIds.includes(requestId)) return { status: "duplicate", state };
  if (!state.pending || state.pending.id !== requestId) return { status: "missing", state };
  if (!validTime(completedAtMs)) return { status: "invalid-request", state };
  const request = state.pending.phase === "completed"
    ? state.pending
    : { ...state.pending, phase: "completed" as const, completedAtMs: Math.max(state.pending.startedAtMs, completedAtMs) };
  return { status: "confirmed", state: { ...state, pending: request }, request: { ...request } };
};

/** Grants exactly one life after the completed receipt has been persisted. */
export const completeLifeRefillAd = (value: unknown, rawLifeState: LifeState, nowMs: number): LifeRefillAdCompletion => {
  const state = normalizeLifeRefillAd(value);
  const lifeState = sanitizeLifeState(rawLifeState);
  if (!state.pending) return { status: "missing", state, lifeState };
  if (state.pending.phase !== "completed") return { status: "not-completed", state, lifeState, request: { ...state.pending } };
  const request = state.pending;
  const nextState = {
    ...state,
    completedRequestIds: [...state.completedRequestIds, request.id].slice(-LEDGER_LIMIT),
  };
  delete nextState.pending;
  return {
    status: "rewarded",
    state: nextState,
    lifeState: grantLives(lifeState, 1, nowMs),
    amount: 1,
    request: { ...request },
  };
};

/** Cancel only an uncompleted receipt. A completed receipt must be settled. */
export const cancelLifeRefillAd = (value: unknown, requestId: string): LifeRefillAdResult => {
  const state = normalizeLifeRefillAd(value);
  if (!state.pending || state.pending.id !== requestId) return { status: "missing", state };
  if (state.pending.phase === "completed") return { status: "completed-pending", state, request: { ...state.pending } };
  const nextState = { ...state };
  delete nextState.pending;
  return { status: "cancelled", state: nextState };
};

