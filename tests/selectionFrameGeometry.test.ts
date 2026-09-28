import { describe, expect, it } from "vitest";
import type { Point } from "../src/core/types";
import { matchFormalBlockShape } from "../src/game/formalBlockShapes";
import {
  formalSelectionFrameBounds,
  traceSelectionFrameLoops,
} from "../src/game/selectionFrameGeometry";

const perimeter = (loop: readonly Point[]): number => loop.reduce((total, point, index) => {
  const next = loop[(index + 1) % loop.length];
  return total + Math.abs(next[0] - point[0]) + Math.abs(next[1] - point[1]);
}, 0);

describe("formal selection-frame geometry", () => {
  it("wraps the bottom-aligned one-cell sprite instead of the 95px logical cell", () => {
    const match = matchFormalBlockShape([[4, 7]]);
    expect(match).toBeDefined();
    expect(formalSelectionFrameBounds(match!, 95, 104)).toEqual({
      x: -6,
      y: -15,
      width: 107,
      height: 116,
    });
  });

  it("keeps one continuous frame around a bottom-aligned vertical three-cell sprite", () => {
    const cells: Point[] = [[0, 0], [0, 1], [0, 2]];
    const match = matchFormalBlockShape(cells);
    expect(match).toBeDefined();
    expect(formalSelectionFrameBounds(match!, 95, 294)).toEqual({
      x: -6,
      y: -15,
      width: 107,
      height: 306,
    });
    expect(traceSelectionFrameLoops(cells)).toEqual([[
      [0, 0],
      [1, 0],
      [1, 3],
      [0, 3],
    ]]);
  });

  it("removes shared cell edges for rectangular and concave silhouettes", () => {
    const square: Point[] = [[0, 0], [1, 0], [0, 1], [1, 1]];
    const elbow: Point[] = [[0, 0], [0, 1], [1, 1]];
    const squareLoops = traceSelectionFrameLoops(square);
    const elbowLoops = traceSelectionFrameLoops(elbow);
    expect(squareLoops).toHaveLength(1);
    expect(squareLoops[0]).toHaveLength(4);
    expect(perimeter(squareLoops[0])).toBe(8);
    expect(elbowLoops).toHaveLength(1);
    expect(elbowLoops[0]).toHaveLength(6);
    expect(perimeter(elbowLoops[0])).toBe(8);
  });

  it("rotates the sprite registration before adding selection padding", () => {
    expect(formalSelectionFrameBounds({
      quarterTurns: 1,
      targetWidth: 2,
      targetHeight: 3,
      canonicalWidth: 3,
      canonicalHeight: 2,
    }, 287, 191)).toEqual({
      x: -6.5,
      y: -7,
      width: 203,
      height: 299,
    });
  });
});
