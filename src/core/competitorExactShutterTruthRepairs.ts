import { COLORS, type BlockColor, type BlockSpec, type GateSpec, type GeneratorSpec, type LevelSpec, type Point, type ShutterSpec, type Side } from "./types";

export const COMPETITOR_EXACT_SHUTTER_TRUTH_REPAIR_VERSION = "competitor-exact-shutter-truth-r1" as const;
export const COMPETITOR_EXACT_SHUTTER_TRUTH_REPAIR_LEVEL_IDS = [46, 54, 57] as const;

type BlockRow = readonly [suffix: string, x: number, y: number, shape: number, color: number, cover: number, frozen: number];
type GateRow = readonly [id: string, side: number, offset: number, size: number, color: number, frozen: number];
type PanelRow = readonly [x: number, y: number, width: number, height: number, count: number];

const SHAPES: readonly (readonly Point[])[] = [
  [[0, 0], [1, 0], [0, 1], [1, 1]], [[0, 0], [1, 0]], [[0, 0]],
  [[1, 0], [2, 0], [1, 1], [2, 1]], [[2, 0], [1, 1], [2, 1]], [[1, 0], [2, 0], [2, 1]],
  [[0, 0], [0, 1]], [[0, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [2, 0]],
  [[1, 0], [0, 1], [1, 1], [2, 1]], [[0, 0], [1, 0], [0, 1]], [[0, 0], [1, 0], [1, 1]],
  [[1, 0], [0, 1], [1, 1]], [[0, 0], [0, 1], [0, 2]], [[0, 0], [1, 0], [1, 1], [1, 2]],
  [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]], [[1, 0], [1, 1], [1, 2]],
  [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]],
];

const BLOCK_ROWS: Readonly<Record<number, readonly BlockRow[]>> = {
  46: [
    ["b1-01", 0, 5, 0, 1, 0, 0], ["b1-02", 2, 5, 1, 0, 0, 0], ["b1-03", 4, 5, 2, 4, 0, 0],
    ["b1-04", 5, 5, 0, 2, 0, 0], ["b1-05", 2, 6, 1, 2, 0, 0], ["b1-06", 4, 6, 2, 1, 0, 0],
    ["b2-01", 5, 0, 3, 3, 0, 0], ["b2-02", 2, 0, 4, 4, 0, 0], ["b2-03", 0, 0, 5, 0, 0, 0],
    ["b3-01", 0, 8, 0, 1, 0, 0], ["b3-02", 5, 8, 6, 6, 0, 0], ["b3-03", 0, 0, 7, 7, 0, 0],
    ["b4-01", 0, 7, 8, 2, 1, 0], ["b4-02", 4, 7, 8, 0, 1, 0], ["b4-03", 0, 8, 0, 0, 1, 0],
    ["b4-04", 2, 8, 6, 1, 1, 0], ["b4-05", 6, 8, 2, 6, 1, 0], ["b4-06", 4, 8, 9, 1, 1, 0],
    ["b4-07", 3, 8, 10, 7, 1, 0], ["b5-01", 0, 0, 1, 2, 2, 0], ["b5-02", 0, 4, 1, 3, 2, 0],
    ["b5-03", 0, 2, 7, 2, 2, 0], ["b5-04", 0, 1, 11, 0, 2, 0], ["b6-01", 5, 0, 1, 7, 3, 0],
    ["b6-02", 5, 4, 1, 7, 3, 0], ["b6-03", 5, 1, 10, 1, 3, 0], ["b6-04", 5, 2, 12, 6, 3, 0],
  ],
  54: [
    ["b1-01", 2, 3, 1, 2, 0, 0], ["b1-02", 0, 5, 6, 0, 0, 3], ["b1-03", 3, 4, 2, 3, 0, 0],
    ["b1-04", 2, 5, 1, 4, 0, 0], ["b1-06", 2, 6, 2, 3, 0, 0], ["b1-07", 1, 4, 1, 0, 0, 0],
    ["b1-08", 1, 5, 6, 2, 0, 2], ["b1-09", 3, 6, 2, 1, 0, 0], ["b1-10", 0, 3, 10, 3, 0, 0],
    ["b2-01", 3, 0, 13, 6, 1, 0], ["b2-02", 0, 0, 0, 2, 1, 0], ["b2-03", 2, 0, 13, 2, 1, 0],
    ["b2-04", 0, 2, 1, 0, 1, 0], ["b3-01", 1, 7, 0, 3, 2, 0], ["b3-02", 3, 7, 13, 2, 2, 0],
    ["b3-03", 0, 9, 1, 0, 2, 0], ["b4-01", 4, 0, 8, 4, 3, 0], ["b4-02", 4, 2, 6, 0, 3, 2],
    ["b4-03", 4, 5, 8, 1, 3, 0], ["b4-04", 6, 1, 6, 1, 3, 0], ["b4-05", 4, 6, 2, 6, 3, 0],
    ["b4-06", 4, 1, 14, 2, 3, 0], ["b4-07", 5, 3, 12, 3, 3, 0], ["b5-01", 4, 7, 15, 4, 4, 0],
  ],
  57: [
    ["b1-01", 0, 3, 1, 1, 0, 0], ["b1-02", 0, 2, 1, 0, 0, 0], ["b1-03", 5, 3, 1, 3, 0, 0],
    ["b1-04", 0, 4, 1, 2, 0, 3], ["b1-05", 0, 0, 0, 2, 0, 0], ["b1-06", 2, 3, 1, 3, 0, 0],
    ["b1-07", 5, 4, 1, 1, 0, 0], ["b1-08", 4, 3, 2, 0, 0, 0], ["b2-01", 0, 0, 16, 3, 0, 0],
    ["b2-02", 2, 8, 1, 2, 0, 0], ["b2-03", 0, 7, 10, 1, 0, 0], ["b3-01", 2, 0, 6, 7, 1, 0],
    ["b3-02", 3, 1, 6, 4, 1, 0], ["b3-03", 4, 1, 0, 5, 1, 0], ["b3-04", 3, 0, 1, 3, 1, 0],
    ["b3-05", 6, 1, 6, 2, 1, 0], ["b3-06", 2, 2, 2, 0, 1, 0], ["b4-01", 2, 7, 0, 2, 2, 0],
    ["b4-02", 0, 5, 1, 6, 2, 0], ["b4-03", 2, 5, 0, 6, 2, 0], ["b4-04", 0, 6, 1, 3, 2, 0],
    ["b4-05", 4, 7, 0, 6, 2, 0], ["b4-06", 0, 8, 1, 2, 2, 0], ["b4-07", 4, 5, 17, 6, 2, 0],
  ],
};

const GATE_ROWS: Readonly<Record<number, readonly GateRow[]>> = {
  46: [
    ["sr-gate-46-purple", 1, 1, 3, 4, 0], ["sr-gate-46-yellow", 3, 7, 3, 3, 0],
    ["sr-gate-46-pink", 3, 1, 3, 6, 0], ["sr-gate-46-blue", 3, 5, 2, 1, 0],
    ["sr-gate-46-red", 1, 7, 3, 0, 5], ["sr-gate-46-cyan", 0, 0, 2, 7, 0],
    ["sr-gate-46-green", 1, 5, 2, 2, 2],
  ],
  54: [
    ["sr-gate-54-purple", 1, 0, 3, 4, 14], ["sr-gate-54-pink", 1, 7, 3, 6, 22],
    ["sr-gate-54-red", 3, 5, 2, 0, 3], ["sr-gate-54-green", 0, 0, 3, 2, 6],
    ["sr-gate-54-yellow", 3, 3, 2, 3, 0], ["sr-gate-54-blue", 2, 1, 3, 1, 10],
  ],
  57: [
    ["sr-gate-57-blue", 1, 3, 2, 1, 1], ["sr-gate-57-yellow", 1, 0, 3, 3, 5],
    ["sr-gate-57-green", 0, 0, 2, 2, 0], ["sr-gate-57-cyan", 3, 5, 4, 7, 11],
    ["sr-gate-57-red", 3, 1, 1, 0, 3], ["sr-gate-57-purple", 2, 0, 2, 4, 11],
    ["sr-gate-57-orange", 2, 5, 2, 5, 11], ["sr-gate-57-pink", 2, 2, 3, 6, 11],
  ],
};

const PANEL_ROWS: Readonly<Record<number, readonly PanelRow[]>> = {
  46: [[0, 7, 7, 3, 4], [0, 0, 2, 5, 9], [5, 0, 2, 5, 14]],
  54: [[0, 0, 4, 3, 5], [0, 7, 4, 3, 8], [4, 0, 3, 7, 13], [4, 7, 3, 3, 21]],
  57: [[2, 0, 5, 3, 6], [0, 5, 7, 4, 12]],
};

const GENERATORS: Readonly<Record<number, readonly GeneratorSpec[] | undefined>> = {
  46: [
    { id: "vp-046-generator-1", side: "right", offset: 2, spawn: [-1, 1], queueBlockIds: ["cc-046-b2-01", "cc-046-b2-02", "cc-046-b2-03"], trigger: "move", rimSpan: 3, rimMount: "rim", rimAnchor: { x: 2, y: 2.5, quarterTurns: 1 } },
    { id: "vp-046-generator-2", side: "left", offset: 2, spawn: [5, 1], queueBlockIds: ["cc-046-b3-02", "cc-046-b3-03", "cc-046-b3-01"], trigger: "move", rimSpan: 3, rimMount: "rim", rimAnchor: { x: 5, y: 2.5, quarterTurns: 3 } },
  ],
  54: undefined,
  57: [
    { id: "vp-057-generator-1", side: "top", offset: 3, spawn: [2, 0], queueBlockIds: ["cc-057-b2-03", "cc-057-b2-01", "cc-057-b2-02"], trigger: "move", rimSpan: 3, rimMount: "rim", rimAnchor: { x: 3.5, y: 0, quarterTurns: 0 } },
  ],
};

const SIDES: readonly Side[] = ["top", "right", "bottom", "left"];
const DIMENSIONS: Readonly<Record<number, readonly [number, number]>> = { 46: [7, 10], 54: [7, 10], 57: [7, 9] };
const ALLOWED_REMOVED_BLOCKS: Readonly<Record<number, readonly string[]>> = { 46: [], 54: ["cc-054-b1-05"], 57: [] };

const playableFor = (levelId: number, width: number, height: number): Point[] => {
  const cells: Point[] = [];
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    if (levelId !== 46 || y >= 5 || x <= 1 || x >= 5) cells.push([x, y]);
  }
  return cells;
};

const buildBlocks = (source: LevelSpec, rows: readonly BlockRow[]): BlockSpec[] => {
  const prefix = `cc-${String(source.id).padStart(3, "0")}-`;
  const byId = new Map(source.blocks.map((block) => [block.id, block]));
  const desiredIds = new Set(rows.map(([suffix]) => `${prefix}${suffix}`));
  const removed = source.blocks.map(({ id }) => id).filter((id) => !desiredIds.has(id)).sort();
  const allowedRemoved = ALLOWED_REMOVED_BLOCKS[source.id];
  if (removed.length !== 0 && JSON.stringify(removed) !== JSON.stringify(allowedRemoved)) {
    throw new Error(`Lv${source.id} exact shutter block source drift: ${removed.join(",")}`);
  }
  return rows.map(([suffix, x, y, shapeIndex, colorIndex, cover, frozen]): BlockSpec => {
    const id = `${prefix}${suffix}`;
    const block = byId.get(id);
    if (!block) throw new Error(`Lv${source.id} exact shutter source drift at ${id}`);
    const next: BlockSpec = {
      ...block,
      x,
      y,
      shape: SHAPES[shapeIndex]!.map(([dx, dy]) => [dx, dy]),
      color: COLORS[colorIndex] as BlockColor,
    };
    if (cover) next.shutterId = `vp-${String(source.id).padStart(3, "0")}-cover-${cover}`;
    else delete next.shutterId;
    if (frozen) next.frozen = frozen;
    else delete next.frozen;
    return next;
  });
};

const buildGates = (rows: readonly GateRow[]): GateSpec[] => rows.map(([id, side, offset, size, color, frozen]) => {
  const gate: GateSpec = { id, side: SIDES[side]!, offset, size, color: COLORS[color] as BlockColor };
  if (frozen) gate.frozen = frozen;
  return gate;
});

const buildPanels = (levelId: number, rows: readonly PanelRow[]): ShutterSpec[] => rows.map(
  ([x, y, width, height, count], index) => ({
    id: `vp-${String(levelId).padStart(3, "0")}-cover-${index + 1}`,
    x,
    y,
    width,
    height,
    count,
    skin: "shutter",
  }),
);

const cloneGenerators = (generators: readonly GeneratorSpec[] | undefined): GeneratorSpec[] | undefined => generators?.map(
  (generator) => ({
    ...generator,
    spawn: [...generator.spawn],
    queueBlockIds: [...generator.queueBlockIds],
    rimAnchor: generator.rimAnchor ? { ...generator.rimAnchor } : undefined,
  }),
);

/** Restores the three high-fps-video-certified shutter boards without touching unrelated mechanisms. */
export const applyCompetitorExactShutterTruthRepair = (source: LevelSpec): LevelSpec => {
  const rows = BLOCK_ROWS[source.id];
  if (!rows) return source;
  const [width, height] = DIMENSIONS[source.id]!;
  if (source.width !== width || source.height !== height) {
    throw new Error(`Lv${source.id} exact shutter board source drift`);
  }
  const blocks = buildBlocks(source, rows);
  const gates = buildGates(GATE_ROWS[source.id]!);
  const shutters = buildPanels(source.id, PANEL_ROWS[source.id]!);
  const generators = cloneGenerators(GENERATORS[source.id]);
  const playable = playableFor(source.id, width, height);
  const currentSignature = JSON.stringify([source.playable, source.blocked, source.blocks, source.gates, source.shutters, source.generators]);
  const nextSignature = JSON.stringify([playable, undefined, blocks, gates, shutters, generators]);
  if (currentSignature === nextSignature) return source;
  const { blocked: _blocked, ...rest } = source;
  const next: LevelSpec = { ...rest, playable, blocks, gates, shutters };
  if (generators) next.generators = generators;
  else delete next.generators;
  return next;
};
