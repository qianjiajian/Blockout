import { describe, expect, it } from "vitest";

import { transformLevel } from "../src/core/campaignExpansion";
import type { LevelSpec } from "../src/core/types";

const source: LevelSpec = {
  id: 991,
  name: "portal transform fixture",
  difficulty: "normal",
  timeSeconds: 60,
  reward: 0,
  width: 5,
  height: 4,
  playable: [[1, 0], [1, 1]],
  gates: [{
    id: "fixed",
    side: "top",
    offset: 1,
    size: 1,
    color: "red",
    portals: [
      { side: "top", origin: [1, 0], size: 1 },
      { side: "right", origin: [1, 1], size: 1 },
    ],
  }],
  flipDoors: [{
    id: "door",
    side: "left",
    offset: 1,
    size: 1,
    color: "blue",
    initiallyOpen: true,
    portals: [
      { side: "left", origin: [0, 1], size: 1 },
      { side: "bottom", origin: [1, 1], size: 1 },
    ],
  }],
  blocks: [{ id: "cargo", x: 1, y: 1, shape: [[0, 0]], color: "red" }],
};

describe("campaign portal transform pipeline", () => {
  it("rotates every fixed and flip-door portal while mirroring the first portal into legacy fields", () => {
    const level = transformLevel(source, {
      id: 991,
      name: "rotated fixture",
      sourceId: 991,
      transform: "rotate-90",
      colorShift: 1,
      difficulty: "normal",
      timeSeconds: 60,
      reward: 0,
    });

    expect(level.width).toBe(4);
    expect(level.height).toBe(5);
    expect(level.gates[0]).toMatchObject({
      side: "right",
      offset: 1,
      size: 1,
      color: "blue",
      portals: [
        { side: "right", origin: [3, 1], size: 1 },
        { side: "bottom", origin: [2, 1], size: 1 },
      ],
    });
    expect(level.flipDoors?.[0]).toMatchObject({
      side: "top",
      offset: 2,
      size: 1,
      color: "green",
      initiallyOpen: true,
      portals: [
        { side: "top", origin: [2, 0], size: 1 },
        { side: "left", origin: [2, 1], size: 1 },
      ],
    });
    expect(level.playable).toContainEqual([2, 0]);
  });
});
