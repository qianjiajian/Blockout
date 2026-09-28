import type { LevelSpec } from "./types";

/**
 * Evidence-only structural shutter batch C.
 *
 * None of the ten requested levels passes the complete source-panel,
 * source-owned direct-cohort, adjacency and replay gate.  The public apply
 * function is therefore deliberately a no-op: a guessed rectangle, a
 * reassigned cohort or a non-spatial staging chain is not a repair.
 *
 * This module is intentionally not wired into `levels.ts`.
 */
export const COMPETITOR_SHUTTER_STRUCTURAL_BATCH_C_VERSION =
  "competitor-shutter-structural-batch-c-r1" as const;

export const COMPETITOR_SHUTTER_STRUCTURAL_BATCH_C_REQUESTED_LEVEL_IDS = [
  69, 74, 79, 84, 89, 92, 93, 94, 95, 99,
] as const;

export const COMPETITOR_SHUTTER_STRUCTURAL_BATCH_C_CERTIFIED_LEVEL_IDS = [] as const;

export const COMPETITOR_SHUTTER_STRUCTURAL_BATCH_C_USES_STAGING_FALLBACK = false as const;

export const applyCompetitorShutterStructuralBatchC = (source: LevelSpec): LevelSpec => source;

const TRUTH =
  "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json";
const SCREENSHOTS =
  "deliverables/competitor-screenshots/BlockOut-competitor-levels-001-100-2026-06/levels";
const REPORT =
  "playtest-results/experiments/competitor-shutter-structural-batch-c-2026-09-21/report.json";
const STAGE2 =
  "playtest-results/experiments/competitor-shutter-cohorts-stage2-2026-09-20/report.json";

export interface CompetitorShutterStructuralBatchCPanelAudit {
  readonly countdown: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly sourceFootprintCells: number;
  readonly sourceDirectPieceCount: number;
  readonly sourceDirectOccupiedCells: number;
}

/**
 * Cell-aligned rectangles read from the untouched competitor openings.
 * Direct occupancy is calculated from truth-v6's per-cover fixed-orientation
 * shape histogram.  A direct cohort may not be moved to another countdown.
 */
export const COMPETITOR_SHUTTER_STRUCTURAL_BATCH_C_PANEL_CAPACITY_AUDITS = [
  {
    levelId: 74,
    panels: [
      { countdown: 23, x: 0, y: 0, width: 3, height: 4, sourceFootprintCells: 12, sourceDirectPieceCount: 4, sourceDirectOccupiedCells: 14 },
      { countdown: 18, x: 3, y: 0, width: 4, height: 3, sourceFootprintCells: 12, sourceDirectPieceCount: 4, sourceDirectOccupiedCells: 12 },
      { countdown: 10, x: 0, y: 6, width: 3, height: 4, sourceFootprintCells: 12, sourceDirectPieceCount: 4, sourceDirectOccupiedCells: 12 },
      { countdown: 6, x: 3, y: 8, width: 4, height: 2, sourceFootprintCells: 8, sourceDirectPieceCount: 3, sourceDirectOccupiedCells: 8 },
    ],
  },
  {
    levelId: 79,
    panels: [
      { countdown: 10, x: 5, y: 0, width: 4, height: 6, sourceFootprintCells: 24, sourceDirectPieceCount: 11, sourceDirectOccupiedCells: 28 },
      { countdown: 20, x: 0, y: 8, width: 9, height: 4, sourceFootprintCells: 36, sourceDirectPieceCount: 14, sourceDirectOccupiedCells: 33 },
    ],
  },
  {
    levelId: 84,
    panels: [
      { countdown: 15, x: 0, y: 0, width: 3, height: 3, sourceFootprintCells: 9, sourceDirectPieceCount: 4, sourceDirectOccupiedCells: 12 },
      { countdown: 24, x: 3, y: 0, width: 2, height: 3, sourceFootprintCells: 6, sourceDirectPieceCount: 3, sourceDirectOccupiedCells: 9 },
      { countdown: 26, x: 5, y: 1, width: 2, height: 3, sourceFootprintCells: 6, sourceDirectPieceCount: 2, sourceDirectOccupiedCells: 6 },
      { countdown: 6, x: 4, y: 4, width: 3, height: 4, sourceFootprintCells: 12, sourceDirectPieceCount: 5, sourceDirectOccupiedCells: 15 },
    ],
  },
  {
    levelId: 89,
    panels: [
      { countdown: 7, x: 0, y: 4, width: 7, height: 2, sourceFootprintCells: 14, sourceDirectPieceCount: 8, sourceDirectOccupiedCells: 21 },
      { countdown: 12, x: 0, y: 6, width: 7, height: 4, sourceFootprintCells: 28, sourceDirectPieceCount: 4, sourceDirectOccupiedCells: 25 },
    ],
  },
  {
    levelId: 93,
    panels: [
      { countdown: 18, x: 0, y: 0, width: 3, height: 4, sourceFootprintCells: 12, sourceDirectPieceCount: 4, sourceDirectOccupiedCells: 15 },
      { countdown: 14, x: 0, y: 4, width: 3, height: 5, sourceFootprintCells: 15, sourceDirectPieceCount: 7, sourceDirectOccupiedCells: 18 },
    ],
  },
  {
    levelId: 94,
    panels: [
      { countdown: 16, x: 0, y: 0, width: 3, height: 3, sourceFootprintCells: 9, sourceDirectPieceCount: 4, sourceDirectOccupiedCells: 13 },
      { countdown: 20, x: 3, y: 0, width: 4, height: 3, sourceFootprintCells: 12, sourceDirectPieceCount: 5, sourceDirectOccupiedCells: 13 },
      { countdown: 8, x: 0, y: 3, width: 6, height: 2, sourceFootprintCells: 12, sourceDirectPieceCount: 5, sourceDirectOccupiedCells: 13 },
      { countdown: 5, x: 4, y: 6, width: 3, height: 4, sourceFootprintCells: 12, sourceDirectPieceCount: 4, sourceDirectOccupiedCells: 12 },
    ],
  },
] as const satisfies readonly {
  readonly levelId: 74 | 79 | 84 | 89 | 93 | 94;
  readonly panels: readonly CompetitorShutterStructuralBatchCPanelAudit[];
}[];

export const COMPETITOR_SHUTTER_STRUCTURAL_BATCH_C_AGGREGATE_CAPACITY_AUDITS = [
  {
    levelId: 99,
    sourcePanelFootprintCells: 26,
    sourceHiddenPieceCount: 14,
    sourceHiddenOccupiedCells: 27,
    perCoverPartitionStatus: "unclear",
  },
] as const;

export const COMPETITOR_SHUTTER_STRUCTURAL_BATCH_C_SEARCH_AUDITS = [
  {
    levelId: 69,
    sourcePanelCount: 4,
    sourceOpeningPieceCount: 9,
    sourceHiddenPieceCount: 19,
    adjacencyCleanOpeningPackings: 104,
    exhaustedAtOneThousandStates: 84,
    unresolvedAtOneThousandStates: 20,
    unresolvedAtTenThousandStates: 20,
    representativeTerminationAtOneHundredThousandStates: "max_states",
    certifiedReplayCount: 0,
  },
  {
    levelId: 92,
    sourceOpeningPieceCount: 16,
    sourceHiddenPieceCount: 13,
    sourceHiddenOccupiedCells: 33,
    directCohortColorCountInCurrentTruthProjection: 1,
    adjacencyCleanDirectPackings: 0,
    certifiedReplayCount: 0,
  },
  {
    levelId: 95,
    sourceOpeningPieceCount: 17,
    sourceHiddenPieceCount: 13,
    sourceHiddenOccupiedCells: 19,
    sourcePanelFootprintCells: 32,
    directCohortColorCountInCurrentTruthProjection: 1,
    enumeratedAdjacencyCleanOpeningPackings: 250,
    adjacencyCleanDirectPackings: 0,
    certifiedReplayCount: 0,
  },
] as const;

export type CompetitorShutterStructuralBatchCBlockerKind =
  | "direct-cohort-adjacency-conflict"
  | "fresh-solver-not-certified"
  | "physical-panel-capacity-conflict"
  | "source-cohort-partition-unclear";

export interface CompetitorShutterStructuralBatchCBlocker {
  readonly levelId: 69 | 74 | 79 | 84 | 89 | 92 | 93 | 94 | 95 | 99;
  readonly kinds: readonly CompetitorShutterStructuralBatchCBlockerKind[];
  readonly reason: string;
  readonly evidence: readonly string[];
}

export const COMPETITOR_SHUTTER_STRUCTURAL_BATCH_C_BLOCKERS = [
  {
    levelId: 69,
    kinds: ["fresh-solver-not-certified"],
    reason: "The four source rectangles and all 19 source-owned hidden pieces pack physically. Exhaustive opening packing produced 104 validation/adjacency-clean candidates: 84 exhaust at 1,000 states and all remaining 20 still hit 10,000 states; a representative reaches 100,000 states without a replayable completion, so no candidate is publishable.",
    evidence: [TRUTH, `${SCREENSHOTS}/competitor-level-069.jpg`, REPORT],
  },
  {
    levelId: 74,
    kinds: ["physical-panel-capacity-conflict"],
    reason: "The source-fps-exact count-23 cohort is H3+V3+L4+T4 and occupies 14 cells, but its video rectangle is only 3x4 (12 cells). Moving a member to another cover would contradict the exact reveal ledger, so an apparent aggregate repacking is not source-faithful.",
    evidence: [TRUTH, `${SCREENSHOTS}/competitor-level-074.jpg`, REPORT],
  },
  {
    levelId: 79,
    kinds: ["physical-panel-capacity-conflict"],
    reason: "The source-fps-exact count-10 direct cohort occupies 28 fixed-orientation cells while the corresponding upper-right video panel is 4x6 (24 cells). The count-10/count-20 ownership is source observed, therefore reassignment between panels is forbidden.",
    evidence: [TRUTH, `${SCREENSHOTS}/competitor-level-079.jpg`, REPORT],
  },
  {
    levelId: 84,
    kinds: ["physical-panel-capacity-conflict"],
    reason: "The four source panel capacities are 9/6/6/12 cells, while their source-fps-exact direct cohorts occupy 12/9/6/15 cells. Three independently exceed the region they must remain under; changing shapes, ownership or panel dimensions would invent source data.",
    evidence: [TRUTH, `${SCREENSHOTS}/competitor-level-084.jpg`, REPORT],
  },
  {
    levelId: 89,
    kinds: ["physical-panel-capacity-conflict"],
    reason: "The source count-7 panel is the 7x2 middle band with 14 cells, but its source-observed H2x2+V2+H3+V3x4 direct cohort occupies 21 cells. The project SQ3 projection does not affect this count-7 contradiction.",
    evidence: [TRUTH, `${SCREENSHOTS}/competitor-level-089.jpg`, REPORT],
  },
  {
    levelId: 92,
    kinds: ["direct-cohort-adjacency-conflict"],
    reason: "Truth fixes one count-17 cohort of 13 pieces/33 occupied cells. Under the current source-backed color projection all 13 are purple; the bounded fixed-shape reconstruction of the video panel has zero packings that keep distinct direct-queue blocks orthogonally non-adjacent, so no candidate reaches solver/replay.",
    evidence: [TRUTH, `${SCREENSHOTS}/competitor-level-092.jpg`, STAGE2, REPORT],
  },
  {
    levelId: 93,
    kinds: ["physical-panel-capacity-conflict"],
    reason: "The left component's count-18 and count-14 source rectangles contain 12 and 15 cells. Their source-fps-exact fixed-orientation cohorts occupy 15 and 18 cells respectively, making both direct assignments physically impossible without clipping, overlap or shape changes.",
    evidence: [TRUTH, `${SCREENSHOTS}/competitor-level-093.jpg`, REPORT],
  },
  {
    levelId: 94,
    kinds: ["physical-panel-capacity-conflict"],
    reason: "The source count-16/count-20/count-8/count-5 rectangles contain 9/12/12/12 cells, but their exact reveal cohorts occupy 13/13/13/12. Three cohorts exceed their own panel; aggregate reshuffling would contradict the source-fps per-cover ledger.",
    evidence: [TRUTH, `${SCREENSHOTS}/competitor-level-094.jpg`, REPORT],
  },
  {
    levelId: 95,
    kinds: ["direct-cohort-adjacency-conflict"],
    reason: "The single source count-17 cohort has 13 pieces/19 cells and fits by area inside the exact 8x4 lower panel, but all 13 current truth-projected blocks are purple. Exhaustive fixed-shape placement finds zero direct packings with no orthogonal same-color contact, despite at least 250 valid opening packings.",
    evidence: [TRUTH, `${SCREENSHOTS}/competitor-level-095.jpg`, REPORT],
  },
  {
    levelId: 99,
    kinds: ["physical-panel-capacity-conflict", "source-cohort-partition-unclear"],
    reason: "The three source rectangles have only 26 cells in aggregate, while the exact aggregate hidden histogram occupies 27. Video evidence also explicitly leaves ownership among the three simultaneously decrementing count-3 covers unclear, so neither a physical packing nor a source-proven per-cover mapping can be authored.",
    evidence: [TRUTH, `${SCREENSHOTS}/competitor-level-099.jpg`, REPORT],
  },
] as const satisfies readonly CompetitorShutterStructuralBatchCBlocker[];
