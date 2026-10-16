import { describe, expect, it } from "vitest";
import {
  cancelDailyChallengeRewardAd, cloneDailyChallengeRewardAd, completeDailyChallengeRewardAd,
  confirmDailyChallengeRewardAd, consumeDailyChallengeRewardAttempt, dailyChallengeRewardAttempts,
  normalizeDailyChallengeRewardAd, prepareDailyChallengeRewardAd, type DailyChallengeRewardAdState,
} from "../src/core/dailyChallengeRewardAd";

const DAY = "2026-10-11";
const NEXT_DAY = "2026-10-12";
const NOW = Date.parse("2026-10-11T04:00:00Z");
const END = NOW + 30_000;
const ID = "daily-ad:request-1";
const empty = () => ({ version: 1 as const, dayKey: "", bonusAttempts: 0, completedRequestIds: [] });
const watch = (value: unknown = undefined, id = ID, dayKey = DAY, nowMs = NOW) =>
  prepareDailyChallengeRewardAd(value, { id, dayKey, nowMs });
const receipt = (value: unknown = undefined, id = ID, dayKey = DAY) =>
  confirmDailyChallengeRewardAd(watch(value, id, dayKey).state, id, END);
const award = (value: unknown = undefined, id = ID, dayKey = DAY) =>
  completeDailyChallengeRewardAd(receipt(value, id, dayKey).state, dayKey, END);

describe("daily challenge rewarded-ad durable receipts and bonus attempts", () => {
  it.each([undefined, null, [], 42, "corrupt"])('normalizes malformed save %j', raw => {
    expect(normalizeDailyChallengeRewardAd(raw)).toEqual(empty());
    expect(normalizeDailyChallengeRewardAd(raw, DAY)).toEqual({ ...empty(), dayKey: DAY });
  });

  it("filters invalid dates, balances, pending receipts and duplicate history", () => {
    const raw = {
      version: 99, dayKey: "2026-02-30", bonusAttempts: 12,
      completedRequestIds: [ID, ID, "bad id", 3, "another"],
      pending: { id: "pending", dayKey: "2026-02-30", startedAtMs: NOW, phase: "watching" },
    };
    expect(normalizeDailyChallengeRewardAd(raw)).toEqual({ ...empty(), completedRequestIds: [ID, "another"] });
    for (const bonusAttempts of [-1, 1.5, "4", NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      expect(normalizeDailyChallengeRewardAd({ dayKey: DAY, bonusAttempts }).bonusAttempts).toBe(0);
    }
  });

  it.each([
    { id: "bad id", dayKey: DAY, nowMs: NOW },
    { id: ID, dayKey: "2026-02-30", nowMs: NOW },
    { id: ID, dayKey: DAY, nowMs: -1 },
    { id: ID, dayKey: DAY, nowMs: 1.5 },
  ])("rejects invalid prepare input %j", options => {
    const result = prepareDailyChallengeRewardAd(undefined, options);
    expect(result.status).toBe("invalid-request");
    expect(result.state.pending).toBeUndefined();
  });

  it("locks a pending offer to its identity and originating day", () => {
    const baseline = normalizeDailyChallengeRewardAd(undefined, DAY);
    const prepared = watch(baseline);
    expect(prepared).toMatchObject({ status: "prepared", request: { id: ID, dayKey: DAY, phase: "watching" } });
    expect(watch(prepared.state, "second")).toMatchObject({ status: "busy", request: prepared.request });
    expect(baseline).toEqual({ ...empty(), dayKey: DAY });
  });

  it("requires the matching native completion, and repeated confirmation preserves its receipt", () => {
    const pending = watch().state;
    expect(completeDailyChallengeRewardAd(pending, DAY, END)).toMatchObject({ status: "not-completed", state: { bonusAttempts: 0 } });
    expect(confirmDailyChallengeRewardAd(pending, "wrong", END).status).toBe("missing");
    expect(confirmDailyChallengeRewardAd(pending, ID, NaN).status).toBe("invalid-request");
    const confirmed = confirmDailyChallengeRewardAd(pending, ID, END);
    expect(confirmed).toMatchObject({ status: "confirmed", request: { completedAtMs: END, phase: "completed" } });
    expect(confirmDailyChallengeRewardAd(confirmed.state, ID, END + 50)).toEqual(confirmed);
  });

  it("grants one independent bonus attempt and blocks a repeated request ID", () => {
    const confirmed = receipt().state;
    const baseline = structuredClone(confirmed);
    const result = completeDailyChallengeRewardAd(confirmed, DAY, END);
    expect(result).toMatchObject({ status: "rewarded", amount: 1 });
    expect(result.state).toEqual({ version: 1, dayKey: DAY, bonusAttempts: 1, completedRequestIds: [ID] });
    expect(confirmed).toEqual(baseline);
    expect(completeDailyChallengeRewardAd(result.state, DAY, END + 1)).toMatchObject({ status: "missing", state: { bonusAttempts: 1 } });
    expect(watch(result.state).status).toBe("duplicate");
    expect(confirmDailyChallengeRewardAd(result.state, ID, END).status).toBe("duplicate");
  });

  it("cancels an incomplete video without rewarding, but retains completed receipts", () => {
    const watching = watch().state;
    expect(cancelDailyChallengeRewardAd(watching, "wrong").status).toBe("missing");
    const cancelled = cancelDailyChallengeRewardAd(watching, ID);
    expect(cancelled).toEqual({ status: "cancelled", state: { ...empty(), dayKey: DAY } });
    expect(confirmDailyChallengeRewardAd(cancelled.state, ID, END).status).toBe("missing");
    const confirmed = receipt().state;
    const attemptedCancellation = cancelDailyChallengeRewardAd(confirmed, ID);
    expect(attemptedCancellation.status).toBe("completed-pending");
    expect(completeDailyChallengeRewardAd(attemptedCancellation.state, DAY, END).status).toBe("rewarded");
  });

  it("consumes a rewarded attempt once without mutating the prior saved state", () => {
    const rewarded = award().state;
    expect(dailyChallengeRewardAttempts(rewarded, DAY)).toBe(1);
    const consumed = consumeDailyChallengeRewardAttempt(rewarded, DAY);
    expect(consumed).toMatchObject({ accepted: true, attemptsRemaining: 0, state: { bonusAttempts: 0 } });
    expect(rewarded.bonusAttempts).toBe(1);
    expect(consumeDailyChallengeRewardAttempt(consumed.state, DAY)).toMatchObject({ accepted: false, attemptsRemaining: 0 });
    expect(consumed.state.completedRequestIds).toEqual([ID]);
    expect(watch(consumed.state).status).toBe("duplicate");
  });

  it("resets unused old-day bonuses and preserves the paid receipt and duplicate ledger", () => {
    const first = award().state;
    const secondReceipt = receipt(first, "second").state;
    const nextDay = normalizeDailyChallengeRewardAd(secondReceipt, NEXT_DAY);
    expect(nextDay).toMatchObject({ dayKey: NEXT_DAY, bonusAttempts: 0, completedRequestIds: [ID], pending: { id: "second", dayKey: DAY } });
    // A finished video straddling midnight remains a reward on the canonical
    // settlement day, rather than disappearing with the old daily balance.
    const nextReward = completeDailyChallengeRewardAd(nextDay, NEXT_DAY, END + 86_400_000);
    expect(nextReward).toMatchObject({ status: "rewarded", amount: 1, state: { dayKey: NEXT_DAY, bonusAttempts: 1 } });
    expect(nextReward.state.completedRequestIds).toEqual([ID, "second"]);
  });

  it("drops an unfinished watch after midnight so it cannot block today's offer", () => {
    const watching = watch().state;
    const nextDay = normalizeDailyChallengeRewardAd(watching, NEXT_DAY);
    expect(nextDay).toMatchObject({ dayKey: NEXT_DAY, bonusAttempts: 0 });
    expect(nextDay.pending).toBeUndefined();
    expect(watch(nextDay, "today", NEXT_DAY).status).toBe("prepared");
  });

  it("does not restore bonus attempts by rolling the clock or requested day backwards", () => {
    const tomorrow = award(undefined, ID, NEXT_DAY).state;
    expect(normalizeDailyChallengeRewardAd(tomorrow, DAY)).toEqual(tomorrow);
    expect(dailyChallengeRewardAttempts(tomorrow, DAY)).toBe(0);
    expect(consumeDailyChallengeRewardAttempt(tomorrow, DAY)).toMatchObject({ accepted: false, state: tomorrow });
    expect(watch(tomorrow, "older", DAY).status).toBe("invalid-request");
    const pending = receipt(tomorrow, "new", NEXT_DAY).state;
    expect(completeDailyChallengeRewardAd(pending, DAY, END)).toMatchObject({ status: "invalid-request", state: pending });
  });

  it("protects an old pending duplicate before trimming the 256-ID ledger", () => {
    const raw = { ...receipt().state, completedRequestIds: [ID, ...Array.from({ length: 400 }, (_, i) => `done-${i}`)] };
    const state = normalizeDailyChallengeRewardAd(raw);
    expect(state.completedRequestIds).toHaveLength(256);
    expect(state.pending).toBeUndefined();
    expect(completeDailyChallengeRewardAd(state, DAY, END)).toMatchObject({ status: "missing", state: { bonusAttempts: 0 } });
  });

  it("keeps bounded history across repeated rewarded attempts and their consumption", () => {
    let state: DailyChallengeRewardAdState = normalizeDailyChallengeRewardAd(undefined, DAY);
    for (let i = 0; i < 270; i++) {
      const result = award(state, `claim-${i}`);
      expect(result.status).toBe("rewarded");
      state = consumeDailyChallengeRewardAttempt(result.state, DAY).state;
    }
    expect(state.bonusAttempts).toBe(0);
    expect(state.completedRequestIds).toHaveLength(256);
    expect(state.completedRequestIds[0]).toBe("claim-14");
    expect(watch(state, "claim-269").status).toBe("duplicate");
  });

  it("clones each mutable branch and keeps confirmed receipt safe at numeric capacity", () => {
    const original = receipt({ dayKey: DAY, bonusAttempts: Number.MAX_SAFE_INTEGER, completedRequestIds: ["before"] }).state;
    const cloned = cloneDailyChallengeRewardAd(original);
    expect(cloned).toEqual(original);
    expect(cloned.pending).not.toBe(original.pending);
    expect(cloned.completedRequestIds).not.toBe(original.completedRequestIds);
    cloned.completedRequestIds.push("other");
    cloned.pending!.phase = "watching";
    expect(original.pending?.phase).toBe("completed");
    expect(original.completedRequestIds).toEqual(["before"]);
    expect(completeDailyChallengeRewardAd(original, DAY, END)).toMatchObject({ status: "full", state: original });
  });
});
