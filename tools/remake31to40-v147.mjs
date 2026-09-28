// v1.47 adds only a Lv190 source exception; the 31-40 contract is unchanged.
// Preserve the original v1.46 task baseline and evidence, and run checks afresh.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {verifyRulesLock} from './verify-rules-lock.mjs';
import * as previous from './remake31to40-v146.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
import {measureRoute} from './remake21to30-quality.mjs';
import {observeMechanismProcess,verifyDecisions} from './review-remake31to40-decisions.mjs';
import {verifyLocalMechanismChoices} from './remake21to30-v139.mjs';
import {verifyGeneratorRouteProjection} from './remake31to40-generator-floor.mjs';
import {verifyFullGeneratorRouteProjection} from './remake31to40-full-generator-floor-v141.mjs';
import {checkCompactFloor} from '../deliverables/remake31-40-v146-20260924/agent31-34/fast-floor.mjs';
import {checkResidualFloor} from '../deliverables/remake31-40-v146-20260924/agent31-34/residual-floor.mjs';
export const VERSION='1.47.0';
export const OUTPUT='deliverables/remake31-40-v146-20260924';
export const {BASELINE,IDS,TARGETS,loadApi,geometry,writeNew,assertBaseline,sourceCatalog}=previous;
export function ruleGate(){const lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\n'));assert.equal(lock.activeVersion,VERSION);return lock;}
export const auditCandidate=(...args)=>previous.auditCandidate(...args);
export function proveFloor(level,api,options={}){
 const mode=options.proofMode;
 if(mode==='compact-mask'||mode==='residual-mask'){
  assert(!level.generators?.length,'Compact mask qualification excludes all generators');
  const qualified={
   'deliverables/remake31-40-v146-20260924/agent31-34/fast-floor.mjs':'18e2300d0d2abbb7e2c3a313b44cfd4e995fdf0042bec79da024174b3e581e3e',
   'deliverables/remake31-40-v146-20260924/agent31-34/residual-floor.mjs':'1caff9717f2f53fd5617f3b84d2f2a74e766f706125175d7bb50f8884c69ae62',
  };
  for(const [p,h]of Object.entries(qualified))assert.equal(digest(fs.readFileSync(p)),h,'Proof implementation changed since independent qualification');
  const budget={floor:TARGETS[level.id].min,maxStates:options.maxStates??15000000,maxMilliseconds:options.maxMilliseconds??1200000};
  return {...(mode==='residual-mask'?checkResidualFloor(level,budget):checkCompactFloor(level,budget)),qualificationInputs:qualified};
 }
 assert(mode===undefined||mode==='full-generator','Unknown proof strategy');
 return previous.proveFloor(level,api,options);
}
export function checkCandidate(data,baseline,api,options={}){
 ruleGate();
 const {level,drags}=data,target=TARGETS[level.id];assert(target);assert(data.seed&&data.design?.primaryMechanism&&data.design?.concreteDecision);
 const audit=auditCandidate(data,baseline,api),replay=api.replayRevisedRoute(level,drags);assert(replay.valid&&replay.complete,JSON.stringify(replay));
 assert(replay.nonClearingDrags>=target.min&&replay.nonClearingDrags<=target.max,`Witness ${replay.nonClearingDrags} outside ${target.min}–${target.max}`);
 const final=JSON.parse(replay.finalStateKey);for(const g of level.gates.filter(g=>g.frozen>0))assert.equal(final.gates.find(x=>x.id===g.id).frozen,0);
 const measurements=measureRoute(level,drags,api);assert(measurements.multiCellDrags>measurements.singleCellDrags,'Do not rely on single-cell repositioning');
 const proof=proveFloor(level,api,{...options,proofMode:options.proofMode??data.floorStrategy});assert(proof.thresholdProven,JSON.stringify(proof));
 let projectionReplay=null;
 if(level.generators?.length){projectionReplay=proof.abstraction.startsWith('opening-visible')?verifyGeneratorRouteProjection(level,drags,api):verifyFullGeneratorRouteProjection(level,drags,api);assert(projectionReplay.valid,projectionReplay.error);}
 const mechanismProcess=observeMechanismProcess(level,drags,api),localMechanismChoices=verifyLocalMechanismChoices(data,api);
 const decisions=options.requireDecisions===false?null:verifyDecisions(data,api);
 if(options.requireDecisions!==false){
  assert.deepEqual(localMechanismChoices.filter(c=>c.kind==='curtain').map(c=>c.id).sort(),(level.shutters??[]).map(s=>s.id).sort(),'Each curtain needs a concrete local effect case');
  for(const g of level.generators??[])assert(mechanismProcess.generatorEvents.some(e=>e.generatorId===g.id)||new api.PuzzleModel(level).snapshot().generators.find(x=>x.id===g.id).remaining===0,'Observe each actual generator through completion');
 }
 const clearLoad=level.blocks.reduce((n,b)=>n+(b.layers?.length??1),0),stars=baseline.levels[level.id-1].starTargets;
 return {id:level.id,ruleVersion:VERSION,baselineRuleVersion:'1.46.0',checkedAt:new Date().toISOString(),levelSha256:digest(level),routeSha256:digest(drags),target,audit,replay,measurements,proof,
  lowerBound:target.min,upperBound:replay.nonClearingDrags,exactNecessaryRepositions:target.min===replay.nonClearingDrags?target.min:null,
  projectionReplay,mechanismProcess,decisions,localMechanismChoices,
  starAssessment:{preservedTargets:stars,clearLoad,guaranteedMinimumDrags:clearLoad+target.min,moveTargetImpossible:clearLoad+target.min>stars.moveTarget,witnessWithinMoveTarget:drags.length<=stars.moveTarget,timeAndStarsCalibrated:false},
  pointerValidated:false,humanBlindTested:false,releaseApproved:false};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  ruleGate();const [mode,...files]=process.argv.slice(2);assert(['audit','check'].includes(mode));
  const {api}=await loadApi(),baseline=JSON.parse(fs.readFileSync(BASELINE));
  for(const file of files){const data=JSON.parse(fs.readFileSync(file));const result=mode==='audit'?auditCandidate(data,baseline,api):checkCandidate(data,baseline,api);
    if(process.env.REPORT)writeNew(process.env.REPORT,result);
    console.log(JSON.stringify({file,id:data.level.id,status:'PASS',ruleVersion:VERSION,lower:result.lowerBound,upper:result.upperBound}));
  }
}
