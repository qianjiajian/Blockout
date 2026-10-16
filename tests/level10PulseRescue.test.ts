import { describe, expect, it } from "vitest";
import { PuzzleModel } from "../src/core/PuzzleModel";
import { getLevel } from "../src/core/levels";
import type { LevelSpec, Point, PuzzleSnapshot, Side } from "../src/core/types";

const TARGET = "cc-010-b1-15";

// Complete natural route from the unchanged formal opening, after one early Pulse.
// Every path entry is an orthogonal unit step within a single committed drag.
const EARLY_PULSE_ROUTE: ReadonlyArray<readonly [string, Point[], Side?]> = [
  ["20", [], "top"],
  ["25", [], "top"],
  ["10", [[4, 0], [5, 0]], "top"],
  ["24", [[4, 1]]],
  ["05", [[5, 1], [5, 0], [4, 0]], "top"],
  ["06", [[5, 2]], "right"],
  ["04", [[5, 2], [5, 1]], "right"],
  ["24", [[5, 1], [5, 2]], "right"],
  ["01", [[4, 2], [4, 1], [4, 0]], "top"],
  ["07", [[4, 2], [4, 1], [4, 0]], "top"],
  ["02", [[4, 3], [5, 3], [5, 2], [5, 1]], "right"],
  ["08", [[3, 2], [4, 2], [5, 2], [5, 1]], "right"],
  ["11", [[3, 3], [3, 2], [4, 2]], "right"],
  ["09", [[3, 0], [4, 0], [4, 1], [4, 2]], "right"],
  ["03", [[3, 3], [3, 2], [3, 1], [3, 0]], "top"],
  ["18", [[2, 3], [3, 3], [4, 3], [5, 3]], "right"],
  ["19", [[4, 5], [4, 4], [4, 3], [5, 3], [5, 2], [5, 1]], "right"],
  ["21", [[4, 6], [4, 5], [4, 4], [4, 3], [5, 3]], "right"],
  ["12", [[2, 0], [3, 0]], "top"],
  ["16", [[1, 0], [2, 0], [3, 0], [4, 0], [5, 0]], "top"],
  ["13", [[2, 4], [3, 4], [3, 3], [3, 2], [4, 2], [4, 1], [4, 0]], "right"],
  ["22", [[4, 4], [4, 3], [4, 2], [4, 1], [4, 0]], "top"],
  ["17", [[1, 3], [2, 3], [3, 3], [3, 2], [3, 1], [3, 0]], "top"],
  ["23", [[5, 6], [5, 5], [5, 4], [5, 3], [5, 2], [5, 1]], "right"],
  ["14", [[3, 6], [3, 5], [3, 4], [3, 3], [3, 2], [3, 1], [3, 0]], "top"],
  ["15", [[1, 6], [1, 5], [1, 4], [1, 3], [1, 2], [1, 1], [1, 0]], "top"],
];

const restoreSnapshot = (model: PuzzleModel, snapshot: PuzzleSnapshot): void => {
  (model as unknown as { restore(value: PuzzleSnapshot): void }).restore(snapshot);
};

/** Explicit counter-stage fixture on the real Lv10 board, not a naturally played route.
 * Do not use thawAll to set it up: that is the Pulse effect whose history we test. */
const rescueStage = (frozen: number): PuzzleModel => {
  const model = new PuzzleModel(getLevel(10));
  model.startCountdown();
  const snapshot = model.snapshot();
  for (const block of snapshot.blocks) block.frozen = block.id === TARGET ? frozen : 0;
  for (const gate of [...snapshot.gates, ...snapshot.flipDoors]) gate.frozen = 0;
  delete snapshot.pulseRescueUsed;
  restoreSnapshot(model, snapshot);
  return model;
};

const frozenTarget = (model: PuzzleModel): number => model.getBlock(TARGET)!.frozen;

const usePulse = (model: PuzzleModel): void => {
  model.beginAction();
  expect(model.thawAll(2)).toBe(true);
  expect(model.commitAction(false)).toBe(true);
};

/** Uses a real legal ordinary exit; no rocket/removeBlockWithBooster shortcut. */
const clearOrdinary = (model: PuzzleModel, commit = true): void => {
  const block = model.snapshot().blocks.find((candidate) => (
    candidate.id !== TARGET && model.isBlockActive(candidate) && model.possibleExitSides(candidate).length > 0
  ));
  expect(block).toBeDefined();
  model.beginAction();
  expect(model.tryExit(block!.id, model.possibleExitSides(block!)[0]).ok).toBe(true);
  if (commit) expect(model.commitAction()).toBe(true);
};

describe("level 10 authored pulse rescue", () => {
  it("declares the lower-left frozen target at twenty-five", () => {
    const level = getLevel(10);
    expect(level.pulseRescue).toMatchObject({
      trigger: "frozen-one",
      targetBlockId: TARGET,
      targetPosition: [0, 6],
      requiredFrozen: 25,
    });
    expect(level.blocks.find((block) => block.id === TARGET)).toMatchObject({ x: 0, y: 6, frozen: 25 });
  });

  it("still holds an unused rescue at one until the player actually uses Pulse", () => {
    const model = rescueStage(1);
    expect(Boolean(model.snapshot().pulseRescueUsed)).toBe(false);
    clearOrdinary(model);
    expect(frozenTarget(model)).toBe(1);
    expect(Boolean(model.snapshot().pulseRescueUsed)).toBe(false);
    expect(model.isBlockActive(model.getBlock(TARGET)!)).toBe(false);

    usePulse(model);
    expect(frozenTarget(model)).toBe(0);
    expect(model.snapshot().pulseRescueUsed).toBe(true);
    expect(model.isBlockActive(model.getBlock(TARGET)!)).toBe(true);
  });

  it("records an early Pulse on the unchanged formal opening at 25 → 23", () => {
    const model = new PuzzleModel(getLevel(10));
    const opening = model.snapshot();
    expect(frozenTarget(model)).toBe(25);
    expect(Boolean(opening.pulseRescueUsed)).toBe(false);
    usePulse(model);
    expect(frozenTarget(model)).toBe(23);
    expect(model.snapshot().pulseRescueUsed).toBe(true);
    expect(model.snapshot()).toMatchObject({ moves: 0, cleared: 0, remainingSeconds: opening.remainingSeconds });
    expect(model.level.blocks.find((block) => block.id === TARGET)?.frozen).toBe(25);
  });

  it("finishes the formal opening in 26 ordinary drags after one opening Pulse, without a second Pulse or rocket", () => {
    const model = new PuzzleModel(getLevel(10));
    model.startCountdown();
    usePulse(model);
    const observedBoundary: number[] = [];
    for (const [suffix, path, side] of EARLY_PULSE_ROUTE) {
      const id = `cc-010-b1-${suffix}`;
      model.beginAction();
      for (const [x, y] of path) expect(model.moveBlockStep(id, x, y), `${id}: ${x},${y}`).toBe(true);
      if (side) expect(model.tryExit(id, side).ok, `${id}: exit ${side}`).toBe(true);
      expect(model.commitAction(), `${id}: committed drag`).toBe(true);
      const snapshot = model.snapshot();
      expect(snapshot.pulseRescueUsed).toBe(true);
      if (id === TARGET) expect(model.getBlock(TARGET)).toBeUndefined();
      else expect(frozenTarget(model)).toBe(Math.max(0, 23 - snapshot.cleared));
      if (snapshot.cleared === 22 || snapshot.cleared === 23) observedBoundary.push(frozenTarget(model));
    }
    expect(observedBoundary).toEqual([1, 0]);
    expect(model.snapshot()).toMatchObject({ complete: true, failed: false, cleared: 25, moves: 26 });
  });

  it("lets a later ordinary clear thaw 1 → 0 after Pulse was used early at three", () => {
    const model = rescueStage(3);
    usePulse(model);
    expect(frozenTarget(model)).toBe(1);
    expect(model.snapshot().pulseRescueUsed).toBe(true);
    clearOrdinary(model);
    expect(frozenTarget(model)).toBe(0);
    expect(model.isBlockActive(model.getBlock(TARGET)!)).toBe(true);
    expect(model.snapshot()).toMatchObject({ moves: 1, cleared: 1, pulseRescueUsed: true });
  });

  it("keeps the used state through repeated effective pulses without reinstating the final lock", () => {
    const model = rescueStage(5);
    usePulse(model);
    usePulse(model);
    expect(frozenTarget(model)).toBe(1);
    clearOrdinary(model);
    expect(frozenTarget(model)).toBe(0);
    expect(model.snapshot().pulseRescueUsed).toBe(true);
  });

  it("clones the used state independently and keeps preview usage out of the original", () => {
    const model = rescueStage(3);
    const preview = model.clone();
    usePulse(preview);
    expect(preview.snapshot().pulseRescueUsed).toBe(true);
    expect(frozenTarget(preview)).toBe(1);
    expect(Boolean(model.snapshot().pulseRescueUsed)).toBe(false);
    expect(frozenTarget(model)).toBe(3);

    const usedClone = preview.clone();
    expect(usedClone.snapshot()).toEqual(preview.snapshot());
    expect(preview.undo()).toBe(true);
    expect(Boolean(preview.snapshot().pulseRescueUsed)).toBe(false);
    clearOrdinary(usedClone);
    expect(frozenTarget(usedClone)).toBe(0);
    expect(usedClone.snapshot().pulseRescueUsed).toBe(true);
    expect(frozenTarget(preview)).toBe(3);
  });

  it("rolls back both the counter and unused state when a Pulse action is cancelled", () => {
    const model = rescueStage(3);
    const before = model.snapshot();
    model.beginAction();
    expect(model.thawAll(2)).toBe(true);
    expect(model.snapshot().pulseRescueUsed).toBe(true);
    model.cancelAction();
    expect(model.snapshot()).toEqual(before);
    expect(Boolean(model.snapshot().pulseRescueUsed)).toBe(false);
    expect(model.undo()).toBe(false);
  });

  it("undoes a committed Pulse together with its used state", () => {
    const model = rescueStage(3);
    const before = model.snapshot();
    usePulse(model);
    expect(model.snapshot().pulseRescueUsed).toBe(true);
    expect(model.undo()).toBe(true);
    expect(model.snapshot()).toEqual(before);
    expect(Boolean(model.snapshot().pulseRescueUsed)).toBe(false);
  });

  it.each(["cancel", "undo"] as const)("preserves earlier Pulse use when a subsequent normal exit is undone by %s", (kind) => {
    const model = rescueStage(3);
    usePulse(model);
    const afterPulse = model.snapshot();
    clearOrdinary(model, kind === "undo");
    expect(frozenTarget(model)).toBe(0);
    if (kind === "cancel") model.cancelAction();
    else expect(model.undo()).toBe(true);
    // Cancellation intentionally preserves the clock's first autonomous start;
    // all board state and the previously committed rescue usage still roll back.
    expect(model.snapshot()).toEqual({
      ...afterPulse,
      autonomousStarted: kind === "cancel" ? true : afterPulse.autonomousStarted,
    });
    expect(model.snapshot().pulseRescueUsed).toBe(true);
    clearOrdinary(model);
    expect(frozenTarget(model)).toBe(0);
  });

  it("does not inherit a previous run's used flag when restarting the level", () => {
    const previous = new PuzzleModel(getLevel(10));
    usePulse(previous);
    const restarted = new PuzzleModel(getLevel(10));
    expect(frozenTarget(restarted)).toBe(25);
    expect(Boolean(restarted.snapshot().pulseRescueUsed)).toBe(false);
    expect(previous.snapshot().pulseRescueUsed).toBe(true);
    expect(frozenTarget(previous)).toBe(23);
  });

  it("treats snapshots without the optional flag as unused instead of retaining an old run's state", () => {
    const model = rescueStage(1);
    const oldSnapshot = model.snapshot();
    delete oldSnapshot.pulseRescueUsed;
    usePulse(model);
    expect(model.snapshot().pulseRescueUsed).toBe(true);
    restoreSnapshot(model, oldSnapshot);
    expect(Boolean(model.snapshot().pulseRescueUsed)).toBe(false);
    clearOrdinary(model);
    expect(frozenTarget(model)).toBe(1);
  });

  it("does not record usage for a no-op or a Pulse which changes only a different frozen block", () => {
    const model = rescueStage(3);
    const before = model.snapshot();
    model.beginAction();
    expect(model.thawAll(0)).toBe(false);
    expect(model.commitAction(false)).toBe(false);
    expect(model.snapshot()).toEqual(before);

    const unrelatedIce = model.snapshot();
    unrelatedIce.blocks.find((block) => block.id === TARGET)!.frozen = 0;
    unrelatedIce.blocks.find((block) => block.id !== TARGET)!.frozen = 3;
    restoreSnapshot(model, unrelatedIce);
    usePulse(model);
    expect(frozenTarget(model)).toBe(0);
    expect(Boolean(model.snapshot().pulseRescueUsed)).toBe(false);
  });

  it("leaves ordinary numeric ice in levels without the rescue contract unchanged", () => {
    const level: LevelSpec = {
      id: 11, name: "ordinary ice counter fixture", difficulty: "normal", reward: 0,
      mechanismRules: "revised-2026-09-27-v1.5", width: 3, height: 3, timeSeconds: 60,
      gates: [{ id: "red-exit", color: "red", side: "left", offset: 0, size: 1 }],
      blocks: [
        { id: "clear", color: "red", x: 0, y: 0, shape: [[0, 0]] },
        { id: "ordinary-ice", color: "blue", x: 2, y: 2, shape: [[0, 0]], frozen: 1 },
      ],
    };
    const model = new PuzzleModel(level);
    clearOrdinary(model);
    expect(model.getBlock("ordinary-ice")?.frozen).toBe(0);
    expect(model.snapshot()).not.toHaveProperty("pulseRescueUsed");

    const withPulse = new PuzzleModel(level);
    usePulse(withPulse);
    expect(withPulse.getBlock("ordinary-ice")?.frozen).toBe(0);
    expect(withPulse.snapshot()).not.toHaveProperty("pulseRescueUsed");
  });
});
