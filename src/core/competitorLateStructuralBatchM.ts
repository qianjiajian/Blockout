import type { LevelSpec, Point } from "./types";

/**
 * Evidence-bounded late structural batch M.
 *
 * Only Lv192 has a source-complete, model-compatible delta in this batch:
 * the two value-2 numeric-ice carriers are opening-visible SINGLE blocks.
 * The existing runtime had retained the right values/count but attached one
 * counter to an H3 carrier.  Rebinding the two counters does not alter board
 * geometry, colours, exits, cover staging, locks, portals or seams.
 *
 * Every other late-level gap remains explicit below.  In particular, this
 * layer never invents missing frozen-exit colours, hidden cover cohorts or
 * extra key tokens, and it never publishes numeric counters that cannot thaw
 * under the current one-step-per-clear PuzzleModel semantics.
 */
export const COMPETITOR_LATE_STRUCTURAL_BATCH_M_VERSION =
  "competitor-late-structural-batch-m-r1" as const;

export const COMPETITOR_LATE_STRUCTURAL_BATCH_M_REQUESTED_LEVEL_IDS = [
  192, 194, 195, 197, 198, 199, 200,
] as const;

export const COMPETITOR_LATE_STRUCTURAL_BATCH_M_CERTIFIED_LEVEL_IDS = [192] as const;
export const COMPETITOR_LATE_STRUCTURAL_BATCH_M_USES_STAGING_FALLBACK = false as const;

export const COMPETITOR_LATE_STRUCTURAL_BATCH_M_LV192_NUMERIC_ICE = {
  "lv192-opening-b13": { shape: [[0, 0]] as readonly Point[], value: 2 },
  "lv192-opening-b14": { shape: [[0, 0]] as readonly Point[], value: 2 },
} as const;

/** Lv200 is already exact for the independently supported coloured-grid field. */
export const COMPETITOR_LATE_STRUCTURAL_BATCH_M_LV200_COLORED_GRID = {
  id: "mechanism-attribute-grid-200",
  color: "red",
  cells: [
    [0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4],
    [0, 5], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5],
  ] as readonly Point[],
} as const;

const sameShape = (left: readonly Point[], right: readonly Point[]): boolean => (
  left.length === right.length
  && left.every(([x, y], index) => x === right[index]?.[0] && y === right[index]?.[1])
);

const openingVisibleIds = (level: LevelSpec): Set<string> => {
  const queued = new Set((level.generators ?? []).flatMap(({ queueBlockIds }) => queueBlockIds));
  const closed = new Set((level.shutters ?? []).filter(({ count }) => count > 0).map(({ id }) => id));
  return new Set(level.blocks
    .filter(({ id, shutterId }) => !queued.has(id) && !(shutterId && closed.has(shutterId)))
    .map(({ id }) => id));
};

const repairLv192NumericIce = (source: LevelSpec): LevelSpec => {
  const visible = openingVisibleIds(source);
  for (const [blockId, contract] of Object.entries(COMPETITOR_LATE_STRUCTURAL_BATCH_M_LV192_NUMERIC_ICE)) {
    const block = source.blocks.find(({ id }) => id === blockId);
    if (!block || !visible.has(blockId) || !sameShape(block.shape, contract.shape)) {
      throw new Error(`Lv192 late batch M numeric-ice carrier ${blockId} drift`);
    }
  }

  let changed = false;
  const blocks = source.blocks.map((block) => {
    const contract = COMPETITOR_LATE_STRUCTURAL_BATCH_M_LV192_NUMERIC_ICE[
      block.id as keyof typeof COMPETITOR_LATE_STRUCTURAL_BATCH_M_LV192_NUMERIC_ICE
    ];
    const nextFrozen = contract?.value;
    if (block.frozen === nextFrozen) return block;
    changed = true;
    const { frozen: _frozen, ...plain } = block;
    return nextFrozen === undefined ? plain : { ...plain, frozen: nextFrozen };
  });

  return changed ? { ...source, blocks } : source;
};

export const applyCompetitorLateStructuralBatchM = (source: LevelSpec): LevelSpec => (
  source.id === 192 ? repairLv192NumericIce(source) : source
);

const TRUTH =
  "deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json";
const GENERATED = "src/core/videoParityLevels101To200.generated.ts";
const REPORT =
  "playtest-results/experiments/competitor-late-structural-batch-m-2026-09-21/report.json";
const VIDEO_192_194 = "C:/Users/Administrator/Desktop/block out/参考视频/192-194.mp4";
const VIDEO_194_197 = "C:/Users/Administrator/Desktop/block out/参考视频/194-197.mp4";
const VIDEO_197_200 = "C:/Users/Administrator/Desktop/block out/参考视频/197-200.mp4";

export type CompetitorLateStructuralBatchMBlockerKind =
  | "source-full-composition-incomplete"
  | "source-mouth-colour-unresolved"
  | "source-cover-cohort-incomplete"
  | "insufficient-key-tokens"
  | "unsupported-source-colour"
  | "static-unsat"
  | "model-countdown-capacity-conflict"
  | "source-mechanism-classification-conflict"
  | "solver-inconclusive";

export interface CompetitorLateStructuralBatchMBlocker {
  readonly levelId: 192 | 194 | 195 | 197 | 198 | 199 | 200;
  readonly kinds: readonly CompetitorLateStructuralBatchMBlockerKind[];
  readonly reason: string;
  readonly evidence: readonly string[];
}

/** Residual gaps deliberately excluded from the certified Lv192 attribute repair. */
export const COMPETITOR_LATE_STRUCTURAL_BATCH_M_BLOCKERS = [
  {
    levelId: 192,
    kinds: ["source-full-composition-incomplete", "source-mouth-colour-unresolved", "source-cover-cohort-incomplete", "insufficient-key-tokens"],
    reason: "The two opening SINGLE ice-2 carriers are certified and repaired, but the source records only one visible key block while the three locks require 2/1/2 releases. PuzzleModel releases one token per cleared key block, so at least two matching key blocks are needed; the exact extra key identity/mapping, all five frozen-exit colours/spans and the hidden count-6 cohort remain source-unclear.",
    evidence: [TRUTH, VIDEO_192_194, GENERATED, REPORT],
  },
  {
    levelId: 194,
    kinds: ["source-full-composition-incomplete", "source-mouth-colour-unresolved", "source-cover-cohort-incomplete"],
    reason: "The four cover rectangles/counts 10/7/7/5 and six frozen values are visible, but the complete hidden inventory, its assignment across four releases and all frozen-exit colour/rail bindings are absent. Reusing generated colours or partitioning the pooled blocks would manufacture source facts, so no structural cover/exit replacement is published.",
    evidence: [TRUTH, VIDEO_194_197, GENERATED, REPORT],
  },
  {
    levelId: 195,
    kinds: ["source-mouth-colour-unresolved", "insufficient-key-tokens", "unsupported-source-colour", "solver-inconclusive"],
    reason: "The source shows two V3 locks requiring three releases each but only one recorded key carrier. The second locked colour is lime, outside the runtime palette, and frozen-exit colours remain unknown. A counters-only projection on current gates reaches the 20k state cap, while restoring locks with one key can never release either requirement-3 carrier.",
    evidence: [TRUTH, VIDEO_194_197, GENERATED, REPORT],
  },
  {
    levelId: 197,
    kinds: ["source-mouth-colour-unresolved", "source-mechanism-classification-conflict", "static-unsat"],
    reason: "The six frozen values/sides are exact, but their colours and rail spans are not. The video also shows a circular double-arrow badge whose gameplay effect remains unclassified; the generated raw exit set leaves five star blocks and several ordinary colours without compatible exits. Guessing star classification or frozen colours is therefore unsafe.",
    evidence: [TRUTH, VIDEO_194_197, GENERATED, REPORT],
  },
  {
    levelId: 198,
    kinds: ["model-countdown-capacity-conflict"],
    reason: "Truth requires eleven opening numeric-ice values 23/31/33/35/37/39/15/13/13/12/4 on a 30-block level. Under the current authoritative rule a frozen block loses one step only when another block clears, so a value-39 carrier has at most 29 prior clears and cannot thaw. Publishing the exact values would be a proven model-level deadlock, not a solver-budget issue.",
    evidence: [TRUTH, VIDEO_197_200, GENERATED, REPORT],
  },
  {
    levelId: 199,
    kinds: ["source-full-composition-incomplete", "source-mouth-colour-unresolved", "source-cover-cohort-incomplete", "model-countdown-capacity-conflict"],
    reason: "Five cover regions/counts and frozen values are visible, but the full inventory, all five hidden cohorts and frozen colours are not. The highest frozen value is 29 while the generated/full projection has 27 blocks, so binding that counter to any required colour can exceed the 26 prior-clear capacity. No cohort or sacrificial colour is inferred.",
    evidence: [TRUTH, VIDEO_197_200, GENERATED, REPORT],
  },
  {
    levelId: 200,
    kinds: ["source-mouth-colour-unresolved", "source-mechanism-classification-conflict", "solver-inconclusive"],
    reason: "The 12 red coloured-grid cells are already exact and enforced, but all six frozen-exit colours are marked unclear. Post-thaw video frames show framed two-colour H3 pieces while the formal truth declares no shells, so the carrier classification must be reconciled before replacing the opening. A source-layout candidate with current exits remained max-states at 30k and is not certified.",
    evidence: [TRUTH, VIDEO_197_200, GENERATED, REPORT],
  },
] as const satisfies readonly CompetitorLateStructuralBatchMBlocker[];
