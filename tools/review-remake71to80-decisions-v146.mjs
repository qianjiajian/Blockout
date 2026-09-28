// Evidence checker, not a human enjoyment or calibrated difficulty score.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadApi} from './remake21to30-v120.mjs';
import {verifyRulesLock} from './verify-rules-lock.mjs';
import {checkGeneratorFloor} from './remake31to40-generator-floor.mjs';
const ruleGate=()=>{const r=verifyRulesLock();assert(r.ok);assert(['1.46.0','1.47.0'].includes(r.activeVersion));};
import {digest} from './revised-preview-validation-v160.mjs';
import {checkFastFloor,compileLevel,stateFromSnapshot,forEachGesture} from './remake21to30-mask-floor.mjs';
const diff=(a,b,p='')=>{
  if(JSON.stringify(a)===JSON.stringify(b))return [];
  if(a&&b&&typeof a==='object'&&typeof b==='object')return [...new Set([...Object.keys(a),...Object.keys(b)])].flatMap(k=>diff(a[k],b[k],p?`${p}.${k}`:k));
  return [{path:p,before:a,after:b}];
};
// Derived afresh from the real model, never trusted from candidate prose.
// A local dependency or inability to exit in one drag is not a global order proof.
export function observeMechanismProcess(level,drags,api){
  const model=new api.PuzzleModel(structuredClone(level));model.startCountdown();
  const graph=level.generators?.length||level.shutters?.some(s=>s.skin==='lift')||level.gates.some(g=>g.portals)||level.blocks.some(b=>b.movementAxis||b.keyId||b.lockedBy)?null:compileLevel(level),peels=[],transitions=[],innerParkingDependencies=[],generatorEvents=[];
  for(const [i,d] of drags.entries()){
    const before=model.snapshot(),body=before.blocks.find(b=>b.id===d.blockId);
    model.beginAction();for(const p of d.path)assert(model.moveBlockStep(d.blockId,...p));
    if(d.exitSide)assert(model.tryExit(d.blockId,d.exitSide).ok);assert(model.commitAction());
    const after=model.snapshot(),retained=after.blocks.find(b=>b.id===d.blockId);
    for(const g of after.generators){const old=before.generators.find(p=>p.id===g.id);if(old&&g.head>old.head)generatorEvents.push({step:i+1,generatorId:g.id,spawned:g.queueBlockIds.slice(old.head,g.head),remaining:g.remaining});}
    if(body.layers.length>1&&retained?.layers.length===body.layers.length-1){
      const index=graph?.blocks.findIndex(b=>b.id===body.id),direct=[];
      if(graph)forEachGesture(graph,stateFromSnapshot(graph,after),(j,v,cost,get)=>{if(j===index&&cost===0)direct.push(get());});
      const removalIndex=drags.findIndex((next,j)=>j>i&&next.blockId===body.id&&next.exitSide);
      peels.push({step:i+1,blockId:body.id,area:body.shape.length,fromColor:body.layers[0],innerColor:retained.layers[0],
        retainedAnchor:[retained.x,retained.y],clearEvent:after.cleared,directInnerExitCountInRelaxedGraph:graph?direct.length:null,localDirectExitAnalysis:graph?'qualified-optional-exit-graph':'unsupported-advanced-local-analysis',
        laterBodyExitStep:removalIndex<0?null:removalIndex+1,interveningOtherBlockDrags:removalIndex<0?null:drags.slice(i+1,removalIndex).filter(x=>x.blockId!==body.id).length});
    }
    if(after.cleared===before.cleared&&body.layers.length===1&&peels.some(p=>p.blockId===body.id)&&drags[i+1]?.blockId!==body.id){
      const next=drags[i+1];
      if(next){const omit=api.replayRevisedRoute(level,[...drags.slice(0,i),next]);
        if(!omit.valid)innerParkingDependencies.push({parkingStep:i+1,blockId:body.id,parking:d,nextAction:next,errorIfOnlyParkingOmitted:omit.error,globalOrderProven:false});}
    }
    if(after.cleared>before.cleared){
      const freezes=(rows,previous)=>rows.flatMap(b=>{const old=previous.find(x=>x.id===b.id);return old&&(old.frozen??0)>0&&(b.frozen??0)===0?[b.id]:[];});
      const revealed=after.shutters.filter(s=>s.revealed&&!before.shutters.find(p=>p.id===s.id)?.revealed).map(s=>s.id);
      transitions.push({step:i+1,blockId:d.blockId,kind:retained?'peel':'body-removal',clearEvent:after.cleared,
        thawedBlocks:freezes(after.blocks,before.blocks),thawedGates:freezes(after.gates,before.gates),revealedShutters:revealed});
    }
  }
  assert(model.snapshot().complete&&!model.snapshot().failed);
  return {inventory:{shellBlocks:level.blocks.filter(b=>b.layers?.length>1).length,numericIceBlocks:level.blocks.filter(b=>b.frozen>0).length,
    shutters:level.shutters?.length??0,frozenGates:level.gates.filter(g=>g.frozen>0).length,generators:level.generators?.length??0},peels,transitions,innerParkingDependencies,generatorEvents,
    provesAllSolutionsOrder:false,humanBlindTested:false};
}
// Same real prefix, same occupants, one ice restriction removed. This proves
// a local mechanism constraint, not a necessary order shared by all solutions.
export function verifyEarlyIceChoices(data,api){
  const evidence=[];
  for(const [key,rows,idKey]of [['earlyIceChoice','blocks','blockId'],['earlyGateChoice','gates','gateId']]){
    const c=data[key];if(!c)continue;
    assert(Number.isSafeInteger(c.beforeDrag)&&c.beforeDrag>=1&&c.beforeDrag<=data.drags.length);
    const prefix=data.drags.slice(0,c.beforeDrag-1),original=api.replayRevisedRoute(data.level,prefix);
    assert(original.valid&&!original.complete);const before=JSON.parse(original.finalStateKey),body=before[rows].find(b=>b.id===c[idKey]);
    assert(body&&body.frozen>0);assert.equal(c.remainingIce,body.frozen);assert.equal(c.cleared,before.cleared);
    const relaxed=structuredClone(data.level),target=relaxed[rows].find(b=>b.id===c[idKey]);assert(target?.frozen>0);delete target.frozen;
    const relaxedPrefix=api.replayRevisedRoute(relaxed,prefix);assert(relaxedPrefix.valid);
    const same=JSON.parse(relaxedPrefix.finalStateKey);same[rows].find(b=>b.id===c[idKey]).frozen=body.frozen;
    assert.deepEqual(same,before,'Early choice must not alter the prefix spatial state');
    const rejected=api.replayRevisedRoute(data.level,[...prefix,c.relaxedMove]);assert(!rejected.valid);
    const allowed=api.replayRevisedRoute(relaxed,[...prefix,c.relaxedMove]);assert(allowed.valid,allowed.error);
    if(rows==='gates')assert(allowed.clearEvents>relaxedPrefix.clearEvents);else assert.equal(allowed.clearEvents,relaxedPrefix.clearEvents);
    evidence.push({kind:rows==='gates'?'gate-ice':'block-ice',beforeDrag:c.beforeDrag,id:c[idKey],remainingIce:body.frozen,
      relaxedMove:c.relaxedMove,originalRejection:rejected.error,samePrefixVerified:true,provesGlobalOrder:false});
  }
  return evidence;
}
export function verifyDecisions(data,api){
  const {level,drags}=data;
  assert(data.decisionCases?.length,'Concrete decision evidence required');
  const cases=data.decisionCases.filter(c=>c.legalWrongParking).map(c=>{
    assert(Number.isSafeInteger(c.atStep)&&c.atStep>=1&&c.atStep<drags.length);
    const prefix=drags.slice(0,c.atStep-1);assert.deepEqual(c.correctDrag,drags[c.atStep-1]);
    const insertBefore=c.beforeDrag!==undefined;
    if(insertBefore)assert.equal(c.beforeDrag,c.atStep);
    assert.deepEqual(c.blockedNextAction,drags[insertBefore?c.atStep-1:c.atStep]);
    assert.equal(c.area,level.blocks.find(b=>b.id===c.blockId).shape.length);assert(c.area>1);
    assert.equal(c.legalWrongParking.blockId,c.blockId);assert.equal(c.recoveryDrag.blockId,c.blockId);
    assert(!c.legalWrongParking.exitSide&&!c.recoveryDrag.exitSide,'Parking and recovery cannot be clearing gestures');
    const wrong=api.replayRevisedRoute(level,[...prefix,c.legalWrongParking]);assert(wrong.valid&&!wrong.complete);
    const initialReplay=api.replayRevisedRoute(level,prefix);assert(initialReplay.valid);
    assert.equal(wrong.clearEvents,initialReplay.clearEvents,'Wrong parking must not clear or peel');
    const blocked=api.replayRevisedRoute(level,[...prefix,c.legalWrongParking,c.blockedNextAction]);assert(!blocked.valid,'Claimed obstruction must really block the specified next gesture');
    const correctedEndRoute=[...prefix,c.legalWrongParking,c.recoveryDrag,...drags.slice(insertBefore?c.atStep-1:c.atStep)];
    const restoredStartRoute=[...prefix,c.legalWrongParking,c.recoveryDrag,...drags.slice(c.atStep-1)];
    const restoresStart=JSON.stringify(c.fullRecoveredRoute)===JSON.stringify(restoredStartRoute);
    assert.deepEqual(c.fullRecoveredRoute,restoresStart?restoredStartRoute:correctedEndRoute);
    if(restoresStart){
      const restored=api.replayRevisedRoute(level,[...prefix,c.legalWrongParking,c.recoveryDrag]);
      const initial=api.replayRevisedRoute(level,prefix);
      assert(restored.valid&&initial.valid);assert.equal(restored.finalStateKey,initial.finalStateKey,'Return-to-start case must really restore the previous spatial state');
    }
    const recovered=api.replayRevisedRoute(level,c.fullRecoveredRoute);assert(recovered.valid&&recovered.complete);
    return {atStep:c.atStep,blockId:c.blockId,area:c.area,wrongParking:c.legalWrongParking,blockedNext:c.blockedNextAction,
      recovery:c.recoveryDrag,blockedReason:blocked.error,recoveredDrags:recovered.effectiveDrags,recoveredRepositions:recovered.nonClearingDrags,
      provesGlobalDeadEnd:false,provesOptimalPenalty:false};
  });
  assert(cases.length,'At least one independently replayable multi-cell case required');
  const contrast=data.mechanismCounterfactual;
  let mechanismContrast=null;
  if(contrast?.level&&contrast?.drags){
    const changes=diff(level,contrast.level);assert(changes.length);
    for(const c of changes){
      assert(/^(shutters\.\d+\.count|gates\.\d+\.frozen|blocks\.\d+\.frozen)$/.test(c.path),`Confounded comparison: ${c.path}`);
      assert((c.after??0)<=(c.before??0),'Comparison may only lower the same mechanism constraint');
    }
    assert.equal(new Set(changes.map(c=>c.path.split('.')[0])).size,1,'Attribute one comparison to only one mechanism category');
    const replay=api.replayRevisedRoute(contrast.level,contrast.drags);assert(replay.valid&&replay.complete);
    const replayOnOriginal=api.replayRevisedRoute(level,contrast.drags);
    const limits={floor:replay.nonClearingDrags+1,maxStates:500000,maxMilliseconds:30000};
    const separation=level.generators?.length?checkGeneratorFloor(level,api,limits):checkFastFloor(level,limits);
    mechanismContrast={changes,levelSha256:digest(contrast.level),routeSha256:digest(contrast.drags),drags:replay.effectiveDrags,
      repositions:replay.nonClearingDrags,worksUnchangedOnOriginal:replayOnOriginal.valid&&replayOnOriginal.complete,originalRejection:replayOnOriginal.error,
      strictBoundSeparation:separation.thresholdProven,proof:separation,officialLevel:false};
  }
  return {levelId:level.id,levelSha256:digest(level),routeSha256:digest(drags),cases,mechanismContrast,
    earlyIceChoices:verifyEarlyIceChoices(data,api),observedMechanismProcess:observeMechanismProcess(level,drags,api),humanBlindTested:false};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  ruleGate();const {api}=await loadApi();
  for(const f of process.argv.slice(2)){const data=JSON.parse(fs.readFileSync(f));console.log(JSON.stringify({file:f,...verifyDecisions(data,api)}));}
}
