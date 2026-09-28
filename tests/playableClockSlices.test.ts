import { describe, expect, it } from "vitest";
import { PlayableClockSlices } from "../src/game/playableClockSlices";

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
