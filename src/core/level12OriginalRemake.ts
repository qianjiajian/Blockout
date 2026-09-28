import type { BlockSpec, LevelSpec } from "./types";

/**
 * v1.82: twelve native V3 bodies on an original, fully covered stepped tower.
 * Preserve the source colors, four numeric-ice bodies and three frozen gates.
 * Evidence is recorded separately in deliverables/lv12-remake-20260927/.
 */
export const applyLevel12OriginalRemake = (level: LevelSpec): LevelSpec => {
  if (level.id !== 12) return level;
  const placements: [string, number, number, BlockSpec["color"], number?][] = [
    ["lower-3", 0, 6, "blue", 2], ["lower-2", 1, 3, "yellow", 2],
    ["lower-1", 1, 6, "red"], ["upper-4", 2, 0, "yellow"],
    ["upper-3", 2, 3, "blue", 1], ["lower-0", 2, 6, "yellow"],
    ["upper-5", 3, 0, "red"], ["upper-2", 3, 3, "green", 1],
    ["upper-0", 3, 6, "blue"], ["lower-4", 4, 3, "red"],
    ["lower-5", 4, 6, "yellow"], ["upper-1", 5, 6, "red"],
  ];
  const blocks: BlockSpec[] = placements.map(([id, x, y, color, frozen]) => ({
    id: `lv12-${id}`, x, y, color, shape: [[0, 0], [0, 1], [0, 2]],
    ...(frozen ? { frozen } : {}),
  }));
  // The retired map's D1 estimate / seven-drag planning target is not a new proof.
  const { designTargets: _oldDesignTargets, ...retained } = level;
  return {
    ...retained,
    width: 6, height: 9,
    playable: [3, 6, 9, 9, 6, 3].flatMap((height, x) =>
      Array.from({ length: height }, (_, row): [number, number] => [x, 9 - height + row])),
    blocks, blocked: [], seams: [],
    gates: [
      { side: "top", offset: 3, size: 1, id: "lv12-gate-red", color: "red" },
      { side: "top", offset: 2, size: 1, id: "lv12-gate-blue", color: "blue", frozen: 3 },
      { side: "bottom", offset: 2, size: 1, id: "lv12-gate-yellow", color: "yellow", frozen: 5 },
      { side: "left", offset: 6, size: 3, id: "lv12-gate-green", color: "green", frozen: 5 },
    ],
    mechanismRules: "revised-2026-09-23-v1.4",
    preservedMoveTarget: 28,
  };
};
