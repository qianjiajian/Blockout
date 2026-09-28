import { describe, expect, it } from "vitest";
import { drawRevisedFlipPanels, drawRevisedRegion } from "../src/game/revisedMechanismDrawing";
import { sampleRevisedRegionAnimation } from "../src/game/revisedRegionAnimation";

interface Call { op: string; args: unknown[]; alpha: number }
function recording() {
  const calls: Call[] = [];
  const states: number[] = [];
  const context: Record<string, unknown> = { globalAlpha: 0.8 };
  // WeChat device contexts can lack roundRect; do not silently supply it here.
  for (const op of ["beginPath", "rect", "clip", "translate", "rotate", "scale", "moveTo", "lineTo", "quadraticCurveTo", "closePath", "fill", "stroke", "fillRect", "drawImage", "strokeText", "fillText"]) {
    context[op] = (...args: unknown[]) => calls.push({ op, args, alpha: context.globalAlpha as number });
  }
  context.save = () => { states.push(context.globalAlpha as number); calls.push({ op: "save", args: [], alpha: context.globalAlpha as number }); };
  context.restore = () => { context.globalAlpha = states.pop(); calls.push({ op: "restore", args: [], alpha: context.globalAlpha as number }); };
  context.createLinearGradient = () => ({ addColorStop: () => {} });
  return { ctx: context as unknown as CanvasRenderingContext2D, calls, states, of: (op: string) => calls.filter((call) => call.op === op) };
}
const image = (width: number, height: number) => ({ width, height }) as HTMLImageElement;
const strip = image(292, 40);
const frame = image(330, 317);
const left = image(147, 290);
const right = image(146, 290);
const rect = { x: 10, y: 20, width: 292, height: 190 };

describe("revised mechanism pure Canvas drawing", () => {
  it.each([
    { rect, size: 36 },
    { rect: { x: 0, y: 0, width: 20, height: 12 }, size: 12 * 0.65 },
  ])("draws a closed, bounded round counter with no native roundRect (size=$size)", ({ rect: badgeRect, size }) => {
    const log = recording();
    expect(log.ctx.roundRect).toBeUndefined();
    expect(() => drawRevisedRegion(log.ctx, badgeRect, "shutter", { strip }, undefined, 17)).not.toThrow();
    const half = size / 2, radius = size * 0.23;
    expect(log.of("moveTo").map(({ args }) => args)).toEqual([[-half + radius, -half]]);
    expect(log.of("lineTo").map(({ args }) => args)).toEqual([
      [half - radius, -half], [half, half - radius], [-half + radius, half], [-half, -half + radius],
    ]);
    expect(log.of("quadraticCurveTo").map(({ args }) => args)).toEqual([
      [half, -half, half, -half + radius], [half, half, half - radius, half],
      [-half, half, -half, half - radius], [-half, -half, -half + radius, -half],
    ]);
    expect(log.of("closePath")).toHaveLength(1);
    expect(log.of("fill")).toHaveLength(1);
    expect(log.of("stroke")).toHaveLength(1);
    expect(log.of("fillText")[0].args).toEqual(["17", 0, size * 0.035, size * 0.82]);
    expect(log.ctx.globalAlpha).toBe(0.8);
    expect(log.states).toHaveLength(0);
  });

  it("uses the same portable counter path even when native roundRect is present", () => {
    const log = recording();
    log.ctx.roundRect = () => { throw new Error("Native roundRect must not be required"); };
    expect(() => drawRevisedRegion(log.ctx, rect, "shutter", {}, undefined, 10)).not.toThrow();
    expect(log.of("quadraticCurveTo")).toHaveLength(4);
    expect(log.of("fillText")[0].args[0]).toBe("10");
    expect(log.states).toHaveLength(0);
  });

  it("tiles intact slats over the entire closed area, including the final partial row", () => {
    const log = recording();
    drawRevisedRegion(log.ctx, rect, "shutter", { strip }, undefined, 12);
    expect(log.of("drawImage").map(({ args }) => args)).toEqual([0, 1, 2, 3, 4].map((row) => [strip, 10, 20 + row * 40, 292, 40]));
    expect(log.of("rect")[0].args).toEqual([10, 20, 292, 190]);
    expect(log.of("fillText")[0].args[0]).toBe("12");
    expect(log.ctx.globalAlpha).toBe(0.8);
    expect(log.states).toHaveLength(0);
  });

  it("translates full-height shutter strips, clips the moving lower edge and does not squash", () => {
    const log = recording();
    const sample = { ...sampleRevisedRegionAnimation("shutter", 0), openProgress: 0.5, coverFraction: 0.5, counterScale: 0 };
    drawRevisedRegion(log.ctx, rect, "shutter", { strip }, sample, 0);
    expect(log.of("rect")[0].args).toEqual([10, 20, 292, 95]);
    expect(log.of("drawImage").map(({ args }) => args)).toEqual([2, 3, 4].map((row) => [strip, 10, 20 - 95 + row * 40, 292, 40]));
    expect(log.of("scale")).toHaveLength(0);
  });

  it("keeps zero centred independently while the curtain starts moving, then removes its badge", () => {
    const before = recording();
    drawRevisedRegion(before.ctx, rect, "shutter", { strip }, sampleRevisedRegionAnimation("shutter", 0), 0);
    expect(before.of("fillText")[0].args[0]).toBe("0");
    expect(before.of("translate")[0].args).toEqual([156, 115]);
    const shrinking = recording();
    drawRevisedRegion(shrinking.ctx, rect, "shutter", { strip }, sampleRevisedRegionAnimation("shutter", 6.5 / 30), 0);
    expect(shrinking.of("scale")[0].args[0]).toBeCloseTo(0.5);
    expect(shrinking.of("translate")[0].args).toEqual([156, 115]);
    const gone = recording();
    drawRevisedRegion(gone.ctx, rect, "shutter", { strip }, sampleRevisedRegionAnimation("shutter", 8 / 30), 0);
    expect(gone.of("fillText")).toHaveLength(0);
  });

  it("leaves a fully open shutter transparent without an invented frame or particles", () => {
    const log = recording();
    drawRevisedRegion(log.ctx, rect, "shutter", { strip, frame }, sampleRevisedRegionAnimation("shutter", 1), 0);
    expect(log.of("drawImage")).toHaveLength(0);
    expect(log.of("fillRect")).toHaveLength(0);
    expect(log.of("fillText")).toHaveLength(0);
  });

  it("draws whole left/right lift sprites at a fixed half-area size, then only translates", () => {
    const liftRect = { x: 0, y: 0, width: 330, height: 317 };
    const closed = recording();
    drawRevisedRegion(closed.ctx, liftRect, "lift", { left, right }, undefined, 7);
    expect(closed.of("drawImage").map(({ args }) => args)).toEqual([[left, 18, 17, 147, 283], [right, 165, 17, 147, 283]]);
    const opening = recording();
    drawRevisedRegion(opening.ctx, liftRect, "lift", { left, right }, { ...sampleRevisedRegionAnimation("lift", 0), openProgress: 0.5 }, 7);
    expect(opening.of("drawImage").map(({ args }) => args)).toEqual([[left, -55.5, 17, 147, 283], [right, 238.5, 17, 147, 283]]);
    expect(opening.of("rect")[0].args).toEqual([18, 17, 294, 283]);
    expect(opening.of("fillRect").map(({ args }) => args)).toEqual([[-55.5, 17, 147, 283], [238.5, 17, 147, 283]]);
    expect(opening.of("fillText")).toHaveLength(0);
  });

  it("cuts only original lift frame rims, never the opaque decorative PNG centre", () => {
    const log = recording();
    drawRevisedRegion(log.ctx, { x: 0, y: 0, width: 330, height: 317 }, "lift", { frame }, sampleRevisedRegionAnimation("lift", 13 / 30), 0);
    expect(log.of("drawImage").map(({ args }) => args)).toEqual([
      [frame, 0, 0, 330, 17, 0, 0, 330, 17],
      [frame, 0, 300, 330, 17, 0, 300, 330, 17],
      [frame, 0, 17, 18, 283, 0, 17, 18, 283],
      [frame, 312, 17, 18, 283, 312, 17, 18, 283],
    ]);
    expect(log.of("fillRect")).toHaveLength(0);
  });

  it("fades the lift rim multiplicatively, restores alpha and retires it when complete", () => {
    const log = recording();
    drawRevisedRegion(log.ctx, rect, "lift", { frame, left, right }, sampleRevisedRegionAnimation("lift", 14.5 / 30), 0);
    expect(log.of("drawImage")).toHaveLength(4);
    for (const call of log.of("drawImage")) expect(call.alpha).toBeCloseTo(0.4);
    expect(log.ctx.globalAlpha).toBe(0.8);
    const complete = recording();
    drawRevisedRegion(complete.ctx, rect, "lift", { frame, left, right }, sampleRevisedRegionAnimation("lift", 1), 0);
    expect(complete.of("drawImage")).toHaveLength(0);
    expect(complete.of("fillRect")).toHaveLength(0);
  });

  it("moves both flip leaves along the horizontal long axis with unchanged metal dimensions", () => {
    const closed = recording();
    const open = recording();
    const gate = { x: 10, y: 20, width: 100, height: 24 };
    drawRevisedFlipPanels(closed.ctx, gate, true, 0);
    drawRevisedFlipPanels(open.ctx, gate, true, 0.5);
    expect(closed.of("translate").map(({ args }) => args)).toEqual([[10, 20], [-0, 0], [50, 0]]);
    expect(open.of("translate").map(({ args }) => args)).toEqual([[10, 20], [-25, 0], [75, 0]]);
    expect(open.of("fillRect").map(({ args }) => args)).toEqual(closed.of("fillRect").map(({ args }) => args));
    expect(open.of("rect")[0].args).toEqual([10, 20, 100, 24]);
    expect(open.of("rotate")).toHaveLength(0);
  });

  it("maps the same flip geometry to the vertical long axis and leaves fully open gates clear", () => {
    const log = recording();
    drawRevisedFlipPanels(log.ctx, { x: 10, y: 20, width: 24, height: 100 }, false, 0.5);
    expect(log.of("rotate")[0].args).toEqual([-Math.PI / 2]);
    expect(log.of("translate").map(({ args }) => args)).toEqual([[10, 20], [0, 100], [-25, 0], [75, 0]]);
    expect(log.states).toHaveLength(0);
    const open = recording();
    drawRevisedFlipPanels(open.ctx, rect, true, 1);
    expect(open.calls).toHaveLength(0);
  });

  it.each([true, false])("splits supplied flip art along its long axis and slides both full halves (horizontal=%s)", (horizontal) => {
    const source = image(horizontal ? 191 : 62, horizontal ? 70 : 206);
    const gate = { x: 10, y: 20, width: horizontal ? 100 : 30, height: horizontal ? 30 : 100 };
    const closed = recording();
    const moving = recording();
    drawRevisedFlipPanels(closed.ctx, gate, horizontal, 0, source);
    drawRevisedFlipPanels(moving.ctx, gate, horizontal, 0.5, source);
    const expected = horizontal
      ? [[source, 0, 0, 95.5, 70, -15, 20, 50, 30], [source, 95.5, 0, 95.5, 70, 85, 20, 50, 30]]
      : [[source, 0, 0, 62, 103, 10, -5, 30, 50], [source, 0, 103, 62, 103, 10, 95, 30, 50]];
    expect(moving.of("drawImage").map(({ args }) => args)).toEqual(expected);
    expect(moving.of("drawImage").map(({ args }) => args.slice(7))).toEqual(closed.of("drawImage").map(({ args }) => args.slice(7)));
    expect(moving.of("drawImage")).toHaveLength(2);
    expect(moving.of("fillRect")).toHaveLength(0);
    expect(moving.of("rotate")).toHaveLength(0);
    expect(moving.states).toHaveLength(0);
    const open = recording();
    drawRevisedFlipPanels(open.ctx, gate, horizontal, 1, source);
    expect(open.calls).toHaveLength(0);
  });

  it("rejects nonfinite/empty regions without drawing and does not mutate input geometry or samples", () => {
    const log = recording();
    for (const bad of [{ ...rect, width: 0 }, { ...rect, height: -1 }, { ...rect, x: NaN }, { ...rect, width: Infinity }]) {
      drawRevisedRegion(log.ctx, bad, "shutter", { strip }, undefined, 1);
      drawRevisedFlipPanels(log.ctx, bad, false, 0);
    }
    expect(log.calls).toHaveLength(0);
    const immutableRect = Object.freeze({ ...rect });
    const sample = Object.freeze(sampleRevisedRegionAnimation("lift", 0.2));
    const before = JSON.stringify({ immutableRect, sample });
    drawRevisedRegion(log.ctx, immutableRect, "lift", Object.freeze({ frame, left, right }), sample, 0);
    expect(JSON.stringify({ immutableRect, sample })).toBe(before);
  });
});
