import type { BlockSpec, GeneratorSpec, LevelSpec, Point } from "./types";

const HORIZONTAL_3: Point[] = [[0, 0], [1, 0], [2, 0]];
const HORIZONTAL_2: Point[] = [[0, 0], [1, 0]];
const VERTICAL_3: Point[] = [[0, 0], [0, 1], [0, 2]];
const OFFSET_HORIZONTAL_3: Point[] = [[0, 1], [1, 1], [2, 1]];
const BOTTOM_HORIZONTAL_3: Point[] = [[0, 2], [1, 2], [2, 2]];

type Placement = readonly [string, string, Point, Point[]];

/**
 * v1.63: Lv43 had a full-board opening with only two legal exits, while all
 * six generator mouths remained occupied after those exits.  This compact
 * authored replacement keeps the board, gates, IDs, reward/time contract and
 * six-machine mechanism count, but gives the opening a real release chain.
 * All authored footprints are horizontal native shapes; no texture rotation
 * or runtime rotation is involved.
 */
const ACTIVE_LAYOUT: readonly Placement[] = [
  ["43-o4-1", "blue", [0, 0], HORIZONTAL_3],
  ["43-fill3", "green", [3, 0], HORIZONTAL_3],
  ["43-fill9", "blue", [0, 1], HORIZONTAL_3],
  ["43-o3-1", "green", [3, 1], HORIZONTAL_3],
  ["43-o1", "blue", [0, 2], HORIZONTAL_3],
  ["43-fill7", "yellow", [3, 2], HORIZONTAL_3],
  ["43-o5", "red", [0, 3], HORIZONTAL_3],
  ["43-fill0", "yellow", [3, 3], HORIZONTAL_3],
  ["43-fill1", "red", [0, 4], HORIZONTAL_3],
  ["43-fill4", "yellow", [3, 4], HORIZONTAL_3],
  ["43-o2", "red", [0, 5], HORIZONTAL_3],
  ["43-o4-0", "yellow", [3, 5], HORIZONTAL_3],
  ["43-fill2", "red", [0, 6], HORIZONTAL_2],
  ["43-fill8", "red", [2, 6], HORIZONTAL_2],
  ["43-o6", "yellow", [4, 6], HORIZONTAL_2],
  ["43-fill5", "red", [0, 7], HORIZONTAL_2],
  ["43-fill6", "red", [2, 7], HORIZONTAL_2],
  ["43-o3-0", "yellow", [4, 7], HORIZONTAL_2],
];

interface GeneratorPlacement extends GeneratorSpec {
  queueBlockIds: [string];
}

const GENERATORS: readonly GeneratorPlacement[] = [
  { id: "43-machine1", side: "top", offset: 1, spawn: [0, 0], rimSpan: 3, rimMount: "rim", rimAnchor: { x: 1.5, y: 0, quarterTurns: 0 }, queueBlockIds: ["43-q1"] },
  { id: "43-machine2", side: "top", offset: 4, spawn: [3, 0], rimSpan: 3, rimMount: "rim", rimAnchor: { x: 4.5, y: 0, quarterTurns: 0 }, queueBlockIds: ["43-q2"] },
  { id: "43-machine3", side: "bottom", offset: 1, spawn: [0, 5], rimSpan: 3, rimMount: "rim", rimAnchor: { x: 1.5, y: 8, quarterTurns: 2 }, queueBlockIds: ["43-q3"] },
  { id: "43-machine4", side: "bottom", offset: 4, spawn: [3, 5], rimSpan: 3, rimMount: "rim", rimAnchor: { x: 4.5, y: 8, quarterTurns: 2 }, queueBlockIds: ["43-q4"] },
  { id: "43-machine5", side: "left", offset: 4, spawn: [0, 3], rimSpan: 3, rimMount: "rim", rimAnchor: { x: 0, y: 4.5, quarterTurns: 3 }, queueBlockIds: ["43-q5"] },
  { id: "43-machine6", side: "right", offset: 3, spawn: [3, 2], rimSpan: 3, rimMount: "rim", rimAnchor: { x: 6, y: 3.5, quarterTurns: 1 }, queueBlockIds: ["43-q6"] },
];

const QUEUE_LAYOUT: readonly Placement[] = [
  ["43-q1", "blue", [0, 0], HORIZONTAL_3],
  ["43-q2", "green", [3, 0], HORIZONTAL_3],
  ["43-q3", "red", [0, 5], BOTTOM_HORIZONTAL_3],
  ["43-q4", "yellow", [3, 5], BOTTOM_HORIZONTAL_3],
  ["43-q5", "red", [0, 3], OFFSET_HORIZONTAL_3],
  ["43-q6", "yellow", [3, 2], OFFSET_HORIZONTAL_3],
];

const cloneShape = (shape: readonly Point[]): Point[] => shape.map(([x, y]) => [x, y] as Point);

export const applyLevel43Repair = (source: LevelSpec): LevelSpec => {
  if (source.id !== 43) return source;
  const sourceBlocks = new Map(source.blocks.map((block) => [block.id, block]));
  const blocks = [...ACTIVE_LAYOUT, ...QUEUE_LAYOUT].map(([id, color, [x, y], shape]) => {
    const original = sourceBlocks.get(id);
    if (!original) throw new Error(`Lv43 repair missing source block ${id}`);
    return {
      ...original,
      id,
      color: color as BlockSpec["color"],
      x,
      y,
      shape: cloneShape(shape),
    };
  });
  return {
    ...source,
    blocks,
    generators: GENERATORS.map((generator) => ({
      ...generator,
      spawn: [...generator.spawn] as Point,
      queueBlockIds: [...generator.queueBlockIds],
    })),
  };
};
