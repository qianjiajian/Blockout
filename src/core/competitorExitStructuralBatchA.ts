import type { BlockColor, GateSpec, LevelSpec } from "./types";

export const COMPETITOR_EXIT_STRUCTURAL_BATCH_A_VERSION = "competitor-exit-structural-batch-a-r2" as const;

/**
 * Only Lv22 has a source-faithful, adjacency-clean solver/replay certificate.
 * The remaining assigned levels stay explicit blockers instead of receiving
 * approximate counters, merged exits, synthetic staging, or block recolours.
 */
export const COMPETITOR_EXIT_STRUCTURAL_BATCH_A_LEVEL_IDS = [22] as const;

export type CompetitorExitStructuralBatchABlockerKind =
  | "runtime-counter-semantics-conflict"
  | "adjacency-clean-layout-not-certified"
  | "bounded-search-not-certified";

export interface CompetitorExitStructuralBatchABlocker {
  levelId: number;
  kind: CompetitorExitStructuralBatchABlockerKind;
  detail: string;
}

export const COMPETITOR_EXIT_STRUCTURAL_BATCH_A_BLOCKERS: readonly CompetitorExitStructuralBatchABlocker[] = ([
  {
    levelId: 14,
    kind: "runtime-counter-semantics-conflict",
    detail: "truth requires frozen exit 17 with 17 total source clear layers and four source colours across four independent exits; every exact-colour assignment leaves fewer than 17 prior nonmatching clears",
  },
  {
    levelId: 16,
    kind: "bounded-search-not-certified",
    detail: "truth-mask physical remap plus source colours/shapes reached zero opening adjacency and passed validation, but fresh search exhausted 300,000 states without a replayable route",
  },
  {
    levelId: 17,
    kind: "adjacency-clean-layout-not-certified",
    detail: "the exact raw-colour/counter candidate solves and replays, but no local source-shape coordinate permutation produced both zero opening adjacency and a fresh route",
  },
  {
    levelId: 19,
    kind: "adjacency-clean-layout-not-certified",
    detail: "the missing 27-piece source composition was recovered and its exact exit candidate solves/replays, but its six same-colour SQ2 ice carriers require a non-local full-board repack to reach zero opening adjacency",
  },
  {
    levelId: 25,
    kind: "bounded-search-not-certified",
    detail: "the eight frame-backed independent mouths, exact counters, source colours/shapes, and zero-adjacency layout validate; 30,000 states were inconclusive and a 300,000-state run exhausted the Node heap before certification",
  },
] satisfies CompetitorExitStructuralBatchABlocker[]).sort((left, right) => left.levelId - right.levelId);

const LV22_GATES: readonly GateSpec[] = [
  { id: "vp-022-gate-01", side: "top", offset: 3, size: 3, color: "pink" },
  { id: "vp-022-gate-02", side: "left", offset: 0, size: 2, color: "yellow" },
  { id: "vp-022-gate-03", side: "top", offset: 1, size: 2, color: "blue" },
  { id: "vp-022-gate-04", side: "top", offset: 0, size: 1, color: "green", frozen: 19 },
  { id: "vp-022-gate-05", side: "right", offset: 4, size: 3, color: "purple", frozen: 17 },
  { id: "vp-022-gate-06", side: "left", offset: 4, size: 3, color: "cyan", frozen: 19 },
];

const LV22_SOURCE_COLORS: Readonly<Record<string, BlockColor>> = {
  "cc-piece-s1-01": "yellow",
  "cc-piece-s1-05": "pink",
  "cc-piece-s1-06": "yellow",
  "cc-piece-s1-17": "yellow",
};

/** Three same-shape opening swaps; no block colour or shape is changed. */
const LV22_OPENING_POSITIONS: Readonly<Record<string, readonly [number, number]>> = {
  "cc-piece-s1-01": [3, 0],
  "cc-piece-s1-03": [0, 0],
  "cc-piece-s1-05": [2, 2],
  "cc-piece-s1-17": [5, 0],
  "cc-piece-s1-06": [1, 0],
  "cc-piece-s1-08": [5, 1],
};

const alreadyApplied = (source: LevelSpec): boolean => (
  source.gates.length === LV22_GATES.length
  && (source.flipDoors?.length ?? 0) === 0
  && LV22_GATES.every((expected, index) => JSON.stringify(source.gates[index]) === JSON.stringify(expected))
  && Object.entries(LV22_SOURCE_COLORS).every(([id, color]) => (
    source.blocks.find((block) => block.id === id)?.color === color
  ))
  && Object.entries(LV22_OPENING_POSITIONS).every(([id, [x, y]]) => {
    const block = source.blocks.find((candidate) => candidate.id === id);
    return block?.x === x && block.y === y;
  })
);

/** Apply the isolated, source-backed Lv22 exit/composition certificate. */
export const applyCompetitorExitStructuralBatchA = (source: LevelSpec): LevelSpec => {
  if (source.id !== 22 || alreadyApplied(source)) return source;
  return {
    ...source,
    gates: LV22_GATES.map((gate) => ({ ...gate })),
    flipDoors: undefined,
    blocks: source.blocks.map((block) => {
      const color = LV22_SOURCE_COLORS[block.id];
      const position = LV22_OPENING_POSITIONS[block.id];
      if (color === undefined && position === undefined) return block;
      return {
        ...block,
        ...(color === undefined ? {} : {
          color,
          ...(block.layers?.length ? { layers: [color, ...block.layers.slice(1)] } : {}),
        }),
        ...(position === undefined ? {} : { x: position[0], y: position[1] }),
      };
    }),
  };
};
