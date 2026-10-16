import { describe, expect, it } from "vitest";
import type { GatePortalSpec, Point } from "../src/core/types";
import { matchFormalBlockShape } from "../src/game/formalBlockShapes";
import { projectPulseBlockRects, projectPulseGateRect } from "../src/game/pulseHighlightGeometry";
import type { PulseRect } from "../src/game/pulseAnimation";

const board = { innerX: 40, innerY: 200, cell: 95 };
const unionBounds = (rects: PulseRect[]): PulseRect => {
  const x = Math.min(...rects.map(rect => rect.x));
  const y = Math.min(...rects.map(rect => rect.y));
  return { x, y, width: Math.max(...rects.map(rect => rect.x + rect.width)) - x,
    height: Math.max(...rects.map(rect => rect.y + rect.height)) - y };
};
const contains = (rects: PulseRect[], x: number, y: number): boolean => rects.some(rect => (
  x > rect.x && x < rect.x + rect.width && y > rect.y && y < rect.y + rect.height
));

describe("pulse frozen-block highlight registration", () => {
  it("covers the complete upward-extending V3 ice sprite from the reported level", () => {
    const cells: Point[] = [[0, 0], [0, 1], [0, 2]];
    const rects = projectPulseBlockRects(cells, matchFormalBlockShape(cells), board, { width: 95, height: 294 });
    expect(unionBounds(rects)).toEqual({ x: 40, y: 191, width: 95, height: 294 });
    expect(rects[0].y).toBeLessThan(board.innerY);
    expect(rects[0].y + rects[0].height).toBe(rects[1].y);
    expect(rects[1].y + rects[1].height).toBe(rects[2].y);
  });

  it("includes both horizontal margins of the actual 192×199 square artwork", () => {
    const cells: Point[] = [[2, 3], [3, 3], [2, 4], [3, 4]];
    expect(unionBounds(projectPulseBlockRects(cells, matchFormalBlockShape(cells), board,
      { width: 192, height: 199 }))).toEqual({ x: 229, y: 476, width: 192, height: 199 });
  });

  it("leaves the empty L concavity dark while registering the whole sprite", () => {
    const cells: Point[] = [[0, 0], [0, 1], [1, 1]];
    const rects = projectPulseBlockRects(cells, matchFormalBlockShape(cells), board, { width: 191, height: 199 });
    expect(rects).toHaveLength(3);
    expect(unionBounds(rects)).toEqual({ x: 39.5, y: 191, width: 191, height: 199 });
    expect(contains(rects, 40 + 95 * 1.5, 200 + 95 * 0.5)).toBe(false);
    expect(contains(rects, 40 + 95 * 0.5, 200 + 95 * 0.5)).toBe(true);
    expect(contains(rects, 40 + 95 * 1.5, 200 + 95 * 1.5)).toBe(true);
  });

  it("transforms a legacy rotated registration without expanding to its missing corner", () => {
    const cells: Point[] = [[0, 0], [1, 0], [0, 1]];
    const match = matchFormalBlockShape(cells)!;
    expect(match.quarterTurns).toBe(1);
    const rects = projectPulseBlockRects(cells, match, board, { width: 191, height: 199 });
    expect(unionBounds(rects)).toEqual({ x: 40, y: 199.5, width: 199, height: 191 });
    expect(contains(rects, 40 + 95 * 1.5, 200 + 95 * 1.5)).toBe(false);
  });

  it("keeps physical registration at fractional board scales and uses natural image size", () => {
    const cells: Point[] = [[1, 2]];
    const scaledBoard = { innerX: 10.5, innerY: 50.25, cell: 47.5 };
    expect(projectPulseBlockRects(cells, matchFormalBlockShape(cells), scaledBoard,
      { width: 1, height: 1, naturalWidth: 95, naturalHeight: 104 })).toEqual([
      { x: 58, y: 140.75, width: 47.5, height: 52 },
    ]);
  });

  it("bottom-aligns each fallback tile without spanning a missing cell", () => {
    const cells: Point[] = [[0, 0], [1, 1]];
    const rects = projectPulseBlockRects(cells, undefined, board, undefined, { width: 95, height: 104 });
    expect(rects).toEqual([
      { x: 40, y: 191, width: 95, height: 104 },
      { x: 135, y: 286, width: 95, height: 104 },
    ]);
    expect(contains(rects, 182.5, 247.5)).toBe(false);
  });

  it("uses only grid cells when art is missing or not decoded and handles an empty shape", () => {
    const cells: Point[] = [[1, 2]];
    expect(projectPulseBlockRects(cells, matchFormalBlockShape(cells), board,
      { width: 0, height: 0 }, { width: Number.NaN, height: 104 })).toEqual([
      { x: 135, y: 390, width: 95, height: 95 },
    ]);
    expect(projectPulseBlockRects([], undefined, board)).toEqual([]);
  });
});

describe("pulse frozen-gate highlight registration", () => {
  it.each([
    ["top", { x: 230, y: 418, width: 190, height: 67 }],
    ["bottom", { x: 230, y: 580, width: 190, height: 67 }],
  ] as const)("uses the outward ice height on a local %s portal", (side, expected) => {
    expect(projectPulseGateRect({ side, origin: [2, 3], size: 2 }, board, { width: 190, height: 67 })).toEqual(expected);
  });

  it.each([
    ["left", { x: 172, y: 485, width: 58, height: 208 }],
    ["right", { x: 325, y: 485, width: 58, height: 208 }],
  ] as const)("retains the extended bottom of the %s vertical ice strip", (side, expected) => {
    expect(projectPulseGateRect({ side, origin: [2, 3], size: 2 }, board, { width: 58, height: 208 })).toEqual(expected);
  });

  it("keeps horizontal native end-cap overhang while extending a four-cell port", () => {
    expect(projectPulseGateRect({ side: "top", origin: [0, 0], size: 4 }, board,
      { width: 287, height: 67 })).toEqual({ x: 39, y: 133, width: 382, height: 67 });
  });

  it("extends a five-cell vertical port without scaling its 18px end overhang", () => {
    expect(projectPulseGateRect({ side: "right", origin: [0, 0], size: 5 }, board,
      { width: 58, height: 303 })).toEqual({ x: 135, y: 200, width: 58, height: 493 });
  });

  it("falls back to the physical portal and keeps distant same-colour ports separate", () => {
    const portals: GatePortalSpec[] = [{ side: "top", origin: [0, 0], size: 1 },
      { side: "top", origin: [4, 0], size: 1 }];
    const rects = portals.map(portal => projectPulseGateRect(portal, board));
    expect(rects).toEqual([{ x: 40, y: 142, width: 95, height: 58 },
      { x: 420, y: 142, width: 95, height: 58 }]);
    expect(contains(rects, 40 + 95 * 2.5, 170)).toBe(false);
  });
});
