import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi,OUTPUT,writeNew,ruleGate} from './remake61to70-v146.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
ruleGate();
const input=process.argv[2],probeFile=process.argv[3],data=JSON.parse(fs.readFileSync(input)),probe=JSON.parse(fs.readFileSync(probeFile));
assert.equal(data.level.id,67);const {api}=await loadApi(),model=new api.PuzzleModel(data.level),events=[],drags=[];
let failure=null;
for(const [index,action] of probe.actions.entries()){
 const before=model.snapshot();
 if(action.revealId){events.push({action:index+1,revealId:action.revealId,alreadyRevealed:before.shutters.find(s=>s.id===action.revealId)?.revealed});continue;}
 model.beginAction();
 for(const [unit,p] of action.path.entries()){
  if(!model.moveBlockStep(action.blockId,...p)){failure={action:index+1,unit:unit+1,gesture:action,before:snapshotLite(before),current:model.snapshot()};break;}
 }
 if(failure)break;
 if(action.exitSide){const r=model.tryExit(action.blockId,action.exitSide);if(!r.ok){failure={action:index+1,gesture:action,exit:r,before:snapshotLite(before),current:model.snapshot()};break;}}
 if(!model.commitAction()){failure={action:index+1,gesture:action,reason:'empty-or-invalid-commit',current:model.snapshot()};break;}
 drags.push(action);const after=model.snapshot();
 events.push({action:index+1,blockId:action.blockId,clears:after.cleared,reveals:after.shutters.filter(s=>s.revealed&&!before.shutters.find(q=>q.id===s.id).revealed).map(s=>s.id)});
}
function snapshotLite(s){return {cleared:s.cleared,blocks:s.blocks.map(b=>({id:b.id,x:b.x,y:b.y,frozen:b.frozen,shutterId:b.shutterId})),shutters:s.shutters};}
const replay=api.replayRevisedRoute(data.level,drags),out=`${OUTPUT}/root67/delayed-real-comparison-${Date.now()}.json`;
writeNew(out,{input,probeFile,levelSha256:digest(data.level),probeSha256:digest(probe),status:failure?'RELAXED_PATH_REJECTED_IN_REAL_MODEL':'REAL_REPLAY_ACCEPTED',events,failure,acceptedPrefix:drags,replay});
console.log(JSON.stringify({out,status:failure?'rejected':'accepted',at:failure?.action,unit:failure?.unit,prefix:drags.length,cost:replay.nonClearingDrags,complete:replay.complete,events}));
