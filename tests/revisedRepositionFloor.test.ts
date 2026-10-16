import { describe, expect, it, vi } from "vitest";
import { PuzzleModel } from "../src/core/PuzzleModel";
import { checkRevisedRepositionFloor, type RevisedRepositionDrag } from "../src/core/revisedRepositionFloor";
import type { LevelSpec } from "../src/core/types";

const fixture = (overrides: Partial<LevelSpec> = {}): LevelSpec => ({
  id: 98710, name: "isolated relaxed bound fixture", mechanismRules: "revised-2026-09-21-v1.2",
  difficulty: "normal", width: 3, height: 3, timeSeconds: 60, reward: 0,
  gates: [{ id: "red-gate", color: "red", side: "left", offset: 0, size: 1 }],
  blocks: [{ id: "red", color: "red", x: 1, y: 1, shape: [[0, 0]] }],
  ...overrides,
});

const parking = (): LevelSpec => fixture({ height: 2,
  gates: [
    { id: "red-gate", color: "red", side: "left", offset: 0, size: 1 },
    { id: "blue-gate", color: "blue", side: "top", offset: 1, size: 1 },
  ],
  blocks: [
    { id: "red", color: "red", x: 1, y: 0, shape: [[0, 0], [1, 0]] },
    { id: "blue", color: "blue", x: 0, y: 0, shape: [[0, 0]] },
  ],
});

const replayRelaxed = (level: LevelSpec, route: readonly RevisedRepositionDrag[]) => {
  const model = new PuzzleModel(level);
  model.startCountdown();
  let cost = 0;
  for (const drag of route) {
    const clears = model.snapshot().cleared;
    model.beginAction();
    for (const [x, y] of drag.path) expect(model.moveBlockStep(drag.blockId, x, y)).toBe(true);
    if (drag.exitSide) expect(model.tryExit(drag.blockId, drag.exitSide).ok).toBe(true);
    expect(model.commitAction()).toBe(true);
    if (model.snapshot().cleared === clears) cost += 1;
  }
  return { model, cost };
};

const check = (level: LevelSpec, floor: number) => checkRevisedRepositionFloor(level, {
  floor, maxStates: 10000, maxDragStates: 2000, maxTransitions: 500000, maxMilliseconds: 20000,
});

describe("revised non-clearing drag threshold relaxation", () => {
  it("counts many cells and a turn as one zero-cost clearing gesture", () => {
    const level = fixture();
    const before = JSON.stringify(level);
    const result = check(level, 1);
    expect(result).toMatchObject({ status: "relaxed-shortcut", thresholdProven: false,
      relaxedNonClearingDrags: 0, solvabilityValidated: false, pointerReplayValidated: false,
      timeValidated: false, releaseApproved: false, hashBindingRequired: true });
    expect(result.relaxedRoute).toHaveLength(1);
    expect(result.relaxedRoute![0].path.length).toBeGreaterThanOrEqual(2);
    expect(replayRelaxed(level, result.relaxedRoute!)).toMatchObject({ cost: 0 });
    expect(JSON.stringify(level)).toBe(before);
  });

  it("proves only a threshold, while the next threshold has a relaxed parking route", () => {
    expect(check(parking(), 1)).toMatchObject({ status: "threshold-proven", thresholdProven: true,
      termination: "below-threshold-exhausted", releaseApproved: false, solvabilityValidated: false });
    const result = check(parking(), 2);
    expect(result).toMatchObject({ status: "relaxed-shortcut", relaxedNonClearingDrags: 1 });
    const replay = replayRelaxed(parking(), result.relaxedRoute!);
    expect(replay.cost).toBe(1);
    expect(replay.model.snapshot().complete).toBe(true);
  });

  it("a peel costs zero and switches the used flip door as well as the other door", () => {
    const level = fixture({ gates: [],
      flipDoors: [
        { id: "red-door", color: "red", side: "left", offset: 0, size: 1, initiallyOpen: true },
        { id: "blue-door", color: "blue", side: "top", offset: 0, size: 1, initiallyOpen: false },
      ],
      blocks: [{ id: "red", color: "red", x: 0, y: 0, shape: [[0, 0]], layers: ["red", "blue"] }],
    });
    const result = check(level, 1);
    expect(result).toMatchObject({ status: "relaxed-shortcut", relaxedNonClearingDrags: 0 });
    expect(result.relaxedRoute).toHaveLength(2);
    const first = replayRelaxed(level, result.relaxedRoute!.slice(0, 1));
    expect(first.model.snapshot().flipDoors.map((door) => door.open)).toEqual([false, true]);
    expect(first.model.snapshot().cleared).toBe(1);
    expect(replayRelaxed(level, result.relaxedRoute!).model.snapshot().complete).toBe(true);
  });

  it("retains immediate queue releases through a multi-cell held gesture", () => {
    const level = fixture({ gates: [
      { id: "red-gate", color: "red", side: "right", offset: 1, size: 1 },
      { id: "blue-gate", color: "blue", side: "left", offset: 1, size: 1 },
      { id: "green-gate", color: "green", side: "bottom", offset: 1, size: 1 },
    ], blocks: [
      { id: "red", color: "red", x: 1, y: 0, shape: [[0, 0]] },
      { id: "blue", color: "blue", x: 1, y: 0, shape: [[0, 0]] },
      { id: "green", color: "green", x: 1, y: 0, shape: [[0, 0]] },
    ], generators: [{ id: "machine", side: "top", offset: 1, spawn: [1, 0], queueBlockIds: ["blue", "green"] }] });
    const result = check(level, 1);
    expect(result).toMatchObject({ status: "relaxed-shortcut", relaxedNonClearingDrags: 0 });
    const replay = replayRelaxed(level, result.relaxedRoute!);
    expect(replay.model.snapshot()).toMatchObject({ complete: true, cleared: 3, queuedBlocks: [] });
    expect(replay.model.snapshot().generators[0].remaining).toBe(0);
  });

  it("keeps derived reveal mutations when a held block returns to its original anchor", () => {
    const level = fixture({ blocks: [
      { id: "red", color: "red", x: 0, y: 0, shape: [[0, 0]] },
      { id: "blue", color: "blue", x: 1, y: 0, shape: [[0, 0]], shutterId: "lift" },
    ], gates: [
      { id: "red-gate", color: "red", side: "left", offset: 2, size: 1 },
      { id: "blue-gate", color: "blue", side: "top", offset: 1, size: 1 },
    ], shutters: [{ id: "lift", x: 0, y: 0, width: 2, height: 1, count: 1, skin: "lift" }] });
    const returned = replayRelaxed(level, [{ blockId: "red", path: [[0, 1], [0, 0]] }]);
    expect(returned.cost).toBe(1);
    expect(returned.model.getBlock("red")).toMatchObject({ x: 0, y: 0 });
    expect(returned.model.snapshot().shutters[0].revealed).toBe(true);
    const commit = PuzzleModel.prototype.commitAction;
    let searchCommittedReturnAndReveal = 0;
    const spy = vi.spyOn(PuzzleModel.prototype, "commitAction").mockImplementation(function (this: PuzzleModel, countMove?: boolean) {
      const committed = commit.call(this, countMove);
      const state = this.snapshot();
      if (committed && state.cleared === 0 && state.shutters[0]?.revealed
        && this.getBlock("red")?.x === 0 && this.getBlock("red")?.y === 0) searchCommittedReturnAndReveal += 1;
      return committed;
    });
    try {
      const result = check(level, 1);
      expect(result).toMatchObject({ status: "relaxed-shortcut", relaxedNonClearingDrags: 0 });
      expect(searchCommittedReturnAndReveal).toBeGreaterThan(0);
      expect(replayRelaxed(level, result.relaxedRoute!).model.snapshot().complete).toBe(true);
    } finally { spy.mockRestore(); }
  });

  it("improves previously discovered costs instead of treating first discovery as final", () => {
    const level = fixture({ gates: [
      { id: "r", color: "red", side: "left", offset: 0, size: 1 },
      { id: "b", color: "blue", side: "bottom", offset: 1, size: 1 },
      { id: "g", color: "green", side: "right", offset: 1, size: 1 },
      { id: "p", color: "pink", side: "top", offset: 2, size: 1 },
    ], blocks: [
      { id: "p0", color: "red", layers: ["red", "blue"], x: 0, y: 1, shape: [[0, 0]] },
      { id: "p1", color: "blue", x: 2, y: 1, shape: [[0, 0]] },
      { id: "p2", color: "green", x: 2, y: 2, shape: [[0, 0]] },
      { id: "p3", color: "pink", x: 1, y: 2, shape: [[0, 0]] },
      { id: "p4", color: "red", x: 1, y: 1, shape: [[0, 0]] },
      { id: "p5", color: "blue", x: 2, y: 0, shape: [[0, 0]] },
    ] });
    const result = check(level, 3);
    expect(result).toMatchObject({ status: "relaxed-shortcut", relaxedNonClearingDrags: 1 });
    expect(result.improvedStateCosts).toBeGreaterThan(0);
    expect(replayRelaxed(level, result.relaxedRoute!).cost).toBe(1);
    expect(check(level, 1).status).toBe("threshold-proven");
  });

  it("deliberately includes motion away from a usable gate, unlike the real pointer subset", () => {
    const level = fixture({ blocks: [{ id: "red", color: "red", x: 0, y: 0, shape: [[0, 0]] }] });
    const move = PuzzleModel.prototype.moveBlockStep;
    let optionalGateMoves = 0;
    const spy = vi.spyOn(PuzzleModel.prototype, "moveBlockStep").mockImplementation(function (this: PuzzleModel, id, x, y) {
      const block = this.getBlock(id);
      const atGate = block && this.possibleExitSides(block).length > 0;
      const moved = move.call(this, id, x, y);
      if (atGate && moved) optionalGateMoves += 1;
      return moved;
    });
    try {
      expect(check(level, 1)).toMatchObject({ status: "relaxed-shortcut", pointerReplayValidated: false });
      expect(optionalGateMoves).toBeGreaterThan(0);
    } finally { spy.mockRestore(); }
  });

  it("does not claim solvability when no completion exists in the relaxed graph", () => {
    const level = fixture({ width: 3, height: 2,
      blocks: [{ id: "red", color: "red", x: 0, y: 0, shape: [[0, 0], [1, 0], [2, 0], [1, 1]] }],
      gates: [{ id: "narrow", color: "red", side: "bottom", offset: 1, size: 1 }],
    });
    expect(check(level, 10)).toMatchObject({ status: "threshold-proven", thresholdProven: true,
      solvabilityValidated: false, releaseApproved: false });
  });

  it("also supports qualified v1.1, but refuses unknown/old profiles and clocks", () => {
    expect(check(fixture({ mechanismRules: "revised-2026-09-21-v1.1" }), 1).status).toBe("relaxed-shortcut");
    for (const mechanismRules of [undefined, "revised-2026-09-21", "unapproved"]) {
      const level = fixture({ mechanismRules: mechanismRules as LevelSpec["mechanismRules"] });
      expect(check(level, 1)).toMatchObject({ status: "unsupported", thresholdProven: false });
    }
    const bomb = fixture();
    bomb.blocks[0].timedBombSeconds = 5;
    const before = JSON.stringify(bomb);
    expect(check(bomb, 1).status).toBe("unsupported");
    expect(JSON.stringify(bomb)).toBe(before);
    expect(check(fixture({ generators: [{ id: "timed", side: "top", offset: 1, spawn: [1, 0], queueBlockIds: [], trigger: "time" }] }), 1).status).toBe("unsupported");
    expect(check(fixture({ shutters: [{ id: "staged", x: 0, y: 0, width: 1, height: 1, count: 1, skin: "staging" }] }), 1).status).toBe("unsupported");
  });

  it("qualifies v1.4 without boosters or pending flip-door animations, without rewriting the profile", () => {
    const level = { ...parking(), mechanismRules: "revised-2026-09-23-v1.4" } as LevelSpec;
    const before = JSON.stringify(level);
    expect(check(level, 1)).toMatchObject({ status: "threshold-proven", thresholdProven: true });
    const result = check(level, 2);
    expect(result).toMatchObject({ status: "relaxed-shortcut", relaxedNonClearingDrags: 1,
      pointerReplayValidated: false, timeValidated: false, solvabilityValidated: false });
    const { model, cost } = replayRelaxed(level, result.relaxedRoute!);
    expect(cost).toBe(1);
    expect(model.snapshot()).toMatchObject({ complete: true, mechanismRules: "revised-2026-09-23-v1.4", timeFreezeSeconds: 0 });
    expect(model.snapshot().pendingExitAnimations).toBeUndefined();
    expect(JSON.stringify(level)).toBe(before);
  });

  it("keeps v1.4 peel, gate ice, countdown curtain and hidden-ice transitions in the proof state", () => {
    const level = fixture({ mechanismRules: "revised-2026-09-23-v1.4", width: 4, height: 4,
      gates: [
        { id: "red-gate", color: "red", side: "left", offset: 0, size: 1 },
        { id: "blue-gate", color: "blue", side: "top", offset: 0, size: 1, frozen: 1 },
        { id: "yellow-gate", color: "yellow", side: "right", offset: 3, size: 1 },
        { id: "green-gate", color: "green", side: "bottom", offset: 3, size: 1 },
      ],
      blocks: [
        { id: "shell", color: "red", x: 0, y: 0, shape: [[0, 0]], layers: ["red", "blue"] },
        { id: "yellow", color: "yellow", x: 3, y: 3, shape: [[0, 0]] },
        { id: "hidden", color: "green", x: 3, y: 0, shape: [[0, 0]], shutterId: "cover", frozen: 1 },
      ],
      shutters: [{ id: "cover", x: 3, y: 0, width: 1, height: 1, count: 2 }],
    });
    const result = check(level, 1);
    expect(result).toMatchObject({ status: "relaxed-shortcut", relaxedNonClearingDrags: 0 });
    const replay = replayRelaxed(level, result.relaxedRoute!);
    expect(replay.cost).toBe(0);
    expect(replay.model.snapshot()).toMatchObject({ complete: true, cleared: 4, timeFreezeSeconds: 0 });
    expect(replay.model.snapshot().pendingExitAnimations).toBeUndefined();
    expect(replay.model.snapshot().shutters[0]).toMatchObject({ revealed: true, count: 0 });
    const explicit = replayRelaxed(level, [
      { blockId: "shell", path: [], exitSide: "left" },
      { blockId: "shell", path: [], exitSide: "top" },
    ]).model;
    expect(explicit.snapshot().gates[1].frozen).toBe(0);
    expect(explicit.getBlock("hidden")?.frozen).toBe(1);
    explicit.beginAction();
    expect(explicit.tryExit("yellow", "right").ok).toBe(true);
    expect(explicit.commitAction()).toBe(true);
    expect(explicit.getBlock("hidden")?.frozen).toBe(0);
  });

  it.each(["revised-2026-09-23-v1.4", "revised-2026-09-27-v1.5"] as const)("refuses %s clocks and animation-dependent flip doors instead of asserting a headless floor", (mechanismRules) => {
    const level = fixture({ mechanismRules });
    const flip = { ...level, flipDoors: [{ id: "flip", color: "blue" as const,
      side: "right" as const, offset: 0, size: 1, initiallyOpen: false }] };
    expect(check(flip, 1)).toMatchObject({ status: "unsupported", thresholdProven: false,
      reasons: [expect.stringContaining("animation interleavings")] });
    expect(check({ ...level, blocks: [{ ...level.blocks[0], timedBombSeconds: 60 }] }, 1).status).toBe("unsupported");
    expect(check({ ...level, generators: [{ id: "timed", side: "top", offset: 1, spawn: [1, 0], queueBlockIds: [], trigger: "time" }] }, 1).status).toBe("unsupported");
    expect(check(fixture({ mechanismRules: "revised-2026-09-23-v1.3" }), 1).status).toBe("unsupported");
  });

  it.each([
    [{ maxStates: 1 }, "max-states"],
    [{ maxDragStates: 1 }, "max-drag-states"],
    [{ maxTransitions: 1 }, "max-transitions"],
  ] as const)("any incomplete exploration is unknown, never a floor: %s", (budgets, termination) => {
    expect(checkRevisedRepositionFloor(fixture(), { floor: 2, ...budgets })).toMatchObject({
      status: "unknown", termination, thresholdProven: false,
    });
  });

  it("deadline exhaustion and malformed budgets never produce a proof", () => {
    const clock = vi.spyOn(Date, "now").mockReturnValueOnce(0).mockReturnValue(10);
    try {
      expect(checkRevisedRepositionFloor(fixture(), { floor: 1, maxMilliseconds: 1 }))
        .toMatchObject({ status: "unknown", termination: "deadline", thresholdProven: false });
    } finally { clock.mockRestore(); }
    for (const floor of [0, -1, Infinity, NaN, 1.5]) expect(checkRevisedRepositionFloor(fixture(), { floor }).status).toBe("invalid");
    expect(checkRevisedRepositionFloor(fixture(), { floor: 1, maxStates: 0 }).status).toBe("invalid");
    expect(check(fixture({ blocks: [{ id: "bad", color: "red", x: -1, y: 0, shape: [[0, 0]] }] }), 1).status).toBe("invalid");
  });
});
