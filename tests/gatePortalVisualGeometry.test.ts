import { describe, expect, it } from "vitest";
import { legacyOuterPortal } from "../src/core/gatePortals";
import type { GatePortalSpec, GateSpec, Point, Side } from "../src/core/types";
import {
  gatePortalExitLaneCenter,
  gatePortalExitTangentSpanCells,
  gatePortalExitTravelCells,
  gatePortalVisualRect,
  sliceGatePortal,
  type GatePortalVisualBoard,
} from "../src/game/gatePortalVisualGeometry";

const board: GatePortalVisualBoard = {
  innerX: 100,
  innerY: 200,
  cell: 20,
};

describe("gate portal visual geometry", () => {
  it.each([
    ["top", { side: "top", origin: [2, 3], size: 2 }, { x: 140, y: 252, width: 40, height: 8 }],
    ["bottom", { side: "bottom", origin: [2, 3], size: 2 }, { x: 140, y: 280, width: 40, height: 8 }],
    ["left", { side: "left", origin: [2, 3], size: 2 }, { x: 132, y: 260, width: 8, height: 40 }],
    ["right", { side: "right", origin: [2, 3], size: 2 }, { x: 160, y: 260, width: 8, height: 40 }],
  ] as const)("places a local %s portal on its directed concave boundary", (_name, portal, expected) => {
    expect(gatePortalVisualRect(portal, board, 8)).toEqual(expected);
  });

  it.each(["top", "right", "bottom", "left"] as const)(
    "is pixel-equivalent to the legacy outer-board %s gate rectangle",
    (side) => {
      const grid = { width: 6, height: 8 };
      const gate: Pick<GateSpec, "side" | "offset" | "size"> = {
        side,
        offset: 2,
        size: 3,
      };
      const portal = legacyOuterPortal(grid, gate);
      const thickness = 8;
      const legacy = (() => {
        let x = board.innerX + gate.offset * board.cell;
        let y = board.innerY - thickness;
        let width = gate.size * board.cell;
        let height = thickness;
        if (side === "bottom") y = board.innerY + grid.height * board.cell;
        if (side === "left" || side === "right") {
          x = side === "left"
            ? board.innerX - thickness
            : board.innerX + grid.width * board.cell;
          y = board.innerY + gate.offset * board.cell;
          width = thickness;
          height = gate.size * board.cell;
        }
        return { x, y, width, height };
      })();

      expect(gatePortalVisualRect(portal, board, thickness)).toEqual(legacy);
    },
  );

  it.each([
    ["top", [4, 2], [6, 2]],
    ["bottom", [4, 2], [6, 2]],
    ["left", [4, 2], [4, 4]],
    ["right", [4, 2], [4, 4]],
  ] as const)("slices a %s portal along its tangent without moving its local rail", (side, origin, expectedOrigin) => {
    const portal: GatePortalSpec = { side, origin, size: 6 };
    expect(sliceGatePortal(portal, 2, 3)).toEqual({ side, origin: expectedOrigin, size: 3 });
  });

  it("rejects non-integral and out-of-range portal slices", () => {
    const portal: GatePortalSpec = { side: "top", origin: [1, 2], size: 3 };
    expect(() => sliceGatePortal(portal, -1, 1)).toThrow(RangeError);
    expect(() => sliceGatePortal(portal, 1.5, 1)).toThrow(RangeError);
    expect(() => sliceGatePortal(portal, 1, 0)).toThrow(RangeError);
    expect(() => sliceGatePortal(portal, 2, 2)).toThrow(RangeError);
  });

  it.each([
    {
      side: "top" as const,
      portal: { side: "top" as const, origin: [1, 2] as Point, size: 4 },
      cells: [[1, 2], [2, 2]] as Point[],
      expected: { x: 140, y: 236 },
      portalCenter: { x: 160, y: 236 },
    },
    {
      side: "bottom" as const,
      portal: { side: "bottom" as const, origin: [1, 2] as Point, size: 4 },
      cells: [[1, 2], [2, 2]] as Point[],
      expected: { x: 140, y: 264 },
      portalCenter: { x: 160, y: 264 },
    },
    {
      side: "left" as const,
      portal: { side: "left" as const, origin: [2, 1] as Point, size: 4 },
      cells: [[2, 1], [2, 2]] as Point[],
      expected: { x: 136, y: 240 },
      portalCenter: { x: 136, y: 260 },
    },
    {
      side: "right" as const,
      portal: { side: "right" as const, origin: [2, 1] as Point, size: 4 },
      cells: [[2, 1], [2, 2]] as Point[],
      expected: { x: 164, y: 240 },
      portalCenter: { x: 164, y: 260 },
    },
  ])("keeps a narrow block in its actual $side lane instead of centering it in a wide portal", ({ portal, cells, expected, portalCenter }) => {
    const lane = gatePortalExitLaneCenter(portal, cells, board, 8);
    expect(lane).toEqual(expected);
    expect(lane).not.toEqual(portalCenter);
  });

  it.each([
    {
      side: "top" as const,
      portal: { side: "top" as const, origin: [4, 2] as Point, size: 1 },
      cells: [[4, 2], [2, 3], [3, 3], [4, 3]] as Point[],
      expected: { x: 190, y: 236 },
    },
    {
      side: "bottom" as const,
      portal: { side: "bottom" as const, origin: [4, 3] as Point, size: 1 },
      cells: [[2, 2], [3, 2], [4, 2], [4, 3]] as Point[],
      expected: { x: 190, y: 284 },
    },
    {
      side: "left" as const,
      portal: { side: "left" as const, origin: [2, 4] as Point, size: 1 },
      cells: [[3, 2], [3, 3], [2, 4], [3, 4]] as Point[],
      expected: { x: 136, y: 290 },
    },
    {
      side: "right" as const,
      portal: { side: "right" as const, origin: [3, 4] as Point, size: 1 },
      cells: [[2, 2], [2, 3], [2, 4], [3, 4]] as Point[],
      expected: { x: 184, y: 290 },
    },
  ])("anchors a concave block to its real $side leading edge in a one-cell portal", ({ portal, cells, expected }) => {
    expect(gatePortalExitLaneCenter(portal, cells, board, 8)).toEqual(expected);
  });

  it("constrains a partially overlapping T frontier to the physical mouth span", () => {
    const portal: GatePortalSpec = { side: "top", origin: [4, 2], size: 1 };
    const cells: Point[] = [[2, 2], [3, 2], [4, 2], [3, 3]];
    expect(gatePortalExitLaneCenter(portal, cells, board, 8)).toEqual({ x: 190, y: 236 });
  });

  it.each([
    {
      side: "top" as const,
      portal: { side: "top" as const, origin: [3, 2] as Point, size: 2 },
      cells: [[4, 2], [2, 3], [3, 3], [4, 3]] as Point[],
    },
    {
      side: "bottom" as const,
      portal: { side: "bottom" as const, origin: [3, 3] as Point, size: 2 },
      cells: [[2, 2], [3, 2], [4, 2], [4, 3]] as Point[],
    },
    {
      side: "left" as const,
      portal: { side: "left" as const, origin: [2, 3] as Point, size: 2 },
      cells: [[3, 2], [3, 3], [2, 4], [3, 4]] as Point[],
    },
    {
      side: "right" as const,
      portal: { side: "right" as const, origin: [3, 3] as Point, size: 2 },
      cells: [[2, 2], [2, 3], [2, 4], [3, 4]] as Point[],
    },
  ])("uses only the asymmetric $side frontier lane for particle span", ({ portal, cells }) => {
    expect(gatePortalExitTangentSpanCells(portal, cells)).toBe(1);
  });

  it.each([
    ["top", { side: "top", origin: [1, 2], size: 4 }, [[1, 2], [2, 2]], 2],
    ["bottom", { side: "bottom", origin: [1, 2], size: 4 }, [[1, 2], [2, 2]], 2],
    ["left", { side: "left", origin: [2, 1], size: 4 }, [[2, 1], [2, 2]], 2],
    ["right", { side: "right", origin: [2, 1], size: 4 }, [[2, 1], [2, 2]], 2],
  ] as const)("retains the rectangular $0 frontier span", (_side, portal, cells, expected) => {
    expect(gatePortalExitTangentSpanCells(portal, cells)).toBe(expected);
  });

  it("falls back to one cell when a malformed pose has no frontier-mouth overlap", () => {
    const portal: GatePortalSpec = { side: "top", origin: [4, 2], size: 1 };
    expect(gatePortalExitTangentSpanCells(portal, [[1, 2]])).toBe(1);
  });

  it.each([
    ["top", { side: "top", origin: [2, 3], size: 2 }, [[2, 3], [2, 4]], 2],
    ["bottom", { side: "bottom", origin: [2, 4], size: 2 }, [[2, 3], [2, 4]], 2],
    ["left", { side: "left", origin: [3, 2], size: 2 }, [[3, 2], [4, 2]], 2],
    ["right", { side: "right", origin: [4, 2], size: 2 }, [[3, 2], [4, 2]], 2],
  ] as const)("computes local %s exit travel from the portal boundary", (_side, portal, cells, expected) => {
    expect(gatePortalExitTravelCells(portal, cells)).toBe(expected);
  });

  it.each(["top", "right", "bottom", "left"] as const)(
    "retains the former outer-board %s travel distance",
    (side: Side) => {
      const grid = { width: 6, height: 8 };
      const gate = { side, offset: 1, size: 4 };
      const portal = legacyOuterPortal(grid, gate);
      const cells: Point[] = side === "top" || side === "bottom"
        ? [[1, 2], [2, 2], [2, 3]]
        : [[2, 1], [2, 2], [3, 2]];
      const xs = cells.map(([x]) => x);
      const ys = cells.map(([, y]) => y);
      const legacy = side === "top"
        ? Math.max(...ys) + 1
        : side === "bottom"
          ? grid.height - Math.min(...ys)
          : side === "left"
            ? Math.max(...xs) + 1
            : grid.width - Math.min(...xs);
      expect(gatePortalExitTravelCells(portal, cells)).toBe(legacy);
    },
  );

  it("rejects empty block-cell geometry for lane and travel calculations", () => {
    const portal: GatePortalSpec = { side: "top", origin: [1, 2], size: 2 };
    expect(() => gatePortalExitLaneCenter(portal, [], board, 8)).toThrow(RangeError);
    expect(() => gatePortalExitTangentSpanCells(portal, [])).toThrow(RangeError);
    expect(() => gatePortalExitTravelCells(portal, [])).toThrow(RangeError);
  });
});
