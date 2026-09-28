import { describe, expect, it } from "vitest";

import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import type { LevelSpec } from "../src/core/types";

const baseLevel = (overrides: Partial<LevelSpec> = {}): LevelSpec => ({
  id: 999,
  name: "advanced-video-parity-fixture",
  difficulty: "super",
  timeSeconds: 180,
  reward: 0,
  width: 4,
  height: 3,
  gates: [],
  blocks: [],
  ...overrides,
});

describe("timed bomb blocks", () => {
  const bombLevel = (bombFailurePolicy?: "fail"): LevelSpec => baseLevel({
    bombFailurePolicy,
    blocks: [{
      id: "bomb",
      x: 0,
      y: 1,
      shape: [[0, 0]],
      color: "red",
      timedBombSeconds: 5,
    }],
  });

  it("starts with the level clock but does not infer failure at zero", () => {
    const model = new PuzzleModel(bombLevel());
    expect(model.tick(1)).toBe(false);
    expect(model.snapshot().blocks[0].timedBombSeconds).toBe(5);

    model.startCountdown();
    expect(model.tick(1.25)).toBe(false);
    expect(model.snapshot().blocks[0].timedBombSeconds).toBeCloseTo(3.75, 5);
    model.tick(10);
    expect(model.snapshot()).toMatchObject({ failed: false });
    expect(model.snapshot().blocks[0].timedBombSeconds).toBe(0);
  });

  it("fails at zero only under an explicit authored fail policy", () => {
    const model = new PuzzleModel(bombLevel("fail"));
    model.startCountdown();
    model.tick(5);
    expect(model.snapshot()).toMatchObject({ failed: true });
    expect(model.addTime(30)).toBe(true);
    expect(model.snapshot()).toMatchObject({ failed: true });
  });

  it("keeps wall-clock bomb progress when an interrupted drag rolls back", () => {
    const model = new PuzzleModel(bombLevel("fail"));
    model.startCountdown();
    model.beginAction();
    expect(model.moveBlockStep("bomb", 1, 1)).toBe(true);
    model.tick(1);
    model.cancelAction();

    expect(model.snapshot().blocks[0]).toMatchObject({ x: 0, y: 1, timedBombSeconds: 4 });
    expect(model.snapshot().remainingSeconds).toBe(179);
    expect(model.undo()).toBe(false);
  });

  it("rejects invalid authored countdowns and policies", () => {
    expect(() => validateLevel(baseLevel({
      blocks: [{ id: "bad", x: 0, y: 0, shape: [[0, 0]], color: "red", timedBombSeconds: 0 }],
    }))).toThrow(/invalid timedBombSeconds/);
    expect(() => validateLevel({
      ...bombLevel(),
      bombFailurePolicy: "explode" as "fail",
    })).toThrow(/invalid bombFailurePolicy/);
  });
});

describe("flip-door exits", () => {
  it("toggles all doors only after a complete block removal", () => {
    const level = baseLevel({
      gates: [{ id: "blue-left", side: "left", offset: 0, size: 1, color: "blue" }],
      flipDoors: [{
        id: "red-top",
        side: "top",
        offset: 0,
        size: 1,
        color: "red",
        initiallyOpen: true,
      }],
      blocks: [{
        id: "shell",
        x: 0,
        y: 0,
        shape: [[0, 0]],
        color: "blue",
        layers: ["blue", "red"],
      }],
    });
    const model = new PuzzleModel(level);

    expect(model.tryExit("shell", "left")).toMatchObject({ ok: true, layerRemoved: true });
    expect(model.snapshot().flipDoors[0]).toMatchObject({ open: true });
    expect(model.tryExit("shell", "top")).toMatchObject({ ok: true, complete: true });
    expect(model.snapshot().flipDoors[0]).toMatchObject({ open: false });
  });

  it("blocks a closed door and restores a toggle through undo", () => {
    const level = baseLevel({
      gates: [{ id: "blue-left", side: "left", offset: 1, size: 1, color: "blue" }],
      flipDoors: [{
        id: "red-top",
        side: "top",
        offset: 0,
        size: 1,
        color: "red",
        initiallyOpen: true,
      }],
      blocks: [
        { id: "red", x: 0, y: 0, shape: [[0, 0]], color: "red" },
        { id: "blue", x: 0, y: 1, shape: [[0, 0]], color: "blue" },
      ],
    });
    const model = new PuzzleModel(level);
    const before = model.snapshot();
    model.beginAction();
    expect(model.tryExit("blue", "left")).toMatchObject({ ok: true });
    expect(model.commitAction()).toBe(true);
    expect(model.snapshot().flipDoors[0].open).toBe(false);
    expect(model.exitAttemptStatus("red", "top")).toBe("no-gate");

    expect(model.undo()).toBe(true);
    expect(model.snapshot()).toEqual(before);
    expect(model.exitAttemptStatus("red", "top")).toBe("ok");
  });

  it("validates state, boundary cells, and overlap with ordinary exits", () => {
    const door = {
      id: "door",
      side: "top" as const,
      offset: 0,
      size: 1,
      color: "red" as const,
      initiallyOpen: true,
    };
    expect(() => validateLevel(baseLevel({ flipDoors: [door] }))).not.toThrow();
    expect(() => validateLevel(baseLevel({
      gates: [{ id: "gate", side: "top", offset: 0, size: 1, color: "blue" }],
      flipDoors: [door],
    }))).toThrow(/overlaps another top exit/);
    expect(() => validateLevel(baseLevel({
      flipDoors: [{ ...door, initiallyOpen: "yes" as unknown as boolean }],
    }))).toThrow(/boolean initiallyOpen/);
  });
});

describe("colored grids and marker-only rotation badges", () => {
  const gridLevel = (): LevelSpec => baseLevel({
    coloredGrids: [{ id: "red-grid", color: "red", cells: [[1, 1], [2, 1]] }],
    blocks: [
      {
        id: "red-shell",
        x: 0,
        y: 1,
        shape: [[0, 0]],
        color: "red",
        layers: ["red", "blue"],
      },
      {
        id: "blue-marker",
        x: 3,
        y: 1,
        shape: [[0, 0]],
        color: "blue",
        rotationBadge: true,
      },
    ],
  });

  it("accepts the current outer colour and rejects a different colour", () => {
    const model = new PuzzleModel(gridLevel());
    expect(model.moveBlockStep("red-shell", 1, 1)).toBe(true);
    expect(model.moveBlockStep("blue-marker", 2, 1)).toBe(false);
    expect(model.snapshot().coloredGrids).toEqual([
      { id: "red-grid", color: "red", cells: [[1, 1], [2, 1]] },
    ]);
  });

  it("keeps the double-arrow badge as metadata without movement restrictions", () => {
    const model = new PuzzleModel(gridLevel());
    expect(model.snapshot().blocks.find((block) => block.id === "blue-marker")).toMatchObject({
      rotationBadge: true,
    });
    expect(model.moveBlockStep("blue-marker", 3, 0)).toBe(true);
    expect(model.moveBlockStep("blue-marker", 2, 0)).toBe(true);
  });

  it("rejects invalid grid geometry and mismatched opening occupancy", () => {
    expect(() => validateLevel(baseLevel({
      coloredGrids: [{ id: "red-grid", color: "red", cells: [[0, 0]] }],
      blocks: [{ id: "blue", x: 0, y: 0, shape: [[0, 0]], color: "blue" }],
    }))).toThrow(/mismatches colored grid/);
    expect(() => validateLevel(baseLevel({
      coloredGrids: [
        { id: "red-grid", color: "red", cells: [[1, 1]] },
        { id: "blue-grid", color: "blue", cells: [[1, 1]] },
      ],
    }))).toThrow(/colored grids overlap/);
  });
});
