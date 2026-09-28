import type { LevelSpec, Point, Side } from "./types";

/**
 * Evidence-only late exit/shutter batch H.
 *
 * No requested level currently owns a source-complete board, opening,
 * physical exit map and direct shutter cohort while also satisfying the
 * project-wide adjacency and fresh-solve contracts.  The public apply
 * function is deliberately a no-op: this batch never guesses a frozen-exit
 * colour, expands a playable mask, invents a portal, or substitutes staging.
 *
 * This module is intentionally not wired into `levels.ts`.
 */
export const COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_H_VERSION =
  "competitor-late-exit-structural-batch-h-r1" as const;

export const COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_H_REQUESTED_LEVEL_IDS = [
  107, 109, 111, 116, 119, 121, 122,
] as const;

export const COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_H_CERTIFIED_LEVEL_IDS = [] as const;

export const COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_H_USES_STAGING_FALLBACK = false as const;

const TRUTH =
  "deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json";
const OPENINGS = ".codex-temp/video-audit-101-134/opening-upscaled";
const FRAMES_101_110 = ".codex-temp/video-audit-101-134/101-110/frames-1fps";
const FRAMES_111_120 = ".codex-temp/video-audit-101-134/111-120/frames-1fps";
const FRAMES_121_130 = ".codex-temp/video-audit-101-134/121-130/frames-1fps";
const VIDEO_101_110 = "C:/Users/Administrator/Desktop/block out/参考视频/101-110.mp4";
const VIDEO_111_120 = "C:/Users/Administrator/Desktop/block out/参考视频/111-120.mp4";
const VIDEO_121_130 = "C:/Users/Administrator/Desktop/block out/参考视频/121-130.mp4";
const EXIT_AUDIT = "src/core/competitorLateExitContracts101To200.ts";
const OPENING_AUDIT_A = "src/core/openingCompositionFaithfulnessRepairs.ts";
const OPENING_AUDIT_B = "src/core/openingCompositionBatchBRepairs.ts";
const SHUTTER_AUDIT = "src/core/competitorLateShutterStructuralBatchD.ts";

export interface CompetitorLateExitObservedMouth {
  readonly visualPosition: string;
  readonly side: Side;
  readonly color: string;
  readonly frozen: number | null;
  readonly firstClearFrameSecond: number | null;
  /** Only recorded when the video fixes the complete logical span. */
  readonly offset: number | null;
  readonly size: number | null;
}

export interface CompetitorLateExitObservedMouthAudit {
  readonly levelId: 116 | 122;
  readonly openingSecond: number;
  readonly mouths: readonly CompetitorLateExitObservedMouth[];
  readonly limitation: string;
}

/**
 * Complete-playthrough colour facts that were not legible in truth-v1.
 * Lv116's inset cyan mouth and generator-adjacent lower chamber prevent these
 * facts from being promoted to GateSpec without an exact portal/seam map.
 */
export const COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_H_MOUTH_AUDITS = [
  {
    levelId: 116,
    openingSecond: 501,
    mouths: [
      { visualPosition: "upper-left outer", side: "left", color: "red", frozen: null, firstClearFrameSecond: null, offset: null, size: null },
      { visualPosition: "upper top-left", side: "top", color: "green", frozen: 7, firstClearFrameSecond: 515, offset: null, size: null },
      { visualPosition: "upper top-right", side: "top", color: "orange", frozen: 6, firstClearFrameSecond: 515, offset: null, size: null },
      { visualPosition: "upper-left inset underside", side: "left", color: "cyan", frozen: 8, firstClearFrameSecond: 520, offset: null, size: null },
      { visualPosition: "upper-right outer", side: "right", color: "blue", frozen: 4, firstClearFrameSecond: 510, offset: null, size: null },
      { visualPosition: "lower bottom-left", side: "bottom", color: "purple", frozen: 20, firstClearFrameSecond: 590, offset: null, size: null },
      { visualPosition: "lower bottom-right", side: "bottom", color: "green", frozen: 18, firstClearFrameSecond: 590, offset: null, size: null },
    ],
    limitation: "The video resolves all colours/counts, but truth-v1 omits opening anchors, cover rectangle, generator queues and the logical portal/seam coordinates for the inset count-8 mouth.",
  },
  {
    levelId: 122,
    openingSecond: 44,
    mouths: [
      { visualPosition: "left leg bottom", side: "bottom", color: "pink", frozen: null, firstClearFrameSecond: null, offset: 1, size: 1 },
      { visualPosition: "right leg bottom", side: "bottom", color: "blue", frozen: null, firstClearFrameSecond: null, offset: 4, size: 1 },
      { visualPosition: "head top", side: "top", color: "green", frozen: 15, firstClearFrameSecond: 120, offset: 2, size: 2 },
      { visualPosition: "head upper-left", side: "left", color: "yellow", frozen: 17, firstClearFrameSecond: 122, offset: 2, size: 1 },
      { visualPosition: "head lower-left", side: "left", color: "orange", frozen: 11, firstClearFrameSecond: 99, offset: 3, size: 2 },
      { visualPosition: "head upper-right", side: "right", color: "red", frozen: 17, firstClearFrameSecond: 122, offset: 2, size: 1 },
      { visualPosition: "head lower-right", side: "right", color: "cyan", frozen: 11, firstClearFrameSecond: 99, offset: 3, size: 2 },
    ],
    limitation: "The exit map is video-resolved, but the truth-v1 occupancy-derived mask omits central cells used later in the same playthrough.",
  },
] as const satisfies readonly CompetitorLateExitObservedMouthAudit[];

export interface CompetitorLateExitLv122AdjacencyConflict {
  readonly color: "green" | "pink";
  readonly leftDescription: string;
  readonly rightDescription: string;
  readonly touchingCells: readonly [Point, Point];
}

/** Two visible source-opening contacts at video second 44. */
export const COMPETITOR_LATE_EXIT_LV122_SOURCE_ADJACENCY_CONFLICTS = [
  {
    color: "green",
    leftDescription: "head H2 at row 2, columns 2-3",
    rightDescription: "head single at row 3, column 3",
    touchingCells: [[3, 2], [3, 3]],
  },
  {
    color: "pink",
    leftDescription: "head single at row 3, column 4",
    rightDescription: "head single at row 4, column 4",
    touchingCells: [[4, 3], [4, 4]],
  },
] as const satisfies readonly CompetitorLateExitLv122AdjacencyConflict[];

export type CompetitorLateExitStructuralBatchHBlockerKind =
  | "bounded-search-not-certified"
  | "direct-cohort-source-unclear"
  | "global-adjacency-contract-conflict"
  | "opening-reconstruction-required"
  | "physical-portal-map-unresolved"
  | "source-board-incomplete"
  | "source-composition-incomplete"
  | "source-mouth-geometry-unresolved"
  | "source-rectangle-unclear"
  | "truth-mask-playthrough-conflict";

export interface CompetitorLateExitStructuralBatchHBlocker {
  readonly levelId: 107 | 109 | 111 | 116 | 119 | 121 | 122;
  readonly kinds: readonly CompetitorLateExitStructuralBatchHBlockerKind[];
  readonly detail: string;
  readonly evidence: readonly string[];
}

export const COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_H_BLOCKERS = [
  {
    levelId: 107,
    kinds: ["source-board-incomplete", "source-composition-incomplete", "source-mouth-geometry-unresolved", "direct-cohort-source-unclear", "bounded-search-not-certified"],
    detail: "Truth-v1 fixes the 18-piece opening histogram, one blue ordinary exit, counters 3/4/12/9/8, four keys/locks and a count-7 cover, but leaves the board, full hidden composition, all five frozen colours/spans and the cover rectangle/cohort unresolved. The exact raw-palette search exhausts 19,857 states; the only adjacency-clean 18-piece probe also changes the observed green4/pink4 histogram to green5/pink3.",
    evidence: [TRUTH, VIDEO_101_110, `${OPENINGS}/level-107.png`, EXIT_AUDIT, OPENING_AUDIT_A],
  },
  {
    levelId: 109,
    kinds: ["source-board-incomplete", "source-composition-incomplete", "source-mouth-geometry-unresolved", "source-rectangle-unclear", "direct-cohort-source-unclear", "global-adjacency-contract-conflict"],
    detail: "The frame proves 16 opening pieces, six frozen counters, one red ordinary exit and three count-8 covers, but truth-v1 leaves the board/full inventory, all cover rectangles/cohorts and every frozen colour/span null. The authoritative 16-piece opening solves/replays but has three same-colour contacts; 3,000 coordinate-only probes were solver-unsat.",
    evidence: [TRUTH, VIDEO_101_110, `${OPENINGS}/level-109.png`, SHUTTER_AUDIT, OPENING_AUDIT_A],
  },
  {
    levelId: 111,
    kinds: ["source-board-incomplete", "source-composition-incomplete", "source-mouth-geometry-unresolved", "source-rectangle-unclear", "direct-cohort-source-unclear", "global-adjacency-contract-conflict"],
    detail: "Truth-v1 does not fix the board, opening shape histogram, full hidden inventory, count-14 lower cover rectangle/cohort or the ten frozen colour/span bindings. The authoritative 17-piece opening solves/replays but has three same-colour contacts; 3,000 coordinate-only probes were solver-unsat.",
    evidence: [TRUTH, VIDEO_111_120, `${OPENINGS}/level-111.png`, OPENING_AUDIT_A],
  },
  {
    levelId: 116,
    kinds: ["opening-reconstruction-required", "source-composition-incomplete", "source-rectangle-unclear", "physical-portal-map-unresolved"],
    detail: "The full playthrough resolves red ordinary plus frozen green7/orange6/cyan8/blue4/purple20/green18, the count-9 cover and two count-2 generators. Truth-v1 still omits visible anchors, the full shape inventory, exact cover rectangle, generator cargo/trigger and the logical inset-mouth coordinates. In particular the cyan count-8 mouth sits on the upper chamber's inset underside while the lower chamber has generator rims; projecting these facts to outer GateSpec rails would alter the established portal/seam contract.",
    evidence: [TRUTH, VIDEO_111_120, `${FRAMES_111_120}/sec-0501.jpg`, `${FRAMES_111_120}/sec-0520.jpg`, `${FRAMES_111_120}/sec-0590.jpg`, EXIT_AUDIT],
  },
  {
    levelId: 119,
    kinds: ["source-board-incomplete", "source-composition-incomplete", "source-mouth-geometry-unresolved", "source-rectangle-unclear", "direct-cohort-source-unclear"],
    detail: "The source proves 13 opening pieces, ordinary orange/blue, counters 18/10/8/6, three covers and two count-2 generators, but not the board, opening/full shapes, frozen colours/spans, cover rectangles/cohorts or generator cargo/trigger. A generated projection cannot be promoted without inventing each missing contract.",
    evidence: [TRUTH, VIDEO_111_120, `${OPENINGS}/level-119.png`, SHUTTER_AUDIT],
  },
  {
    levelId: 121,
    kinds: ["source-composition-incomplete", "source-mouth-geometry-unresolved", "direct-cohort-source-unclear", "global-adjacency-contract-conflict", "bounded-search-not-certified"],
    detail: "Truth-v1 fixes the 6x8 two-component mask, 23-piece opening and exact 2x4/count-15 cover, but not the complete hidden composition/cohort or five frozen colour/span bindings. The exact authored opening has two same-colour contacts; its fixed gate/cover candidate reaches 20,000 states without a solve, while the raw-rail bounded candidate exhausts 3,495 states.",
    evidence: [TRUTH, VIDEO_121_130, `${OPENINGS}/level-121.png`, EXIT_AUDIT, OPENING_AUDIT_B],
  },
  {
    levelId: 122,
    kinds: ["truth-mask-playthrough-conflict", "global-adjacency-contract-conflict", "opening-reconstruction-required"],
    detail: "The untouched second-44 opening fixes the visible 29-piece arrangement and the full playthrough resolves all seven exit colours. That same opening contains green and pink same-colour contacts. More fundamentally, truth-v1's 42-cell mask was reconstructed from opening occupancy: at seconds 54-60 pieces move into central cells between the legs that the mask marks non-playable. Applying that mask produces an exhausted one-state position, so publishing it or expanding it without a newly authored source mask would both violate a hard contract.",
    evidence: [TRUTH, VIDEO_121_130, `${FRAMES_121_130}/sec-0044.jpg`, `${FRAMES_121_130}/sec-0054.jpg`, `${FRAMES_121_130}/sec-0060.jpg`],
  },
] as const satisfies readonly CompetitorLateExitStructuralBatchHBlocker[];

/** No-op until one requested level meets source parity and every hard gate. */
export const applyCompetitorLateExitStructuralBatchH = (source: LevelSpec): LevelSpec => source;

