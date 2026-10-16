import { describe, expect, it, vi } from "vitest";
import { PuzzleModel } from "../src/core/PuzzleModel";
import type { LevelSpec } from "../src/core/types";
import { drawTimeFreezeAnimation, TimeFreezeAnimation } from "../src/game/timeFreezeAnimation";
import type { TimeFreezeAnimationArt, TimeFreezeAnimationGeometry } from "../src/game/timeFreezeAnimation";

const animationAt = (age: number, remaining = 10) => {
  const animation = new TimeFreezeAnimation();
  animation.trigger();
  animation.update(remaining, true, age);
  return animation;
};

const expectFiniteSample = (sample: ReturnType<TimeFreezeAnimation["sample"]>) => {
  for (const [key, value] of Object.entries(sample)) {
    if (typeof value === "number") expect(Number.isFinite(value), key).toBe(true);
  }
  expect(sample.opacity).toBeGreaterThanOrEqual(0);
  expect(sample.opacity).toBeLessThanOrEqual(1);
  expect(sample.endProgress).toBeGreaterThanOrEqual(0);
  expect(sample.endProgress).toBeLessThanOrEqual(1);
  expect(sample.freezeProgress).toBeGreaterThanOrEqual(0);
  expect(sample.freezeProgress).toBeLessThanOrEqual(1);
  expect(sample.remaining).toBeGreaterThanOrEqual(0);
};

describe("time-freeze presentation lifecycle", () => {
  it("requires a successful-use trigger instead of replaying from a remaining balance", () => {
    const animation = new TimeFreezeAnimation();
    expect(animation.isVisible).toBe(false);
    animation.update(10, true, 1);
    expect(animation.sample(10, false)).toMatchObject({ visible: false, phase: "idle" });
    animation.trigger();
    expect(animation.isVisible).toBe(true);
    expect(animation.sample(10, false)).toMatchObject({ visible: true, phase: "launch", age: 0, remaining: 10 });
  });

  it.each([
    [0, "launch"], [0.549999, "launch"], [0.55, "hover"], [1.179999, "hover"],
    [1.18, "fly"], [1.649999, "fly"], [1.65, "burst"], [2.349999, "burst"],
    [2.35, "frozen"], [5, "frozen"],
  ] as const)("uses the expected %s-second phase boundary (%s)", (age, phase) => {
    const animation = animationAt(age, 10 - age);
    const sample = animation.sample(10 - age, false);
    expect(sample).toMatchObject({ visible: true, phase, remaining: 10 - age });
    expectFiniteSample(sample);
  });

  it.each([0.2, 0.9, 1.4, 1.9, 5])("holds the in-flight %s-second presentation while inactive", (age) => {
    const animation = animationAt(age, 7);
    const before = animation.sample(7, false);
    for (let index = 0; index < 50; index++) animation.update(7, false, 30);
    expect(animation.sample(7, false)).toEqual(before);
    animation.update(7, true, 0.01);
    expect(animation.sample(7, false).age).toBeCloseTo(before.age + 0.01);
  });

  it("begins a short exit when the real balance expires and pauses that exit while inactive", () => {
    const animation = animationAt(2.5, 0.01);
    animation.update(0, true, 0);
    expect(animation.sample(0, false)).toMatchObject({ phase: "ending", visible: true, remaining: 0, endProgress: 0 });
    animation.update(0, true, 0.16);
    const halfway = animation.sample(0, false);
    expect(halfway.endProgress).toBeCloseTo(0.5);
    expect(halfway.opacity).toBeGreaterThan(0);
    expect(halfway.opacity).toBeLessThan(1);
    animation.update(0, false, 1000);
    expect(animation.sample(0, false)).toEqual(halfway);
    animation.update(0, true, 0.16);
    expect(animation.isVisible).toBe(false);
    expect(animation.sample(0, false)).toMatchObject({ visible: false, phase: "idle" });
  });

  it.each([0.2, 1.2, 1.8, 3])("honors real expiry even before the %s-second visual sequence finishes", (age) => {
    const animation = animationAt(age, 1);
    animation.update(0, true, 0);
    expect(animation.sample(0, false).phase).toBe("ending");
    animation.update(0, true, 0.32);
    expect(animation.isVisible).toBe(false);
  });

  it("clears terminal runs immediately even when paused or backgrounded", () => {
    const animation = animationAt(1.4, 9);
    animation.update(9, false, 0, true);
    expect(animation.isVisible).toBe(false);
    expect(animation.sample(9, false)).toEqual(new TimeFreezeAnimation().sample(9, false));
    animation.trigger();
    expect(animation.sample(9, false)).toMatchObject({ visible: true, phase: "launch", age: 0 });
  });

  it("fully resets after undo or a level change and does not revive from future observations", () => {
    const animation = animationAt(1.4, 8.6);
    animation.reset();
    animation.update(8.6, true, 10);
    expect(animation.isVisible).toBe(false);
    expect(animation.sample(8.6, false)).toEqual(new TimeFreezeAnimation().sample(8.6, false));
    animation.trigger();
    animation.update(0, true, 0.16);
    animation.reset();
    expect(animation.sample(0, false)).toEqual(new TimeFreezeAnimation().sample(0, false));
  });

  it("restarts only the presentation on a newly committed use, including during an old exit", () => {
    const animation = animationAt(1.4, 8.6);
    animation.trigger();
    expect(animation.sample(8.6, false)).toMatchObject({ age: 0, remaining: 8.6, phase: "launch" });
    animation.update(0, true, 0.1);
    animation.trigger();
    expect(animation.sample(10, false)).toMatchObject({ age: 0, remaining: 10, phase: "launch", endProgress: 0 });
  });

  it.each([-1, -Number.MAX_VALUE, NaN, Infinity, -Infinity])("ignores invalid animation delta %s without poisoning state", (delta) => {
    const animation = animationAt(0.2, 9.8);
    const before = animation.sample(9.8, false);
    animation.update(9.8, true, delta);
    expect(animation.sample(9.8, false)).toEqual(before);
    animation.update(9.7, true, 0.1);
    expect(animation.sample(9.7, false).age).toBeCloseTo(0.3);
    expectFiniteSample(animation.sample(9.7, false));
  });

  it("allows a finite delayed frame to reach the settled phase without waiting out intermediate effects", () => {
    const animation = animationAt(60, 3);
    expect(animation.sample(3, false)).toMatchObject({ phase: "frozen", remaining: 3, visible: true });
    expectFiniteSample(animation.sample(3, false));
    animation.update(0, true, 60);
    expect(animation.isVisible).toBe(false);
  });

  it("keeps accumulated finite deltas from overflowing the presentation age", () => {
    const animation = animationAt(Number.MAX_VALUE, 1);
    animation.update(1, true, Number.MAX_VALUE);
    expectFiniteSample(animation.sample(1, false));
    expect(animation.sample(1, false)).toMatchObject({ visible: true, phase: "frozen", remaining: 1 });
  });

  it("does not start an expiry pose behind an inactive overlay", () => {
    const animation = animationAt(1.4, 0.01);
    const before = animation.sample(0, false);
    animation.update(0, false, 100);
    expect(animation.sample(0, false)).toEqual(before);
    animation.update(0, true, 0);
    expect(animation.sample(0, false)).toMatchObject({ phase: "ending", age: 1.4, endProgress: 0 });
  });

  it.each([-1, NaN, Infinity, -Infinity])("sanitizes invalid observed balance %s without non-finite drawing values", (remaining) => {
    const animation = animationAt(0.2);
    expect(animation.sample(remaining, false).remaining).toBe(0);
    expectFiniteSample(animation.sample(remaining, false));
    animation.update(remaining, true, 0.32);
    expectFiniteSample(animation.sample(remaining, false));
  });

  it("keeps reduced-motion presentation static without skipping or extending the actual remaining seconds", () => {
    const animation = new TimeFreezeAnimation();
    animation.trigger();
    for (const remaining of [10, 9.999, 8.82, 7.65, 3.1, 0.001]) {
      animation.update(remaining, true, 0.2);
      expect(animation.sample(remaining, true)).toMatchObject({ phase: "frozen", remaining, reducedMotion: true, visible: true });
      expectFiniteSample(animation.sample(remaining, true));
    }
    animation.update(0, true, 0);
    expect(animation.sample(0, true)).toMatchObject({ remaining: 0, visible: true });
    animation.update(0, true, 0.32);
    expect(animation.sample(0, true).visible).toBe(false);
  });
});

const clockFixture: LevelSpec = {
  id: 99614, name: "freeze animation clock isolation", difficulty: "normal", reward: 0,
  mechanismRules: "revised-2026-09-27-v1.5", width: 3, height: 3, timeSeconds: 60,
  gates: [{ id: "red-exit", side: "left", offset: 0, size: 1, color: "red" }],
  blocks: [
    { id: "red", x: 0, y: 0, color: "red", shape: [[0, 0]] },
    { id: "bomb", x: 2, y: 2, color: "blue", shape: [[0, 0]], timedBombSeconds: 20 },
  ],
};

describe("time-freeze animation clock isolation", () => {
  it.each([false, true])("observes the full real 10-second freeze without changing clocks or bombs (reduced=%s)", (reducedMotion) => {
    const observed = new PuzzleModel(clockFixture);
    const control = new PuzzleModel(clockFixture);
    expect(observed.freezeTime(10)).toBe(true);
    expect(control.freezeTime(10)).toBe(true);
    const animation = new TimeFreezeAnimation();
    animation.trigger();
    for (const delta of [0.55, 0.63, 0.47, 0.7, 5, 2.65, 0.32]) {
      observed.tick(delta);
      control.tick(delta);
      const before = observed.snapshot();
      animation.update(before.timeFreezeSeconds ?? 0, true, delta, before.complete || before.failed);
      const sample = animation.sample(before.timeFreezeSeconds ?? 0, reducedMotion);
      expect(sample.remaining).toBe(before.timeFreezeSeconds);
      expect(observed.snapshot()).toEqual(before);
      expect(observed.snapshot()).toEqual(control.snapshot());
    }
    expect(observed.snapshot().timeFreezeSeconds).toBe(0);
    expect(observed.snapshot().remainingSeconds).toBeCloseTo(59.68);
    expect(observed.getBlock("bomb")?.timedBombSeconds).toBeCloseTo(19.68);
    expect(animation.isVisible).toBe(false);
  });
});

const geometry: TimeFreezeAnimationGeometry = {
  viewport: { x: 0, y: 0, width: 496, height: 1078 },
  source: { x: 178, y: 903, width: 68, height: 74 },
  timer: { x: 163, y: 105, width: 170, height: 57 },
};
const art: TimeFreezeAnimationArt = {
  clock: { naturalWidth: 256, naturalHeight: 320, width: 256, height: 320 } as HTMLImageElement,
  ice: { naturalWidth: 512, naturalHeight: 512, width: 512, height: 512 } as HTMLImageElement,
};

/** Canvas subset shared by browser and WeChat. Missing modern APIs throw if touched. */
const canvasHarness = () => {
  const initialState: Record<string, unknown> = {
    globalAlpha: 0.73, globalCompositeOperation: "source-over", fillStyle: "#234567",
    strokeStyle: "#765432", lineWidth: 7, lineCap: "butt", lineJoin: "bevel",
    font: "12px sans-serif", textAlign: "left", textBaseline: "alphabetic",
    shadowBlur: 0, shadowColor: "transparent", shadowOffsetX: 0, shadowOffsetY: 0,
  };
  let state = { ...initialState };
  const stack: Record<string, unknown>[] = [];
  const trace: Array<{ name: string; args: unknown[] }> = [];
  const methods: Record<string, ReturnType<typeof vi.fn>> = {};
  const record = (name: string, args: unknown[]) => {
    for (const argument of args) {
      if (typeof argument === "number") expect(Number.isFinite(argument), `${name} argument`).toBe(true);
    }
    trace.push({ name, args });
  };
  for (const name of [
    "beginPath", "closePath", "moveTo", "lineTo", "quadraticCurveTo", "bezierCurveTo", "rect",
    "arc", "fill", "stroke", "clip", "fillRect", "strokeRect", "translate", "rotate", "scale",
    "drawImage", "strokeText", "fillText",
  ]) methods[name] = vi.fn((...args: unknown[]) => record(name, args));
  methods.save = vi.fn(() => { record("save", []); stack.push({ ...state }); });
  methods.restore = vi.fn(() => {
    record("restore", []);
    expect(stack.length, "restore must match a prior save").toBeGreaterThan(0);
    state = stack.pop()!;
  });
  for (const name of ["createLinearGradient", "createRadialGradient"]) {
    methods[name] = vi.fn((...args: unknown[]) => {
      record(name, args);
      return { addColorStop: (...stop: unknown[]) => record("addColorStop", stop) };
    });
  }
  const context = new Proxy({}, {
    get(_target, property) {
      const key = String(property);
      if (key === "roundRect" || key === "filter") throw new Error(`unsupported Canvas API: ${key}`);
      if (key in methods) return methods[key];
      if (key in state) return state[key];
      throw new Error(`unexpected Canvas API: ${key}`);
    },
    set(_target, property, value) {
      const key = String(property);
      if (key === "filter") throw new Error("unsupported Canvas filter");
      if (typeof value === "number") expect(Number.isFinite(value), key).toBe(true);
      state[key] = value;
      return true;
    },
  }) as CanvasRenderingContext2D;
  return { context, methods, trace, state: () => ({ ...state }), initialState, depth: () => stack.length };
};

describe("time-freeze Canvas compatibility", () => {
  it.each([0, 0.25, 0.8, 1.4, 1.65, 2, 3, 9.9])("balances Canvas state and finite coordinates at visual age %s", (age) => {
    const animation = animationAt(age, 10 - age);
    const canvas = canvasHarness();
    expect(() => drawTimeFreezeAnimation(canvas.context, animation.sample(10 - age, false), geometry, art)).not.toThrow();
    expect(canvas.methods.save).toHaveBeenCalled();
    expect(canvas.methods.restore).toHaveBeenCalledTimes(canvas.methods.save.mock.calls.length);
    expect(canvas.depth()).toBe(0);
    expect(canvas.state()).toEqual(canvas.initialState);
    expect(canvas.methods.drawImage).toHaveBeenCalled();
  });

  it.each([0.2, 0.9, 1.4, 1.9, 3])("still renders safely without clock or ice art at age %s", (age) => {
    const animation = animationAt(age, 7);
    for (const partialArt of [{}, { clock: art.clock }, { ice: art.ice }]) {
      const canvas = canvasHarness();
      expect(() => drawTimeFreezeAnimation(canvas.context, animation.sample(7, false), geometry, partialArt)).not.toThrow();
      expect(canvas.depth()).toBe(0);
      expect(canvas.state()).toEqual(canvas.initialState);
      if (Object.keys(partialArt).length === 0) expect(canvas.methods.drawImage).not.toHaveBeenCalled();
    }
  });

  it("skips undecoded zero-size images without invalid drawImage calls", () => {
    const zeroSize = { naturalWidth: 0, naturalHeight: 0, width: 0, height: 0 } as HTMLImageElement;
    for (const age of [0.3, 3]) {
      const canvas = canvasHarness();
      drawTimeFreezeAnimation(canvas.context, animationAt(age).sample(10, false), geometry, { clock: zeroSize, ice: zeroSize });
      expect(canvas.methods.drawImage).not.toHaveBeenCalled();
      expect(canvas.depth()).toBe(0);
    }
  });

  it("does not draw or alter state after reset, completed fade or invalid viewport sizes", () => {
    const invisible = new TimeFreezeAnimation();
    const ended = animationAt(3);
    ended.update(0, true, 0.32);
    for (const sample of [invisible.sample(10, false), ended.sample(0, false)]) {
      const canvas = canvasHarness();
      drawTimeFreezeAnimation(canvas.context, sample, geometry, art);
      expect(canvas.trace).toEqual([]);
      expect(canvas.state()).toEqual(canvas.initialState);
    }
    for (const [width, height] of [[0, 1078], [496, 0], [-1, 1078]]) {
      const canvas = canvasHarness();
      drawTimeFreezeAnimation(canvas.context, animationAt(3).sample(5, false), {
        ...geometry, viewport: { ...geometry.viewport, width, height },
      }, art);
      expect(canvas.trace).toEqual([]);
    }
  });

  it("keeps reduced-motion draw calls fixed without flying, flipping, snowfall or burst flashes", () => {
    let baseline: ReturnType<typeof canvasHarness>["trace"] | undefined;
    for (const age of [0, 0.25, 0.8, 1.4, 1.9, 3, 8]) {
      const canvas = canvasHarness();
      drawTimeFreezeAnimation(canvas.context, animationAt(age).sample(7, true), geometry, art);
      expect(canvas.methods.scale).not.toHaveBeenCalled();
      expect(canvas.methods.createRadialGradient).not.toHaveBeenCalled();
      expect(canvas.methods.arc).not.toHaveBeenCalled();
      expect(canvas.methods.drawImage.mock.calls.some(([image]) => image === art.clock)).toBe(false);
      expect(canvas.methods.fillText).toHaveBeenCalledWith("7s", expect.any(Number), expect.any(Number));
      const viewportVeil = canvas.methods.fillRect.mock.calls.some(([x, y, width, height]) => (
        x === geometry.viewport.x && y === geometry.viewport.y
        && width === geometry.viewport.width && height === geometry.viewport.height
      ));
      expect(viewportVeil).toBe(false);
      if (baseline) expect(canvas.trace).toEqual(baseline);
      else baseline = canvas.trace;
      expect(canvas.state()).toEqual(canvas.initialState);
    }
  });

  it("displays the actual fractional balance using ceiling and sizes the bar from that balance", () => {
    const animation = animationAt(3);
    const canvas = canvasHarness();
    drawTimeFreezeAnimation(canvas.context, animation.sample(3.01, true), geometry, art);
    expect(canvas.methods.fillText).toHaveBeenCalledWith("4s", expect.any(Number), expect.any(Number));
    const progress = canvas.methods.fillRect.mock.calls.find(([, y, , height]) => y === 171 && height === 14);
    expect(progress).toBeDefined();
    expect(progress?.[2]).toBeCloseTo(geometry.timer.width * 0.8 * 0.301);
  });
});
