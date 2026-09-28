import type {
  BlockSpec,
  FlipDoorSpec,
  GeneratorSpec,
  LevelSpec,
  Point,
} from "./types";

export const GENERATOR_FROZEN_CARGO_REPAIR_VERSION = "queue-thawed-lv156-video-r1" as const;
export const GENERATOR_FROZEN_CARGO_REPAIR_LEVEL_IDS = [41, 87, 156] as const;

const LV156_PLAYABLE: readonly Point[] = [
  ...Array.from({ length: 6 }, (_, y) => (
    Array.from({ length: 8 }, (__, x) => [x, y] as Point)
  )).flat(),
  ...Array.from({ length: 4 }, (_, row) => (
    Array.from({ length: 4 }, (__, column) => [column + 2, row + 6] as Point)
  )).flat(),
];

/**
 * The two opening ice bars and the two visible yellow generator-mouth
 * preloads are frame-proven. Queue shapes after each preview are not visible
 * in the source video, so the unseen cargo alternates with yellow to preserve
 * the five Flip Door cadence while keeping every queued piece thawed.
 */
const LV156_BLOCKS: readonly BlockSpec[] = [
  { id: "lv156-opening-b01", x: 2, y: 5, shape: [[0, 0], [1, 0]], color: "cyan", frozen: 1 },
  { id: "lv156-opening-b02", x: 5, y: 5, shape: [[0, 0], [1, 0]], color: "cyan", frozen: 1 },
  { id: "lv156-generator-1-b01", x: 2, y: 0, shape: [[0, 0], [0, 1], [0, 2], [1, 1]], color: "cyan" },
  { id: "lv156-generator-1-b02", x: 5, y: 0, shape: [[0, 1]], color: "yellow" },
  { id: "lv156-generator-1-b03", x: 2, y: 1, shape: [[0, 1]], color: "cyan" },
  { id: "lv156-generator-1-b04", x: 4, y: 1, shape: [[0, 1]], color: "yellow" },
  { id: "lv156-generator-2-b01", x: 2, y: 0, shape: [[0, 0], [0, 1], [1, 1]], color: "orange" },
  { id: "lv156-generator-2-b02", x: 3, y: 0, shape: [[0, 1]], color: "yellow" },
  { id: "lv156-generator-2-b03", x: 4, y: 0, shape: [[0, 1]], color: "orange" },
  { id: "lv156-generator-2-b04", x: 5, y: 0, shape: [[0, 1]], color: "yellow" },
  { id: "lv156-generator-3-b01", x: 2, y: 0, shape: [[1, 1], [2, 1], [2, 2]], color: "red" },
  { id: "lv156-generator-3-b02", x: 3, y: 0, shape: [[1, 1], [2, 1]], color: "yellow" },
  { id: "lv156-generator-3-b03", x: 5, y: 0, shape: [[2, 0], [2, 1]], color: "red" },
  { id: "lv156-generator-3-b04", x: 4, y: 1, shape: [[2, 0], [2, 1]], color: "yellow" },
  { id: "lv156-generator-4-b01", x: 2, y: 0, shape: [[1, 0], [1, 1], [2, 1]], color: "red" },
  { id: "lv156-generator-4-b02", x: 3, y: 0, shape: [[1, 0], [2, 0], [2, 1]], color: "yellow" },
  { id: "lv156-generator-4-b03", x: 5, y: 0, shape: [[2, 0], [2, 1]], color: "red" },
  { id: "lv156-generator-4-b04", x: 2, y: 2, shape: [[2, 0], [2, 1]], color: "yellow" },
  { id: "lv156-opening-b03", x: 0, y: 2, shape: [[0, 0], [0, 1], [0, 2]], color: "yellow" },
  { id: "lv156-opening-b04", x: 7, y: 2, shape: [[0, 0], [0, 1], [0, 2]], color: "yellow" },
];

const LV156_FLIP_DOORS: readonly FlipDoorSpec[] = [
  { id: "lv156-flip-door-01", side: "top", offset: 3, size: 2, color: "yellow", initiallyOpen: false },
  { id: "lv156-flip-door-02", side: "bottom", offset: 4, size: 2, color: "green", initiallyOpen: true },
  { id: "lv156-flip-door-03", side: "top", offset: 6, size: 2, color: "red", initiallyOpen: true },
  { id: "lv156-flip-door-04", side: "top", offset: 0, size: 2, color: "cyan", initiallyOpen: true },
  { id: "lv156-flip-door-05", side: "bottom", offset: 2, size: 2, color: "orange", initiallyOpen: true },
];

const LV156_GENERATORS: readonly GeneratorSpec[] = [
  {
    id: "lv156-generator-1", side: "left", offset: 1, spawn: [0, 0], rimSpan: 3, rimMount: "rim",
    rimAnchor: { x: 0, y: 1.5, quarterTurns: 3 }, trigger: "move",
    queueBlockIds: ["lv156-generator-1-b01", "lv156-generator-1-b02", "lv156-generator-1-b03", "lv156-generator-1-b04"],
  },
  {
    id: "lv156-generator-2", side: "left", offset: 4, spawn: [0, 3], rimSpan: 3, rimMount: "rim",
    rimAnchor: { x: 0, y: 4.5, quarterTurns: 3 }, trigger: "move",
    queueBlockIds: ["lv156-generator-2-b01", "lv156-generator-2-b02", "lv156-generator-2-b03", "lv156-generator-2-b04"],
  },
  {
    id: "lv156-generator-3", side: "right", offset: 1, spawn: [5, 0], rimSpan: 3, rimMount: "rim",
    rimAnchor: { x: 8, y: 1.5, quarterTurns: 1 }, trigger: "move",
    queueBlockIds: ["lv156-generator-3-b01", "lv156-generator-3-b02", "lv156-generator-3-b03", "lv156-generator-3-b04"],
  },
  {
    id: "lv156-generator-4", side: "right", offset: 4, spawn: [5, 3], rimSpan: 3, rimMount: "rim",
    rimAnchor: { x: 8, y: 4.5, quarterTurns: 1 }, trigger: "move",
    queueBlockIds: ["lv156-generator-4-b01", "lv156-generator-4-b02", "lv156-generator-4-b03", "lv156-generator-4-b04"],
  },
];

const clonePoints = (points: readonly Point[]): Point[] => points.map(([x, y]) => [x, y]);
const cloneBlocks = (blocks: readonly BlockSpec[]): BlockSpec[] => blocks.map((block) => ({
  ...block,
  shape: clonePoints(block.shape),
  layers: block.layers ? [...block.layers] : undefined,
}));
const cloneDoors = (doors: readonly FlipDoorSpec[]): FlipDoorSpec[] => doors.map((door) => ({ ...door }));
const cloneGenerators = (generators: readonly GeneratorSpec[]): GeneratorSpec[] => generators.map((generator) => ({
  ...generator,
  spawn: [...generator.spawn] as Point,
  queueBlockIds: [...generator.queueBlockIds],
  rimAnchor: generator.rimAnchor ? { ...generator.rimAnchor } : undefined,
}));
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);

const repairLevel156 = (source: LevelSpec): LevelSpec => {
  const requiredBlockIds = new Set(LV156_BLOCKS.slice(0, 18).map((block) => block.id));
  const sourceBlockIds = new Set(source.blocks.map((block) => block.id));
  const requiredGeneratorIds = new Set(LV156_GENERATORS.map((generator) => generator.id));
  const sourceGeneratorIds = new Set((source.generators ?? []).map((generator) => generator.id));
  if (source.width !== 8 || source.height !== 10
    || ![18, 20].includes(source.blocks.length)
    || [...requiredBlockIds].some((id) => !sourceBlockIds.has(id))
    || (source.generators ?? []).length !== 4
    || [...requiredGeneratorIds].some((id) => !sourceGeneratorIds.has(id))
    || (source.flipDoors ?? []).length !== 5) {
    throw new Error("Lv156 generator frozen-cargo repair source drift");
  }

  const playable = clonePoints(LV156_PLAYABLE);
  const blocks = cloneBlocks(LV156_BLOCKS);
  const flipDoors = cloneDoors(LV156_FLIP_DOORS);
  const generators = cloneGenerators(LV156_GENERATORS);
  if (source.blocked === undefined
    && source.gates.length === 0
    && same(source.playable, playable)
    && same(source.blocks, blocks)
    && same(source.flipDoors, flipDoors)
    && same(source.generators, generators)) return source;
  return {
    ...source,
    playable,
    blocked: undefined,
    gates: [],
    blocks,
    flipDoors,
    generators,
  };
};

export const generatorFrozenCargoIssues = (level: LevelSpec): string[] => {
  const blocks = new Map(level.blocks.map((block) => [block.id, block]));
  const issues: string[] = [];
  for (const generator of level.generators ?? []) {
    for (const blockId of generator.queueBlockIds) {
      const block = blocks.get(blockId);
      if (!block) {
        issues.push(`Lv${level.id} ${generator.id}: missing queued block ${blockId}`);
      } else if ((block.frozen ?? 0) > 0) {
        issues.push(`Lv${level.id} ${generator.id}: queued block ${blockId} cannot be frozen`);
      }
    }
  }
  return issues;
};

export const assertGeneratorFrozenCargoContract = (level: LevelSpec): LevelSpec => {
  const issues = generatorFrozenCargoIssues(level);
  if (issues.length) throw new Error(issues.join("; "));
  return level;
};

/**
 * Final campaign guard: generated cargo is always ordinary movable cargo.
 * Numeric ice is kept only on opening-visible board pieces.
 */
export const applyGeneratorFrozenCargoRepair = (source: LevelSpec): LevelSpec => {
  const repaired = source.id === 156 ? repairLevel156(source) : source;
  return assertGeneratorFrozenCargoContract(repaired);
};
