import type { LevelSpec } from "./types";

/**
 * Evidence-only Lv77/Lv79/Lv84/Lv88/Lv89/Lv92/Lv93/Lv94 mechanism batch.
 *
 * Every requested level still has either a source-geometry conflict or no
 * fresh solver/replay certificate.  The apply function is deliberately a
 * no-op: matching only the displayed counter values is not a safe repair.
 * This module is intentionally not wired into `levels.ts`.
 */
export const COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_E_VERSION =
  "competitor-mid-exit-structural-batch-e-r1" as const;

export const COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_E_REQUESTED_LEVEL_IDS = [
  77, 79, 84, 88, 89, 92, 93, 94,
] as const;

export const COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_E_CERTIFIED_LEVEL_IDS = [] as const;

export const COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_E_USES_STAGING_FALLBACK = false as const;

export const applyCompetitorMidExitStructuralBatchE = (source: LevelSpec): LevelSpec => source;

const TRUTH =
  "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json";
const SCREENSHOTS =
  "deliverables/competitor-screenshots/BlockOut-competitor-levels-001-100-2026-06/levels";
const VIDEO_71_80 = "C:/Users/Administrator/Desktop/block out/参考视频/71-80.mp4";
const VIDEO_81_90 = "C:/Users/Administrator/Desktop/block out/参考视频/81-90.mp4";
const VIDEO_91_100 = "C:/Users/Administrator/Desktop/block out/参考视频/91-100.mp4";
const REPORT =
  "playtest-results/experiments/competitor-mid-exit-structural-batch-e-2026-09-21/report.json";
const SHUTTER_REPORT =
  "playtest-results/experiments/competitor-shutter-structural-batch-c-2026-09-21/report.json";

export type CompetitorMidExitStructuralBatchEBlockerKind =
  | "source-opening-reconstruction-required"
  | "source-mouth-colour-unresolved"
  | "fresh-solver-not-certified"
  | "physical-panel-capacity-conflict"
  | "direct-cohort-adjacency-conflict";

export interface CompetitorMidExitStructuralBatchEBlocker {
  readonly levelId: 77 | 79 | 84 | 88 | 89 | 92 | 93 | 94;
  readonly kinds: readonly CompetitorMidExitStructuralBatchEBlockerKind[];
  readonly detail: string;
  readonly evidence: readonly string[];
}

export const COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_E_BLOCKERS = [
  {
    levelId: 77,
    kinds: ["source-opening-reconstruction-required", "fresh-solver-not-certified"],
    detail: "Source frames fix five physical mouths, frozen 8/15/2/19, two opening V3 numeric-ice blocks 6/18 and a three-piece generator. Restoring the five source colours on the present exact mask creates seven opening adjacency contacts; the current adjacency-clean six-colour packing has no compatible source exit for eight blocks. A bounded 500-candidate five-colour reconstruction produced no replayable completion.",
    evidence: [TRUTH, VIDEO_71_80, `${SCREENSHOTS}/competitor-level-077.jpg`, REPORT],
  },
  {
    levelId: 79,
    kinds: ["physical-panel-capacity-conflict"],
    detail: "The source count-10 direct cohort occupies 28 fixed-orientation cells, but its observed upper-right 4x6 panel has only 24 cells. Reassigning blocks to count-20 would contradict the per-cover reveal ledger.",
    evidence: [TRUTH, VIDEO_71_80, `${SCREENSHOTS}/competitor-level-079.jpg`, SHUTTER_REPORT, REPORT],
  },
  {
    levelId: 84,
    kinds: ["physical-panel-capacity-conflict"],
    detail: "The four source panels have capacities 9/6/6/12 while their direct cohorts require 12/9/6/15 cells. Three independently overflow their observed regions, so neither exit counters nor shells can be safely overlaid on the current non-physical staging substitute.",
    evidence: [TRUTH, VIDEO_81_90, `${SCREENSHOTS}/competitor-level-084.jpg`, SHUTTER_REPORT, REPORT],
  },
  {
    levelId: 88,
    kinds: ["source-mouth-colour-unresolved", "fresh-solver-not-certified"],
    detail: "Frames fix six local mouths and ordinary plus frozen 12/12/11/9/4, but the two count-12 mouths do not expose a unique logical colour mapping in the frozen opening. The raw-order exact-portal candidate validates, matches mechanism counts and has zero opening adjacency, yet still reaches max_states at 100,000 without a replay certificate.",
    evidence: [TRUTH, VIDEO_81_90, `${SCREENSHOTS}/competitor-level-088.jpg`, REPORT],
  },
  {
    levelId: 89,
    kinds: ["physical-panel-capacity-conflict"],
    detail: "The source count-7 middle panel has 14 cells, while its source-observed H2x2+V2+H3+V3x4 direct cohort occupies 21. Its generator, numeric ice and exits cannot make that clipped cohort physical.",
    evidence: [TRUTH, VIDEO_81_90, `${SCREENSHOTS}/competitor-level-089.jpg`, SHUTTER_REPORT, REPORT],
  },
  {
    levelId: 92,
    kinds: ["direct-cohort-adjacency-conflict"],
    detail: "Truth fixes a single count-17 cohort of 13 pieces/33 cells. The source-backed colour projection makes all 13 purple; bounded fixed-shape reconstruction finds no placement that avoids orthogonal same-colour contact.",
    evidence: [TRUTH, VIDEO_91_100, `${SCREENSHOTS}/competitor-level-092.jpg`, SHUTTER_REPORT, REPORT],
  },
  {
    levelId: 93,
    kinds: ["physical-panel-capacity-conflict"],
    detail: "The count-18 and count-14 source rectangles hold 12 and 15 cells, while their observed direct cohorts require 15 and 18. Both assignments are physically impossible without clipping, overlap, shape changes or invented staging.",
    evidence: [TRUTH, VIDEO_91_100, `${SCREENSHOTS}/competitor-level-093.jpg`, SHUTTER_REPORT, REPORT],
  },
  {
    levelId: 94,
    kinds: ["physical-panel-capacity-conflict"],
    detail: "The count-16/count-20/count-8/count-5 rectangles hold 9/12/12/12 cells but their exact cohorts require 13/13/13/12. Three covers overflow their own observed panels, so aggregate reshuffling is not source-faithful.",
    evidence: [TRUTH, VIDEO_91_100, `${SCREENSHOTS}/competitor-level-094.jpg`, SHUTTER_REPORT, REPORT],
  },
] as const satisfies readonly CompetitorMidExitStructuralBatchEBlocker[];
