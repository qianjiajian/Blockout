import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadApi,geometry} from './remake21to30-v120.mjs';
import {verifyRulesLock} from './verify-rules-lock.mjs';
import {digest,measureDesignFacts} from './revised-preview-validation-v160.mjs';
import {auditOpeningCoverage} from './revised-opening-coverage.mjs';
import {auditHiddenCoverage} from './revised-hidden-coverage.mjs';
import {auditGateSpanLimits} from './revised-gate-span-limits.mjs';
import {auditGeneratorQueueColors} from './revised-generator-queue-colors.mjs';
import {checkSymmetryFloor} from './remake21to30-symmetry-floor-v139.mjs';
import {checkUniqueCurtainSumFloor} from './remake21to30-unique-suffix-v139.mjs';
import {projectGeneratorOpening,verifyGeneratorRouteProjection} from './remake31to40-generator-floor.mjs';
import {checkFullGeneratorFloor,verifyFullGeneratorRouteProjection} from './remake31to40-full-generator-floor-v141.mjs';
import {measureRoute} from './remake21to30-quality.mjs';
import {observeMechanismProcess,verifyDecisions} from './review-remake31to40-decisions.mjs';
import {verifyLocalMechanismChoices} from './remake21to30-v139.mjs';
import {isGlobalIsometry} from './layout-originality-v140.mjs';
import {difficultyBand} from './difficulty-bands-v138.mjs';
import {ROOT,CATALOG,loadReviewedSourceCatalog,verifySourceCatalog,auditSourceAlignment} from './remake31to40-source-v141.mjs';
export {loadApi,geometry};
export const VERSION='1.41.0',OUTPUT=ROOT,BASELINE=ROOT+'/baseline.json';
export const IDS=Object.freeze(Array.from({length:10},(_,i)=>31+i));
export const TARGETS=Object.freeze(Object.fromEntries(['easy','normal','normal','hard','easy','easy','normal','hard','easy','normal'].map((difficulty,i)=>[31+i,Object.freeze({difficulty,...difficultyBand(difficulty)})])));
export function ruleGate(){const l=verifyRulesLock();assert(l.ok,l.errors.join('\n'));assert.equal(l.activeVersion,VERSION);return l;}
export const writeNew=(p,v)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n',{flag:'wx'});};
export function assertBaseline(b){
 assert.equal(b.ruleVersion,VERSION);assert.deepEqual(b.scope,IDS);assert.equal(b.levels.length,200);
 assert.deepEqual(b.levels.map(r=>r.level.id),Array.from({length:200},(_,i)=>i+1));
 assert.equal(digest(b.levels.map(r=>r.level)),b.campaignSha256);
 assert.equal(digest(b.levels.filter(r=>!IDS.includes(r.level.id)).map(r=>r.level)),b.other190Sha256);
 for(const r of b.levels){assert.equal(digest(r.level),r.sha256);assert.deepEqual(geometry(r.level),r.geometry);}
}
export function sourceCatalog(){const s=JSON.parse(fs.readFileSync(CATALOG));verifySourceCatalog(s);return s;}
const SOURCE_ONLY=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified']);
export function auditCandidate(data,baseline,api){
 assertBaseline(baseline);const {level}=data,target=TARGETS[level.id];assert(target);
 const old=baseline.levels[level.id-1],sources=sourceCatalog(),sourceAlignment=auditSourceAlignment(level,sources,data.sourceAdaptation);
 const mutable=new Set(['blocks','gates','shutters','generators','difficulty','preservedMoveTarget']);
 for(const key of new Set([...Object.keys(old.level),...Object.keys(level)]))if(!mutable.has(key))assert.deepEqual(level[key],old.level[key],`Preserve ${key}`);
 assert.equal(level.mechanismRules,'revised-2026-09-23-v1.4');assert.equal(level.difficulty,target.difficulty);
 assert.deepEqual(geometry(level),old.geometry);assert.deepEqual(api.levelStarTargets(level),old.starTargets);
 api.validateLevel(level);
 for(const key of ['flipDoors','coloredGrids','elevators','conveyors'])assert(!(level[key]?.length),`Locked ${key}`);
 if(level.id<35)assert(!(level.generators?.length),'Generator locked before 35');
 for(const b of level.blocks){for(const key of ['movementAxis','keyId','lockedBy','lockCount','timedBombSeconds'])assert(b[key]===undefined);assert(!b.star&&!b.rotationBadge);assert(!b.layers||b.layers.length<=2);}
 for(const s of level.shutters??[])assert((s.skin===undefined||s.skin==='shutter')&&s.triggerBlockIds===undefined);
 assert(level.gates.every(g=>!g.star));
 const legacy=api.auditRevisedCandidate(level,undefined),issues=legacy.issues.filter(i=>!(i.category==='source'&&SOURCE_ONLY.has(i.code))&&!(i.category==='construction'&&i.code==='wrong-rule-profile'));
 assert.deepEqual(issues,[],'Current hard rules');
 const snapshot=new api.PuzzleModel(structuredClone(level)).snapshot();
 const coverage=auditOpeningCoverage(snapshot),hidden=auditHiddenCoverage(level),spans=auditGateSpanLimits(level),art=api.auditCandidateBlockArt(level),queueColors=auditGeneratorQueueColors(level);
 for(const r of [coverage,hidden,spans,art,queueColors])assert(r.passed,JSON.stringify(r));
 assert(!isGlobalIsometry(old.level,level),'Do not merely recolour/mirror/rotate previous formal data');
 for(const k of ['layoutIntent','alignment','changes','constraints'])assert(typeof data.originality?.[k]==='string'&&data.originality[k].trim().length>=8,`Missing originality assessment ${k}`);
 return {passed:true,sourceAlignment,coverage,hidden,spans,art,queueColors,facts:measureDesignFacts(level,api),geometryPreserved:true,starsPreserved:true,
  originality:data.originality,originalityBoundary:'Geometric non-isometry plus author review; no numerical similarity or user approval claim.'};
}
export function proveFloor(level,api,options={}){
 const budget={floor:TARGETS[level.id].min,maxStates:options.maxStates??2000000,maxMilliseconds:options.maxMilliseconds??180000};
 if(level.generators?.length){
  if(options.proofMode!=='full-generator'){
   const projection=projectGeneratorOpening(level,api),proof=checkSymmetryFloor(projection.level,budget);
   if(proof.thresholdProven)return {...proof,abstraction:'opening-visible-no-future-no-countdowns-v1+symmetry',underlyingAbstraction:proof.abstraction,sourceLevelSha256:digest(level),projectedLevelSha256:projection.projectedLevelSha256,projection};
  }
  return checkFullGeneratorFloor(level,api,budget);
 }
 let proof=checkUniqueCurtainSumFloor(level,budget);if(proof.status==='unsupported')proof=checkSymmetryFloor(level,budget);return proof;
}
export function checkCandidate(data,baseline,api,options={}){
 const {level,drags}=data,target=TARGETS[level.id];assert(target);assert(data.seed&&data.design?.primaryMechanism&&data.design?.concreteDecision);
 const audit=auditCandidate(data,baseline,api),replay=api.replayRevisedRoute(level,drags);assert(replay.valid&&replay.complete,JSON.stringify(replay));
 assert(replay.nonClearingDrags>=target.min&&replay.nonClearingDrags<=target.max,`Witness ${replay.nonClearingDrags} outside ${target.min}–${target.max}`);
 const final=JSON.parse(replay.finalStateKey);for(const g of level.gates.filter(g=>g.frozen>0))assert.equal(final.gates.find(x=>x.id===g.id).frozen,0);
 const measurements=measureRoute(level,drags,api);assert(measurements.multiCellDrags>measurements.singleCellDrags,'Do not rely on single-cell repositioning');
 const proof=proveFloor(level,api,options);assert(proof.thresholdProven,JSON.stringify(proof));
 let projectionReplay=null;
 if(level.generators?.length){projectionReplay=proof.abstraction.startsWith('opening-visible')?verifyGeneratorRouteProjection(level,drags,api):verifyFullGeneratorRouteProjection(level,drags,api);assert(projectionReplay.valid,projectionReplay.error);}
 const mechanismProcess=observeMechanismProcess(level,drags,api),localMechanismChoices=verifyLocalMechanismChoices(data,api);
 const decisions=options.requireDecisions===false?null:verifyDecisions(data,api);
 if(options.requireDecisions!==false){
  assert.deepEqual(localMechanismChoices.filter(c=>c.kind==='curtain').map(c=>c.id).sort(),(level.shutters??[]).map(s=>s.id).sort(),'Each curtain needs a concrete local effect case');
  for(const g of level.generators??[])assert(mechanismProcess.generatorEvents.some(e=>e.generatorId===g.id)||new api.PuzzleModel(level).snapshot().generators.find(x=>x.id===g.id).remaining===0,'Observe each actual generator through completion');
 }
 const clearLoad=level.blocks.reduce((n,b)=>n+(b.layers?.length??1),0),stars=baseline.levels[level.id-1].starTargets;
 return {id:level.id,ruleVersion:VERSION,checkedAt:new Date().toISOString(),levelSha256:digest(level),routeSha256:digest(drags),target,audit,replay,measurements,proof,
  lowerBound:target.min,upperBound:replay.nonClearingDrags,exactNecessaryRepositions:target.min===replay.nonClearingDrags?target.min:null,
  projectionReplay,mechanismProcess,decisions,localMechanismChoices,
  starAssessment:{preservedTargets:stars,clearLoad,guaranteedMinimumDrags:clearLoad+target.min,moveTargetImpossible:clearLoad+target.min>stars.moveTarget,witnessWithinMoveTarget:drags.length<=stars.moveTarget,timeAndStarsCalibrated:false},
  pointerValidated:false,humanBlindTested:false,releaseApproved:false};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 const [mode,...files]=process.argv.slice(2);ruleGate();
 if(mode==='catalog'){const s=loadReviewedSourceCatalog();writeNew(CATALOG,s);console.log(JSON.stringify({path:CATALOG,sourceHash:s.sourceHash}));}
 else if(mode==='audit'||mode==='check'){
  const {api}=await loadApi(),b=JSON.parse(fs.readFileSync(BASELINE));
  for(const file of files){const d=JSON.parse(fs.readFileSync(file)),r=mode==='audit'?auditCandidate(d,b,api):checkCandidate(d,b,api);if(process.env.REPORT)writeNew(process.env.REPORT,r);console.log(JSON.stringify({file,id:d.level.id,status:'PASS',lower:r.lowerBound,upper:r.upperBound}));}
 }else throw Error('Usage: catalog | audit FILES | check FILES');
}
