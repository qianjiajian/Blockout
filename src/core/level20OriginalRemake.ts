import type { BlockSpec, LevelSpec } from "./types";

/** v1.87: original fully tiled rectangle, preserving the source 7+7 bodies.
 * Only three duplicate gates and their hidden bodies are recolored.
 * Fresh exact five repositions / 19 total drags and dual-screen Pointer proof:
 * deliverables/lv20-remake-20260927/ (candidate-120).
 */
export const applyLevel20OriginalRemake = (level: LevelSpec): LevelSpec => {
  if (level.id !== 20) return level;
  const placements: [string, BlockSpec["color"], number, number, "H2" | "V3"][] = [
    ["b1-07", "green", 0, 3, "V3"],
    ["b1-02", "yellow", 1, 3, "H2"],
    ["b1-01", "red", 3, 3, "H2"],
    ["b1-04", "red", 1, 4, "H2"],
    ["b1-05", "pink", 3, 4, "H2"],
    ["b1-06", "yellow", 1, 5, "H2"],
    ["b1-03", "blue", 3, 5, "H2"],
    ["b2-07", "yellow", 4, 0, "V3"],
    ["b2-02", "orange", 0, 0, "H2"],
    ["b2-03", "red", 2, 0, "H2"],
    ["b2-01", "blue", 0, 1, "H2"],
    ["b2-05", "green", 2, 1, "H2"],
    ["b2-06", "purple", 0, 2, "H2"],
    ["b2-04", "cyan", 2, 2, "H2"],
  ];
  const blocks: BlockSpec[] = placements.map(([id, color, x, y, kind]) => ({
    id: `lv20-${id}`, color,
    shape: kind === "H2" ? [[0, 0], [1, 0]] : [[0, 0], [0, 1], [0, 2]],
    x, y, ...(id.startsWith("b2-") ? { shutterId: "lv20-cover" } : {}),
  }));
  const { designTargets: _oldPlanningTargets, ...retained } = level;
  return {
    ...retained, difficulty: "easy", width: 5, height: 6,
    playable: Array.from({ length: 30 }, (_, i): [number, number] => [i % 5, Math.floor(i / 5)]),
    blocked: [], seams: [], blocks,
    gates: [
      { side: "bottom", offset: 1, size: 2, id: "lv20-gate-yellow", color: "yellow" },
      { side: "top", offset: 3, size: 2, id: "lv20-gate-orange", color: "orange", frozen: 6 },
      { side: "right", offset: 5, size: 1, id: "lv20-gate-cyan", color: "cyan", frozen: 10 },
      { side: "right", offset: 4, size: 1, id: "lv20-gate-red", color: "red", frozen: 3 },
      { side: "bottom", offset: 3, size: 2, id: "lv20-gate-blue", color: "blue", frozen: 2 },
      { side: "left", offset: 1, size: 1, id: "lv20-gate-purple", color: "purple", frozen: 7 },
      { side: "left", offset: 3, size: 3, id: "lv20-gate-green", color: "green", frozen: 8 },
      { side: "right", offset: 3, size: 1, id: "lv20-gate-pink", color: "pink", frozen: 1 },
    ],
    shutters: [{ id: "lv20-cover", x: 0, y: 0, width: 5, height: 3, count: 6, skin: "shutter" }],
    mechanismRules: "revised-2026-09-23-v1.4",
    preservedMoveTarget: 24,
  };
};
