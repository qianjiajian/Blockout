import { describe, expect, it } from "vitest";
import { distanceToBlockCells, pickNearbyBlock, rankNearbyBlocks } from "../src/game/blockPicker";

const candidates = [
  { id: "left", cells: [[0, 0]] as const },
  { id: "right", cells: [[2, 0]] as const },
];

describe("small-block nearby acquisition", () => {
  it("selects the one clearly nearest block inside the assist radius", () => {
    const result = pickNearbyBlock({ x: 1.2, y: 0.5 }, candidates, 0.4, 0.08);
    expect(result?.blockId).toBe("left");
    expect(result?.distance).toBeCloseTo(0.2, 6);
  });

  it("rejects an equal-distance point instead of guessing between blocks", () => {
    expect(pickNearbyBlock({ x: 1.5, y: 0.5 }, candidates, 0.6, 0.08)).toBeUndefined();
  });

  it("rejects a near tie inside the ambiguity margin", () => {
    expect(pickNearbyBlock({ x: 1.48, y: 0.5 }, candidates, 0.6, 0.05)).toBeUndefined();
    expect(pickNearbyBlock({ x: 1.44, y: 0.5 }, candidates, 0.6, 0.05)?.blockId).toBe("left");
  });

  it("does not acquire any block outside the assist radius", () => {
    expect(pickNearbyBlock({ x: 1.5, y: 2 }, candidates, 0.6, 0.05)).toBeUndefined();
  });

  it("uses the nearest occupied cell for concave and multi-cell shapes", () => {
    const shape = [[0, 0], [1, 0], [0, 1]] as const;
    expect(distanceToBlockCells({ x: 1.8, y: 1.2 }, shape)).toBeCloseTo(0.2, 6);
    const ranked = rankNearbyBlocks({ x: 1.8, y: 1.2 }, [
      { id: "l-shape", cells: shape },
      { id: "far", cells: [[4, 4]] },
    ]);
    expect(ranked[0]?.blockId).toBe("l-shape");
    expect(ranked[0]?.distance).toBeCloseTo(0.2, 6);
  });
});
