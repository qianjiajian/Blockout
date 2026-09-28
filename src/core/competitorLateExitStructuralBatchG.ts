import type { LevelSpec } from "./types";

/**
 * Evidence-only late exit/star batch G.
 *
 * Every requested level still lacks at least one source fact or a replayable
 * candidate.  The apply function is deliberately a reference-preserving
 * no-op: guessed colours/mouths, invented keys, resized covers and solver-only
 * fallback rails are not acceptable parity repairs.
 *
 * This module is intentionally not wired into `levels.ts`.
 */
export const COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_G_VERSION =
  "competitor-late-exit-structural-batch-g-r1" as const;

export const COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_G_REQUESTED_LEVEL_IDS = [
  126, 128, 131, 134, 135, 138, 139, 140, 145, 146,
] as const;

export const COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_G_CERTIFIED_LEVEL_IDS = [] as const;

export const COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_G_USES_STAGING_FALLBACK = false as const;

export const applyCompetitorLateExitStructuralBatchG = (source: LevelSpec): LevelSpec => source;

const TRUTH =
  "deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json";
const GENERATED = "src/core/videoParityLevels101To200.generated.ts";
const REPORT =
  "playtest-results/experiments/competitor-late-exit-structural-batch-g-2026-09-21/report.json";
const VIDEO_121_130 = "C:/Users/Administrator/Desktop/block out/参考视频/121-130.mp4";
const VIDEO_130_134 = "C:/Users/Administrator/Desktop/block out/参考视频/130-134.mp4";
const VIDEO_134_137 = "C:/Users/Administrator/Desktop/block out/参考视频/134-137.mp4";
const VIDEO_137_144 = "C:/Users/Administrator/Desktop/block out/参考视频/137-144.mp4";
const VIDEO_145_149 = "C:/Users/Administrator/Desktop/block out/参考视频/145-149.mp4";

export type CompetitorLateExitStructuralBatchGBlockerKind =
  | "source-mouth-binding-unclear"
  | "source-composition-incomplete"
  | "source-cover-cohort-incomplete"
  | "source-star-inventory-incomplete"
  | "source-key-inventory-incomplete"
  | "opening-adjacency-conflict"
  | "all-block-adjacency-conflict"
  | "static-unsat"
  | "fresh-solver-not-certified";

export interface CompetitorLateExitStructuralBatchGBlocker {
  readonly levelId: 126 | 128 | 131 | 134 | 135 | 138 | 139 | 140 | 145 | 146;
  readonly kinds: readonly CompetitorLateExitStructuralBatchGBlockerKind[];
  readonly reason: string;
  readonly evidence: readonly string[];
}

export const COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_G_BLOCKERS = [
  {
    levelId: 126,
    kinds: ["source-mouth-binding-unclear", "source-cover-cohort-incomplete", "static-unsat"],
    reason: "Truth fixes one red ordinary exit, six frozen counters 3/5/8/12/14/16 and two count-12 covers, but explicitly leaves every frozen colour/size/offset and both hidden cohorts unclear. The raw exact-count projection is adjacency-clean yet has eight missing-compatible-exit contradictions; assigning the six counters to colours would therefore be invented data.",
    evidence: [TRUTH, VIDEO_121_130, GENERATED, REPORT],
  },
  {
    levelId: 128,
    kinds: ["source-mouth-binding-unclear", "source-cover-cohort-incomplete", "opening-adjacency-conflict", "static-unsat"],
    reason: "Truth proves green-left and red-bottom ordinary exits plus frozen 10/12/15/28 and one count-15 top cover, but the four frozen colours/mouth spans and the hidden cohort remain unknown. The raw projection has ten opening same-colour contacts and six static exit contradictions, so neither recolouring nor a frozen-value permutation is certifiable.",
    evidence: [TRUTH, VIDEO_121_130, GENERATED, REPORT],
  },
  {
    levelId: 131,
    kinds: ["source-composition-incomplete", "source-mouth-binding-unclear", "source-star-inventory-incomplete", "opening-adjacency-conflict", "static-unsat"],
    reason: "The frame proves two star exits and at least four star blocks, but board extent, opening shape segmentation, full star inventory, frozen-exit colours/sizes and the count-5 cover rectangle are all explicitly partial. The raw projection already misses the real cover contract, has two opening contacts and seven static exit contradictions; reducing four runtime star exits to two would guess which starred colours survive.",
    evidence: [TRUTH, VIDEO_130_134, GENERATED, REPORT],
  },
  {
    levelId: 134,
    kinds: ["source-composition-incomplete", "source-mouth-binding-unclear", "source-key-inventory-incomplete", "all-block-adjacency-conflict", "static-unsat"],
    reason: "Truth records one purple lock requiring three keys but explicitly marks the key count and exact board/full inventory unknown. The raw projection contains only one matching key, yielding a formal insufficient-keys contradiction, plus two frozen-exit deadlocks, five hidden-block adjacency contacts and unresolved frozen mouth colours; adding two keys is forbidden without source evidence.",
    evidence: [TRUTH, VIDEO_130_134, GENERATED, REPORT],
  },
  {
    levelId: 135,
    kinds: ["source-mouth-binding-unclear", "opening-adjacency-conflict", "fresh-solver-not-certified"],
    reason: "The 6x8 board, 17-piece opening and 2x8 count-10 cover with direct cohort V3x3+SQ2 are source-backed, but all five exit offsets remain explicitly unclear. The raw projection has three opening contacts and eight static exit contradictions. Restoring the exact panel and four-piece cohort on the current adjacency-clean runtime validates and preserves 17 visible pieces, but still reaches 100,000 states without a solution or replay.",
    evidence: [TRUTH, VIDEO_134_137, GENERATED, REPORT],
  },
  {
    levelId: 138,
    kinds: ["source-composition-incomplete", "source-mouth-binding-unclear", "source-cover-cohort-incomplete", "opening-adjacency-conflict", "static-unsat"],
    reason: "Truth leaves the full inventory, both frozen colours/sizes/offsets, two of three cover cohorts and the generator mouth/trigger unresolved. The raw exact-count projection has one opening contact, four all-block contacts and nineteen missing-compatible-exit contradictions, so a complete exit/generator repair would require guessed source bindings.",
    evidence: [TRUTH, VIDEO_137_144, GENERATED, REPORT],
  },
  {
    levelId: 139,
    kinds: ["source-composition-incomplete", "source-mouth-binding-unclear", "source-cover-cohort-incomplete", "all-block-adjacency-conflict", "static-unsat"],
    reason: "All nine frozen values are visible, but every frozen colour/size/offset, both hidden cohorts, the generator mouth/trigger and the full composition remain unknown. The raw projection is opening-clean but has ten hidden/all-block contacts and twelve static exit contradictions; assigning nine counters to physical coloured mouths cannot be derived from the opening.",
    evidence: [TRUTH, VIDEO_137_144, GENERATED, REPORT],
  },
  {
    levelId: 140,
    kinds: ["source-composition-incomplete", "source-mouth-binding-unclear", "source-cover-cohort-incomplete", "static-unsat"],
    reason: "Truth proves three frozen counters 2/3/4 and four vertical-axis V3 blocks, but leaves every frozen colour/size/offset, the count-8 hidden cohort and the full inventory unknown. Although the raw projection is adjacency-clean, it has eleven missing-compatible-exit contradictions, so no replayable colour-to-mouth assignment is source-certified.",
    evidence: [TRUTH, VIDEO_137_144, GENERATED, REPORT],
  },
  {
    levelId: 145,
    kinds: ["source-mouth-binding-unclear", "source-cover-cohort-incomplete", "opening-adjacency-conflict", "static-unsat"],
    reason: "Truth fixes the 7x9 mask, eleven V3 opening blocks and count-9 hidden histogram, but all exit offsets/spans, all frozen colours and the staged-frame classification remain unclear. The raw projection omits the staged frame, has three opening contacts, eight missing-exit contradictions and an orange frozen-18 deadlock; moving its four-block cohort into the current staged layout also creates an active overlap.",
    evidence: [TRUTH, VIDEO_145_149, GENERATED, REPORT],
  },
  {
    levelId: 146,
    kinds: ["source-composition-incomplete", "source-mouth-binding-unclear", "source-cover-cohort-incomplete", "source-star-inventory-incomplete", "opening-adjacency-conflict", "static-unsat"],
    reason: "Truth proves one purple star exit and one visible star block, but leaves its shape plus all four cover anchors/cohorts and every frozen colour/size/offset unresolved. The raw projection uses a different star colour, has one opening/two all-block contacts and ten static exit contradictions, so rebinding the star or frozen mouths would be speculative.",
    evidence: [TRUTH, VIDEO_145_149, GENERATED, REPORT],
  },
] as const satisfies readonly CompetitorLateExitStructuralBatchGBlocker[];

export interface CompetitorLateExitStructuralBatchGRawAudit {
  readonly levelId: number;
  readonly mechanismIssueCount: number;
  readonly openingAdjacencyPairCount: number;
  readonly allBlockAdjacencyPairCount: number;
  readonly staticUnsatReasonCount: number;
  readonly termination: "exhausted";
  readonly exploredStates: 0;
  readonly replayComplete: false;
}

/** Fresh audit of the untouched compact 101-200 projection at 30k states. */
export const COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_G_RAW_AUDITS = [
  { levelId: 126, mechanismIssueCount: 0, openingAdjacencyPairCount: 0, allBlockAdjacencyPairCount: 0, staticUnsatReasonCount: 8, termination: "exhausted", exploredStates: 0, replayComplete: false },
  { levelId: 128, mechanismIssueCount: 0, openingAdjacencyPairCount: 10, allBlockAdjacencyPairCount: 10, staticUnsatReasonCount: 6, termination: "exhausted", exploredStates: 0, replayComplete: false },
  { levelId: 131, mechanismIssueCount: 2, openingAdjacencyPairCount: 2, allBlockAdjacencyPairCount: 2, staticUnsatReasonCount: 7, termination: "exhausted", exploredStates: 0, replayComplete: false },
  { levelId: 134, mechanismIssueCount: 0, openingAdjacencyPairCount: 0, allBlockAdjacencyPairCount: 5, staticUnsatReasonCount: 9, termination: "exhausted", exploredStates: 0, replayComplete: false },
  { levelId: 135, mechanismIssueCount: 0, openingAdjacencyPairCount: 3, allBlockAdjacencyPairCount: 6, staticUnsatReasonCount: 8, termination: "exhausted", exploredStates: 0, replayComplete: false },
  { levelId: 138, mechanismIssueCount: 0, openingAdjacencyPairCount: 1, allBlockAdjacencyPairCount: 4, staticUnsatReasonCount: 19, termination: "exhausted", exploredStates: 0, replayComplete: false },
  { levelId: 139, mechanismIssueCount: 0, openingAdjacencyPairCount: 0, allBlockAdjacencyPairCount: 10, staticUnsatReasonCount: 12, termination: "exhausted", exploredStates: 0, replayComplete: false },
  { levelId: 140, mechanismIssueCount: 0, openingAdjacencyPairCount: 0, allBlockAdjacencyPairCount: 0, staticUnsatReasonCount: 11, termination: "exhausted", exploredStates: 0, replayComplete: false },
  { levelId: 145, mechanismIssueCount: 1, openingAdjacencyPairCount: 3, allBlockAdjacencyPairCount: 3, staticUnsatReasonCount: 9, termination: "exhausted", exploredStates: 0, replayComplete: false },
  { levelId: 146, mechanismIssueCount: 0, openingAdjacencyPairCount: 1, allBlockAdjacencyPairCount: 2, staticUnsatReasonCount: 10, termination: "exhausted", exploredStates: 0, replayComplete: false },
] as const satisfies readonly CompetitorLateExitStructuralBatchGRawAudit[];

export const COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_G_LV135_EXACT_PANEL_AUDIT = {
  panel: { x: 0, y: 0, width: 2, height: 8, count: 10 },
  openingPieceCount: 17,
  directCohortPieceCount: 4,
  directCohortShapeHistogram: { V3: 3, SQ2: 1 },
  validatePass: true,
  adjacencyPairCount: 0,
  solverStateLimit: 100_000,
  solverTermination: "max_states",
  replayComplete: false,
} as const;
