import type { LevelSpec, Point } from "./types";

/**
 * Lv20 regeneration policy.
 *
 * The competitor video shows a 5×8 dogbone with two full 5×3 chambers joined
 * by a two-cell one-wide neck.  The upper chamber is a physical 5×3 shutter
 * warehouse: it starts fully covered, counts down from six and reveals seven
 * tightly packed blocks.  The lower chamber starts with the other seven.
 *
 * The two frozen exits at bottom/2 and left/3 intentionally exchange their
 * hidden base colours versus the video (red/blue instead of blue/red).  Both
 * colours are completely obscured by the numbered ice at the opening.  An
 * exhaustive optimal search proves this is the smallest invisible adjustment
 * that preserves the observed board, block packing and mechanism quantities
 * while making ten reposition drags genuinely necessary; the literal video
 * colours admit a nine-reposition solution.
 */
export const LEVEL_20_REGENERATION_POLICY_VERSION = "competitor-dogbone-cover-r2" as const;

const DOGBONE_MASK = ["#####", "#####", "#####", "..#..", "..#..", "#####", "#####", "#####"] as const;
const IRREGULAR_PLAYABLE: Point[] = DOGBONE_MASK.flatMap((row, y) => (
  [...row].flatMap((cell, x) => cell === "#" ? [[x, y] as Point] : [])
));

const H2: Point[] = [[0, 0], [1, 0]];
const V3: Point[] = [[0, 0], [0, 1], [0, 2]];

const REGENERATED_GATES: LevelSpec["gates"] = [
  { id: "lv020-exact-bottom-yellow", side: "bottom", offset: 3, size: 2, color: "yellow" },
  { id: "lv020-exact-right-pink-1", side: "right", offset: 6, size: 1, color: "pink", frozen: 1 },
  { id: "lv020-exact-bottom-red-2", side: "bottom", offset: 0, size: 2, color: "red", frozen: 2 },
  { id: "lv020-exact-left-blue-3", side: "left", offset: 5, size: 1, color: "blue", frozen: 3 },
  { id: "lv020-exact-top-red-6", side: "top", offset: 3, size: 2, color: "red", frozen: 6 },
  { id: "lv020-exact-right-pink-7", side: "right", offset: 0, size: 1, color: "pink", frozen: 7 },
  { id: "lv020-exact-top-green-8", side: "top", offset: 1, size: 2, color: "green", frozen: 8 },
  { id: "lv020-exact-left-blue-10", side: "left", offset: 2, size: 1, color: "blue", frozen: 10 },
];

const REGENERATED_BLOCKS: LevelSpec["blocks"] = [
  { id: "cc-020-b1-01", x: 0, y: 5, shape: H2, color: "red" },
  { id: "cc-020-b1-02", x: 3, y: 5, shape: H2, color: "yellow" },
  { id: "cc-020-b1-03", x: 0, y: 6, shape: H2, color: "blue" },
  { id: "cc-020-b1-04", x: 3, y: 6, shape: H2, color: "red" },
  { id: "cc-020-b1-05", x: 0, y: 7, shape: H2, color: "pink" },
  { id: "cc-020-b1-06", x: 3, y: 7, shape: H2, color: "yellow" },
  { id: "cc-020-b1-07", x: 2, y: 5, shape: V3, color: "green" },
  { id: "cc-020-b2-01", x: 1, y: 0, shape: H2, color: "blue", shutterId: "vp-020-cover-1" },
  { id: "cc-020-b2-02", x: 3, y: 0, shape: H2, color: "red", shutterId: "vp-020-cover-1" },
  { id: "cc-020-b2-03", x: 1, y: 1, shape: H2, color: "red", shutterId: "vp-020-cover-1" },
  { id: "cc-020-b2-04", x: 3, y: 1, shape: H2, color: "blue", shutterId: "vp-020-cover-1" },
  { id: "cc-020-b2-05", x: 1, y: 2, shape: H2, color: "green", shutterId: "vp-020-cover-1" },
  { id: "cc-020-b2-06", x: 3, y: 2, shape: H2, color: "pink", shutterId: "vp-020-cover-1" },
  { id: "cc-020-b2-07", x: 0, y: 0, shape: V3, color: "yellow", shutterId: "vp-020-cover-1" },
];

const REGENERATED_SHUTTERS: NonNullable<LevelSpec["shutters"]> = [
  { id: "vp-020-cover-1", x: 0, y: 0, width: 5, height: 3, count: 6, skin: "shutter" },
];

/** Canonical regenerated Lv20 data used by runtime and focused tests. */
export const REGENERATED_LEVEL_20: LevelSpec = {
  id: 20,
  name: "双重卷帘·异形停车重排",
  difficulty: "hard",
  timeSeconds: 75,
  reward: 85,
  parMoves: 24,
  width: 5,
  height: 8,
  playable: IRREGULAR_PLAYABLE,
  gates: REGENERATED_GATES,
  blocks: REGENERATED_BLOCKS,
  shutters: REGENERATED_SHUTTERS,
  featureIntro: {
    title: "倒计时覆盖区！",
    description: "每次有效清除使数字减一；归零后开放覆盖区和隐藏色块。",
    kind: "shutter",
  },
  designTargets: {
    formulaVersion: "blockout-d1",
    calibratedDifficulty: 79,
    minimumRepositionOverhead: 10,
  },
};

const cloneRegeneratedLevel = (): LevelSpec => ({
  ...REGENERATED_LEVEL_20,
  playable: REGENERATED_LEVEL_20.playable?.map(([x, y]) => [x, y] as Point),
  gates: REGENERATED_LEVEL_20.gates.map((gate) => ({ ...gate })),
  blocks: REGENERATED_LEVEL_20.blocks.map((block) => ({
    ...block,
    shape: block.shape.map(([x, y]) => [x, y] as Point),
    layers: block.layers ? [...block.layers] : undefined,
  })),
  shutters: REGENERATED_LEVEL_20.shutters?.map((shutter) => ({
    ...shutter,
    triggerBlockIds: shutter.triggerBlockIds ? [...shutter.triggerBlockIds] : undefined,
  })),
  featureIntro: REGENERATED_LEVEL_20.featureIntro
    ? { ...REGENERATED_LEVEL_20.featureIntro }
    : undefined,
  designTargets: REGENERATED_LEVEL_20.designTargets
    ? { ...REGENERATED_LEVEL_20.designTargets }
    : undefined,
});

/** Apply only to runtime Lv20; every other level is returned untouched. */
export const applyLevel20Regeneration = (level: LevelSpec): LevelSpec => (
  level.id === 20 ? cloneRegeneratedLevel() : level
);
