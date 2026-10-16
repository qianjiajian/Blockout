import { describe, expect, it } from "vitest";
import { createDefaultLifeState } from "../src/core/lives";
import {
  cancelWelfareReward, cloneWelfareRewards, completeWelfareReward, confirmWelfareAdCompletion,
  deriveWelfareRewards, normalizeWelfareRewards, prepareWelfareReward, welfareDayKey,
  WELFARE_COIN_CAP, WELFARE_COMPLETED_LEDGER_LIMIT, WELFARE_COOLDOWN_MS,
  WELFARE_DAILY_LIMITS, WELFARE_REWARD_KINDS, type WelfareRewardAccount, type WelfareRewardKind, type WelfareRewardState,
} from "../src/core/welfareRewards";

const NOW = Date.parse("2026-10-10T04:00:00Z");
const MIDNIGHT = Date.parse("2026-10-10T16:00:00Z");
const account = (overrides: Partial<WelfareRewardAccount> = {}): WelfareRewardAccount => ({
  coins: 120, inspiration: 39, lifeState: { ...createDefaultLifeState(), lives: 3, nextLifeAtMs: NOW + 1_800_000 },
  boosters: { time: 3, rocket: 3, pulse: 3 }, unlockedBoosters: ["time", "rocket", "pulse"], ...overrides,
});
const watch = (kind: WelfareRewardKind = "coins", nowMs = NOW, value: unknown = undefined,
  assets = account(), id = "request-1") => prepareWelfareReward(value, assets,
  { id, kind, nowMs, ...(kind === "booster" ? { boosterKind: "rocket" as const } : {}) });
const receipt = (kind: WelfareRewardKind = "coins", nowMs = NOW, value: unknown = undefined,
  assets = account(), id = "request-1") => confirmWelfareAdCompletion(watch(kind, nowMs, value, assets, id).state, id, nowMs + 10_000);

describe("welfare reward save normalization and Beijing day boundaries", () => {
  it("defaults an old save without changing the caller's account", () => {
    const assets = account(), before = structuredClone(assets);
    const view = deriveWelfareRewards(undefined, assets, NOW);
    expect(view.state).toEqual({ version: 1, dayKey: "2026-10-10", maxObservedDayKey: "2026-10-10",
      claimed: { inspiration: 0, coins: 0, lives: 0, booster: 0 }, cooldownUntilMs: 0, completedRequestIds: [] });
    expect(WELFARE_DAILY_LIMITS).toEqual({ inspiration: 3, coins: 3, lives: 3, booster: 10 });
    expect(Object.values(view.cards).every(card => card.available)).toBe(true);
    expect(Object.fromEntries(Object.entries(view.cards).map(([kind, card]) => [kind, card.remaining])))
      .toEqual({ inspiration: 3, coins: 3, lives: 3, booster: 10 });
    expect(view.cards.inspiration.amount).toBe(50);
    expect(assets).toEqual(before);
  });

  it("refreshes exactly at Beijing midnight and never refreshes on clock rollback", () => {
    expect(welfareDayKey(MIDNIGHT - 1)).toBe("2026-10-10");
    expect(welfareDayKey(MIDNIGHT)).toBe("2026-10-11");
    const state = normalizeWelfareRewards(undefined, MIDNIGHT - 1);
    state.claimed.coins = 3;
    const tomorrow = normalizeWelfareRewards(state, MIDNIGHT);
    expect(tomorrow.claimed.coins).toBe(0);
    tomorrow.claimed.coins = 3;
    const rollback = normalizeWelfareRewards(tomorrow, MIDNIGHT - 86_400_000);
    expect(rollback.dayKey).toBe("2026-10-11");
    expect(rollback.claimed.coins).toBe(3);
    expect(watch("coins", MIDNIGHT - 86_400_000, rollback).status).toBe("daily-limit");
  });

  it("sanitizes untrusted save fields and owns all cloned nested objects", () => {
    const raw = { version: 100, dayKey: "bad", maxObservedDayKey: "2026-02-31",
      claimed: { coins: -3, inspiration: 9, lives: Number.NaN, booster: 1.8 }, cooldownUntilMs: Infinity,
      completedRequestIds: ["ok", "ok", {}, "a b", "valid:id"], pending: { id: "broken" } };
    const state = normalizeWelfareRewards(raw, NOW);
    expect(state.claimed).toEqual({ coins: 0, inspiration: 3, lives: 0, booster: 1 });
    expect(state.completedRequestIds).toEqual(["ok", "valid:id"]);
    expect(state.pending).toBeUndefined(); expect(state.cooldownUntilMs).toBe(0);
    state.claimed.booster = 2; state.completedRequestIds.push("new");
    expect(raw.claimed.booster).toBe(1.8); expect(raw.completedRequestIds).toHaveLength(5);
  });

  it.each([2, 3, 9, 10])("preserves %i already claimed boosters through reload without restoring old quota", claimed => {
    const state = normalizeWelfareRewards(undefined, NOW);
    state.claimed.booster = claimed;
    const reloaded = normalizeWelfareRewards(JSON.parse(JSON.stringify(state)), NOW + 1000);
    expect(reloaded.claimed.booster).toBe(claimed);
    expect(deriveWelfareRewards(reloaded, account(), NOW + 1000).cards.booster.remaining).toBe(10 - claimed);
    expect(state.claimed.booster).toBe(claimed);
  });

  it("clamps booster counts at ten, resets ten at Beijing midnight, and rejects rollback refresh", () => {
    const state = normalizeWelfareRewards(undefined, MIDNIGHT - 1000);
    state.claimed = { inspiration: 20, coins: 20, lives: 20, booster: 20 };
    const exhausted = normalizeWelfareRewards(state, MIDNIGHT - 1);
    expect(exhausted.claimed).toEqual({ inspiration: 3, coins: 3, lives: 3, booster: 10 });
    expect(deriveWelfareRewards(exhausted, account(), MIDNIGHT - 1).cards.booster.remaining).toBe(0);
    const refreshed = normalizeWelfareRewards(exhausted, MIDNIGHT);
    expect(deriveWelfareRewards(refreshed, account(), MIDNIGHT).cards.booster.remaining).toBe(10);
    refreshed.claimed.booster = 3;
    const rollback = normalizeWelfareRewards(refreshed, MIDNIGHT - 1000);
    expect(rollback.dayKey).toBe("2026-10-11");
    expect(deriveWelfareRewards(rollback, account(), MIDNIGHT - 1000).cards.booster.remaining).toBe(7);
  });

  it("clones a pending candidate without applying any new day or time", () => {
    const state = receipt().state, before = structuredClone(state), cloned = cloneWelfareRewards(state);
    expect(cloned).toEqual(before); expect(cloned).not.toBe(state);
    expect(cloned.pending).not.toBe(state.pending); expect(cloned.claimed).not.toBe(state.claimed);
    cloned.pending!.completedAtMs = 0; cloned.claimed.coins = 2; cloned.completedRequestIds.push("other");
    expect(state).toEqual(before);
  });

  it("bounds duplicate history and refuses to resurrect an already fulfilled pending request", () => {
    const state = receipt().state;
    state.completedRequestIds = [state.pending!.id, ...Array.from({ length: 400 }, (_, index) => `done-${index}`)];
    const result = normalizeWelfareRewards(state, NOW);
    expect(result.completedRequestIds).toHaveLength(WELFARE_COMPLETED_LEDGER_LIMIT);
    expect(result.pending).toBeUndefined();
  });
});

describe("welfare ad preparation and eligibility", () => {
  it.each(WELFARE_REWARD_KINDS)("locks the %s request without consuming anything before completion", kind => {
    const assets = account(), original = structuredClone(assets), result = watch(kind, NOW, undefined, assets);
    expect(result.status).toBe("prepared");
    expect(result.request).toMatchObject({ id: "request-1", kind, dayKey: "2026-10-10", phase: "watching", startedAtMs: NOW });
    expect(Object.values(result.state.claimed)).toEqual([0, 0, 0, 0]); expect(result.state.cooldownUntilMs).toBe(0);
    expect(assets).toEqual(original);
    expect(completeWelfareReward(result.state, assets, NOW).status).toBe("not-completed");
    expect(watch("inspiration", NOW, result.state, assets, "another").status).toBe("busy");
  });

  it("uses shared booster quota but independent quotas for the four categories", () => {
    let state = normalizeWelfareRewards(undefined, NOW), assets = account(), now = NOW;
    for (let index = 0; index < 10; index += 1) {
      const id = `shared-${index}`, boosterKind = (["time", "rocket", "pulse"] as const)[index % 3];
      const prepared = prepareWelfareReward(state, assets, { id, kind: "booster", boosterKind, nowMs: now });
      expect(prepared.status).toBe("prepared");
      const reward = completeWelfareReward(confirmWelfareAdCompletion(prepared.state, id, now).state, assets, now);
      expect(reward.status).toBe("rewarded");
      state = reward.state; assets = reward.account; now += WELFARE_COOLDOWN_MS;
      expect(state.claimed.booster).toBe(index + 1);
      expect(deriveWelfareRewards(state, assets, now).cards.booster.remaining).toBe(9 - index);
    }
    expect(assets.boosters).toEqual({ time: 7, rocket: 6, pulse: 6 });
    expect(state.claimed.booster).toBe(10);
    for (const boosterKind of ["time", "rocket", "pulse"] as const) {
      expect(prepareWelfareReward(state, assets, { id: `${boosterKind}-eleventh`, kind: "booster", boosterKind, nowMs: now }).status)
        .toBe("daily-limit");
    }
    const view = deriveWelfareRewards(state, assets, now);
    expect(view.cards.booster.remaining).toBe(0);
    for (const kind of ["inspiration", "coins", "lives"] as const) {
      expect(view.cards[kind].remaining).toBe(3); expect(view.cards[kind].available).toBe(true);
    }
  });

  it("rejects locked/full selections while exposing the remaining eligible booster choices", () => {
    const assets = account({ boosters: { time: 9, rocket: 8, pulse: 0 }, unlockedBoosters: ["time", "rocket"] });
    const view = deriveWelfareRewards(undefined, assets, NOW);
    expect(view.cards.booster.available).toBe(true);
    expect(view.boosterChoices).toEqual({ time: { available: false, status: "full" },
      rocket: { available: true, status: "available" }, pulse: { available: false, status: "locked" } });
    expect(prepareWelfareReward(undefined, assets, { id: "locked", kind: "booster", boosterKind: "pulse", nowMs: NOW }).status).toBe("locked");
    expect(prepareWelfareReward(undefined, assets, { id: "full", kind: "booster", boosterKind: "time", nowMs: NOW }).status).toBe("full");
    expect(prepareWelfareReward(undefined, assets, { id: "no-selection", kind: "booster", nowMs: NOW }).status).toBe("invalid-request");
  });

  it("allows naturally full lives while still checking full coin reward capacity", () => {
    const assets = account({ lifeState: { lives: 4, nextLifeAtMs: NOW, unlimitedLivesUntilMs: 0 }, coins: WELFARE_COIN_CAP - 99 });
    expect(watch("lives", NOW, undefined, assets).status).toBe("prepared");
    expect(watch("coins", NOW, undefined, assets).status).toBe("full");
    assets.coins = WELFARE_COIN_CAP - 100;
    expect(watch("coins", NOW, undefined, assets).status).toBe("prepared");
  });

  it.each([5, 6, 12])("grants one extra life when starting an ad with %i lives", lives => {
    const assets = account({ lifeState: { lives, nextLifeAtMs: 0, unlimitedLivesUntilMs: 0 } });
    const prepared = watch("lives", NOW, undefined, assets);
    expect(prepared.status).toBe("prepared");
    const receipt = confirmWelfareAdCompletion(prepared.state, "request-1", NOW + 10_000);
    const result = completeWelfareReward(receipt.state, assets, NOW + 10_000);
    expect(result.status).toBe("rewarded");
    expect(result.account.lifeState).toEqual({ lives: lives + 1, nextLifeAtMs: 0, unlimitedLivesUntilMs: 0 });
    expect(result.state.claimed.lives).toBe(1);
  });

  it.each(["", "id with spaces", "x".repeat(129)])("rejects invalid request id %s", id => {
    expect(watch("coins", NOW, undefined, account(), id).status).toBe("invalid-request");
  });

  it("cancels an interrupted watching request with no quota, reward or cooldown", () => {
    const result = cancelWelfareReward(watch().state, "request-1", NOW + 9000);
    expect(result.status).toBe("cancelled"); expect(result.state.pending).toBeUndefined();
    expect(result.state.claimed.coins).toBe(0); expect(result.state.cooldownUntilMs).toBe(0);
    expect(confirmWelfareAdCompletion(result.state, "request-1", NOW + 10_000).status).toBe("missing");
    expect(watch("coins", NOW + 10_000, result.state, account(), "fresh-request").status).toBe("prepared");
  });
});

describe("welfare completed receipt and atomic reward candidate", () => {
  it.each([["inspiration", 50], ["coins", 100], ["lives", 1], ["booster", 1]] as const)("grants %s once with its counter and no cooldown", (kind, amount) => {
    const assets = account(), original = structuredClone(assets), completed = receipt(kind), receiptBefore = structuredClone(completed.state);
    expect(completed.status).toBe("confirmed"); expect(completed.state.claimed[kind]).toBe(0);
    expect(completed.state.cooldownUntilMs).toBe(0); expect(completed.state.pending?.phase).toBe("completed");
    const result = completeWelfareReward(completed.state, assets, NOW + 11_000);
    expect(result.status).toBe("rewarded"); expect(result.reward).toMatchObject({ kind, amount, requestId: "request-1" });
    expect(result.state.claimed[kind]).toBe(1); expect(result.state.cooldownUntilMs).toBe(0);
    expect(result.state.pending).toBeUndefined(); expect(result.state.completedRequestIds).toEqual(["request-1"]);
    const expected = structuredClone(assets);
    if (kind === "booster") expected.boosters.rocket += 1;
    else if (kind === "lives") expected.lifeState.lives += 1;
    else expected[kind] += amount;
    expect(result.account).toEqual(expected);
    expect(completed.state).toEqual(receiptBefore); expect(assets).toEqual(original);
    expect(completeWelfareReward(result.state, result.account, NOW + 12_000).account).toEqual(result.account);
    expect(confirmWelfareAdCompletion(result.state, "request-1", NOW + 12_000).status).toBe("duplicate");
    expect(watch(kind, NOW + 120_000, result.state, result.account).status).toBe("duplicate");
    expect(deriveWelfareRewards(result.state, result.account, NOW + 11_000).cards.inspiration.status).toBe("available");
  });

  it("ignores a legacy future cooldown without resetting daily counts or completion ids", () => {
    const old = { ...normalizeWelfareRewards(undefined, NOW), claimed: { inspiration: 1, coins: 2, lives: 0, booster: 0 },
      completedRequestIds: ["old-request"], cooldownUntilMs: NOW + 86_400_000 };
    const summary = deriveWelfareRewards(old, account(), NOW);
    expect(summary.cooldownRemainingMs).toBe(0);
    expect(summary.state.cooldownUntilMs).toBe(0);
    expect(summary.state.claimed).toEqual(old.claimed);
    expect(summary.state.completedRequestIds).toEqual(old.completedRequestIds);
    expect(summary.cards.coins.status).toBe("available");
    expect(summary.cards.coins.remaining).toBe(1);
    expect(summary.cards.inspiration.status).toBe("available");
    expect(watch("lives", NOW, old, account()).status).toBe("prepared");
  });

  it("preserves the first completion timestamp through duplicate callbacks and delayed saving", () => {
    const first = receipt(), again = confirmWelfareAdCompletion(first.state, "request-1", NOW + 200_000);
    expect(again.state.pending?.completedAtMs).toBe(NOW + 10_000);
    const result = completeWelfareReward(again.state, account(), NOW + 300_000);
    expect(result.state.cooldownUntilMs).toBe(0);
    expect(deriveWelfareRewards(result.state, result.account, NOW + 300_000).cooldownRemainingMs).toBe(0);
    expect(cancelWelfareReward(first.state, "request-1", NOW).status).toBe("completed-pending");
  });

  it("anchors a rolled-back completion proof without introducing a cooldown", () => {
    const watching = watch().state;
    const completed = confirmWelfareAdCompletion(watching, "request-1", NOW - 3_600_000);
    expect(completed.state.pending?.completedAtMs).toBe(NOW);
    const result = completeWelfareReward(completed.state, account(), NOW - 3_599_000);
    expect(result.state.cooldownUntilMs).toBe(0);
    expect(deriveWelfareRewards(result.state, result.account, NOW).cooldownRemainingMs).toBe(WELFARE_COOLDOWN_MS);
    const legacy = { ...completed.state, pending: { ...completed.state.pending!, completedAtMs: NOW - 3_600_000 } };
    expect(normalizeWelfareRewards(legacy, NOW).pending?.completedAtMs).toBe(NOW);
  });

  it("permits nineteen consecutive claims without cooldown, ten shared boosters and three of each other category", () => {
    let state: WelfareRewardState = normalizeWelfareRewards(undefined, NOW), assets = account(), now = NOW;
    for (const kind of WELFARE_REWARD_KINDS) {
      for (let index = 0; index < WELFARE_DAILY_LIMITS[kind]; index += 1) {
        const id = `${kind}-${index}`, prepared = prepareWelfareReward(state, assets,
          { id, kind, nowMs: now, ...(kind === "booster" ? { boosterKind: (["time", "rocket", "pulse"] as const)[index % 3] } : {}) });
        expect(prepared.status).toBe("prepared");
        const result = completeWelfareReward(confirmWelfareAdCompletion(prepared.state, id, now).state, assets, now);
        expect(result.status).toBe("rewarded");
        state = result.state; assets = result.account; now += WELFARE_COOLDOWN_MS;
      }
      expect(watch(kind, now, state, assets, `${kind}-extra`).status).toBe("daily-limit");
    }
    expect(state.claimed).toEqual({ inspiration: 3, coins: 3, lives: 3, booster: 10 });
    expect(state.completedRequestIds).toHaveLength(19);
    expect(assets.inspiration).toBe(189); expect(assets.coins).toBe(420);
    expect(assets.lifeState.lives).toBe(6); expect(assets.boosters).toEqual({ time: 7, rocket: 6, pulse: 6 });
  });

  it.each([["inspiration", 50], ["coins", 100], ["lives", 1]] as const)(
    "keeps two old %s claims, grants only a third, and preserves exhaustion through reload", (kind, amount) => {
      const old = normalizeWelfareRewards(undefined, NOW), assets = account(), originalAssets = structuredClone(assets);
      old.claimed[kind] = 2;
      old.completedRequestIds = [`${kind}-first`, `${kind}-second`];
      const originalState = structuredClone(old), loaded = normalizeWelfareRewards(JSON.parse(JSON.stringify(old)), NOW);
      expect(loaded.claimed[kind]).toBe(2);
      expect(deriveWelfareRewards(loaded, assets, NOW).cards[kind]).toMatchObject({ remaining: 1, available: true });
      const id = `${kind}-third`, prepared = watch(kind, NOW, loaded, assets, id);
      expect(prepared.status).toBe("prepared");
      const result = completeWelfareReward(confirmWelfareAdCompletion(prepared.state, id, NOW).state, assets, NOW);
      expect(result.status).toBe("rewarded");
      expect(result.reward).toMatchObject({ kind, amount, requestId: id });
      const expectedAccount = structuredClone(assets);
      if (kind === "lives") expectedAccount.lifeState.lives += amount;
      else expectedAccount[kind] += amount;
      expect(result.account).toEqual(expectedAccount);
      const reloaded = normalizeWelfareRewards(JSON.parse(JSON.stringify(result.state)), NOW + 1000);
      expect(reloaded.claimed[kind]).toBe(3);
      expect(reloaded.completedRequestIds).toEqual([...originalState.completedRequestIds, id]);
      expect(deriveWelfareRewards(reloaded, result.account, NOW + 1000).cards[kind])
        .toMatchObject({ remaining: 0, available: false, status: "daily-limit" });
      expect(watch(kind, NOW + 1000, reloaded, result.account, `${kind}-fourth`).status).toBe("daily-limit");
      expect(confirmWelfareAdCompletion(reloaded, id, NOW + 1000).status).toBe("duplicate");
      expect(completeWelfareReward(reloaded, result.account, NOW + 1000).account).toEqual(expectedAccount);
      expect(deriveWelfareRewards(reloaded, result.account, NOW + 1000).cards.booster.remaining).toBe(10);
      expect(deriveWelfareRewards(reloaded, result.account, MIDNIGHT).cards[kind].remaining).toBe(3);
      expect(old).toEqual(originalState); expect(assets).toEqual(originalAssets);
    });

  it("preserves a durable completed receipt through normalization/reload without auto-paying a watching one", () => {
    const loadedReceipt = normalizeWelfareRewards(JSON.parse(JSON.stringify(receipt().state)), NOW + 30_000);
    expect(completeWelfareReward(loadedReceipt, account(), NOW + 30_000).account.coins).toBe(220);
    const loadedWatching = normalizeWelfareRewards(JSON.parse(JSON.stringify(watch().state)), NOW + 30_000);
    expect(completeWelfareReward(loadedWatching, account(), NOW + 30_000).status).toBe("not-completed");
    expect(cancelWelfareReward(loadedWatching, "request-1", NOW + 30_000).status).toBe("cancelled");
  });

  it("settles a request across Beijing midnight without consuming the new day's allowance", () => {
    const assets = account(), started = watch("coins", MIDNIGHT - 2000, undefined, assets);
    const completed = confirmWelfareAdCompletion(started.state, "request-1", MIDNIGHT + 5000);
    expect(completed.state.pending?.dayKey).toBe("2026-10-10");
    expect(completed.state.dayKey).toBe("2026-10-11");
    const result = completeWelfareReward(completed.state, assets, MIDNIGHT + 6000);
    expect(result.account.coins).toBe(220); expect(result.state.claimed.coins).toBe(0);
    expect(result.state.cooldownUntilMs).toBe(0);
    const newRequest = watch("coins", MIDNIGHT + 65_000, result.state, result.account, "new-day-request");
    expect(newRequest.status).toBe("prepared"); expect(newRequest.request?.dayKey).toBe("2026-10-11");
    const rolledBack = normalizeWelfareRewards(result.state, MIDNIGHT - 1000);
    expect(rolledBack.dayKey).toBe("2026-10-11");
  });

  it("locks the monotonic day even when a request begins during clock rollback", () => {
    const future = normalizeWelfareRewards(undefined, MIDNIGHT + 1000);
    const prepared = watch("coins", NOW, future);
    expect(prepared.request?.dayKey).toBe("2026-10-11");
    const result = completeWelfareReward(confirmWelfareAdCompletion(prepared.state, "request-1", NOW + 10_000).state, account(), NOW + 20_000);
    expect(result.state.claimed.coins).toBe(1); expect(result.state.dayKey).toBe("2026-10-11");
  });

  it("honours the promised life even if recovery fills the meter during the ad", () => {
    const assets = account({ lifeState: { lives: 4, nextLifeAtMs: NOW + 5000, unlimitedLivesUntilMs: 0 } });
    const prepared = watch("lives", NOW, undefined, assets);
    expect(prepared.status).toBe("prepared");
    const result = completeWelfareReward(confirmWelfareAdCompletion(prepared.state, "request-1", NOW + 10_000).state, assets, NOW + 12_000);
    expect(result.account.lifeState).toEqual({ lives: 6, nextLifeAtMs: 0, unlimitedLivesUntilMs: 0 });
    expect(result.state.claimed.lives).toBe(1);
  });

  it("never redirects a selected booster, and retains a completed receipt if its stock changes to full", () => {
    const completed = receipt("booster");
    const assets = account({ boosters: { time: 0, rocket: 9, pulse: 0 } });
    const blocked = completeWelfareReward(completed.state, assets, NOW + 12_000);
    expect(blocked.status).toBe("full"); expect(blocked.state.pending).toEqual(completed.state.pending);
    expect(blocked.account).toEqual(assets); expect(blocked.state.claimed.booster).toBe(0);
    assets.boosters.rocket = 8;
    const granted = completeWelfareReward(blocked.state, assets, NOW + 15_000);
    expect(granted.account.boosters).toEqual({ time: 0, rocket: 9, pulse: 0 });
  });

  it("preserves receipt on a changed balance that cannot hold the full reward", () => {
    const completed = receipt(), assets = account({ coins: WELFARE_COIN_CAP - 99 });
    const result = completeWelfareReward(completed.state, assets, NOW + 12_000);
    expect(result.status).toBe("capacity"); expect(result.state.pending).toEqual(completed.state.pending);
    expect(result.state.claimed.coins).toBe(0); expect(result.state.cooldownUntilMs).toBe(0);
    expect(result.account.coins).toBe(assets.coins);
  });

  it("does not accept completion or cancellation for another request", () => {
    const state = watch().state;
    expect(confirmWelfareAdCompletion(state, "stale-id", NOW).status).toBe("missing");
    expect(cancelWelfareReward(state, "stale-id", NOW).state.pending?.id).toBe("request-1");
    expect(confirmWelfareAdCompletion(state, "request-1", Number.NaN).status).toBe("invalid-request");
  });
});
