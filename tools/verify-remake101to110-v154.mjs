// v1.54: only 101 changes to L10/U15. Original v1.47 verifier is preserved.
import {verifyQualified101Floor} from '../deliverables/remake101-110-v146-20260924/proof101-v152/qualified101-floor-v154.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadApi,BASELINE,ROOT,ruleGate,baseline,auditSpatial,digest,save,TARGETS} from './remake101to110-v146.mjs';
import {verifySource101to104} from './verify-source101to104-v147.mjs';
import {verifySource105} from './verify-source105-v147.mjs';
import {verifySource106} from '../deliverables/remake101-110-v146-20260924/pipeline106/verify-source106-v147.mjs';
import {verifySource as verifySource107to110} from './verify-source107to110-v147.mjs';
import {loadSpatialApi,searchSpatial,compileSpatial,replayDomain} from '../deliverables/remake101-110-v146-20260924/pipeline/spatial-star-domain.mjs';
import {searchSpatial as searchOptionalLift} from '../deliverables/remake101-110-v146-20260924/pipeline/optional-lift-star.mjs';
import {searchSpatial as searchContainedLift} from '../deliverables/remake101-110-v146-20260924/pipeline/optional-lift-star-v2.mjs';
import {checkStaticStarFloor} from '../deliverables/remake101-110-v146-20260924/pipeline/static-star-mask-floor.mjs';
import {checkSymmetryFloor} from './remake21to30-symmetry-floor-v139.mjs';
import {verifyDecisions} from './review-remake101to110-decisions-v147.mjs';
import {measureRoute} from './remake21to30-quality.mjs';
import {collectBindings} from './remake91to100-bindings.mjs';
import {inspectDisjointData} from './remake91to100-data-drift.mjs';
import {inspectDisjointWiring} from './remake91to100-wiring-drift.mjs';
const act=(m,d)=>{m.beginAction();for(const p of d.path)assert(m.moveBlockStep(d.blockId,...p));let exit;if(d.exitSide){exit=m.tryExit(d.blockId,d.exitSide);assert(exit.ok);}assert(m.commitAction());return exit;};

// A necessary geometric condition, deliberately conservative: an eligible pair
// still needs an executable single-property test. An incompatible whole-body
// cross-section cannot become passable merely by removing the star attribute.
export function starOrdinaryCompatibility(level){
 return level.blocks.filter(b=>b.star).map(b=>({blockId:b.id,ordinaryGates:level.gates.filter(g=>!g.star&&(b.layers??[b.color]).includes(g.color)).map(g=>({gateId:g.id,portals:(g.portals??[g]).map(p=>{
  const horizontal=p.side==='top'||p.side==='bottom',axis=horizontal?0:1,span=Math.max(...b.shape.map(c=>c[axis]))-Math.min(...b.shape.map(c=>c[axis]))+1;
  const axisAllowed=!b.movementAxis||(b.movementAxis==='vertical')===horizontal;
  return{side:p.side,size:p.size,wholeCrossSection:span,axisAllowed,possiblyFits:axisAllowed&&span<=p.size};
 })}))}));
}

// Verify local, single-attribute counterfactuals without claiming a global
// ordering, optimal mistake penalty, or player usability result.
export function verifyMechanisms(data,api){
 const {level,drags}=data,model=new api.PuzzleModel(level),events=[],starCases=[],axisCases=[],starExits=[],keyEvents=[];model.startCountdown();
 for(const[i,d]of drags.entries()){
  const before=structuredClone(model.snapshot()),exit=act(model,d);const after=model.snapshot(),body=before.blocks.find(b=>b.id===d.blockId),retained=after.blocks.find(b=>b.id===d.blockId);
  if(body.star&&exit){const gate=before.gates.find(g=>g.id===exit.gateId);assert(gate?.star&&gate.color===exit.color);starExits.push({step:i+1,blockId:body.id,gateId:gate.id,side:exit.side,color:exit.color,peel:!!exit.layerRemoved});}
  if(body.keyId&&exit){
   const released=!retained,changes=[];
   for(const locked of before.blocks.filter(b=>b.lockedBy===body.keyId)){
    const next=after.blocks.find(b=>b.id===locked.id);if(!next)continue;
    const beforeCount=locked.lockCount??1,afterCount=next.lockCount??0,expected=Math.max(0,beforeCount-Number(released));assert.equal(afterCount,expected,'Keys release only on final body removal');
    if(afterCount!==beforeCount)changes.push({blockId:locked.id,before:beforeCount,after:afterCount});
   }
   keyEvents.push({step:i+1,blockId:body.id,keyId:body.keyId,released,peel:!!retained,lockChanges:changes});
  }
  const revealed=after.shutters.filter(s=>s.revealed&&!before.shutters.find(a=>a.id===s.id)?.revealed);
  if(after.cleared>before.cleared||revealed.length)events.push({step:i+1,clearBefore:before.cleared,clearAfter:after.cleared,blockId:d.blockId,peel:!!retained&&after.cleared>before.cleared,beforeLayers:body.layers,afterLayers:retained?.layers??[],revealed:revealed.map(s=>({id:s.id,skin:s.skin??'shutter'}))});
 }
 assert(model.snapshot().complete);assert.equal(events.filter(e=>e.peel).length,level.blocks.reduce((n,b)=>n+(b.layers?.length??1)-1,0));
 const revealedIds=events.flatMap(e=>e.revealed.map(s=>s.id));for(const s of level.shutters??[])assert(model.snapshot().shutters.find(a=>a.id===s.id).revealed);
 for(const c of data.mechanismEvidence?.starCases??[]){
  assert(Number.isSafeInteger(c.afterDrags)&&c.afterDrags>=0&&c.afterDrags<=drags.length);assert(!(c.approachDrags&&c.approaches));const approaches=c.approachDrags??c.approaches??(c.approach?[c.approach]:[]);assert.deepEqual(c.prefix,[...drags.slice(0,c.afterDrags),...approaches]);assert(api.replayRevisedRoute(level,c.prefix).valid,'Actual side branch must be executable');const original=new api.PuzzleModel(level);original.startCountdown();c.prefix.forEach(d=>act(original,d));assert.equal(original.exitAttemptStatus(c.blockId,c.side),'star-gate-required');
  const relaxedLevel=structuredClone(level),body=relaxedLevel.blocks.find(b=>b.id===c.blockId);assert(body?.star);delete body.star;
  const relaxed=new api.PuzzleModel(relaxedLevel);relaxed.startCountdown();c.prefix.forEach(d=>act(relaxed,d));const restored=structuredClone(relaxed.snapshot());restored.blocks.find(b=>b.id===c.blockId).star=true;assert.deepEqual(restored,original.snapshot());assert.equal(relaxed.exitAttemptStatus(c.blockId,c.side),'ok');starCases.push(c);
 }
 for(const c of data.mechanismEvidence?.axisCases??[]){
  if(c.afterDrags===undefined)assert.deepEqual(c.prefix,drags.slice(0,c.prefix.length));else{assert(Number.isSafeInteger(c.afterDrags)&&c.afterDrags>=0&&c.afterDrags<=drags.length);assert(!(c.approachDrags&&c.approaches));assert.deepEqual(c.prefix,[...drags.slice(0,c.afterDrags),...(c.approachDrags??c.approaches??[])]);}const original=api.replayRevisedRoute(level,c.prefix);assert(original.valid);const copy=structuredClone(level),body=copy.blocks.find(b=>b.id===c.blockId);assert(body?.movementAxis);const axis=body.movementAxis;delete body.movementAxis;
  const relaxed=api.replayRevisedRoute(copy,c.prefix);assert(relaxed.valid);const restored=JSON.parse(relaxed.finalStateKey);restored.blocks.find(b=>b.id===c.blockId).movementAxis=axis;assert.deepEqual(restored,JSON.parse(original.finalStateKey));assert(!api.replayRevisedRoute(level,[...c.prefix,c.action]).valid);assert(api.replayRevisedRoute(copy,[...c.prefix,c.action]).valid);axisCases.push(c);
 }
 const starGeometry=starOrdinaryCompatibility(level),starCounterfactualApplicable=starGeometry.some(b=>b.ordinaryGates.some(g=>g.portals.some(p=>p.possiblyFits)));
 if(starCounterfactualApplicable)assert(starCases.length,'Need actual local star-vs-ordinary gate decision');
 for(const b of level.blocks.filter(b=>b.star))assert(starExits.some(e=>e.blockId===b.id&&!e.peel),'Every star body must actually complete through its matching star gate');
 if(level.blocks.some(b=>b.movementAxis))assert(axisCases.length,'Need actual local axis decision');
 for(const b of level.blocks.filter(b=>b.keyId))assert(keyEvents.some(e=>e.blockId===b.id&&e.released));
 return{events,revealedIds,starCases,axisCases,starExits,keyEvents,starGeometry,starCounterfactualApplicable,starCounterfactualStatus:starCounterfactualApplicable?'PASS':level.blocks.some(b=>b.star)?'NOT_APPLICABLE_GEOMETRY':'NOT_APPLICABLE_NO_STARS',starIndependentDifficultyContributionProven:false,allInventoryCompleted:true,globalOrderProven:false,humanBlindTested:false};
}
export async function verifyCandidate(data,api,b=baseline(),options={}){
 const {level,drags}=data,target=level.id===101?{...TARGETS[101],range:[10,15]}:TARGETS[level.id];assert(target);const spatial=auditSpatial(level,api,b);
 let source;if(level.id>=101&&level.id<=104)source=verifySource101to104(level);else if(level.id===105)source=verifySource105(data);else if(level.id===106)source=verifySource106(data);else if(level.id>=107&&level.id<=110)source=verifySource107to110(level,api);else throw Error('No independently qualified source branch for level '+level.id);
 const replay=api.replayRevisedRoute(level,drags);assert(replay.valid&&replay.complete,replay.error);assert(replay.nonClearingDrags<=target.range[1]);
 const decisions=verifyDecisions(data,api),mechanisms=verifyMechanisms(data,api),measurement=measureRoute(level,drags,api);
 if(level.gates.some(g=>g.frozen)||level.blocks.some(b=>b.frozen))assert(decisions.earlyIceChoices.length,'Need independently tested ice constraint');
 const budget={floor:target.range[0],maxStates:options.maxStates??4000000,maxMilliseconds:options.maxMilliseconds??([101,102,104,107,109].includes(level.id)?900000:300000)};
 const full=await loadSpatialApi(),search=level.id===104?searchContainedLift:level.id===110?searchOptionalLift:searchSpatial;
 const floor=level.id===101?verifyQualified101Floor(level,budget):level.id===105?checkSymmetryFloor(level,budget):[101,102,107,109].includes(level.id)?checkStaticStarFloor(level,{...budget,symmetry:true,cacheLimit:50000}):search(level,full,{...budget,prove:true,maxTransitions:50000000,symmetry:true,clearPriority:true});
 assert(floor.thresholdProven,JSON.stringify({id:level.id,status:floor.status,termination:floor.termination,states:floor.exploredStates,shortcut:floor.cost??floor.relaxedNonClearingDrags}));
 const fullDomainReplay=replayDomain(compileSpatial(level,full),drags,full);assert(fullDomainReplay.complete);
 return{id:level.id,status:'PASS',levelSha256:digest(level),routeSha256:digest(drags),spatial,source,replay,floor,fullDomainReplay,measurement,decisions,mechanisms,pointerValidated:false,formalAdopted:false,humanBlindTested:false,releaseApproved:false};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 ruleGate();const files=process.argv.slice(2);assert(files.length);const {api,inputs}=await loadApi(),b=baseline(),bindings=collectBindings([...inputs,...files,BASELINE,'docs/rules/manifest.json','docs/mechanism-rules-v1.47.0.md','tools/verify-remake101to110-v154.mjs']);
 const wiringTexts=Object.fromEntries(['src/core/levels.ts','src/game/formalBlockShapes.ts'].map(p=>[p,fs.readFileSync(p,'utf8')]));
 const rows=[];for(const f of files)rows.push({file:f,...await verifyCandidate(JSON.parse(fs.readFileSync(f)),api,b)});
 const allowedDataDrift=[];for(const[p,h]of Object.entries(bindings))if(digest(fs.readFileSync(p))!==h)allowedDataDrift.push(wiringTexts[p]?inspectDisjointWiring(p,rows.map(r=>r.id),wiringTexts[p]):inspectDisjointData(p,rows.map(r=>r.id)));
 const out=save(`${ROOT}/validation-${Date.now()}.json`,{status:'PASS',activeVersion:ruleGate().activeVersion,bindings,allowedDataDrift,rows});console.log(JSON.stringify({out,rows:rows.map(r=>({id:r.id,L:r.floor.floor,U:r.replay.nonClearingDrags}))}));
}
