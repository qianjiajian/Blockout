import type { LevelSpec } from "./types";

/**
 * Evidence-only late mechanism batch K (Lv160/Lv163-167/Lv169-174).
 *
 * None of the requested levels currently has a source-complete, adjacency-clean
 * and replay-certified projection.  The no-op is intentional: it prevents
 * inferred frozen-gate colours, invented covered cohorts, empty-panel staging
 * substitutions and solver-only fallback rails from being promoted as
 * competitor facts.
 *
 * This module is not wired into `levels.ts`.
 */
export const COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_K_VERSION =
  "competitor-late-mechanism-structural-batch-k-r1" as const;

export const COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_K_REQUESTED_LEVEL_IDS = [
  160, 163, 164, 165, 166, 167, 169, 170, 171, 172, 173, 174,
] as const;

export const COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_K_CERTIFIED_LEVEL_IDS = [] as const;

export const COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_K_USES_STAGING_FALLBACK = false as const;

export const applyCompetitorLateMechanismStructuralBatchK = (source: LevelSpec): LevelSpec => source;

const TRUTH =
  "deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json";
const GENERATED = "src/core/videoParityLevels101To200.generated.ts";
const REPORT =
  "playtest-results/experiments/competitor-late-mechanism-structural-batch-k-2026-09-21/report.json";
const VIDEO_149_161 = "C:/Users/Administrator/Desktop/block out/参考视频/149-161.mp4";
const VIDEO_162_166 = "C:/Users/Administrator/Desktop/block out/参考视频/162-166.mp4";
const VIDEO_166_169 = "C:/Users/Administrator/Desktop/block out/参考视频/166-169.mp4";
const VIDEO_169_176 = "C:/Users/Administrator/Desktop/block out/参考视频/169-176.mp4";

export type CompetitorLateMechanismStructuralBatchKLevelId =
  typeof COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_K_REQUESTED_LEVEL_IDS[number];

export type CompetitorLateMechanismStructuralBatchKBlockerKind =
  | "source-full-composition-incomplete"
  | "source-mouth-colour-unresolved"
  | "source-covered-cohort-incomplete"
  | "source-mechanism-class-unresolved"
  | "source-opening-footprints-incomplete"
  | "exact-portal-overlap"
  | "opening-adjacency-conflict"
  | "physical-coverage-incomplete"
  | "runtime-model-gap"
  | "static-unsat"
  | "fresh-solver-not-certified";

export interface CompetitorLateMechanismStructuralBatchKBlocker {
  readonly levelId: CompetitorLateMechanismStructuralBatchKLevelId;
  readonly kinds: readonly CompetitorLateMechanismStructuralBatchKBlockerKind[];
  readonly reason: string;
  readonly evidence: readonly string[];
}

/**
 * Source-backed rejection reasons.  Each row distinguishes visible mechanism
 * counts from the missing data needed to make those mechanisms executable.
 */
export const COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_K_BLOCKERS = [
  {
    levelId: 160,
    kinds: ["source-full-composition-incomplete", "source-mouth-colour-unresolved", "source-covered-cohort-incomplete", "opening-adjacency-conflict", "static-unsat"],
    reason: "The video fixes the 7x9 mask, 18-piece opening, one 7x5 count-13 cover, one cyan ordinary exit and frozen counters 5/9/14/19/20, but leaves the complete hidden inventory, the covered cohort and every frozen colour/offset/span unresolved. The untouched projection has six same-colour contacts, six missing-compatible-exit contradictions and frozen-value deadlocks for 19 and 20, so restoring only the visible counters would not produce a source-exact playable level.",
    evidence: [TRUTH, VIDEO_149_161, GENERATED, REPORT],
  },
  {
    levelId: 163,
    kinds: ["source-mouth-colour-unresolved", "source-mechanism-class-unresolved", "exact-portal-overlap", "opening-adjacency-conflict", "static-unsat"],
    reason: "The 7x11 mask, 28-piece inventory, two star blocks and the three right-rim Flip Doors (pink open at 5, purple closed at 7, cyan closed at 9) are source-exact, but all seven frozen mouth colours/spans, the star-exit route and the circular-count-40 mechanism class remain unresolved. The current generic right exits physically overlap the exact Flip Door rails; the untouched projection has three same-colour contacts and eleven static exit contradictions. Moving or recolouring those exits would therefore guess source data.",
    evidence: [TRUTH, VIDEO_162_166, GENERATED, REPORT],
  },
  {
    levelId: 164,
    kinds: ["source-full-composition-incomplete", "source-mouth-colour-unresolved", "source-covered-cohort-incomplete", "opening-adjacency-conflict", "static-unsat"],
    reason: "Truth fixes the 7x10 mask, nine-piece opening and count-22/count-9/count-3 panel rectangles, but the full hidden inventory, all three direct cohorts and six frozen colour/physical bindings are explicitly unclear. The raw projection contains three same-colour contacts and sixteen static contradictions, including a frozen-34 deadlock, so its inferred pooled hidden batches are not certifiable competitor cohorts.",
    evidence: [TRUTH, VIDEO_162_166, GENERATED, REPORT],
  },
  {
    levelId: 165,
    kinds: ["source-full-composition-incomplete", "source-mouth-colour-unresolved", "source-covered-cohort-incomplete", "source-mechanism-class-unresolved", "opening-adjacency-conflict", "static-unsat"],
    reason: "The opening proves two long count-5/count-7 covers and two visible keys, but the full inventory, both covered cohorts, frozen mouth colours and the lock count/group identity remain unknown. The raw exact-count projection has five same-colour contacts and ten missing-compatible-exit contradictions. Publishing its alternating inferred cohorts or the current one-lock interpretation would invent facts not visible in the source.",
    evidence: [TRUTH, VIDEO_162_166, GENERATED, REPORT],
  },
  {
    levelId: 166,
    kinds: ["source-full-composition-incomplete", "source-mouth-colour-unresolved", "source-covered-cohort-incomplete", "source-mechanism-class-unresolved", "opening-adjacency-conflict", "static-unsat", "fresh-solver-not-certified"],
    reason: "The opening proves a V3 numeric-ice block at 18, count-4/count-15 covers and seven frozen values, but their hidden cohorts, frozen colours and the third empty-frame classification are unresolved. Final runtime currently binds ice-18 to a hidden SINGLE instead of the opening V3; moving the counter to the exact carrier preserves counts but did not obtain a bounded fresh solve/replay certificate. The raw projection also has one same-colour contact and six static exit contradictions.",
    evidence: [TRUTH, VIDEO_166_169, GENERATED, REPORT],
  },
  {
    levelId: 167,
    kinds: ["source-full-composition-incomplete", "source-mouth-colour-unresolved", "source-covered-cohort-incomplete", "physical-coverage-incomplete", "opening-adjacency-conflict", "static-unsat"],
    reason: "Truth fixes the 7x11 mask, 14-piece opening and two 4x4 covers at counts 15 and 9, but records neither hidden cohort nor the four frozen colour/spans. The untouched projection has no direct cohort for either panel, five same-colour contacts, two missing-compatible exits and a frozen-15 deadlock, so the missing blocks cannot be synthesized or assigned to panels safely.",
    evidence: [TRUTH, VIDEO_166_169, GENERATED, REPORT],
  },
  {
    levelId: 169,
    kinds: ["source-full-composition-incomplete", "source-mouth-colour-unresolved", "source-covered-cohort-incomplete", "opening-adjacency-conflict", "static-unsat"],
    reason: "The three count-2/count-7/count-16 panel rectangles and eight-piece opening are visible, while the complete inventory, all three cohort histograms and four frozen colour/spans are not. The raw inferred projection has two same-colour contacts, two missing red exits and frozen deadlocks at 15 and 23. Recolouring those mouths or accepting the inferred pooled batches would exceed the source evidence.",
    evidence: [TRUTH, VIDEO_166_169, GENERATED, REPORT],
  },
  {
    levelId: 170,
    kinds: ["source-mouth-colour-unresolved", "source-opening-footprints-incomplete", "opening-adjacency-conflict", "static-unsat"],
    reason: "Truth proves ten frozen values, one yellow ordinary exit, one red star exit, five star-block shape/colour bindings and a 3x3 numeric-ice-5 block, but frozen colours and one irregular star footprint remain unclear and the opening histogram is partial. Final runtime binds numeric ice to an H2 and recolours four star blocks; the untouched exact-count projection has two same-colour contacts and eleven missing-compatible-exit contradictions. A gate/star-only overlay cannot restore the source opening safely.",
    evidence: [TRUTH, VIDEO_169_176, GENERATED, REPORT],
  },
  {
    levelId: 171,
    kinds: ["source-mouth-colour-unresolved", "source-covered-cohort-incomplete", "physical-coverage-incomplete", "runtime-model-gap", "static-unsat"],
    reason: "Video frames fix the two disconnected 8x5 components, five simultaneous count-12 cover rectangles and three post-cover star blocks (green L4, purple H3, red V2). They do not map a direct cohort to each visual panel, and the post-cover frame proves that at least two panels cover empty cells. The current runtime contract permits only one shutterId per hidden block and the raw projection therefore reports three missing direct cohorts; it also has no executable exits and fifteen static contradictions. Collapsing five panels to one or turning the central panel into staging would violate the observed geometry.",
    evidence: [TRUTH, `${VIDEO_169_176}#t=220`, `${VIDEO_169_176}#t=270`, GENERATED, REPORT],
  },
  {
    levelId: 172,
    kinds: ["source-full-composition-incomplete", "source-mouth-colour-unresolved", "source-covered-cohort-incomplete", "opening-adjacency-conflict", "static-unsat"],
    reason: "Truth fixes a 5x7 count-13 panel, six shell colour pairs and three axis blocks, but the exact opening histogram, full hidden composition, direct cohort and all eight frozen colours remain unknown. The raw projection substitutes a 1x1 staging cover, has two same-colour contacts and six static exit contradictions. Expanding the visible panel without its source cohort or assigning frozen colours by palette would be speculative.",
    evidence: [TRUTH, VIDEO_169_176, GENERATED, REPORT],
  },
  {
    levelId: 173,
    kinds: ["source-full-composition-incomplete", "source-mouth-colour-unresolved", "source-covered-cohort-incomplete", "physical-coverage-incomplete", "opening-adjacency-conflict", "static-unsat"],
    reason: "The 8x12 mask, count-17 8x3 panel and eight frozen values are visible, but the opening histogram is partial, the full/hidden inventory is unknown and frozen colours are unrecorded. The raw panel has no direct hidden cohort, four same-colour contacts and seven missing-compatible-exit contradictions. No exact block set can currently be bound to the observed rectangle.",
    evidence: [TRUTH, VIDEO_169_176, GENERATED, REPORT],
  },
  {
    levelId: 174,
    kinds: ["source-full-composition-incomplete", "source-mouth-colour-unresolved", "source-covered-cohort-incomplete", "physical-coverage-incomplete", "static-unsat"],
    reason: "Truth fixes four panel rectangles at 7/12/22/16 and one yellow/red V3 shell, but the opening histogram is partial, the complete hidden inventory and all four cohort histograms are unknown, and six frozen colour bindings remain unclear. The raw projection leaves two panels without a direct cohort and has ten static contradictions, including frozen deadlocks at 18/25/28. The two inferred hidden pieces cannot stand in for four source batches.",
    evidence: [TRUTH, VIDEO_169_176, GENERATED, REPORT],
  },
] as const satisfies readonly CompetitorLateMechanismStructuralBatchKBlocker[];

export interface CompetitorLateMechanismStructuralBatchKRawAudit {
  readonly levelId: CompetitorLateMechanismStructuralBatchKLevelId;
  readonly validates: true;
  readonly allBlockAdjacencyPairCount: number;
  readonly physicalCoverageIssueCount: number;
  readonly staticUnsatReasonCount: number;
  readonly termination: "exhausted";
  readonly exploredStates: 0;
  readonly replayComplete: false;
}

/** Fresh audit of the untouched compact source projection at a 30k state cap. */
export const COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_K_RAW_AUDITS = [
  { levelId: 160, validates: true, allBlockAdjacencyPairCount: 6, physicalCoverageIssueCount: 1, staticUnsatReasonCount: 8, termination: "exhausted", exploredStates: 0, replayComplete: false },
  { levelId: 163, validates: true, allBlockAdjacencyPairCount: 3, physicalCoverageIssueCount: 0, staticUnsatReasonCount: 11, termination: "exhausted", exploredStates: 0, replayComplete: false },
  { levelId: 164, validates: true, allBlockAdjacencyPairCount: 3, physicalCoverageIssueCount: 0, staticUnsatReasonCount: 16, termination: "exhausted", exploredStates: 0, replayComplete: false },
  { levelId: 165, validates: true, allBlockAdjacencyPairCount: 5, physicalCoverageIssueCount: 0, staticUnsatReasonCount: 10, termination: "exhausted", exploredStates: 0, replayComplete: false },
  { levelId: 166, validates: true, allBlockAdjacencyPairCount: 1, physicalCoverageIssueCount: 0, staticUnsatReasonCount: 6, termination: "exhausted", exploredStates: 0, replayComplete: false },
  { levelId: 167, validates: true, allBlockAdjacencyPairCount: 5, physicalCoverageIssueCount: 2, staticUnsatReasonCount: 3, termination: "exhausted", exploredStates: 0, replayComplete: false },
  { levelId: 169, validates: true, allBlockAdjacencyPairCount: 2, physicalCoverageIssueCount: 0, staticUnsatReasonCount: 4, termination: "exhausted", exploredStates: 0, replayComplete: false },
  { levelId: 170, validates: true, allBlockAdjacencyPairCount: 2, physicalCoverageIssueCount: 0, staticUnsatReasonCount: 11, termination: "exhausted", exploredStates: 0, replayComplete: false },
  { levelId: 171, validates: true, allBlockAdjacencyPairCount: 0, physicalCoverageIssueCount: 3, staticUnsatReasonCount: 15, termination: "exhausted", exploredStates: 0, replayComplete: false },
  { levelId: 172, validates: true, allBlockAdjacencyPairCount: 2, physicalCoverageIssueCount: 0, staticUnsatReasonCount: 6, termination: "exhausted", exploredStates: 0, replayComplete: false },
  { levelId: 173, validates: true, allBlockAdjacencyPairCount: 4, physicalCoverageIssueCount: 1, staticUnsatReasonCount: 7, termination: "exhausted", exploredStates: 0, replayComplete: false },
  { levelId: 174, validates: true, allBlockAdjacencyPairCount: 0, physicalCoverageIssueCount: 2, staticUnsatReasonCount: 10, termination: "exhausted", exploredStates: 0, replayComplete: false },
] as const satisfies readonly CompetitorLateMechanismStructuralBatchKRawAudit[];
