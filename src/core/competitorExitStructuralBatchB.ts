import type { LevelSpec } from "./types";

export const COMPETITOR_EXIT_STRUCTURAL_BATCH_B_VERSION = "competitor-exit-structural-batch-b-r1" as const;

/**
 * Batch B deliberately publishes no runtime mutation. Every assigned level has
 * an unresolved conflict between the exact exit contract and either the final
 * physical rim, the source-authored opening, or a fresh solver certificate.
 */
export const COMPETITOR_EXIT_STRUCTURAL_BATCH_B_LEVEL_IDS = [] as const;
export const COMPETITOR_EXIT_STRUCTURAL_BATCH_B_ASSIGNED_LEVEL_IDS = [31, 32, 33, 40, 46, 47, 48] as const;

export interface CompetitorExitStructuralBatchBContract {
  levelId: (typeof COMPETITOR_EXIT_STRUCTURAL_BATCH_B_ASSIGNED_LEVEL_IDS)[number];
  ordinaryCount: number;
  frozenValues: readonly number[];
  starCount: number;
  /** Independent directional mouths required by truth-v6/raw generated data. */
  physicalMouthCount: number;
}

export const COMPETITOR_EXIT_STRUCTURAL_BATCH_B_CONTRACTS: readonly CompetitorExitStructuralBatchBContract[] = [
  { levelId: 31, ordinaryCount: 1, frozenValues: [2, 10, 13], starCount: 0, physicalMouthCount: 4 },
  { levelId: 32, ordinaryCount: 1, frozenValues: [8, 8, 8], starCount: 0, physicalMouthCount: 4 },
  { levelId: 33, ordinaryCount: 2, frozenValues: [5, 10, 10, 16, 18], starCount: 0, physicalMouthCount: 7 },
  { levelId: 40, ordinaryCount: 1, frozenValues: [1, 2, 3, 4, 6], starCount: 0, physicalMouthCount: 6 },
  { levelId: 46, ordinaryCount: 6, frozenValues: [2, 5], starCount: 0, physicalMouthCount: 8 },
  { levelId: 47, ordinaryCount: 1, frozenValues: [4, 9, 12, 23], starCount: 0, physicalMouthCount: 5 },
  { levelId: 48, ordinaryCount: 1, frozenValues: [2, 5, 7, 13, 15, 18, 21, 22], starCount: 0, physicalMouthCount: 9 },
];

export type CompetitorExitStructuralBatchBBlockerKind =
  | "source-opening-and-route-not-certified"
  | "exact-contract-exhausted"
  | "truth-video-physical-count-conflict"
  | "source-physical-mouth-missing"
  | "bounded-search-not-certified";

export interface CompetitorExitStructuralBatchBBlocker {
  levelId: (typeof COMPETITOR_EXIT_STRUCTURAL_BATCH_B_ASSIGNED_LEVEL_IDS)[number];
  kind: CompetitorExitStructuralBatchBBlockerKind;
  detail: string;
}

/**
 * These are acceptance blockers, not permission to approximate the exits.
 * In particular they do not authorize merged same-colour mouths, frozen=1,
 * off-mask portals, staging blocks, block recolours, or shape changes.
 */
export const COMPETITOR_EXIT_STRUCTURAL_BATCH_B_BLOCKERS: readonly CompetitorExitStructuralBatchBBlocker[] = [
  {
    levelId: 31,
    kind: "source-opening-and-route-not-certified",
    detail: "restoring the raw four-mouth contract and raw block semantics validates, but leaves seven opening same-colour adjacencies and fresh search reaches 30,000 states without a route; retaining the adjacency-clean runtime colours is statically unsatisfiable because blue/green then have no evidence-backed exit",
  },
  {
    levelId: 32,
    kind: "exact-contract-exhausted",
    detail: "the zero-adjacency final-layout candidate with one ordinary mouth and three independent frozen-8 mouths validates, but fresh search exhausts all 308 reachable states; restoring raw block semantics instead leaves opening adjacency and reaches 30,000 states without a route",
  },
  {
    levelId: 33,
    kind: "truth-video-physical-count-conflict",
    detail: "truth-v6/raw generated require seven mouths (two ordinary plus five frozen), while the untouched competitor frame supports only the six final diamond-mask mouths (one ordinary plus frozen 5/10/10/16/18); that six-mouth level solves and replays in 26 states, but adding the seventh cyan mouth would fabricate a physical port",
  },
  {
    levelId: 40,
    kind: "exact-contract-exhausted",
    detail: "the zero-adjacency final-layout candidate with frozen values 1/2/3/4/6 validates but exhausts after the initial state; restoring raw per-block semantics also introduces two opening same-colour adjacencies and remains exhausted",
  },
  {
    levelId: 46,
    kind: "source-physical-mouth-missing",
    detail: "truth-v6/raw generated require eight independent mouths, but the final certified mask has only seven source-backed valid mouths and lacks orange; the raw rail set is invalid on that mask, while the seven-mouth near-candidate solves/replays in 177 states but does not satisfy the contract",
  },
  {
    levelId: 47,
    kind: "bounded-search-not-certified",
    detail: "the five source-backed mouths can carry ordinary plus frozen 4/9/12/23 with zero opening adjacency and structural validation, but a fresh bounded search does not return a replayable route within the certification run and the prior 20,000-state audit exhausted the Node heap",
  },
  {
    levelId: 48,
    kind: "source-physical-mouth-missing",
    detail: "truth-v6/raw generated require nine independent mouths, including three additional blue counters 18/21/22; their raw rails are invalid on the final mask and only six source-backed mouths remain, so completing the contract would require unsupported new port locations",
  },
];

/** Keep every blocked level byte-for-byte/reference identical. */
export const applyCompetitorExitStructuralBatchB = (source: LevelSpec): LevelSpec => source;
