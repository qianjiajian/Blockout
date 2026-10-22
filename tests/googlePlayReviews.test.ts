import { describe, expect, it, vi } from "vitest";
import { GooglePlayReviews } from "../src/googlePlay/reviews";
import type { GooglePlayLifecycleEvent } from "../src/googlePlay/lifecycle";
import type { NativeResult } from "../src/googlePlay/nativeBridge";

const result = (ok = true): NativeResult => ({ id: "test", type: "result", status: "test", ok });
const win = (levelId = 8): GooglePlayLifecycleEvent => ({ phase: "success", mode: "campaign", levelId, owner: {} });
describe("Google Play optional review scheduling", () => {
  it.each([1, 7, 7.5, NaN])("does not invite before the threshold: %s", async level => {
    const send = vi.fn(async (_command: string) => result()), r = new GooglePlayReviews(send, () => true);
    r.observe(win(level)); await r.sync(() => true); expect(send).not.toHaveBeenCalled();
  });
  it.each(["ready", "failed", "settlement"] as const)("ignores %s events", async phase => {
    const send = vi.fn(async (_command: string) => result()), r = new GooglePlayReviews(send, () => true);
    r.observe({ ...win(), phase } as GooglePlayLifecycleEvent); await r.sync(() => true); expect(send).not.toHaveBeenCalled();
  });
  it("ignores non-campaign wins", async () => {
    const send = vi.fn(async (_command: string) => result()), r = new GooglePlayReviews(send, () => true);
    r.observe({ ...win(), mode: "other" } as GooglePlayLifecycleEvent); await r.sync(() => true); expect(send).not.toHaveBeenCalled();
  });
  it("waits for a clear foreground home, then attempts once despite repeated wins", async () => {
    let visible = false;
    const send = vi.fn(async (_command: string) => result()), r = new GooglePlayReviews(send, () => visible), pending = vi.fn();
    r.onPending(pending); r.observe(win()); await r.sync(() => true); expect(send).not.toHaveBeenCalled();
    visible = true; await r.sync(() => false); expect(send).not.toHaveBeenCalled();
    await r.sync(() => true); r.observe(win(9)); await r.sync(() => true);
    expect(send.mock.calls.map(x => x[0])).toEqual(["reviewPrepare", "reviewLaunch"]);
    expect(pending).toHaveBeenCalledTimes(1);
  });
  it.each(["leave-home", "background", "dispose", "manual"])("does not launch after async preparation if %s", async action => {
    let ready = true, visible = true, complete!: (r: NativeResult) => void;
    const send = vi.fn((command: string) => command === "reviewPrepare" ? new Promise<NativeResult>(r => complete = r) : Promise.resolve(result()));
    const r = new GooglePlayReviews(send, () => visible); r.observe(win()); const work = r.sync(() => ready);
    if (action === "leave-home") ready = false;
    if (action === "background") visible = false;
    if (action === "dispose") r.dispose();
    if (action === "manual") await r.openStore();
    complete(result()); await work;
    expect(send.mock.calls.map(x => x[0])).not.toContain("reviewLaunch");
  });
  it("quietly accepts unavailable/quota failures, without a store redirect", async () => {
    const send = vi.fn(async (_command: string) => result(false)), r = new GooglePlayReviews(send, () => true);
    r.observe(win()); await r.sync(() => true); expect(send.mock.calls.map(x => x[0])).toEqual(["reviewPrepare"]);
  });
  it("manual entry opens store directly without asking for a rating or using quota-limited API", async () => {
    const send = vi.fn(async (_command: string) => result()), r = new GooglePlayReviews(send, () => true);
    expect(await r.openStore()).toBe(true); expect(send.mock.calls.map(x => x[0])).toEqual(["reviewStore"]);
  });
  it("native failure cannot throw into gameplay", async () => {
    const send = vi.fn(async () => { throw Error("native unavailable"); }), r = new GooglePlayReviews(send, () => true);
    r.observe(win()); await expect(r.sync(() => true)).resolves.toBeUndefined(); await expect(r.openStore()).resolves.toBe(false);
  });
});
