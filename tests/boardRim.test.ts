import { describe, expect, it } from "vitest";
import { LEVELS } from "../src/core/levels";
import { buildBoardRimLayout } from "../src/game/boardRim";

describe("ImageGen board rim topology", () => {
  it("wraps one floor cell with four rails and four convex corners", () => {
    const rim = buildBoardRimLayout([[0, 0]], [], 1, 1);
    expect(rim.rails).toHaveLength(4);
    expect(rim.convexCorners).toHaveLength(4);
    expect(new Set(rim.rails.map((rail) => `${rail.x},${rail.y},${rail.quarterTurns}`)).size).toBe(4);
  });

  it("does not draw a rail between adjacent floor cells", () => {
    const rim = buildBoardRimLayout([[0, 0], [1, 0]], [], 2, 1);
    expect(rim.rails).toHaveLength(6);
    expect(rim.rails.some((rail) => rail.x === 1 && rail.y === 0.5)).toBe(false);
    expect(rim.convexCorners).toHaveLength(4);
  });

  it("treats blocked cells as voids in the visual silhouette", () => {
    const rim = buildBoardRimLayout([[0, 0], [1, 0]], [[1, 0]], 2, 1);
    expect(rim.rails).toHaveLength(4);
    expect(rim.convexCorners).toHaveLength(4);
  });

  it("covers every exposed edge exactly once across all 100 campaign masks", () => {
    for (const level of LEVELS) {
      const blocked = new Set((level.blocked ?? []).map(([x, y]) => `${x},${y}`));
      const active = new Set((level.playable ?? []).map(([x, y]) => `${x},${y}`).filter((cell) => !blocked.has(cell)));
      let expectedPerimeter = 0;
      for (const cell of active) {
        const [x, y] = cell.split(",").map(Number);
        for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
          if (!active.has(`${x + dx},${y + dy}`)) expectedPerimeter += 1;
        }
      }
      const rim = buildBoardRimLayout(level.playable ?? [], level.blocked ?? [], level.width, level.height);
      expect(rim.rails, `level ${level.id} exposed rails`).toHaveLength(expectedPerimeter);
      expect(new Set(rim.rails.map((rail) => `${rail.x},${rail.y},${rail.quarterTurns}`)).size, `level ${level.id} unique rails`).toBe(expectedPerimeter);
      expect(rim.convexCorners.length, `level ${level.id} visible convex corners`).toBeGreaterThanOrEqual(4);
    }
  });
});
