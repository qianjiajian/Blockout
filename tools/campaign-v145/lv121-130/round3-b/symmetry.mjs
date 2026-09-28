import fs from 'node:fs';
import {save,hash,api} from './common.mjs';
import {checkSymmetryFloor} from '../../../remake21to30-symmetry-floor-v139.mjs';
import {projectAdvancedFloor} from '../../../campaign31-200-advanced-floor-v145.mjs';
const input=process.argv[2],raw=JSON.parse(fs.readFileSync(input)),c=raw.candidate??raw,level=c.level,floor=Number(process.argv[3]),ms=Number(process.argv[4]??60000),projection=projectAdvancedFloor(level,api);
const result=checkSymmetryFloor(projection.level,{floor,maxStates:3000000,maxMilliseconds:ms});
let replay=result.relaxedRoute?api.replayRevisedRoute(projection.level,result.relaxedRoute):null;
console.log(JSON.stringify({file:save(`symmetry${level.id}`,{input,levelSha256:hash(level),projection:{...projection,level:undefined},result,replay}),status:result.status,termination:result.termination,states:result.discoveredStates,cost:result.relaxedNonClearingDrags,replay}));
