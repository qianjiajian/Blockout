import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi,OUTPUT,writeNew,ruleGate} from './remake61to70-v146.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {shapeClass} from '../../remake31to40-source-v141.mjs';
const file=process.argv[2],data=JSON.parse(fs.readFileSync(file)),{level,drags}=data,{api}=await loadApi();ruleGate();assert.equal(level.id,62);
const evidence=JSON.parse(fs.readFileSync(data.sourceEvidence.file));assert.equal(digest(fs.readFileSync(data.sourceEvidence.file)),data.sourceEvidence.sha256);for(const[f,h]of Object.entries(evidence.bindings))assert.equal(digest(fs.readFileSync(f)),h);
const source=data.source,remaining=new Map(level.blocks.map(b=>[b.id,b]));let checked=0;
for(const stage of source.stages)for(const item of stage.items){const id=`v146-62-${item.sourceId}`,b=remaining.get(id);assert(b);for(const k of ['color','frozen','layers','movementAxis'])assert.deepEqual(b[k],item[k]);assert.equal(shapeClass(b.shape),item.sourceId==='opening-4'?'H3':item.kind);assert.equal(b.shutterId,stage.id==='cover-4'?'v146-62-cover-4':undefined);remaining.delete(id);checked++;}
assert.equal(checked,23);const extras=[...remaining.values()];assert.equal(extras.length,1);assert.equal(extras[0].shape.length,1);assert(!extras[0].layers&&!extras[0].frozen&&!extras[0].shutterId);assert.equal(level.generators.length,1);assert.deepEqual(level.generators[0].queueBlockIds,['v146-62-cargo-1','v146-62-cargo-2','v146-62-cargo-3']);assert.equal(level.shutters.length,1);assert.equal(level.shutters[0].count,4);assert.deepEqual(Object.fromEntries(level.gates.map(g=>[g.color,g.frozen??0])),{yellow:0,purple:1,green:3,pink:5,cyan:7,blue:8,red:11});
const ice=data.earlyIceChoice,prefix=drags.slice(0,ice.beforeDrag-1),normal=api.replayRevisedRoute(level,[...prefix,ice.relaxedMove]),changed=structuredClone(level);delete changed.blocks.find(b=>b.id===ice.blockId).frozen;assert(!normal.valid&&normal.error.startsWith('Rejected move'));assert(api.replayRevisedRoute(changed,[...prefix,ice.relaxedMove]).valid);
for(const c of data.curtainLocalChoices){const relaxed=structuredClone(level);relaxed.shutters.find(s=>s.id===c.curtainId).count=c.relaxedCount;assert(!api.replayRevisedRoute(level,[...c.prefix,c.blockedAction]).valid);assert(api.replayRevisedRoute(relaxed,[...c.prefix,c.blockedAction]).valid);}
const apply=(m,d)=>{m.beginAction();for(const p of d.path)assert(m.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);assert(m.commitAction());};
const model=new api.PuzzleModel(level);model.startCountdown();let causal;
for(let i=0;i<drags.length&&!causal;i++){
 const d=drags[i],held=model.clone();held.beginAction();
 for(let j=0;j<d.path.length;j++){
  const before=held.snapshot(),body=before.blocks.find(b=>b.id===d.blockId);assert(held.moveBlockStep(d.blockId,...d.path[j]));const after=held.snapshot(),born=after.blocks.filter(b=>!before.blocks.some(q=>q.id===b.id));if(!born.length||held.clone().moveBlockStep(d.blockId,body.x,body.y))continue;
  const reduced=structuredClone(level),cargo=new Set(level.generators.flatMap(g=>g.queueBlockIds));reduced.generators=[];reduced.blocks=reduced.blocks.filter(b=>!cargo.has(b.id));
  const counter=new api.PuzzleModel(reduced);counter.startCountdown();let usable=true;try{for(const p of drags.slice(0,i))apply(counter,p);counter.beginAction();for(const p of d.path.slice(0,j+1))assert(counter.moveBlockStep(d.blockId,...p));assert(counter.moveBlockStep(d.blockId,body.x,body.y));}catch{usable=false;}if(!usable)continue;
  const pause={blockId:d.blockId,path:d.path.slice(0,j+1)},resume={...d,path:d.path.slice(j+1)},route=[...drags.slice(0,i),pause,resume,...drags.slice(i+1)],r=api.replayRevisedRoute(level,route);if(!r.valid||!r.complete)continue;
  causal={passed:true,beforeDrag:i+1,unitStep:j+1,spawned:born.map(b=>b.id),realReverseRejected:true,onlyCargoRemovedReverseAccepted:true,fullRecoveryRoute:route,clearBefore:before.cleared,clearAfter:after.cleared};break;
 }
 apply(model,d);
}
assert(causal,'Need actual immediate FIFO dispatch to change a local parking choice');
const out=`${OUTPUT}/checks/root-source62-${Date.now()}.json`;writeNew(out,{status:'PASS',candidate:file,candidateSha256:digest(fs.readFileSync(file)),levelSha256:digest(level),source:{passed:true,sourceBodies:checked,extraBodies:1,sourceEvidence:data.sourceEvidence.file,sourceSha256:data.sourceEvidence.sha256,frameBindings:evidence.bindings},curtainCases:data.curtainLocalChoices.length,hiddenIceCase:{passed:true,beforeDrag:ice.beforeDrag,blockId:ice.blockId},generatorCausalCase:causal,localCounterfactualNotUsedAsLowerBound:true});console.log(JSON.stringify({out,source:true,mechanismCausality:true,generatorAt:causal.beforeDrag}));
