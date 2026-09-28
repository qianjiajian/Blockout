import { describe, expect, it } from "vitest";
import { PuzzleModel } from "../src/core/PuzzleModel";
import type { LevelSpec, PuzzleSnapshot } from "../src/core/types";
import {
  advanceContinuousDragPose,
  candidateGridSteps,
  choosePortalReleaseCandidate,
  chooseReleaseExitSide,
  chooseNearestReachableSnap,
  createContinuousCollisionValidator,
  easeOutCubic,
  isContinuousPoseAtEdge,
  isContinuousPoseAtPortal,
  isContinuousPoseValid,
  isPoseAlignedToGrid,
  matchingContinuousExitPortals,
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

  it("treats authored board seams as zero-width collision rails", () => {
    const level: LevelSpec = {
      id: 9_983,
      name: "continuous seam fixture",
      difficulty: "normal",
      timeSeconds: 60,
      reward: 0,
      width: 5,
      height: 5,
      seams: [
        { orientation: "horizontal", offset: 2, start: 0, size: 2 },
        { orientation: "vertical", offset: 3, start: 2, size: 3 },
      ],
      gates: [],
      blocks: [{ id: "red", x: 1, y: 1, shape: [[0, 0]], color: "red" }],
    };
    const state = new PuzzleModel(level).snapshot();
    const validator = createContinuousCollisionValidator(state, "red");

    expect(validator(1, 1)).toBe(true);
    expect(validator(1, 1.25)).toBe(false);
    expect(validator(2.25, 3)).toBe(false);
    // Both finite seams may still be walked around at their authored ends.
    expect(validator(3, 1.25)).toBe(true);
    expect(validator(2.25, 1)).toBe(true);
  });

  it("clamps a sparse continuous sweep at a seam instead of drawing across it", () => {
    const level: LevelSpec = {
      id: 9_984,
      name: "seam sweep fixture",
      difficulty: "normal",
      timeSeconds: 60,
      reward: 0,
      width: 4,
      height: 4,
      seams: [{ orientation: "horizontal", offset: 2, start: 0, size: 4 }],
      gates: [],
      blocks: [{ id: "red", x: 1, y: 1, shape: [[0, 0]], color: "red" }],
    };
    const state = new PuzzleModel(level).snapshot();
    const result = sweepContinuousPose(
      { x: 1, y: 1 },
      { x: 1, y: 3 },
      createContinuousCollisionValidator(state, "red"),
    );

    expect(result.blockedY).toBe(true);
    expect(result.y).toBeCloseTo(1.001, 3);
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

  it("retains chronological gate contacts inside one sparse diagonal sample", () => {
    const result = sweepContinuousPose(
      { x: 0, y: 4 },
      { x: 4, y: -4 },
      (x, y) => x >= 0 && x <= 4 && y >= 0 && y <= 4,
    );

    expect(result.x).toBeCloseTo(4, 2);
    expect(result.y).toBeCloseTo(0, 2);
    expect(result.path.some((pose) => Math.abs(pose.x - 3) <= 0.09 && pose.y <= 0.002)).toBe(true);
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

  it("hits a local portal's directed rail and tangent aperture instead of the outer rectangle", () => {
    const shape = [[0, 0], [0, 1]] as const;
    const localRight = { side: "right", origin: [1, 1], size: 2 } as const;
    expect(isContinuousPoseAtPortal({ x: 1, y: 1 }, shape, localRight)).toBe(true);
    expect(isContinuousPoseAtPortal({ x: 0.9, y: 1 }, shape, localRight)).toBe(false);
    expect(isContinuousPoseAtPortal({ x: 1, y: 1.08 }, shape, localRight)).toBe(false);
    expect(isContinuousPoseAtEdge({ x: 1, y: 1 }, shape, 5, 5, "right")).toBe(false);

    const localLeft = { side: "left", origin: [3, 1], size: 2 } as const;
    expect(isContinuousPoseAtPortal({ x: 3, y: 1 }, shape, localLeft)).toBe(true);
    expect(isContinuousPoseAtPortal({ x: 3.1, y: 1 }, shape, localLeft)).toBe(false);

    const verticalShape = [[0, 0], [0, 1]] as const;
    const localTop = { side: "top", origin: [1, 1], size: 1 } as const;
    const localBottom = { side: "bottom", origin: [1, 2], size: 1 } as const;
    expect(isContinuousPoseAtPortal({ x: 1, y: 1 }, verticalShape, localTop)).toBe(true);
    expect(isContinuousPoseAtPortal({ x: 1, y: 1.1 }, verticalShape, localTop)).toBe(false);
    expect(isContinuousPoseAtPortal({ x: 1, y: 1 }, verticalShape, localBottom)).toBe(true);
    expect(isContinuousPoseAtPortal({ x: 1, y: 0.9 }, verticalShape, localBottom)).toBe(false);
  });

  it("keeps the Lv5 T block inside the board until its lower rear cell also aligns", () => {
    const shape = [[0, 0], [1, 0], [2, 0], [1, 1]] as const;
    const portal = { side: "left", origin: [0, 3], size: 3 } as const;
    for (const profile of [undefined, "revised-2026-09-21-v1.2"] as const) {
      expect(isContinuousPoseAtPortal({ x: 0, y: 5 }, shape, portal, 0.04, profile)).toBe(false);
      expect(isContinuousPoseAtPortal({ x: 0, y: 4.15 }, shape, portal, 0.04, profile)).toBe(false);
      expect(isContinuousPoseAtPortal({ x: 0, y: 4 }, shape, portal, 0.04, profile)).toBe(true);
    }
  });

  it.each([
    { side: "top", shape: [[1, 0], [0, 1], [1, 1], [2, 1]], origin: [2, 0], wideOrigin: [1, 0], pose: { x: 1, y: 0 } },
    { side: "bottom", shape: [[0, 0], [1, 0], [2, 0], [1, 1]], origin: [2, 4], wideOrigin: [1, 4], pose: { x: 1, y: 3 } },
    { side: "left", shape: [[1, 0], [0, 1], [1, 1], [1, 2]], origin: [0, 2], wideOrigin: [0, 1], pose: { x: 0, y: 1 } },
    { side: "right", shape: [[0, 0], [0, 1], [0, 2], [1, 1]], origin: [4, 2], wideOrigin: [4, 1], pose: { x: 3, y: 1 } },
  ] as const)("$side: a narrow tip cannot visually authorize a rigid wide block", ({ side, shape, origin, wideOrigin, pose }) => {
    expect(isContinuousPoseAtPortal(pose, shape, { side, origin, size: 1 })).toBe(false);
    expect(isContinuousPoseAtPortal(pose, shape, { side, origin: wideOrigin, size: 3 })).toBe(true);
  });

  it("resolves exact same-colour and multiportal owners at the committed block rail", () => {
    const localFixture: LevelSpec = {
      ...fixture,
      id: 995,
      width: 5,
      height: 3,
      playable: [
        [0, 0], [1, 0], [3, 0], [4, 0],
        [0, 1], [1, 1], [3, 1], [4, 1],
        [0, 2], [1, 2], [3, 2], [4, 2],
      ],
      blocked: [],
      gates: [
        {
          id: "red-shared",
          side: "right",
          offset: 1,
          size: 1,
          color: "red",
          portals: [
            { side: "right", origin: [1, 1], size: 1 },
            { side: "left", origin: [3, 1], size: 1 },
          ],
        },
        {
          id: "red-independent",
          side: "left",
          offset: 0,
          size: 1,
          color: "red",
          portals: [{ side: "left", origin: [3, 0], size: 1 }],
        },
      ],
      blocks: [
        { id: "left-red", x: 1, y: 1, shape: [[0, 0]], color: "red" },
        { id: "right-red", x: 3, y: 1, shape: [[0, 0]], color: "red" },
        { id: "top-right-red", x: 3, y: 0, shape: [[0, 0]], color: "red" },
      ],
    };
    const model = new PuzzleModel(localFixture);
    const state = model.snapshot();
    const leftBlock = model.getBlock("left-red")!;
    const rightBlock = model.getBlock("right-red")!;
    const independentBlock = model.getBlock("top-right-red")!;
    expect(matchingContinuousExitPortals(state, leftBlock, ["right"])).toMatchObject([{
      gateId: "red-shared",
      gateKind: "fixed",
      portalIndex: 0,
      portal: { side: "right", origin: [1, 1], size: 1 },
      authoredPortal: true,
    }]);
    expect(matchingContinuousExitPortals(state, rightBlock, ["left"])).toMatchObject([{
      gateId: "red-shared",
      portalIndex: 1,
    }]);
    expect(matchingContinuousExitPortals(state, independentBlock, ["left"])).toMatchObject([{
      gateId: "red-independent",
      portalIndex: 0,
    }]);
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

  it("chooses local and same-side portals by their physical rail, with intent taking priority", () => {
    const board = {
      innerX: 100,
      innerY: 200,
      innerWidth: 100,
      innerHeight: 60,
      cell: 20,
    };
    const upperRight = {
      id: "upper-right",
      portal: { side: "right", origin: [1, 0], size: 1 } as const,
      authoredPortal: true,
    };
    const lowerRight = {
      id: "lower-right",
      portal: { side: "right", origin: [1, 2], size: 1 } as const,
      authoredPortal: true,
    };
    const localLeft = {
      id: "local-left",
      portal: { side: "left", origin: [3, 1], size: 1 } as const,
      authoredPortal: true,
    };
    expect(choosePortalReleaseCandidate(
      [upperRight, lowerRight],
      { x: 141, y: 249 },
      board,
    )?.id).toBe("lower-right");
    expect(choosePortalReleaseCandidate(
      [lowerRight, localLeft],
      { x: 142, y: 249 },
      board,
    )?.id).toBe("lower-right");
    expect(choosePortalReleaseCandidate(
      [lowerRight, localLeft],
      { x: 142, y: 249 },
      board,
      "left",
    )?.id).toBe("local-left");
  });

  it("delegates normalized legacy portals to the unchanged outer-edge chooser", () => {
    const board = {
      innerX: 50,
      innerY: 100,
      innerWidth: 300,
      innerHeight: 400,
      cell: 50,
    };
    const candidates = [
      {
        id: "top",
        portal: { side: "top", origin: [0, 0], size: 1 } as const,
        authoredPortal: false,
      },
      {
        id: "left",
        portal: { side: "left", origin: [0, 0], size: 1 } as const,
        authoredPortal: false,
      },
    ];
    const point = { x: 54, y: 101 };
    const expectedSide = chooseReleaseExitSide(["top", "left"], point, board, "bottom");
    expect(choosePortalReleaseCandidate(candidates, point, board, "bottom")?.portal.side).toBe(expectedSide);
  });

  it("exposes a strict adjacent model step without heuristic routing", () => {
    const model = new PuzzleModel(fixture);
    expect(model.moveBlockStep("red", 2, 0)).toBe(false);
    expect(model.moveBlockStep("red", 0.5, 0)).toBe(false);
    expect(model.moveBlockStep("red", 1, 0)).toBe(true);
    expect(model.getBlock("red")).toMatchObject({ x: 1, y: 0 });
  });
});
