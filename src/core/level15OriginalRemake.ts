import type { BlockSpec, LevelSpec } from "./types";

/** v1.83: original hammer outline and source-paired single-shell teaching.
 * The independent fresh proof is L6/U6; 21 total drags include five peels.
 * Evidence: deliverables/lv15-remake-20260927/.
 */
export const applyLevel15OriginalRemake = (level: LevelSpec): LevelSpec => {
  if (level.id !== 15) return level;
  const placements: [string, number, number, BlockSpec["color"], BlockSpec["color"]?][] = [
    ["4-2", 2, 0, "pink"], ["0-6", 4, 0, "blue", "pink"],
    ["4-0", 0, 2, "red", "yellow"], ["4-6", 2, 2, "green", "blue"],
    ["0-0", 4, 2, "pink", "blue"], ["2-4", 6, 2, "green"],
    ["0-2", 2, 4, "yellow"], ["0-4", 4, 4, "red"],
    ["2-2", 2, 6, "blue", "red"], ["4-4", 4, 6, "yellow"],
  ];
  const blocks: BlockSpec[] = placements.map(([id, x, y, color, inner]) => ({
    id: `lv15-${id}`, x, y, color, shape: [[0, 0], [1, 0], [0, 1], [1, 1]],
    ...(inner ? { layers: [color, inner] } : {}),
  }));
  const { designTargets: _oldPlanningTargets, ...retained } = level;
  return {
    ...retained,
    difficulty: "easy",
    width: 8, height: 8,
    playable: blocks.flatMap(b => b.shape.map(([dx, dy]): [number, number] => [b.x + dx, b.y + dy])),
    blocked: [], seams: [], blocks,
    gates: [
      { side: "bottom", offset: 4, size: 2, id: "lv15-gate-yellow", color: "yellow" },
      { side: "top", offset: 2, size: 2, id: "lv15-gate-blue", color: "blue", frozen: 6 },
      { side: "top", offset: 4, size: 2, id: "lv15-gate-pink", color: "pink", frozen: 2 },
      { side: "left", offset: 2, size: 2, id: "lv15-gate-red", color: "red", frozen: 5 },
      { side: "right", offset: 2, size: 2, id: "lv15-gate-green", color: "green", frozen: 3 },
    ],
    mechanismRules: "revised-2026-09-23-v1.4",
    // Preserve the actual pre-remake target; historical parMoves=536 is not it.
    preservedMoveTarget: 34,
  };
};
