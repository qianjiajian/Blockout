import { describe, expect, it } from "vitest";
import type { Point } from "../src/core/types";
import { orderBlocksByDepth } from "../src/game/blockDepthOrder";

interface TestBlock {
  id: string;
  y: number;
  shape: readonly Point[];
}

const SINGLE = [[0, 0]] as const;
const HORIZONTAL_TWO = [[0, 0], [1, 0]] as const;
const S_TETROMINO = [[0, 0], [1, 0], [1, 1], [2, 1]] as const;
const T_TETROMINO = [[1, 0], [0, 1], [1, 1], [2, 1]] as const;

const ids = (blocks: readonly TestBlock[]): string[] => blocks.map((block) => block.id);

describe("block depth order", () => {
  it("orders the four replacement silhouettes from upper to lower despite reversed input", () => {
    const source: TestBlock[] = [
      { id: "orange-s-tetromino", y: 6, shape: S_TETROMINO },
      { id: "green-t-tetromino", y: 4, shape: T_TETROMINO },
      { id: "red-horizontal-2", y: 2, shape: HORIZONTAL_TWO },
      { id: "yellow-single", y: 0, shape: SINGLE },
    ];

    expect(ids(orderBlocksByDepth(source))).toEqual([
      "yellow-single",
      "red-horizontal-2",
      "green-t-tetromino",
      "orange-s-tetromino",
    ]);
    expect(ids(source)).toEqual([
      "orange-s-tetromino",
      "green-t-tetromino",
      "red-horizontal-2",
      "yellow-single",
    ]);
  });

  it("paints a block on the lower row later", () => {
    const lower: TestBlock = { id: "lower", y: 3, shape: HORIZONTAL_TWO };
    const upper: TestBlock = { id: "upper", y: 2, shape: SINGLE };

    expect(ids(orderBlocksByDepth([lower, upper]))).toEqual(["upper", "lower"]);
  });

  it("uses a fractional drag pose to switch depth dynamically", () => {
    const dragged: TestBlock = { id: "dragged", y: 1, shape: HORIZONTAL_TWO };
    const stationary: TestBlock = { id: "stationary", y: 2, shape: SINGLE };

    expect(ids(orderBlocksByDepth([stationary, dragged]))).toEqual(["dragged", "stationary"]);
    expect(ids(orderBlocksByDepth(
      [stationary, dragged],
      (block) => block.id === "dragged" ? 2.25 : block.y,
    ))).toEqual(["stationary", "dragged"]);
  });

  it("preserves source order when bottom-cell depths tie", () => {
    const source: TestBlock[] = [
      { id: "tall-first", y: 1, shape: T_TETROMINO },
      { id: "short-second", y: 2, shape: HORIZONTAL_TWO },
      { id: "short-third", y: 2, shape: SINGLE },
    ];

    expect(ids(orderBlocksByDepth(source))).toEqual([
      "tall-first",
      "short-second",
      "short-third",
    ]);
  });
});
