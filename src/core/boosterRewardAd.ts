import { SUPPLY_ITEMS, type SupplyKind } from "./supply";

/** Durable state for a rewarded-video claim that grants one booster. */
export interface BoosterRewardAdRequest {
  id: string;
  kind: SupplyKind;
  startedAtMs: number;
  phase: "watching" | "completed";
  completedAtMs?: number;
}

export interface BoosterRewardAdState {
  version: 1;
  completedRequestIds: string[];
  pending?: BoosterRewardAdRequest;
}

export type BoosterRewardAdStatus = "prepared" | "confirmed" | "rewarded" | "cancelled"
  | "duplicate" | "missing" | "not-completed" | "completed-pending" | "invalid-request" | "busy" | "full";

export interface BoosterRewardAdResult {
  status: BoosterRewardAdStatus;
  state: BoosterRewardAdState;
  request?: BoosterRewardAdRequest;
}

export interface BoosterRewardAdCompletion extends BoosterRewardAdResult {
  stock: number;
  amount?: number;
}

const LEDGER_LIMIT = 256;
const MAX_TIME_MS = 253_402_271_999_999;
const validTime = (value: unknown): value is number => typeof value === "number"
  && Number.isSafeInteger(value) && value >= 0 && value <= MAX_TIME_MS;
const validId = (value: unknown): value is string => typeof value === "string"
  && /^[A-Za-z0-9._:-]{1,128}$/.test(value);
const validKind = (value: unknown): value is SupplyKind => value === "time"
  || value === "rocket" || value === "pulse";
const record = (value: unknown): Record<string, unknown> => value !== null
  && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const safeStock = (value: unknown): number => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.floor(number))) : 0;
};

const normalizeRequest = (value: unknown): BoosterRewardAdRequest | undefined => {
  const source = record(value);
  if (!validId(source.id) || !validKind(source.kind) || !validTime(source.startedAtMs)
    || (source.phase !== "watching" && source.phase !== "completed")
    || (source.phase === "completed" && !validTime(source.completedAtMs))) return undefined;
  return {
    id: source.id,
    kind: source.kind,
    startedAtMs: source.startedAtMs,
    phase: source.phase,
    ...(source.phase === "completed"
      ? { completedAtMs: Math.max(source.startedAtMs, source.completedAtMs as number) }
      : {}),
  };
};

export const normalizeBoosterRewardAd = (value: unknown): BoosterRewardAdState => {
  const source = record(value);
  const ids = Array.isArray(source.completedRequestIds)
    ? source.completedRequestIds.filter(validId)
    : [];
  // Check a pending request against the complete de-duplicated history before
  // trimming it. This prevents an old duplicate from being replayed after the
  // bounded ledger has rolled over.
  const allCompletedRequestIds = [...new Set(ids)];
  const completedRequestIds = allCompletedRequestIds.slice(-LEDGER_LIMIT);
  const pending = normalizeRequest(source.pending);
  return {
    version: 1,
    completedRequestIds,
    ...(pending && !allCompletedRequestIds.includes(pending.id) ? { pending } : {}),
  };
};

export const cloneBoosterRewardAd = (value: BoosterRewardAdState): BoosterRewardAdState => ({
  version: 1,
  completedRequestIds: [...value.completedRequestIds],
  ...(value.pending ? { pending: { ...value.pending } } : {}),
});

export const prepareBoosterRewardAd = (value: unknown, options: {
  id: string;
  kind: SupplyKind;
  nowMs: number;
}): BoosterRewardAdResult => {
  const state = normalizeBoosterRewardAd(value);
  if (!validId(options.id) || !validKind(options.kind) || !validTime(options.nowMs)) {
    return { status: "invalid-request", state };
  }
  if (state.completedRequestIds.includes(options.id)) return { status: "duplicate", state };
  if (state.pending) return { status: "busy", state, request: { ...state.pending } };
  const request: BoosterRewardAdRequest = {
    id: options.id, kind: options.kind, startedAtMs: options.nowMs, phase: "watching",
  };
  return { status: "prepared", state: { ...state, pending: request }, request: { ...request } };
};

/** Call only after the native host reports a completed rewarded-video close. */
export const confirmBoosterRewardAd = (
  value: unknown,
  requestId: string,
  completedAtMs: number,
): BoosterRewardAdResult => {
  const state = normalizeBoosterRewardAd(value);
  if (state.completedRequestIds.includes(requestId)) return { status: "duplicate", state };
  if (!state.pending || state.pending.id !== requestId) return { status: "missing", state };
  if (!validTime(completedAtMs)) return { status: "invalid-request", state };
  const request = state.pending.phase === "completed"
    ? state.pending
    : { ...state.pending, phase: "completed" as const,
      completedAtMs: Math.max(state.pending.startedAtMs, completedAtMs) };
  return { status: "confirmed", state: { ...state, pending: request }, request: { ...request } };
};

/** Grants exactly one item after a completed receipt has been persisted. */
export const completeBoosterRewardAd = (
  value: unknown,
  rawStock: number,
  nowMs: number,
): BoosterRewardAdCompletion => {
  const state = normalizeBoosterRewardAd(value);
  const stock = safeStock(rawStock);
  if (!validTime(nowMs)) return { status: "invalid-request", state, stock };
  if (!state.pending) return { status: "missing", state, stock };
  if (state.pending.phase !== "completed") {
    return { status: "not-completed", state, stock, request: { ...state.pending } };
  }
  const kind = state.pending.kind;
  const maxStock = SUPPLY_ITEMS[kind].maxStock;
  if (stock >= maxStock) {
    // Keep the receipt so the caller can retry settlement after inventory is
    // consumed. The ad is never replayed and no item is silently discarded.
    return { status: "full", state, stock, request: { ...state.pending } };
  }
  const request = state.pending;
  const nextState: BoosterRewardAdState = {
    ...state,
    completedRequestIds: [...state.completedRequestIds, request.id].slice(-LEDGER_LIMIT),
  };
  delete nextState.pending;
  return {
    status: "rewarded", state: nextState, stock: stock + 1, amount: 1, request: { ...request },
  };
};

/** Cancel only an uncompleted receipt. A completed receipt must be settled. */
export const cancelBoosterRewardAd = (value: unknown, requestId: string): BoosterRewardAdResult => {
  const state = normalizeBoosterRewardAd(value);
  if (!state.pending || state.pending.id !== requestId) return { status: "missing", state };
  if (state.pending.phase === "completed") return { status: "completed-pending", state, request: { ...state.pending } };
  const nextState = { ...state };
  delete nextState.pending;
  return { status: "cancelled", state: nextState };
};
