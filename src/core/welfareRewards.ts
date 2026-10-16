import { grantLives, sanitizeLifeState, type LifeState } from "./lives";
import { SUPPLY_ITEMS, SUPPLY_ORDER, type SupplyKind } from "./supply";

export const WELFARE_REWARD_KINDS = ["inspiration", "coins", "lives", "booster"] as const;
export type WelfareRewardKind = typeof WELFARE_REWARD_KINDS[number];
export const WELFARE_DAILY_LIMITS: Readonly<Record<WelfareRewardKind, number>> = Object.freeze({
  inspiration: 3, coins: 3, lives: 3, booster: 10,
});
export const WELFARE_COOLDOWN_MS = 0;
export const WELFARE_COIN_CAP = 999_999;
export const WELFARE_COMPLETED_LEDGER_LIMIT = 256;
export const WELFARE_REWARD_AMOUNTS: Readonly<Record<WelfareRewardKind, number>> = Object.freeze({
  inspiration: 50, coins: 100, lives: 1, booster: 1,
});

export interface WelfareRewardRequest {
  id: string;
  kind: WelfareRewardKind;
  boosterKind?: SupplyKind;
  /** The monotonic Beijing day observed when the request was prepared. */
  dayKey: string;
  startedAtMs: number;
  phase: "watching" | "completed";
  /** Confirmed host completion time, fixed before the candidate save is made. */
  completedAtMs?: number;
}

export interface WelfareRewardState {
  version: 1;
  dayKey: string;
  maxObservedDayKey: string;
  claimed: Record<WelfareRewardKind, number>;
  cooldownUntilMs: number;
  completedRequestIds: string[];
  pending?: WelfareRewardRequest;
}

/** Adapt existing save fields into this view; no ownership/collection flags live here. */
export interface WelfareRewardAccount {
  coins: number;
  inspiration: number;
  lifeState: LifeState;
  boosters: Record<SupplyKind, number>;
  unlockedBoosters: readonly SupplyKind[];
}

export type WelfareRewardStatus = "available" | "prepared" | "confirmed" | "rewarded" | "cancelled"
  | "invalid-request" | "busy" | "cooldown" | "daily-limit" | "locked" | "full"
  | "duplicate" | "missing" | "not-completed" | "completed-pending" | "capacity";

export interface WelfareRewardResult {
  status: WelfareRewardStatus;
  state: WelfareRewardState;
  request?: WelfareRewardRequest;
}

export interface WelfareRewardGrant {
  kind: WelfareRewardKind;
  amount: number;
  boosterKind?: SupplyKind;
  requestId: string;
  dayKey: string;
}

export interface WelfareRewardCompletion extends WelfareRewardResult {
  account: WelfareRewardAccount;
  reward?: WelfareRewardGrant;
}

export interface WelfareRewardCardState {
  kind: WelfareRewardKind;
  amount: number;
  claimed: number;
  remaining: number;
  available: boolean;
  status: WelfareRewardStatus;
}

export interface WelfareRewardsView {
  state: WelfareRewardState;
  dayKey: string;
  cooldownRemainingMs: number;
  pending?: WelfareRewardRequest;
  cards: Record<WelfareRewardKind, WelfareRewardCardState>;
  boosterChoices: Record<SupplyKind, { available: boolean; status: WelfareRewardStatus }>;
}

const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;
const MAX_DATE_MS = 253_402_271_999_999; // Last millisecond of Beijing year 9999.
const emptyCounts = (): Record<WelfareRewardKind, number> => ({ inspiration: 0, coins: 0, lives: 0, booster: 0 });
const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === "object"
  && !Array.isArray(value) ? value as Record<string, unknown> : {};
const integer = (value: unknown, maximum = Number.MAX_SAFE_INTEGER): number =>
  typeof value === "number" && Number.isFinite(value) ? Math.min(maximum, Math.max(0, Math.floor(value))) : 0;
const validTime = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value)
  && value >= 0 && value <= MAX_DATE_MS;
const safeTime = (value: number): number => integer(value, MAX_DATE_MS);
const validId = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z0-9._:-]{1,128}$/.test(value);
const rewardKind = (value: unknown): value is WelfareRewardKind => WELFARE_REWARD_KINDS.includes(value as WelfareRewardKind);
const boosterKind = (value: unknown): value is SupplyKind => SUPPLY_ORDER.includes(value as SupplyKind);
const validDay = (value: unknown): value is string => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value && value >= "1970-01-01";
};

export const welfareDayKey = (nowMs: number): string =>
  new Date(safeTime(nowMs) + BEIJING_OFFSET_MS).toISOString().slice(0, 10);

function normalizeRequest(value: unknown): WelfareRewardRequest | undefined {
  const source = record(value);
  if (!validId(source.id) || !rewardKind(source.kind) || !validDay(source.dayKey)
    || !validTime(source.startedAtMs) || (source.phase !== "watching" && source.phase !== "completed")
    || (source.kind === "booster" && !boosterKind(source.boosterKind))
    || (source.phase === "completed" && !validTime(source.completedAtMs))) return undefined;
  return { id: source.id, kind: source.kind, dayKey: source.dayKey, startedAtMs: source.startedAtMs,
    phase: source.phase, ...(source.kind === "booster" ? { boosterKind: source.boosterKind as SupplyKind } : {}),
    ...(source.phase === "completed" ? { completedAtMs: Math.max(source.startedAtMs, source.completedAtMs as number) } : {}) };
}

/** Safe old-save defaults and cloning. Keep a request's day fixed even across midnight. */
export function normalizeWelfareRewards(value: unknown, nowMs: number): WelfareRewardState {
  const source = record(value), today = welfareDayKey(nowMs);
  const sourceDay = validDay(source.dayKey) ? source.dayKey : today;
  const observed = validDay(source.maxObservedDayKey) ? source.maxObservedDayKey : sourceDay;
  const pending = normalizeRequest(source.pending);
  // An older pending claim also proves its day has already been observed.
  const days = [today, sourceDay, observed, pending?.dayKey ?? today].sort();
  const dayKey = days[days.length - 1];
  const claimed = emptyCounts(), counts = record(source.claimed);
  if (sourceDay === dayKey) for (const kind of WELFARE_REWARD_KINDS) claimed[kind] = integer(counts[kind], WELFARE_DAILY_LIMITS[kind]);
  const ids = Array.isArray(source.completedRequestIds) ? source.completedRequestIds.filter(validId) : [];
  const allCompletedIds = [...new Set(ids)];
  const state: WelfareRewardState = {
    version: 1, dayKey, maxObservedDayKey: dayKey, claimed,
    // Retain the legacy save field without carrying its old wait into new claims.
    cooldownUntilMs: 0,
    completedRequestIds: allCompletedIds.slice(-WELFARE_COMPLETED_LEDGER_LIMIT),
  };
  // A fulfilled receipt must never resurrect through malformed duplicate pending data.
  if (pending && !allCompletedIds.includes(pending.id)) state.pending = pending;
  return state;
}

export function cloneWelfareRewards(state: WelfareRewardState): WelfareRewardState {
  return { ...state, claimed: { ...state.claimed }, completedRequestIds: [...state.completedRequestIds],
    ...(state.pending ? { pending: { ...state.pending } } : {}) };
}

function cloneAccount(account: WelfareRewardAccount): WelfareRewardAccount {
  return { coins: integer(account.coins), inspiration: integer(account.inspiration),
    lifeState: sanitizeLifeState(account.lifeState),
    boosters: { time: integer(account.boosters.time), rocket: integer(account.boosters.rocket), pulse: integer(account.boosters.pulse) },
    unlockedBoosters: [...new Set(account.unlockedBoosters.filter(boosterKind))] };
}

function eligibility(state: WelfareRewardState, account: WelfareRewardAccount, kind: WelfareRewardKind,
  nowMs: number, selected?: SupplyKind): WelfareRewardStatus {
  if (state.pending) return "busy";
  if (kind === "coins" && account.coins > WELFARE_COIN_CAP - WELFARE_REWARD_AMOUNTS.coins) return "full";
  if (state.claimed[kind] >= WELFARE_DAILY_LIMITS[kind]) return "daily-limit";
  if (kind === "lives" && account.lifeState.lives > Number.MAX_SAFE_INTEGER - WELFARE_REWARD_AMOUNTS.lives) return "capacity";
  if (kind === "inspiration" && account.inspiration > Number.MAX_SAFE_INTEGER - WELFARE_REWARD_AMOUNTS.inspiration) return "capacity";
  if (kind === "booster") {
    if (!selected || !account.unlockedBoosters.includes(selected)) return "locked";
    if (account.boosters[selected] >= SUPPLY_ITEMS[selected].maxStock) return "full";
  }
  return "available";
}

export function deriveWelfareRewards(value: unknown, rawAccount: WelfareRewardAccount, nowMs: number): WelfareRewardsView {
  const state = normalizeWelfareRewards(value, nowMs), account = cloneAccount(rawAccount);
  const boosterChoices = Object.fromEntries(SUPPLY_ORDER.map(kind => {
    const status = eligibility(state, account, "booster", nowMs, kind);
    return [kind, { available: status === "available", status }];
  })) as WelfareRewardsView["boosterChoices"];
  const cards = Object.fromEntries(WELFARE_REWARD_KINDS.map(kind => {
    const selected = SUPPLY_ORDER.find(type => account.unlockedBoosters.includes(type)
      && account.boosters[type] < SUPPLY_ITEMS[type].maxStock)
      ?? SUPPLY_ORDER.find(type => account.unlockedBoosters.includes(type));
    const status = eligibility(state, account, kind, nowMs, selected);
    return [kind, { kind, amount: WELFARE_REWARD_AMOUNTS[kind], claimed: state.claimed[kind],
      remaining: WELFARE_DAILY_LIMITS[kind] - state.claimed[kind], available: status === "available", status }];
  })) as WelfareRewardsView["cards"];
  return { state, dayKey: state.dayKey, cooldownRemainingMs: 0,
    ...(state.pending ? { pending: { ...state.pending } } : {}), cards, boosterChoices };
}

/** Caller supplies a fresh unique ID, persists watching, then asks the real ad host. */
export function prepareWelfareReward(value: unknown, rawAccount: WelfareRewardAccount, options: {
  id: string; kind: WelfareRewardKind; boosterKind?: SupplyKind; nowMs: number;
}): WelfareRewardResult {
  const state = normalizeWelfareRewards(value, options.nowMs);
  if (!validId(options.id) || !rewardKind(options.kind) || !validTime(options.nowMs)
    || (options.kind === "booster" && !boosterKind(options.boosterKind))) return { status: "invalid-request", state };
  if (state.completedRequestIds.includes(options.id)) return { status: "duplicate", state };
  const status = eligibility(state, cloneAccount(rawAccount), options.kind, options.nowMs, options.boosterKind);
  if (status !== "available") return { status, state };
  const request: WelfareRewardRequest = { id: options.id, kind: options.kind, dayKey: state.dayKey,
    startedAtMs: options.nowMs, phase: "watching",
    ...(options.kind === "booster" ? { boosterKind: options.boosterKind } : {}) };
  state.pending = request;
  return { status: "prepared", state, request: { ...request } };
}

/** Invoke only after the host's completed-view callback, never after a timer. */
export function confirmWelfareAdCompletion(value: unknown, requestId: string, completedAtMs: number): WelfareRewardResult {
  const state = normalizeWelfareRewards(value, completedAtMs);
  if (state.completedRequestIds.includes(requestId)) return { status: "duplicate", state };
  if (!state.pending || state.pending.id !== requestId) return { status: "missing", state };
  if (!validTime(completedAtMs)) return { status: "invalid-request", state };
  // Preserve the first completion proof through duplicate callbacks.
  if (state.pending.phase !== "completed") state.pending = { ...state.pending, phase: "completed",
    completedAtMs: Math.max(state.pending.startedAtMs, completedAtMs) };
  return { status: "confirmed", state, request: { ...state.pending } };
}

/** Persist the completed receipt before deriving this atomic reward/quota candidate.
 * Save failure must retry that same candidate, not call this again on newer balances. */
export function completeWelfareReward(value: unknown, rawAccount: WelfareRewardAccount, nowMs: number): WelfareRewardCompletion {
  const state = normalizeWelfareRewards(value, nowMs), account = cloneAccount(rawAccount), request = state.pending;
  if (!request) return { status: "missing", state, account };
  if (request.phase !== "completed") return { status: "not-completed", state, account, request: { ...request } };
  const amount = WELFARE_REWARD_AMOUNTS[request.kind];
  if (request.kind === "booster" && account.boosters[request.boosterKind!] >= SUPPLY_ITEMS[request.boosterKind!].maxStock) {
    return { status: "full", state, account, request: { ...request } };
  }
  if ((request.kind === "coins" && account.coins > WELFARE_COIN_CAP - amount)
    || (request.kind === "inspiration" && account.inspiration > Number.MAX_SAFE_INTEGER - amount)
    || (request.kind === "lives" && account.lifeState.lives > Number.MAX_SAFE_INTEGER - amount)) {
    return { status: "capacity", state, account, request: { ...request } };
  }
  if (request.kind === "coins") account.coins += amount;
  else if (request.kind === "inspiration") account.inspiration += amount;
  else if (request.kind === "lives") account.lifeState = grantLives(account.lifeState, amount, nowMs);
  else account.boosters[request.boosterKind!] += amount;
  if (request.dayKey === state.dayKey) state.claimed[request.kind] = Math.min(WELFARE_DAILY_LIMITS[request.kind], state.claimed[request.kind] + 1);
  state.cooldownUntilMs = 0;
  state.completedRequestIds = [...state.completedRequestIds, request.id].slice(-WELFARE_COMPLETED_LEDGER_LIMIT);
  delete state.pending;
  return { status: "rewarded", state, account, reward: { kind: request.kind, amount, requestId: request.id,
    dayKey: request.dayKey, ...(request.boosterKind ? { boosterKind: request.boosterKind } : {}) } };
}

/** Interrupted/unfilled ads can clear watching; durable completed receipts cannot be dropped here. */
export function cancelWelfareReward(value: unknown, requestId: string, nowMs: number): WelfareRewardResult {
  const state = normalizeWelfareRewards(value, nowMs);
  if (!state.pending || state.pending.id !== requestId) return { status: "missing", state };
  if (state.pending.phase === "completed") return { status: "completed-pending", state, request: { ...state.pending } };
  delete state.pending;
  return { status: "cancelled", state };
}
