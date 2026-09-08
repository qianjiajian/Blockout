import { describe, expect, it } from "vitest";
import { LEVELS } from "../src/core/levels";
import type { Point } from "../src/core/types";
import { buildBlockConnectorLayout } from "../src/game/blockConnectors";

describe("ImageGen multi-cell block connectors", () => {
  it("does not add a connector to a single-cell block", () => {
    expect(buildBlockConnectorLayout([[0, 0]])).toEqual([]);
  });

  it("joins horizontal and vertical neighbors with the correct rotation", () => {
    expect(buildBlockConnectorLayout([[0, 0], [1, 0]])).toEqual([{ x: 1, y: 0.5, quarterTurns: 1 }]);
    expect(buildBlockConnectorLayout([[0, 0], [0, 1]])).toEqual([{ x: 0.5, y: 1, quarterTurns: 0 }]);
  });

  it("joins an L block without bridging its missing diagonal", () => {
    const layout = buildBlockConnectorLayout([[0, 0], [1, 0], [0, 1]]);
    expect(layout).toHaveLength(2);
    expect(layout).toContainEqual({ x: 1, y: 0.5, quarterTurns: 1 });
    expect(layout).toContainEqual({ x: 0.5, y: 1, quarterTurns: 0 });
  });

  it("keeps every campaign block connected without duplicate bridges", () => {
    for (const level of LEVELS) {
      for (const block of level.blocks) {
        const cells = block.shape as readonly Point[];
        const layout = buildBlockConnectorLayout(cells);
        expect(layout.length, `level ${level.id} block ${block.id}`).toBeGreaterThanOrEqual(cells.length - 1);
        expect(new Set(layout.map((connector) => `${connector.x},${connector.y},${connector.quarterTurns}`)).size).toBe(layout.length);
        const occupied = new Set(cells.map(([x, y]) => `${x},${y}`));
        for (const connector of layout) {
          const adjacent = connector.quarterTurns === 1
            ? [`${connector.x - 1},${connector.y - 0.5}`, `${connector.x},${connector.y - 0.5}`]
            : [`${connector.x - 0.5},${connector.y - 1}`, `${connector.x - 0.5},${connector.y}`];
          expect(adjacent.every((cell) => occupied.has(cell)), `level ${level.id} block ${block.id} internal bridge`).toBe(true);
        }
      }
    }
  });
});
