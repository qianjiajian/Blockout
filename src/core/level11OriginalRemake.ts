import type { BlockSpec, LevelSpec } from "./types";

/**
 * v1.80: a real, vertically symmetric side-bulge outline replaces the rectangle.
 * Preserve the 22 source bodies and every numeric-ice / frozen-door attribute.
 * Candidate: lv11-remake-20260927/design-structured-1790489811659/route-7681.json.
 */
export const applyLevel11OriginalRemake = (level: LevelSpec): LevelSpec => {
  if (level.id !== 11) return level;
  const horizontal: BlockSpec["shape"] = [[0, 0], [1, 0], [2, 0]];
  const blocks: BlockSpec[] = ["green", "pink", "green"].map((color, index) => ({
    id: `lv11-plain-${index}`, x: 0, y: index + 1,
    color: color as BlockSpec["color"], shape: horizontal.map(([x, y]) => [x, y]),
  }));
  for (let y = 4; y <= 7; y++) {
    for (let x = 0; x < 3; x++) {
      blocks.push({ id: `lv11-single-${x}-${y}`, x, y,
        color: (x + y) % 2 === 0 ? "purple" : "cyan", shape: [[0, 0]] });
    }
  }
  const ice: [number, number, number, BlockSpec["color"], number][] = [
    [1, 0, 0, "purple", 17], [3, 3, 1, "purple", 16],
    [2, 3, 2, "green", 17], [6, 3, 3, "purple", 13],
    [0, 3, 4, "cyan", 17], [4, 3, 5, "red", 15], [5, 3, 6, "pink", 14],
  ];
  for (const [id, x, y, color, frozen] of ice) {
    blocks.push({ id: `lv11-ice-${id}`, x, y, color, frozen,
      shape: horizontal.map(([dx, dy]) => [dx, dy]) });
  }
  // The old D1 estimate and six-move planning target describe the retired map.
  const { designTargets: _oldDesignTargets, ...retained } = level;
  return {
    ...retained,
    width: 6, height: 8,
    playable: Array.from({ length: 8 }, (_, y) =>
      Array.from({ length: y === 0 || y === 7 ? 3 : 6 }, (_, x): [number, number] => [x, y]),
    ).flat(),
    blocks, blocked: [], seams: [],
    gates: [
      { side: "top", offset: 0, size: 3, id: "lv11-gate-green", color: "green" },
      { side: "left", offset: 5, size: 1, id: "lv11-gate-cyan", color: "cyan" },
      { side: "left", offset: 4, size: 1, id: "lv11-gate-pink", color: "pink", frozen: 6 },
      { side: "left", offset: 7, size: 1, id: "lv11-gate-purple", color: "purple", frozen: 7 },
      { side: "right", offset: 3, size: 1, id: "lv11-gate-red", color: "red", frozen: 13 },
    ],
    mechanismRules: "revised-2026-09-23-v1.4",
    preservedMoveTarget: 36,
  };
};
