import type { GateSpec, GeneratorSpec, LevelSpec, Point, ShutterSpec } from "./types";

export const COMPETITOR_HARD_BOARD_MASK_REPAIR_VERSION = "competitor-hard-board-mask-r1" as const;
export const COMPETITOR_HARD_BOARD_MASK_REPAIR_LEVEL_IDS = [68, 87] as const;

const MASKS: Readonly<Record<number, readonly string[]>> = {
  68: [
    "#######", "#######", "#######", "#######", ".......",
    ".......", "#######", "#######", "#######", "#######",
  ],
  87: [
    "#######", "#######", ".#####.", ".#####.", ".#####.",
    ".#####.", ".#####.", "#######", "#######",
  ],
};

// One x/y digit per coordinate, in the stable generated block order.
const PACKED_POSITIONS: Readonly<Record<number, string>> = {
  68: "50105230023133001211071868383656461658",
  87: "074443244842001830516735125527156822342314163515",
};

const LV68_GATES: readonly GateSpec[] = [
  { id: "exact-lv068-upper-blue", color: "blue", side: "right", offset: 2, size: 2, frozen: 1 },
  { id: "exact-lv068-lower-blue", color: "blue", side: "bottom", offset: 4, size: 2 },
  { id: "exact-lv068-upper-orange", color: "orange", side: "top", offset: 0, size: 2 },
  { id: "exact-lv068-lower-orange", color: "orange", side: "left", offset: 7, size: 2 },
  { id: "exact-lv068-upper-pink", color: "pink", side: "left", offset: 1, size: 1 },
  { id: "exact-lv068-lower-pink", color: "pink", side: "bottom", offset: 0, size: 1 },
  { id: "exact-lv068-upper-red", color: "red", side: "left", offset: 2, size: 2 },
  { id: "exact-lv068-lower-red", color: "red", side: "bottom", offset: 2, size: 2 },
  { id: "exact-lv068-upper-yellow", color: "yellow", side: "right", offset: 0, size: 2 },
  { id: "exact-lv068-lower-yellow", color: "yellow", side: "right", offset: 6, size: 2 },
];

const LV87_GATES: readonly GateSpec[] = [
  { id: "palette-exit-lv087-g-01", side: "top", offset: 0, size: 3, color: "yellow" },
  { id: "palette-exit-lv087-g-02", side: "top", offset: 3, size: 3, color: "pink", frozen: 5 },
  { id: "palette-exit-lv087-g-03", side: "bottom", offset: 0, size: 2, color: "green", frozen: 17 },
  { id: "palette-exit-lv087-g-04", side: "bottom", offset: 4, size: 3, color: "orange" },
  { id: "palette-exit-lv087-g-05", side: "bottom", offset: 2, size: 2, color: "red" },
];

const LV68_SHUTTERS: readonly ShutterSpec[] = [
  { id: "vp-068-cover-1", x: 0, y: 6, width: 7, height: 4, count: 10, skin: "shutter" },
];

const LV87_GENERATORS: readonly GeneratorSpec[] = [
  {
    id: "vp-087-generator-1",
    side: "left",
    offset: 5,
    spawn: [1, 4],
    queueBlockIds: ["cc-087-b2-01", "cc-087-b2-02", "cc-087-b2-03"],
    trigger: "move",
    rimAnchor: { x: 1, y: 5.5, quarterTurns: 3 },
    rimSpan: 3,
    rimMount: "rim",
  },
  {
    id: "vp-087-generator-2",
    side: "right",
    offset: 4,
    spawn: [3, 3],
    queueBlockIds: ["cc-087-b3-01", "cc-087-b3-02", "cc-087-b3-03"],
    trigger: "move",
    rimAnchor: { x: 6, y: 4.5, quarterTurns: 1 },
    rimSpan: 3,
    rimMount: "rim",
  },
];

const pointsFromMask = (rows: readonly string[]): Point[] => rows.flatMap((row, y) => (
  [...row].flatMap((cell, x) => cell === "#" ? [[x, y] as Point] : [])
));

const expectedBlockId = (levelId: 68 | 87, index: number): string => {
  const cohorts = levelId === 68 ? [10, 9] : [18, 3, 3];
  let relative = index;
  let cohort = 0;
  while (relative >= cohorts[cohort]!) relative -= cohorts[cohort++]!;
  return `cc-${String(levelId).padStart(3, "0")}-b${cohort + 1}-${String(relative + 1).padStart(2, "0")}`;
};

const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);

const cloneGates = (gates: readonly GateSpec[]): GateSpec[] => gates.map((gate) => ({ ...gate }));
const cloneShutters = (shutters: readonly ShutterSpec[]): ShutterSpec[] => (
  shutters.map((shutter) => ({ ...shutter }))
);
const cloneGenerators = (generators: readonly GeneratorSpec[]): GeneratorSpec[] => generators.map((generator) => ({
  ...generator,
  spawn: [...generator.spawn] as Point,
  queueBlockIds: [...generator.queueBlockIds],
  rimAnchor: generator.rimAnchor ? { ...generator.rimAnchor } : undefined,
}));

const patchLevel = (source: LevelSpec, levelId: 68 | 87): LevelSpec => {
  const rows = MASKS[levelId]!;
  const packed = PACKED_POSITIONS[levelId]!;
  const expectedCount = packed.length / 2;
  if (source.width !== rows[0]!.length || source.height !== rows.length || source.blocks.length !== expectedCount) {
    throw new Error(`Lv${levelId} hard-mask repair source dimensions/count drift`);
  }
  source.blocks.forEach((block, index) => {
    if (block.id !== expectedBlockId(levelId, index)) {
      throw new Error(`Lv${levelId} hard-mask repair block-order drift at ${block.id}`);
    }
  });
  if (levelId === 68 && source.gates.length !== 5 && source.gates.length !== LV68_GATES.length) {
    throw new Error("Lv68 hard-mask repair gate-count drift");
  }
  if (levelId === 87 && (source.gates.length !== LV87_GATES.length || (source.generators ?? []).length !== 2)) {
    throw new Error("Lv87 hard-mask repair mechanism-count drift");
  }

  const blocks = source.blocks.map((block, index) => {
    const x = Number(packed[index * 2]);
    const y = Number(packed[index * 2 + 1]);
    const shutterId = levelId === 68 && index >= 10 ? "vp-068-cover-1" : undefined;
    if (block.x === x && block.y === y && block.shutterId === shutterId) return block;
    if (shutterId) return { ...block, x, y, shutterId };
    const { shutterId: _shutterId, ...rest } = block;
    return { ...rest, x, y };
  });
  const playable = pointsFromMask(rows);
  const gateTarget = levelId === 68 ? LV68_GATES : LV87_GATES;
  const shutterTarget = levelId === 68 ? LV68_SHUTTERS : [];
  const generatorTarget = levelId === 87 ? LV87_GENERATORS : [];
  const gates = same(source.gates, gateTarget) ? source.gates : cloneGates(gateTarget);
  const shutters = same(source.shutters ?? [], shutterTarget) ? source.shutters : cloneShutters(shutterTarget);
  const generators = same(source.generators ?? [], generatorTarget)
    ? source.generators
    : cloneGenerators(generatorTarget);
  const unchanged = source.blocked === undefined
    && same(source.playable, playable)
    && blocks.every((block, index) => block === source.blocks[index])
    && gates === source.gates
    && shutters === source.shutters
    && generators === source.generators;
  return unchanged ? source : {
    ...source,
    playable,
    blocked: undefined,
    blocks,
    gates,
    shutters,
    generators,
  };
};

/** Restores the solver-certified exact competitor masks for the two hard rooms. */
export const applyCompetitorHardBoardMaskRepair = (source: LevelSpec): LevelSpec => (
  source.id === 68 ? patchLevel(source, 68) : source.id === 87 ? patchLevel(source, 87) : source
);
