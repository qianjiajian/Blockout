import type { BlockSpec, LevelSpec } from "./types";

/** v1.84: source-correct 21-body inventory on an original symmetric outline.
 * The source still frame had already removed one blue single; it is restored.
 * Fresh L11 / U15 and actual-input evidence: deliverables/lv16-remake-20260927/.
 */
export const applyLevel16OriginalRemake = (level: LevelSpec): LevelSpec => {
  if (level.id !== 16) return level;
  const placements: [string, number, number, BlockSpec["color"], "S" | "V3", BlockSpec["color"]?][] = [
    ["5-0",4,2,"red","V3"],
    ["4-1",3,3,"yellow","V3","red"],
    ["2-4",1,1,"red","V3"],
    ["3-3",1,0,"yellow","S"],
    ["4-6",2,0,"cyan","S"],
    ["5-4",3,0,"purple","S"],
    ["5-3",2,1,"yellow","S"],
    ["0-6",3,1,"cyan","S"],
    ["3-4",0,2,"purple","S"],
    ["1-5",2,2,"cyan","S"],
    ["5-6",3,2,"purple","S"],
    ["3-5",0,3,"cyan","S"],
    ["3-2",2,3,"purple","S"],
    ["5-5",0,4,"yellow","S"],
    ["4-4",1,4,"cyan","S"],
    ["1-4",2,4,"blue","S"],
    ["0-5",1,5,"blue","S"],
    ["3-6",2,5,"purple","S"],
    ["4-5",1,6,"purple","S"],
    ["1-6",2,6,"blue","S"],
    ["2-3",3,6,"purple","S"],
  ];
  const blocks: BlockSpec[] = placements.map(([id, x, y, color, kind, inner]) => ({
    id: `lv16-${id}`, x, y, color,
    shape: kind === "V3" ? [[0, 0], [0, 1], [0, 2]] : [[0, 0]],
    ...(inner ? { layers: [color, inner] } : {}),
  }));
  const { designTargets: _oldPlanningTargets, ...retained } = level;
  return {
    ...retained, difficulty: "normal", width: 5, height: 7,
    playable: [3, 3, 5, 5, 5, 3, 3].flatMap((width, y) =>
      Array.from({ length: width }, (_, i): [number, number] => [(5 - width) / 2 + i, y])),
    blocks, blocked: [], seams: [],
    gates: [
      {"side":"bottom","offset":2,"size":1,"id":"lv16-gate-blue","color":"blue"},
      {"side":"left","offset":4,"size":1,"id":"lv16-gate-cyan","color":"cyan","frozen":3},
      {"side":"top","offset":3,"size":1,"id":"lv16-gate-purple","color":"purple","frozen":15},
      {"side":"bottom","offset":3,"size":1,"id":"lv16-gate-yellow","color":"yellow","frozen":8},
      {"side":"right","offset":2,"size":3,"id":"lv16-gate-red","color":"red","frozen":12},
    ],
    mechanismRules: "revised-2026-09-23-v1.4",
    preservedMoveTarget: 50,
  };
};
