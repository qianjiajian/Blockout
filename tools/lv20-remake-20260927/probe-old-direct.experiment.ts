// Historical failed/diagnostic search, intentionally excluded from production regression tests.
import { describe, it, expect } from "vitest";
import { solveLevelOptimally } from "../../src/core/levelSolver";
import { LEVELS_BEFORE_LEVEL20_ORIGINAL_REMAKE } from "../../src/core/levels";
describe("old direct",()=>it("prints",()=>{const l=LEVELS_BEFORE_LEVEL20_ORIGINAL_REMAKE[19];const p=solveLevelOptimally(l,100000);console.log("OLD_DIRECT",JSON.stringify({target:l.designTargets,p:{solved:p.solved,termination:p.termination,exploredStates:p.exploredStates,minimumDrags:p.minimumDrags,repositionOverhead:p.repositionOverhead},mask:l.playable}));expect(p.solved).toBe(true);}));
