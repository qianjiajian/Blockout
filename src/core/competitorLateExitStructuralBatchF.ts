import type { BlockColor, GateSpec, LevelSpec, Point } from "./types";

export const COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_F_VERSION =
  "competitor-late-exit-structural-batch-f-r1" as const;

export const COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_F_REQUESTED_LEVEL_IDS = [
  102, 104, 106, 108, 110, 113, 118, 120, 123, 124,
] as const;

/** No requested level satisfies both exact source parity and every global hard gate. */
export const COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_F_CERTIFIED_LEVEL_IDS = [] as const;

export const COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_F_USES_STAGING_FALLBACK = false as const;

const TRUTH =
  "deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json";
const SCREENSHOTS =
  "deliverables/competitor-vs-ours-lv101-200-candidates-v1/competitor-opening";
const VIDEO_101_110 = "C:/Users/Administrator/Desktop/block out/参考视频/101-110.mp4";
const VIDEO_111_120 = "C:/Users/Administrator/Desktop/block out/参考视频/111-120.mp4";
const VIDEO_121_130 = "C:/Users/Administrator/Desktop/block out/参考视频/121-130.mp4";

export type CompetitorLateExitStructuralBatchFBlockerKind =
  | "source-board-incomplete"
  | "source-hidden-composition-incomplete"
  | "source-physical-exits-incomplete"
  | "source-mouth-colour-unresolved"
  | "source-opening-reconstruction-required"
  | "global-adjacency-contract-conflict";

export interface CompetitorLateExitStructuralBatchFBlocker {
  readonly levelId: 102 | 104 | 106 | 108 | 110 | 113 | 118 | 120 | 123 | 124;
  readonly kind: CompetitorLateExitStructuralBatchFBlockerKind;
  readonly detail: string;
  readonly evidence: readonly string[];
}

/**
 * Evidence-backed blockers.  They deliberately reject guessed frozen-exit
 * colours, outer fallback rails, resized covers and staging substitutions.
 */
export const COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_F_BLOCKERS = [
  {
    levelId: 102,
    kind: "source-board-incomplete",
    detail: "Truth leaves the board extent/mask, full hidden composition and every directional exit absent; the opening frame only proves the two count-9/count-13 covers and nine visible SQ2 pieces.",
    evidence: [TRUTH, VIDEO_101_110, `${SCREENSHOTS}/level-102.jpg`],
  },
  {
    levelId: 104,
    kind: "source-hidden-composition-incomplete",
    detail: "The 7x10 mask and count-12/count-6 covers are known, but the complete hidden inventory and all seven frozen-exit colour/offset/size bindings remain unclear; raw generated bindings are not video facts.",
    evidence: [TRUTH, VIDEO_101_110, `${SCREENSHOTS}/level-104.jpg`],
  },
  {
    levelId: 106,
    kind: "source-physical-exits-incomplete",
    detail: "Video truth requires eleven frozen counters plus one orange star exit, while raw data contains only seven frozen exits plus the star exit and the exact board mask is missing.",
    evidence: [TRUTH, VIDEO_101_110, `${SCREENSHOTS}/level-106.jpg`],
  },
  {
    levelId: 108,
    kind: "source-opening-reconstruction-required",
    detail: "The frame proves the full 6x8/15-piece opening and eleven exit classes, but visible anchors and every frozen colour/offset/size binding remain unrecorded; the final adjacency overlay has also moved source pieces, so exits alone cannot restore the opening.",
    evidence: [TRUTH, VIDEO_101_110, `${SCREENSHOTS}/level-108.jpg`],
  },
  {
    levelId: 110,
    kind: "source-hidden-composition-incomplete",
    detail: "The 6x10 board and count-4 cover are known, but its hidden six-piece cohort/full composition and five frozen colour/geometry bindings are not exact in truth.",
    evidence: [TRUTH, VIDEO_101_110, `${SCREENSHOTS}/level-110.jpg`],
  },
  {
    levelId: 113,
    kind: "source-board-incomplete",
    detail: "Truth does not fix the board mask, full hidden inventory or either cover rectangle; six frozen exits also lack colour and physical mouth bindings.",
    evidence: [TRUTH, VIDEO_111_120, `${SCREENSHOTS}/level-113.jpg`],
  },
  {
    levelId: 118,
    kind: "source-mouth-colour-unresolved",
    detail: "The 7x8/23-piece opening is complete, but six frozen colours/mouths are unclear and the frame contains a cyan star block without a recorded star exit; a routable exact binding would be guessed.",
    evidence: [TRUTH, VIDEO_111_120, `${SCREENSHOTS}/level-118.jpg`],
  },
  {
    levelId: 120,
    kind: "global-adjacency-contract-conflict",
    detail: "The exact video opening fresh-solves in 87,855 states and replays in 35 drags, but its red bomb at (4,4) is orthogonally adjacent to the red outer layer of the red/blue shell at (4,6). Recolouring or moving either piece would contradict the exact source opening, so it cannot satisfy the global all-block adjacency rule.",
    evidence: [
      TRUTH,
      VIDEO_111_120,
      `${SCREENSHOTS}/level-120.jpg`,
      "playtest-results/experiments/competitor-late-exit-structural-batch-f-2026-09-21/report.json",
    ],
  },
  {
    levelId: 123,
    kind: "source-board-incomplete",
    detail: "Truth leaves the board mask, full count/histogram and exact count-3 cover rectangle unresolved; all six frozen colours and physical mouth bindings are also unclear.",
    evidence: [TRUTH, VIDEO_121_130, `${SCREENSHOTS}/level-123.jpg`],
  },
  {
    levelId: 124,
    kind: "source-mouth-colour-unresolved",
    detail: "The 7x7/23-piece opening is complete, but the four frozen exit colours/offsets/sizes and visible piece anchors remain unclear; current all-adjacency recolours differ from the source frame and cannot certify a gate-only repair.",
    evidence: [TRUTH, VIDEO_121_130, `${SCREENSHOTS}/level-124.jpg`],
  },
] as const satisfies readonly CompetitorLateExitStructuralBatchFBlocker[];

interface Lv120BlockBinding {
  readonly x: number;
  readonly y: number;
  readonly color: BlockColor;
  readonly inner?: BlockColor;
  readonly timedBombSeconds?: number;
}

/**
 * Untouched Lv120 opening at 111-120.mp4 second 971.  The six shell bindings
 * and three bomb anchors are also recorded verbatim in the formal truth.
 */
export const COMPETITOR_LATE_EXIT_LV120_BLOCKS: Readonly<Record<string, Lv120BlockBinding>> = {
  "lv120-opening-b01": { x: 0, y: 0, color: "yellow" },
  "lv120-opening-b02": { x: 4, y: 0, color: "yellow", inner: "blue" },
  "lv120-opening-b03": { x: 0, y: 2, color: "blue" },
  "lv120-opening-b04": { x: 2, y: 2, color: "red", timedBombSeconds: 15 },
  "lv120-opening-b05": { x: 4, y: 2, color: "green", inner: "blue" },
  "lv120-opening-b06": { x: 0, y: 4, color: "yellow", inner: "blue" },
  "lv120-opening-b07": { x: 2, y: 4, color: "green" },
  "lv120-opening-b08": { x: 4, y: 4, color: "red", timedBombSeconds: 25 },
  "lv120-opening-b09": { x: 0, y: 6, color: "red", inner: "yellow", timedBombSeconds: 50 },
  "lv120-opening-b10": { x: 2, y: 6, color: "blue", inner: "red" },
  "lv120-opening-b11": { x: 4, y: 6, color: "red", inner: "blue" },
};

/**
 * Exact physical rails witnessed over the complete playthrough:
 * - second 971: red ordinary top-left and frozen 4/10/6 counters;
 * - second 988: count-4 rail unlocks green;
 * - second 991: count-6 rail unlocks yellow;
 * - second 994: count-10 rail unlocks blue.
 */
export const COMPETITOR_LATE_EXIT_LV120_GATES: readonly GateSpec[] = [
  { id: "source-lv120-red-ordinary", color: "red", side: "top", offset: 0, size: 2 },
  { id: "source-lv120-green-4", color: "green", side: "top", offset: 2, size: 2, frozen: 4 },
  { id: "source-lv120-blue-10", color: "blue", side: "top", offset: 4, size: 2, frozen: 10 },
  { id: "source-lv120-yellow-6", color: "yellow", side: "bottom", offset: 2, size: 2, frozen: 6 },
] as const;

const SQ2: readonly Point[] = [[0, 0], [1, 0], [0, 1], [1, 1]];

const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);

const assertLv120Source = (source: LevelSpec): void => {
  const ids = source.blocks.map(({ id }) => id).sort();
  const expectedIds = Object.keys(COMPETITOR_LATE_EXIT_LV120_BLOCKS).sort();
  if (source.width !== 6 || source.height !== 8 || (source.playable?.length ?? 48) !== 48
    || !same(ids, expectedIds)) {
    throw new Error("Lv120 late-exit batch F board/composition drift");
  }
  if (!source.blocks.every(({ shape }) => same(shape, SQ2))) {
    throw new Error("Lv120 late-exit batch F expected eleven SQ2 blocks");
  }
  if ((source.shutters?.length ?? 0) !== 0 || (source.generators?.length ?? 0) !== 0
    || (source.flipDoors?.length ?? 0) !== 0) {
    throw new Error("Lv120 late-exit batch F unexpected staged/generator/flip-door mechanism");
  }
};

/** Builds the exact, solved Lv120 source candidate retained as rejected evidence. */
export const buildCompetitorLateExitLv120RejectedCandidate = (source: LevelSpec): LevelSpec => {
  assertLv120Source(source);
  const blocks = source.blocks.map((block) => {
    const binding = COMPETITOR_LATE_EXIT_LV120_BLOCKS[block.id];
    if (!binding) throw new Error(`Lv120 late-exit batch F missing binding for ${block.id}`);
    return {
      id: block.id,
      x: binding.x,
      y: binding.y,
      shape: block.shape.map(([x, y]) => [x, y] as Point),
      color: binding.color,
      ...(binding.inner ? { layers: [binding.color, binding.inner] } : {}),
      ...(binding.timedBombSeconds ? { timedBombSeconds: binding.timedBombSeconds } : {}),
    };
  });
  const gates = COMPETITOR_LATE_EXIT_LV120_GATES.map((gate) => ({ ...gate }));
  return { ...source, blocks, gates, flipDoors: undefined };
};

/** No-op until one requested level meets every exactness and runtime contract. */
export const applyCompetitorLateExitStructuralBatchF = (source: LevelSpec): LevelSpec => source;
