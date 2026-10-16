import { afterEach, describe, expect, it, vi } from "vitest";
import { monotonicGameTime, PlayableClockSlices } from "../src/game/playableClockSlices";

describe("host-compatible game time", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it("uses Date.now when the host does not expose performance", () => {
    vi.stubGlobal("performance", undefined);
    Reflect.deleteProperty(globalThis, "performance");
    expect("performance" in globalThis).toBe(false);
    const dateNow = vi.spyOn(Date, "now").mockReturnValue(1730000000123);
    expect(monotonicGameTime()).toBe(1730000000123);
    expect(dateNow).toHaveBeenCalledOnce();
  });

  it.each([{}, { now: undefined }, { now: 123 }])("uses Date.now if performance.now is unavailable: %j", clock => {
    vi.stubGlobal("performance", clock);
    vi.spyOn(Date, "now").mockReturnValue(1730000000456);
    expect(monotonicGameTime()).toBe(1730000000456);
  });

  it("keeps the browser's monotonic clock and its receiver", () => {
    const clock = { timestamp: 123.75, now: vi.fn(function (this: { timestamp: number }) { return this.timestamp; }) };
    vi.stubGlobal("performance", clock);
    const dateNow = vi.spyOn(Date, "now").mockReturnValue(1730000000789);
    expect(monotonicGameTime()).toBe(123.75);
    expect(clock.now).toHaveBeenCalledOnce();
    expect(dateNow).not.toHaveBeenCalled();
  });
});

describe("playable-frame and input-event clock slices", () => {
  it("charges an already active bomb before an unlock and only the remainder to the newly active one", () => {
    const clock = new PlayableClockSlices();
    let oldBomb = 10, newlyEnabledBomb = 10;
    expect(clock.sample(1000, true)).toBe(0);
    oldBomb -= clock.sample(1750, true); // flush BEFORE the key is removed
    const afterEnable = clock.sample(2000, true);
    oldBomb -= afterEnable;
    newlyEnabledBomb -= afterEnable;
    expect(oldBomb).toBe(9);
    expect(newlyEnabledBomb).toBe(9.75);
  });

  it("does not charge entry, pause, hidden-app or reset intervals", () => {
    const clock = new PlayableClockSlices();
    expect(clock.sample(1000, false)).toBe(0);
    expect(clock.sample(4000, true)).toBe(0);
    expect(clock.sample(4250, true)).toBe(0.25);
    expect(clock.sample(5000, false)).toBe(0);
    expect(clock.sample(9000, true)).toBe(0);
    clock.reset();
    expect(clock.sample(9500, true)).toBe(0);
  });

  it("does not double-charge a backwards or repeated clock sample", () => {
    const clock = new PlayableClockSlices();
    clock.sample(1000, true);
    expect(clock.sample(1100, true)).toBe(0.1);
    expect(clock.sample(1050, true)).toBe(0);
    expect(clock.sample(1100, true)).toBe(0);
    expect(clock.sample(1200, true)).toBe(0.1);
  });
});
