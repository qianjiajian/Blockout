import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi} from '../../remake21to30-v120.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {compile,stateOf,each} from './automatic-generator-floor.mjs';
import {verifyDecisions} from './author-axis-decisions.mjs';
const file=process.argv[2],data=JSON.parse(fs.readFileSync(file)),{level,drags}=data,{api}=await loadApi();assert.equal(level.id,62);
const apply=(m,d)=>{m.beginAction();for(const p of d.path)assert(m.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);assert(m.commitAction());};
for(let step=0;step<drags.length&&!data.earlyIceChoice;step++){
 const prefix=drags.slice(0,step),base=api.replayRevisedRoute(level,prefix);if(!base.valid||base.complete)continue;const snap=JSON.parse(base.finalStateKey);
 for(const frozen of snap.blocks.filter(b=>b.frozen>0)){
  const changed=structuredClone(level);delete changed.blocks.find(b=>b.id===frozen.id).frozen;const m=new api.PuzzleModel(changed);m.startCountdown();prefix.forEach(d=>apply(m,d));const c=compile(changed,api);
  each(c,stateOf(c,m.snapshot()),(_s,cost,get)=>{if(cost!==1)return;const d=get();if(d.blockId!==frozen.id)return;const a=api.replayRevisedRoute(level,[...prefix,d]),b=api.replayRevisedRoute(changed,[...prefix,d]);if(!a.valid&&b.valid){data.earlyIceChoice={beforeDrag:step+1,blockId:frozen.id,remainingIce:frozen.frozen,cleared:snap.cleared,relaxedMove:d};return false;}});
 }
}
assert(data.earlyIceChoice,'Hidden ice must constrain an actual local gesture');
const m=new api.PuzzleModel(level);m.startCountdown();const events=[];
function record(before,after,step,unit,trigger){for(const g of after.generators){const old=before.generators.find(a=>a.id===g.id);if(g.head===old.head)continue;const spawned=g.queueBlockIds.slice(old.head,g.head);assert(spawned.length>0);for(const id of spawned){const b=after.blocks.find(b=>b.id===id);assert(b);const source=level.blocks.find(b=>b.id===id);assert.deepEqual([b.x,b.y],g.spawn);assert.deepEqual(b.shape,source.shape);}events.push({step,unit,trigger,generatorId:g.id,headBefore:old.head,headAfter:g.head,spawned,remaining:g.remaining,spawn:g.spawn,appearedImmediately:true});}}
for(const [i,d]of drags.entries()){m.beginAction();for(const [j,p]of d.path.entries()){const b=m.snapshot();assert(m.moveBlockStep(d.blockId,...p));record(b,m.snapshot(),i+1,j+1,'unit-move');}if(d.exitSide){const b=m.snapshot();assert(m.tryExit(d.blockId,d.exitSide).ok);record(b,m.snapshot(),i+1,d.path.length+1,'clear-or-peel');}assert(m.commitAction());}
assert(m.snapshot().complete);assert.equal(events.flatMap(e=>e.spawned).length,3);
data.generatorLocalEvidence={fixedQueue:level.generators[0].queueBlockIds,events,completeQueueConsumed:true,scope:'Actual model unit-step observation of immediate FIFO dispatch; not a global-order or lower-bound claim'};
data.validation.decisions=verifyDecisions(data,api);data.validation.generatorUnitStepEvents=events.length;
const out=`deliverables/remake31-200-v145-20260924/batches/lv061-070/author61-64/generator-candidate62-${Date.now()}.json`;fs.writeFileSync(out,JSON.stringify(data,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({out,levelSha256:digest(level),events:events.length,ice:!!data.earlyIceChoice}));
