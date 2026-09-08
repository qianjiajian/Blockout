import { describe, expect, it } from "vitest";
import { chooseBlockBadgeCell } from "../src/game/blockBadge";

describe("block badge placement", () => {
  it("keeps the symbol on a single-cell block", () => {
    expect(chooseBlockBadgeCell([[4, 7]])).toEqual([4, 7]);
  });

  it("uses the stable inner-left cell of an even bar", () => {
    expect(chooseBlockBadgeCell([[0, 0], [1, 0], [2, 0], [3, 0]])).toEqual([1, 0]);
  });

  it("uses the connected elbow of an L shape", () => {
    expect(chooseBlockBadgeCell([[0, 0], [0, 1], [1, 1]])).toEqual([0, 1]);
  });

  it("uses the high-degree center of a T shape", () => {
    expect(chooseBlockBadgeCell([[0, 0], [1, 0], [2, 0], [1, 1]])).toEqual([1, 0]);
  });

  it("is translation invariant", () => {
    expect(chooseBlockBadgeCell([[8, 5], [9, 5], [10, 5], [9, 6]])).toEqual([9, 5]);
  });
});
