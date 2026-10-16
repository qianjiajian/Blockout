import { afterEach, describe, expect, it, vi } from "vitest";
import { ComboAnimation, drawComboPraise, type ComboBounds, type ComboPraiseSample } from "../src/game/comboAnimation";

const point = { x: 120, y: 320 };
const chain = (count = 3): ComboAnimation => {
  const animation = new ComboAnimation();
  for (let index = 0; index < count; index += 1) animation.recordExit(point);
  return animation;
};

describe("consecutive exit praise", () => {
  it("shows no label for the first two exits, then Good, Great, and repeated Excellent", () => {
    const animation = new ComboAnimation();
    for (const expected of [undefined, undefined, "Good!", "Great!", "Excellent!", "Excellent!"]) {
      animation.recordExit(point);
      expect(animation.samples(false).at(-1)?.text).toBe(expected);
    }
    expect(animation.count).toBe(6);
    expect(animation.samples(false).map((praise) => praise.tier)).toEqual(["good", "great", "excellent", "excellent"]);
  });

  it("keeps a chain through arbitrarily long thinking time after its visual finishes", () => {
    const animation = chain();
    animation.update(60 * 60 * 24 * 365, true, false);
    expect(animation.isVisible).toBe(false);
    expect(animation.count).toBe(3);
    animation.recordExit(point);
    expect(animation.samples(false)[0].text).toBe("Great!");
  });

  it("ends a chain on a non-clearing move without erasing an already playing label", () => {
    const animation = chain();
    animation.update(0.2, true, false);
    animation.breakChain();
    expect(animation.count).toBe(0);
    expect(animation.samples(false)[0]).toMatchObject({ count: 3, age: 0.2, text: "Good!" });
    animation.recordExit(point);
    animation.recordExit(point);
    expect(animation.samples(false)).toHaveLength(1);
    animation.recordExit({ x: 300, y: 200 });
    expect(animation.samples(false).map(({ text, x }) => [text, x])).toEqual([["Good!", 120], ["Good!", 300]]);
  });

  it("lets distinct rapid exits retain their own position, age and lifetime", () => {
    const animation = chain();
    animation.update(0.4, true, false);
    const next = { x: 380, y: 450 };
    animation.recordExit(next);
    next.x = 0;
    animation.update(0.2, true, false);
    const samples = animation.samples(false);
    expect(samples[0].age).toBeCloseTo(0.6);
    expect(samples[1]).toMatchObject({ age: 0.2, x: 380, y: 450, text: "Great!" });
    samples[1].x = -999;
    expect(animation.samples(false)[1].x).toBe(380);
    animation.update(0.31, true, false);
    expect(animation.samples(false).map((sample) => sample.text)).toEqual(["Great!"]);
  });

  it("bounds the number of concurrent labels without capping the actual chain", () => {
    const animation = chain(100);
    expect(animation.count).toBe(100);
    expect(animation.samples(false).map((sample) => sample.count)).toEqual([97, 98, 99, 100]);
  });

  it("freezes during pause/background and ignores invalid frame deltas", () => {
    const animation = chain();
    animation.update(0.12, true, false);
    const before = animation.samples(false);
    animation.update(100, false, false);
    for (const delta of [-1, NaN, Infinity]) animation.update(delta, true, false);
    expect(animation.samples(false)).toEqual(before);
    animation.update(0.08, true, false);
    expect(animation.samples(false)[0].age).toBeCloseTo(0.2);
  });

  it("matches the event-aligned reference pop, hold and opaque shrink at 30 fps", () => {
    for (const count of [3, 4, 5]) {
      for (const [frame, scale] of [[0, 0], [3, 1.16], [7, 1], [22.5, 1], [24, 0.5], [25, 0]]) {
        const animation = chain(count);
        animation.update(frame / 30, true, false);
        const praise = animation.samples(false).at(-1)!;
        expect(praise.scale).toBeCloseTo(scale, 8);
        expect(praise.opacity).toBe(frame === 0 ? 0 : 1);
        expect(praise).toMatchObject(point);
        animation.update(26 / 30 - frame / 30, true, false);
        expect(animation.samples(false)).toEqual([]);
        expect(animation.count).toBe(count);
      }
    }
  });

  it("uses a stationary readable label and a short fade with reduced motion", () => {
    const animation = chain();
    expect(animation.samples(true)[0]).toMatchObject({ scale: 1, opacity: 1, reducedMotion: true, ...point });
    animation.update(0.4, true, true);
    expect(animation.samples(true)[0].scale).toBe(1);
    expect(animation.samples(true)[0].opacity).toBeGreaterThan(0);
    expect(animation.samples(true)[0].opacity).toBeLessThan(1);
    animation.update(0.11, true, true);
    expect(animation.isVisible).toBe(false);
    expect(animation.count).toBe(3);
  });

  it("clears transient labels and the chain when the caller changes or leaves a level", () => {
    const animation = chain(7);
    animation.clear();
    expect(animation.count).toBe(0);
    expect(animation.isVisible).toBe(false);
    expect(animation.samples(false)).toEqual([]);
    animation.recordExit(point);
    expect(animation.count).toBe(1);
    expect(animation.isVisible).toBe(false);
  });
});

/** Measures vector curve extrema before clipping. Ignoring the clip here makes
 * an overflowing word/star fail instead of silently accepting cropped ink. */
function canvasHarness() {
  const initial = { globalAlpha: 0.75, x: 0, y: 0, sx: 1, sy: 1, lineWidth: 1,
    lineJoin: "miter", strokeStyle: "#123456", fillStyle: "#654321",
    shadowColor: "transparent", shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0 };
  let state: Record<string, any> = { ...initial };
  const stack: typeof state[] = [];
  type Point = [number, number];
  const ink: Array<{ kind: "fill" | "stroke"; alpha: number; left: number; right: number; top: number; bottom: number }> = [];
  let path: Point[] = [], current: Point = [0, 0], start: Point = [0, 0];
  const vertex = (x: number, y: number): Point => [state.x + x * state.sx, state.y + y * state.sy];
  const curve = (...controls: Point[]) => {
    const points = [current, ...controls];
    const evaluate = (axis: number, t: number): number => {
      let values = points.map((p) => p[axis]);
      while (values.length > 1) values = values.slice(1).map((next, index) => values[index] * (1 - t) + next * t);
      return values[0];
    };
    const times = [0, 1];
    for (const axis of [0, 1]) {
      const [p0, p1, p2, p3] = points.map((p) => p[axis]);
      // Derivative roots give exact quadratic/cubic axis extrema.
      const a = points.length === 4 ? -p0 + 3 * p1 - 3 * p2 + p3 : 0;
      const b = points.length === 4 ? 2 * (p0 - 2 * p1 + p2) : p0 - 2 * p1 + p2;
      const c = p1 - p0;
      if (Math.abs(a) < 1e-12) {
        if (Math.abs(b) > 1e-12) times.push(-c / b);
      } else {
        const discriminant = b * b - 4 * a * c;
        if (discriminant >= 0) times.push((-b + Math.sqrt(discriminant)) / (2 * a), (-b - Math.sqrt(discriminant)) / (2 * a));
      }
    }
    for (const t of times) if (t >= 0 && t <= 1) path.push([evaluate(0, t), evaluate(1, t)]);
    current = controls.at(-1)!;
  };
  const paint = (kind: "fill" | "stroke") => {
    if (!path.length) throw new Error("Cannot paint an empty path");
    const dx = kind === "stroke" ? state.lineWidth * Math.abs(state.sx) / 2 : 0;
    const dy = kind === "stroke" ? state.lineWidth * Math.abs(state.sy) / 2 : 0;
    ink.push({ kind, alpha: state.globalAlpha,
      left: Math.min(...path.map(([x]) => x)) - dx, right: Math.max(...path.map(([x]) => x)) + dx,
      top: Math.min(...path.map(([, y]) => y)) - dy, bottom: Math.max(...path.map(([, y]) => y)) + dy });
  };
  const unsupportedText = () => { throw new Error("Runtime font APIs are unavailable"); };
  const methods: Record<string, (...args: any[]) => any> = {
    save: () => stack.push({ ...state }), restore: () => { state = stack.pop()!; },
    measureText: unsupportedText, strokeText: unsupportedText, fillText: unsupportedText,
    translate: (x, y) => { state.x += x * state.sx; state.y += y * state.sy; },
    scale: (x, y) => { state.sx *= x; state.sy *= y; },
    beginPath: () => { path = []; }, rect: () => {}, clip: () => {},
    moveTo: (x, y) => { current = start = vertex(x, y); path.push(current); },
    lineTo: (x, y) => { current = vertex(x, y); path.push(current); },
    quadraticCurveTo: (cx, cy, x, y) => curve(vertex(cx, cy), vertex(x, y)),
    bezierCurveTo: (cx1, cy1, cx2, cy2, x, y) => curve(vertex(cx1, cy1), vertex(cx2, cy2), vertex(x, y)),
    closePath: () => { current = start; path.push(start); },
    fill: () => paint("fill"), stroke: () => paint("stroke"),
    createLinearGradient: () => ({ addColorStop: () => {} }),
  };
  const ctx = new Proxy({}, { get: (_, key) => methods[String(key)] ?? state[String(key)],
    set: (_, key, value) => { if (key === "font") unsupportedText(); state[String(key)] = value; return true; } }) as CanvasRenderingContext2D;
  return { ctx, ink, stars: () => ink.filter(({ kind }) => kind === "fill").length - ink.filter(({ kind }) => kind === "stroke").length,
    state: () => state, initial, depth: () => stack.length };
}

describe("combo label rendering", () => {
  const sample = (patch: Partial<ComboPraiseSample> = {}): ComboPraiseSample => ({ count: 5, tier: "excellent",
    text: "Excellent!", age: 3 / 30, x: 250, y: 350, scale: 1.16, opacity: 1, reducedMotion: false, ...patch });

  afterEach(() => vi.unstubAllGlobals());

  it("keeps all three outlined paths and stars inside every edge through the animation, including a narrow viewport", () => {
    for (const bounds of [{ x: 8, y: 260, width: 480, height: 400 }, { x: 20, y: 100, width: 100, height: 50 }]) {
      for (const count of [3, 4, 5]) for (const age of [3 / 30, 0.2, 0.28, 0.35, 0.39, 24 / 30]) {
        const animation = chain(count);
        animation.update(age, true, false);
        for (const x of [-100, 250, 700]) for (const y of [-100, 350, 900]) {
          const canvas = canvasHarness();
          drawComboPraise(canvas.ctx, { ...animation.samples(false).at(-1)!, x, y }, bounds);
          expect(canvas.ink.length).toBeGreaterThanOrEqual(2);
          for (const ink of canvas.ink) {
            expect(ink.left).toBeGreaterThanOrEqual(bounds.x);
            expect(ink.right).toBeLessThanOrEqual(bounds.x + bounds.width);
            expect(ink.top).toBeGreaterThanOrEqual(bounds.y);
            expect(ink.bottom).toBeLessThanOrEqual(bounds.y + bounds.height);
          }
          expect(canvas.depth()).toBe(0);
          expect(canvas.state()).toEqual(canvas.initial);
        }
      }
    }
  });

  it("does not move an edge-anchored label while its pop scale changes", () => {
    const bounds = { x: 8, y: 200, width: 480, height: 400 };
    const centers: number[] = [];
    for (const scale of [0.2, 1.16, 1, 0.4]) {
      const canvas = canvasHarness();
      drawComboPraise(canvas.ctx, sample({ x: 0, scale }), bounds);
      centers.push((canvas.ink[0].left + canvas.ink[0].right) / 2);
    }
    for (const center of centers) expect(center).toBeCloseTo(centers[0]);
  });

  it("uses the same vector glyph size without FontFace, Path2D or text metrics", () => {
    class UnsupportedFontAPI { constructor() { throw new Error("Unsupported font/path constructor"); } }
    vi.stubGlobal("FontFace", UnsupportedFontAPI);
    vi.stubGlobal("Path2D", UnsupportedFontAPI);
    for (const [tier, width] of [["good", 133], ["great", 141], ["excellent", 221]] as const) {
      const canvas = canvasHarness();
      drawComboPraise(canvas.ctx, sample({ tier, age: 0.5, scale: 1 }), { x: 0, y: 0, width: 496, height: 1078 });
      expect(canvas.ink).toHaveLength(2);
      const [outline, fill] = canvas.ink;
      expect(fill.right - fill.left).toBeCloseTo(width, 2);
      expect(fill.bottom - fill.top).toBeCloseTo(34, 2);
      expect(outline.right - outline.left).toBeCloseTo(width + 4, 2);
      expect(outline.bottom - outline.top).toBeCloseTo(38, 2);
      expect(canvas.depth()).toBe(0);
      expect(canvas.state()).toEqual(canvas.initial);
    }
  });

  it("omits stars with reduced motion while preserving a readable vector label", () => {
    const canvas = canvasHarness();
    drawComboPraise(canvas.ctx, sample({ reducedMotion: true, scale: 1 }), { x: 0, y: 0, width: 496, height: 1078 });
    expect(canvas.ink).toHaveLength(2);
    expect(canvas.stars()).toBe(0);
    expect(canvas.depth()).toBe(0);
    expect(canvas.state()).toEqual(canvas.initial);
  });

  it("skips invisible frames and invalid drawing bounds without touching the canvas", () => {
    const canvas = canvasHarness();
    for (const bounds of [{ x: 0, y: 0, width: 0, height: 100 }, { x: NaN, y: 0, width: 100, height: 100 }]) {
      drawComboPraise(canvas.ctx, sample(), bounds);
    }
    const bounds: ComboBounds = { x: 0, y: 0, width: 496, height: 1078 };
    drawComboPraise(canvas.ctx, sample({ scale: 0 }), bounds);
    drawComboPraise(canvas.ctx, sample({ opacity: 0 }), bounds);
    expect(canvas.ink).toEqual([]);
    expect(canvas.state()).toEqual(canvas.initial);
  });
});
