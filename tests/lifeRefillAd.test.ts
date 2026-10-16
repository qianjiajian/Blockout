import { describe, expect, it } from "vitest";
import {
  cancelLifeRefillAd, cloneLifeRefillAd, completeLifeRefillAd, confirmLifeRefillAd,
  normalizeLifeRefillAd, prepareLifeRefillAd, type LifeRefillAdState,
} from "../src/core/lifeRefillAd";
import { LIFE_REGEN_INTERVAL_MS, type LifeState } from "../src/core/lives";

const NOW = Date.parse("2026-10-11T04:00:00Z");
const END = NOW + 30_000;
const ID = "life-refill:request-1";
const lives = (overrides: Partial<LifeState> = {}): LifeState => ({
  lives: 2, nextLifeAtMs: NOW + LIFE_REGEN_INTERVAL_MS, unlimitedLivesUntilMs: 0, ...overrides,
});
const watch = (value: unknown = undefined, id = ID, nowMs = NOW) => prepareLifeRefillAd(value, { id, nowMs });
const receipt = (value: unknown = undefined, id = ID) => confirmLifeRefillAd(watch(value, id).state, id, END);

describe("life refill ad saved receipts", () => {
  it.each([undefined, null, [], 42, "corrupt"])("initializes an old or malformed save %j without inventing a pending reward", raw => {
    const state = normalizeLifeRefillAd(raw);
    expect(state).toEqual({ version: 1, completedRequestIds: [] });
    expect(completeLifeRefillAd(state, lives(), NOW)).toMatchObject({ status: "missing", lifeState: lives() });
  });

  it("filters invalid and repeated ledger IDs without mutating the raw save", () => {
    const raw = { version: 99, completedRequestIds: ["valid:1", "valid:1", "a b", "", "x".repeat(129), 5, null, {}, "valid_2"], pending: { id: "invalid" } };
    const before = structuredClone(raw), state = normalizeLifeRefillAd(raw);
    expect(state).toEqual({ version: 1, completedRequestIds: ["valid:1", "valid_2"] });
    state.completedRequestIds.push("new");
    expect(raw).toEqual(before);
  });

  it.each([
    { id: "invalid id", startedAtMs: NOW, phase: "completed", completedAtMs: END },
    { id: ID, startedAtMs: -1, phase: "completed", completedAtMs: END },
    { id: ID, startedAtMs: "123", phase: "completed", completedAtMs: END },
    { id: ID, startedAtMs: Infinity, phase: "completed", completedAtMs: END },
    { id: ID, startedAtMs: NOW, phase: "claimed", completedAtMs: END },
    { id: ID, startedAtMs: NOW, phase: "completed" },
    { id: ID, startedAtMs: NOW, phase: "completed", completedAtMs: Number.NaN },
    { id: ID, startedAtMs: NOW, phase: "completed", completedAtMs: 1.5 },
    { id: ID, startedAtMs: NOW, phase: "completed", completedAtMs: 253_402_272_000_000 },
  ])("does not redeem malformed pending receipt %j", pending => {
    const result = completeLifeRefillAd({ completedRequestIds: [], pending }, lives(), END);
    expect(result.status).toBe("missing");
    expect(result.state.pending).toBeUndefined();
    expect(result.lifeState).toEqual(lives());
    expect(result.amount).toBeUndefined();
  });

  it("does not promote a watching request merely because a completion timestamp is present", () => {
    const raw = { completedRequestIds: [], pending: { id: ID, phase: "watching", startedAtMs: NOW, completedAtMs: END } };
    const state = normalizeLifeRefillAd(raw);
    expect(state.pending).toEqual({ id: ID, phase: "watching", startedAtMs: NOW });
    expect(completeLifeRefillAd(state, lives(), END).status).toBe("not-completed");
  });

  it("clamps a rolled-back completion clock to the original request start", () => {
    const result = confirmLifeRefillAd(watch().state, ID, NOW - 60_000);
    expect(result.status).toBe("confirmed");
    expect(result.state.pending?.completedAtMs).toBe(NOW);
    const loaded = normalizeLifeRefillAd({ ...result.state, pending: { ...result.state.pending, completedAtMs: NOW - 1 } });
    expect(loaded.pending?.completedAtMs).toBe(NOW);
  });

  it.each(["watching", "completed"] as const)("discards already fulfilled %s pending receipts before trimming a long ledger", phase => {
    for (const padding of [0, 256, 400]) {
      const state = { completedRequestIds: [ID, ...Array.from({ length: padding }, (_, index) => `done-${index}`)],
        pending: { id: ID, startedAtMs: NOW, phase, ...(phase === "completed" ? { completedAtMs: END } : {}) } };
      const result = completeLifeRefillAd(state, lives(), END);
      expect(result.status).toBe("missing");
      expect(result.state.pending).toBeUndefined();
      expect(result.state.completedRequestIds.length).toBe(Math.min(256, padding + 1));
      expect(result.lifeState).toEqual(lives());
    }
  });

  it("clones both pending receipt and completed history independently", () => {
    const state = receipt({ completedRequestIds: ["old-1"] }).state;
    const before = structuredClone(state), cloned = cloneLifeRefillAd(state);
    expect(cloned).toEqual(state);
    expect(cloned).not.toBe(state);
    expect(cloned.pending).not.toBe(state.pending);
    expect(cloned.completedRequestIds).not.toBe(state.completedRequestIds);
    cloned.pending!.completedAtMs = 0;
    cloned.completedRequestIds.push("new-2");
    expect(state).toEqual(before);
  });
});

describe("life refill ad transaction identity and completion", () => {
  it.each(["", "invalid id", "x".repeat(129), "非法"])("rejects invalid request ID %s", id => {
    expect(watch(undefined, id).status).toBe("invalid-request");
  });

  it.each([-1, 1.25, Infinity, Number.NaN, 253_402_272_000_000])("rejects invalid request time %s without creating a receipt", time => {
    const prepared = watch(undefined, ID, time);
    expect(prepared.status).toBe("invalid-request");
    expect(prepared.state.pending).toBeUndefined();
    const watching = watch().state;
    expect(confirmLifeRefillAd(watching, ID, time)).toMatchObject({ status: "invalid-request", state: watching });
  });

  it("locks a pending offer against repeat clicks or another request without touching the source", () => {
    const base = normalizeLifeRefillAd(undefined), before = structuredClone(base);
    const prepared = watch(base);
    expect(prepared.status).toBe("prepared");
    expect(prepared.request).toEqual({ id: ID, startedAtMs: NOW, phase: "watching" });
    expect(base).toEqual(before);
    for (const id of [ID, "another-request"]) {
      const busy = watch(prepared.state, id);
      expect(busy).toMatchObject({ status: "busy", state: prepared.state, request: prepared.request });
      busy.request!.id = "mutated-result";
      expect(prepared.state.pending?.id).toBe(ID);
    }
  });

  it("requires the matching completed host receipt and preserves its first confirmation time", () => {
    const watching = watch().state, assets = lives();
    expect(completeLifeRefillAd(watching, assets, END)).toMatchObject({ status: "not-completed", state: watching, lifeState: assets });
    expect(confirmLifeRefillAd(watching, "unknown-request", END)).toMatchObject({ status: "missing", state: watching });
    const confirmed = confirmLifeRefillAd(watching, ID, END);
    const repeated = confirmLifeRefillAd(confirmed.state, ID, END + 15_000);
    expect(repeated).toEqual(confirmed);
    expect(watching.pending?.phase).toBe("watching");
    confirmed.request!.completedAtMs = 0;
    expect(confirmed.state.pending?.completedAtMs).toBe(END);
    expect(assets).toEqual(lives());
  });

  it("settles a persisted completed receipt once and rejects later callbacks or retries", () => {
    const confirmed = receipt().state, assets = lives();
    const before = structuredClone(confirmed), result = completeLifeRefillAd(confirmed, assets, END);
    expect(result).toMatchObject({ status: "rewarded", amount: 1, lifeState: { ...assets, lives: 3 }, state: { version: 1, completedRequestIds: [ID] } });
    expect(result.state.pending).toBeUndefined();
    expect(confirmed).toEqual(before);
    expect(assets).toEqual(lives());
    const reloaded = JSON.parse(JSON.stringify(result.state));
    expect(confirmLifeRefillAd(reloaded, ID, END + 1).status).toBe("duplicate");
    expect(watch(reloaded).status).toBe("duplicate");
    expect(completeLifeRefillAd(reloaded, result.lifeState, END + 1)).toMatchObject({ status: "missing", lifeState: result.lifeState });
  });

  it("cancels only the matching incomplete receipt and ignores late completion", () => {
    const watching = watch().state;
    expect(cancelLifeRefillAd(watching, "different-request")).toMatchObject({ status: "missing", state: watching });
    const cancelled = cancelLifeRefillAd(watching, ID);
    expect(cancelled).toEqual({ status: "cancelled", state: { version: 1, completedRequestIds: [] } });
    expect(watching.pending?.phase).toBe("watching");
    expect(cancelLifeRefillAd(cancelled.state, ID).status).toBe("missing");
    expect(confirmLifeRefillAd(cancelled.state, ID, END).status).toBe("missing");
    expect(completeLifeRefillAd(cancelled.state, lives(), END)).toMatchObject({ status: "missing", lifeState: lives() });
    expect(watch(cancelled.state, "next-request").status).toBe("prepared");
  });

  it("retains an earned receipt if a cancellation arrives after completed watching", () => {
    const confirmed = receipt().state;
    const cancelled = cancelLifeRefillAd(confirmed, ID);
    expect(cancelled.status).toBe("completed-pending");
    expect(cancelled.state).toEqual(confirmed);
    expect(completeLifeRefillAd(cancelled.state, lives(), END)).toMatchObject({ status: "rewarded", lifeState: { lives: 3 } });
  });

  it("bounds recent history across repeated independent claims while retaining recent duplicate protection", () => {
    let state: LifeRefillAdState = normalizeLifeRefillAd(undefined);
    let account = lives({ lives: 0 });
    for (let index = 0; index < 270; index++) {
      const id = `claim-${index}`, confirmed = receipt(state, id);
      expect(confirmed.status).toBe("confirmed");
      const result = completeLifeRefillAd(confirmed.state, account, END);
      expect(result.status).toBe("rewarded");
      state = result.state;
      account = result.lifeState;
    }
    expect(account.lives).toBe(270);
    expect(state.completedRequestIds).toHaveLength(256);
    expect(state.completedRequestIds[0]).toBe("claim-14");
    expect(state.completedRequestIds.at(-1)).toBe("claim-269");
    expect(watch(state, "claim-269").status).toBe("duplicate");
  });
});

describe("life refill ad reward and natural recovery", () => {
  it("adds the earned ad life after natural recovery and preserves the recovery cadence", () => {
    const raw = lives({ lives: 1, nextLifeAtMs: NOW + 5_000 });
    const result = completeLifeRefillAd(receipt().state, raw, END);
    expect(result.lifeState).toEqual({ lives: 3, nextLifeAtMs: NOW + 5_000 + LIFE_REGEN_INTERVAL_MS, unlimitedLivesUntilMs: 0 });
    expect(raw).toEqual(lives({ lives: 1, nextLifeAtMs: NOW + 5_000 }));
  });

  it("still grants the promised +1 if natural recovery reaches full during the video", () => {
    const result = completeLifeRefillAd(receipt().state, lives({ lives: 4, nextLifeAtMs: NOW + 1_000 }), END);
    expect(result.lifeState).toEqual({ lives: 6, nextLifeAtMs: 0, unlimitedLivesUntilMs: 0 });
    expect(result.amount).toBe(1);
  });

  it("grants a saved completed receipt after long offline recovery without losing overflow", () => {
    const result = completeLifeRefillAd(receipt().state, lives({ lives: 0, nextLifeAtMs: NOW + 1_000 }), NOW + 86_400_000);
    expect(result.lifeState).toEqual({ lives: 6, nextLifeAtMs: 0, unlimitedLivesUntilMs: 0 });
  });

  it("adds an ordinary life while infinite lives are active and leaves their expiry unchanged", () => {
    const result = completeLifeRefillAd(receipt().state, lives({ unlimitedLivesUntilMs: END + 300_000 }), END);
    expect(result.lifeState).toEqual(lives({ lives: 3, unlimitedLivesUntilMs: END + 300_000 }));
  });

  it("clears expired infinite lives while awarding the completed video", () => {
    const result = completeLifeRefillAd(receipt().state, lives({ unlimitedLivesUntilMs: NOW + 5_000 }), END);
    expect(result.lifeState).toEqual(lives({ lives: 3 }));
  });

  it("starts a missing ordinary regeneration clock without waiting an extra full interval", () => {
    const result = completeLifeRefillAd(receipt().state, lives({ lives: 0, nextLifeAtMs: 0 }), END);
    expect(result.lifeState).toEqual({ lives: 1, nextLifeAtMs: END + LIFE_REGEN_INTERVAL_MS, unlimitedLivesUntilMs: 0 });
  });
});
