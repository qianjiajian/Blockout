import type { BlockColor, BlockSpec, GateSpec, LevelSpec, MovementAxis, Point, ShutterSpec } from "./types";
import { VIDEO_PARITY_LEVELS } from "./videoParityLevels.generated";

/**
 * Video-backed mid-campaign exit reconstruction batch C.
 *
 * This module is intentionally independent from `levels.ts`. Only Lv55 has a
 * physical, adjacency-clean and replay-certified reconstruction. The other six
 * requested levels remain explicit blockers instead of receiving cosmetic
 * exits, staging covers or unproved palette substitutions.
 */
export const COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_C_VERSION =
  "competitor-mid-exit-structural-batch-c-r1" as const;

export const COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_C_REQUESTED_LEVEL_IDS = [
  51, 52, 53, 55, 59, 61, 62,
] as const;

export const COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_C_CERTIFIED_LEVEL_IDS = [55] as const;

export const COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_C_USES_STAGING_FALLBACK = false as const;

type Lv55Patch = Readonly<{
  x: number;
  y: number;
  color: BlockColor;
  movementAxis?: MovementAxis;
  shutterId?: "vp-055-cover-1";
}>;

/**
 * The 16 opening pieces tile the six rows above the real 7x2 cover. The two
 * ordinary right mouths provide the only opening clears; blue opens after two
 * clears, the four numeric-ice V3 pieces thaw after five, and the cover plus
 * the four count-8 mouths open after eight. Colors follow the source video:
 * six opening colors, with pink introduced only by the covered cohort.
 */
const LV55_BLOCK_PATCHES: Readonly<Record<string, Lv55Patch>> = {
  "strategy-guard-s1-01": { x: 0, y: 0, color: "red" },
  "cc-piece-s1-02": { x: 0, y: 1, color: "blue" },
  "strategy-guard-s1-03": { x: 0, y: 2, color: "cyan" },
  "cc-piece-s1-04": { x: 0, y: 3, color: "green" },
  "strategy-guard-s1-05": { x: 3, y: 0, color: "yellow", movementAxis: "vertical" },
  "cc-piece-s1-06": { x: 0, y: 4, color: "blue" },
  "cc-piece-s1-07": { x: 3, y: 3, color: "red" },
  "cc-piece-s1-08": { x: 4, y: 0, color: "green" },
  "strategy-guard-s1-09": { x: 0, y: 5, color: "green", movementAxis: "horizontal" },
  "cc-piece-s1-10": { x: 5, y: 3, color: "blue" },
  "cc-piece-s1-11": { x: 5, y: 0, color: "yellow", movementAxis: "vertical" },
  "strategy-guard-s1-12": { x: 3, y: 4, color: "yellow" },
  "strategy-guard-s1-13": { x: 4, y: 5, color: "green" },
  "strategy-guard-s1-14": { x: 6, y: 0, color: "purple" },
  "cc-piece-s1-15": { x: 5, y: 4, color: "purple" },
  "cc-piece-s1-16": { x: 3, y: 5, color: "red" },

  "cc-piece-s2-01": { x: 0, y: 6, color: "green", shutterId: "vp-055-cover-1" },
  "cc-piece-s2-02": { x: 4, y: 6, color: "blue", shutterId: "vp-055-cover-1" },
  "cc-piece-s2-03": { x: 0, y: 7, color: "pink", shutterId: "vp-055-cover-1" },
};

/** Mouth spans were read after the ice breaks in the source-fps Lv55 run. */
const LV55_GATES: readonly GateSpec[] = [
  { id: "cmec55-purple", side: "top", offset: 0, size: 3, color: "purple", frozen: 8 },
  { id: "cmec55-red", side: "right", offset: 0, size: 2, color: "red" },
  { id: "cmec55-green", side: "right", offset: 5, size: 3, color: "green" },
  { id: "cmec55-blue", side: "left", offset: 4, size: 1, color: "blue", frozen: 2 },
  { id: "cmec55-pink", side: "left", offset: 6, size: 2, color: "pink", frozen: 8 },
  { id: "cmec55-cyan", side: "bottom", offset: 0, size: 3, color: "cyan", frozen: 8 },
  { id: "cmec55-yellow", side: "bottom", offset: 3, size: 3, color: "yellow", frozen: 8 },
];

const LV55_SHUTTERS: readonly ShutterSpec[] = [
  { id: "vp-055-cover-1", x: 0, y: 6, width: 7, height: 2, count: 8, skin: "shutter" },
];

const LV55_RAW = VIDEO_PARITY_LEVELS[54]!;

const clonePoints = (points: readonly Point[] | undefined): Point[] | undefined => (
  points?.map(([x, y]) => [x, y])
);

const repairLv55 = (source: LevelSpec): LevelSpec => {
  if (source.gates[0]?.id === LV55_GATES[0]!.id
    && source.gates.length === LV55_GATES.length
    && source.shutters?.length === 1
    && source.shutters[0]?.id === LV55_SHUTTERS[0]!.id
    && source.blocks.length === Object.keys(LV55_BLOCK_PATCHES).length) {
    return source;
  }

  const expectedIds = Object.keys(LV55_BLOCK_PATCHES);
  const rawIds = new Set(LV55_RAW.blocks.map(({ id }) => id));
  const sourceIds = new Set(source.blocks.map(({ id }) => id));
  if (LV55_RAW.id !== 55
    || LV55_RAW.blocks.length !== expectedIds.length
    || source.blocks.length !== expectedIds.length
    || expectedIds.some((id) => !rawIds.has(id) || !sourceIds.has(id))) {
    throw new Error("Lv55 mid-exit source drift: expected the 19 video-parity block IDs");
  }

  const blocks = LV55_RAW.blocks.map((block): BlockSpec => {
    const patch = LV55_BLOCK_PATCHES[block.id]!;
    const {
      color: _color,
      layers: _layers,
      movementAxis: _movementAxis,
      shutterId: _shutterId,
      ...rest
    } = block;
    return {
      ...rest,
      x: patch.x,
      y: patch.y,
      color: patch.color,
      ...(patch.movementAxis ? { movementAxis: patch.movementAxis } : {}),
      ...(patch.shutterId ? { shutterId: patch.shutterId } : {}),
    };
  });

  return {
    ...source,
    width: 7,
    height: 8,
    playable: clonePoints(LV55_RAW.playable),
    blocked: undefined,
    seams: undefined,
    blocks,
    gates: LV55_GATES.map((gate) => ({ ...gate })),
    shutters: LV55_SHUTTERS.map((shutter) => ({ ...shutter })),
    flipDoors: undefined,
    generators: undefined,
    elevators: undefined,
    conveyors: undefined,
    coloredGrids: undefined,
  };
};

export const applyCompetitorMidExitStructuralBatchC = (source: LevelSpec): LevelSpec => (
  source.id === 55 ? repairLv55(source) : source
);

export const COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_C_CONTRACTS = [
  {
    levelId: 55,
    board: { width: 7, height: 8, playableCellCount: 56 },
    openingPieceCount: 16,
    fullPieceCount: 19,
    openingOccupiedCellCount: 42,
    fullOccupiedCellCount: 51,
    openingColorCount: 6,
    fullColorCount: 7,
    openingShapeHistogram: { SINGLE: 1, H2: 4, H3: 7, V3: 4 },
    fullShapeHistogram: { SINGLE: 1, H2: 4, H3: 10, V3: 4 },
    ordinaryMouths: [
      { color: "red", side: "right", offset: 0, size: 2 },
      { color: "green", side: "right", offset: 5, size: 3 },
    ],
    frozenMouths: [
      { color: "purple", side: "top", offset: 0, size: 3, frozen: 8 },
      { color: "blue", side: "left", offset: 4, size: 1, frozen: 2 },
      { color: "pink", side: "left", offset: 6, size: 2, frozen: 8 },
      { color: "cyan", side: "bottom", offset: 0, size: 3, frozen: 8 },
      { color: "yellow", side: "bottom", offset: 3, size: 3, frozen: 8 },
    ],
    numericIce: { count: 4, value: 5, shape: "V3" },
    axisBlockCount: 3,
    panel: {
      id: "vp-055-cover-1",
      x: 0, y: 6, width: 7, height: 2, count: 8,
      directBlockIds: ["cc-piece-s2-01", "cc-piece-s2-02", "cc-piece-s2-03"],
    },
    freshSolverMaxStates: 30_000,
    certifiedExploredStates: 17_768,
    certifiedDragCount: 40,
    evidence: [
      "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json",
      ".codex-temp/video-audit-41-70/frames-51-60/frame-0260.jpg",
      ".codex-temp/video-audit-41-70/frames-51-60/frame-0304.jpg",
      ".codex-temp/video-audit-41-70/frames-51-60/frame-0305.jpg",
    ],
  },
] as const;

export type CompetitorMidExitStructuralBatchCBlockerKind =
  | "palette-mouth-incompatibility"
  | "adjacency-clean-layout-not-solvable"
  | "fresh-solver-not-certified"
  | "physical-panel-capacity-conflict";

export interface CompetitorMidExitStructuralBatchCBlocker {
  readonly levelId: 51 | 52 | 53 | 59 | 61 | 62;
  readonly kinds: readonly CompetitorMidExitStructuralBatchCBlockerKind[];
  readonly reason: string;
  readonly evidence: readonly string[];
}

const TRUTH = "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json";
const RAW = "src/core/videoParityLevels.generated.ts";

export const COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_C_BLOCKERS = [
  {
    levelId: 51,
    kinds: ["palette-mouth-incompatibility", "adjacency-clean-layout-not-solvable"],
    reason: "The exact raw exit inventory does not provide compatible physical mouths for every raw source color/axis member. A same-shape positional swap clears all three opening same-color adjacencies, but fresh validation then terminates exhausted at zero explored states. No color, shape or mouth substitution has a source-backed proof, so Lv51 is not published.",
    evidence: [TRUTH, RAW, ".codex-temp/search-mid-exit-position-swaps.jsonl", ".codex-temp/solve-one-mid-exit.mjs"],
  },
  {
    levelId: 52,
    kinds: ["palette-mouth-incompatibility", "adjacency-clean-layout-not-solvable"],
    reason: "The exact raw exit inventory omits compatible mouths for several source-palette members. Four same-shape swaps remove all opening same-color contacts without changing shapes or mechanism counts, but the resulting exact-exit candidate exhausts at zero explored states. Publishing it would require an unproved color or physical-mouth remap.",
    evidence: [TRUTH, RAW, ".codex-temp/search-mid-exit-position-swaps.jsonl", ".codex-temp/solve-one-mid-exit.mjs"],
  },
  {
    levelId: 53,
    kinds: ["palette-mouth-incompatibility", "adjacency-clean-layout-not-solvable"],
    reason: "The raw Lv53 palette contains a red member with no compatible exact source mouth after the one same-shape swap required to clear the two opening adjacency violations. The complete supported state space is exhausted after five states with no solution, so the contract is not safe to publish.",
    evidence: [TRUTH, RAW, ".codex-temp/search-mid-exit-position-swaps.jsonl", ".codex-temp/solve-one-mid-exit.mjs"],
  },
  {
    levelId: 59,
    kinds: ["fresh-solver-not-certified"],
    reason: "Source-fps frames fix real 7x3/count6 and 4x3/count12 shutters with four direct pieces each. Replacing those regions with staging is forbidden. The adjacency-clean fixed-shape physical reconstruction with exact exit values reaches the required 30,000-state limit without a replayable completion, so Lv59 remains blocked rather than receiving cosmetic panels.",
    evidence: [TRUTH, ".codex-temp/shutter-structural-b-video/lv59-contact.png", ".codex-temp/probe-shutter-structural-b-lv59.mjs"],
  },
  {
    levelId: 61,
    kinds: ["palette-mouth-incompatibility", "adjacency-clean-layout-not-solvable"],
    reason: "The raw Lv61 mouth placement is not compatible with the fixed-axis source inventory. Two same-shape swaps remove all three opening same-color contacts while preserving every mechanism count, yet the candidate exhausts at zero explored states. A physical mouth relocation is required and has not been source-fps certified.",
    evidence: [TRUTH, RAW, ".codex-temp/search-mid-exit-position-swaps.jsonl", ".codex-temp/solve-one-mid-exit.mjs"],
  },
  {
    levelId: 62,
    kinds: ["physical-panel-capacity-conflict"],
    reason: "The video-backed Lv62 shutter is 4x2/count4 and has only eight physical cells, while its exact direct cohort is H3x4 plus V3x2 and occupies eighteen cells. Direct ownership cannot be represented without overlap, clipping, shape change or non-spatial staging, all of which are forbidden for this batch.",
    evidence: [TRUTH, "deliverables/competitor-screenshots/BlockOut-competitor-levels-001-100-2026-06/levels/competitor-level-062.jpg"],
  },
] as const satisfies readonly CompetitorMidExitStructuralBatchCBlocker[];
