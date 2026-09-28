import type { BlockColor, BlockSpec, GateSpec, LevelSpec, ShutterSpec } from "./types";

/**
 * Source-faithful structural shutter candidate for Lv29/34/38/39/41.
 *
 * This module is intentionally not wired into `levels.ts`.  Only Lv34 passed
 * the complete physical-panel, direct-cohort, solver and PuzzleModel replay
 * gate.  The other requested levels remain explicit blockers instead of being
 * represented by a cosmetic panel or a staging chain.
 */
export const COMPETITOR_SHUTTER_STRUCTURAL_BATCH_A_VERSION =
  "competitor-shutter-structural-batch-a-r1" as const;

export const COMPETITOR_SHUTTER_STRUCTURAL_BATCH_A_REQUESTED_LEVEL_IDS = [
  29, 34, 38, 39, 41,
] as const;

export const COMPETITOR_SHUTTER_STRUCTURAL_BATCH_A_CERTIFIED_LEVEL_IDS = [34] as const;

export const COMPETITOR_SHUTTER_STRUCTURAL_BATCH_A_USES_STAGING_FALLBACK = false as const;

const LV34_LEFT = "vp-034-cover-1";
const LV34_RIGHT = "vp-034-cover-2";

type BlockPatch = Readonly<{
  x: number;
  y: number;
  color: BlockColor;
  shutterId?: typeof LV34_LEFT | typeof LV34_RIGHT;
  layers?: readonly [BlockColor, BlockColor];
}>;

const LV34_BLOCK_PATCHES: Readonly<Record<string, BlockPatch>> = {
  "cc-034-b1-01": { x: 1, y: 6, color: "orange" },
  "cc-034-b1-02": { x: 3, y: 6, color: "orange" },
  "cc-034-b1-03": { x: 4, y: 6, color: "pink" },
  "cc-034-b1-04": { x: 6, y: 6, color: "orange" },
  "cc-034-b1-05": { x: 1, y: 7, color: "pink" },
  "cc-034-b1-06": { x: 3, y: 7, color: "pink" },
  "cc-034-b1-07": { x: 4, y: 7, color: "orange" },
  "cc-034-b1-08": { x: 6, y: 7, color: "pink" },
  "cc-034-b1-09": { x: 0, y: 8, color: "pink" },
  "cc-034-b1-10": { x: 1, y: 8, color: "orange" },
  "cc-034-b1-11": { x: 2, y: 8, color: "pink" },
  "cc-034-b1-12": { x: 3, y: 8, color: "orange" },
  "cc-034-b1-13": { x: 4, y: 8, color: "pink" },
  "cc-034-b1-14": { x: 5, y: 8, color: "orange" },
  "cc-034-b1-15": { x: 0, y: 6, color: "cyan" },
  "cc-034-b1-16": { x: 2, y: 6, color: "cyan" },
  "cc-034-b1-17": { x: 5, y: 6, color: "cyan" },

  "cc-034-b2-01": { x: 0, y: 0, color: "red", shutterId: LV34_LEFT, layers: ["red", "green"] },
  "cc-034-b2-02": { x: 1, y: 0, color: "red", shutterId: LV34_LEFT, layers: ["red", "green"] },
  "cc-034-b2-03": { x: 2, y: 0, color: "yellow", shutterId: LV34_LEFT, layers: ["yellow", "green"] },
  "cc-034-b2-04": { x: 3, y: 0, color: "green", shutterId: LV34_LEFT, layers: ["green", "cyan"] },
  "cc-034-b2-05": { x: 0, y: 3, color: "cyan", shutterId: LV34_LEFT, layers: ["cyan", "yellow"] },
  "cc-034-b2-06": { x: 1, y: 3, color: "cyan", shutterId: LV34_LEFT, layers: ["cyan", "green"] },
  "cc-034-b2-07": { x: 2, y: 3, color: "cyan", shutterId: LV34_LEFT, layers: ["cyan", "red"] },
  "cc-034-b2-08": { x: 3, y: 3, color: "cyan", shutterId: LV34_LEFT },

  "cc-034-b3-01": { x: 4, y: 0, color: "green", shutterId: LV34_RIGHT },
  "cc-034-b3-02": { x: 5, y: 0, color: "yellow", shutterId: LV34_RIGHT },
  "cc-034-b3-03": { x: 6, y: 0, color: "yellow", shutterId: LV34_RIGHT },
  "cc-034-b3-04": { x: 4, y: 3, color: "green", shutterId: LV34_RIGHT },
  "cc-034-b3-05": { x: 5, y: 3, color: "yellow", shutterId: LV34_RIGHT },
};

const LV34_SHUTTERS: readonly ShutterSpec[] = [
  { id: LV34_LEFT, x: 0, y: 0, width: 4, height: 6, count: 12, skin: "shutter" },
  { id: LV34_RIGHT, x: 4, y: 0, width: 3, height: 6, count: 22, skin: "shutter" },
];

/**
 * The counter multiset and colour inventory are source facts.  These physical
 * placements keep every fixed-orientation source shape usable while retaining
 * one ordinary exit and the exact five frozen counters.
 */
const LV34_GATES: readonly GateSpec[] = [
  { id: "ssa34-orange-ordinary", side: "bottom", offset: 5, size: 2, color: "orange" },
  { id: "ssa34-pink-7", side: "bottom", offset: 0, size: 1, color: "pink", frozen: 7 },
  { id: "ssa34-cyan-13", side: "bottom", offset: 2, size: 1, color: "cyan", frozen: 13 },
  { id: "ssa34-green-14", side: "top", offset: 3, size: 1, color: "green", frozen: 14 },
  { id: "ssa34-red-22", side: "top", offset: 0, size: 1, color: "red", frozen: 22 },
  { id: "ssa34-yellow-22", side: "top", offset: 6, size: 1, color: "yellow", frozen: 22 },
];

const cloneBlock = (source: BlockSpec, patch: BlockPatch): BlockSpec => ({
  ...source,
  x: patch.x,
  y: patch.y,
  color: patch.color,
  layers: patch.layers ? [...patch.layers] : undefined,
  frozen: undefined,
  shutterId: patch.shutterId,
});

const repairLv34 = (source: LevelSpec): LevelSpec => {
  const sourceIds = new Set(source.blocks.map(({ id }) => id));
  const expectedIds = Object.keys(LV34_BLOCK_PATCHES);
  if (source.blocks.length !== expectedIds.length
    || expectedIds.some((id) => !sourceIds.has(id))) {
    throw new Error("Lv34 shutter structural source drift: expected the 30 video-truth block IDs");
  }
  return {
    ...source,
    width: 7,
    height: 9,
    timeSeconds: 120,
    blocked: undefined,
    playable: Array.from({ length: 63 }, (_, index) => [index % 7, Math.floor(index / 7)] as const),
    seams: undefined,
    gates: LV34_GATES.map((gate) => ({ ...gate })),
    blocks: source.blocks.map((block) => cloneBlock(block, LV34_BLOCK_PATCHES[block.id]!)),
    shutters: LV34_SHUTTERS.map((shutter) => ({ ...shutter })),
  };
};

export const applyCompetitorShutterStructuralBatchA = (source: LevelSpec): LevelSpec => (
  source.id === 34 ? repairLv34(source) : source
);

export const COMPETITOR_SHUTTER_STRUCTURAL_BATCH_A_CONTRACTS = [
  {
    levelId: 34,
    openingPieceCount: 17,
    fullPieceCount: 30,
    openingShapeHistogram: { SINGLE: 13, H2: 1, V2: 3 },
    fullShapeHistogram: { SINGLE: 13, H2: 1, V2: 3, V3: 13 },
    openingColorCount: 3,
    fullColorCount: 6,
    panels: [
      { id: LV34_LEFT, x: 0, y: 0, width: 4, height: 6, count: 12, directBlockIds: Object.keys(LV34_BLOCK_PATCHES).filter((id) => id.startsWith("cc-034-b2-")) },
      { id: LV34_RIGHT, x: 4, y: 0, width: 3, height: 6, count: 22, directBlockIds: Object.keys(LV34_BLOCK_PATCHES).filter((id) => id.startsWith("cc-034-b3-")) },
    ],
    ordinaryExitCount: 1,
    frozenExitValues: [7, 13, 14, 22, 22],
    freshSolverMaxStates: 30_000,
    certifiedExploredStates: 311,
    certifiedDragCount: 45,
  },
] as const;

export type CompetitorShutterStructuralBatchABlockerKind =
  | "fixed-shape-panel-packing-conflict"
  | "physical-panel-capacity-conflict"
  | "fresh-solver-not-certified";

export interface CompetitorShutterStructuralBatchABlocker {
  readonly levelId: 29 | 38 | 39 | 41;
  readonly kinds: readonly CompetitorShutterStructuralBatchABlockerKind[];
  readonly reason: string;
  readonly evidence: readonly string[];
}

const TRUTH = "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json";

export const COMPETITOR_SHUTTER_STRUCTURAL_BATCH_A_BLOCKERS = [
  {
    levelId: 29,
    kinds: ["fixed-shape-panel-packing-conflict"],
    reason: "The video-exact left/right 2x9 panels and 6/4 direct cohorts are known, but neither fixed-orientation raw cohort packs without overlap; rotating or changing a source shape is outside this batch.",
    evidence: [TRUTH, "deliverables/competitor-screenshots/BlockOut-competitor-levels-001-100-2026-06/levels/competitor-level-029.jpg"],
  },
  {
    levelId: 38,
    kinds: ["physical-panel-capacity-conflict"],
    reason: "On the source 6x7 board the opening occupies 18 cells and the count-15 direct H3x7+CROSS5 cohort occupies 26; a closed physical panel disjoint from the opening would require 44 cells on a 42-cell board.",
    evidence: [TRUTH, ".codex-temp/video31-40/t329.png"],
  },
  {
    levelId: 39,
    kinds: ["fresh-solver-not-certified"],
    reason: "The source 5x4/count15, 3x4/count22 and 4x4/count5 rectangles and all 11/6/4 direct cohorts pack and validate with zero opening adjacency, but the exact two-board candidate reached the 30,000-state proof cap without a replayable completion.",
    evidence: [TRUTH, ".codex-temp/video31-40/lv39_380_4.png"],
  },
  {
    levelId: 41,
    kinds: ["fixed-shape-panel-packing-conflict"],
    reason: "The source lower 5x4/count14 panel has exactly 20 cells, but its fixed-orientation V2x2+L4x4 direct cohort has no non-overlapping tiling; shape rotation/change is forbidden and generator centre-mouth/cargo contracts must remain intact.",
    evidence: [TRUTH, "deliverables/competitor-screenshots/BlockOut-competitor-levels-001-100-2026-06/levels/competitor-level-041.jpg"],
  },
] as const satisfies readonly CompetitorShutterStructuralBatchABlocker[];
