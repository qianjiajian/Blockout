import { describe, expect, it } from "vitest";
import {
  GENERATOR_SPAWN_REDUCED_MOTION_SCALE,
  GENERATOR_SPAWN_TIMING,
  generatorSpawnAnimation,
  generatorSpawnBatchOffset,
  generatorSpawnTranslation,
  generatorSpawnVectorTranslation,
  resolveGeneratorSpawnDisplay,
  type GeneratorSpawnDirection,
} from "../src/game/generatorSpawnAnimation";

const EPSILON = 1e-9;

describe("generator spawn animation", () => {
  it("encodes the observed 30 fps phase boundaries", () => {
    expect(GENERATOR_SPAWN_TIMING.countChangeSeconds).toBeCloseTo(0.1, 12);
    expect(GENERATOR_SPAWN_TIMING.appearanceSeconds).toBeCloseTo(0.233333333333, 12);
    expect(GENERATOR_SPAWN_TIMING.placementSeconds).toBeCloseTo(0.366666666667, 12);
    expect(GENERATOR_SPAWN_TIMING.endSeconds).toBeCloseTo(0.6, 12);

    expect(generatorSpawnAnimation({ elapsedSeconds: 0.1 - EPSILON, direction: "left" }).phase)
      .toBe("delay");
    expect(generatorSpawnAnimation({ elapsedSeconds: 0.1, direction: "left" }).phase)
      .toBe("preview-blank");
    expect(generatorSpawnAnimation({ elapsedSeconds: 7 / 30, direction: "left" }).phase)
      .toBe("emerging");
    expect(generatorSpawnAnimation({ elapsedSeconds: 11 / 30, direction: "left" }).phase)
      .toBe("settled");
    expect(generatorSpawnAnimation({ elapsedSeconds: 18 / 30, direction: "left" }).phase)
      .toBe("complete");
  });

  it("keeps the old display, blanks it after the count advances, then restores the next preview", () => {
    const oldState = generatorSpawnAnimation({ elapsedSeconds: 0.05, direction: "left" });
    const blankState = generatorSpawnAnimation({ elapsedSeconds: 0.2, direction: "left" });
    const settledState = generatorSpawnAnimation({ elapsedSeconds: 0.5, direction: "left" });
    const completeState = generatorSpawnAnimation({ elapsedSeconds: 0.6, direction: "left" });

    expect(oldState.display).toEqual({ head: "outgoing", remaining: "before", preview: "outgoing" });
    expect(blankState.display).toEqual({ head: "next", remaining: "after", preview: "blank" });
    expect(settledState.display).toEqual(blankState.display);
    expect(completeState.display).toEqual({ head: "next", remaining: "after", preview: "next" });

    const values = {
      outgoingHead: "red-bar",
      nextHead: "yellow-l",
      remainingBefore: 6,
      remainingAfter: 5,
    };
    expect(resolveGeneratorSpawnDisplay(oldState.display, values)).toEqual({
      head: "red-bar",
      remaining: 6,
      preview: "red-bar",
    });
    expect(resolveGeneratorSpawnDisplay(blankState.display, values)).toEqual({
      head: "yellow-l",
      remaining: 5,
      preview: null,
    });
    expect(resolveGeneratorSpawnDisplay(completeState.display, values)).toEqual({
      head: "yellow-l",
      remaining: 5,
      preview: "yellow-l",
    });
  });

  it("reveals only the animated proxy until full placement, then unlocks at the end", () => {
    const beforeAppearance = generatorSpawnAnimation({ elapsedSeconds: 0.2, direction: "left" });
    const emerging = generatorSpawnAnimation({ elapsedSeconds: 0.3, direction: "left" });
    const settled = generatorSpawnAnimation({ elapsedSeconds: 0.5, direction: "left" });
    const complete = generatorSpawnAnimation({ elapsedSeconds: 0.6, direction: "left" });

    expect(beforeAppearance).toMatchObject({
      progress: 0,
      spawnProxyVisible: false,
      hideNormalBlock: true,
      interactionLocked: true,
    });
    expect(emerging.progress).toBeCloseTo(0.5, 12);
    expect(emerging).toMatchObject({
      spawnProxyVisible: true,
      hideNormalBlock: true,
      interactionLocked: true,
    });
    expect(settled).toMatchObject({
      progress: 1,
      spawnProxyVisible: false,
      hideNormalBlock: false,
      interactionLocked: true,
    });
    expect(complete).toMatchObject({
      progress: 1,
      hideNormalBlock: false,
      interactionLocked: false,
      complete: true,
      timelineProgress: 1,
    });
  });

  it("returns an inward translation for every generator side", () => {
    const expected: Record<GeneratorSpawnDirection, { x: number; y: number }> = {
      left: { x: -80, y: 0 },
      right: { x: 80, y: 0 },
      top: { x: 0, y: -80 },
      bottom: { x: 0, y: 80 },
    };

    for (const direction of Object.keys(expected) as GeneratorSpawnDirection[]) {
      expect(generatorSpawnTranslation(direction, 0.2, 100)).toEqual(expected[direction]);
      expect(generatorSpawnTranslation(direction, 1, 100)).toEqual({ x: 0, y: 0 });
    }
  });

  it("interpolates an exact local-mouth vector for inset and irregular rims", () => {
    expect(generatorSpawnVectorTranslation({ x: -3, y: 2 }, 0)).toEqual({ x: -3, y: 2 });
    expect(generatorSpawnVectorTranslation({ x: -3, y: 2 }, 0.25)).toEqual({ x: -2.25, y: 1.5 });
    expect(generatorSpawnVectorTranslation({ x: -3, y: 2 }, 1)).toEqual({ x: 0, y: 0 });

    const state = generatorSpawnAnimation({
      elapsedSeconds: 0.3,
      direction: "bottom",
      travelDistance: 99,
      startTranslation: { x: -3, y: 2 },
    });
    expect(state.progress).toBeCloseTo(0.5, 12);
    expect(state.translation).toEqual({ x: -1.5, y: 1 });
  });

  it("compresses reduced motion while preserving every causal phase", () => {
    const scale = GENERATOR_SPAWN_REDUCED_MOTION_SCALE;
    const phaseAt = (normalTime: number) => generatorSpawnAnimation({
      elapsedSeconds: normalTime * scale,
      direction: "top",
      reducedMotion: true,
    }).phase;

    expect(phaseAt(0.05)).toBe("delay");
    expect(phaseAt(0.1)).toBe("preview-blank");
    expect(phaseAt(7 / 30)).toBe("emerging");
    expect(phaseAt(11 / 30)).toBe("settled");
    expect(phaseAt(18 / 30)).toBe("complete");
    expect(generatorSpawnAnimation({
      elapsedSeconds: 0,
      direction: "top",
      reducedMotion: true,
    }).durationSeconds).toBeCloseTo(0.3, 12);
  });

  it("supports sequential batch offsets without changing the item timeline", () => {
    expect(generatorSpawnBatchOffset(0)).toBe(0);
    expect(generatorSpawnBatchOffset(2)).toBeCloseTo(1.2, 12);
    expect(generatorSpawnBatchOffset(3, 0.25)).toBe(0.75);

    const offset = generatorSpawnBatchOffset(2);
    const scheduled = generatorSpawnAnimation({
      elapsedSeconds: 1,
      timeOffsetSeconds: offset,
      direction: "bottom",
    });
    const emerging = generatorSpawnAnimation({
      elapsedSeconds: offset + 0.3,
      timeOffsetSeconds: offset,
      direction: "bottom",
    });

    expect(scheduled).toMatchObject({
      phase: "scheduled",
      interactionLocked: true,
      hideNormalBlock: true,
    });
    expect(scheduled.localElapsedSeconds).toBeCloseTo(-0.2, 12);
    expect(emerging.phase).toBe("emerging");
    expect(emerging.progress).toBeCloseTo(0.5, 12);
  });

  it("sanitizes invalid clocks, offsets, indices, progress, and distances", () => {
    expect(generatorSpawnBatchOffset(-3)).toBe(0);
    expect(generatorSpawnBatchOffset(Number.NaN)).toBe(0);
    expect(generatorSpawnTranslation("right", Number.NaN, Number.NaN)).toEqual({ x: 1, y: 0 });
    expect(generatorSpawnTranslation("left", 2, -100)).toEqual({ x: 0, y: 0 });

    const state = generatorSpawnAnimation({
      elapsedSeconds: Number.NaN,
      timeOffsetSeconds: Number.POSITIVE_INFINITY,
      travelDistance: -20,
      direction: "right",
    });
    expect(state.phase).toBe("delay");
    expect(state.localElapsedSeconds).toBe(0);
    expect(state.translation).toEqual({ x: 0, y: 0 });
  });
});
