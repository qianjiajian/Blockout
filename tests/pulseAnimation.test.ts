import { describe, expect, it, vi } from "vitest";
import {
  PULSE_DURATION, PULSE_REDUCED_DURATION, PULSE_RELEASE_TIME,
  PulseAnimation, drawPulseAnimation, drawPulseDim, pulseTargetArrival, samplePulseShake,
  type PulseAnimationGeometry, type PulseTarget,
} from "../src/game/pulseAnimation";

const geometry: PulseAnimationGeometry = {
  source: { x: 340, y: 720 }, center: { x: 240, y: 400 },
  board: { x: 40, y: 200, width: 400, height: 400 },
};
const target = (patch: Partial<PulseTarget> = {}): PulseTarget => ({ id: "ice", kind: "block", previous: 5, remaining: 3,
  rects: [{ x: 200, y: 350, width: 40, height: 40 }, { x: 240, y: 350, width: 40, height: 40 },
    { x: 200, y: 390, width: 40, height: 40 }], ...patch });
const at = (age: number, reduced = false, targets = [target()]): PulseAnimation => {
  const animation = new PulseAnimation();
  animation.trigger(targets);
  animation.update(age, true, false, reduced);
  return animation;
};
const image = { naturalWidth: 100, naturalHeight: 80, width: 100, height: 80 } as HTMLImageElement;

const canvasHarness = () => {
  const initial: Record<string, unknown> = { globalAlpha: 0.7, fillStyle: "#123456", strokeStyle: "#abcdef", lineWidth: 3 };
  let state = { ...initial };
  const stack: Record<string, unknown>[] = [];
  const trace: Array<{ name: string; args: unknown[]; alpha: unknown }> = [];
  const methods: Record<string, ReturnType<typeof vi.fn>> = {};
  const record = (name: string, args: unknown[]) => {
    for (const value of args) if (typeof value === "number") expect(Number.isFinite(value), name).toBe(true);
    trace.push({ name, args, alpha: state.globalAlpha });
  };
  for (const name of ["beginPath", "closePath", "moveTo", "lineTo", "arc", "rect", "clip", "fill", "stroke", "fillRect", "drawImage", "fillText", "strokeText"]) {
    methods[name] = vi.fn((...args: unknown[]) => record(name, args));
  }
  methods.save = vi.fn(() => { record("save", []); stack.push({ ...state }); });
  methods.restore = vi.fn(() => {
    record("restore", []);
    expect(stack.length).toBeGreaterThan(0);
    state = stack.pop()!;
  });
  methods.createRadialGradient = vi.fn((...args: unknown[]) => {
    record("createRadialGradient", args);
    return { addColorStop: (...stop: unknown[]) => record("addColorStop", stop) };
  });
  const ctx = new Proxy({}, {
    get(_target, property) {
      const name = String(property);
      if (["roundRect", "filter", "Path2D"].includes(name)) throw new Error(`Unsupported Canvas API: ${name}`);
      if (name in methods) return methods[name];
      if (name in state) return state[name];
      throw new Error(`Unexpected Canvas API: ${name}`);
    },
    set(_target, property, value) {
      const name = String(property);
      if (["roundRect", "filter", "Path2D"].includes(name)) throw new Error(`Unsupported Canvas API: ${name}`);
      if (typeof value === "number") expect(Number.isFinite(value), name).toBe(true);
      state[name] = value;
      return true;
    },
  }) as CanvasRenderingContext2D;
  return { ctx, methods, trace, initial, state: () => state, depth: () => stack.length };
};
const balanced = (canvas: ReturnType<typeof canvasHarness>) => {
  expect(canvas.depth()).toBe(0);
  expect(canvas.state()).toEqual(canvas.initial);
};

describe("pulse visual clock", () => {
  it("focuses, flies, gathers, releases and clears on the approved timeline", () => {
    expect([PULSE_RELEASE_TIME, PULSE_DURATION, PULSE_REDUCED_DURATION]).toEqual([0.65, 1.4, 0.25]);
    for (const [age, phase] of [[0, "focus"], [0.15, "fly"], [0.45, "gather"], [0.65, "wave"], [1.05, "fade"], [1.4, "idle"]] as const) {
      expect(at(age).sample(false).phase).toBe(phase);
    }
    expect(at(0.5).sample(false).dimAlpha).toBe(0.5);
    expect(at(PULSE_DURATION).sample(false)).toMatchObject({ visible: false, targets: [], dimAlpha: 0 });
    expect(at(PULSE_REDUCED_DURATION, true).isVisible).toBe(false);
  });

  it("freezes for pause or background and resets even when terminal is inactive", () => {
    const animation = at(0.5);
    const paused = animation.sample(false);
    animation.update(30, false, false, false);
    expect(animation.sample(false)).toEqual(paused);
    animation.update(0, false, true, false);
    expect(animation.sample(false)).toMatchObject({ visible: false, targets: [], age: 0 });
  });

  it("ignores invalid deltas, bounds large deltas and restarts with only the new snapshot", () => {
    const animation = at(0.5);
    for (const delta of [NaN, Infinity, -Infinity, -1, 0]) animation.update(delta, true, false, false);
    expect(animation.sample(false).age).toBe(0.5);
    animation.update(Number.MAX_VALUE, true, false, false);
    expect(animation.isVisible).toBe(false);
    animation.trigger([target({ id: "new" })]);
    expect(animation.sample(false)).toMatchObject({ age: 0, visible: true, targets: [{ id: "new" }] });
  });

  it("owns detached targets so mutations cannot alter an already triggered effect", () => {
    const supplied = target();
    const animation = at(0, false, [supplied]);
    supplied.previous = 99;
    supplied.rects[0].x = 999;
    const first = animation.sample(false);
    expect(first.targets[0].previous).toBe(5);
    expect(first.targets[0].rects[0].x).toBe(200);
    first.targets[0].remaining = 80;
    first.targets[0].rects.length = 0;
    expect(animation.sample(false).targets[0]).toMatchObject({ previous: 5, remaining: 3, rects: expect.any(Array) });
    expect(animation.sample(false).targets[0].rects).toHaveLength(3);
  });

  it("does not animate unchanged counters, invalid geometry, or an empty target list", () => {
    const animation = new PulseAnimation();
    animation.trigger([target({ previous: 1, remaining: 1 }), target({ previous: NaN }), target({ remaining: -1 }),
      target({ rects: [{ x: 0, y: 0, width: 0, height: 10 }] })]);
    expect(animation.isVisible).toBe(false);
    animation.trigger([]);
    expect(animation.sample(false).targets).toEqual([]);
  });
});

describe("wave arrival and board shake", () => {
  it("follows linear radial travel and shares first arrival across multiple ports", () => {
    const near = target({ rects: [{ x: -5, y: -5, width: 10, height: 10 }] });
    const far = target({ rects: [{ x: 95, y: -5, width: 10, height: 10 }] });
    expect(pulseTargetArrival(near, { x: 0, y: 0 }, 100, false)).toBe(0.65);
    expect(pulseTargetArrival(far, { x: 0, y: 0 }, 100, false)).toBeCloseTo(1.03);
    expect(pulseTargetArrival(target({ rects: [...far.rects, ...near.rects] }), { x: 0, y: 0 }, 100, false)).toBe(0.65);
    expect(pulseTargetArrival(far, { x: 0, y: 0 }, 1, false)).toBeCloseTo(1.03);
    expect(pulseTargetArrival(far, { x: 0, y: 0 }, 100, true)).toBe(0);
    for (const maxRadius of [0, -1, NaN, Infinity]) expect(Number.isFinite(pulseTargetArrival(far, geometry.center, maxRadius, false))).toBe(true);
  });

  it("uses a short two-axis shake at release, bounded at half rocket strength", () => {
    expect(samplePulseShake(0.65, false).x).not.toBe(0);
    expect(samplePulseShake(0.65, false).y).not.toBe(0);
    for (let index = 0; index <= 120; index += 1) {
      const age = 0.65 + index / 1000;
      const shake = samplePulseShake(age, false);
      expect(Math.max(Math.abs(shake.x), Math.abs(shake.y))).toBeLessThanOrEqual(7 * 496 / 560 / 2 + 1e-8);
      expect(samplePulseShake(age, true)).toEqual({ x: 0, y: 0 });
    }
    for (const age of [0, 0.64, 0.77, 1, NaN, Infinity]) expect(samplePulseShake(age, false)).toEqual({ x: 0, y: 0 });
  });
});

describe("pulse Canvas rendering", () => {
  it("leaves overlapping focus sprites fully bright while dimming empty L corners and the rest of the screen", () => {
    const canvas = canvasHarness();
    const holes = [{ x: 10, y: 10, width: 20, height: 40 },
      { x: 25, y: 10, width: 25, height: 20 }, { x: -10, y: 80, width: 30, height: 30 }];
    drawPulseDim(canvas.ctx, 0.5, { x: 0, y: 0, width: 100, height: 100 }, holes);
    const painted = canvas.methods.rect.mock.calls as number[][];
    for (let y = 0.5; y < 100; y += 1) for (let x = 0.5; x < 100; x += 1) {
      const inside = (r: number[]) => x > r[0] && x < r[0] + r[2] && y > r[1] && y < r[1] + r[3];
      const focused = holes.some(r => inside([r.x, r.y, r.width, r.height]));
      expect(painted.filter(inside).length, `pixel ${x},${y}`).toBe(focused ? 0 : 1);
    }
    expect(canvas.methods.fill).toHaveBeenCalledOnce();
    expect(canvas.trace.find(call => call.name === "fill")?.alpha).toBe(0.35);
    balanced(canvas);
  });

  it("aligns focus outlines to artwork without moving wave arrival or counter badges", () => {
    const sample = at(1.04).sample(false);
    const original = canvasHarness(), aligned = canvasHarness();
    drawPulseAnimation(original.ctx, sample, geometry, image);
    drawPulseAnimation(aligned.ctx, sample, geometry, image,
      new Map([["block:ice", [{ x: 199, y: 341, width: 82, height: 89 }]]]));
    expect(aligned.methods.moveTo).toHaveBeenCalledWith(199, 341);
    expect(aligned.methods.lineTo).toHaveBeenCalledWith(281, 341);
    expect(aligned.methods.fillText.mock.calls).toEqual(original.methods.fillText.mock.calls);
    expect(aligned.methods.arc.mock.calls).toEqual(original.methods.arc.mock.calls);
    expect(sample.targets[0].rects).toEqual(target().rects);
    balanced(aligned);
  });

  it.each([0, 0.1, 0.2, 0.44, 0.5, 0.65, 0.73, 0.9, 1.03, 1.2, 1.399])
    ("is deterministic, finite and restores Canvas state at %s seconds", (age) => {
      const sample = at(age).sample(false);
      const first = canvasHarness(), second = canvasHarness();
      drawPulseAnimation(first.ctx, sample, geometry, image);
      drawPulseAnimation(second.ctx, sample, geometry, image);
      expect(first.trace).toEqual(second.trace);
      balanced(first); balanced(second);
    });

  it("draws only the outside of an L shape, retaining its empty corner", () => {
    const canvas = canvasHarness();
    drawPulseAnimation(canvas.ctx, at(0.1).sample(false), geometry, image);
    const starts = canvas.methods.moveTo.mock.calls as number[][];
    const ends = canvas.methods.lineTo.mock.calls as number[][];
    const segments = starts.map((start, i) => [start, ends[i]]);
    expect(segments).toHaveLength(8);
    expect(segments).not.toContainEqual([[240, 350], [240, 390]]);
    expect(segments).not.toContainEqual([[200, 390], [240, 390]]);
    expect(segments).toContainEqual([[240, 390], [280, 390]]);
    expect(segments).toContainEqual([[240, 390], [240, 430]]);
    expect(canvas.methods.fillRect).not.toHaveBeenCalled();
  });

  it("removes partially shared sides and keeps disconnected ports separate", () => {
    const rects = [{ x: 0, y: 0, width: 40, height: 40 }, { x: 40, y: 0, width: 20, height: 20 },
      { x: 100, y: 100, width: 20, height: 20 }];
    const canvas = canvasHarness();
    drawPulseAnimation(canvas.ctx, at(0.1, false, [target({ kind: "gate", rects })]).sample(false), geometry);
    const starts = canvas.methods.moveTo.mock.calls as number[][];
    const ends = canvas.methods.lineTo.mock.calls as number[][];
    const segments = starts.map((start, i) => [start, ends[i]]);
    expect(segments).toContainEqual([[40, 20], [40, 40]]);
    expect(segments).not.toContainEqual([[40, 0], [40, 40]]);
    expect(segments).toContainEqual([[100, 100], [120, 100]]);
  });

  it("shows actual before/after counters only as the wave reaches the target", () => {
    const targets = [target(), target({ id: "last", kind: "shutter", previous: 1, remaining: 0,
      rects: [{ x: 40, y: 200, width: 40, height: 40 }] })];
    const before = canvasHarness(), after = canvasHarness();
    drawPulseAnimation(before.ctx, at(0.65, false, targets).sample(false), geometry, image);
    expect(before.methods.fillText).not.toHaveBeenCalled();
    drawPulseAnimation(after.ctx, at(1.04, false, targets).sample(false), geometry, image);
    expect(after.methods.fillText.mock.calls.map(([text]) => text)).toEqual(["5→3", "1→0"]);
  });

  it("clips circular waves to board bounds and draws both cyan and purple wavefronts", () => {
    const canvas = canvasHarness();
    drawPulseAnimation(canvas.ctx, at(0.85).sample(false), geometry, image);
    expect(canvas.methods.rect).toHaveBeenCalledWith(40, 200, 400, 400);
    expect(canvas.methods.clip).toHaveBeenCalledTimes(1);
    const stops = canvas.trace.filter(({ name }) => name === "addColorStop").map(({ args }) => args[1]);
    expect(stops.some((color) => String(color).includes("94,235,255"))).toBe(true);
    expect(stops.some((color) => String(color).includes("178,119,255"))).toBe(true);
  });

  it("reduced motion keeps outlines and true counters stationary without icon, particles or waves", () => {
    const first = canvasHarness(), second = canvasHarness();
    drawPulseAnimation(first.ctx, at(0, true).sample(true), geometry, image);
    drawPulseAnimation(second.ctx, at(0.15, true).sample(true), geometry, image);
    for (const canvas of [first, second]) {
      expect(canvas.methods.drawImage).not.toHaveBeenCalled();
      expect(canvas.methods.arc).not.toHaveBeenCalled();
      expect(canvas.methods.createRadialGradient).not.toHaveBeenCalled();
      expect(canvas.methods.fillText).toHaveBeenCalledWith("5→3", 220, 410);
      balanced(canvas);
    }
    expect(first.trace.map(({ name, args }) => ({ name, args }))).toEqual(second.trace.map(({ name, args }) => ({ name, args })));
  });

  it("supports missing or undecoded artwork while preserving the effect and state", () => {
    for (const art of [undefined, { width: 0, height: 0 }, { width: Infinity, height: 90 }, { width: 100, height: NaN }]) {
      const canvas = canvasHarness();
      drawPulseAnimation(canvas.ctx, at(0.5).sample(false), geometry, art as HTMLImageElement | undefined);
      expect(canvas.methods.drawImage).not.toHaveBeenCalled();
      expect(canvas.methods.stroke).toHaveBeenCalled();
      balanced(canvas);
    }
  });

  it("restores all Canvas state if drawing a supplied image throws", () => {
    const canvas = canvasHarness();
    canvas.methods.drawImage.mockImplementation(() => { throw new Error("image unavailable"); });
    expect(() => drawPulseAnimation(canvas.ctx, at(0.3).sample(false), geometry, image)).toThrow("image unavailable");
    balanced(canvas);
  });

  it("skips ended effects and invalid board geometry without any Canvas calls", () => {
    for (const sample of [new PulseAnimation().sample(false), at(1.4).sample(false)]) {
      const canvas = canvasHarness();
      drawPulseAnimation(canvas.ctx, sample, geometry, image);
      expect(canvas.trace).toEqual([]);
    }
    for (const patch of [{ board: { ...geometry.board, width: 0 } }, { board: { ...geometry.board, x: NaN } },
      { source: { x: Infinity, y: 100 } }, { center: { x: 0, y: NaN } }]) {
      const canvas = canvasHarness();
      drawPulseAnimation(canvas.ctx, at(0.5).sample(false), { ...geometry, ...patch }, image);
      expect(canvas.trace).toEqual([]);
    }
  });
});
