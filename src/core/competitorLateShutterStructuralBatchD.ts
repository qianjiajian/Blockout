import type { LevelSpec } from "./types";

/**
 * Evidence-only late shutter structural batch D.
 *
 * None of the six requested levels has a source-complete physical rectangle,
 * source-owned direct cohort and replay certificate at the same time.  The
 * public apply function is therefore deliberately a no-op.  In particular,
 * this batch never substitutes a staging chain for a visible shutter and
 * never assigns a block to a panel whose reveal ownership is unclear.
 *
 * This module is intentionally not wired into `levels.ts`.
 */
export const COMPETITOR_LATE_SHUTTER_STRUCTURAL_BATCH_D_VERSION =
  "competitor-late-shutter-structural-batch-d-r1" as const;

export const COMPETITOR_LATE_SHUTTER_STRUCTURAL_BATCH_D_REQUESTED_LEVEL_IDS = [
  101, 103, 104, 109, 113, 119,
] as const;

export const COMPETITOR_LATE_SHUTTER_STRUCTURAL_BATCH_D_CERTIFIED_LEVEL_IDS = [] as const;

export const COMPETITOR_LATE_SHUTTER_STRUCTURAL_BATCH_D_USES_STAGING_FALLBACK = false as const;

export const applyCompetitorLateShutterStructuralBatchD = (source: LevelSpec): LevelSpec => source;

const TRUTH =
  "deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json";
const FRAMES = ".codex-temp/video-audit-101-134/opening-upscaled";
const EXACT_GEOMETRY_REPORT =
  "playtest-results/experiments/competitor-exact-shutter-geometry-post100-2026-09-20/report.md";
const COUNT_REPORT =
  "playtest-results/experiments/player-facing-shutter-count-contracts-2026-09-20/report.md";
const LV103_REPORT =
  "playtest-results/experiments/aperture-duplicate-cluster-lv103-lv116-r1/final-report.md";
const REPORT =
  "playtest-results/experiments/competitor-late-shutter-structural-batch-d-2026-09-21/report.json";

export type CompetitorLateShutterStructuralBatchDSourceStatus =
  | "exact-rectangle-cohort-unclear"
  | "rectangle-and-board-unclear";

export interface CompetitorLateShutterStructuralBatchDPanelFact {
  readonly count: number;
  readonly x: number | null;
  readonly y: number | null;
  readonly width: number | null;
  readonly height: number | null;
  readonly directCohortPieceCount: null;
}

/**
 * These are the values actually present in truth-v1.  `null` is retained as
 * evidence, rather than being replaced with geometry inferred from a builder
 * projection.  Truth-v1 marks every direct hidden batch in this scope unclear.
 */
export const COMPETITOR_LATE_SHUTTER_STRUCTURAL_BATCH_D_SOURCE_AUDITS = [
  {
    levelId: 101,
    board: { width: 6, height: 8, playableCellCount: 48 },
    openingPieceCount: 4,
    status: "exact-rectangle-cohort-unclear",
    panels: [
      { count: 9, x: 0, y: 0, width: 6, height: 3, directCohortPieceCount: null },
      { count: 4, x: 0, y: 3, width: 6, height: 3, directCohortPieceCount: null },
    ],
  },
  {
    levelId: 103,
    board: { width: 6, height: 10, playableCellCount: 60 },
    openingPieceCount: 11,
    status: "exact-rectangle-cohort-unclear",
    panels: [
      { count: 5, x: 0, y: 0, width: 6, height: 3, directCohortPieceCount: null },
      { count: 20, x: 0, y: 7, width: 6, height: 3, directCohortPieceCount: null },
    ],
  },
  {
    levelId: 104,
    board: { width: 7, height: 10, playableCellCount: 66 },
    openingPieceCount: 15,
    status: "exact-rectangle-cohort-unclear",
    panels: [
      { count: 12, x: 0, y: 0, width: 7, height: 4, directCohortPieceCount: null },
      { count: 6, x: 1, y: 4, width: 5, height: 2, directCohortPieceCount: null },
    ],
  },
  {
    levelId: 109,
    board: { width: null, height: null, playableCellCount: null },
    openingPieceCount: 16,
    status: "rectangle-and-board-unclear",
    panels: [
      { count: 8, x: null, y: null, width: null, height: null, directCohortPieceCount: null },
      { count: 8, x: null, y: null, width: null, height: null, directCohortPieceCount: null },
      { count: 8, x: null, y: null, width: null, height: null, directCohortPieceCount: null },
    ],
  },
  {
    levelId: 113,
    board: { width: null, height: null, playableCellCount: null },
    openingPieceCount: 3,
    status: "rectangle-and-board-unclear",
    panels: [
      { count: 7, x: null, y: null, width: null, height: null, directCohortPieceCount: null },
      { count: 1, x: null, y: null, width: null, height: null, directCohortPieceCount: null },
    ],
  },
  {
    levelId: 119,
    board: { width: null, height: null, playableCellCount: null },
    openingPieceCount: 13,
    status: "rectangle-and-board-unclear",
    panels: [
      { count: 18, x: null, y: null, width: null, height: null, directCohortPieceCount: null },
      { count: 12, x: null, y: null, width: null, height: null, directCohortPieceCount: null },
      { count: 6, x: null, y: null, width: null, height: null, directCohortPieceCount: null },
    ],
  },
] as const satisfies readonly {
  readonly levelId: 101 | 103 | 104 | 109 | 113 | 119;
  readonly board: {
    readonly width: number | null;
    readonly height: number | null;
    readonly playableCellCount: number | null;
  };
  readonly openingPieceCount: number;
  readonly status: CompetitorLateShutterStructuralBatchDSourceStatus;
  readonly panels: readonly CompetitorLateShutterStructuralBatchDPanelFact[];
}[];

/** Final LEVELS arithmetic that makes the source count-20 Lv103 panel impossible. */
export const COMPETITOR_LATE_SHUTTER_STRUCTURAL_BATCH_D_CAPACITY_AUDITS = [
  {
    levelId: 103,
    runtimeFullPieceCount: 19,
    runtimeOpeningPieceCount: 11,
    runtimeUpperDirectPieceCount: 4,
    runtimeLowerDirectPieceCount: 4,
    lowerPanelCount: 20,
    maximumClearsBeforeLowerDirectCohort: 15,
  },
] as const;

export const COMPETITOR_LATE_SHUTTER_STRUCTURAL_BATCH_D_REJECTED_PROBES = [
  {
    levelId: 101,
    candidate: "generated direct-cohort projection under the two exact video rectangles",
    validation: "pass",
    physicalCoverageIssues: 0,
    freshSolverMaxStates: 20_000,
    termination: "exhausted",
    certifiedReplayCount: 0,
  },
  {
    levelId: 104,
    candidate: "exact video rectangles with disjoint direct cohorts and opening repack",
    validation: "pass",
    physicalCoverageIssues: 0,
    freshSolverMaxStates: 20_000,
    termination: "max_states",
    certifiedReplayCount: 0,
  },
  {
    levelId: 119,
    candidate: "builder-inferred rectangles/direct cohorts (not source-exact)",
    validation: "pass",
    physicalCoverageIssues: 0,
    freshSolverMaxStates: 30_000,
    termination: "exhausted",
    certifiedReplayCount: 0,
  },
] as const;

export type CompetitorLateShutterStructuralBatchDBlockerKind =
  | "count-capacity-conflict"
  | "direct-cohort-source-unclear"
  | "fresh-solver-not-certified"
  | "source-board-mask-unclear"
  | "source-rectangle-unclear";

export interface CompetitorLateShutterStructuralBatchDBlocker {
  readonly levelId: 101 | 103 | 104 | 109 | 113 | 119;
  readonly kinds: readonly CompetitorLateShutterStructuralBatchDBlockerKind[];
  readonly reason: string;
  readonly evidence: readonly string[];
}

export const COMPETITOR_LATE_SHUTTER_STRUCTURAL_BATCH_D_BLOCKERS = [
  {
    levelId: 101,
    kinds: ["direct-cohort-source-unclear", "fresh-solver-not-certified"],
    reason: "Truth-v1 fixes the two 6x3 rectangles and counts 9/4, but explicitly leaves both hidden batch counts, shapes and anchors unclear. The existing source-projection exact-geometry candidate exhausts without a completion; assigning the generated odd/even pool to the two panels would therefore be an unverified cohort guess, not a source-faithful repair.",
    evidence: [TRUTH, `${FRAMES}/level-101.png`, EXACT_GEOMETRY_REPORT, REPORT],
  },
  {
    levelId: 103,
    kinds: ["count-capacity-conflict", "direct-cohort-source-unclear"],
    reason: "Truth-v1 fixes a lower 6x3/count20 panel but not its direct cohort. Final LEVELS contains only 19 pieces; with the current four-piece lower direct cohort, at most 15 pieces can clear before that cohort releases, so count20 is unreachable. Even a one-piece direct cohort would leave only 18 prior clears. Reducing 20 to 15 is solvable but contradicts the source counter and is intentionally rejected.",
    evidence: [TRUTH, `${FRAMES}/level-103.png`, LV103_REPORT, REPORT],
  },
  {
    levelId: 104,
    kinds: ["direct-cohort-source-unclear", "fresh-solver-not-certified"],
    reason: "Truth-v1 fixes the 7x4/count12 and 5x2/count6 rectangles but explicitly leaves both reveal cohorts unclear. Restoring the exact regions also requires repacking the 15 opening pieces outside them; the existing physical, adjacency-clean candidate reaches the 20,000-state cap without a replay. No guessed cohort or geometry-only candidate is publishable.",
    evidence: [TRUTH, `${FRAMES}/level-104.png`, EXACT_GEOMETRY_REPORT, REPORT],
  },
  {
    levelId: 109,
    kinds: ["source-board-mask-unclear", "source-rectangle-unclear", "direct-cohort-source-unclear"],
    reason: "The video proves three count-8 covers and 16 opening pieces, but truth-v1 keeps the logical board extent, playable mask, all three rectangles and all three hidden cohorts null. Final LEVELS has those 16 pieces as the complete runtime inventory, so adding physical hidden batches or choosing any of the visually plausible panel bounds would invent source geometry and composition.",
    evidence: [TRUTH, `${FRAMES}/level-109.png`, COUNT_REPORT, REPORT],
  },
  {
    levelId: 113,
    kinds: ["source-board-mask-unclear", "source-rectangle-unclear", "direct-cohort-source-unclear"],
    reason: "Truth-v1 proves upper/lower counters 7/1 and a separate center staged tray, but leaves the logical mask, both shutter rectangles and both direct cohorts null. The builder-projected lower 6x3 rectangle includes final-runtime void cell (5,8), so expanding it to the visible estimate would violate the current board rather than certify matching display and coverage regions.",
    evidence: [TRUTH, `${FRAMES}/level-113.png`, COUNT_REPORT, REPORT],
  },
  {
    levelId: 119,
    kinds: ["source-board-mask-unclear", "source-rectangle-unclear", "direct-cohort-source-unclear", "fresh-solver-not-certified"],
    reason: "The video proves three covers with counts 18/12/6 and two generators, but truth-v1 leaves board dimensions, mask, all cover rectangles, all direct cohorts and generator cargo details unclear. The builder-inferred rectangles overlap the current opening before repack; a raw inferred-cohort repack validates physically but exhausts after three states, so neither inference has source or replay authority.",
    evidence: [TRUTH, `${FRAMES}/level-119.png`, COUNT_REPORT, REPORT],
  },
] as const satisfies readonly CompetitorLateShutterStructuralBatchDBlocker[];
