import { describe, expect, it } from "vitest";

import {
  exitFrontierCells,
  gateCoversExitFrontier,
  matchingPortalForExitFrontier,
} from "../src/core/blockExitFrontier";
import {
  directedRailKey,
  gatePortalRailKeys,
  gatePortals,
  legacyOuterPortal,
  mirrorGatePortalHorizontally,
  mirrorGatePortalVertically,
  portalBoundaryAnchor,
  portalMouthCells,
  portalOutwardCells,
  rotateGatePortalClockwise,
} from "../src/core/gatePortals";
import { solveLevelForValidation, type SolverDrag } from "../src/core/levelSolver";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import type { GatePortalSpec, GateSpec, LevelSpec, Point, Side } from "../src/core/types";

const baseLevel = (overrides: Partial<LevelSpec> = {}): LevelSpec => ({
  id: 991,
  name: "gate portal fixture",
  difficulty: "normal",
  timeSeconds: 60,
  reward: 0,
  width: 5,
  height: 3,
  playable: [
    [0, 0], [1, 0], [3, 0], [4, 0],
    [0, 1], [1, 1], [3, 1], [4, 1],
    [0, 2], [1, 2], [3, 2], [4, 2],
  ],
  gates: [],
  blocks: [],
  ...overrides,
});

const portalGate = (
  id: string,
  color: GateSpec["color"],
  portals: GatePortalSpec[],
  overrides: Partial<GateSpec> = {},
): GateSpec => ({
  id,
  color,
  side: portals[0].side,
  offset: portals[0].side === "top" || portals[0].side === "bottom"
    ? portals[0].origin[0]
    : portals[0].origin[1],
  size: portals[0].size,
  portals,
  ...overrides,
});

const replay = (level: LevelSpec, drags: SolverDrag[]): PuzzleModel => {
  const model = new PuzzleModel(level);
  for (const drag of drags) {
    model.beginAction();
    for (const [x, y] of drag.path) expect(model.moveBlockStep(drag.blockId, x, y)).toBe(true);
    if (drag.exitSide) expect(model.tryExit(drag.blockId, drag.exitSide).ok).toBe(true);
    expect(model.commitAction()).toBe(true);
  }
  return model;
};

describe("gate portal geometry", () => {
  it("normalizes legacy gates on all four outer sides without changing rails", () => {
    const board = { width: 5, height: 4 };
    const fixtures: GateSpec[] = [
      { id: "top", side: "top", offset: 1, size: 2, color: "red" },
      { id: "right", side: "right", offset: 1, size: 2, color: "red" },
      { id: "bottom", side: "bottom", offset: 1, size: 2, color: "red" },
      { id: "left", side: "left", offset: 1, size: 2, color: "red" },
    ];
    expect(fixtures.map((gate) => legacyOuterPortal(board, gate))).toEqual([
      { side: "top", origin: [1, 0], size: 2 },
      { side: "right", origin: [4, 1], size: 2 },
      { side: "bottom", origin: [1, 3], size: 2 },
      { side: "left", origin: [0, 1], size: 2 },
    ]);
    expect(fixtures.map((gate) => gatePortals(board, gate))).toEqual(
      fixtures.map((gate) => [legacyOuterPortal(board, gate)]),
    );
    expect(portalMouthCells(legacyOuterPortal(board, fixtures[0]))).toEqual([[1, 0], [2, 0]]);
    expect(portalOutwardCells(legacyOuterPortal(board, fixtures[0]))).toEqual([[1, -1], [2, -1]]);
    expect(directedRailKey([1, 0], "top")).toBe("1,0:top");
    expect(gatePortalRailKeys(board, fixtures[0])).toEqual(["1,0:top", "2,0:top"]);
    expect(portalBoundaryAnchor({ side: "right", origin: [4, 1], size: 2 })).toEqual([5, 2]);
  });

  it("preserves canonical tangent order across rotation and mirrors", () => {
    const top: GatePortalSpec = { side: "top", origin: [1, 0], size: 2 };
    expect(rotateGatePortalClockwise(top, 4)).toEqual({ side: "right", origin: [3, 1], size: 2 });
    expect(mirrorGatePortalHorizontally(top, 5)).toEqual({ side: "top", origin: [2, 0], size: 2 });
    expect(mirrorGatePortalVertically(top, 4)).toEqual({ side: "bottom", origin: [1, 3], size: 2 });
  });

  it("requires both the real T frontier and the rear width at local exposed edges", () => {
    const shape: Point[] = [[0, 0], [1, 0], [2, 0], [1, 1]];
    const cells = shape.map(([x, y]) => [x + 1, y + 1] as Point);
    const board = { width: 5, height: 4, playable: cells, blocked: [] };
    const expected: Record<Side, GatePortalSpec> = {
      top: { side: "top", origin: [1, 1], size: 3 },
      right: { side: "right", origin: [3, 1], size: 1 },
      bottom: { side: "bottom", origin: [2, 2], size: 1 },
      left: { side: "left", origin: [1, 1], size: 1 },
    };
    for (const side of ["top", "right", "bottom", "left"] as const) {
      const gate = portalGate(`${side}-gate`, "red", [expected[side]]);
      expect(exitFrontierCells(cells, side).length).toBe(expected[side].size);
      const match = matchingPortalForExitFrontier(board, cells, gate, side);
      if (side === "top") expect(match).toEqual({ portalIndex: 0, portal: expected[side] });
      else expect(match).toBeUndefined();
      expect(gateCoversExitFrontier(board, cells, gate)).toBe(side === "top");
    }
  });

  it("rejects an L tip at a narrow local mouth even when its frontier fits", () => {
    const cells: Point[] = [[1, 1], [1, 2], [2, 2]];
    const board = { width: 4, height: 4, playable: cells, blocked: [] };
    const portals: Record<Side, GatePortalSpec> = {
      top: { side: "top", origin: [1, 1], size: 1 },
      right: { side: "right", origin: [2, 2], size: 1 },
      bottom: { side: "bottom", origin: [1, 2], size: 2 },
      left: { side: "left", origin: [1, 1], size: 2 },
    };
    for (const side of ["top", "right", "bottom", "left"] as const) {
      const gate = portalGate(`l-${side}`, "red", [portals[side]]);
      const match = matchingPortalForExitFrontier(board, cells, gate, side);
      if (side === "bottom" || side === "left") {
        expect(match).toEqual({ portalIndex: 0, portal: portals[side] });
      } else expect(match).toBeUndefined();
    }
    const wrongFullBox = portalGate("right-too-high", "red", [
      { side: "right", origin: [2, 1], size: 1 },
    ]);
    expect(matchingPortalForExitFrontier(board, cells, wrongFullBox, "right")).toBeUndefined();
  });

  it("accepts internal exposed portals and rejects malformed or inward-facing rails", () => {
    const valid = baseLevel({
      gates: [portalGate("red-local", "red", [{ side: "right", origin: [1, 1], size: 1 }])],
      blocks: [{ id: "red", x: 1, y: 1, shape: [[0, 0]], color: "red" }],
    });
    expect(() => validateLevel(valid)).not.toThrow();

    const malformed = (gate: GateSpec): LevelSpec => ({ ...valid, gates: [gate] });
    expect(() => validateLevel(malformed({ ...valid.gates[0], portals: [] }))).toThrow(/portals cannot be empty/);
    expect(() => validateLevel(malformed(portalGate("bad-origin", "red", [
      { side: "right", origin: [1.5, 1], size: 1 },
    ])))).toThrow(/integer origin/);
    expect(() => validateLevel(malformed(portalGate("bad-size", "red", [
      { side: "right", origin: [1, 1], size: 0 },
    ])))).toThrow(/positive integer size/);
    expect(() => validateLevel(malformed(portalGate("void-mouth", "red", [
      { side: "right", origin: [2, 1], size: 1 },
    ])))).toThrow(/invalid mouth cell 2,1/);
    expect(() => validateLevel({ ...valid, blocked: [[1, 1]] })).toThrow(/invalid mouth cell 1,1/);

    const pointsInward = baseLevel({
      playable: [...valid.playable!, [2, 1]],
      gates: valid.gates,
      blocks: valid.blocks,
    });
    expect(() => validateLevel(pointsInward)).toThrow(/points into playable cell 2,1/);

    const mirrorDiverges: GateSpec = {
      ...valid.gates[0],
      offset: 0,
    };
    expect(() => validateLevel(malformed(mirrorDiverges))).toThrow(/must mirror portal 0/);
  });

  it("treats authored blocked cells as local void for portal rails", () => {
    const level = baseLevel({
      playable: undefined,
      blocked: [[2, 1]],
      gates: [portalGate("blocked-gap", "red", [{ side: "right", origin: [1, 1], size: 1 }])],
      blocks: [{ id: "red", x: 1, y: 1, shape: [[0, 0]], color: "red" }],
    });
    expect(() => validateLevel(level)).not.toThrow();
    expect(new PuzzleModel(level).tryExit("red", "right")).toMatchObject({
      ok: true,
      gateId: "blocked-gap",
      portalIndex: 0,
    });
  });

  it("rejects the same directed rail across gate kinds while allowing two sides of a corner", () => {
    const local = portalGate("fixed", "red", [{ side: "right", origin: [1, 1], size: 1 }]);
    const overlap = baseLevel({
      gates: [local],
      flipDoors: [{ ...local, id: "door", initiallyOpen: true }],
      blocks: [{ id: "red", x: 1, y: 1, shape: [[0, 0]], color: "red" }],
    });
    expect(() => validateLevel(overlap)).toThrow(/overlaps another right exit.*directed rail 1,1:right/);

    const corner = baseLevel({
      width: 2,
      height: 2,
      playable: [[0, 0]],
      gates: [
        portalGate("top", "red", [{ side: "top", origin: [0, 0], size: 1 }]),
        portalGate("left", "blue", [{ side: "left", origin: [0, 0], size: 1 }]),
      ],
      blocks: [{ id: "red", x: 0, y: 0, shape: [[0, 0]], color: "red" }],
    });
    expect(() => validateLevel(corner)).not.toThrow();
  });
});

describe("PuzzleModel portal state", () => {
  it("keeps legacy top/right/bottom/left exits behaviorally identical", () => {
    const placements: Record<Side, Point> = {
      top: [1, 0],
      right: [2, 1],
      bottom: [1, 2],
      left: [0, 1],
    };
    for (const side of ["top", "right", "bottom", "left"] as const) {
      const [x, y] = placements[side];
      const tangent = side === "top" || side === "bottom" ? x : y;
      const level = baseLevel({
        width: 3,
        height: 3,
        playable: undefined,
        gates: [{ id: `legacy-${side}`, side, offset: tangent, size: 1, color: "red" }],
        blocks: [{ id: "red", x, y, shape: [[0, 0]], color: "red" }],
      });
      const model = new PuzzleModel(level);
      expect(model.exitAttemptStatus("red", side)).toBe("ok");
      expect(model.tryExit("red", side)).toMatchObject({
        ok: true,
        gateId: `legacy-${side}`,
        portalIndex: 0,
        complete: true,
      });
      const result = solveLevelForValidation(level, 20);
      expect(result).toMatchObject({ solved: true, termination: "solved" });
      expect(replay(level, result.drags).snapshot().complete).toBe(true);
    }
  });

  it("keeps same-colour gates independent and reports the resolved portal", () => {
    const level = baseLevel({
      gates: [
        portalGate("red-frozen", "red", [{ side: "right", origin: [1, 1], size: 1 }], { frozen: 3 }),
        portalGate("red-open", "red", [{ side: "left", origin: [3, 1], size: 1 }]),
      ],
      blocks: [
        { id: "left-red", x: 1, y: 1, shape: [[0, 0]], color: "red" },
        { id: "right-red", x: 3, y: 1, shape: [[0, 0]], color: "red" },
      ],
    });
    const model = new PuzzleModel(level);
    expect(model.exitAttemptStatus("left-red", "right")).toBe("frozen-gate");
    expect(model.exitAttemptStatus("right-red", "left")).toBe("ok");
    expect(model.tryExit("right-red", "left")).toMatchObject({
      ok: true,
      gateId: "red-open",
      portalIndex: 0,
    });
    expect(model.snapshot().gates.find(({ id }) => id === "red-frozen")?.frozen).toBe(2);
  });

  it("shares one frozen counter across a multi-portal logical gate", () => {
    const shared = portalGate("red-shared", "red", [
      { side: "right", origin: [1, 1], size: 1 },
      { side: "left", origin: [3, 1], size: 1 },
    ], { frozen: 1 });
    const level = baseLevel({
      gates: [
        shared,
        { id: "blue-top", side: "top", offset: 0, size: 1, color: "blue" },
      ],
      blocks: [
        { id: "left-red", x: 1, y: 1, shape: [[0, 0]], color: "red" },
        { id: "right-red", x: 3, y: 1, shape: [[0, 0]], color: "red" },
        { id: "blue", x: 0, y: 0, shape: [[0, 0]], color: "blue" },
      ],
    });
    const model = new PuzzleModel(level);
    expect(model.exitAttemptStatus("left-red", "right")).toBe("frozen-gate");
    expect(model.exitAttemptStatus("right-red", "left")).toBe("frozen-gate");
    expect(model.tryExit("blue", "top").ok).toBe(true);
    expect(model.snapshot().gates.find(({ id }) => id === shared.id)?.frozen).toBe(0);
    expect(model.exitAttemptStatus("left-red", "right")).toBe("ok");
    expect(model.exitAttemptStatus("right-red", "left")).toBe("ok");
    expect(model.tryExit("right-red", "left")).toMatchObject({ gateId: "red-shared", portalIndex: 1 });
  });

  it("toggles all portals of one flip door together", () => {
    const portals: GatePortalSpec[] = [
      { side: "right", origin: [1, 1], size: 1 },
      { side: "left", origin: [3, 1], size: 1 },
    ];
    const level = baseLevel({
      gates: [{ id: "blue-top", side: "top", offset: 0, size: 1, color: "blue" }],
      flipDoors: [{
        ...portalGate("red-door", "red", portals, { frozen: 1, star: true }),
        initiallyOpen: false,
      }],
      blocks: [
        { id: "left-red", x: 1, y: 1, shape: [[0, 0]], color: "red", star: true },
        { id: "right-red", x: 3, y: 1, shape: [[0, 0]], color: "red", star: true },
        { id: "blue", x: 0, y: 0, shape: [[0, 0]], color: "blue" },
      ],
    });
    const model = new PuzzleModel(level);
    expect(model.exitAttemptStatus("left-red", "right")).toBe("frozen-gate");
    expect(model.tryExit("blue", "top").ok).toBe(true);
    expect(model.exitAttemptStatus("left-red", "right")).toBe("ok");
    expect(model.exitAttemptStatus("right-red", "left")).toBe("ok");
    expect(model.tryExit("left-red", "right")).toMatchObject({ gateId: "red-door", portalIndex: 0 });
    expect(model.exitAttemptStatus("right-red", "left")).toBe("no-gate");
  });

  it("preserves local equivalents of axis, colour, ice and star statuses", () => {
    const level = baseLevel({
      gates: [portalGate("blue-star", "blue", [{ side: "right", origin: [1, 1], size: 1 }], {
        frozen: 2,
        star: false,
      })],
      blocks: [{
        id: "red-star-axis",
        x: 1,
        y: 1,
        shape: [[0, 0]],
        color: "red",
        star: true,
        movementAxis: "vertical",
      }],
    });
    const axisModel = new PuzzleModel(level);
    expect(axisModel.exitAttemptStatus("red-star-axis", "right")).toBe("no-gate");

    const withoutAxis: LevelSpec = {
      ...level,
      blocks: [{ ...level.blocks[0], movementAxis: undefined }],
    };
    expect(new PuzzleModel(withoutAxis).exitAttemptStatus("red-star-axis", "right")).toBe("wrong-color");
    const redFrozen: LevelSpec = {
      ...withoutAxis,
      gates: [{ ...withoutAxis.gates[0], color: "red" }],
    };
    expect(new PuzzleModel(redFrozen).exitAttemptStatus("red-star-axis", "right")).toBe("frozen-gate");
    const redThawed: LevelSpec = {
      ...redFrozen,
      gates: [{ ...redFrozen.gates[0], frozen: undefined }],
    };
    expect(new PuzzleModel(redThawed).exitAttemptStatus("red-star-axis", "right")).toBe("star-gate-required");
  });
});

describe("portal-aware solver", () => {
  it("accepts a local compatible exit in static analysis and replays the route", () => {
    const level = baseLevel({
      gates: [portalGate("red-shared", "red", [
        { side: "right", origin: [1, 1], size: 1 },
        { side: "left", origin: [3, 1], size: 1 },
      ])],
      blocks: [
        { id: "left-red", x: 1, y: 1, shape: [[0, 0]], color: "red" },
        { id: "right-red", x: 3, y: 1, shape: [[0, 0]], color: "red" },
      ],
    });
    const result = solveLevelForValidation(level, 100);
    expect(result).toMatchObject({ solved: true, termination: "solved" });
    expect(result.staticUnsatReasons).toEqual([]);
    expect(result.drags).toHaveLength(2);
    expect(replay(level, result.drags).snapshot().complete).toBe(true);
  });

  it("uses a local portal for a fixed-axis T frontier without a false static rejection", () => {
    const playable: Point[] = [[1, 1], [2, 1], [3, 1], [2, 2]];
    const level = baseLevel({
      width: 5,
      height: 4,
      playable,
      gates: [portalGate("red-top-local", "red", [{ side: "top", origin: [1, 1], size: 3 }])],
      blocks: [{
        id: "red-t",
        x: 1,
        y: 1,
        shape: [[0, 0], [1, 0], [2, 0], [1, 1]],
        color: "red",
        movementAxis: "vertical",
      }],
    });
    const result = solveLevelForValidation(level, 20);
    expect(result.staticUnsatReasons).toEqual([]);
    expect(result).toMatchObject({ solved: true, minimumDrags: 1 });
    expect(replay(level, result.drags).snapshot().complete).toBe(true);
  });
});
