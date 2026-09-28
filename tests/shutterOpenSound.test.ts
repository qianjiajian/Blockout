import { describe, expect, it } from "vitest";
import { REVISED_REGION_TIMING } from "../src/game/revisedRegionAnimation";
import { consumeShutterOpenSound } from "../src/game/shutterOpenSound";

type Transition = {
  kind: string;
  age: number;
  initial?: boolean;
  openingSoundPlayed?: boolean;
};

const shutter = (age: number): Transition => ({ kind: "shutter", age });
const openingStart = (reducedMotion: boolean): number => (
  REVISED_REGION_TIMING.shutterOpeningStart * (reducedMotion ? 0.5 : 1)
);

describe("shutter opening sound consumption", () => {
  it.each([false, true])("waits until the exact opening threshold (reduced motion: %s)", (reducedMotion) => {
    const threshold = openingStart(reducedMotion);
    const transition = shutter(threshold - 0.000001);
    expect(consumeShutterOpenSound(transition, reducedMotion)).toBe(false);
    expect(transition.openingSoundPlayed).toBeUndefined();

    transition.age = threshold;
    expect(consumeShutterOpenSound(transition, reducedMotion)).toBe(true);
    expect(transition.openingSoundPlayed).toBe(true);

    transition.age = threshold + 0.05;
    expect(consumeShutterOpenSound(transition, reducedMotion)).toBe(false);
  });

  it.each([false, true])("consumes once when a frame first crosses the threshold (reduced motion: %s)", (reducedMotion) => {
    const transition = shutter(openingStart(reducedMotion) + 0.025);
    expect(consumeShutterOpenSound(transition, reducedMotion)).toBe(true);
    expect(consumeShutterOpenSound(transition, reducedMotion)).toBe(false);
  });

  it.each([false, true])("does not consume during a negative delay or zero-age countdown (reduced motion: %s)", (reducedMotion) => {
    const transition = shutter(-0.3);
    for (const age of [-0.3, -0.001, 0]) {
      transition.age = age;
      expect(consumeShutterOpenSound(transition, reducedMotion)).toBe(false);
      expect(transition.openingSoundPlayed).toBeUndefined();
    }
    transition.age = openingStart(reducedMotion);
    expect(consumeShutterOpenSound(transition, reducedMotion)).toBe(true);
  });

  it("does not retrigger on repeated consumers, later frames or a motion preference change", () => {
    const transition = shutter(openingStart(false));
    expect(consumeShutterOpenSound(transition)).toBe(true);
    for (const age of [transition.age, transition.age, 0.5, 1, 10]) {
      transition.age = age;
      expect(consumeShutterOpenSound(transition)).toBe(false);
      expect(consumeShutterOpenSound(transition, true)).toBe(false);
    }
  });

  it.each(["lift", "flip", "lock", "generator"])("never consumes a %s transition", (kind) => {
    const transition: Transition = { kind, age: 10 };
    expect(consumeShutterOpenSound(transition)).toBe(false);
    expect(consumeShutterOpenSound(transition, true)).toBe(false);
    expect(transition).toEqual({ kind, age: 10 });
  });

  it.each([false, true])("never replays an initial reveal (reduced motion: %s)", (reducedMotion) => {
    const transition: Transition = { ...shutter(0), initial: true };
    for (const age of [0, openingStart(reducedMotion), 10]) {
      transition.age = age;
      expect(consumeShutterOpenSound(transition, reducedMotion)).toBe(false);
      expect(transition.openingSoundPlayed).toBeUndefined();
    }
  });

  it("keeps a consumed event consumed even when the caller was muted", () => {
    const transition = shutter(openingStart(false));
    const played: string[] = [];
    let soundEnabled = false;
    if (consumeShutterOpenSound(transition) && soundEnabled) played.push("shutter");
    expect(transition.openingSoundPlayed).toBe(true);
    soundEnabled = true;
    transition.age += 0.1;
    if (consumeShutterOpenSound(transition) && soundEnabled) played.push("shutter");
    expect(played).toEqual([]);
  });

  it("does not carry consumption into a newly created reveal after restarting", () => {
    const previous = shutter(openingStart(false));
    expect(consumeShutterOpenSound(previous)).toBe(true);
    const restarted = shutter(0);
    expect(restarted.openingSoundPlayed).toBeUndefined();
    expect(consumeShutterOpenSound(restarted)).toBe(false);
    restarted.age = openingStart(false);
    expect(consumeShutterOpenSound(restarted)).toBe(true);
    expect(consumeShutterOpenSound(previous)).toBe(false);
  });
});
