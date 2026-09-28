import type { BlockColor, BlockSpec, GateSpec, LevelSpec, Point, Side } from "./types";
import { VIDEO_PARITY_LEVELS_101_TO_200 } from "./videoParityLevels101To200.generated";

export const OPENING_COMPOSITION_BATCH_C_VERSION = "opening-composition-faithful-c-r1" as const;

export const OPENING_COMPOSITION_BATCH_C_TARGETS = Object.freeze({
  160: 18,
  163: 28,
  167: 14,
  168: 16,
  173: 28,
  178: 23,
  181: 16,
} as const);

/** Only candidates with the complete validation/contract/solver/replay proof are published. */
export const OPENING_COMPOSITION_BATCH_C_LEVEL_IDS = [168] as const;

export const OPENING_COMPOSITION_BATCH_C_USES_STAGING_FALLBACK = false as const;

/**
 * Lv168 keeps the authoritative 16-block opening inventory and the source 7x9
 * split board. Four coordinate-only moves separate its three same-colour
 * contacts. The source video then proves a 17-block direct cohort behind the
 * lower 7x4/count-16 cover; those blocks use their observed shapes, colours,
 * coordinates and one-cell centre gap, rather than staging metadata.
 */
export const OPENING_COMPOSITION_BATCH_C_COORDINATE_ADJUSTMENTS = Object.freeze({
  168: Object.freeze({
    "lv168-opening-b06": Object.freeze({ from: [2, 1] as Point, to: [6, 2] as Point }),
    "lv168-opening-b07": Object.freeze({ from: [2, 3] as Point, to: [3, 1] as Point }),
    "lv168-opening-b08": Object.freeze({ from: [3, 1] as Point, to: [2, 1] as Point }),
    "lv168-opening-b14": Object.freeze({ from: [6, 2] as Point, to: [2, 3] as Point }),
  }),
} as const);

export const OPENING_COMPOSITION_BATCH_C_BLOCKERS = Object.freeze({
  160: "The exact 18-piece raw inventory has six same-colour contacts, six blocks without a compatible source exit, and yellow/pink frozen thresholds 19/20 while at most 15 non-matching layers can clear first; coordinate-only restoration cannot satisfy the solver contract.",
  163: "The exact 28-piece raw inventory has three same-colour contacts and eleven missing-compatible-exit failures, including both star blocks; truth also requires one staged frame while the raw level contains none, so a coordinate-only opening repair cannot preserve every mechanism count.",
  167: "The exact 14-piece raw inventory has five same-colour contacts, two missing-compatible-exit failures, and every blue exit is frozen to 15 while only 11 non-blue layers can clear first; the authoritative contract is a static deadlock under current rules.",
  173: "The exact 28-piece raw inventory has four same-colour contacts and seven fixed-shape blocks without a span-compatible source exit; the source record does not provide the missing exit colours/offsets, so repairing it here would invent mechanism data rather than restore composition.",
  178: "The exact 23-piece raw inventory has one same-colour contact, while the source 2x6/count-14 physical panel intersects the first three fixed blocks. All eight adjacency-clean placements of the movable blue H2 reached the 5,000-state cap, and the strict 30,000-state panel run exceeded the 8 GiB proof envelope without a replayable certificate.",
  181: "The exact 16-piece raw inventory is adjacency-clean, but the raw three-component level has no usable exits and all sixteen blocks fail exit compatibility. The later synthetic portals are invalid on the source mask and still leave both axis blocks incompatible, while the truth explicitly marks exit records unclear.",
} as const);

const SOURCE_LV168 = VIDEO_PARITY_LEVELS_101_TO_200[168 - 101];
if (!SOURCE_LV168 || SOURCE_LV168.id !== 168) throw new Error("Lv168 canonical source drift");

/**
 * Video-exact physical aperture layout: four gates around the upper component
 * and five around the lower covered component. It preserves the source
 * mechanism multiset exactly: three ordinary exits and six frozen exits with
 * counters 2/5/19/20/21/25.
 */
const gate = (
  id: string,
  side: Side,
  origin: Point,
  size: number,
  color: BlockColor,
  frozen?: number,
): GateSpec => ({
  id,
  side,
  offset: side === "top" || side === "bottom" ? origin[0] : origin[1],
  size,
  color,
  ...(frozen ? { frozen } : {}),
  portals: [{ side, origin, size }],
});

const LV168_GATES: readonly GateSpec[] = [
  gate("oc168-top-red-2", "top", [2, 0], 3, "red", 2),
  gate("oc168-top-green-5", "left", [0, 1], 2, "green", 5),
  gate("oc168-top-yellow", "right", [6, 1], 2, "yellow"),
  gate("oc168-top-cyan", "bottom", [5, 3], 2, "cyan"),
  gate("oc168-lower-purple-21", "left", [0, 5], 2, "purple", 21),
  gate("oc168-lower-red-20", "left", [0, 7], 2, "red", 20),
  gate("oc168-lower-yellow", "right", [6, 5], 2, "yellow"),
  gate("oc168-lower-blue-19", "right", [6, 7], 2, "blue", 19),
  gate("oc168-lower-green-25", "bottom", [0, 8], 2, "green", 25),
];

const LV168_COVER_ID = "lv168-cover-01";
const SINGLE: Point[] = [[0, 0]];
const H2: Point[] = [[0, 0], [1, 0]];
const H3: Point[] = [[0, 0], [1, 0], [2, 0]];
const V2: Point[] = [[0, 0], [0, 1]];

const coveredBlock = (
  suffix: string,
  x: number,
  y: number,
  shape: Point[],
  color: BlockColor,
): BlockSpec => ({
  id: `lv168-cover-${suffix}`,
  x,
  y,
  shape,
  color,
  shutterId: LV168_COVER_ID,
});

/** 166-169.mp4, Lv168, stable post-open frame at 286.9-287.5s. */
export const OPENING_COMPOSITION_BATCH_C_LV168_DIRECT_COHORT: readonly BlockSpec[] = [
  coveredBlock("b01", 0, 5, H2, "green"),
  coveredBlock("b02", 2, 5, SINGLE, "red"),
  coveredBlock("b03", 3, 5, SINGLE, "purple"),
  coveredBlock("b04", 4, 5, SINGLE, "blue"),
  coveredBlock("b05", 5, 5, SINGLE, "yellow"),
  coveredBlock("b06", 6, 5, SINGLE, "blue"),
  coveredBlock("b07", 0, 6, H2, "purple"),
  coveredBlock("b08", 2, 6, SINGLE, "yellow"),
  coveredBlock("b09", 4, 6, SINGLE, "yellow"),
  coveredBlock("b10", 5, 6, V2, "purple"),
  coveredBlock("b11", 6, 6, SINGLE, "yellow"),
  coveredBlock("b12", 0, 7, H3, "blue"),
  coveredBlock("b13", 3, 7, V2, "purple"),
  coveredBlock("b14", 4, 7, V2, "green"),
  coveredBlock("b15", 6, 7, V2, "red"),
  coveredBlock("b16", 0, 8, H3, "red"),
  coveredBlock("b17", 5, 8, SINGLE, "blue"),
];

const LV168_POSITIONS = new Map<string, Point>(Object.entries(
  OPENING_COMPOSITION_BATCH_C_COORDINATE_ADJUSTMENTS[168],
).map(([blockId, adjustment]) => [blockId, adjustment.to]));

const LV168_CANDIDATE: LevelSpec = {
  ...SOURCE_LV168,
  gates: LV168_GATES.map((gate) => ({ ...gate })),
  blocks: [
    ...SOURCE_LV168.blocks.map((block) => {
      const position = LV168_POSITIONS.get(block.id);
      return position ? { ...block, x: position[0], y: position[1] } : block;
    }),
    ...OPENING_COMPOSITION_BATCH_C_LV168_DIRECT_COHORT,
  ],
};

// Filled from JSON.stringify(LV168_CANDIDATE) and asserted by the companion test.
export const OPENING_COMPOSITION_BATCH_C_LV168_SHA256 = "B509D92CE933D7604614B3C664D1607AB9783C7C1D18EDB8B0ABCDE84546E62C" as const;

export const applyOpeningCompositionBatchCRepair = (source: LevelSpec): LevelSpec => (
  source.id === 168 ? LV168_CANDIDATE : source
);
