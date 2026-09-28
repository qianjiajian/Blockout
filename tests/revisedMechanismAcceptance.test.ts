import { describe, expect, it } from "vitest";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import type { BlockSpec, LevelSpec, MovementAxis, Point, Side } from "../src/core/types";

const level = (overrides: Partial<LevelSpec> = {}): LevelSpec => ({
  id: 99301, name: "v1.1 independent mechanic acceptance", difficulty: "normal",
  timeSeconds: 90, reward: 0, width: 5, height: 5, gates: [], blocks: [],
  mechanismRules: "revised-2026-09-21-v1.1", ...overrides,
});
const block = (id: string, x: number, y: number, color: BlockSpec["color"], extra: Partial<BlockSpec> = {}): BlockSpec => ({
  id, x, y, color, shape: [[0, 0]], ...extra,
});

describe("v1.1 isolated acceptance: previously uncovered mechanism boundaries", () => {
  for (const movementAxis of ["horizontal", "vertical"] as MovementAxis[]) {
    it(`M02 ${movementAxis}: permits both axis directions, refuses cross-axis movement and exits`, () => {
      const horizontal = movementAxis === "horizontal";
      const moveBack: Point = horizontal ? [0, 1] : [1, 0];
      const moveForward: Point = [1, 1];
      const crossAxis: Point = horizontal ? [1, 2] : [2, 1];
      const permittedSide: Side = horizontal ? "left" : "top";
      const model = new PuzzleModel(level({
        gates: [{ id: "axis-exit", side: permittedSide, offset: 1, size: 1, color: "red" }],
        blocks: [block("arrow", 1, 1, "red", { movementAxis })],
      }));
      expect(model.moveBlockStep("arrow", ...moveBack)).toBe(true);
      expect(model.moveBlockStep("arrow", ...moveForward)).toBe(true);
      const before = model.snapshot();
      expect(model.moveBlockStep("arrow", ...crossAxis)).toBe(false);
      expect(model.moveBlock("arrow", ...crossAxis)).toBe(false);
      expect(model.snapshot()).toEqual(before);
      expect(model.moveBlockStep("arrow", ...moveBack)).toBe(true);
      expect(model.tryExit("arrow", permittedSide).ok).toBe(true);

      const prohibitedSide: Side = horizontal ? "top" : "left";
      const prohibitedAnchor: Point = horizontal ? [1, 0] : [0, 1];
      const prohibited = new PuzzleModel(level({
        gates: [{ id: "cross-axis-exit", side: prohibitedSide, offset: 1, size: 1, color: "red" }],
        blocks: [block("arrow", ...prohibitedAnchor, "red", { movementAxis })],
      }));
      expect(prohibited.exitAttemptStatus("arrow", prohibitedSide)).toBe("no-gate");
      expect(prohibited.tryExit("arrow", prohibitedSide).ok).toBe(false);
    });
  }

  it("M03 / A02: a shell key unlocks only on body removal, applies to every same-group lock and not other groups", () => {
    const model = new PuzzleModel(level({
      gates: [
        { id: "outer-exit", side: "left", offset: 0, size: 1, color: "red" },
        { id: "body-exit", side: "left", offset: 1, size: 1, color: "blue" },
        { id: "second-exit", side: "left", offset: 2, size: 1, color: "green" },
        { id: "other-exit", side: "left", offset: 4, size: 1, color: "pink" },
      ],
      blocks: [
        block("shell-key", 0, 0, "red", { layers: ["red", "blue"], keyId: "gold-token" }),
        block("second-key", 0, 2, "green", { keyId: "gold-token" }),
        block("other-key", 0, 4, "pink", { keyId: "silver-token" }),
        block("two-lock", 3, 1, "yellow", { lockedBy: "gold-token", lockCount: 2 }),
        block("one-lock", 3, 2, "purple", { lockedBy: "gold-token" }),
        block("other-lock", 3, 3, "orange", { lockedBy: "silver-token" }),
      ],
    }));
    expect(model.moveBlockStep("two-lock", 2, 1)).toBe(false);
    expect(model.tryExit("shell-key", "left")).toMatchObject({ ok: true, layerRemoved: true });
    expect(model.getBlock("two-lock")).toMatchObject({ lockedBy: "gold-token", lockCount: 2 });
    expect(model.getBlock("one-lock")?.lockedBy).toBe("gold-token");
    // The key group is independent of both red shell and blue body exit colours.
    expect(model.moveBlockStep("shell-key", 0, 1)).toBe(true);
    expect(model.tryExit("shell-key", "left").ok).toBe(true);
    expect(model.getBlock("two-lock")).toMatchObject({ lockedBy: "gold-token", lockCount: 1 });
    expect(model.getBlock("one-lock")?.lockedBy).toBeUndefined();
    expect(model.getBlock("other-lock")?.lockedBy).toBe("silver-token");
    expect(model.tryExit("second-key", "left").ok).toBe(true);
    expect(model.getBlock("two-lock")?.lockedBy).toBeUndefined();
    expect(model.moveBlockStep("two-lock", 2, 1)).toBe(true);
    expect(model.getBlock("other-lock")?.lockedBy).toBe("silver-token");
  });

  it("M04: requires the matching star exit, keeps its star after use and also admits ordinary same-colour blocks", () => {
    // Duplicate same-colour exits are deliberate comparator fixtures, not
    // generated candidates; the generation-only unique-colour gate is separate.
    const model = new PuzzleModel(level({
      gates: [
        { id: "ordinary-red", side: "left", offset: 0, size: 1, color: "red" },
        { id: "star-red", side: "right", offset: 0, size: 1, color: "red", star: true },
        { id: "star-blue", side: "right", offset: 1, size: 1, color: "blue", star: true },
      ],
      blocks: [block("star", 0, 0, "red", { star: true }), block("ordinary", 3, 1, "red")],
    }));
    expect(model.exitAttemptStatus("star", "left")).toBe("star-gate-required");
    expect(model.tryExit("star", "left").ok).toBe(false);
    expect(model.moveBlock("star", 4, 0)).toBe(true);
    expect(model.tryExit("star", "right").ok).toBe(true);
    expect(model.snapshot().gates.find((gate) => gate.id === "star-red")?.star).toBe(true);
    expect(model.moveBlockStep("ordinary", 4, 1)).toBe(true);
    expect(model.exitAttemptStatus("ordinary", "right")).toBe("wrong-color");
    expect(model.moveBlockStep("ordinary", 4, 0)).toBe(true);
    expect(model.tryExit("ordinary", "right").ok).toBe(true);
    expect(model.snapshot().gates.find((gate) => gate.id === "star-red")?.star).toBe(true);
    expect(model.snapshot().complete).toBe(true);
  });

  it("M06 / A08: a coloured floor admits only its colour, never consumes the block and persists after departure", () => {
    const model = new PuzzleModel(level({
      coloredGrids: [{ id: "red-floor", color: "red", cells: [[1, 1]] }],
      blocks: [block("red", 0, 1, "red"), block("blue", 1, 0, "blue")],
    }));
    expect(model.moveBlockStep("blue", 1, 1)).toBe(false);
    expect(model.moveBlockStep("red", 1, 1)).toBe(true);
    expect(model.getBlock("red")).toMatchObject({ x: 1, y: 1, color: "red" });
    expect(model.snapshot()).toMatchObject({ cleared: 0, complete: false });
    expect(model.moveBlockStep("red", 2, 1)).toBe(true);
    expect(model.moveBlockStep("blue", 1, 1)).toBe(false);
    expect(model.snapshot().coloredGrids).toEqual([{ id: "red-floor", color: "red", cells: [[1, 1]] }]);
    expect(model.snapshot().blocks).toHaveLength(2);
  });

  it("M11: translates an L as one rigid shape and allows an unrelated block in its bounding-box notch", () => {
    const shape: Point[] = [[0, 0], [0, 1], [1, 1]];
    const model = new PuzzleModel(level({
      blocks: [block("ell", 0, 0, "red", { shape }), block("notch-neighbour", 2, 0, "blue")],
    }));
    expect(model.moveBlockStep("ell", 1, 0)).toBe(true);
    expect(model.blockCells(model.getBlock("ell")!)).toEqual([[1, 0], [1, 1], [2, 1]]);
    expect(model.getBlock("notch-neighbour")).toMatchObject({ x: 2, y: 0 });
    expect(model.moveBlockStep("ell", 2, 0)).toBe(false);
    expect(model.getBlock("ell")?.shape).toEqual(shape);
    expect(model.snapshot().blocks).toHaveLength(2);
  });

  it("M12: rejects missing cells on a connected symmetric irregular mask instead of tunnelling across its gap", () => {
    const playable: Point[] = [];
    for (let y = 0; y < 3; y += 1) for (let x = 0; x < 5; x += 1) if (x !== 2 || y === 2) playable.push([x, y]);
    const model = new PuzzleModel(level({ width: 5, height: 3, playable, blocks: [block("red", 0, 0, "red")] }));
    expect(model.moveBlockStep("red", 1, 0)).toBe(true);
    expect(model.moveBlockStep("red", 2, 0)).toBe(false);
    expect(model.moveBlock("red", 4, 0)).toBe(false);
    expect(model.getBlock("red")).toMatchObject({ x: 1, y: 0 });
    expect(model.moveBlockStep("red", 1, 1)).toBe(true);
    expect(model.moveBlockStep("red", 1, 2)).toBe(true);
    expect(model.moveBlockStep("red", 2, 2)).toBe(true);
  });

  it("M12: rejects movement across a physical seam and initial rigid blocks straddling it", () => {
    const input = level({
      height: 3, seams: [{ orientation: "vertical", offset: 2, start: 0, size: 3 }],
      blocks: [block("red", 1, 1, "red")],
    });
    const model = new PuzzleModel(input);
    expect(model.moveBlockStep("red", 2, 1)).toBe(false);
    expect(model.moveBlock("red", 4, 1)).toBe(false);
    expect(model.getBlock("red")).toMatchObject({ x: 1, y: 1 });
    expect(() => validateLevel({ ...input, blocks: [block("straddler", 1, 1, "red", { shape: [[0, 0], [1, 0]] })] }))
      .toThrow(/seam/i);
  });

  it("M13/M14/M15 / A01: exactly one peel thaws an ice block and its gate, preserving the core in place", () => {
    const model = new PuzzleModel(level({
      gates: [
        { id: "shell-exit", side: "left", offset: 0, size: 1, color: "red" },
        { id: "ice-exit", side: "left", offset: 1, size: 1, color: "blue", frozen: 1 },
      ],
      blocks: [block("shell", 0, 0, "red", { layers: ["red", "green"] }), block("ice", 0, 1, "blue", { frozen: 1 })],
    }));
    expect(model.moveBlockStep("ice", 1, 1)).toBe(false);
    expect(model.tryExit("ice", "left").ok).toBe(false);
    expect(model.tryExit("shell", "left")).toMatchObject({ ok: true, layerRemoved: true, complete: false });
    expect(model.getBlock("shell")).toMatchObject({ x: 0, y: 0, shape: [[0, 0]], color: "green", layers: ["green"] });
    expect(model.getBlock("ice")?.frozen).toBe(0);
    expect(model.snapshot().gates.find((gate) => gate.id === "ice-exit")?.frozen).toBe(0);
    expect(model.snapshot().cleared).toBe(1);
    expect(model.tryExit("ice", "left").ok).toBe(true);
    expect(model.snapshot().cleared).toBe(2);
    expect(model.snapshot().gates.every((gate) => gate.frozen >= 0)).toBe(true);
  });

  it("M15: construction rejects a third layer or a shell identical to its core", () => {
    expect(() => new PuzzleModel(level({ blocks: [block("too-many", 1, 1, "red", { layers: ["red", "blue", "green"] })] })))
      .toThrow(/at most one extra shell/i);
    expect(() => new PuzzleModel(level({ blocks: [block("same", 1, 1, "red", { layers: ["red", "red"] })] })))
      .toThrow(/distinct outer and inner/i);
  });

  it("M01/M07 / A15: failure cannot move a blocker, dispatch waiting cargo or advance any further clocks", () => {
    const model = new PuzzleModel(level({
      generators: [{ id: "machine", side: "top", offset: 2, spawn: [2, 0], queueBlockIds: ["cargo"] }],
      blocks: [block("blocker", 2, 0, "red"), block("cargo", 2, 0, "green"), block("bomb", 0, 4, "blue", { timedBombSeconds: 1 })],
    }));
    model.startCountdown(); model.tick(1);
    expect(model.snapshot().failed).toBe(true);
    const failed = model.snapshot();
    expect(model.moveBlockStep("blocker", 2, 1)).toBe(false);
    expect(model.removeBlockWithBooster("blocker").ok).toBe(false);
    expect(model.thawAll()).toBe(false);
    expect(model.tick(10)).toBe(false);
    expect(model.snapshot()).toEqual(failed);
    expect(model.snapshot().generators[0]).toMatchObject({ head: 0, remaining: 1 });
  });

  it("M05 / A15: completion cannot toggle the used door twice or accept subsequent operations", () => {
    const model = new PuzzleModel(level({
      flipDoors: [{ id: "red-door", side: "left", offset: 0, size: 1, color: "red", initiallyOpen: true }],
      blocks: [block("last", 0, 0, "red")],
    }));
    expect(model.tryExit("last", "left")).toMatchObject({ ok: true, complete: true });
    const completed = model.snapshot();
    expect(completed.flipDoors[0].open).toBe(false);
    expect(model.tryExit("last", "left").ok).toBe(false);
    expect(model.moveBlockStep("last", 1, 0)).toBe(false);
    expect(model.thawAll()).toBe(false);
    model.startCountdown();
    expect(model.tick(100)).toBe(false);
    expect(model.snapshot()).toEqual(completed);
  });
});
