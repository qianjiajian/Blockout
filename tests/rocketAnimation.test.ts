import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ROCKET_FLIGHT_DURATION, ROCKET_REDUCED_FLIGHT_DURATION,
  ROCKET_SHATTER_DURATION, ROCKET_REDUCED_SHATTER_DURATION, ROCKET_SHAKE_DURATION,
  drawRocketFlight, drawRocketImpact, drawRocketShatter, sampleRocketShake,
  type RocketCell, type RocketFlightSample,
} from "../src/game/rocketAnimation";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const image = { naturalWidth: 90, naturalHeight: 102, width: 90, height: 102 } as HTMLImageElement;
const flight: RocketFlightSample = {
  age: 0.24, duration: ROCKET_FLIGHT_DURATION,
  source: { x: 247, y: 926 }, target: { x: 113, y: 338 },
};
const cells: RocketCell[] = [
  { x: 50, y: 200, width: 48, height: 48 },
  { x: 98, y: 200, width: 48, height: 48 },
  { x: 50, y: 248, width: 48, height: 48 },
];

const canvasHarness = () => {
  const initialState: Record<string, unknown> = {
    globalAlpha: 0.73, fillStyle: "#123456", strokeStyle: "#abcdef", lineWidth: 3,
  };
  let state = { ...initialState };
  const stack: Record<string, unknown>[] = [];
  const trace: Array<{ name: string; args: unknown[]; alpha: unknown }> = [];
  const methods: Record<string, ReturnType<typeof vi.fn>> = {};
  let path: number[][] = [];
  const clips: number[][][] = [];
  const record = (name: string, args: unknown[]) => {
    for (const value of args) if (typeof value === "number") expect(Number.isFinite(value), name).toBe(true);
    trace.push({ name, args, alpha: state.globalAlpha });
  };
  for (const name of ["beginPath", "closePath", "moveTo", "lineTo", "quadraticCurveTo", "arc", "fill", "stroke", "clip", "fillRect", "translate", "rotate", "drawImage"]) {
    methods[name] = vi.fn((...args: unknown[]) => {
      record(name, args);
      if (name === "beginPath") path = [];
      if (name === "moveTo" || name === "lineTo") path.push(args as number[]);
      if (name === "clip") clips.push(path.map((point) => [...point]));
    });
  }
  methods.save = vi.fn(() => { record("save", []); stack.push({ ...state }); });
  methods.restore = vi.fn(() => {
    record("restore", []);
    expect(stack.length, "restore without save").toBeGreaterThan(0);
    state = stack.pop()!;
  });
  for (const name of ["createLinearGradient", "createRadialGradient"]) {
    methods[name] = vi.fn((...args: unknown[]) => {
      record(name, args);
      return { addColorStop: (...stop: unknown[]) => record("addColorStop", stop) };
    });
  }
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
  return { ctx, methods, trace, clips, initialState, state: () => ({ ...state }), depth: () => stack.length };
};
const expectBalanced = (canvas: ReturnType<typeof canvasHarness>) => {
  expect(canvas.depth()).toBe(0);
  expect(canvas.state()).toEqual(canvas.initialState);
  expect(canvas.methods.restore).toHaveBeenCalledTimes(canvas.methods.save.mock.calls.length);
};

describe("rocket presentation timing and shake", () => {
  it("exports the independent flight, shatter and shake durations", () => {
    expect([ROCKET_FLIGHT_DURATION, ROCKET_REDUCED_FLIGHT_DURATION,
      ROCKET_SHATTER_DURATION, ROCKET_REDUCED_SHATTER_DURATION, ROCKET_SHAKE_DURATION])
      .toEqual([0.48, 0.12, 0.56, 0.12, 0.2]);
  });

  it.each([[-4, 7], [7, -2], [-1, -5], [-3, -2], [1, -3], [2, 1], [0, 0]].map(([x, y], index) => ({ x, y, index })))
    ("matches reference shake node $index", ({ x, y, index }) => {
      const actual = sampleRocketShake(index * ROCKET_SHAKE_DURATION / 6, false);
      expect(actual.x).toBeCloseTo(x * 496 / 560, 10);
      expect(actual.y).toBeCloseTo(y * 496 / 560, 10);
    });

  it("linearly interpolates node offsets and returns exactly zero at completion", () => {
    const halfway = sampleRocketShake(ROCKET_SHAKE_DURATION / 12, false);
    expect(halfway.x).toBeCloseTo(1.5 * 496 / 560);
    expect(halfway.y).toBeCloseTo(2.5 * 496 / 560);
    for (const age of [0.2, 0.21, 100, NaN, Infinity, -Infinity, -0.01]) {
      expect(sampleRocketShake(age, false)).toEqual({ x: 0, y: 0 });
    }
  });

  it.each([0, 0.01, 0.1, 0.19, 0.2, NaN])("suppresses reduced-motion shake at %s", (age) => {
    expect(sampleRocketShake(age, true)).toEqual({ x: 0, y: 0 });
  });
});

describe("rocket straight flight", () => {
  it.each([0, 0.04, 0.12, 0.24, 0.36, 0.479])("keeps both sprite and exhaust centred on the exact line at %s", (age) => {
    const canvas = canvasHarness();
    drawRocketFlight(canvas.ctx, { ...flight, age }, image, false);
    const progress = age / ROCKET_FLIGHT_DURATION;
    const travel = progress * (0.28 + 0.72 * progress);
    const dx = flight.target.x - flight.source.x;
    const dy = flight.target.y - flight.source.y;
    expect(canvas.methods.translate).toHaveBeenCalledTimes(2);
    for (const [x, y] of canvas.methods.translate.mock.calls as number[][]) {
      expect(x).toBeCloseTo(flight.source.x + dx * travel, 10);
      expect(y).toBeCloseTo(flight.source.y + dy * travel, 10);
      expect((x - flight.source.x) * dy - (y - flight.source.y) * dx).toBeCloseTo(0, 8);
    }
    const angle = Math.atan2(dy, dx);
    expect(canvas.methods.rotate.mock.calls[0][0]).toBeCloseTo(angle, 12);
    expect(canvas.methods.rotate.mock.calls[1][0]).toBeCloseTo(angle + 58 * Math.PI / 180, 12);
    expect(canvas.methods.drawImage).toHaveBeenCalledWith(image, -33, -66 * 102 / 90 / 2, 66, 66 * 102 / 90);
    expect(canvas.methods.arc).toHaveBeenCalledTimes(6);
    expectBalanced(canvas);
  });

  it.each([{ x: 247, y: 300 }, { x: 400, y: 926 }, { x: 20, y: 1000 }, flight.source])
    ("supports different headings and a zero-length flight to %j", (target) => {
      const canvas = canvasHarness();
      drawRocketFlight(canvas.ctx, { ...flight, target }, image, false);
      expect(canvas.methods.rotate.mock.calls[1][0])
        .toBeCloseTo(Math.atan2(target.y - flight.source.y, target.x - flight.source.x) + 58 * Math.PI / 180);
      expectBalanced(canvas);
    });

  it("does not draw a flying sprite or exhaust for reduced motion or a completed flight", () => {
    for (const [age, reduced] of [[0, true], [0.1, true], [0.48, false], [2, false]] as const) {
      const canvas = canvasHarness();
      drawRocketFlight(canvas.ctx, { ...flight, age }, image, reduced);
      expect(canvas.trace).toEqual([]);
    }
  });

  it.each([undefined, { width: 0, height: 0 }, { width: -1, height: 3 }, { width: Infinity, height: 10 }, { width: 90, height: NaN }])
    ("skips missing or undecoded image %j", (art) => {
      const canvas = canvasHarness();
      drawRocketFlight(canvas.ctx, flight, art as HTMLImageElement | undefined, false);
      expect(canvas.trace).toEqual([]);
    });
});

describe("rocket original-texture shatter", () => {
  it("holds the original block in place for its first 40ms and overlays only occupied-cell cracks", () => {
    const canvas = canvasHarness();
    const original = vi.fn();
    drawRocketShatter(canvas.ctx, 0.03, ROCKET_SHATTER_DURATION, cells, false, original);
    expect(original).toHaveBeenCalledTimes(1);
    expect(canvas.methods.clip).not.toHaveBeenCalled();
    expect(canvas.methods.translate).not.toHaveBeenCalled();
    expect(canvas.methods.rotate).not.toHaveBeenCalled();
    expect(canvas.methods.fillRect.mock.calls).toEqual(cells.map(({ x, y, width, height }) => [x, y, width, height]));
    expectBalanced(canvas);
  });

  it("clips two complete complementary original-texture triangles per occupied cell, not a bounding-box tile", () => {
    const canvas = canvasHarness();
    const original = vi.fn(() => canvas.ctx.fillRect(0, 0, 200, 400));
    drawRocketShatter(canvas.ctx, 0.2, ROCKET_SHATTER_DURATION, cells, false, original);
    expect(original).toHaveBeenCalledTimes(cells.length * 2);
    expect(canvas.methods.clip).toHaveBeenCalledTimes(cells.length * 2);
    expect(canvas.methods.rotate).toHaveBeenCalledTimes(cells.length * 2);
    expect(canvas.methods.translate).toHaveBeenCalledTimes(cells.length * 4);
    for (const [index, cell] of cells.entries()) {
      const triangles = canvas.clips.slice(index * 2, index * 2 + 2);
      for (const [a, b, c] of triangles) {
        expect([a, b, c]).toHaveLength(3);
        const area = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) / 2;
        expect(area).toBe(cell.width * cell.height / 2);
        for (const [x, y] of [a, b, c]) {
          expect([cell.x, cell.x + cell.width]).toContain(x);
          expect([cell.y, cell.y + cell.height]).toContain(y);
        }
      }
      expect(new Set(triangles.flat().map((point) => point.join(","))).size).toBe(4);
    }
    expect(canvas.trace.filter(({ name }) => name === "fillRect").every(({ alpha }) => Number(alpha) < 0.73)).toBe(true);
    expectBalanced(canvas);
  });

  it.each([0, 0.03, 0.06, 0.119])("reduced motion draws the original only once with a stationary fade at %s", (age) => {
    const canvas = canvasHarness();
    const original = vi.fn(() => canvas.ctx.fillRect(0, 0, 200, 400));
    drawRocketShatter(canvas.ctx, age, ROCKET_REDUCED_SHATTER_DURATION, cells, true, original);
    expect(original).toHaveBeenCalledTimes(1);
    expect(canvas.trace.find(({ name }) => name === "fillRect")?.alpha).toBeCloseTo(0.73 * (1 - age / 0.12));
    for (const name of ["clip", "translate", "rotate", "stroke", "createRadialGradient"]) expect(canvas.methods[name]).not.toHaveBeenCalled();
    expectBalanced(canvas);
  });

  it.each([false, true])("ends without drawing or callback invocation (reduced=%s)", (reduced) => {
    const duration = reduced ? ROCKET_REDUCED_SHATTER_DURATION : ROCKET_SHATTER_DURATION;
    const canvas = canvasHarness();
    const original = vi.fn();
    drawRocketShatter(canvas.ctx, duration, duration, cells, reduced, original);
    drawRocketShatter(canvas.ctx, duration + 1, duration, cells, reduced, original);
    expect(original).not.toHaveBeenCalled();
    expect(canvas.trace).toEqual([]);
  });

  it("ignores invalid cells while keeping the valid occupied-cell count", () => {
    const canvas = canvasHarness();
    const original = vi.fn();
    drawRocketShatter(canvas.ctx, 0.2, 0.56, [cells[0], { ...cells[1], width: 0 },
      { ...cells[1], height: Infinity }, { ...cells[2], x: NaN }], false, original);
    expect(original).toHaveBeenCalledTimes(2);
    expectBalanced(canvas);
  });

  it.each([{ age: 0.02, reduced: false }, { age: 0.2, reduced: false }, { age: 0.02, reduced: true }])
    ("restores Canvas state even if original artwork drawing throws (%j)", ({ age, reduced }) => {
      const canvas = canvasHarness();
      expect(() => drawRocketShatter(canvas.ctx, age, 0.56, cells, reduced, () => { throw new Error("art failure"); })).toThrow("art failure");
      expectBalanced(canvas);
    });
});

describe("rocket Canvas safety", () => {
  it.each([NaN, Infinity, -Infinity, -1])("ignores invalid age %s in every renderer", (age) => {
    const canvas = canvasHarness();
    const original = vi.fn();
    drawRocketFlight(canvas.ctx, { ...flight, age }, image, false);
    drawRocketShatter(canvas.ctx, age, 0.56, cells, false, original);
    drawRocketImpact(canvas.ctx, flight.target, age, false);
    expect(canvas.trace).toEqual([]);
    expect(original).not.toHaveBeenCalled();
  });

  it.each([NaN, Infinity, -1, 0])("ignores invalid duration %s", (duration) => {
    const canvas = canvasHarness();
    const original = vi.fn();
    drawRocketFlight(canvas.ctx, { ...flight, duration }, image, false);
    drawRocketShatter(canvas.ctx, 0.1, duration, cells, false, original);
    expect(canvas.trace).toEqual([]);
    expect(original).not.toHaveBeenCalled();
  });

  it("rejects nonfinite endpoints, empty footprints, and impact after its 300ms window", () => {
    const canvas = canvasHarness();
    const original = vi.fn();
    drawRocketFlight(canvas.ctx, { ...flight, source: { x: NaN, y: 0 } }, image, false);
    drawRocketFlight(canvas.ctx, { ...flight, target: { x: 0, y: Infinity } }, image, false);
    drawRocketShatter(canvas.ctx, 0.1, 0.56, [], false, original);
    drawRocketImpact(canvas.ctx, { x: NaN, y: 0 }, 0.1, false);
    drawRocketImpact(canvas.ctx, flight.target, 0.3, false);
    drawRocketImpact(canvas.ctx, flight.target, 0.1, true);
    expect(canvas.trace).toEqual([]);
    expect(original).not.toHaveBeenCalled();
  });

  it("uses finite, balanced, deterministic Canvas primitives without filter, roundRect, Path2D or random", () => {
    vi.stubGlobal("Path2D", vi.fn(() => { throw new Error("Path2D unavailable"); }));
    vi.spyOn(Math, "random").mockImplementation(() => { throw new Error("random not allowed"); });
    const traces: ReturnType<typeof canvasHarness>["trace"][] = [];
    for (let repeat = 0; repeat < 2; repeat += 1) {
      const canvas = canvasHarness();
      for (let index = 0; index <= 65; index += 1) {
        const age = index / 100;
        drawRocketFlight(canvas.ctx, { ...flight, age }, image, false);
        drawRocketShatter(canvas.ctx, age, 0.56, cells, false, () => canvas.ctx.fillRect(0, 0, 200, 400));
        drawRocketImpact(canvas.ctx, flight.target, age, false);
        expectBalanced(canvas);
      }
      traces.push(canvas.trace);
    }
    expect(traces[0]).toEqual(traces[1]);
    expect(Math.random).not.toHaveBeenCalled();
  });
});
