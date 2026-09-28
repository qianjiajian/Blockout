import type { BlockColor, BlockSpec, LevelSpec, Point } from "./types";

/**
 * Late evidence-backed batch J.
 *
 * The supplied videos prove four attribute repairs without requiring a new
 * exit colour, a guessed shutter cohort or a changed board cell:
 * - Lv149: numeric ice belongs to the source H2 carrier (value 2);
 * - Lv153: numeric ice belongs to the source H3/V2 carriers (15/13);
 * - Lv157: the existing V2 shell clears red, then orange;
 * - Lv159: numeric ice belongs to the opening SINGLE carrier (value 14).
 *
 * All remaining exit/cover candidates in the requested scope are retained as
 * explicit blockers below.  This layer never invents a frozen-gate colour,
 * resizes a cover, changes a cohort, expands a mask or creates staging cargo.
 */
export const COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_J_VERSION =
  "competitor-late-exit-structural-batch-j-r1" as const;

export const COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_J_REQUESTED_LEVEL_IDS = [
  136, 137, 143, 147, 148, 149, 153, 154, 157, 159,
] as const;

export const COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_J_CERTIFIED_LEVEL_IDS = [
  149, 153, 157, 159,
] as const;

export const COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_J_USES_STAGING_FALLBACK = false as const;

type NumericIceAssignments = Readonly<Record<string, number>>;

/** Exact source ids/values retained in the generated video projection. */
export const COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_J_NUMERIC_ICE: Readonly<
  Record<149 | 153 | 159, NumericIceAssignments>
> = {
  149: { "lv149-opening-b03": 2 },
  153: { "lv153-opening-b05": 15, "lv153-opening-b06": 13 },
  159: { "lv159-opening-b11": 14 },
};

export const COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_J_LV157_SHELL = {
  blockId: "lv157-opening-b04",
  shape: [[0, 0], [0, 1]] as readonly Point[],
  layers: ["red", "orange"] as readonly [BlockColor, BlockColor],
} as const;

const certifiedIds = new Set<number>(COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_J_CERTIFIED_LEVEL_IDS);

const sameShape = (left: readonly Point[], right: readonly Point[]): boolean => (
  left.length === right.length
  && left.every(([x, y], index) => x === right[index]?.[0] && y === right[index]?.[1])
);

const clearFrozen = (block: BlockSpec): BlockSpec => {
  const { frozen: _frozen, ...rest } = block;
  return rest;
};

const openingVisibleIds = (level: LevelSpec): Set<string> => {
  const queued = new Set((level.generators ?? []).flatMap(({ queueBlockIds }) => queueBlockIds));
  const closed = new Set((level.shutters ?? []).filter(({ count }) => count > 0).map(({ id }) => id));
  return new Set(level.blocks
    .filter(({ id, shutterId }) => !queued.has(id) && !(shutterId && closed.has(shutterId)))
    .map(({ id }) => id));
};

const expectedNumericShapes: Readonly<Record<149 | 153 | 159, Readonly<Record<string, readonly Point[]>>>> = {
  149: { "lv149-opening-b03": [[0, 0], [1, 0]] },
  153: {
    "lv153-opening-b05": [[0, 0], [1, 0], [2, 0]],
    "lv153-opening-b06": [[0, 0], [0, 1]],
  },
  159: { "lv159-opening-b11": [[0, 0]] },
};

const applyNumericIce = (source: LevelSpec): LevelSpec => {
  if (!(source.id === 149 || source.id === 153 || source.id === 159)) return source;
  const assignments = COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_J_NUMERIC_ICE[source.id];
  const shapes = expectedNumericShapes[source.id];
  const visible = openingVisibleIds(source);
  for (const blockId of Object.keys(assignments)) {
    const block = source.blocks.find(({ id }) => id === blockId);
    if (!block || !sameShape(block.shape, shapes[blockId]!) || !visible.has(blockId)) {
      throw new Error(`Lv${source.id} late batch J numeric-ice carrier ${blockId} drift`);
    }
  }
  let changed = false;
  const blocks = source.blocks.map((block) => {
    const frozen = assignments[block.id];
    if (block.frozen === frozen) return block;
    changed = true;
    const cleared = clearFrozen(block);
    return frozen === undefined ? cleared : { ...cleared, frozen };
  });
  return changed ? { ...source, blocks } : source;
};

const applyLv157Shell = (source: LevelSpec): LevelSpec => {
  if (source.id !== 157) return source;
  const contract = COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_J_LV157_SHELL;
  const carrier = source.blocks.find(({ id }) => id === contract.blockId);
  const shellBlocks = source.blocks.filter(({ layers }) => (layers?.length ?? 0) > 1);
  if (!carrier || !sameShape(carrier.shape, contract.shape)
    || !openingVisibleIds(source).has(contract.blockId)
    || shellBlocks.length !== 1 || shellBlocks[0]?.id !== contract.blockId) {
    throw new Error("Lv157 late batch J source V2 shell carrier drift");
  }
  if (carrier.color === contract.layers[0]
    && carrier.layers?.[0] === contract.layers[0]
    && carrier.layers?.[1] === contract.layers[1]
    && carrier.layers.length === 2) return source;
  return {
    ...source,
    blocks: source.blocks.map((block) => block.id === contract.blockId ? {
      ...block,
      color: contract.layers[0],
      layers: [...contract.layers],
    } : block),
  };
};

export const applyCompetitorLateExitStructuralBatchJ = (source: LevelSpec): LevelSpec => {
  if (!certifiedIds.has(source.id)) return source;
  return applyLv157Shell(applyNumericIce(source));
};

const TRUTH =
  "deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json";
const GENERATED = "src/core/videoParityLevels101To200.generated.ts";
const EXACT_SHUTTER_REPORT =
  "playtest-results/experiments/competitor-exact-shutter-geometry-post100-2026-09-20/report.json";
const REPORT =
  "playtest-results/experiments/competitor-late-exit-structural-batch-j-2026-09-21/report.json";
const VIDEO_134_137 = "C:/Users/Administrator/Desktop/block out/参考视频/134-137.mp4";
const VIDEO_137_144 = "C:/Users/Administrator/Desktop/block out/参考视频/137-144.mp4";
const VIDEO_145_149 = "C:/Users/Administrator/Desktop/block out/参考视频/145-149.mp4";
const VIDEO_149_161 = "C:/Users/Administrator/Desktop/block out/参考视频/149-161.mp4";

export type CompetitorLateExitStructuralBatchJBlockerKind =
  | "runtime-board-mask-drift"
  | "source-opening-composition-incomplete"
  | "source-full-composition-incomplete"
  | "source-mouth-colour-unresolved"
  | "source-cover-cohort-incomplete"
  | "source-cover-geometry-conflicts-runtime-mask"
  | "opening-stage-conflict"
  | "unsupported-source-colour"
  | "global-adjacency-contract-conflict"
  | "static-unsat";

export interface CompetitorLateExitStructuralBatchJBlocker {
  readonly levelId: 136 | 137 | 143 | 147 | 148 | 149 | 153 | 154 | 157 | 159;
  readonly kinds: readonly CompetitorLateExitStructuralBatchJBlockerKind[];
  readonly reason: string;
  readonly evidence: readonly string[];
}

/** Residual source gaps deliberately left unrepaired by this safe subset. */
export const COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_J_BLOCKERS = [
  {
    levelId: 136,
    kinds: ["runtime-board-mask-drift", "source-full-composition-incomplete", "source-mouth-colour-unresolved", "source-cover-cohort-incomplete"],
    reason: "Truth proves a disconnected 7x10/63-cell board, frozen counters 1/2/4/9/9 and a 7x4 count-13 lower cover, but the final runtime is 69 cells; every frozen colour/mouth span and the lower hidden batch are unrecorded because the supplied clip ends before release.",
    evidence: [TRUTH, VIDEO_134_137, GENERATED, EXACT_SHUTTER_REPORT, REPORT],
  },
  {
    levelId: 137,
    kinds: ["runtime-board-mask-drift", "opening-stage-conflict", "source-mouth-colour-unresolved", "source-cover-cohort-incomplete"],
    reason: "The source has a 58-cell mask and two opening PLUS5 ice-8 pieces. Runtime remains 83 cells and its exact-rectangle repair places one PLUS5 carrier inside the count-3 cover while promoting an inferred single. Restoring only the ice values solves, but would still contradict the source opening; choosing a replacement direct cohort would be a hidden-batch guess.",
    evidence: [TRUTH, VIDEO_137_144, GENERATED, EXACT_SHUTTER_REPORT, REPORT],
  },
  {
    levelId: 143,
    kinds: ["runtime-board-mask-drift", "source-full-composition-incomplete", "source-mouth-colour-unresolved", "source-cover-cohort-incomplete", "static-unsat"],
    reason: "Truth proves a 56-cell split board, 18 opening pieces, eight frozen counters, a count-19 lower cover and a two-piece generator. Runtime is 69 cells with three opening pieces. Correcting only the proven green→red H3 shell exhausts statically because the exact exit colours/cohorts are unresolved.",
    evidence: [TRUTH, VIDEO_137_144, GENERATED, EXACT_SHUTTER_REPORT, REPORT],
  },
  {
    levelId: 147,
    kinds: ["source-opening-composition-incomplete", "source-full-composition-incomplete", "source-mouth-colour-unresolved", "source-cover-cohort-incomplete"],
    reason: "The three cover rectangles/counts 17/4/16 and frozen values are visible, but opening/full inventories, all hidden cohorts and all six frozen colour bindings are unclear. Runtime exposes only three pieces and one physical cover, so a structural repair would invent both cargo ownership and mouth colours.",
    evidence: [TRUTH, VIDEO_145_149, GENERATED, EXACT_SHUTTER_REPORT, REPORT],
  },
  {
    levelId: 148,
    kinds: ["source-full-composition-incomplete", "source-mouth-colour-unresolved", "source-cover-cohort-incomplete", "source-cover-geometry-conflicts-runtime-mask", "static-unsat"],
    reason: "The 13-piece opening and V3 red→orange shell are visible, but both cover cohorts and nine frozen colour bindings are unclear. The source rectangles conflict with the current playable mask; correcting only the shell is statically unsatisfiable with current exits.",
    evidence: [TRUTH, VIDEO_145_149, GENERATED, EXACT_SHUTTER_REPORT, REPORT],
  },
  {
    levelId: 149,
    kinds: ["source-full-composition-incomplete", "source-mouth-colour-unresolved", "source-cover-cohort-incomplete", "global-adjacency-contract-conflict"],
    reason: "The H2 ice-2 carrier is safely restored, but the four cover cohorts and five frozen colour bindings remain unknown. Correcting the current H2 shell to the visible red→purple pair creates two opening red-red contacts, so that shell cannot be published without changing source colours or geometry.",
    evidence: [TRUTH, VIDEO_145_149, GENERATED, REPORT],
  },
  {
    levelId: 153,
    kinds: ["source-mouth-colour-unresolved"],
    reason: "The complete 29-piece opening/full inventory and H3-15/V2-13 ice carriers are exact and repaired. The four frozen counters 3/8/11/11 still lack source colour/offset/size bindings, so exits remain untouched.",
    evidence: [TRUTH, VIDEO_149_161, GENERATED, REPORT],
  },
  {
    levelId: 154,
    kinds: ["source-opening-composition-incomplete", "source-full-composition-incomplete", "source-mouth-colour-unresolved", "source-cover-cohort-incomplete"],
    reason: "The 8x6 count-10 cover rectangle and four-key H2 lock are already certified, but the opening/full inventory, hidden cohort and frozen-4 colour binding remain unclear. The clip also shows an additional local purple aperture not represented by the four outer ordinary-exit facts, so gate reconstruction is not source-complete.",
    evidence: [TRUTH, VIDEO_149_161, GENERATED, EXACT_SHUTTER_REPORT, REPORT],
  },
  {
    levelId: 157,
    kinds: ["source-full-composition-incomplete", "source-mouth-colour-unresolved", "source-cover-cohort-incomplete"],
    reason: "The opening-visible V2 shell is safely corrected to red→orange. Both cover cohorts, the key-group identity and all five frozen colour bindings remain unclear, so the two source rectangles and exit set are not changed.",
    evidence: [TRUTH, VIDEO_149_161, GENERATED, EXACT_SHUTTER_REPORT, REPORT],
  },
  {
    levelId: 159,
    kinds: ["source-full-composition-incomplete", "source-mouth-colour-unresolved", "source-cover-cohort-incomplete", "opening-stage-conflict", "unsupported-source-colour"],
    reason: "The opening SINGLE ice-14 carrier is safely restored. The two cover cohorts and eight frozen colour bindings are unknown; the green/lime V2 shell is currently staged rather than opening-visible, and lime is not a runtime palette colour, so guessing a substitute colour or cohort is forbidden.",
    evidence: [TRUTH, VIDEO_149_161, GENERATED, EXACT_SHUTTER_REPORT, REPORT],
  },
] as const satisfies readonly CompetitorLateExitStructuralBatchJBlocker[];
