import { describe, expect, it } from "vitest";
import type { Point } from "../src/core/types";
import {
  FORMAL_BLOCK_SHAPES,
  matchFormalBlockShape,
  type FormalBlockShapeId,
} from "../src/game/formalBlockShapes";

const rotateClockwise = (cells: readonly Point[], width: number, height: number): Point[] => cells
  .map(([x, y]) => [height - 1 - y, x] as const);

const rotate = (
  cells: readonly Point[],
  width: number,
  height: number,
  quarterTurns: 0 | 1 | 2 | 3,
): Point[] => {
  let result = [...cells];
  let currentWidth = width;
  let currentHeight = height;
  for (let turn = 0; turn < quarterTurns; turn += 1) {
    result = rotateClockwise(result, currentWidth, currentHeight);
    [currentWidth, currentHeight] = [currentHeight, currentWidth];
  }
  return result;
};

describe("formal whole-block shape matching", () => {
  it("normalizes translated absolute coordinates and reports their bounds", () => {
    expect(matchFormalBlockShape([[8, -2], [8, -1], [9, -1]])).toEqual({
      shapeId: 4,
      quarterTurns: 0,
      minX: 8,
      minY: -2,
      targetWidth: 2,
      targetHeight: 2,
      canonicalWidth: 2,
      canonicalHeight: 2,
    });
  });

  it("matches every supported silhouette in every rotation without reflection", () => {
    const expected: Record<FormalBlockShapeId, readonly {
      shapeId: FormalBlockShapeId;
      quarterTurns: 0 | 1 | 2 | 3;
    }[]> = {
      1: [{ shapeId: 1, quarterTurns: 0 }, { shapeId: 1, quarterTurns: 0 }, { shapeId: 1, quarterTurns: 0 }, { shapeId: 1, quarterTurns: 0 }],
      2: [{ shapeId: 2, quarterTurns: 0 }, { shapeId: 8, quarterTurns: 0 }, { shapeId: 2, quarterTurns: 0 }, { shapeId: 8, quarterTurns: 0 }],
      3: [{ shapeId: 3, quarterTurns: 0 }, { shapeId: 9, quarterTurns: 0 }, { shapeId: 3, quarterTurns: 0 }, { shapeId: 9, quarterTurns: 0 }],
      4: [{ shapeId: 4, quarterTurns: 0 }, { shapeId: 4, quarterTurns: 1 }, { shapeId: 4, quarterTurns: 2 }, { shapeId: 4, quarterTurns: 3 }],
      5: [{ shapeId: 5, quarterTurns: 0 }, { shapeId: 5, quarterTurns: 1 }, { shapeId: 5, quarterTurns: 0 }, { shapeId: 5, quarterTurns: 1 }],
      6: [{ shapeId: 6, quarterTurns: 0 }, { shapeId: 6, quarterTurns: 1 }, { shapeId: 6, quarterTurns: 2 }, { shapeId: 6, quarterTurns: 3 }],
      7: [{ shapeId: 7, quarterTurns: 0 }, { shapeId: 7, quarterTurns: 0 }, { shapeId: 7, quarterTurns: 0 }, { shapeId: 7, quarterTurns: 0 }],
      8: [{ shapeId: 8, quarterTurns: 0 }, { shapeId: 2, quarterTurns: 0 }, { shapeId: 8, quarterTurns: 0 }, { shapeId: 2, quarterTurns: 0 }],
      9: [{ shapeId: 9, quarterTurns: 0 }, { shapeId: 3, quarterTurns: 0 }, { shapeId: 9, quarterTurns: 0 }, { shapeId: 3, quarterTurns: 0 }],
      10: [{ shapeId: 10, quarterTurns: 0 }, { shapeId: 10, quarterTurns: 1 }, { shapeId: 10, quarterTurns: 2 }, { shapeId: 10, quarterTurns: 3 }],
      11: [{ shapeId: 11, quarterTurns: 0 }, { shapeId: 11, quarterTurns: 1 }, { shapeId: 11, quarterTurns: 0 }, { shapeId: 11, quarterTurns: 1 }],
      12: [{ shapeId: 12, quarterTurns: 0 }, { shapeId: 12, quarterTurns: 0 }, { shapeId: 12, quarterTurns: 0 }, { shapeId: 12, quarterTurns: 0 }],
      13: [{ shapeId: 13, quarterTurns: 0 }, { shapeId: 21, quarterTurns: 0 }, { shapeId: 13, quarterTurns: 0 }, { shapeId: 21, quarterTurns: 0 }],
      14: [{ shapeId: 14, quarterTurns: 0 }, { shapeId: 14, quarterTurns: 0 }, { shapeId: 14, quarterTurns: 0 }, { shapeId: 14, quarterTurns: 0 }],
      15: [{ shapeId: 15, quarterTurns: 0 }, { shapeId: 15, quarterTurns: 1 }, { shapeId: 15, quarterTurns: 0 }, { shapeId: 15, quarterTurns: 1 }],
      16: [{ shapeId: 16, quarterTurns: 0 }, { shapeId: 16, quarterTurns: 1 }, { shapeId: 16, quarterTurns: 2 }, { shapeId: 16, quarterTurns: 3 }],
      17: [{ shapeId: 17, quarterTurns: 0 }, { shapeId: 17, quarterTurns: 1 }, { shapeId: 17, quarterTurns: 2 }, { shapeId: 17, quarterTurns: 3 }],
      18: [{ shapeId: 18, quarterTurns: 0 }, { shapeId: 18, quarterTurns: 1 }, { shapeId: 18, quarterTurns: 2 }, { shapeId: 18, quarterTurns: 3 }],
      19: [{ shapeId: 19, quarterTurns: 0 }, { shapeId: 19, quarterTurns: 1 }, { shapeId: 19, quarterTurns: 2 }, { shapeId: 19, quarterTurns: 3 }],
      20: [{ shapeId: 20, quarterTurns: 0 }, { shapeId: 20, quarterTurns: 1 }, { shapeId: 20, quarterTurns: 2 }, { shapeId: 20, quarterTurns: 3 }],
      21: [{ shapeId: 21, quarterTurns: 0 }, { shapeId: 13, quarterTurns: 0 }, { shapeId: 21, quarterTurns: 0 }, { shapeId: 13, quarterTurns: 0 }],
    };

    for (const definition of FORMAL_BLOCK_SHAPES) {
      for (const quarterTurns of [0, 1, 2, 3] as const) {
        const translated = rotate(
          definition.cells,
          definition.canonicalWidth,
          definition.canonicalHeight,
          quarterTurns,
        ).map(([x, y]) => [x + 13, y + 21] as const);
        const match = matchFormalBlockShape(translated);
        expect(
          match && { shapeId: match.shapeId, quarterTurns: match.quarterTurns },
          `shape ${definition.shapeId}, rotation ${quarterTurns}`,
        ).toEqual(expected[definition.shapeId][quarterTurns]);
      }
    }
  });

  it("uses a dedicated whole sprite for the mirrored Z silhouette", () => {
    expect(matchFormalBlockShape([[1, 0], [2, 0], [0, 1], [1, 1]])).toMatchObject({
      shapeId: 11,
      quarterTurns: 0,
    });
  });

  it.each([
    { width: 2, height: 3, shapeId: 13 },
    { width: 3, height: 2, shapeId: 21 },
    { width: 3, height: 3, shapeId: 14 },
  ] as const)("keeps the supplied $width x $height rectangle artwork unrotated", ({ width, height, shapeId }) => {
    const cells: Point[] = Array.from({ length: width * height }, (_, index) => (
      [11 + index % width, -4 + Math.floor(index / width)] as const
    ));
    expect(matchFormalBlockShape(cells)).toEqual({
      shapeId,
      quarterTurns: 0,
      minX: 11,
      minY: -4,
      targetWidth: width,
      targetHeight: height,
      canonicalWidth: width,
      canonicalHeight: height,
    });
  });

  it("uses dedicated whole sprites for the source-observed mirrored L and corner-notch silhouettes", () => {
    expect(matchFormalBlockShape([[0, 0], [0, 1], [1, 1], [2, 1]])).toMatchObject({
      shapeId: 19,
      quarterTurns: 0,
    });
    expect(matchFormalBlockShape([
      [0, 0], [1, 0], [2, 0],
      [0, 1], [1, 1], [2, 1],
      [0, 2], [1, 2],
    ])).toMatchObject({
      shapeId: 20,
      quarterTurns: 0,
    });
  });

  it("rejects unknown, duplicate, empty, and non-grid silhouettes", () => {
    expect(matchFormalBlockShape([])).toBeUndefined();
    expect(matchFormalBlockShape([[0, 0], [0, 0]])).toBeUndefined();
    expect(matchFormalBlockShape([[0, 0], [1, 1]])).toBeUndefined();
    expect(matchFormalBlockShape([[0, 0], [0, 1], [1, 1], [1, 2], [2, 2]])).toBeUndefined();
    expect(matchFormalBlockShape([[0, 0], [0.5, 0]])).toBeUndefined();
    expect(matchFormalBlockShape([[NaN, 0]])).toBeUndefined();
    expect(matchFormalBlockShape([[Infinity, 0]])).toBeUndefined();
  });

  it("returns independently owned matches without exposing an indexed template", () => {
    const cells: Point[] = [[8, -2], [8, -1], [9, -1]];
    const first = matchFormalBlockShape(cells)!;
    const expected = { ...first };
    first.shapeId = 21;
    first.quarterTurns = 3;
    first.minX = 900;
    first.minY = 900;
    first.targetWidth = 900;
    first.targetHeight = 900;
    first.canonicalWidth = 900;
    first.canonicalHeight = 900;
    const second = matchFormalBlockShape(cells)!;
    expect(second).not.toBe(first);
    expect(second).toEqual(expected);
    expect(matchFormalBlockShape([[0, 0], [0, 1], [1, 1]], "native-only")).toEqual({
      ...expected, minX: 0, minY: 0,
    });
  });

  it("never caches caller cell arrays or changes their authored order", () => {
    const cells: Point[] = [[0, 1], [0, 0]];
    expect(matchFormalBlockShape(cells)?.shapeId).toBe(2);
    expect(cells).toEqual([[0, 1], [0, 0]]);
    cells[0] = [1, 0];
    expect(matchFormalBlockShape(cells)?.shapeId).toBe(8);
    expect(cells).toEqual([[1, 0], [0, 0]]);
    cells[0] = [0, 0];
    expect(matchFormalBlockShape(cells)).toBeUndefined();
  });
});
