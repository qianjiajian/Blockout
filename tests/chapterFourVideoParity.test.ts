import { describe, expect, it } from "vitest";
import { CHAPTER_FOUR_VIDEO_LEVELS } from "../src/core/chapterFourVideoLevels";
import type { Point } from "../src/core/types";

const SHAPES = {
  SINGLE: [[0, 0]],
  H2: [[0, 0], [1, 0]],
  V2: [[0, 0], [0, 1]],
  H3: [[0, 0], [1, 0], [2, 0]],
  V3: [[0, 0], [0, 1], [0, 2]],
  SQ2: [[0, 0], [1, 0], [0, 1], [1, 1]],
  L3: [[0, 0], [1, 0], [0, 1]],
  L4: [[0, 0], [0, 1], [0, 2], [1, 2]],
  T4: [[0, 0], [1, 0], [2, 0], [1, 1]],
  S4: [[1, 0], [2, 0], [0, 1], [1, 1]],
  CROSS5: [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]],
} satisfies Record<string, Point[]>;

const shapeKey = (shape: readonly Point[]): string => {
  const minX = Math.min(...shape.map(([x]) => x));
  const minY = Math.min(...shape.map(([, y]) => y));
  return shape.map(([x, y]) => `${x - minX},${y - minY}`).sort().join(";");
};

const shapeVariants = (shape: readonly Point[]): Set<string> => {
  const variants = new Set<string>();
  for (const reflected of [false, true]) {
    let points = shape.map(([x, y]) => [reflected ? -x : x, y] as Point);
    for (let turn = 0; turn < 4; turn += 1) {
      variants.add(shapeKey(points));
      points = points.map(([x, y]) => [-y, x]);
    }
  }
  return variants;
};

const SHAPE_VARIANTS = Object.fromEntries(
  Object.entries(SHAPES).map(([name, shape]) => [name, shapeVariants(shape)]),
) as Record<keyof typeof SHAPES, Set<string>>;

const shapeName = (shape: readonly Point[]): keyof typeof SHAPES => {
  if (shape.length === 1) return "SINGLE";
  const width = Math.max(...shape.map(([x]) => x)) - Math.min(...shape.map(([x]) => x)) + 1;
  const height = Math.max(...shape.map(([, y]) => y)) - Math.min(...shape.map(([, y]) => y)) + 1;
  if (shape.length === 2) return width === 2 ? "H2" : "V2";
  if (shape.length === 3) {
    if (width === 3) return "H3";
    if (height === 3) return "V3";
    return "L3";
  }
  const key = shapeKey(shape);
  const match = Object.entries(SHAPE_VARIANTS)
    .filter(([name]) => !["SINGLE", "H2", "V2", "H3", "V3", "L3"].includes(name))
    .find(([, variants]) => variants.has(key));
  if (!match) throw new Error(`Unknown chapter-four shape ${key}`);
  return match[0] as keyof typeof SHAPES;
};

const shapeHistogram = (level: (typeof CHAPTER_FOUR_VIDEO_LEVELS)[number]): Record<string, number> => {
  const histogram: Record<string, number> = {};
  for (const block of level.blocks) {
    const name = shapeName(block.shape);
    histogram[name] = (histogram[name] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(histogram).sort(([left], [right]) => left.localeCompare(right)));
};

const EXPECTED = [
  { id: 31, size: [6, 8, 48], time: 90, blocks: 18, shapes: { SQ2: 4, V2: 14 }, colors: 4, ordinary: 1, frozenGates: [2, 10, 13], frozenBlocks: [5, 9, 10, 13], covers: 0, covered: 0, generators: 0, queued: 0, layerExtras: 0 },
  { id: 32, size: [6, 9, 54], time: 90, blocks: 14, shapes: { H2: 2, L4: 6, V3: 6 }, colors: 4, ordinary: 1, frozenGates: [8, 8, 8], frozenBlocks: [4, 4, 4, 4, 4, 4], covers: 0, covered: 0, generators: 0, queued: 0, layerExtras: 6 },
  { id: 33, size: [7, 9, 39], time: 90, blocks: 23, shapes: { SINGLE: 21, T4: 2 }, colors: 6, ordinary: 2, frozenGates: [5, 10, 10, 16, 18], frozenBlocks: [], covers: 0, covered: 0, generators: 0, queued: 0, layerExtras: 0 },
  { id: 34, size: [7, 9, 63], time: 120, blocks: 30, shapes: { H2: 1, SINGLE: 13, V2: 3, V3: 13 }, colors: 6, ordinary: 1, frozenGates: [7, 13, 14, 22, 22], frozenBlocks: [], covers: 2, covered: 13, generators: 0, queued: 0, layerExtras: 7 },
  { id: 35, size: [5, 8, 34], time: 60, blocks: 18, shapes: { H3: 1, L3: 2, L4: 4, S4: 1, SQ2: 3, T4: 5, V3: 2 }, colors: 3, ordinary: 3, frozenGates: [], frozenBlocks: [], covers: 0, covered: 0, generators: 2, queued: 16, layerExtras: 0 },
  { id: 36, size: [6, 9, 54], time: 90, blocks: 14, shapes: { H2: 3, L3: 5, L4: 2, SQ2: 1, V2: 3 }, colors: 4, ordinary: 4, frozenGates: [], frozenBlocks: [], covers: 0, covered: 0, generators: 3, queued: 3, layerExtras: 0 },
  { id: 37, size: [7, 8, 44], time: 90, blocks: 19, shapes: { H2: 2, H3: 2, L3: 3, SQ2: 1, T4: 1, V2: 10 }, colors: 6, ordinary: 3, frozenGates: [2, 7, 11, 15], frozenBlocks: [3, 3], covers: 1, covered: 3, generators: 1, queued: 4, layerExtras: 0 },
  { id: 38, size: [6, 7, 42], time: 120, blocks: 25, shapes: { CROSS5: 1, H2: 7, H3: 7, SINGLE: 9, V2: 1 }, colors: 6, ordinary: 1, frozenGates: [3, 8, 18, 20, 23], frozenBlocks: [5, 5, 5], covers: 1, covered: 8, generators: 1, queued: 6, layerExtras: 0 },
  { id: 39, size: [8, 8, 64], time: 160, blocks: 34, shapes: { H2: 9, L3: 2, SINGLE: 12, SQ2: 3, V2: 8 }, colors: 6, ordinary: 2, frozenGates: [2, 5, 9, 11, 15, 19, 22, 23, 28, 30], frozenBlocks: [1, 1, 1, 1, 12], covers: 3, covered: 21, generators: 1, queued: 2, layerExtras: 0 },
  { id: 40, size: [6, 6, 36], time: 90, blocks: 19, shapes: { H2: 5, L3: 1, SINGLE: 6, V2: 6, V3: 1 }, colors: 5, ordinary: 1, frozenGates: [1, 2, 3, 4, 6], frozenBlocks: [], covers: 1, covered: 8, generators: 0, queued: 0, layerExtras: 0 },
] as const;

const CERTIFIED_ROUTES = new Map<number, { parMoves: number; floor: number }>([
  [31, { parMoves: 27, floor: 7 }],
  [32, { parMoves: 124, floor: 8 }],
  [33, { parMoves: 35, floor: 10 }],
  [34, { parMoves: 68, floor: 11 }],
  [35, { parMoves: 26, floor: 8 }],
  [36, { parMoves: 24, floor: 5 }],
  [37, { parMoves: 63, floor: 12 }],
  [38, { parMoves: 59, floor: 5 }],
  [39, { parMoves: 48, floor: 5 }],
  [40, { parMoves: 227, floor: 15 }],
]);

const playableComponentCount = (points: readonly Point[]): number => {
  const remaining = new Set(points.map(([x, y]) => `${x},${y}`));
  let components = 0;
  while (remaining.size) {
    components += 1;
    const first = remaining.values().next().value as string;
    const queue = [first];
    remaining.delete(first);
    for (let index = 0; index < queue.length; index += 1) {
      const [x, y] = queue[index].split(",").map(Number);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as Point[]) {
        const neighbor = `${x + dx},${y + dy}`;
        if (!remaining.delete(neighbor)) continue;
        queue.push(neighbor);
      }
    }
  }
  return components;
};

const occupiedCells = (block: (typeof CHAPTER_FOUR_VIDEO_LEVELS)[number]["blocks"][number]): string[] => (
  block.shape.map(([dx, dy]) => `${block.x + dx},${block.y + dy}`)
);

describe("chapter four video composition parity", () => {
  it("locks the truth-v6 and contract-v7 structure and only publishes SHA-bound route floors", () => {
    expect(CHAPTER_FOUR_VIDEO_LEVELS).toHaveLength(10);
    for (const [index, expected] of EXPECTED.entries()) {
      const level = CHAPTER_FOUR_VIDEO_LEVELS[index];
      expect(level.id).toBe(expected.id);
      expect([level.width, level.height, level.playable?.length]).toEqual(expected.size);
      expect(level.timeSeconds).toBe(expected.time);
      expect(level.blocks).toHaveLength(expected.blocks);
      expect(shapeHistogram(level)).toEqual(expected.shapes);
      expect(new Set(level.blocks.flatMap((block) => block.layers ?? [block.color])).size).toBe(expected.colors);
      expect(level.gates.filter((gate) => gate.frozen === undefined)).toHaveLength(expected.ordinary);
      expect(level.gates.map((gate) => gate.frozen).filter((value): value is number => value !== undefined).sort((a, b) => a - b)).toEqual(expected.frozenGates);
      expect(level.blocks.map((block) => block.frozen).filter((value): value is number => value !== undefined).sort((a, b) => a - b)).toEqual(expected.frozenBlocks);
      expect(level.shutters ?? []).toHaveLength(expected.covers);
      expect(level.blocks.filter((block) => block.shutterId !== undefined)).toHaveLength(expected.covered);
      expect(level.generators ?? []).toHaveLength(expected.generators);
      expect((level.generators ?? []).reduce((sum, generator) => sum + generator.queueBlockIds.length, 0)).toBe(expected.queued);
      expect(level.blocks.reduce((sum, block) => sum + Math.max(0, (block.layers?.length ?? 1) - 1), 0)).toBe(expected.layerExtras);
      const certified = CERTIFIED_ROUTES.get(level.id);
      expect(level.parMoves).toBe(certified?.parMoves);
      expect(level.designTargets?.minimumRepositionOverhead).toBe(certified?.floor ?? null);
    }
  });

  it("keeps every chapter-four board connected while allowing an original interior silhouette", () => {
    for (const level of CHAPTER_FOUR_VIDEO_LEVELS) {
      expect(playableComponentCount(level.playable ?? []), `Lv${level.id}`).toBe(1);
    }
  });

  it("keeps live covers clear of the opening layout and each hidden batch collision-free", () => {
    for (const level of CHAPTER_FOUR_VIDEO_LEVELS) {
      const queuedIds = new Set(
        (level.generators ?? []).flatMap((generator) => generator.queueBlockIds),
      );
      const openingCells = new Set(
        level.blocks
          .filter((block) => block.shutterId === undefined && !queuedIds.has(block.id))
          .flatMap(occupiedCells),
      );

      for (const shutter of level.shutters ?? []) {
        const coverCells = Array.from({ length: shutter.height }, (_, dy) => (
          Array.from({ length: shutter.width }, (__, dx) => `${shutter.x + dx},${shutter.y + dy}`)
        )).flat();
        expect(
          coverCells.filter((cell) => openingCells.has(cell)),
          `Lv${level.id} ${shutter.id} must not cover an opening block`,
        ).toEqual([]);

        const hiddenCells = new Set<string>();
        for (const block of level.blocks.filter((candidateBlock) => candidateBlock.shutterId === shutter.id)) {
          for (const cell of occupiedCells(block)) {
            expect(hiddenCells.has(cell), `Lv${level.id} ${shutter.id} hidden overlap at ${cell}`).toBe(false);
            hiddenCells.add(cell);
          }
        }
      }
    }
  });
});
