import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {loadApi} from '../../native-block-repair-v143.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
const lock=verifyRulesLock();assert(lock.ok);const{api}=await loadApi();
for(const file of process.argv.slice(2)){
 const d=JSON.parse(fs.readFileSync(file)),l=d.level,m=new api.PuzzleModel(l);assert([51,52,53].includes(l.id));m.startCountdown();
 const steps=[],peels=[],thaw=[];
 for(const[i,drag]of d.drags.entries()){
  const before=m.snapshot(),b=before.blocks.find(b=>b.id===drag.blockId);assert(b);m.beginAction();for(const p of drag.path)assert(m.moveBlockStep(b.id,...p));if(drag.exitSide)assert(m.tryExit(b.id,drag.exitSide).ok);assert(m.commitAction());const after=m.snapshot(),remaining=m.getBlock(b.id);
  const transitions=[];
  for(const key of ['blocks','gates'])for(const old of before[key]){const now=after[key].find(x=>x.id===old.id);if(old.frozen>0&&now?.frozen===0){const row={kind:key,id:old.id,step:i+1,clearEvent:after.cleared,from:old.frozen,to:0};thaw.push(row);transitions.push(row);}}
  if(remaining&&remaining.layers.length<b.layers.length)peels.push({blockId:b.id,step:i+1,clearEvent:after.cleared,fromColor:b.layers[0],toColor:remaining.layers[0],retainedPosition:[remaining.x,remaining.y]});
  steps.push({step:i+1,blockId:b.id,axis:b.movementAxis??null,clearEvent:after.cleared,deltaClears:after.cleared-before.cleared,thawed:transitions});
 }
 assert(m.snapshot().complete&&!m.snapshot().failed);const decisions=[];
 for(const c of d.decisionCases){assert.deepEqual(c.correctDrag,d.drags[c.atStep-1]);assert.equal(c.area,l.blocks.find(b=>b.id===c.blockId).shape.length);assert(c.area>1);const prefix=d.drags.slice(0,c.atStep-1),start=api.replayRevisedRoute(l,prefix),wrong=api.replayRevisedRoute(l,[...prefix,c.legalWrongParking]);assert(wrong.valid);assert.equal(start.clearEvents,wrong.clearEvents);const restored=api.replayRevisedRoute(l,[...prefix,c.legalWrongParking,c.recoveryDrag]);assert(restored.valid);assert.equal(restored.finalStateKey,start.finalStateKey);const blocked=api.replayRevisedRoute(l,[...prefix,c.legalWrongParking,c.blockedNextAction]);assert(!blocked.valid);const expected=[...prefix,c.legalWrongParking,c.recoveryDrag,...d.drags.slice(c.atStep-1)];assert.deepEqual(c.fullRecoveredRoute,expected);const recovered=api.replayRevisedRoute(l,expected);assert(recovered.valid&&recovered.complete);decisions.push({blockId:c.blockId,atStep:c.atStep,area:c.area,wrongLegal:true,nextActionRejected:blocked.error,recoveredComplete:true});}
 for(const c of d.axisLocalChoices){const relaxed=structuredClone(l);delete relaxed.blocks.find(b=>b.id===c.blockId).movementAxis;assert(api.replayRevisedRoute(l,c.prefix).valid);assert(!api.replayRevisedRoute(l,[...c.prefix,c.blockedAction]).valid);assert(api.replayRevisedRoute(relaxed,[...c.prefix,c.blockedAction]).valid);}
 const bodyIds=l.blocks.filter(b=>b.frozen>0).map(b=>b.id),gateIds=l.gates.filter(b=>b.frozen>0).map(b=>b.id);assert(bodyIds.every(id=>thaw.some(x=>x.kind==='blocks'&&x.id===id)));assert(gateIds.every(id=>thaw.some(x=>x.kind==='gates'&&x.id===id)));assert.equal(peels.length,l.blocks.filter(b=>b.layers?.length>1).length);
 const report={candidate:file,candidateSha256:digest(fs.readFileSync(file)),levelSha256:digest(l),ruleVersion:lock.activeVersion,createdAt:new Date().toISOString(),passed:true,decisions,axisLocalChoices:{count:d.axisLocalChoices.length,passed:true},inventory:{blocks:l.blocks.length,axes:l.blocks.filter(b=>b.movementAxis).length,numericIce:bodyIds.length,frozenGates:gateIds.length,shells:l.blocks.filter(b=>b.layers?.length>1).length},steps,peels,thaw,allFrozenInstancesActuallyThawed:true,complete:true,humanBlindTested:false,pointerValidated:false};
 const out=path.dirname(file)+'/mechanism-process'+l.id+'-'+Date.now()+'.json';fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({out,passed:true,id:l.id,decisions:decisions.length,thaw:thaw.length}));
}
