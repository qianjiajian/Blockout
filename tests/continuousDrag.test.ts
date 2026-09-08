import { describe, expect, it } from "vitest";
import { PuzzleModel } from "../src/core/PuzzleModel";
import type { LevelSpec, PuzzleSnapshot } from "../src/core/types";
import {
  advanceContinuousDragPose,
  candidateGridSteps,
  chooseReleaseExitSide,
  chooseNearestReachableSnap,
  createContinuousCollisionValidator,
  easeOutCubic,
  isContinuousPoseAtEdge,
  isContinuousPoseValid,
  isPoseAlignedToGrid,
  sweepContinuousPose,
  sweepContinuousPoseWithTurnAssist,
} from "../src/game/continuousDrag";

const fixture: LevelSpec = {
  id: 997,
  name: "continuous drag fixture",
  difficulty: "normal",
  timeSeconds: 180,
  reward: 0,
  width: 5,
  height: 5,
  playable: [
    [0, 0], [1, 0], [2, 0], [3, 0], [4, 0],
    [0, 1], [1, 1], [2, 1], [3, 1], [4, 1],
    [0, 2], [1, 2], [2, 2], [3, 2], [4, 2],
    [0, 3], [1, 3], [2, 3], [3, 3], [4, 3],
    [0, 4], [1, 4], [2, 4], [3, 4], [4, 4],
  ],
  blocked: [[2, 1]],
  gates: [{ id: "red-left", side: "left", offset: 0, size: 1, color: "red" }],
  blocks: [
    { id: "red", x: 0, y: 0, shape: [[0, 0]], color: "red" },
    { id: "blue", x: 3, y: 2, shape: [[0, 0]], color: "blue" },
  ],
};

const snapshot = (): PuzzleSnapshot => new PuzzleModel(fixture).snapshot();

describe("continuous hybrid drag", () => {
  it("accepts true sub-cell poses in an open corridor", () => {
    const state = snapshot();
    const validator = createContinuousCollisionValidator(state, "red");
    expect(validator(0.37, 0)).toBe(true);
    expect(validator(1.63, 0)).toBe(true);
    expect(isContinuousPoseValid(state, "red", 0.37, 0)).toBe(true);
  });

  it("rejects board, silhouette, blocked-cell, and block penetration", () => {
    const state = snapshot();
    expect(isContinuousPoseValid(state, "red", -0.01, 0)).toBe(false);
    expect(isContinuousPoseValid(state, "red", 1.01, 1)).toBe(false);
    expect(isContinuousPoseValid(state, "red", 2.01, 2)).toBe(false);
  });

  it("sweeps without tunnelling through a blocker", () => {
    const state = snapshot();
    const result = sweepContinuousPose(
      { x: 0, y: 2 },
      { x: 4, y: 2 },
      (x, y) => isContinuousPoseValid(state, "red", x, y),
    );
    expect(result.x).toBeLessThanOrEqual(2.001);
    expect(result.x).toBeGreaterThan(1.9);
    expect(result.blockedX).toBe(true);
    expect(result.x).toBeCloseTo(2.001, 3);
    expect(isContinuousPoseValid(state, "red", result.x, result.y)).toBe(true);
  });

  it("discards blocked pointer debt so the next orthogonal or reverse sample responds immediately", () => {
    const validator = (x: number, y: number) => x >= 0 && x <= 4 && y >= 0 && y <= 4;
    const blocked = advanceContinuousDragPose(
      { x: 1, y: 1 },
      { grid: { x: 1, y: 1 }, pointerDelta: { x: -4, y: 0 } },
      validator,
    );
    expect(blocked.x).toBeCloseTo(0, 3);
    expect(blocked.blockedX).toBe(true);

    const turned = advanceContinuousDragPose(
      blocked,
      { grid: { x: 0, y: 1 }, pointerDelta: { x: 0, y: 0.2 } },
      validator,
    );
    expect(turned.y - blocked.y).toBeCloseTo(0.2, 3);

    const reversed = advanceContinuousDragPose(
      turned,
      { grid: { x: 0, y: 1 }, pointerDelta: { x: 0.05, y: 0 } },
      validator,
    );
    expect(reversed.x - turned.x).toBeCloseTo(0.05, 3);
  });

  it("slides along a wall while preserving the unblocked axis", () => {
    const state = snapshot();
    const result = sweepContinuousPose(
      { x: 1, y: 0 },
      { x: 3, y: 2 },
      (x, y) => isContinuousPoseValid(state, "red", x, y),
    );
    expect(result.blockedY).toBe(true);
    expect(result.x).toBeGreaterThan(1);
    expect(result.y).toBeLessThan(1.01);
  });

  it("does not let turn assist consume the free axis of a diagonal wall slide", () => {
    const result = advanceContinuousDragPose(
      { x: 1, y: 1 },
      { grid: { x: 1, y: 1 }, pointerDelta: { x: 0.36, y: 0.8 } },
      (x, y) => x >= 0 && x <= 4 && y >= 0 && y <= 1,
    );

    expect(result.blockedY).toBe(true);
    expect(result.x).toBeCloseTo(1.36, 2);
    expect(result.y).toBeCloseTo(1, 2);
  });

  it.each([
    {
      name: "right then up",
      obstacle: [0, 0] as const,
      start: { x: 0.59, y: 1 }, target: { x: 0.59, y: 0 }, grid: { x: 1, y: 1 },
      pointerDelta: { x: 0, y: -1 }, axis: "y" as const,
    },
    {
      name: "up then left",
      obstacle: [0, 2] as const,
      start: { x: 1, y: 1.41 }, target: { x: 0, y: 1.41 }, grid: { x: 1, y: 1 },
      pointerDelta: { x: -1, y: 0 }, axis: "x" as const,
    },
    {
      name: "left then down",
      obstacle: [2, 2] as const,
      start: { x: 1.41, y: 1 }, target: { x: 1.41, y: 2 }, grid: { x: 1, y: 1 },
      pointerDelta: { x: 0, y: 1 }, axis: "y" as const,
    },
    {
      name: "down then right",
      obstacle: [2, 0] as const,
      start: { x: 1, y: 0.59 }, target: { x: 2, y: 0.59 }, grid: { x: 1, y: 1 },
      pointerDelta: { x: 1, y: 0 }, axis: "x" as const,
    },
  ])("rounds the trailing corner for $name without requiring release", ({ obstacle, start, target, grid, pointerDelta, axis }) => {
    const cornerLevel: LevelSpec = {
      ...fixture,
      id: 996,
      width: 3,
      height: 3,
      playable: Array.from({ length: 3 }, (_, y) => Array.from({ length: 3 }, (_, x) => [x, y] as const)).flat(),
      blocked: [],
      blocks: [
        { id: "red", x: 1, y: 1, shape: [[0, 0]], color: "red" },
        { id: "blue", x: obstacle[0], y: obstacle[1], shape: [[0, 0]], color: "blue" },
      ],
    };
    const validator = createContinuousCollisionValidator(new PuzzleModel(cornerLevel).snapshot(), "red");
    const raw = sweepContinuousPose(start, target, validator);
    const assisted = sweepContinuousPoseWithTurnAssist(start, target, { grid, pointerDelta }, validator);
    expect(Math.abs(assisted[axis] - target[axis])).toBeLessThan(Math.abs(raw[axis] - target[axis]));
    expect(Math.hypot(assisted.x - start.x, assisted.y - start.y))
      .toBeLessThanOrEqual(Math.hypot(target.x - start.x, target.y - start.y) + 0.002);
  });

  it("bounds corner assistance by a tiny pointer sample's movement budget", () => {
    const validator = (x: number, y: number) => x >= 1 - 1e-3 || y >= 1 - 1e-3;
    const start = { x: 0.59, y: 1 };
    const target = { x: 0.59, y: 0.98 };
    const result = sweepContinuousPoseWithTurnAssist(
      start,
      target,
      { grid: { x: 1, y: 1 }, pointerDelta: { x: 0, y: -0.02 } },
      validator,
    );
    expect(Math.hypot(result.x - start.x, result.y - start.y)).toBeLessThanOrEqual(0.022);
  });

  it("uses repeated orthogonal samples to rejoin the committed rail", () => {
    const validator = (x: number, y: number) => x >= 1 - 1e-3 || y >= 1 - 1e-3;
    const start = { x: 0.59, y: 1 };
    const result = sweepContinuousPoseWithTurnAssist(
      start,
      { x: 0.59, y: 0.875 },
      { grid: { x: 1, y: 1 }, pointerDelta: { x: 0, y: -0.125 } },
      validator,
    );
    expect(result.x).toBeGreaterThan(start.x + 0.1);
    expect(result.y).toBeCloseTo(start.y, 2);
    expect(Math.hypot(result.x - start.x, result.y - start.y)).toBeLessThanOrEqual(0.127);
  });

  it("never moves farther than a mixed-axis pointer sample during corner assistance", () => {
    const validator = (x: number, y: number) => x >= 1 - 1e-3 || y >= 1 - 1e-3;
    const start = { x: 0.55, y: 1 };
    const target = { x: 0.75, y: 0.6 };
    const result = sweepContinuousPoseWithTurnAssist(
      start,
      target,
      { grid: { x: 1, y: 1 }, pointerDelta: { x: 0.2, y: -0.4 } },
      validator,
    );
    expect(Math.hypot(result.x - start.x, result.y - start.y))
      .toBeLessThanOrEqual(Math.hypot(0.2, 0.4) + 0.002);
  });

  it("keeps exact pixel tracking when the requested turn is already clear", () => {
    const state = snapshot();
    const result = sweepContinuousPoseWithTurnAssist(
      { x: 0.59, y: 3 },
      { x: 0.59, y: 2 },
      { grid: { x: 1, y: 3 }, pointerDelta: { x: 0, y: -1 } },
      createContinuousCollisionValidator(state, "red"),
    );
    expect(result.x).toBeCloseTo(0.59, 4);
    expect(result.y).toBeCloseTo(2, 4);
    expect(result.blockedY).toBe(false);
  });

  it("uses hysteresis before changing or reversing the integer candidate", () => {
    expect(candidateGridSteps({ x: 0.57, y: 0 }, { x: 0, y: 0 })).toEqual([]);
    expect(candidateGridSteps({ x: 0.59, y: 0 }, { x: 0, y: 0 })).toEqual([{ x: 1, y: 0, axis: "x" }]);
    expect(candidateGridSteps({ x: 0.43, y: 0 }, { x: 1, y: 0 })).toEqual([]);
    expect(candidateGridSteps({ x: 0.41, y: 0 }, { x: 1, y: 0 })).toEqual([{ x: 0, y: 0, axis: "x" }]);
  });

  it("snaps release to the nearest reachable cell without crossing a blocked candidate", () => {
    const horizontal = (x: number, y: number) => y === 0 && x >= 0 && x <= 2;
    expect(chooseNearestReachableSnap({ x: 0.49, y: 0 }, { x: 0, y: 0 }, horizontal)).toMatchObject({ x: 0, y: 0 });
    expect(chooseNearestReachableSnap({ x: 0.51, y: 0 }, { x: 0, y: 0 }, horizontal)).toMatchObject({ x: 1, y: 0 });
    expect(chooseNearestReachableSnap(
      { x: 0.8, y: 0 },
      { x: 0, y: 0 },
      (x, y) => y === 0 && x === 0,
    )).toEqual({ x: 0, y: 0, path: [] });
  });

  it("distinguishes a true block-edge contact from pointer-only intent", () => {
    const shape = [[0, 0], [0, 1]] as const;
    expect(isContinuousPoseAtEdge({ x: 2, y: 0.03 }, shape, 5, 5, "top")).toBe(true);
    expect(isContinuousPoseAtEdge({ x: 2, y: 0.08 }, shape, 5, 5, "top")).toBe(false);
    expect(isPoseAlignedToGrid({ x: 1.97, y: 2.02 }, { x: 2, y: 2 })).toBe(true);
    expect(isPoseAlignedToGrid({ x: 1.94, y: 2 }, { x: 2, y: 2 })).toBe(false);
  });

  it("keeps simultaneous diagonal intent and a bounded snap curve", () => {
    const steps = candidateGridSteps({ x: 0.8, y: 0.7 }, { x: 0, y: 0 });
    expect(steps.map((step) => step.axis)).toEqual(["x", "y"]);
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(0.5)).toBeCloseTo(0.875);
    expect(easeOutCubic(1)).toBe(1);
  });

  it("selects a matching edge on release even when the gesture ran along it", () => {
    const board = { innerX: 50, innerY: 100, innerWidth: 300, innerHeight: 400 };
    expect(chooseReleaseExitSide(["bottom"], { x: 170, y: 480 }, board, "right")).toBe("bottom");
    expect(chooseReleaseExitSide([], { x: 170, y: 480 }, board, "bottom")).toBeUndefined();
  });

  it("uses valid gesture intent, then nearest-edge order at a corner", () => {
    const board = { innerX: 50, innerY: 100, innerWidth: 300, innerHeight: 400 };
    expect(chooseReleaseExitSide(["top", "left"], { x: 52, y: 104 }, board, "left")).toBe("left");
    expect(chooseReleaseExitSide(["top", "left"], { x: 54, y: 101 }, board, "bottom")).toBe("top");
  });

  it("exposes a strict adjacent model step without heuristic routing", () => {
    const model = new PuzzleModel(fixture);
    expect(model.moveBlockStep("red", 2, 0)).toBe(false);
    expect(model.moveBlockStep("red", 0.5, 0)).toBe(false);
    expect(model.moveBlockStep("red", 1, 0)).toBe(true);
    expect(model.getBlock("red")).toMatchObject({ x: 1, y: 0 });
  });
});
