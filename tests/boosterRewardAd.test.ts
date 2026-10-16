import { describe, expect, it } from "vitest";
import {
  cancelBoosterRewardAd, cloneBoosterRewardAd, completeBoosterRewardAd,
  confirmBoosterRewardAd, normalizeBoosterRewardAd, prepareBoosterRewardAd,
  type BoosterRewardAdState,
} from "../src/core/boosterRewardAd";
import { SUPPLY_ITEMS, type SupplyKind } from "../src/core/supply";

const NOW = Date.parse("2026-10-11T04:00:00Z");
const END = NOW + 30_000;
const ID = "booster-ad:request-1";
const watch = (value: unknown = undefined, id = ID, kind: SupplyKind = "time", nowMs = NOW) =>
  prepareBoosterRewardAd(value, { id, kind, nowMs });
const receipt = (value: unknown = undefined, id = ID, kind: SupplyKind = "time") =>
  confirmBoosterRewardAd(watch(value, id, kind).state, id, END);

describe("booster rewarded-ad durable receipts", () => {
  it.each([undefined, null, [], 42, "corrupt"])('normalizes malformed save %j', raw => {
    const state = normalizeBoosterRewardAd(raw);
    expect(state).toEqual({ version: 1, completedRequestIds: [] });
    expect(completeBoosterRewardAd(state, 0, NOW)).toMatchObject({ status: "missing", stock: 0 });
  });

  it("filters malformed and duplicate history without mutating the source", () => {
    const raw = {
      version: 99,
      completedRequestIds: ["done:1", "done:1", "a b", "", "x".repeat(129), 3, null, "done:2"],
      pending: { id: "invalid id", kind: "time", startedAtMs: NOW, phase: "watching" },
    };
    const before = structuredClone(raw);
    expect(normalizeBoosterRewardAd(raw)).toEqual({ version: 1, completedRequestIds: ["done:1", "done:2"] });
    expect(raw).toEqual(before);
  });

  it.each([
    { id: "invalid id", kind: "time", startedAtMs: NOW },
    { id: ID, kind: "invalid", startedAtMs: NOW },
    { id: ID, kind: "time", startedAtMs: -1 },
    { id: ID, kind: "time", startedAtMs: 1.5 },
  ])("rejects invalid prepare input %j", input => {
    const result = prepareBoosterRewardAd(undefined, input as never);
    expect(result.status).toBe("invalid-request");
    expect(result.state.pending).toBeUndefined();
  });

  it("locks the pending offer and retains the requested kind", () => {
    const base = normalizeBoosterRewardAd(undefined);
    const prepared = watch(base, ID, "pulse");
    expect(prepared.status).toBe("prepared");
    expect(prepared.request).toEqual({ id: ID, kind: "pulse", startedAtMs: NOW, phase: "watching" });
    expect(watch(prepared.state, "another", "rocket")).toMatchObject({ status: "busy", request: prepared.request });
    expect(watch(prepared.state, ID, "pulse").status).toBe("busy");
    expect(base).toEqual({ version: 1, completedRequestIds: [] });
  });

  it("requires the matching completed receipt", () => {
    const watching = watch(undefined, ID, "rocket").state;
    expect(completeBoosterRewardAd(watching, 0, END)).toMatchObject({ status: "not-completed", stock: 0 });
    expect(confirmBoosterRewardAd(watching, "other", END).status).toBe("missing");
    const confirmed = confirmBoosterRewardAd(watching, ID, END);
    expect(confirmed.status).toBe("confirmed");
    expect(confirmed.state.pending).toMatchObject({ kind: "rocket", phase: "completed", completedAtMs: END });
    const repeated = confirmBoosterRewardAd(confirmed.state, ID, END + 99);
    expect(repeated).toEqual(confirmed);
  });

  it.each(["time", "rocket", "pulse"] as SupplyKind[])('rewards one %s and only that stock', kind => {
    const confirmed = receipt(undefined, ID, kind).state;
    const before = structuredClone(confirmed);
    const result = completeBoosterRewardAd(confirmed, 0, END);
    expect(result).toMatchObject({ status: "rewarded", amount: 1, stock: 1 });
    expect(result.state).toEqual({ version: 1, completedRequestIds: [ID] });
    expect(confirmed).toEqual(before);
    expect(completeBoosterRewardAd(result.state, result.stock, END + 1).status).toBe("missing");
    expect(watch(result.state, ID, kind).status).toBe("duplicate");
  });

  it("never exceeds the item stock cap and keeps a completed receipt for retry", () => {
    const confirmed = receipt(undefined, ID, "rocket").state;
    const result = completeBoosterRewardAd(confirmed, SUPPLY_ITEMS.rocket.maxStock, END);
    expect(result.status).toBe("full");
    expect(result.stock).toBe(SUPPLY_ITEMS.rocket.maxStock);
    expect(result.state.pending?.phase).toBe("completed");
    expect(result.state.completedRequestIds).not.toContain(ID);
  });

  it("cancels an incomplete request but never cancels a completed receipt", () => {
    const watching = watch(undefined, ID, "time").state;
    expect(cancelBoosterRewardAd(watching, "other").status).toBe("missing");
    const cancelled = cancelBoosterRewardAd(watching, ID);
    expect(cancelled).toEqual({ status: "cancelled", state: { version: 1, completedRequestIds: [] } });
    expect(confirmBoosterRewardAd(cancelled.state, ID, END).status).toBe("missing");

    const completed = receipt(undefined, "completed:1", "pulse").state;
    const lateCancel = cancelBoosterRewardAd(completed, "completed:1");
    expect(lateCancel.status).toBe("completed-pending");
    expect(completeBoosterRewardAd(lateCancel.state, 0, END).status).toBe("rewarded");
  });

  it("protects a pending old ID before trimming the bounded history", () => {
    const state = {
      completedRequestIds: [ID, ...Array.from({ length: 400 }, (_, index) => `done-${index}`)],
      pending: { id: ID, kind: "time", startedAtMs: NOW, phase: "completed", completedAtMs: END },
    };
    const normalized = normalizeBoosterRewardAd(state);
    expect(normalized.pending).toBeUndefined();
    expect(completeBoosterRewardAd(normalized, 0, END).status).toBe("missing");
  });

  it("bounds history while retaining recent duplicate protection", () => {
    let state: BoosterRewardAdState = normalizeBoosterRewardAd(undefined);
    for (let index = 0; index < 270; index++) {
      const id = `claim-${index}`;
      const confirmed = receipt(state, id, "time");
      expect(confirmed.status).toBe("confirmed");
      // The ledger is independent from the account stock; reset this fixture's
      // stock to emulate consuming the granted item between claims.
      const result = completeBoosterRewardAd(confirmed.state, 0, END);
      expect(result.status).toBe("rewarded");
      state = result.state;
    }
    expect(state.completedRequestIds).toHaveLength(256);
    expect(state.completedRequestIds[0]).toBe("claim-14");
    expect(watch(state, "claim-269", "time").status).toBe("duplicate");
  });

  it("clones pending request and history independently", () => {
    const state = receipt(undefined, ID, "pulse").state;
    const clone = cloneBoosterRewardAd(state);
    expect(clone).toEqual(state);
    expect(clone).not.toBe(state);
    expect(clone.pending).not.toBe(state.pending);
    expect(clone.completedRequestIds).not.toBe(state.completedRequestIds);
    clone.pending!.phase = "watching";
    clone.completedRequestIds.push("other");
    expect(state.pending?.phase).toBe("completed");
    expect(state.completedRequestIds).toEqual([]);
  });
});
