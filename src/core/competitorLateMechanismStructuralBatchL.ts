import type { BlockColor, BlockSpec, LevelSpec, Point } from "./types";

/**
 * Evidence-bounded late mechanism batch L (Lv177/Lv179-189 subset).
 *
 * Three source-complete carrier corrections are safe on the current formal
 * runtime: Lv184's V2 shell colours, Lv186's PLUS5 numeric-ice carrier and
 * Lv189's opening L4 numeric-ice carrier.  The remaining exit, cover, lock,
 * generator and axis gaps are deliberately retained as blockers below.
 *
 * This module is intentionally not wired into `levels.ts` by this batch.
 */
export const COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_L_VERSION =
  "competitor-late-mechanism-structural-batch-l-r1" as const;

export const COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_L_REQUESTED_LEVEL_IDS = [
  177, 179, 180, 181, 182, 183, 184, 186, 187, 188, 189,
] as const;

export const COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_L_CERTIFIED_LEVEL_IDS = [
  184, 186, 189,
] as const;

export const COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_L_USES_STAGING_FALLBACK = false as const;

export const COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_L_LV184_SHELL = {
  blockId: "lv184-opening-b04",
  shape: [[0, 0], [0, 1]] as readonly Point[],
  layers: ["yellow", "green"] as readonly [BlockColor, BlockColor],
} as const;

export const COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_L_LV186_NUMERIC_ICE = {
  blockId: "lv186-opening-b17",
  displacedBlockId: "lv186-opening-b18",
  color: "cyan" as BlockColor,
  shape: [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]] as readonly Point[],
  value: 17,
} as const;

export const COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_L_LV189_NUMERIC_ICE = {
  blockId: "lv189-opening-b02",
  displacedBlockId: "lv189-pooled-hidden-b11",
  color: "purple" as BlockColor,
  x: 2,
  y: 8,
  shape: [[2, 0], [0, 1], [1, 1], [2, 1]] as readonly Point[],
  value: 18,
} as const;

const sameShape = (left: readonly Point[], right: readonly Point[]): boolean => (
  left.length === right.length
  && left.every(([x, y], index) => x === right[index]?.[0] && y === right[index]?.[1])
);

const openingVisibleIds = (level: LevelSpec): Set<string> => {
  const queued = new Set((level.generators ?? []).flatMap(({ queueBlockIds }) => queueBlockIds));
  const closed = new Set((level.shutters ?? [])
    .filter(({ count }) => count > 0)
    .map(({ id }) => id));
  return new Set(level.blocks
    .filter(({ id, shutterId }) => !queued.has(id) && !(shutterId && closed.has(shutterId)))
    .map(({ id }) => id));
};

const withoutFrozen = (block: BlockSpec): BlockSpec => {
  const { frozen: _frozen, ...plain } = block;
  return plain;
};

const repairLv184Shell = (source: LevelSpec): LevelSpec => {
  const contract = COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_L_LV184_SHELL;
  const carrier = source.blocks.find(({ id }) => id === contract.blockId);
  const layered = source.blocks.filter(({ layers }) => (layers?.length ?? 0) > 1);
  if (!carrier || !sameShape(carrier.shape, contract.shape)
    || !openingVisibleIds(source).has(contract.blockId)
    || layered.length !== 1 || layered[0]?.id !== contract.blockId) {
    throw new Error("Lv184 late batch L opening V2 shell carrier drift");
  }
  if (carrier.color === contract.layers[0]
    && carrier.layers?.length === 2
    && carrier.layers[0] === contract.layers[0]
    && carrier.layers[1] === contract.layers[1]) return source;
  return {
    ...source,
    blocks: source.blocks.map((block) => block.id === contract.blockId ? {
      ...block,
      color: contract.layers[0],
      layers: [...contract.layers],
    } : block),
  };
};

const repairLv186NumericIce = (source: LevelSpec): LevelSpec => {
  const contract = COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_L_LV186_NUMERIC_ICE;
  const carrier = source.blocks.find(({ id }) => id === contract.blockId);
  const displaced = source.blocks.find(({ id }) => id === contract.displacedBlockId);
  const visible = openingVisibleIds(source);
  const valueOwners = source.blocks.filter(({ frozen }) => frozen === contract.value);
  if (!carrier || !displaced
    || carrier.color !== contract.color
    || !sameShape(carrier.shape, contract.shape)
    || !sameShape(displaced.shape, contract.shape)
    || !visible.has(contract.blockId) || !visible.has(contract.displacedBlockId)
    || valueOwners.some(({ id }) => id !== contract.blockId && id !== contract.displacedBlockId)) {
    throw new Error("Lv186 late batch L PLUS5 numeric-ice carrier drift");
  }
  if (carrier.frozen === contract.value && displaced.frozen === undefined) return source;
  return {
    ...source,
    blocks: source.blocks.map((block) => {
      if (block.id === contract.blockId) return { ...withoutFrozen(block), frozen: contract.value };
      return block.id === contract.displacedBlockId ? withoutFrozen(block) : block;
    }),
  };
};

const repairLv189NumericIce = (source: LevelSpec): LevelSpec => {
  const contract = COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_L_LV189_NUMERIC_ICE;
  const carrier = source.blocks.find(({ id }) => id === contract.blockId);
  const displaced = source.blocks.find(({ id }) => id === contract.displacedBlockId);
  const visible = openingVisibleIds(source);
  const valueOwners = source.blocks.filter(({ frozen }) => frozen === contract.value);
  if (!carrier || !displaced || carrier.layers?.length
    || !visible.has(contract.blockId) || visible.has(contract.displacedBlockId)
    || valueOwners.some(({ id }) => id !== contract.blockId && id !== contract.displacedBlockId)) {
    throw new Error("Lv189 late batch L opening L4 numeric-ice carrier drift");
  }
  const applied = carrier.x === contract.x && carrier.y === contract.y
    && carrier.color === contract.color && carrier.frozen === contract.value
    && sameShape(carrier.shape, contract.shape) && displaced.frozen === undefined;
  if (applied) return source;
  return {
    ...source,
    blocks: source.blocks.map((block) => {
      if (block.id === contract.blockId) return {
        ...withoutFrozen(block),
        x: contract.x,
        y: contract.y,
        shape: contract.shape.map(([x, y]) => [x, y] as Point),
        color: contract.color,
        frozen: contract.value,
      };
      return block.id === contract.displacedBlockId ? withoutFrozen(block) : block;
    }),
  };
};

export const applyCompetitorLateMechanismStructuralBatchL = (source: LevelSpec): LevelSpec => {
  if (source.id === 184) return repairLv184Shell(source);
  if (source.id === 186) return repairLv186NumericIce(source);
  if (source.id === 189) return repairLv189NumericIce(source);
  return source;
};

const TRUTH =
  "deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json";
const GENERATED = "src/core/videoParityLevels101To200.generated.ts";
const REPORT =
  "playtest-results/experiments/competitor-late-mechanism-structural-batch-l-2026-09-21/report.json";
const VIDEO_176_179 = "C:/Users/Administrator/Desktop/block out/参考视频/176-179.mp4";
const VIDEO_179 = "C:/Users/Administrator/Desktop/block out/参考视频/179.mp4";
const VIDEO_180_189 = "C:/Users/Administrator/Desktop/block out/参考视频/180-189.mp4";

export type CompetitorLateMechanismStructuralBatchLLevelId =
  typeof COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_L_REQUESTED_LEVEL_IDS[number];

export type CompetitorLateMechanismStructuralBatchLBlockerKind =
  | "source-full-composition-incomplete"
  | "source-mouth-colour-unresolved"
  | "source-cover-cohort-incomplete"
  | "source-opening-footprint-incomplete"
  | "insufficient-key-tokens"
  | "source-axis-contract-conflict"
  | "static-unsat"
  | "runtime-geometry-conflict";

export interface CompetitorLateMechanismStructuralBatchLBlocker {
  readonly levelId: CompetitorLateMechanismStructuralBatchLLevelId;
  readonly kinds: readonly CompetitorLateMechanismStructuralBatchLBlockerKind[];
  readonly reason: string;
  readonly evidence: readonly string[];
}

/** Residual gaps intentionally excluded from the three certified repairs. */
export const COMPETITOR_LATE_MECHANISM_STRUCTURAL_BATCH_L_BLOCKERS = [
  {
    levelId: 177,
    kinds: ["source-mouth-colour-unresolved", "source-opening-footprint-incomplete", "static-unsat"],
    reason: "Truth and the opening frame prove a top-machine queue of three, five frozen exits at value 2 and one opening T6 numeric-ice-12 carrier, but the frozen mouth colours and a source-exact runtime carrier/footprint mapping remain unresolved. The untouched projection has nine missing-compatible-exit contradictions, so moving the counter or recolouring a mouth would guess source data.",
    evidence: [TRUTH, `${VIDEO_176_179}#t=93`, GENERATED, REPORT],
  },
  {
    levelId: 179,
    kinds: ["source-full-composition-incomplete", "insufficient-key-tokens", "static-unsat"],
    reason: "The opening proves red and blue SQ2 locks requiring three releases and two visible key blocks, but the full composition and any additional matching tokens are absent. The raw exact-count projection cannot satisfy either requirement-3 lock with the recorded tokens and exhausts immediately; inventing extra keys or lowering either count is forbidden.",
    evidence: [TRUTH, `${VIDEO_179}#t=0`, GENERATED, REPORT],
  },
  {
    levelId: 180,
    kinds: ["source-mouth-colour-unresolved", "source-opening-footprint-incomplete", "static-unsat"],
    reason: "The 23-piece opening and frozen values by side are visible, but the low-resolution source does not certify every footprint or any frozen colour/span binding. The raw projection has same-colour contacts and multiple missing-compatible-exit contradictions. A seven-mouth replacement would therefore require guessed colours or a reconstructed opening beyond the recorded evidence.",
    evidence: [TRUTH, `${VIDEO_180_189}#t=8`, GENERATED, REPORT],
  },
  {
    levelId: 181,
    kinds: ["source-full-composition-incomplete", "source-cover-cohort-incomplete", "source-axis-contract-conflict", "static-unsat"],
    reason: "Truth fixes two right-component covers at counts 17 and 25 plus red-vertical and pink-horizontal V3 axis pieces, but global dimensions, full composition, hidden cohorts and mouth geometry remain incomplete. Applying only the two axis bindings to the current runtime leaves both pieces without a compatible executable route, so no partial axis/cover repair is certified.",
    evidence: [TRUTH, `${VIDEO_180_189}#t=85`, GENERATED, REPORT],
  },
  {
    levelId: 182,
    kinds: ["source-full-composition-incomplete", "source-mouth-colour-unresolved", "source-cover-cohort-incomplete", "runtime-geometry-conflict", "static-unsat"],
    reason: "Six source covers and seven frozen values are visible, while the cap rectangles, complete hidden inventory, direct cohort for every panel and all frozen mouth colours remain unclear. Runtime currently retains only one physical count-4 cover plus internal staging; expanding it to six panels without their cargo ownership would create decorative or empty covers rather than source mechanics.",
    evidence: [TRUTH, `${VIDEO_180_189}#t=160`, GENERATED, REPORT],
  },
  {
    levelId: 183,
    kinds: ["source-mouth-colour-unresolved", "source-axis-contract-conflict", "source-opening-footprint-incomplete"],
    reason: "The corrected opening-14 generator level already preserves its queue and numeric SQ3 ice-6, but the source generator order/trigger, seven frozen mouth colours and the recorded vertical red axis carrier cannot all be reconciled with the current projected shapes. Changing the generator or axis block without an exact source footprint would risk the certified center-mouth route.",
    evidence: [TRUTH, `${VIDEO_180_189}#t=259`, GENERATED, REPORT],
  },
  {
    levelId: 184,
    kinds: ["source-full-composition-incomplete", "source-mouth-colour-unresolved", "source-cover-cohort-incomplete"],
    reason: "The opening V2 shell is source-complete and repaired to yellow then green. The three panel rectangles/counts 6/20/9 are visible, but the full hidden composition, all three direct cohorts and five frozen mouth colours remain absent. Those residual mechanisms stay untouched instead of assigning inferred pooled cargo or palette-derived exits.",
    evidence: [TRUTH, `${VIDEO_180_189}#t=348`, GENERATED, REPORT],
  },
  {
    levelId: 186,
    kinds: ["source-mouth-colour-unresolved", "source-opening-footprint-incomplete"],
    reason: "The opening cyan PLUS5 ice-17 carrier is source-complete and repaired without changing either generator. Seven frozen values are visible, but their colours/spans and several ordinary/generator cargo footprints remain unclassified in the low-resolution source. The certified numeric carrier does not authorize an inferred exit palette or queue rewrite.",
    evidence: [TRUTH, `${VIDEO_180_189}#t=670`, GENERATED, REPORT],
  },
  {
    levelId: 187,
    kinds: ["source-mouth-colour-unresolved", "source-opening-footprint-incomplete", "static-unsat"],
    reason: "The video distinguishes five frozen counters and one ordinary mouth, but the formal truth still marks frozen colours and some footprints unclear. A frame-derived mouth-colour set removes the current pink route and leaves projected red cargo without a compatible exit. Restoring those mouths safely therefore requires the full source composition, not a gate-only overlay.",
    evidence: [TRUTH, `${VIDEO_180_189}#t=929`, GENERATED, REPORT],
  },
  {
    levelId: 188,
    kinds: ["source-full-composition-incomplete", "source-mouth-colour-unresolved", "source-cover-cohort-incomplete", "runtime-geometry-conflict"],
    reason: "Truth fixes 5x3 count-1 and 3x4 count-2 cover rectangles plus seven frozen values, but the full composition, both direct hidden cohorts and every frozen colour binding are unrecorded. Runtime has one small physical panel and internal staging cargo; resizing or adding the second panel without source-owned blocks would violate the cover contract.",
    evidence: [TRUTH, `${VIDEO_180_189}#t=961`, GENERATED, REPORT],
  },
  {
    levelId: 189,
    kinds: ["source-full-composition-incomplete", "source-mouth-colour-unresolved", "source-cover-cohort-incomplete"],
    reason: "The opening purple 3x2-bounded L4 ice-18 carrier is source-complete and repaired. Four panel rectangles/counts 14/24/6/12 are visible, while the full inventory, all four hidden cohorts and five frozen mouth colours remain unknown. The carrier correction does not promote inferred staging batches or guessed exit colours.",
    evidence: [TRUTH, `${VIDEO_180_189}#t=1035`, GENERATED, REPORT],
  },
] as const satisfies readonly CompetitorLateMechanismStructuralBatchLBlocker[];
