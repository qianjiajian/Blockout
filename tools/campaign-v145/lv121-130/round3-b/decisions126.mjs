import fs from 'node:fs';
import assert from 'node:assert/strict';
import {api,save} from './common.mjs';
import {replayTime} from './replay126-time.mjs';
import {digest} from '../../../revised-preview-validation-v160.mjs';
import {compile,each} from '../../lv051-060/campaign-generator-axis-search-v146.mjs';
import {stateFromSnapshot} from '../../lv051-060/immediate-generator-floor56-v146.mjs';
const input=process.argv[2],data=JSON.parse(fs.readFileSync(input)),{level,drags}=data,graph=compile(level),m=new api.PuzzleModel(level);m.startCountdown();let cases=[],used=new Set();
for(let k=0;k<drags.length&&cases.length<2;k++){
 const snap=m.snapshot(),state=stateFromSnapshot(graph,snap),prefix=drags.slice(0,k);
 each(graph,state,(_next,cost,get)=>{
  if(cost!==1)return;const wrong=get(),b=m.getBlock(wrong.blockId);if(!b||b.shape.length<2||used.has(b.id)||!wrong.path.length)return;
  const start=[b.x,b.y],recovery={blockId:b.id,path:[...wrong.path.slice(0,-1).reverse(),start]},initial=api.replayRevisedRoute(level,prefix),wrongReplay=api.replayRevisedRoute(level,[...prefix,wrong]);
  if(!wrongReplay.valid||wrongReplay.clearEvents!==initial.clearEvents)return;
  const blocked=api.replayRevisedRoute(level,[...prefix,wrong,drags[k]]);if(blocked.valid)return;
  const restored=api.replayRevisedRoute(level,[...prefix,wrong,recovery]);if(!restored.valid||restored.finalStateKey!==initial.finalStateKey)return;
  const fullRecoveredRoute=[...prefix,wrong,recovery,...drags.slice(k)],recovered=api.replayRevisedRoute(level,fullRecoveredRoute);if(!recovered.valid||!recovered.complete)return;
  const timed=replayTime(level,fullRecoveredRoute,api,true);if(!timed.valid||!timed.complete)return;
  cases.push({atStep:k+1,beforeDrag:k+1,blockId:b.id,area:b.shape.length,correctDrag:drags[k],legalWrongParking:wrong,blockedNextAction:drags[k],recoveryDrag:recovery,fullRecoveredRoute,timedRecovery:timed,validation:{wrongLegal:true,blockedReason:blocked.error,spatialStateRestored:true,fullRecoveryComplete:true,extraNonClearingDrags:recovered.nonClearingDrags-28,globalDeadEndProven:false,optimalPenaltyProven:false}});used.add(b.id);if(cases.length>=2)return false;
 });
 const d=drags[k];m.beginAction();for(let p of d.path)assert(m.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);assert(m.commitAction());
}
assert.equal(cases.length,2);console.log(JSON.stringify({file:save('decisions126',{input,levelSha256:digest(level),routeSha256:digest(drags),decisionCases:cases,method:'Each wrong parking, blocked next action, inverse parking and entire recovered route replays through current model including all nine shells, both ice5 blocks and both real countdown covers. No omission, timer mutation, global-dead-end or optimality claim.',passed:true}),cases:cases.map(c=>({atStep:c.atStep,block:c.blockId,area:c.area}))}));
