import type { LevelSpec } from "./types";

/**
 * Candidate batch for the remaining Lv1-100 player-facing shutter contracts.
 *
 * This module deliberately stays out of `levels.ts` until every accepted level
 * has all of the following evidence at the same time:
 *
 * - source/video-certified visible panel rectangles and counter values;
 * - the exact, directly bound hidden cohort (no staging indirection);
 * - ordinary-shutter coverage and `validateLevel` clean;
 * - opening same-colour adjacency clean;
 * - a fresh <=30,000-state solver proof and complete PuzzleModel replay; and
 * - generator centre-mouth / unfrozen-cargo checks where applicable.
 *
 * The first audit found no candidate that satisfies the entire conjunction.
 * Returning the source object is intentional: an uncertified visual-only or
 * staging-backed replacement would be worse than an explicit blocker.
 */
export const COMPETITOR_LATE_SHUTTER_CONTRACT_1_TO_100_VERSION =
  "competitor-late-shutter-contracts-1-100-candidate-r1" as const;

export const COMPETITOR_LATE_SHUTTER_CONTRACT_1_TO_100_REQUESTED_LEVEL_IDS = [
  29, 34, 38, 39, 41, 44, 49, 59, 62, 64, 67, 69, 71, 74, 79, 84, 89, 91, 92, 93, 94, 95, 99,
] as const;

/** No level is silently promoted before its full evidence chain passes. */
export const COMPETITOR_LATE_SHUTTER_CONTRACT_1_TO_100_CERTIFIED_LEVEL_IDS = [] as const;

/** This candidate batch never substitutes an internal staging panel. */
export const COMPETITOR_LATE_SHUTTER_CONTRACT_1_TO_100_USES_STAGING_FALLBACK = false as const;

export type CompetitorLateShutterBlockerKind =
  | "authoritative-geometry-missing"
  | "authoritative-cohort-conflict"
  | "current-board-capacity-conflict"
  | "exact-packing-not-certified"
  | "fresh-solver-not-certified";

export interface CompetitorLateShutterBlocker {
  readonly levelId: number;
  readonly kinds: readonly CompetitorLateShutterBlockerKind[];
  /** Compact, machine-reviewable reason. */
  readonly reason: string;
  /** Repository-local evidence used by the audit. */
  readonly evidence: readonly string[];
}

const AUDIT = ".codex-temp/current-shutter-audit.md";
const STAGE2 = ".codex-temp/batch-b-stage2-results.md";
const PROBE = ".codex-temp/late-shutter-probe-results.json";

/**
 * Blockers are intentionally exhaustive for the requested batch.  A future
 * repair must remove an entry only after adding that level to the certified
 * list and supplying the corresponding focused proof.
 */
export const COMPETITOR_LATE_SHUTTER_CONTRACT_1_TO_100_BLOCKERS = [
  {
    levelId: 29,
    kinds: ["fresh-solver-not-certified"],
    reason: "Video-derived left/right 2x9 panels and exact 6/4 cohorts pass direct coverage and opening adjacency, but the current-board candidate exhausts with no legal first action; a shutter-only exact solution is not certified.",
    evidence: [PROBE, ".codex-temp/video-audit-21-30-independent/10fps/lv29-reveals/f-0030.jpg"],
  },
  {
    levelId: 34,
    kinds: ["fresh-solver-not-certified"],
    reason: "Video-derived 4x6 and 3x6 panels with exact 8/5 V3 cohorts pass coverage and opening adjacency, but the current exit contract leaves the candidate with no legal first action.",
    evidence: [PROBE, ".codex-temp/video31-40/lv34_open_crop.png"],
  },
  {
    levelId: 38,
    kinds: ["authoritative-geometry-missing", "exact-packing-not-certified"],
    reason: "Truth fixes count 15 and an eight-piece H3x7+CROSS5 cohort, while the raw 2x1 panel is a placeholder; no numeric video-certified rectangle plus direct packing has passed the full gate.",
    evidence: [AUDIT],
  },
  {
    levelId: 39,
    kinds: ["authoritative-geometry-missing", "exact-packing-not-certified"],
    reason: "Truth fixes three panels (15/22/5) and 11/6/4 direct cohorts, but raw/current geometry is a single placeholder panel and the three exact rectangles have not been numerically recovered.",
    evidence: [AUDIT],
  },
  {
    levelId: 41,
    kinds: ["current-board-capacity-conflict"],
    reason: "The source top panel is 4x3 (12 cells), but its exact five-piece SINGLE+V3x4 cohort occupies 13 cells; direct, non-overlapping coverage is mathematically impossible on that rectangle.",
    evidence: [AUDIT, ".codex-temp/batch-b-capacity-summary.mjs"],
  },
  {
    levelId: 44,
    kinds: ["authoritative-cohort-conflict", "current-board-capacity-conflict"],
    reason: "Per-panel ownership is not authoritative, and multiple narrow source panels cannot contain the currently attributed non-linear pieces; assigning a display rectangle without the exact direct cohort would violate the contract.",
    evidence: [AUDIT, STAGE2],
  },
  {
    levelId: 49,
    kinds: ["current-board-capacity-conflict"],
    reason: "The three source panels total 29 cells while the known 17-piece direct cohort occupies 33 cells; the missing per-panel split cannot make a strict direct packing possible.",
    evidence: [AUDIT, ".codex-temp/batch-b-capacity-summary.mjs"],
  },
  {
    levelId: 59,
    kinds: ["authoritative-geometry-missing", "exact-packing-not-certified"],
    reason: "Truth fixes two counters (6/12) and two four-piece cohorts, but the raw runtime source has only one 1x1 placeholder; exact visible rectangles and ownership are not numerically certified.",
    evidence: [AUDIT],
  },
  {
    levelId: 62,
    kinds: ["current-board-capacity-conflict"],
    reason: "The source panel is 4x2 (8 cells), while its exact six-piece cohort occupies 18 cells, so strict direct coverage cannot be restored on the current source rectangle.",
    evidence: [AUDIT, ".codex-temp/batch-b-capacity-summary.mjs"],
  },
  {
    levelId: 64,
    kinds: ["authoritative-geometry-missing", "exact-packing-not-certified"],
    reason: "Truth requires three panels (5/8/13) with 4/5/6 pieces; the raw source exposes only a 1x1 placeholder and lacks numeric exact rectangles.",
    evidence: [AUDIT],
  },
  {
    levelId: 67,
    kinds: ["authoritative-cohort-conflict"],
    reason: "Truth identifies one hidden SINGLE at count 3, while the recoverable raw direct cohort is a V2; the authoritative block identity needed for a shape-preserving repair is unresolved.",
    evidence: [AUDIT],
  },
  {
    levelId: 69,
    kinds: ["fresh-solver-not-certified"],
    reason: "All four source rectangles and exact direct cohorts can be packed and validated, but the base and seven minimal one-for-one variants exhaust without a replayable solution.",
    evidence: [STAGE2, ".codex-temp/direct-shutter-candidates.json"],
  },
  {
    levelId: 71,
    kinds: ["current-board-capacity-conflict"],
    reason: "The exact upper panel is 7x4 (28 cells), but its nine-piece direct cohort occupies 29 cells; the rectangle also intersects current non-playable cells.",
    evidence: [STAGE2, ".codex-temp/batch-b-capacity-summary.mjs"],
  },
  {
    levelId: 74,
    kinds: ["current-board-capacity-conflict", "fresh-solver-not-certified"],
    reason: "Source panel capacity is 44 cells versus 46 direct-cohort cells. Six minimal exchange candidates were also tested; none produced a replayable <=30k proof.",
    evidence: [STAGE2, ".codex-temp/batch-b-capacity-summary.mjs"],
  },
  {
    levelId: 79,
    kinds: ["current-board-capacity-conflict"],
    reason: "The two exact panels total 60 cells versus 61 direct-cohort cells, and the lower source rectangle intersects current non-playable cells.",
    evidence: [STAGE2, ".codex-temp/batch-b-capacity-summary.mjs"],
  },
  {
    levelId: 84,
    kinds: ["current-board-capacity-conflict", "exact-packing-not-certified"],
    reason: "Four source panels provide 33 cells for 42 hidden cells; at least four opening/cohort exchanges are required, so no minimal exact direct repair is certified.",
    evidence: [STAGE2, ".codex-temp/batch-b-capacity-summary.mjs"],
  },
  {
    levelId: 89,
    kinds: ["exact-packing-not-certified"],
    reason: "No complete exact-panel packing exists with zero or one opening/cohort exchange; a wider cohort reconstruction has no fresh solver/replay certificate.",
    evidence: [STAGE2],
  },
  {
    levelId: 91,
    kinds: ["current-board-capacity-conflict", "authoritative-cohort-conflict"],
    reason: "The exact top panel is 4x3 (12 cells), but truth assigns SINGLE+V3x4 (13 cells). The previously solvable 4/6 split is rejected because truth requires 5/5 direct ownership.",
    evidence: [STAGE2, ".codex-temp/batch-b-cohort-search-91.json"],
  },
  {
    levelId: 92,
    kinds: ["authoritative-geometry-missing", "exact-packing-not-certified"],
    reason: "Truth fixes count 17 and a 13-piece cohort, but the raw 1x1 panel is a placeholder and no numeric video-certified rectangle/direct packing has passed the full gate.",
    evidence: [AUDIT],
  },
  {
    levelId: 93,
    kinds: ["authoritative-geometry-missing", "current-board-capacity-conflict"],
    reason: "Truth requires 4/7 direct cohorts at counts 18/14, while both current panels are 1x1 placeholders; exact visible rectangles are not numerically authoritative.",
    evidence: [AUDIT],
  },
  {
    levelId: 94,
    kinds: ["current-board-capacity-conflict"],
    reason: "Four source panels total 45 cells versus 51 direct-cohort cells, and one source rectangle intersects a current non-playable cell.",
    evidence: [STAGE2, ".codex-temp/batch-b-capacity-summary.mjs"],
  },
  {
    levelId: 95,
    kinds: ["authoritative-geometry-missing", "exact-packing-not-certified"],
    reason: "Truth fixes count 17 and a 13-piece cohort, but the raw 1x1 panel is a placeholder and exact direct geometry is not numerically certified.",
    evidence: [AUDIT],
  },
  {
    levelId: 99,
    kinds: ["current-board-capacity-conflict", "authoritative-cohort-conflict"],
    reason: "The three source panels total 26 cells for 27 hidden cells, their per-panel ownership is unresolved, and two rectangles intersect current non-playable cells.",
    evidence: [STAGE2, ".codex-temp/batch-b-capacity-summary.mjs"],
  },
] as const satisfies readonly CompetitorLateShutterBlocker[];

/**
 * Candidate-only entry point.  It is a referential no-op until at least one
 * level earns the complete evidence chain documented above.
 */
export const applyCompetitorLateShutterContract1To100 = (source: LevelSpec): LevelSpec => source;
