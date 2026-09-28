import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi,OUTPUT,writeNew} from './remake61to70-v146.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
const file=process.argv[2],d=JSON.parse(fs.readFileSync(file)),{level,drags}=d,{api}=await loadApi();assert.equal(level.id,70);
const m=new api.PuzzleModel(level);m.startCountdown();let found;
const apply=(model,drag)=>{model.beginAction();for(const p of drag.path)assert(model.moveBlockStep(drag.blockId,...p));if(drag.exitSide)assert(model.tryExit(drag.blockId,drag.exitSide).ok);assert(model.commitAction());};
for(let i=0;i<drags.length&&!found;i++){
 const d=drags[i],held=m.clone();held.beginAction();
 for(let j=0;j<d.path.length;j++){
  const before=held.snapshot(),body=before.blocks.find(b=>b.id===d.blockId);assert(held.moveBlockStep(d.blockId,...d.path[j]));const after=held.snapshot();
  const born=after.blocks.filter(b=>!before.blocks.some(q=>q.id===b.id));
  if(!born.length)continue;const reverse=held.clone();
  if(reverse.moveBlockStep(d.blockId,body.x,body.y))continue;
  const reduced=structuredClone(level),cargo=new Set(level.generators.flatMap(g=>g.queueBlockIds));reduced.generators=[];reduced.blocks=reduced.blocks.filter(b=>!cargo.has(b.id));
  // Only a local causal counterfactual. It is not a playable candidate, floor
  // certificate, source adaptation or complete-solution substitute.
  const without=new api.PuzzleModel(reduced);without.startCountdown();for(const q of drags.slice(0,i))apply(without,q);without.beginAction();for(const p of d.path.slice(0,j+1))assert(without.moveBlockStep(d.blockId,...p));assert(without.moveBlockStep(d.blockId,body.x,body.y));
  const pause={blockId:d.blockId,path:d.path.slice(0,j+1)},resume={...d,path:d.path.slice(j+1)},route=[...drags.slice(0,i),pause,resume,...drags.slice(i+1)],replay=api.replayRevisedRoute(level,route);if(!replay.valid||!replay.complete)continue;
  found={beforeDrag:i+1,unitStep:j+1,movingBlock:d.blockId,previousAnchor:[body.x,body.y],releaseAction:pause,spawned:born.map(b=>b.id),realReverseRejected:true,onlyCargoRemovedReverseAccepted:true,sourceClearCountBefore:before.cleared,sourceClearCountAfter:after.cleared,fullRecoveryRoute:route,recoveredTotalDrags:replay.effectiveDrags,interpretation:'移出整个固定落点即投放，途中新货阻止撤回原格；是否现在释放机口改变可用停车位。提前松手后沿剩余路线仍完整通关，未用道具或删货。'};break;
 }
 apply(m,d);
}
assert(found,'Need a concrete immediate-spawn spatial consequence');
const out=`${OUTPUT}/author70/generator-causality-${Date.now()}.json`;writeNew(out,{status:'PASS',candidate:file,candidateFileSha256:digest(fs.readFileSync(file)),levelSha256:digest(level),routeSha256:digest(drags),case:found,toolSha256:digest(fs.readFileSync('tools/campaign-v145/lv061-070/generator-causal70.mjs')),notGlobalOptimalityProof:true});console.log(JSON.stringify({out,beforeDrag:found.beforeDrag,unitStep:found.unitStep,spawned:found.spawned,status:'PASS'}));
