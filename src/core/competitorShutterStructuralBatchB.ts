import type { LevelSpec, ShutterSpec } from "./types";

/**
 * Source-faithful structural shutter batch B.
 *
 * This module is deliberately independent from `levels.ts`.  Lv91 is the
 * only level in this seven-level audit set whose source panel rectangles,
 * direct cohorts and current post-overlay mechanics admit a <=30k-state
 * replayable reconstruction.  Every rejected level remains an explicit
 * blocker; this batch never substitutes a staging chain or cosmetic panel.
 */
export const COMPETITOR_SHUTTER_STRUCTURAL_BATCH_B_VERSION =
  "competitor-shutter-structural-batch-b-r1" as const;

export const COMPETITOR_SHUTTER_STRUCTURAL_BATCH_B_REQUESTED_LEVEL_IDS = [
  44, 49, 59, 62, 64, 67, 91,
] as const;

export const COMPETITOR_SHUTTER_STRUCTURAL_BATCH_B_CERTIFIED_LEVEL_IDS = [91] as const;

export const COMPETITOR_SHUTTER_STRUCTURAL_BATCH_B_USES_STAGING_FALLBACK = false as const;

const LV91_UPPER = "vp-091-cover-1";
const LV91_LOWER = "vp-091-cover-2";

type BlockPatch = Readonly<{
  x: number;
  y: number;
  shutterId?: typeof LV91_UPPER | typeof LV91_LOWER;
}>;

/**
 * Positions are a fixed-orientation packing of the unchanged source shapes.
 * The opening occupies 30 cells outside the two real panel rectangles.  The
 * hidden cohorts occupy 13/8 cells inside their 16/15-cell source panels.
 */
const LV91_BLOCK_PATCHES: Readonly<Record<string, BlockPatch>> = {
  "cc-091-b1-01": { x: 2, y: 8 },
  "cc-091-b1-02": { x: 0, y: 0 },
  "cc-091-b1-03": { x: 6, y: 4 },
  "cc-091-b1-04": { x: 0, y: 1 },
  "cc-091-b1-05": { x: 1, y: 0 },
  "cc-091-b1-06": { x: 0, y: 6 },
  "cc-091-b1-07": { x: 6, y: 5 },
  "cc-091-b1-08": { x: 1, y: 1 },
  "cc-091-b1-09": { x: 6, y: 7 },
  "cc-091-b1-10": { x: 1, y: 4 },
  "cc-091-b1-11": { x: 0, y: 8 },
  "cc-091-b1-12": { x: 0, y: 5 },
  "cc-091-b1-13": { x: 2, y: 0 },
  "cc-091-b1-14": { x: 0, y: 7 },
  "cc-091-b1-15": { x: 0, y: 3 },
  "cc-091-b1-16": { x: 2, y: 7 },
  "cc-091-b1-17": { x: 1, y: 2 },

  "cc-091-b2-01": { x: 3, y: 0, shutterId: LV91_UPPER },
  "cc-091-b2-02": { x: 4, y: 0, shutterId: LV91_UPPER },
  "cc-091-b2-03": { x: 5, y: 0, shutterId: LV91_UPPER },
  "cc-091-b2-04": { x: 6, y: 0, shutterId: LV91_UPPER },
  "cc-091-b2-05": { x: 3, y: 3, shutterId: LV91_UPPER },

  "cc-091-b3-01": { x: 3, y: 4, shutterId: LV91_LOWER },
  "cc-091-b3-02": { x: 4, y: 4, shutterId: LV91_LOWER },
  "cc-091-b3-03": { x: 5, y: 4, shutterId: LV91_LOWER },
  "cc-091-b3-04": { x: 3, y: 5, shutterId: LV91_LOWER },
  "cc-091-b3-05": { x: 4, y: 6, shutterId: LV91_LOWER },
};

const LV91_SHUTTERS: readonly ShutterSpec[] = [
  { id: LV91_UPPER, x: 3, y: 0, width: 4, height: 4, count: 10, skin: "shutter" },
  { id: LV91_LOWER, x: 3, y: 4, width: 3, height: 5, count: 8, skin: "shutter" },
];

const repairLv91 = (source: LevelSpec): LevelSpec => {
  const sourceIds = new Set(source.blocks.map(({ id }) => id));
  const expectedIds = Object.keys(LV91_BLOCK_PATCHES);
  if (source.blocks.length !== expectedIds.length
    || expectedIds.some((id) => !sourceIds.has(id))) {
    throw new Error("Lv91 shutter structural source drift: expected the 27 source-fps block IDs");
  }
  return {
    ...source,
    blocks: source.blocks.map((block) => {
      const patch = LV91_BLOCK_PATCHES[block.id]!;
      return {
        ...block,
        x: patch.x,
        y: patch.y,
        shutterId: patch.shutterId,
      };
    }),
    shutters: LV91_SHUTTERS.map((shutter) => ({ ...shutter })),
  };
};

export const applyCompetitorShutterStructuralBatchB = (source: LevelSpec): LevelSpec => (
  source.id === 91 ? repairLv91(source) : source
);

export const COMPETITOR_SHUTTER_STRUCTURAL_BATCH_B_CONTRACTS = [
  {
    levelId: 91,
    openingPieceCount: 17,
    fullPieceCount: 27,
    openingOccupiedCellCount: 30,
    fullOccupiedCellCount: 51,
    openingShapeHistogram: { SINGLE: 7, H2: 3, V2: 4, H3: 1, V3: 1, L3: 1 },
    fullShapeHistogram: { SINGLE: 11, H2: 3, V2: 5, H3: 1, V3: 5, L3: 2 },
    panels: [
      {
        id: LV91_UPPER,
        x: 3,
        y: 0,
        width: 4,
        height: 4,
        count: 10,
        sourceFootprintCells: 16,
        directOccupiedCells: 13,
        directBlockIds: [
          "cc-091-b2-01", "cc-091-b2-02", "cc-091-b2-03", "cc-091-b2-04", "cc-091-b2-05",
        ],
      },
      {
        id: LV91_LOWER,
        x: 3,
        y: 4,
        width: 3,
        height: 5,
        count: 8,
        sourceFootprintCells: 15,
        directOccupiedCells: 8,
        directBlockIds: [
          "cc-091-b3-01", "cc-091-b3-02", "cc-091-b3-03", "cc-091-b3-04", "cc-091-b3-05",
        ],
      },
    ],
    freshSolverMaxStates: 30_000,
    certifiedExploredStates: 319,
    certifiedDragCount: 31,
    evidence: [
      "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json",
      ".codex-temp/video-parity-v6-lv91-reaudit/keyframes/lv91-t00_500-source.png",
      ".codex-temp/video-parity-v6-lv91-reaudit/keyframes/lv91-t37_000-source.png",
      ".codex-temp/video-parity-v6-lv91-reaudit/keyframes/lv91-t39_400-source.png",
    ],
  },
] as const;

export type CompetitorShutterStructuralBatchBBlockerKind =
  | "fixed-shape-panel-packing-conflict"
  | "physical-panel-capacity-conflict"
  | "fresh-solver-not-certified"
  | "source-panel-geometry-not-unique"
  | "truth-shape-inventory-conflict";

export interface CompetitorShutterStructuralBatchBBlocker {
  readonly levelId: 44 | 49 | 59 | 62 | 64 | 67;
  readonly kinds: readonly CompetitorShutterStructuralBatchBBlockerKind[];
  readonly reason: string;
  readonly evidence: readonly string[];
}

const TRUTH = "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json";
const SCREENSHOTS = "deliverables/competitor-screenshots/BlockOut-competitor-levels-001-100-2026-06/levels";

export const COMPETITOR_SHUTTER_STRUCTURAL_BATCH_B_BLOCKERS = [
  {
    levelId: 44,
    kinds: ["fixed-shape-panel-packing-conflict"],
    reason: "The five video-visible source panels are 1x2, 1x3, 3x4, 1x3 and 1x2 while the six direct fixed-orientation source pieces are L3/H2/V2/V3/SQ2/L3. Four one-cell-wide panels each require a direct piece, but no L3, H2 or SQ2 member fits them without rotation, shape change or overlap.",
    evidence: [TRUTH, `${SCREENSHOTS}/competitor-level-044.jpg`],
  },
  {
    levelId: 49,
    kinds: ["physical-panel-capacity-conflict"],
    reason: "The three source panels have total physical capacity 2x5 + 3x3 + 2x5 = 29 cells, while the exact 17-piece direct cohort occupies 33 cells (SINGLEx5, H2, V2x8, H3, V3 and SQ2). A non-overlapping direct reconstruction is mathematically impossible without changing a shape or panel.",
    evidence: [TRUTH, `${SCREENSHOTS}/competitor-level-049.jpg`],
  },
  {
    levelId: 59,
    kinds: ["fresh-solver-not-certified"],
    reason: "High-rate frames fix the real panels at 7x3/count6 and 4x3/count12 and identify four direct pieces in each. An adjacency-clean fixed-shape physical reconstruction validates with exact opening/full composition, but the current post-overlay exit/lock contract reached the required 30,000-state cap without a replayable completion, so it is not publishable.",
    evidence: [TRUTH, ".codex-temp/shutter-structural-b-video/lv59-contact.png", ".codex-temp/probe-shutter-structural-b-lv59.mjs"],
  },
  {
    levelId: 62,
    kinds: ["physical-panel-capacity-conflict"],
    reason: "The video panel is the source 4x2/count4 rectangle (8 cells), but its exact direct cohort is H3x4 + V3x2 and occupies 18 cells. Direct ownership cannot be represented without overlap, clipping, rotation/shape change or a non-spatial staging fallback.",
    evidence: [TRUTH, `${SCREENSHOTS}/competitor-level-062.jpg`],
  },
  {
    levelId: 64,
    kinds: ["source-panel-geometry-not-unique"],
    reason: "The high-rate ledger uniquely fixes counts 5/8/13 and direct cohorts of 4/5/6 pieces (54 occupied cells), but the archived opening frames do not uniquely determine all three cell-aligned panel rectangles. Because the 16-cell opening plus 54 hidden cells exactly fills the 70-cell board, guessing even one boundary would silently reassign the physical covered region; this batch refuses that cosmetic reconstruction.",
    evidence: [TRUTH, ".codex-temp/shutter-structural-b-video/lv64-contact.png"],
  },
  {
    levelId: 67,
    kinds: ["truth-shape-inventory-conflict"],
    reason: "Source frames fix a 3x2/count3 neck panel and reveal two direct H3 blocks at (2,3) and (2,4), whereas truth-v6 records V2x1 and the current full level contains only two H3 blocks although the video requires at least four. Under the no-shape-change rule the missing two H3 pieces cannot be restored.",
    evidence: [TRUTH, ".codex-temp/lv67-shutter-blocker-evidence.json", ".codex-temp/lv67-shutter-blocker-evidence.md"],
  },
] as const satisfies readonly CompetitorShutterStructuralBatchBBlocker[];
