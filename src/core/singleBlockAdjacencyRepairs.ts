import type { BlockColor, GateSpec, LevelSpec, Point, Side } from "./types";

/**
 * Opening-preserving repairs for the small remainder that cannot be certified
 * by the singleton colour recolour alone.  These are deliberately separate
 * from the broad historical solvability fallback: the source board, piece
 * count, shapes and authored mechanics stay in place wherever possible.
 */
export const SINGLE_BLOCK_OPENING_REPAIR_POLICY_VERSION = "opening-preserving-v2" as const;

export const SINGLE_BLOCK_OPENING_REPAIR_LEVEL_IDS = [
  8, 10, 11, 16, 17, 19, 22, 27, 29, 33, 42, 48, 49, 58, 60, 69, 71, 74,
  76, 79, 88, 93, 94, 96, 106, 117, 124, 193,
] as const;

/** Only gate countdowns are removed for these source layouts. */
const UNLOCK_GATES = new Set([8, 10, 16, 22, 27, 33, 48, 49, 69, 71, 74, 79, 88, 93, 94, 96, 106, 124, 193]);
/** The source block countdown is the only blocker for these five levels. */
const UNLOCK_BLOCKS = new Set([11, 58, 76]);
/** Both countdown families are needed for the compact source route. */
const UNLOCK_GATES_AND_BLOCKS = new Set([17, 19]);

const REPAIR_LEVEL_SET = new Set<number>(SINGLE_BLOCK_OPENING_REPAIR_LEVEL_IDS);

const layerColors = (block: LevelSpec["blocks"][number]): BlockColor[] => (
  block.layers?.length ? [...block.layers] : [block.color]
);

const boundsFor = (shape: readonly Point[]): { width: number; height: number } => {
  const xs = shape.map(([x]) => x);
  const ys = shape.map(([, y]) => y);
  return {
    width: Math.max(...xs) - Math.min(...xs) + 1,
    height: Math.max(...ys) - Math.min(...ys) + 1,
  };
};

const normalizeShape = (shape: readonly Point[]): Point[] => {
  const xs = shape.map(([x]) => x);
  const ys = shape.map(([, y]) => y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return shape.map(([x, y]) => [x - minX, y - minY] as const);
};

const unlockGates = (level: LevelSpec): LevelSpec => ({
  ...level,
  gates: level.gates.map(({ frozen: _frozen, ...gate }) => gate),
  flipDoors: level.flipDoors?.map(({ frozen: _frozen, ...door }) => door),
});

const unlockBlocks = (level: LevelSpec): LevelSpec => ({
  ...level,
  blocks: level.blocks.map(({ frozen: _frozen, ...block }) => block),
});

const removeAxes = (level: LevelSpec): LevelSpec => ({
  ...level,
  blocks: level.blocks.map(({ movementAxis: _movementAxis, ...block }) => block),
});

const retainSingleShutterWithLowerCount = (level: LevelSpec, count: number): LevelSpec => ({
  ...level,
  shutters: level.shutters?.map((shutter) => ({ ...shutter, count })),
});

type GatePlan = {
  color: BlockColor;
  side: Side;
  offset: number;
  size: number;
};

/** Pack one compatible exit for each outer colour without changing board size. */
const planGates = (level: LevelSpec): Map<BlockColor, GatePlan> => {
  const colors = [...new Set(level.blocks.flatMap(layerColors))];
  const spans = colors.map((color) => ({
    color,
    span: Math.max(...level.blocks
      .filter((block) => layerColors(block).includes(color))
      .map((block) => {
        const bounds = boundsFor(block.shape);
        return Math.max(bounds.width, bounds.height);
      })),
  })).sort((a, b) => b.span - a.span || a.color.localeCompare(b.color));
  const bins: Array<{ side: Side; capacity: number; used: number }> = [
    { side: "top", capacity: level.width, used: 0 },
    { side: "bottom", capacity: level.width, used: 0 },
    { side: "left", capacity: level.height, used: 0 },
    { side: "right", capacity: level.height, used: 0 },
  ];
  const plans = new Map<BlockColor, GatePlan>();
  for (const entry of spans) {
    const bin = bins
      .filter((candidate) => candidate.used + entry.span <= candidate.capacity)
      .sort((a, b) => (b.capacity - b.used) - (a.capacity - a.used))[0];
    if (!bin) throw new Error(`Lv${level.id}: cannot pack opening repair exit for ${entry.color}`);
    plans.set(entry.color, { color: entry.color, side: bin.side, offset: bin.used, size: entry.span });
    bin.used += entry.span;
  }
  return plans;
};

const gateSpec = (id: string, plan: GatePlan): GateSpec => ({
  id,
  side: plan.side,
  offset: plan.offset,
  size: plan.size,
  color: plan.color,
});

const placeAtPlan = (
  level: LevelSpec,
  block: LevelSpec["blocks"][number],
  plan: GatePlan,
): LevelSpec["blocks"][number] => {
  const shape = normalizeShape(block.shape);
  const bounds = boundsFor(shape);
  const x = plan.side === "left" ? 0 : plan.side === "right" ? level.width - bounds.width : plan.offset;
  const y = plan.side === "top" ? 0 : plan.side === "bottom" ? level.height - bounds.height : plan.offset;
  return { ...block, x, y, shape, frozen: undefined };
};

/**
 * Lv42 is a dense singleton chain.  Its four authored exits are retained as
 * four exits, but moved to deterministic one-cell rim anchors so every source
 * colour has a reachable channel and no extra exit is introduced.
 */
const repairLv42 = (level: LevelSpec): LevelSpec => {
  const colors = [...new Set(level.blocks.flatMap(layerColors))];
  const sides: Side[] = ["top", "right", "bottom", "left"];
  const gates = level.gates.map((gate, index) => ({
    id: gate.id,
    side: sides[index % sides.length]!,
    offset: 0,
    size: 1,
    color: colors[index % colors.length]!,
  }));
  return { ...level, gates, flipDoors: undefined };
};

/**
 * Lv60's source is an intentional 5×7 vertical-axis grid.  The source gates
 * already cover every colour, but two interior columns have no matching
 * vertical channel.  Relaxing the presentation arrow metadata (not geometry,
 * colours, counts or exits) is the smallest playable correction.
 */
const repairLv60 = (level: LevelSpec): LevelSpec => removeAxes(level);

/**
 * Lv29 has two large authored shutter covers whose hidden pieces overlap when
 * they are released in bulk.  Keep the same piece inventory and colour/layer
 * data, expose a three-piece opening, and release the remaining pieces through
 * the existing non-spatial staging lifecycle in source order.  This keeps the
 * competitor silhouette recognizable while avoiding the old one-visible-piece
 * corridor fallback.
 */
const repairLv29 = (level: LevelSpec): LevelSpec => {
  const plans = planGates(level);
  const orderedPlans = [...plans.values()];
  const placed = level.blocks.map((block) => {
    const plan = plans.get(layerColors(block)[0]!);
    if (!plan) throw new Error(`Lv29: missing plan for ${block.id}`);
    return placeAtPlan(level, block, plan);
  });
  const openingCount = 3;
  const staged = placed.slice(openingCount).map((block, index) => ({
    ...block,
    shutterId: `opening-repair-stage-29-${index}`,
  }));
  const shutters = staged.map((block, index) => ({
    id: block.shutterId!,
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    count: index + 1,
    skin: "staging" as const,
  }));
  const gates = level.gates.map((gate, index) => gateSpec(gate.id, orderedPlans[index % orderedPlans.length]!));
  return {
    ...level,
    gates,
    flipDoors: undefined,
    blocks: [...placed.slice(0, openingCount), ...staged],
    shutters,
  };
};

/** Apply the narrow opening-preserving repair used after singleton recolour. */
export const applyOpeningPreservingRepair = (level: LevelSpec): LevelSpec => {
  if (!REPAIR_LEVEL_SET.has(level.id)) return level;
  if (level.id === 29) return repairLv29(level);
  if (level.id === 42) return repairLv42(level);
  if (level.id === 60) return repairLv60(level);
  if (level.id === 117) return retainSingleShutterWithLowerCount(level, 5);
  let repaired = level;
  if (UNLOCK_GATES.has(level.id) || UNLOCK_GATES_AND_BLOCKS.has(level.id)) repaired = unlockGates(repaired);
  if (UNLOCK_BLOCKS.has(level.id) || UNLOCK_GATES_AND_BLOCKS.has(level.id)) repaired = unlockBlocks(repaired);
  return repaired;
};

export const isOpeningPreservingRepairLevel = (levelOrId: Pick<LevelSpec, "id"> | number): boolean => (
  REPAIR_LEVEL_SET.has(typeof levelOrId === "number" ? levelOrId : levelOrId.id)
);
