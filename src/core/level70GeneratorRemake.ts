import type { LevelSpec } from "./types";

/** v1.93: Lv70 dual fixed FIFO generators with meaningful frozen-gate staging.
 * Verified full queue route: 51 total drags, 15 multi-cell repositions; L >= 11.
 * Evidence: deliverables/lv70-remake-20260927/design-strengthen-1790509714045/candidate-0.json.
 * Original board, all 36 source bodies, time and historical rewards are retained.
 */
export const applyLevel70GeneratorRemake = (level: LevelSpec): LevelSpec => {
  if (level.id !== 70) return level;
  const { designTargets: _oldPlanningTargets, ...retained } = level;
  return {
    ...retained,
    mechanismRules: "revised-2026-09-27-v1.5",
    preservedMoveTarget: 51,
    blocks: [
      {"id":"v146-70-fill-10","x":1,"y":0,"shape":[[0,0],[1,0]],"color":"green"},
      {"id":"v146-70-fill-12","x":3,"y":0,"shape":[[0,0],[1,0]],"color":"pink"},
      {"id":"v146-70-fill-6","x":0,"y":1,"shape":[[0,0],[0,1]],"color":"blue"},
      {"id":"v146-70-fill-9","x":1,"y":1,"shape":[[0,0],[1,0]],"color":"yellow"},
      {"id":"v146-70-fill-4","x":3,"y":1,"shape":[[0,0],[0,1]],"color":"green"},
      {"id":"v146-70-fill-7","x":4,"y":1,"shape":[[0,0],[1,0]],"color":"yellow"},
      {"id":"v146-70-fill-11","x":1,"y":2,"shape":[[0,0],[1,0]],"color":"pink"},
      {"id":"v146-70-fill-16","x":4,"y":2,"shape":[[0,0],[1,0]],"color":"pink"},
      {"id":"v146-70-fill-13","x":0,"y":3,"shape":[[0,0],[1,0]],"color":"green"},
      {"id":"v146-70-fill-8","x":2,"y":3,"shape":[[0,0],[1,0]],"color":"blue"},
      {"id":"v146-70-fill-17","x":4,"y":3,"shape":[[0,0],[1,0]],"color":"yellow"},
      {"id":"v146-70-fill-2","x":0,"y":4,"shape":[[0,0],[0,1]],"color":"pink"},
      {"id":"v146-70-fill-5","x":1,"y":4,"shape":[[0,0],[0,1]],"color":"blue"},
      {"id":"v146-70-fill-3","x":2,"y":4,"shape":[[0,0],[0,1]],"color":"green"},
      {"id":"v146-70-fill-0","x":3,"y":4,"shape":[[0,0],[0,1]],"color":"pink"},
      {"id":"v146-70-fill-1","x":4,"y":4,"shape":[[0,0],[0,1]],"color":"blue"},
      {"id":"v146-70-opening","x":5,"y":4,"shape":[[0,0],[0,1]],"color":"green"},
      {"id":"v146-70-fill-14","x":1,"y":6,"shape":[[0,0],[1,0]],"color":"pink"},
      {"id":"v146-70-fill-15","x":3,"y":6,"shape":[[0,0],[1,0]],"color":"yellow"},
      {"id":"v146-70-queue-0","x":0,"y":4,"shape":[[0,0]],"color":"pink"},
      {"id":"v146-70-queue-1","x":5,"y":2,"shape":[[0,0],[0,1]],"color":"yellow"},
      {"id":"v146-70-queue-2","x":0,"y":4,"shape":[[0,0]],"color":"green"},
      {"id":"v146-70-queue-3","x":0,"y":4,"shape":[[0,0],[0,1]],"color":"pink"},
      {"id":"v146-70-queue-4","x":0,"y":4,"shape":[[0,0]],"color":"yellow"},
      {"id":"v146-70-queue-5","x":0,"y":4,"shape":[[0,0],[0,1]],"color":"green"},
      {"id":"v146-70-queue-6","x":5,"y":2,"shape":[[0,0]],"color":"pink"},
      {"id":"v146-70-queue-7","x":0,"y":4,"shape":[[0,0],[0,1]],"color":"yellow"},
      {"id":"v146-70-queue-8","x":5,"y":2,"shape":[[0,0]],"color":"green"},
      {"id":"v146-70-queue-9","x":5,"y":2,"shape":[[0,0],[0,1]],"color":"pink"},
      {"id":"v146-70-queue-10","x":5,"y":2,"shape":[[0,0]],"color":"yellow"},
      {"id":"v146-70-queue-11","x":5,"y":2,"shape":[[0,0],[0,1]],"color":"green"},
      {"id":"v146-70-queue-12","x":5,"y":2,"shape":[[0,0]],"color":"pink"},
      {"id":"v146-70-queue-13","x":0,"y":4,"shape":[[0,0],[0,1]],"color":"yellow"},
      {"id":"v146-70-queue-14","x":0,"y":4,"shape":[[0,0]],"color":"green"},
      {"id":"v146-70-queue-15","x":5,"y":2,"shape":[[0,0]],"color":"yellow"},
      {"id":"v146-70-queue-16","x":0,"y":4,"shape":[[0,0],[0,1]],"color":"blue"},
    ],
    gates: [
      {"id":"v191-70-gate-blue","side":"left","offset":1,"size":2,"color":"blue"},
      {"id":"v191-70-gate-green","side":"right","offset":4,"size":2,"color":"green","frozen":9},
      {"id":"v191-70-gate-pink","side":"top","offset":2,"size":3,"color":"pink","frozen":1},
      {"id":"v191-70-gate-yellow","side":"bottom","offset":3,"size":2,"color":"yellow","frozen":17},
    ],
    generators: [
      {"id":"v191-70-generator-1","side":"left","offset":4,"rimSpan":3,"rimMount":"rim","spawn":[0,4],"queueBlockIds":["v146-70-queue-7","v146-70-queue-0","v146-70-queue-16","v146-70-queue-14","v146-70-queue-4","v146-70-queue-3","v146-70-queue-2","v146-70-queue-13","v146-70-queue-5"]},
      {"id":"v191-70-generator-2","side":"right","offset":2,"rimSpan":3,"rimMount":"rim","spawn":[5,2],"queueBlockIds":["v146-70-queue-12","v146-70-queue-1","v146-70-queue-9","v146-70-queue-11","v146-70-queue-10","v146-70-queue-8","v146-70-queue-15","v146-70-queue-6"]},
    ],
  };
};
