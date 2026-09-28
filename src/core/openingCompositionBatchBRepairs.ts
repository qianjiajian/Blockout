import type { LevelSpec, Point } from "./types";
import { applyGeneratorSpawnAlignmentRepair } from "./generatorSpawnAlignmentRepairs";
import { VIDEO_PARITY_LEVELS_101_TO_200 } from "./videoParityLevels101To200.generated";

export const OPENING_COMPOSITION_BATCH_B_VERSION = "opening-composition-faithful-b-r1" as const;

export const OPENING_COMPOSITION_BATCH_B_TARGETS = Object.freeze({
  121: 23,
  127: 14,
  128: 23,
  129: 13,
  131: 16,
  133: 18,
  143: 18,
  144: 16,
} as const);

/** Only candidates with the complete validation/contract/solver/replay proof are published. */
export const OPENING_COMPOSITION_BATCH_B_LEVEL_IDS = [127] as const;

/**
 * Lv127 keeps the authoritative raw-generated inventory, colours, physical
 * shapes, exits, two real cover panels, and generator queue. Three
 * source-coordinate moves separate the two authored same-colour contacts.
 * The existing centre-mouth projection is then re-applied to the queue's 3x3
 * template offsets; no payload is hidden, staged, recoloured, reshaped, or
 * rebound to a synthetic cover.
 */
export const OPENING_COMPOSITION_BATCH_B_COORDINATE_ADJUSTMENTS = Object.freeze({
  127: Object.freeze({
    "lv127-opening-b02": Object.freeze({ from: [3, 5] as Point, to: [4, 5] as Point }),
    "lv127-opening-b03": Object.freeze({ from: [6, 5] as Point, to: [3, 5] as Point }),
    "lv127-opening-b07": Object.freeze({ from: [5, 6] as Point, to: [6, 7] as Point }),
  }),
} as const);

export const OPENING_COMPOSITION_BATCH_B_BLOCKERS = Object.freeze({
  121: "the exact 23-piece authored layout has two same-colour contacts; the authoritative fixed gate/cover geometry reaches 20,000 states without a solve, and the audited one-gate/one-block geometry scope cannot reach frozen threshold 7",
  128: "the exact 23-piece authored layout has ten same-colour contacts and six missing-compatible-exit constraints; 128 static-passing gate/colour geometry candidates still produced no 20,000-state solver certificate",
  129: "the exact 13-piece authored layout has three same-colour contacts and twelve missing-compatible-exit constraints across opening and canonical generator cargo; 500 adjacency-clean coordinate packings cannot repair exit compatibility",
  131: "the exact 16-piece authored layout has two same-colour contacts; restoring its count-5 cover as a real cover leaves seven missing-compatible-exit constraints, including three star-required blocks",
  133: "the exact 18-piece authored layout has three same-colour contacts; authoritative frozen values 20/23/26 exceed the maximum 16 prior non-matching clears, so coordinate or gate-position changes cannot remove the deadlock",
  143: "the exact 18-piece authored layout has one same-colour contact; authoritative frozen values 20/28/33 exceed the available 18/19 prior non-matching clears, so coordinate or gate-position changes cannot remove the deadlock",
  144: "the exact 16-piece authored layout has one same-colour contact; authoritative frozen values 15/18/23 exceed the available 14 prior non-matching clears, so coordinate or gate-position changes cannot remove the deadlock",
} as const);

// Verified in the companion test against JSON.stringify(candidate).
export const OPENING_COMPOSITION_BATCH_B_LV127_SHA256 = "9ECFCDF3F13F827C8711123DD06E8B0077372160FFAF7D83C392035092500814" as const;

const SOURCE_LV127 = VIDEO_PARITY_LEVELS_101_TO_200[127 - 101];
if (!SOURCE_LV127 || SOURCE_LV127.id !== 127) throw new Error("Lv127 canonical source drift");

const LV127_POSITIONS = new Map<string, Point>(Object.entries(
  OPENING_COMPOSITION_BATCH_B_COORDINATE_ADJUSTMENTS[127],
).map(([blockId, adjustment]) => [blockId, adjustment.to]));

const LV127_SOURCE_COMPOSITION: LevelSpec = {
  ...SOURCE_LV127,
  blocks: SOURCE_LV127.blocks.map((block) => {
    const position = LV127_POSITIONS.get(block.id);
    return position ? { ...block, x: position[0], y: position[1] } : block;
  }),
};

const LV127_CANDIDATE = applyGeneratorSpawnAlignmentRepair(LV127_SOURCE_COMPOSITION);

export const applyOpeningCompositionBatchBRepair = (source: LevelSpec): LevelSpec => (
  source.id === 127 ? LV127_CANDIDATE : source
);
