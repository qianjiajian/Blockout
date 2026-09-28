import { describe, expect, it } from "vitest";
import { connectedBoardCompartment } from "../src/game/boardSeamVisualGeometry";
import type { Point } from "../src/core/types";

const grid = (width: number, height: number): Point[] => Array.from(
  { length: width * height },
  (_, index) => [index % width, Math.floor(index / width)] as Point,
);

describe("board seam visual geometry", () => {
  it("keeps an exit ghost inside its horizontal source chamber", () => {
    const board = {
      width: 3,
      height: 4,
      playable: grid(3, 4),
      blocked: [],
      seams: [{ orientation: "horizontal" as const, offset: 2, start: 0, size: 3 }],
    };
    expect(connectedBoardCompartment(board, [[1, 1]])).toEqual([
      [1, 1], [1, 0], [2, 1], [0, 1], [2, 0], [0, 0],
    ]);
    expect(connectedBoardCompartment(board, [[1, 2]])).toEqual([
      [1, 2], [2, 2], [1, 3], [0, 2], [2, 3], [0, 3],
    ]);
  });

  it("keeps an exit ghost inside its vertical source chamber", () => {
    const board = {
      width: 4,
      height: 2,
      playable: grid(4, 2),
      blocked: [],
      seams: [{ orientation: "vertical" as const, offset: 2, start: 0, size: 2 }],
    };
    expect(new Set(connectedBoardCompartment(board, [[1, 0]]).map(String))).toEqual(new Set([
      "1,0", "1,1", "0,0", "0,1",
    ]));
    expect(new Set(connectedBoardCompartment(board, [[2, 1]]).map(String))).toEqual(new Set([
      "2,1", "2,0", "3,1", "3,0",
    ]));
  });

  it("allows routing around a finite seam endpoint", () => {
    const board = {
      width: 3,
      height: 3,
      playable: grid(3, 3),
      blocked: [],
      seams: [{ orientation: "horizontal" as const, offset: 1, start: 1, size: 1 }],
    };
    expect(connectedBoardCompartment(board, [[1, 0]])).toHaveLength(9);
    expect(new Set(connectedBoardCompartment(board, [[1, 0]], {
      side: "bottom",
      origin: [1, 0],
      size: 1,
    }).map(String))).toEqual(new Set(["0,0", "1,0", "2,0"]));
    expect(new Set(connectedBoardCompartment(board, [[1, 1]], {
      side: "top",
      origin: [1, 1],
      size: 1,
    }).map(String))).toEqual(new Set(["0,1", "1,1", "2,1", "0,2", "1,2", "2,2"]));
  });

  it("preserves the legacy connected playable clip and excludes blocked cells", () => {
    const board = {
      width: 3,
      height: 2,
      playable: grid(3, 2),
      blocked: [[1, 0]] as Point[],
      seams: [],
    };
    expect(new Set(connectedBoardCompartment(board, [[0, 0]]).map(String))).toEqual(new Set([
      "0,0", "0,1", "1,1", "2,1", "2,0",
    ]));
  });
});
