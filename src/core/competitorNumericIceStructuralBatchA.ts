import type { BlockColor, GateSpec, LevelSpec } from "./types";

export const COMPETITOR_NUMERIC_ICE_STRUCTURAL_BATCH_A_VERSION = "competitor-numeric-ice-structural-batch-a-r1" as const;

/** Only candidates with frame-backed carriers and fresh solver/replay certificates. */
export const COMPETITOR_NUMERIC_ICE_STRUCTURAL_BATCH_A_LEVEL_IDS = [11, 54] as const;

export type CompetitorNumericIceStructuralBatchABlockerKind =
  | "video-layout-conflicts-with-adjacency-contract"
  | "source-exit-span-conflicts-with-adjacency-contract";

export interface CompetitorNumericIceStructuralBatchABlocker {
  levelId: number;
  kind: CompetitorNumericIceStructuralBatchABlockerKind;
  detail: string;
}

export const COMPETITOR_NUMERIC_ICE_STRUCTURAL_BATCH_A_BLOCKERS: readonly CompetitorNumericIceStructuralBatchABlocker[] = [
  {
    levelId: 17,
    kind: "video-layout-conflicts-with-adjacency-contract",
    detail: "11-20.mp4 shows six adjacent blue 1x1 blocks after the first six clears; the exact 26-piece video layout and [6,6,6,18,18,19,19] ice carriers solve/replay, but every tested zero-adjacency recolour of the source cohorts either exhausted 30,000 states or lost the recorded colour progression",
  },
  {
    levelId: 19,
    kind: "source-exit-span-conflicts-with-adjacency-contract",
    detail: "the exact 27-piece source composition solves/replays and has an exact optimal reposition overhead of 13, but its six edge-adjacent SQ2 numeric-ice carriers all depend on the sole size-2 purple exit; making their base colours adjacency-clean requires unsupported exit-span changes not present in the video",
  },
];

/** Known composition debt deliberately not hidden by this numeric-ice-only batch. */
export const COMPETITOR_NUMERIC_ICE_STRUCTURAL_BATCH_A_COMPOSITION_LIMITATIONS = {
  54: "truth records opening/full 10/25; the certified current structural source is 9/24, so this batch restores the exact three V2 ice counters without inventing an unverified twenty-fifth block",
} as const;

interface Lv11Placement {
  x: number;
  y: number;
  color: BlockColor;
  frozen?: number;
}

const LV11_GATES: readonly GateSpec[] = [
  { id: "competitor-numeric-011-top-open", side: "top", offset: 3, size: 3, color: "green" },
  { id: "competitor-numeric-011-left-13", side: "left", offset: 1, size: 1, color: "red", frozen: 13 },
  { id: "competitor-numeric-011-left-6", side: "left", offset: 2, size: 1, color: "pink", frozen: 6 },
  { id: "competitor-numeric-011-left-7", side: "left", offset: 3, size: 1, color: "purple", frozen: 7 },
  { id: "competitor-numeric-011-left-open", side: "left", offset: 5, size: 1, color: "cyan" },
];

/**
 * 11-20.mp4 opening: three normal H3 pieces on the left, seven numbered H3
 * pieces on the right, and the 3x4 black/white checker represented by the
 * project's purple/cyan palette pair.
 */
const LV11_PLACEMENTS: Readonly<Record<string, Lv11Placement>> = {
  "piece-04": { x: 0, y: 0, color: "pink" },
  "strategy-guard-09": { x: 0, y: 1, color: "green" },
  "strategy-guard-11": { x: 0, y: 2, color: "purple" },
  "piece-12": { x: 1, y: 2, color: "cyan" },
  "strategy-guard-13": { x: 2, y: 2, color: "purple" },
  "piece-14": { x: 0, y: 3, color: "cyan" },
  "piece-15": { x: 1, y: 3, color: "purple" },
  "piece-16": { x: 2, y: 3, color: "cyan" },
  "strategy-guard-17": { x: 0, y: 4, color: "purple" },
  "piece-18": { x: 1, y: 4, color: "cyan" },
  "piece-19": { x: 2, y: 4, color: "purple" },
  "piece-20": { x: 0, y: 5, color: "cyan" },
  "piece-21": { x: 1, y: 5, color: "purple" },
  "piece-22": { x: 2, y: 5, color: "cyan" },
  "piece-10": { x: 0, y: 6, color: "green" },
  "strategy-guard-01": { x: 3, y: 0, color: "cyan", frozen: 17 },
  "piece-02": { x: 3, y: 1, color: "purple", frozen: 17 },
  "piece-03": { x: 3, y: 2, color: "green", frozen: 17 },
  "piece-05": { x: 3, y: 3, color: "purple", frozen: 16 },
  "strategy-guard-06": { x: 3, y: 4, color: "red", frozen: 15 },
  "piece-07": { x: 3, y: 5, color: "pink", frozen: 14 },
  "piece-08": { x: 3, y: 6, color: "purple", frozen: 13 },
};

const sameGate = (actual: GateSpec | undefined, expected: GateSpec): boolean => (
  actual !== undefined
  && actual.id === expected.id
  && actual.side === expected.side
  && actual.offset === expected.offset
  && actual.size === expected.size
  && actual.color === expected.color
  && actual.frozen === expected.frozen
  && actual.star === expected.star
);

const lv11AlreadyApplied = (source: LevelSpec): boolean => (
  source.gates.length === LV11_GATES.length
  && (source.flipDoors?.length ?? 0) === 0
  && LV11_GATES.every((gate, index) => sameGate(source.gates[index], gate))
  && source.blocks.length === Object.keys(LV11_PLACEMENTS).length
  && source.blocks.every((block) => {
    const expected = LV11_PLACEMENTS[block.id];
    return expected !== undefined
      && block.x === expected.x
      && block.y === expected.y
      && block.color === expected.color
      && block.frozen === expected.frozen
      && block.layers === undefined;
  })
);

const applyLv11 = (source: LevelSpec): LevelSpec => {
  if (lv11AlreadyApplied(source)) return source;
  if (source.width !== 6 || source.height !== 7 || source.blocks.length !== 22) {
    throw new Error(`Lv11 numeric-ice repair expected a 6x7/22-block source, got ${source.width}x${source.height}/${source.blocks.length}`);
  }
  const sourceIds = new Set(source.blocks.map(({ id }) => id));
  for (const id of Object.keys(LV11_PLACEMENTS)) {
    if (!sourceIds.has(id)) throw new Error(`Lv11 numeric-ice repair source drift at ${id}`);
  }
  return {
    ...source,
    gates: LV11_GATES.map((gate) => ({ ...gate })),
    flipDoors: undefined,
    blocks: source.blocks.map((block) => {
      const expected = LV11_PLACEMENTS[block.id]!;
      const { frozen: _frozen, layers: _layers, ...plain } = block;
      return {
        ...plain,
        x: expected.x,
        y: expected.y,
        color: expected.color,
        ...(expected.frozen === undefined ? {} : { frozen: expected.frozen }),
      };
    }),
  };
};

const applyLv54 = (source: LevelSpec): LevelSpec => {
  const carrier = source.blocks.find(({ id }) => id === "cc-054-b4-02");
  if (!carrier) throw new Error("Lv54 numeric-ice repair source drift at cc-054-b4-02");
  if (carrier.shape.length !== 2 || carrier.shape[0]?.[0] !== 0 || carrier.shape[1]?.[0] !== 0) {
    throw new Error("Lv54 numeric-ice repair expected cc-054-b4-02 to remain a V2 carrier");
  }
  if (carrier.frozen === 3) return source;
  if (carrier.frozen !== 2) {
    throw new Error(`Lv54 numeric-ice repair expected source counter 2, got ${String(carrier.frozen)}`);
  }
  return {
    ...source,
    blocks: source.blocks.map((block) => block.id === carrier.id ? { ...block, frozen: 3 } : block),
  };
};

/** Apply only the independently certified Batch A numeric-ice candidates. */
export const applyCompetitorNumericIceStructuralBatchA = (source: LevelSpec): LevelSpec => {
  if (source.id === 11) return applyLv11(source);
  if (source.id === 54) return applyLv54(source);
  return source;
};
