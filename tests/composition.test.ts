import { describe, expect, it } from "vitest";
import { COMPETITOR_VISIBLE_BLOCK_TARGETS } from "../src/core/campaignComposition";
import { LEVELS } from "../src/core/levels";
import type { Point } from "../src/core/types";

const VIDEO_PARITY_LEVELS_1_TO_100 = LEVELS.slice(0, 100);

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

const shapeHistogram = (level: (typeof LEVELS)[number]): Record<string, number> => Object.fromEntries(
  [...level.blocks.reduce((counts, block) => {
    const signature = shapeSignature(block.shape);
    counts.set(signature, (counts.get(signature) ?? 0) + 1);
    return counts;
  }, new Map<string, number>())].sort(([left], [right]) => left.localeCompare(right)),
);

const stageColorCount = (level: (typeof LEVELS)[number]): number => new Set(
  level.blocks.flatMap((block) => block.layers ?? [block.color]),
).size;

const CHAPTER_ONE_TOTAL_BLOCKS = [3, 9, 8, 18, 20, 21, 16, 25, 10, 25] as const;
const CHAPTER_ONE_STAGE_COLOR_COUNTS = [3, 5, 5, 8, 3, 4, 3, 4, 5, 6] as const;
const CHAPTER_ONE_SHAPE_HISTOGRAMS = [
  { "##/##": 3 },
  { "##/##": 9 },
  { "#/#/#": 5, "##/#.": 2, "###/.#.": 1 },
  { "#": 12, "###": 6 },
  { "#": 18, "#/#/#": 2 },
  { "#": 17, "##": 4 },
  { "#/#": 12, "##/##": 4 },
  { "#": 24, "##/##/##": 1 },
  { "##/##": 10 },
  { "#": 16, "#/#/#": 4, "##/##": 5 },
] as const;

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
  it("locks the competitor-informed total composition for Lv1–10 and keeps the full-level block floor for Lv11–100", () => {
    expect(COMPETITOR_VISIBLE_BLOCK_TARGETS).toHaveLength(100);
    const chapterOne = VIDEO_PARITY_LEVELS_1_TO_100.slice(0, 10);
    expect(chapterOne.map((level) => level.blocks.length)).toEqual(CHAPTER_ONE_TOTAL_BLOCKS);
    expect(chapterOne.map(shapeHistogram)).toEqual(CHAPTER_ONE_SHAPE_HISTOGRAMS);
    expect(chapterOne.map(stageColorCount)).toEqual(CHAPTER_ONE_STAGE_COLOR_COUNTS);

    const underfilled = VIDEO_PARITY_LEVELS_1_TO_100.slice(10)
      .map((level) => ({ id: level.id, actual: level.blocks.length, target: COMPETITOR_VISIBLE_BLOCK_TARGETS[level.id - 1] }))
      .filter(({ actual, target }) => actual < target);
    expect(underfilled).toEqual([]);
    for (let chapter = 1; chapter < 10; chapter += 1) {
      const counts = VIDEO_PARITY_LEVELS_1_TO_100.slice(chapter * 10, chapter * 10 + 10).map((level) => level.blocks.length);
      expect(new Set(counts).size, `chapter ${chapter + 1} count variety`).toBeGreaterThanOrEqual(4);
    }
  });

  it("keeps every competitor-shaped block connected while allowing locked single cells", () => {
    const allBlocks = VIDEO_PARITY_LEVELS_1_TO_100.slice(10).flatMap((level) => visibleBlocks(level));
    for (const level of VIDEO_PARITY_LEVELS_1_TO_100.slice(10)) {
      const blocks = visibleBlocks(level);
      expect(blocks.every((block) => isConnected(block.shape)), `Lv${level.id} connected visible blocks`).toBe(true);
    }
    expect(allBlocks.some((block) => block.shape.length === 1)).toBe(true);
    expect(allBlocks.some((block) => block.shape.length > 1)).toBe(true);
    expect(new Set(allBlocks.map((block) => shapeSignature(block.shape))).size).toBe(22);
  });
});
