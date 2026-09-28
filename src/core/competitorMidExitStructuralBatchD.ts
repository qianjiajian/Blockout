import type { BlockColor, GateSpec, LevelSpec, Point, Side } from "./types";

export const COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_D_VERSION =
  "competitor-mid-exit-structural-batch-d-r1" as const;

export const COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_D_REQUESTED_LEVEL_IDS = [
  66, 67, 68, 69, 71, 72, 74,
] as const;

/** Only source-backed candidates with a fresh solve and PuzzleModel replay. */
export const COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_D_CERTIFIED_LEVEL_IDS = [72] as const;

export const COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_D_USES_STAGING_FALLBACK = false as const;

const TRUTH =
  "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json";
const SCREENSHOTS =
  "deliverables/competitor-screenshots/BlockOut-competitor-levels-001-100-2026-06/levels";
const VIDEO_61_70 = "C:/Users/Administrator/Desktop/block out/参考视频/61-70.mp4";
const VIDEO_71_80 = "C:/Users/Administrator/Desktop/block out/参考视频/71-80.mp4";
const SHUTTER_BATCH_B = ".codex-temp/lv67-shutter-blocker-evidence.json";
const SHUTTER_BATCH_C =
  "playtest-results/experiments/competitor-shutter-structural-batch-c-2026-09-21/report.json";

export type CompetitorMidExitStructuralBatchDBlockerKind =
  | "source-opening-reconstruction-required"
  | "source-inventory-conflict"
  | "source-mouth-colour-unresolved"
  | "fresh-solver-not-certified"
  | "source-physical-exits-incomplete"
  | "physical-panel-capacity-conflict";

export interface CompetitorMidExitStructuralBatchDBlocker {
  readonly levelId: 66 | 67 | 68 | 69 | 71 | 74;
  readonly kind: CompetitorMidExitStructuralBatchDBlockerKind;
  readonly detail: string;
  readonly evidence: readonly string[];
}

/**
 * Explicitly rejected candidates.  None of these entries authorizes an outer
 * fallback rail, a guessed frozen-exit colour, a resized cover or a staging
 * shutter.  They remain unchanged until the missing source fact/certificate
 * exists.
 */
export const COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_D_BLOCKERS = [
  {
    levelId: 66,
    kind: "source-opening-reconstruction-required",
    detail: "Truth fixes one ordinary exit plus frozen 1/2/3/4/16, but the final runtime opening is a staging/lift substitute. The raw six-mouth projection has six opening same-colour contacts, so restoring only its exits would publish a non-source opening without an adjacency or replay certificate.",
    evidence: [TRUTH, VIDEO_61_70, `${SCREENSHOTS}/competitor-level-066.jpg`],
  },
  {
    levelId: 67,
    kind: "source-inventory-conflict",
    detail: "Source-fps frames show the real 3x2 count-3 neck cover directly revealing two H3 pieces, while the present truth/raw inventory cannot supply that direct cohort. The exact counters solve only on fallback outer rails and staging, which is not a physical-mouth repair.",
    evidence: [TRUTH, VIDEO_61_70, `${SCREENSHOTS}/competitor-level-067.jpg`, SHUTTER_BATCH_B],
  },
  {
    levelId: 68,
    kind: "source-mouth-colour-unresolved",
    detail: "The frame proves ten mouths and frozen 3/5/6/6/10/11/13/15/15 on the two exact 7x4 rooms, but ice hides the colour-to-mouth mapping. Raw colours placed on those final local mouths are not source-proven, and the tested exact raw projection exhausts immediately; guessing colours is forbidden.",
    evidence: [TRUTH, VIDEO_61_70, `${SCREENSHOTS}/competitor-level-068.jpg`],
  },
  {
    levelId: 69,
    kind: "fresh-solver-not-certified",
    detail: "All four source rectangles and their 19 direct pieces can be packed, but 104 validation/adjacency-clean openings produced no replay: 84 exhaust at 1,000 states, the remaining 20 at 10,000, and a representative still reaches 100,000 states.",
    evidence: [TRUTH, VIDEO_61_70, `${SCREENSHOTS}/competitor-level-069.jpg`, SHUTTER_BATCH_C],
  },
  {
    levelId: 71,
    kind: "source-physical-exits-incomplete",
    detail: "Source-fps truth requires one ordinary exit plus frozen 1/2/3/8/12/13/15/17/21. Raw generated data has only eight physical exits and omits 12 and 13, so neither their colours nor their local mouths may be invented around the preserved generator and count-12 cover.",
    evidence: [TRUTH, VIDEO_71_80, `${SCREENSHOTS}/competitor-level-071.jpg`],
  },
  {
    levelId: 74,
    kind: "physical-panel-capacity-conflict",
    detail: "The source count-23 direct cohort H3+V3+L4+T4 occupies 14 cells but its video rectangle is 3x4 (12 cells). Moving a piece to another countdown or enlarging the panel would contradict the source reveal ledger.",
    evidence: [TRUTH, VIDEO_71_80, `${SCREENSHOTS}/competitor-level-074.jpg`, SHUTTER_BATCH_C],
  },
] as const satisfies readonly CompetitorMidExitStructuralBatchDBlocker[];

const portalGate = (
  id: string,
  color: BlockColor,
  side: Side,
  origin: Point,
  size: number,
  frozen?: number,
): GateSpec => ({
  id,
  color,
  side,
  offset: side === "top" || side === "bottom" ? origin[0] : origin[1],
  size,
  ...(frozen === undefined ? {} : { frozen }),
  portals: [{ side, origin, size }],
});

/**
 * 71-80.mp4 Lv72 opening (257.5s) fixes eight distinct local mouths:
 * - upper count-7 room: top 8 and right 10;
 * - middle room: top 1, left 3, right ordinary and lower-notch 2;
 * - lower room: right ordinary and bottom 4.
 *
 * Colours and logical spans follow the canonical raw fixed-orientation exit
 * contract.  `portals` place those exits on the actual concave component
 * boundaries instead of the old outer fallback rails.
 */
const LV72_GATES: readonly GateSpec[] = [
  portalGate("source-lv072-upper-top-8", "blue", "top", [4, 0], 3, 8),
  portalGate("source-lv072-upper-right-10", "pink", "right", [6, 1], 3, 10),
  portalGate("source-lv072-middle-top-1", "purple", "top", [1, 5], 3, 1),
  portalGate("source-lv072-middle-left-3", "green", "left", [0, 7], 3, 3),
  portalGate("source-lv072-middle-right-ordinary", "orange", "right", [6, 5], 3),
  portalGate("source-lv072-middle-bottom-2", "cyan", "bottom", [4, 7], 3, 2),
  portalGate("source-lv072-lower-right-ordinary", "red", "right", [6, 10], 3),
  portalGate("source-lv072-lower-bottom-4", "yellow", "bottom", [0, 12], 3, 4),
];

const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);

const cloneGate = (gate: GateSpec): GateSpec => ({
  ...gate,
  portals: gate.portals?.map((portal) => ({
    ...portal,
    origin: [...portal.origin] as Point,
  })),
});

const assertLv72Source = (source: LevelSpec): void => {
  if (source.width !== 7 || source.height !== 13 || source.blocks.length !== 19) {
    throw new Error("Lv72 mid-exit batch D board/composition drift");
  }
  if ((source.generators?.length ?? 0) !== 0 || (source.flipDoors?.length ?? 0) !== 0) {
    throw new Error("Lv72 mid-exit batch D generator/flip-door drift");
  }
  const shutters = source.shutters ?? [];
  if (shutters.length !== 1 || !same(
    { id: shutters[0]!.id, x: shutters[0]!.x, y: shutters[0]!.y, width: shutters[0]!.width, height: shutters[0]!.height, count: shutters[0]!.count, skin: shutters[0]!.skin },
    { id: "vp-072-cover-1", x: 4, y: 0, width: 3, height: 4, count: 7, skin: "shutter" },
  )) {
    throw new Error("Lv72 mid-exit batch D source cover drift");
  }
  const direct = source.blocks.filter(({ shutterId }) => shutterId === "vp-072-cover-1").map(({ id }) => id);
  if (!same(direct, ["cc-072-b2-01", "cc-072-b2-02", "cc-072-b2-03", "cc-072-b2-04", "cc-072-b2-05"])) {
    throw new Error("Lv72 mid-exit batch D source cover cohort drift");
  }
};

/** Restores only the solver/replay-certified Lv72 physical exit contract. */
export const applyCompetitorMidExitStructuralBatchD = (source: LevelSpec): LevelSpec => {
  if (source.id !== 72) return source;
  assertLv72Source(source);
  if (source.gates.length === LV72_GATES.length
    && (source.flipDoors?.length ?? 0) === 0
    && source.gates.every((gate, index) => same(gate, LV72_GATES[index]))) return source;
  return {
    ...source,
    gates: LV72_GATES.map(cloneGate),
    flipDoors: undefined,
  };
};
