// v1.37 remake authoring/acceptance. Historical checkers and evidence remain unchanged.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadApi,geometry,IDS} from './remake21to30-v120.mjs';
import {verifyRulesLock} from './verify-rules-lock.mjs';
import {digest,measureDesignFacts} from './revised-preview-validation-v160.mjs';
import {auditOpeningCoverage} from './revised-opening-coverage.mjs';
import {auditHiddenCoverage} from './revised-hidden-coverage.mjs';
import {auditGateSpanLimits} from './revised-gate-span-limits.mjs';
import {checkFastFloor} from './remake21to30-mask-floor.mjs';
import {measureRoute} from './remake21to30-quality.mjs';
import {observeMechanismProcess,verifyDecisions} from './review-remake21to30-decisions.mjs';
import {difficultyBand} from './difficulty-bands-v132.mjs';
import {auditGeneratorQueueColors} from './revised-generator-queue-colors.mjs';
import {auditSourceKinds} from './remake21to30-source-kinds-v137.mjs';
import {counterReference} from './remake21to30-counter-reference.mjs';
export {loadApi,geometry,IDS};
export const VERSION='1.37.0';
const BASELINE_VERSION=VERSION; // Immutable start-of-this-task data, not a certificate.
export const OUTPUT='deliverables/remake21-30-v137-20260924';
export const BASELINE=OUTPUT+'/baseline.json';
export const NORMAL_PRACTICE_IDS=Object.freeze([22,23]);
// Only explicit new-mechanism practice choices remain; source kinds lead.
export function auditInstanceProgression(level){
  if(level.id===30)assert.equal(level.shutters?.length??0,3,'This super-level design uses three curtains within 2–4');
  return {kind:'source-first-with-new-mechanism-practice',curtains:level.shutters?.length??0,globalDifficultyProven:false};
}
export const TARGETS=Object.freeze(Object.fromEntries(['easy','normal','normal','hard','easy','normal','hard','easy','normal','super'].map((difficulty,i)=>[21+i,Object.freeze({difficulty,...difficultyBand(difficulty)})])));
export function ruleGate(){const lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\n'));assert.equal(lock.activeVersion,VERSION);return lock;}
export const writeNew=(p,value)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(value,null,2)+'\n',{flag:'wx'});};
export function assertBaseline(b){
  assert.equal(b.ruleVersion,BASELINE_VERSION);assert.deepEqual(b.scope,IDS);assert.equal(b.levels.length,200);
  assert.deepEqual(b.levels.map(r=>r.level.id),Array.from({length:200},(_,i)=>i+1));
  assert.equal(digest(b.levels.map(r=>r.level)),b.campaignSha256);
  assert.equal(digest(b.levels.filter(r=>!IDS.includes(r.level.id)).map(r=>r.level)),b.other190Sha256);
  for(const r of b.levels){assert.equal(digest(r.level),r.sha256);assert.deepEqual(geometry(r.level),r.geometry);}
}
export async function capture(){
  const lock=ruleGate(),{api,inputs}=await loadApi();
  assert.equal(lock.activeVersion,BASELINE_VERSION,'Capture only under current batch rules');
  const levels=structuredClone(api.LEVELS).map(level=>({level,sha256:digest(level),geometry:geometry(level),starTargets:api.levelStarTargets(level)}));
  const baseline={schemaVersion:1,ruleVersion:BASELINE_VERSION,createdAt:new Date().toISOString(),scope:IDS,levels,lock,
    campaignSha256:digest(levels.map(r=>r.level)),other190Sha256:digest(levels.filter(r=>!IDS.includes(r.level.id)).map(r=>r.level)),
    inputs:Object.fromEntries(inputs.map(p=>[p,digest(fs.readFileSync(p))]))};
  assertBaseline(baseline);writeNew(BASELINE,baseline);return {path:BASELINE,campaignSha256:baseline.campaignSha256};
}
const OLD_SOURCE_ONLY=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified']);
export function auditTeachingWindow(level,old){
  if(!NORMAL_PRACTICE_IDS.includes(level.id))return null;
  assert.equal(level.difficulty,'normal','The revised practice window is normal, not easy');
  const clearLoad=value=>value.blocks.reduce((n,b)=>n+(b.layers?.length??1),0);
  // Concrete batch review, not a universal quota for future learning levels.
  assert((level.shutters?.length??0)>1,'This curtain-learning batch requires multiple real curtains');
  assert(level.blocks.length<old.blocks.length,'Reduce whole-level bodies, not just visible opening bodies');
  assert(clearLoad(level)<=clearLoad(old),'Do not hide extra clearing work in shells');
  return {kind:'first-two-normal-curtain-practice',shutters:level.shutters.length,oldBodies:old.blocks.length,
    bodies:level.blocks.length,oldClearLoad:clearLoad(old),clearLoad:clearLoad(level),humanBlindTested:false};
}
export function verifyLocalMechanismChoices(data,api){
  const {level,drags}=data,rows=[];
  for(const c of data.curtainLocalChoices??[]){
    const curtain=level.shutters.find(s=>s.id===c.curtainId);
    assert(curtain&&curtain.count===c.originalCount);
    assert(Number.isSafeInteger(c.relaxedCount)&&c.relaxedCount>=1&&c.relaxedCount<curtain.count);
    assert(Array.isArray(c.prefix)&&c.prefix.length===c.beforeDrag-1);
    const start=api.replayRevisedRoute(level,c.prefix);assert(start.valid&&!start.complete);
    const snapshot=JSON.parse(start.finalStateKey);
    assert.equal(start.clearEvents,c.cleared);
    assert.equal(snapshot.shutters.find(s=>s.id===c.curtainId).count,c.formalRemaining);
    const changed=structuredClone(level);changed.shutters.find(s=>s.id===c.curtainId).count=c.relaxedCount;
    assert(!api.replayRevisedRoute(level,[...c.prefix,c.blockedAction]).valid);
    assert(api.replayRevisedRoute(changed,[...c.prefix,c.blockedAction]).valid);
    if(c.relaxedCompleteRoute){
      const r=api.replayRevisedRoute(changed,c.relaxedCompleteRoute);assert(r.valid&&r.complete);
    }
    rows.push({kind:'curtain',id:c.curtainId,beforeDrag:c.beforeDrag,localConstraintVerified:true,globalOptimalDifferenceProven:false});
  }
  for(const c of data.earlyIceChoices??[]){
    assert(Number.isSafeInteger(c.beforeDrag)&&c.beforeDrag>=1&&c.beforeDrag<=drags.length);
    const prefix=drags.slice(0,c.beforeDrag-1),start=api.replayRevisedRoute(level,prefix);assert(start.valid&&!start.complete);
    const body=JSON.parse(start.finalStateKey).blocks.find(b=>b.id===c.blockId);
    assert(body&&body.frozen>0);assert.equal(body.frozen,c.remainingIce);assert.equal(start.clearEvents,c.cleared);
    assert.equal(c.relaxedMove.blockId,c.blockId);
    const changed=structuredClone(level);delete changed.blocks.find(b=>b.id===c.blockId).frozen;
    assert(!api.replayRevisedRoute(level,[...prefix,c.relaxedMove]).valid);
    assert(api.replayRevisedRoute(changed,[...prefix,c.relaxedMove]).valid);
    rows.push({kind:'numeric-ice',id:c.blockId,beforeDrag:c.beforeDrag,localConstraintVerified:true,globalOptimalDifferenceProven:false});
  }
  return rows;
}
export function auditCandidate(level,baseline,api){
  assertBaseline(baseline);const target=TARGETS[level.id];assert(target,'Only 21–30 authorized');
  const instanceProgression=auditInstanceProgression(level),sourceKinds=auditSourceKinds(level);
  const old=baseline.levels[level.id-1];assert.equal(level.mechanismRules,'revised-2026-09-23-v1.4');
  const mutable=new Set(['blocks','gates','shutters','difficulty','preservedMoveTarget']);
  for(const k of new Set([...Object.keys(old.level),...Object.keys(level)])){
    if(!mutable.has(k))assert.deepEqual(level[k],old.level[k],`Unauthorized peripheral field change: ${k}`);
  }
  assert.deepEqual(geometry(level),old.geometry,'Physical board must remain unchanged');
  for(const k of ['name','timeSeconds','reward'])assert.deepEqual(level[k],old.level[k],`Preserve ${k}`);
  assert.equal(level.difficulty,target.difficulty);assert.deepEqual(api.levelStarTargets(level),old.starTargets);
  api.validateLevel(level);
  for(const k of ['generators','flipDoors','coloredGrids','elevators','conveyors'])assert(!(level[k]?.length),`Locked/legacy ${k}`);
  for(const b of level.blocks){
    for(const k of ['movementAxis','keyId','lockedBy','lockCount','timedBombSeconds'])assert(b[k]===undefined,`Locked ${k}`);
    assert(!b.star&&!b.rotationBadge);assert(b.layers===undefined||(b.layers.length>=1&&b.layers.length<=2));
  }
  for(const s of level.shutters??[])assert((s.skin===undefined||s.skin==='shutter')&&s.triggerBlockIds===undefined);
  assert(level.gates.every(g=>!g.star));
  for(const gate of level.gates.filter(g=>g.frozen>0)){
    assert(level.blocks.some(b=>(b.layers??[b.color]).includes(gate.color)),
      'An ice gate with no matching body or shell is not an effective mechanism');
  }
  const legacy=api.auditRevisedCandidate(level,undefined);
  const issues=legacy.issues.filter(i=>!(i.category==='source'&&OLD_SOURCE_ONLY.has(i.code))&&!(i.category==='construction'&&i.code==='wrong-rule-profile'));
  assert.deepEqual(issues,[],'Current hard-rule violations');
  const snapshot=new api.PuzzleModel(structuredClone(level)).snapshot();
  const coverage=auditOpeningCoverage(snapshot),hidden=auditHiddenCoverage(level),spans=auditGateSpanLimits(level),art=api.auditCandidateBlockArt(level);
  for(const result of [coverage,hidden,spans,art])assert(result.passed,JSON.stringify(result));
  assert(snapshot.shutters.some(s=>!s.revealed)||snapshot.blocks.some(b=>!b.shutterId&&(b.layers.length>1||b.frozen>0)),
    'A visible on-board advanced mechanic must contribute to this remake');
  assert.notEqual(digest({blocks:level.blocks,gates:level.gates,shutters:level.shutters}),digest({blocks:old.level.blocks,gates:old.level.gates,shutters:old.level.shutters}),'Do not only relabel the old map');
  const queueColors=auditGeneratorQueueColors(level);assert(queueColors.passed);
  const facts=measureDesignFacts(level,api);
  const teaching=auditTeachingWindow(level,old.level);
  return {passed:true,coverage,hidden,spans,art,queueColors,teaching,instanceProgression,sourceKinds,geometryPreserved:true,starsPreserved:true,facts,sourceAlignment:'authorized-original-design'};
}
export function checkCandidate(data,baseline,api,options={}){
  const {level,drags}=data,target=TARGETS[level.id];
  assert(typeof data.seed==='string'&&data.seed.length);assert(data.design?.primaryMechanism&&data.design?.concreteDecision);
  assert(drags?.length);const audit=auditCandidate(level,baseline,api),replay=api.replayRevisedRoute(level,drags);
  assert(replay.valid&&replay.complete,JSON.stringify(replay));
  const finalState=JSON.parse(replay.finalStateKey);
  for(const gate of level.gates.filter(g=>g.frozen>0))assert.equal(finalState.gates.find(g=>g.id===gate.id)?.frozen,0,`Lv${level.id} frozen gate ${gate.id} must actually thaw`);
  assert(replay.nonClearingDrags<=target.max,`Lv${level.id} upper ${replay.nonClearingDrags} exceeds ${target.max}`);
  assert(replay.nonClearingDrags>=target.min,'Witness below the target lower bound');
  const measurements=measureRoute(level,drags,api);
  assert(measurements.multiCellDrags>measurements.singleCellDrags,'Reject single-cell dominated route');
  // Do not trust supplied certificate flags. Exhaust the qualified relaxation afresh.
  const proof=checkFastFloor(level,{floor:target.min,maxStates:options.maxStates??1000000,maxMilliseconds:options.maxMilliseconds??60000});
  assert(proof.thresholdProven,`Lv${level.id}: ${JSON.stringify(proof)}`);
  const mechanismProcess=observeMechanismProcess(level,drags,api);
  const counters=counterReference(level,baseline.levels[level.id-1].level,data.design.counterRationale);
  const decisions=options.requireDecisions===false?null:verifyDecisions(data,api);
  const localMechanismChoices=verifyLocalMechanismChoices(data,api);
  if(options.requireDecisions!==false){
    const observed=localMechanismChoices.filter(c=>c.kind==='curtain').map(c=>c.id).sort();
    assert.deepEqual(observed,(level.shutters??[]).map(s=>s.id).sort(),
      'Every actual curtain in this batch needs its own independently replayed local-effect case');
  }
  const clearLoad=level.blocks.reduce((n,b)=>n+(b.layers?.length??1),0),stars=baseline.levels[level.id-1].starTargets;
  return {id:level.id,ruleVersion:VERSION,levelSha256:digest(level),routeSha256:digest(drags),target,audit,replay,measurements,
    proof:{...proof,levelSha256:digest(level),lowerBound:target.min},lowerBound:target.min,upperBound:replay.nonClearingDrags,
    exactNecessaryRepositions:target.min===replay.nonClearingDrags?target.min:null,mechanismProcess,counters,decisions,localMechanismChoices,
    starAssessment:{preservedTargets:stars,clearLoad,guaranteedMinimumDrags:clearLoad+target.min,moveTargetImpossible:clearLoad+target.min>stars.moveTarget,witnessWithinMoveTarget:drags.length<=stars.moveTarget,timeAndStarsCalibrated:false},
    pointerValidated:false,humanBlindTested:false,releaseApproved:false};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  const [mode,...files]=process.argv.slice(2);ruleGate();
  if(mode==='capture')console.log(JSON.stringify(await capture()));
  else if(mode==='check'){
    const {api}=await loadApi(),baseline=JSON.parse(fs.readFileSync(BASELINE));
    for(const file of files){const result=checkCandidate(JSON.parse(fs.readFileSync(file)),baseline,api);console.log(JSON.stringify({file,id:result.id,lower:result.lowerBound,upper:result.upperBound,states:result.proof.exploredStates}));}
  }else throw Error('Usage: capture | check FILES');
}
