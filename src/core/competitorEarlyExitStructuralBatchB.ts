import type { BlockColor, GateSpec, LevelSpec, Point, Side } from "./types";

export const COMPETITOR_EARLY_EXIT_STRUCTURAL_BATCH_B_VERSION = "competitor-early-exit-structural-batch-b-r1" as const;
export const COMPETITOR_EARLY_EXIT_STRUCTURAL_BATCH_B_LEVEL_IDS = [27] as const;

export type CompetitorEarlyExitStructuralBatchBBlockerKind =
  | "runtime-counter-semantics-conflict"
  | "bounded-search-not-certified";

export interface CompetitorEarlyExitStructuralBatchBBlocker {
  levelId: number;
  kind: CompetitorEarlyExitStructuralBatchBBlockerKind;
  detail: string;
}

/**
 * These levels keep their current certified exits until an exact source-layout
 * candidate also has a bounded fresh solve and PuzzleModel replay.
 */
export const COMPETITOR_EARLY_EXIT_STRUCTURAL_BATCH_B_BLOCKERS: readonly CompetitorEarlyExitStructuralBatchBBlocker[] = [
  {
    levelId: 14,
    kind: "runtime-counter-semantics-conflict",
    detail: "the exact frozen-17 green exit is statically deadlocked: the final 17-layer source inventory supplies only 13 non-green clears before a green exit is required",
  },
  {
    levelId: 16,
    kind: "bounded-search-not-certified",
    detail: "the source [3,8,12,15] counters on the current legal staircase mouths pass validation and adjacency, but fresh search reaches 30,000 states without a replayable completion",
  },
  {
    levelId: 25,
    kind: "bounded-search-not-certified",
    detail: "the frame-backed H-board eight-mouth layout with exact [4,8,13,14,16,17,21] counters passes validation and adjacency, but fresh search reaches 30,000 states without a replayable completion",
  },
];

const portalGate = (
  id: string,
  color: BlockColor,
  side: Side,
  origin: Point,
  size: number,
  frozen?: number,
): GateSpec => ({
  id,
  color,
  side,
  offset: side === "top" || side === "bottom" ? origin[0] : origin[1],
  size,
  ...(frozen === undefined ? {} : { frozen }),
  portals: [{ side, origin, size }],
});

/**
 * 21-30.mp4 06:19 opening and 384.3-405.0s reveal/clear sequence:
 * - white SINGLE exits through the local top mouth and black SINGLE/H3 through
 *   the local right mouth;
 * - the exposed H3 stack is green, red, green, yellow, red, black, red,
 *   green, yellow from top to bottom;
 * - the three left counters are green-13, yellow-13 and red-10.
 *
 * Project palette mapping: white=blue, black=cyan, green=pink, red=green,
 * yellow=purple.
 */
const LV27_GATES: readonly GateSpec[] = [
  portalGate("source-lv027-opening-top", "blue", "top", [3, 3], 1),
  portalGate("source-lv027-opening-right", "cyan", "right", [5, 4], 1),
  portalGate("source-lv027-left-upper-13", "pink", "left", [0, 3], 1, 13),
  portalGate("source-lv027-left-middle-13", "purple", "left", [0, 5], 1, 13),
  portalGate("source-lv027-left-lower-10", "green", "left", [0, 8], 1, 10),
];

const LV27_COLORS: Readonly<Record<string, BlockColor>> = {
  // Opening 3x3 black/white checkerboard in the right-hand bay.
  "cc-027-b1-01": "blue",
  "cc-027-b1-02": "cyan",
  "cc-027-b1-03": "blue",
  "cc-027-b1-04": "cyan",
  "cc-027-b1-05": "blue",
  "cc-027-b1-06": "cyan",
  "cc-027-b1-07": "blue",
  "cc-027-b1-08": "blue",
  "cc-027-b1-09": "cyan",
  // H3 stack revealed by the count-9 shutter, top to bottom.
  "cc-027-b2-01": "pink",
  "cc-027-b2-02": "green",
  "cc-027-b2-03": "pink",
  "cc-027-b2-04": "purple",
  "cc-027-b2-05": "green",
  "cc-027-b2-06": "cyan",
  "cc-027-b2-07": "green",
  "cc-027-b2-08": "pink",
  "cc-027-b2-09": "purple",
};

const alreadyApplied = (source: LevelSpec): boolean => (
  source.gates.length === LV27_GATES.length
  && (source.flipDoors?.length ?? 0) === 0
  && LV27_GATES.every((gate, index) => JSON.stringify(source.gates[index]) === JSON.stringify(gate))
  && Object.entries(LV27_COLORS).every(([id, color]) => source.blocks.find((block) => block.id === id)?.color === color)
);

/** Restores the video-backed Lv27 exits and colour sequence without changing geometry or staging. */
export const applyCompetitorEarlyExitStructuralBatchB = (source: LevelSpec): LevelSpec => {
  if (source.id !== 27 || alreadyApplied(source)) return source;
  return {
    ...source,
    gates: LV27_GATES.map((gate) => ({
      ...gate,
      portals: gate.portals?.map((portal) => ({ ...portal, origin: [...portal.origin] as Point })),
    })),
    flipDoors: undefined,
    blocks: source.blocks.map((block) => {
      const color = LV27_COLORS[block.id];
      if (color === undefined || (block.color === color && (!block.layers?.length || block.layers[0] === color))) return block;
      return {
        ...block,
        color,
        ...(block.layers?.length ? { layers: [color, ...block.layers.slice(1)] } : {}),
      };
    }),
  };
};
