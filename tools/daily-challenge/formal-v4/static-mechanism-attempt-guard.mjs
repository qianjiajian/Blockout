import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {createAttemptLedger,designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {replayDecorated} from '../formal-v2/mechanism-decorate.mjs';
import {createCapacityConstructionBudget} from '../formal-v3/capacity-primary-adapter.mjs';
import {assertLowBandBatchPrivateNamespace} from './low-band-advanced-batch-contract.mjs';
import {assertV4Runtime} from './runtime.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';
import {CONSTRUCTION_LEDGER,inspectHistoricalAttempt,inspectConstructionAccounting} from './capacity-construction-ledger.mjs';
export {CONSTRUCTION_LEDGER};
export const STATIC_MECHANISM_TASK_VERSION='fixed-star-same-shared-identity-once-v1';
const own='tools/daily-challenge/formal-v4/static-mechanism-attempt-guard.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const identity=level=>{const f=designFingerprints(level);return{...f,retryIdentitySha256:levelSha256({shapeSha256:f.shapeSha256,colorSha256:f.colorSha256})};};
const exists=async file=>fs.stat(file).then(()=>true).catch(e=>{if(e.code==='ENOENT')return false;throw e;});

export function staticStarReplayReservations(drags){
 assert(Array.isArray(drags));let n=1;
 for(const d of drags){assert(d&&typeof d.blockId==='string'&&Array.isArray(d.path));assert(d.path.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isSafeInteger)));if(d.exitSide!==undefined)assert(['top','right','bottom','left'].includes(d.exitSide));n+=d.path.length+2*Number(!!d.exitSide)+2;assert(Number.isSafeInteger(n));}
 return 2*n;
}
export function assertStaticStarDelta(base,level,drags){
 assert(!base.blocks.some(b=>b.star)&&!(base.gates??[]).some(g=>g.star),'Accepted base must have no prior star instance');
 const stars=level.blocks.filter(b=>b.star),gates=(level.gates??[]).filter(g=>g.star);
 assert.equal(stars.length,2,'Exactly two star bodies required');assert.equal(gates.length,2,'Exactly two star gates required');
 assert(stars.every(b=>b.star===true)&&gates.every(g=>g.star===true));assert.equal(new Set(stars.map(b=>b.color)).size,2);
 assert.equal(new Set((level.gates??[]).map(g=>g.color)).size,(level.gates??[]).length,'Unique colour gate fixes the actual gate identity');
 for(const b of stars){assert.equal(gates.filter(g=>g.color===b.color).length,1);assert(drags.some(d=>d.blockId===b.id&&d.path.length>0),'Both stars must really move');assert(drags.some(d=>d.blockId===b.id&&d.exitSide),'Both stars must actually exit');}
 // Compare components without creating another complete world for normalization.
 assert.deepEqual(Object.keys(level).sort(),Object.keys(base).sort());
 for(const key of Object.keys(base)){
  if(key!=='blocks'&&key!=='gates'){assert.deepEqual(level[key],base[key]);continue;}
  assert.equal(level[key].length,base[key].length);
  for(let i=0;i<base[key].length;i++){const value=level[key][i];if(value.star){const {star,...rest}=value;assert.deepEqual(rest,base[key][i],'Only star flags may change');}else assert.deepEqual(value,base[key][i]);}
 }
}

// Isolated entry, SAME public and stage-independent construction namespaces.
// Narrow isolated extension: star D1 only; original four-stage/key-flip guards stay byte-identical.
// Callback and both validation replays use ONE pre-reservation meter. Accepted is U-only.
export async function withStaticMechanismConstructionAttempt(runtime,base,slot,construct,{ledgerDirectory=CONSTRUCTION_LEDGER,
 publicLedgerDirectory=PUBLIC_ATTEMPT_LEDGER,redesignOf,qualificationOnly=false,worldBudget={maxStates:10000}}={}){
 assertV4Runtime(runtime);
 await assertLowBandBatchPrivateNamespace(qualificationOnly,ledgerDirectory,publicLedgerDirectory);
 if(!qualificationOnly&&(path.resolve(ledgerDirectory)!==path.resolve(CONSTRUCTION_LEDGER)||path.resolve(publicLedgerDirectory)!==path.resolve(PUBLIC_ATTEMPT_LEDGER)))
  throw Error('Production requires shared historical and construction ledgers');
 if(slot?.newestMechanism!=='star'||slot.difficulty!==1)throw Error('Only the reviewed star D1 construction');
 if(!qualificationOnly&&!runtime.slots?.some(s=>levelSha256(s)===levelSha256(slot)))throw Error('Exact real star D1 slot required');
 if(redesignOf!==undefined)throw Error('Accepted base adaptation cannot impersonate a failed source redesign');
 const constructionBudget=createCapacityConstructionBudget(worldBudget);
 if(!base.accepted||!base.level||!Array.isArray(base.drags)||base.levelSha256!==levelSha256(base.level))throw Error('Intact accepted input base required');
 if(typeof construct!=='function')throw Error('Construction callback required');
 const historical=await inspectHistoricalAttempt(base.level,publicLedgerDirectory);
 if(historical.blocked)return{ok:false,status:'STATIC_MECHANISM_HISTORICAL_INPUT_BLOCKED',terminalBlocked:true,constructionAttemptStarted:false,historical};
 const fingerprints=identity(base.level),directory=path.resolve(ledgerDirectory);
 await fs.mkdir(path.join(directory,'plans'),{recursive:true});await fs.mkdir(path.join(directory,'aliases'),{recursive:true});
 if(await exists(path.join(directory,'aliases',`${fingerprints.retryIdentitySha256}.json`)))return{
  ok:false,status:'STATIC_MECHANISM_FINAL_OBJECT_ALREADY_CONSTRUCTED',terminalBlocked:true,constructionAttemptStarted:false};
 const bindings={};for(const file of [own,'tools/daily-challenge/formal-v4/low-band-advanced-batch-contract.mjs','tools/daily-challenge/formal-v4/capacity-construction-ledger.mjs','tools/daily-challenge/formal-v3/capacity-primary-adapter.mjs'])bindings[file]=sha(await fs.readFile(file));
 const inputSha=base.levelSha256,inputRouteSha=routeSha256(base.drags),plan={version:STATIC_MECHANISM_TASK_VERSION,inputLevelSha256:inputSha,
  inputRouteSha256:inputRouteSha,fingerprints,slot:structuredClone(slot),hardWholeBoardLimit:10000,worldBudget:{maxStates:constructionBudget.maxStates},
  taskBoundary:'one-fixed-star-configuration-before-first-final-object-proof',
  allFailuresTerminal:true,noStageOrMethodRetry:true,mathematicalLowerSearchInvocations:0,
  policyRuleVersion:runtime.policyRuleVersion,policyRuleSha256:runtime.policyRuleSha256,bindings,qualificationOnly};
 const planFile=path.join(directory,'plans',`${randomUUID()}.json`);await fs.writeFile(planFile,JSON.stringify(plan,null,2)+'\n',{flag:'wx'});
 const ledger=await createAttemptLedger(directory);let request;
 try{request=await ledger.claim(base.level,{redesignOf});}catch(error){return{ok:false,status:'STATIC_MECHANISM_INPUT_ALREADY_ATTEMPTED',
  terminalBlocked:true,constructionAttemptStarted:false,reason:error.message,planFile,planSha256:levelSha256(plan)};}
 const report={ok:false,version:STATIC_MECHANISM_TASK_VERSION,status:'STATIC_MECHANISM_CONSTRUCTION_PENDING',constructionAttempt:request,
  constructionAttemptStarted:true,terminalBlocked:false,accepted:false,mathematicalAcceptance:false,
  mathematicalLowerSearchInvocations:0,formalReady:false,qualificationOnly,planFile,planSha256:levelSha256(plan),inputLevelSha256:inputSha,inputRouteSha256:inputRouteSha};
 let adapted;
 try{
  // Recheck immediately before dynamic work, after owning the stage-free lock.
  const current=await inspectHistoricalAttempt(base.level,publicLedgerDirectory);if(current.blocked)throw Error('Public attempt became blocked or pending before construction');
  constructionBudget.reserve(1,'accepted-input-callback-clone');
  adapted=await construct({...base,level:structuredClone(base.level),drags:structuredClone(base.drags)},constructionBudget);report.adaptation=adapted;
  const accounting=adapted?.constructionAccounting??adapted?.provenance?.constructionAccounting;
  report.constructionAccounting=constructionBudget.report();
  if(accounting!==undefined)assert.deepEqual(accounting,constructionBudget.report(),'Callback accounting must be the same shared meter');
  if(!adapted?.ok){report.status='STATIC_MECHANISM_CONSTRUCTION_FAILED';report.reason=adapted?.reason??adapted?.status??'no-complete-qualified-output';return report;}
  assertStaticStarDelta(base.level,adapted.level,adapted.drags);
  const issues=inspectConstructionAccounting(accounting);if(issues.length)throw Error(`Invalid construction accounting: ${issues.join(';')}`);
  if(adapted.provenance?.inputLevelSha256!==inputSha||adapted.provenance?.inputRouteSha256!==inputRouteSha
   ||adapted.provenance?.outputLevelSha256!==levelSha256(adapted.level)||adapted.provenance?.outputRouteSha256!==routeSha256(adapted.drags))throw Error('Construction input/output hashes mismatch');
  assert.equal(adapted.timeSchedule,undefined,'This static star task has no scheduled mechanism');
  constructionBudget.reserve(staticStarReplayReservations(adapted.drags),'shared-guard-complete-replays');
  const canonical=replayDecorated(runtime,adapted.level,adapted.drags);
  const independent=independentReplay(runtime,adapted.level,adapted.drags);
  report.canonicalReplay=canonical;report.independentReplay=independent;
  if(!canonical.valid||!canonical.complete||canonical.failed||!independent.valid||!independent.complete||independent.failed
   ||canonical.nonClearingDrags!==independent.nonClearingDrags||canonical.effectiveDrags!==adapted.drags.length
   ||independent.effectiveDrags!==adapted.drags.length||independent.remainingBodies!==0||independent.remainingQueued!==0)throw Error('Construction did not produce a complete actual-model U');
  if(adapted.audit?.passed!==true)throw Error('Construction participation failed');
  for(const key of ['level','drags','levelSha256','routeSha256','targets','audit','provenance','primaryInstances','addedSupport'])if(adapted[key]!==undefined)report[key]=adapted[key];
  report.status='STATIC_MECHANISM_CONSTRUCTION_COMPLETE_U_ONLY';report.accepted=true;report.U=independent.nonClearingDrags;
  return report;
 }catch(error){report.status='STATIC_MECHANISM_CONSTRUCTION_EXCEPTION';report.reason=error.message;return report;}
 finally{
  if(levelSha256(base.level)!==inputSha||routeSha256(base.drags)!==inputRouteSha){report.accepted=false;report.status='STATIC_MECHANISM_INPUT_MUTATED';}
  for(const [file,expected]of Object.entries(bindings))if(await fs.readFile(file).then(sha).catch(()=>null)!==expected){report.accepted=false;report.status='STATIC_MECHANISM_TOOL_CHANGED';}
  report.constructionAccounting=constructionBudget.report();
  report.terminalBlocked=!report.accepted;
  if(adapted?.level){
   try{
    const finalIdentity=identity(adapted.level),aliasFile=path.join(directory,'aliases',`${finalIdentity.retryIdentitySha256}.json`);
    await fs.writeFile(aliasFile,JSON.stringify({constructionAttempt:request.id,finalLevelSha256:levelSha256(adapted.level),fingerprints:finalIdentity},null,2)+'\n',{flag:'wx'});
   }catch(error){report.accepted=false;report.terminalBlocked=true;report.status=error.code==='EEXIST'?'STATIC_MECHANISM_FINAL_ALIAS_ALREADY_EXISTS':'STATIC_MECHANISM_FINAL_ALIAS_INVALID';report.aliasError=error.message;}
  }
  report.resultFile=path.join(directory,`${request.id}.construction-result.json`);
  report.ok=report.accepted;
  await fs.writeFile(report.resultFile,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  await ledger.finish(request,{accepted:report.accepted,status:report.status,levelSha256:inputSha});
 }
}
