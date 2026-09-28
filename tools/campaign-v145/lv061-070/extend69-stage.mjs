import fs from 'node:fs';
import {loadApi} from '../../native-block-repair-v143.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {stateOf} from './lift-floor.mjs';
import {compile} from '../../../deliverables/remake31-200-v145-20260924/batches/lv061-070/author65-67/lift-search.mjs';
import {searchStage} from './stage-search69.mjs';
const data=JSON.parse(fs.readFileSync(process.argv[2])),{api}=await loadApi(),c=compile(data.level),before=api.replayRevisedRoute(data.level,data.drags);if(!before.valid)throw Error(before.error);
let state=stateOf(c,JSON.parse(before.finalStateKey)),drags=[...data.drags],cost=before.nonClearingDrags;
for(const goal of [11,18,24,Infinity]){if(goal<=data.goal)continue;const result=searchStage(data.level,{startState:state,goalClears:goal,floor:11-cost,maxStates:1000000,maxMilliseconds:Number(process.env.MS??40000),weight:Number(process.env.WEIGHT??1000),orderSeed:Number(process.env.ORDER??0)});console.log(JSON.stringify({...result,state:undefined,drags:undefined,best:result.best?{clears:result.best.clears,cost:result.best.cost}:undefined}));if(result.status!=='witness')break;state=result.state;cost+=result.cost;drags.push(...result.drags);const replay=api.replayRevisedRoute(data.level,drags);if(!replay.valid)throw Error(replay.error);const file=`deliverables/remake31-200-v145-20260924/batches/lv061-070/author68-69/extended69-stage-${Date.now()}.json`;fs.writeFileSync(file,JSON.stringify({...data,drags,goal,cost,replay,levelSha256:digest(data.level)},null,2));console.log(JSON.stringify({file,goal,cost,complete:replay.complete}));}
