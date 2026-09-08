import { describe, expect, it } from "vitest";
import { COMPETITOR_VISIBLE_BLOCK_TARGETS } from "../src/core/campaignComposition";
import { LEVELS } from "../src/core/levels";
import type { Point } from "../src/core/types";

const visibleBlocks = (level: (typeof LEVELS)[number]) => {
  const closed = new Set((level.shutters ?? []).filter((shutter) => shutter.count > 0).map((shutter) => shutter.id));
  return level.blocks.filter((block) => !block.shutterId || !closed.has(block.shutterId));
};

const shapeSignature = (shape: readonly Point[]): string => {
  const maxX = Math.max(...shape.map(([x]) => x));
  const maxY = Math.max(...shape.map(([, y]) => y));
  const cells = new Set(shape.map(([x, y]) => `${x},${y}`));
  return Array.from({ length: maxY + 1 }, (_, y) => (
    Array.from({ length: maxX + 1 }, (_, x) => cells.has(`${x},${y}`) ? "#" : ".").join("")
  )).join("/");
};

const isConnected = (shape: readonly Point[]): boolean => {
  const cells = new Set(shape.map(([x, y]) => `${x},${y}`));
  const first = shape[0];
  if (!first) return false;
  const queue: Point[] = [first];
  const visited = new Set([`${first[0]},${first[1]}`]);
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const [x, y] = queue[cursor];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const next = `${x + dx},${y + dy}`;
      if (!cells.has(next) || visited.has(next)) continue;
      visited.add(next);
      queue.push([x + dx, y + dy]);
    }
  }
  return visited.size === cells.size;
};

describe("competitor-paced block composition", () => {
  it("follows the authored visible-block count wave", () => {
    expect(COMPETITOR_VISIBLE_BLOCK_TARGETS).toHaveLength(100);
    const underfilled = LEVELS
      .map((level) => ({ id: level.id, actual: visibleBlocks(level).length, target: COMPETITOR_VISIBLE_BLOCK_TARGETS[level.id - 1] }))
      .filter(({ actual, target }) => actual < target);
    expect(underfilled).toEqual([]);
    for (let chapter = 0; chapter < 10; chapter += 1) {
      const counts = LEVELS.slice(chapter * 10, chapter * 10 + 10).map((level) => visibleBlocks(level).length);
      expect(new Set(counts).size, `chapter ${chapter + 1} count variety`).toBeGreaterThanOrEqual(4);
    }
  });

  it("replaces the late-game square wall with connected shape families", () => {
    for (const level of LEVELS.slice(2)) {
      const blocks = visibleBlocks(level);
      expect(blocks.every((block) => block.shape.length >= 2 && isConnected(block.shape)), `Lv${level.id} connected multi-cell blocks`).toBe(true);
      if (blocks.length >= 5) {
        expect(new Set(blocks.map((block) => shapeSignature(block.shape))).size, `Lv${level.id} visible shape variety`).toBeGreaterThanOrEqual(3);
      }
    }

    for (let chapter = 2; chapter < 10; chapter += 1) {
      const shapes = LEVELS.slice(chapter * 10, chapter * 10 + 10).flatMap((level) => visibleBlocks(level).map((block) => shapeSignature(block.shape)));
      const squareCount = shapes.filter((shape) => shape === "##/##").length;
      expect(new Set(shapes).size, `chapter ${chapter + 1} shape families`).toBeGreaterThanOrEqual(8);
      expect(squareCount / shapes.length, `chapter ${chapter + 1} square share`).toBeLessThanOrEqual(0.25);
    }
  });
});
