import type { BlockColor, BlockSpec, GateSpec, LevelSpec, Point } from "./types";

export const COMPETITOR_EARLY_MID_RESIDUAL_BATCH_P_VERSION =
  "competitor-early-mid-residual-batch-p-r2" as const;

export const COMPETITOR_EARLY_MID_RESIDUAL_BATCH_P_REQUESTED_LEVEL_IDS = [
  29, 31, 32, 38, 39, 40, 41, 47, 48, 64, 95, 99,
] as const;

/** Only source-backed candidates with zero opening adjacency and a fresh replay. */
export const COMPETITOR_EARLY_MID_RESIDUAL_BATCH_P_CERTIFIED_LEVEL_IDS = [31, 40] as const;

export const COMPETITOR_EARLY_MID_RESIDUAL_BATCH_P_USES_STAGING_FALLBACK = false as const;

const TRUTH =
  "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json";
const SCREENSHOTS =
  "deliverables/competitor-screenshots/BlockOut-competitor-levels-001-100-2026-06/levels";
const SHUTTER_BATCH_A = "src/core/competitorShutterStructuralBatchA.ts";
const SHUTTER_BATCH_C = "src/core/competitorShutterStructuralBatchC.ts";
const EXIT_BATCH_B = "src/core/competitorExitStructuralBatchB.ts";

export type CompetitorEarlyMidResidualBatchPBlockerKind =
  | "fixed-shape-panel-packing-conflict"
  | "physical-panel-capacity-conflict"
  | "fresh-solver-not-certified"
  | "source-direct-cohort-conflict"
  | "source-physical-mouth-missing"
  | "authoritative-geometry-missing"
  | "authoritative-cohort-partition-unclear";

export interface CompetitorEarlyMidResidualBatchPBlocker {
  readonly levelId: 29 | 32 | 38 | 39 | 41 | 47 | 48 | 64 | 95 | 99;
  readonly kind: CompetitorEarlyMidResidualBatchPBlockerKind;
  readonly detail: string;
  readonly evidence: readonly string[];
}

/**
 * Rejected candidates remain explicit.  None authorizes a staging substitute,
 * guessed colour, invented internal portal, resized source cover or rotated
 * source shape.
 */
export const COMPETITOR_EARLY_MID_RESIDUAL_BATCH_P_BLOCKERS = [
  {
    levelId: 29,
    kind: "fixed-shape-panel-packing-conflict",
    detail: "Truth fixes two direct count-20/count-25 cohorts (6/4 pieces), but the video-exact 2x9 panels do not admit the fixed-orientation source cohorts without overlap. Rotating a source shape or moving it to the peer panel is not source-backed.",
    evidence: [TRUTH, `${SCREENSHOTS}/competitor-level-029.jpg`, SHUTTER_BATCH_A],
  },
  {
    levelId: 32,
    kind: "fresh-solver-not-certified",
    detail: "The exact four mouths, three frozen-8 exits, six L4 numeric-ice carriers and their post-thaw shells validate, but the adjacency-clean final-layout candidate exhausts all 308 states; the raw source opening instead reaches the 30,000-state cap and retains same-colour contacts.",
    evidence: [TRUTH, `${SCREENSHOTS}/competitor-level-032.jpg`, EXIT_BATCH_B],
  },
  {
    levelId: 38,
    kind: "physical-panel-capacity-conflict",
    detail: "The 6x7 board has 42 cells, while the disjoint opening footprint and the direct count-15 H3x7+CROSS5 cohort require 44 cells. A strict physical cover cannot contain that cohort without overlap or a non-source inventory change.",
    evidence: [TRUTH, `${SCREENSHOTS}/competitor-level-038.jpg`, SHUTTER_BATCH_A],
  },
  {
    levelId: 39,
    kind: "fresh-solver-not-certified",
    detail: "All three source rectangles and their exact 11/6/4 direct cohorts can be packed with the twelve exact mouths and hidden numeric ice, but the validated exact two-component candidate reaches the 30,000-state cap without a replayable completion.",
    evidence: [TRUTH, `${SCREENSHOTS}/competitor-level-039.jpg`, SHUTTER_BATCH_A],
  },
  {
    levelId: 41,
    kind: "fixed-shape-panel-packing-conflict",
    detail: "The lower count-14 panel has exactly 20 cells, but its fixed-orientation V2x2+L4x4 direct cohort has no non-overlapping tiling. Reassignment would also break the already-certified centre-mouth generator cargo contract.",
    evidence: [TRUTH, `${SCREENSHOTS}/competitor-level-041.jpg`, SHUTTER_BATCH_A],
  },
  {
    levelId: 47,
    kind: "fresh-solver-not-certified",
    detail: "The five exact source mouths and numeric-ice values 9/14 are known, but the source-faithful candidate reaches the 30,000-state cap; the adjacency-clean final opening with those mouths is statically incompatible with its remaining colours. No replay certificate exists.",
    evidence: [TRUTH, `${SCREENSHOTS}/competitor-level-047.jpg`, EXIT_BATCH_B],
  },
  {
    levelId: 48,
    kind: "source-physical-mouth-missing",
    detail: "Truth requires nine independent mouths. Three counters 13/21/22 sit on the internal upper edge of the lower chamber, while the old raw rails are invalid on the final exact two-component mask. Their colour-to-portal mapping cannot be invented.",
    evidence: [TRUTH, `${SCREENSHOTS}/competitor-level-048.jpg`, EXIT_BATCH_B],
  },
  {
    levelId: 64,
    kind: "authoritative-geometry-missing",
    detail: "Source high-fps evidence fixes covers 5/8/13 and exact 4/5/6 cohorts, but it does not numerically fix three non-overlapping visible rectangles. The raw 1x1 placeholders cannot be promoted to physical covers.",
    evidence: [TRUTH, `${SCREENSHOTS}/competitor-level-064.jpg`, SHUTTER_BATCH_C],
  },
  {
    levelId: 95,
    kind: "authoritative-geometry-missing",
    detail: "Truth fixes the count-17 cover and its thirteen-piece SINGLEx9+H2x2+L3x2 cohort, but no source-certified rectangle and direct fixed-orientation packing is available on the two-component mask.",
    evidence: [TRUTH, `${SCREENSHOTS}/competitor-level-095.jpg`, SHUTTER_BATCH_C],
  },
  {
    levelId: 99,
    kind: "authoritative-cohort-partition-unclear",
    detail: "The three count-3 covers open together. Only the aggregate fourteen-piece hidden histogram is source-exact; per-cover ownership is explicitly unclear, so assigning blocks directly to three physical panels would fabricate evidence.",
    evidence: [TRUTH, `${SCREENSHOTS}/competitor-level-099.jpg`, SHUTTER_BATCH_C],
  },
] as const satisfies readonly CompetitorEarlyMidResidualBatchPBlocker[];

interface BlockPatch {
  readonly x: number;
  readonly y: number;
  readonly color: BlockColor;
  readonly frozen?: number;
}

/**
 * Untouched 31-40.mp4 opening.  Five outer-colour changes are the proven
 * minimum over the exact four-colour source palette needed to satisfy the
 * global orthogonal-adjacency rule; geometry, shapes and ice values stay exact.
 */
const LV31_BLOCK_PATCHES: Readonly<Record<string, BlockPatch>> = {
  "cc-031-b1-01": { x: 0, y: 2, color: "orange" },
  "cc-031-b1-02": { x: 1, y: 2, color: "pink" },
  "cc-031-b1-03": { x: 2, y: 0, color: "pink" },
  "cc-031-b1-04": { x: 1, y: 0, color: "yellow" },
  "cc-031-b1-05": { x: 2, y: 2, color: "yellow" },
  "cc-031-b1-06": { x: 5, y: 2, color: "yellow" },
  "cc-031-b1-07": { x: 4, y: 2, color: "pink" },
  "cc-031-b1-08": { x: 3, y: 2, color: "orange" },
  "cc-031-b1-09": { x: 5, y: 4, color: "pink" },
  "cc-031-b1-10": { x: 3, y: 0, color: "yellow" },
  "cc-031-b1-11": { x: 4, y: 0, color: "red", frozen: 5 },
  "cc-031-b1-12": { x: 4, y: 4, color: "orange" },
  "cc-031-b1-13": { x: 2, y: 4, color: "red", frozen: 13 },
  "cc-031-b1-14": { x: 0, y: 4, color: "yellow", frozen: 9 },
  "cc-031-b1-15": { x: 0, y: 0, color: "pink" },
  "cc-031-b1-16": { x: 3, y: 6, color: "orange" },
  "cc-031-b1-17": { x: 4, y: 6, color: "yellow", frozen: 10 },
  "cc-031-b1-18": { x: 2, y: 6, color: "yellow" },
};

const LV31_GATES: readonly GateSpec[] = [
  { id: "vp-031-gate-01", side: "top", offset: 0, size: 3, color: "yellow", frozen: 2 },
  { id: "vp-031-gate-02", side: "right", offset: 3, size: 3, color: "pink" },
  { id: "vp-031-gate-03", side: "top", offset: 3, size: 3, color: "orange", frozen: 10 },
  { id: "vp-031-gate-04", side: "right", offset: 0, size: 3, color: "red", frozen: 13 },
];

const LV40_GATES: readonly GateSpec[] = [
  { id: "vp-040-gate-01", side: "right", offset: 0, size: 3, color: "blue", frozen: 3 },
  { id: "vp-040-gate-02", side: "right", offset: 3, size: 3, color: "purple", frozen: 2 },
  { id: "vp-040-gate-03", side: "left", offset: 4, size: 1, color: "pink" },
  { id: "vp-040-gate-04", side: "top", offset: 0, size: 3, color: "cyan", frozen: 6 },
  { id: "vp-040-gate-05", side: "top", offset: 3, size: 3, color: "green", frozen: 4 },
  { id: "vp-040-gate-06", side: "bottom", offset: 0, size: 3, color: "orange", frozen: 1 },
];

/**
 * The exact 6x3 physical cover occupies rows 0..2, so opening blocks must
 * retain the already-audited lower 6x3 packing.  The one outer-colour change
 * aligns a 1x1 opening block with the sole ordinary pink mouth; with the same
 * packing and source mouths but no change, the fresh solver exhausts at the
 * initial state.
 */
const LV40_OPENING_POSITIONS: Readonly<Record<string, readonly [number, number]>> = {
  "cc-040-b1-01": [2, 5],
  "cc-040-b1-02": [4, 5],
  "cc-040-b1-03": [1, 4],
  "cc-040-b1-04": [2, 3],
  "cc-040-b1-05": [0, 5],
  "cc-040-b1-06": [2, 4],
  "cc-040-b1-07": [4, 3],
  "cc-040-b1-08": [0, 4],
  "cc-040-b1-09": [5, 3],
  "cc-040-b1-10": [0, 3],
  "cc-040-b1-11": [5, 5],
};

const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);

const cloneGate = (gate: GateSpec): GateSpec => ({
  ...gate,
  portals: gate.portals?.map((portal) => ({
    ...portal,
    origin: [...portal.origin] as Point,
  })),
});

const V2 = [[0, 0], [0, 1]] as const;
const SQ2 = [[0, 0], [1, 0], [0, 1], [1, 1]] as const;
const LV31_SQ2_IDS = new Set(["cc-031-b1-11", "cc-031-b1-13", "cc-031-b1-14", "cc-031-b1-17"]);

const assertLv31Source = (source: LevelSpec): void => {
  if (source.width !== 6 || source.height !== 8 || source.blocks.length !== 18
    || (source.generators?.length ?? 0) !== 0 || (source.shutters?.length ?? 0) !== 0) {
    throw new Error("Lv31 residual batch P board/composition drift");
  }
  const ids = new Set(source.blocks.map(({ id }) => id));
  if (Object.keys(LV31_BLOCK_PATCHES).some((id) => !ids.has(id))) {
    throw new Error("Lv31 residual batch P block-id drift");
  }
  for (const block of source.blocks) {
    const expected = LV31_SQ2_IDS.has(block.id) ? SQ2 : V2;
    if (!same(block.shape, expected)) throw new Error(`Lv31 residual batch P shape drift: ${block.id}`);
  }
};

const clonePatchedBlock = (source: BlockSpec, patch: BlockPatch): BlockSpec => ({
  ...source,
  x: patch.x,
  y: patch.y,
  color: patch.color,
  frozen: patch.frozen,
  layers: undefined,
  shutterId: undefined,
});

const repairLv31 = (source: LevelSpec): LevelSpec => {
  assertLv31Source(source);
  const targetBlocks = source.blocks.map((block) => clonePatchedBlock(block, LV31_BLOCK_PATCHES[block.id]!));
  if (same(source.gates, LV31_GATES) && same(source.blocks, targetBlocks)
    && (source.flipDoors?.length ?? 0) === 0) return source;
  return {
    ...source,
    timeSeconds: 90,
    gates: LV31_GATES.map(cloneGate),
    flipDoors: undefined,
    blocks: targetBlocks,
  };
};

const assertLv40Source = (source: LevelSpec): void => {
  const shutters = source.shutters ?? [];
  const direct = source.blocks.filter(({ shutterId }) => shutterId === "vp-040-cover-1");
  if (source.width !== 6 || source.height !== 6 || source.blocks.length !== 19
    || shutters.length !== 1 || direct.length !== 8
    || !same(shutters[0], {
      id: "vp-040-cover-1", x: 0, y: 0, width: 6, height: 3, count: 4, skin: "shutter",
    })) {
    throw new Error("Lv40 residual batch P exact cover/source drift");
  }
  for (const [id, [x, y]] of Object.entries(LV40_OPENING_POSITIONS)) {
    const block = source.blocks.find((candidate) => candidate.id === id);
    if (!block || block.x !== x || block.y !== y || block.shutterId !== undefined) {
      throw new Error(`Lv40 residual batch P lower-opening packing drift: ${id}`);
    }
  }
};

const repairLv40 = (source: LevelSpec): LevelSpec => {
  assertLv40Source(source);
  const targetBlocks = source.blocks.map((block) => block.id !== "cc-040-b1-08"
    || (block.color === "pink" && block.layers === undefined)
    ? block
    : { ...block, color: "pink" as const, layers: undefined });
  if (same(source.gates, LV40_GATES) && same(source.blocks, targetBlocks)
    && (source.flipDoors?.length ?? 0) === 0) return source;
  return {
    ...source,
    gates: LV40_GATES.map(cloneGate),
    flipDoors: undefined,
    blocks: targetBlocks,
  };
};

export const applyCompetitorEarlyMidResidualBatchP = (source: LevelSpec): LevelSpec => (
  source.id === 31 ? repairLv31(source)
    : source.id === 40 ? repairLv40(source)
      : source
);
