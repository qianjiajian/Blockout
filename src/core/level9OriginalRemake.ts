import type { BlockSpec, LevelSpec } from "./types";

/**
 * v1.77: replace the old H outline with a symmetric, wide-base raised platform.
 * Keep the competitor's ten native squares and ice-door color/count pairs.
 * Fresh proof and real Pointer replay: 16 setup drags + 10 clears = 26 drags.
 * Evidence: deliverables/lv9-remake-20260927/design-final-1790487935918.json.
 */
export const applyLevel9OriginalRemake = (level: LevelSpec): LevelSpec => {
  if (level.id !== 9) return level;
  const placements: [number, number, BlockSpec["color"]][] = [
    [2, 0, "pink"], [4, 0, "green"],
    [0, 2, "pink"], [2, 2, "blue"], [4, 2, "red"], [6, 2, "yellow"],
    [0, 4, "yellow"], [2, 4, "red"], [4, 4, "blue"], [6, 4, "green"],
  ];
  const blocks: BlockSpec[] = placements.map(([x, y, color], index) => ({
    id: `lv9-original-${index}`, x, y, color,
    shape: [[0, 0], [1, 0], [0, 1], [1, 1]],
  }));
  // Do not carry the obsolete D1 score / eight-move planning target forward.
  const { designTargets: _oldDesignTargets, ...retained } = level;
  return {
    ...retained,
    width: 8,
    height: 6,
    playable: blocks.flatMap((block) => block.shape.map(([x, y]) => [block.x + x, block.y + y])),
    gates: [
      { side: "right", offset: 2, size: 2, id: "lv9-yellow", color: "yellow" },
      { side: "left", offset: 4, size: 2, id: "lv9-pink", color: "pink", frozen: 2 },
      { side: "bottom", offset: 1, size: 2, id: "lv9-green", color: "green", frozen: 4 },
      { side: "bottom", offset: 4, size: 2, id: "lv9-red", color: "red", frozen: 6 },
      { side: "top", offset: 3, size: 2, id: "lv9-blue", color: "blue", frozen: 8 },
    ],
    blocks,
    blocked: [],
    seams: [],
    mechanismRules: "revised-2026-09-23-v1.4",
    preservedMoveTarget: 26,
  };
};
