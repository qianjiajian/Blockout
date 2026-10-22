import { describe, expect, it, vi } from "vitest";
import { emitGooglePlayLifecycle, GooglePlayLifecycle, type GooglePlayLifecycleEvent } from "../src/googlePlay/lifecycle";

function setup() {
  const send = vi.fn(); let now = 5000;
  const observer = new GooglePlayLifecycle(send, () => now);
  const owner = {};
  const event = (phase: Exclude<GooglePlayLifecycleEvent["phase"], "reset">, levelId = 6, model = owner, mode: "campaign" | "other" = "campaign") =>
    observer.observe({ phase, owner: model, levelId, mode });
  return { observer, send, owner, event, at: (value: number) => { now = value; } };
}

describe("Google Play exact campaign lifecycle", () => {
  it("creates one attempt at playable readiness, ends success once and waits for a real settlement render", () => {
    const s = setup(); s.event("ready"); s.event("ready");
    s.at(17500); s.event("success"); s.event("success");
    expect(s.send.mock.calls.map(call => call[0])).toEqual(["levelStart", "levelEnd"]);
    expect(s.send.mock.calls[1][1]).toMatchObject({ result: "success", duration: 12.5, levelId: 6 });
    expect(s.send.mock.calls[0][1].attemptId).toBe(s.send.mock.calls[1][1].attemptId);
    s.event("settlement"); s.event("settlement");
    expect(s.send.mock.calls.map(call => call[0])).toEqual(["levelStart", "levelEnd", "settlement"]);
  });

  it("ends a restart as fail and creates a different attempt even for the same level", () => {
    const s = setup(); s.event("ready"); s.at(9500);
    s.observer.observe({ phase: "reset" }); s.observer.observe({ phase: "reset" });
    const newOwner = {}; s.event("ready", 6, newOwner);
    s.event("success", 6, s.owner); // Stale animation callback cannot settle the new model.
    s.at(12000); s.event("failed", 6, newOwner); s.event("failed", 6, newOwner);
    s.event("settlement", 6, newOwner);
    expect(s.send.mock.calls.map(call => call[0])).toEqual(["levelStart", "levelEnd", "levelStart", "levelEnd", "settlement"]);
    expect(s.send.mock.calls[1][1]).toMatchObject({ result: "fail", duration: 4.5 });
    expect(s.send.mock.calls[3][1]).toMatchObject({ result: "fail", duration: 2.5 });
    expect(s.send.mock.calls[0][1].attemptId).not.toBe(s.send.mock.calls[2][1].attemptId);
  });

  it("does not turn direct advancement or successful save retries into failed attempts", () => {
    const s = setup(); s.event("ready", 1); s.event("success", 1);
    s.observer.observe({ phase: "reset" });
    const next = {}; s.event("ready", 2, next); s.event("success", 2, next);
    s.event("success", 2, next); s.event("settlement", 2, next);
    expect(s.send.mock.calls.map(call => call[0])).toEqual(["levelStart", "levelEnd", "levelStart", "levelEnd"]);
    expect(s.send.mock.calls.filter(call => call[0] === "levelEnd").every(call => call[1].result === "success")).toBe(true);
  });

  it("keeps levels 1–5, unstarted boards and other modes out of interstitial triggers", () => {
    const s = setup(); s.event("settlement"); s.event("failed");
    s.event("ready", 12, {}, "other");
    expect(s.send).not.toHaveBeenCalled();
    for (let level = 1; level <= 5; level++) {
      const owner = {}; s.event("ready", level, owner); s.event("success", level, owner); s.event("settlement", level, owner);
    }
    expect(s.send.mock.calls.filter(call => call[0] === "settlement")).toHaveLength(0);
  });

  it("does not reset duration on pause/resume/readiness notifications and guards bad clocks", () => {
    const s = setup(); s.event("ready"); s.at(30000); s.event("ready");
    s.at(45500); s.event("failed");
    expect(s.send.mock.calls[1][1].duration).toBe(40.5);
    s.observer.observe({ phase: "reset" });
    const owner = {}; s.event("ready", 6, owner); s.at(0); s.event("failed", 6, owner);
    expect(s.send.mock.calls[3][1].duration).toBe(0);
  });

  it("isolates optional integration errors from core transitions", () => {
    expect(() => emitGooglePlayLifecycle({}, { phase: "reset" })).not.toThrow();
    expect(() => emitGooglePlayLifecycle({ onGooglePlayLifecycle: () => { throw new Error("transport unavailable"); } }, { phase: "reset" })).not.toThrow();
  });
});
