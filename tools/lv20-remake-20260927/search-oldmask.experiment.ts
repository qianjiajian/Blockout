// Historical failed/diagnostic search, intentionally excluded from production regression tests.
import { describe, it } from "vitest";
import { solveLevelForValidation, solveLevelOptimally } from "../../src/core/levelSolver";
import { LEVELS_BEFORE_LEVEL20_ORIGINAL_REMAKE } from "../../src/core/levels";
const old = LEVELS_BEFORE_LEVEL20_ORIGINAL_REMAKE.find((entry) => entry.id === 20)!;
const masks = [
  ["#####","#####","#####","..#..","..#..","#####","#####","#####"],
  ["#####","#####","#####",".#...",".#...","#####","#####","#####"],
  ["#####","#####","#####","...#.","...#.","#####","#####","#####"],
  ["#####","#####","#####",".#...",".##..","#####","#####","#####"],
  ["#####","#####","#####","..#..",".##..","#####","#####","#####"],
  ["#####","#####","#####","..##.","..##.","#####","#####","####."],
];
describe("old map mask",()=>it("finds",()=>{for(const mask of masks){const c={...old,playable:mask.flatMap((r,y)=>[...r].flatMap((v,x)=>v==="#"?[[x,y] as [number,number]]:[]))};const p=solveLevelForValidation(c,100000);console.log("OMASK",JSON.stringify({mask,solved:p.solved,termination:p.termination,exploredStates:p.exploredStates,minimumDrags:p.minimumDrags,repositionOverhead:p.repositionOverhead}));if(!p.solved||p.repositionOverhead<5||p.repositionOverhead>10)continue;const o=solveLevelOptimally(c,200000);console.log("OMASK_FOUND",JSON.stringify({mask,o:{solved:o.solved,termination:o.termination,exploredStates:o.exploredStates,minimumDrags:o.minimumDrags,repositionOverhead:o.repositionOverhead,drags:o.drags}}));return;}throw Error("none");}),120000);
