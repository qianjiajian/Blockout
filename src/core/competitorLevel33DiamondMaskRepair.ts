import type { BlockColor, GateSpec, LevelSpec, Point } from "./types";

export const COMPETITOR_LEVEL_33_DIAMOND_MASK_REPAIR_VERSION = "competitor-lv33-diamond-mask-r1" as const;
export const COMPETITOR_LEVEL_33_DIAMOND_MASK_REPAIR_LEVEL_IDS = [33] as const;

const SOURCE_MASK = [
  "#######",
  ".######",
  "#######",
  "#######",
  "#####.#",
  "####...",
  "#####.#",
  "#.#.###",
  "....#.#",
] as const;

export const COMPETITOR_LEVEL_33_DIAMOND_MASK = [
  "...#...",
  "..###..",
  ".#####.",
  "#######",
  "#######",
  "#######",
  ".#####.",
  "..###..",
  "...#...",
] as const;

const TARGET_POSITIONS: Readonly<Record<string, readonly [number, number]>> = {
  "strategy-guard-01": [1, 3],
  "cc-piece-02": [0, 3],
  "strategy-guard-03": [2, 3],
  "cc-piece-04": [4, 4],
  "cc-piece-05": [4, 3],
  "strategy-guard-06": [6, 3],
  "strategy-guard-07": [6, 4],
  "cc-piece-08": [1, 4],
  "cc-piece-09": [3, 4],
  "cc-piece-10": [5, 4],
  "cc-piece-11": [3, 3],
  "strategy-guard-12": [4, 5],
  "cc-piece-13": [6, 5],
  "cc-piece-14": [5, 3],
  "strategy-guard-15": [1, 5],
  "strategy-guard-16": [5, 5],
  "cc-piece-17": [0, 4],
  "cc-piece-18": [2, 4],
  "cc-piece-19": [0, 5],
  "strategy-guard-20": [2, 5],
  "cc-piece-21": [2, 7],
  "strategy-guard-22": [2, 0],
  "strategy-guard-23": [3, 5],
};

const ORIGINAL_BLOCK_COLORS: Readonly<Record<string, BlockColor>> = {
  "strategy-guard-01": "blue",
  "cc-piece-02": "yellow",
  "strategy-guard-03": "yellow",
  "cc-piece-04": "red",
  "cc-piece-05": "yellow",
  "strategy-guard-06": "yellow",
  "strategy-guard-07": "red",
  "cc-piece-08": "yellow",
  "cc-piece-09": "yellow",
  "cc-piece-10": "yellow",
  "cc-piece-11": "blue",
  "strategy-guard-12": "purple",
  "cc-piece-13": "orange",
  "cc-piece-14": "blue",
  "strategy-guard-15": "red",
  "strategy-guard-16": "pink",
  "cc-piece-17": "blue",
  "cc-piece-18": "blue",
  "cc-piece-19": "yellow",
  "strategy-guard-20": "yellow",
  "cc-piece-21": "red",
  "strategy-guard-22": "yellow",
  "strategy-guard-23": "red",
};

const TARGET_GATE_IDS = [
  "vp-033-gate-02",
  "vp-033-gate-01",
  "vp-033-gate-06",
  "vp-033-gate-04",
  "vp-033-gate-05",
  "vp-033-gate-07",
] as const;

const TARGET_GATE_GEOMETRY: Readonly<Record<(typeof TARGET_GATE_IDS)[number], Readonly<
Pick<GateSpec, "side" | "offset" | "size" | "color"> & { frozen?: number }
>>> = {
  "vp-033-gate-02": { side: "top", offset: 3, size: 1, color: "yellow" },
  "vp-033-gate-01": { side: "bottom", offset: 3, size: 1, color: "red", frozen: 5 },
  "vp-033-gate-06": { side: "left", offset: 3, size: 1, color: "orange", frozen: 10 },
  "vp-033-gate-04": { side: "left", offset: 5, size: 1, color: "purple", frozen: 18 },
  "vp-033-gate-05": { side: "right", offset: 3, size: 1, color: "pink", frozen: 16 },
  "vp-033-gate-07": { side: "right", offset: 5, size: 1, color: "blue", frozen: 10 },
};

const pointsFromMask = (rows: readonly string[]): Point[] => rows.flatMap((row, y) => (
  [...row].flatMap((cell, x) => cell === "#" ? [[x, y] as Point] : [])
));

const maskRows = (level: Pick<LevelSpec, "width" | "height" | "playable">): string[] => {
  const cells = new Set((level.playable ?? []).map(([x, y]) => `${x},${y}`));
  return Array.from({ length: level.height }, (_, y) => (
    Array.from({ length: level.width }, (__, x) => cells.has(`${x},${y}`) ? "#" : ".").join("")
  ));
};

const sameRows = (left: readonly string[], right: readonly string[]): boolean => (
  left.length === right.length && left.every((row, index) => row === right[index])
);

const assertSourceOrTarget = (source: LevelSpec): void => {
  if (source.width !== 7 || source.height !== 9 || source.blocks.length !== 23) {
    throw new Error("Lv33 diamond-mask repair source dimensions/count drift");
  }
  const rows = maskRows(source);
  if (!sameRows(rows, SOURCE_MASK) && !sameRows(rows, COMPETITOR_LEVEL_33_DIAMOND_MASK)) {
    throw new Error("Lv33 diamond-mask repair source playable drift");
  }
  if (source.gates.length !== 7 && source.gates.length !== 6) {
    throw new Error("Lv33 diamond-mask repair source gate-count drift");
  }
  const expectedIds = new Set(Object.keys(TARGET_POSITIONS));
  if (source.blocks.some(({ id }) => !expectedIds.delete(id)) || expectedIds.size) {
    throw new Error("Lv33 diamond-mask repair source block-id drift");
  }
  for (const block of source.blocks) {
    const target = TARGET_POSITIONS[block.id];
    const color = ORIGINAL_BLOCK_COLORS[block.id];
    if (!target || !color) throw new Error(`Lv33 diamond-mask repair missing block contract ${block.id}`);
  }
  for (const id of TARGET_GATE_IDS) {
    if (!source.gates.some((gate) => gate.id === id)) {
      throw new Error(`Lv33 diamond-mask repair missing retained gate ${id}`);
    }
  }
};

/**
 * Restores the video-authoritative six-colour Lv33 contract. The two T pieces
 * occupy the diamond tips and the 21 single cells form the central 3x7 field.
 */
export const applyCompetitorLevel33DiamondMaskRepair = (source: LevelSpec): LevelSpec => {
  if (source.id !== 33) return source;
  assertSourceOrTarget(source);
  const blocks = source.blocks.map((block) => {
    const [x, y] = TARGET_POSITIONS[block.id]!;
    const color = ORIGINAL_BLOCK_COLORS[block.id]!;
    const layers = block.layers?.map(() => color);
    return block.x === x && block.y === y && block.color === color
      && (block.layers === undefined || block.layers.every((layer) => layer === color))
      ? block
      : { ...block, x, y, color, ...(layers ? { layers } : {}) };
  });
  const gates = TARGET_GATE_IDS.map((id): GateSpec => {
    const sourceGate = source.gates.find((gate) => gate.id === id)!;
    const target = TARGET_GATE_GEOMETRY[id];
    const { frozen: _sourceFrozen, ...rest } = sourceGate;
    return { ...rest, ...target };
  });
  const playable = pointsFromMask(COMPETITOR_LEVEL_33_DIAMOND_MASK);
  const unchanged = source.blocked === undefined
    && sameRows(maskRows(source), COMPETITOR_LEVEL_33_DIAMOND_MASK)
    && blocks.every((block, index) => block === source.blocks[index])
    && JSON.stringify(gates) === JSON.stringify(source.gates);
  return unchanged ? source : { ...source, playable, blocked: undefined, blocks, gates };
};
