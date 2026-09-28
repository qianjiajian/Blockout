import { describe, expect, it } from "vitest";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { getLevel } from "../src/core/levels";
import type { BlockSpec, LevelSpec, PuzzleSnapshot } from "../src/core/types";

const revised = (overrides: Partial<LevelSpec> = {}): LevelSpec => ({
  id: 99001, name: "revised mechanism runtime", difficulty: "normal", timeSeconds: 180,
  reward: 0, width: 5, height: 5, gates: [], blocks: [],
  mechanismRules: "revised-2026-09-21", ...overrides,
});
const block = (id: string, x: number, y: number, color: BlockSpec["color"] = "red", extra: Partial<BlockSpec> = {}): BlockSpec => ({
  id, x, y, color, shape: [[0, 0]], ...extra,
});
const visible = (snapshot: PuzzleSnapshot) => snapshot.blocks.filter((piece) => !piece.shutterId
  || snapshot.shutters.find((cover) => cover.id === piece.shutterId)?.revealed);
const expectNoOverlap = (model: PuzzleModel) => {
  const cells = visible(model.snapshot()).flatMap((piece) => piece.shape.map(([x, y]) => `${piece.x + x},${piece.y + y}`));
  expect(new Set(cells).size).toBe(cells.length);
};
const generatorLevel = (blocked = true): LevelSpec => revised({
  generators: [{ id: "machine", side: "top", offset: 1, spawn: [0, 0], queueBlockIds: ["cargo-a", "cargo-b"] }],
  blocks: [
    ...(blocked ? [block("blocker", 1, 0, "yellow")] : []),
    block("cargo-a", 0, 0, "blue", { shape: [[1, 0]] }),
    block("cargo-b", 0, 0, "green", { shape: [[1, 0]] }),
    block("outside", 4, 4, "purple"),
  ],
});

describe("revised clear events", () => {
  it("counts one peel once, toggles every door including its exit, and leaves newly revealed ice intact", () => {
    const model = new PuzzleModel(revised({
      gates: [
        { id: "body", side: "left", offset: 1, size: 1, color: "blue" },
        { id: "ice-gate", side: "right", offset: 4, size: 1, color: "yellow", frozen: 3 },
      ],
      flipDoors: [
        { id: "used", side: "left", offset: 0, size: 1, color: "red", initiallyOpen: true },
        { id: "other", side: "top", offset: 3, size: 1, color: "green", initiallyOpen: false },
      ],
      shutters: [{ id: "cover", x: 3, y: 2, width: 1, height: 1, count: 1 }],
      blocks: [
        block("shell", 0, 0, "red", { layers: ["red", "blue"], keyId: "k" }),
        block("locked", 4, 2, "orange", { lockedBy: "k" }),
        block("ice", 2, 0, "blue", { frozen: 3 }),
        block("hidden-ice", 3, 2, "purple", { frozen: 6, shutterId: "cover" }),
      ],
    }));
    expect(model.tryExit("shell", "right").ok).toBe(false);
    expect(model.snapshot().flipDoors.map((door) => door.open)).toEqual([true, false]);
    expect(model.tryExit("shell", "left")).toMatchObject({ ok: true, layerRemoved: true });
    expect(model.snapshot().flipDoors.map((door) => door.open)).toEqual([false, true]);
    expect(model.snapshot().gates.find((gate) => gate.id === "ice-gate")?.frozen).toBe(2);
    expect(model.getBlock("ice")?.frozen).toBe(2);
    expect(model.getBlock("hidden-ice")?.frozen).toBe(6);
    expect(model.snapshot().shutters[0]).toMatchObject({ count: 0, revealed: true });
    expect(model.getBlock("locked")?.lockedBy).toBe("k");
    expect(model.snapshot().cleared).toBe(1);
    expect(model.moveBlockStep("shell", 0, 1)).toBe(true);
    expect(model.tryExit("shell", "left").ok).toBe(true);
    expect(model.getBlock("hidden-ice")?.frozen).toBe(5);
    expect(model.getBlock("locked")?.lockedBy).toBeUndefined();
    expect(model.snapshot().flipDoors.map((door) => door.open)).toEqual([true, false]);
    expect(model.snapshot().cleared).toBe(2);
  });

  it("retains historical peel and hidden-ice semantics without opt-in", () => {
    const model = new PuzzleModel(revised({ mechanismRules: undefined,
      flipDoors: [{ id: "red", side: "left", offset: 0, size: 1, color: "red", initiallyOpen: true }],
      shutters: [{ id: "cover", x: 3, y: 2, width: 1, height: 1, count: 1 }],
      blocks: [block("shell", 0, 0, "red", { layers: ["red", "blue"] }),
        block("hidden", 3, 2, "purple", { frozen: 6, shutterId: "cover" })],
    }));
    expect(model.tryExit("shell", "left").ok).toBe(true);
    expect(model.snapshot().flipDoors[0].open).toBe(true);
    expect(model.getBlock("hidden")?.frozen).toBe(5);
  });
});

describe("revised bomb eligibility and shell lifecycle", () => {
  it("ticks only enabled bombs, then fails at zero even without an authored failure policy", () => {
    const model = new PuzzleModel(revised({
      gates: [{ id: "key-gate", side: "left", offset: 0, size: 1, color: "red" }],
      shutters: [{ id: "cover", x: 3, y: 2, width: 1, height: 1, count: 1 }],
      blocks: [block("key", 0, 0, "red", { keyId: "k" }),
        block("frozen-bomb", 1, 2, "blue", { frozen: 1, timedBombSeconds: 5 }),
        block("locked-bomb", 2, 2, "green", { lockedBy: "k", timedBombSeconds: 5 }),
        block("hidden-bomb", 3, 2, "yellow", { shutterId: "cover", timedBombSeconds: 5 })],
    }));
    model.startCountdown();
    model.tick(10);
    for (const id of ["frozen-bomb", "locked-bomb", "hidden-bomb"]) expect(model.getBlock(id)?.timedBombSeconds).toBe(5);
    expect(model.snapshot().failed).toBe(false);
    expect(model.tryExit("key", "left").ok).toBe(true);
    model.tick(2);
    for (const id of ["frozen-bomb", "locked-bomb", "hidden-bomb"]) expect(model.getBlock(id)?.timedBombSeconds).toBe(3);
    model.tick(3);
    expect(model.snapshot().failed).toBe(true);
    const failed = model.snapshot();
    expect(model.moveBlockStep("locked-bomb", 2, 3)).toBe(false);
    expect(model.removeBlockWithBooster("locked-bomb").ok).toBe(false);
    expect(model.thawAll()).toBe(false);
    expect(model.tick(1)).toBe(false);
    expect(model.snapshot()).toEqual(failed);
  });

  it("does not tick queued bombs and starts them as soon as they materialize", () => {
    const level = generatorLevel();
    level.blocks.find((piece) => piece.id === "cargo-a")!.timedBombSeconds = 5;
    const model = new PuzzleModel(level);
    model.startCountdown(); model.tick(9);
    expect(model.snapshot().queuedBlocks.find((piece) => piece.id === "cargo-a")?.timedBombSeconds).toBe(5);
    expect(model.moveBlockStep("blocker", 1, 1)).toBe(true);
    model.tick(1);
    expect(model.getBlock("cargo-a")?.timedBombSeconds).toBe(4);
  });

  it("does not charge still-queued bombs for wall time when an unrelated drag is cancelled", () => {
    const level = generatorLevel();
    level.blocks.find((piece) => piece.id === "cargo-a")!.timedBombSeconds = 5;
    const model = new PuzzleModel(level);
    model.beginAction(); expect(model.moveBlockStep("outside", 3, 4)).toBe(true);
    model.tick(7); model.cancelAction();
    expect(model.snapshot().queuedBlocks.find((piece) => piece.id === "cargo-a")?.timedBombSeconds).toBe(5);
    expect(model.snapshot().remainingSeconds).toBe(173);
    expect(model.moveBlockStep("blocker", 1, 1)).toBe(true);
    expect(model.getBlock("cargo-a")?.timedBombSeconds).toBe(5);
    expect(model.snapshot().failed).toBe(false);
  });

  it("removes a shell bomb field entirely and never transfers its deadline to the core", () => {
    const model = new PuzzleModel(revised({
      gates: [{ id: "red", side: "left", offset: 0, size: 1, color: "red" }],
      blocks: [block("bomb", 0, 0, "red", { layers: ["red", "blue"], timedBombSeconds: 5 })],
    }));
    model.startCountdown(); model.tick(1);
    expect(model.tryExit("bomb", "left").layerRemoved).toBe(true);
    expect(Object.hasOwn(model.getBlock("bomb")!, "timedBombSeconds")).toBe(false);
    model.tick(20);
    expect(model.snapshot().failed).toBe(false);
    expect(model.getBlock("bomb")?.layers).toEqual(["blue"]);
  });

  it("cancelling a peel restores the shell while preserving elapsed bomb time", () => {
    const model = new PuzzleModel(revised({
      gates: [{ id: "red", side: "left", offset: 0, size: 1, color: "red" }],
      blocks: [block("bomb", 0, 0, "red", { layers: ["red", "blue"], timedBombSeconds: 5 })],
    }));
    model.startCountdown(); model.beginAction();
    expect(model.tryExit("bomb", "left").layerRemoved).toBe(true);
    expect(model.addTime(30)).toBe(true);
    model.tick(2); model.cancelAction();
    expect(model.getBlock("bomb")).toMatchObject({ layers: ["red", "blue"], timedBombSeconds: 3 });
    expect(model.snapshot().remainingSeconds).toBe(178);
  });
});

describe("revised spatial dispensers", () => {
  it("requires every destination cell to be free even when its center mouth is already empty", () => {
    const level = generatorLevel();
    level.blocks.find((piece) => piece.id === "cargo-a")!.shape = [[1, 0], [1, 1]];
    level.blocks.find((piece) => piece.id === "blocker")!.y = 1;
    const model = new PuzzleModel(level);
    expect(model.getBlock("cargo-a")).toBeUndefined();
    expect(model.snapshot().generators[0]).toMatchObject({ head: 0, remaining: 2 });
    expect(model.moveBlockStep("blocker", 2, 1)).toBe(true);
    expect(model.getBlock("cargo-a")).toBeDefined();
    expect(model.snapshot().generators[0]).toMatchObject({ head: 1, remaining: 1 });
    expectNoOverlap(model);
  });

  it("fills an initially free mouth once and lets that cargo block the next item", () => {
    const model = new PuzzleModel(generatorLevel(false));
    expect(model.getBlock("cargo-a")).toMatchObject({ x: 0, y: 0 });
    expect(model.getBlock("cargo-b")).toBeUndefined();
    expect(model.snapshot().generators[0]).toMatchObject({ head: 1, remaining: 1 });
    expect(model.snapshot().moves).toBe(0);
    expect(model.snapshot().started).toBe(false);
    expectNoOverlap(model);
  });

  it("releases immediately during a drag, rolls back derived cargo on cancel, and restores through undo/clone", () => {
    const model = new PuzzleModel(generatorLevel());
    const before = model.snapshot();
    model.beginAction();
    expect(model.moveBlockStep("blocker", 1, 1)).toBe(true);
    expect(model.getBlock("cargo-a")).toBeDefined();
    expect(model.snapshot().generators[0]).toMatchObject({ head: 1, remaining: 1 });
    model.tick(0.5); model.cancelAction();
    expect(model.getBlock("blocker")).toMatchObject({ x: 1, y: 0 });
    expect(model.getBlock("cargo-a")).toBeUndefined();
    expect(model.snapshot().generators[0]).toMatchObject({ head: 0, remaining: 2 });
    expect(model.snapshot().remainingSeconds).toBe(179.5);
    expectNoOverlap(model);
    const beforeCommittedMove = model.snapshot();
    model.beginAction(); expect(model.moveBlockStep("blocker", 1, 1)).toBe(true);
    expect(model.commitAction()).toBe(true);
    expect(model.clone().snapshot()).toEqual(model.snapshot());
    expect(model.undo()).toBe(true);
    expect(model.snapshot()).toEqual(beforeCommittedMove);
    expect(model.snapshot().queuedBlocks).toEqual(before.queuedBlocks);
  });

  it("does not tunnel through freshly generated cargo inside a multi-cell movement", () => {
    const model = new PuzzleModel(generatorLevel(false));
    expect(model.moveBlock("cargo-a", 0, 2)).toBe(true);
    expect(model.getBlock("cargo-b")).toBeDefined();
    expect(model.moveBlock("cargo-a", 0, 0)).toBe(true);
    expect(model.getBlock("cargo-a")?.y).toBe(1);
    expectNoOverlap(model);
  });

  it("serializes two machines competing for a shared target cell without consuming the loser", () => {
    const model = new PuzzleModel(revised({
      generators: [
        { id: "top", side: "top", offset: 2, spawn: [2, 0], queueBlockIds: ["top-cargo"] },
        { id: "right", side: "right", offset: 2, spawn: [2, 2], queueBlockIds: ["right-cargo"] },
      ],
      blocks: [block("top-cargo", 2, 0, "blue", { shape: [[0, 0], [0, 1], [0, 2]] }),
        block("right-cargo", 2, 2, "green", { shape: [[0, 0], [1, 0], [2, 0]] })],
    }));
    expect(model.snapshot().generators.map((machine) => machine.head)).toEqual([1, 0]);
    expect(model.moveBlockStep("top-cargo", 1, 0)).toBe(true);
    expect(model.snapshot().generators.map((machine) => machine.head)).toEqual([1, 1]);
    expectNoOverlap(model);
  });
});

describe("revised fixed-region lifts", () => {
  const liftLevel = (): LevelSpec => revised({
    shutters: [{ id: "lift", x: 1, y: 1, width: 2, height: 1, count: 1, skin: "lift" }],
    blocks: [block("original", 1, 1, "red"),
      block("foreign", 3, 1, "blue", { shape: [[0, 0], [0, 1]] }),
      block("hidden-a", 1, 1, "green", { shutterId: "lift", frozen: 6 }),
      block("hidden-b", 2, 1, "yellow", { shutterId: "lift" })],
  });

  it("waits for any partial overlap and reveals the entire layer after a move, without a removal", () => {
    const model = new PuzzleModel(liftLevel());
    expect(model.moveBlockStep("foreign", 2, 1)).toBe(true);
    expect(model.moveBlockStep("original", 1, 2)).toBe(true);
    expect(model.snapshot().shutters[0].revealed).toBe(false);
    expect(model.isBlockActive(model.getBlock("hidden-b")!)).toBe(false);
    expect(model.moveBlockStep("foreign", 3, 1)).toBe(true);
    expect(model.snapshot().shutters[0]).toMatchObject({ count: 0, revealed: true });
    expect(model.getBlock("original")).toBeDefined();
    expect(model.getBlock("foreign")).toBeDefined();
    expect(model.getBlock("hidden-a")?.frozen).toBe(6);
    expect(model.isBlockActive(model.getBlock("hidden-b")!)).toBe(true);
    expectNoOverlap(model);
  });

  it("atomically cancels or undoes the move together with the newly revealed batch", () => {
    const level = liftLevel();
    level.blocks = level.blocks.filter((piece) => piece.id !== "foreign");
    const model = new PuzzleModel(level);
    const before = model.snapshot();
    model.beginAction(); expect(model.moveBlockStep("original", 1, 2)).toBe(true);
    expect(model.snapshot().shutters[0].revealed).toBe(true);
    model.cancelAction(); expect(model.snapshot()).toEqual(before);
    model.beginAction(); expect(model.moveBlockStep("original", 1, 2)).toBe(true);
    model.commitAction(); expect(model.clone().snapshot()).toEqual(model.snapshot());
    model.undo(); expect(model.snapshot()).toEqual(before);
  });
});

describe("legacy autonomous deliveries during input transactions", () => {
  const timed = (blocked = false): LevelSpec => revised({ mechanismRules: undefined,
    generators: [{ id: "timer", side: "top", offset: 1, spawn: [1, 0], trigger: "time", intervalSeconds: 1, queueBlockIds: ["cargo"] }],
    blocks: [block("player", blocked ? 1 : 4, blocked ? 0 : 4, "red"), block("cargo", 1, 0, "blue")],
  });

  it("preserves autonomous inventory and cargo after cancel and latest-action undo", () => {
    for (const finish of ["cancel", "undo"] as const) {
      const model = new PuzzleModel(timed());
      model.beginAction(); expect(model.moveBlockStep("player", 3, 4)).toBe(true);
      expect(model.tick(1.1)).toBe(true);
      if (finish === "cancel") model.cancelAction();
      else { expect(model.commitAction()).toBe(true); expect(model.undo()).toBe(true); }
      expect(model.getBlock("player")).toMatchObject({ x: 4, y: 4 });
      expect(model.getBlock("cargo")).toMatchObject({ x: 1, y: 0 });
      expect(model.snapshot().queuedBlocks).toEqual([]);
      expect(model.snapshot().generators[0]).toMatchObject({ head: 1, remaining: 0 });
      expect(model.snapshot().generators[0].elapsed).toBeCloseTo(0.1);
      if (finish === "cancel") expect(model.snapshot().remainingSeconds).toBeCloseTo(178.9);
    }
    // Reproduce the originally observed cancellation bug in the unchanged
    // historical campaign data, as well as the isolated fixtures above.
    const campaign = new PuzzleModel(getLevel(70));
    campaign.beginAction();
    expect(campaign.moveBlockStep("cc-piece-s1-01", 4, 1)).toBe(true);
    expect(campaign.tick(1.1)).toBe(true);
    campaign.cancelAction();
    expect(campaign.getBlock("cc-piece-s1-01")).toMatchObject({ x: 4, y: 0 });
    expect(campaign.getBlock("cc-piece-s2-01")).toBeDefined();
    expect(campaign.snapshot().generators.find((machine) => machine.id === "vp-070-generator-1"))
      .toMatchObject({ head: 1, remaining: 16 });
    expect(campaign.snapshot().generators[0].elapsed).toBeCloseTo(0.1);
    expect(campaign.snapshot().remainingSeconds).toBeCloseTo(178.9);
  });

  it("banks a due beat while the rollback position occupies the mouth, then releases after commit", () => {
    const model = new PuzzleModel(timed(true));
    model.beginAction(); expect(model.moveBlockStep("player", 1, 1)).toBe(true);
    expect(model.tick(1.1)).toBe(false);
    expect(model.snapshot().generators[0]).toMatchObject({ head: 0, remaining: 1, elapsed: 1 });
    model.cancelAction();
    expect(model.getBlock("player")).toMatchObject({ x: 1, y: 0 });
    expect(model.getBlock("cargo")).toBeUndefined();
    expect(model.snapshot().generators[0].elapsed).toBe(1);
    model.beginAction(); expect(model.moveBlockStep("player", 1, 1)).toBe(true); model.commitAction();
    expect(model.tick(0)).toBe(true);
    expect(model.getBlock("cargo")).toMatchObject({ x: 1, y: 0 });
  });
});

describe("revised construction contracts", () => {
  it("rejects colored floors with a shell anywhere, including hidden or queued cargo", () => {
    const level = generatorLevel();
    level.coloredGrids = [{ id: "floor", color: "purple", cells: [[4, 4]] }];
    level.blocks.find((piece) => piece.id === "cargo-a")!.layers = ["blue", "green"];
    expect(() => validateLevel(level)).toThrow();
  });

  it("rejects timed dispensers, nonspatial staging and hidden blocks outside a physical cover", () => {
    const timedLevel = generatorLevel();
    timedLevel.generators![0].trigger = "time"; timedLevel.generators![0].intervalSeconds = 1;
    expect(() => new PuzzleModel(timedLevel)).toThrow();
    expect(() => new PuzzleModel(revised({
      shutters: [{ id: "stage", x: 1, y: 1, width: 1, height: 1, count: 1, skin: "staging" }],
      blocks: [block("hidden", 1, 1, "blue", { shutterId: "stage" })],
    }))).toThrow();
    expect(() => new PuzzleModel(revised({
      shutters: [{ id: "cover", x: 1, y: 1, width: 1, height: 1, count: 1 }],
      blocks: [block("hidden", 3, 1, "blue", { shutterId: "cover" })],
    }))).toThrow();
  });
});
