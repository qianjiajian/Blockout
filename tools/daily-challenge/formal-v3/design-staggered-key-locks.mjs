import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {designFingerprints} from './bounded-proof.mjs';
import {intensityTargets,auditMechanismParticipation,mechanismInventory,INTENSITY_VERSION} from './mechanism-intensity.mjs';
import {assertPlainProofDomain} from '../formal-v2/proof-plain.mjs';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {applyNativeDrag,replayDecorated} from '../formal-v2/mechanism-decorate.mjs';

export const STAGGERED_KEY_DESIGN_VERSION='known-route-staggered-shared-keys-v1';
const readOptional=async file=>fs.readFile(file,'utf8').then(JSON.parse).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
/** Read-only protection: no new strategy may reopen a failed physical input. */
export async function assertKeyDesignInputUnblocked(level,ledgerDirectory){
 const f=designFingerprints(level),identity=levelSha256({shapeSha256:f.shapeSha256,colorSha256:f.colorSha256});
 const origin=await readOptional(path.join(ledgerDirectory,'identities',`${identity}.json`));
 const ids=[...new Set([f.designSha256,origin?.origin].filter(Boolean))];
 if(await readOptional(path.join(ledgerDirectory,'identities',`${identity}.blocked.json`)))throw Error('FAILED_PHYSICAL_INPUT: key design cannot retry this identity');
 for(const id of ids){
  if(await readOptional(path.join(ledgerDirectory,`${id}.blocked.json`)))throw Error('FAILED_PHYSICAL_INPUT: historical attempt blocked');
  const result=await readOptional(path.join(ledgerDirectory,`${id}.result.json`));
  if(result&&result.accepted!==true)throw Error('FAILED_PHYSICAL_INPUT: prior result was not accepted');
  if(!result&&await readOptional(path.join(ledgerDirectory,`${id}.request.json`)))throw Error('PENDING_PHYSICAL_INPUT: prior attempt has not finished');
 }
 return{designSha256:f.designSha256,retryIdentitySha256:identity,ledgerDirectory,readOnly:true};
}

/** Deterministic mechanism planning on one supplied complete plain witness.
 * No board search, held-path search, solver fallback, ledger claim or L claim.
 * The returned accepted:false packet needs the normal fresh final qualifier.
 */
export async function designStaggeredKeyLocks(runtime,inputLevel,drags,{difficulty=3,idPrefix='staggered-key-design',
 ledgerDirectory='deliverables/daily-formal-v3-20261008/proof/attempts',priorLevel=null}={}){
 assertPlainProofDomain(inputLevel);runtime.validateLevel(inputLevel);
 const identity=await assertKeyDesignInputUnblocked(inputLevel,ledgerDirectory);
 const sourceLevelSha256=levelSha256(inputLevel),sourceRouteSha256=routeSha256(drags),targets=intensityTargets('key-lock',difficulty);
 const original=runtime.replayRevisedRoute(inputLevel,drags),originalIndependent=independentReplay(runtime,inputLevel,drags);
 assert(original.valid&&original.complete&&originalIndependent.valid&&originalIndependent.complete&&!originalIndependent.failed,'Complete original witness required');
 assert.equal(original.nonClearingDrags,originalIndependent.nonClearingDrags);
 const model=new runtime.PuzzleModel(structuredClone(inputLevel));model.startCountdown();
 const timings=new Map(inputLevel.blocks.map(b=>[b.id,{id:b.id,firstAction:null,exitDrag:null}]));
 for(const[i,drag]of drags.entries()){
  const row=timings.get(drag.blockId);assert(row);if(row.firstAction===null)row.firstAction=i+1;
  applyNativeDrag(model,drag);if(drag.exitSide)row.exitDrag=i+1;
 }
 const keys=[...timings.values()].toSorted((a,b)=>a.exitDrag-b.exitDrag).slice(0,targets.minimumCounter+targets.instances-1),keyIds=new Set(keys.map(k=>k.id));
 const eligible=[...timings.values()].filter(b=>!keyIds.has(b.id)).map(b=>({...b,availableKeyEvents:keys.filter(k=>k.exitDrag<b.firstAction).length}))
  .filter(b=>b.availableKeyEvents>=targets.minimumCounter);
 const common={version:STAGGERED_KEY_DESIGN_VERSION,intensityVersion:INTENSITY_VERSION,targets,identity,
  inputLevelSha256:sourceLevelSha256,inputRouteSha256:sourceRouteSha256,L:null,accepted:false,formalReady:false,
  searchAccounting:{fullBoardSearchInvocations:0,heldReachabilitySearchInvocations:0,ledgerWrites:0,knownRouteReplay:true},
  keys,eligibleLocks:eligible};
 if(eligible.length<targets.instances)return{...common,ok:false,reason:'insufficient-locks-before-first-action'};
 const locks=eligible.slice(0,targets.instances).map(b=>({...b,count:b.availableKeyEvents}));
 // Saturating every lock at the same maximum creates a false stagger failure.
 // Lower exactly one to another still-increased legal threshold; leave all
 // original geometry, route, key events and other selected counts unchanged.
 if(new Set(locks.map(b=>b.count)).size===1){
  const change=locks.find(b=>b.count>targets.minimumCounter);
  if(!change)return{...common,ok:false,reason:'no-two-legal-release-events-with-current-minimum'};
  change.count--;
 }
 const level=structuredClone(inputLevel),usedKeys=keys.slice(0,Math.max(...locks.map(b=>b.count))),keyGroup=`${idPrefix}-shared-key`;
 for(const key of usedKeys)level.blocks.find(b=>b.id===key.id).keyId=keyGroup;
 for(const lock of locks)Object.assign(level.blocks.find(b=>b.id===lock.id),{lockedBy:keyGroup,lockCount:lock.count});
 runtime.validateLevel(level);
 const canonical=replayDecorated(runtime,level,drags),independent=independentReplay(runtime,level,drags);
 for(const replay of [canonical,independent])assert(replay.valid&&replay.complete&&!replay.failed&&replay.nonClearingDrags===original.nonClearingDrags,'Key design changed or broke the complete original route');
 const participation=auditMechanismParticipation(level,drags,canonical,'key-lock',targets);
 assert(participation.pass&&participation.distinctReleaseEvents>=2,'Actual distinct unlock events required');
 let priorComparison=null;
 if(priorLevel){const prior=mechanismInventory(priorLevel)['key-lock'],current=mechanismInventory(level)['key-lock'];
  assert(current.length>prior.length,'Must increase actual lock instances over the exact prior slot');
  const oldMaximum=Math.max(0,...prior.map(x=>x.value));assert(current.every(x=>x.value>oldMaximum),'Every selected counter must exceed the old slot maximum');
  priorComparison={priorLevelSha256:levelSha256(priorLevel),priorInstances:prior,currentInstances:current,instanceIncrease:current.length-prior.length,priorMaximumCounter:oldMaximum};
 }
 assert.equal(levelSha256(inputLevel),sourceLevelSha256);assert.equal(routeSha256(drags),sourceRouteSha256);
 const toolPath='tools/daily-challenge/formal-v3/design-staggered-key-locks.mjs',toolSha256=createHash('sha256').update(await fs.readFile(toolPath)).digest('hex');
 return{...common,ok:true,status:'MECHANISM_DESIGN_READY_PENDING_FRESH_BOUND_PROOF',mechanismFirst:true,
  sourceLevelId:inputLevel.id,difficulty,stageKey:'mechanisms-key-lock-59',
  level,drags:structuredClone(drags),levelSha256:levelSha256(level),routeSha256:sourceRouteSha256,U:canonical.nonClearingDrags,
  plannedLocks:locks,participation,canonicalReplay:canonical,independentReplay:independent,priorComparison,
  designer:{path:toolPath,sha256:toolSha256},mathematicalDifficultyNotClaimed:true};
}

/** Optional bridge. The existing qualifier's accepted flag means it accepts
 * a preflight design as input; this private copy is never persisted/returned.
 * Only the qualifier's fresh bounded result is returned to the caller. */
export async function qualifyStaggeredKeyDesign(runtime,design,slot,{selected=[],priorLevel,baseInputFile,proofOptions={}}={}){
 assert(design.ok===true&&design.accepted===false&&design.L===null&&design.mathematicalDifficultyNotClaimed===true,'Pending mechanism-only design required');
 assert.equal(levelSha256(design.level),design.levelSha256);assert.equal(routeSha256(design.drags),design.routeSha256);
 assert.equal(slot.newestMechanism,'key-lock');assert.equal(slot.stageKey,design.stageKey);assert.equal(slot.difficulty,design.difficulty);
 assert(priorLevel,'Exact old slot required');
 assert(typeof baseInputFile==='string','Accepted original base file required for the existing catalog source contract');
 const baseBytes=await fs.readFile(baseInputFile),base=JSON.parse(baseBytes);
 assert(base.accepted===true&&base.levelSha256===design.inputLevelSha256&&levelSha256(base.level)===design.inputLevelSha256&&routeSha256(base.drags)===design.inputRouteSha256,'Original accepted base binding changed');
 const prior=mechanismInventory(priorLevel)['key-lock'],current=mechanismInventory(design.level)['key-lock'];
 assert(current.length>prior.length&&current.every(x=>x.value>Math.max(0,...prior.map(x=>x.value))),'Actual instances and counters must increase over the old slot');
 await assertKeyDesignInputUnblocked(design.level,proofOptions.ledgerDirectory??'deliverables/daily-formal-v3-20261008/proof/attempts');
 const {qualifyV3DesignedSlot}=await import('./catalog-contract.mjs');
 const result=await qualifyV3DesignedSlot(runtime,{...design,accepted:true,qualificationInputOnly:true},slot,{selected,priorLevel,proofOptions});
 return{...result,baseInputFile,baseInputFileSha256:createHash('sha256').update(baseBytes).digest('hex'),
  baseLevelSha256:design.inputLevelSha256,baseRouteSha256:design.inputRouteSha256,
  keyDesignProvenance:{version:design.version,designer:design.designer,designedLevelSha256:design.levelSha256,plannedLocks:design.plannedLocks,
   originalBaseLevelSha256:design.inputLevelSha256,mechanismPlanningSearchInvocations:0}};
}
