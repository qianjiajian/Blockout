import type { LevelSpec } from "./types";

/**
 * Evidence-only audit of mechanism-count differences that look like one-field
 * edits in the aggregate report but are not safe one-field runtime repairs.
 *
 * This module is intentionally not wired into `levels.ts`.  A changed counter
 * or class is publishable only when the source also fixes the physical mouth or
 * panel, the directly covered cohort, and a fresh solver/PuzzleModel replay.
 */
export const COMPETITOR_SINGLE_FIELD_CONTRACT_BATCH_I_VERSION =
  "competitor-single-field-contract-batch-i-r1" as const;

export const COMPETITOR_SINGLE_FIELD_CONTRACT_BATCH_I_REQUESTED_LEVEL_IDS = [
  33, 44, 46, 49, 60, 99, 101, 103, 115, 150, 162, 175, 178,
] as const;

export const COMPETITOR_SINGLE_FIELD_CONTRACT_BATCH_I_CERTIFIED_LEVEL_IDS = [] as const;

export const COMPETITOR_SINGLE_FIELD_CONTRACT_BATCH_I_USES_APPROXIMATION = false as const;

export type CompetitorSingleFieldContractBatchIBlockerKind =
  | "source-physical-mouth-missing"
  | "physical-panel-capacity-conflict"
  | "source-cohort-partition-unclear"
  | "axis-direction-evidence-missing"
  | "count-capacity-conflict"
  | "source-composition-incomplete"
  | "fresh-solver-not-certified"
  | "static-route-unsatisfied";

export interface CompetitorSingleFieldContractBatchIBlocker {
  readonly levelId: (typeof COMPETITOR_SINGLE_FIELD_CONTRACT_BATCH_I_REQUESTED_LEVEL_IDS)[number];
  readonly auditFields: readonly string[];
  readonly kinds: readonly CompetitorSingleFieldContractBatchIBlockerKind[];
  readonly reason: string;
  readonly evidence: readonly string[];
}

const TRUTH_1_100 =
  "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json";
const TRUTH_101_200 =
  "deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json";
const SCREENSHOTS =
  "deliverables/competitor-screenshots/BlockOut-competitor-levels-001-100-2026-06/levels";
const REPORT =
  "playtest-results/experiments/competitor-single-field-contract-batch-i-2026-09-21/report.json";

export const COMPETITOR_SINGLE_FIELD_CONTRACT_BATCH_I_BLOCKERS = [
  {
    levelId: 33,
    auditFields: ["ordinaryExitCount"],
    kinds: ["source-physical-mouth-missing"],
    reason: "Truth-v6's aggregate says two ordinary plus five frozen exits, but the untouched diamond has only six source-visible one-cell mouths: one ordinary and frozen 5/10/10/16/18.  The six-mouth runtime solves and replays; inventing a seventh mouth or its colour/side would not be video-backed.",
    evidence: [TRUTH_1_100, `${SCREENSHOTS}/competitor-level-033.jpg`, "src/core/competitorExitStructuralBatchB.ts"],
  },
  {
    levelId: 44,
    auditFields: ["shutterCoveredCohortTotal"],
    kinds: ["physical-panel-capacity-conflict", "source-cohort-partition-unclear"],
    reason: "The six-piece aggregate hidden cohort is exact, but ownership across five simultaneous count-6 panels is explicitly unclear.  Four panels are only one cell wide and cannot directly contain the fixed-orientation L3/H2/SQ2 members; assigning the six pieces merely to clear the aggregate audit would make display and covered regions disagree.",
    evidence: [TRUTH_1_100, `${SCREENSHOTS}/competitor-level-044.jpg`, "src/core/competitorShutterStructuralBatchB.ts"],
  },
  {
    levelId: 46,
    auditFields: ["ordinaryExitCount"],
    kinds: ["source-physical-mouth-missing"],
    reason: "The exact aggregate requires eight independent mouths, but the certified 7x10 mask exposes only seven source-backed valid mouths and no orange mouth.  Restoring the raw rail is invalid on that mask; choosing another rim location would fabricate source geometry.",
    evidence: [TRUTH_1_100, `${SCREENSHOTS}/competitor-level-046.jpg`, "src/core/competitorExitStructuralBatchB.ts"],
  },
  {
    levelId: 49,
    auditFields: ["shutterCoveredCohortTotal"],
    kinds: ["physical-panel-capacity-conflict", "source-cohort-partition-unclear"],
    reason: "The three video panels contain 29 cells in aggregate, while the exact simultaneous 17-piece hidden cohort occupies 33 fixed-orientation cells.  Because the per-panel split is unobservable, no direct non-overlapping assignment can be authored without changing shapes, panel bounds, or source ownership.",
    evidence: [TRUTH_1_100, `${SCREENSHOTS}/competitor-level-049.jpg`, "src/core/competitorShutterStructuralBatchB.ts"],
  },
  {
    levelId: 60,
    auditFields: ["axisBlockCount"],
    kinds: ["axis-direction-evidence-missing"],
    reason: "The opening proves that all 35 singleton tiles carry an axis marker, but truth intentionally leaves per-tile directions null.  The current exits do not provide compatible channels for an all-vertical projection; assigning horizontal/vertical directions tile by tile would guess gameplay, so the count cannot be restored independently.",
    evidence: [TRUTH_1_100, "src/core/singleBlockAdjacencyRepairs.ts", REPORT],
  },
  {
    levelId: 99,
    auditFields: ["shutterCoveredCohortTotal"],
    kinds: ["physical-panel-capacity-conflict", "source-cohort-partition-unclear"],
    reason: "The three count-3 source panels contain only 26 cells, but the exact 14-piece aggregate hidden histogram occupies 27.  Their simultaneous decrement also leaves per-panel ownership unknown, so a direct cohort cannot be attached to the visible panels without overlap or invented attribution.",
    evidence: [TRUTH_1_100, `${SCREENSHOTS}/competitor-level-099.jpg`, "src/core/competitorShutterStructuralBatchC.ts"],
  },
  {
    levelId: 101,
    auditFields: ["shutterCount", "shutterCoverCounts"],
    kinds: ["source-cohort-partition-unclear", "fresh-solver-not-certified"],
    reason: "Truth fixes 6x3 count-9 and count-4 rectangles but explicitly leaves both direct cohorts unknown.  The generated direct-cohort projection is physically valid yet exhausts its supported state space without a completion; publishing it would convert a builder guess into false source truth.",
    evidence: [TRUTH_101_200, "src/core/competitorLateShutterStructuralBatchD.ts"],
  },
  {
    levelId: 103,
    auditFields: ["shutterCoverCounts"],
    kinds: ["count-capacity-conflict", "source-cohort-partition-unclear"],
    reason: "The lower source panel reads 20, but final runtime has 19 total pieces and four pieces directly behind that panel.  At most 15 pieces can clear before the direct cohort is available; even a one-piece cohort permits only 18 prior clears.  Changing 15 to 20 is therefore unreachable rather than a safe counter edit.",
    evidence: [TRUTH_101_200, "src/core/competitorLateShutterStructuralBatchD.ts"],
  },
  {
    levelId: 115,
    auditFields: ["numericIceValues"],
    kinds: ["fresh-solver-not-certified"],
    reason: "Restoring the four video-positioned V3 counters to 3/9/3/9 and removing ice from the wrong upper-right carrier validates structurally, but exact search exhausts all four reachable states.  The six-piece composition supplies too few prior clears to release both value-9 carriers.",
    evidence: [TRUTH_101_200, REPORT],
  },
  {
    levelId: 150,
    auditFields: ["frozenExitValues"],
    kinds: ["fresh-solver-not-certified"],
    reason: "Changing the sole mismatched left frozen exit from 6 to the source value 7 preserves all geometry and validates, but reaches the 30,000-state certification ceiling without a replayable completion.  The value must not be published without a route certificate.",
    evidence: [TRUTH_101_200, "src/core/competitorLateExitContracts101To200.ts", REPORT],
  },
  {
    levelId: 162,
    auditFields: ["ordinaryExitCount"],
    kinds: ["static-route-unsatisfied"],
    reason: "Truth has five flip doors and zero ordinary exits.  Removing the three solvability gates leaves seven cyan/blue block layers without any colour-compatible exit, so the exact source exit class is statically unroutable with the current 18-piece cohort.",
    evidence: [TRUTH_101_200, "src/core/competitorLateExitContracts101To200.ts", REPORT],
  },
  {
    levelId: 175,
    auditFields: ["shutterCoverCounts"],
    kinds: ["source-cohort-partition-unclear", "source-composition-incomplete"],
    reason: "The source fixes a 4x6 count-10 panel and thirteen opening pieces, but the hidden batch and full composition are unknown.  Current runtime instead binds one source-opening block to a 2x2 count-1 panel and stages two inferred blocks non-spatially; changing only the number would preserve the wrong region and cohort.",
    evidence: [TRUTH_101_200, REPORT],
  },
  {
    levelId: 178,
    auditFields: ["shutterCoverCounts"],
    kinds: ["source-cohort-partition-unclear", "source-composition-incomplete"],
    reason: "The source proves a 2x6 count-14 panel and 23 opening pieces but leaves the hidden batch/full composition unknown.  Current runtime has only those 23 total pieces and exposes three while serially staging twenty; converting its count-1 panel to 14 would retain a fundamentally false opening and invent direct ownership.",
    evidence: [TRUTH_101_200, REPORT],
  },
] as const satisfies readonly CompetitorSingleFieldContractBatchIBlocker[];

export const COMPETITOR_SINGLE_FIELD_CONTRACT_BATCH_I_REJECTED_PROBES = [
  {
    levelId: 115,
    candidate: "video-positioned V3 numeric ice: b02=3, b05=9, b03=3, b01=9; remove ice from b04",
    validation: "pass",
    maxStates: 30_000,
    termination: "exhausted",
    exploredStates: 4,
    puzzleModelReplay: false,
  },
  {
    levelId: 150,
    candidate: "preserve both left mouths and change frozen values from [6,7] to [7,7]",
    validation: "pass",
    maxStates: 30_000,
    termination: "max_states",
    exploredStates: 30_000,
    puzzleModelReplay: false,
  },
  {
    levelId: 162,
    candidate: "remove all three ordinary gates and retain the five exact flip doors",
    validation: "pass",
    maxStates: 30_000,
    termination: "static_unsat",
    exploredStates: 0,
    missingCompatibleExitLayerCount: 7,
    puzzleModelReplay: false,
  },
] as const;

/** No requested level has a complete evidence + physical + replay certificate. */
export const applyCompetitorSingleFieldContractBatchI = (source: LevelSpec): LevelSpec => source;
